import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { EventBus } from '@/lib/event-bus';

// GET /api/quotes/[id] — Get quote by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;

    const quote = await db.quote.findUnique({ where: { id } });

    if (!quote) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      );
    }

    // Verify tenant isolation
    if (quote.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json(quote);
  } catch (error) {
    console.error('Error fetching quote:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quote' },
      { status: 500 }
    );
  }
}

// PUT /api/quotes/[id] — Update quote (status changes, send, accept, reject, convert to job)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Verify the quote exists and belongs to the same tenant
    const existingQuote = await db.quote.findUnique({ where: { id } });

    if (!existingQuote) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      );
    }

    if (existingQuote.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    // Basic field updates
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description || null;
    if (body.customerId !== undefined) updateData.customerId = body.customerId || null;
    if (body.leadId !== undefined) updateData.leadId = body.leadId || null;
    if (body.validUntil !== undefined) updateData.validUntil = body.validUntil ? new Date(body.validUntil) : null;
    if (body.templateName !== undefined) updateData.templateName = body.templateName;
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.customerName !== undefined) updateData.customerName = body.customerName || null;
    if (body.customerEmail !== undefined) updateData.customerEmail = body.customerEmail || null;
    if (body.customerPhone !== undefined) updateData.customerPhone = body.customerPhone || null;
    if (body.notesJson !== undefined) updateData.notesJson = body.notesJson;
    if (body.pdfUrl !== undefined) updateData.pdfUrl = body.pdfUrl;

    // Handle line items recalculation
    if (body.itemsJson !== undefined) {
      const items = typeof body.itemsJson === 'string' ? JSON.parse(body.itemsJson) : body.itemsJson;
      updateData.itemsJson = JSON.stringify(items);

      const subtotal = items.reduce((sum: number, item: { quantity: number; unitPrice: number }) => {
        return sum + (item.quantity || 0) * (item.unitPrice || 0);
      }, 0);
      const taxAmount = body.tax !== undefined ? body.tax : existingQuote.tax;
      const discountAmount = body.discount !== undefined ? body.discount : existingQuote.discount;
      const total = subtotal + taxAmount - discountAmount;

      updateData.subtotal = subtotal;
      updateData.tax = taxAmount;
      updateData.discount = discountAmount;
      updateData.total = Math.max(0, total);
    } else {
      // Tax/discount only updates
      if (body.tax !== undefined || body.discount !== undefined) {
        const taxAmount = body.tax !== undefined ? body.tax : existingQuote.tax;
        const discountAmount = body.discount !== undefined ? body.discount : existingQuote.discount;
        updateData.tax = taxAmount;
        updateData.discount = discountAmount;
        updateData.total = Math.max(0, existingQuote.subtotal + taxAmount - discountAmount);
      }
    }

    // Handle status transitions
    if (body.status !== undefined) {
      updateData.status = body.status;

      // Send quote
      if (body.status === 'sent') {
        updateData.sentAt = new Date();
        if (body.sentVia) updateData.sentVia = body.sentVia;
      }

      // Accept quote
      if (body.status === 'accepted') {
        updateData.approvedAt = new Date();
      }

      // Reject quote
      if (body.status === 'rejected') {
        updateData.rejectedAt = new Date();
        if (body.rejectedReason) updateData.rejectedReason = body.rejectedReason;
      }
    }

    // Handle convert to job action
    if (body.convertToJob === true && existingQuote.status === 'accepted') {
      updateData.status = 'won';

      // Create a job from the quote
      const job = await db.job.create({
        data: {
          title: existingQuote.title,
          description: existingQuote.description,
          status: 'pending',
          customerId: existingQuote.customerId,
          customerName: existingQuote.customerName,
          customerPhone: existingQuote.customerPhone,
          serviceId: null,
          workspaceId: user.workspaceId,
        },
      });

      const quote = await db.quote.update({
        where: { id },
        data: updateData,
      });

      // Emit job.created event
      try {
        await EventBus.emit('job.created', {
          jobId: job.id,
          title: job.title,
          customerPhone: job.customerPhone,
          customerName: job.customerName,
          workspaceId: user.workspaceId,
          resourceType: 'job',
          resourceId: job.id,
          summary: `Job created from quote #${existingQuote.quoteNumber}`,
        }, { tenantId: user.tenantId || undefined, workspaceId: user.workspaceId || undefined });
      } catch (eventErr) {
        console.error('[QuotesAPI] Failed to emit job.created event:', eventErr);
      }

      return NextResponse.json({ quote, job });
    }

    const quote = await db.quote.update({
      where: { id },
      data: updateData,
    });

    // ─── Emit EventBus events for status changes ─────────────────────────

    // Quote Sent → emit quote.sent (triggers auto WhatsApp to customer)
    if (body.status === 'sent') {
      try {
        await EventBus.emit('quote.sent', {
          quoteId: quote.id,
          quoteNumber: quote.quoteNumber,
          title: quote.title,
          total: quote.total,
          currency: quote.currency,
          customerPhone: quote.customerPhone,
          customerEmail: quote.customerEmail,
          customerName: quote.customerName,
          approvalToken: quote.approvalToken,
          tenantId: quote.tenantId,
          resourceType: 'quote',
          resourceId: quote.id,
          summary: `Quote #${quote.quoteNumber} sent to ${quote.customerName || quote.customerPhone}`,
        }, { tenantId: user.tenantId || undefined, workspaceId: user.workspaceId || undefined });
      } catch (eventErr) {
        console.error('[QuotesAPI] Failed to emit quote.sent event:', eventErr);
      }
    }

    // Quote Accepted → emit quote.accepted (triggers auto-create job)
    if (body.status === 'accepted') {
      try {
        await EventBus.emit('quote.accepted', {
          quoteId: quote.id,
          quoteNumber: quote.quoteNumber,
          tenantId: quote.tenantId,
          workspaceId: user.workspaceId,
          resourceType: 'quote',
          resourceId: quote.id,
          summary: `Quote #${quote.quoteNumber} accepted by customer`,
        }, { tenantId: user.tenantId || undefined, workspaceId: user.workspaceId || undefined });
      } catch (eventErr) {
        console.error('[QuotesAPI] Failed to emit quote.accepted event:', eventErr);
      }
    }

    // Quote Rejected → emit quote.rejected
    if (body.status === 'rejected') {
      try {
        await EventBus.emit('quote.rejected', {
          quoteId: quote.id,
          quoteNumber: quote.quoteNumber,
          rejectedReason: body.rejectedReason,
          tenantId: quote.tenantId,
          resourceType: 'quote',
          resourceId: quote.id,
          summary: `Quote #${quote.quoteNumber} rejected${body.rejectedReason ? `: ${body.rejectedReason}` : ''}`,
        }, { tenantId: user.tenantId || undefined, workspaceId: user.workspaceId || undefined });
      } catch (eventErr) {
        console.error('[QuotesAPI] Failed to emit quote.rejected event:', eventErr);
      }
    }

    return NextResponse.json(quote);
  } catch (error) {
    console.error('Error updating quote:', error);
    return NextResponse.json(
      { error: 'Failed to update quote' },
      { status: 500 }
    );
  }
}

// DELETE /api/quotes/[id] — Delete quote
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;

    // Verify the quote exists and belongs to the same tenant
    const existingQuote = await db.quote.findUnique({ where: { id } });

    if (!existingQuote) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      );
    }

    if (existingQuote.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await db.quote.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Quote deleted' });
  } catch (error) {
    console.error('Error deleting quote:', error);
    return NextResponse.json(
      { error: 'Failed to delete quote' },
      { status: 500 }
    );
  }
}

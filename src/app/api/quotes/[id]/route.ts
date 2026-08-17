import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { toISOString } from '@/lib/utils';
import { EventBus } from '@/lib/event-bus';
import { autoCloseDealAsWonByQuote } from '@/lib/deal-auto-close';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const quote = await db.quote.findUnique({
      where: { id },
      include: { customer: true },
    });

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    const formatted = {
      id: quote.id,
      title: quote.title,
      description: quote.description,
      // Full customer object for consumers that need address/email/etc.
      // (e.g. the Quotes view's detail panel, opened via the Customer 360
      // pendingOpenEntity signal — it doesn't have the customer in local
      // state, so it relies on this endpoint to provide it.)
      customer: quote.customer ?? null,
      // Flat fields kept for backward compatibility with existing callers
      // that read `customerName` / `customerId` / `customerPhone` directly.
      customerName: quote.customer?.name || 'Unknown',
      customerId: quote.customerId || '',
      customerPhone: quote.customer?.phone,
      services: JSON.parse(quote.itemsJson || '[]'),
      addOns: JSON.parse(quote.addOnsJson || '[]'),
      subtotal: quote.subtotal,
      discountType: quote.discountType,
      discountValue: quote.discountType === 'percentage'
        ? quote.subtotal > 0 ? Math.round((quote.discount / quote.subtotal) * 100) : 0
        : quote.discount,
      discount: quote.discount,
      taxRate: quote.taxRate,
      tax: quote.tax,
      total: quote.total,
      status: quote.status,
      validUntil: quote.validUntil ? toISOString(quote.validUntil as Date | string | null)?.split('T')[0] ?? null : null,
      whatsappSent: quote.whatsappSent,
      createdAt: toISOString(quote.createdAt as Date | string)?.split('T')[0] ?? '',
    };

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Failed to fetch quote:', error);
    return NextResponse.json({ error: 'Failed to fetch quote' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      title, description, customerId, status, jobId,
      services, addOns, discountType, discountValue, taxRate, validUntil,
    } = body;

    const existing = await db.quote.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // Recalculate if services/addons changed
    let subtotal = existing.subtotal;
    let discount = existing.discount;
    let tax = existing.tax;
    let total = existing.total;

    if (services !== undefined || addOns !== undefined) {
      const servicesList = services || JSON.parse(existing.itemsJson);
      const addOnsList = addOns || JSON.parse(existing.addOnsJson);

      const servicesTotal = servicesList.reduce((s: number, item: any) => s + (item.price || 0) * (item.quantity || 1), 0);
      const addOnsTotal = addOnsList.reduce((s: number, a: any) => s + (a.price || 0), 0);
      subtotal = servicesTotal + addOnsTotal;

      const dt = discountType || existing.discountType;
      const dv = discountValue !== undefined ? discountValue : (dt === 'percentage' && existing.subtotal > 0 ? Math.round((existing.discount / existing.subtotal) * 100) : existing.discount);

      discount = dt === 'percentage'
        ? subtotal * (dv / 100)
        : dv;
      const afterDiscount = subtotal - discount;
      const tr = taxRate !== undefined ? taxRate : existing.taxRate;
      tax = afterDiscount * (tr / 100);
      total = afterDiscount + tax;
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (customerId !== undefined) updateData.customerId = customerId;
    if (status !== undefined) updateData.status = status;
    if (jobId !== undefined) updateData.jobId = jobId || null;
    if (services !== undefined) updateData.itemsJson = JSON.stringify(services);
    if (addOns !== undefined) updateData.addOnsJson = JSON.stringify(addOns);
    if (discountType !== undefined) updateData.discountType = discountType;
    if (validUntil !== undefined) updateData.validUntil = validUntil ? new Date(validUntil) : null;
    updateData.subtotal = subtotal;
    updateData.discount = discount;
    if (taxRate !== undefined) updateData.taxRate = taxRate;
    updateData.tax = tax;
    updateData.total = total;

    const quote = await db.quote.update({
      where: { id },
      data: updateData,
    });

    // ─── Emit quote lifecycle events on status change ────────────────
    // Best-effort — never fails the update. Only emits when the caller
    // actually changed the status field (and it's one of the lifecycle
    // statuses the EventBus knows about). `existing.status` is the
    // pre-update value, so we can detect transitions.
    if (status && status !== existing.status) {
      try {
        const eventData = {
          quoteId: quote.id,
          customerId: quote.customerId || null,
          tenantId: quote.tenantId || null,
          fromStatus: existing.status,
          toStatus: status,
          resourceType: 'quote',
          resourceId: quote.id,
        };
        const ctx = { tenantId: quote.tenantId || undefined };
        if (status === 'sent') {
          await EventBus.emit('quote.sent', eventData, ctx);
        } else if (status === 'accepted') {
          await EventBus.emit('quote.accepted', eventData, ctx);
        } else if (status === 'rejected') {
          await EventBus.emit('quote.rejected', eventData, ctx);
        }
      } catch (eventErr) {
        console.error('[Quotes PUT] quote status event failed:', eventErr);
      }
    }

    // ─── Auto-close linked Deal as 'won' when Quote is accepted ───────
    // Phase 6 hook: when a Quote's status transitions to 'accepted',
    // automatically move the linked Deal (via Quote.dealId, OR
    // Deal.leadId === Quote.leadId fallback) to the 'won' stage + stamp
    // `closedAt` + (optionally) `convertedJobId` + create a
    // DealStageHistory entry + sync the linked Lead's status to 'won'.
    //
    // Best-effort / non-blocking: if the Deal update fails for any
    // reason (no linked Deal, DB error, race condition), the Quote
    // approval still succeeds. The Deal can be moved to 'won' manually
    // via the Sales Pipeline view.
    if (status === 'accepted' && status !== existing.status) {
      try {
        await autoCloseDealAsWonByQuote(
          quote.id,
          quote.jobId || null, // stamp convertedJobId if the quote already has a jobId
        );
      } catch (dealErr) {
        console.error(
          '[Quotes PUT] auto-close Deal as won failed (non-blocking):',
          dealErr,
        );
      }
    }

    return NextResponse.json(quote);
  } catch (error) {
    console.error('Failed to update quote:', error);
    return NextResponse.json({ error: 'Failed to update quote' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await db.quote.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    await db.quote.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete quote:', error);
    return NextResponse.json({ error: 'Failed to delete quote' }, { status: 500 });
  }
}

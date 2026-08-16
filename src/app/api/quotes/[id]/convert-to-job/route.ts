import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { requireCrmTenant } from '@/lib/require-crm-tenant';
import { geocodeAddressOrNull as geocodeAddress } from '@/lib/geocode';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/quotes/[id]/convert-to-job
 *
 * Converts an accepted Quote into an operational Job.
 *
 * Business rules:
 *   - Quote.status must be 'accepted'
 *   - Quote.jobId must be null (prevent double conversion → 409)
 *   - Line items (itemsJson) + add-ons (addOnsJson) are merged into Job.lineItemsJson
 *   - Customer info is pre-filled from the linked Customer
 *   - Technician (assigneeId) and schedule (scheduledAt) are left empty
 *   - Quote.jobId is set after successful Job creation
 *   - Quote.status stays 'accepted' — jobId is the conversion indicator
 *   - NO booking-confirmation email is sent automatically
 *
 * Returns: { job: {...} } with status 201
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const crmGuard = await requireCrmTenant(request);
    if (crmGuard) return crmGuard;

    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id: quoteId } = await params;

    // ── 1. Fetch the quote with customer data ──────────────────────────
    const quote = await db.quote.findUnique({
      where: { id: quoteId },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            address: true,
            workspaceId: true,
          },
        },
      },
    });

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // Tenant scoping: non-super-admins can only convert quotes in their tenant
    if (!user.isSuperAdmin && user.tenantId && quote.tenantId && quote.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // ── 2. Validate conversion eligibility ─────────────────────────────
    if (quote.status !== 'accepted') {
      return NextResponse.json(
        { error: `Quote must be in 'accepted' status to convert (current: '${quote.status}')` },
        { status: 409 },
      );
    }

    if (quote.jobId) {
      // Already converted — return 409 with the existing job ID so the UI
      // can redirect to it instead of showing a generic error.
      return NextResponse.json(
        {
          error: 'This quote has already been converted to a job',
          jobId: quote.jobId,
        },
        { status: 409 },
      );
    }

    if (!quote.customerId || !quote.customer) {
      return NextResponse.json(
        { error: 'Quote has no linked customer — cannot convert to job' },
        { status: 400 },
      );
    }

    // ── 3. Transform line items ────────────────────────────────────────
    // Quote.itemsJson: [{ serviceId, name, price, qty }]
    // Quote.addOnsJson: [{ name, price }]
    // Job.lineItemsJson: unified format [{ id, name, description, quantity, rate, amount, type }]
    let quoteItems: any[] = [];
    let quoteAddOns: any[] = [];
    try {
      quoteItems = JSON.parse(quote.itemsJson || '[]');
    } catch {
      quoteItems = [];
    }
    try {
      quoteAddOns = JSON.parse(quote.addOnsJson || '[]');
    } catch {
      quoteAddOns = [];
    }

    const jobLineItems = [
      ...quoteItems.map((item: any) => ({
        id: item.id || item.serviceId || `item-${Math.random().toString(36).slice(2, 9)}`,
        name: item.name || item.serviceName || 'Service',
        description: item.description || '',
        quantity: Number(item.qty || item.quantity || 1),
        rate: Number(item.price || 0),
        amount: Number(item.price || 0) * Number(item.qty || item.quantity || 1),
        type: 'service',
      })),
      ...quoteAddOns.map((addOn: any) => ({
        id: addOn.id || `addon-${Math.random().toString(36).slice(2, 9)}`,
        name: addOn.name || 'Add-on',
        description: '',
        quantity: 1,
        rate: Number(addOn.price || 0),
        amount: Number(addOn.price || 0),
        type: 'addon',
      })),
    ];

    // ── 4. Resolve workspaceId for the new Job ─────────────────────────
    // Job uses workspaceId (not tenantId). Resolve from the customer, then
    // fall back to the authenticated user's workspaceId.
    let workspaceId = quote.customer.workspaceId || user.workspaceId || null;
    if (!workspaceId) {
      // Last resort: find the first workspace in the user's tenant
      if (user.tenantId || quote.tenantId) {
        const fallbackWs = await db.workspace.findFirst({
          where: { tenantId: user.tenantId || quote.tenantId || undefined },
          orderBy: { createdAt: 'asc' },
          select: { id: true },
        });
        workspaceId = fallbackWs?.id || null;
      }
    }

    // ── 5. Create the Job ──────────────────────────────────────────────
    const customer = quote.customer;
    const job = await db.job.create({
      data: {
        title: quote.title,
        description: quote.description || null,
        status: 'pending',
        priority: 'medium',
        type: 'service',
        address: customer.address || null,
        customerId: quote.customerId,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email || null,
        // Leave technician and schedule empty — they'll be set during dispatch
        assigneeId: null,
        assigneeName: null,
        assigneePhone: null,
        scheduledAt: null,
        scheduledTime: null,
        quotedAmount: quote.total,
        lineItemsJson: JSON.stringify(jobLineItems),
        notes: `Converted from quote: ${quote.title}`,
        workspaceId,
        metadataJson: JSON.stringify({
          convertedFromQuote: true,
          quoteId: quote.id,
          quoteTotal: quote.total,
          quoteCurrency: quote.currency,
        }),
      },
    });

    // ── 6. Link the Quote to the new Job ───────────────────────────────
    // Keep quote.status as 'accepted' — jobId is the conversion indicator.
    await db.quote.update({
      where: { id: quote.id },
      data: { jobId: job.id },
    });

    // ── 7. Best-effort geocode the job address ─────────────────────────
    // Non-blocking — if it fails, the job is still valid (lat/lng stay null
    // and the dispatch map shows "⚠ Location unavailable").
    if (job.address) {
      geocodeAddress(job.address)
        .then(async (coords) => {
          if (coords) {
            try {
              await db.job.update({
                where: { id: job.id },
                data: { latitude: coords.latitude, longitude: coords.longitude },
              });
            } catch {
              // ignore — non-critical
            }
          }
        })
        .catch(() => {
          // ignore — geocoding is best-effort
        });
    }

    // ── 8. Return the created job ──────────────────────────────────────
    // NO booking-confirmation email is sent — the user explicitly requested
    // that converting an old quote to a job should NOT trigger notifications.
    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    console.error('[Convert Quote to Job] Error:', error);
    return NextResponse.json(
      { error: 'Failed to convert quote to job' },
      { status: 500 },
    );
  }
}

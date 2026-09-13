import { db } from '@/lib/db';
import { geocodeAddressOrNull as geocodeAddress } from '@/lib/geocode';
import { autoCloseDealAsWonByQuote } from '@/lib/deal-auto-close';
import { EventBus } from '@/lib/event-bus';

export interface AcceptQuoteOptions {
  customerId?: string | null;
  tenantId?: string | null;
  isSuperAdmin?: boolean;
}

/**
 * Accepts a Quote, syncs CRM deals, and automatically creates an operational Job
 * if one has not already been created.
 */
export async function acceptQuoteAndCreateJob(
  quoteId: string,
  options: AcceptQuoteOptions = {},
) {
  // 1. Fetch quote with customer data
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
    throw new Error('Quote not found');
  }

  // Tenant / customer access checks
  if (options.customerId && quote.customerId && quote.customerId !== options.customerId) {
    throw new Error('Access denied: quote does not belong to this customer');
  }
  if (!options.isSuperAdmin && options.tenantId && quote.tenantId && quote.tenantId !== options.tenantId) {
    throw new Error('Access denied: quote does not belong to your organization');
  }

  let job = null;

  // 2. If a Job is already linked, retrieve it
  if (quote.jobId) {
    job = await db.job.findUnique({ where: { id: quote.jobId } });
  } else if (quote.customer) {
    // 3. Transform line items into unified Job line items format
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

    // 4. Resolve workspaceId for the new Job
    let workspaceId = quote.customer.workspaceId || null;
    if (!workspaceId && quote.tenantId) {
      const fallbackWs = await db.workspace.findFirst({
        where: { tenantId: quote.tenantId },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      workspaceId = fallbackWs?.id || null;
    }

    // 5. Create operational Job
    const customer = quote.customer;
    job = await db.job.create({
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
        assigneeId: null,
        assigneeName: null,
        assigneePhone: null,
        scheduledAt: null,
        scheduledTime: null,
        quotedAmount: quote.total,
        lineItemsJson: JSON.stringify(jobLineItems),
        notes: `Auto-created from accepted quote: ${quote.title}`,
        workspaceId,
        metadataJson: JSON.stringify({
          convertedFromQuote: true,
          quoteId: quote.id,
          quoteTotal: quote.total,
          quoteCurrency: quote.currency,
          acceptedAt: new Date().toISOString(),
        }),
      },
    });

    // 6. Best-effort geocode the job address in background
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
              // ignore
            }
          }
        })
        .catch(() => {
          // ignore
        });
    }
  }

  // 7. Update Quote status to 'accepted' and stamp jobId
  const updatedQuote = await db.quote.update({
    where: { id: quote.id },
    data: {
      status: 'accepted',
      ...(job ? { jobId: job.id } : {}),
    },
    include: {
      customer: true,
    },
  });

  // 8. Auto-close linked Deal as 'won' in Sales Pipeline
  try {
    await autoCloseDealAsWonByQuote(quote.id, job?.id || null);
  } catch (dealErr) {
    console.error('[QuoteAcceptance] auto-close Deal as won failed:', dealErr);
  }

  // 9. Emit event for audit log & notifications
  try {
    await EventBus.emit(
      'quote.accepted',
      {
        quoteId: quote.id,
        customerId: quote.customerId || null,
        tenantId: quote.tenantId || null,
        fromStatus: quote.status,
        toStatus: 'accepted',
        resourceType: 'quote',
        resourceId: quote.id,
        jobId: job?.id || null,
      },
      { tenantId: quote.tenantId || undefined },
    );
  } catch (eventErr) {
    console.error('[QuoteAcceptance] quote.accepted event failed:', eventErr);
  }

  return { quote: updatedQuote, job };
}

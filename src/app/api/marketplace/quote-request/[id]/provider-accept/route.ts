import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { logger, withRequestId } from '@/lib/logger';
import { parseAttribution, serializeAttribution } from '@/lib/marketplace-attribution';

/**
 * POST /api/marketplace/quote-request/[id]/provider-accept
 *
 * Provider accepts a marketplace quote request. Creates a Customer + Lead
 * in the provider's CRM so they can track it alongside their other leads,
 * convert it to a job, and create quotes.
 */

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  ctx: RouteContext,
) {
  const log = withRequestId(request);

  const authUser = await getAuthUser();
  if (!authUser) {
    return NextResponse.json(
      { error: 'Authentication required', code: 'UNAUTHENTICATED' },
      { status: 401 },
    );
  }
  if (!authUser.tenantId) {
    return NextResponse.json(
      { error: 'No tenant associated with this account' },
      { status: 403 },
    );
  }

  const { id: jobRequestId } = await ctx.params;
  if (!jobRequestId) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  try {
    const jobRequest = await db.jobRequest.findUnique({
      where: { id: jobRequestId },
    });

    if (!jobRequest) {
      return NextResponse.json(
        { error: 'Quote request not found' },
        { status: 404 },
      );
    }

    if (jobRequest.tenantId && jobRequest.tenantId !== authUser.tenantId) {
      return NextResponse.json(
        { error: 'This quote request is assigned to another provider' },
        { status: 403 },
      );
    }

    if (jobRequest.status === 'provider_accepted') {
      return NextResponse.json(
        { error: 'This quote request has already been accepted' },
        { status: 409 },
      );
    }

    // Create or find Customer in provider's CRM
    let customer = null;
    const phoneDigits = (jobRequest.customerPhone || '').replace(/\D/g, '');
    const customerEmail = (jobRequest.customerEmail || '').trim().toLowerCase();

    if (phoneDigits.length >= 7) {
      const tail = phoneDigits.slice(-10);
      customer = await db.customer.findFirst({
        where: {
          OR: [
            { phone: { contains: tail } },
            ...(customerEmail ? [{ email: customerEmail }] : []),
          ],
        },
        select: { id: true, name: true, phone: true, email: true },
      });
    }

    if (!customer) {
      const customerData: Record<string, unknown> = {
        name: jobRequest.customerName || 'Marketplace Customer',
        phone: jobRequest.customerPhone || '',
        email: customerEmail || null,
        address: jobRequest.address || null,
        source: 'marketplace',
      };

      const workspace = await db.workspace.findFirst({
        where: { tenantId: authUser.tenantId },
        select: { id: true },
      });
      if (workspace) {
        customerData.workspaceId = workspace.id;
      }

      customer = await db.customer.create({
        data: customerData as any,
        select: { id: true, name: true, phone: true, email: true },
      });

      logger.info(
        { component: 'marketplace-quote-accept', customerId: customer.id, tenantId: authUser.tenantId },
        'Created new customer from marketplace quote request',
      );
    }

    // Create Lead in provider's CRM
    // Phase 4B: copy marketplace attribution from JobRequest → Lead.
    // The spread preserves ALL nested objects (firstTouch, lastTouch, session)
    // from the original submit-time snapshot. Only the top-level `providerId`
    // is overridden to the accepting provider — this is the authoritative
    // "who owns this lead now" field. The original `isDirect` flag and the
    // `lastTouch` snapshot are preserved as-is so reports can distinguish
    // "broadcast request accepted by provider X" from "direct request to
    // provider X that they then accepted".
    const attribution = parseAttribution(jobRequest.marketplaceAttributionJson);
    const leadAttribution = attribution
      ? serializeAttribution({
          ...attribution,
          providerId: authUser.tenantId, // update to the accepting provider
        })
      : '{}';

    const lead = await db.lead.create({
      data: {
        title: jobRequest.title || 'Marketplace Quote Request',
        name: jobRequest.customerName || 'Marketplace Customer',
        phone: jobRequest.customerPhone || '',
        email: jobRequest.customerEmail || null,
        source: 'marketplace',
        status: 'new',
        priority: jobRequest.urgency === 'emergency' ? 'urgent' : (jobRequest.urgency === 'high' ? 'high' : 'medium'),
        value: jobRequest.budgetHigh || jobRequest.budgetLow || 0,
        description: jobRequest.description || null,
        address: jobRequest.address || null,
        serviceType: jobRequest.industry || null,
        customerId: customer.id,
        tenantId: authUser.tenantId,
        // Phase 4B: marketplace attribution survives the JobRequest → Lead conversion
        marketplaceAttributionJson: leadAttribution,
        notesJson: JSON.stringify([{
          text: `Marketplace quote request accepted. Budget: ${jobRequest.currency} ${jobRequest.budgetLow || 0}-${jobRequest.budgetHigh || 0}. Urgency: ${jobRequest.urgency}`,
          createdAt: new Date().toISOString(),
          author: 'system',
        }]),
        tagsJson: JSON.stringify(['marketplace', 'quote-request']),
      } as any,
    });

    // Update JobRequest status + link to lead
    await db.jobRequest.update({
      where: { id: jobRequestId },
      data: {
        status: 'provider_accepted',
        tenantId: authUser.tenantId,
        customerId: customer.id,
        metadataJson: JSON.stringify({
          ...((JSON.parse(jobRequest.metadataJson || '{}') as object) || {}),
          providerAcceptedAt: new Date().toISOString(),
          providerAcceptedBy: authUser.id,
          leadId: lead.id,
          customerId: customer.id,
        }),
      },
    });

    logger.info(
      { component: 'marketplace-quote-accept', jobRequestId, leadId: lead.id, customerId: customer.id, tenantId: authUser.tenantId },
      'Provider accepted quote request — Lead + Customer created',
    );

    return NextResponse.json({
      ok: true,
      message: 'Quote request accepted. A lead has been created in your CRM.',
      leadId: lead.id,
      customerId: customer.id,
      customerName: customer.name,
    });
  } catch (error) {
    log.error({ err: error, jobRequestId }, 'marketplace/quote-request/provider-accept: error');
    return NextResponse.json(
      { error: 'Failed to accept quote request' },
      { status: 500 },
    );
  }
}

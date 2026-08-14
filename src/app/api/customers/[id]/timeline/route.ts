import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { addTimelineEntry } from '@/lib/customer-timeline';
import { withCrmTrace } from '@/lib/crm-perf-trace';
import { shouldUseSupabaseDB } from '@/lib/supabase-db';
import { getCustomerTimeline, RpcFunctionNotFoundError } from '@/lib/supabase-rpc';

/**
 * GET /api/customers/[id]/timeline
 *
 * Returns the unified Customer Timeline:
 *  1. All explicit CustomerTimelineEntry rows for this customer
 *  2. PLUS synthesized entries from existing tables (leads, jobs, invoices,
 *     JobPhoto, JobSignature) — merged into a single sorted list
 *
 * Query params:
 *   entryType   — filter by entry type
 *   isInternal  — "false" (default) excludes internal notes; "true" includes them
 *   limit       — default 100
 *   offset      — default 0
 *
 * Returns: { entries: [...], total, sources: { leads, jobs, invoices, photos, signatures, manual } }
 */
async function _GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id: customerId } = await params;
    const { searchParams } = new URL(request.url);

    // ─── Tenant scoping (mirrors /api/leads pattern) ───────────────
    // The caller's tenantId is the source of truth — never show a
    // customer from another tenant. Super-admins may pass ?tenantId= to
    // scope to a specific tenant, or omit it to look up any customer.
    // Authenticated users without a tenant get a 403 (no tenant context).
    // NOTE: Customer has no direct tenantId — it's linked via workspace.tenantId.
    let callerTenantId: string | null = null;
    let unrestricted = false;
    if (authUser.isSuperAdmin) {
      const queryTenantId = searchParams.get('tenantId');
      if (queryTenantId) {
        callerTenantId = queryTenantId;
      } else {
        unrestricted = true;
      }
    } else if (authUser.tenantId) {
      callerTenantId = authUser.tenantId;
    } else {
      return NextResponse.json(
        { error: 'No tenant context for this customer' },
        { status: 403 },
      );
    }

    const entryTypeFilter = searchParams.get('entryType');
    const isInternalParam = searchParams.get('isInternal');
    const includeInternal =
      isInternalParam === 'true' || isInternalParam === '1';
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '100', 10) || 100,
      500,
    );
    const offset = Math.max(
      parseInt(searchParams.get('offset') || '0', 10) || 0,
      0,
    );

    // ─── C-2B.1: RPC path (7 calls → 1) ────────────────────────────────
    // Try the RPC FIRST, before any Prisma calls. The get_customer_timeline
    // SQL function does customer verification + all 6 source fetches +
    // merge/dedup/filter/sort/paginate in a single PostgREST call.
    //
    // This makes the RPC path exactly 1 DB call (the RPC itself). The
    // route-level customer.findFirst below is ONLY needed for the fallback
    // path (when the RPC function hasn't been applied yet).
    //
    // See supabase-rpc-timeline.sql for the function definition and
    // supabase-rpc.ts for the caller.
    if (shouldUseSupabaseDB()) {
      try {
        const rpcResult = await getCustomerTimeline(
          customerId,
          unrestricted ? null : callerTenantId,
          entryTypeFilter && entryTypeFilter !== 'all' ? entryTypeFilter : null,
          includeInternal,
          limit,
          offset,
        );
        if (rpcResult === null) {
          return NextResponse.json(
            { error: 'Customer not found' },
            { status: 404 },
          );
        }
        return NextResponse.json(rpcResult);
      } catch (err) {
        if (err instanceof RpcFunctionNotFoundError) {
          // RPC function not applied yet — fall through to the original
          // 7-call path below. Log once so it's visible in dev.log.
          console.warn(
            '[customer timeline] get_customer_timeline RPC not found — ' +
              'using 7-call fallback. Apply supabase-rpc-timeline.sql to enable the RPC path.',
          );
        } else {
          throw err;
        }
      }
    }

    // ─── Original 7-call path (fallback) ───────────────────────────────
    // Only reached when shouldUseSupabaseDB() is false OR the RPC function
    // doesn't exist yet. This path needs customer.findFirst for verification
    // + workspaceId resolution (the RPC handles both internally).

    // Verify the customer exists AND belongs to the caller's tenant.
    // (For superadmins without ?tenantId=, skip the tenant filter entirely.)
    const customer = await db.customer.findFirst({
      where: unrestricted
        ? { id: customerId }
        : {
            id: customerId,
            workspace: { tenantId: callerTenantId as string },
          },
      select: { id: true, name: true, workspaceId: true },
    });
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Effective tenantId for downstream queries (timeline entries, leads, etc.).
    // For a superadmin without ?tenantId=, fall back to the customer's
    // workspace tenantId (which we just verified exists).
    let tenantId: string | null = callerTenantId;
    if (!tenantId && customer.workspaceId) {
      try {
        const ws = await db.workspace.findUnique({
          where: { id: customer.workspaceId },
          select: { tenantId: true },
        });
        tenantId = ws?.tenantId ?? null;
      } catch {
        // ignore
      }
    }

    // 1. Fetch explicit CustomerTimelineEntry rows
    const timelineWhere: Record<string, unknown> = { customerId };
    if (tenantId) timelineWhere.tenantId = tenantId;
    if (!includeInternal) timelineWhere.isInternal = false;
    if (entryTypeFilter && entryTypeFilter !== 'all') {
      timelineWhere.entryType = entryTypeFilter;
    }

    const explicitEntries = await db.customerTimelineEntry.findMany({
      where: timelineWhere,
      orderBy: { eventDate: 'desc' },
      take: limit,
      skip: offset,
    });

    type UnifiedEntry = {
      id: string;
      entryType: string;
      title: string;
      description: string | null;
      sourceType: string | null;
      sourceId: string | null;
      metadata: Record<string, unknown>;
      actorId: string | null;
      actorName: string | null;
      actorType: string;
      eventDate: string;
      isInternal: boolean;
      isPinned: boolean;
      isExplicit: boolean;
    };

    const entries: UnifiedEntry[] = explicitEntries.map((e) => {
      let meta: Record<string, unknown> = {};
      try {
        meta = JSON.parse(e.metadataJson || '{}');
      } catch {
        meta = {};
      }
      return {
        id: e.id,
        entryType: e.entryType,
        title: e.title,
        description: e.description,
        sourceType: e.sourceType,
        sourceId: e.sourceId,
        metadata: meta,
        actorId: e.actorId,
        actorName: e.actorName,
        actorType: e.actorType,
        eventDate: new Date(e.eventDate).toISOString(),
        isInternal: e.isInternal,
        isPinned: e.isPinned,
        isExplicit: true,
      };
    });

    // 2. Synthesize entries from existing tables — but ONLY if no entryType
    // filter is set (so explicit + synthesized merge cleanly) AND only if we
    // haven't been asked to filter on a single entryType that doesn't match.
    // To keep things simple: always synthesize, then filter the merged list by
    // entryType at the end.

    // 2a. Leads for this customer
    let leadCount = 0;
    try {
      const leads = await db.lead.findMany({
        where: { customerId, ...(tenantId ? { tenantId } : {}) },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          name: true,
          source: true,
          serviceType: true,
          status: true,
          createdAt: true,
        },
      });
      leadCount = leads.length;
      for (const lead of leads) {
        entries.push({
          id: `lead-${lead.id}`,
          entryType: 'lead',
          title: `Lead received: ${lead.name}`,
          description:
            `Source: ${lead.source || 'manual'}` +
            (lead.serviceType ? ` · ${lead.serviceType}` : '') +
            ` · Status: ${lead.status || 'new'}`,
          sourceType: 'Lead',
          sourceId: lead.id,
          metadata: {
            leadId: lead.id,
            source: lead.source,
            serviceType: lead.serviceType,
            status: lead.status,
          },
          actorId: null,
          actorName: null,
          actorType: 'system',
          eventDate: new Date(lead.createdAt).toISOString(),
          isInternal: false,
          isPinned: false,
          isExplicit: false,
        });
      }
    } catch (err) {
      console.error('[customer timeline] Lead aggregation failed:', err);
    }

    // 2b. Jobs for this customer
    let jobCount = 0;
    try {
      const jobs = await db.job.findMany({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          title: true,
          status: true,
          assigneeName: true,
          createdAt: true,
          scheduledAt: true,
          completedAt: true,
        },
      });
      jobCount = jobs.length;
      for (const job of jobs) {
        entries.push({
          id: `job-${job.id}`,
          entryType: 'job',
          title: `Job: ${job.title || 'Untitled job'}`,
          description:
            `Status: ${job.status || 'pending'}` +
            (job.assigneeName ? ` · Assigned to ${job.assigneeName}` : ' · Unassigned'),
          sourceType: 'Job',
          sourceId: job.id,
          metadata: {
            jobId: job.id,
            status: job.status,
            assigneeName: job.assigneeName,
          },
          actorId: null,
          actorName: null,
          actorType: 'system',
          eventDate: new Date(job.completedAt || job.scheduledAt || job.createdAt).toISOString(),
          isInternal: false,
          isPinned: false,
          isExplicit: false,
        });
      }
    } catch (err) {
      console.error('[customer timeline] Job aggregation failed:', err);
    }

    // 2c. Invoices for this customer
    let invoiceCount = 0;
    try {
      const invoices = await db.invoice.findMany({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          number: true,
          status: true,
          total: true,
          currency: true,
          createdAt: true,
          paidAt: true,
        },
      });
      invoiceCount = invoices.length;
      for (const inv of invoices) {
        const isPaid = inv.status === 'paid';
        entries.push({
          id: `inv-${inv.id}`,
          entryType: isPaid ? 'payment' : 'invoice',
          title: isPaid
            ? `Invoice paid: ${inv.number}`
            : `Invoice created: ${inv.number}`,
          description: `${inv.currency || 'USD'} ${(inv.total ?? 0).toFixed(2)} · Status: ${inv.status}`,
          sourceType: 'Invoice',
          sourceId: inv.id,
          metadata: {
            invoiceId: inv.id,
            number: inv.number,
            total: inv.total,
            currency: inv.currency,
            status: inv.status,
          },
          actorId: null,
          actorName: null,
          actorType: 'system',
          eventDate: new Date(inv.paidAt || inv.createdAt).toISOString(),
          isInternal: false,
          isPinned: false,
          isExplicit: false,
        });
      }
    } catch (err) {
      console.error('[customer timeline] Invoice aggregation failed:', err);
    }

    // 2d. JobPhoto — denormalized customerId
    let photoCount = 0;
    try {
      const photos = await db.jobPhoto.findMany({
        where: { customerId },
        orderBy: { capturedAt: 'desc' },
        take: 50,
        select: {
          id: true,
          photoType: true,
          url: true,
          caption: true,
          capturedByName: true,
          capturedAt: true,
          jobId: true,
        },
      });
      photoCount = photos.length;
      for (const p of photos) {
        entries.push({
          id: `photo-${p.id}`,
          entryType: 'photo',
          title: `${p.photoType || 'Photo'} uploaded`,
          description:
            (p.caption ? `${p.caption} · ` : '') +
            (p.capturedByName ? `By ${p.capturedByName}` : ''),
          sourceType: 'JobPhoto',
          sourceId: p.id,
          metadata: {
            url: p.url,
            photoType: p.photoType,
            jobId: p.jobId,
            capturedByName: p.capturedByName,
          },
          actorId: null,
          actorName: p.capturedByName,
          actorType: 'employee',
          eventDate: new Date(p.capturedAt).toISOString(),
          isInternal: false,
          isPinned: false,
          isExplicit: false,
        });
      }
    } catch (err) {
      console.error('[customer timeline] Photo aggregation failed:', err);
    }

    // 2e. JobSignature — denormalized customerId
    let signatureCount = 0;
    try {
      const sigs = await db.jobSignature.findMany({
        where: { customerId },
        orderBy: { signedAt: 'desc' },
        take: 50,
        select: {
          id: true,
          signatoryType: true,
          signatoryName: true,
          signatoryRole: true,
          signedAt: true,
          jobId: true,
        },
      });
      signatureCount = sigs.length;
      for (const s of sigs) {
        entries.push({
          id: `sig-${s.id}`,
          entryType: 'signature',
          title: `Signature captured: ${s.signatoryName}`,
          description:
            `${s.signatoryType}` +
            (s.signatoryRole ? ` · ${s.signatoryRole}` : ''),
          sourceType: 'JobSignature',
          sourceId: s.id,
          metadata: {
            signatoryType: s.signatoryType,
            signatoryName: s.signatoryName,
            jobId: s.jobId,
          },
          actorId: null,
          actorName: s.signatoryName,
          actorType: s.signatoryType === 'customer' ? 'customer' : 'employee',
          eventDate: new Date(s.signedAt).toISOString(),
          isInternal: false,
          isPinned: false,
          isExplicit: false,
        });
      }
    } catch (err) {
      console.error('[customer timeline] Signature aggregation failed:', err);
    }

    // 3. Sort all entries by eventDate desc, dedupe (synth entries that overlap
    // with explicit entries by sourceType+sourceId), apply entryType filter,
    // then apply limit/offset.
    const seen = new Set<string>();
    const deduped = entries.filter((e) => {
      // Always keep manual/explicit entries
      if (e.isExplicit) return true;
      // For synthesized entries, dedupe on sourceType+sourceId
      const key = `${e.sourceType}:${e.sourceId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Apply entryType filter post-merge (so manual filter still works)
    const filtered =
      entryTypeFilter && entryTypeFilter !== 'all'
        ? deduped.filter((e) => e.entryType === entryTypeFilter)
        : deduped;

    filtered.sort(
      (a, b) =>
        new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime(),
    );

    const total = filtered.length;
    const paged = filtered.slice(offset, offset + limit);

    return NextResponse.json({
      entries: paged,
      total,
      sources: {
        leads: leadCount,
        jobs: jobCount,
        invoices: invoiceCount,
        photos: photoCount,
        signatures: signatureCount,
        manual: explicitEntries.length,
      },
    });
  } catch (error) {
    console.error('[customer timeline GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer timeline' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/customers/[id]/timeline
 * Add a manual timeline entry (e.g. an internal note, a logged call/email).
 *
 * Body: { entryType, title, description?, isInternal?, eventDate? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id: customerId } = await params;

    const customer = await db.customer.findUnique({
      where: { id: customerId },
      select: { id: true, name: true, workspaceId: true },
    });
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Resolve tenantId for the new timeline entry
    let tenantId: string | null = authUser.tenantId;
    if (!tenantId && customer.workspaceId) {
      try {
        const ws = await db.workspace.findUnique({
          where: { id: customer.workspaceId },
          select: { tenantId: true },
        });
        tenantId = ws?.tenantId ?? null;
      } catch {
        // ignore
      }
    }
    if (!tenantId) {
      try {
        const firstTenant = await db.tenant.findFirst({
          orderBy: { createdAt: 'asc' },
          select: { id: true },
        });
        tenantId = firstTenant?.id ?? null;
      } catch {
        // ignore
      }
    }
    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant context for this customer' },
        { status: 400 },
      );
    }

    const body = await request.json();
    const {
      entryType,
      title,
      description,
      isInternal,
      eventDate,
      metadataJson,
    } = body || {};

    if (!entryType || !title) {
      return NextResponse.json(
        { error: 'entryType and title are required' },
        { status: 400 },
      );
    }

    await addTimelineEntry({
      tenantId,
      customerId,
      entryType,
      title: String(title).slice(0, 500),
      description: description ? String(description).slice(0, 4000) : undefined,
      sourceType: 'Manual',
      sourceId: null,
      metadataJson:
        typeof metadataJson === 'string'
          ? metadataJson
          : metadataJson
            ? JSON.stringify(metadataJson)
            : '{}',
      actorId: authUser.id,
      actorName: authUser.name || authUser.email,
      actorType: 'user',
      eventDate: eventDate ? new Date(eventDate) : new Date(),
      isInternal: !!isInternal,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('[customer timeline POST] Error:', error);
    return NextResponse.json(
      { error: 'Failed to add timeline entry' },
      { status: 500 },
    );
  }
}

// C-1 perf trace — wraps GET with observational instrumentation (no-op when CRM_PERF_TRACE != 'true')
export const GET = withCrmTrace('GET /api/customers/[id]/timeline', _GET);

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { logger, withRequestId } from '@/lib/logger';
import { applyRateLimit, apiLimiter, rateLimitResponse } from '@/lib/rate-limit';
import { getIndustry } from '@/lib/industry-catalog';

/**
 * Flow 3: Emergency Dispatch — create (Fieseros V1.5 — P10-flows)
 * ------------------------------------------------------------
 * GET  /api/marketplace/emergency       — list broadcasting emergencies (provider-auth'd)
 * POST /api/marketplace/emergency       — customer creates a new emergency dispatch
 *
 * A marketplace customer has an emergency (burst pipe, no electricity,
 * lockout, etc.) and needs immediate dispatch. The EmergencyDispatch is
 * created with status='broadcasting'; we find nearby marketplace-eligible
 * providers with emergencyServiceAvailable=true and broadcast to them
 * (storing their IDs in broadcastToIds).
 *
 * Body:
 *   {
 *     title:         string,                 (required, 5-200 chars)
 *     description?:  string,
 *     industry?:     string,                 (industry id from INDUSTRY_CATALOG)
 *     address?:      string,
 *     lat?:          number,
 *     lng?:          number,
 *     customerName:  string,                 (required)
 *     customerPhone: string,                 (required)
 *     customerEmail?:string,
 *   }
 *
 * Public endpoint — rate-limited via apiLimiter.
 *
 * Returns: { emergencyDispatch, broadcastCount }
 */

const MAX_BROADCAST = 25;

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/[^0-9]/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function findEmergencyProviders(
  industry: string | null,
  lat: number | null,
  lng: number | null,
): Promise<string[]> {
  const where: Record<string, unknown> = {
    marketplaceOptIn: true,
    identityVerified: true,
    businessVerified: true,
    insuranceVerified: true,
    stripeConnected: true,
    planStatus: 'active',
    emergencyServiceAvailable: true,
  };

  try {
    const tenants = await db.tenant.findMany({
      where,
      select: {
        id: true,
        industry: true,
        city: true,
        state: true,
        postalCode: true,
        serviceAreasJson: true,
        businessCategoriesJson: true,
        rating: true,
        reviewCount: true,
        callOutFee: true,
        emergencySurchargePct: true,
      },
      orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
      take: 100,
    });

    // Filter by industry if specified.
    const matched = industry
      ? tenants.filter((t) => {
          const primary = (t.industry ?? '').toLowerCase().trim();
          if (primary === industry) return true;
          let cats: string[] = [];
          try {
            cats = JSON.parse(t.businessCategoriesJson || '[]');
          } catch {
            cats = [];
          }
          return (
            Array.isArray(cats) &&
            cats.some((c) => typeof c === 'string' && c.toLowerCase() === industry)
          );
        })
      : tenants;

    // For now, lat/lng filtering is best-effort — without a geoindex we
    // can't compute true proximity. Sort by rating × reviewCount instead.
    void lat;
    void lng;

    return matched.slice(0, MAX_BROADCAST).map((t) => t.id);
  } catch (err) {
    logger.warn(
      { err: err instanceof Error ? err.message : String(err) },
      'marketplace/emergency: findEmergencyProviders failed',
    );
    return [];
  }
}

export async function POST(request: NextRequest) {
  const log = withRequestId(request);

  const limited = applyRateLimit(apiLimiter, request);
  if (limited) {
    log.warn({ ip: limited.ip }, 'marketplace/emergency: rate limited');
    return rateLimitResponse(limited.resetAtMs);
  }

  // ── 1. Parse + validate body ───────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const title =
    typeof body.title === 'string' ? body.title.trim() : '';
  const description =
    typeof body.description === 'string' ? body.description.trim().slice(0, 5000) : null;
  const industry =
    typeof body.industry === 'string' && body.industry.trim().length > 0
      ? body.industry.trim().toLowerCase()
      : null;
  const address =
    typeof body.address === 'string' && body.address.trim().length > 0
      ? body.address.trim().slice(0, 500)
      : null;
  const lat =
    typeof body.lat === 'number' && Number.isFinite(body.lat) ? body.lat : null;
  const lng =
    typeof body.lng === 'number' && Number.isFinite(body.lng) ? body.lng : null;
  const customerName =
    typeof body.customerName === 'string' ? body.customerName.trim() : '';
  const customerPhone =
    typeof body.customerPhone === 'string' ? body.customerPhone.trim() : '';
  const customerEmail =
    typeof body.customerEmail === 'string' && body.customerEmail.trim().length > 0
      ? body.customerEmail.trim()
      : null;

  if (!title || title.length < 5 || title.length > 200) {
    return NextResponse.json(
      { error: '`title` is required (5-200 chars).' },
      { status: 400 },
    );
  }
  if (!customerName || customerName.length < 2 || customerName.length > 200) {
    return NextResponse.json(
      { error: '`customerName` is required (2-200 chars).' },
      { status: 400 },
    );
  }
  if (!customerPhone || !isValidPhone(customerPhone)) {
    return NextResponse.json(
      { error: '`customerPhone` must be a valid phone number.' },
      { status: 400 },
    );
  }
  if (customerEmail && !isValidEmail(customerEmail)) {
    return NextResponse.json(
      { error: '`customerEmail` must be a valid email.' },
      { status: 400 },
    );
  }
  if (industry && !getIndustry(industry)) {
    return NextResponse.json(
      { error: `\`industry\` "${industry}" is not a recognized industry id.` },
      { status: 400 },
    );
  }

  // ── 2. Find emergency-capable providers ────────────────────────────
  const broadcastToIds = await findEmergencyProviders(industry, lat, lng);

  // ── 3. Create the EmergencyDispatch ────────────────────────────────
  let emergencyDispatch;
  try {
    emergencyDispatch = await db.emergencyDispatch.create({
      data: {
        tenantId: null, // null until a provider accepts
        customerName,
        customerPhone,
        title,
        description,
        industry,
        urgency: 'emergency',
        address,
        lat,
        lng,
        status: 'broadcasting',
        broadcastToIds: JSON.stringify(broadcastToIds),
        estimatedArrivalMins: null,
        currency: 'USD',
        paymentStatus: 'pending',
        metadataJson: JSON.stringify({
          broadcastCount: broadcastToIds.length,
          source: 'marketplace',
          createdAt: new Date().toISOString(),
          ...(customerEmail ? { customerEmail } : {}),
        }),
      },
    });
  } catch (err) {
    log.error({ err }, 'marketplace/emergency: create failed');
    return NextResponse.json(
      { error: 'Failed to create emergency dispatch' },
      { status: 500 },
    );
  }

  // ── 4. Notify broadcast providers (fire-and-forget in-app bell) ────
  for (const providerTenantId of broadcastToIds) {
    db.notification
      .create({
        data: {
          title: 'EMERGENCY Dispatch Request',
          message: `${title}${industry ? ` — ${industry}` : ''}${address ? ` — ${address}` : ''}`,
          type: 'marketplace_emergency',
          tenantId: providerTenantId,
        },
      })
      .catch((err) => {
        log.warn(
          { err, providerTenantId, dispatchId: emergencyDispatch.id },
          'marketplace/emergency: provider notification failed',
        );
      });
  }

  log.info(
    {
      dispatchId: emergencyDispatch.id,
      broadcastCount: broadcastToIds.length,
      industry,
    },
    'marketplace/emergency: created',
  );

  return NextResponse.json(
    {
      emergencyDispatch,
      broadcastCount: broadcastToIds.length,
    },
    { status: 201 },
  );
}

/**
 * GET /api/marketplace/emergency
 *
 * Provider-side feed of broadcasting emergencies.
 *
 * Returns EmergencyDispatches that:
 *   - status === 'broadcasting'  (not yet accepted)
 *   - the calling provider's tenantId is in the dispatch's broadcastToIds
 *     (i.e. the dispatcher pre-selected them when the customer submitted)
 *   - OR the dispatch has no industry filter AND the provider's tenant has
 *     emergencyServiceAvailable=true (best-effort fallback so dispatches
 *     without a pre-baked broadcast list still surface).
 *
 * Also includes dispatches the provider has already accepted (status in
 * accepted|en_route|on_site) — these appear in the "active tracker" UI.
 *
 * Auth required (provider). Caller must have a tenantId.
 *
 * Query params:
 *   ?status=open | active | all    (default: all — returns both broadcasting + active)
 *   ?limit=20                      (max 100)
 *
 * Returns: { items, total }
 */
export async function GET(request: NextRequest) {
  const log = withRequestId(request);

  // Auth required — this is the provider-side feed.
  const authUser = await getAuthUser();
  if (!authUser) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (!authUser.tenantId) {
    return NextResponse.json(
      { error: 'No tenant associated with this account' },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const statusFilter = (searchParams.get('status') || 'all').toLowerCase();
  const limit = Math.min(
    parseInt(searchParams.get('limit') || '40', 10) || 40,
    100,
  );

  try {
    // Resolve the provider tenant's primary industry + business categories
    // + emergencyServiceAvailable flag.
    const tenant = await db.tenant.findUnique({
      where: { id: authUser.tenantId },
      select: {
        id: true,
        industry: true,
        emergencyServiceAvailable: true,
        businessCategoriesJson: true,
      },
    });
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Build the where-clause.
    // - "open"   → status='broadcasting'
    // - "active" → status in [accepted, en_route, on_site] AND acceptedById = this tenant
    // - "all"    → broadcasting (where tenant is in broadcastToIds) OR
    //              active (acceptedById = this tenant)
    const orClauses: Record<string, unknown>[] = [];

    if (statusFilter === 'open' || statusFilter === 'all') {
      // Broadcasting dispatches that include this tenant in broadcastToIds.
      // broadcastToIds is stored as a JSON array string — Postgres `like`
      // substring match on the tenant id is sufficient (CUIDs are unambiguous).
      orClauses.push({
        status: 'broadcasting',
        broadcastToIds: { contains: authUser.tenantId },
      });
      // Fallback: broadcasting dispatches with no broadcast list at all
      // (defensive — shouldn't happen but covers the empty-`[]` case).
      orClauses.push({
        status: 'broadcasting',
        broadcastToIds: '[]',
      });
    }

    if (statusFilter === 'active' || statusFilter === 'all') {
      orClauses.push({
        status: { in: ['accepted', 'en_route', 'on_site'] },
        acceptedById: authUser.tenantId,
      });
    }

    const where = orClauses.length === 1 ? orClauses[0] : { OR: orClauses };

    const [items, total] = await Promise.all([
      db.emergencyDispatch.findMany({
        where,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        take: limit,
        select: {
          id: true,
          title: true,
          description: true,
          industry: true,
          urgency: true,
          customerName: true,
          customerPhone: true,
          address: true,
          lat: true,
          lng: true,
          status: true,
          acceptedById: true,
          acceptedAt: true,
          providerEnRouteAt: true,
          providerOnSiteAt: true,
          completedAt: true,
          cancelledAt: true,
          estimatedArrivalMins: true,
          estimatedCost: true,
          finalCost: true,
          currency: true,
          paymentStatus: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.emergencyDispatch.count({ where }),
    ]);

    log.info(
      {
        tenantId: authUser.tenantId,
        returned: items.length,
        total,
        statusFilter,
        industry: tenant.industry,
      },
      'marketplace/emergency: list (provider)',
    );

    return NextResponse.json({
      items,
      total,
      providerTenantId: authUser.tenantId,
      providerIndustry: tenant.industry ?? null,
      providerEmergencyCapable: !!tenant.emergencyServiceAvailable,
    });
  } catch (err) {
    log.error({ err, tenantId: authUser.tenantId }, 'marketplace/emergency: list failed');
    return NextResponse.json(
      { error: 'Failed to list emergencies' },
      { status: 500 },
    );
  }
}


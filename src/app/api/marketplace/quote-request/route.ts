import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { CI } from '@/lib/db-utils';
import { logger, withRequestId } from '@/lib/logger';
import { applyRateLimit, apiLimiter, rateLimitResponse } from '@/lib/rate-limit';
import { getIndustry } from '@/lib/industry-catalog';

/**
 * Flow 2: Quote Request — create (Fieseros V1.5 — P10-flows)
 * ------------------------------------------------------------
 * POST /api/marketplace/quote-request
 *
 * A marketplace customer describes a project-sized job (painting, roofing,
 * remodeling, etc.) and asks multiple nearby providers for quotes. The
 * JobRequest is created with status 'open' and broadcast to nearby
 * marketplace-eligible providers — their IDs are stored in
 * `broadcastToIds` (JSON array on the row).
 *
 * Body:
 *   {
 *     title:         string,                 (required, 5-200 chars)
 *     description?:  string,                 (free-text scope)
 *     industry?:     string,                 (industry id from INDUSTRY_CATALOG)
 *     serviceId?:    string,
 *     photos?:       string[],               (URLs)
 *     address?:      string,
 *     city?:         string,
 *     postalCode?:   string,
 *     budgetLow?:    number,
 *     budgetHigh?:   number,
 *     customerName:  string,                 (required)
 *     customerPhone: string,                 (required)
 *     customerEmail?:string,
 *     urgency?:      'low' | 'medium' | 'high' | 'emergency',
 *   }
 *
 * Public endpoint — rate-limited via apiLimiter.
 *
 * Returns: { jobRequest, broadcastCount }
 */

const ALLOWED_URGENCIES = new Set(['low', 'medium', 'high', 'emergency']);
const MAX_BROADCAST = 25; // cap on number of providers notified per request
const MAX_PHOTOS = 10;

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/[^0-9]/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Find marketplace-eligible tenants whose primary industry OR
 * businessCategoriesJson matches the requested industry. Returns at most
 * MAX_BROADCAST tenant IDs sorted by rating × reviewCount.
 */
async function findBroadcastCandidates(
  industry: string | null,
  city: string | null,
  postalCode: string | null,
): Promise<string[]> {
  const where: Record<string, unknown> = {
    marketplaceOptIn: true,
    identityVerified: true,
    businessVerified: true,
    insuranceVerified: true,
    stripeConnected: true,
    planStatus: 'active',
  };

  try {
    const tenants = await db.tenant.findMany({
      where,
      select: {
        id: true,
        industry: true,
        city: true,
        postalCode: true,
        serviceAreasJson: true,
        businessCategoriesJson: true,
        rating: true,
        reviewCount: true,
      },
      orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
      take: 100, // candidate pool — we narrow below
    });

    const matched = tenants.filter((t) => {
      // Industry match (primary OR listed in businessCategoriesJson)
      if (industry) {
        const primary = (t.industry ?? '').toLowerCase().trim();
        let cats: string[] = [];
        try {
          cats = JSON.parse(t.businessCategoriesJson || '[]');
        } catch {
          cats = [];
        }
        const industryMatched =
          primary === industry ||
          (Array.isArray(cats) &&
            cats.some((c) => typeof c === 'string' && c.toLowerCase() === industry));
        if (!industryMatched) return false;
      }

      // Location match — prefer tenants whose city/postal matches, OR whose
      // serviceAreas include the requested city/postal, OR fall back to
      // any tenant if no location specified.
      if (!city && !postalCode) return true;

      const tCity = (t.city ?? '').toLowerCase().trim();
      const tPostal = (t.postalCode ?? '').toLowerCase().trim();
      if (city && tCity && (tCity.includes(city.toLowerCase()) || city.toLowerCase().includes(tCity))) {
        return true;
      }
      if (postalCode && tPostal && tPostal === postalCode.toLowerCase()) {
        return true;
      }
      let areas: string[] = [];
      try {
        areas = JSON.parse(t.serviceAreasJson || '[]');
      } catch {
        areas = [];
      }
      const areaTokens = areas
        .filter((a): a is string => typeof a === 'string')
        .map((a) => a.toLowerCase().trim());
      const locStr = `${city ?? ''} ${postalCode ?? ''}`.toLowerCase().trim();
      if (locStr && areaTokens.some((a) => a.includes(locStr) || locStr.includes(a))) {
        return true;
      }
      // No hard location match — keep tenant as a "nearby region" candidate.
      return true;
    });

    return matched.slice(0, MAX_BROADCAST).map((t) => t.id);
  } catch (err) {
    logger.warn(
      { err: err instanceof Error ? err.message : String(err) },
      'marketplace/quote-request: findBroadcastCandidates failed',
    );
    return [];
  }
}

export async function POST(request: NextRequest) {
  const log = withRequestId(request);

  // ── 1. Rate limit ──────────────────────────────────────────────────
  const limited = applyRateLimit(apiLimiter, request);
  if (limited) {
    log.warn({ ip: limited.ip }, 'marketplace/quote-request: rate limited');
    return rateLimitResponse(limited.resetAtMs);
  }

  // ── 2. Parse + validate body ───────────────────────────────────────
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
  const serviceId =
    typeof body.serviceId === 'string' && body.serviceId.trim().length > 0
      ? body.serviceId.trim()
      : null;
  const address =
    typeof body.address === 'string' && body.address.trim().length > 0
      ? body.address.trim().slice(0, 500)
      : null;
  const city =
    typeof body.city === 'string' && body.city.trim().length > 0
      ? body.city.trim().slice(0, 100)
      : null;
  const postalCode =
    typeof body.postalCode === 'string' && body.postalCode.trim().length > 0
      ? body.postalCode.trim().slice(0, 20)
      : null;
  const budgetLow =
    typeof body.budgetLow === 'number' && Number.isFinite(body.budgetLow) && body.budgetLow >= 0
      ? body.budgetLow
      : null;
  const budgetHigh =
    typeof body.budgetHigh === 'number' && Number.isFinite(body.budgetHigh) && body.budgetHigh >= 0
      ? body.budgetHigh
      : null;
  const customerName =
    typeof body.customerName === 'string' ? body.customerName.trim() : '';
  const customerPhone =
    typeof body.customerPhone === 'string' ? body.customerPhone.trim() : '';
  const customerEmail =
    typeof body.customerEmail === 'string' && body.customerEmail.trim().length > 0
      ? body.customerEmail.trim()
      : null;
  const urgencyRaw =
    typeof body.urgency === 'string' ? body.urgency.toLowerCase().trim() : 'medium';
  const urgency = ALLOWED_URGENCIES.has(urgencyRaw) ? urgencyRaw : 'medium';

  // Photos: array of URLs
  let photos: string[] = [];
  if (Array.isArray(body.photos)) {
    photos = body.photos
      .filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
      .map((p) => p.trim().slice(0, 500))
      .slice(0, MAX_PHOTOS);
  }

  // ── Validate required fields ───────────────────────────────────────
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
  if (
    budgetLow != null &&
    budgetHigh != null &&
    budgetLow > budgetHigh
  ) {
    return NextResponse.json(
      { error: '`budgetLow` cannot exceed `budgetHigh`.' },
      { status: 400 },
    );
  }

  // ── 3. Resolve service name (if serviceId provided) ────────────────
  let serviceName: string | null = null;
  if (serviceId) {
    try {
      const svc = await db.service.findUnique({
        where: { id: serviceId },
        select: { name: true },
      });
      if (svc) serviceName = svc.name;
    } catch {
      // ignore — best-effort
    }
  }

  // ── 4. Find nearby providers to broadcast to ───────────────────────
  const broadcastToIds = await findBroadcastCandidates(industry, city, postalCode);

  // ── 5. Create the JobRequest ───────────────────────────────────────
  let jobRequest;
  try {
    jobRequest = await db.jobRequest.create({
      data: {
        tenantId: null, // marketplace-wide until a quote is accepted
        customerName,
        customerPhone,
        customerEmail,
        title,
        description,
        industry,
        serviceId,
        serviceName,
        urgency,
        budgetLow,
        budgetHigh,
        currency: 'USD',
        photosJson: JSON.stringify(photos),
        videosJson: JSON.stringify([]),
        address,
        city,
        postalCode,
        status: 'open',
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        metadataJson: JSON.stringify({
          broadcastToIds,
          broadcastCount: broadcastToIds.length,
          source: 'marketplace',
          createdAt: new Date().toISOString(),
        }),
      },
    });
  } catch (err) {
    log.error({ err }, 'marketplace/quote-request: create failed');
    return NextResponse.json(
      { error: 'Failed to create quote request' },
      { status: 500 },
    );
  }

  // ── 6. Notify broadcast providers (best-effort, fire-and-forget) ───
  // We send a single in-app Notification per provider rather than email/SMS
  // spam — provider owners can opt into email/push via their notification
  // preferences.
  for (const providerTenantId of broadcastToIds) {
    db.notification
      .create({
        data: {
          title: 'New Quote Request',
          message: `${title}${industry ? ` — ${industry}` : ''}${city ? ` (${city})` : ''}`,
          type: 'marketplace_quote_request',
          tenantId: providerTenantId,
        },
      })
      .catch((err) => {
        log.warn(
          { err, providerTenantId, jobRequestId: jobRequest.id },
          'marketplace/quote-request: provider notification failed',
        );
      });
  }

  log.info(
    {
      jobRequestId: jobRequest.id,
      broadcastCount: broadcastToIds.length,
      industry,
      city,
      urgency,
    },
    'marketplace/quote-request: created',
  );

  return NextResponse.json(
    {
      jobRequest,
      broadcastCount: broadcastToIds.length,
    },
    { status: 201 },
  );
}

/**
 * GET /api/marketplace/quote-request
 *
 * Public list endpoint — supports filtering by status / industry / city.
 * Returns open + recently-closed requests so marketplace visitors can browse
 * active opportunities.
 */
export async function GET(request: NextRequest) {
  const log = withRequestId(request);

  const limited = applyRateLimit(apiLimiter, request);
  if (limited) {
    return rateLimitResponse(limited.resetAtMs);
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'open';
  const industry = searchParams.get('industry');
  const city = searchParams.get('city');
  const limit = Math.min(
    parseInt(searchParams.get('limit') || '20', 10) || 20,
    100,
  );

  const where: Record<string, unknown> = { status };
  if (industry) where.industry = industry.toLowerCase();
  if (city) where.city = { contains: city, ...CI };

  try {
    const [items, total] = await Promise.all([
      db.jobRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          title: true,
          description: true,
          industry: true,
          serviceName: true,
          urgency: true,
          budgetLow: true,
          budgetHigh: true,
          currency: true,
          city: true,
          postalCode: true,
          status: true,
          quoteCount: true,
          viewCount: true,
          createdAt: true,
          expiresAt: true,
        },
      }),
      db.jobRequest.count({ where }),
    ]);

    log.info({ returned: items.length, total, status, industry }, 'marketplace/quote-request: list');
    return NextResponse.json({ items, total });
  } catch (err) {
    log.error({ err }, 'marketplace/quote-request: list failed');
    return NextResponse.json({ error: 'Failed to list quote requests' }, { status: 500 });
  }
}

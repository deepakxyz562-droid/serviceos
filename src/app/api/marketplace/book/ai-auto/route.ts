import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger, withRequestId } from '@/lib/logger';
import { applyRateLimit, apiLimiter, rateLimitResponse } from '@/lib/rate-limit';
import { getIndustry } from '@/lib/industry-catalog';
import { estimatePrice } from '@/lib/smart-pricing';
import { notifyOwner } from '@/lib/owner-notifications';

/**
 * Mode 4: AI Auto-assign (Fieseros V1.5 — P10-flows)
 * ------------------------------------------------------------
 * POST /api/marketplace/book/ai-auto
 *
 * The marketplace customer lets the platform decide which provider gets
 * the job. This endpoint runs the AI dispatcher's scoring logic inline
 * (rather than calling /api/ai/dispatcher via HTTP, since that route
 * requires authenticated auth and the marketplace customer is unauth'd)
 * and creates a Booking + MarketplaceTransaction + Job assigned to the
 * best-scoring provider.
 *
 * Body:
 *   {
 *     serviceId?:    string,
 *     industry?:     string,                 (industry id from INDUSTRY_CATALOG)
 *     urgency:       'low' | 'medium' | 'high' | 'emergency',
 *     location?:     string,                 (city / address / postcode)
 *     scheduledAt?:  string (ISO),
 *     customerName:  string,                 (required)
 *     customerPhone: string,                 (required)
 *     customerEmail?:string,
 *     address:       string,                 (required)
 *     notes?:        string,
 *   }
 *
 * Public endpoint — rate-limited via apiLimiter.
 *
 * Returns: { booking, job, provider, scoreBreakdown }
 *         | { error, message }   (no providers found)
 */

const ALLOWED_URGENCIES = new Set(['low', 'medium', 'high', 'emergency']);
const DEFAULT_COMMISSION_PCT = 5;
const MAX_CANDIDATES = 100;

// Weights — mirror the /api/ai/dispatcher scoring (must sum to 1.0).
const WEIGHTS = {
  reviews: 0.30,
  distance: 0.25,
  availability: 0.20,
  skills: 0.10,
  price: 0.10,
  completion: 0.05,
} as const;

interface ProviderScore {
  tenantId: string;
  tenantName: string;
  slug: string;
  industry: string | null;
  city: string | null;
  state: string | null;
  rating: number;
  reviewCount: number;
  emergencyServiceAvailable: boolean;
  currency: string;
  estimatedPriceLow: number | null;
  estimatedPriceHigh: number | null;
  estimatedDurationMins: number | null;
  score: number;
  breakdown: {
    reviews: number;
    distance: number;
    availability: number;
    skills: number;
    price: number;
    completion: number;
  };
  reasons: string[];
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function norm(s: string | null | undefined): string {
  return (s ?? '').toLowerCase().trim();
}

function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    const parsed = JSON.parse(json);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/[^0-9]/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── Scoring functions (mirror /api/ai/dispatcher) ────────────────────────

function scoreDistance(
  tenant: {
    city: string | null;
    state: string | null;
    postalCode: string | null;
    serviceAreasJson: string;
  },
  location: string | null,
): { score: number; reason: string } {
  if (!location) return { score: 0.5, reason: 'No location requested' };

  const loc = location.toLowerCase().trim();
  const locTokens = loc.split(/[\s,]+/).filter((t) => t.length >= 2);

  const areas = safeJsonParse<string[]>(tenant.serviceAreasJson, [])
    .filter((a): a is string => typeof a === 'string')
    .map((a) => a.toLowerCase().trim())
    .filter((a) => a.length > 0);

  // 1. Explicit service-area match.
  if (areas.length > 0) {
    const matched = areas.some(
      (a) =>
        loc.includes(a) ||
        a.includes(loc) ||
        locTokens.some((t) => a.includes(t) || t.includes(a)),
    );
    if (matched) return { score: 1.0, reason: 'Location is in service area' };
  }

  // 2. City/state match.
  const tenantCity = norm(tenant.city);
  const tenantState = norm(tenant.state);
  const tenantPostal = norm(tenant.postalCode);
  if (
    (tenantCity && (loc.includes(tenantCity) || tenantCity.includes(loc))) ||
    (tenantState && locTokens.includes(tenantState)) ||
    (tenantPostal && locTokens.includes(tenantPostal))
  ) {
    return { score: 0.85, reason: 'Tenant city/state matches requested location' };
  }

  // 3. Has service areas but none matched.
  if (areas.length > 0) {
    return { score: 0.5, reason: 'Outside explicit service area but tenant serves a region' };
  }

  // 4. Has city/state — minimal geographic fallback.
  if (tenantCity || tenantState) {
    return { score: 0.3, reason: 'No service area defined; geographic fallback only' };
  }
  return { score: 0, reason: 'No service area or geographic info available' };
}

function scoreAvailability(
  businessHoursJson: string,
  emergencyServiceAvailable: boolean,
  preferredTime: string | null,
  urgency: string,
): { score: number; open: boolean | null; reason: string } {
  if (urgency === 'emergency') {
    if (emergencyServiceAvailable) {
      return { score: 1.0, open: true, reason: 'Emergency service available' };
    }
    return { score: 0, open: false, reason: 'Emergency service not available' };
  }
  if (!preferredTime) {
    return {
      score: emergencyServiceAvailable ? 0.85 : 0.7,
      open: null,
      reason: emergencyServiceAvailable
        ? 'Flexible availability + emergency service available'
        : 'Flexible availability (no emergency service)',
    };
  }
  const hours = safeJsonParse<
    Record<string, { open?: string; close?: string } | null>
  >(businessHoursJson, {});
  if (!hours || Object.keys(hours).length === 0) {
    return { score: 0.6, open: null, reason: 'Business hours not configured — assume available' };
  }
  const dt = new Date(preferredTime);
  if (Number.isNaN(dt.getTime())) {
    return { score: 0.6, open: null, reason: 'Invalid preferredTime — assume available' };
  }
  const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const dayKey = dayKeys[dt.getDay()];
  const slot = hours[dayKey!];
  if (!slot || !slot.open || !slot.close) {
    return { score: 0.3, open: false, reason: `Closed on ${dayKey}` };
  }
  const toMinutes = (s: string): number | null => {
    const m = s.match(/^(\d{1,2}):(\d{2})/);
    if (!m) return null;
    return parseInt(m[1]!, 10) * 60 + parseInt(m[2]!, 10);
  };
  const openMin = toMinutes(slot.open);
  const closeMin = toMinutes(slot.close);
  const reqMin = dt.getHours() * 60 + dt.getMinutes();
  if (openMin == null || closeMin == null) {
    return { score: 0.5, open: null, reason: 'Business hours set but unparseable' };
  }
  if (reqMin >= openMin && reqMin <= closeMin) {
    return { score: 1.0, open: true, reason: `Within working hours (${slot.open}–${slot.close})` };
  }
  return { score: 0.15, open: false, reason: `Outside working hours (${slot.open}–${slot.close})` };
}

function scoreSkills(
  tenant: { industry: string | null; businessCategoriesJson: string },
  requestedIndustry: string | null,
): { score: number; reason: string } {
  if (!requestedIndustry) return { score: 0.5, reason: 'No industry requested' };
  if (norm(tenant.industry) === norm(requestedIndustry)) {
    return { score: 1.0, reason: `Primary industry matches (${requestedIndustry})` };
  }
  const cats = safeJsonParse<string[]>(tenant.businessCategoriesJson, []);
  if (cats.some((c) => norm(c) === norm(requestedIndustry))) {
    return { score: 0.7, reason: `Industry listed in business categories (${requestedIndustry})` };
  }
  return { score: 0, reason: 'Industry mismatch' };
}

function scoreReviews(
  rating: number,
  reviewCount: number,
): { score: number; reason: string } {
  if (rating <= 0 || reviewCount <= 0) {
    return { score: 0, reason: 'No reviews yet' };
  }
  const r = clamp(rating / 5, 0, 1);
  const c = clamp(Math.log10(reviewCount + 1) / 2, 0, 1);
  return {
    score: clamp(r * c, 0, 1),
    reason: `${rating.toFixed(1)}★ from ${reviewCount} review${reviewCount === 1 ? '' : 's'}`,
  };
}

function scorePrice(
  estimateHigh: number | null,
  minHigh: number | null,
  maxHigh: number | null,
): { score: number; reason: string } {
  if (estimateHigh == null) return { score: 0.5, reason: 'No price estimate available' };
  if (minHigh == null || maxHigh == null || maxHigh <= minHigh) {
    return { score: 0.7, reason: `Estimate: $${estimateHigh.toFixed(2)} (no comparison)` };
  }
  const t = (estimateHigh - minHigh) / (maxHigh - minHigh);
  return {
    score: clamp(1.0 - t * 0.9, 0.1, 1.0),
    reason: `Estimate: $${estimateHigh.toFixed(2)} (range $${minHigh.toFixed(2)}–$${maxHigh.toFixed(2)})`,
  };
}

async function scoreCompletion(
  tenantId: string,
): Promise<{ score: number; reason: string; completed: number; total: number }> {
  try {
    const workspaces = await db.workspace.findMany({
      where: { tenantId },
      select: { id: true },
    });
    if (workspaces.length === 0) return { score: 0.5, reason: 'No jobs yet (new tenant)', completed: 0, total: 0 };
    const workspaceIds = workspaces.map((w) => w.id);
    const [total, completed] = await Promise.all([
      db.job.count({ where: { workspaceId: { in: workspaceIds } } }),
      db.job.count({
        where: {
          workspaceId: { in: workspaceIds },
          status: { in: ['completed', 'invoiced', 'closed'] },
        },
      }),
    ]);
    if (total === 0) return { score: 0.5, reason: 'No jobs yet (new tenant)', completed: 0, total: 0 };
    const rate = clamp(completed / total, 0, 1);
    return {
      score: rate,
      reason: `${completed}/${total} jobs completed (${Math.round(rate * 100)}%)`,
      completed,
      total,
    };
  } catch {
    return { score: 0.5, reason: 'Completion stats unavailable', completed: 0, total: 0 };
  }
}

async function findAndScoreProviders(
  industry: string | null,
  urgency: string,
  location: string | null,
  preferredTime: string | null,
  serviceId: string | null,
): Promise<ProviderScore[]> {
  // ── Candidate pool ──
  const where: Record<string, unknown> = {
    marketplaceOptIn: true,
    identityVerified: true,
    businessVerified: true,
    insuranceVerified: true,
    stripeConnected: true,
    planStatus: 'active',
  };

  let tenants;
  try {
    tenants = await db.tenant.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        industry: true,
        city: true,
        state: true,
        postalCode: true,
        country: true,
        currency: true,
        rating: true,
        reviewCount: true,
        emergencyServiceAvailable: true,
        businessHoursJson: true,
        serviceAreasJson: true,
        businessCategoriesJson: true,
        pricingType: true,
        callOutFee: true,
        travelFeePerKm: true,
        emergencySurchargePct: true,
        weekendSurchargePct: true,
      },
      orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
      take: MAX_CANDIDATES,
    });
  } catch (err) {
    logger.warn(
      { err: err instanceof Error ? err.message : String(err) },
      'marketplace/book/ai-auto: candidate fetch failed',
    );
    return [];
  }

  // Filter by industry (if specified).
  const filteredByIndustry = industry
    ? tenants.filter((t) => {
        if (norm(t.industry) === norm(industry)) return true;
        const cats = safeJsonParse<string[]>(t.businessCategoriesJson, []);
        return cats.some((c) => norm(c) === norm(industry));
      })
    : tenants;

  // Filter emergency providers.
  const filtered =
    urgency === 'emergency'
      ? filteredByIndustry.filter((t) => t.emergencyServiceAvailable)
      : filteredByIndustry;

  if (filtered.length === 0) return [];

  // ── Score each candidate ──
  type Intermediate = {
    tenant: (typeof filtered)[number];
    estimateLow: number | null;
    estimateHigh: number | null;
    estimatedDurationMins: number | null;
    completion: { completed: number; total: number; score: number; reason: string };
  };

  const intermediates: Intermediate[] = [];
  for (const tenant of filtered) {
    let estimateLow: number | null = null;
    let estimateHigh: number | null = null;
    let estimatedDurationMins: number | null = null;
    try {
      const estimate = await estimatePrice({
        tenantId: tenant.id,
        serviceId: serviceId ?? undefined,
        urgency: urgency as 'low' | 'medium' | 'high' | 'emergency',
        scheduledAt: preferredTime ? new Date(preferredTime) : undefined,
      });
      if (estimate) {
        estimateLow = estimate.low;
        estimateHigh = estimate.high;
        estimatedDurationMins = estimate.estimatedDurationMins;
      }
    } catch (err) {
      logger.warn(
        { tenantId: tenant.id, err: err instanceof Error ? err.message : String(err) },
        'marketplace/book/ai-auto: estimatePrice failed',
      );
    }
    const completion = await scoreCompletion(tenant.id);
    intermediates.push({
      tenant,
      estimateLow,
      estimateHigh,
      estimatedDurationMins,
      completion: {
        completed: completion.completed,
        total: completion.total,
        score: completion.score,
        reason: completion.reason,
      },
    });
  }

  const validHighs = intermediates
    .map((i) => i.estimateHigh)
    .filter((v): v is number => v != null && v > 0);
  const minHigh = validHighs.length > 0 ? Math.min(...validHighs) : null;
  const maxHigh = validHighs.length > 0 ? Math.max(...validHighs) : null;

  const providers: ProviderScore[] = intermediates.map((i) => {
    const t = i.tenant;
    const reasons: string[] = [];

    const reviews = scoreReviews(t.rating, t.reviewCount);
    if (reviews.score > 0) reasons.push(reviews.reason);

    const distance = scoreDistance(t, location);
    if (distance.reason) reasons.push(distance.reason);

    const availability = scoreAvailability(
      t.businessHoursJson,
      t.emergencyServiceAvailable,
      preferredTime,
      urgency,
    );
    reasons.push(availability.reason);

    const skills = scoreSkills(t, industry);
    if (skills.score < 1.0 && industry) reasons.push(skills.reason);

    const price = scorePrice(i.estimateHigh, minHigh, maxHigh);
    reasons.push(price.reason);

    // Completion stats were pre-loaded in the loop above.
    const completionScore = i.completion.score;
    const completionReason = i.completion.reason;

    const score =
      reviews.score * WEIGHTS.reviews +
      distance.score * WEIGHTS.distance +
      availability.score * WEIGHTS.availability +
      skills.score * WEIGHTS.skills +
      price.score * WEIGHTS.price +
      completionScore * WEIGHTS.completion;

    return {
      tenantId: t.id,
      tenantName: t.name,
      slug: t.slug,
      industry: t.industry,
      city: t.city,
      state: t.state,
      rating: t.rating,
      reviewCount: t.reviewCount,
      emergencyServiceAvailable: t.emergencyServiceAvailable,
      currency: t.currency,
      estimatedPriceLow: i.estimateLow,
      estimatedPriceHigh: i.estimateHigh,
      estimatedDurationMins: i.estimatedDurationMins,
      score: clamp(score, 0, 1),
      breakdown: {
        reviews: reviews.score,
        distance: distance.score,
        availability: availability.score,
        skills: skills.score,
        price: price.score,
        completion: completionScore,
      },
      reasons: [...reasons, completionReason],
    };
  });

  providers.sort((a, b) => {
    if (Math.abs(a.score - b.score) > 0.0001) return b.score - a.score;
    if (a.rating !== b.rating) return b.rating - a.rating;
    return b.reviewCount - a.reviewCount;
  });

  return providers;
}

export async function POST(request: NextRequest) {
  const log = withRequestId(request);

  // ── 1. Rate limit ──────────────────────────────────────────────────
  const limited = applyRateLimit(apiLimiter, request);
  if (limited) {
    log.warn({ ip: limited.ip }, 'marketplace/book/ai-auto: rate limited');
    return rateLimitResponse(limited.resetAtMs);
  }

  // ── 2. Parse + validate body ───────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const serviceId =
    typeof body.serviceId === 'string' && body.serviceId.trim().length > 0
      ? body.serviceId.trim()
      : null;
  const industry =
    typeof body.industry === 'string' && body.industry.trim().length > 0
      ? body.industry.trim().toLowerCase()
      : null;
  const urgencyRaw =
    typeof body.urgency === 'string' ? body.urgency.toLowerCase().trim() : '';
  if (!ALLOWED_URGENCIES.has(urgencyRaw)) {
    return NextResponse.json(
      { error: '`urgency` must be one of: low | medium | high | emergency.' },
      { status: 400 },
    );
  }
  const urgency = urgencyRaw as 'low' | 'medium' | 'high' | 'emergency';

  const location =
    typeof body.location === 'string' && body.location.trim().length > 0
      ? body.location.trim().slice(0, 200)
      : null;
  const scheduledAtRaw =
    typeof body.scheduledAt === 'string' && body.scheduledAt.trim().length > 0
      ? body.scheduledAt.trim()
      : null;
  if (scheduledAtRaw && Number.isNaN(new Date(scheduledAtRaw).getTime())) {
    return NextResponse.json(
      { error: '`scheduledAt` must be a valid ISO datetime.' },
      { status: 400 },
    );
  }
  const customerName =
    typeof body.customerName === 'string' ? body.customerName.trim() : '';
  const customerPhone =
    typeof body.customerPhone === 'string' ? body.customerPhone.trim() : '';
  const customerEmail =
    typeof body.customerEmail === 'string' && body.customerEmail.trim().length > 0
      ? body.customerEmail.trim()
      : null;
  const address =
    typeof body.address === 'string' ? body.address.trim() : '';
  const notes =
    typeof body.notes === 'string' && body.notes.trim().length > 0
      ? body.notes.trim().slice(0, 2000)
      : null;

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
  if (!address || address.length < 5) {
    return NextResponse.json(
      { error: '`address` is required (min 5 chars).' },
      { status: 400 },
    );
  }
  if (industry && !getIndustry(industry)) {
    return NextResponse.json(
      { error: `\`industry\` "${industry}" is not a recognized industry id.` },
      { status: 400 },
    );
  }

  // ── 3. Run the AI dispatcher scoring inline ────────────────────────
  const providers = await findAndScoreProviders(
    industry,
    urgency,
    location,
    scheduledAtRaw,
    serviceId,
  );

  if (providers.length === 0) {
    log.info(
      { industry, urgency, location },
      'marketplace/book/ai-auto: no providers found',
    );
    return NextResponse.json(
      {
        error: 'No marketplace-eligible providers match this request.',
        message:
          'Try widening the industry filter or removing the location constraint.',
      },
      { status: 404 },
    );
  }

  const best = providers[0]!;
  const providerTenantId = best.tenantId;

  // ── 4. Load provider tenant + workspace + service name ─────────────
  let provider: {
    id: string;
    name: string;
    slug: string;
    currency: string;
    email: string | null;
    phone: string | null;
  } | null;
  try {
    provider = await db.tenant.findUnique({
      where: { id: providerTenantId },
      select: { id: true, name: true, slug: true, currency: true, email: true, phone: true },
    });
  } catch (err) {
    log.error({ err, providerTenantId }, 'marketplace/book/ai-auto: provider lookup failed');
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
  if (!provider) {
    return NextResponse.json(
      { error: 'Selected provider no longer exists.' },
      { status: 404 },
    );
  }

  let workspaceId: string | null = null;
  try {
    const ws = await db.workspace.findFirst({
      where: { tenantId: provider.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    workspaceId = ws?.id ?? null;
  } catch {
    // ignore
  }

  let serviceName: string | null = null;
  let service: { id: string; name: string; basePrice: number | null } | null = null;
  if (serviceId) {
    try {
      const svc = await db.service.findFirst({
        where: { id: serviceId, tenantId: provider.id, isActive: true },
        select: { id: true, name: true, basePrice: true },
      });
      if (svc) {
        serviceName = svc.name;
        service = svc;
      }
    } catch {
      // ignore
    }
  }

  // ── 5. Compute commission + provider amount (use best's high estimate) ──
  const grossAmount = best.estimatedPriceHigh ?? 0;
  const commissionAmount =
    Math.round(grossAmount * DEFAULT_COMMISSION_PCT) / 100;
  const providerAmount =
    Math.round((grossAmount - commissionAmount) * 100) / 100;
  const currency = provider.currency || 'USD';

  const scheduledAt = scheduledAtRaw ? new Date(scheduledAtRaw) : new Date();
  const title = serviceName
    ? `AI Auto-Assigned — ${serviceName}`
    : 'AI Auto-Assigned Marketplace Booking';
  const description = notes || `AI auto-assigned to ${provider.name} (score ${best.score.toFixed(3)})`;

  // ── 6. Create Booking + MarketplaceTransaction + Job atomically ────
  let result: {
    booking: Record<string, unknown>;
    job: Record<string, unknown>;
    transactionId: string;
  };
  try {
    result = await db.$transaction(async (tx) => {
      const b = await tx.booking.create({
        data: {
          title,
          description,
          bookingType: 'ai_auto',
          status: 'confirmed',
          source: 'website',
          customerName,
          customerPhone,
          customerEmail,
          serviceId,
          address,
          scheduledAt,
          duration: best.estimatedDurationMins ?? 60,
          notes,
          confirmedAt: new Date(),
          tenantId: provider.id,
          workspaceId,
          metadataJson: JSON.stringify({
            marketplaceFlow: 'ai_auto',
            providerTenantId: provider.id,
            aiScore: best.score,
            aiBreakdown: best.breakdown,
            createdAt: new Date().toISOString(),
          }),
        },
      });

      const txn = await tx.marketplaceTransaction.create({
        data: {
          tenantId: provider.id,
          customerName,
          customerPhone,
          customerEmail,
          bookingId: b.id,
          bookingType: 'ai_auto',
          serviceDescription: serviceName || title,
          totalAmount: grossAmount,
          commissionPct: DEFAULT_COMMISSION_PCT,
          commissionAmount,
          providerAmount,
          currency,
          status: grossAmount > 0 ? 'escrow' : 'pending',
          metadataJson: JSON.stringify({
            flow: 'ai_auto',
            aiScore: best.score,
            createdAt: new Date().toISOString(),
          }),
        },
      });

      // 6-pre. Auto-resolve or auto-create Customer in the provider's CRM
      // (scoped via the provider tenant's workspace so the Job is linked to
      // a real Customer row that shows up in the provider's CRM 360 view).
      let customer: { id: string } | null = null;
      if (workspaceId) {
        try {
          const existing = await tx.customer.findFirst({
            where: {
              workspaceId,
              OR: [
                { phone: customerPhone },
                ...(customerEmail ? [{ email: customerEmail }] : []),
              ],
            },
            select: { id: true },
          });
          if (existing) {
            customer = existing;
          } else {
            customer = await tx.customer.create({
              data: {
                name: customerName,
                phone: customerPhone,
                email: customerEmail,
                address,
                workspaceId,
              },
              select: { id: true },
            });
          }
        } catch (custErr) {
          log.warn(
            { err: custErr, providerTenantId: provider.id },
            'marketplace/book/ai-auto: customer auto-creation failed (non-fatal)',
          );
        }
      }

      // 6-pre2. Generate 4-digit PIN + itemized service line items for CRM
      const verificationPin = Math.floor(1000 + Math.random() * 9000).toString();
      const lineItemsJson = JSON.stringify(service ? [{
        id: service.id,
        name: service.name,
        unitPrice: service.basePrice ?? grossAmount ?? 0,
        quantity: 1,
        description: service.name,
      }] : []);

      const j = await tx.job.create({
        data: {
          title,
          description,
          status: 'assigned',
          priority: urgency === 'emergency' ? 'urgent' : 'high',
          type: 'service',
          address,
          scheduledAt,
          estimatedDuration: best.estimatedDurationMins ?? 60,
          notes,
          customerName,
          customerPhone,
          customerEmail,
          customerId: customer?.id || null,
          externalId: b.id,
          externalSource: 'marketplace_booking',
          serviceId,
          quotedAmount: grossAmount > 0 ? grossAmount : (service?.basePrice ?? null),
          lineItemsJson,
          verificationPin,
          assignmentStatus: 'accepted',
          metadataJson: JSON.stringify({
            marketplaceFlow: 'ai_auto',
            bookingId: b.id,
            transactionId: txn.id,
            providerTenantId: provider.id,
            aiScore: best.score,
          }),
          workspaceId,
        },
      });

      await tx.marketplaceTransaction.update({
        where: { id: txn.id },
        data: { jobId: j.id },
      });

      return { booking: b, job: j, transactionId: txn.id };
    });
  } catch (err) {
    log.error({ err, providerTenantId: provider.id }, 'marketplace/book/ai-auto: transaction failed');
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 },
    );
  }

  // ── 7. Notify the provider (best-effort) ───────────────────────────
  notifyOwner(provider.id, {
    eventType: 'marketplace.booking.ai_auto',
    eventLabel: 'AI Auto-Assigned Booking',
    bookingId: (result.booking as { id: string }).id,
    actionUrl: '/bookings',
    smsMessage: `AI auto-assigned booking: ${title}, customer: ${customerName}, scheduled: ${scheduledAt.toISOString()}.`,
    emailSubject: `AI Auto-Assigned Booking: ${title}`,
    emailText: `A marketplace booking was auto-assigned to you by the AI dispatcher.\n\nTitle: ${title}\nCustomer: ${customerName}\nPhone: ${customerPhone}\n${customerEmail ? `Email: ${customerEmail}\n` : ''}Address: ${address}\nScheduled: ${scheduledAt.toISOString()}\nAI score: ${best.score.toFixed(3)}\n\nView this job in your Fieseros dashboard.`,
    emailHtml: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px"><h2 style="color:#0f172a">AI Auto-Assigned Booking</h2><p>The AI dispatcher picked you as the best provider for this marketplace request.</p><table style="width:100%;border-collapse:collapse;font-size:14px"><tr><td style="padding:8px;background:#f9fafb;font-weight:600">Title</td><td style="padding:8px">${title}</td></tr><tr><td style="padding:8px;background:#f9fafb;font-weight:600">Customer</td><td style="padding:8px">${customerName}</td></tr><tr><td style="padding:8px;background:#f9fafb;font-weight:600">Phone</td><td style="padding:8px">${customerPhone}</td></tr><tr><td style="padding:8px;background:#f9fafb;font-weight:600">Address</td><td style="padding:8px">${address}</td></tr><tr><td style="padding:8px;background:#f9fafb;font-weight:600">AI Score</td><td style="padding:8px">${best.score.toFixed(3)}</td></tr></table></div>`,
    pushTitle: 'AI Auto-Assigned Booking',
    pushBody: `${customerName} — AI matched you (${best.score.toFixed(2)})`,
  }).catch((err) => {
    log.warn({ err }, 'marketplace/book/ai-auto: provider notification failed');
  });

  log.info(
    {
      bookingId: (result.booking as { id: string }).id,
      jobId: (result.job as { id: string }).id,
      transactionId: result.transactionId,
      providerTenantId: provider.id,
      aiScore: best.score,
      candidatesEvaluated: providers.length,
    },
    'marketplace/book/ai-auto: completed',
  );

  return NextResponse.json(
    {
      booking: result.booking,
      job: result.job,
      provider: {
        tenantId: best.tenantId,
        tenantName: best.tenantName,
        slug: best.slug,
        rating: best.rating,
        reviewCount: best.reviewCount,
        estimatedPriceLow: best.estimatedPriceLow,
        estimatedPriceHigh: best.estimatedPriceHigh,
        estimatedDurationMins: best.estimatedDurationMins,
      },
      scoreBreakdown: {
        score: best.score,
        breakdown: best.breakdown,
        reasons: best.reasons,
        candidatesEvaluated: providers.length,
      },
    },
    { status: 201 },
  );
}

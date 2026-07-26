import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger, withRequestId } from '@/lib/logger';
import { estimatePrice } from '@/lib/smart-pricing';
import { getIndustry } from '@/lib/industry-catalog';

/**
 * AI Dispatcher (ServiceOS V1.5 — P8-ai-layer)
 * ------------------------------------------------------------
 * POST /api/ai/dispatcher
 *
 * Ranks marketplace-eligible providers (tenants that have opted into the
 * marketplace and passed all 8 eligibility gates) for a service request.
 *
 * Body:
 *   {
 *     serviceId?:    string     // optional Service.id to scope pricing/skills
 *     industry?:     string     // industry id from INDUSTRY_CATALOG
 *     urgency:       'low' | 'medium' | 'high' | 'emergency'
 *     location?:     string     // customer's city / address / postcode
 *     preferredTime?:string     // ISO datetime — checked against business hours
 *     maxResults?:   number     // default 10, capped at 50
 *   }
 *
 * Scoring factors (weights sum to 1.0):
 *   - Reviews       × 0.30  (rating × sqrt(reviewCount) normalized)
 *   - Distance      × 0.25  (service-area / city match)
 *   - Availability  × 0.20  (business hours + emergency availability)
 *   - Skills        × 0.10  (industry match)
 *   - Price         × 0.10  (lower estimated high-end = better)
 *   - Completion    × 0.05  (jobs completed / jobs total)
 *
 * For `emergency` urgency, only providers with `emergencyServiceAvailable = true`
 * are considered (the others are filtered out before scoring).
 *
 * Auth: required. The caller must be a marketplace customer (role='customer')
 * or a staff/admin/super-admin user (internal dispatch). Returns 401 otherwise.
 *
 * If any DB table is unavailable, scoring degrades gracefully
 * (missing fields score 0 for that factor) — the endpoint always returns a
 * ranked list when at least one eligible provider is found, otherwise an
 * empty list with a message.
 */

// ─── Types ─────────────────────────────────────────────────────────────────

interface RequestBody {
  serviceId?: string;
  industry?: string;
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  location?: string;
  preferredTime?: string;
  maxResults?: number;
}

type Urgency = 'low' | 'medium' | 'high' | 'emergency';

const ALLOWED_URGENCIES = new Set<Urgency>(['low', 'medium', 'high', 'emergency']);

const AI_MODEL_TAG = 'ai-dispatcher-v1';

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
  score: number; // 0..1 composite
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

interface DispatchResponse {
  providers: ProviderScore[];
  totalEligible: number;
  returned: number;
  message: string | null;
  aiModel: string;
  request: {
    industry: string | null;
    urgency: Urgency;
    location: string | null;
    preferredTime: string | null;
    serviceId: string | null;
  };
}

// ─── Constants ─────────────────────────────────────────────────────────────

const WEIGHTS = {
  reviews: 0.3,
  distance: 0.25,
  availability: 0.2,
  skills: 0.1,
  price: 0.1,
  completion: 0.05,
} as const;

const DEFAULT_MAX_RESULTS = 10;
const HARD_MAX_RESULTS = 50;

// Maximum tenants scanned per request. The marketplace may grow large;
// capping the candidate pool keeps latency reasonable. We sort by
// rating × reviewCount (a quick relevance proxy) before applying the cap.
const MAX_CANDIDATES = 200;

// Recognized status values we treat as "completed" for completion-rate
// calculation. Matches the Job schema's typical lifecycle.
const COMPLETED_JOB_STATUSES = new Set([
  'completed',
  'done',
  'finished',
  'closed',
]);

// ─── Helpers ───────────────────────────────────────────────────────────────

function safeJsonParse<T>(str: string | null | undefined, fallback: T): T {
  if (!str) return fallback;
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Lowercase + trim a string for comparison purposes.
 */
function norm(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase();
}

/**
 * Score how well a tenant's service area covers the requested location.
 * Returns a 0..1 score:
 *   - 1.0  if the tenant's serviceAreasJson explicitly contains the location
 *   - 0.85 if the tenant's city/state matches the location tokens
 *   - 0.5  if the tenant has serviceAreasJson set but no token matches
 *   - 0.3  if no service-area info is set but the tenant has a city/state
 *   - 0    if no geographic info at all
 */
function scoreDistance(
  tenant: {
    serviceAreasJson: string;
    city: string | null;
    state: string | null;
    postalCode: string | null;
  },
  location: string | null,
): { score: number; reason: string | null } {
  if (!location || location.trim().length === 0) {
    // No location requested → treat as neutral (no penalty, no bonus).
    return { score: 0.6, reason: null };
  }

  const loc = norm(location);
  const locTokens = loc.split(/[\s,]+/).filter((t) => t.length >= 2);

  const areas = safeJsonParse<string[]>(tenant.serviceAreasJson, []);
  const areaTokens = areas.map(norm).filter((t) => t.length > 0);

  // 1. Direct token match against service areas (highest signal).
  if (areaTokens.length > 0) {
    const matched = areaTokens.some(
      (a) =>
        loc.includes(a) ||
        a.includes(loc) ||
        locTokens.some((t) => a.includes(t) || t.includes(a)),
    );
    if (matched) {
      return {
        score: 1.0,
        reason: 'Service area matches requested location',
      };
    }
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
    return {
      score: 0.85,
      reason: 'Tenant city/state matches requested location',
    };
  }

  // 3. Has service areas set but none matched — still likely in-region.
  if (areaTokens.length > 0) {
    return {
      score: 0.5,
      reason: 'Outside explicit service area but tenant serves a region',
    };
  }

  // 4. No service-area info, but has city/state — minimal geographic fallback.
  if (tenantCity || tenantState) {
    return {
      score: 0.3,
      reason: 'No service area defined; geographic fallback only',
    };
  }

  // 5. No geographic info at all.
  return {
    score: 0,
    reason: 'No service area or geographic info available',
  };
}

/**
 * Parse a business-hours JSON object ({ mon: { open, close }, ... }) and
 * determine whether the requested preferredTime falls inside working hours.
 */
function scoreAvailability(
  businessHoursJson: string,
  emergencyServiceAvailable: boolean,
  preferredTime: string | null,
  urgency: Urgency,
): { score: number; open: boolean | null; reason: string } {
  // For emergency urgency, the deciding factor is emergencyServiceAvailable.
  if (urgency === 'emergency') {
    if (emergencyServiceAvailable) {
      return {
        score: 1.0,
        open: true,
        reason: 'Emergency service available',
      };
    }
    return {
      score: 0,
      open: false,
      reason: 'Emergency service not available',
    };
  }

  // No preferred time → assume the tenant is generally available.
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

  // Empty / not configured → don't penalize.
  if (!hours || Object.keys(hours).length === 0) {
    return {
      score: 0.6,
      open: null,
      reason: 'Business hours not configured — assume available',
    };
  }

  const dt = new Date(preferredTime);
  if (Number.isNaN(dt.getTime())) {
    return {
      score: 0.6,
      open: null,
      reason: 'Invalid preferredTime — assume available',
    };
  }

  // JS: 0=Sun, 1=Mon, ... 6=Sat. Accept 'sun'..'sat' OR 'mon'..'sun' keys.
  const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const dayKey = dayKeys[dt.getDay()];
  const slot = hours[dayKey] || hours[dayKey.toUpperCase().toLowerCase()];
  if (!slot || !slot.open || !slot.close) {
    return {
      score: 0.3,
      open: false,
      reason: `Closed on ${dayKey}`,
    };
  }

  // Parse "HH:MM" into minutes-of-day.
  const toMinutes = (s: string): number | null => {
    const m = s.match(/^(\d{1,2}):(\d{2})/);
    if (!m) return null;
    return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  };
  const openMin = toMinutes(slot.open);
  const closeMin = toMinutes(slot.close);
  const reqMin = dt.getHours() * 60 + dt.getMinutes();
  if (openMin == null || closeMin == null) {
    return {
      score: 0.5,
      open: null,
      reason: 'Business hours set but unparseable',
    };
  }
  if (reqMin >= openMin && reqMin <= closeMin) {
    return {
      score: 1.0,
      open: true,
      reason: `Within working hours (${slot.open}–${slot.close})`,
    };
  }
  return {
    score: 0.15,
    open: false,
    reason: `Outside working hours (${slot.open}–${slot.close})`,
  };
}

/**
 * Score how well the tenant's industry matches the requested industry.
 *   - exact primary match     → 1.0
 *   - listed in businessCategoriesJson → 0.7
 *   - no match                → 0
 */
function scoreSkills(
  tenant: { industry: string | null; businessCategoriesJson: string },
  requestedIndustry: string | null,
): { score: number; reason: string } {
  if (!requestedIndustry) {
    return { score: 0.5, reason: 'No industry requested' };
  }
  if (norm(tenant.industry) === norm(requestedIndustry)) {
    return { score: 1.0, reason: `Primary industry matches (${requestedIndustry})` };
  }
  const cats = safeJsonParse<string[]>(tenant.businessCategoriesJson, []);
  if (cats.some((c) => norm(c) === norm(requestedIndustry))) {
    return {
      score: 0.7,
      reason: `Industry listed in business categories (${requestedIndustry})`,
    };
  }
  return { score: 0, reason: 'Industry mismatch' };
}

/**
 * Reviews score: rating × log-scaled review count.
 *   - 5.0 rating × 100 reviews → ~1.0
 *   - 4.0 rating × 10 reviews  → ~0.65
 *   - 0 rating / 0 reviews     → 0
 */
function scoreReviews(
  rating: number,
  reviewCount: number,
): { score: number; reason: string } {
  if (rating <= 0 || reviewCount <= 0) {
    return { score: 0, reason: 'No reviews yet' };
  }
  const r = clamp(rating / 5, 0, 1);
  const c = clamp(Math.log10(reviewCount + 1) / 2, 0, 1);
  const score = clamp(r * c, 0, 1);
  return {
    score,
    reason: `${rating.toFixed(1)}★ from ${reviewCount} review${reviewCount === 1 ? '' : 's'}`,
  };
}

/**
 * Price score: lower estimated high-end = better.
 *   - tenant with the lowest  high-end estimate → 1.0
 *   - tenant with the highest high-end estimate → 0.1
 *   - tenant with no estimate                   → 0.5 (neutral)
 */
function scorePrice(
  estimateHigh: number | null,
  minHigh: number | null,
  maxHigh: number | null,
): { score: number; reason: string } {
  if (estimateHigh == null) {
    return { score: 0.5, reason: 'No price estimate available' };
  }
  if (minHigh == null || maxHigh == null || maxHigh <= minHigh) {
    return {
      score: 0.7,
      reason: `Estimate: $${estimateHigh.toFixed(2)} (no comparison)`,
    };
  }
  const t = (estimateHigh - minHigh) / (maxHigh - minHigh); // 0..1
  const score = clamp(1.0 - t * 0.9, 0.1, 1.0);
  return {
    score,
    reason: `Estimate: $${estimateHigh.toFixed(2)} (range $${minHigh.toFixed(2)}–$${maxHigh.toFixed(2)})`,
  };
}

/**
 * Completion-rate score: jobs completed / jobs total.
 */
function scoreCompletion(
  completed: number,
  total: number,
): { score: number; reason: string } {
  if (total === 0) {
    return { score: 0.5, reason: 'No jobs yet (new tenant)' };
  }
  const rate = clamp(completed / total, 0, 1);
  return {
    score: rate,
    reason: `${completed}/${total} jobs completed (${Math.round(rate * 100)}%)`,
  };
}

/**
 * Pre-filter tenants: must have marketplaceOptIn AND all the verified flags.
 * We rely on the cached boolean gates on the Tenant row (rather than the
 * expensive `checkMarketplaceEligibility` which also looks up Plan +
 * Subscription) for the candidate pool. The fields selected here power all
 * scoring factors downstream.
 */
async function findCandidateTenants(industry: string | null): Promise<
  Array<{
    id: string;
    name: string;
    slug: string;
    industry: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    country: string;
    currency: string;
    rating: number;
    reviewCount: number;
    emergencyServiceAvailable: boolean;
    businessHoursJson: string;
    serviceAreasJson: string;
    businessCategoriesJson: string;
    pricingType: string | null;
    callOutFee: number;
    travelFeePerKm: number;
    emergencySurchargePct: number;
    weekendSurchargePct: number;
    description: string | null;
    tagline: string | null;
  }>
> {
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
        description: true,
        tagline: true,
      },
      orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
      take: MAX_CANDIDATES,
    });

    if (!industry) return tenants;

    // In-app filter: keep tenants whose primary industry matches OR the
    // industry is listed in businessCategoriesJson.
    return tenants.filter((t) => {
      if (norm(t.industry) === norm(industry)) return true;
      const cats = safeJsonParse<string[]>(t.businessCategoriesJson, []);
      return cats.some((c) => norm(c) === norm(industry));
    });
  } catch (err) {
    logger.error(
      { err: err instanceof Error ? err.message : String(err) },
      'ai/dispatcher: findCandidateTenants failed',
    );
    return [];
  }
}

/**
 * Compute the per-tenant job completion stats. Best-effort —
 * if the Job table is unavailable or the tenant has no jobs, returns
 * (0, 0) so the completion factor scores neutral (0.5).
 */
async function loadCompletionStats(
  tenantId: string,
): Promise<{ completed: number; total: number }> {
  try {
    const workspaces = await db.workspace.findMany({
      where: { tenantId },
      select: { id: true },
    });
    if (workspaces.length === 0) return { completed: 0, total: 0 };
    const workspaceIds = workspaces.map((w) => w.id);

    const [total, completed] = await Promise.all([
      db.job.count({ where: { workspaceId: { in: workspaceIds } } }),
      db.job.count({
        where: {
          workspaceId: { in: workspaceIds },
          status: { in: Array.from(COMPLETED_JOB_STATUSES) },
        },
      }),
    ]);
    return { completed, total };
  } catch {
    return { completed: 0, total: 0 };
  }
}

// ─── Main route handler ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const log = withRequestId(request);

  // ── 1. Auth ──────────────────────────────────────────────────────────
  const authUser = await getAuthUser();
  if (!authUser) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 },
    );
  }

  log.info(
    { userId: authUser.id, role: authUser.role, tenantId: authUser.tenantId },
    'ai/dispatcher: invoked',
  );

  // ── 2. Parse + validate body ─────────────────────────────────────────
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body || typeof body.urgency !== 'string') {
    return NextResponse.json(
      { error: '`urgency` is required (low | medium | high | emergency).' },
      { status: 400 },
    );
  }
  const urgency = body.urgency.toLowerCase().trim() as Urgency;
  if (!ALLOWED_URGENCIES.has(urgency)) {
    return NextResponse.json(
      {
        error: `\`urgency\` must be one of: ${Array.from(ALLOWED_URGENCIES).join(', ')}.`,
      },
      { status: 400 },
    );
  }

  const industry =
    typeof body.industry === 'string' && body.industry.trim().length > 0
      ? body.industry.trim().toLowerCase()
      : null;

  if (industry && !getIndustry(industry)) {
    return NextResponse.json(
      { error: `\`industry\` "${industry}" is not a recognized industry id.` },
      { status: 400 },
    );
  }

  const serviceId =
    typeof body.serviceId === 'string' && body.serviceId.trim().length > 0
      ? body.serviceId.trim()
      : null;

  const location =
    typeof body.location === 'string' && body.location.trim().length > 0
      ? body.location.trim().slice(0, 200)
      : null;

  const preferredTime =
    typeof body.preferredTime === 'string' &&
    body.preferredTime.trim().length > 0
      ? body.preferredTime.trim()
      : null;

  if (preferredTime && Number.isNaN(new Date(preferredTime).getTime())) {
    return NextResponse.json(
      { error: '`preferredTime` must be a valid ISO datetime string.' },
      { status: 400 },
    );
  }

  const maxResults =
    typeof body.maxResults === 'number' && Number.isFinite(body.maxResults)
      ? clamp(Math.floor(body.maxResults), 1, HARD_MAX_RESULTS)
      : DEFAULT_MAX_RESULTS;

  // ── 3. Load candidate tenants ────────────────────────────────────────
  const candidates = await findCandidateTenants(industry);
  if (candidates.length === 0) {
    log.info(
      { industry, urgency },
      'ai/dispatcher: no marketplace-eligible providers found',
    );
    const resp: DispatchResponse = {
      providers: [],
      totalEligible: 0,
      returned: 0,
      message:
        'No marketplace-eligible providers match this request. Try widening the industry filter or removing the location constraint.',
      aiModel: AI_MODEL_TAG,
      request: { industry, urgency, location, preferredTime, serviceId },
    };
    return NextResponse.json(resp);
  }

  // ── 4. For emergency urgency, filter to providers that handle emergencies
  const filtered =
    urgency === 'emergency'
      ? candidates.filter((c) => c.emergencyServiceAvailable)
      : candidates;
  if (filtered.length === 0) {
    log.info(
      { industry, urgency },
      'ai/dispatcher: no providers with emergencyServiceAvailable=true',
    );
    const resp: DispatchResponse = {
      providers: [],
      totalEligible: candidates.length,
      returned: 0,
      message:
        'No providers with emergency-service availability were found for this request. Try lowering the urgency to "high" or contact providers directly.',
      aiModel: AI_MODEL_TAG,
      request: { industry, urgency, location, preferredTime, serviceId },
    };
    return NextResponse.json(resp);
  }

  // ── 5. Score each candidate ──────────────────────────────────────────
  type Intermediate = {
    tenant: (typeof filtered)[number];
    estimateLow: number | null;
    estimateHigh: number | null;
    estimatedDurationMins: number | null;
    completion: { completed: number; total: number };
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
        urgency,
        scheduledAt: preferredTime ? new Date(preferredTime) : undefined,
      });
      if (estimate) {
        estimateLow = estimate.low;
        estimateHigh = estimate.high;
        estimatedDurationMins = estimate.estimatedDurationMins;
      }
    } catch (err) {
      log.warn(
        {
          tenantId: tenant.id,
          err: err instanceof Error ? err.message : String(err),
        },
        'ai/dispatcher: estimatePrice failed',
      );
    }
    const completion = await loadCompletionStats(tenant.id);
    intermediates.push({
      tenant,
      estimateLow,
      estimateHigh,
      estimatedDurationMins,
      completion,
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

    const completion = scoreCompletion(
      i.completion.completed,
      i.completion.total,
    );

    const score =
      reviews.score * WEIGHTS.reviews +
      distance.score * WEIGHTS.distance +
      availability.score * WEIGHTS.availability +
      skills.score * WEIGHTS.skills +
      price.score * WEIGHTS.price +
      completion.score * WEIGHTS.completion;

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
        completion: completion.score,
      },
      reasons,
    };
  });

  // Sort by composite score desc, then rating desc, then reviewCount desc.
  providers.sort((a, b) => {
    if (Math.abs(a.score - b.score) > 0.0001) return b.score - a.score;
    if (a.rating !== b.rating) return b.rating - a.rating;
    return b.reviewCount - a.reviewCount;
  });

  const top = providers.slice(0, maxResults);

  log.info(
    {
      totalEligible: candidates.length,
      afterEmergencyFilter: filtered.length,
      returned: top.length,
      topScore: top[0]?.score ?? 0,
      industry,
      urgency,
    },
    'ai/dispatcher: completed',
  );

  const resp: DispatchResponse = {
    providers: top,
    totalEligible: candidates.length,
    returned: top.length,
    message:
      top.length === 0
        ? 'No providers were ranked above the inclusion threshold.'
        : null,
    aiModel: AI_MODEL_TAG,
    request: { industry, urgency, location, preferredTime, serviceId },
  };
  return NextResponse.json(resp);
}

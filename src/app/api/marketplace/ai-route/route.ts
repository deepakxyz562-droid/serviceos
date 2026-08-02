import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger, withRequestId } from '@/lib/logger';
import { applyRateLimit, apiLimiter, rateLimitResponse } from '@/lib/rate-limit';
import {
  INDUSTRY_CATALOG,
  getIndustry,
  type Industry,
} from '@/lib/industry-catalog';

/**
 * Describe-Problem Router (Fieseros V1.5 — P8-ai-layer)
 * ------------------------------------------------------------
 * POST /api/marketplace/ai-route
 *
 * The KEY marketplace differentiator. A customer lands on the marketplace
 * and describes their problem in free text: "My AC stopped cooling and it's
 * 95°F inside". This endpoint:
 *
 *   1. Extracts structured data via the LLM:
 *      - category (industry id from INDUSTRY_CATALOG)
 *      - service  (specific sub-service)
 *      - urgency  (low | medium | high | emergency)
 *      - budgetLow / budgetHigh
 *      - skills, durationMins, summary, confidence
 *
 *   2. Determines the booking mode using the marketplace mapping:
 *      - Cleaning / Lawn Care / Pest Control / Pool / Car Wash  → instant
 *      - Painting / Roofing / Flooring / Construction / Remodeling → quote_request
 *      - Burst Pipe / No Electricity / Locksmith / Water Leak / Boiler → emergency
 *      - otherwise → ai_auto
 *
 *   3. Finds nearby marketplace-eligible providers matching the industry +
 *      location (top 5 by rating × reviewCount).
 *
 *   4. Returns:
 *      {
 *        extraction: { category, service, urgency, budgetLow, budgetHigh,
 *                       skills, durationMins, summary, confidence, location },
 *        bookingMode: 'instant' | 'quote_request' | 'emergency' | 'ai_auto',
 *        estimatedCost: { low, high, currency, basis: string },
 *        nearbyProviders: [{ tenantId, name, slug, rating, reviewCount,
 *                            emergencyServiceAvailable, estimatedPriceLow,
 *                            estimatedPriceHigh, currency, city, state }],
 *        recommendedAction: string,
 *        aiModel: string,
 *        fallback: boolean,
 *      }
 *
 * PUBLIC ENDPOINT — no auth required. Rate-limited via the global
 * `apiLimiter` (300/min/IP) to prevent abuse.
 *
 * AI failure handling:
 *   - If the z-ai-web-dev-sdk is unavailable, falls back to a deterministic
 *     keyword-based extractor (mirrors the extract-request route's fallback).
 *     `fallback: true` is set so the marketplace UI can flag the response.
 */

// ─── Types ─────────────────────────────────────────────────────────────────

interface RequestBody {
  text: string;
  location?: string;
  photos?: string[];
}

type Urgency = 'low' | 'medium' | 'high' | 'emergency';
type BookingMode = 'instant' | 'quote_request' | 'emergency' | 'ai_auto';

interface Extraction {
  category: string | null;
  service: string | null;
  urgency: Urgency;
  budgetLow: number | null;
  budgetHigh: number | null;
  location: string | null;
  skills: string[];
  durationMins: number | null;
  summary: string;
  confidence: number;
}

interface NearbyProvider {
  tenantId: string;
  name: string;
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
  inServiceArea: boolean;
}

interface AiRouteResponse {
  extraction: Extraction;
  bookingMode: BookingMode;
  estimatedCost: {
    low: number;
    high: number;
    currency: string;
    basis: string;
  };
  nearbyProviders: NearbyProvider[];
  recommendedAction: string;
  aiModel: string;
  fallback: boolean;
}

const AI_MODEL_TAG = 'z-ai-web-dev-sdk';
const FALLBACK_MODEL_TAG = 'keyword-fallback';

const MAX_TEXT_LEN = 8000;
const MAX_LOCATION_LEN = 200;
const MAX_PROVIDERS = 5;
const MAX_CANDIDATES = 100;

const ALLOWED_URGENCIES = new Set<Urgency>(['low', 'medium', 'high', 'emergency']);
const ALLOWED_BOOKING_MODES = new Set<BookingMode>([
  'instant',
  'quote_request',
  'emergency',
  'ai_auto',
]);

const VALID_CATEGORY_IDS = new Set(INDUSTRY_CATALOG.map((i) => i.id));
const INDUSTRY_BY_ID = new Map<string, Industry>(
  INDUSTRY_CATALOG.map((i) => [i.id, i]),
);

// ─── Booking-mode rules (mirrors extract-request) ──────────────────────────

const INSTANT_CATEGORIES = new Set([
  'cleaning',
  'landscaping', // lawn care
  'pest-control',
  'pool-spa',
  'automotive', // car wash
]);

const QUOTE_REQUEST_CATEGORIES = new Set([
  'painting',
  'roofing',
  'flooring',
  'construction',
  'home-services', // remodeling
]);

const EMERGENCY_KEYWORDS = [
  'burst pipe',
  'no electricity',
  'power outage',
  'lockout',
  'locked out',
  'water leak',
  'leaking',
  'boiler failure',
  'gas leak',
  'flood',
  'fire',
  'emergency',
  'urgent',
  'asap',
  'right now',
  'immediately',
  'no heat',
  'no water',
  'no ac',
  'sparking',
  'smoke',
  'smell gas',
];

function suggestBookingMode(
  category: string | null,
  service: string | null,
  urgency: Urgency,
): BookingMode {
  if (urgency === 'emergency') return 'emergency';

  const svc = (service || '').toLowerCase();
  if (
    svc.includes('car wash') ||
    svc.includes('detailing') ||
    svc.includes('lawn') ||
    svc.includes('mow') ||
    svc.includes('yard') ||
    svc.includes('pool') ||
    svc.includes('pest') ||
    svc.includes('cleaning')
  ) {
    return 'instant';
  }
  if (
    svc.includes('paint') ||
    svc.includes('roof') ||
    svc.includes('floor') ||
    svc.includes('construct') ||
    svc.includes('remodel') ||
    svc.includes('renovat') ||
    svc.includes('build') ||
    svc.includes('install')
  ) {
    return 'quote_request';
  }
  if (
    svc.includes('burst') ||
    svc.includes('leak') ||
    svc.includes('lockout') ||
    svc.includes('boiler') ||
    svc.includes('emergency')
  ) {
    return 'emergency';
  }

  if (category && INSTANT_CATEGORIES.has(category)) return 'instant';
  if (category && QUOTE_REQUEST_CATEGORIES.has(category)) return 'quote_request';

  return 'ai_auto';
}

function detectUrgency(text: string): Urgency {
  const t = text.toLowerCase();
  if (EMERGENCY_KEYWORDS.some((kw) => t.includes(kw))) return 'emergency';
  if (/\b(today|tonight|this (morning|afternoon|evening)|right away|as soon as possible)\b/.test(t)) {
    return 'high';
  }
  if (/\b(this week|tomorrow|in a few days|couple of days)\b/.test(t)) {
    return 'high';
  }
  if (/\b(no rush|whenever|not urgent|flexible|anytime|next (week|month))\b/.test(t)) {
    return 'low';
  }
  return 'medium';
}

function detectBudget(text: string): { low: number | null; high: number | null } {
  const t = text.toLowerCase();
  const rangeMatch = t.match(
    /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:-|to|–|until)\s*\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/,
  );
  if (rangeMatch) {
    const low = parseFloat(rangeMatch[1].replace(/,/g, ''));
    const high = parseFloat(rangeMatch[2].replace(/,/g, ''));
    if (Number.isFinite(low) && Number.isFinite(high) && low <= high) {
      return { low, high };
    }
  }
  const singleMatch = t.match(
    /(?:budget|around|about|up to|under|max(?:imum)?|approximately|approx\.?)?\s*\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/,
  );
  if (singleMatch) {
    const v = parseFloat(singleMatch[1].replace(/,/g, ''));
    if (Number.isFinite(v)) {
      return { low: Math.round(v * 0.7), high: v };
    }
  }
  return { low: null, high: null };
}

function detectLocation(text: string): string | null {
  const patterns = [
    /\b(?:in|near|at|around|from)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,2}(?:,\s*[A-Z]{2})?)/,
    /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,1},\s*[A-Z]{2}\b)/,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[1]) {
      const loc = m[1].trim();
      if (loc.length >= 2 && loc.length <= 60) return loc;
    }
  }
  return null;
}

/**
 * Score every industry against the free-text by counting keyword hits
 * (industry id, name, sub-service names). Returns the best industry +
 * best matching sub-service slug, or nulls.
 */
function keywordMatchIndustry(
  text: string,
): { industry: Industry | null; subServiceSlug: string | null; score: number } {
  const t = ` ${text.toLowerCase()} `;
  let best: Industry | null = null;
  let bestScore = 0;
  let bestSubSlug: string | null = null;

  for (const industry of INDUSTRY_CATALOG) {
    let score = 0;
    if (t.includes(industry.id)) score += 3;
    if (t.includes(industry.name.toLowerCase())) score += 5;

    let subSlug: string | null = null;
    let subBestScore = 0;
    for (const ss of industry.subServices) {
      let ssScore = 0;
      if (t.includes(ss.slug)) ssScore += 3;
      if (t.includes(ss.name.toLowerCase())) ssScore += 5;
      if (ssScore > subBestScore) {
        subBestScore = ssScore;
        subSlug = ss.slug;
      }
    }
    score += subBestScore;

    if (score > bestScore) {
      bestScore = score;
      best = industry;
      bestSubSlug = subSlug;
    }
  }

  return {
    industry: bestScore > 0 ? best : null,
    subServiceSlug: bestSubSlug,
    score: bestScore,
  };
}

/**
 * Parse a human-readable duration like "1h 30m", "45m", "2h" → minutes.
 */
function parseDurationMinutes(s: string | null | undefined): number | null {
  if (!s) return null;
  let mins = 0;
  const hMatch = s.match(/(\d+(?:\.\d+)?)\s*h/i);
  const mMatch = s.match(/(\d+)\s*m/i);
  if (hMatch) mins += Math.round(parseFloat(hMatch[1]) * 60);
  if (mMatch) mins += parseInt(mMatch[1], 10);
  return mins > 0 ? mins : null;
}

function makeSummary(
  raw: string,
  industryName: string | null,
  service: string | null,
): string {
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  const head = trimmed.length > 140 ? trimmed.slice(0, 137) + '…' : trimmed;
  if (industryName && service) return `${service} request — ${head}`;
  if (industryName) return `${industryName} request — ${head}`;
  return head || 'Service request';
}

/**
 * Pure keyword-based extraction — the deterministic fallback when the
 * z-ai-web-dev-sdk is unavailable. Mirrors the extract-request route's
 * keywordFallback.
 */
function keywordFallback(text: string): Extraction {
  const urgency = detectUrgency(text);
  const { industry, subServiceSlug, score } = keywordMatchIndustry(text);
  const budget = detectBudget(text);
  const location = detectLocation(text);

  const category = industry?.id ?? null;
  let service: string | null = null;
  if (industry && subServiceSlug) {
    const ss = industry.subServices.find((s) => s.slug === subServiceSlug);
    service = ss?.name ?? subServiceSlug;
  } else if (industry) {
    service = industry.name;
  }

  let durationMins: number | null = null;
  if (industry && industry.subServices.length > 0) {
    const durations = industry.subServices
      .map((s) => parseDurationMinutes(s.duration))
      .filter((d): d is number => d != null);
    if (durations.length > 0) {
      durations.sort((a, b) => a - b);
      durationMins = durations[Math.floor(durations.length / 2)];
    }
  }

  const skills = industry
    ? Array.from(new Set(industry.employeeRoles)).slice(0, 4)
    : [];

  const confidence = Math.min(0.6, 0.3 + score * 0.1);

  let budgetLow = budget.low;
  let budgetHigh = budget.high;
  if (budgetLow == null || budgetHigh == null) {
    if (industry && industry.subServices.length > 0) {
      const prices = industry.subServices
        .map((s) => s.defaultPrice)
        .filter((p) => p > 0);
      if (prices.length > 0) {
        prices.sort((a, b) => a - b);
        budgetLow = budgetLow ?? prices[0];
        budgetHigh = budgetHigh ?? prices[prices.length - 1];
      }
    }
  }

  const summary = makeSummary(text, industry?.name ?? null, service);

  return {
    category,
    service,
    urgency,
    budgetLow,
    budgetHigh,
    location,
    skills,
    durationMins,
    summary,
    confidence,
  };
}

// ─── LLM helpers ───────────────────────────────────────────────────────────

async function getZai(): Promise<any | null> {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    return await ZAI.create();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[marketplace/ai-route] ZAI SDK unavailable, using fallback:', msg);
    return null;
  }
}

async function callLLMJson(
  zai: any,
  rawText: string,
): Promise<string | null> {
  const categoryList = INDUSTRY_CATALOG.map((i) => i.id).join(', ');
  const catalogDigest = INDUSTRY_CATALOG.map(
    (i) =>
      `- ${i.id}: ${i.subServices
        .slice(0, 8)
        .map((s) => s.name)
        .join(' | ')}`,
  ).join('\n');

  const systemPrompt = `You are a service-request analyzer for a home-services marketplace.
Analyze the customer's problem description and extract structured data.

Return a JSON object with these fields:
{
  "category": "one of: ${categoryList}",
  "service": "specific sub-service within the category (use a real sub-service name when possible)",
  "urgency": "low | medium | high | emergency",
  "budgetLow": number (estimated minimum cost in USD),
  "budgetHigh": number (estimated maximum cost in USD),
  "location": "extracted location if mentioned, null otherwise",
  "skills": ["required technician skills"],
  "durationMins": estimated_duration_in_minutes,
  "confidence": 0.0-1.0,
  "summary": "one-sentence summary of the problem"
}

Reference catalog (pick \`category\` from the left column, \`service\` from the right):
${catalogDigest}

Respond with a single JSON object only — no markdown, no prose, no code fences.`;

  try {
    const response = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: rawText.slice(0, 4000) },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });
    const text = response?.choices?.[0]?.message?.content;
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return null;
    }
    return text;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[marketplace/ai-route] LLM call failed:', msg);
    return null;
  }
}

function normalizeLLMOutput(raw: string, originalText: string): Extraction {
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        parsed = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
      } catch {
        parsed = {};
      }
    }
  }

  // Category — coerce to a known industry id.
  let category: string | null = null;
  if (typeof parsed.category === 'string') {
    const c = parsed.category.toLowerCase().trim();
    if (VALID_CATEGORY_IDS.has(c)) {
      category = c;
    } else {
      const fuzzy = INDUSTRY_CATALOG.find(
        (i) => i.id.includes(c) || c.includes(i.id) || i.name.toLowerCase() === c,
      );
      category = fuzzy?.id ?? null;
    }
  }

  const service =
    typeof parsed.service === 'string' && parsed.service.trim().length > 0
      ? parsed.service.trim().slice(0, 200)
      : null;

  let urgency: Urgency = 'medium';
  if (typeof parsed.urgency === 'string') {
    const u = parsed.urgency.toLowerCase().trim() as Urgency;
    if (ALLOWED_URGENCIES.has(u)) urgency = u;
  }

  const budgetLow = Number.isFinite(Number(parsed.budgetLow))
    ? Math.max(0, Number(parsed.budgetLow))
    : null;
  const budgetHigh = Number.isFinite(Number(parsed.budgetHigh))
    ? Math.max(0, Number(parsed.budgetHigh))
    : null;
  const saneBudget =
    budgetLow != null && budgetHigh != null && budgetLow > budgetHigh
      ? { low: budgetHigh, high: budgetLow }
      : { low: budgetLow, high: budgetHigh };

  const location =
    typeof parsed.location === 'string' && parsed.location.trim().length > 0
      ? parsed.location.trim().slice(0, 200)
      : null;

  const skills = Array.isArray(parsed.skills)
    ? parsed.skills
        .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
        .map((s) => s.trim().slice(0, 80))
        .slice(0, 12)
    : [];

  const durationMins = Number.isFinite(Number(parsed.durationMins))
    ? Math.max(0, Math.round(Number(parsed.durationMins)))
    : null;

  let confidence = Number(parsed.confidence);
  if (!Number.isFinite(confidence)) confidence = 0.5;
  confidence = Math.max(0, Math.min(1, confidence));

  const summary =
    typeof parsed.summary === 'string' && parsed.summary.trim().length > 0
      ? parsed.summary.trim().slice(0, 300)
      : makeSummary(originalText, category, service);

  return {
    category,
    service,
    urgency,
    budgetLow: saneBudget.low,
    budgetHigh: saneBudget.high,
    location,
    skills,
    durationMins,
    summary,
    confidence,
  };
}

// ─── Estimated-cost computation ────────────────────────────────────────────

/**
 * Compute an estimated cost range from the extraction. Strategy:
 *   1. If the extraction has budget hints (from the text), use them.
 *   2. Otherwise, look up the industry's sub-service default prices and
 *      widen by ±20%.
 *   3. For emergency urgency, apply a +40% surcharge on the high end.
 *   4. As a last resort, return a wide marketplace default ($75–$500).
 */
function computeEstimatedCost(
  extraction: Extraction,
): { low: number; high: number; currency: string; basis: string } {
  const currency = 'USD';

  // 1. Use extracted budget if present.
  if (extraction.budgetLow != null && extraction.budgetHigh != null) {
    let low = extraction.budgetLow;
    let high = extraction.budgetHigh;
    if (extraction.urgency === 'emergency') {
      high = Math.round(high * 1.4);
    }
    return {
      low,
      high,
      currency,
      basis: 'Extracted from customer-provided budget hint',
    };
  }

  // 2. Industry sub-service defaults.
  if (extraction.category) {
    const industry = INDUSTRY_BY_ID.get(extraction.category);
    if (industry && industry.subServices.length > 0) {
      const prices = industry.subServices
        .map((s) => s.defaultPrice)
        .filter((p) => p > 0);
      if (prices.length > 0) {
        prices.sort((a, b) => a - b);
        const low = Math.round(prices[0] * 0.8);
        let high = Math.round(prices[prices.length - 1] * 1.2);
        if (extraction.urgency === 'emergency') {
          high = Math.round(high * 1.4);
        }
        return {
          low,
          high,
          currency,
          basis: `Industry ${industry.name} sub-service default prices`,
        };
      }
    }
  }

  // 3. Marketplace default.
  let low = 75;
  let high = 500;
  if (extraction.urgency === 'emergency') {
    high = Math.round(high * 1.4);
  }
  return {
    low,
    high,
    currency,
    basis: 'Marketplace default range (no industry match)',
  };
}

// ─── Provider discovery ────────────────────────────────────────────────────

/**
 * Find marketplace-eligible tenants matching the extracted industry +
 * location. Returns at most MAX_PROVIDERS tenants sorted by rating ×
 * reviewCount, each with an in-service-area flag.
 */
async function findNearbyProviders(
  extraction: Extraction,
): Promise<NearbyProvider[]> {
  if (!extraction.category) return [];

  try {
    const where: Record<string, unknown> = {
      marketplaceOptIn: true,
      identityVerified: true,
      businessVerified: true,
      insuranceVerified: true,
      stripeConnected: true,
      planStatus: 'active',
    };

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
        serviceAreasJson: true,
        businessCategoriesJson: true,
        callOutFee: true,
        travelFeePerKm: true,
        emergencySurchargePct: true,
        weekendSurchargePct: true,
        pricingType: true,
      },
      orderBy: [{ rating: 'desc' }, { reviewCount: 'desc' }],
      take: MAX_CANDIDATES,
    });

    // Filter: primary industry OR listed in businessCategoriesJson.
    const matched = tenants.filter((t) => {
      const industry = (t.industry ?? '').toLowerCase().trim();
      if (industry === extraction.category) return true;
      let cats: string[] = [];
      try {
        cats = JSON.parse(t.businessCategoriesJson || '[]');
      } catch {
        cats = [];
      }
      return Array.isArray(cats) && cats.some((c) => typeof c === 'string' && c.toLowerCase() === extraction.category);
    });

    // For emergency urgency, only keep providers with emergencyServiceAvailable.
    const filtered =
      extraction.urgency === 'emergency'
        ? matched.filter((t) => t.emergencyServiceAvailable)
        : matched;

    // Score each on service-area match (used to sort + flag).
    type Scored = {
      tenant: (typeof filtered)[number];
      inArea: boolean;
      score: number;
    };
    const scored: Scored[] = filtered.map((tenant) => {
      const inArea = isInServiceArea(tenant.serviceAreasJson, tenant.city, tenant.state, extraction.location);
      // Score: rating × log(reviewCount+1) + service-area bonus.
      const r = (tenant.rating || 0) / 5;
      const c = Math.log10((tenant.reviewCount || 0) + 1) / 2;
      const bonus = inArea ? 0.2 : 0;
      return {
        tenant,
        inArea,
        score: Math.min(1, r * c + bonus),
      };
    });

    // Sort: in-area first, then by score desc, then rating, then reviewCount.
    scored.sort((a, b) => {
      if (a.inArea !== b.inArea) return a.inArea ? -1 : 1;
      if (Math.abs(a.score - b.score) > 0.0001) return b.score - a.score;
      if (a.tenant.rating !== b.tenant.rating) return b.tenant.rating - a.tenant.rating;
      return b.tenant.reviewCount - a.tenant.reviewCount;
    });

    // Compute per-provider estimate (best-effort).
    const top = scored.slice(0, MAX_PROVIDERS);
    return top.map(({ tenant, inArea }) => {
      // Lightweight estimate using tenant defaults (no service lookup — that
      // would require estimatePrice() which we can't import here without a
      // circular dep risk; the marketplace customer gets the platform-wide
      // estimated cost from computeEstimatedCost above).
      const callOut = tenant.callOutFee ?? 0;
      const emergencySurcharge =
        extraction.urgency === 'emergency'
          ? (callOut * (tenant.emergencySurchargePct ?? 0)) / 100
          : 0;
      // Estimate range: callOut ± 30% on low end, +100% on high end + surcharge.
      const base = callOut > 0 ? callOut : 75;
      const low = Math.round(base * 0.7);
      const high = Math.round(base * 2 + emergencySurcharge);

      return {
        tenantId: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        industry: tenant.industry,
        city: tenant.city,
        state: tenant.state,
        rating: tenant.rating,
        reviewCount: tenant.reviewCount,
        emergencyServiceAvailable: tenant.emergencyServiceAvailable,
        currency: tenant.currency || 'USD',
        estimatedPriceLow: low,
        estimatedPriceHigh: high,
        inServiceArea: inArea,
      };
    });
  } catch (err) {
    logger.warn(
      { err: err instanceof Error ? err.message : String(err) },
      'marketplace/ai-route: findNearbyProviders failed',
    );
    return [];
  }
}

function isInServiceArea(
  serviceAreasJson: string,
  city: string | null,
  state: string | null,
  location: string | null,
): boolean {
  if (!location) return false;
  const loc = location.toLowerCase().trim();
  const locTokens = loc.split(/[\s,]+/).filter((t) => t.length >= 2);

  let areas: string[] = [];
  try {
    areas = JSON.parse(serviceAreasJson || '[]');
  } catch {
    areas = [];
  }
  const areaTokens = areas
    .filter((a): a is string => typeof a === 'string')
    .map((a) => a.toLowerCase().trim())
    .filter((a) => a.length > 0);

  if (areaTokens.length > 0) {
    const matched = areaTokens.some(
      (a) =>
        loc.includes(a) ||
        a.includes(loc) ||
        locTokens.some((t) => a.includes(t) || t.includes(a)),
    );
    if (matched) return true;
  }

  const tenantCity = (city ?? '').toLowerCase().trim();
  const tenantState = (state ?? '').toLowerCase().trim();
  if (tenantCity && (loc.includes(tenantCity) || tenantCity.includes(loc))) {
    return true;
  }
  if (tenantState && locTokens.includes(tenantState)) {
    return true;
  }
  return false;
}

// ─── Recommended-action message ────────────────────────────────────────────

function buildRecommendedAction(
  extraction: Extraction,
  bookingMode: BookingMode,
  providers: NearbyProvider[],
): string {
  const industryName = extraction.category
    ? INDUSTRY_BY_ID.get(extraction.category)?.name ?? extraction.category
    : 'a service professional';

  switch (bookingMode) {
    case 'emergency':
      if (providers.length > 0) {
        return (
          `Emergency detected — we found ${providers.length} provider(s) ` +
          `available for immediate ${industryName} dispatch. ` +
          `Book the highest-rated provider now to get help fastest.`
        );
      }
      return (
        `Emergency detected, but no providers with 24/7 emergency availability were found nearby. ` +
        `Try widening your location or calling local emergency services directly.`
      );

    case 'instant':
      if (providers.length > 0) {
        return (
          `This looks like a standard ${industryName} request — book instantly with one of ` +
          `${providers.length} nearby provider(s). You can confirm a time slot in the next step.`
        );
      }
      return (
        `This looks like a standard ${industryName} request, but no instant-book providers were found nearby. ` +
        `Try a wider location radius.`
      );

    case 'quote_request':
      return (
        `This is a project-sized ${industryName} request — we recommend requesting quotes from ` +
        `${providers.length} nearby provider(s) so you can compare pricing and scope before committing.`
      );

    case 'ai_auto':
    default:
      return (
        `We've classified this as a ${industryName} request but couldn't determine the ideal booking mode. ` +
        `Request a quote from ${providers.length} nearby provider(s) and they'll advise on the best path forward.`
      );
  }
}

// ─── Main route handler ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const log = withRequestId(request);

  // ── 1. Rate limit (public endpoint — no auth required) ───────────────
  const limited = applyRateLimit(apiLimiter, request);
  if (limited) {
    log.warn(
      { ip: limited.ip },
      'marketplace/ai-route: rate limited',
    );
    return rateLimitResponse(limited.resetAtMs);
  }

  // ── 2. Parse + validate body ─────────────────────────────────────────
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body || typeof body.text !== 'string' || body.text.trim().length === 0) {
    return NextResponse.json(
      { error: '`text` is required and must be a non-empty string.' },
      { status: 400 },
    );
  }
  const rawText = body.text.slice(0, MAX_TEXT_LEN);

  const bodyLocation =
    typeof body.location === 'string' && body.location.trim().length > 0
      ? body.location.trim().slice(0, MAX_LOCATION_LEN)
      : null;

  // photos is accepted but not yet processed (would require VLM).
  // We log its presence for future analytics.
  const photoCount = Array.isArray(body.photos) ? body.photos.length : 0;

  // ── 3. Run extraction (LLM with keyword fallback) ────────────────────
  let extraction: Extraction;
  let aiModel: string;
  let fallback: boolean;

  const zai = await getZai();
  if (zai) {
    const llmText = await callLLMJson(zai, rawText);
    if (llmText) {
      extraction = normalizeLLMOutput(llmText, rawText);
      aiModel = AI_MODEL_TAG;
      fallback = false;
    } else {
      extraction = keywordFallback(rawText);
      aiModel = `${FALLBACK_MODEL_TAG} (llm-empty)`;
      fallback = true;
    }
  } else {
    extraction = keywordFallback(rawText);
    aiModel = FALLBACK_MODEL_TAG;
    fallback = true;
  }

  // Merge body-supplied location (caller can override AI detection).
  if (bodyLocation && !extraction.location) {
    extraction.location = bodyLocation;
  } else if (bodyLocation && extraction.location) {
    // Prefer the body location when both are set — the caller knows better.
    extraction.location = bodyLocation;
  }

  // ── 4. Determine booking mode ────────────────────────────────────────
  let bookingMode = suggestBookingMode(extraction.category, extraction.service, extraction.urgency);
  // Re-validate against the allowed set (defensive).
  if (!ALLOWED_BOOKING_MODES.has(bookingMode)) {
    bookingMode = 'ai_auto';
  }

  // ── 5. Find nearby providers (parallel with cost computation) ────────
  const [estimatedCost, nearbyProviders] = await Promise.all([
    Promise.resolve(computeEstimatedCost(extraction)),
    findNearbyProviders(extraction),
  ]);

  // ── 6. Build recommended action ──────────────────────────────────────
  const recommendedAction = buildRecommendedAction(
    extraction,
    bookingMode,
    nearbyProviders,
  );

  log.info(
    {
      category: extraction.category,
      service: extraction.service,
      urgency: extraction.urgency,
      bookingMode,
      providersFound: nearbyProviders.length,
      aiModel,
      fallback,
      confidence: extraction.confidence,
      photoCount,
      hasLocation: !!extraction.location,
    },
    'marketplace/ai-route: completed',
  );

  const resp: AiRouteResponse = {
    extraction,
    bookingMode,
    estimatedCost,
    nearbyProviders,
    recommendedAction,
    aiModel,
    fallback,
  };
  return NextResponse.json(resp);
}

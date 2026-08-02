import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { withRequestId } from '@/lib/logger';
import { INDUSTRY_CATALOG, type Industry } from '@/lib/industry-catalog';

/**
 * AI Request Extraction (Fieseros V1.5 — Marketplace Intake)
 * ------------------------------------------------------------
 * POST /api/ai/extract-request
 *
 * Takes a free-text problem description from any intake channel
 * (WhatsApp, phone transcript, marketplace form, website widget) and
 * extracts structured data:
 *
 *   - category   → which of the 25 industries in INDUSTRY_CATALOG
 *   - service    → specific sub-service within that industry
 *   - urgency    → low | medium | high | emergency
 *   - budgetLow  / budgetHigh  → estimated USD range
 *   - location   → extracted location if mentioned, else null
 *   - skills     → required technician skills []
 *   - durationMins → estimated duration in minutes
 *   - bookingMode → instant | quote_request | emergency | ai_auto
 *   - confidence → 0.0–1.0
 *   - summary    → one-sentence problem summary
 *
 * Result is persisted to the `RequestExtraction` table and the row ID
 * is returned alongside the extracted data so the caller can later
 * approve / reject / convert it via `/api/ai/extract-request/[id]`.
 *
 * Auth: required. The tenantId is recorded on the row so each tenant
 * only sees its own extractions. If `leadId` is supplied in the body
 * the row is back-linked to that Lead (best-effort — we do NOT verify
 * the lead belongs to the tenant here, since marketplace intake may
 * legitimately come from a shared lead pool).
 *
 * AI failure handling:
 *   - If the z-ai-web-dev-sdk cannot be imported or `ZAI.create()`
 *     throws, we fall back to a deterministic keyword-based extractor
 *     (see `keywordFallback()` below) so the endpoint is always
 *     functional even without an API key configured. The fallback
 *     yields a lower confidence (0.4–0.6) and records
 *     `aiModel: 'keyword-fallback'` so reviewers can filter.
 */

// ─── Types ─────────────────────────────────────────────────────────────────

interface RequestBody {
  text: string;
  source?: string;
  leadId?: string;
}

type Urgency = 'low' | 'medium' | 'high' | 'emergency';
type BookingMode = 'instant' | 'quote_request' | 'emergency' | 'ai_auto';

interface ExtractionResult {
  category: string | null;
  service: string | null;
  urgency: Urgency;
  budgetLow: number | null;
  budgetHigh: number | null;
  location: string | null;
  skills: string[];
  durationMins: number | null;
  bookingMode: BookingMode;
  confidence: number;
  summary: string;
}

interface PersistedRecord {
  id: string;
  tenantId: string | null;
  leadId: string | null;
  rawText: string;
  source: string;
  extractedCategory: string | null;
  extractedIndustry: string | null;
  extractedService: string | null;
  extractedUrgency: string | null;
  extractedBudget: number | null;
  extractedBudgetCurrency: string | null;
  extractedLocation: string | null;
  extractedSkillsJson: string;
  extractedDurationMins: number | null;
  estimatedCostLow: number | null;
  estimatedCostHigh: number | null;
  suggestedBookingMode: string | null;
  confidenceScore: number | null;
  aiModel: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const ALLOWED_SOURCES = new Set([
  'whatsapp',
  'phone',
  'website',
  'marketplace',
  'form',
  'chat',
  'email',
  'manual',
]);

const ALLOWED_URGENCIES = new Set<Urgency>(['low', 'medium', 'high', 'emergency']);

const ALLOWED_BOOKING_MODES = new Set<BookingMode>([
  'instant',
  'quote_request',
  'emergency',
  'ai_auto',
]);

const AI_MODEL_TAG = 'z-ai-web-dev-sdk';
const FALLBACK_MODEL_TAG = 'keyword-fallback';
const DEFAULT_CURRENCY = 'USD';

/**
 * Authoritative list of category IDs from INDUSTRY_CATALOG.
 * Used to validate the LLM's `category` output (the prompt mentions
 * a representative subset, but the model occasionally invents new
 * slugs — we coerce those to the closest valid id).
 */
const VALID_CATEGORY_IDS = new Set(INDUSTRY_CATALOG.map((i) => i.id));

/**
 * Build a lookup table of `industryId -> Industry` once at module load
 * so the LLM-output validator doesn't re-scan the catalog per request.
 */
const INDUSTRY_BY_ID = new Map<string, Industry>(
  INDUSTRY_CATALOG.map((i) => [i.id, i]),
);

/**
 * Booking-mode rules from the marketplace vision (see task P4-ai-extraction).
 * Used both as a server-side validator override AND as the entire logic
 * for the keyword fallback (since the fallback has no LLM to ask).
 */
const INSTANT_CATEGORIES = new Set([
  'cleaning',
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
];

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Suggest a booking mode based on the extracted category, service text,
 * and urgency. Returns `ai_auto` when nothing matches — the caller can
 * then surface this for human review.
 */
function suggestBookingMode(
  category: string | null,
  service: string | null,
  urgency: Urgency,
): BookingMode {
  // Emergency urgency always wins, regardless of category.
  if (urgency === 'emergency') return 'emergency';

  // Service-level keyword match (highest signal).
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

  // Category-level fallback.
  if (category && INSTANT_CATEGORIES.has(category)) return 'instant';
  if (category && QUOTE_REQUEST_CATEGORIES.has(category)) return 'quote_request';

  // No clear match — defer to a human.
  return 'ai_auto';
}

/**
 * Detect urgency from free-text. Returns `emergency` if any emergency
 * keyword is present, `high` for "soon/today/this week" cues, `low`
 * for explicit "no rush" cues, otherwise `medium`.
 */
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

/**
 * Extract USD budget hints from free-text. Looks for "$N", "$N-N",
 * "N dollars", "around N", etc. Returns [low, high] or nulls.
 */
function detectBudget(text: string): { low: number | null; high: number | null } {
  const t = text.toLowerCase();

  // Range pattern: "$100-$200", "$100 to $200", "$100 - $200"
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

  // Single dollar amount: "$150", "around $150", "budget $200"
  const singleMatch = t.match(
    /(?:budget|around|about|up to|under|max(?:imum)?|approximately|approx\.?)?\s*\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/,
  );
  if (singleMatch) {
    const v = parseFloat(singleMatch[1].replace(/,/g, ''));
    if (Number.isFinite(v)) {
      // Treat a single number as a budget ceiling; low is 0.
      // The LLM / keyword-matcher will refine this.
      return { low: Math.round(v * 0.7), high: v };
    }
  }

  return { low: null, high: null };
}

/**
 * Extract a location string from free-text. Looks for "in <City>",
 * "near <City>", "at <City>", or "<City>, <ST>" patterns.
 */
function detectLocation(text: string): string | null {
  const patterns = [
    /\b(?:in|near|at|around|from)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,2}(?:,\s*[A-Z]{2})?)/,
    /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,1},\s*[A-Z]{2}\b)/, // "Springfield, IL"
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m && m[1]) {
      const loc = m[1].trim();
      // Reject obvious false positives (sentence starts with these words).
      if (loc.length >= 2 && loc.length <= 60) return loc;
    }
  }
  return null;
}

/**
 * Score every industry against the free-text by counting keyword hits
 * (industry id, name, sub-service names, sub-service slugs). Returns
 * the best industry + best matching sub-service slug, or nulls.
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
    // Industry id & name.
    if (t.includes(industry.id)) score += 3;
    if (t.includes(industry.name.toLowerCase())) score += 5;

    // Sub-services.
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
 * Pure keyword-based extraction — the deterministic fallback when the
 * z-ai-web-dev-sdk is not configured or the LLM call fails. Yields
 * lower confidence (0.4–0.6) so reviewers can filter for review.
 */
function keywordFallback(text: string): ExtractionResult {
  const urgency = detectUrgency(text);
  const { industry, subServiceSlug, score } = keywordMatchIndustry(text);
  const budget = detectBudget(text);
  const location = detectLocation(text);

  const category = industry?.id ?? null;
  const serviceSlug = subServiceSlug ?? null;
  let service: string | null = null;
  if (industry && subServiceSlug) {
    const ss = industry.subServices.find((s) => s.slug === subServiceSlug);
    service = ss?.name ?? subServiceSlug;
  } else if (industry) {
    service = industry.name;
  }

  // Default duration estimate based on industry (median of sub-service durations).
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

  // Skill hints: industry employee roles (deduplicated, capped at 4).
  const skills = industry
    ? Array.from(new Set(industry.employeeRoles)).slice(0, 4)
    : [];

  // Confidence scales with match score; 0 keywords → 0.3 (we still
  // return *something*), 1 keyword → 0.4, 3+ → 0.6.
  const confidence = Math.min(0.6, 0.3 + score * 0.1);

  const bookingMode = suggestBookingMode(category, service, urgency);

  // Budget defaults: if no dollar amount was found, fall back to the
  // industry's typical default-price range.
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
    bookingMode,
    confidence,
    summary,
  };
}

/**
 * Parse a human-readable duration like "1h 30m", "45m", "2h" → minutes.
 * Returns null if no pattern matches.
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
  if (industryName && service) {
    return `${service} request — ${head}`;
  }
  if (industryName) {
    return `${industryName} request — ${head}`;
  }
  return head || 'Service request';
}

/**
 * Lazily import + initialize the z-ai-web-dev-sdk. Returns null when
 * the SDK is not configured (no API key) so the caller can fall back
 * to keyword matching without raising.
 */
async function getZai(): Promise<any | null> {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    return await ZAI.create();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[ai/extract-request] ZAI SDK unavailable, using fallback:', msg);
    return null;
  }
}

/**
 * Call the LLM with a JSON-mode system prompt that enumerates the 25
 * Fieseros industries and their sub-services. Returns the raw text
 * content (the model is told to emit valid JSON only) or null on
 * failure.
 */
async function callLLMJson(
  zai: any,
  rawText: string,
): Promise<string | null> {
  const categoryList = INDUSTRY_CATALOG.map((i) => i.id).join(', ');

  // Build a compact industry → sub-service map so the model can pick
  // a real `service` slug rather than inventing one.
  const catalogDigest = INDUSTRY_CATALOG.map(
    (i) =>
      `- ${i.id}: ${i.subServices
        .slice(0, 8)
        .map((s) => s.name)
        .join(' | ')}`,
  ).join('\n');

  const systemPrompt = `You are a service request analyzer for a home services marketplace.
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
  "bookingMode": "instant | quote_request | emergency",
  "confidence": 0.0-1.0,
  "summary": "one-sentence summary of the problem"
}

Booking mode rules:
- instant: standardized services (cleaning, lawn care, pest control, pool, car wash)
- quote_request: custom projects (painting, roofing, flooring, construction, remodeling)
- emergency: urgent issues (burst pipe, no electricity, lockout, water leak, boiler failure)

Reference catalog (pick ` + '`category`' + ` from the left column, ` + '`service`' + ` from the right):
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
    console.warn('[ai/extract-request] LLM call failed:', msg);
    return null;
  }
}

/**
 * Parse + validate the LLM's JSON output into a normalized
 * ExtractionResult. Coerces invalid enums to null / defaults so the
 * downstream DB write never fails on shape issues.
 */
function normalizeLLMOutput(raw: string, originalText: string): ExtractionResult {
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    // Try to extract the outermost { … } block before giving up.
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
      // Fuzzy match: does any industry id contain this string (or vice-versa)?
      const fuzzy = INDUSTRY_CATALOG.find(
        (i) => i.id.includes(c) || c.includes(i.id) || i.name.toLowerCase() === c,
      );
      category = fuzzy?.id ?? null;
    }
  }

  // Service — string or null.
  const service =
    typeof parsed.service === 'string' && parsed.service.trim().length > 0
      ? parsed.service.trim().slice(0, 200)
      : null;

  // Urgency — coerce to known enum, default medium.
  let urgency: Urgency = 'medium';
  if (typeof parsed.urgency === 'string') {
    const u = parsed.urgency.toLowerCase().trim() as Urgency;
    if (ALLOWED_URGENCIES.has(u)) urgency = u;
  }

  // Budgets — coerce to finite numbers.
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

  // Location — string or null.
  const location =
    typeof parsed.location === 'string' && parsed.location.trim().length > 0
      ? parsed.location.trim().slice(0, 200)
      : null;

  // Skills — array of strings.
  const skills = Array.isArray(parsed.skills)
    ? parsed.skills
        .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
        .map((s) => s.trim().slice(0, 80))
        .slice(0, 12)
    : [];

  // Duration — integer minutes ≥ 0.
  const durationMins = Number.isFinite(Number(parsed.durationMins))
    ? Math.max(0, Math.round(Number(parsed.durationMins)))
    : null;

  // Booking mode — validate, fall back to rule-based suggestion.
  let bookingMode: BookingMode;
  if (
    typeof parsed.bookingMode === 'string' &&
    ALLOWED_BOOKING_MODES.has(parsed.bookingMode as BookingMode)
  ) {
    bookingMode = parsed.bookingMode as BookingMode;
    // If the model returned `ai_auto` or the urgency is emergency,
    // re-run the rule-based logic for consistency with the marketplace
    // dispatch rules.
    if (bookingMode === 'ai_auto' || urgency === 'emergency') {
      const suggested = suggestBookingMode(category, service, urgency);
      if (suggested !== 'ai_auto') bookingMode = suggested;
    }
  } else {
    bookingMode = suggestBookingMode(category, service, urgency);
  }

  // Confidence — clamp to [0, 1].
  let confidence = Number(parsed.confidence);
  if (!Number.isFinite(confidence)) confidence = 0.5;
  confidence = Math.max(0, Math.min(1, confidence));

  // Summary — string fallback.
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
    bookingMode,
    confidence,
    summary,
  };
}

/**
 * Resolve the `extractedIndustry` column. The model catalog uses
 * `id` for both `category` and (effectively) `industry` — but the
 * Prisma schema has both columns. We populate industry from the
 * catalog's `name` so the UI can show "Cleaning" instead of "cleaning".
 */
function resolveIndustryName(category: string | null): string | null {
  if (!category) return null;
  return INDUSTRY_BY_ID.get(category)?.name ?? null;
}

// ─── Main route handler ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const log = withRequestId(request);

  // ── 1. Auth ────────────────────────────────────────────────────────────
  const authUser = await getAuthUser();
  if (!authUser) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 },
    );
  }
  const tenantId = authUser.tenantId; // may be null for super-admins

  // ── 2. Parse + validate body ───────────────────────────────────────────
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  if (!body || typeof body.text !== 'string' || body.text.trim().length === 0) {
    return NextResponse.json(
      { error: '`text` is required and must be a non-empty string.' },
      { status: 400 },
    );
  }

  // Cap raw text length to keep the LLM prompt + DB column reasonable.
  const MAX_TEXT = 8000;
  const rawText = body.text.slice(0, MAX_TEXT);

  const source = body.source && ALLOWED_SOURCES.has(body.source)
    ? body.source
    : 'whatsapp';

  const leadId =
    typeof body.leadId === 'string' && body.leadId.trim().length > 0
      ? body.leadId.trim()
      : null;

  // ── 3. Run extraction (LLM with keyword fallback) ──────────────────────
  let result: ExtractionResult;
  let aiModel: string;

  const zai = await getZai();
  if (zai) {
    const llmText = await callLLMJson(zai, rawText);
    if (llmText) {
      result = normalizeLLMOutput(llmText, rawText);
      aiModel = AI_MODEL_TAG;
    } else {
      // LLM call returned empty / failed — use fallback but flag it.
      result = keywordFallback(rawText);
      aiModel = `${FALLBACK_MODEL_TAG} (llm-empty)`;
    }
  } else {
    // SDK not configured.
    result = keywordFallback(rawText);
    aiModel = FALLBACK_MODEL_TAG;
  }

  log.info(
    {
      userId: authUser.id,
      tenantId,
      source,
      leadId,
      category: result.category,
      urgency: result.urgency,
      bookingMode: result.bookingMode,
      confidence: result.confidence,
      aiModel,
    },
    'AI request extraction completed',
  );

  // ── 4. Persist to RequestExtraction ────────────────────────────────────
  let record: PersistedRecord;
  try {
    const created = await db.requestExtraction.create({
      data: {
        tenantId,
        leadId,
        rawText,
        source,
        extractedCategory: result.category,
        extractedIndustry: resolveIndustryName(result.category),
        extractedService: result.service,
        extractedUrgency: result.urgency,
        extractedBudget: result.budgetHigh ?? result.budgetLow,
        extractedBudgetCurrency: DEFAULT_CURRENCY,
        extractedLocation: result.location,
        extractedSkillsJson: JSON.stringify(result.skills),
        extractedDurationMins: result.durationMins,
        estimatedCostLow: result.budgetLow,
        estimatedCostHigh: result.budgetHigh,
        suggestedBookingMode: result.bookingMode,
        confidenceScore: result.confidence,
        aiModel,
        status: 'pending',
        metadataJson: JSON.stringify({
          summary: result.summary,
          extractedBy: authUser.id,
          extractionMethod: aiModel,
        }),
      },
    });
    record = created as unknown as PersistedRecord;
  } catch (dbErr) {
    const msg = dbErr instanceof Error ? dbErr.message : String(dbErr);
    log.error({ err: msg }, 'Failed to persist RequestExtraction');
    return NextResponse.json(
      {
        error: 'Failed to persist extraction result.',
        // Still return the extracted data so the caller can retry / use it.
        extraction: result,
      },
      { status: 500 },
    );
  }

  // ── 5. Respond ─────────────────────────────────────────────────────────
  return NextResponse.json(
    {
      id: record.id,
      extraction: result,
      record: {
        id: record.id,
        status: record.status,
        source: record.source,
        aiModel: record.aiModel,
        createdAt: record.createdAt,
      },
    },
    { status: 201 },
  );
}

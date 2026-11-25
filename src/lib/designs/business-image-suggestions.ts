import crypto from 'crypto';
import { callAI } from '@/lib/ai-client';
import { db } from '@/lib/db';
import { normalizeCategoryContext } from './category-taxonomy';

export interface BusinessSceneSuggestion {
  id: string;
  title: string;
  icon: string;
  badge: string;
  category: string;
  sceneDescription: string;
  promptBlueprint: string;
}

export interface DetailedBusinessServiceContext {
  name: string;
  description?: string | null;
  targetKeyword?: string | null;
}

export interface BusinessContextForSuggestions {
  tenantId?: string;
  businessName: string;
  category: string;
  businessDescription?: string | null;
  services?: string[];
  servicesDetailed?: DetailedBusinessServiceContext[];
  city?: string;
  serviceAreas?: string[];
  usps?: string | null;
  targetCustomer?: string | null;
  customerPainPoints?: string | null;
  currentOffers?: string | null;
  brandStory?: string | null;
  tone?: string | null;
  voiceDescription?: string | null;
  brandColors?: {
    primary?: string | null;
    secondary?: string | null;
  };
  excludeTitles?: string[];
  isRefresh?: boolean;
}

export interface GeneratedSeoMetadata {
  title: string;
  description: string;
  tags: string[];
  category: string;
}

export interface CachedSceneIdeasRecord {
  contextHash: string;
  generatedAt: string;
  brandVisualDirection: string;
  scenes: BusinessSceneSuggestion[];
}

export interface SceneSuggestionsResult {
  suggestions: BusinessSceneSuggestion[];
  brandVisualDirection: string;
  contextHash: string;
  fromCache: boolean;
}

export class SceneGenerationError extends Error {
  readonly code: string;
  readonly retryable: boolean;

  constructor(message: string, code = 'AI_SCENE_GENERATION_FAILED', retryable = true) {
    super(message);
    this.name = 'SceneGenerationError';
    this.code = code;
    this.retryable = retryable;
  }
}

const SCENE_IDEAS_RESPONSE_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    brandVisualDirection: {
      type: 'string',
      description:
        'A cohesive visual mood, lighting temperature, and color palette aesthetic derived from the business identity and brand colors.',
    },
    scenes: {
      type: 'array',
      description: '6 distinct, non-overlapping visual photography concepts tailored to this business (4 minimum).',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          icon: { type: 'string' },
          badge: { type: 'string' },
          category: { type: 'string' },
          sceneDescription: { type: 'string' },
          promptBlueprint: { type: 'string' },
        },
        required: ['id', 'title', 'icon', 'badge', 'category', 'sceneDescription', 'promptBlueprint'],
      },
    },
  },
  required: ['brandVisualDirection', 'scenes'],
};

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'for', 'in', 'on', 'at', 'to', 'with', 'by', 'from', 'is', 'are',
]);

// Coalesce concurrent requests per tenant/context to avoid duplicate LLM calls & cache races.
const IN_FLIGHT_SCENE_GENERATION = new Map<string, Promise<SceneSuggestionsResult>>();

/**
 * Canonical recursive JSON serialization (sorted keys) for deterministic hashing.
 */
function canonicalSerialize(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalSerialize(item)).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();
  const entries = sortedKeys
    .filter((k) => obj[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${canonicalSerialize(obj[k])}`);
  return `{${entries.join(',')}}`;
}

function normalizeStr(val?: string | null): string {
  return (val || '').trim().replace(/\s+/g, ' ');
}

/**
 * Compute deterministic SHA-256 hash across all meaningful business context attributes
 * so edits to Brand Brain, services, descriptions, colors, or GBP location auto-invalidate cache.
 */
export function computeBusinessSceneContextHash(ctx: BusinessContextForSuggestions): string {
  const serviceMap = new Map<string, { name: string; description: string; targetKeyword: string }>();

  for (const s of ctx.services || []) {
    const name = normalizeStr(s);
    if (name && !serviceMap.has(name.toLowerCase())) {
      serviceMap.set(name.toLowerCase(), { name, description: '', targetKeyword: '' });
    }
  }
  for (const d of ctx.servicesDetailed || []) {
    const name = normalizeStr(d?.name);
    if (!name) continue;
    const prev = serviceMap.get(name.toLowerCase());
    serviceMap.set(name.toLowerCase(), {
      name,
      description: normalizeStr(d.description) || prev?.description || '',
      targetKeyword: normalizeStr(d.targetKeyword) || prev?.targetKeyword || '',
    });
  }

  const normalizedServices = Array.from(serviceMap.values()).sort((a, b) =>
    a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
  );

  const normalizedAreas = Array.from(
    new Set((ctx.serviceAreas || []).map((a) => normalizeStr(a)).filter(Boolean)),
  ).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

  const payload = {
    businessName: normalizeStr(ctx.businessName),
    businessDescription: normalizeStr(ctx.businessDescription),
    category: normalizeStr(ctx.category),
    city: normalizeStr(ctx.city),
    serviceAreas: normalizedAreas,
    services: normalizedServices,
    usps: normalizeStr(ctx.usps),
    targetCustomer: normalizeStr(ctx.targetCustomer),
    customerPainPoints: normalizeStr(ctx.customerPainPoints),
    currentOffers: normalizeStr(ctx.currentOffers),
    brandStory: normalizeStr(ctx.brandStory),
    tone: normalizeStr(ctx.tone),
    voiceDescription: normalizeStr(ctx.voiceDescription),
    brandColors: {
      primary: normalizeStr(ctx.brandColors?.primary).toLowerCase(),
      secondary: normalizeStr(ctx.brandColors?.secondary).toLowerCase(),
    },
  };

  return crypto.createHash('sha256').update(canonicalSerialize(payload)).digest('hex').slice(0, 24);
}

function tokenizeWords(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
  return new Set(words);
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const w of a) {
    if (b.has(w)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function normalizeCategoryIdentifier(raw: string): string {
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned.slice(0, 48) || 'brand_showcase';
}

function ensureNoTextGuard(prompt: string): string {
  const trimmed = prompt.trim();
  if (/no\s+text/i.test(trimmed) && /no\s+words/i.test(trimmed)) {
    return trimmed;
  }
  return `${trimmed.replace(/\.+$/, '')}. NO TEXT, no words, no letters, no logos, no typography, no watermarks, photorealistic commercial quality.`;
}

function parseJsonPayload(rawContent: string): unknown {
  const clean = rawContent
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  try {
    return JSON.parse(clean);
  } catch {
    const objStart = clean.indexOf('{');
    const objEnd = clean.lastIndexOf('}');
    if (objStart !== -1 && objEnd > objStart) {
      return JSON.parse(clean.slice(objStart, objEnd + 1));
    }
    const arrStart = clean.indexOf('[');
    const arrEnd = clean.lastIndexOf(']');
    if (arrStart !== -1 && arrEnd > arrStart) {
      return { brandVisualDirection: 'Clean authentic commercial photography.', scenes: JSON.parse(clean.slice(arrStart, arrEnd + 1)) };
    }
    throw new Error('Malformed JSON response from AI provider');
  }
}

function validateAndDeduplicateScenes(
  raw: unknown,
  excludeTitles: string[] = [],
): { brandVisualDirection: string; scenes: BusinessSceneSuggestion[] } {
  if (!raw || typeof raw !== 'object') {
    throw new Error('AI response is not a JSON object');
  }

  const record = raw as Record<string, unknown>;
  const rawScenes = Array.isArray(record.scenes)
    ? record.scenes
    : Array.isArray(record.concepts)
      ? record.concepts
      : Array.isArray(record.sceneIdeas)
        ? record.sceneIdeas
        : Array.isArray(record.items)
          ? record.items
          : Array.isArray(raw)
            ? raw
            : null;

  if (!rawScenes || rawScenes.length === 0) {
    throw new Error('AI response contained no scene concepts');
  }

  const brandVisualDirection =
    typeof record.brandVisualDirection === 'string' && record.brandVisualDirection.trim().length >= 8
      ? record.brandVisualDirection.trim().slice(0, 240)
      : 'Consistent natural commercial photography matching brand identity.';

  const excludedNormalized = new Set(
    excludeTitles.map((t) => normalizeStr(t).toLowerCase()).filter(Boolean),
  );
  const excludedTokenSets = excludeTitles.map((t) => tokenizeWords(t)).filter((s) => s.size > 0);

  const accepted: BusinessSceneSuggestion[] = [];
  const acceptedTitleTokens: Set<string>[] = [];
  const acceptedDescTokens: Set<string>[] = [];
  const seenIds = new Set<string>();

  for (let i = 0; i < rawScenes.length; i += 1) {
    const item = rawScenes[i];
    if (!item || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;

    const title = normalizeStr(typeof obj.title === 'string' ? obj.title : '');
    const sceneDescription = normalizeStr(typeof obj.sceneDescription === 'string' ? obj.sceneDescription : '');
    const rawPrompt = normalizeStr(typeof obj.promptBlueprint === 'string' ? obj.promptBlueprint : '');
    const rawCategory = normalizeStr(typeof obj.category === 'string' ? obj.category : '');
    const rawBadge = normalizeStr(typeof obj.badge === 'string' ? obj.badge : '');
    const rawIcon = normalizeStr(typeof obj.icon === 'string' ? obj.icon : '');

    if (title.length < 3 || title.length > 90) continue;
    if (sceneDescription.length < 15) continue;
    if (rawPrompt.length < 35) continue;
    if (!rawCategory) continue;

    // Duplicate prevention against excluded refresh titles & already-accepted concepts
    const titleLower = title.toLowerCase();
    if (excludedNormalized.has(titleLower)) continue;

    const titleTokens = tokenizeWords(title);
    const descTokens = tokenizeWords(`${sceneDescription} ${rawPrompt.slice(0, 120)}`);

    if (excludedTokenSets.some((prevSet) => jaccardSimilarity(titleTokens, prevSet) >= 0.7)) {
      continue;
    }

    const isDuplicateInBatch = accepted.some((existing, idx) => {
      if (existing.title.toLowerCase() === titleLower) return true;
      if (jaccardSimilarity(titleTokens, acceptedTitleTokens[idx]) >= 0.65) return true;
      if (jaccardSimilarity(descTokens, acceptedDescTokens[idx]) >= 0.68) return true;
      return false;
    });
    if (isDuplicateInBatch) continue;

    const rawId = normalizeStr(typeof obj.id === 'string' ? obj.id : '')
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, '-');
    let id = rawId || `scene-${accepted.length + 1}-${crypto.randomBytes(2).toString('hex')}`;
    if (seenIds.has(id)) {
      id = `${id}-${accepted.length + 1}`;
    }
    seenIds.add(id);

    accepted.push({
      id,
      title,
      icon: rawIcon || '📸',
      badge: (rawBadge || rawCategory.replace(/_/g, ' ')).toUpperCase().slice(0, 28),
      category: normalizeCategoryIdentifier(rawCategory),
      sceneDescription,
      promptBlueprint: ensureNoTextGuard(rawPrompt),
    });
    acceptedTitleTokens.push(titleTokens);
    acceptedDescTokens.push(descTokens);

    if (accepted.length === 6) break;
  }

  if (accepted.length < 4) {
    throw new Error(`Expected at least 4 distinct validated scenes, got ${accepted.length}`);
  }

  return { brandVisualDirection, scenes: accepted };
}

function buildBusinessContextPromptPayload(ctx: BusinessContextForSuggestions) {
  const serviceEntries: Array<{ name: string; description?: string }> = [];
  const seen = new Set<string>();

  for (const d of ctx.servicesDetailed || []) {
    const name = normalizeStr(d?.name);
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    serviceEntries.push({
      name,
      ...(normalizeStr(d.description) ? { description: normalizeStr(d.description).slice(0, 240) } : {}),
    });
  }
  for (const s of ctx.services || []) {
    const name = normalizeStr(s);
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    serviceEntries.push({ name });
  }

  return {
    businessName: normalizeStr(ctx.businessName),
    category: normalizeStr(ctx.category),
    ...(normalizeStr(ctx.businessDescription)
      ? { businessDescription: normalizeStr(ctx.businessDescription).slice(0, 500) }
      : {}),
    ...(normalizeStr(ctx.city) ? { city: normalizeStr(ctx.city) } : {}),
    ...(ctx.serviceAreas && ctx.serviceAreas.length > 0
      ? { serviceAreas: ctx.serviceAreas.slice(0, 8) }
      : {}),
    servicesAndOfferings: serviceEntries.slice(0, 12),
    brandIdentity: {
      ...(normalizeStr(ctx.tone) ? { tone: normalizeStr(ctx.tone) } : {}),
      ...(normalizeStr(ctx.voiceDescription) ? { voice: normalizeStr(ctx.voiceDescription).slice(0, 250) } : {}),
      ...(normalizeStr(ctx.usps) ? { uniqueSellingPoints: normalizeStr(ctx.usps).slice(0, 250) } : {}),
      ...(normalizeStr(ctx.targetCustomer) ? { targetAudience: normalizeStr(ctx.targetCustomer).slice(0, 200) } : {}),
      ...(normalizeStr(ctx.customerPainPoints) ? { painPointsSolved: normalizeStr(ctx.customerPainPoints).slice(0, 200) } : {}),
      ...(normalizeStr(ctx.currentOffers) ? { currentOffers: normalizeStr(ctx.currentOffers).slice(0, 200) } : {}),
      ...(normalizeStr(ctx.brandStory) ? { brandStory: normalizeStr(ctx.brandStory).slice(0, 300) } : {}),
      ...(ctx.brandColors?.primary || ctx.brandColors?.secondary
        ? {
            brandColorPalette: {
              primary: ctx.brandColors.primary || undefined,
              secondary: ctx.brandColors.secondary || undefined,
            },
          }
        : {}),
    },
    ...(ctx.excludeTitles && ctx.excludeTitles.length > 0
      ? { avoidRepeatingPreviousConcepts: ctx.excludeTitles }
      : {}),
  };
}

/**
 * Generates 4 distinct, business-aware visual scene suggestions strictly via AI
 * with Gemini structured JSON schema output, validation, duplicate detection, and 1 automatic retry.
 */
export async function generateBusinessSceneSuggestions(
  ctx: BusinessContextForSuggestions,
  signal?: AbortSignal,
): Promise<BusinessSceneSuggestion[]> {
  const result = await generateValidatedSceneBundle(ctx, signal);
  return result.scenes;
}

async function generateValidatedSceneBundle(
  ctx: BusinessContextForSuggestions,
  signal?: AbortSignal,
): Promise<{ brandVisualDirection: string; scenes: BusinessSceneSuggestion[] }> {
  const userPayload = buildBusinessContextPromptPayload(ctx);

  const systemPrompt = `You are a Principal Commercial Photography Art Director for local businesses.
Analyze the full business context provided in JSON (business name, description, Google category, services & service descriptions, location/service areas, brand tone, USPs, target audience, brand story, and brand colors) and design 6 distinct photography concepts tailored specifically to THIS business.

STRICT REQUIREMENTS:
1. Context Grounding: Base every concept on the business's ACTUAL offerings, service descriptions, customer outcomes, and brand tone — never invent generic filler or unrelated trades.
2. Organic Concept Diversity: Select 6 genuinely distinct, non-overlapping visual concepts that naturally fit how this specific business operates and wins customers (distinct subjects, environments, camera framing, and storytelling moments). Do NOT produce slight variations of the same scene.
3. Brand Consistency: First define "brandVisualDirection" describing one unified lighting mood, color temperature, and aesthetic accent harmonized with the business's brand tone and brandColorPalette. Reflect that cohesive visual direction consistently inside every "promptBlueprint".
4. Dynamic Categories: Generate concise, meaningful snake_case "category" identifiers tailored to each scene's role for this business (for example: "executive_consultation", "kitchen_prep", "on_site_response", "client_onboarding", etc.).
5. Photorealistic Image Prompts: Each "promptBlueprint" (45–75 words) must describe physical visual subjects, authentic setting, lighting, composition, and lens depth of field ONLY. It MUST end with: "NO TEXT, no words, no letters, no logos, no typography, no watermarks."
6. Freshness on Refresh: If "avoidRepeatingPreviousConcepts" is provided, propose 6 completely new angles and titles that do NOT repeat or paraphrase any listed concept.
7. Output Format: Respond ONLY with a strict JSON object (no markdown fences) matching this exact structure:
{
  "brandVisualDirection": "1-2 sentence cohesive lighting, color & camera direction string",
  "scenes": [
    {
      "id": "unique-kebab-id",
      "title": "Short 3-7 word scene title",
      "icon": "single emoji",
      "badge": "2-3 WORD BADGE",
      "category": "concise_snake_case_role",
      "sceneDescription": "1-2 concise sentences explaining this scene for the business",
      "promptBlueprint": "45-75 word photorealistic image prompt ending with NO TEXT, no words, no letters, no logos, no typography, no watermarks."
    }
  ]
}`;

  let lastError: unknown = null;

  // Up to 2 attempts: 1 primary + 1 automatic retry if network/schema/duplicate validation fails.
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    if (signal?.aborted) {
      throw new SceneGenerationError('Scene generation aborted by timeout', 'AI_SCENE_TIMEOUT', true);
    }

    try {
      const retryNote =
        attempt === 2
          ? '\n\nIMPORTANT RETRY NOTE: Previous output was invalid or contained overlapping concepts. Ensure 4 completely distinct subjects and strict JSON compliance.'
          : '';

      const res = await callAI({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${JSON.stringify(userPayload)}${retryNote}` },
        ],
        json: true,
        responseSchema: SCENE_IDEAS_RESPONSE_SCHEMA,
        temperature: attempt === 1 ? (ctx.isRefresh ? 0.85 : 0.65) : 0.75,
        timeoutMs: 24_000,
        ...(ctx.tenantId
          ? { usageContext: { tenantId: ctx.tenantId, feature: 'business_scene_suggestions' } }
          : {}),
      });

      const parsed = parseJsonPayload(res?.content || '');
      return validateAndDeduplicateScenes(parsed, ctx.excludeTitles || []);
    } catch (err) {
      lastError = err;
      console.warn(
        `[generateBusinessSceneSuggestions] Attempt ${attempt} failed:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  const errMsg = lastError instanceof Error ? lastError.message : 'AI provider unavailable';
  throw new SceneGenerationError(
    `Could not generate AI scene ideas right now (${errMsg}). Please retry.`,
    'AI_SCENE_GENERATION_FAILED',
    true,
  );
}

/**
 * Safely read & merge `sceneIdeasCache` into `Tenant.settingsJson` without touching unrelated keys.
 */
async function persistTenantSceneCache(
  tenantId: string,
  cacheRecord: CachedSceneIdeasRecord,
): Promise<void> {
  const applyMerge = (rawJson: string | null | undefined): string => {
    let settingsObj: Record<string, unknown> = {};
    if (rawJson) {
      try {
        const parsed = JSON.parse(rawJson);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          settingsObj = parsed as Record<string, unknown>;
        }
      } catch {
        settingsObj = {};
      }
    }
    return JSON.stringify({
      ...settingsObj,
      sceneIdeasCache: cacheRecord,
    });
  };

  if (typeof db.$transaction === 'function') {
    await db.$transaction(async (tx) => {
      const latest = await tx.tenant.findUnique({
        where: { id: tenantId },
        select: { settingsJson: true },
      });
      await tx.tenant.update({
        where: { id: tenantId },
        data: { settingsJson: applyMerge(latest?.settingsJson) },
      });
    });
    return;
  }

  if (typeof db.tenant?.update === 'function') {
    const latest = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { settingsJson: true },
    });
    await db.tenant.update({
      where: { id: tenantId },
      data: { settingsJson: applyMerge(latest?.settingsJson) },
    });
  }
}

/**
 * Coalesced, cost-controlled entry point for tenant scene ideas:
 * 1. Returns persisted `Tenant.settingsJson.sceneIdeasCache` immediately when contextHash matches & !refresh.
 * 2. Coalesces concurrent in-flight requests for the same tenant.
 * 3. Persists generated concepts atomically without clobbering unrelated settingsJson fields.
 */
export async function getOrGenerateCachedSceneSuggestions(params: {
  tenantId: string;
  context: BusinessContextForSuggestions;
  existingSettingsJson?: string | null;
  signal?: AbortSignal;
}): Promise<SceneSuggestionsResult> {
  const { tenantId, context, existingSettingsJson, signal } = params;
  const contextHash = computeBusinessSceneContextHash(context);

  let cachedEntry: CachedSceneIdeasRecord | null = null;
  if (existingSettingsJson) {
    try {
      const parsed = JSON.parse(existingSettingsJson) as Record<string, unknown>;
      const rawCache = parsed?.sceneIdeasCache as CachedSceneIdeasRecord | undefined;
      if (
        rawCache &&
        typeof rawCache === 'object' &&
        Array.isArray(rawCache.scenes) &&
        rawCache.scenes.length >= 4
      ) {
        cachedEntry = rawCache;
      }
    } catch {
      cachedEntry = null;
    }
  }

  if (!context.isRefresh && cachedEntry && cachedEntry.contextHash === contextHash) {
    return {
      suggestions: cachedEntry.scenes,
      brandVisualDirection: cachedEntry.brandVisualDirection || '',
      contextHash,
      fromCache: true,
    };
  }

  const flightKey = `${tenantId}:${context.isRefresh ? 'refresh' : contextHash}`;
  const inFlight = IN_FLIGHT_SCENE_GENERATION.get(flightKey);
  if (inFlight) {
    return inFlight;
  }

  const runPromise = (async (): Promise<SceneSuggestionsResult> => {
    const excludeTitles =
      context.isRefresh && cachedEntry
        ? cachedEntry.scenes.map((s) => s.title).filter(Boolean)
        : context.excludeTitles || [];

    const generated = await generateValidatedSceneBundle(
      {
        ...context,
        tenantId,
        excludeTitles,
      },
      signal,
    );

    const record: CachedSceneIdeasRecord = {
      contextHash,
      generatedAt: new Date().toISOString(),
      brandVisualDirection: generated.brandVisualDirection,
      scenes: generated.scenes,
    };

    try {
      await persistTenantSceneCache(tenantId, record);
    } catch (persistErr) {
      console.warn('[scene-ideas-cache] Failed persisting cache (non-fatal):', persistErr);
    }

    return {
      suggestions: generated.scenes,
      brandVisualDirection: generated.brandVisualDirection,
      contextHash,
      fromCache: false,
    };
  })();

  IN_FLIGHT_SCENE_GENERATION.set(flightKey, runPromise);
  try {
    return await runPromise;
  } finally {
    if (IN_FLIGHT_SCENE_GENERATION.get(flightKey) === runPromise) {
      IN_FLIGHT_SCENE_GENERATION.delete(flightKey);
    }
  }
}

/**
 * Generates SEO-friendly Title, Post Caption, and Hashtags for the generated image.
 */
export async function generateSeoMetadataForScene(params: {
  businessName: string;
  category: string;
  sceneTitle?: string;
  services?: string[];
  city?: string;
  signal?: AbortSignal;
}): Promise<GeneratedSeoMetadata> {
  const norm = normalizeCategoryContext(params.category);
  const label = norm.verticalLabel || params.category;
  const name = params.businessName || 'Local Business';
  const city = params.city || 'Local Area';
  const scene = params.sceneTitle || 'Commercial Showcase';
  const servicesList = (params.services || []).filter(Boolean).slice(0, 4).join(', ') || label;

  const baseline: GeneratedSeoMetadata = {
    title: `${scene} | ${name}${city && city !== 'Local Area' ? ` ${city}` : ''}`,
    description: `Experience premier ${label} solutions at ${name}. Delivering excellence in ${servicesList}. Contact us today for reliable, top-rated service!`,
    tags: [
      `#${name.replace(/[^a-zA-Z0-9]/g, '')}`,
      `#${label.replace(/[^a-zA-Z0-9]/g, '')}`,
      ...(city && city !== 'Local Area' ? [`#${city.replace(/[^a-zA-Z0-9]/g, '')}`] : []),
      `#TopRated`,
      `#LocalBusiness`,
    ],
    category: 'AT_WORK',
  };

  try {
    const systemPrompt = `You are an expert Google Business Profile SEO copywriter and social media strategist.
Given a business and visual scene, write SEO-friendly post metadata that ranks highly in local search.
Return ONLY a strict JSON object with:
- "title": punchy, high-ranking SEO title under 70 chars
- "description": engaging marketing caption (100–160 words) highlighting customer benefits, services, local city authority, and a clear call to action.
- "tags": array of 5–8 high-volume hashtag strings
- "category": one of ["AT_WORK", "INTERIOR", "EXTERIOR", "ADDITIONAL"]`;

    const userPrompt = JSON.stringify({
      businessName: name,
      category: label,
      scene,
      services: servicesList,
      location: city,
    });

    const res = await callAI({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      json: true,
      temperature: 0.6,
      timeoutMs: 6000,
    });

    const clean = (res?.content || '')
      .replace(/```json/gi, '')
      .replace(/```/gi, '')
      .trim();
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    if (start !== -1 && end > start) {
      const parsed = JSON.parse(clean.slice(start, end + 1));
      if (parsed.title && parsed.description) {
        return {
          title: String(parsed.title).trim(),
          description: String(parsed.description).trim(),
          tags: Array.isArray(parsed.tags) ? parsed.tags.map((t: unknown) => String(t).trim()) : baseline.tags,
          category: typeof parsed.category === 'string' ? parsed.category : 'AT_WORK',
        };
      }
    }
  } catch (err) {
    console.warn('[generateSeoMetadataForScene] AI call failed, using baseline:', err);
  }

  return baseline;
}

const cleanLocationField = (v?: string | null): string => {
  const s = (v || '').trim();
  return !s || /^(not specified|n\/a|na|none|null|undefined|unknown|your city)$/i.test(s) ? '' : s;
};

/**
 * Shared loader assembling the full business identity payload from Tenant, BrandProfile, GBP account,
 * and Service catalog — used identically by GET /suggestions and background pre-warming.
 */
export async function loadBusinessSceneContextFromTenant(params: {
  tenantId: string;
  categoryOverride?: string | null;
  businessNameOverride?: string | null;
  isRefresh?: boolean;
}): Promise<{
  existingSettingsJson: string | null | undefined;
  context: BusinessContextForSuggestions;
}> {
  const { tenantId, categoryOverride, businessNameOverride, isRefresh } = params;

  const [tenant, brandProfile, gbpAccount, merchantServices] = await Promise.all([
    db.tenant
      .findUnique({
        where: { id: tenantId },
        select: {
          name: true,
          industry: true,
          description: true,
          city: true,
          settingsJson: true,
        },
      })
      .catch(() => null),
    (
      db.brandProfile?.findUnique?.({
        where: { tenantId },
      }) ?? Promise.resolve(null)
    ).catch(() => null),
    (
      db.socialAccount?.findFirst?.({
        where: { tenantId, platform: 'googlebusiness', isActive: true },
      }) ?? Promise.resolve(null)
    ).catch(() => null),
    (
      db.service?.findMany?.({
        where: { tenantId },
        select: { name: true, description: true, longDescription: true },
        take: 15,
      }) ?? Promise.resolve([])
    ).catch(() => []),
  ]);

  let gbpCategory = '';
  let gbpTitle = '';
  let gbpCity = '';
  let gbpServiceAreas: string[] = [];
  if (gbpAccount?.metadata) {
    try {
      const meta =
        typeof gbpAccount.metadata === 'string'
          ? JSON.parse(gbpAccount.metadata)
          : (gbpAccount.metadata as Record<string, any>);
      gbpCategory = meta.primaryCategory || meta.category || '';
      gbpTitle = meta.locationTitle || meta.businessName || '';
      gbpCity = meta.city || '';
      if (Array.isArray(meta.serviceAreas)) {
        gbpServiceAreas = meta.serviceAreas.filter((a: unknown): a is string => typeof a === 'string');
      }
    } catch {}
  }

  let parsedSettings: Record<string, any> = {};
  if (tenant?.settingsJson) {
    try {
      const parsed = JSON.parse(tenant.settingsJson);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        parsedSettings = parsed;
      }
    } catch {}
  }

  if (!gbpCategory) gbpCategory = parsedSettings.activeGbpCategory || '';
  if (!gbpTitle) gbpTitle = parsedSettings.activeGbpTitle || '';
  const settingsCity = parsedSettings.activeGbpCity || '';

  const businessName =
    businessNameOverride ||
    brandProfile?.businessName ||
    gbpTitle ||
    tenant?.name ||
    'Local Business';

  const category =
    categoryOverride ||
    brandProfile?.industry ||
    gbpCategory ||
    tenant?.industry ||
    'Services';

  const city =
    cleanLocationField(gbpCity) ||
    cleanLocationField(settingsCity) ||
    cleanLocationField(tenant?.city) ||
    cleanLocationField(brandProfile?.location) ||
    cleanLocationField(brandProfile?.serviceArea?.split(',')[0]) ||
    '';

  const serviceAreas =
    gbpServiceAreas.length > 0
      ? gbpServiceAreas
      : brandProfile?.serviceArea
        ? brandProfile.serviceArea
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean)
        : [];

  const servicesDetailedMap = new Map<string, DetailedBusinessServiceContext>();
  const addServiceEntry = (name?: string | null, description?: string | null, targetKeyword?: string | null) => {
    const cleanName = (name || '').trim();
    if (!cleanName) return;
    const key = cleanName.toLowerCase();
    const prev = servicesDetailedMap.get(key);
    servicesDetailedMap.set(key, {
      name: cleanName,
      description: (description || '').trim() || prev?.description || null,
      targetKeyword: (targetKeyword || '').trim() || prev?.targetKeyword || null,
    });
  };

  for (const s of merchantServices as Array<{ name?: string; description?: string | null; longDescription?: string | null }>) {
    addServiceEntry(s?.name, s?.description || s?.longDescription);
  }
  if (Array.isArray(parsedSettings.seoServices)) {
    for (const s of parsedSettings.seoServices) {
      if (s && typeof s === 'object') {
        addServiceEntry(s.name, s.description, s.targetKeyword);
      }
    }
  }
  if (brandProfile?.services) {
    try {
      const bpServices = JSON.parse(brandProfile.services);
      if (Array.isArray(bpServices)) {
        for (const item of bpServices) {
          if (typeof item === 'string') addServiceEntry(item);
        }
      }
    } catch {}
  }

  const brandBrain = (parsedSettings.brandBrain || {}) as Record<string, any>;
  const brandDetails = (brandBrain.brandDetails || {}) as Record<string, any>;
  if (Array.isArray(brandBrain.sellingItems)) {
    for (const it of brandBrain.sellingItems) {
      if (it && typeof it === 'object') {
        addServiceEntry(it.name, it.description);
      }
    }
  }

  const servicesDetailed = Array.from(servicesDetailedMap.values());
  const services = servicesDetailed.map((s) => s.name);

  return {
    existingSettingsJson: tenant?.settingsJson,
    context: {
      tenantId,
      businessName,
      category,
      businessDescription: brandProfile?.aiGeneratedSummary || tenant?.description || null,
      services,
      servicesDetailed,
      city,
      serviceAreas,
      usps: brandProfile?.usps || null,
      targetCustomer: brandProfile?.targetCustomer || null,
      customerPainPoints: brandProfile?.customerPainPoints || null,
      currentOffers: brandProfile?.currentOffers || null,
      brandStory: brandDetails.businessStory || null,
      tone: brandProfile?.tone || null,
      voiceDescription: brandProfile?.voiceDescription || null,
      brandColors: {
        primary: brandDetails.brandColor || null,
        secondary: brandDetails.secondaryColor || null,
      },
      isRefresh,
    },
  };
}

/**
 * Background pre-warmer: populates persistent AI scene ideas cache after onboarding,
 * GBP location sync, Brand Brain edits, or service catalog updates so Studio opens with 0ms wait.
 */
export async function prewarmTenantSceneSuggestions(
  tenantId: string,
  overrides?: { categoryOverride?: string | null; businessNameOverride?: string | null },
): Promise<void> {
  if (process.env.VITEST === 'true' || process.env.NODE_ENV === 'test') return;
  try {
    const loaded = await loadBusinessSceneContextFromTenant({
      tenantId,
      categoryOverride: overrides?.categoryOverride,
      businessNameOverride: overrides?.businessNameOverride,
      isRefresh: false,
    });
    await getOrGenerateCachedSceneSuggestions({
      tenantId,
      existingSettingsJson: loaded.existingSettingsJson,
      context: loaded.context,
    });
  } catch (err) {
    console.warn(`[scene-ideas-prewarm] Non-fatal prewarm notice for ${tenantId}:`, err);
  }
}

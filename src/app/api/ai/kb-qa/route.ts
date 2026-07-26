import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { logger, withRequestId } from '@/lib/logger';
import { getIndustry } from '@/lib/industry-catalog';

/**
 * Knowledge Base Q&A (ServiceOS V1.5 — P8-ai-layer)
 * ------------------------------------------------------------
 * POST /api/ai/kb-qa
 *
 * Technicians often need on-the-job diagnostic help: "My AC isn't cooling",
 * "Boiler keeps losing pressure", "Dishwasher won't drain". This endpoint
 * turns the free-text question into a structured KB answer using the LLM,
 * optionally grounded by the tenant's existing KnowledgeArticle rows.
 *
 * Body:
 *   {
 *     question:  string     // the technician's free-text question
 *     industry?: string     // industry id — biases the LLM + KB search
 *     serviceId?: string    // optional Service.id — narrows KB search
 *   }
 *
 * Returns:
 *   {
 *     question,
 *     answer: {
 *       possibleCauses:      string[]   // top 3-5 most likely causes
 *       toolsNeeded:         string[]   // tools/equipment required
 *       repairSteps:         string[]   // numbered step-by-step procedure
 *       safetyInstructions:  string[]   // safety warnings (always non-empty)
 *       estimatedTime:       string     // e.g. "45-60 minutes"
 *       partsLikelyNeeded:   string[]   // common parts to bring
 *       summary:             string     // 1-2 sentence overview
 *     },
 *     relatedArticles: Array<{ id, title, category, snippet }>,
 *     aiModel: string,
 *     fallback: boolean,                // true when LLM was unavailable
 *   }
 *
 * AI failure handling:
 *   - If the z-ai-web-dev-sdk cannot be imported or `ZAI.create()` throws,
 *     we fall back to a generic deterministic response that advises the
 *     technician to consult a senior tech / manufacturer manual and surfaces
 *     any related KB articles. `fallback: true` and `aiModel: 'fallback'`
 *     are set so the UI can flag the degraded response.
 *
 * Auth: required. The caller's tenantId scopes the KnowledgeArticle search
 * (tenants only see their own articles + global isPublic articles).
 */

// ─── Types ─────────────────────────────────────────────────────────────────

interface RequestBody {
  question: string;
  industry?: string;
  serviceId?: string;
}

interface KbAnswer {
  possibleCauses: string[];
  toolsNeeded: string[];
  repairSteps: string[];
  safetyInstructions: string[];
  estimatedTime: string;
  partsLikelyNeeded: string[];
  summary: string;
}

interface RelatedArticle {
  id: string;
  title: string;
  category: string;
  snippet: string;
}

interface KbQaResponse {
  question: string;
  answer: KbAnswer;
  relatedArticles: RelatedArticle[];
  aiModel: string;
  fallback: boolean;
  industry: string | null;
  serviceId: string | null;
}

const AI_MODEL_TAG = 'z-ai-web-dev-sdk';
const FALLBACK_MODEL_TAG = 'fallback';

const MAX_QUESTION_LEN = 2000;
const MAX_RELATED_ARTICLES = 5;
const MAX_ARTICLE_SNIPPET = 280;

// ─── Helpers ───────────────────────────────────────────────────────────────

function clampArray(items: unknown, max: number, maxStrLen: number): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    .map((x) => x.trim().slice(0, maxStrLen))
    .slice(0, max);
}

function safeString(v: unknown, max: number): string {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, max);
}

/**
 * Lazily import + initialize the z-ai-web-dev-sdk. Returns null when the
 * SDK is not configured (no API key) so the caller can fall back to a
 * generic response without raising.
 */
async function getZai(): Promise<any | null> {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    return await ZAI.create();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[ai/kb-qa] ZAI SDK unavailable, using fallback:', msg);
    return null;
  }
}

/**
 * Search the tenant's KnowledgeArticle rows + global public articles for
 * ones whose title, tags, or content match the question. Best-effort —
 * returns [] if the table is unavailable or nothing matches.
 *
 * Search strategy:
 *   1. Tokenize the question (≥3-char alphanumeric tokens, drop stopwords).
 *   2. Score each article by counting token hits in title (×3) + tags (×2)
 *      + content (×1).
 *   3. Return the top N articles (snippets trimmed around the first hit).
 */
async function findRelatedArticles(
  tenantId: string | null,
  question: string,
  industry: string | null,
  serviceId: string | null,
): Promise<RelatedArticle[]> {
  const tokens = tokenize(question);
  if (tokens.length === 0) return [];

  // Optional industry tag bias — articles tagged with the industry's name
  // or id get a small bonus. We do NOT filter on this (the technician may
  // legitimately need a cross-industry article).
  const industryTags = industry
    ? [industry, getIndustry(industry)?.name?.toLowerCase() ?? ''].filter(
        (t) => t.length > 0,
      )
    : [];

  let articles: Array<{
    id: string;
    title: string;
    content: string;
    category: string;
    tagsJson: string;
  }> = [];

  try {
    // Tenant-scoped OR global public articles, active only.
    const where: Record<string, unknown> = {
      isActive: true,
      OR: [
        ...(tenantId ? [{ tenantId }] : []),
        { isPublic: true },
      ],
    };
    articles = await db.knowledgeArticle.findMany({
      where,
      select: {
        id: true,
        title: true,
        content: true,
        category: true,
        tagsJson: true,
      },
      take: 200,
    });
  } catch (err) {
    logger.warn(
      { err: err instanceof Error ? err.message : String(err) },
      'ai/kb-qa: KnowledgeArticle lookup failed',
    );
    return [];
  }

  // Optionally narrow by serviceId tag (best-effort: articles tagged with
  // the service id are surfaced first; we don't filter them out).
  const serviceTag = serviceId ? serviceId.toLowerCase() : null;

  type Scored = {
    article: (typeof articles)[number];
    score: number;
    firstHitIdx: number;
  };
  const scored: Scored[] = [];

  for (const article of articles) {
    const titleLower = article.title.toLowerCase();
    const contentLower = article.content.toLowerCase();
    const tags = parseTags(article.tagsJson);

    let score = 0;
    for (const tok of tokens) {
      if (titleLower.includes(tok)) score += 3;
      if (tags.some((t) => t.includes(tok) || tok.includes(t))) score += 2;
      if (contentLower.includes(tok)) score += 1;
    }

    // Industry-tag bonus.
    for (const it of industryTags) {
      if (tags.some((t) => t === it)) score += 2;
    }
    // Service-id tag bonus.
    if (serviceTag && tags.includes(serviceTag)) score += 3;

    if (score === 0) continue;

    // Find the first content hit for the snippet.
    let firstHitIdx = -1;
    for (const tok of tokens) {
      const idx = contentLower.indexOf(tok);
      if (idx >= 0 && (firstHitIdx < 0 || idx < firstHitIdx)) {
        firstHitIdx = idx;
      }
    }

    scored.push({ article, score, firstHitIdx });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, MAX_RELATED_ARTICLES).map(({ article, firstHitIdx }) => {
    const snippet = makeSnippet(article.content, firstHitIdx);
    return {
      id: article.id,
      title: article.title,
      category: article.category,
      snippet,
    };
  });
}

function parseTags(tagsJson: string): string[] {
  try {
    const parsed = JSON.parse(tagsJson);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((t): t is string => typeof t === 'string')
      .map((t) => t.toLowerCase().trim())
      .filter((t) => t.length > 0);
  } catch {
    return [];
  }
}

function tokenize(text: string): string[] {
  const STOP = new Set([
    'the', 'and', 'for', 'with', 'this', 'that', 'from', 'have', 'has',
    'are', 'was', 'were', 'not', 'but', 'you', 'your', 'our', 'their',
    'they', 'them', 'his', 'her', 'she', 'him', 'his', 'its', 'a', 'an',
    'of', 'in', 'on', 'at', 'to', 'is', 'it', 'be', 'as', 'or', 'by',
    'do', 'does', 'did', 'my', 'me', 'we', 'us', 'i',
  ]);
  const raw = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !STOP.has(t));
  // Dedupe while preserving order.
  return Array.from(new Set(raw));
}

function makeSnippet(content: string, hitIdx: number): string {
  const max = MAX_ARTICLE_SNIPPET;
  if (content.length <= max) return content.trim();
  if (hitIdx < 0) return content.slice(0, max - 1).trim() + '…';
  const start = Math.max(0, hitIdx - 40);
  const end = Math.min(content.length, start + max - 1);
  const snippet = content.slice(start, end).trim();
  return (start > 0 ? '…' : '') + snippet + (end < content.length ? '…' : '');
}

/**
 * Build the LLM system prompt. Enumerates the 25 ServiceOS industries so the
 * model can pick the right domain context. If the caller supplied an industry
 * explicitly, we narrow the prompt to that industry + its sub-services.
 */
function buildSystemPrompt(industry: string | null): string {
  const industryClause = industry
    ? `The technician works in the "${industry}" industry (${getIndustry(industry)?.name ?? industry}). Focus your answer on this domain.`
    : `The technician's industry is unknown — answer generically for the most likely home-services trade.`;

  const subServicesClause = industry
    ? `Reference sub-services: ${getIndustry(industry)?.subServices
        .slice(0, 12)
        .map((s) => s.name)
        .join(' | ')}`
    : '';

  return `You are a senior field-service technician mentor helping a junior technician diagnose and repair an issue.

${industryClause}
${subServicesClause}

Analyze the technician's question and return a JSON object with EXACTLY these fields:

{
  "summary": "1-2 sentence overview of the likely issue",
  "possibleCauses": ["top 3-5 most likely causes, ordered by probability"],
  "toolsNeeded": ["tools and equipment required for diagnosis + repair"],
  "repairSteps": ["numbered, sequential repair steps (each step is one array entry, e.g. \\"1. Turn off power at the breaker.\\")"],
  "safetyInstructions": ["at least 2 safety warnings — PPE, electrical, gas, refrigerant, height, chemical, etc. ALWAYS include at least one electrical/power-isolation warning when applicable"],
  "estimatedTime": "human-readable time estimate (e.g. \\"45-60 minutes\\")",
  "partsLikelyNeeded": ["common parts/materials to bring to the site"]
}

Rules:
- Be specific and actionable. Avoid generic advice like "inspect the system".
- If the question is ambiguous, list causes for the most common interpretation.
- Repair steps must be sequential and complete (a technician should be able to follow them end-to-end).
- Safety instructions are MANDATORY — never return an empty array.
- Respond with a single JSON object only — no markdown, no prose, no code fences.`;
}

/**
 * Call the LLM with the JSON-mode system prompt. Returns the raw text
 * content or null on failure.
 */
async function callLLMJson(
  zai: any,
  systemPrompt: string,
  question: string,
): Promise<string | null> {
  try {
    const response = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question.slice(0, 4000) },
      ],
      temperature: 0.4,
      response_format: { type: 'json_object' },
    });
    const text = response?.choices?.[0]?.message?.content;
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return null;
    }
    return text;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[ai/kb-qa] LLM call failed:', msg);
    return null;
  }
}

/**
 * Parse + sanitize the LLM's JSON output into a normalized KbAnswer.
 * Coerces arrays to strings, drops empty entries, caps lengths, and
 * guarantees non-empty safetyInstructions.
 */
function normalizeLLMOutput(raw: string): KbAnswer {
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

  const possibleCauses = clampArray(parsed.possibleCauses, 6, 200);
  const toolsNeeded = clampArray(parsed.toolsNeeded, 12, 120);
  const repairSteps = clampArray(parsed.repairSteps, 15, 400);
  let safetyInstructions = clampArray(parsed.safetyInstructions, 10, 300);
  if (safetyInstructions.length === 0) {
    safetyInstructions = [
      'Always disconnect power / shut off gas / isolate water before disassembling any component.',
      'Wear appropriate PPE (gloves, safety glasses, closed-toe shoes).',
    ];
  }
  const partsLikelyNeeded = clampArray(parsed.partsLikelyNeeded, 12, 120);
  const estimatedTime = safeString(parsed.estimatedTime, 80) || '30-90 minutes';
  const summary = safeString(parsed.summary, 400);

  return {
    possibleCauses,
    toolsNeeded,
    repairSteps,
    safetyInstructions,
    estimatedTime,
    partsLikelyNeeded,
    summary,
  };
}

/**
 * Deterministic fallback used when the LLM is unavailable. Returns a
 * conservative generic answer that surfaces the question + related articles
 * without making up diagnostic steps.
 */
function fallbackAnswer(question: string, industry: string | null): KbAnswer {
  const industryName = industry ? getIndustry(industry)?.name ?? industry : 'home services';
  return {
    possibleCauses: [
      'Unable to perform AI diagnosis at this time — see manufacturer manual or service bulletin.',
      'Common causes for this type of issue include wear-and-tear, debris/blockage, electrical fault, or component failure.',
      'If the symptom appeared suddenly, check for recent environmental events (power surge, freeze, flood).',
    ],
    toolsNeeded: [
      'Multimeter (for electrical testing)',
      'Standard hand tools (screwdrivers, wrenches, pliers)',
      'Manufacturer service manual for the unit',
    ],
    repairSteps: [
      '1. Isolate the system (power/gas/water) before any disassembly.',
      '2. Inspect visually for obvious damage, leaks, or debris.',
      '3. Consult the manufacturer manual or a senior technician for diagnostic steps specific to this model.',
      '4. If unsafe or beyond your skill level, escalate to a senior technician.',
    ],
    safetyInstructions: [
      'Disconnect power / shut off gas / isolate water before disassembling any component.',
      'Wear appropriate PPE (gloves, safety glasses, closed-toe shoes).',
      'If you smell gas or see exposed conductors, evacuate and call a specialist.',
    ],
    estimatedTime: '30-90 minutes (varies by diagnosis)',
    partsLikelyNeeded: [
      'Varies by diagnosis — inspect first, then source parts.',
    ],
    summary:
      `The AI diagnostic service is currently unavailable. The question ` +
      `"${question.slice(0, 120)}" should be escalated to a senior ${industryName} technician ` +
      `or cross-referenced with the manufacturer's service manual.`,
  };
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
  const tenantId = authUser.tenantId; // may be null for super-admins

  // ── 2. Parse + validate body ─────────────────────────────────────────
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (
    !body ||
    typeof body.question !== 'string' ||
    body.question.trim().length === 0
  ) {
    return NextResponse.json(
      { error: '`question` is required and must be a non-empty string.' },
      { status: 400 },
    );
  }
  const question = body.question.trim().slice(0, MAX_QUESTION_LEN);

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

  // ── 3. Find related KB articles (parallel with LLM call) ─────────────
  const relatedArticlesPromise = findRelatedArticles(
    tenantId,
    question,
    industry,
    serviceId,
  );

  // ── 4. Run LLM (with fallback) ───────────────────────────────────────
  let answer: KbAnswer;
  let aiModel: string;
  let fallback: boolean;

  const zai = await getZai();
  if (zai) {
    const systemPrompt = buildSystemPrompt(industry);
    const llmText = await callLLMJson(zai, systemPrompt, question);
    if (llmText) {
      answer = normalizeLLMOutput(llmText);
      aiModel = AI_MODEL_TAG;
      fallback = false;
    } else {
      answer = fallbackAnswer(question, industry);
      aiModel = `${FALLBACK_MODEL_TAG} (llm-empty)`;
      fallback = true;
    }
  } else {
    answer = fallbackAnswer(question, industry);
    aiModel = FALLBACK_MODEL_TAG;
    fallback = true;
  }

  const relatedArticles = await relatedArticlesPromise;

  log.info(
    {
      userId: authUser.id,
      tenantId,
      industry,
      serviceId,
      aiModel,
      fallback,
      questionLen: question.length,
      relatedArticles: relatedArticles.length,
      causesCount: answer.possibleCauses.length,
      stepsCount: answer.repairSteps.length,
    },
    'ai/kb-qa: completed',
  );

  const resp: KbQaResponse = {
    question,
    answer,
    relatedArticles,
    aiModel,
    fallback,
    industry,
    serviceId,
  };
  return NextResponse.json(resp);
}

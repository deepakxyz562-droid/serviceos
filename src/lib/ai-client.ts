/**
 * AI client — OpenRouter (OpenAI-compatible aggregator).
 *
 * Why OpenRouter?
 *   - Single API key gives access to many models (Llama, Qwen, GPT-OSS, etc.).
 *   - Free-tier models (`:free` suffix) are sufficient for tenant onboarding volume.
 *   - OpenAI-compatible request/response shape — no SDK needed, just fetch.
 *   - Works identically in the sandbox AND on Vercel (no internal-only endpoints).
 *
 * Resilience strategy:
 *   - Try multiple free models in sequence (primary → fallback → fallback).
 *     Free models occasionally rate-limit or 503; rotating models absorbs this.
 *   - Retry-on-429 with 2s backoff per model (up to 2 retries each). OpenRouter
 *     explicitly says "Please retry shortly" on 429s from free pools.
 *   - Use `response_format: { type: 'json_object' }` for reliable JSON output
 *     (silently ignored by models that don't support it).
 *   - 60s timeout per attempt (free models can be slow on cold starts).
 *   - Return null on total failure so callers fall back to INDUSTRY_DUMMIES —
 *     onboarding must NEVER block on AI being down.
 *
 * Used by:
 *   - src/lib/seed-public-business.ts (auto-seed per-tenant AI content)
 *   - src/app/api/ai/generate-hub-content/route.ts (manual "Regenerate" button)
 *
 * Exports:
 *   - callOpenRouter(options) — generic chat-completion client with model
 *     fallback + 429 retry. Reuse this for any new OpenRouter call site.
 *   - generateHubContent(input) — high-level hub-content generator built on
 *     callOpenRouter (kept for backward compatibility with existing callers).
 *   - extractJson<T>(raw) — robust JSON extractor for LLM responses.
 */

// ─── Shared types ───────────────────────────────────────────────────────────

export interface HubContentInput {
  businessName: string
  industry: string
  city?: string | null
  state?: string | null
  phone?: string | null
  /** Service names the tenant offers (drives service-specific copy). */
  services: string[]
}

export interface HubContentFaq {
  question: string
  answer: string
}

export interface HubContentService {
  name: string
  description: string
  longDescription: string
}

export interface HubContent {
  tagline: string
  description: string
  faqs: HubContentFaq[]
  services: HubContentService[]
}

// ─── Generic OpenRouter client types ────────────────────────────────────────

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface CallOpenRouterOptions {
  /** System prompt. If provided, prepended as a system message. */
  system?: string
  /** User prompt (required if `messages` is not provided). */
  user: string
  /** Additional messages for multi-turn. If provided, used instead of system/user. */
  messages?: OpenRouterMessage[]
  /** Sampling temperature. Default 0.7. */
  temperature?: number
  /** Max tokens. Default 4096. */
  maxTokens?: number
  /** If true, requests JSON response format. Default false. */
  json?: boolean
  /** Specific model to use. If omitted, tries OPENROUTER_MODELS in order. */
  model?: string
  /** Max retries on 429 per model. Default 2. */
  maxRetries?: number
}

export interface CallOpenRouterResult {
  /** The text content from the model. */
  content: string
  /** Which model actually succeeded. */
  model: string
}

// ─── OpenRouter config ──────────────────────────────────────────────────────

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

/**
 * Free-tier models to try in order. Verified live against
 * GET https://openrouter.ai/api/v1/models + direct response tests on 2025-01.
 *
 * SELECTION CRITERIA (critical):
 *   - Must return content in `message.content` (NOT `message.reasoning`).
 *     Reasoning models (gpt-oss-20b, nemotron-nano) burn their token budget
 *     on chain-of-thought, leaving `content` null with finish_reason='length'.
 *   - Must NOT be served by Venice (Venice's free pool is heavily congested
 *     and returns 429 on most Llama/Dolphin models).
 *   - Must respond in under ~5s for snappy UX.
 *
 * Order rationale:
 *   1. Gemma 4 26B (Darkbloom provider) — 26B params, NO reasoning, fast,
 *      strong instruction following + JSON discipline. Best balance.
 *   2. Tencent HY3 (Novita provider) — NO reasoning, very fast, broad
 *      knowledge. Excellent fallback.
 *   3. Llama 3.3 70B (Venice provider) — best quality when not rate-limited.
 *      Kept as last resort because Venice's free pool 429s frequently.
 *
 * NOTE: OpenRouter's free pool rotates. If a model returns 404 ("No endpoints
 * found") or persistent 429s, check https://openrouter.ai/models for the
 * current free list and update OPENROUTER_MODELS accordingly.
 */
const OPENROUTER_MODELS = [
  'google/gemma-4-26b-a4b-it:free',
  'tencent/hy3:free',
  'meta-llama/llama-3.3-70b-instruct:free',
]

/** Max retries per model on a 429 (rate-limit) response. */
const MAX_429_RETRIES = 2
/** Backoff between 429 retries (seconds). */
const RETRY_BACKOFF_MS = 2000

// ─── Prompt builder ─────────────────────────────────────────────────────────

function buildPrompts(input: HubContentInput): { system: string; user: string } {
  const servicesList = input.services.length > 0
    ? input.services.join(', ')
    : 'general services'

  const locationParts = [input.city, input.state].filter(Boolean).join(', ')
  const location = locationParts || 'the local area'

  const system = `You are a professional local-business copywriter. Generate unique, compelling marketing copy for the business described in the user message. The copy must be tailored to the business's name, industry, location, and services — NOT generic.

Output ONLY a valid JSON object with EXACTLY this shape (no markdown, no prose, no code fences):
{
  "tagline": "8-15 word marketing tagline",
  "description": "100-160 word business description (2 short paragraphs)",
  "faqs": [
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."},
    {"question": "...", "answer": "..."}
  ],
  "services": [
    {
      "name": "<exactly the input service name>",
      "description": "1 sentence marketing description (under 120 chars)",
      "longDescription": "2-3 sentence detailed description"
    }
  ]
}

Rules:
- Generate exactly 5 FAQs relevant to this business's industry and location.
- Generate exactly ONE service entry for EACH service name provided in the user message. Use the exact service name verbatim as the "name" field.
- Mention the city/location naturally in the tagline or description.
- Do not include any text outside the JSON object.`

  const user = `Business name: ${input.businessName}
Industry: ${input.industry}
Location: ${location}${input.phone ? `\nPhone: ${input.phone}` : ''}
Services: ${servicesList}

Generate the JSON marketing copy now.`

  return { system, user }
}

// ─── JSON extraction ────────────────────────────────────────────────────────

/**
 * Extract a JSON object from an LLM text response.
 *
 * Handles:
 *   - Plain JSON
 *   - ```json ... ``` fenced code blocks
 *   - Leading/trailing prose around the JSON
 *   - Trailing commas (naive cleanup for common LLM mistakes)
 *
 * Returns parsed object or throws on failure.
 */
export function extractJson<T = Record<string, unknown>>(raw: string): T {
  let jsonStr = raw.trim()

  // Strip markdown code fences.
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim()
  }

  // Find the first { and last } — handles prose-wrapped JSON.
  const firstBrace = jsonStr.indexOf('{')
  const lastBrace = jsonStr.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    jsonStr = jsonStr.substring(firstBrace, lastBrace + 1)
  }

  // Naive trailing-comma cleanup (LLMs sometimes add them).
  jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1')

  return JSON.parse(jsonStr) as T
}

// ─── OpenRouter call ────────────────────────────────────────────────────────

interface OpenRouterChoice {
  message?: { content?: string }
  finish_reason?: string
}

interface OpenRouterResponse {
  choices?: OpenRouterChoice[]
  error?: { message?: string; code?: number }
}

/**
 * Generic OpenRouter chat completion call.
 *
 * Tries models in order (custom model or OPENROUTER_MODELS fallback list).
 * Retries on 429 with backoff. Returns the first successful response.
 *
 * Message construction:
 *   - If `options.messages` is provided, used verbatim (multi-turn).
 *   - Otherwise built from `options.system` (optional) + `options.user`.
 *
 * Resilience:
 *   - Each model gets up to `maxRetries` retries on HTTP 429 (free-pool rate
 *     limit). OpenRouter explicitly recommends retrying shortly on 429s.
 *   - Transient errors (aborts/timeouts/network) are also retried; permanent
 *     HTTP 4xx errors skip to the next model immediately.
 *   - `response_format: { type: 'json_object' }` is sent only when
 *     `options.json === true` (silently ignored by models that lack it).
 *   - 60s timeout per attempt (free models can be slow on cold starts).
 *
 * @throws Error if OPENROUTER_API_KEY is missing or all models fail.
 */
export async function callOpenRouter(
  options: CallOpenRouterOptions,
): Promise<CallOpenRouterResult> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not set')
  }

  const {
    system,
    user,
    messages,
    temperature = 0.7,
    maxTokens = 4096,
    json = false,
    model,
    maxRetries = MAX_429_RETRIES,
  } = options

  // Build the messages array: explicit messages win, otherwise system + user.
  const finalMessages: OpenRouterMessage[] = messages
    ? messages
    : system
      ? [{ role: 'system', content: system }, { role: 'user', content: user }]
      : [{ role: 'user', content: user }]

  // Determine which models to try (single, or the fallback list in order).
  const modelsToTry = model ? [model] : OPENROUTER_MODELS

  let lastError: Error | null = null

  for (const tryModel of modelsToTry) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      // 60s timeout per attempt — free models can be slow on cold starts.
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60_000)

      try {
        const res = await fetch(OPENROUTER_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            // Optional but recommended by OpenRouter for app identification.
            'X-Title': 'ServiceOS AI',
            // HTTP-Referer helps with rate-limit headers; sandbox has no real
            // origin, so use the project domain placeholder.
            'HTTP-Referer': 'https://serviceos.app',
          },
          body: JSON.stringify({
            model: tryModel,
            messages: finalMessages,
            temperature,
            max_tokens: maxTokens,
            // Encourage JSON output only when explicitly requested —
            // silently ignored by models that lack it.
            ...(json ? { response_format: { type: 'json_object' } } : {}),
          }),
          signal: controller.signal,
        })

        // 429 — rate limited. Retry with backoff if attempts remain.
        if (res.status === 429 && attempt < maxRetries) {
          const text = await res.text().catch(() => '')
          lastError = new Error(`OpenRouter ${tryModel} HTTP 429: ${text.slice(0, 200)}`)
          console.warn(`[ai-client] ${tryModel}: 429 rate-limited, retrying in ${RETRY_BACKOFF_MS}ms (attempt ${attempt + 1}/${maxRetries})`)
          await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS))
          continue
        }

        if (!res.ok) {
          const text = await res.text().catch(() => '')
          // Common: 401 bad key, 402 paid-only model, 404 model removed, 503 upstream.
          throw new Error(`OpenRouter ${tryModel} HTTP ${res.status}: ${text.slice(0, 250)}`)
        }

        const data = (await res.json()) as OpenRouterResponse

        // OpenRouter sometimes returns 200 with an error body (upstream failure).
        if (data.error?.message) {
          throw new Error(`OpenRouter ${tryModel} error: ${data.error.message}`)
        }

        const content = data.choices?.[0]?.message?.content || ''
        if (!content || content.trim().length < 10) {
          const finishReason = data.choices?.[0]?.finish_reason
          throw new Error(`OpenRouter ${tryModel} returned empty content (finish_reason=${finishReason || 'unknown'})`)
        }

        return { content, model: tryModel }
      } catch (error) {
        // Network errors / aborts: retry if attempts remain and it's not a known
        // permanent failure (e.g. 404). We retry on abort/timeout too because
        // free models can be slow.
        const msg = error instanceof Error ? error.message : String(error)
        if (attempt < maxRetries && !msg.includes('HTTP 4')) {
          lastError = error instanceof Error ? error : new Error(msg)
          console.warn(`[ai-client] ${tryModel}: transient error "${msg.slice(0, 100)}", retrying (attempt ${attempt + 1}/${maxRetries})`)
          await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS))
          continue
        }
        // Permanent failure for this model — record and try the next one.
        lastError = error instanceof Error ? error : new Error(msg)
        console.warn(`[ai-client] ${tryModel}: permanent error "${msg.slice(0, 150)}", trying next model`)
        break
      } finally {
        clearTimeout(timeoutId)
      }
    }
  }

  // All models exhausted — throw the last error seen.
  throw lastError || new Error('OpenRouter: all models failed')
}

/**
 * Call a single OpenRouter model with the chat-completions API (JSON mode).
 *
 * Thin convenience wrapper around `callOpenRouter` that pins a single model
 * and requests JSON output. Retries on HTTP 429 with backoff (up to
 * MAX_429_RETRIES times) via the underlying generic call.
 *
 * Returns just the text content from the first choice, or throws on failure.
 */
async function callOpenRouterModel(
  model: string,
  system: string,
  user: string,
): Promise<string> {
  const result = await callOpenRouter({ model, system, user, json: true })
  return result.content
}

/**
 * Validate that parsed AI content has the required shape.
 */
function isValidHubContent(parsed: unknown): parsed is HubContent {
  if (!parsed || typeof parsed !== 'object') return false
  const p = parsed as Record<string, unknown>
  return (
    typeof p.tagline === 'string' && p.tagline.length > 0 &&
    typeof p.description === 'string' && p.description.length > 0 &&
    Array.isArray(p.faqs) &&
    Array.isArray(p.services)
  )
}

// ─── High-level: hub content generation ────────────────────────────────────

/**
 * Generate per-tenant hub content via OpenRouter.
 *
 * Tries multiple free-tier models in sequence — if the first is rate-limited
 * or down, the next is tried. Each model also retries on 429 with backoff.
 * Returns null only if ALL models fail, so callers can fall back to hardcoded
 * INDUSTRY_DUMMIES — onboarding must NEVER block.
 *
 * Logs which model succeeded/failed for observability.
 */
export async function generateHubContent(
  input: HubContentInput,
): Promise<HubContent | null> {
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('[ai-client] OPENROUTER_API_KEY not set — skipping AI generation')
    return null
  }

  const { system, user } = buildPrompts(input)

  // Single generic call — callOpenRouter iterates OPENROUTER_MODELS in order
  // and retries each on 429, so we don't need an outer loop here. On any
  // failure (all models exhausted) we return null so callers fall back to
  // INDUSTRY_DUMMIES — onboarding must NEVER block on AI being down.
  try {
    const { content: raw, model } = await callOpenRouter({ system, user, json: true })
    const parsed = extractJson<unknown>(raw)

    if (isValidHubContent(parsed)) {
      console.log(`[ai-client] Hub content generated via OpenRouter (${model})`)
      return parsed
    }
    console.warn(`[ai-client] ${model}: response missing required fields`)
    return null
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`[ai-client] All OpenRouter models failed: ${msg}`)
    return null
  }
}

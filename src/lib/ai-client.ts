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
 * Call a single OpenRouter model with the chat-completions API.
 *
 * Uses `response_format: { type: 'json_object' }` to encourage valid JSON
 * output (silently ignored by models that don't support it).
 *
 * Retries on HTTP 429 (free-pool rate limit) up to MAX_429_RETRIES times,
 * with RETRY_BACKOFF_MS backoff. OpenRouter explicitly recommends retrying
 * shortly on 429s.
 *
 * Returns the text content from the first choice, or throws on failure.
 */
async function callOpenRouterModel(
  model: string,
  system: string,
  user: string,
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not set')
  }

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= MAX_429_RETRIES; attempt++) {
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
          'X-Title': 'ServiceOS Hub Generator',
          // HTTP-Referer helps with rate-limit headers; sandbox has no real
          // origin, so use the project domain placeholder.
          'HTTP-Referer': 'https://serviceos.app',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          temperature: 0.7,
          max_tokens: 4096,
          // Encourage JSON output — silently ignored by models that lack it.
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      })

      // 429 — rate limited. Retry with backoff if attempts remain.
      if (res.status === 429 && attempt < MAX_429_RETRIES) {
        const text = await res.text().catch(() => '')
        lastError = new Error(`OpenRouter ${model} HTTP 429: ${text.slice(0, 200)}`)
        console.warn(`[ai-client] ${model}: 429 rate-limited, retrying in ${RETRY_BACKOFF_MS}ms (attempt ${attempt + 1}/${MAX_429_RETRIES})`)
        await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS))
        continue
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        // Common: 401 bad key, 402 paid-only model, 404 model removed, 503 upstream.
        throw new Error(`OpenRouter ${model} HTTP ${res.status}: ${text.slice(0, 250)}`)
      }

      const data = (await res.json()) as OpenRouterResponse

      // OpenRouter sometimes returns 200 with an error body (upstream failure).
      if (data.error?.message) {
        throw new Error(`OpenRouter ${model} error: ${data.error.message}`)
      }

      const content = data.choices?.[0]?.message?.content || ''
      if (!content || content.trim().length < 10) {
        const finishReason = data.choices?.[0]?.finish_reason
        throw new Error(`OpenRouter ${model} returned empty content (finish_reason=${finishReason || 'unknown'})`)
      }
      return content
    } catch (error) {
      // Network errors / aborts: retry if attempts remain and it's not a known
      // permanent failure (e.g. 404). We retry on abort/timeout too because
      // free models can be slow.
      const msg = error instanceof Error ? error.message : String(error)
      if (attempt < MAX_429_RETRIES && !msg.includes('HTTP 4')) {
        lastError = error instanceof Error ? error : new Error(msg)
        console.warn(`[ai-client] ${model}: transient error "${msg.slice(0, 100)}", retrying (attempt ${attempt + 1}/${MAX_429_RETRIES})`)
        await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS))
        continue
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }

  // All retries exhausted — throw the last 429 error.
  throw lastError || new Error(`OpenRouter ${model}: retries exhausted`)
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

  for (const model of OPENROUTER_MODELS) {
    try {
      const raw = await callOpenRouterModel(model, system, user)
      const parsed = extractJson<unknown>(raw)

      if (isValidHubContent(parsed)) {
        console.log(`[ai-client] Hub content generated via OpenRouter (${model})`)
        return parsed
      }
      console.warn(`[ai-client] ${model}: response missing required fields, trying next model`)
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.warn(`[ai-client] ${model} failed: ${msg}`)
    }
  }

  console.error('[ai-client] All OpenRouter models failed')
  return null
}

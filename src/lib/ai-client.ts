/**
 * AI client — multi-provider fallback chain with DB-stored encrypted keys.
 *
 * Providers are tried in order: OpenRouter → OpenAI → Anthropic → Gemini.
 * Within each provider, keys are rotated (429/401/403 → next key). Across
 * providers, switching happens on 5xx / network errors (or 529 for Anthropic).
 *
 * DB-stored keys (AiProviderKey table) are AES-256-GCM encrypted at rest
 * (see src/lib/ai-key-crypto.ts). If the DB has zero active keys for a
 * provider, the corresponding env var is used as a back-compat fallback.
 *
 * Resilience strategy:
 *   - Try multiple models per provider (preferred model first, then defaults).
 *   - 60s timeout per attempt.
 *   - All DB writes (lastUsedAt / requestCount / lastError) are fire-and-forget
 *     — they never block the response or crash the AI call.
 *   - DB read errors fall back to env vars only.
 *
 * Back-compat: `callOpenRouter()` and `generateHubContent()` keep their
 * original signatures so the existing consumer routes work unchanged.
 *
 * Used by:
 *   - src/lib/seed-public-business.ts (auto-seed per-tenant AI content)
 *   - src/app/api/ai/generate-hub-content/route.ts (manual "Regenerate" button)
 *   - 6 AI consumer routes (template-assist, chat-suggested-reply,
 *     sms-suggested-reply, compose-message, form-generator, generate-hub-content)
 */

import { db } from '@/lib/db'
import { decryptKey } from '@/lib/ai-key-crypto'

// ─── Shared types ───────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

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

// ─── Provider config ────────────────────────────────────────────────────────

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const GEMINI_BASE_URL =
  'https://generativelanguage.googleapis.com/v1beta/models'

/**
 * Free-tier OpenRouter models to try in order. Verified live against
 * GET https://openrouter.ai/api/v1/models + direct response tests on 2025-01.
 *
 * SELECTION CRITERIA:
 *   - Must return content in `message.content` (NOT `message.reasoning`).
 *   - Must NOT be served by Venice (heavily congested free pool).
 *   - Must respond in under ~5s for snappy UX.
 *
 * See https://openrouter.ai/models for the current free list — update this
 * array if a model returns 404 ("No endpoints found") or persistent 429s.
 */
const OPENROUTER_MODELS = [
  'google/gemma-4-26b-a4b-it:free',
  'tencent/hy3:free',
  'meta-llama/llama-3.3-70b-instruct:free',
]

/** Per-attempt timeout. Free models can be slow on cold starts. */
const REQUEST_TIMEOUT_MS = 60_000

/** Provider order — OpenRouter is preferred (cheapest + free pool), then
 *  paid providers in increasing cost-per-call order. */
const PROVIDER_ORDER = ['openrouter', 'openai', 'anthropic', 'gemini'] as const
type ProviderName = (typeof PROVIDER_ORDER)[number]

function isProviderName(s: string): s is ProviderName {
  return s === 'openrouter' || s === 'openai' || s === 'anthropic' || s === 'gemini'
}

const DEFAULT_MODELS: Record<ProviderName, string[]> = {
  openrouter: OPENROUTER_MODELS,
  openai: ['gpt-4o-mini'],
  anthropic: ['claude-3-5-haiku-20241022'],
  gemini: ['gemini-1.5-flash'],
}

const ENV_VAR_FOR_PROVIDER: Record<ProviderName, string> = {
  openrouter: 'OPENROUTER_API_KEY',
  openai: 'OPENAI_API_KEY',
  anthropic: 'ANTHROPIC_API_KEY',
  gemini: 'GEMINI_API_KEY',
}

// ─── Key chain loader ───────────────────────────────────────────────────────

interface LoadedKey {
  /** DB row id (cuid) or `env:<provider>` for env-var fallback keys. */
  id: string
  provider: ProviderName
  plaintext: string
  priority: number
  /** 'db' = decrypted from AiProviderKey row, 'env' = from process.env. */
  source: 'db' | 'env'
}

type KeyChain = Record<ProviderName, LoadedKey[]>

let keyChainCache: { data: KeyChain; expiresAt: number } | null = null
const KEY_CHAIN_CACHE_MS = 60_000

/**
 * Load all active AI keys (decrypted) from the DB, grouped by provider.
 * Falls back to the env var for any provider with zero DB keys. Cached
 * in-memory for 60s to avoid hitting the DB on every AI call.
 *
 * DB read errors are caught + logged — the function still returns whatever
 * env-var fallback keys are available, so a DB outage never crashes the AI call.
 */
export async function loadAiKeyChain(): Promise<KeyChain> {
  if (keyChainCache && keyChainCache.expiresAt > Date.now()) {
    return keyChainCache.data
  }

  const chain: KeyChain = {
    openrouter: [],
    openai: [],
    anthropic: [],
    gemini: [],
  }

  try {
    const rows = await db.aiProviderKey.findMany({
      where: { isActive: true },
      orderBy: [
        { provider: 'asc' },
        { priority: 'asc' },
        { createdAt: 'asc' },
      ],
    })

    for (const row of rows) {
      if (!isProviderName(row.provider)) continue
      let plaintext: string
      try {
        plaintext = decryptKey(row.encryptedKey)
      } catch (err) {
        // Decryption fails if ENCRYPTION_KEY rotated or row was tampered with.
        console.warn(
          `[ai-client] Failed to decrypt key ${row.id} (${row.provider}): ` +
            (err instanceof Error ? err.message : String(err)),
        )
        continue
      }
      chain[row.provider].push({
        id: row.id,
        provider: row.provider,
        plaintext,
        priority: row.priority,
        source: 'db',
      })
    }
  } catch (err) {
    // DB unreachable / table missing / connection refused — fall back to env.
    console.warn(
      '[ai-client] DB load failed, using env-var fallback only: ' +
        (err instanceof Error ? err.message : String(err)),
    )
  }

  // Env-var fallback per provider (only if DB has zero keys for it).
  for (const provider of PROVIDER_ORDER) {
    if (chain[provider].length > 0) continue
    const envVal = process.env[ENV_VAR_FOR_PROVIDER[provider]]
    if (envVal) {
      chain[provider].push({
        id: `env:${provider}`,
        provider,
        plaintext: envVal,
        priority: 0,
        source: 'env',
      })
    }
  }

  keyChainCache = {
    data: chain,
    expiresAt: Date.now() + KEY_CHAIN_CACHE_MS,
  }
  return chain
}

/**
 * Invalidate the in-memory key-chain cache. Call this after a key is added,
 * rotated, or deactivated via the admin UI so the next call sees fresh state.
 */
export function invalidateAiKeyChainCache(): void {
  keyChainCache = null
}

// ─── Provider adapters ──────────────────────────────────────────────────────

interface ProviderRequestParams {
  apiKey: string
  model: string
  messages: ChatMessage[]
  temperature?: number
  maxTokens?: number
  json?: boolean
  signal: AbortSignal
}

type ProviderResult =
  | {
      ok: true
      content: string
      usage?: { promptTokens?: number; completionTokens?: number }
    }
  | {
      ok: false
      status: number
      error: string
      shouldRotateKey: boolean
      shouldSwitchProvider: boolean
    }

interface AiProviderAdapter {
  name: ProviderName
  /** Make a single chat-completion request. Never throws — errors are
   *  returned as `{ ok: false, ... }` with rotate/switch hints. */
  request(params: ProviderRequestParams): Promise<ProviderResult>
}

/**
 * Classify an HTTP error into a `ProviderResult` failure variant.
 *
 *   429 → rate-limited, try next key (same provider).
 *   401/403 → bad key, try next key (same provider).
 *   5xx / 529 (Anthropic overloaded) → provider down, switch provider.
 *   Other 4xx (402, 404, 400, etc.) → model/provider-specific, switch provider.
 */
function classifyHttpError(
  provider: ProviderName,
  status: number,
  body: string,
): Extract<ProviderResult, { ok: false }> {
  const error = `${provider} HTTP ${status}: ${body.slice(0, 250)}`
  if (status === 429 || status === 401 || status === 403) {
    return {
      ok: false,
      status,
      error,
      shouldRotateKey: true,
      shouldSwitchProvider: false,
    }
  }
  if (status >= 500 || status === 529) {
    return {
      ok: false,
      status,
      error,
      shouldRotateKey: false,
      shouldSwitchProvider: true,
    }
  }
  return {
    ok: false,
    status,
    error,
    shouldRotateKey: false,
    shouldSwitchProvider: true,
  }
}

// ── OpenRouter adapter ──────────────────────────────────────────────────────

const openRouterAdapter: AiProviderAdapter = {
  name: 'openrouter',
  async request({
    apiKey,
    model,
    messages,
    temperature,
    maxTokens,
    json,
    signal,
  }): Promise<ProviderResult> {
    try {
      const res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'X-Title': 'Fieseros AI',
          'HTTP-Referer': 'https://fieseros.app',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: temperature ?? 0.7,
          max_tokens: maxTokens ?? 4096,
          // Encourage JSON output — silently ignored by models that lack it.
          ...(json ? { response_format: { type: 'json_object' } } : {}),
        }),
        signal,
      })

      const text = await res.text().catch(() => '')
      if (!res.ok) return classifyHttpError('openrouter', res.status, text)

      const data = JSON.parse(text) as {
        choices?: { message?: { content?: string }; finish_reason?: string }[]
        error?: { message?: string }
      }

      // OpenRouter sometimes returns 200 with an error body (upstream failure).
      if (data.error?.message) {
        return {
          ok: false,
          status: res.status,
          error: `OpenRouter: ${data.error.message}`,
          shouldRotateKey: false,
          shouldSwitchProvider: true,
        }
      }

      const content = data.choices?.[0]?.message?.content || ''
      if (!content || content.trim().length < 1) {
        const fr = data.choices?.[0]?.finish_reason
        return {
          ok: false,
          status: res.status,
          error: `Empty content (finish_reason=${fr || 'unknown'})`,
          shouldRotateKey: false,
          shouldSwitchProvider: true,
        }
      }
      return { ok: true, content }
    } catch (err) {
      // Network error / abort → switch provider.
      const msg = err instanceof Error ? err.message : String(err)
      return {
        ok: false,
        status: 0,
        error: msg,
        shouldRotateKey: false,
        shouldSwitchProvider: true,
      }
    }
  },
}

// ── OpenAI adapter ──────────────────────────────────────────────────────────

const openAiAdapter: AiProviderAdapter = {
  name: 'openai',
  async request({
    apiKey,
    model,
    messages,
    temperature,
    maxTokens,
    json,
    signal,
  }): Promise<ProviderResult> {
    try {
      const res = await fetch(OPENAI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: temperature ?? 0.7,
          ...(maxTokens ? { max_tokens: maxTokens } : {}),
          ...(json ? { response_format: { type: 'json_object' } } : {}),
        }),
        signal,
      })

      const text = await res.text().catch(() => '')
      if (!res.ok) return classifyHttpError('openai', res.status, text)

      const data = JSON.parse(text) as {
        choices?: { message?: { content?: string }; finish_reason?: string }[]
        error?: { message?: string }
      }

      if (data.error?.message) {
        return {
          ok: false,
          status: res.status,
          error: `OpenAI: ${data.error.message}`,
          shouldRotateKey: false,
          shouldSwitchProvider: true,
        }
      }

      const content = data.choices?.[0]?.message?.content || ''
      if (!content || content.trim().length < 1) {
        const fr = data.choices?.[0]?.finish_reason
        return {
          ok: false,
          status: res.status,
          error: `Empty content (finish_reason=${fr || 'unknown'})`,
          shouldRotateKey: false,
          shouldSwitchProvider: true,
        }
      }
      return { ok: true, content }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return {
        ok: false,
        status: 0,
        error: msg,
        shouldRotateKey: false,
        shouldSwitchProvider: true,
      }
    }
  },
}

// ── Anthropic adapter ───────────────────────────────────────────────────────

const anthropicAdapter: AiProviderAdapter = {
  name: 'anthropic',
  async request({
    apiKey,
    model,
    messages,
    temperature,
    maxTokens,
    json,
    signal,
  }): Promise<ProviderResult> {
    // Anthropic separates the `system` message from the `messages` array.
    const systemMsgs = messages.filter((m) => m.role === 'system')
    const system = systemMsgs.map((m) => m.content).join('\n\n')
    const nonSystem = messages.filter((m) => m.role !== 'system')

    try {
      const res = await fetch(ANTHROPIC_URL, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          // Anthropic requires `max_tokens`. Default to a generous budget.
          max_tokens: maxTokens ?? 4096,
          messages: nonSystem.map((m) => ({ role: m.role, content: m.content })),
          ...(system ? { system } : {}),
          ...(temperature !== undefined ? { temperature } : {}),
        }),
        signal,
      })

      const text = await res.text().catch(() => '')
      if (!res.ok) return classifyHttpError('anthropic', res.status, text)

      const data = JSON.parse(text) as {
        content?: { type: string; text?: string }[]
        error?: { message?: string }
      }

      if (data.error?.message) {
        return {
          ok: false,
          status: res.status,
          error: `Anthropic: ${data.error.message}`,
          shouldRotateKey: false,
          shouldSwitchProvider: true,
        }
      }

      // Anthropic returns content as an array of typed blocks. Concatenate
      // all `text` blocks (the response may be split across multiple).
      const content = (data.content || [])
        .filter((b) => b.type === 'text' && b.text)
        .map((b) => b.text!)
        .join('')

      if (!content || content.trim().length < 1) {
        return {
          ok: false,
          status: res.status,
          error: 'Empty content',
          shouldRotateKey: false,
          shouldSwitchProvider: true,
        }
      }
      return { ok: true, content }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return {
        ok: false,
        status: 0,
        error: msg,
        shouldRotateKey: false,
        shouldSwitchProvider: true,
      }
    }
  },
}

// ── Gemini adapter ──────────────────────────────────────────────────────────

const geminiAdapter: AiProviderAdapter = {
  name: 'gemini',
  async request({
    apiKey,
    model,
    messages,
    temperature,
    maxTokens,
    json,
    signal,
  }): Promise<ProviderResult> {
    // Gemini maps `system` → `systemInstruction`, and `assistant` → `model`.
    const systemMsgs = messages.filter((m) => m.role === 'system')
    const systemText = systemMsgs.map((m) => m.content).join('\n\n')
    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }))

    const url = `${GEMINI_BASE_URL}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          ...(systemText
            ? { systemInstruction: { parts: [{ text: systemText }] } }
            : {}),
          generationConfig: {
            temperature: temperature ?? 0.7,
            maxOutputTokens: maxTokens ?? 4096,
            ...(json ? { responseMimeType: 'application/json' } : {}),
          },
        }),
        signal,
      })

      const text = await res.text().catch(() => '')
      if (!res.ok) return classifyHttpError('gemini', res.status, text)

      const data = JSON.parse(text) as {
        candidates?: {
          content?: { parts?: { text?: string }[] }
          finishReason?: string
        }[]
        error?: { message?: string }
        promptFeedback?: { blockReason?: string }
      }

      if (data.error?.message) {
        return {
          ok: false,
          status: res.status,
          error: `Gemini: ${data.error.message}`,
          shouldRotateKey: false,
          shouldSwitchProvider: true,
        }
      }

      // Concatenate all text parts of the first candidate.
      const content =
        data.candidates?.[0]?.content?.parts
          ?.map((p) => p.text || '')
          .join('') || ''

      if (!content || content.trim().length < 1) {
        const blockReason = data.promptFeedback?.blockReason
        const fr = data.candidates?.[0]?.finishReason
        return {
          ok: false,
          status: res.status,
          error: `Empty content${
            blockReason ? ` (blocked: ${blockReason})` : fr ? ` (${fr})` : ''
          }`,
          shouldRotateKey: false,
          shouldSwitchProvider: true,
        }
      }
      return { ok: true, content }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return {
        ok: false,
        status: 0,
        error: msg,
        shouldRotateKey: false,
        shouldSwitchProvider: true,
      }
    }
  },
}

const ADAPTERS: Record<ProviderName, AiProviderAdapter> = {
  openrouter: openRouterAdapter,
  openai: openAiAdapter,
  anthropic: anthropicAdapter,
  gemini: geminiAdapter,
}

// ─── DB update helpers (fire-and-forget) ────────────────────────────────────

/**
 * Record a successful use of a DB-stored key: bump requestCount, clear any
 * prior error, update lastUsedAt. Fire-and-forget — never awaited by the
 * caller, never crashes on DB error. No-op for env-var keys.
 */
function recordKeySuccess(key: LoadedKey): void {
  if (key.source !== 'db') return
  db.aiProviderKey
    .update({
      where: { id: key.id },
      data: {
        lastUsedAt: new Date(),
        lastErrorAt: null,
        lastError: null,
        requestCount: { increment: 1 },
      },
    })
    .catch((err: unknown) => {
      console.warn(
        `[ai-client] DB success-update failed for key ${key.id}: ` +
          (err instanceof Error ? err.message : String(err)),
      )
    })
}

/**
 * Record a failure on a DB-stored key: stamp lastErrorAt + lastError.
 * Fire-and-forget. No-op for env-var keys.
 */
function recordKeyError(key: LoadedKey, errorMsg: string): void {
  if (key.source !== 'db') return
  db.aiProviderKey
    .update({
      where: { id: key.id },
      data: {
        lastErrorAt: new Date(),
        lastError: errorMsg.slice(0, 500),
      },
    })
    .catch((err: unknown) => {
      console.warn(
        `[ai-client] DB error-update failed for key ${key.id}: ` +
          (err instanceof Error ? err.message : String(err)),
      )
    })
}

// ─── callAI (unified entry point) ───────────────────────────────────────────

export interface CallAIResult {
  content: string
  /** Provider that produced the content (e.g. 'openai'). */
  provider: string
  /** Model that produced the content (e.g. 'gpt-4o-mini'). */
  model: string
  /** DB row id of the key that succeeded (undefined for env-var keys). */
  keyId?: string
}

/**
 * Unified AI entry point — tries the configured providers in order, rotating
 * keys on 429/401/403 and switching providers on 5xx / network errors.
 *
 * Algorithm:
 *   1. Load the key chain (DB + env fallback).
 *   2. For each provider in [openrouter, openai, anthropic, gemini]:
 *      - If no keys for this provider, skip.
 *      - For each key (priority order):
 *        - For each model (preferred first, then provider defaults):
 *          - Make the request via the adapter.
 *          - Success → record + return.
 *          - shouldRotateKey → record + break to next key.
 *          - shouldSwitchProvider → record + break to next provider.
 *          - Other failure → record + try next model.
 *   3. If all providers exhausted → throw Error('All AI providers exhausted').
 *
 * `preferredModel` (if set) is prepended to each provider's default model list
 * (deduped). This means a caller passing `gpt-4o-mini` will try it first on
 * every provider — OpenRouter/OpenAI will recognize it, others will 404 and
 * fall back to their own defaults.
 */
export async function callAI(options: {
  messages: ChatMessage[]
  temperature?: number
  maxTokens?: number
  json?: boolean
  preferredModel?: string
}): Promise<CallAIResult> {
  const { messages, temperature, maxTokens, json, preferredModel } = options

  const chain = await loadAiKeyChain()

  for (const provider of PROVIDER_ORDER) {
    const keys = chain[provider]
    if (keys.length === 0) continue
    const adapter = ADAPTERS[provider]

    // Build the model list: preferred first (if set), then defaults (deduped).
    const defaults = DEFAULT_MODELS[provider]
    const models = preferredModel
      ? Array.from(new Set([preferredModel, ...defaults]))
      : defaults

    let switchProvider = false
    for (const key of keys) {
      if (switchProvider) break

      for (const model of models) {
        // 60s timeout per attempt. Free models can be slow on cold starts.
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

        // Use `const` + `.catch().finally()` so TypeScript can narrow the
        // discriminated union after the `result.ok` check (a `let` assigned
        // across try/catch defeats CFA narrowing).
        const result: ProviderResult = await adapter
          .request({
            apiKey: key.plaintext,
            model,
            messages,
            temperature,
            maxTokens,
            json,
            signal: controller.signal,
          })
          .catch((err: unknown): ProviderResult => {
            // Defensive: adapters should never throw, but if one does, treat
            // it as a switch-provider error (adapter in unknown state).
            const msg = err instanceof Error ? err.message : String(err)
            return {
              ok: false,
              status: 0,
              error: msg,
              shouldRotateKey: false,
              shouldSwitchProvider: true,
            }
          })
          .finally(() => {
            clearTimeout(timeoutId)
          })

        if (result.ok) {
          recordKeySuccess(key)
          return {
            content: result.content,
            provider,
            model,
            keyId: key.source === 'db' ? key.id : undefined,
          }
        }

        // Failure — record + decide what to do next.
        recordKeyError(key, result.error)

        if (result.shouldSwitchProvider) {
          console.warn(
            `[ai-client] ${provider}/${model} (key ${key.id}): ` +
              `"${result.error.slice(0, 120)}" → switching provider`,
          )
          switchProvider = true
          break // break model loop; outer key loop will exit via switchProvider flag.
        }

        if (result.shouldRotateKey) {
          console.warn(
            `[ai-client] ${provider}/${model} (key ${key.id}): ` +
              `"${result.error.slice(0, 120)}" → rotating key`,
          )
          break // break model loop; continue to next key.
        }

        // Neither rotate nor switch — model-specific failure, try next model.
        console.warn(
          `[ai-client] ${provider}/${model} (key ${key.id}): ` +
            `"${result.error.slice(0, 120)}" → trying next model`,
        )
      }
    }
  }

  throw new Error('All AI providers exhausted')
}

// ─── callOpenRouter (back-compat wrapper) ───────────────────────────────────

export interface CallOpenRouterOptions {
  messages: ChatMessage[]
  temperature?: number
  maxTokens?: number
  /** When true, sets response_format: { type: 'json_object' } where supported. */
  json?: boolean
  /** Preferred model name (provider-agnostic — adapter tries it first). */
  model?: string
}

/**
 * Back-compat wrapper around `callAI()`. Preserves the original
 * `{ messages, temperature?, maxTokens?, json?, model? }` → `Promise<string>`
 * contract so existing consumer routes work without changes.
 *
 * NOTE: Despite the name, this no longer only calls OpenRouter — it walks the
 * full fallback chain (OpenRouter → OpenAI → Anthropic → Gemini). The name is
 * kept for back-compat with the 6 consumer routes that import it.
 */
export async function callOpenRouter(
  options: CallOpenRouterOptions,
): Promise<string> {
  const result = await callAI({
    messages: options.messages,
    temperature: options.temperature,
    maxTokens: options.maxTokens,
    json: options.json,
    preferredModel: options.model,
  })
  return result.content
}

// ─── isAiConfigured helpers ─────────────────────────────────────────────────

/**
 * Sync check — returns true if any AI provider env var is set.
 * Use this when you need a fast, blocking check (e.g. inside a render path).
 * For a comprehensive check that also queries the DB, use `isAiConfiguredAsync()`.
 */
export function isAiConfigured(): boolean {
  if (
    process.env.OPENROUTER_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.GEMINI_API_KEY
  ) {
    return true
  }
  // DB check is async — see isAiConfiguredAsync().
  return false
}

/**
 * Async check — returns true if either (a) any AI provider env var is set,
 * or (b) the DB has at least one active AiProviderKey row. DB errors are
 * caught + logged; the function returns false only if BOTH env and DB are
 * empty/unavailable.
 */
export async function isAiConfiguredAsync(): Promise<boolean> {
  if (isAiConfigured()) return true
  try {
    const count = await db.aiProviderKey.count({ where: { isActive: true } })
    return count > 0
  } catch (err) {
    console.warn(
      '[ai-client] DB count failed in isAiConfiguredAsync: ' +
        (err instanceof Error ? err.message : String(err)),
    )
    return false
  }
}

// ─── Prompt builder (unchanged) ─────────────────────────────────────────────

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

// ─── JSON extraction (unchanged) ────────────────────────────────────────────

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

// ─── Hub content validation ─────────────────────────────────────────────────

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
 * Generate per-tenant hub content via the AI fallback chain.
 *
 * Iterates OPENROUTER_MODELS as the preferred model hint; for each, calls
 * `callOpenRouter()` which walks all 4 providers/keys/models. Returns null
 * only if ALL attempts fail, so callers can fall back to hardcoded
 * INDUSTRY_DUMMIES — onboarding must NEVER block on AI being down.
 *
 * Logs which preferred model succeeded (and which provider actually answered)
 * for observability.
 */
export async function generateHubContent(
  input: HubContentInput,
): Promise<HubContent | null> {
  if (!(await isAiConfiguredAsync())) {
    console.error('[ai-client] No AI providers configured — skipping AI generation')
    return null
  }

  const { system, user } = buildPrompts(input)

  for (const model of OPENROUTER_MODELS) {
    try {
      const raw = await callOpenRouter({
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        json: true,
        model,
      })
      const parsed = extractJson<unknown>(raw)

      if (isValidHubContent(parsed)) {
        console.log(
          `[ai-client] Hub content generated (preferred model: ${model})`,
        )
        return parsed
      }
      console.warn(
        `[ai-client] ${model}: response missing required fields, trying next model`,
      )
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      console.warn(`[ai-client] ${model} failed: ${msg}`)
    }
  }

  console.error('[ai-client] All AI providers/models failed')
  return null
}

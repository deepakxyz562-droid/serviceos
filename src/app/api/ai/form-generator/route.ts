import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { callOpenRouter, extractJson } from '@/lib/ai-client'
import { FIELD_TYPES } from '@/lib/form-field-types'

/**
 * POST /api/ai/form-generator
 *
 * Generates an array of form fields from a natural-language description
 * using OpenRouter. Returns a `{ fields: [...] }` payload whose entries
 * match the `FormField` shape used by the form builder (see
 * `src/lib/form-field-types.ts` and `src/components/views/form-builder-view.tsx`).
 *
 * Body:
 *   - prompt: string            (required) — natural-language form description
 *   - formType?: string         (optional) — one of the FormType values;
 *                               defaults to 'custom'
 *
 * Returns:
 *   - 200 `{ fields: FormField[] }`
 *   - 400 missing/empty prompt
 *   - 401 unauthorized
 *   - 503 AI service not configured (OPENROUTER_API_KEY missing)
 *   - 502 AI generation failed
 *   - 500 catch-all
 */

const VALID_FORM_TYPES = [
  'lead_capture',
  'booking',
  'feedback',
  'survey',
  'quote_request',
  'job_request',
  'custom',
] as const

/** Build a random id matching the builder's `f-...` convention. */
function makeFieldId(): string {
  return `f-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export async function POST(request: NextRequest) {
  try {
    // ─── Auth ────────────────────────────────────────────────────────────
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ─── Parse + validate body ───────────────────────────────────────────
    const body = await request.json().catch(() => ({}))
    const { prompt, formType } = body as { prompt?: string; formType?: string }

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 })
    }

    const safeFormType =
      formType && (VALID_FORM_TYPES as readonly string[]).includes(formType)
        ? formType
        : 'custom'

    // ─── AI service availability ─────────────────────────────────────────
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'AI service not configured.' },
        { status: 503 },
      )
    }

    // ─── Build prompts ───────────────────────────────────────────────────
    // The list of valid engine field types from src/lib/form-field-types.ts.
    const validTypes = FIELD_TYPES.map((t) => t.value).join(', ')

    const system = `You are a form-design assistant for a field-service SaaS platform. Given a short natural-language description, design a complete, well-structured form by returning a JSON array of fields.

You may ONLY use the following field "type" values (use them verbatim — never invent new types):
${validTypes}

Field type guidance:
- short_answer  → single-line text (name, email, phone, short title)
- long_answer   → multi-line text (description, comments, issue details)
- numerical     → numbers (age, quantity, price, area)
- dropdown      → single-select from options (provide 2-8 options)
- checkbox      → multi-select from options (provide 2-8 options)
- photo         → photo upload (site photos, before/after, damage)
- video         → video upload
- voice_note    → audio recording
- gps           → GPS location capture
- signature     → customer signature
- barcode       → barcode scan
- qr_scan       → QR code scan
- asset_selection → pick from a catalog of assets/equipment
- ai_image_analysis → AI analyzes an uploaded image (use sparingly)
- drawing_markup   → annotate on top of an image

Output ONLY a JSON object with EXACTLY this shape (no markdown, no prose, no code fences):
{
  "fields": [
    {
      "id": "field_<unique_random_string>",
      "type": "<one of the valid types above>",
      "label": "<human-readable label>",
      "required": true,
      "placeholder": "<short hint, optional>",
      "helpText": "<extra guidance, optional>",
      "options": ["Option 1", "Option 2"],
      "defaultValue": "<optional>"
    }
  ]
}

Rules:
- Generate between 4 and 12 fields — enough to capture the intent without overwhelming the user.
- Include "options" ONLY for dropdown and checkbox fields (2-8 string options).
- "options" MUST be omitted for all other field types.
- Mark contact-identifying fields (name, phone, email) as required when appropriate.
- Use clear, user-facing labels (Title Case, e.g. "Customer Name", "Preferred Appointment Time").
- Every field MUST have a non-empty "type" and "label".
- Do NOT include any text outside the JSON object.`

    const userPrompt = `Form type: ${safeFormType}

User description:
${prompt.trim()}

Generate the JSON form definition now.`

    // ─── Call OpenRouter ────────────────────────────────────────────────
    let raw: string
    let model: string
    try {
      const result = await callOpenRouter({
        system,
        user: userPrompt,
        json: true,
        temperature: 0.7,
        maxTokens: 2048,
      })
      raw = result.content
      model = result.model
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[api/ai/form-generator] OpenRouter call failed:', msg)
      return NextResponse.json(
        { error: 'AI generation failed. Please try again.' },
        { status: 502 },
      )
    }

    // ─── Parse + normalize ──────────────────────────────────────────────
    let parsed: unknown
    try {
      parsed = extractJson<unknown>(raw)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(
        `[api/ai/form-generator] JSON parse failed (model=${model}):`,
        msg,
        '\nraw (truncated):',
        raw.slice(0, 500),
      )
      return NextResponse.json(
        { error: 'AI returned malformed response. Please try again.' },
        { status: 502 },
      )
    }

    // The model may return either `{ fields: [...] }` or a bare array.
    let candidateFields: unknown[]
    if (Array.isArray(parsed)) {
      candidateFields = parsed
    } else if (
      parsed &&
      typeof parsed === 'object' &&
      Array.isArray((parsed as Record<string, unknown>).fields)
    ) {
      candidateFields = (parsed as Record<string, unknown[]>).fields
    } else {
      console.error(
        `[api/ai/form-generator] Unexpected payload shape (model=${model}):`,
        JSON.stringify(parsed).slice(0, 500),
      )
      return NextResponse.json(
        { error: 'AI returned an unexpected response shape. Please try again.' },
        { status: 502 },
      )
    }

    const validTypeSet = new Set<string>(FIELD_TYPES.map((t) => t.value))

    const normalized: Record<string, unknown>[] = []
    for (const entry of candidateFields) {
      if (!entry || typeof entry !== 'object') continue
      const f = entry as Record<string, unknown>

      const type = typeof f.type === 'string' ? f.type : ''
      const label = typeof f.label === 'string' ? f.label.trim() : ''

      // Must have at least a valid type and a non-empty label.
      if (!validTypeSet.has(type) || !label) continue

      const id =
        typeof f.id === 'string' && f.id.trim() ? f.id.trim() : makeFieldId()

      const field: Record<string, unknown> = {
        id,
        type,
        label,
        required: typeof f.required === 'boolean' ? f.required : false,
      }

      // Optional string fields.
      if (typeof f.placeholder === 'string' && f.placeholder.trim()) {
        field.placeholder = f.placeholder
      }
      if (typeof f.helpText === 'string' && f.helpText.trim()) {
        field.description = f.helpText
      }
      if (typeof f.defaultValue === 'string' && f.defaultValue.trim()) {
        // No "defaultValue" on the local FormField shape — fold into placeholder
        // when the model didn't already supply one.
        if (typeof field.placeholder !== 'string') {
          field.placeholder = f.defaultValue
        }
      }

      // Options only valid for dropdown / checkbox.
      if (
        (type === 'dropdown' || type === 'checkbox') &&
        Array.isArray(f.options)
      ) {
        const opts = f.options
          .map((o) => (typeof o === 'string' ? o.trim() : ''))
          .filter((o) => o.length > 0)
        if (opts.length > 0) {
          field.options = opts
        }
      }

      normalized.push(field)
    }

    return NextResponse.json({ fields: normalized })
  } catch (error) {
    console.error('[api/ai/form-generator] Unhandled error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to generate form: ${message}` },
      { status: 500 },
    )
  }
}

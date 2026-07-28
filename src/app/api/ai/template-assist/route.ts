import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { callOpenRouter, extractJson } from '@/lib/ai-client';

/**
 * POST /api/ai/template-assist
 * ----------------------------
 * AI assistant for the Template Studio. Generates, improves, or shortens
 * template content for either the WhatsApp editor (single message body) or
 * the Email editor (subject line + body).
 *
 * Request body:
 *   {
 *     action:   'generate' | 'improve' | 'shorten',   // required
 *     channel:  'email' | 'whatsapp',                 // required
 *     content:  string,                                // current text (for improve/shorten) or prompt (for generate)
 *     tone?:    'friendly' | 'professional' | 'urgent' | 'casual',  // default 'professional'
 *     context?: string,                                // for 'generate' — a description/prompt of what to write
 *   }
 *
 * Returns 200: { subject?: string, body: string }
 *   - subject is omitted for WhatsApp (no subject line).
 *
 * Errors:
 *   401 — not authenticated
 *   400 — missing/invalid fields
 *   503 — OPENROUTER_API_KEY not set (AI service not configured)
 *   502 — AI call failed or returned unparseable/empty JSON
 *   500 — other errors
 *
 * Uses callOpenRouter() from phase-1 (src/lib/ai-client.ts) — generic
 * OpenRouter chat-completion client with model fallback + 429 retry.
 */

// ─── Types ─────────────────────────────────────────────────────────────────

type Action = 'generate' | 'improve' | 'shorten';
type Channel = 'email' | 'whatsapp';
type Tone = 'friendly' | 'professional' | 'urgent' | 'casual';

interface AssistRequest {
  action?: string;
  channel?: string;
  content?: string;
  tone?: string;
  context?: string;
}

interface AssistResponse {
  subject?: string;
  body: string;
}

const VALID_ACTIONS: Action[] = ['generate', 'improve', 'shorten'];
const VALID_CHANNELS: Channel[] = ['email', 'whatsapp'];
const VALID_TONES: Tone[] = ['friendly', 'professional', 'urgent', 'casual'];

// ─── Prompt builders ───────────────────────────────────────────────────────

function buildSystemPrompt(action: Action, channel: Channel, tone: Tone): string {
  const channelRules =
    channel === 'email'
      ? 'This is an EMAIL. You MUST include a concise "subject" line (max 70 chars) AND a "body" (max 800 chars). ' +
        'The body should be plain text with proper line breaks (newlines between paragraphs). Use a salutation like "Hi {{customer.name}}," and a sign-off.'
      : 'This is a WhatsApp message. The body must be max 320 chars. No subject line needed — omit the "subject" field. ' +
        'You MAY use 1-2 relevant emojis. Be warm and conversational.';

  const actionRules =
    action === 'generate'
      ? 'Write FRESH content based on the user-supplied description/context.'
      : action === 'improve'
        ? 'IMPROVE the existing content the user provides. Keep the core message but make it clearer, more engaging, and better structured.'
        : 'SHORTEN the existing content the user provides. Cut fluff while keeping the key message and tone.';

  const shape =
    channel === 'email'
      ? '{ "subject": string, "body": string }'
      : '{ "body": string }';

  return `You are a professional copywriter for a field-service business. ${actionRules}

${channelRules}

Tone: ${tone}.

CRITICAL RULES:
1. Output ONLY a valid JSON object (no markdown, no code fences, no prose outside the JSON).
2. Shape: ${shape}
3. The "body" must be plain text (no HTML, no markdown bold). Newlines between paragraphs are fine.
4. For email: subject max 70 chars, body max 800 chars.
5. For WhatsApp: body max 320 chars, max 2 emojis.
6. Match the requested tone exactly.
7. Do NOT include any explanation outside the JSON.`;
}

function buildUserPrompt(action: Action, content: string, context?: string): string {
  if (action === 'generate') {
    const prompt = (context && context.trim()) || content;
    return `Write a new message based on this description:

${prompt}

Return ONLY the JSON object now.`;
  }
  const verb = action === 'improve' ? 'Improve' : 'Shorten';
  return `${verb} the following content. Keep the core meaning and tone.

EXISTING CONTENT:
${content}

Return ONLY the JSON object now.`;
}

// ─── Main route handler ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // 1. Auth
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    // 2. Parse + validate body
    const body = (await request.json().catch(() => null)) as AssistRequest | null;
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const actionRaw = (body.action || '').trim();
    const channelRaw = (body.channel || '').trim();
    const toneRaw = (body.tone || 'professional').trim();
    const content = typeof body.content === 'string' ? body.content : '';
    const context = typeof body.context === 'string' ? body.context : '';

    if (!actionRaw) {
      return NextResponse.json({ error: 'action is required.' }, { status: 400 });
    }
    if (!VALID_ACTIONS.includes(actionRaw as Action)) {
      return NextResponse.json(
        { error: `action must be one of: ${VALID_ACTIONS.join(', ')}` },
        { status: 400 },
      );
    }
    if (!channelRaw) {
      return NextResponse.json({ error: 'channel is required.' }, { status: 400 });
    }
    if (!VALID_CHANNELS.includes(channelRaw as Channel)) {
      return NextResponse.json(
        { error: `channel must be one of: ${VALID_CHANNELS.join(', ')}` },
        { status: 400 },
      );
    }
    if (!VALID_TONES.includes(toneRaw as Tone)) {
      return NextResponse.json(
        { error: `tone must be one of: ${VALID_TONES.join(', ')}` },
        { status: 400 },
      );
    }

    const action = actionRaw as Action;
    const channel = channelRaw as Channel;
    const tone = toneRaw as Tone;

    // For 'generate', the user must provide context (or content as the prompt).
    // For 'improve' / 'shorten', content (the existing text) is required.
    if (action === 'generate') {
      if (!context.trim() && !content.trim()) {
        return NextResponse.json(
          { error: 'context is required for the "generate" action.' },
          { status: 400 },
        );
      }
    } else {
      if (!content.trim()) {
        return NextResponse.json(
          { error: `content is required for the "${action}" action.` },
          { status: 400 },
        );
      }
    }

    // 3. AI service check (503 if not configured). Checked BEFORE building
    //    prompts / calling the LLM so the client gets a fast, clear signal.
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'AI service not configured. Set OPENROUTER_API_KEY.' },
        { status: 503 },
      );
    }

    // 4. Build prompts.
    const system = buildSystemPrompt(action, channel, tone);
    const userPrompt = buildUserPrompt(action, content, context);

    // 5. Call OpenRouter (json mode). On failure, surface a 502 so the
    //    client can show a retry-friendly message.
    let raw: string;
    try {
      const result = await callOpenRouter({
        system,
        user: userPrompt,
        json: true,
        temperature: 0.7,
        maxTokens: 1024,
      });
      raw = result.content;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[ai/template-assist] callOpenRouter failed:', msg);
      return NextResponse.json(
        { error: `AI generation failed: ${msg.slice(0, 200)}` },
        { status: 502 },
      );
    }

    // 6. Parse the JSON response.
    let parsed: Partial<AssistResponse> = {};
    try {
      parsed = extractJson<Partial<AssistResponse>>(raw);
    } catch {
      return NextResponse.json(
        {
          error: 'AI returned a response that could not be parsed as JSON.',
          raw: raw.slice(0, 500),
        },
        { status: 502 },
      );
    }

    const generatedBody =
      typeof parsed.body === 'string' && parsed.body.trim().length > 0
        ? parsed.body.trim()
        : '';
    const generatedSubject =
      typeof parsed.subject === 'string' && parsed.subject.trim().length > 0
        ? parsed.subject.trim()
        : undefined;

    if (!generatedBody) {
      return NextResponse.json(
        {
          error: 'AI returned an empty body. Please try again.',
          raw: raw.slice(0, 500),
        },
        { status: 502 },
      );
    }

    // 7. Return 200 with the result. Omit subject for WhatsApp even if the
    //    AI emitted one (it shouldn't, but be defensive).
    const response: AssistResponse = {
      body: generatedBody,
      ...(channel === 'email' && generatedSubject
        ? { subject: generatedSubject }
        : {}),
    };
    return NextResponse.json(response);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to assist template';
    console.error('[/api/ai/template-assist] error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

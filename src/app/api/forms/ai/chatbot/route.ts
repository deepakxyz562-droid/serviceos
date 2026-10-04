import { NextRequest, NextResponse } from 'next/server';
import { callAI, isAiConfiguredAsync } from '@/lib/ai-client';
import { db } from '@/lib/db';
import { checkAiQuota, trackAiUsage } from '@/lib/ai-usage-tracker';

/**
 * AI Chatbot (form embed) — conversational Q&A for visitors filling out a
 * public form. Powered by the same multi-provider fallback chain as
 * /api/ai/chat.
 *
 * POST /api/forms/ai/chatbot
 *   body: { message: string, history?: [{role, content}], botId?: string, formId?: string }
 *   returns: { reply: string }
 *
 * Public route (no auth) — the tenant is resolved from formId so AI quota is
 * billed to the form owner. CORS-open so embedded forms on third-party sites
 * can call it.
 */

export const runtime = 'nodejs';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

const MAX_HISTORY = 12;
const MAX_MESSAGE_CHARS = 4000;

interface IncomingMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message: string | undefined = body.message;
    const history: IncomingMessage[] = Array.isArray(body.history) ? body.history : [];
    const formId: string | undefined = body.formId;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'message is required' }, { status: 400, headers: CORS_HEADERS });
    }

    const configured = await isAiConfiguredAsync();
    if (!configured) {
      return NextResponse.json(
        { error: 'AI is not configured for this workspace.' },
        { status: 503, headers: CORS_HEADERS },
      );
    }

    // Resolve the form + tenant to bill AI usage to the form owner.
    let tenantId: string | null = null;
    let systemPrompt =
      'You are a helpful, friendly assistant embedded on a web form. Answer the visitor concisely (2-3 sentences). If you cannot answer, suggest they leave their contact details in the form and a human will follow up.';

    if (formId) {
      try {
        const form = await db.form.findUnique({
          where: { id: formId },
          select: { name: true, tenantId: true, agentConfig: true },
        });
        if (form) {
          tenantId = form.tenantId || null;
          if (form.agentConfig) {
            const agentConfig =
              typeof form.agentConfig === 'string'
                ? JSON.parse(form.agentConfig)
                : form.agentConfig;
            const greeting =
              (agentConfig as Record<string, unknown>)?.greeting ||
              (agentConfig as Record<string, unknown>)?.welcomeGreeting;
            const tone = (agentConfig as Record<string, unknown>)?.tone;
            const vertical = (agentConfig as Record<string, unknown>)?.vertical;
            if (greeting || tone || vertical) {
              systemPrompt = `You are the AI assistant for "${form.name}"${vertical ? ` (industry: ${vertical})` : ''}.${tone ? ` Respond in a ${tone} tone.` : ''} ${greeting ? `Context: ${greeting}` : ''} Answer the visitor concisely (2-3 sentences). If you cannot answer, encourage them to submit the form with their contact details.`;
            }
          }
        }
      } catch {
        // ignore DB errors — fall back to generic prompt
      }
    }

    // Enforce per-tenant AI quota (graceful — never hard-block a public form,
    // but log so overage is visible).
    if (tenantId) {
      try {
        const quota = await checkAiQuota(tenantId);
        if (!quota.ok) {
          return NextResponse.json(
            { error: 'AI usage limit reached for this billing period.' },
            { status: 429, headers: CORS_HEADERS },
          );
        }
      } catch {
        // quota check failed — allow the call (best-effort)
      }
    }

    // Trim + sanitize history.
    const trimmedHistory = history.slice(-MAX_HISTORY).map((m) => ({
      role: m.role,
      content: String(m.content).slice(0, MAX_MESSAGE_CHARS),
    }));

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...trimmedHistory.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: String(message).slice(0, MAX_MESSAGE_CHARS) },
    ];

    const result = await callAI({ messages });
    const reply: string = result?.content ?? '';

    if (!reply) {
      return NextResponse.json(
        { error: 'The AI could not generate a reply. Please try again.' },
        { status: 502, headers: CORS_HEADERS },
      );
    }

    // Log usage (best-effort).
    if (tenantId) {
      await trackAiUsage(tenantId, {
        feature: 'forms_ai_chatbot',
        promptTokens: message.length,
        completionTokens: reply.length,
      }).catch(() => {});
    }

    return NextResponse.json({ reply }, { headers: CORS_HEADERS });
  } catch (error: any) {
    console.error('[forms/ai/chatbot POST]', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate a reply.' },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}

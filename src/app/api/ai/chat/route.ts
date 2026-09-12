import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity-log';
import { checkAiQuota } from '@/lib/ai-usage-tracker';
import { callAI, isAiConfiguredAsync } from '@/lib/ai-client';
import { BRAND } from '@/lib/brand';
import {
  executeChatTool,
  getToolCatalogForPrompt,
  parseToolCall,
  serializeToolResult,
} from '@/lib/ai-chat-tools';

/**
 * AI Assistant — conversational business Q&A (Tier 2)
 * ====================================================
 * POST /api/ai/chat
 *
 * Body: { messages: [{ role: 'user' | 'assistant', content: string }], conversationId?: string }
 * Returns: { reply, toolCalls, quota? }
 *
 * Uses callAI() from src/lib/ai-client.ts — the multi-provider fallback chain
 * that reads encrypted API keys from AiProviderKey (superadmin-managed via
 * AI Platform → Providers) and falls back across OpenRouter → OpenAI →
 * Anthropic → Gemini → ZAI SDK (last resort for dev/sandbox).
 *
 * Bounded tool loop with a JSON protocol (no native function-calling):
 *   1. System prompt = business context + tool catalog + protocol rules.
 *   2. Model replies with final answer OR {"tool_call": {"name","arguments"}}.
 *   3. Tool executed server-side via executeChatTool (READ-ONLY, tenant-scoped).
 *   4. Result appended as [TOOL_RESULT] message. Max 3 tool rounds.
 */

const MAX_TOOL_ROUNDS = 3;
const MAX_HISTORY_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 8000;

interface IncomingMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ToolCallRecord {
  name: string;
  arguments: Record<string, unknown>;
  ok: boolean;
  summary: string;
}

function summarizeToolResult(name: string, result: unknown): string {
  try {
    const r = result as Record<string, unknown>;
    if (!r) return name;
    if ('count' in r && typeof r.count === 'number') return `${r.count} result${r.count === 1 ? '' : 's'}`;
    if ('business' in r) return 'business snapshot';
    if ('job' in r) return 'job details';
    if ('customer' in r) return 'customer profile';
    if ('monthly' in r) return 'revenue summary';
    if ('services' in r) return `${(r.services as unknown[])?.length ?? 0} services`;
    return 'done';
  } catch {
    return name;
  }
}

function buildSystemPrompt(tenantName: string, tenantCtx: string, today: string): string {
  return `You are the AI Assistant embedded in the ${BRAND.name} dashboard for "${tenantName}".
${tenantCtx}

Today's date is ${today}. The user is the business owner or a staff member asking questions about THEIR OWN business data.

You answer questions by using the READ-ONLY tools listed below. You CANNOT create, modify, or delete anything — if asked, say so and point the user to the relevant dashboard section.

AVAILABLE TOOLS:
${getToolCatalogForPrompt()}

RESPONSE PROTOCOL (follow exactly):
1. If you can answer WITHOUT live data (greetings, explanations, general advice), reply directly in concise markdown. Do not invent numbers — you may only reference numbers a tool returned earlier in this conversation.
2. If you need live data, reply with ONLY ONE JSON object (no other text, optionally in a \`\`\`json fence):
   {"tool_call": {"name": "<tool name>", "arguments": {<args>}}}
3. After you request a tool, the next user message starting with [TOOL_RESULT] contains the JSON result. Use it to answer, or request ONE more tool if truly needed (max ${MAX_TOOL_ROUNDS} tool rounds).
4. Never fabricate IDs, names, amounts, or dates. If a tool returns nothing or errors, say what you looked for and suggest trying another term or the relevant dashboard page.
5. Keep answers short and structured (bullets/tables) when comparing items. Amounts use the business currency. Dates as "Mon, Jan 5".`;
}

export async function POST(request: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (user.role === 'customer') return NextResponse.json({ error: 'Not available for customer accounts' }, { status: 403 });
  const tenantId = user.tenantId;
  if (!tenantId) return NextResponse.json({ error: 'No workspace selected.' }, { status: 400 });

  // ── Quota (admission control) ───────────────────────────────────────────
  const isSuperAdmin = user.isSuperAdmin === true || user.role === 'superadmin' || user.role === 'super_admin';
  if (!isSuperAdmin) {
    const quota = await checkAiQuota(tenantId);
    if (!quota.ok) return quota.response!;
  }

  // ── Input ───────────────────────────────────────────────────────────────
  let body: { messages?: IncomingMessage[]; conversationId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const incoming = Array.isArray(body.messages) ? body.messages : [];
  const history: IncomingMessage[] = incoming
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_CHARS) }));

  if (history.length === 0 || history[history.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'messages must end with a user message' }, { status: 400 });
  }

  // ── Verify AI is configured ─────────────────────────────────────────────
  const configured = await isAiConfiguredAsync();
  if (!configured) {
    return NextResponse.json(
      { error: 'AI is not configured. Add a provider key in AI Platform → Providers.' },
      { status: 503 },
    );
  }

  // ── Business context ────────────────────────────────────────────────────
  let tenantName = 'your business';
  let tenantCtx = '';
  try {
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, industry: true, city: true, state: true, currency: true },
    });
    if (tenant) {
      tenantName = tenant.name;
      tenantCtx = [
        tenant.industry ? `Industry: ${tenant.industry}` : null,
        tenant.city ? `Location: ${[tenant.city, tenant.state].filter(Boolean).join(', ')}` : null,
        tenant.currency ? `Currency: ${tenant.currency}` : null,
      ].filter(Boolean).join(' · ');
    }
  } catch {
    // Non-fatal.
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const conversation: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: buildSystemPrompt(tenantName, tenantCtx, today) },
    ...history,
  ];

  const toolCalls: ToolCallRecord[] = [];
  let reply = '';
  let model = 'unknown';

  try {
    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      // callAI() reads superadmin-managed AiProviderKey chain + env fallback +
      // ZAI SDK last resort. usageContext auto-writes the Tier 4 ledger row.
      const result = await callAI({
        messages: conversation,
        temperature: 0.4,
        usageContext: { tenantId, feature: 'assistant_chat' },
      });

      const content: string = result.content ?? '';
      model = result.model || model;
      if (!content.trim()) {
        reply = 'I could not generate a response. Please rephrase and try again.';
        break;
      }

      const toolCall = round < MAX_TOOL_ROUNDS ? parseToolCall(content) : null;
      if (!toolCall) {
        reply = content.trim();
        break;
      }

      // ── Execute the requested tool server-side (tenant-scoped, read-only)
      const execution = await executeChatTool(tenantId, toolCall.name, toolCall.arguments);
      const resultPayload = execution.ok
        ? execution.result
        : { error: execution.error ?? 'Tool execution failed' };

      toolCalls.push({
        name: toolCall.name,
        arguments: toolCall.arguments,
        ok: execution.ok,
        summary: summarizeToolResult(toolCall.name, resultPayload),
      });

      conversation.push({ role: 'assistant', content: content.trim() });
      conversation.push({
        role: 'user',
        content: `[TOOL_RESULT name=${toolCall.name}]\n${serializeToolResult(resultPayload)}`,
      });
    }

    if (!reply) {
      reply = 'I could not complete that lookup. Please rephrase your question or check the relevant dashboard section.';
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ai/chat] callAI failed:', msg);

    let errorDetail = 'All configured AI providers are unavailable. Please try again in a moment.';
    if (msg.includes('429') || msg.includes('Rate limit') || msg.includes('free-models-per-day')) {
      errorDetail = 'Daily rate limit reached on OpenRouter free tier. Please add credits to your OpenRouter account or add a Gemini/OpenAI API key in Superadmin AI Center.';
    } else if (msg.includes('exhausted') || msg.includes('All AI')) {
      errorDetail = 'All configured AI providers are currently unavailable or exhausted. Please check your provider keys in Superadmin AI Center.';
    }

    return NextResponse.json(
      { error: errorDetail },
      { status: 502 },
    );
  }

  // ── Quota read-back for the UI meter (counter + ledger already written by
  // callAI's usageContext on each successful completion) ──
  let quota: { used: number; quota: number } | undefined;
  try {
    const subscription = await db.subscription.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: { aiUsageCount: true, aiQuota: true },
    });
    if (subscription) quota = { used: subscription.aiUsageCount, quota: subscription.aiQuota };
  } catch {
    // Best-effort.
  }

  logActivity({
    tenantId,
    actorId: user.id,
    actorName: user.name ?? user.email,
    action: 'ai_chat',
    entityType: 'ai_assistant',
    entityId: body.conversationId ?? null,
    description: `AI assistant question (${toolCalls.length} tool call${toolCalls.length === 1 ? '' : 's'})`,
    metadataJson: JSON.stringify({ toolCalls: toolCalls.map((t) => t.name), model }),
  }).catch(() => undefined);

  return NextResponse.json({ reply, toolCalls, quota });
}

/**
 * POST /api/auto-reply/test
 *
 * "Test" endpoint for the auto-reply configuration UI. Generates a preview
 * of what the auto-reply would look like for a given visitor message,
 * WITHOUT saving or sending anything.
 *
 * Auth: required (`getAuthUser()`).
 * Subscription: trial users get HTTP 403 (auto-reply is a paid feature).
 *
 * Body: { message: string } — a fake visitor message.
 *
 * Response: { reply: string, mode: 'scripted' | 'ai' }
 *
 * The `mode` field reflects the actual mode used (may be 'scripted' even
 * when `config.mode === 'ai'` if AI is unconfigured or fails). This lets
 * the UI show "AI mode is configured but no AI keys are set — falling back
 * to scripted" hints.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireNotTrial } from '@/lib/trial-gate';
import { generateTestReply } from '@/lib/auto-reply';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const AUTO_REPLY_FEATURE_KEY = 'auto_reply_offline';

export async function POST(request: NextRequest) {
  try {
    // ── Subscription gate ──────────────────────────────────────────────────
    const gate = await requireNotTrial(AUTO_REPLY_FEATURE_KEY);
    if (!gate.ok) return gate.response;

    const tenantId = gate.tenantId;
    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant associated with user' },
        { status: 400 },
      );
    }

    // ── Parse body ─────────────────────────────────────────────────────────
    let body: { message?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 },
      );
    }

    const message =
      typeof body.message === 'string' ? body.message.trim() : '';

    if (!message) {
      return NextResponse.json(
        { error: 'message is required' },
        { status: 400 },
      );
    }

    if (message.length > 5000) {
      return NextResponse.json(
        { error: 'message must be ≤ 5000 characters' },
        { status: 400 },
      );
    }

    // ── Generate the test reply (no save, no send) ────────────────────────
    try {
      const result = await generateTestReply(tenantId, message);
      return NextResponse.json({
        reply: result.reply,
        mode: result.mode,
      });
    } catch (err) {
      console.error('[/api/auto-reply/test] generateTestReply error:', err);
      return NextResponse.json(
        { error: 'Failed to generate test reply' },
        { status: 500 },
      );
    }
  } catch (err) {
    console.error('[/api/auto-reply/test] error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

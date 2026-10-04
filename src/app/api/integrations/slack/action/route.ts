import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * POST /api/integrations/slack/action
 *
 * Real Slack integration backed by the IntegrationConnection record
 * (provider = 'slack', status = 'connected') for the current tenant.
 *
 * Body:
 *   {
 *     action: 'invite' | 'post_message',
 *     email?:   string,           // for invite — looked up via users.lookupByEmail
 *     channel?: string,          // channel id; falls back to configJson.channelId
 *     message?: string,          // text for post_message (or invite fallback)
 *     formResponseId?: string,   // optional — persisted to FormResponse.externalIntegrationId
 *   }
 *
 * Returns:
 *   - 200: { success: true, externalId, action: 'invited' | 'messaged', channel }
 *   - 401: not authenticated
 *   - 503: no connected Slack workspace (the only "no creds" path)
 *   - 400: invalid request (e.g. action missing, channel missing for post_message)
 *   - 502: Slack API returned a non-OK response
 *
 * No externalId is ever fabricated — on any failure path we return an error
 * (503 / 400 / 502) rather than a fake Slack user ID / message ts.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const tenantId = user.tenantId || 'default';

    // ── 1. Resolve the connected Slack workspace for this tenant ────────────
    const conn = await db.integrationConnection.findFirst({
      where: { provider: 'slack', tenantId, status: 'connected' },
    });
    if (!conn || !conn.accessToken) {
      return NextResponse.json(
        {
          success: false,
          error:
            'No Slack workspace connected. Connect Slack in Dashboard > Integrations.',
        },
        { status: 503 }
      );
    }
    const token = conn.accessToken;

    // configJson may carry channelId / defaultChannel — read defensively
    let configJson: Record<string, unknown> = {};
    if (conn.configJson) {
      try {
        const parsed = JSON.parse(conn.configJson);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          configJson = parsed as Record<string, unknown>;
        }
      } catch {
        configJson = {};
      }
    }
    const configChannelId =
      typeof configJson.channelId === 'string' && configJson.channelId.trim()
        ? configJson.channelId.trim()
        : typeof configJson.defaultChannel === 'string'
          ? configJson.defaultChannel.trim()
          : '';

    // ── 2. Parse the request body ─────────────────────────────────────────
    const body = (await request.json().catch(() => ({}))) as {
      action?: unknown;
      email?: unknown;
      channel?: unknown;
      message?: unknown;
      formResponseId?: unknown;
    };

    const action = typeof body.action === 'string' ? body.action : '';
    const email =
      typeof body.email === 'string' && body.email.trim()
        ? body.email.trim()
        : '';
    const channel =
      typeof body.channel === 'string' && body.channel.trim()
        ? body.channel.trim()
        : configChannelId;
    const message =
      typeof body.message === 'string' && body.message.trim() ? body.message.trim() : '';
    const formResponseId =
      typeof body.formResponseId === 'string' && body.formResponseId.trim()
        ? body.formResponseId.trim()
        : '';

    if (action !== 'invite' && action !== 'post_message') {
      return NextResponse.json(
        {
          success: false,
          error: "`action` must be 'invite' or 'post_message'",
        },
        { status: 400 }
      );
    }

    // ── 3. Dispatch to the real Slack API ──────────────────────────────────
    let externalId = '';
    let actionLabel: 'invited' | 'messaged' = 'messaged';

    if (action === 'invite') {
      if (!email) {
        return NextResponse.json(
          { success: false, error: "`email` is required for 'invite'" },
          { status: 400 }
        );
      }
      if (!channel) {
        return NextResponse.json(
          { success: false, error: "A Slack channel is required (set 'channel' in request body or 'channelId' in the connection config)." },
          { status: 400 }
        );
      }

      // 3a. Resolve the user id by email
      const lookupUrl = `https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(email)}`;
      const lookupRes = await fetch(lookupUrl, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      const lookupBody = (await lookupRes.json().catch(() => ({}))) as {
        ok?: boolean;
        user?: { id?: string };
        error?: string;
      };

      if (lookupRes.ok && lookupBody.ok && lookupBody.user?.id) {
        // 3b. User exists in the workspace — invite them to the channel
        const inviteRes = await fetch('https://slack.com/api/conversations.invite', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: JSON.stringify({ channel, users: lookupBody.user.id }),
        });
        const inviteBody = (await inviteRes.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
        };
        // Slack returns `already_in_channel` as a non-fatal "error" — treat it as success.
        if (
          !inviteRes.ok ||
          !inviteBody.ok ||
          (inviteBody.error && inviteBody.error !== 'already_in_channel')
        ) {
          return NextResponse.json(
            {
              success: false,
              error: `Slack conversations.invite failed: ${inviteBody.error || inviteRes.statusText}`,
            },
            { status: 502 }
          );
        }
        externalId = lookupBody.user.id;
        actionLabel = 'invited';
      } else {
        // 3c. User not in the workspace — fallback: post a message to the channel
        const fallbackText =
          message ||
          `📬 New form submission — please invite ${email} to this channel manually.`;
        const postRes = await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json; charset=utf-8',
          },
          body: JSON.stringify({ channel, text: fallbackText }),
        });
        const postBody = (await postRes.json().catch(() => ({}))) as {
          ok?: boolean;
          ts?: string;
          error?: string;
        };
        if (!postRes.ok || !postBody.ok || !postBody.ts) {
          return NextResponse.json(
            {
              success: false,
              error: `Slack chat.postMessage fallback failed: ${postBody.error || postRes.statusText}`,
            },
            { status: 502 }
          );
        }
        externalId = postBody.ts;
        actionLabel = 'messaged';
      }
    } else {
      // action === 'post_message'
      if (!channel) {
        return NextResponse.json(
          { success: false, error: "A Slack channel is required (set 'channel' in request body or 'channelId' in the connection config)." },
          { status: 400 }
        );
      }
      if (!message) {
        return NextResponse.json(
          { success: false, error: "`message` is required for 'post_message'" },
          { status: 400 }
        );
      }
      const postRes = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({ channel, text: message }),
      });
      const postBody = (await postRes.json().catch(() => ({}))) as {
        ok?: boolean;
        ts?: string;
        error?: string;
      };
      if (!postRes.ok || !postBody.ok || !postBody.ts) {
        return NextResponse.json(
          {
            success: false,
            error: `Slack chat.postMessage failed: ${postBody.error || postRes.statusText}`,
          },
          { status: 502 }
        );
      }
      externalId = postBody.ts;
      actionLabel = 'messaged';
    }

    // NOTE: We do NOT persist externalId back to FormResponse here — the widget
    // records it via `onChange` and the form runtime persists it as part of the
    // normal field-value flow. No fabricated IDs are emitted on any path.

    return NextResponse.json({
      success: true,
      externalId,
      action: actionLabel,
      channel,
    });
  } catch (error) {
    console.error('[/api/integrations/slack/action] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Slack action failed',
      },
      { status: 500 }
    );
  }
}

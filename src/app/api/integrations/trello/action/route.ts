import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * POST /api/integrations/trello/action
 *
 * Real Trello integration backed by the IntegrationConnection record
 * (provider = 'trello', status = 'connected') for the current tenant.
 *
 * Body:
 *   {
 *     action: 'create_card',
 *     listId?:       string,         // Trello list id; falls back to configJson.defaultListId
 *     name:          string,         // card title (required)
 *     description?:  string,         // card body
 *     labels?:       string | string[], // comma-separated or array of label IDs
 *     formResponseId?: string,       // accepted for forward-compat (widget records externalId via onChange)
 *   }
 *
 * Returns:
 *   - 200: { success: true, externalId: <card_id>, shortId: <shortLink>, url }
 *   - 401: not authenticated
 *   - 503: no connected Trello account
 *   - 400: invalid request (missing name / listId)
 *   - 502: Trello API returned a non-OK response
 *
 * No externalId is ever fabricated — on any failure path we return an error
 * rather than a fake card id / shortLink.
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

    // ── 1. Resolve the connected Trello account for this tenant ─────────────
    const conn = await db.integrationConnection.findFirst({
      where: { provider: 'trello', tenantId, status: 'connected' },
    });
    if (!conn) {
      return NextResponse.json(
        {
          success: false,
          error:
            'No Trello account connected. Connect Trello in Dashboard > Integrations.',
        },
        { status: 503 }
      );
    }

    // Trello uses BOTH an API key (public-ish, identifies the app) and an
    // OAuth token (per-user, authorises the app on their boards). The brief
    // says: apiSecret = Trello API key, accessToken = Trello OAuth token.
    // Both are also accepted from configJson as a fallback (so an older
    // integration record that stuffed everything into configJson still works).
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
    const configApiKey =
      typeof configJson.apiKey === 'string' && configJson.apiKey.trim()
        ? configJson.apiKey.trim()
        : '';
    const configDefaultListId =
      typeof configJson.defaultListId === 'string' && configJson.defaultListId.trim()
        ? configJson.defaultListId.trim()
        : '';

    const trelloToken = (conn.accessToken || '').trim();
    const trelloApiKey = (conn.apiSecret || configApiKey || '').trim();

    if (!trelloToken || !trelloApiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            'No Trello account connected. Connect Trello in Dashboard > Integrations.',
        },
        { status: 503 }
      );
    }

    // ── 2. Parse the request body ─────────────────────────────────────────
    const body = (await request.json().catch(() => ({}))) as {
      action?: unknown;
      listId?: unknown;
      name?: unknown;
      description?: unknown;
      labels?: unknown;
      formResponseId?: unknown;
    };

    const action = typeof body.action === 'string' ? body.action : '';
    if (action !== 'create_card') {
      return NextResponse.json(
        { success: false, error: "`action` must be 'create_card'" },
        { status: 400 }
      );
    }

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const description =
      typeof body.description === 'string' ? body.description.trim() : '';

    if (!name) {
      return NextResponse.json(
        { success: false, error: "`name` is required to create a Trello card" },
        { status: 400 }
      );
    }

    const listId =
      typeof body.listId === 'string' && body.listId.trim()
        ? body.listId.trim()
        : configDefaultListId;
    if (!listId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A Trello list id is required (set 'listId' in request body or 'defaultListId' in the connection config).",
        },
        { status: 400 }
      );
    }

    // Normalize labels → array of strings
    let labelIds: string[] = [];
    if (typeof body.labels === 'string' && body.labels.trim()) {
      labelIds = body.labels
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (Array.isArray(body.labels)) {
      labelIds = body.labels
        .filter((l): l is string => typeof l === 'string' && l.trim().length > 0)
        .map((l) => l.trim());
    }

    // ── 3. Create the card via Trello REST API ────────────────────────────
    // Trello expects query params for auth + form-encoded body for the card
    // fields. We use URLSearchParams to keep everything well-encoded.
    const params = new URLSearchParams({
      key: trelloApiKey,
      token: trelloToken,
      idList: listId,
      name,
      pos: 'bottom',
    });
    if (description) params.append('desc', description);
    if (labelIds.length > 0) params.append('idLabels', labelIds.join(','));

    const trelloRes = await fetch('https://api.trello.com/1/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const trelloBody = (await trelloRes.json().catch(() => ({}))) as {
      id?: string;
      shortLink?: string;
      url?: string;
      name?: string;
      message?: string;
    };

    if (!trelloRes.ok || !trelloBody.id) {
      return NextResponse.json(
        {
          success: false,
          error: `Trello create card failed: ${
            trelloBody.message || trelloRes.statusText
          }`,
        },
        { status: 502 }
      );
    }

    const shortId = trelloBody.shortLink || trelloBody.id;
    const cardUrl =
      trelloBody.url ||
      (shortId ? `https://trello.com/c/${shortId}` : 'https://trello.com');

    return NextResponse.json({
      success: true,
      externalId: trelloBody.id,
      shortId,
      url: cardUrl,
    });
  } catch (error) {
    console.error('[/api/integrations/trello/action] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Trello action failed',
      },
      { status: 500 }
    );
  }
}

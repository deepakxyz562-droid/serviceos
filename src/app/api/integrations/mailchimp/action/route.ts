import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export const runtime = 'nodejs';

function parseConfigJson(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/**
 * Extract the Mailchimp data center (e.g. `us21`) from an API key like
 * `abc123-us21`. Returns '' if no `-dc` suffix is present.
 */
function extractDataCenter(apiKey: string): string {
  const m = apiKey.match(/-([a-z]+\d+)$/i);
  return m ? m[1].toLowerCase() : '';
}

/**
 * Mailchimp uses the lowercased MD5 of the subscriber email as the
 * subscriber_hash (their canonical id). This is reused on GET/PUT/PATH
 * endpoints; we return it as the externalId on subscribe.
 *
 * Uses node:crypto (WebCrypto does not implement MD5 in Node).
 */
function subscriberHash(email: string): string {
  return createHash('md5').update(email.toLowerCase(), 'utf8').digest('hex');
}

/**
 * POST /api/integrations/mailchimp/action
 *
 * Body: {
 *   action: 'subscribe',
 *   listId?: string,       // falls back to configJson.listId
 *   email: string,
 *   firstName?: string,
 *   lastName?: string,
 *   formResponseId?: string,
 * }
 *
 * Subscribes an email to a Mailchimp audience list. Uses Mailchimp's
 * "Add or update a list member" PUT endpoint so that re-subscribes don't
 * throw — a fresh subscriber gets `status: 'subscribed'`.
 *
 * Returns { success: true, externalId: <subscriber_hash>, status } on
 * success. Returns 503 when no connected integration is found.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';

    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const action = typeof body.action === 'string' ? body.action : '';
    if (action !== 'subscribe') {
      return NextResponse.json(
        { error: "Unknown action — supported: 'subscribe'" },
        { status: 400 },
      );
    }

    const conn = await db.integrationConnection.findFirst({
      where: { provider: 'mailchimp', tenantId, status: 'connected' },
    });

    if (!conn) {
      return NextResponse.json(
        { error: 'Mailchimp is not connected. Connect your account in Dashboard > Integrations.' },
        { status: 503 },
      );
    }

    // Mailchimp API key may be in accessToken OR apiSecret. Prefer whichever
    // is non-empty.
    const apiKey =
      (conn.accessToken && conn.accessToken.trim()) ||
      (conn.apiSecret && conn.apiSecret.trim()) ||
      '';

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Mailchimp API key is missing from the connection' },
        { status: 503 },
      );
    }

    const cfg = parseConfigJson(conn.configJson);
    const listId =
      (typeof body.listId === 'string' && body.listId.trim())
        ? body.listId.trim()
        : typeof cfg.listId === 'string' && cfg.listId.trim()
          ? cfg.listId.trim()
          : '';

    if (!listId) {
      return NextResponse.json(
        { error: 'listId is required (pass in body or store on the connection configJson)' },
        { status: 400 },
      );
    }

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
    }

    const dataCenter =
      (typeof cfg.dataCenter === 'string' && cfg.dataCenter.trim())
        ? cfg.dataCenter.trim().toLowerCase()
        : (typeof cfg.dc === 'string' && cfg.dc.trim())
          ? cfg.dc.trim().toLowerCase()
          : extractDataCenter(apiKey);

    if (!dataCenter) {
      return NextResponse.json(
        { error: 'Could not determine Mailchimp data center (key suffix missing or configJson.dataCenter unset)' },
        { status: 400 },
      );
    }

    const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
    const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';

    const mergeFields: Record<string, string> = {};
    if (firstName) mergeFields.FNAME = firstName;
    if (lastName) mergeFields.LNAME = lastName;

    const hash = subscriberHash(email);
    const url = `https://${dataCenter}.api.mailchimp.com/3.0/lists/${encodeURIComponent(listId)}/members/${hash}`;

    const payload: Record<string, unknown> = {
      email_address: email,
      status_if_new: 'subscribed',
      status: 'subscribed',
    };
    if (Object.keys(mergeFields).length > 0) {
      payload.merge_fields = mergeFields;
    }
    if (typeof body.formResponseId === 'string' && body.formResponseId.trim()) {
      // Mailchimp doesn't have a built-in field for this; stash in merge_fields
      // under a generic FORM_ID key if the user has it in their audience, else
      // it's silently ignored by the API.
      payload.merge_fields = { ...(payload.merge_fields as Record<string, string>), FORM_ID: body.formResponseId.trim() };
    }

    const authHeader = `Basic ${Buffer.from(`anystring:${apiKey}`).toString('base64')}`;

    const upstream = await fetch(url, {
      method: 'PUT', // Add-or-update (idempotent)
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const text = await upstream.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      // ignore — raw text surfaced in error
    }

    if (!upstream.ok) {
      const message =
        parsed && typeof parsed === 'object' && 'detail' in (parsed as Record<string, unknown>)
          ? String((parsed as Record<string, unknown>).detail)
          : parsed && typeof parsed === 'object' && 'title' in (parsed as Record<string, unknown>)
            ? String((parsed as Record<string, unknown>).title)
            : `Mailchimp API error ${upstream.status}`;
      return NextResponse.json(
        { error: message, upstreamStatus: upstream.status, raw: text.slice(0, 800) },
        { status: upstream.status >= 400 && upstream.status < 500 ? upstream.status : 502 },
      );
    }

    let memberId = hash;
    let memberStatus = 'subscribed';
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>;
      if (typeof obj.id === 'string') memberId = obj.id;
      if (typeof obj.status === 'string') memberStatus = obj.status;
    }

    return NextResponse.json(
      { success: true, externalId: memberId, status: memberStatus, listId },
      { status: 200 },
    );
  } catch (error) {
    console.error('[Mailchimp action POST] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to perform Mailchimp action';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

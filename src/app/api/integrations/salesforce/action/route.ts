import { NextRequest, NextResponse } from 'next/server';
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
 * POST /api/integrations/salesforce/action
 *
 * Body: {
 *   action: 'create_lead',
 *   firstName?: string,
 *   lastName?: string,
 *   email?: string,
 *   phone?: string,
 *   company?: string,
 *   formResponseId?: string,
 * }
 *
 * Creates a Lead in Salesforce via the v60.0 REST API.
 *
 * Returns { success: true, externalId: <lead_id>, leadId: <lead_id> } on
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
    if (action !== 'create_lead') {
      return NextResponse.json(
        { error: "Unknown action — supported: 'create_lead'" },
        { status: 400 },
      );
    }

    const conn = await db.integrationConnection.findFirst({
      where: { provider: 'salesforce', tenantId, status: 'connected' },
    });

    if (!conn || !conn.accessToken) {
      return NextResponse.json(
        { error: 'Salesforce is not connected. Connect your account in Dashboard > Integrations.' },
        { status: 503 },
      );
    }

    const cfg = parseConfigJson(conn.configJson);
    const instanceUrl =
      (typeof cfg.instanceUrl === 'string' && cfg.instanceUrl.trim())
        ? cfg.instanceUrl.trim().replace(/\/$/, '')
        : (typeof conn.storeUrl === 'string' && conn.storeUrl.trim())
          ? conn.storeUrl.trim().replace(/\/$/, '')
          : '';

    if (!instanceUrl) {
      return NextResponse.json(
        { error: 'Salesforce instanceUrl is missing from the connection configJson' },
        { status: 400 },
      );
    }

    const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
    const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const company = typeof body.company === 'string' ? body.company.trim() : '';

    if (!lastName && !email) {
      return NextResponse.json(
        { error: 'lastName or email is required to create a Salesforce lead' },
        { status: 400 },
      );
    }

    const leadObj: Record<string, string> = {};
    if (firstName) leadObj.FirstName = firstName;
    if (lastName) leadObj.LastName = lastName;
    if (email) leadObj.Email = email;
    if (phone) leadObj.Phone = phone;
    if (company) leadObj.Company = company;
    if (typeof body.formResponseId === 'string' && body.formResponseId.trim()) {
      leadObj.Description = `Submitted via form response ${body.formResponseId.trim()}`;
    }

    const url = `${instanceUrl}/services/data/v60.0/sobjects/Lead/`;

    const upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${conn.accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(leadObj),
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
        parsed && Array.isArray((parsed as Record<string, unknown>[])?.[0])
          ? String(((parsed as Record<string, unknown>[])[0] as Record<string, unknown>).message ?? `Salesforce API error ${upstream.status}`)
          : parsed && typeof parsed === 'object' && 'message' in (parsed as Record<string, unknown>)
            ? String((parsed as Record<string, unknown>).message)
            : `Salesforce API error ${upstream.status}`;
      return NextResponse.json(
        { error: message, upstreamStatus: upstream.status, raw: text.slice(0, 800) },
        { status: upstream.status >= 400 && upstream.status < 500 ? upstream.status : 502 },
      );
    }

    // Salesforce returns { id: '00Q...', success: true, errors: [] }
    let leadId = '';
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>;
      if (typeof obj.id === 'string') leadId = obj.id;
    }

    if (!leadId) {
      return NextResponse.json(
        { error: 'Salesforce accepted the request but no lead id was returned', raw: text.slice(0, 800) },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { success: true, externalId: leadId, leadId },
      { status: 201 },
    );
  } catch (error) {
    console.error('[Salesforce action POST] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to perform Salesforce action';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * Safe JSON-object parse for the configJson column on IntegrationConnection.
 */
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
 * POST /api/integrations/zoho/action
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
 * Looks up the tenant's `zoho_crm` IntegrationConnection and creates a Lead
 * in Zoho CRM via the v8 API.
 *
 * Returns { success: true, externalId: <lead_id>, leadId: <lead_id> } on
 * success. Returns 503 when no connected integration is found, and 4xx/5xx
 * for upstream Zoho errors.
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
      where: { provider: 'zoho_crm', tenantId, status: 'connected' },
    });

    if (!conn || !conn.accessToken) {
      return NextResponse.json(
        { error: 'Zoho CRM is not connected. Connect your account in Dashboard > Integrations.' },
        { status: 503 },
      );
    }

    const cfg = parseConfigJson(conn.configJson);
    const apiDomain =
      typeof cfg.apiDomain === 'string' && cfg.apiDomain.trim()
        ? cfg.apiDomain.replace(/\/$/, '')
        : 'https://www.zohoapis.com';
    const isSandbox = cfg.isSandbox === true || cfg.sandbox === true;
    const base = isSandbox
      ? 'https://sandbox.zohoapis.com'
      : apiDomain;
    const url = `${base}/crm/v8/Leads`;

    const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
    const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const company = typeof body.company === 'string' ? body.company.trim() : '';

    if (!lastName && !email) {
      return NextResponse.json(
        { error: 'lastName or email is required to create a Zoho lead' },
        { status: 400 },
      );
    }

    const data: Record<string, string> = {};
    if (firstName) data.First_Name = firstName;
    if (lastName) data.Last_Name = lastName;
    if (email) data.Email = email;
    if (phone) data.Phone = phone;
    if (company) data.Company = company;
    if (typeof body.formResponseId === 'string' && body.formResponseId.trim()) {
      data.Description = `Submitted via form response ${body.formResponseId.trim()}`;
    }

    const upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${conn.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: [data] }),
    });

    const text = await upstream.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      // keep parsed null; surface raw text below
    }

    if (!upstream.ok) {
      const message =
        parsed && typeof parsed === 'object' && 'message' in (parsed as Record<string, unknown>)
          ? String((parsed as Record<string, unknown>).message)
          : `Zoho API error ${upstream.status}`;
      return NextResponse.json(
        { error: message, upstreamStatus: upstream.status, raw: text.slice(0, 800) },
        { status: upstream.status >= 400 && upstream.status < 500 ? upstream.status : 502 },
      );
    }

    // Zoho returns { data: [{ code: 'SUCCESS', details: { id } }] }
    let leadId = '';
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>;
      const arr = Array.isArray(obj.data) ? obj.data : null;
      const first = arr && arr.length > 0 ? (arr[0] as Record<string, unknown>) : null;
      const details = first && typeof first.details === 'object'
        ? (first.details as Record<string, unknown>)
        : null;
      if (details && typeof details.id === 'string') {
        leadId = details.id;
      } else if (first && typeof first.Id === 'string') {
        leadId = first.Id;
      }
    }

    if (!leadId) {
      return NextResponse.json(
        { error: 'Zoho accepted the request but no lead id was returned', raw: text.slice(0, 800) },
        { status: 502 },
      );
    }

    return NextResponse.json(
      { success: true, externalId: leadId, leadId },
      { status: 201 },
    );
  } catch (error) {
    console.error('[Zoho action POST] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to perform Zoho action';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

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

/** Build the spreadsheet URL from a spreadsheetId + the (optional) sheet name. */
function buildSheetUrl(spreadsheetId: string, sheetName?: string): string {
  const base = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  if (sheetName) {
    // Google Sheets accepts `?gid=` (numeric) or `#gid=` for sheet tabs. Since
    // we only have the sheet name (not gid), `#gid=<name>` is best-effort but
    // not always resolvable. `usp=sharing` opens the editor cleanly.
    return `${base}#gid=${encodeURIComponent(sheetName)}`;
  }
  return `${base}?usp=sharing`;
}

/**
 * POST /api/integrations/google-sheets/action
 *
 * Body: {
 *   action: 'append_row',
 *   spreadsheetId?: string,   // falls back to configJson.spreadsheetId
 *   sheetName?: string,       // falls back to configJson.sheetName or 'Sheet1'
 *   values: string[],
 *   formResponseId?: string,
 * }
 *
 * Appends a single row to a Google Sheet via the v4 API.
 *
 * Returns { success: true, externalId: <updated_range>, spreadsheetUrl } on
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
    if (action !== 'append_row') {
      return NextResponse.json(
        { error: "Unknown action — supported: 'append_row'" },
        { status: 400 },
      );
    }

    const conn = await db.integrationConnection.findFirst({
      where: { provider: 'google_sheets', tenantId, status: 'connected' },
    });

    if (!conn || !conn.accessToken) {
      return NextResponse.json(
        { error: 'Google Sheets is not connected. Connect your account in Dashboard > Integrations.' },
        { status: 503 },
      );
    }

    const cfg = parseConfigJson(conn.configJson);
    const spreadsheetId =
      (typeof body.spreadsheetId === 'string' && body.spreadsheetId.trim())
        ? body.spreadsheetId.trim()
        : typeof cfg.spreadsheetId === 'string'
          ? cfg.spreadsheetId.trim()
          : '';

    if (!spreadsheetId) {
      return NextResponse.json(
        { error: 'spreadsheetId is required (pass in body or store on the connection configJson)' },
        { status: 400 },
      );
    }

    const sheetName =
      (typeof body.sheetName === 'string' && body.sheetName.trim())
        ? body.sheetName.trim()
        : typeof cfg.sheetName === 'string' && cfg.sheetName.trim()
          ? cfg.sheetName.trim()
          : 'Sheet1';

    const valuesRaw = Array.isArray(body.values) ? body.values : [];
    const row = valuesRaw.map((v) => (typeof v === 'string' ? v : v == null ? '' : String(v)));
    if (row.length === 0) {
      return NextResponse.json(
        { error: 'values array must contain at least one cell' },
        { status: 400 },
      );
    }

    // Google Sheets API: append to the next empty row of `A:A` (the whole col)
    // — the API auto-extends the range and returns the actual range written.
    const rangeParam = `${encodeURIComponent(sheetName)}!A:A`;
    const url =
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}` +
      `/values/${rangeParam}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;

    const upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${conn.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: [row] }),
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
        parsed && typeof parsed === 'object' && 'error' in (parsed as Record<string, unknown>)
          ? String(((parsed as Record<string, unknown>).error as Record<string, unknown>)?.message ?? `Google Sheets API error ${upstream.status}`)
          : `Google Sheets API error ${upstream.status}`;
      return NextResponse.json(
        { error: message, upstreamStatus: upstream.status, raw: text.slice(0, 800) },
        { status: upstream.status >= 400 && upstream.status < 500 ? upstream.status : 502 },
      );
    }

    // Response shape: { updates: { updatedRange, updatedRows, ... }, spreadsheetId }
    let updatedRange = '';
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>;
      const updates = typeof obj.updates === 'object' ? (obj.updates as Record<string, unknown>) : null;
      if (updates && typeof updates.updatedRange === 'string') {
        updatedRange = updates.updatedRange;
      } else if (typeof obj.updatedRange === 'string') {
        updatedRange = obj.updatedRange;
      }
    }

    if (!updatedRange) {
      return NextResponse.json(
        { error: 'Google Sheets accepted the request but no updated range was returned', raw: text.slice(0, 800) },
        { status: 502 },
      );
    }

    const spreadsheetUrl = buildSheetUrl(spreadsheetId, sheetName);

    return NextResponse.json(
      { success: true, externalId: updatedRange, spreadsheetUrl },
      { status: 201 },
    );
  } catch (error) {
    console.error('[Google Sheets action POST] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to perform Google Sheets action';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

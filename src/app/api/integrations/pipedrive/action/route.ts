import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * POST /api/integrations/pipedrive/action
 *
 * Real Pipedrive integration backed by the IntegrationConnection record
 * (provider = 'pipedrive', status = 'connected') for the current tenant.
 *
 * Body:
 *   {
 *     action: 'create_deal',
 *     title:         string,         // deal title (required)
 *     value?:        number | string,
 *     stageId?:      string,         // pipeline stage id (optional)
 *     personName?:   string,         // if provided, a Person is created first and linked
 *     personEmail?:  string,
 *     formResponseId?: string,       // accepted for forward-compat
 *   }
 *
 * Returns:
 *   - 200: { success: true, externalId: <deal_id>, dealUrl }
 *   - 401: not authenticated
 *   - 503: no connected Pipedrive account
 *   - 400: invalid request (missing title)
 *   - 502: Pipedrive API returned a non-OK response
 *
 * No externalId is ever fabricated — on any failure path we return an error
 * rather than a fake deal id.
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

    // ── 1. Resolve the connected Pipedrive account for this tenant ─────────
    const conn = await db.integrationConnection.findFirst({
      where: { provider: 'pipedrive', tenantId, status: 'connected' },
    });
    if (!conn || !conn.accessToken) {
      return NextResponse.json(
        {
          success: false,
          error:
            'No Pipedrive account connected. Connect Pipedrive in Dashboard > Integrations.',
        },
        { status: 503 }
      );
    }

    const apiToken = conn.accessToken.trim();

    // configJson.companyDomain = subdomain (e.g. "mycompany" → "mycompany.pipedrive.com")
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
    const configDomain =
      typeof configJson.companyDomain === 'string' && configJson.companyDomain.trim()
        ? configJson.companyDomain.trim()
        : typeof configJson.subdomain === 'string' && configJson.subdomain.trim()
          ? configJson.subdomain.trim()
          : '';
    const apiBase = configDomain
      ? `https://${configDomain}.pipedrive.com/api/v1`
      : 'https://api.pipedrive.com/api/v1';

    // ── 2. Parse the request body ─────────────────────────────────────────
    const body = (await request.json().catch(() => ({}))) as {
      action?: unknown;
      title?: unknown;
      value?: unknown;
      stageId?: unknown;
      personName?: unknown;
      personEmail?: unknown;
      formResponseId?: unknown;
    };

    const action = typeof body.action === 'string' ? body.action : '';
    if (action !== 'create_deal') {
      return NextResponse.json(
        { success: false, error: "`action` must be 'create_deal'" },
        { status: 400 }
      );
    }

    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) {
      return NextResponse.json(
        { success: false, error: "`title` is required to create a Pipedrive deal" },
        { status: 400 }
      );
    }

    const stageId =
      typeof body.stageId === 'string' && body.stageId.trim()
        ? body.stageId.trim()
        : '';
    const personName =
      typeof body.personName === 'string' && body.personName.trim()
        ? body.personName.trim()
        : '';
    const personEmail =
      typeof body.personEmail === 'string' && body.personEmail.trim()
        ? body.personEmail.trim()
        : '';

    const valueNum =
      typeof body.value === 'number'
        ? body.value
        : typeof body.value === 'string' && body.value.trim()
          ? Number(body.value)
          : NaN;

    // ── 3. (Optional) Create a Person first so we can link the deal ───────
    let personId: string | undefined;
    if (personName || personEmail) {
      const personBody: Record<string, unknown> = { name: personName || personEmail };
      if (personEmail) personBody.email = [{ value: personEmail, primary: true, label: 'Work' }];

      const personUrl = `${apiBase}/persons?api_token=${encodeURIComponent(apiToken)}`;
      const personRes = await fetch(personUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(personBody),
      });
      const personJson = (await personRes.json().catch(() => ({}))) as {
        success?: boolean;
        data?: { id?: number };
        error?: string;
      };
      if (personRes.ok && personJson.success && personJson.data?.id) {
        personId = String(personJson.data.id);
      }
      // If person creation fails, we DON'T abort — the deal can still be created
      // without a linked person (Pipedrive accepts title-only deals).
    }

    // ── 4. Create the deal ────────────────────────────────────────────────
    const dealBody: Record<string, unknown> = { title };
    if (Number.isFinite(valueNum)) dealBody.value = valueNum;
    if (stageId) dealBody.stage_id = stageId;
    if (personId) dealBody.person_id = personId;

    const dealUrl = `${apiBase}/deals?api_token=${encodeURIComponent(apiToken)}`;
    const dealRes = await fetch(dealUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dealBody),
    });
    const dealJson = (await dealRes.json().catch(() => ({}))) as {
      success?: boolean;
      data?: { id?: number };
      error?: string;
    };

    if (!dealRes.ok || !dealJson.success || !dealJson.data?.id) {
      return NextResponse.json(
        {
          success: false,
          error: `Pipedrive create deal failed: ${dealJson.error || dealRes.statusText}`,
        },
        { status: 502 }
      );
    }

    const dealId = String(dealJson.data.id);
    const dealLink = configDomain
      ? `https://${configDomain}.pipedrive.com/deal/${dealId}`
      : `https://app.pipedrive.com/deal/${dealId}`;

    return NextResponse.json({
      success: true,
      externalId: dealId,
      dealUrl: dealLink,
    });
  } catch (error) {
    console.error('[/api/integrations/pipedrive/action] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Pipedrive action failed',
      },
      { status: 500 }
    );
  }
}

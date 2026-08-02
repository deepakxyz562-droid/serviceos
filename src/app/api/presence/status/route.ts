import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { isTenantOnline } from '@/lib/presence';

/**
 * Tenant online-status endpoint.
 *
 * Used by:
 *   - The visitor chat widget (unauthenticated) to render a "We'll reply
 *     shortly" banner when the tenant is offline. The visitor's chat session
 *     carries the tenantId, so they pass it as a query param.
 *   - The tenant's own inbox (authenticated) to render an "Agents online"
 *     badge and refresh on socket `presence-update` events.
 *
 * Auth model:
 *   - If the caller is authenticated AND has a tenantId, use that (the
 *     tenant's own inbox). The `tenantId` query param is IGNORED in this
 *     case so a logged-in user cannot probe other tenants' presence.
 *   - If the caller is unauthenticated, fall back to the `tenantId` query
 *     param (the public widget path).
 *   - If neither is available, return 400.
 *
 * Response: `{ online: boolean, checkedAt: string (ISO), tenantId: string }`
 *
 * Public + cheap: a single indexed `findFirst` on AgentMonitor. The
 * `respectBusinessHours` query param (default false) makes the check also
 * return false outside the tenant's configured business hours — used by
 * the auto-reply trigger so a 2am message always gets an auto-reply even
 * if a tenant user happens to be logged in.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const respectBusinessHours = params.get('respectBusinessHours') === 'true';

  // 1. Authenticated caller — use their own tenantId (ignore the query param
  //    to prevent cross-tenant probing).
  let tenantId: string | null = null;
  try {
    const user = await getAuthUser();
    if (user?.tenantId) {
      tenantId = user.tenantId;
    }
  } catch {
    // Non-fatal — fall through to the public path.
  }

  // 2. Public caller — use the query param.
  if (!tenantId) {
    const queryTenantId = params.get('tenantId');
    if (typeof queryTenantId === 'string' && queryTenantId.length > 0) {
      tenantId = queryTenantId;
    }
  }

  if (!tenantId) {
    return NextResponse.json(
      {
        error: 'Missing tenantId. Either authenticate or pass ?tenantId=.',
        online: false,
      },
      { status: 400 },
    );
  }

  const online = await isTenantOnline(tenantId, { respectBusinessHours });

  return NextResponse.json(
    {
      online,
      checkedAt: new Date().toISOString(),
      tenantId,
    },
    {
      status: 200,
      headers: {
        // Cache for 10s on the client and on the Caddy gateway — short
        // enough that presence flips to "online" within a heartbeat cycle,
        // long enough to absorb a burst of polling from the inbox view.
        'Cache-Control': 'public, max-age=10, s-maxage=10',
      },
    },
  );
}

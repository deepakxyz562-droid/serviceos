import { NextRequest, NextResponse } from 'next/server';
import {
  COOKIE_OPTIONS,
  getAuthUser,
  getRefreshSessionMetadata,
  REFRESH_COOKIE_OPTIONS,
} from '@/lib/auth';
import {
  createBgosBusinessWorkspace,
  issueSessionForSwitchedWorkspace,
  listUserBgosWorkspaces,
  switchUserBgosWorkspace,
} from '@/lib/bgos-workspaces';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.id || user.role === 'customer') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const workspaces = await listUserBgosWorkspaces(user.id, user.workspaceId, user.tenantId);
    return NextResponse.json(
      {
        workspaces,
        currentWorkspaceId: user.workspaceId || workspaces.find((w) => w.isCurrent)?.workspaceId || null,
        currentTenantId: user.tenantId || workspaces.find((w) => w.isCurrent)?.tenantId || null,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    console.error('[api/bgos/workspaces GET]', err);
    return NextResponse.json({ error: 'Failed to load business workspaces' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.id || user.role === 'customer') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 });
    }

    const businessName =
      typeof body.businessName === 'string'
        ? body.businessName.trim()
        : typeof body.name === 'string'
          ? body.name.trim()
          : '';
    if (!businessName) {
      return NextResponse.json({ error: 'Business name is required' }, { status: 400 });
    }

    const result = await createBgosBusinessWorkspace({
      userId: user.id,
      businessName,
      profileId: typeof body.profileId === 'string' ? body.profileId.trim() || null : null,
      category: typeof body.category === 'string' ? body.category.trim() || null : null,
      phone: typeof body.phone === 'string' ? body.phone.trim() || null : null,
      address: typeof body.address === 'string' ? body.address.trim() || null : null,
      city: typeof body.city === 'string' ? body.city.trim() || null : null,
      state: typeof body.state === 'string' ? body.state.trim() || null : null,
      country: typeof body.country === 'string' ? body.country.trim() || null : null,
      currency: typeof body.currency === 'string' ? body.currency.trim() || null : null,
      website: typeof body.website === 'string' ? body.website.trim() || null : null,
      services: Array.isArray(body.services)
        ? body.services.filter((s: unknown): s is string => typeof s === 'string' && s.trim().length > 0)
        : undefined,
      activateForUser: body.activate !== false,
    });

    const targetWorkspaceId = result.workspace.workspaceId;
    const switched =
      result.switched || (await switchUserBgosWorkspace(user.id, targetWorkspaceId));
    const metadata = await getRefreshSessionMetadata(request);
    const session = switched
      ? await issueSessionForSwitchedWorkspace(switched.authUser, metadata)
      : null;

    const workspaces = await listUserBgosWorkspaces(
      user.id,
      switched?.workspace.id || targetWorkspaceId,
      switched?.tenant.id || result.workspace.tenantId,
    );

    const response = NextResponse.json(
      {
        success: true,
        alreadyExisted: result.alreadyExisted,
        workspace: result.workspace,
        workspaces,
        ...(session || {}),
      },
      { status: result.alreadyExisted ? 200 : 201, headers: { 'Cache-Control': 'no-store' } },
    );

    if (session) {
      response.cookies.set({ ...COOKIE_OPTIONS, value: session.accessToken });
      response.cookies.set({ ...REFRESH_COOKIE_OPTIONS, value: session.refreshToken });
    }

    return response;
  } catch (err) {
    console.error('[api/bgos/workspaces POST]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create business workspace' },
      { status: 500 },
    );
  }
}

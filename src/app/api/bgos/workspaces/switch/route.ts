import { NextRequest, NextResponse } from 'next/server';
import {
  COOKIE_OPTIONS,
  getAuthUser,
  getRefreshSessionMetadata,
  REFRESH_COOKIE_OPTIONS,
} from '@/lib/auth';
import {
  issueSessionForSwitchedWorkspace,
  listUserBgosWorkspaces,
  switchUserBgosWorkspace,
} from '@/lib/bgos-workspaces';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.id || user.role === 'customer') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const workspaceId = typeof body?.workspaceId === 'string' ? body.workspaceId.trim() : '';
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId is required' }, { status: 400 });
    }

    const switched = await switchUserBgosWorkspace(user.id, workspaceId);
    if (!switched) {
      return NextResponse.json(
        { error: 'Workspace not found or access denied' },
        { status: 404 },
      );
    }

    const metadata = await getRefreshSessionMetadata(request);
    const session = await issueSessionForSwitchedWorkspace(switched.authUser, metadata);
    const workspaces = await listUserBgosWorkspaces(
      user.id,
      switched.workspace.id,
      switched.tenant.id,
    );

    const response = NextResponse.json(
      {
        success: true,
        workspace: workspaces.find((w) => w.workspaceId === switched.workspace.id) || null,
        workspaces,
        ...session,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );

    response.cookies.set({ ...COOKIE_OPTIONS, value: session.accessToken });
    response.cookies.set({ ...REFRESH_COOKIE_OPTIONS, value: session.refreshToken });
    return response;
  } catch (err) {
    console.error('[api/bgos/workspaces/switch POST]', err);
    return NextResponse.json({ error: 'Failed to switch business workspace' }, { status: 500 });
  }
}

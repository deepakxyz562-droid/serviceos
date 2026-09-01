import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// ─── Credential masking helpers ──────────────────────────────────────────
// Keep the existing masking behavior — sensitive fields (password, secret,
// key, token) are fully redacted, short strings become '••••', longer
// strings are partially masked. This is the *display* layer; the underlying
// `encryptedData` is never exposed in plaintext by this endpoint.

function maskCredentialData(data: Record<string, any>): Record<string, any> {
  const masked: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string' && value.length > 0) {
      if (
        key.toLowerCase().includes('password') ||
        key.toLowerCase().includes('secret') ||
        key.toLowerCase().includes('key') ||
        key.toLowerCase().includes('token')
      ) {
        masked[key] = '••••••••';
      } else if (value.length <= 4) {
        masked[key] = '••••';
      } else {
        masked[key] = value.slice(0, 2) + '••••' + value.slice(-2);
      }
    } else {
      masked[key] = value;
    }
  }
  return masked;
}

function safeJsonParse(str: string | null, fallback: unknown = {}) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

// ─── GET /api/credentials/[id] ────────────────────────────────────────────
//
// Security-3 IDOR fix:
//   1. Require authentication.
//   2. Tenant isolation: the Credential model has no `tenantId` field —
//      it is scoped to a Workspace. So we filter by `workspaceId`. Super-
//      admins bypass. The existing masking is preserved on top.

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ── Security-3 IDOR fix: require authentication + workspace isolation ──
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Workspace-scoped lookup: super-admins can access any workspace; everyone
    // else is constrained to their own workspace. The Credential model uses
    // workspaceId (not tenantId) for ownership.
    const isSuperAdmin =
      user.isSuperAdmin || user.role === 'superadmin' || user.role === 'super_admin';
    const workspaceFilter = isSuperAdmin ? {} : { workspaceId: user.workspaceId };

    const credential = await db.credential.findFirst({
      where: { id, ...workspaceFilter },
    });

    if (!credential) {
      return NextResponse.json(
        { error: 'Credential not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: credential.id,
      name: credential.name,
      type: credential.type,
      data: maskCredentialData(safeJsonParse(credential.encryptedData, {})),
      workspaceId: credential.workspaceId,
      userId: credential.userId,
      createdAt: credential.createdAt,
      updatedAt: credential.updatedAt,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch credential';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── PUT /api/credentials/[id] ────────────────────────────────────────────
//
// Security-3 IDOR fix:
//   1. Require authentication + workspace isolation.
//   2. REMOVED body.workspaceId from update data — clients cannot reassign
//      credentials to another workspace. (Previously line 87 did this.)
//   3. Use updateMany with the workspace filter and check `count === 0` → 404.

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ── Security-3 IDOR fix: require authentication + workspace isolation ──
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const isSuperAdmin =
      user.isSuperAdmin || user.role === 'superadmin' || user.role === 'super_admin';
    const workspaceFilter = isSuperAdmin ? {} : { workspaceId: user.workspaceId };

    // Verify the credential exists AND belongs to the user's workspace.
    const existing = await db.credential.findFirst({
      where: { id, ...workspaceFilter },
    });
    if (!existing) {
      return NextResponse.json(
        { error: 'Credential not found' },
        { status: 404 }
      );
    }

    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.type !== undefined) data.type = body.type;
    if (body.data !== undefined) data.encryptedData = JSON.stringify(body.data);
    // SECURITY: body.workspaceId is intentionally NOT included here —
    // clients must not control ownership of credentials. (Previously
    // line 87 allowed `body.workspaceId` to reassign the credential — REMOVED.)

    // Use updateMany with the workspace scope so a race-condition ID swap
    // can't mutate a credential that was just moved to another workspace.
    const updateResult = await db.credential.updateMany({
      where: { id, ...workspaceFilter },
      data,
    });

    if (updateResult.count === 0) {
      return NextResponse.json(
        { error: 'Credential not found or access denied' },
        { status: 404 }
      );
    }

    // Fetch the updated credential to return (workspace-scoped for safety)
    const updated = await db.credential.findFirst({
      where: { id, ...workspaceFilter },
    });

    return NextResponse.json({
      id: updated!.id,
      name: updated!.name,
      type: updated!.type,
      data: maskCredentialData(safeJsonParse(updated!.encryptedData, {})),
      workspaceId: updated!.workspaceId,
      userId: updated!.userId,
      createdAt: updated!.createdAt,
      updatedAt: updated!.updatedAt,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update credential';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── DELETE /api/credentials/[id] ─────────────────────────────────────────
//
// Security-3 IDOR fix: require authentication + workspace isolation.
// Use deleteMany with the workspace filter and check `count === 0` → 404.

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ── Security-3 IDOR fix: require authentication + workspace isolation ──
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const isSuperAdmin =
      user.isSuperAdmin || user.role === 'superadmin' || user.role === 'super_admin';
    const workspaceFilter = isSuperAdmin ? {} : { workspaceId: user.workspaceId };

    // Workspace-scoped delete: use deleteMany with workspaceId in WHERE.
    const deleteResult = await db.credential.deleteMany({
      where: { id, ...workspaceFilter },
    });

    if (deleteResult.count === 0) {
      return NextResponse.json(
        { error: 'Credential not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete credential';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

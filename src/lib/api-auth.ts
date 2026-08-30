/**
 * api-auth.ts
 * ===========
 * Shared API authentication + error helpers.
 *
 * This module exists to kill the two biggest API-layer inconsistencies
 * surfaced in the Wave 0 security audit:
 *
 *   1. Every route hand-rolls `if (!user) return NextResponse.json({ error:
 *      '...' }, { status: 401 })` with THREE different error strings
 *      ('Authentication required', 'Unauthorized', 'Not authenticated').
 *   2. There is no shared `apiError()` — every route returns ad-hoc
 *      `{ error: '...' }` payloads with bespoke status codes.
 *
 * Standardising here means a future security review has ONE place to audit,
 * and the response contract is consistent for every client.
 *
 * Usage:
 *
 *   import { requireAuth, apiError } from '@/lib/api-auth';
 *
 *   export async function GET(request: NextRequest) {
 *     const auth = await requireAuth();
 *     if (!auth.ok) return auth.response;          // 401, standard shape
 *     const user = auth.user;
 *     // ... business logic, scoped to user.tenantId ...
 *   }
 *
 *   if (somethingWrong) {
 *     return apiError(400, 'Name is required');
 *   }
 */

import { NextResponse } from 'next/server';
import { getAuthUser, type AuthUser } from '@/lib/auth';

// ── Discriminated union so callers get a type-safe narrowing ────────────────
export type AuthResult =
  | { ok: true; user: AuthUser }
  | { ok: false; response: NextResponse };

/**
 * Enforce authentication on an API route. Returns a discriminated union:
 *
 *   - `{ ok: true, user }`           → caller proceeds, use `user.tenantId`
 *   - `{ ok: false, response }`      → caller returns `response` (401)
 *
 * This is the single, authoritative 401 path for the whole API layer.
 * The error payload shape `{ error, code }` is stable so the client can
 * branch on `code === 'UNAUTHENTICATED'` if it ever needs to.
 */
export async function requireAuth(): Promise<AuthResult> {
  const user = await getAuthUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHENTICATED' },
        { status: 401 }
      ),
    };
  }
  return { ok: true, user };
}

/**
 * Standard error response. Every API route should use this instead of
 * hand-rolling `NextResponse.json({ error: '...' }, { status: N })`.
 *
 *   return apiError(400, 'Name is required');
 *   return apiError(403, 'Not allowed', 'FORBIDDEN');
 *   return apiError(404, 'Job not found', 'NOT_FOUND');
 */
export function apiError(
  status: number,
  message: string,
  code?: string
): NextResponse {
  return NextResponse.json(
    code ? { error: message, code } : { error: message },
    { status }
  );
}

/**
 * Resolve the effective tenantId for a request, NEVER trusting a
 * client-supplied value.
 *
 * - Authenticated user → their JWT `tenantId` (super-admins may override
 *   via the `tenantId` query param, since super-admins operate across
 *   tenants by design).
 * - Unauthenticated → null (caller must 401 before using this).
 *
 * This closes the cross-tenant leak where routes fell back to
 * `?tenantId=` from the query string for anonymous callers.
 */
export function resolveTenantId(
  user: AuthUser,
  queryTenantId?: string | null
): string | null {
  // Super-admins may target any tenant (the superadmin console does this).
  if (user.isSuperAdmin || user.role === 'superadmin' || user.role === 'super_admin') {
    return queryTenantId || user.tenantId || null;
  }
  // Everyone else: their own tenant, full stop. Query param is ignored.
  return user.tenantId || null;
}

/**
 * Resolve the effective workspaceId, NEVER trusting a client-supplied value
 * for non-super-admins.
 *
 * Same trust model as resolveTenantId: super-admins may pass one, everyone
 * else is pinned to their own workspace from the JWT.
 */
export function resolveWorkspaceId(
  user: AuthUser,
  queryWorkspaceId?: string | null
): string | null {
  if (user.isSuperAdmin || user.role === 'superadmin' || user.role === 'super_admin') {
    return queryWorkspaceId || user.workspaceId || null;
  }
  return user.workspaceId || null;
}

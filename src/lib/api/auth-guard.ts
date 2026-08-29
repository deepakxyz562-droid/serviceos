import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, AuthUser } from '@/lib/auth';
import { requireCrmTenant } from '@/lib/require-crm-tenant';

export interface GuardedContext {
  user: AuthUser;
  tenantId: string;
}

/**
 * Standardized API Route Guard
 * Enforces CRM tenant validation, authentication, and tenant context binding.
 */
export async function requireAuthGuard(
  request: NextRequest,
  options?: { requireTenant?: boolean }
): Promise<Response | GuardedContext> {
  const crmGuard = await requireCrmTenant(request);
  if (crmGuard) return crmGuard;

  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const requestedTenantId = searchParams.get('tenantId');
  const tenantId = user.role === 'superadmin' && requestedTenantId ? requestedTenantId : user.tenantId;

  if (options?.requireTenant !== false && !tenantId) {
    return NextResponse.json(
      { error: 'Tenant context required' },
      { status: 400 }
    );
  }

  return { user, tenantId: tenantId || '' };
}

export function apiError(message: string, status = 500, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

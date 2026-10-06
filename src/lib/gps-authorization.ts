import type { AuthUser } from '@/lib/auth';

export interface GpsEmployeeScope {
  workspaceId: string | null;
  userId: string | null;
}

export async function canAdminAccessGpsEmployee(
  authUser: Pick<AuthUser, 'isSuperAdmin' | 'tenantId' | 'workspaceId'>,
  employee: GpsEmployeeScope,
  resolveEmployeeTenant: (workspaceId: string | null, userId: string | null) => Promise<string | null>,
): Promise<boolean> {
  if (authUser.isSuperAdmin) return true;

  if (authUser.workspaceId) {
    return employee.workspaceId === authUser.workspaceId;
  }

  if (authUser.tenantId) {
    const employeeTenantId = await resolveEmployeeTenant(employee.workspaceId, employee.userId);
    return employeeTenantId === authUser.tenantId;
  }

  return false;
}

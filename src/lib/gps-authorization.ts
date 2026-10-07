import type { AuthUser } from '@/lib/auth';
import { db } from '@/lib/db';

export interface GpsEmployeeScope {
  workspaceId: string | null;
  userId: string | null;
}

export function canUserAccessOwnGpsEmployee(
  targetEmployeeId: string,
  ownEmployeeId: string | null | undefined,
): boolean {
  return Boolean(ownEmployeeId && targetEmployeeId === ownEmployeeId);
}

export async function resolveGpsEmployeeTenant(
  workspaceId: string | null,
  userId: string | null,
): Promise<string | null> {
  if (workspaceId) {
    const workspace = await db.workspace.findUnique({
      where: { id: workspaceId },
      select: { tenantId: true },
    });
    if (workspace?.tenantId) return workspace.tenantId;
  }

  if (userId) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { tenantId: true },
    });
    if (user?.tenantId) return user.tenantId;
  }

  return null;
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

import { db } from '@/lib/db';
import { getAuthUser, type AuthUser } from '@/lib/auth';

/**
 * Check if the current request is from a super admin.
 * Uses JWT isSuperAdmin first, then falls back to checking
 * the user's isSuperAdmin flag in the database.
 */
export async function isSuperAdminRequest(): Promise<boolean> {
  const authUser = await getAuthUser();
  if (!authUser) return false;
  // Check JWT isSuperAdmin flag first (fast path)
  if (authUser.isSuperAdmin) return true;
  // Also check role string for backward compatibility
  if (authUser.role === 'superadmin' || authUser.role === 'super_admin') return true;
  // Fallback: check isSuperAdmin flag from DB in case JWT was issued before the flag was added
  try {
    const user = await db.user.findUnique({ where: { id: authUser.id }, select: { isSuperAdmin: true, role: true } });
    return user?.isSuperAdmin === true;
  } catch {
    return authUser.role === 'admin' && !authUser.tenantId;
  }
}

/**
 * Check if an AuthUser object represents a super admin.
 * Used for client-side checks (sidebar visibility, etc.)
 */
export function isSuperAdminUser(user: AuthUser | null): boolean {
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  if (user.role === 'superadmin' || user.role === 'super_admin') return true;
  // Legacy fallback: admin with no tenantId is likely superadmin
  if (user.role === 'admin' && !user.tenantId) return true;
  return false;
}

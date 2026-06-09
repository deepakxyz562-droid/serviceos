import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * Check if the current request is from a super admin.
 * Uses JWT isSuperAdmin first, then falls back to checking
 * the user's role in the database (handles cases where the
 * Prisma client cache doesn't include the isSuperAdmin field).
 */
export async function isSuperAdminRequest(): Promise<boolean> {
  const authUser = await getAuthUser();
  if (!authUser) return false;
  if (authUser.isSuperAdmin) return true;
  // Fallback: check role from DB in case JWT has stale isSuperAdmin
  // or Prisma client doesn't recognize the isSuperAdmin field
  try {
    const user = await db.user.findUnique({ where: { id: authUser.id }, select: { role: true } });
    return user?.role === 'admin';
  } catch {
    return authUser.role === 'admin';
  }
}

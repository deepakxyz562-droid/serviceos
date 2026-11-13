import { db } from '@/lib/db';
import { getQuoteFlowUser } from '@/lib/quote-flow-session';
import { resolveStaffSession, type ResolvedStaffSession } from '@/lib/commerce/staff-helper';
import { getCachedSessionBusiness, setCachedSessionBusiness } from '@/lib/commerce/session-cache';

export async function resolveStaffSessionFromRequest(req: Request): Promise<ResolvedStaffSession> {
  const user = await getQuoteFlowUser(req);
  if (!user) throw new Error('UNAUTHORIZED');

  // Fast-path: in-memory business cache hit (<1ms, 0 Supabase roundtrips)
  const cached = getCachedSessionBusiness(user.id);
  if (cached?.business) {
    return cached as ResolvedStaffSession;
  }

  const resolved = await resolveStaffSession(user);
  if (!resolved?.business) {
    // If not found in staff session, check if user is a legacy owner/admin by ownerId or tenantId
    let business = await db.aiBusiness.findUnique({ where: { ownerId: user.id } });
    if (!business && user.tenantId) {
      business = await db.aiBusiness.findFirst({ where: { tenantId: user.tenantId } });
    }
    if (!business) throw new Error('BUSINESS_NOT_FOUND');
    const ownerSession: ResolvedStaffSession = {
      business,
      role: 'owner',
      permissions: {
        canCreateInvoices: true,
        canPosBilling: true,
        canManageProducts: true,
        canViewReports: true,
        canManageKhata: true,
        canManageSettings: true,
        canManageStaff: true,
      },
      isOwner: true,
    };
    setCachedSessionBusiness(user.id, ownerSession);
    return ownerSession;
  }

  setCachedSessionBusiness(user.id, resolved);
  return resolved;
}

export async function ownerBusiness(
  req: Request,
  requiredPermission?: keyof ResolvedStaffSession['permissions']
) {
  const session = await resolveStaffSessionFromRequest(req);
  if (requiredPermission && !session.permissions[requiredPermission]) {
    throw new Error('FORBIDDEN_INSUFFICIENT_ROLE');
  }
  return session.business;
}

export async function requireStaffPermission(
  req: Request,
  requiredPermission: keyof ResolvedStaffSession['permissions']
): Promise<ResolvedStaffSession> {
  const session = await resolveStaffSessionFromRequest(req);
  if (!session.permissions[requiredPermission]) {
    throw new Error('FORBIDDEN_INSUFFICIENT_ROLE');
  }
  return session;
}
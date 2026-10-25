import { db } from '@/lib/db';
import { getQuoteFlowUser } from '@/lib/quote-flow-session';
import { resolveStaffSession, type ResolvedStaffSession } from '@/lib/commerce/staff-helper';

export async function resolveStaffSessionFromRequest(req: Request): Promise<ResolvedStaffSession> {
  const user = await getQuoteFlowUser(req);
  if (!user) throw new Error('UNAUTHORIZED');

  const resolved = await resolveStaffSession(user);
  if (!resolved?.business) {
    // If not found in staff session, check if user is a legacy owner/admin by ownerId or tenantId
    let business = await db.aiBusiness.findUnique({ where: { ownerId: user.id } });
    if (!business && user.tenantId) {
      business = await db.aiBusiness.findFirst({ where: { tenantId: user.tenantId } });
    }
    if (!business) throw new Error('BUSINESS_NOT_FOUND');
    return {
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
  }

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
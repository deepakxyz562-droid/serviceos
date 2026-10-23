import { db } from '@/lib/db';
import { getQuoteFlowUser } from '@/lib/quote-flow-session';
import { resolveStaffSession, type ResolvedStaffSession } from '@/lib/commerce/staff-helper';

export async function resolveStaffSessionFromRequest(req: Request): Promise<ResolvedStaffSession> {
  const user = await getQuoteFlowUser(req);
  if (!user) throw new Error('UNAUTHORIZED');

  const resolved = await resolveStaffSession(user);
  if (!resolved?.business) {
    // If not found in staff session, check if user is a legacy owner/admin
    const business = await db.aiBusiness.findUnique({ where: { ownerId: user.id } });
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

export async function ownerBusiness(req: Request) {
  const session = await resolveStaffSessionFromRequest(req);
  return session.business;
}
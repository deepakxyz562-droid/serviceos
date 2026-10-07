import { db } from '@/lib/db';
import { getQuoteFlowUser } from '@/lib/quote-flow-session';
export async function ownerBusiness(req: Request) {
  const user = await getQuoteFlowUser(req);
  if (!user) throw new Error('UNAUTHORIZED');
  const member = await db.user.findUnique({ where: { id: user.id }, select: { role: true, isActive: true } });
  if (!member?.isActive) throw new Error('UNAUTHORIZED');
  if (!['owner', 'admin', 'standalone_user'].includes(member.role)) throw new Error('FORBIDDEN');
  const business = await db.aiBusiness.findUnique({ where: { ownerId: user.id } });
  if (!business || (business.tenantId && business.tenantId !== user.tenantId)) throw new Error('BUSINESS_NOT_FOUND');
  return business;
}
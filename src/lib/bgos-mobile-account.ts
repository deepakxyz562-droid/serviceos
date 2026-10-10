import { db } from '@/lib/db';
import { ProductAccessError, resolveProductAccess } from '@/lib/product-access';
import { isBgosIdentity } from '../../shared/bgos-identity';

// Resolve the actual BGOS membership, even when the user's default workspace is
// another product. Never rewrite the user's default workspace during mobile login.
export async function resolveBgosMobileAccount(userId: string, workspaceId?: string) {
  const user = await db.user.findUnique({ where: { id: userId }, include: { workspace: true, tenant: true } });
  if (!user?.isActive || !user.emailVerified || user.role === 'customer' || user.isSuperAdmin) throw new ProductAccessError('ACCOUNT_UNAVAILABLE', 403);
  if (process.env.PRODUCT_WORKSPACES_ENABLED === 'true') {
    const access = await resolveProductAccess(userId, 'bgos', workspaceId);
    return { user: { ...user, role: access.membership.role, workspaceId: access.workspace.workspaceId, tenantId: access.workspace.tenantId },
      workspace: { id: access.workspace.workspaceId, productType: 'bgos', name: user.workspace?.name || 'BGOS' },
      onboardingRequired: !access.workspace.onboardingCompleted };
  }
  if (!user.tenantId || user.tenant?.suspendedAt || !isBgosIdentity({ user, workspace: user.workspace }) || (workspaceId && user.workspaceId !== workspaceId)) throw new ProductAccessError('BGOS_REQUIRED', 403);
  return { user, workspace: { id: user.workspace!.id, productType: user.workspace!.productType, name: user.workspace!.name }, onboardingRequired: false };
}

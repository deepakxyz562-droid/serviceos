import { db } from '@/lib/db';
import { ProductAccessError, resolveProductAccess } from '@/lib/product-access';
import { isBgosIdentity } from '../../shared/bgos-identity';

// Resolve the actual BGOS membership, even when the user's default workspace is
// another product. Never rewrite the user's default workspace during mobile login.
export async function resolveBgosMobileAccount(userId: string, workspaceId?: string) {
  const user = await db.user.findUnique({ where: { id: userId }, include: { workspace: true, tenant: true } });
  if (!user?.isActive || user.role === 'customer' || user.isSuperAdmin) throw new ProductAccessError('ACCOUNT_UNAVAILABLE', 403);
  if (process.env.PRODUCT_WORKSPACES_ENABLED === 'true') {
    const access = await resolveProductAccess(userId, 'bgos', workspaceId);
    return { user: { ...user, role: access.membership.role, workspaceId: access.workspace.workspaceId, tenantId: access.workspace.tenantId },
      workspace: { id: access.workspace.workspaceId, productType: 'bgos', name: user.workspace?.name || 'BGOS' },
      onboardingRequired: !access.workspace.onboardingCompleted };
  }
  let workspace = user.workspace;
  if (!workspace && user.tenantId) {
    workspace = await db.workspace.findFirst({ where: { tenantId: user.tenantId } });
  }
  if (!user.tenantId || user.tenant?.suspendedAt || (workspaceId && workspace && workspace.id !== workspaceId)) throw new ProductAccessError('BGOS_REQUIRED', 403);
  const effectiveProduct = workspace?.productType || 'bgos';
  return {
    user: { ...user, workspaceId: workspace?.id || user.workspaceId },
    workspace: { id: workspace?.id || 'default_bgos', productType: effectiveProduct, name: workspace?.name || 'BGOS' },
    onboardingRequired: false
  };
}

import { db } from '@/lib/db';
import { getAdminClient, shouldUseSupabaseDB } from '@/lib/supabase-db';
import type { ProductApp } from '../../shared/product-context';
import { normalizeProduct, subscriptionAllowsAccess } from '../../shared/products';

export class ProductAccessError extends Error {
  constructor(public code: string, public status = 403) { super(code); }
}

/** Explicit workspace selection never grants access; always validate membership. */
export async function resolveProductAccess(userId: string, product: ProductApp, workspaceId?: string) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.isActive || !user.emailVerified) throw new ProductAccessError('ACCOUNT_UNAVAILABLE', 401);
  const memberships = await db.productMembership.findMany({ where: { userId, status: 'active', ...(workspaceId ? { workspaceId } : {}) } });
  for (const membership of memberships) {
    const workspace = await db.productWorkspace.findUnique({ where: { workspaceId: membership.workspaceId } });
    if (!workspace || normalizeProduct(workspace.product) !== normalizeProduct(product)) continue;
    if (workspace.status !== 'active') throw new ProductAccessError('WORKSPACE_SUSPENDED');
    const tenant = workspace.tenantId ? await db.tenant.findUnique({ where: { id: workspace.tenantId } }) : null;
    if (workspace.tenantId && (!tenant || tenant.suspendedAt)) throw new ProductAccessError('TENANT_UNAVAILABLE');
    const subscription = await db.productSubscription.findUnique({ where: { workspaceId: workspace.workspaceId } });
    if (!subscription) throw new ProductAccessError('SUBSCRIPTION_MISSING');
    // Backfilled subscriptions continue to follow their existing billing lifecycle.
    const effective = subscription.billingSource === 'legacy' && tenant
      ? { status: tenant.planStatus, trialEndsAt: tenant.trialEndsAt, currentPeriodEnd: tenant.planEndsAt }
      : subscription;
    return { workspace, membership, subscription, tenant, allowed: subscriptionAllowsAccess(effective) };
  }
  throw new ProductAccessError('PRODUCT_MEMBERSHIP_REQUIRED');
}

export async function requireProductAccess(userId: string, product: ProductApp, workspaceId?: string) {
  const access = await resolveProductAccess(userId, product, workspaceId);
  if (!access.allowed) throw new ProductAccessError('PRODUCT_SUBSCRIPTION_REQUIRED', 402);
  if (!access.workspace.onboardingCompleted) throw new ProductAccessError('PRODUCT_ONBOARDING_REQUIRED');
  return access;
}

export async function activateProductWorkspace(userId: string, product: ProductApp, name: string): Promise<string> {
  if (shouldUseSupabaseDB()) {
    const { data, error } = await getAdminClient().rpc('activate_product_workspace', {
      p_user_id: userId, p_product: product, p_name: name,
    });
    if (error) throw new Error('Product provisioning failed');
    return data as string;
  }
  const rows = await db.$queryRaw<Array<{ id: string }>>`SELECT public.activate_product_workspace(${userId}, ${product}, ${name}) AS id`;
  return rows[0].id;
}

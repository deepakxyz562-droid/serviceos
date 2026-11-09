import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { generateSlug } from '@/lib/auth';
import { ProductAccessError, resolveProductAccess } from '@/lib/product-access';
import { isBgosIdentity } from '../../shared/bgos-identity';
import { isDeliverableEmail } from '@/lib/emails/bgos/templates';
import { getBgosAiQuotaForPlan, resolveInstallCountryAndBilling } from '@/lib/bgos-billing';

/**
 * Auto-provision Tenant + Workspace + Subscription for mobile users
 * ensuring seamless 1-tap sign-in without requiring desktop web setup.
 */
export async function ensureBgosTenantAndWorkspace(
  userId: string,
  options?: {
    request?: NextRequest | Request;
    phone?: string | null;
    explicitCountry?: string | null;
    explicitTimeZone?: string | null;
  },
) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { workspace: true, tenant: true },
  });
  if (!user) throw new ProductAccessError('ACCOUNT_UNAVAILABLE', 404);

  let tenant = user.tenant;
  let tenantId = user.tenantId;
  let didCreateTenant = false;

  // 1. Ensure Tenant exists
  if (!tenantId || !tenant) {
    const rawName = user.name || user.email.split('@')[0] || 'My Business';
    const businessName = `${rawName}'s Business`;
    const baseSlug = generateSlug(businessName);
    let slug = baseSlug;
    let slugCounter = 1;
    while (await db.tenant.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${slugCounter}`;
      slugCounter++;
    }

    const geo = await resolveInstallCountryAndBilling({
      request: options?.request,
      phone: options?.phone || user.phone,
      explicitCountry: options?.explicitCountry,
      explicitTimeZone: options?.explicitTimeZone,
      allowIpLookup: Boolean(options?.request),
    });
    const deviceTz =
      options?.explicitTimeZone ||
      options?.request?.headers?.get('x-device-timezone')?.trim() ||
      null;

    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    tenant = await db.tenant.create({
      data: {
        name: businessName,
        slug,
        email: user.email,
        phone: user.phone || options?.phone || null,
        plan: 'starter',
        planStatus: 'trial',
        trialEndsAt,
        country: geo.countryCode,
        currency: geo.currency,
        ...(deviceTz
          ? {
              settingsJson: JSON.stringify({
                country: geo.countryCode,
                timezone: deviceTz,
                countryVerified: false,
              }),
            }
          : {}),
        onboardingCompleted: false,
        onboardingStep: 1,
      },
    });
    tenantId = tenant.id;
    didCreateTenant = true;

    // Default Subscription
    await db.subscription.create({
      data: {
        tenantId: tenant.id,
        plan: 'starter',
        status: 'trial',
        trialEndsAt,
        amount: 0,
        currency: geo.currency,
        billingCycle: 'monthly',
        aiQuota: getBgosAiQuotaForPlan('starter'),
      },
    });
  }

  // 2. Ensure Workspace exists
  let workspace = user.workspace;
  if (!workspace && tenantId) {
    workspace = await db.workspace.findFirst({ where: { tenantId } });
  }

  if (!workspace) {
    const wsName = `${tenant.name || user.name || 'My'} Workspace`;
    const baseWsSlug = generateSlug(wsName);
    let wsSlug = baseWsSlug;
    let wsCounter = 1;
    while (await db.workspace.findUnique({ where: { slug: wsSlug } })) {
      wsSlug = `${baseWsSlug}-${wsCounter}`;
      wsCounter++;
    }

    workspace = await db.workspace.create({
      data: {
        name: wsName,
        slug: wsSlug,
        ownerId: user.id,
        tenantId,
        productType: 'bgos',
      },
    });
  }

  // 3. Link user to tenant and workspace
  if (user.tenantId !== tenantId || user.workspaceId !== workspace.id) {
    await db.user.update({
      where: { id: user.id },
      data: {
        tenantId,
        workspaceId: workspace.id,
      },
    });
  }

  // 4. Ensure ProductWorkspace & ProductMembership entries (so PRODUCT_WORKSPACES_ENABLED is satisfied)
  try {
    const pw = await db.productWorkspace.findUnique({ where: { workspaceId: workspace.id } });
    if (!pw) {
      await db.productWorkspace.create({
        data: {
          workspaceId: workspace.id,
          tenantId,
          product: 'bgos',
          status: 'active',
          onboardingCompleted: false,
          onboardingStep: 0,
        },
      });
    }

    const pm = await db.productMembership.findFirst({
      where: { workspaceId: workspace.id, userId: user.id },
    });
    if (!pm) {
      await db.productMembership.create({
        data: {
          id: `pm_${user.id}_${workspace.id}`,
          workspaceId: workspace.id,
          userId: user.id,
          role: user.role || 'owner',
          status: 'active',
        },
      });
    }

    const ps = await db.productSubscription.findUnique({ where: { workspaceId: workspace.id } });
    if (!ps) {
      await db.productSubscription.create({
        data: {
          workspaceId: workspace.id,
          plan: tenant.plan || 'starter',
          status: tenant.planStatus || 'trial',
          trialEndsAt: tenant.trialEndsAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          billingSource: 'product',
        },
      });
    }
  } catch (err) {
    console.warn('[ensureBgosTenantAndWorkspace] ProductWorkspace upsert notice:', err);
  }

  if (didCreateTenant && tenant && isDeliverableEmail(user.email)) {
    try {
      const { sendBgosWelcomeEmail } = await import('@/lib/emails/bgos/sender');
      await sendBgosWelcomeEmail({
        to: user.email,
        ownerName: user.name,
        businessName: tenant.name || user.name || 'your business',
        tenantId: tenant.id,
        trialDays: 7,
      });
    } catch (welcomeErr) {
      console.warn('[ensureBgosTenantAndWorkspace] BGOS welcome email skipped:', welcomeErr);
    }
  }

  return { tenant, workspace };
}

// Resolve the actual BGOS membership, even when the user's default workspace is
// another product. Never rewrite the user's default workspace during mobile login.
export async function resolveBgosMobileAccount(userId: string, workspaceId?: string) {
  let user = await db.user.findUnique({ where: { id: userId }, include: { workspace: true, tenant: true } });
  if (!user?.isActive || user.role === 'customer' || user.isSuperAdmin) throw new ProductAccessError('ACCOUNT_UNAVAILABLE', 403);

  // Auto-provision if tenant or workspace is missing
  if (!user.tenantId || (!user.workspaceId && !user.workspace)) {
    await ensureBgosTenantAndWorkspace(userId);
    user = await db.user.findUnique({ where: { id: userId }, include: { workspace: true, tenant: true } });
    if (!user) throw new ProductAccessError('ACCOUNT_UNAVAILABLE', 403);
  }

  if (process.env.PRODUCT_WORKSPACES_ENABLED === 'true') {
    try {
      const access = await resolveProductAccess(userId, 'bgos', workspaceId);
      return {
        user: { ...user, role: access.membership.role, workspaceId: access.workspace.workspaceId, tenantId: access.workspace.tenantId },
        workspace: { id: access.workspace.workspaceId, productType: 'bgos', name: user.workspace?.name || 'BGOS' },
        onboardingRequired: !access.workspace.onboardingCompleted,
      };
    } catch (err) {
      if (err instanceof ProductAccessError && err.code === 'PRODUCT_MEMBERSHIP_REQUIRED') {
        // Fall through to business workspace check
      } else {
        throw err;
      }
    }
  }

  let workspace = user.workspace;
  if (!workspace && user.tenantId) {
    workspace = await db.workspace.findFirst({ where: { tenantId: user.tenantId } });
  }
  if (!user.tenantId || user.tenant?.suspendedAt || (workspaceId && workspace && workspace.id !== workspaceId) || !isBgosIdentity({ user, workspace })) {
    throw new ProductAccessError('BGOS_REQUIRED', 403);
  }

  const effectiveProduct = workspace?.productType || 'bgos';
  const gbpCount = await db.socialAccount.count({
    where: {
      tenantId: user.tenantId,
      platform: 'googlebusiness',
      isActive: true,
    },
  });
  const onboardingRequired = !user.tenant?.onboardingCompleted && gbpCount === 0;
  return {
    user: { ...user, workspaceId: workspace?.id || user.workspaceId },
    workspace: { id: workspace?.id || 'default_bgos', productType: effectiveProduct, name: workspace?.name || 'BGOS' },
    onboardingRequired,
  };
}

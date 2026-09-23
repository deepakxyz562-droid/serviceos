import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import { cache } from '@/lib/cache';

// GET: List all subscriptions with tenant info, filters, and usage data
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') || '';
    const tenantIdFilter = searchParams.get('tenantId') || '';
    const search = searchParams.get('search') || '';
    const isExport = searchParams.get('export') === 'true';

    // Pagination params — defaults: page=1, limit=50. If isExport, allow up to 5000.
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = isExport
      ? 5000
      : Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50));

    // Build where clause
    const where: Record<string, unknown> = {};
    if (statusFilter && statusFilter !== 'all') {
      where.status = statusFilter;
    }
    if (tenantIdFilter) {
      where.tenantId = tenantIdFilter;
    }
    if (search) {
      // Search across the tenant relation (name/email/phone/slug) and the subscription's
      // own plan column. Uses Prisma's relation filter syntax so the search
      // is pushed down to the DB rather than filtering in JS after the fetch.
      where.OR = [
        {
          tenant: {
            OR: [
              { name: { contains: search } },
              { email: { contains: search } },
              { phone: { contains: search } },
              { slug: { contains: search } },
            ],
          },
        },
        { plan: { contains: search } },
      ];
    }

    // Run the findMany and the total count in parallel.
    const [subscriptions, total] = await Promise.all([
      db.subscription.findMany({
        where,
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
              email: true,
              phone: true,
              whatsappPhone: true,
              address: true,
              country: true,
              currency: true,
              industry: true,
              plan: true,
              planStatus: true,
              formsPlan: true,
              formsPlanStatus: true,
              lifetimeJobsCreated: true,
              mrr: true,
              arr: true,
              users: {
                where: { role: 'owner' },
                select: { name: true, email: true, phone: true },
                take: 1,
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: isExport ? 0 : (page - 1) * limit,
      }),
      db.subscription.count({ where }),
    ]);

    const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
    const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://fieseros.com';

    const formatted = subscriptions.map((s: Record<string, unknown>) => {
      const tenant = s.tenant as Record<string, any> | null;
      const owner = Array.isArray(tenant?.users) && tenant.users.length > 0 ? tenant.users[0] : null;
      const slug = tenant?.slug || '';
      const tenantId = (s.tenantId as string) || '';

      return {
        id: s.id,
        tenantId,
        tenantName: tenant?.name || 'Unknown',
        tenantSlug: slug,
        tenantEmail: tenant?.email || '',
        tenantPhone: tenant?.phone || '',
        tenantWhatsappPhone: tenant?.whatsappPhone || '',
        tenantAddress: tenant?.address || '',
        tenantCountry: tenant?.country || 'US',
        tenantCurrency: tenant?.currency || (s.currency as string) || 'USD',
        tenantIndustry: tenant?.industry || '',
        tenantPlanStatus: tenant?.planStatus || '',
        formsPlan: tenant?.formsPlan || 'free',
        formsPlanStatus: tenant?.formsPlanStatus || 'active',
        lifetimeJobsCreated: Number(tenant?.lifetimeJobsCreated) || 0,
        ownerName: owner?.name || '',
        ownerEmail: owner?.email || '',
        ownerPhone: owner?.phone || '',
        publicProfileUrl: slug ? `${origin}/b/${slug}` : '',
        marketplaceUrl: slug ? `${origin}/marketplace/${slug}` : '',
        adminDetailUrl: tenantId ? `${origin}/dashboard/superadmin/tenants/${tenantId}` : '',
        plan: s.plan,
        status: s.status,
        amount: Number(s.amount) || 0,
        currency: s.currency || 'USD',
        billingCycle: s.billingCycle || 'monthly',
        startDate: s.startDate ? new Date(s.startDate as string).toISOString() : null,
        endDate: s.endDate ? new Date(s.endDate as string).toISOString() : null,
        pausedDate: s.pausedAt ? new Date(s.pausedAt as string).toISOString() : null,
        pauseReason: s.pauseReason || null,
        // Usage data
        seatCount: Number(s.seatCount) || 0,
        aiQuota: Number(s.aiQuota) || 0,
        aiUsageCount: Number(s.aiUsageCount) || 0,
        whatsappQuota: Number(s.whatsappQuota) || 0,
        whatsappUsageCount: Number(s.whatsappUsageCount) || 0,
        emailQuota: Number(s.emailQuota) || 0,
        emailUsageCount: Number(s.emailUsageCount) || 0,
        smsQuota: Number(s.smsQuota) || 0,
        smsUsageCount: Number(s.smsUsageCount) || 0,
        storageQuotaMb: Number(s.storageQuotaMb) || 0,
        storageUsageMb: Number(s.storageUsageMb) || 0,
        createdAt: s.createdAt ? new Date(s.createdAt as string).toISOString() : null,
      };
    });

    return NextResponse.json({
      data: formatted,
      page,
      limit,
      total,
      totalPages,
    });
  } catch (error) {
    console.error('[SuperAdmin Subscriptions GET] Error:', error);
    // Return a 500 with the error so the frontend can distinguish a real failure
    // from a legitimate empty list. Previously this returned HTTP 200 with an
    // empty array, which hid broken queries (e.g. missing RELATION_MAP entries).
    const message = error instanceof Error ? error.message : 'Failed to load subscriptions';
    return NextResponse.json(
      { error: message, subscriptions: [], total: 0 },
      { status: 500 }
    );
  }
}

// POST: Create a new subscription
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { tenantId, plan, status, amount, billingCycle, seatCount, aiQuota, whatsappQuota, emailQuota, smsQuota, storageQuotaMb, maxUsers, maxJobs, maxWorkflows } = body;

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }
    if (!plan) {
      return NextResponse.json({ error: 'Plan is required' }, { status: 400 });
    }

    // Verify tenant exists
    const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const subscription = await db.subscription.create({
      data: {
        tenantId,
        plan,
        status: status || 'trial',
        amount: Number(amount) || 0,
        currency: body.currency || 'USD',
        billingCycle: billingCycle || 'monthly',
        seatCount: Number(seatCount) || 1,
        aiQuota: Number(aiQuota) || 100,
        whatsappQuota: Number(whatsappQuota) || 1000,
        emailQuota: Number(emailQuota) || 5000,
        smsQuota: Number(smsQuota) || 500,
        storageQuotaMb: Number(storageQuotaMb) || 1024,
        maxUsers: Number(maxUsers) || 1,
        maxJobs: Number(maxJobs) || 100,
        maxWorkflows: Number(maxWorkflows) || 10,
      },
    });

    // Invalidate caches
    cache.invalidateByPrefix('superadmin:');

    return NextResponse.json({ subscription }, { status: 201 });
  } catch (error) {
    console.error('[SuperAdmin Subscriptions POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
  }
}

// PUT: Update a subscription
export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { subscriptionId, ...updateFields } = body;

    if (!subscriptionId) {
      return NextResponse.json({ error: 'Subscription ID is required' }, { status: 400 });
    }

    // Verify subscription exists
    const existing = await db.subscription.findUnique({ where: { id: subscriptionId } });
    if (!existing) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // Build update data from provided fields
    const updateData: Record<string, unknown> = {};
    const allowedFields = ['plan', 'status', 'amount', 'currency', 'billingCycle', 'seatCount', 'aiQuota', 'whatsappQuota', 'emailQuota', 'smsQuota', 'storageQuotaMb', 'maxUsers', 'maxJobs', 'maxWorkflows', 'endDate'];

    for (const field of allowedFields) {
      if (updateFields[field] !== undefined) {
        const numFields = ['amount', 'seatCount', 'aiQuota', 'whatsappQuota', 'emailQuota', 'smsQuota', 'storageQuotaMb', 'maxUsers', 'maxJobs', 'maxWorkflows'];
        updateData[field] = numFields.includes(field) ? Number(updateFields[field]) : updateFields[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const subscription = await db.subscription.update({
      where: { id: subscriptionId },
      data: updateData,
    });

    // If plan changed, also update the tenant's plan
    if (updateData.plan) {
      try {
        await db.tenant.update({
          where: { id: (subscription as Record<string, unknown>).tenantId as string },
          data: { plan: updateData.plan },
        });
      } catch {
        // Tenant update is optional
      }
    }

    // Invalidate caches
    cache.invalidateByPrefix('superadmin:');

    return NextResponse.json({ subscription });
  } catch (error) {
    console.error('[SuperAdmin Subscriptions PUT] Error:', error);
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
  }
}

// PATCH: Pause/unpause subscription
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { subscriptionId, action, reason, newPlan } = body;

    if (!subscriptionId) {
      return NextResponse.json({ error: 'Subscription ID is required' }, { status: 400 });
    }

    if (action === 'pause') {
      if (!reason?.trim()) {
        return NextResponse.json({ error: 'Reason is required for pausing' }, { status: 400 });
      }
      const subscription = await db.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'paused',
          pausedAt: new Date().toISOString(),
          pauseReason: reason.trim(),
        },
      });

      cache.invalidateByPrefix('superadmin:');
      return NextResponse.json({ subscription });
    }

    if (action === 'resume') {
      const subscription = await db.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'active',
          pausedAt: null,
          pauseReason: null,
        },
      });

      cache.invalidateByPrefix('superadmin:');
      return NextResponse.json({ subscription });
    }

    if (action === 'cancel') {
      const subscription = await db.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: 'cancelled',
          endDate: new Date().toISOString(),
        },
      });

      cache.invalidateByPrefix('superadmin:');
      return NextResponse.json({ subscription });
    }

    if (action === 'change_plan') {
      if (!newPlan) {
        return NextResponse.json({ error: 'New plan is required' }, { status: 400 });
      }

      // Look up the plan's monthly price from the Plan catalog so the
      // subscription amount stays in sync with the seeded prices
      // (starter $29 / growth $79 / business $149 / enterprise $0 / trial $0).
      // Falls back to 0 if the Plan row is missing (e.g. plan table not yet
      // seeded) so the change_plan action still succeeds.
      let planAmount = 0;
      try {
        const plan = await db.plan.findUnique({
          where: { code: newPlan },
          select: { monthlyPrice: true },
        });
        if (plan?.monthlyPrice !== undefined && plan?.monthlyPrice !== null) {
          planAmount = plan.monthlyPrice;
        }
      } catch {
        // Plan table missing — fall through with amount = 0.
      }

      const subscription = await db.subscription.update({
        where: { id: subscriptionId },
        data: {
          plan: newPlan,
          amount: planAmount,
        },
      });

      // Also update the tenant's plan
      try {
        await db.tenant.update({
          where: { id: (subscription as Record<string, unknown>).tenantId as string },
          data: { plan: newPlan },
        });
      } catch {
        // Tenant update is optional
      }

      cache.invalidateByPrefix('superadmin:');
      return NextResponse.json({ subscription });
    }

    return NextResponse.json({ error: 'Invalid action. Use "pause", "resume", "cancel", or "change_plan"' }, { status: 400 });
  } catch (error) {
    console.error('[SuperAdmin Subscriptions PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * GET /api/superadmin/ai-platform/text-spend
 * Tier 4 — per-tenant TEXT_LLM spend from the UsageLedger.
 * Query: days=30 (7 | 30 | 90)
 * Auth: superadmin only.
 */
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const isSuperAdmin = (user as any).isSuperAdmin === true || user.role === 'superadmin' || user.role === 'super_admin';
  if (!isSuperAdmin) return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });

  const daysParam = parseInt(request.nextUrl.searchParams.get('days') ?? '30', 10);
  const days = [7, 30, 90].includes(daysParam) ? daysParam : 30;
  const since = new Date(Date.now() - days * 86400000);

  try {
    const platformAgg = await db.usageLedger.aggregate({
      where: { usageType: 'TEXT_LLM', occurredAt: { gte: since } },
      _count: { id: true },
      _sum: { promptTokens: true, completionTokens: true, totalTokens: true, providerCostUsd: true },
    });

    const featureGroups = await db.usageLedger.groupBy({
      by: ['aiFeature'],
      where: { usageType: 'TEXT_LLM', occurredAt: { gte: since } },
      _count: { id: true },
      _sum: { totalTokens: true, providerCostUsd: true },
      orderBy: { _count: { id: 'desc' } },
    });

    const tenantGroups = await db.usageLedger.groupBy({
      by: ['tenantId'],
      where: { usageType: 'TEXT_LLM', occurredAt: { gte: since } },
      _count: { id: true },
      _sum: { totalTokens: true, providerCostUsd: true },
      _max: { occurredAt: true },
      orderBy: { _count: { id: 'desc' } },
    });

    const voiceAgg = await db.usageLedger.aggregate({
      where: { usageType: 'VOICE_MINUTE', occurredAt: { gte: since } },
      _count: { id: true },
      _sum: { quantitySeconds: true, providerCostUsd: true, revenueUsd: true },
    });

    const tenantIds = tenantGroups.map((g) => g.tenantId);
    const tenants: { id: string; name: string; plan: string }[] = tenantIds.length
      ? await db.tenant.findMany({ where: { id: { in: tenantIds } }, select: { id: true, name: true, plan: true } })
      : [];
    const subscriptions: { tenantId: string; plan: string; aiQuota: number; aiUsageCount: number }[] = tenantIds.length
      ? await db.subscription.findMany({ where: { tenantId: { in: tenantIds } }, orderBy: { createdAt: 'desc' }, select: { tenantId: true, plan: true, aiQuota: true, aiUsageCount: true } })
      : [];

    const tenantName = new Map<string, { name: string; plan: string }>(tenants.map((t) => [t.id, { name: t.name, plan: t.plan }]));
    const subByTenant = new Map<string, { plan: string; aiQuota: number; aiUsageCount: number }>();
    for (const sub of subscriptions) {
      if (!subByTenant.has(sub.tenantId)) {
        subByTenant.set(sub.tenantId, { plan: sub.plan, aiQuota: sub.aiQuota, aiUsageCount: sub.aiUsageCount });
      }
    }

    const tenantRows = tenantGroups.map((g) => {
      const meta = tenantName.get(g.tenantId);
      const sub = subByTenant.get(g.tenantId);
      return {
        tenantId: g.tenantId,
        name: meta?.name ?? '(deleted tenant)',
        plan: sub?.plan ?? meta?.plan ?? 'unknown',
        calls: g._count.id,
        tokens: g._sum.totalTokens ?? 0,
        estimatedCostUsd: Number((g._sum.providerCostUsd ?? 0).toFixed(4)),
        quotaUsed: sub?.aiUsageCount ?? 0,
        quotaLimit: sub?.aiQuota ?? 0,
        lastUsedAt: g._max.occurredAt,
      };
    }).sort((a, b) => b.estimatedCostUsd - a.estimatedCostUsd);

    return NextResponse.json({
      windowDays: days,
      platform: {
        calls: platformAgg._count.id,
        promptTokens: platformAgg._sum.promptTokens ?? 0,
        completionTokens: platformAgg._sum.completionTokens ?? 0,
        totalTokens: platformAgg._sum.totalTokens ?? 0,
        estimatedCostUsd: Number((platformAgg._sum.providerCostUsd ?? 0).toFixed(4)),
        byFeature: featureGroups.map((g) => ({
          feature: g.aiFeature ?? '(unknown)',
          calls: g._count.id,
          tokens: g._sum.totalTokens ?? 0,
          costUsd: Number((g._sum.providerCostUsd ?? 0).toFixed(4)),
        })),
      },
      tenants: tenantRows,
      voice: {
        calls: voiceAgg._count.id,
        billableSeconds: voiceAgg._sum.quantitySeconds ?? 0,
        providerCostUsd: Number((voiceAgg._sum.providerCostUsd ?? 0).toFixed(4)),
        revenueUsd: Number((voiceAgg._sum.revenueUsd ?? 0).toFixed(4)),
      },
    });
  } catch (err) {
    console.error('[superadmin/ai-platform/text-spend] failed:', err);
    return NextResponse.json({ error: 'Could not load AI spend data.' }, { status: 500 });
  }
}

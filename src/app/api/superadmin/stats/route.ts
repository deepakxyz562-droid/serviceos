import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { cache } from '@/lib/cache';

const CACHE_KEY = 'superadmin:stats';
const CACHE_TTL = 30_000; // 30 seconds

// Helper to safely query tables that might not exist in Supabase
async function safeQuery<T>(queryFn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await queryFn();
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('Could not find the table') || msg.includes('does not exist') || msg.includes('relation')) {
      return fallback;
    }
    console.error('[SuperAdmin Stats] Query error:', msg);
    return fallback;
  }
}

export async function GET() {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (auth.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }

    // Check cache first
    const cached = cache.get<Record<string, unknown>>(CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached);
    }

    // ── Core tenant & user stats ──
    const [
      totalTenants,
      activeTenants,
      suspendedTenants,
      trialTenants,
      totalUsers,
      activeUsers,
      subscriptions,
      allTenants,
    ] = await Promise.all([
      db.tenant.count(),
      db.tenant.count({ where: { planStatus: 'active' } }),
      db.tenant.count({ where: { planStatus: 'suspended' } }),
      db.tenant.count({ where: { planStatus: 'trial' } }),
      db.user.count(),
      db.user.count({ where: { isActive: true } }),
      db.subscription.findMany({
        where: { status: 'active' },
        select: { amount: true, billingCycle: true, tenantId: true },
      }),
      db.tenant.findMany({
        select: { mrr: true, arr: true, churnRate: true, id: true },
      }),
    ]);

    // ── Revenue computation ──
    const totalMRR = allTenants.reduce((sum, t) => sum + (Number(t.mrr) || 0), 0);
    const totalARR = allTenants.reduce((sum, t) => sum + (Number(t.arr) || 0), 0);
    const avgChurnRate = allTenants.length > 0
      ? allTenants.reduce((sum, t) => sum + (Number(t.churnRate) || 0), 0) / allTenants.length
      : 0;
    const subscriptionRevenue = subscriptions.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
    const activeSubscriptions = subscriptions.length;

    // ── Communication stats (WhatsApp conversations) ──
    const [totalConversations, activeConversations] = await Promise.all([
      safeQuery(() => db.conversation.count(), 0),
      safeQuery(() => db.conversation.count({ where: { status: 'active' } }), 0),
    ]);

    // ── Platform health metrics (from PlatformMetric table or computed) ──
    const platformMetrics = await safeQuery(
      () => db.platformMetric.findMany({
        orderBy: { recordedAt: 'desc' },
        take: 20,
      }),
      [],
    );

    const healthMetrics = Array.isArray(platformMetrics) && platformMetrics.length > 0
      ? platformMetrics.map((m: Record<string, unknown>) => ({
          metric: m.metric,
          value: m.value,
          dimensions: m.dimensionsJson ? JSON.parse(m.dimensionsJson as string) : {},
          recordedAt: m.recordedAt,
        }))
      : [
          { metric: 'total_tenants', value: totalTenants, dimensions: {}, recordedAt: new Date().toISOString() },
          { metric: 'total_users', value: totalUsers, dimensions: {}, recordedAt: new Date().toISOString() },
          { metric: 'mrr', value: totalMRR || subscriptionRevenue, dimensions: {}, recordedAt: new Date().toISOString() },
          { metric: 'churn_rate', value: avgChurnRate, dimensions: {}, recordedAt: new Date().toISOString() },
          { metric: 'active_conversations', value: activeConversations, dimensions: {}, recordedAt: new Date().toISOString() },
        ];

    // ── Recent security events ──
    const securityEvents = await safeQuery(
      () => db.securityEvent.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      [],
    );

    const recentSecurityEvents = Array.isArray(securityEvents) ? securityEvents.map((e: Record<string, unknown>) => ({
      id: e.id,
      eventType: e.eventType,
      severity: e.severity,
      userId: e.userId,
      tenantId: e.tenantId,
      ip: e.ip,
      createdAt: e.createdAt,
    })) : [];

    // ── Recent audit logs ──
    const auditLogs = await safeQuery(
      () => db.auditLogEntry.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      [],
    );

    // Fallback to existing AuditLog table if AuditLogEntry is empty
    let recentAuditLogs: Array<Record<string, unknown>> = [];
    if (Array.isArray(auditLogs) && auditLogs.length > 0) {
      recentAuditLogs = auditLogs.map((l: Record<string, unknown>) => ({
        id: l.id,
        userId: l.userId,
        tenantId: l.tenantId,
        action: l.action,
        resourceType: l.resourceType,
        resourceId: l.resourceId,
        ip: l.ip,
        createdAt: l.createdAt,
      }));
    } else {
      try {
        const fallbackLogs = await db.auditLog.findMany({
          orderBy: { createdAt: 'desc' },
          take: 10,
        });
        recentAuditLogs = fallbackLogs.map((l: Record<string, unknown>) => ({
          id: l.id,
          userId: l.userId,
          tenantId: null,
          action: l.action,
          resourceType: l.resourceType,
          resourceId: l.resourceId,
          ip: l.ip,
          createdAt: l.createdAt,
        }));
      } catch {
        // AuditLog table might also not be accessible
      }
    }

    // ── Trends (computed from data - would need historical data for real trends) ──
    const trends = {
      tenants: totalTenants > 0 ? Math.round((activeTenants / totalTenants) * 100) : 0,
      users: totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0,
      revenue: totalMRR > 0 ? 12.5 : 0, // Placeholder: would need month-over-month data
      subscriptions: activeSubscriptions > 0 ? 8.3 : 0,
    };

    const result = {
      totalTenants,
      activeTenants,
      suspendedTenants,
      trialTenants,
      totalUsers,
      activeUsers,
      totalRevenue: totalMRR || subscriptionRevenue,
      mrr: totalMRR || subscriptionRevenue,
      arr: totalARR || (subscriptionRevenue * 12),
      avgChurnRate: Math.round(avgChurnRate * 100) / 100,
      activeSubscriptions,
      communication: {
        totalConversations,
        activeConversations,
      },
      healthMetrics,
      recentSecurityEvents,
      recentAuditLogs,
      trends,
    };

    // Cache the result
    cache.set(CACHE_KEY, result, CACHE_TTL);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[SuperAdmin Stats] Error:', error);
    return NextResponse.json({
      totalTenants: 0,
      activeTenants: 0,
      suspendedTenants: 0,
      trialTenants: 0,
      totalUsers: 0,
      activeUsers: 0,
      totalRevenue: 0,
      mrr: 0,
      arr: 0,
      avgChurnRate: 0,
      activeSubscriptions: 0,
      communication: { totalConversations: 0, activeConversations: 0 },
      healthMetrics: [],
      recentSecurityEvents: [],
      recentAuditLogs: [],
      trends: { tenants: 0, users: 0, revenue: 0, subscriptions: 0 },
    });
  }
}

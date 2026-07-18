import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// GET /api/lead-discovery/stats — Dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || !authUser.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const tenantId = authUser.tenantId;

    // Calculate date 7 days ago for recent activity
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Run all queries in parallel for performance
    const [
      statusGroups,
      sourceGroups,
      businessTypeGroups,
      recentDiscoveries,
      funnelCounts,
      recentSearches,
      totalDiscoveries,
    ] = await Promise.all([
      // 1. Total discoveries by status
      db.leadDiscovery.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { status: true },
      }),

      // 2. Discoveries by source (pie chart data)
      db.leadDiscovery.groupBy({
        by: ['source'],
        where: { tenantId },
        _count: { source: true },
      }),

      // 3. Top business types
      db.leadDiscovery.groupBy({
        by: ['businessType'],
        where: { tenantId, businessType: { not: null } },
        _count: { businessType: true },
        orderBy: { _count: { businessType: 'desc' } },
        take: 10,
      }),

      // 4. Recent activity (last 7 days)
      db.leadDiscovery.findMany({
        where: {
          tenantId,
          createdAt: { gte: sevenDaysAgo },
        },
        select: {
          id: true,
          name: true,
          status: true,
          source: true,
          businessType: true,
          rating: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),

      // 5. Conversion funnel counts
      Promise.all([
        db.leadDiscovery.count({ where: { tenantId, status: 'discovered' } }),
        db.leadDiscovery.count({ where: { tenantId, status: 'contacted' } }),
        db.leadDiscovery.count({ where: { tenantId, status: 'imported' } }),
        db.leadDiscovery.count({ where: { tenantId, status: 'qualified' } }),
        db.leadDiscovery.count({ where: { tenantId, status: 'converted' } }),
      ]),

      // 6. Recent search history
      db.leadDiscoverySearch.findMany({
        where: { tenantId },
        select: {
          id: true,
          query: true,
          source: true,
          location: true,
          resultsCount: true,
          importedCount: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      // 7. Total count
      db.leadDiscovery.count({ where: { tenantId } }),
    ]);

    // Format byStatus
    const byStatus: Record<string, number> = {};
    for (const item of statusGroups) {
      byStatus[item.status] = item._count.status;
    }

    // Format bySource (pie chart data)
    const bySource = sourceGroups.map(item => ({
      source: item.source,
      count: item._count.source,
    }));

    // Format top business types
    const topBusinessTypes = businessTypeGroups.map(item => ({
      businessType: item.businessType || 'Unknown',
      count: item._count.businessType,
    }));

    // Build conversion funnel
    const [discovered, contacted, imported, qualified, converted] = funnelCounts;
    const conversionFunnel = {
      discovered,
      contacted,
      imported,
      qualified,
      converted,
      conversionRate: discovered > 0 ? Math.round((converted / discovered) * 100) : 0,
      importRate: discovered > 0 ? Math.round((imported / discovered) * 100) : 0,
    };

    // Recent activity grouped by day
    const activityByDay: Record<string, number> = {};
    for (const d of recentDiscoveries) {
      const day = new Date(d.createdAt).toISOString().split('T')[0];
      activityByDay[day] = (activityByDay[day] || 0) + 1;
    }

    // Recent activity stats
    const recentActivity = {
      total: recentDiscoveries.length,
      byDay: activityByDay,
      latest: recentDiscoveries.slice(0, 5),
    };

    return NextResponse.json({
      total: totalDiscoveries,
      byStatus,
      bySource,
      topBusinessTypes,
      conversionFunnel,
      recentActivity,
      recentSearches,
    });
  } catch (error) {
    console.error('[LeadDiscovery] Stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch discovery stats' },
      { status: 500 }
    );
  }
}

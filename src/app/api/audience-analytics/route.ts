import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// GET /api/audience-analytics — aggregated audience stats for current tenant
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';

    const contactWhere = { tenantId };

    // Run independent counts in parallel
    const [
      totalContacts,
      activeContacts,
      unsubscribedContacts,
      bouncedContacts,
      contactsByStatusRaw,
      contactsBySourceRaw,
      contactsByCountryRaw,
      totalGroups,
      totalTags,
      totalSegments,
      topGroups,
      tagsWithCount,
      recentImports,
      recentContactsForGrowth,
    ] = await Promise.all([
      db.contact.count({ where: contactWhere }),
      db.contact.count({ where: { ...contactWhere, status: 'active' } }),
      db.contact.count({ where: { ...contactWhere, status: 'unsubscribed' } }),
      db.contact.count({ where: { ...contactWhere, status: 'bounced' } }),
      db.contact.groupBy({
        by: ['status'],
        where: contactWhere,
        _count: true,
      }),
      db.contact.groupBy({
        by: ['source'],
        where: contactWhere,
        _count: true,
      }),
      db.contact.groupBy({
        by: ['country'],
        where: contactWhere,
        _count: { country: true },
        orderBy: { _count: { country: 'desc' } },
        take: 10,
      }),
      db.group.count({ where: { tenantId } }),
      db.tag.count({ where: { tenantId } }),
      db.segment.count({ where: { tenantId } }),
      db.group.findMany({
        where: { tenantId },
        orderBy: { memberCount: 'desc' },
        take: 5,
        select: { id: true, name: true, memberCount: true },
      }),
      db.tag.findMany({
        where: { tenantId },
        include: { _count: { select: { contacts: true } } },
      }),
      db.contactImport.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      db.contact.findMany({
        where: {
          tenantId,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
        select: { createdAt: true },
      }),
    ]);

    // Shape groupBy results
    const contactsByStatus = contactsByStatusRaw.map((r) => ({
      status: r.status || 'unknown',
      count: r._count,
    }));
    const contactsBySource = contactsBySourceRaw.map((r) => ({
      source: r.source || 'unknown',
      count: r._count,
    }));
    const contactsByCountry = contactsByCountryRaw.map((r) => ({
      country: r.country || 'unknown',
      count: r._count.country,
    }));

    // Top 5 tags by contactCount
    const topTags = tagsWithCount
      .map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color,
        contactCount: t._count.contacts,
      }))
      .sort((a, b) => b.contactCount - a.contactCount)
      .slice(0, 5);

    // Build last-30-days growth series (fill missing days with 0)
    const byDate = new Map<string, number>();
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      byDate.set(d.toISOString().slice(0, 10), 0);
    }
    for (const c of recentContactsForGrowth) {
      const key = new Date(c.createdAt).toISOString().slice(0, 10);
      if (byDate.has(key)) {
        byDate.set(key, (byDate.get(key) || 0) + 1);
      }
    }
    const growthLast30Days = Array.from(byDate.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }));

    return NextResponse.json({
      data: {
        totalContacts,
        activeContacts,
        unsubscribedContacts,
        bouncedContacts,
        contactsBySource,
        contactsByCountry,
        contactsByStatus,
        totalGroups,
        totalTags,
        totalSegments,
        topGroups,
        topTags,
        recentImports,
        growthLast30Days,
      },
    });
  } catch (error) {
    console.error('Error fetching audience analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audience analytics' },
      { status: 500 }
    );
  }
}

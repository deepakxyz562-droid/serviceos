import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, apiError } from '@/lib/api-auth';

/**
 * GET /api/forms/analytics?formId=xxx&days=30
 *
 * Returns Forms analytics:
 * - Views, starts, submissions, conversion rate
 * - Submissions by source (direct, embed, wordpress, etc.)
 * - Submissions by device (mobile, tablet, desktop)
 * - Submissions by country (top 10)
 * - Submissions by UTM source
 * - Daily submission trend (last N days)
 * - Avg completion time (from startedAt → completedAt)
 *
 * If formId is provided, returns analytics for that form only.
 * Otherwise, aggregates across all forms in the workspace.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const user = auth.user;

  const workspaceId = user.workspaceId;
  const tenantId = user.tenantId;

  const { searchParams } = new URL(request.url);
  const formId = searchParams.get('formId');
  const days = parseInt(searchParams.get('days') || '30');
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  // Build scope filter
  const scopeOR = [
    ...(workspaceId ? [{ workspaceId }] : []),
    ...(tenantId ? [{ tenantId }] : []),
  ];
  if (!scopeOR.length) return apiError(403, 'No workspace access', 'FORBIDDEN');

  const formWhere = formId
    ? { id: formId, OR: scopeOR }
    : { OR: scopeOR };

  // Get form IDs in scope
  const forms = await db.form.findMany({
    where: formWhere,
    select: { id: true, name: true },
  });
  const formIds = forms.map((f) => f.id);

  if (!formIds.length) {
    return NextResponse.json({
      views: 0,
      submissions: 0,
      conversionRate: 0,
      avgCompletionTimeSec: 0,
      bySource: {},
      byDevice: {},
      byCountry: {},
      byUtmSource: {},
      dailyTrend: [],
      forms: [],
    });
  }

  const responseWhere = {
    formId: { in: formIds },
    createdAt: { gte: since },
  };

  const [views, submissions, submissionsBySource, submissionsByDevice, submissionsByCountry, submissionsByUtm, dailyTrend] = await Promise.all([
    // Total views (from FormView)
    db.formView.count({
      where: { formId: { in: formIds }, startedAt: { gte: since } },
    }),
    // Total submissions
    db.formResponse.count({ where: responseWhere }),
    // By source
    db.formResponse.groupBy({
      by: ['source'],
      where: responseWhere,
      _count: { _all: true },
    }),
    // By device (extracted from userAgent — stored on FormView, not FormResponse)
    db.formView.groupBy({
      by: ['device'],
      where: { formId: { in: formIds }, startedAt: { gte: since } },
      _count: { _all: true },
    }),
    // By country
    db.formResponse.groupBy({
      by: ['country'],
      where: { ...responseWhere, country: { not: null } },
      _count: { _all: true },
    }),
    // By UTM source
    db.formResponse.groupBy({
      by: ['utmSource'],
      where: { ...responseWhere, utmSource: { not: null } },
      _count: { _all: true },
    }),
    // Daily trend
    db.formResponse.findMany({
      where: responseWhere,
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  // Compute conversion rate
  const conversionRate = views > 0 ? (submissions / views) * 100 : 0;

  // Compute avg completion time (from responses that have startedAt + completedAt)
  const completionTimes = await db.formResponse.findMany({
    where: {
      ...responseWhere,
      startedAt: { not: null },
      completedAt: { not: null },
    },
    select: { startedAt: true, completedAt: true },
  });
  const avgCompletionTimeSec = completionTimes.length > 0
    ? completionTimes.reduce((sum, r) => {
        const diff = (r.completedAt!.getTime() - r.startedAt!.getTime()) / 1000;
        return sum + (diff > 0 ? diff : 0);
      }, 0) / completionTimes.length
    : 0;

  // Group daily trend
  const trendMap = new Map<string, number>();
  for (const r of dailyTrend) {
    const day = r.createdAt.toISOString().split('T')[0];
    trendMap.set(day, (trendMap.get(day) || 0) + 1);
  }
  const trend = Array.from(trendMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({
    views,
    submissions,
    conversionRate: parseFloat(conversionRate.toFixed(2)),
    avgCompletionTimeSec: Math.round(avgCompletionTimeSec),
    bySource: Object.fromEntries(submissionsBySource.map((s) => [s.source, s._count._all])),
    byDevice: Object.fromEntries(submissionsByDevice.filter((d) => d.device).map((d) => [d.device, d._count._all])),
    byCountry: Object.fromEntries(submissionsByCountry.map((c) => [c.country || 'Unknown', c._count._all])),
    byUtmSource: Object.fromEntries(submissionsByUtm.map((u) => [u.utmSource || 'Unknown', u._count._all])),
    dailyTrend: trend,
    forms: forms.map((f) => ({ id: f.id, name: f.name })),
  });
}

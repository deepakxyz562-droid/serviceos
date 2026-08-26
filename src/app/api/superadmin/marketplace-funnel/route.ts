/**
 * GET /api/superadmin/marketplace-funnel
 * ─────────────────────────────────────────────────────────────────────────
 * Returns the marketplace → CRM acquisition funnel for the superadmin
 * dashboard widget.
 *
 * Funnel stages:
 *   1. Impressions  — visitors to Fieseros-powered business pages
 *   2. Leads        — booking/quote/request submissions from those pages
 *   3. Google leads — leads attributed to Google (via UTM source)
 *
 * Query: ?days=7 (default 7, max 90)
 *
 * Response:
 *   {
 *     impressions: number,        // total page views in the window
 *     impressionsBySource: { google: number, direct: number, other: number },
 *     leads: number,              // total leads from public_booking/quote/request
 *     googleLeads: number,        // leads with source='public_booking' + utm_source=google
 *     conversionRate: number,     // leads / impressions (0-1)
 *     byDay: [{ date, impressions, leads }]  // for a sparkline chart
 *   }
 *
 * Auth: superadmin only (isSuperAdmin === true).
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const isSuperAdmin =
      user.isSuperAdmin === true ||
      user.role === 'superadmin' ||
      user.role === 'super_admin';
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'SuperAdmin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const days = Math.min(Math.max(parseInt(searchParams.get('days') || '7', 10), 1), 90);
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const sinceDateStr = sinceDate.toISOString().slice(0, 10);

    // ── 1. Impressions (from AnalyticsSnapshot) ────────────────────────────
    const impressionSnapshots = await db.analyticsSnapshot.findMany({
      where: {
        metric: 'public_page_impression',
        date: { gte: sinceDateStr },
      },
      select: { date: true, value: true, dimensionsJson: true },
    });

    let impressions = 0;
    const impressionsBySource = { google: 0, direct: 0, other: 0 };
    const byDayMap = new Map<string, { impressions: number; leads: number }>();

    for (const snap of impressionSnapshots) {
      impressions += snap.value;
      try {
        const dims = JSON.parse(snap.dimensionsJson || '{}');
        const src = dims.source as keyof typeof impressionsBySource;
        if (src in impressionsBySource) {
          impressionsBySource[src] += snap.value;
        } else {
          impressionsBySource.other += snap.value;
        }
      } catch {
        impressionsBySource.other += snap.value;
      }
      // Track daily impressions for the sparkline.
      const day = byDayMap.get(snap.date) || { impressions: 0, leads: 0 };
      day.impressions += snap.value;
      byDayMap.set(snap.date, day);
    }

    // ── 2. Leads (from Lead table — public_booking/quote/request sources) ──
    const leadSources = ['public_booking', 'public_quote', 'public_request'];
    const leads = await db.lead.findMany({
      where: {
        source: { in: leadSources },
        createdAt: { gte: sinceDate },
      },
      select: { createdAt: true, source: true, description: true },
    });

    // Count leads attributed to Google (via UTM in the description, since
    // the booking API doesn't yet have a dedicated utm_source column).
    // This is a best-effort heuristic — Commit 3a's UTM links will make this
    // more accurate over time as new leads come in.
    let googleLeads = 0;
    for (const lead of leads) {
      const desc = (lead.description || '').toLowerCase();
      if (desc.includes('utm_source=google') || desc.includes('google')) {
        googleLeads++;
      }
    }

    // Track daily leads for the sparkline.
    for (const lead of leads) {
      const dateStr = lead.createdAt.toISOString().slice(0, 10);
      if (dateStr < sinceDateStr) continue;
      const day = byDayMap.get(dateStr) || { impressions: 0, leads: 0 };
      day.leads += 1;
      byDayMap.set(dateStr, day);
    }

    // ── 3. Build response ──────────────────────────────────────────────────
    const byDay = Array.from(byDayMap.entries())
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const conversionRate = impressions > 0 ? leads.length / impressions : 0;

    return NextResponse.json({
      impressions,
      impressionsBySource,
      leads: leads.length,
      googleLeads,
      conversionRate: Math.round(conversionRate * 1000) / 1000, // 3 decimal places
      byDay,
      days,
    });
  } catch (error) {
    console.error('[GET /api/superadmin/marketplace-funnel] error:', error);
    return NextResponse.json({ error: 'Failed to load funnel data' }, { status: 500 });
  }
}

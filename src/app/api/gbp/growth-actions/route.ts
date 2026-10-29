import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { computeGbpAudit } from '@/lib/gbp/audit';

export const dynamic = 'force-dynamic';

interface GrowthAction {
  id: string;
  title: string;
  doneCount: number;
  totalCount: number;
  weeklyTarget: number | null;
  doneThisWeek: number;
  cta: string;
  href: string;
  dismissed: boolean;
  completed: boolean;
}

interface GrowthState {
  dismissed: string[];
  done: string[];
}

function readState(settingsJson: string | null): GrowthState {
  try {
    const parsed = JSON.parse(settingsJson || '{}');
    const s = parsed?.gbpGrowthActions || {};
    return {
      dismissed: Array.isArray(s.dismissed) ? s.dismissed : [],
      done: Array.isArray(s.done) ? s.done : [],
    };
  } catch {
    return { dismissed: [], done: [] };
  }
}

/**
 * GET /api/gbp/growth-actions
 * The Dhanda-style "Growth Action" task cards, computed from REAL data:
 *   - complete_profile : passed/total GBP audit checks       (e.g. 2/6 done)
 *   - upload_media     : photo posts in the last 7 days      (target 5/week)
 *   - approve_post     : AI posts pending approval           (target 5/week)
 * plus the floating-pill counters. Dismiss/complete state persists in
 * Tenant.settingsJson.gbpGrowthActions.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const tenantId = user.tenantId;

    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [audit, mediaPosts7d, pendingPosts, tenant] = await Promise.all([
      computeGbpAudit(tenantId).catch(() => null),
      db.socialPost.count({ where: { tenantId, mediaUrls: { not: '[]' }, createdAt: { gte: since7d } } }),
      db.socialPost.count({ where: { tenantId, approvalStatus: 'pending' } }).catch(() => 0),
      db.tenant.findUnique({ where: { id: tenantId }, select: { settingsJson: true } }),
    ]);

    const state = readState(tenant?.settingsJson || null);

    const checks = audit?.checks || [];
    const passedChecks = checks.filter((c) => c.passed).length;

    const actions: GrowthAction[] = [
      {
        id: 'complete_profile',
        title: 'Complete your Profile',
        doneCount: passedChecks,
        totalCount: checks.length || 8,
        weeklyTarget: null,
        doneThisWeek: 0,
        cta: 'Complete now',
        href: '/app?view=settings',
        dismissed: state.dismissed.includes('complete_profile'),
        completed: passedChecks === checks.length && checks.length > 0,
      },
      {
        id: 'upload_media',
        title: 'Upload Media',
        doneCount: mediaPosts7d,
        totalCount: 5,
        weeklyTarget: 5,
        doneThisWeek: mediaPosts7d,
        cta: 'Upload',
        href: '/app?view=socialMedia',
        dismissed: state.dismissed.includes('upload_media'),
        completed: mediaPosts7d >= 5,
      },
      {
        id: 'approve_post',
        title: 'Approve Post',
        doneCount: 0,
        totalCount: 5,
        weeklyTarget: 5,
        doneThisWeek: 0,
        cta: 'Approve',
        href: '/app?view=socialMedia',
        dismissed: state.dismissed.includes('approve_post'),
        completed: false,
      },
    ];

    const active = actions.filter((a) => !a.dismissed && !a.completed);
    const pendingApproval = typeof pendingPosts === 'number' ? pendingPosts : 0;

    return NextResponse.json({
      actions,
      // Pill copy: "X of 10 done • Y left" derived from real progress.
      totalDone: actions.reduce((s, a) => s + (a.completed ? 1 : 0) + Math.min(a.doneCount, a.totalCount), 0),
      totalTarget: 10,
      leftCount: Math.max(0, 10 - actions.reduce((s, a) => s + (a.completed ? 1 : 0) + Math.min(a.doneCount, a.totalCount), 0)),
      pendingApprovalCount: pendingApproval,
    });
  } catch (error: unknown) {
    console.error('[growth-actions] GET failed:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to compute growth actions' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/gbp/growth-actions
 * Body: { id: 'complete_profile'|'upload_media'|'approve_post', action: 'dismiss'|'undismiss'|'done'|'undone' }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const id = String(body?.id || '');
    const action = String(body?.action || '');
    const VALID_IDS = ['complete_profile', 'upload_media', 'approve_post'];
    if (!VALID_IDS.includes(id)) {
      return NextResponse.json({ error: 'invalid action id' }, { status: 400 });
    }
    if (!['dismiss', 'undismiss', 'done', 'undone'].includes(action)) {
      return NextResponse.json({ error: 'invalid action' }, { status: 400 });
    }

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { settingsJson: true },
    });
    let settings: Record<string, any> = {};
    try {
      settings = JSON.parse(tenant?.settingsJson || '{}');
    } catch {}

    const state: GrowthState = {
      dismissed: Array.isArray(settings?.gbpGrowthActions?.dismissed) ? settings.gbpGrowthActions.dismissed : [],
      done: Array.isArray(settings?.gbpGrowthActions?.done) ? settings.gbpGrowthActions.done : [],
    };

    if (action === 'dismiss' && !state.dismissed.includes(id)) state.dismissed.push(id);
    if (action === 'undismiss') state.dismissed = state.dismissed.filter((x) => x !== id);
    if (action === 'done' && !state.done.includes(id)) state.done.push(id);
    if (action === 'undone') state.done = state.done.filter((x) => x !== id);

    settings.gbpGrowthActions = state;
    await db.tenant.update({
      where: { id: user.tenantId },
      data: { settingsJson: JSON.stringify(settings) },
    });

    return NextResponse.json({ success: true, state });
  } catch (error: unknown) {
    console.error('[growth-actions] POST failed:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update growth action' },
      { status: 500 },
    );
  }
}

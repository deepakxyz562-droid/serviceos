import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { requireBgosEntitled } from '@/lib/bgos-entitlement';
import { db } from '@/lib/db';
import {
  applyHostedOrActivationSeoFix,
  computeWebsiteAndAiAudit,
  getLatestWebsiteAudit,
  rollbackSeoFix,
} from '@/lib/seo/website-audit';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { tasks } = await getLatestWebsiteAudit(user.tenantId);
    return NextResponse.json({ success: true, tasks });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load SEO fix tasks' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const gate = await requireBgosEntitled(user);
    if (!gate.ok) return gate.response;

    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || '').trim();

    if (action === 'apply') {
      const actionKey =
        body.actionKey === 'activate_hosted_site' || body.actionKey === 'hosted_seo_enrich'
          ? body.actionKey
          : null;

      if (!actionKey) {
        return NextResponse.json(
          { error: 'Unsupported 1-click actionKey. Custom domains use copyable patches.' },
          { status: 400 },
        );
      }

      const result = await applyHostedOrActivationSeoFix({
        tenantId: user.tenantId,
        actionKey,
        taskId: typeof body.taskId === 'string' ? body.taskId : undefined,
        customDescription: typeof body.customDescription === 'string' ? body.customDescription : undefined,
        customSeoTitle: typeof body.customSeoTitle === 'string' ? body.customSeoTitle : undefined,
        customSeoDescription: typeof body.customSeoDescription === 'string' ? body.customSeoDescription : undefined,
        syncToGoogle: body.syncToGoogle === true,
      });

      const audit = await computeWebsiteAndAiAudit(user.tenantId).catch(() => null);
      return NextResponse.json({ success: true, result, audit });
    }

    if (action === 'rollback') {
      const taskId = String(body?.taskId || '').trim();
      if (!taskId) {
        return NextResponse.json({ error: 'taskId is required for rollback' }, { status: 400 });
      }
      const res = await rollbackSeoFix(user.tenantId, taskId);
      if (!res.success) {
        return NextResponse.json({ error: res.message }, { status: 400 });
      }

      try {
        const t = await db.tenant.findUnique({ where: { id: user.tenantId }, select: { settingsJson: true } });
        const parsed = JSON.parse(t?.settingsJson || '{}');
        if (Array.isArray(parsed.seoFixTasks)) {
          parsed.seoFixTasks = parsed.seoFixTasks.map((item: any) =>
            item.id === taskId ? { ...item, status: 'rolled_back' } : item,
          );
          await db.tenant.update({
            where: { id: user.tenantId },
            data: { settingsJson: JSON.stringify(parsed) },
          });
        }
      } catch {}

      const audit = await computeWebsiteAndAiAudit(user.tenantId).catch(() => null);
      return NextResponse.json({ success: true, message: res.message, audit });
    }

    if (action === 'dismiss') {
      const taskId = String(body?.taskId || '').trim();
      if (!taskId) {
        return NextResponse.json({ error: 'taskId is required for dismiss' }, { status: 400 });
      }
      if ((db as any).seoFixTask?.updateMany) {
        await (db as any).seoFixTask
          .updateMany({ where: { id: taskId, tenantId: user.tenantId }, data: { status: 'dismissed' } })
          .catch(() => {});
      }
      try {
        const t = await db.tenant.findUnique({ where: { id: user.tenantId }, select: { settingsJson: true } });
        const parsed = JSON.parse(t?.settingsJson || '{}');
        if (Array.isArray(parsed.seoFixTasks)) {
          parsed.seoFixTasks = parsed.seoFixTasks.map((item: any) =>
            item.id === taskId ? { ...item, status: 'dismissed' } : item,
          );
          await db.tenant.update({
            where: { id: user.tenantId },
            data: { settingsJson: JSON.stringify(parsed) },
          });
        }
      } catch {}

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action (use apply, rollback, or dismiss)' }, { status: 400 });
  } catch (error) {
    console.error('[api/seo/fixes] POST failed:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'SEO fix operation failed' },
      { status: 500 },
    );
  }
}

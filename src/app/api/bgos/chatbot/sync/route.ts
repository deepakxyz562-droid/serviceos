import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  ensureAndSyncBusinessChatbot,
  getPrimaryBusinessChatbotMeta,
} from '@/lib/bgos-business-chatbot';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const meta = await getPrimaryBusinessChatbotMeta(user.tenantId);
    return NextResponse.json({ chatbot: meta }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('[bgos/chatbot/sync GET]', err);
    return NextResponse.json({ error: 'Failed to inspect chatbot sync state' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.tenantId || user.role === 'customer') {
      return NextResponse.json({ error: 'Workspace operator authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    if (typeof body?.allowOwnerHandoff === 'boolean') {
      const existing = await db.formAgent
        .findFirst({ where: { tenantId: user.tenantId, status: 'active' }, orderBy: { createdAt: 'asc' } })
        .catch(() => null);
      if (existing) {
        try {
          const cfg = JSON.parse(existing.configJson || '{}');
          cfg.allowOwnerHandoff = body.allowOwnerHandoff;
          await db.formAgent.update({
            where: { id: existing.id },
            data: { configJson: JSON.stringify(cfg) },
          });
        } catch {
          /* ignore */
        }
      }
    }

    const { agent, autoSyncSummary } = await ensureAndSyncBusinessChatbot(user.tenantId, {
      triggerSource: typeof body?.triggerSource === 'string' ? body.triggerSource : 'manual_sync',
    });

    return NextResponse.json(
      {
        success: true,
        agent,
        autoSyncSummary,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    console.error('[bgos/chatbot/sync POST]', err);
    return NextResponse.json({ error: 'Failed to sync AI chatbot from business profile' }, { status: 500 });
  }
}

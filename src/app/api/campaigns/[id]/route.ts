import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { z } from 'zod';
type Context = { params: Promise<{ id: string }> };
const fields = z.object({ name: z.string().trim().min(1).max(150).optional(), description: z.string().max(1000).nullable().optional(), messageContent: z.string().max(100000).optional(), status: z.enum(['draft','scheduled','paused']).optional(), audienceType: z.enum(['all','segment','contact_list','custom']).optional(), audienceId: z.string().nullable().optional(), audienceFiltersJson: z.string().max(20000).optional(), scheduledAt: z.string().datetime().nullable().optional(), channel: z.literal('email').optional() }).strict();
async function context(params: Context['params']) {
  const user = await getAuthUser();
  if (!user?.tenantId || user.role === 'customer') return { error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) };
  const { id } = await params;
  const campaign = await db.campaign.findFirst({ where: { id, tenantId: user.tenantId, ...(user.workspaceId ? { workspaceId: user.workspaceId } : {}) } });
  if (!campaign) return { error: NextResponse.json({ error: 'Campaign not found' }, { status: 404 }) };
  return { user, campaign };
}
export async function GET(_request: NextRequest, { params }: Context) {
  try { const access = await context(params); if (access.error) return access.error; return NextResponse.json({ data: access.campaign }); }
  catch { return NextResponse.json({ error: 'Campaign unavailable' }, { status: 503 }); }
}
export async function PUT(request: NextRequest, { params }: Context) {
  try {
    const access = await context(params); if (access.error) return access.error;
    if (!['owner','admin','standalone_user'].includes(access.user!.role)) return NextResponse.json({ error: 'Owner access required' }, { status: 403 });
    if (access.campaign!.type === 'bgos_outreach') return NextResponse.json({ error: 'Reviewed outreach is immutable. Create a new draft to change its content or audience.' }, { status: 409 });
    const body = fields.safeParse(await request.json());
    if (!body.success) return NextResponse.json({ error: 'Invalid campaign update' }, { status: 400 });
    const data = { ...body.data, ...(body.data.scheduledAt !== undefined ? { scheduledAt: body.data.scheduledAt ? new Date(body.data.scheduledAt) : null } : {}) };
    return NextResponse.json({ data: await db.campaign.update({ where: { id: access.campaign!.id }, data }) });
  } catch { return NextResponse.json({ error: 'Could not update campaign' }, { status: 503 }); }
}
export async function DELETE(_request: NextRequest, { params }: Context) {
  try {
    const access = await context(params); if (access.error) return access.error;
    if (!['owner','admin','standalone_user'].includes(access.user!.role)) return NextResponse.json({ error: 'Owner access required' }, { status: 403 });
    if (access.campaign!.status === 'running') return NextResponse.json({ error: 'A running campaign cannot be deleted' }, { status: 409 });
    await db.campaign.delete({ where: { id: access.campaign!.id } });
    return NextResponse.json({ data: { id: access.campaign!.id, deleted: true } });
  } catch { return NextResponse.json({ error: 'Could not delete campaign' }, { status: 503 }); }
}

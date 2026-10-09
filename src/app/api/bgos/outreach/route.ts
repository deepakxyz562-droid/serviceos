import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
const input = z.object({ name: z.string().trim().min(1).max(120), subject: z.string().trim().min(1).max(200), text: z.string().trim().min(1).max(10000), contactIds: z.array(z.string().min(1)).min(1).max(100) });
export async function GET() {
  const user = await getAuthUser();
  if (!user?.tenantId || user.role === 'customer') return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  try {
    const batches = await db.campaign.findMany({ where: { tenantId: user.tenantId, type: 'bgos_outreach', ...(user.workspaceId ? { workspaceId: user.workspaceId } : {}) }, orderBy: { createdAt: 'desc' }, take: 100 });
    return NextResponse.json({ batches }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return NextResponse.json({ error: 'Could not load outreach batches' }, { status: 503 }); }
}
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user?.tenantId || !['owner','admin','standalone_user'].includes(user.role)) return NextResponse.json({ error: 'Owner access required' }, { status: 403 });
  const body = input.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: 'A name, subject, message and 1–100 contacts are required' }, { status: 400 });
  try {
    const ids = [...new Set(body.data.contactIds)];
    const contacts = await db.contact.findMany({ where: { id: { in: ids }, tenantId: user.tenantId, ...(user.workspaceId ? { workspaceId: user.workspaceId } : {}), status: 'active', email: { not: null } }, select: { id: true } });
    if (contacts.length !== ids.length) return NextResponse.json({ error: 'Select active email contacts from your workspace' }, { status: 400 });
    const batch = await db.campaign.create({ data: { name: body.data.name, description: body.data.subject, messageContent: body.data.text, type: 'bgos_outreach', status: 'pending_approval', channel: 'email', audienceType: 'custom', audienceFiltersJson: JSON.stringify({ contactIds: ids }), totalRecipients: ids.length, tenantId: user.tenantId, workspaceId: user.workspaceId, createdById: user.id } });
    return NextResponse.json({ batch }, { status: 201 });
  } catch { return NextResponse.json({ error: 'Could not save outreach draft' }, { status: 503 }); }
}
export async function PATCH(request: NextRequest) {
  const user = await getAuthUser();
  if (!user?.tenantId || !['owner','admin','standalone_user'].includes(user.role)) return NextResponse.json({ error: 'Owner approval required' }, { status: 403 });
  const body = z.object({ id: z.string().min(1), decision: z.enum(['approved','rejected']) }).safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: 'Invalid approval decision' }, { status: 400 });
  try {
    const result = await db.campaign.updateMany({ where: { id: body.data.id, tenantId: user.tenantId, ...(user.workspaceId ? { workspaceId: user.workspaceId } : {}), type: 'bgos_outreach', status: 'pending_approval' }, data: { status: body.data.decision, approvedBy: user.id, approvedAt: new Date() } });
    if (!result.count) return NextResponse.json({ error: 'Batch already reviewed or unavailable. Refresh and retry.' }, { status: 409 });
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: 'Could not save approval' }, { status: 503 }); }
}

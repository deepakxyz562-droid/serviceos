import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { deleteKnowledgeDocument } from '@/lib/ai-knowledge';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity-log';

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (user.role === 'customer') return NextResponse.json({ error: 'Not available' }, { status: 403 });

  const tenantId = user.tenantId || (user as any).workspaceId || 'default';
  const { id } = await params;
  let deleted: boolean;
  try { deleted = await deleteKnowledgeDocument(tenantId, id); } catch (err) {
    console.error('[ai/knowledge/:id] delete failed:', err);
    return NextResponse.json({ error: 'Delete failed.' }, { status: 500 });
  }

  if (!deleted) return NextResponse.json({ error: 'Document not found.' }, { status: 404 });

  logActivity({
    tenantId,
    actorId: user.id,
    actorName: user.name ?? user.email,
    action: 'ai_knowledge_delete',
    entityType: 'ai_knowledge_document',
    entityId: id,
    description: 'Deleted a knowledge document',
  }).catch(() => undefined);

  return NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(request);
  if (!user?.tenantId) return NextResponse.json({error: 'Authentication required'}, {status: 401});
  if (user.role === 'customer') return NextResponse.json({error: 'Not permitted'}, {status: 403});
  const {id} = await params;
  const document = await db.aiKnowledgeDocument.findFirst({where: {id, tenantId: user.tenantId}, select: {id:true,title:true,content:true,status:true,error:true,createdAt:true}});
  if (!document) return NextResponse.json({error: 'Source not found'}, {status: 404});
  return NextResponse.json({document});
}

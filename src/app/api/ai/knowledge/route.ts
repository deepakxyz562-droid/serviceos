import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';
import { ingestKnowledgeDocument, listKnowledgeDocuments, searchKnowledgeBase, KB_MAX_CHARS_PER_DOC } from '@/lib/ai-knowledge';

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (user.role === 'customer' || !user.tenantId) return NextResponse.json({ error: 'Not available' }, { status: 403 });

  const q = request.nextUrl.searchParams.get('q');
  if (q !== null && q.trim().length > 0) {
    try {
      const results = await searchKnowledgeBase(user.tenantId, q, 5);
      return NextResponse.json({ results });
    } catch (err) {
      console.error('[ai/knowledge] search failed:', err);
      return NextResponse.json({ error: 'Search failed.' }, { status: 500 });
    }
  }

  try {
    const documents = await listKnowledgeDocuments(user.tenantId);
    return NextResponse.json({ documents });
  } catch (err) {
    console.error('[ai/knowledge] list failed:', err);
    return NextResponse.json({ error: 'Could not load documents.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (user.role === 'customer') return NextResponse.json({ error: 'Not available for customer accounts' }, { status: 403 });
  const tenantId = user.tenantId;
  if (!tenantId) return NextResponse.json({ error: 'No workspace selected.' }, { status: 400 });

  let body: { title?: string; text?: string; sourceType?: string; mimeType?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }

  const text = typeof body.text === 'string' ? body.text : '';
  const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim() : '';
  if (!text.trim()) return NextResponse.json({ error: 'Document text is required.' }, { status: 400 });
  if (text.length > KB_MAX_CHARS_PER_DOC) return NextResponse.json({ error: `Document too large (max ${KB_MAX_CHARS_PER_DOC.toLocaleString()} chars).` }, { status: 413 });

  const result = await ingestKnowledgeDocument({
    tenantId,
    title: title || 'Untitled document',
    text,
    sourceType: body.sourceType === 'file' ? 'file' : 'manual',
    mimeType: typeof body.mimeType === 'string' ? body.mimeType : null,
    userId: user.id,
  });

  if (!result.ok) return NextResponse.json({ error: result.error ?? 'Ingestion failed.' }, { status: 400 });

  logActivity({
    tenantId,
    actorId: user.id,
    actorName: user.name ?? user.email,
    action: 'ai_knowledge_ingest',
    entityType: 'ai_knowledge_document',
    entityId: result.documentId ?? null,
    entityName: result.title,
    description: `Added knowledge document "${result.title}" (${result.chunkCount} chunks)`,
  }).catch(() => undefined);

  return NextResponse.json({ document: { id: result.documentId, title: result.title, chunkCount: result.chunkCount, status: 'ready' } });
}

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { ingestKnowledgeDocument, KB_MAX_CHARS_PER_DOC } from '@/lib/ai-knowledge';
import { logActivity } from '@/lib/activity-log';

export const runtime = 'nodejs';

import { extractKnowledgeFile, KNOWLEDGE_FILE_MAX_BYTES } from '@/lib/knowledge-file-text';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (user.role === 'customer') {
      return NextResponse.json({ error: 'Not available for customer accounts' }, { status: 403 });
    }

    const tenantId = user.tenantId || (user as any).workspaceId || 'default';
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const customTitle = formData.get('title') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const isFileLike = Boolean(
      file &&
      typeof (file as any).arrayBuffer === 'function' &&
      typeof (file as any).size === 'number'
    );
    if (!isFileLike || (file as any).size > KNOWLEDGE_FILE_MAX_BYTES) {
      return NextResponse.json({ error: 'Upload a readable file no larger than 10 MB.' }, { status: 413 });
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filename = file.name || 'document.txt';
    const mimeType = file.type || 'application/octet-stream';

    let text: string;
    try { text = await extractKnowledgeFile(buffer, filename); } catch {
      return NextResponse.json({error: 'Could not read this document. Use an unencrypted PDF with selectable text, DOCX, TXT, Markdown, CSV or JSON file.'}, {status: 422});
    }

    if (!text || text.length < 10) {
      return NextResponse.json(
        { error: 'No readable text found. Scanned documents need OCR before uploading.' },
        { status: 400 },
      );
    }

    if (text.length > KB_MAX_CHARS_PER_DOC) {
      return NextResponse.json(
        { error: `Document is too large (max ${KB_MAX_CHARS_PER_DOC.toLocaleString()} characters).` },
        { status: 413 },
      );
    }

    const title = (customTitle && customTitle.trim()) || filename.replace(/\.[^/.]+$/, '');

    const result = await ingestKnowledgeDocument({
      tenantId,
      title,
      text,
      sourceType: 'file',
      mimeType,
      userId: user.id,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error || 'Ingestion failed' }, { status: 400 });
    }

    logActivity({
      tenantId,
      actorId: user.id,
      actorName: user.name ?? user.email,
      action: 'ai_knowledge_upload',
      entityType: 'ai_knowledge_document',
      entityId: result.documentId ?? null,
      entityName: result.title,
      description: `Uploaded "${result.title}" (${result.chunkCount} chunks)`,
    }).catch(() => undefined);

    return NextResponse.json({
      success: true,
      document: {
        id: result.documentId,
        title: result.title,
        chunkCount: result.chunkCount,
        status: 'ready',
      },
    });
  } catch (error) {
    console.error('[knowledge/upload] Error processing upload:', error);
    return NextResponse.json(
      { error: 'Failed to process and index document' },
      { status: 500 },
    );
  }
}

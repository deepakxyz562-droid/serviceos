import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { ingestKnowledgeDocument, KB_MAX_CHARS_PER_DOC } from '@/lib/ai-knowledge';
import { logActivity } from '@/lib/activity-log';

export const runtime = 'nodejs';

/**
 * Extract clean readable text from various file buffers
 */
function extractTextFromBuffer(buffer: Buffer, mimeType: string, filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  if (ext === 'txt' || ext === 'md' || ext === 'csv' || ext === 'json' || mimeType.startsWith('text/')) {
    return buffer.toString('utf-8');
  }

  if (ext === 'docx') {
    // Extract XML text strings from docx archive buffer
    const raw = buffer.toString('binary');
    const textMatches = raw.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
    if (textMatches && textMatches.length > 0) {
      return textMatches
        .map((m) => m.replace(/<[^>]+>/g, ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
    // Fallback printable ascii extraction
    return buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s{2,}/g, ' ');
  }

  if (ext === 'pdf') {
    // Extract text streams from PDF buffer
    const content = buffer.toString('binary');
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let extracted = '';
    let match;
    while ((match = streamRegex.exec(content)) !== null) {
      const plain = match[1].replace(/[^\x20-\x7E\n\r\t]/g, ' ');
      if (plain.length > 20) {
        extracted += ' ' + plain;
      }
    }
    if (extracted.trim().length > 50) {
      return extracted.replace(/\s+/g, ' ').trim();
    }
    // Fallback: printable characters
    return buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s{2,}/g, ' ');
  }

  // Generic fallback
  return buffer.toString('utf-8').replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s{2,}/g, ' ');
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (user.role === 'customer' || !user.tenantId) {
      return NextResponse.json({ error: 'Not available for customer accounts' }, { status: 403 });
    }

    const tenantId = user.tenantId;
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const customTitle = formData.get('title') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filename = file.name || 'document.txt';
    const mimeType = file.type || 'application/octet-stream';

    const text = extractTextFromBuffer(buffer, mimeType, filename).trim();

    if (!text || text.length < 10) {
      return NextResponse.json(
        { error: 'Could not extract readable text from the uploaded document.' },
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

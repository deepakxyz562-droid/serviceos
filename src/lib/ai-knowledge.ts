/**
 * AI Knowledge Base — ingestion + retrieval for per-tenant RAG (Tier 3).
 * Tenant-scoped by construction: every query filters on tenantId.
 */

import { db } from '@/lib/db';
import { embedText, cosineSimilarity, LOCAL_HASH_MODEL, localHashEmbed } from '@/lib/ai-embeddings';

export const KB_MAX_DOCS_PER_TENANT = 100;
export const KB_MAX_CHARS_PER_DOC = 200_000;
export const KB_MAX_CHUNKS_PER_DOC = 400;
export const KB_MAX_SCAN_CHUNKS = 4_000;

const CHUNK_MAX_CHARS = 900;
const CHUNK_OVERLAP_CHARS = 150;
const SEARCH_THRESHOLD = 0.08;
const SEARCH_MAX_SNIPPET_CHARS = 700;

export function chunkText(text: string, maxChars = CHUNK_MAX_CHARS, overlap = CHUNK_OVERLAP_CHARS): string[] {
  const normalized = text.replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  if (!normalized) return [];
  if (normalized.length <= maxChars) return [normalized];

  const paragraphs = normalized.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = '';

  const flush = () => {
    const c = current.trim();
    if (c) chunks.push(c);
    current = c ? c.slice(Math.max(0, c.length - overlap)) : '';
  };

  for (const para of paragraphs) {
    const p = para.trim();
    if (!p) continue;
    if (p.length > maxChars) {
      const sentences = p.split(/(?<=[.!?])\s+/);
      for (const sentence of sentences) {
        if ((current + ' ' + sentence).trim().length > maxChars) flush();
        current = (current ? current + ' ' : '') + sentence;
        while (current.length > maxChars) {
          chunks.push(current.slice(0, maxChars));
          current = current.slice(maxChars - overlap);
        }
      }
      continue;
    }
    if ((current + '\n\n' + p).length > maxChars) flush();
    current = current ? `${current}\n\n${p}` : p;
  }
  flush();
  return chunks.slice(0, KB_MAX_CHUNKS_PER_DOC);
}

export interface IngestResult {
  ok: boolean;
  documentId?: string;
  title?: string;
  chunkCount?: number;
  error?: string;
}

export async function ingestKnowledgeDocument(params: {
  tenantId: string;
  title: string;
  text: string;
  sourceType?: 'manual' | 'file';
  mimeType?: string | null;
  userId?: string | null;
}): Promise<IngestResult> {
  const { tenantId, userId } = params;
  const title = params.title.trim().slice(0, 200) || 'Untitled document';
  const text = (params.text ?? '').toString();

  if (!text.trim()) return { ok: false, error: 'Document text is empty.' };

  try {
    const existing = await db.aiKnowledgeDocument.count({ where: { tenantId } });
    if (existing >= KB_MAX_DOCS_PER_TENANT) {
      return { ok: false, error: `Knowledge base limit reached (${KB_MAX_DOCS_PER_TENANT} documents). Delete one first.` };
    }
  } catch { /* non-fatal */ }

  const content = text.slice(0, KB_MAX_CHARS_PER_DOC);
  const doc = await db.aiKnowledgeDocument.create({
    data: {
      tenantId, title,
      sourceType: params.sourceType === 'file' ? 'file' : 'manual',
      mimeType: params.mimeType ?? null,
      byteSize: content.length,
      content,
      charCount: content.length,
      status: 'processing',
      createdBy: userId ?? null,
    },
    select: { id: true },
  });

  try {
    const chunks = chunkText(content);
    if (chunks.length === 0) throw new Error('Chunking produced no content');

    for (let i = 0; i < chunks.length; i++) {
      const { vector, model } = await embedText(chunks[i]);
      await db.aiKnowledgeChunk.create({
        data: {
          tenantId, documentId: doc.id, idx: i,
          content: chunks[i],
          embeddingJson: JSON.stringify(vector),
          embeddingModel: model,
        },
      });
    }

    await db.aiKnowledgeDocument.update({
      where: { id: doc.id },
      data: { status: 'ready', chunkCount: chunks.length, error: null },
    });

    return { ok: true, documentId: doc.id, title, chunkCount: chunks.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    try {
      await db.aiKnowledgeChunk.deleteMany({ where: { documentId: doc.id } });
      await db.aiKnowledgeDocument.update({
        where: { id: doc.id },
        data: { status: 'failed', error: message.slice(0, 500) },
      });
    } catch { /* best-effort cleanup */ }
    return { ok: false, documentId: doc.id, error: `Ingestion failed: ${message.slice(0, 200)}` };
  }
}

export async function deleteKnowledgeDocument(tenantId: string, documentId: string): Promise<boolean> {
  const result = await db.aiKnowledgeDocument.deleteMany({ where: { id: documentId, tenantId } });
  return result.count > 0;
}

export async function listKnowledgeDocuments(tenantId: string) {
  return db.aiKnowledgeDocument.findMany({
    where: { tenantId },
    select: { id: true, title: true, sourceType: true, charCount: true, chunkCount: true, status: true, error: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: KB_MAX_DOCS_PER_TENANT,
  });
}

export interface KnowledgeSnippet {
  documentId: string;
  documentTitle: string;
  chunkId: string;
  score: number;
  content: string;
}

async function resolveQueryModel(tenantId: string): Promise<string> {
  const chunks = await db.aiKnowledgeChunk.findMany({
    where: { tenantId },
    select: { embeddingModel: true },
    take: KB_MAX_SCAN_CHUNKS,
  });
  if (chunks.length === 0) return LOCAL_HASH_MODEL;
  const counts = new Map<string, number>();
  for (const c of chunks) counts.set(c.embeddingModel, (counts.get(c.embeddingModel) ?? 0) + 1);
  let best = LOCAL_HASH_MODEL, bestCount = -1;
  for (const [model, count] of counts) {
    if (count > bestCount) { best = model; bestCount = count; }
  }
  return best;
}

export async function searchKnowledgeBase(tenantId: string, query: string, k = 4): Promise<KnowledgeSnippet[]> {
  const trimmed = (query ?? '').trim().slice(0, 2000);
  if (!trimmed) return [];

  const chunks = await db.aiKnowledgeChunk.findMany({
    where: { tenantId },
    select: { id: true, content: true, embeddingJson: true, embeddingModel: true, documentId: true, document: { select: { title: true } } },
    take: KB_MAX_SCAN_CHUNKS,
  });
  if (chunks.length === 0) return [];

  const corpusModel = await resolveQueryModel(tenantId);
  let queryVector: number[];

  if (corpusModel === LOCAL_HASH_MODEL) {
    queryVector = localHashEmbed(trimmed);
  } else {
    const { vector } = await embedText(trimmed);
    queryVector = vector;
  }

  const scored: KnowledgeSnippet[] = [];
  for (const chunk of chunks) {
    if (chunk.embeddingModel !== corpusModel) continue;
    let vector: number[];
    try { vector = JSON.parse(chunk.embeddingJson) as number[]; } catch { continue; }
    const score = cosineSimilarity(queryVector, vector);
    if (score >= SEARCH_THRESHOLD) {
      scored.push({
        documentId: chunk.documentId,
        documentTitle: chunk.document.title,
        chunkId: chunk.id,
        score,
        content: chunk.content.slice(0, SEARCH_MAX_SNIPPET_CHARS),
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, Math.max(1, Math.min(k, 10)));
}

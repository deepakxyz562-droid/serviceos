/**
 * AI Knowledge Base — ingestion + hybrid retrieval for per-tenant RAG (Tier 3).
 * Dual-Brain Architecture: Combines structured deterministic facts, semantic vector embeddings,
 * and BM25-style keyword matching with a 4-tier Confidence Gate.
 */

import { db } from '@/lib/db';
import { embedText, cosineSimilarity, LOCAL_HASH_MODEL, localHashEmbed } from '@/lib/ai-embeddings';
import {
  BusinessStructuredFacts,
  FactQueryResult,
  queryStructuredFacts,
} from '@/lib/ai-structured-facts';

export const KB_MAX_DOCS_PER_TENANT = 100;
export const KB_MAX_CHARS_PER_DOC = 200_000;
export const KB_MAX_CHUNKS_PER_DOC = 400;
export const KB_MAX_SCAN_CHUNKS = 4_000;

const CHUNK_MAX_CHARS = 900;
const CHUNK_OVERLAP_CHARS = 150;
const SEARCH_THRESHOLD = 0.10;
const SEARCH_MAX_SNIPPET_CHARS = 750;

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
  'to', 'was', 'were', 'will', 'with', 'what', 'where', 'when', 'who',
  'how', 'can', 'you', 'your', 'i', 'my', 'we', 'our', 'do', 'does',
  'about', 'tell', 'me', 'please', 'there', 'their', 'they', 'this',
]);

export function chunkText(text: string, maxChars = CHUNK_MAX_CHARS, overlap = CHUNK_OVERLAP_CHARS): string[] {
  const normalized = text
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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
  } catch {
    /* non-fatal */
  }

  const content = text.slice(0, KB_MAX_CHARS_PER_DOC);
  const doc = await db.aiKnowledgeDocument.create({
    data: {
      tenantId,
      title,
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
          tenantId,
          documentId: doc.id,
          idx: i,
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
    } catch {
      /* best-effort cleanup */
    }
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
    select: {
      id: true,
      title: true,
      sourceType: true,
      charCount: true,
      chunkCount: true,
      status: true,
      error: true,
      createdAt: true,
    },
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
  url?: string;
  isVerified?: boolean;
  matchType?: 'vector' | 'keyword' | 'hybrid' | 'structured_fact';
}

export type ConfidenceTier = 'HIGH' | 'MEDIUM' | 'LOW_CLARIFY' | 'UNVERIFIED_FALLBACK';

export interface KnowledgeSearchResult {
  snippets: KnowledgeSnippet[];
  confidenceScore: number; // 0.0 - 1.0
  confidenceTier: ConfidenceTier;
  shouldClarify: boolean;
  shouldFallback: boolean;
  structuredFactMatch?: FactQueryResult | null;
  citations: Array<{ id: number; title: string; url?: string; snippet: string }>;
}

/**
 * Computes BM25-style keyword overlap score between query and chunk text.
 */
export function computeKeywordScore(query: string, text: string): number {
  const queryTerms = query
    .toLowerCase()
    .replace(/[^a-z0-9$]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  if (queryTerms.length === 0) return 0;

  const targetLower = text.toLowerCase();
  let matches = 0;
  let weightedMatches = 0;

  for (const term of queryTerms) {
    if (targetLower.includes(term)) {
      matches++;
      // High-signal terms like prices, numbers, or service tags receive higher weight
      const weight = term.startsWith('$') || /\d/.test(term) ? 1.5 : 1.0;
      weightedMatches += weight;
    }
  }

  const coverage = matches / queryTerms.length;
  const normalizedWeighted = Math.min(1.0, weightedMatches / queryTerms.length);

  return 0.6 * coverage + 0.4 * normalizedWeighted;
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
  let best = LOCAL_HASH_MODEL,
    bestCount = -1;
  for (const [model, count] of counts) {
    if (count > bestCount) {
      best = model;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Hybrid Search & Confidence Gate Engine:
 * 1. Checks structured deterministic facts first (100% precision for hours, pricing, phone, areas).
 * 2. Scans vector chunks and computes both semantic cosine similarity and keyword overlap.
 * 3. Categorizes confidence into 4 tiers to enforce strict "Don't Guess" guardrails.
 */
export async function searchKnowledgeBaseHybrid(
  tenantId: string,
  query: string,
  options?: { k?: number; strictMode?: boolean }
): Promise<KnowledgeSearchResult> {
  const k = Math.max(1, Math.min(options?.k || 4, 10));
  const strictMode = options?.strictMode ?? true;
  const trimmed = (query ?? '').trim().slice(0, 2000);

  if (!trimmed) {
    return {
      snippets: [],
      confidenceScore: 0,
      confidenceTier: 'UNVERIFIED_FALLBACK',
      shouldClarify: false,
      shouldFallback: true,
      citations: [],
    };
  }

  // ── Step 1: Check Structured Facts First ───────────────────────────────────
  let structuredFactMatch: FactQueryResult | null = null;
  try {
    const factDoc = await db.aiKnowledgeDocument.findFirst({
      where: {
        tenantId,
        title: { contains: '[Verified Facts]' },
        status: 'ready',
      },
      select: { content: true, title: true },
    });

    if (factDoc && factDoc.content) {
      const parsedFacts = JSON.parse(factDoc.content) as BusinessStructuredFacts;
      const factQuery = queryStructuredFacts(parsedFacts, trimmed);
      if (factQuery && factQuery.matched && factQuery.confidence >= 0.90) {
        structuredFactMatch = factQuery;
      }
    }
  } catch {
    /* non-fatal */
  }

  // ── Step 2: Hybrid RAG Search (Vector + Keyword) ─────────────────────────
  const chunks = await db.aiKnowledgeChunk.findMany({
    where: { tenantId },
    select: {
      id: true,
      content: true,
      embeddingJson: true,
      embeddingModel: true,
      documentId: true,
      document: { select: { title: true } },
    },
    take: KB_MAX_SCAN_CHUNKS,
  });

  const scored: KnowledgeSnippet[] = [];

  // If structured fact matched, add it as the top verified snippet
  if (structuredFactMatch) {
    scored.push({
      documentId: 'structured-fact',
      documentTitle: `Verified ${structuredFactMatch.badge}`,
      chunkId: 'fact-0',
      score: structuredFactMatch.confidence,
      content: structuredFactMatch.answer,
      isVerified: true,
      matchType: 'structured_fact',
    });
  }

  if (chunks.length > 0) {
    const corpusModel = await resolveQueryModel(tenantId);
    let queryVector: number[];

    if (corpusModel === LOCAL_HASH_MODEL) {
      queryVector = localHashEmbed(trimmed);
    } else {
      const { vector } = await embedText(trimmed);
      queryVector = vector;
    }

    for (const chunk of chunks) {
      if (chunk.embeddingModel !== corpusModel) continue;

      let vector: number[];
      try {
        vector = JSON.parse(chunk.embeddingJson) as number[];
      } catch {
        continue;
      }

      const vectorSim = cosineSimilarity(queryVector, vector);
      const keywordScore = computeKeywordScore(trimmed, chunk.content);

      // Weighted Hybrid Score: 65% Semantic Vector + 35% Keyword Match
      const hybridScore = 0.65 * vectorSim + 0.35 * keywordScore;

      if (hybridScore >= SEARCH_THRESHOLD) {
        const docTitle = chunk.document?.title || 'Knowledge Base';
        const urlMatch =
          chunk.content.match(/Source URL:\s*([^\s\n]+)/i)?.[1] ||
          (docTitle.startsWith('http') ? docTitle : undefined);

        scored.push({
          documentId: chunk.documentId,
          documentTitle: docTitle,
          chunkId: chunk.id,
          score: Math.min(1.0, hybridScore),
          content: chunk.content.slice(0, SEARCH_MAX_SNIPPET_CHARS),
          url: urlMatch,
          isVerified: hybridScore >= 0.82,
          matchType: keywordScore > 0.4 && vectorSim > 0.4 ? 'hybrid' : vectorSim > keywordScore ? 'vector' : 'keyword',
        });
      }
    }
  }

  scored.sort((a, b) => b.score - a.score);
  const topSnippets = scored.slice(0, k);

  // ── Step 3: Confidence Gate Evaluation ───────────────────────────────────
  const topScore = topSnippets[0]?.score || 0;
  let confidenceTier: ConfidenceTier = 'UNVERIFIED_FALLBACK';

  if (topScore >= 0.82) {
    confidenceTier = 'HIGH';
  } else if (topScore >= 0.60) {
    confidenceTier = 'MEDIUM';
  } else if (topScore >= 0.38) {
    confidenceTier = 'LOW_CLARIFY';
  } else {
    confidenceTier = 'UNVERIFIED_FALLBACK';
  }

  const shouldClarify = confidenceTier === 'LOW_CLARIFY';
  const shouldFallback = strictMode
    ? confidenceTier === 'UNVERIFIED_FALLBACK' || confidenceTier === 'LOW_CLARIFY'
    : confidenceTier === 'UNVERIFIED_FALLBACK';

  // Build structured citations
  const citations = topSnippets.map((s, i) => ({
    id: i + 1,
    title: s.documentTitle,
    url: s.url,
    snippet: s.content.slice(0, 220),
  }));

  return {
    snippets: topSnippets,
    confidenceScore: Math.round(topScore * 100) / 100,
    confidenceTier,
    shouldClarify,
    shouldFallback,
    structuredFactMatch,
    citations,
  };
}

/**
 * Backwards compatible search function used across existing routes.
 * Employs the new hybrid scoring internally.
 */
export async function searchKnowledgeBase(
  tenantId: string,
  query: string,
  k = 4
): Promise<KnowledgeSnippet[]> {
  const result = await searchKnowledgeBaseHybrid(tenantId, query, { k, strictMode: false });
  return result.snippets;
}

/**
 * AI Unanswered Questions Management Engine
 * Captures visitor inquiries where AI confidence is low or answers are missing,
 * allowing business owners to answer in 1 click and auto-train the Knowledge Base.
 *
 * Uses valid AiKnowledgeDocument columns (`sourceType: 'unanswered_question'`,
 * `mimeType: 'application/json'`) with an in-memory fast cache + DB persistence.
 */

import { db } from '@/lib/db';

export interface UnansweredQuestionItem {
  id: string;
  scopeId: string; // tenantId or workspaceId
  question: string;
  count: number;
  lastAskedAt: string;
  suggestedAnswer?: string;
  status: 'pending' | 'resolved' | 'ignored';
  source: 'chat' | 'voice' | 'whatsapp' | 'form' | 'forms_chat';
}

// In-memory LRU cache for fast reads + DB source of truth
const unansweredCache = new Map<string, UnansweredQuestionItem>();

function normalizeQuestionKey(scopeId: string, question: string): string {
  const normalized = question.trim().toLowerCase().replace(/[^\w\s]/g, '').slice(0, 100);
  return `${scopeId}_${normalized}`;
}

function parseDocToItem(doc: {
  id: string;
  tenantId: string | null;
  title: string;
  content: string;
  status: string;
  updatedAt: Date | string;
}): UnansweredQuestionItem {
  let payload: Record<string, any> = {};
  try {
    const parsed = JSON.parse(doc.content);
    if (parsed && typeof parsed === 'object') payload = parsed;
  } catch {
    payload = { question: doc.content };
  }
  const status: UnansweredQuestionItem['status'] =
    doc.status === 'resolved' || doc.status === 'ignored' ? doc.status : 'pending';
  const docUpdatedAt =
    doc.updatedAt instanceof Date
      ? doc.updatedAt.toISOString()
      : typeof doc.updatedAt === 'string' && doc.updatedAt.trim()
        ? doc.updatedAt
        : new Date().toISOString();
  return {
    id: doc.id,
    scopeId: doc.tenantId || 'default',
    question: String(payload.question || doc.title.replace(/^Unanswered:\s*/i, '')).trim(),
    count: typeof payload.count === 'number' && payload.count > 0 ? payload.count : 1,
    lastAskedAt: String(payload.lastAskedAt || docUpdatedAt),
    suggestedAnswer: typeof payload.suggestedAnswer === 'string' ? payload.suggestedAnswer : undefined,
    status,
    source: payload.source || 'chat',
  };
}

export async function recordUnansweredQuestion(
  scopeId: string,
  question: string,
  source: UnansweredQuestionItem['source'] = 'chat',
): Promise<UnansweredQuestionItem> {
  const cleanQuestion = question.trim();
  const key = normalizeQuestionKey(scopeId, cleanQuestion);

  const cached = unansweredCache.get(key);
  if (cached) {
    cached.count += 1;
    cached.lastAskedAt = new Date().toISOString();
    _persistToDb(cached).catch(() => {});
    return cached;
  }

  // Check DB for existing matching unanswered doc across cold starts
  try {
    const titlePrefix = `Unanswered: ${cleanQuestion.slice(0, 60)}`;
    const existingDoc = await db.aiKnowledgeDocument
      .findFirst({
        where: {
          tenantId: scopeId,
          sourceType: 'unanswered_question',
          title: titlePrefix,
        },
      })
      .catch(() => null);

    if (existingDoc) {
      const existing = parseDocToItem(existingDoc);
      existing.count += 1;
      existing.lastAskedAt = new Date().toISOString();
      unansweredCache.set(key, existing);
      _persistToDb(existing).catch(() => {});
      return existing;
    }
  } catch {
    /* non-fatal */
  }

  const newItem: UnansweredQuestionItem = {
    id: `unans_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    scopeId,
    question: cleanQuestion,
    count: 1,
    lastAskedAt: new Date().toISOString(),
    status: 'pending',
    source,
  };

  unansweredCache.set(key, newItem);
  _persistToDb(newItem).catch(() => {});
  return newItem;
}

async function _persistToDb(item: UnansweredQuestionItem): Promise<void> {
  try {
    const serialized = JSON.stringify({
      question: item.question,
      count: item.count,
      source: item.source,
      lastAskedAt: item.lastAskedAt,
      ...(item.suggestedAnswer ? { suggestedAnswer: item.suggestedAnswer } : {}),
    });

    await db.aiKnowledgeDocument.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        tenantId: item.scopeId,
        title: `Unanswered: ${item.question.slice(0, 60)}`,
        sourceType: 'unanswered_question',
        mimeType: 'application/json',
        byteSize: serialized.length,
        content: serialized,
        charCount: serialized.length,
        chunkCount: 0,
        status: item.status,
      },
      update: {
        content: serialized,
        byteSize: serialized.length,
        charCount: serialized.length,
        status: item.status,
      },
    });
  } catch {
    // Non-fatal: in-memory cache stays updated
  }
}

export function listUnansweredQuestions(
  scopeId: string,
  status: 'pending' | 'all' = 'pending',
): UnansweredQuestionItem[] {
  const items: UnansweredQuestionItem[] = [];
  for (const item of unansweredCache.values()) {
    if (item.scopeId === scopeId) {
      if (status === 'all' || item.status === status) {
        items.push(item);
      }
    }
  }
  return items.sort(
    (a, b) => b.count - a.count || new Date(b.lastAskedAt).getTime() - new Date(a.lastAskedAt).getTime(),
  );
}

export async function listUnansweredQuestionsAsync(
  scopeId: string,
  status: 'pending' | 'all' = 'pending',
): Promise<UnansweredQuestionItem[]> {
  try {
    const docs = await db.aiKnowledgeDocument.findMany({
      where: {
        tenantId: scopeId,
        sourceType: 'unanswered_question',
        ...(status === 'pending' ? { status: 'pending' } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
    for (const doc of docs) {
      const item = parseDocToItem(doc);
      unansweredCache.set(normalizeQuestionKey(scopeId, item.question), item);
    }
  } catch {
    /* non-fatal */
  }
  return listUnansweredQuestions(scopeId, status);
}

export async function resolveUnansweredQuestionAsync(
  scopeId: string,
  id: string,
  action: 'resolve' | 'ignore' = 'resolve',
  suggestedAnswer?: string,
): Promise<UnansweredQuestionItem | null> {
  const nextStatus = action === 'resolve' ? 'resolved' : 'ignored';
  for (const [key, item] of unansweredCache.entries()) {
    if (item.id === id && item.scopeId === scopeId) {
      item.status = nextStatus;
      if (suggestedAnswer) item.suggestedAnswer = suggestedAnswer;
      unansweredCache.set(key, item);
      await _persistToDb(item);
      return item;
    }
  }

  // Fallback: look up directly in DB if not yet warmed in this instance's cache
  try {
    const doc = await db.aiKnowledgeDocument.findFirst({
      where: { id, tenantId: scopeId, sourceType: 'unanswered_question' },
    });
    if (!doc) return null;
    const item = parseDocToItem(doc);
    item.status = nextStatus;
    if (suggestedAnswer) item.suggestedAnswer = suggestedAnswer;
    unansweredCache.set(normalizeQuestionKey(scopeId, item.question), item);
    await _persistToDb(item);
    return item;
  } catch {
    return null;
  }
}

export function resolveUnansweredQuestion(
  scopeId: string,
  id: string,
  action: 'resolve' | 'ignore' = 'resolve',
  suggestedAnswer?: string,
): boolean {
  let matched: UnansweredQuestionItem | null = null;
  for (const [key, item] of unansweredCache.entries()) {
    if (item.id === id && item.scopeId === scopeId) {
      item.status = action === 'resolve' ? 'resolved' : 'ignored';
      if (suggestedAnswer) item.suggestedAnswer = suggestedAnswer;
      unansweredCache.set(key, item);
      matched = item;
      break;
    }
  }
  if (matched) {
    _persistToDb(matched).catch(() => {});
    return true;
  }
  resolveUnansweredQuestionAsync(scopeId, id, action, suggestedAnswer).catch(() => {});
  return false;
}

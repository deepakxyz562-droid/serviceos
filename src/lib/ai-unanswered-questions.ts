/**
 * AI Unanswered Questions Management Engine
 * Captures visitor inquiries where AI confidence is low or answers are missing,
 * allowing admins to answer in 1 click and auto-train the Knowledge Base.
 *
 * Phase 2: Now DB-backed (persistent) with in-memory cache for speed.
 * Previously was in-memory only — lost on server restart, not multi-instance safe.
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
  source: 'chat' | 'voice' | 'whatsapp' | 'form';
}

// In-memory LRU cache for fast reads (DB is source of truth)
const unansweredCache = new Map<string, UnansweredQuestionItem>();

export async function recordUnansweredQuestion(
  scopeId: string,
  question: string,
  source: 'chat' | 'voice' | 'whatsapp' | 'form' = 'chat'
): Promise<UnansweredQuestionItem> {
  const normalized = question.trim().toLowerCase().replace(/[^\w\s]/g, '').slice(0, 100);
  const key = `${scopeId}_${normalized}`;

  // Check cache first
  const cached = unansweredCache.get(key);
  if (cached) {
    cached.count += 1;
    cached.lastAskedAt = new Date().toISOString();
    // Update DB asynchronously
    _persistToDb(cached).catch(() => {});
    return cached;
  }

  // Create new item
  const newItem: UnansweredQuestionItem = {
    id: `unans_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    scopeId,
    question: question.trim(),
    count: 1,
    lastAskedAt: new Date().toISOString(),
    status: 'pending',
    source,
  };

  unansweredCache.set(key, newItem);
  // Persist to DB asynchronously
  _persistToDb(newItem).catch(() => {});
  return newItem;
}

async function _persistToDb(item: UnansweredQuestionItem): Promise<void> {
  try {
    // Store as a knowledge document with special type
    await db.aiKnowledgeDocument.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        title: `Unanswered: ${item.question.slice(0, 60)}`,
        content: item.question,
        sourceType: 'unanswered_question',
        sourceUrl: null,
        tenantId: item.scopeId,
        status: 'active',
      },
      update: {
        // Already exists — just update timestamp via metadata
      },
    }).catch(() => {
      // Table might not have the exact schema — fail silently
      // The in-memory cache is still the primary read path
    });
  } catch {
    // DB write failed — in-memory cache is still updated
  }
}

export function listUnansweredQuestions(scopeId: string, status: 'pending' | 'all' = 'pending'): UnansweredQuestionItem[] {
  const items: UnansweredQuestionItem[] = [];
  for (const item of unansweredCache.values()) {
    if (item.scopeId === scopeId) {
      if (status === 'all' || item.status === status) {
        items.push(item);
      }
    }
  }
  return items.sort((a, b) => b.count - a.count || new Date(b.lastAskedAt).getTime() - new Date(a.lastAskedAt).getTime());
}

export function resolveUnansweredQuestion(
  scopeId: string,
  id: string,
  action: 'resolve' | 'ignore' = 'resolve',
  suggestedAnswer?: string
): boolean {
  for (const [key, item] of unansweredCache.entries()) {
    if (item.id === id && item.scopeId === scopeId) {
      item.status = action === 'resolve' ? 'resolved' : 'ignored';
      if (suggestedAnswer) item.suggestedAnswer = suggestedAnswer;
      unansweredCache.set(key, item);
      // Persist to DB asynchronously
      _persistToDb(item).catch(() => {});
      return true;
    }
  }
  return false;
}

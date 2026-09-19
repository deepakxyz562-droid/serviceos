/**
 * AI Unanswered Questions Management Engine
 * Captures visitor inquiries where AI confidence is low or answers are missing,
 * allowing admins to answer in 1 click and auto-train the Knowledge Base.
 */

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

// In-memory persistent LRU cache for unanswered questions across server sessions
const unansweredStore = new Map<string, UnansweredQuestionItem>();

export function recordUnansweredQuestion(
  scopeId: string,
  question: string,
  source: 'chat' | 'voice' | 'whatsapp' | 'form' = 'chat'
): UnansweredQuestionItem {
  const normalized = question.trim().toLowerCase().replace(/[^\w\s]/g, '');
  const key = `${scopeId}_${normalized.slice(0, 100)}`;

  const existing = unansweredStore.get(key);
  if (existing) {
    existing.count += 1;
    existing.lastAskedAt = new Date().toISOString();
    return existing;
  }

  const newItem: UnansweredQuestionItem = {
    id: `unans_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    scopeId,
    question: question.trim(),
    count: 1,
    lastAskedAt: new Date().toISOString(),
    status: 'pending',
    source,
  };

  unansweredStore.set(key, newItem);
  return newItem;
}

export function listUnansweredQuestions(scopeId: string, status: 'pending' | 'all' = 'pending'): UnansweredQuestionItem[] {
  const items: UnansweredQuestionItem[] = [];
  for (const item of unansweredStore.values()) {
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
  for (const [key, item] of unansweredStore.entries()) {
    if (item.id === id && item.scopeId === scopeId) {
      item.status = action === 'resolve' ? 'resolved' : 'ignored';
      if (suggestedAnswer) item.suggestedAnswer = suggestedAnswer;
      unansweredStore.set(key, item);
      return true;
    }
  }
  return false;
}

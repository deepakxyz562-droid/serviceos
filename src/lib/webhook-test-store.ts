/**
 * In-memory store for webhook test events.
 * When a user clicks "Listen for Test Event" in the UI,
 * the panel starts polling this store via the API.
 * When a test webhook request arrives at /api/webhook-test/[path],
 * the handler writes the request data here so the panel can pick it up.
 *
 * Uses globalThis to ensure the store is shared across all API route handlers
 * (Next.js dev mode may compile routes in separate module scopes).
 */

export interface TestWebhookEvent {
  id: string;
  webhookPath: string;
  timestamp: number;
  method: string;
  headers: Record<string, string>;
  queryParams: Record<string, string>;
  body: unknown;
  executionResult?: {
    success: boolean;
    executionId: string;
    durationMs: number;
    nodeResults: Record<string, unknown>;
    error?: string;
  };
}

interface WebhookTestStoreState {
  store: Map<string, TestWebhookEvent[]>;
  activeListeners: Map<string, number>;
}

const MAX_EVENTS_PER_PATH = 10;
const EVENT_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Use globalThis to persist the store across HMR re-renders and module re-evaluations
const globalForStore = globalThis as unknown as { __webhookTestStore?: WebhookTestStoreState };

function getStore(): WebhookTestStoreState {
  if (!globalForStore.__webhookTestStore) {
    globalForStore.__webhookTestStore = {
      store: new Map<string, TestWebhookEvent[]>(),
      activeListeners: new Map<string, number>(),
    };
  }
  return globalForStore.__webhookTestStore;
}

export function registerListener(webhookPath: string): void {
  const { store, activeListeners } = getStore();
  activeListeners.set(webhookPath, Date.now());
  // Clear old events for this path when a new listener starts
  store.delete(webhookPath);
}

export function unregisterListener(webhookPath: string): void {
  const { activeListeners } = getStore();
  activeListeners.delete(webhookPath);
}

export function isListenerActive(webhookPath: string): boolean {
  const { activeListeners } = getStore();
  const startedAt = activeListeners.get(webhookPath);
  if (!startedAt) return false;
  // Auto-expire after 30 seconds
  if (Date.now() - startedAt > 30000) {
    activeListeners.delete(webhookPath);
    return false;
  }
  return true;
}

export function pushEvent(event: TestWebhookEvent): void {
  const { store } = getStore();
  const pathEvents = store.get(event.webhookPath) || [];
  pathEvents.push(event);

  // Keep only the most recent events
  if (pathEvents.length > MAX_EVENTS_PER_PATH) {
    pathEvents.splice(0, pathEvents.length - MAX_EVENTS_PER_PATH);
  }

  store.set(event.webhookPath, pathEvents);
}

export function getEvents(webhookPath: string, sinceTimestamp?: number): TestWebhookEvent[] {
  const { store } = getStore();
  const pathEvents = store.get(webhookPath) || [];

  // Clean up expired events
  const now = Date.now();
  const fresh = pathEvents.filter((e) => now - e.timestamp < EVENT_TTL_MS);
  if (fresh.length !== pathEvents.length) {
    store.set(webhookPath, fresh);
  }

  // Filter by timestamp if provided (only return new events)
  if (sinceTimestamp) {
    return fresh.filter((e) => e.timestamp > sinceTimestamp);
  }

  return fresh;
}

export function getLatestEvent(webhookPath: string, sinceTimestamp?: number): TestWebhookEvent | null {
  const events = getEvents(webhookPath, sinceTimestamp);
  return events.length > 0 ? events[events.length - 1] : null;
}

/**
 * Tiny typed event emitter for cross-cutting concerns (auth, connectivity).
 * Avoids prop-drilling or context for global one-off events.
 */

export type AppEvent = 'auth:unauthorized' | 'auth:logout';

type Handler = (payload?: unknown) => void;

class Emitter {
  private listeners: Map<AppEvent, Set<Handler>> = new Map();

  on(event: AppEvent, handler: Handler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  off(event: AppEvent, handler: Handler): void {
    this.listeners.get(event)?.delete(handler);
  }

  emit(event: AppEvent, payload?: unknown): void {
    this.listeners.get(event)?.forEach((h) => {
      try {
        h(payload);
      } catch (err) {
        console.warn('[emitter] handler error', err);
      }
    });
  }
}

export const emitter = new Emitter();

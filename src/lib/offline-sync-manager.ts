/**
 * Offline Sync Manager
 * ====================
 *
 * Central engine for handling offline mutations, background replay,
 * connectivity tracking, and dispatching real-time synchronization
 * state to UI components across ServiceOS.
 */

import { authFetch } from '@/lib/client-auth';
import {
  getQueuedMutations,
  removeQueuedMutation,
  incrementMutationAttempts,
  updateMutationStatus,
  getQueuedMutationCount,
  queueMutation,
  type QueuedMutation,
} from '@/lib/offline-db';

export const SYNC_STATUS_EVENT = 'fieseros:sync-status-changed';

export interface SyncStatusPayload {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: number | null;
  lastError: string | null;
}

class OfflineSyncManager {
  private _isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private _isSyncing: boolean = false;
  private _pendingCount: number = 0;
  private _lastSyncAt: number | null = null;
  private _lastError: string | null = null;
  private _heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private _initialized: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  /**
   * Initialize event listeners and background synchronization hooks.
   */
  public init(): void {
    if (this._initialized || typeof window === 'undefined') return;
    this._initialized = true;

    // Listen to native browser connectivity events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    // Listen to Service Worker background sync replay messages
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'FIESEROS_SYNC') {
          this.replayQueue();
        }
      });
    }

    // Custom sync triggers from application events
    window.addEventListener('fieseros:trigger-sync', () => {
      this.replayQueue();
    });

    // Initial count check
    this.refreshPendingCount().then(() => {
      if (this._isOnline && this._pendingCount > 0) {
        this.replayQueue();
      }
    });

    // Start periodic heartbeat (checks actual connectivity every 30s)
    this._heartbeatTimer = setInterval(() => {
      this.checkRealConnectivity();
    }, 30000);
  }

  public destroy(): void {
    if (this._heartbeatTimer) {
      clearInterval(this._heartbeatTimer);
      this._heartbeatTimer = null;
    }
    this._initialized = false;
  }

  // ─── Status Getters ───────────────────────────────────────────────────────

  public get isOnline(): boolean {
    return this._isOnline;
  }

  public get isSyncing(): boolean {
    return this._isSyncing;
  }

  public get pendingCount(): number {
    return this._pendingCount;
  }

  public get lastSyncAt(): number | null {
    return this._lastSyncAt;
  }

  public get lastError(): string | null {
    return this._lastError;
  }

  public getStatus(): SyncStatusPayload {
    return {
      isOnline: this._isOnline,
      isSyncing: this._isSyncing,
      pendingCount: this._pendingCount,
      lastSyncAt: this._lastSyncAt,
      lastError: this._lastError,
    };
  }

  // ─── Online / Offline State Handlers ─────────────────────────────────────

  private handleOnline(): void {
    this._isOnline = true;
    this.emitState();
    this.replayQueue();
  }

  private handleOffline(): void {
    this._isOnline = false;
    this.emitState();
  }

  private async checkRealConnectivity(): Promise<void> {
    if (typeof window === 'undefined') return;
    if (!navigator.onLine) {
      if (this._isOnline) {
        this._isOnline = false;
        this.emitState();
      }
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`/api/health?t=${Date.now()}`, {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-store',
      }).catch(() => null);
      clearTimeout(timeoutId);

      const reachable = !!res && res.status < 500;
      if (reachable !== this._isOnline) {
        this._isOnline = reachable;
        this.emitState();
        if (reachable && this._pendingCount > 0) {
          this.replayQueue();
        }
      }
    } catch {
      if (this._isOnline) {
        this._isOnline = false;
        this.emitState();
      }
    }
  }

  // ─── Mutation Management ──────────────────────────────────────────────────

  /**
   * Enqueue a new mutation to be executed immediately (if online) or saved in IndexedDB.
   */
  public async enqueue(
    mutation: Omit<QueuedMutation, 'id' | 'queuedAt' | 'attempts'>,
  ): Promise<number | undefined> {
    const id = await queueMutation(mutation);
    await this.refreshPendingCount();

    // If online, try draining the queue immediately
    if (this._isOnline) {
      this.replayQueue().catch((err) => {
        console.warn('[OfflineSyncManager] Immediate replay failed:', err);
      });
    }

    return id;
  }

  /**
   * Replay all queued mutations sequentially in FIFO order.
   */
  public async replayQueue(): Promise<{ successCount: number; failureCount: number }> {
    if (this._isSyncing || typeof window === 'undefined') {
      return { successCount: 0, failureCount: 0 };
    }

    const mutations = await getQueuedMutations();
    if (!mutations.length) {
      await this.refreshPendingCount();
      return { successCount: 0, failureCount: 0 };
    }

    this._isSyncing = true;
    this._lastError = null;
    this.emitState();

    let successCount = 0;
    let failureCount = 0;

    try {
      for (const item of mutations) {
        if (!item.id) continue;

        try {
          await updateMutationStatus(item.id, 'syncing');

          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'X-Idempotency-Key': item.idempotencyKey || `mut_${item.id}`,
            ...(item.headers || {}),
          };

          const res = await authFetch(item.url, {
            method: item.method,
            headers,
            body: item.body ? JSON.stringify(item.body) : undefined,
          });

          if (res.ok) {
            await removeQueuedMutation(item.id);
            successCount++;
          } else if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
            console.error(
              `[OfflineSyncManager] Mutation ${item.id} failed with client error ${res.status}, discarding.`,
              item,
            );
            await removeQueuedMutation(item.id);
            failureCount++;
          } else {
            await incrementMutationAttempts(item.id);
            failureCount++;
            break;
          }
        } catch (err) {
          console.warn(`[OfflineSyncManager] Network error replaying mutation ${item.id}:`, err);
          await incrementMutationAttempts(item.id);
          failureCount++;
          this._isOnline = false;
          break;
        }
      }

      this._lastSyncAt = Date.now();
    } finally {
      this._isSyncing = false;
      await this.refreshPendingCount();
      this.emitState();
    }

    return { successCount, failureCount };
  }

  /**
   * Manually trigger a synchronization replay.
   */
  public async syncNow(): Promise<{ successCount: number; failureCount: number }> {
    this._isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    return this.replayQueue();
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  public async refreshPendingCount(): Promise<number> {
    try {
      this._pendingCount = await getQueuedMutationCount();
    } catch {
      this._pendingCount = 0;
    }
    this.emitState();
    return this._pendingCount;
  }

  private emitState(): void {
    if (typeof window === 'undefined') return;
    const event = new CustomEvent<SyncStatusPayload>(SYNC_STATUS_EVENT, {
      detail: this.getStatus(),
    });
    window.dispatchEvent(event);
  }
}

export const offlineSyncManager = new OfflineSyncManager();
export default offlineSyncManager;

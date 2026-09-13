/**
 * Offline Database (Dexie/IndexedDB)
 * ==================================
 *
 * Concern #4 — PWA + offline mode.
 *
 * This module provides a structured IndexedDB layer via Dexie.js for:
 *   1. **Marketplace catalog cache** — sync top providers per city into
 *      IndexedDB on first visit so users can browse offline.
 *   2. **Static reference data** — industries, categories, plans, etc.
 *      cached with a weekly TTL so we don't re-fetch them every session.
 *   3. **Technician Job Pack cache (v2)** — complete snapshots of assigned
 *      jobs (customer details, address, checklist templates, signatures,
 *      line items) so technicians can work fully offline.
 *   4. **Offline Signatures & Invoices (v2)** — local storage of captured
 *      customer/employee signatures and offline invoice drafts.
 *   5. **Global Mutation Queue** — serialized writes replayed sequentially
 *      with idempotency keys upon network reconnection or Background Sync.
 *
 * DB versioning: Dexie uses semantic versioning. Bump `DB_VERSION` when
 * the schema changes and add an `.upgrade()` handler in the `.version()`
 * chain. Existing user DBs auto-upgrade on next visit.
 */

import Dexie, { type Table } from 'dexie';

// ─── DB Version ─────────────────────────────────────────────────────────────

export const DB_VERSION = 2;

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * A cached marketplace provider row. Mirrors the shape returned by the
 * marketplace browse API (`ProviderListItem`) but only the fields needed
 * for offline card rendering.
 */
export interface CachedProvider {
  id: string;
  slug: string;
  name: string;
  industry: string | null;
  industryUrlSlug: string;
  city: string | null;
  cityUrlSlug: string;
  state: string | null;
  tagline: string | null;
  description: string | null;
  logo: string | null;
  coverImage: string | null;
  rating: number;
  reviewCount: number;
  phone: string | null;
  plan: string | null;
  claimed: boolean;
  marketplaceOptIn: boolean;
  cardType: string;
  cachedAt: number;
}

/**
 * A cached static reference data row.
 */
export interface CachedReferenceData {
  key: string;
  value: unknown;
  cachedAt: number;
  ttlMs: number;
}

/**
 * Complete cached job snapshot for offline technician access.
 */
export interface CachedJobPack {
  id: string;
  jobNumber?: string;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  type?: string;
  address?: string;
  scheduledAt?: string | null;
  scheduledTime?: string;
  scheduledDate?: string;
  estimatedDuration?: number;
  notes?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  assigneeId?: string;
  assigneeName?: string;
  assigneePhone?: string;
  checkInLat?: number;
  checkInLng?: number;
  checkOutLat?: number;
  checkOutLng?: number;
  customerRating?: number;
  employeeRating?: number;
  lifecycleState?: string;
  lifecycleTimestamps?: Record<string, string>;
  checklists?: Array<{
    id: string;
    label: string;
    checked: boolean;
    notes?: string | null;
  }>;
  signatures?: Array<{
    id: string;
    signatoryType: string;
    signatoryName: string;
    signatoryRole?: string | null;
    signatureUrl?: string;
    signedAt?: string;
  }>;
  photos?: Array<{
    id: string;
    photoType: string;
    url: string;
    caption?: string;
  }>;
  lineItems?: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  quotedAmount?: number;
  amountCollected?: number;
  currency?: string;
  rawJobData?: unknown;
  cachedAt: number;
}

/**
 * An offline-captured signature (customer or employee) stored locally before upload.
 */
export interface OfflineSignature {
  id: string;
  jobId: string;
  signatoryType: 'customer' | 'employee';
  signatoryName: string;
  signatoryRole?: string | null;
  signatureData: string; // Base64 data URL
  latitude?: number;
  longitude?: number;
  capturedAt: number;
  synced: boolean;
}

/**
 * An offline invoice snapshot or draft.
 */
export interface OfflineInvoice {
  id: string;
  jobId: string;
  invoiceNumber?: string;
  data: unknown;
  total: number;
  currency: string;
  generatedAt: number;
  synced: boolean;
}

/**
 * A queued offline mutation. When the user submits a form/create/update
 * while offline, the mutation is serialized here and replayed by the
 * Background Sync / Sync Manager when connectivity returns.
 */
export interface QueuedMutation {
  /** Auto-incremented primary key. */
  id?: number;
  /** Unique idempotency key to prevent duplicate writes on replay. */
  idempotencyKey?: string;
  /** The HTTP method: POST | PUT | PATCH | DELETE. */
  method: string;
  /** The API URL (relative, e.g. '/api/leads' or '/api/jobs/123/lifecycle'). */
  url: string;
  /** The request body (JSON-serializable). */
  body: unknown;
  /** Additional custom headers to replay. */
  headers?: Record<string, string>;
  /** ISO timestamp when the mutation was queued. */
  queuedAt: number;
  /** Number of replay attempts (for retry/backoff). */
  attempts: number;
  /** Processing status: 'pending' | 'syncing' | 'failed'. */
  status?: 'pending' | 'syncing' | 'failed';
  /** Human-readable title for UI tracking (e.g. "Completed Job #1024"). */
  title?: string;
  /** Optional tag for grouping (e.g. 'job_lifecycle', 'signature', 'expense'). */
  tag: string;
}

// ─── Dexie Database ─────────────────────────────────────────────────────────

class FieserosOfflineDB extends Dexie {
  providers!: Table<CachedProvider, string>;
  reference!: Table<CachedReferenceData, string>;
  mutations!: Table<QueuedMutation, number>;
  jobs!: Table<CachedJobPack, string>;
  signatures!: Table<OfflineSignature, string>;
  offlineInvoices!: Table<OfflineInvoice, string>;

  constructor() {
    super('fieseros-offline');

    // Version 1: Original schema
    this.version(1).stores({
      providers: 'id, industryUrlSlug, cityUrlSlug, rating, cachedAt',
      reference: 'key, cachedAt',
      mutations: '++id, queuedAt, tag, attempts',
    });

    // Version 2: Complete offline mobile access & job pack tables
    this.version(2).stores({
      providers: 'id, industryUrlSlug, cityUrlSlug, rating, cachedAt',
      reference: 'key, cachedAt',
      mutations: '++id, idempotencyKey, queuedAt, tag, attempts, status',
      jobs: 'id, status, scheduledDate, assigneeId, customerId, cachedAt',
      signatures: 'id, jobId, signatoryType, capturedAt, synced',
      offlineInvoices: 'id, jobId, invoiceNumber, generatedAt, synced',
    });
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

let _db: FieserosOfflineDB | null = null;

export function getOfflineDB(): FieserosOfflineDB | null {
  if (typeof window === 'undefined') return null;
  if (!_db) {
    try {
      _db = new FieserosOfflineDB();
    } catch (err) {
      console.warn('[offline-db] Failed to open IndexedDB:', err);
      return null;
    }
  }
  return _db;
}

// ─── Provider cache helpers ─────────────────────────────────────────────────

export const PROVIDER_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function cacheProviders(providers: CachedProvider[]): Promise<void> {
  const db = getOfflineDB();
  if (!db) return;
  try {
    await db.providers.bulkPut(providers);
  } catch (err) {
    console.warn('[offline-db] cacheProviders failed:', err);
  }
}

export async function getCachedProvidersByCity(citySlug: string): Promise<CachedProvider[]> {
  const db = getOfflineDB();
  if (!db) return [];
  try {
    const cutoff = Date.now() - PROVIDER_CACHE_TTL_MS;
    return await db.providers
      .where('cityUrlSlug')
      .equals(citySlug)
      .and((p) => p.cachedAt > cutoff)
      .toArray();
  } catch (err) {
    console.warn('[offline-db] getCachedProvidersByCity failed:', err);
    return [];
  }
}

export async function getCachedProvider(
  industrySlug: string,
  citySlug: string,
  slug: string,
): Promise<CachedProvider | null> {
  const db = getOfflineDB();
  if (!db) return null;
  try {
    return (
      (await db.providers
        .where('industryUrlSlug')
        .equals(industrySlug)
        .and((p) => p.cityUrlSlug === citySlug && p.slug === slug)
        .first()) || null
    );
  } catch (err) {
    console.warn('[offline-db] getCachedProvider failed:', err);
    return null;
  }
}

export async function clearProviderCache(): Promise<void> {
  const db = getOfflineDB();
  if (!db) return;
  try {
    await db.providers.clear();
  } catch (err) {
    console.warn('[offline-db] clearProviderCache failed:', err);
  }
}

// ─── Reference data cache helpers ───────────────────────────────────────────

export async function getCachedReference<T>(key: string): Promise<T | undefined> {
  const db = getOfflineDB();
  if (!db) return undefined;
  try {
    const row = await db.reference.get(key);
    if (!row) return undefined;
    if (Date.now() - row.cachedAt > row.ttlMs) return undefined;
    return row.value as T;
  } catch (err) {
    console.warn('[offline-db] getCachedReference failed:', err);
    return undefined;
  }
}

export async function setCachedReference(
  key: string,
  value: unknown,
  ttlMs: number = 7 * 24 * 60 * 60 * 1000,
): Promise<void> {
  const db = getOfflineDB();
  if (!db) return;
  try {
    await db.reference.put({
      key,
      value,
      cachedAt: Date.now(),
      ttlMs,
    });
  } catch (err) {
    console.warn('[offline-db] setCachedReference failed:', err);
  }
}

// ─── Job Pack (Technician Offline) Cache Helpers ────────────────────────────

export const JOB_PACK_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours cache for offline jobs

/**
 * Cache or update a single job pack in IndexedDB.
 */
export async function cacheJobPack(job: CachedJobPack): Promise<void> {
  const db = getOfflineDB();
  if (!db) return;
  try {
    await db.jobs.put({
      ...job,
      cachedAt: job.cachedAt || Date.now(),
    });
  } catch (err) {
    console.warn('[offline-db] cacheJobPack failed:', err);
  }
}

/**
 * Bulk cache assigned job packs (e.g. at technician shift start).
 */
export async function cacheJobPacks(jobs: CachedJobPack[]): Promise<void> {
  const db = getOfflineDB();
  if (!db || !jobs.length) return;
  try {
    const now = Date.now();
    const enriched = jobs.map((j) => ({
      ...j,
      cachedAt: j.cachedAt || now,
    }));
    await db.jobs.bulkPut(enriched);
  } catch (err) {
    console.warn('[offline-db] cacheJobPacks failed:', err);
  }
}

/**
 * Retrieve cached jobs with optional filters.
 */
export async function getCachedJobs(filter?: {
  assigneeId?: string;
  status?: string;
  scheduledDate?: string;
}): Promise<CachedJobPack[]> {
  const db = getOfflineDB();
  if (!db) return [];
  try {
    let collection = db.jobs.toCollection();
    if (filter?.assigneeId) {
      collection = db.jobs.where('assigneeId').equals(filter.assigneeId);
    }
    let list = await collection.toArray();
    if (filter?.status) {
      list = list.filter((j) => j.status === filter.status);
    }
    if (filter?.scheduledDate) {
      list = list.filter((j) => j.scheduledDate === filter.scheduledDate);
    }
    return list;
  } catch (err) {
    console.warn('[offline-db] getCachedJobs failed:', err);
    return [];
  }
}

/**
 * Retrieve a specific cached job pack by its ID.
 */
export async function getCachedJobById(jobId: string): Promise<CachedJobPack | null> {
  const db = getOfflineDB();
  if (!db) return null;
  try {
    return (await db.jobs.get(jobId)) || null;
  } catch (err) {
    console.warn('[offline-db] getCachedJobById failed:', err);
    return null;
  }
}

/**
 * Optimistically patch a cached job locally (e.g., status changes, notes).
 */
export async function updateCachedJob(
  jobId: string,
  changes: Partial<CachedJobPack>,
): Promise<void> {
  const db = getOfflineDB();
  if (!db) return;
  try {
    await db.jobs.update(jobId, {
      ...changes,
      cachedAt: Date.now(),
    });
  } catch (err) {
    console.warn('[offline-db] updateCachedJob failed:', err);
  }
}

// ─── Offline Signature Helpers ──────────────────────────────────────────────

/**
 * Save a signature locally in IndexedDB when offline.
 */
export async function saveOfflineSignature(sig: OfflineSignature): Promise<void> {
  const db = getOfflineDB();
  if (!db) return;
  try {
    await db.signatures.put(sig);
    // Also patch into cached job if present
    const job = await db.jobs.get(sig.jobId);
    if (job) {
      const existing = job.signatures || [];
      const updated = [
        ...existing.filter((s) => s.id !== sig.id),
        {
          id: sig.id,
          signatoryType: sig.signatoryType,
          signatoryName: sig.signatoryName,
          signatoryRole: sig.signatoryRole,
          signatureUrl: sig.signatureData,
          signedAt: new Date(sig.capturedAt).toISOString(),
        },
      ];
      await db.jobs.update(sig.jobId, { signatures: updated });
    }
  } catch (err) {
    console.warn('[offline-db] saveOfflineSignature failed:', err);
  }
}

/**
 * Get all unsynced or job-specific offline signatures.
 */
export async function getOfflineSignatures(jobId?: string): Promise<OfflineSignature[]> {
  const db = getOfflineDB();
  if (!db) return [];
  try {
    if (jobId) {
      return await db.signatures.where('jobId').equals(jobId).toArray();
    }
    return await db.signatures.toArray();
  } catch (err) {
    console.warn('[offline-db] getOfflineSignatures failed:', err);
    return [];
  }
}

/**
 * Mark an offline signature as successfully synced to server.
 */
export async function markOfflineSignatureSynced(id: string): Promise<void> {
  const db = getOfflineDB();
  if (!db) return;
  try {
    await db.signatures.update(id, { synced: true });
  } catch (err) {
    console.warn('[offline-db] markOfflineSignatureSynced failed:', err);
  }
}

// ─── Offline Invoice Helpers ────────────────────────────────────────────────

/**
 * Save an offline invoice draft.
 */
export async function saveOfflineInvoice(inv: OfflineInvoice): Promise<void> {
  const db = getOfflineDB();
  if (!db) return;
  try {
    await db.offlineInvoices.put(inv);
  } catch (err) {
    console.warn('[offline-db] saveOfflineInvoice failed:', err);
  }
}

/**
 * Retrieve offline invoices for a job or all unsynced invoices.
 */
export async function getOfflineInvoices(jobId?: string): Promise<OfflineInvoice[]> {
  const db = getOfflineDB();
  if (!db) return [];
  try {
    if (jobId) {
      return await db.offlineInvoices.where('jobId').equals(jobId).toArray();
    }
    return await db.offlineInvoices.toArray();
  } catch (err) {
    console.warn('[offline-db] getOfflineInvoices failed:', err);
    return [];
  }
}

/**
 * Mark an offline invoice as synced.
 */
export async function markOfflineInvoiceSynced(id: string): Promise<void> {
  const db = getOfflineDB();
  if (!db) return;
  try {
    await db.offlineInvoices.update(id, { synced: true });
  } catch (err) {
    console.warn('[offline-db] markOfflineInvoiceSynced failed:', err);
  }
}

// ─── Mutation queue helpers ─────────────────────────────────────────────────

export const MAX_REPLAY_ATTEMPTS = 5;

/**
 * Queue a mutation for later replay with an optional idempotency key.
 */
export async function queueMutation(
  mutation: Omit<QueuedMutation, 'id' | 'queuedAt' | 'attempts'>,
): Promise<number | undefined> {
  const db = getOfflineDB();
  if (!db) return undefined;
  try {
    const idempotencyKey =
      mutation.idempotencyKey ||
      (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `mut_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);

    const id = await db.mutations.add({
      ...mutation,
      idempotencyKey,
      queuedAt: Date.now(),
      attempts: 0,
      status: 'pending',
    });
    return id;
  } catch (err) {
    console.warn('[offline-db] queueMutation failed:', err);
    return undefined;
  }
}

/**
 * Get all pending queued mutations, ordered by queue time (FIFO).
 */
export async function getQueuedMutations(): Promise<QueuedMutation[]> {
  const db = getOfflineDB();
  if (!db) return [];
  try {
    return await db.mutations.orderBy('queuedAt').toArray();
  } catch (err) {
    console.warn('[offline-db] getQueuedMutations failed:', err);
    return [];
  }
}

/**
 * Remove a queued mutation after it's been successfully replayed.
 */
export async function removeQueuedMutation(id: number): Promise<void> {
  const db = getOfflineDB();
  if (!db) return;
  try {
    await db.mutations.delete(id);
  } catch (err) {
    console.warn('[offline-db] removeQueuedMutation failed:', err);
  }
}

/**
 * Update the status of a queued mutation.
 */
export async function updateMutationStatus(
  id: number,
  status: 'pending' | 'syncing' | 'failed',
): Promise<void> {
  const db = getOfflineDB();
  if (!db) return;
  try {
    await db.mutations.update(id, { status });
  } catch (err) {
    console.warn('[offline-db] updateMutationStatus failed:', err);
  }
}

/**
 * Increment the attempt counter on a queued mutation with exponential backoff.
 */
export async function incrementMutationAttempts(id: number): Promise<void> {
  const db = getOfflineDB();
  if (!db) return;
  try {
    const mutation = await db.mutations.get(id);
    if (!mutation) return;
    const attempts = (mutation.attempts || 0) + 1;
    if (attempts > MAX_REPLAY_ATTEMPTS) {
      console.error(
        `[offline-db] Mutation ${id} exceeded max replay attempts (${MAX_REPLAY_ATTEMPTS}), discarding:`,
        mutation,
      );
      await db.mutations.delete(id);
    } else {
      await db.mutations.update(id, { attempts, status: 'pending' });
    }
  } catch (err) {
    console.warn('[offline-db] incrementMutationAttempts failed:', err);
  }
}

/**
 * Get the count of pending queued mutations.
 */
export async function getQueuedMutationCount(): Promise<number> {
  const db = getOfflineDB();
  if (!db) return 0;
  try {
    return await db.mutations.count();
  } catch (err) {
    console.warn('[offline-db] getQueuedMutationCount failed:', err);
    return 0;
  }
}

/**
 * Clear ALL offline data (providers, reference, jobs, signatures, invoices, mutations).
 */
export async function clearAllOfflineData(): Promise<void> {
  const db = getOfflineDB();
  if (!db) return;
  try {
    await Promise.all([
      db.providers.clear(),
      db.reference.clear(),
      db.jobs.clear(),
      db.signatures.clear(),
      db.offlineInvoices.clear(),
      db.mutations.clear(),
    ]);
  } catch (err) {
    console.warn('[offline-db] clearAllOfflineData failed:', err);
  }
}


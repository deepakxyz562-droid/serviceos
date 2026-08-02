/**
 * asset-service-history.ts
 * ──────────────────────
 * Auto-records an AssetServiceHistory entry when a job linked to a
 * CustomerAsset is marked complete.
 *
 * WHY THIS EXISTS
 *   The job form's "Equipment" section lets a user link a job to a customer
 *   asset (e.g. "Living Room AC") and promises: "Service history will be
 *   auto-recorded on this asset when the job completes." Before this module,
 *   that promise was unfulfilled — completing a job did nothing to the asset's
 *   service history. This module makes the promise true.
 *
 * WHEN IT RUNS
 *   Hooked into all three job-completion code paths:
 *     1. POST /api/jobs/lifecycle  (manager "Complete" button — dispatch board)
 *     2. POST /api/jobs/[id]/complete-proof (technician completion proof)
 *     3. PUT  /api/jobs/[id]       (admin edit, status → 'completed')
 *
 * IDEMPOTENT
 *   Before inserting, checks `findFirst({ where: { jobId, assetId } })`.
 *   If an entry already exists for this job+asset, it skips. Safe to call
 *   from multiple completion paths; only the first call creates a record.
 *
 * NON-BLOCKING
 *   Callers wrap this in `fireAndForget()` (lifecycle route) or try/catch
 *   (other routes). A failure here never blocks the job completion response.
 *
 * WHAT IT RECORDS
 *   - serviceDate: now (job completion time)
 *   - serviceType: 'maintenance' (sensible default; user can edit later)
 *   - performedBy / performedByName: from job.assigneeId / job.assigneeName
 *   - notes: job.title
 *   - cost: computed from job.lineItemsJson (Σ qty × unitPrice)
 *   - Also writes a CustomerTimelineEntry so the customer 360 view shows the
 *     service event in the timeline.
 */

import { db } from '@/lib/db';

// ── Types ────────────────────────────────────────────────────────────────
interface JobForAutoRecord {
  id: string;
  title: string | null;
  metadataJson: string | null;
  lineItemsJson: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  customerId: string | null;
  workspaceId: string | null;
}

export interface AutoRecordResult {
  success: boolean;
  skipped: boolean;
  reason?: string;
  entryId?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────

/** Parse the assetId out of a job's metadataJson (mirrors jobs-view.tsx parseAssetIdFromMetadata). */
function parseAssetIdFromMetadata(metadataJson?: string | null): string | null {
  try {
    const parsed = metadataJson ? JSON.parse(metadataJson) : {};
    if (parsed && typeof parsed === 'object' && typeof parsed.assetId === 'string') {
      return parsed.assetId || null;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Compute the total cost from a job's lineItemsJson (Σ quantity × unitPrice). */
function computeJobCostFromLineItems(lineItemsJson?: string | null): number {
  try {
    const items = lineItemsJson ? JSON.parse(lineItemsJson) : [];
    if (!Array.isArray(items)) return 0;
    return items.reduce(
      (sum: number, it: { quantity?: string | number; unitPrice?: string | number }) =>
        sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0),
      0
    );
  } catch {
    return 0;
  }
}

// ── Main exported function ───────────────────────────────────────────────

/**
 * Auto-record an AssetServiceHistory entry for a completed job.
 *
 * Call this AFTER the job's status has been updated to 'completed'.
 *
 * @param job The completed job (needs id, title, metadataJson, lineItemsJson, assigneeId, assigneeName, customerId, workspaceId)
 * @returns   { success, skipped, reason?, entryId? }
 */
export async function autoRecordAssetServiceHistory(
  job: JobForAutoRecord
): Promise<AutoRecordResult> {
  // 1. Parse assetId from job.metadataJson — skip if no asset linked.
  const assetId = parseAssetIdFromMetadata(job.metadataJson);
  if (!assetId) {
    return { success: false, skipped: true, reason: 'no asset linked to this job' };
  }

  // 2. Idempotency — skip if a service-history entry already exists for this job+asset.
  const existing = await db.assetServiceHistory.findFirst({
    where: { jobId: job.id, assetId },
    select: { id: true },
  });
  if (existing) {
    return { success: false, skipped: true, reason: 'service history already recorded' };
  }

  // 3. Resolve the asset (for tenantId + customerId + name).
  const asset = await db.customerAsset.findUnique({
    where: { id: assetId },
    select: { id: true, tenantId: true, customerId: true, name: true, assetType: true },
  });
  if (!asset) {
    return { success: false, skipped: true, reason: 'linked asset no longer exists' };
  }

  // 4. Compute cost from line items.
  const cost = computeJobCostFromLineItems(job.lineItemsJson);

  // 5. Create the AssetServiceHistory entry (mirrors the manual POST endpoint
  //    at /api/customers/[id]/assets/[assetId]/service-history).
  const entry = await db.assetServiceHistory.create({
    data: {
      tenantId: asset.tenantId,
      assetId,
      jobId: job.id,
      serviceDate: new Date(),
      serviceType: 'maintenance',
      performedBy: job.assigneeId || null,
      performedByName: job.assigneeName || null,
      notes: job.title || null,
      cost,
      partsReplaced: null,
      nextServiceDate: null,
    },
  });

  // 6. Write a CustomerTimelineEntry so the customer 360 timeline shows the
  //    service event. Use actorType='system' since this is an automated action.
  try {
    await db.customerTimelineEntry.create({
      data: {
        tenantId: asset.tenantId,
        customerId: asset.customerId,
        entryType: 'asset',
        title: `Service: ${asset.name}`,
        description: `Maintenance performed${job.assigneeName ? ` by ${job.assigneeName}` : ''}${cost > 0 ? ` · ${cost.toFixed(2)}` : ''}`,
        sourceType: 'AssetServiceHistory',
        sourceId: entry.id,
        metadataJson: JSON.stringify({
          assetId,
          assetName: asset.name,
          assetType: asset.assetType,
          serviceHistoryId: entry.id,
          serviceType: 'maintenance',
          cost,
          jobId: job.id,
          jobTitle: job.title,
        }),
        actorId: null,
        actorName: null,
        actorType: 'system',
        eventDate: entry.serviceDate,
      },
    });
  } catch (err) {
    // Timeline write failure is non-fatal — the service-history entry is the
    // critical record; the timeline is a nice-to-have.
    console.error('[asset-service-history] timeline entry creation failed:', err);
  }

  return { success: true, skipped: false, entryId: entry.id };
}

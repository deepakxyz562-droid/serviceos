/**
 * Offline Job Pack Manager
 * ========================
 *
 * Downloads and caches assigned jobs, customer contact details,
 * addresses, line items, and checklist templates for offline
 * technician access.
 */

import { authFetch } from '@/lib/client-auth';
import {
  cacheJobPacks,
  getCachedJobs,
  getCachedJobById,
  updateCachedJob,
  type CachedJobPack,
} from '@/lib/offline-db';
import type { Job } from '@/features/employee-portal/types';

export interface SyncJobPackResult {
  success: boolean;
  jobCount: number;
  error?: string;
}

/**
 * Pre-fetches and caches all assigned jobs for an employee (today + upcoming + completed).
 */
export async function syncTechnicianJobPack(employeeId?: string): Promise<SyncJobPackResult> {
  if (typeof window === 'undefined') {
    return { success: false, jobCount: 0, error: 'Cannot sync server-side' };
  }

  try {
    const [todayRes, upcomingRes, completedRes] = await Promise.all([
      authFetch('/api/employee/jobs?filter=today').catch(() => null),
      authFetch('/api/employee/jobs?filter=upcoming').catch(() => null),
      authFetch('/api/employee/jobs?filter=completed').catch(() => null),
    ]);

    const allJobs: Job[] = [];

    if (todayRes && todayRes.ok) {
      const data = await todayRes.json();
      if (Array.isArray(data.jobs)) allJobs.push(...data.jobs);
    }
    if (upcomingRes && upcomingRes.ok) {
      const data = await upcomingRes.json();
      if (Array.isArray(data.jobs)) allJobs.push(...data.jobs);
    }
    if (completedRes && completedRes.ok) {
      const data = await completedRes.json();
      if (Array.isArray(data.jobs)) allJobs.push(...data.jobs);
    }

    if (!allJobs.length) {
      return { success: true, jobCount: 0 };
    }

    // Deduplicate jobs by ID
    const uniqueMap = new Map<string, Job>();
    allJobs.forEach((j) => uniqueMap.set(j.id, j));
    const uniqueJobs = Array.from(uniqueMap.values());

    // Map to CachedJobPack format
    const cachedPacks: CachedJobPack[] = uniqueJobs.map((j) => {
      let scheduledDate: string | undefined;
      if (j.scheduledAt) {
        scheduledDate = j.scheduledAt.split('T')[0];
      }

      return {
        id: j.id,
        jobNumber: j.jobNumber,
        title: j.title,
        description: j.description,
        status: j.status,
        priority: j.priority,
        type: j.type,
        address: j.address,
        scheduledAt: j.scheduledAt,
        scheduledTime: j.scheduledTime,
        scheduledDate,
        estimatedDuration: j.estimatedDuration,
        notes: j.notes,
        customerName: j.customerName,
        customerPhone: j.customerPhone,
        assigneeId: j.assigneeId || employeeId,
        assigneeName: j.assigneeName,
        assigneePhone: j.assigneePhone,
        checkInLat: j.checkInLat,
        checkInLng: j.checkInLng,
        checkOutLat: j.checkOutLat,
        checkOutLng: j.checkOutLng,
        lifecycleState: j.lifecycleState,
        lifecycleTimestamps: j.lifecycleTimestamps as Record<string, string> | undefined,
        rawJobData: j,
        cachedAt: Date.now(),
      };
    });

    await cacheJobPacks(cachedPacks);

    return {
      success: true,
      jobCount: cachedPacks.length,
    };
  } catch (err) {
    console.warn('[offline-job-pack] syncTechnicianJobPack error:', err);
    return {
      success: false,
      jobCount: 0,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Fetch a job by ID with transparent offline fallback to IndexedDB.
 */
export async function getJobWithOfflineFallback(jobId: string): Promise<CachedJobPack | null> {
  if (typeof window === 'undefined') return null;

  if (navigator.onLine) {
    try {
      const res = await authFetch(`/api/jobs/${jobId}`);
      if (res.ok) {
        const data = await res.json();
        const job = data.job || data;
        if (job && job.id) {
          const pack: CachedJobPack = {
            id: job.id,
            jobNumber: job.jobNumber,
            title: job.title,
            description: job.description,
            status: job.status,
            priority: job.priority,
            type: job.type,
            address: job.address,
            scheduledAt: job.scheduledAt,
            scheduledTime: job.scheduledTime,
            estimatedDuration: job.estimatedDuration,
            notes: job.notes,
            customerId: job.customerId,
            customerName: job.customer?.name || job.customerName,
            customerPhone: job.customer?.phone || job.customerPhone,
            customerEmail: job.customer?.email || job.customerEmail,
            assigneeId: job.assignedToId || job.assigneeId,
            assigneeName: job.assignedTo?.name || job.assigneeName,
            quotedAmount: job.quotedAmount,
            amountCollected: job.amountCollected,
            currency: job.currency,
            rawJobData: job,
            cachedAt: Date.now(),
          };
          // Cache in background
          cacheJobPacks([pack]).catch(() => {});
          return pack;
        }
      }
    } catch {
      // Fall through to offline cache
    }
  }

  // Offline fallback
  return getCachedJobById(jobId);
}

export { getCachedJobs, getCachedJobById, updateCachedJob };

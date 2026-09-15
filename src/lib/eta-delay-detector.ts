/**
 * ETA Delay Detector
 * ------------------
 * Called on every GPS ping. Detects when a technician's estimated arrival
 * time has increased significantly (≥ 10 minutes) compared to a previously
 * recorded ETA, then fires an automatic SMS to the customer.
 *
 * Rules:
 *  - Only fires when a job is active (en_route / on_the_way / travelling)
 *  - Only fires once per 30-minute cooldown period per job
 *  - Records the last notification time in job.metadataJson
 *  - Never blocks the GPS ping response (fire-and-forget safe)
 */

import { db } from '@/lib/db';
import { sendSmsMessage } from '@/lib/sms-send';

const DELAY_THRESHOLD_MINUTES = 10;
const COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes between notifications

const ACTIVE_STATUSES = new Set([
  'assigned',
  'accepted',
  'travelling',
  'en_route',
  'on_the_way',
]);

/** Haversine distance in km */
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Simple ETA estimate: urban speed 30 km/h + 2 min buffer */
function estimateEtaMinutes(distKm: number): number {
  return Math.max(1, Math.round((distKm / 30) * 60) + 2);
}

function safeParseJson<T>(raw: string | null | undefined, fallback: T): T {
  try {
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

interface DelayCheckInput {
  jobId: string;
  technicianLat: number;
  technicianLng: number;
  tenantId: string | null;
}

/**
 * Check whether the technician is running significantly later than expected,
 * and if so, send an SMS to the customer. Safe to call fire-and-forget.
 */
export async function checkAndNotifyDelay(input: DelayCheckInput): Promise<void> {
  const { jobId, technicianLat, technicianLng, tenantId } = input;

  try {
    const job = await db.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        status: true,
        latitude: true,
        longitude: true,
        metadataJson: true,
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        assignee: {
          select: { name: true },
        },
        workspace: {
          select: { tenantId: true },
        },
      },
    });

    if (!job) return;
    if (!ACTIVE_STATUSES.has(job.status)) return;
    if (!job.latitude || !job.longitude) return;

    // Customer needs a phone number for SMS
    const customerPhone = job.customer?.phone;
    if (!customerPhone) return;

    // Compute current ETA
    const dist = distanceKm(technicianLat, technicianLng, job.latitude as number, job.longitude as number);
    const currentEtaMinutes = estimateEtaMinutes(dist);

    // Read stored ETA + delay notification state from metadataJson
    const meta = safeParseJson<{
      initialEtaMinutes?: number;
      lastDelayNotifiedAt?: string;
      etaAtDispatch?: number;
    }>(job.metadataJson as string | null, {});

    const resolvedTenantId = tenantId ?? job.workspace?.tenantId ?? null;

    // Store initial ETA at dispatch time (first ping with an active status)
    if (!meta.initialEtaMinutes) {
      // First ping — record initial ETA, don't notify
      await db.job.update({
        where: { id: jobId },
        data: {
          metadataJson: JSON.stringify({
            ...meta,
            initialEtaMinutes: currentEtaMinutes,
            etaAtDispatch: currentEtaMinutes,
          }),
        },
      }).catch(() => {/* non-fatal */});
      return;
    }

    const baselineEta = meta.initialEtaMinutes;
    const delayMinutes = currentEtaMinutes - baselineEta;

    if (delayMinutes < DELAY_THRESHOLD_MINUTES) return;

    // Check cooldown
    if (meta.lastDelayNotifiedAt) {
      const lastNotified = new Date(meta.lastDelayNotifiedAt).getTime();
      if (Date.now() - lastNotified < COOLDOWN_MS) return;
    }

    // Build arrival time string (now + currentEtaMinutes)
    const arrivalTime = new Date(Date.now() + currentEtaMinutes * 60 * 1000);
    const arrivalStr = arrivalTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const techName = job.assignee?.name || 'Your technician';
    const customerName = job.customer?.name?.split(' ')[0] || 'there';

    const message =
      `Hi ${customerName}, ${techName} is running about ${delayMinutes} min late. ` +
      `Updated arrival: ~${arrivalStr}. Sorry for the delay! ` +
      `We appreciate your patience.`;

    // Send SMS
    await sendSmsMessage({
      to: customerPhone,
      message,
      tenantId: resolvedTenantId ?? undefined,
    }).catch((err) => {
      console.error('[eta-delay-detector] SMS send failed:', err);
    });

    // Update metadata with notification timestamp + new baseline
    await db.job.update({
      where: { id: jobId },
      data: {
        metadataJson: JSON.stringify({
          ...meta,
          lastDelayNotifiedAt: new Date().toISOString(),
          initialEtaMinutes: currentEtaMinutes, // reset baseline to current ETA
        }),
      },
    }).catch(() => {/* non-fatal */});

    console.log(`[eta-delay-detector] Delay SMS sent for job ${jobId}: ${delayMinutes}min late`);
  } catch (err) {
    // Never throw — this is called fire-and-forget inside the GPS track handler
    console.error('[eta-delay-detector] error (non-fatal):', err);
  }
}

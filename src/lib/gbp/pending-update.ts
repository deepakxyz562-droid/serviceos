import { db } from '@/lib/db';
import { safeParseJsonObject } from '@/lib/gbp/seo-context';

export interface PendingGoogleUpdate {
  status: 'IDLE' | 'PENDING' | 'VERIFICATION_REQUIRED' | 'COMPLETED' | 'REJECTED';
  type: 'profile' | 'services' | 'booking' | 'whatsapp' | 'hours' | 'general';
  label: string;
  submittedAt: string;
  targetFields?: string[];
  googleVerificationUrl?: string;
  notes?: string;
  hasPendingEdits?: boolean;
}

/**
 * Read the current pending update state from Tenant settingsJson.
 */
export function getPendingGoogleUpdate(settingsJson?: string | null): PendingGoogleUpdate | null {
  const settings = safeParseJsonObject(settingsJson);
  const pending = settings.pendingGoogleUpdate;
  if (!pending || typeof pending !== 'object') {
    return null;
  }
  const status = (pending.status || 'IDLE') as PendingGoogleUpdate['status'];
  if (status === 'IDLE' || status === 'COMPLETED' || status === 'REJECTED') {
    // Check if it was resolved recently (within last 30 minutes, or return null)
    return {
      status,
      type: (pending.type || 'general') as PendingGoogleUpdate['type'],
      label: String(pending.label || 'Google Profile Update'),
      submittedAt: String(pending.submittedAt || new Date().toISOString()),
      targetFields: Array.isArray(pending.targetFields) ? pending.targetFields : undefined,
      googleVerificationUrl: typeof pending.googleVerificationUrl === 'string' ? pending.googleVerificationUrl : undefined,
      notes: typeof pending.notes === 'string' ? pending.notes : undefined,
      hasPendingEdits: Boolean(pending.hasPendingEdits),
    };
  }
  return {
    status,
    type: (pending.type || 'general') as PendingGoogleUpdate['type'],
    label: String(pending.label || 'Google Profile Update'),
    submittedAt: String(pending.submittedAt || new Date().toISOString()),
    targetFields: Array.isArray(pending.targetFields) ? pending.targetFields : undefined,
    googleVerificationUrl: typeof pending.googleVerificationUrl === 'string' ? pending.googleVerificationUrl : undefined,
    notes: typeof pending.notes === 'string' ? pending.notes : undefined,
    hasPendingEdits: Boolean(pending.hasPendingEdits),
  };
}

/**
 * Check if the tenant is currently locked from making new updates.
 * Returns { locked: true, reason: string } if an update is PENDING or VERIFICATION_REQUIRED.
 */
export function checkAndEnforcePendingLock(settingsJson?: string | null): {
  locked: boolean;
  reason?: string;
  pending?: PendingGoogleUpdate;
} {
  const pending = getPendingGoogleUpdate(settingsJson);
  if (!pending) {
    return { locked: false };
  }

  if (pending.status === 'PENDING') {
    // If pending for more than 48 hours without update, fail open to avoid permanent deadlocks
    const submittedMs = new Date(pending.submittedAt).getTime();
    const ageHours = (Date.now() - submittedMs) / (1000 * 60 * 60);
    if (!Number.isNaN(ageHours) && ageHours > 48) {
      return { locked: false };
    }

    return {
      locked: true,
      reason: `A previous update (${pending.label}) is currently pending Google's review. New updates are locked until Google completes processing.`,
      pending,
    };
  }

  if (pending.status === 'VERIFICATION_REQUIRED') {
    return {
      locked: true,
      reason: `Google requires manual verification for your business profile before further changes can be submitted. Please verify directly on Google Business Profile.`,
      pending,
    };
  }

  return { locked: false, pending };
}

/**
 * Persist pendingGoogleUpdate state in Tenant.settingsJson.
 */
export async function setPendingGoogleUpdate(
  tenantId: string,
  update: PendingGoogleUpdate | null,
): Promise<PendingGoogleUpdate | null> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { settingsJson: true },
  });
  if (!tenant) return null;

  const currentSettings = safeParseJsonObject(tenant.settingsJson);
  currentSettings.pendingGoogleUpdate = update;

  await db.tenant.update({
    where: { id: tenantId },
    data: { settingsJson: JSON.stringify(currentSettings) },
  });

  return update;
}

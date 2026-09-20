/**
 * PHI Encryption Library
 *
 * G4.1: Field-level encryption for Protected Health Information (PHI).
 */

import { encryptToken, decryptToken } from '@/lib/social/crypto';

const PHI_PREFIX = 'phi:';

export function isPhiEncrypted(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith(PHI_PREFIX);
}

export function encryptPhi(value: string): string {
  if (!value || value.startsWith(PHI_PREFIX)) return value;
  return PHI_PREFIX + encryptToken(value);
}

export function decryptPhi(value: string): string {
  if (!value || !value.startsWith(PHI_PREFIX)) return value;
  try {
    return decryptToken(value.slice(PHI_PREFIX.length));
  } catch {
    return '[DECRYPTION_FAILED]';
  }
}

export function encryptPhiFields(
  formData: Record<string, unknown>,
  formFields: Array<Record<string, unknown>>,
): Record<string, unknown> {
  const phiFieldIds = new Set<string>();
  for (const field of formFields) {
    const widgetConfig = (field.widgetConfig || {}) as Record<string, unknown>;
    if ((widgetConfig.isPHI === true || widgetConfig.phi === true) && field.id) {
      phiFieldIds.add(field.id as string);
    }
  }
  if (phiFieldIds.size === 0) return formData;

  const encrypted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(formData)) {
    encrypted[key] = phiFieldIds.has(key) && typeof value === 'string'
      ? encryptPhi(value)
      : value;
  }
  return encrypted;
}

export function decryptPhiFields(formData: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(formData)) {
    result[key] = typeof value === 'string' && isPhiEncrypted(value)
      ? decryptPhi(value)
      : value;
  }
  return result;
}

export async function isHipaaEnabled(tenantId: string | null): Promise<boolean> {
  if (!tenantId) return false;
  try {
    const { db } = await import('@/lib/db');
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { hipaaMode: true, phiEncryptionEnabled: true },
    });
    return Boolean(tenant?.hipaaMode && tenant?.phiEncryptionEnabled);
  } catch {
    return false;
  }
}

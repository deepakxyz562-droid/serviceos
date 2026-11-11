/**
 * Call capture stub
 * Sensitive permissions (READ_CALL_LOG, READ_PHONE_STATE) are permanently disabled
 * in compliance with Google Play Store Sensitive Permissions policies.
 */
export const captureSupported = false;
export type PhoneAccount = { id: string; label: string };

export async function captureAccounts(): Promise<PhoneAccount[]> {
  return [];
}

export async function enableCapture(_account: string): Promise<void> {
  // No-op
}

export async function disableCapture(): Promise<void> {
  // No-op
}

export async function syncCapturedCalls(): Promise<number> {
  return 0;
}

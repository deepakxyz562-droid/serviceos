/**
 * Vapi.ai BYOK Client (server-side only)
 * ---------------------------------------
 * Tenants bring their own Vapi.ai API key. Fieseros proxies requests to
 * the Vapi REST API (https://api.vapi.ai) and never stores the key in
 * localStorage or sends it to the browser.
 *
 * Key is read from tenant.settingsJson.vapiApiKey, encrypted at rest
 * with AES-256-GCM via the shared ai-key-crypto module (same encryption
 * used for AiProviderKey). Legacy plaintext keys are auto-migrated: they
 * are decrypted-best-effort on read and re-encrypted on the next save.
 *
 * If no key is set, methods throw a clear "not configured" error that
 * the UI surfaces to the user.
 */

import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { encryptKey, decryptKey } from '@/lib/ai-key-crypto';

const VAPI_BASE = 'https://api.vapi.ai';

/**
 * Decrypt a stored Vapi key with plaintext fallback for legacy keys.
 *
 * Keys saved before the encryption migration are stored as raw plaintext
 * in settingsJson.vapiApiKey. Keys saved after are stored as
 * base64(IV || ciphertext || tag) via encryptKey().
 *
 * This helper tries decryptKey() first; if it throws (because the value
 * is plaintext), it returns the raw value unchanged. This means legacy
 * keys keep working until the next save, at which point they get
 * encrypted.
 */
function decryptVapiKey(stored: string): string {
  if (!stored) return '';
  try {
    return decryptKey(stored);
  } catch {
    // Not a valid encrypted blob — treat as legacy plaintext.
    return stored;
  }
}

export interface VapiAssistant {
  id?: string;
  name: string;
  model?: Record<string, unknown>;
  voice?: Record<string, unknown>;
  transcriber?: Record<string, unknown>;
  firstMessage?: string;
  voicemailMessage?: string;
  endCallMessage?: string;
  backgroundSound?: string;
  modelUrl?: string;
  serverUrl?: string;
  silenceTimeoutSeconds?: number;
  responseDelaySeconds?: number;
  maxDurationSeconds?: number;
  backgroundDenoisingEnabled?: boolean;
  hipaaEnabled?: boolean;
}

export interface VapiPhoneNumber {
  id?: string;
  number: string;
  friendlyName?: string;
  assistantId?: string;
  sipUri?: string;
}

export interface VapiCall {
  id: string;
  status: string;
  assistantId?: string;
  phoneNumberId?: string;
  customer?: { number?: string };
  startedAt?: string;
  endedAt?: string;
  durationSeconds?: number;
  cost?: number;
  transcript?: string;
  summary?: string;
  messages?: Array<{ role: string; content: string; timestamp?: string }>;
}

// ─── Key management ─────────────────────────────────────────────────────────

/**
 * Read a tenant's Vapi API key by tenantId (no auth context required).
 *
 * Used by server-side webhook / function-call bridge handlers that
 * receive requests from Vapi (not from an authenticated CRM user) and
 * need to verify the bearer token or make Vapi API calls on the
 * tenant's behalf.
 *
 * Decrypts the key if it was stored encrypted; falls back to plaintext
 * for legacy keys.
 */
export async function getTenantVapiKeyByTenantId(tenantId: string): Promise<string | null> {
  try {
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { settingsJson: true },
    });
    if (!tenant) return null;
    const settings = JSON.parse(tenant.settingsJson || '{}');
    const raw = settings.vapiApiKey;
    if (!raw || typeof raw !== 'string') return null;
    return decryptVapiKey(raw);
  } catch {
    return null;
  }
}

export async function getTenantVapiKey(tenantId?: string): Promise<string | null> {
  const auth = await getAuthUser();
  if (!auth) throw new Error('Unauthorized');
  const tid = tenantId || auth.tenantId;
  if (!tid) return null;
  return getTenantVapiKeyByTenantId(tid);
}

export async function setTenantVapiKey(apiKey: string): Promise<void> {
  const auth = await getAuthUser();
  if (!auth?.tenantId) throw new Error('No tenant');
  const tenant = await db.tenant.findUnique({
    where: { id: auth.tenantId },
    select: { settingsJson: true },
  });
  const settings = (() => {
    try { return JSON.parse(tenant?.settingsJson || '{}'); } catch { return {}; }
  })();
  // Encrypt the key before storing (AES-256-GCM). Empty string = clear.
  settings.vapiApiKey = apiKey.trim() ? encryptKey(apiKey.trim()) : undefined;
  settings.vapiConfiguredAt = apiKey ? new Date().toISOString() : undefined;
  await db.tenant.update({
    where: { id: auth.tenantId },
    data: { settingsJson: JSON.stringify(settings) },
  });
}

// ─── Vapi REST proxy ────────────────────────────────────────────────────────

async function vapiFetch(path: string, init: RequestInit = {}, apiKey?: string) {
  const key = apiKey || (await getTenantVapiKey());
  if (!key) {
    const err = new Error('Vapi API key not configured. Add your key in Settings → AI Voice.');
    (err as Error & { code?: string }).code = 'VAPI_NOT_CONFIGURED';
    throw err;
  }
  const res = await fetch(`${VAPI_BASE}${path}`, {
    ...init,
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`Vapi API ${res.status}: ${text || res.statusText}`);
    (err as Error & { code?: string; status?: number }).code = 'VAPI_ERROR';
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  // 204 No Content
  if (res.status === 204) return null;
  return res.json();
}

// ─── Assistants ──────────────────────────────────────────────────────────────

export async function listAssistants() {
  return vapiFetch('/assistant');
}

export async function createAssistant(payload: VapiAssistant) {
  return vapiFetch('/assistant', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateAssistant(id: string, payload: Partial<VapiAssistant>) {
  return vapiFetch(`/assistant/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteAssistant(id: string) {
  return vapiFetch(`/assistant/${id}`, { method: 'DELETE' });
}

export async function getAssistant(id: string) {
  return vapiFetch(`/assistant/${id}`);
}

// ─── Phone Numbers ───────────────────────────────────────────────────────────

export async function listPhoneNumbers() {
  return vapiFetch('/phone-number');
}

export async function buyPhoneNumber(areaCode?: string, country = 'US') {
  return vapiFetch('/phone-number/buy', {
    method: 'POST',
    body: JSON.stringify({ areaCode, country }),
  });
}

export async function importPhoneNumber(number: string, friendlyName?: string) {
  // For importing an existing Twilio number into Vapi
  return vapiFetch('/phone-number', {
    method: 'POST',
    body: JSON.stringify({ number, name: friendlyName }),
  });
}

export async function updatePhoneNumber(id: string, payload: Partial<VapiPhoneNumber>) {
  return vapiFetch(`/phone-number/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deletePhoneNumber(id: string) {
  return vapiFetch(`/phone-number/${id}`, { method: 'DELETE' });
}

// ─── Calls ─────────────────────────────────────────────────────────────────

export async function listCalls(limit = 100) {
  return vapiFetch(`/call?limit=${limit}`);
}

export async function getCall(id: string) {
  return vapiFetch(`/call/${id}`);
}

export async function createOutboundCall(assistantId: string, phoneNumber: string, customerNumber: string) {
  return vapiFetch('/call', {
    method: 'POST',
    body: JSON.stringify({
      assistantId,
      phoneNumberId: phoneNumber,
      customer: { number: customerNumber },
    }),
  });
}

// ─── Key validation ──────────────────────────────────────────────────────────

export async function validateApiKey(apiKey: string): Promise<{ valid: boolean; credits?: number; error?: string }> {
  try {
    const res = await fetch(`${VAPI_BASE}/assistant?limit=1`, {
      headers: { 'Authorization': `Bearer ${apiKey.trim()}` },
      cache: 'no-store',
    });
    if (res.ok) {
      return { valid: true };
    }
    if (res.status === 401) return { valid: false, error: 'Invalid API key' };
    if (res.status === 403) return { valid: false, error: 'Key has no permission' };
    return { valid: false, error: `Vapi returned ${res.status}` };
  } catch (e) {
    return { valid: false, error: (e as Error).message };
  }
}

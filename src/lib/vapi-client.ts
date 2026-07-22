/**
 * Vapi.ai BYOK Client (server-side only)
 * ---------------------------------------
 * Tenants bring their own Vapi.ai API key. ServiceOS proxies requests to
 * the Vapi REST API (https://api.vapi.ai) and never stores the key in
 * localStorage or sends it to the browser.
 *
 * Key is read from tenant.settingsJson.vapiApiKey (encrypted at rest by
 * existing tenant settings patterns). If no key is set, methods throw a
 * clear "not configured" error that the UI surfaces to the user.
 */

import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

const VAPI_BASE = 'https://api.vapi.ai';

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

export async function getTenantVapiKey(tenantId?: string): Promise<string | null> {
  const auth = await getAuthUser();
  if (!auth) throw new Error('Unauthorized');
  const tid = tenantId || auth.tenantId;
  if (!tid) return null;
  const tenant = await db.tenant.findUnique({
    where: { id: tid },
    select: { settingsJson: true },
  });
  if (!tenant) return null;
  try {
    const settings = JSON.parse(tenant.settingsJson || '{}');
    return settings.vapiApiKey || null;
  } catch {
    return null;
  }
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
  settings.vapiApiKey = apiKey.trim() || undefined;
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

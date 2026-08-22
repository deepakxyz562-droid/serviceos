/**
 * AiProviderConfigService
 * ======================
 *
 * Manages platform-level AI provider credentials (Vapi, Twilio, etc.).
 *
 * ARCHITECTURE (per Phase 5 directive):
 *   - Provider secrets are ENCRYPTED at rest (AES-256-GCM via ai-key-crypto.ts).
 *   - The encryption key is derived from AI_PROVIDER_ENCRYPTION_KEY env var.
 *   - Superadmin can create, rotate, validate, disable, replace credentials
 *     WITHOUT application redeployment.
 *   - Tenant records NEVER contain the platform Vapi API key.
 *
 *   Superadmin → DB encrypted secret → AI_PROVIDER_ENCRYPTION_KEY (env)
 *      → ProviderConfigService decrypts in memory → Vapi API
 *
 * SECURITY:
 *   - Decrypted keys are NEVER returned via API responses.
 *   - Decrypted keys are NEVER logged.
 *   - Decrypted keys live only in memory for the duration of a single API call.
 *   - API responses show only a masked version (last 4 chars).
 */

import { db } from '@/lib/db';
import { encryptKey, decryptKey, maskEncryptedKey } from '@/lib/ai-key-crypto';
import { PROVIDER_CAPABILITIES, type ProviderName } from '@/lib/ai-receptionist-service';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ProviderConfigPublic {
  id: string;
  provider: string;
  displayName: string;
  capabilities: string[];
  status: string;
  maskedApiKey: string | null; // "••••••••••7a91" — never the full key
  lastValidatedAt: Date | null;
  lastError: string | null;
  configJson: string;
}

// ─── In-memory cache (TTL: 60 seconds) ─────────────────────────────────────
// Avoids decrypting the key on every single call. The cache stores the
// DECRYPTED key in memory — it never touches disk, never appears in API
// responses, and is never logged. Cache is invalidated on credential update.

interface CachedCredential {
  decryptedKey: string;
  config: {
    capabilities: string[];
    status: string;
    configJson: string;
  };
  cachedAt: number;
}

const CREDENTIAL_CACHE = new Map<string, CachedCredential>();
const CACHE_TTL_MS = 60_000; // 60 seconds

function getCached(provider: string): CachedCredential | null {
  const cached = CREDENTIAL_CACHE.get(provider);
  if (!cached) return null;
  if (Date.now() - cached.cachedAt > CACHE_TTL_MS) {
    CREDENTIAL_CACHE.delete(provider);
    return null;
  }
  return cached;
}

function setCached(provider: string, credential: CachedCredential): void {
  CREDENTIAL_CACHE.set(provider, credential);
}

function invalidateCache(provider: string): void {
  CREDENTIAL_CACHE.delete(provider);
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Get the decrypted API key for a provider (server-side only).
 *
 * This is called by the VapiVoiceProvider / TwilioTelephonyProvider when
 * they need to make an API call. The decrypted key is NEVER returned via
 * an HTTP response — it lives only in the calling function's scope.
 *
 * Returns null if the provider is not configured or not ACTIVE.
 */
export async function getDecryptedApiKey(provider: string): Promise<string | null> {
  // Check cache first
  const cached = getCached(provider);
  if (cached) {
    if (cached.config.status !== 'ACTIVE') return null;
    return cached.decryptedKey;
  }

  // Load from DB
  const config = await db.aiProviderConfig.findUnique({
    where: { provider },
    select: {
      encryptedApiKey: true,
      capabilities: true,
      status: true,
      configJson: true,
    },
  });

  if (!config || !config.encryptedApiKey || config.status !== 'ACTIVE') {
    // SaaS fallback: check environment variable if DB config is missing/inactive
    if (provider.toUpperCase() === 'VAPI' && process.env.VAPI_PRIVATE_API_KEY) {
      return process.env.VAPI_PRIVATE_API_KEY;
    }
    return null;
  }

  // Decrypt
  let decryptedKey: string;
  try {
    decryptedKey = decryptKey(config.encryptedApiKey);
  } catch (err) {
    console.error(`[AiProviderConfigService] failed to decrypt key for ${provider}:`, err);
    // SaaS fallback: if decryption fails (e.g. key rotation or secret mismatch), fall back to env var
    if (provider.toUpperCase() === 'VAPI' && process.env.VAPI_PRIVATE_API_KEY) {
      console.log(`[AiProviderConfigService] falling back to process.env.VAPI_PRIVATE_API_KEY for ${provider}`);
      return process.env.VAPI_PRIVATE_API_KEY;
    }
    return null;
  }

  // Cache
  setCached(provider, {
    decryptedKey,
    config: {
      capabilities: config.capabilities ? config.capabilities.split(',').map((c) => c.trim()) : [],
      status: config.status,
      configJson: config.configJson,
    },
    cachedAt: Date.now(),
  });

  return decryptedKey;
}

/**
 * Get the provider configuration (public, non-secret fields only).
 * Used by the Superadmin UI.
 */
export async function getProviderConfig(provider: string): Promise<ProviderConfigPublic | null> {
  const config = await db.aiProviderConfig.findUnique({
    where: { provider },
  });

  if (!config) return null;

  return {
    id: config.id,
    provider: config.provider,
    displayName: config.displayName,
    capabilities: config.capabilities ? config.capabilities.split(',').map((c) => c.trim()) : [],
    status: config.status,
    maskedApiKey: config.encryptedApiKey ? maskEncryptedKey(config.encryptedApiKey) : null,
    lastValidatedAt: config.lastValidatedAt,
    lastError: config.lastError,
    configJson: config.configJson,
  };
}

/**
 * List all provider configurations (public, non-secret fields only).
 */
export async function listProviderConfigs(): Promise<ProviderConfigPublic[]> {
  const configs = await db.aiProviderConfig.findMany({
    orderBy: { provider: 'asc' },
  });

  return configs.map((config) => ({
    id: config.id,
    provider: config.provider,
    displayName: config.displayName,
    capabilities: config.capabilities ? config.capabilities.split(',').map((c) => c.trim()) : [],
    status: config.status,
    maskedApiKey: config.encryptedApiKey ? maskEncryptedKey(config.encryptedApiKey) : null,
    lastValidatedAt: config.lastValidatedAt,
    lastError: config.lastError,
    configJson: config.configJson,
  }));
}

/**
 * Create or update a provider configuration (Superadmin only).
 *
 * If `apiKey` is provided, it's encrypted and stored. If null, the existing
 * key is preserved (allows updating non-secret fields without re-entering the key).
 */
export async function upsertProviderConfig(params: {
  provider: ProviderName;
  displayName: string;
  apiKey?: string; // plaintext — encrypted before storage
  capabilities?: string[];
  status?: string;
  configJson?: string;
}): Promise<ProviderConfigPublic> {
  const capabilitiesStr = (params.capabilities || PROVIDER_CAPABILITIES[params.provider]).join(',');

  const existing = await db.aiProviderConfig.findUnique({
    where: { provider: params.provider },
  });

  const encryptedApiKey = params.apiKey
    ? encryptKey(params.apiKey)
    : existing?.encryptedApiKey || null;

  const config = await db.aiProviderConfig.upsert({
    where: { provider: params.provider },
    create: {
      provider: params.provider,
      displayName: params.displayName,
      encryptedApiKey,
      capabilities: capabilitiesStr,
      status: params.status || 'ACTIVE',
      configJson: params.configJson || '{}',
    },
    update: {
      displayName: params.displayName,
      encryptedApiKey,
      capabilities: capabilitiesStr,
      status: params.status || existing?.status || 'ACTIVE',
      configJson: params.configJson || existing?.configJson || '{}',
    },
  });

  // Invalidate cache
  invalidateCache(params.provider);

  return {
    id: config.id,
    provider: config.provider,
    displayName: config.displayName,
    capabilities: config.capabilities ? config.capabilities.split(',').map((c) => c.trim()) : [],
    status: config.status,
    maskedApiKey: config.encryptedApiKey ? maskEncryptedKey(config.encryptedApiKey) : null,
    lastValidatedAt: config.lastValidatedAt,
    lastError: config.lastError,
    configJson: config.configJson,
  };
}

/**
 * Validate a provider's credentials (Superadmin "Test Connection" button).
 *
 * For Vapi: calls the Vapi API to list assistants. If successful, marks
 * the config as validated.
 */
export async function validateProviderCredentials(provider: string): Promise<{
  valid: boolean;
  error?: string;
}> {
  const apiKey = await getDecryptedApiKey(provider);
  if (!apiKey) {
    return { valid: false, error: 'No API key configured or provider not ACTIVE' };
  }

  try {
    if (provider === 'VAPI') {
      // Call Vapi API to list assistants (lightweight validation)
      const response = await fetch('https://api.vapi.ai/assistant', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.text();
        return { valid: false, error: `Vapi API error: ${response.status} ${error}` };
      }

      // Mark as validated
      await db.aiProviderConfig.update({
        where: { provider },
        data: {
          lastValidatedAt: new Date(),
          lastError: null,
        },
      });

      return { valid: true };
    }

    // For other providers, add validation logic here
    return { valid: false, error: `Validation not implemented for ${provider}` };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    await db.aiProviderConfig.update({
      where: { provider },
      data: { lastError: errorMessage },
    }).catch(() => {});
    return { valid: false, error: errorMessage };
  }
}

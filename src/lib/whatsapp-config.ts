import { db } from '@/lib/db'

export interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  verifyToken: string;
  wabaId?: string;
  source?: string; // 'tenant-own' | 'platform' | 'env' | 'none'
}

function safeJsonParse(str: string | null, fallback: unknown = {}) {
  if (!str) return fallback
  try { return JSON.parse(str) } catch { return fallback }
}

/**
 * Resolve WhatsApp credentials from the database with fallback chain:
 *
 * 1. Tenant's own (non-platform) WhatsApp CommunicationProvider
 * 2. Platform (shared) WhatsApp CommunicationProvider (SuperAdmin-configured)
 * 3. .env vars (legacy fallback)
 *
 * This ensures that if a user hasn't added their own Meta details,
 * the SuperAdmin-configured platform WhatsApp is used — giving 10 free
 * trial credits.
 */
export async function resolveWhatsAppConfig(tenantId?: string): Promise<WhatsAppConfig> {
  try {
    // 1. Tenant's own WhatsApp provider (non-platform)
    if (tenantId) {
      const ownProvider = await db.communicationProvider.findFirst({
        where: {
          type: 'whatsapp',
          status: 'active',
          sendingEnabled: true,
          isPlatform: false,
          tenantId,
        },
        orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
        include: { credential: true },
      })

      if (ownProvider) {
        const resolved = resolveWACredsFromProvider(ownProvider)
        if (resolved) {
          return {
            accessToken: resolved.accessToken,
            phoneNumberId: resolved.phoneNumberId,
            verifyToken: resolved.verifyToken || process.env.WHATSAPP_VERIFY_TOKEN || 'serviceos_verify_token',
            wabaId: resolved.wabaId,
            source: 'tenant-own',
          }
        }
      }
    }

    // 2. Platform (shared) WhatsApp provider — SuperAdmin-configured
    let platformProvider = null
    if (tenantId) {
      platformProvider = await db.communicationProvider.findFirst({
        where: {
          type: 'whatsapp',
          status: 'active',
          sendingEnabled: true,
          isPlatform: true,
          tenantId,
        },
        orderBy: { updatedAt: 'desc' },
        include: { credential: true },
      })
    }
    if (!platformProvider) {
      platformProvider = await db.communicationProvider.findFirst({
        where: {
          type: 'whatsapp',
          status: 'active',
          sendingEnabled: true,
          isPlatform: true,
        },
        orderBy: { updatedAt: 'desc' },
        include: { credential: true },
      })
    }
    if (platformProvider) {
      const resolved = resolveWACredsFromProvider(platformProvider)
      if (resolved) {
        return {
          accessToken: resolved.accessToken,
          phoneNumberId: resolved.phoneNumberId,
          verifyToken: resolved.verifyToken || process.env.WHATSAPP_VERIFY_TOKEN || 'serviceos_verify_token',
          wabaId: resolved.wabaId,
          source: 'platform',
        }
      }
    }

    // 3. Legacy fallback: any active WhatsApp provider without isPlatform filter
    const anyProvider = await db.communicationProvider.findFirst({
      where: {
        type: 'whatsapp',
        status: 'active',
        sendingEnabled: true,
      },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
      include: { credential: true },
    })
    if (anyProvider) {
      const resolved = resolveWACredsFromProvider(anyProvider)
      if (resolved) {
        return {
          accessToken: resolved.accessToken,
          phoneNumberId: resolved.phoneNumberId,
          verifyToken: resolved.verifyToken || process.env.WHATSAPP_VERIFY_TOKEN || 'serviceos_verify_token',
          wabaId: resolved.wabaId,
          source: anyProvider.isPlatform ? 'platform' : 'tenant-own',
        }
      }
    }
  } catch (err) {
    console.error('[WhatsApp Config] DB lookup error:', err)
  }

  // 4. Final fallback: .env vars (legacy)
  const envConfig = getWhatsAppConfigFromEnv()
  if (envConfig.accessToken && envConfig.phoneNumberId) {
    return { ...envConfig, source: 'env' }
  }

  return { accessToken: '', phoneNumberId: '', verifyToken: '', source: 'none' }
}

/**
 * Resolve credentials from a CommunicationProvider record.
 */
function resolveWACredsFromProvider(prov: {
  configJson: string | null
  credential: { encryptedData: string | null } | null
}): { accessToken: string; phoneNumberId: string; verifyToken?: string; wabaId?: string } | null {
  const cfg = safeJsonParse(prov.configJson, {}) as Record<string, string>
  let accessToken = cfg.accessToken || ''
  let phoneNumberId = cfg.phoneNumberId || ''
  const verifyToken = cfg.verifyToken || ''
  const wabaId = cfg.wabaId || ''

  if (!accessToken && prov.credential) {
    const credData = safeJsonParse(prov.credential.encryptedData, {}) as Record<string, string>
    accessToken = credData.accessToken || credData.apiKey || ''
    if (!phoneNumberId) phoneNumberId = credData.phoneNumberId || ''
  }

  if (accessToken && phoneNumberId) {
    return { accessToken, phoneNumberId, verifyToken: verifyToken || undefined, wabaId: wabaId || undefined }
  }
  return null
}

/**
 * Legacy: Read WhatsApp config from environment variables.
 */
export function getWhatsAppConfigFromEnv(): WhatsAppConfig {
  return {
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'serviceos_verify_token',
  };
}

/**
 * Synchronous check — only checks .env vars.
 * @deprecated Use resolveWhatsAppConfig() for full DB fallback chain.
 */
export function getWhatsAppConfig(): WhatsAppConfig {
  return getWhatsAppConfigFromEnv()
}

/**
 * Synchronous check — .env only.
 * @deprecated Use isWhatsAppConfiguredAsync() for full DB fallback chain.
 */
export function isWhatsAppConfigured(): boolean {
  const config = getWhatsAppConfig();
  return !!(config.accessToken && config.phoneNumberId);
}

/**
 * Async check — resolves from DB with full fallback chain.
 */
export async function isWhatsAppConfiguredAsync(tenantId?: string): Promise<boolean> {
  const config = await resolveWhatsAppConfig(tenantId)
  return !!(config.accessToken && config.phoneNumberId)
}

export const WHATSAPP_API_VERSION = 'v25.0';

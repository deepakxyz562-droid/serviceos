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
 * 2. Platform (shared) WhatsApp CommunicationProvider — ONLY if the tenant
 *    has NOT attempted BYO (i.e., has zero type='whatsapp' rows of any
 *    kind). This prevents silent platform-WABA sends for tenants whose
 *    BYO connection is broken/misconfigured.
 * 3. .env vars (legacy fallback)
 *
 * GUARD (Phase C): if the tenant has ANY type='whatsapp' provider row
 * (active or not), we NEVER fall back to the platform-managed provider.
 * This stops the "silent connect" where a tenant clicks Connect, the BYO
 * row fails to save, and subsequent sends go out via Fieseros' WABA
 * without the tenant knowing.
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
            verifyToken: resolved.verifyToken || process.env.WHATSAPP_VERIFY_TOKEN || 'fieseros_verify_token',
            wabaId: resolved.wabaId,
            source: 'tenant-own',
          }
        }
      }

      // ── BYO GUARD (Phase C) ──────────────────────────────────────────
      // If the tenant has ANY tenant-owned whatsapp provider row (even inactive / not
      // sendingEnabled), they have ATTEMPTED BYO. Do NOT fall back to the
      // platform-managed WABA — return an empty config so the send fails
      // with a clear "your WhatsApp connection is broken" error instead
      // of silently sending via Fieseros' WABA.
      const anyTenantWaRow = await db.communicationProvider.findFirst({
        where: { type: 'whatsapp', tenantId, isPlatform: false },
        select: { id: true, status: true, sendingEnabled: true },
      })
      if (anyTenantWaRow) {
        console.warn(`[WhatsApp Config] tenant ${tenantId} has a tenant-owned whatsapp provider row (status=${anyTenantWaRow.status}, sendingEnabled=${anyTenantWaRow.sendingEnabled}) but no valid credentials — NOT falling back to platform WABA. Fix your BYO connection.`)
        return { accessToken: '', phoneNumberId: '', verifyToken: '', source: 'none' }
      }
    }

    // 2. Platform (shared) WhatsApp provider — ONLY for tenants who have
    //    NOT attempted BYO (no whatsapp row at all). Used for trial mode.
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
      // Only fall back to an unscoped platform provider (one attached to
      // any tenant) if the caller has NO tenantId at all (e.g., a system-
      // level send). This is the cross-tenant guard — previously this query
      // was unscoped and could leak credentials across tenants.
      if (!tenantId) {
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
    }
    if (platformProvider) {
      const resolved = resolveWACredsFromProvider(platformProvider)
      if (resolved) {
        return {
          accessToken: resolved.accessToken,
          phoneNumberId: resolved.phoneNumberId,
          verifyToken: resolved.verifyToken || process.env.WHATSAPP_VERIFY_TOKEN || 'fieseros_verify_token',
          wabaId: resolved.wabaId,
          source: 'platform',
        }
      }
    }
  } catch (err) {
    console.error('[WhatsApp Config] DB lookup error:', err)
  }

  // 3. Final fallback: .env vars (legacy)
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
  const verifyToken = cfg.webhookVerifyToken || cfg.verifyToken || ''
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
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'fieseros_verify_token',
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

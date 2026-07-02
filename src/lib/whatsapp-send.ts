import { db } from '@/lib/db'
import { getWhatsAppConfig } from '@/lib/whatsapp-config'
import { checkWhatsAppCredits, deductWhatsAppCredit } from '@/lib/credit-management'

const WHATSAPP_API_BASE = 'https://graph.facebook.com/v25.0'

interface SendWhatsAppOptions {
  to: string
  message: string
  credentialId?: string
  type?: 'text' | 'template'
  templateName?: string
  templateLanguage?: string
  tenantId?: string  // tenant scope for provider resolution
}

interface SendWhatsAppResult {
  success: boolean
  messageId?: string
  simulated?: boolean
  error?: string
  credentialUsed?: string
}

function safeJsonParse(str: string | null, fallback: unknown = {}) {
  if (!str) return fallback
  try { return JSON.parse(str) } catch { return fallback }
}

/**
 * Auto-ensure a platform WhatsApp CommunicationProvider exists in the DB.
 *
 * If no platform WhatsApp provider (isPlatform=true, type='whatsapp', status='active')
 * is found, AND WhatsApp env vars (WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID) are
 * available, creates one attached to the first tenant. This ensures the provider is
 * discoverable by sendWhatsAppMessage() and other systems.
 *
 * Idempotent: if a platform WhatsApp provider already exists, just returns it.
 * Non-blocking: if auto-creation fails, logs the error and returns null.
 */
async function ensurePlatformWhatsAppProvider() {
  try {
    // Check if a platform WhatsApp provider already exists
    const existing = await db.communicationProvider.findFirst({
      where: { type: 'whatsapp', isPlatform: true, status: 'active' },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    })
    if (existing) {
      return existing
    }

    // No platform WhatsApp provider exists — check if env vars are available
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

    if (!accessToken || !phoneNumberId) {
      return null
    }

    // Find the first tenant to attach the provider to
    const firstTenant = await db.tenant.findFirst({ orderBy: { createdAt: 'asc' } })
    if (!firstTenant) {
      console.warn('[ensurePlatformWhatsAppProvider] No tenant found in DB — cannot auto-create platform WhatsApp provider')
      return null
    }

    const wabaId = process.env.WHATSAPP_WABA_ID || ''

    const configJson = JSON.stringify({
      accessToken,
      phoneNumberId,
      ...(wabaId ? { wabaId } : {}),
    })

    const provider = await db.communicationProvider.create({
      data: {
        name: 'WhatsApp Business (Platform Auto-created)',
        type: 'whatsapp',
        provider: 'meta',
        isPlatform: true,
        isDefault: true,
        status: 'active',
        sendingEnabled: true,
        configJson,
        tenantId: firstTenant.id,
      },
    })

    console.log(
      `[ensurePlatformWhatsAppProvider] Auto-created platform WhatsApp provider: id=${provider.id}, ` +
      `phoneNumberId=${phoneNumberId}, tenantId=${firstTenant.id}`
    )
    return provider
  } catch (err) {
    console.error('[ensurePlatformWhatsAppProvider] Failed to auto-create platform WhatsApp provider:', err)
    return null
  }
}

/**
 * Resolve WhatsApp credentials (accessToken + phoneNumberId) from a CommunicationProvider.
 * Checks configJson first, then falls back to the linked Credential row.
 */
function resolveWACreds(prov: {
  configJson: string | null
  credential: { encryptedData: string | null } | null
}): { accessToken: string; phoneNumberId: string } | null {
  const cfg = safeJsonParse(prov.configJson, {}) as Record<string, string>
  let accessToken = cfg.accessToken || ''
  let phoneNumberId = cfg.phoneNumberId || ''

  // If the provider links to a Credential, the secrets may live there.
  if (!accessToken && prov.credential) {
    const credData = safeJsonParse(prov.credential.encryptedData, {}) as Record<string, string>
    accessToken = credData.accessToken || credData.apiKey || ''
    if (!phoneNumberId) phoneNumberId = credData.phoneNumberId || ''
  }

  if (accessToken && phoneNumberId) {
    return { accessToken, phoneNumberId }
  }
  return null
}

/**
 * Send a WhatsApp message (server-side utility).
 * 
 * Resolution priority (when tenantId is provided):
 * 1. If credentialId is provided → use that specific Credential from DB
 * 2. Search CommunicationProvider for WhatsApp — tenant-scoped with platform fallback:
 *    2a. Tenant's own (non-platform) default WhatsApp provider
 *    2b. Any tenant's own active WhatsApp provider
 *    2c. Platform (shared) WhatsApp provider from any tenant
 *    2d. Legacy: any active WhatsApp CommunicationProvider (no tenant/isPlatform filter)
 * 3. Search legacy Credential vault for WhatsApp credentials
 * 4. Else if WhatsApp is configured (env vars) → use that
 * 5. Else → return simulated response
 */
export async function sendWhatsAppMessage(options: SendWhatsAppOptions): Promise<SendWhatsAppResult> {
  const { to, message, credentialId, type = 'text', templateName, templateLanguage, tenantId } = options

  if (!to || !message) {
    return { success: false, error: 'to and message are required' }
  }

  // ── Credit gate: check if WhatsApp sending is allowed ──────────────────
  // When a tenantId is provided, check their credit status before sending.
  // Own-connected WhatsApp accounts bypass credit limits; platform WhatsApp
  // requires remaining trial credits (default 10) or active paid subscription.
  if (tenantId) {
    const creditStatus = await checkWhatsAppCredits(tenantId)
    if (!creditStatus.allowed) {
      console.warn(
        `[WhatsApp BLOCKED] To: ${to}, Tenant: ${tenantId}, Reason: ${creditStatus.reason || 'credits exhausted'}`
      )
      return {
        success: false,
        error: creditStatus.reason || 'WhatsApp credits exhausted. Connect your Meta Business Account to continue.',
        credentialUsed: 'none',
      }
    }
  }

  let accessToken = ''
  let phoneNumberId = ''
  let credentialSource = ''

  // 1. Try to use a specific stored credential by ID
  if (credentialId) {
    try {
      const credential = await db.credential.findUnique({ where: { id: credentialId } })
      if (credential) {
        const credData = safeJsonParse(credential.encryptedData, {}) as Record<string, string>
        if (credData.accessToken && credData.phoneNumberId) {
          accessToken = credData.accessToken
          phoneNumberId = credData.phoneNumberId
          credentialSource = `credential:${credential.id}`
        }
      }
    } catch {
      // Fall through to next method
    }
  }

  // 1b. Auto-ensure a platform WhatsApp CommunicationProvider exists from env vars.
  //     This bridges the gap where WhatsApp env vars are configured but no DB provider
  //     was seeded — the auto-created provider will be found by step 2c.
  try {
    await ensurePlatformWhatsAppProvider()
  } catch { /* non-blocking — continue even if auto-creation fails */ }

  // 2. Search CommunicationProvider for WhatsApp — tenant-scoped with platform fallback
  //    Resolution priority (similar to resolveSmtpConfig for emails):
  //    2a. Tenant's own (non-platform) default WhatsApp provider
  //    2b. Any tenant's own active WhatsApp provider
  //    2c. Platform (shared) WhatsApp provider from any tenant
  //    2d. Legacy: any active WhatsApp CommunicationProvider (no tenant/isPlatform filter)
  if (!accessToken || !phoneNumberId) {
    try {
      // 2a. Tenant's own default WA provider
      if (tenantId) {
        const ownDefault = await db.communicationProvider.findFirst({
          where: {
            type: 'whatsapp',
            status: 'active',
            sendingEnabled: true,
            isPlatform: false,
            isDefault: true,
            tenantId,
          },
          orderBy: { updatedAt: 'desc' },
          include: { credential: true },
        })
        if (ownDefault) {
          const resolved = resolveWACreds(ownDefault)
          if (resolved) {
            accessToken = resolved.accessToken
            phoneNumberId = resolved.phoneNumberId
            credentialSource = `communicationProvider:${ownDefault.id}(${ownDefault.name}/own-default)`
          }
        }
      }

      // 2b. Any tenant's own active WA provider (not necessarily default)
      if (!accessToken && tenantId) {
        const ownAny = await db.communicationProvider.findFirst({
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
        if (ownAny) {
          const resolved = resolveWACreds(ownAny)
          if (resolved) {
            accessToken = resolved.accessToken
            phoneNumberId = resolved.phoneNumberId
            credentialSource = `communicationProvider:${ownAny.id}(${ownAny.name}/own)`
          }
        }
      }

      // 2c. Platform (shared) WhatsApp provider — from this tenant first, then any tenant
      if (!accessToken) {
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
          const resolved = resolveWACreds(platformProvider)
          if (resolved) {
            accessToken = resolved.accessToken
            phoneNumberId = resolved.phoneNumberId
            credentialSource = `communicationProvider:${platformProvider.id}(${platformProvider.name}/platform)`
          }
        }
      }

      // 2d. Legacy fallback: any active WhatsApp provider (no isPlatform/tenantId filter)
      if (!accessToken) {
        const waProviders = await db.communicationProvider.findMany({
          where: {
            type: 'whatsapp',
            status: 'active',
            sendingEnabled: true,
          },
          orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
          include: { credential: true },
        })

        for (const prov of waProviders) {
          const resolved = resolveWACreds(prov)
          if (resolved) {
            accessToken = resolved.accessToken
            phoneNumberId = resolved.phoneNumberId
            credentialSource = `communicationProvider:${prov.id}(${prov.name}/${prov.provider})`
            break
          }
        }
      }
    } catch (err) {
      console.error('[WhatsApp] CommunicationProvider lookup error:', err)
    }
  }

  // 3. Search DB for any WhatsApp credential (legacy Credential vault — broad search)
  if (!accessToken || !phoneNumberId) {
    try {
      // First try type='whatsapp', then type='apiKey' with WhatsApp data
      const whatsappCreds = await db.credential.findMany({
        where: {
          OR: [
            { type: 'whatsapp' },
            { type: 'apiKey' },
            { name: { contains: 'whatsapp' } },
            { name: { contains: 'WhatsApp' } },
          ]
        },
        orderBy: { updatedAt: 'desc' },
      })

      for (const cred of whatsappCreds) {
        const credData = safeJsonParse(cred.encryptedData, {}) as Record<string, string>
        if (credData.accessToken && credData.phoneNumberId) {
          accessToken = credData.accessToken
          phoneNumberId = credData.phoneNumberId
          credentialSource = `credential:${cred.id}(${cred.name})`
          break
        }
      }
    } catch {
      // Fall through to config
    }
  }

  // 3. Try local config / env vars
  if (!accessToken || !phoneNumberId) {
    const config = getWhatsAppConfig()
    if (config.accessToken && config.phoneNumberId) {
      accessToken = config.accessToken
      phoneNumberId = config.phoneNumberId
      credentialSource = 'config'
    }
  }

  // 4. If still not configured, return simulated
  if (!accessToken || !phoneNumberId) {
    console.log(`[WhatsApp SIMULATED] To: ${to}, Message: ${message.substring(0, 100)}...`)
    return {
      success: true,
      simulated: true,
      messageId: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    }
  }

  // Format recipient phone number
  let recipientPhone = to.replace(/\D/g, '')
  // Auto-correct: if phone number is 10 digits (common Indian format), prepend 91
  if (/^\d{10}$/.test(recipientPhone)) {
    recipientPhone = `91${recipientPhone}`
  }

  console.log(`[WhatsApp] Sending to ${recipientPhone} via ${credentialSource}`)

  // Build payload
  let payload: Record<string, unknown>
  if (type === 'template') {
    payload = {
      messaging_product: 'whatsapp',
      to: recipientPhone,
      type: 'template',
      template: {
        name: templateName || message,
        language: { code: templateLanguage || 'en_US' },
      },
    }
  } else {
    payload = {
      messaging_product: 'whatsapp',
      to: recipientPhone,
      type: 'text',
      text: { body: message, preview_url: false },
    }
  }

  try {
    const url = `${WHATSAPP_API_BASE}/${phoneNumberId}/messages`
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const responseData = await response.json()

    if (!response.ok) {
      const errorCode = responseData?.error?.code
      let errorMessage = responseData?.error?.message || `WhatsApp API error: ${response.status}`
      const errorDetails = JSON.stringify(responseData?.error || {})

      if (errorCode === 131030) {
        errorMessage = `Recipient "${recipientPhone}" not in allowed list. Add as test contact in Meta Business Suite > WhatsApp > Phone Numbers, or use a template message instead.`
      } else if (errorCode === 131000) {
        errorMessage = `Invalid phone number "${recipientPhone}". Include country code (e.g., 91XXXXXXXXXX) with no spaces or plus sign.`
      } else if (errorCode === 132000) {
        errorMessage = `Template parameter mismatch. Check your template definition in Meta Business Suite.`
      } else if (errorCode === 190 || response.status === 401) {
        errorMessage = `Access token expired or invalid. Please update your WhatsApp API access token.`
      } else if (errorCode === 100) {
        errorMessage = `Invalid parameter. Phone number ID might be incorrect or the message format is wrong.`
      }

      console.error(`[WhatsApp API ERROR] Code: ${errorCode}, Message: ${errorMessage}, Details: ${errorDetails}`)
      return { success: false, error: errorMessage, credentialUsed: credentialSource }
    }

    const msgId = responseData?.messages?.[0]?.id || `real_${Date.now()}`
    console.log(`[WhatsApp SENT] To: ${recipientPhone}, MsgId: ${msgId}, Via: ${credentialSource}`)

    // ── Deduct credit after successful send ────────────────────────────────
    // Only deduct for platform (trial) usage — own-connected accounts have
    // unlimited messaging through their own Meta Business account.
    if (tenantId && !credentialSource.includes('/own')) {
      try {
        await deductWhatsAppCredit(tenantId, 1)
      } catch (deductErr) {
        console.warn('[WhatsApp] Failed to deduct credit (non-blocking):', deductErr)
      }
    }

    return { success: true, messageId: msgId, credentialUsed: credentialSource }
  } catch (error) {
    console.error('[WhatsApp SEND FAILED]', error)
    return { success: false, error: 'Failed to send WhatsApp message', credentialUsed: credentialSource }
  }
}

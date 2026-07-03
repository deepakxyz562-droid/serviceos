import { db } from '@/lib/db'
import { checkWhatsAppCredits, deductWhatsAppCredit } from '@/lib/credit-management'

const WHATSAPP_API_BASE = 'https://graph.facebook.com/v25.0'

interface SendWhatsAppOptions {
  to: string
  message: string
  credentialId?: string
  type?: 'text' | 'template'
  templateName?: string
  templateLanguage?: string
  tenantId?: string
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
 * Resolve WhatsApp credentials from a CommunicationProvider.
 * Checks configJson first, then linked Credential row.
 */
function resolveWACreds(prov: {
  configJson: string | null
  credential: { encryptedData: string | null } | null
}): { accessToken: string; phoneNumberId: string } | null {
  const cfg = safeJsonParse(prov.configJson, {}) as Record<string, string>
  let accessToken = cfg.accessToken || ''
  let phoneNumberId = cfg.phoneNumberId || ''

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
 *    2c. Platform (shared) WhatsApp provider (SuperAdmin-configured)
 *    2d. Legacy: any active WhatsApp CommunicationProvider
 * 3. Search legacy Credential vault for WhatsApp credentials
 * 4. Else → return simulated response
 *
 * NO .env fallback — all credentials come from the database.
 * SuperAdmin configures platform WhatsApp via admin panel.
 * If user hasn't added their own Meta details, platform provider is used
 * (10 free trial credits for users without own WhatsApp).
 */
export async function sendWhatsAppMessage(options: SendWhatsAppOptions): Promise<SendWhatsAppResult> {
  const { to, message, credentialId, type = 'text', templateName, templateLanguage, tenantId } = options

  if (!to || !message) {
    return { success: false, error: 'to and message are required' }
  }

  // ── Credit gate ──────────────────────────────────────────────────────
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

  // 1. Try specific stored credential by ID
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
    } catch { /* fall through */ }
  }

  // 2. CommunicationProvider resolution — tenant own → platform → legacy
  if (!accessToken || !phoneNumberId) {
    try {
      // 2a. Tenant's own default WA provider
      if (tenantId) {
        const ownDefault = await db.communicationProvider.findFirst({
          where: { type: 'whatsapp', status: 'active', sendingEnabled: true, isPlatform: false, isDefault: true, tenantId },
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

      // 2b. Any tenant's own active WA provider
      if (!accessToken && tenantId) {
        const ownAny = await db.communicationProvider.findFirst({
          where: { type: 'whatsapp', status: 'active', sendingEnabled: true, isPlatform: false, tenantId },
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

      // 2c. Platform (shared) WhatsApp provider — SuperAdmin-configured
      if (!accessToken) {
        let platformProvider = null
        if (tenantId) {
          platformProvider = await db.communicationProvider.findFirst({
            where: { type: 'whatsapp', status: 'active', sendingEnabled: true, isPlatform: true, tenantId },
            orderBy: { updatedAt: 'desc' },
            include: { credential: true },
          })
        }
        if (!platformProvider) {
          platformProvider = await db.communicationProvider.findFirst({
            where: { type: 'whatsapp', status: 'active', sendingEnabled: true, isPlatform: true },
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

      // 2d. Legacy fallback: any active WhatsApp provider
      if (!accessToken) {
        const waProviders = await db.communicationProvider.findMany({
          where: { type: 'whatsapp', status: 'active', sendingEnabled: true },
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

  // 3. Legacy Credential vault
  if (!accessToken || !phoneNumberId) {
    try {
      const whatsappCreds = await db.credential.findMany({
        where: { OR: [{ type: 'whatsapp' }, { type: 'apiKey' }, { name: { contains: 'whatsapp' } }, { name: { contains: 'WhatsApp' } }] },
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
    } catch { /* fall through */ }
  }

  // 4. No credentials found → simulated
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
      template: { name: templateName || message, language: { code: templateLanguage || 'en_US' } },
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
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const responseData = await response.json()

    if (!response.ok) {
      const errorCode = responseData?.error?.code
      let errorMessage = responseData?.error?.message || `WhatsApp API error: ${response.status}`
      const errorDetails = JSON.stringify(responseData?.error || {})

      if (errorCode === 131030) {
        errorMessage = `Recipient "${recipientPhone}" not in allowed list. Add as test contact in Meta Business Suite, or use a template message.`
      } else if (errorCode === 131000) {
        errorMessage = `Invalid phone number "${recipientPhone}". Include country code (e.g., 91XXXXXXXXXX).`
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

    // Deduct credits on successful send:
    //   - Platform usage (!own): increments whatsappUsageCount + trialWhatsappUsed
    //   - Own WA usage: increments only whatsappUsageCount (unlimited plan)
    if (tenantId) {
      try {
        await deductWhatsAppCredit(tenantId, 1, credentialSource.includes('/own'))
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

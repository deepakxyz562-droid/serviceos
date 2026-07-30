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
 * 2. Search CommunicationProvider for WhatsApp — tenant's OWN providers only:
 *    2a. Tenant's own default WhatsApp provider
 *    2b. Any tenant's own active WhatsApp provider
 *    2c. Legacy: any active WhatsApp CommunicationProvider (still own-only;
 *        we no longer fall back to a platform/shared provider)
 * 3. Search legacy Credential vault for WhatsApp credentials (tenant-scoped)
 * 4. Else → return simulated response (no real send)
 *
 * PLATFORM WHATSAPP REMOVED (Issue 5): The platform no longer provides a
 * shared WhatsApp provider. WhatsApp is strictly BYO (user connects their own
 * Meta Cloud API). If no tenant-owned credential is configured, messages are
 * simulated — they are NOT sent. This prevents the "free WhatsApp trial"
 * behaviour where tenants could send real messages on the platform's dime.
 *
 * The platform-provided channels are: Push, Email, and SMS only.
 */
export async function sendWhatsAppMessage(options: SendWhatsAppOptions): Promise<SendWhatsAppResult> {
  const { to, message, credentialId, type = 'text', templateName, templateLanguage, tenantId } = options

  if (!to || !message) {
    return { success: false, error: 'to and message are required' }
  }

  // ── Credit gate ──────────────────────────────────────────────────────
  // Still call checkWhatsAppCredits so the subscription's ownWhatsappConnected
  // flag is respected (if the user hasn't connected their own Meta API, the
  // gate returns allowed=false and we block here). With platform WhatsApp
  // removed, there are no trial credits to exhaust — the gate is now purely a
  // "is the user's own WhatsApp connected?" check.
  if (tenantId) {
    const creditStatus = await checkWhatsAppCredits(tenantId)
    if (!creditStatus.allowed) {
      console.warn(
        `[WhatsApp BLOCKED] To: ${to}, Tenant: ${tenantId}, Reason: ${creditStatus.reason || 'own WhatsApp not connected'}`
      )
      return {
        success: false,
        error: creditStatus.reason || 'WhatsApp is not configured. Connect your own Meta Business Account to send WhatsApp messages.',
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

  // 2. CommunicationProvider resolution — tenant's OWN providers only.
  //    Platform/shared providers (isPlatform: true) are deliberately skipped
  //    because the platform no longer provides WhatsApp (Issue 5).
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

      // 2c. Legacy fallback: any active WhatsApp provider that is NOT a
      //     platform/shared provider. (Previously this fell back to platform
      //     providers — that path is removed per Issue 5.)
      if (!accessToken) {
        const waProviders = await db.communicationProvider.findMany({
          where: { type: 'whatsapp', status: 'active', sendingEnabled: true, isPlatform: false },
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

  // 3. Legacy Credential vault (tenant-scoped — we filter by tenantId when
  //    available so one tenant can't accidentally use another's credentials).
  if (!accessToken || !phoneNumberId) {
    try {
      const where = tenantId
        ? { OR: [{ type: 'whatsapp' }, { name: { contains: 'whatsapp' } }, { name: { contains: 'WhatsApp' } }], tenantId }
        : { OR: [{ type: 'whatsapp' }, { name: { contains: 'whatsapp' } }, { name: { contains: 'WhatsApp' } }] }
      const whatsappCreds = await db.credential.findMany({
        where,
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
  //    IMPORTANT: this is now a true no-op (no real send). Previously the
  //    platform WhatsApp provider would have been used here. With platform
  //    WhatsApp removed, we log + return simulated so the caller can show
  //    "connect your own WhatsApp" in the UI.
  if (!accessToken || !phoneNumberId) {
    console.log(`[WhatsApp SIMULATED — no own credentials] To: ${to}, Tenant: ${tenantId || 'none'}`)
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

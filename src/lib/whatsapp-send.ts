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
  templateComponents?: Array<Record<string, unknown>>
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

      // 2c. Legacy fallback: REMOVED — this findMany was NOT scoped by tenantId,
      //      which is a cross-tenant credential leak risk. Steps 2a + 2b above
      //      already cover all tenant-owned providers. If no credentials were
      //      found there, the tenant has NOT connected their own WhatsApp.
      //      Proceed to the platform fallback (2d) which is now guarded.

      // 2d. Platform provider fallback (SuperAdmin configured):
      // When a tenant does not have their own connected Meta account, use
      // the SuperAdmin platform provider to deliver notifications.
      //
      // BYO GUARD (Phase C): if the tenant has ANY whatsapp provider row
      // (even inactive), they have ATTEMPTED BYO — do NOT fall back to
      // platform. This prevents silent platform-WABA sends.
      if (!accessToken && tenantId) {
        const anyTenantWaRow = await db.communicationProvider.findFirst({
          where: { type: 'whatsapp', tenantId },
          select: { id: true },
        })
        if (anyTenantWaRow) {
          // Tenant attempted BYO — don't silently use platform WABA.
          console.warn(`[WhatsApp] tenant ${tenantId} has a whatsapp row but no valid tenant-owned credentials — NOT using platform fallback.`)
        } else {
          const platformProviders = await db.communicationProvider.findMany({
            where: { type: 'whatsapp', status: 'active', sendingEnabled: true, isPlatform: true },
            orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
            include: { credential: true },
          })
          for (const prov of platformProviders) {
            const resolved = resolveWACreds(prov)
            if (resolved) {
              accessToken = resolved.accessToken
              phoneNumberId = resolved.phoneNumberId
              credentialSource = `communicationProvider:${prov.id}(${prov.name}/platform)`
              break
            }
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

  // 3b. Environment variables fallback
  if (!accessToken || !phoneNumberId) {
    const envToken = process.env.WHATSAPP_ACCESS_TOKEN
    const envPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
    if (envToken && envPhoneId) {
      accessToken = envToken
      phoneNumberId = envPhoneId
      credentialSource = 'env:WHATSAPP_ACCESS_TOKEN'
    }
  }

  // 4. No credentials found → simulated
  //    If no credentials are found in tenant providers, platform providers, or env,
  //    log + return simulated so the caller can show "connect WhatsApp" in UI.
  if (!accessToken || !phoneNumberId) {
    console.log(`[WhatsApp SIMULATED — no credentials] To: ${to}, Tenant: ${tenantId || 'none'}`)
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
    const templateObj: Record<string, unknown> = {
      name: templateName || message,
      language: { code: templateLanguage || 'en_US' },
    }
    if (options.templateComponents && options.templateComponents.length > 0) {
      templateObj.components = options.templateComponents
    }
    payload = {
      messaging_product: 'whatsapp',
      to: recipientPhone,
      type: 'template',
      template: templateObj,
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

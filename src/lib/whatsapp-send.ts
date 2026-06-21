import { db } from '@/lib/db'
import { getWhatsAppConfig } from '@/lib/whatsapp-config'

const WHATSAPP_API_BASE = 'https://graph.facebook.com/v25.0'

interface SendWhatsAppOptions {
  to: string
  message: string
  credentialId?: string
  type?: 'text' | 'template'
  templateName?: string
  templateLanguage?: string
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
 * Send a WhatsApp message (server-side utility).
 * 
 * Priority:
 * 1. If credentialId is provided → use that specific Credential from DB
 * 2. Search DB for any credential that has WhatsApp fields (accessToken + phoneNumberId)
 *    - Checks: type='whatsapp', type='apiKey' with WhatsApp data, or any name containing 'whatsapp'
 * 3. Else if WhatsApp is configured (db/whatsapp-config.json or env vars) → use that
 * 4. Else → return simulated response
 */
export async function sendWhatsAppMessage(options: SendWhatsAppOptions): Promise<SendWhatsAppResult> {
  const { to, message, credentialId, type = 'text', templateName, templateLanguage } = options

  if (!to || !message) {
    return { success: false, error: 'to and message are required' }
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

  // 2. Search DB for any WhatsApp credential (broad search)
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

  // 2b. Search CommunicationProvider for WhatsApp providers configured via the
  // settings UI (Communication Providers screen). This is the PRIMARY way users
  // configure WhatsApp — the Credential vault (step 2) is a legacy fallback.
  // A CommunicationProvider may either store its secrets directly in configJson
  // OR link to a Credential row via credentialId.
  if (!accessToken || !phoneNumberId) {
    try {
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
        const cfg = safeJsonParse(prov.configJson, {}) as Record<string, string>
        let cfgAccessToken = cfg.accessToken || ''
        let cfgPhoneNumberId = cfg.phoneNumberId || ''

        // If the provider links to a Credential, the secrets live there.
        if (!cfgAccessToken && prov.credential) {
          const credData = safeJsonParse(prov.credential.encryptedData, {}) as Record<string, string>
          cfgAccessToken = credData.accessToken || credData.apiKey || ''
          // phoneNumberId might be in either place — check both.
          if (!cfgPhoneNumberId) cfgPhoneNumberId = credData.phoneNumberId || ''
        }

        if (cfgAccessToken && cfgPhoneNumberId) {
          accessToken = cfgAccessToken
          phoneNumberId = cfgPhoneNumberId
          credentialSource = `communicationProvider:${prov.id}(${prov.name}/${prov.provider})`
          break
        }
      }
    } catch {
      // Fall through to config/env
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
    return { success: true, messageId: msgId, credentialUsed: credentialSource }
  } catch (error) {
    console.error('[WhatsApp SEND FAILED]', error)
    return { success: false, error: 'Failed to send WhatsApp message', credentialUsed: credentialSource }
  }
}

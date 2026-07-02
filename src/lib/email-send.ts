import nodemailer from 'nodemailer'
import { db } from '@/lib/db'

export type ProviderType = 'smtp' | 'resend' | 'sendgrid' | 'ses' | 'mailgun' | 'postmark' | 'brevo'

export interface SmtpConfig {
  host: string
  port: number
  secure: boolean       // true for 465, false for 587/2587 (STARTTLS)
  user: string
  pass: string
  fromName: string
  fromEmail: string
  replyTo?: string
}

export interface SendEmailOptions {
  to: string
  subject: string
  html?: string
  text?: string
  // Specific EmailProvider ID (new model)
  providerId?: string
  // Specific legacy Credential ID (backward compat)
  credentialId?: string
  // Usage type — when neither providerId nor credentialId is given, pick the default for this usage
  usageType?: 'transactional' | 'marketing'
  // Tenant ID — when provided, prefer EmailProviders belonging to this tenant
  tenantId?: string
}

export interface SendEmailResult {
  success: boolean
  messageId?: string
  simulated?: boolean
  error?: string
  providerUsed?: string  // source identifier (e.g. "emailProvider:abc123(AWS SES)")
  // When true, the request was blocked because no customer-connected marketing
  // provider is available. The caller should surface a "connect provider" prompt.
  providerRequired?: boolean
}

function safeJsonParse(str: string | null, fallback: unknown = {}): unknown {
  if (!str) return fallback
  try { return JSON.parse(str) } catch { return fallback }
}

/**
 * Resolve SMTP config from an EmailProvider row.
 * Handles all provider types: smtp, resend, sendgrid, ses (SMTP mode), mailgun, postmark, brevo.
 * Currently all non-SMTP providers that we send via SMTP (SES SMTP, SendGrid SMTP, Brevo SMTP,
 * Mailgun SMTP, Postmark SMTP) are normalized to SMTP config here.
 *
 * IMPORTANT: This function relies ONLY on the database-stored configJson.
 * If the credentials in the DB are invalid/incomplete, it returns null.
 * The SuperAdmin is responsible for maintaining valid provider configurations
 * through the Settings → Providers UI.
 */
export function emailProviderToSmtpConfig(
  provider: {
    id: string
    name: string
    providerType: string
    configJson: string
    fromName: string
    fromEmail: string
    replyTo: string | null
  }
): SmtpConfig | null {
  const data = safeJsonParse(provider.configJson, {}) as Record<string, unknown>

  // Reconstruct smtpUser from parts if stored as an array (legacy format)
  if (!data.smtpUser && Array.isArray(data.smtpUserParts)) {
    data.smtpUser = (data.smtpUserParts as string[]).join('')
  }

  const d = data as Record<string, string>

  // SMTP-style config (works for: smtp, ses, sendgrid, mailgun, postmark, brevo — all expose SMTP)
  if (d.smtpHost && d.smtpUser && d.smtpPass) {
    const port = parseInt(d.smtpPort || '587', 10)
    return {
      host: d.smtpHost,
      port,
      secure: d.smtpSecure === 'true' || port === 465,
      user: d.smtpUser,
      pass: d.smtpPass,
      fromName: provider.fromName,
      fromEmail: provider.fromEmail,
      replyTo: provider.replyTo || undefined,
    }
  }

  // Provider-specific SMTP hostnames (when user only provided API key + user/pass)
  switch (provider.providerType) {
    case 'resend':
      // Resend exposes SMTP at smtp.resend.com:465 (SSL) or 587 (STARTTLS), user="resend", pass=apiKey
      if (d.smtpPass || d.apiKey) {
        return {
          host: 'smtp.resend.com',
          port: 465,
          secure: true,
          user: 'resend',
          pass: d.smtpPass || d.apiKey,
          fromName: provider.fromName,
          fromEmail: provider.fromEmail,
          replyTo: provider.replyTo || undefined,
        }
      }
      return null
    case 'sendgrid':
      if (d.smtpPass || d.apiKey) {
        return {
          host: 'smtp.sendgrid.net',
          port: 587,
          secure: false,
          user: 'apikey',
          pass: d.smtpPass || d.apiKey,
          fromName: provider.fromName,
          fromEmail: provider.fromEmail,
          replyTo: provider.replyTo || undefined,
        }
      }
      return null
    case 'mailgun':
      if ((d.smtpPass || d.apiKey) && d.domain) {
        return {
          host: `smtp.mailgun.org`,
          port: 587,
          secure: false,
          user: `postmaster@${d.domain}`,
          pass: d.smtpPass || d.apiKey,
          fromName: provider.fromName,
          fromEmail: provider.fromEmail,
          replyTo: provider.replyTo || undefined,
        }
      }
      return null
    case 'postmark':
      if (d.smtpPass || d.serverToken) {
        return {
          host: 'smtp.postmarkapp.com',
          port: 587,
          secure: false,
          user: d.smtpUser || d.serverToken,
          pass: d.smtpPass || d.serverToken,
          fromName: provider.fromName,
          fromEmail: provider.fromEmail,
          replyTo: provider.replyTo || undefined,
        }
      }
      return null
    case 'brevo':
      if (d.smtpPass || d.apiKey) {
        return {
          host: 'smtp-relay.brevo.com',
          port: 587,
          secure: false,
          user: d.smtpUser || d.apiKey,
          pass: d.smtpPass || d.apiKey,
          fromName: provider.fromName,
          fromEmail: provider.fromEmail,
          replyTo: provider.replyTo || undefined,
        }
      }
      return null
    case 'ses': {
      // AWS SES SMTP interface. The user provides either:
      //  (a) smtpHost + smtpUser + smtpPass — handled by the generic check at
      //      the top of this function (returns before reaching the switch).
      //  (b) region + smtpUser + smtpPass (IAM-derived SMTP credentials) — we
      //      derive the host from the region.
      //  (c) smtpUser + smtpPass only — default to us-east-1 host.
      if (d.smtpUser && d.smtpPass) {
        const region = d.region || 'us-east-1'
        const host = d.smtpHost || `email-smtp.${region}.amazonaws.com`
        const port = parseInt(d.smtpPort || '587', 10)
        return {
          host,
          port,
          secure: d.smtpSecure === 'true' || port === 465,
          user: d.smtpUser,
          pass: d.smtpPass,
          fromName: provider.fromName,
          fromEmail: provider.fromEmail,
          replyTo: provider.replyTo || undefined,
        }
      }
      return null
    }
    default:
      return null
  }
}

/**
 * Resolve SMTP config from EmailProvider model (preferred) or legacy Credential (fallback).
 *
 * The database is the SINGLE SOURCE OF TRUTH for email provider credentials.
 * All provider management is done through the SuperAdmin UI (Settings → Providers).
 * No .env SMTP variables are needed — the SuperAdmin creates and manages providers
 * directly in the database.
 *
 * Priority:
 * 1. providerId — specific EmailProvider row
 * 2. credentialId — specific Credential row (legacy type='smtp')
 * 3. Default EmailProvider for the requested usageType (transactional/marketing)
 * 4. Any active EmailProvider
 * 5. Any legacy Credential with type='smtp'
 */
export async function resolveSmtpConfig(
  options: { providerId?: string; credentialId?: string; usageType?: 'transactional' | 'marketing'; tenantId?: string } = {}
): Promise<{ config: SmtpConfig | null; source: string; providerId?: string; marketingProviderRequired?: boolean }> {
  const { providerId, credentialId, usageType, tenantId } = options

  // 1. Specific EmailProvider by ID
  if (providerId) {
    try {
      const provider = await db.emailProvider.findUnique({ where: { id: providerId } })
      if (provider) {
        const config = emailProviderToSmtpConfig(provider)
        if (config) {
          return { config, source: `emailProvider:${provider.id}(${provider.name})`, providerId: provider.id }
        }
        // Provider found but its config is invalid/incomplete
        const parsedKeys = (() => {
          try { return Object.keys(JSON.parse(provider.configJson || '{}') || {}) } catch { return [] }
        })()
        console.warn(
          `[resolveSmtpConfig] providerId=${providerId} found (type=${provider.providerType}, name=${provider.name}) but emailProviderToSmtpConfig returned null. ` +
          `configJson keys: [${parsedKeys.join(', ')}]. ` +
          `Ensure SMTP host/user/pass (or provider-specific credentials) are set in Settings → Providers.`
        )
      } else {
        console.warn(`[resolveSmtpConfig] providerId=${providerId} not found in DB`)
      }
    } catch (e) {
      console.error(`[resolveSmtpConfig] providerId=${providerId} lookup threw:`, e)
    }
  }

  // 2. Specific legacy Credential by ID
  if (credentialId) {
    try {
      const cred = await db.credential.findUnique({ where: { id: credentialId } })
      if (cred) {
        const data = safeJsonParse(cred.encryptedData, {}) as Record<string, string>
        if (data.smtpHost && data.smtpUser && data.smtpPass) {
          const port = parseInt(data.smtpPort || '587', 10)
          return {
            config: {
              host: data.smtpHost,
              port,
              secure: data.smtpSecure === 'true' || port === 465,
              user: data.smtpUser,
              pass: data.smtpPass,
              fromName: data.fromName || 'ServiceOS',
              fromEmail: data.fromEmail || data.smtpUser,
              replyTo: data.replyTo || undefined,
            },
            source: `credential:${cred.id}(${cred.name})`,
          }
        }
      }
    } catch { /* fall through */ }
  }

  // ── Platform vs. Customer provider separation ──────────────────────────
  //  - transactional: prefer isPlatform=true providers (system email managed by the platform)
  //  - marketing:     ONLY non-platform providers (the customer's own connection).
  //                   We must never silently route bulk campaigns through the shared
  //                   platform domain — that would damage deliverability for everyone.
  const requireCustomerProvider = usageType === 'marketing'

  // Helper: build the base where clause for provider lookups.
  const tenantWhere = tenantId ? { tenantId } : {}

  console.log(`[resolveSmtpConfig] usageType=${usageType || 'none'}, tenantId=${tenantId || 'none'}`)

  // 3 & 4. Find an EmailProvider with valid SMTP config from the database.
  //
  // CRITICAL FIX: Use a unified list of queries ordered by preference, and try each
  // candidate until we find one with valid SMTP config. If a provider's config
  // is invalid, we log a warning and continue to the next candidate.
  try {
    // Build ordered list of candidate queries based on usageType
    const candidateQueries: Array<{ where: Record<string, unknown>; orderBy: Record<string, unknown>[] | Record<string, unknown>; label: string }> = []

    if (usageType === 'transactional') {
      candidateQueries.push(
        { where: { status: 'active', isDefaultTransactional: true, isPlatform: true, ...tenantWhere }, orderBy: { updatedAt: 'desc' }, label: '3a:defaultTx+platform+tenant' },
        { where: { status: 'active', isDefaultTransactional: true, isPlatform: true }, orderBy: { updatedAt: 'desc' }, label: '3a2:defaultTx+platform' },
        { where: { status: 'active', isDefaultTransactional: true, ...tenantWhere }, orderBy: [{ isPlatform: 'desc' }, { updatedAt: 'desc' }], label: '3b:defaultTx+tenant' },
        { where: { status: 'active', isDefaultTransactional: true }, orderBy: [{ isPlatform: 'desc' }, { updatedAt: 'desc' }], label: '3b2:defaultTx' },
        { where: { status: 'active', usageType: { in: ['transactional', 'both'] }, ...tenantWhere }, orderBy: [{ isDefaultTransactional: 'desc' }, { isPlatform: 'desc' }, { updatedAt: 'desc' }], label: '3c:txBoth+tenant' },
        { where: { status: 'active', usageType: { in: ['transactional', 'both'] } }, orderBy: [{ isDefaultTransactional: 'desc' }, { isPlatform: 'desc' }, { updatedAt: 'desc' }], label: '3c2:txBoth' },
        { where: { status: 'active', ...tenantWhere }, orderBy: [{ isDefaultTransactional: 'desc' }, { isPlatform: 'desc' }, { updatedAt: 'desc' }], label: '3c3:anyActive+tenant' },
        { where: { status: 'active' }, orderBy: [{ isDefaultTransactional: 'desc' }, { isPlatform: 'desc' }, { updatedAt: 'desc' }], label: '3c4:anyActive' },
      )
    } else if (usageType === 'marketing') {
      candidateQueries.push(
        { where: { status: 'active', isDefaultMarketing: true, isPlatform: false, ...tenantWhere }, orderBy: { updatedAt: 'desc' }, label: '3m:defaultMkt+tenant' },
      )
      if (tenantId) {
        candidateQueries.push(
          { where: { status: 'active', isDefaultMarketing: true, isPlatform: false }, orderBy: { updatedAt: 'desc' }, label: '3m2:defaultMkt' },
        )
      }
    } else {
      // No usageType specified — prefer platform default transactional
      candidateQueries.push(
        { where: { status: 'active', isDefaultTransactional: true, ...tenantWhere }, orderBy: [{ isPlatform: 'desc' }, { updatedAt: 'desc' }], label: '3u:defaultTx+tenant' },
      )
      if (tenantId) {
        candidateQueries.push(
          { where: { status: 'active', isDefaultTransactional: true }, orderBy: [{ isPlatform: 'desc' }, { updatedAt: 'desc' }], label: '3u2:defaultTx' },
        )
      }
    }

    // Step 4 queries: broader fallbacks (only for non-marketing)
    if (!requireCustomerProvider) {
      candidateQueries.push(
        { where: { status: 'active', isPlatform: true, ...tenantWhere }, orderBy: [{ isDefaultTransactional: 'desc' }, { updatedAt: 'desc' }], label: '4:platform+tenant' },
      )
      if (tenantId) {
        candidateQueries.push(
          { where: { status: 'active', isPlatform: true }, orderBy: [{ isDefaultTransactional: 'desc' }, { updatedAt: 'desc' }], label: '4b:platform' },
        )
      }
      candidateQueries.push(
        { where: { status: 'active', ...tenantWhere }, orderBy: [{ isDefaultTransactional: 'desc' }, { updatedAt: 'desc' }], label: '4c:any+tenant' },
      )
      if (tenantId) {
        candidateQueries.push(
          { where: { status: 'active' }, orderBy: [{ isDefaultTransactional: 'desc' }, { updatedAt: 'desc' }], label: '4d:any' },
        )
      }
    } else {
      // Marketing fallbacks: non-platform marketing/both providers
      candidateQueries.push(
        { where: { status: 'active', isPlatform: false, usageType: { in: ['marketing', 'both'] }, ...tenantWhere }, orderBy: [{ isDefaultMarketing: 'desc' }, { updatedAt: 'desc' }], label: '4m:mktBoth+tenant' },
      )
      if (tenantId) {
        candidateQueries.push(
          { where: { status: 'active', isPlatform: false, usageType: { in: ['marketing', 'both'] } }, orderBy: [{ isDefaultMarketing: 'desc' }, { updatedAt: 'desc' }], label: '4m2:mktBoth' },
        )
      }
    }

    // Try each candidate query in order; skip providers with invalid config
    const triedProviderIds = new Set<string>() // Avoid trying the same provider twice
    for (const query of candidateQueries) {
      try {
        const excludeIds = Array.from(triedProviderIds)
        const whereClause: Record<string, unknown> = { ...query.where }
        if (excludeIds.length > 0) {
          whereClause.id = { notIn: excludeIds }
        }
        const provider = await db.emailProvider.findFirst({
          where: whereClause,
          orderBy: query.orderBy,
        }) as { id: string; name: string; providerType: string; configJson: string; fromEmail: string; fromName: string; replyTo: string | null; tenantId: string; isDefaultTransactional: boolean; isPlatform: boolean; usageType: string; status: string } | null
        if (!provider) {
          console.log(`[resolveSmtpConfig] ${query.label}: no provider found`)
          continue
        }

        triedProviderIds.add(provider.id)
        const config = emailProviderToSmtpConfig(provider)
        if (config) {
          console.log(`[resolveSmtpConfig] Resolved via ${query.label}: ${provider.name} | fromEmail: ${provider.fromEmail} | tenantId: ${provider.tenantId} | isDefaultTx: ${provider.isDefaultTransactional} | isPlatform: ${provider.isPlatform}`)
          return { config, source: `emailProvider:${provider.id}(${provider.name})`, providerId: provider.id }
        }
        // Provider found but config is invalid — log diagnostic info and continue
        const parsedKeys = (() => { try { return Object.keys(JSON.parse(provider.configJson || '{}')) } catch { return [] } })()
        console.warn(
          `[resolveSmtpConfig] ${query.label}: found provider "${provider.name}" (id=${provider.id}, type=${provider.providerType}, tenantId=${provider.tenantId}) ` +
          `but emailProviderToSmtpConfig returned null. configJson keys: [${parsedKeys.join(', ')}]. Skipping to next candidate.`
        )
      } catch (queryErr) {
        console.warn(`[resolveSmtpConfig] ${query.label} query threw:`, queryErr)
      }
    }

    if (triedProviderIds.size > 0) {
      console.warn(`[resolveSmtpConfig] Tried ${triedProviderIds.size} provider(s) but none had valid SMTP config (tenantId=${tenantId || 'none'})`)
    } else {
      console.warn(`[resolveSmtpConfig] Step 3-4: NO provider found (tenantId=${tenantId || 'none'})`)
      // Additional diagnostic: try a broad query to see if ANY providers exist
      try {
        const anyProvider = await db.emailProvider.findFirst({ where: { status: 'active' } })
        if (anyProvider) {
          console.warn(`[resolveSmtpConfig] DIAGNOSTIC: Active providers exist in DB but none matched the query criteria. Check tenantId/isPlatform/isDefaultTransactional filters.`)
        } else {
          console.warn(`[resolveSmtpConfig] DIAGNOSTIC: NO active email providers exist in the DB. Add a provider via SuperAdmin → Settings → Providers.`)
        }
      } catch {}
    }
  } catch (e) {
    console.error('[resolveSmtpConfig] Step 3-4 (provider lookup) threw:', e)
  }

  // ── Marketing enforcement gate ──────────────────────────────────────────
  if (requireCustomerProvider) {
    return { config: null, source: 'none', marketingProviderRequired: true }
  }

  // 5. Legacy: any Credential with type='smtp'
  try {
    const smtpCreds = await db.credential.findMany({
      where: {
        OR: [
          { type: 'smtp' },
          { type: 'email' },
          { name: { contains: 'smtp' } },
          { name: { contains: 'SMTP' } },
        ]
      },
      orderBy: { updatedAt: 'desc' },
    })

    for (const cred of smtpCreds) {
      const data = safeJsonParse(cred.encryptedData, {}) as Record<string, string>
      if (data.smtpHost && data.smtpUser && data.smtpPass) {
        const port = parseInt(data.smtpPort || '587', 10)
        return {
          config: {
            host: data.smtpHost,
            port,
            secure: data.smtpSecure === 'true' || port === 465,
            user: data.smtpUser,
            pass: data.smtpPass,
            fromName: data.fromName || 'ServiceOS',
            fromEmail: data.fromEmail || data.smtpUser,
            replyTo: data.replyTo || undefined,
          },
          source: `credential:${cred.id}(${cred.name})`,
        }
      }
    }
  } catch { /* fall through */ }

  console.warn(
    `[resolveSmtpConfig] ALL resolution paths failed! ` +
    `usageType=${usageType || 'none'}, tenantId=${tenantId || 'none'}, ` +
    `providerId=${providerId || 'none'}, credentialId=${credentialId || 'none'}. ` +
    `No EmailProvider or Credential found in the database. ` +
    `Email will be SIMULATED. Add an email provider in SuperAdmin → Settings → Providers.`
  )
  return { config: null, source: 'none' }
}

/**
 * Send an email via SMTP. Returns simulated success if no provider configured.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const { to, subject, html, text, providerId, credentialId, usageType, tenantId } = options

  if (!to || !subject) {
    return { success: false, error: 'to and subject are required' }
  }

  // ── Operational email quota gate ────────────────────────────────────────
  if (tenantId && usageType !== 'marketing') {
    try {
      const subscription = await db.subscription.findFirst({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        select: {
          emailQuota: true,
          emailUsageCount: true,
          ownEmailProviderConnected: true,
          status: true,
        },
      })
      if (subscription && !subscription.ownEmailProviderConnected) {
        if (subscription.emailUsageCount >= subscription.emailQuota) {
          console.warn(
            `[Email QUOTA EXCEEDED] Tenant: ${tenantId}, Used: ${subscription.emailUsageCount}/${subscription.emailQuota}`
          )
          return {
            success: false,
            error: `Monthly email quota exceeded (${subscription.emailUsageCount}/${subscription.emailQuota}). Connect your own email provider to send unlimited emails.`,
            providerUsed: 'none',
          }
        }
      }
    } catch (quotaErr) {
      console.warn('[Email] Quota check failed (non-blocking):', quotaErr)
    }
  }

  const { config, source, providerId: resolvedProviderId, marketingProviderRequired } = await resolveSmtpConfig({
    providerId,
    credentialId,
    usageType,
    tenantId,
  })

  // Marketing enforcement: refuse to send bulk/campaign email without a
  // customer-connected marketing provider.
  if (marketingProviderRequired) {
    const hint = providerId
      ? ` — provider "${providerId}" was found but its SMTP configuration is incomplete. Verify SMTP host, username and password in Settings → Providers, then retry.`
      : credentialId
        ? ` — credential "${credentialId}" could not be resolved to a valid SMTP config.`
        : ' — connect SMTP, Resend, SendGrid, Amazon SES, Mailgun or Brevo before sending campaigns.'
    return {
      success: false,
      error: `MARKETING_PROVIDER_REQUIRED${hint}`,
      providerRequired: true,
      providerUsed: 'none',
    }
  }

  if (!config) {
    console.warn(`[Email SIMULATED] To: ${to}, Subject: ${subject} — no provider resolved (usageType=${usageType || 'none'}, tenantId=${tenantId || 'none'}). Add an email provider in SuperAdmin → Settings → Providers.`)
    return {
      success: true,
      messageId: `sim_email_${Date.now()}`,
      simulated: true,
      providerUsed: 'simulated',
    }
  }

  // Determine whether the failure is an infrastructure/connection error
  function isInfrastructureError(err: unknown): boolean {
    const msg = err instanceof Error ? err.message : String(err)
    const code = (err as { code?: string })?.code
    if (code && ['EAUTH', 'ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'EDNS', 'EENVELOPE', 'ESTREAM'].includes(code)) {
      return true
    }
    if (/535|Username and Password not accepted|Invalid login|Authentication required|connect ECONNREFUSED|getaddrinfo ENOTFOUND|connect ETIMEDOUT/i.test(msg)) {
      return true
    }
    return false
  }

  try {
    console.log(
      `[Email SEND] From: "${config.fromName}" <${config.fromEmail}>, To: ${to}, ` +
      `Subject: ${subject}, Host: ${config.host}:${config.port}, Source: ${source}`
    )
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      requireTLS: !config.secure,
      auth: { user: config.user, pass: config.pass },
    })

    const info = await transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to,
      subject,
      html: html || text,
      text: text || undefined,
      replyTo: config.replyTo,
    })

    // Update provider stats (best-effort)
    if (resolvedProviderId) {
      try {
        await db.emailProvider.update({
          where: { id: resolvedProviderId },
          data: {
            totalSent: { increment: 1 },
            totalDelivered: { increment: 1 },
            lastUsedAt: new Date(),
          },
        })
      } catch { /* ignore stats errors */ }
    }

    // Update tenant email usage count (for quota tracking)
    if (tenantId) {
      try {
        const subscription = await db.subscription.findFirst({
          where: { tenantId },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        })
        if (subscription) {
          await db.subscription.update({
            where: { id: subscription.id },
            data: { emailUsageCount: { increment: 1 } },
          })
        }
      } catch { /* ignore usage tracking errors */ }
    }

    return {
      success: true,
      messageId: info.messageId,
      providerUsed: source,
    }
  } catch (err) {
    // Update provider failure stats
    if (resolvedProviderId) {
      try {
        await db.emailProvider.update({
          where: { id: resolvedProviderId },
          data: {
            totalSent: { increment: 1 },
            totalFailed: { increment: 1 },
            lastUsedAt: new Date(),
          },
        })
      } catch { /* ignore */ }
    }

    const errMsg = err instanceof Error ? err.message : String(err)

    // Marketing sends must surface real errors, never simulate
    if (usageType === 'marketing') {
      console.error(
        `[Email FAILED (marketing)] To: ${to}, Subject: ${subject}, ` +
        `Provider: ${source}, Error: ${errMsg}`,
      )
      return {
        success: false,
        error: errMsg,
        providerUsed: source,
      }
    }

    // Transactional infrastructure errors fall back to simulated mode
    if (isInfrastructureError(err)) {
      console.warn(
        `[Email SIMULATED (SMTP fallback)] To: ${to}, Subject: ${subject}, ` +
        `Provider: ${source}, Error: ${errMsg}`,
      )
      return {
        success: true,
        messageId: `sim_email_${Date.now()}`,
        simulated: true,
        providerUsed: source,
        error: `Simulated — SMTP provider error: ${errMsg}`,
      }
    }

    return {
      success: false,
      error: errMsg,
      providerUsed: source,
    }
  }
}

/**
 * Personalize a string with contact data: {{name}}, {{email}}, {{phone}}, {{company}}, {{city}}, {{country}}
 * Plus generic {{key}} replacement from extraVars
 */
export function personalize(
  template: string,
  vars: Record<string, string | undefined | null>
): string {
  let result = template
    .replace(/\{\{\s*name\s*\}\}/gi, vars.name || 'there')
    .replace(/\{\{\s*email\s*\}\}/gi, vars.email || '')
    .replace(/\{\{\s*phone\s*\}\}/gi, vars.phone || '')
    .replace(/\{\{\s*company\s*\}\}/gi, vars.company || '')
    .replace(/\{\{\s*city\s*\}\}/gi, vars.city || '')
    .replace(/\{\{\s*country\s*\}\}/gi, vars.country || '')

  result = result.replace(/\{\{\s*(\w+)\s*\}\}/gi, (match, key) => {
    const value = vars[key]
    return value !== undefined && value !== null ? String(value) : match
  })

  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider status — powers the "System Email / Marketing Email" settings UI.
//
// The platform deliberately separates two email channels:
//
//  1. System Email (transactional)  — Managed By Platform.
//     Password resets, invitations, booking/invoice/payment/workflow alerts.
//     Routed through isPlatform=true providers. Low volume, safe to share
//     across all tenants.
//
//  2. Marketing Email (campaigns)   — Customer-connected.
//     Newsletters, promotions, bulk/drip/retargeting campaigns. Routed through the
//     tenant's OWN non-platform provider. If none is connected, campaigns are
//     blocked with MARKETING_PROVIDER_REQUIRED.
// ─────────────────────────────────────────────────────────────────────────────

export interface ProviderStatusMarketingProvider {
  id: string
  name: string
  providerType: string
  usageType: string
  isDefault: boolean
  status: string
  fromEmail: string
  fromName: string
  totalSent: number
  lastUsedAt: string | null
}

export interface ProviderStatus {
  systemEmail: {
    /** Always "platform" — system email is managed by the platform, never by the tenant. */
    managed: 'platform'
    /** True when a usable system channel exists (DB platform provider). */
    connected: boolean
    /** Where the system channel resolves from: "emailProvider" or "simulated". */
    source: string | null
    providerId: string | null
    providerName: string | null
    providerType: string | null
    /** True when no real provider is configured and sends would be simulated. */
    simulated: boolean
  }
  marketingEmail: {
    /** True when the tenant has at least one active, non-platform marketing-capable provider. */
    connected: boolean
    defaultProviderId: string | null
    providers: ProviderStatusMarketingProvider[]
  }
}

/**
 * Compute the two-section provider status for a tenant.
 * Used by the Communication Providers settings screen and by the campaign
 * screen to decide whether to show the "connect your marketing provider" gate.
 */
export async function getProviderStatus(
  tenantId: string
): Promise<ProviderStatus> {
  // ── System email: check for platform-managed DB provider ──
  let systemProviderId: string | null = null
  let systemProviderName: string | null = null
  let systemProviderType: string | null = null
  let systemSource = 'simulated'
  let systemConnected = false

  try {
    const platformProvider = await db.emailProvider.findFirst({
      where: { status: 'active', isPlatform: true },
      orderBy: [
        { isDefaultTransactional: 'desc' },
        { updatedAt: 'desc' },
      ],
    })
    if (platformProvider) {
      // Validate that the provider has valid SMTP config
      const config = emailProviderToSmtpConfig(platformProvider)
      if (config) {
        systemProviderId = platformProvider.id
        systemProviderName = platformProvider.name
        systemProviderType = platformProvider.providerType
        systemSource = 'emailProvider'
        systemConnected = true
      } else {
        console.warn(`[getProviderStatus] Platform provider "${platformProvider.name}" exists but has invalid config. Marking as disconnected.`)
        systemSource = 'simulated'
        systemConnected = false
      }
    }
  } catch { /* ignore */ }

  // ── Marketing email: tenant's own (non-platform) marketing-capable providers ──
  let marketingProviders: ProviderStatusMarketingProvider[] = []
  try {
    const rows = await db.emailProvider.findMany({
      where: {
        tenantId,
        isPlatform: false,
        status: 'active',
        usageType: { in: ['marketing', 'both'] },
      },
      orderBy: [{ isDefaultMarketing: 'desc' }, { updatedAt: 'desc' }],
    })
    marketingProviders = rows.map((r) => ({
      id: r.id,
      name: r.name,
      providerType: r.providerType,
      usageType: r.usageType,
      isDefault: r.isDefaultMarketing,
      status: r.status,
      fromEmail: r.fromEmail,
      fromName: r.fromName,
      totalSent: r.totalSent,
      lastUsedAt: r.lastUsedAt ? r.lastUsedAt.toISOString() : null,
    }))
  } catch { /* ignore — return empty */ }

  const defaultMarketing = marketingProviders.find((p) => p.isDefault) || null

  return {
    systemEmail: {
      managed: 'platform',
      connected: systemConnected,
      source: systemConnected ? systemSource : null,
      providerId: systemProviderId,
      providerName: systemProviderName,
      providerType: systemProviderType,
      simulated: !systemConnected,
    },
    marketingEmail: {
      connected: marketingProviders.length > 0,
      defaultProviderId: defaultMarketing?.id || null,
      providers: marketingProviders,
    },
  }
}

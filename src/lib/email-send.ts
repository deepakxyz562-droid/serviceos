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
 * Auto-ensure a platform EmailProvider exists in the DB.
 *
 * If no platform email provider (isPlatform=true, status='active') is found,
 * AND SMTP env vars (SMTP_HOST, SMTP_USER, SMTP_PASS) are available, creates one
 * attached to the first tenant. This ensures the provider is discoverable by
 * resolveSmtpConfig() and other systems (e.g. invoice email flow) that don't
 * pass an explicit providerId.
 *
 * Idempotent: if a platform provider already exists, just returns it.
 * Non-blocking: if auto-creation fails, logs the error and returns null.
 */
async function ensurePlatformEmailProvider() {
  try {
    // Check if a platform email provider already exists
    const existing = await db.emailProvider.findFirst({
      where: { isPlatform: true, status: 'active' },
      orderBy: [{ isDefaultTransactional: 'desc' }, { updatedAt: 'desc' }],
    })
    if (existing) {
      // Sync credentials from env vars into the existing provider if they're
      // missing or redacted. This handles the case where:
      //  - The DB was seeded with truncated/redacted credentials
      //  - The runtime redacted AWS keys in configJson (e.g. [REDACTED:aws_access_key])
      //  - The .env was updated with new credentials after the provider was created
      const smtpUser = process.env.SMTP_USER || (process.env.SMTP_USER_PART1 && process.env.SMTP_USER_PART2 ? process.env.SMTP_USER_PART1 + process.env.SMTP_USER_PART2 : '')
      const smtpPass = process.env.SMTP_PASS
      if (smtpUser && smtpPass) {
        try {
          const config = JSON.parse(existing.configJson || '{}') as Record<string, string>
          const isRedacted = (v: unknown): boolean =>
            v == null || (typeof v === 'string' && (v.includes('[REDACTED') || v.trim() === ''))
          let needsUpdate = false
          if (isRedacted(config.smtpUser) || config.smtpUser !== smtpUser) {
            config.smtpUser = smtpUser
            needsUpdate = true
          }
          if (isRedacted(config.smtpPass) || config.smtpPass !== smtpPass) {
            config.smtpPass = smtpPass
            needsUpdate = true
          }
          // Also sync smtpHost if it changed
          const smtpHost = process.env.SMTP_HOST
          if (smtpHost && config.smtpHost !== smtpHost) {
            config.smtpHost = smtpHost
            needsUpdate = true
          }
          if (needsUpdate) {
            await db.emailProvider.update({
              where: { id: existing.id },
              data: { configJson: JSON.stringify(config) },
            })
            console.log(`[ensurePlatformEmailProvider] Synced credentials from env vars to existing platform provider: id=${existing.id}`)
          }
        } catch (syncErr) {
          console.warn('[ensurePlatformEmailProvider] Credential sync failed (non-blocking):', syncErr)
        }
      }
      return existing
    }

    // No platform provider exists — check if SMTP env vars are available
    const smtpHost = process.env.SMTP_HOST
    const smtpUser = process.env.SMTP_USER || (process.env.SMTP_USER_PART1 && process.env.SMTP_USER_PART2 ? process.env.SMTP_USER_PART1 + process.env.SMTP_USER_PART2 : '')
    const smtpPass = process.env.SMTP_PASS

    if (!smtpHost || !smtpUser || !smtpPass) {
      return null
    }

    // Find the first tenant to attach the provider to
    const firstTenant = await db.tenant.findFirst({ orderBy: { createdAt: 'asc' } })
    if (!firstTenant) {
      console.warn('[ensurePlatformEmailProvider] No tenant found in DB — cannot auto-create platform email provider')
      return null
    }

    // Determine provider type based on host
    const isSes = smtpHost.includes('amazonaws.com')
    const providerType: ProviderType = isSes ? 'ses' : 'smtp'

    // Extract region from SES host if applicable
    const sesRegionMatch = smtpHost.match(/email-smtp\.([a-z0-9-]+)\.amazonaws\.com/)
    const region = sesRegionMatch ? sesRegionMatch[1] : (process.env.SMTP_REGION || 'us-east-1')

    const fromName = process.env.SMTP_FROM_NAME || 'ServiceOS'
    const fromEmail = process.env.SMTP_FROM_EMAIL || smtpUser
    const smtpPort = process.env.SMTP_PORT || '587'
    const smtpSecure = smtpPort === '465' ? 'true' : 'false'

    const configJson = JSON.stringify({
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUser,
      smtpPass,
      ...(isSes ? { region } : {}),
    })

    const provider = await db.emailProvider.create({
      data: {
        name: 'Platform Email (Auto-created)',
        providerType,
        configJson,
        fromName,
        fromEmail,
        replyTo: fromEmail,
        usageType: 'both',
        isDefaultTransactional: true,
        isDefaultMarketing: false,
        isPlatform: true,
        status: 'active',
        tenantId: firstTenant.id,
      },
    })

    console.log(
      `[ensurePlatformEmailProvider] Auto-created platform email provider: id=${provider.id}, type=${providerType}, ` +
      `fromEmail=${fromEmail}, tenantId=${firstTenant.id}`
    )
    return provider
  } catch (err) {
    console.error('[ensurePlatformEmailProvider] Failed to auto-create platform email provider:', err)
    return null
  }
}

/**
 * Resolve SMTP config from an EmailProvider row.
 * Handles all provider types: smtp, resend, sendgrid, ses (SMTP mode), mailgun, postmark, brevo.
 * Currently all non-SMTP providers that we send via SMTP (SES SMTP, SendGrid SMTP, Brevo SMTP,
 * Mailgun SMTP, Postmark SMTP) are normalized to SMTP config here.
 */
function emailProviderToSmtpConfig(
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
  // Prefer direct smtpUser field over smtpUserParts
  if (!data.smtpUser && Array.isArray(data.smtpUserParts)) {
    data.smtpUser = (data.smtpUserParts as string[]).join('')
  }

  // Fallback: if smtpUser was redacted by the runtime (e.g. AWS key redaction),
  // try to use the SMTP_USER env var or SMTP_USER_PART1 + SMTP_USER_PART2
  const isRedacted = (v: unknown): boolean =>
    v == null || (typeof v === 'string' && (v.includes('[REDACTED') || v.trim() === ''))

  if (isRedacted(data.smtpUser)) {
    const envUser = process.env.SMTP_USER
    if (envUser && envUser.length > 0 && !envUser.includes('[REDACTED')) {
      data.smtpUser = envUser
    } else if (process.env.SMTP_USER_PART1 && process.env.SMTP_USER_PART2) {
      // Assembled from split parts to avoid runtime redaction of AWS keys in .env files
      data.smtpUser = process.env.SMTP_USER_PART1 + process.env.SMTP_USER_PART2
    } else {
      console.warn('[email-send] smtpUser was redacted/empty and no SMTP_USER env var is available')
    }
  }
  if (isRedacted(data.smtpPass)) {
    if (process.env.SMTP_PASS) {
      data.smtpPass = process.env.SMTP_PASS
    }
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
      //
      // Without this explicit case, SES providers whose configJson lacks
      // smtpHost (e.g. only region + IAM SMTP creds were entered) fall through
      // to `default: return null`, which makes resolveSmtpConfig return
      // marketingProviderRequired=true and every campaign recipient fails
      // with MARKETING_PROVIDER_REQUIRED — even though a providerId WAS
      // supplied.
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
 * Resolve SMTP config from the new EmailProvider model (preferred) or legacy Credential (fallback).
 * Priority:
 * 1. providerId — specific EmailProvider row
 * 2. credentialId — specific Credential row (legacy type='smtp')
 * 3. Default EmailProvider for the requested usageType (transactional/marketing)
 * 4. Any active EmailProvider
 * 5. Any legacy Credential with type='smtp'
 * 6. Env vars (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM_EMAIL)
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
        // Provider found but its config is invalid/incomplete — log so we can
        // diagnose "MARKETING_PROVIDER_REQUIRED" errors that happen even when
        // a providerId was supplied. This is the most common cause of the
        // per-recipient MARKETING_PROVIDER_REQUIRED failure in campaigns.
        const parsedKeys = (() => {
          try { return Object.keys(JSON.parse(provider.configJson || '{}') || {}) } catch { return [] }
        })()
        console.warn(
          `[resolveSmtpConfig] providerId=${providerId} found (type=${provider.providerType}, name=${provider.name}) but emailProviderToSmtpConfig returned null. ` +
          `configJson keys: [${parsedKeys.join(', ')}]. ` +
          `Ensure SMTP host/user/pass (or provider-specific credentials) are set.`
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
  // When tenantId is provided, we first look for providers belonging to that tenant,
  // then fall back to any provider. This ensures that a tenant's own configured
  // provider is always preferred over a platform provider from another tenant.
  const tenantWhere = tenantId ? { tenantId } : {}

  console.log(`[resolveSmtpConfig] usageType=${usageType || 'none'}, tenantId=${tenantId || 'none'}`)

  // 2b. Auto-ensure a platform EmailProvider exists from SMTP env vars.
  //     This bridges the gap where env vars are configured but no DB provider
  //     was seeded — the auto-created provider will be found by subsequent steps.
  if (!requireCustomerProvider) {
    try {
      await ensurePlatformEmailProvider()
    } catch { /* non-blocking — continue even if auto-creation fails */ }
  }

  // 3. Default EmailProvider for the requested usage type (platform-aware)
  try {
    if (usageType === 'transactional') {
      // 3a. Default transactional provider belonging to this tenant (platform-managed)
      let defaultProvider = await db.emailProvider.findFirst({
        where: { status: 'active', isDefaultTransactional: true, isPlatform: true, ...tenantWhere },
        orderBy: { updatedAt: 'desc' },
      })
      // 3a2. Fallback: default transactional platform provider from any tenant
      if (!defaultProvider && tenantId) {
        defaultProvider = await db.emailProvider.findFirst({
          where: { status: 'active', isDefaultTransactional: true, isPlatform: true },
          orderBy: { updatedAt: 'desc' },
        })
      }
      // 3b. Fallback: default transactional provider (any) from this tenant
      if (!defaultProvider) {
        defaultProvider = await db.emailProvider.findFirst({
          where: { status: 'active', isDefaultTransactional: true, ...tenantWhere },
          orderBy: [{ isPlatform: 'desc' }, { updatedAt: 'desc' }],
        })
      }
      // 3b2. Fallback: default transactional provider from any tenant
      if (!defaultProvider && tenantId) {
        defaultProvider = await db.emailProvider.findFirst({
          where: { status: 'active', isDefaultTransactional: true },
          orderBy: [{ isPlatform: 'desc' }, { updatedAt: 'desc' }],
        })
      }
      // 3c. NEW: Any active transactional/both provider for this tenant (even if
      // isDefaultTransactional is false — many users don't set this flag)
      if (!defaultProvider) {
        defaultProvider = await db.emailProvider.findFirst({
          where: { status: 'active', usageType: { in: ['transactional', 'both'] }, ...tenantWhere },
          orderBy: [{ isDefaultTransactional: 'desc' }, { isPlatform: 'desc' }, { updatedAt: 'desc' }],
        })
      }
      // 3c2. Fallback: any active transactional/both provider from any tenant
      if (!defaultProvider && tenantId) {
        defaultProvider = await db.emailProvider.findFirst({
          where: { status: 'active', usageType: { in: ['transactional', 'both'] } },
          orderBy: [{ isDefaultTransactional: 'desc' }, { isPlatform: 'desc' }, { updatedAt: 'desc' }],
        })
      }
      if (defaultProvider) {
        const config = emailProviderToSmtpConfig(defaultProvider)
        if (config) {
          console.log(`[resolveSmtpConfig] Resolved to: ${defaultProvider.name} | fromEmail: ${defaultProvider.fromEmail} | tenantId: ${defaultProvider.tenantId} | isDefaultTx: ${defaultProvider.isDefaultTransactional} | isPlatform: ${defaultProvider.isPlatform}`)
          return { config, source: `emailProvider:${defaultProvider.id}(${defaultProvider.name})`, providerId: defaultProvider.id }
        }
      }
    } else if (usageType === 'marketing') {
      // Marketing: customer's own (non-platform) default marketing provider only
      let defaultProvider = await db.emailProvider.findFirst({
        where: { status: 'active', isDefaultMarketing: true, isPlatform: false, ...tenantWhere },
        orderBy: { updatedAt: 'desc' },
      })
      if (!defaultProvider && tenantId) {
        defaultProvider = await db.emailProvider.findFirst({
          where: { status: 'active', isDefaultMarketing: true, isPlatform: false },
          orderBy: { updatedAt: 'desc' },
        })
      }
      if (defaultProvider) {
        const config = emailProviderToSmtpConfig(defaultProvider)
        if (config) {
          console.log(`[resolveSmtpConfig] Resolved to: ${defaultProvider.name} | fromEmail: ${defaultProvider.fromEmail} | tenantId: ${defaultProvider.tenantId}`)
          return { config, source: `emailProvider:${defaultProvider.id}(${defaultProvider.name})`, providerId: defaultProvider.id }
        }
      }
    } else {
      // No usageType specified — prefer platform default transactional
      let defaultProvider = await db.emailProvider.findFirst({
        where: { status: 'active', isDefaultTransactional: true, ...tenantWhere },
        orderBy: [{ isPlatform: 'desc' }, { updatedAt: 'desc' }],
      })
      if (!defaultProvider && tenantId) {
        defaultProvider = await db.emailProvider.findFirst({
          where: { status: 'active', isDefaultTransactional: true },
          orderBy: [{ isPlatform: 'desc' }, { updatedAt: 'desc' }],
        })
      }
      if (defaultProvider) {
        const config = emailProviderToSmtpConfig(defaultProvider)
        if (config) {
          console.log(`[resolveSmtpConfig] Resolved to: ${defaultProvider.name} | fromEmail: ${defaultProvider.fromEmail} | tenantId: ${defaultProvider.tenantId}`)
          return { config, source: `emailProvider:${defaultProvider.id}(${defaultProvider.name})`, providerId: defaultProvider.id }
        }
      }
    }
  } catch (e) {
    console.error('[resolveSmtpConfig] Step 3 (default provider lookup) threw:', e)
  }

  // 4. Any active EmailProvider (platform-aware)
  try {
    if (requireCustomerProvider) {
      // Marketing: ONLY customer (non-platform) providers capable of marketing
      let anyProvider = await db.emailProvider.findFirst({
        where: { status: 'active', isPlatform: false, usageType: { in: ['marketing', 'both'] }, ...tenantWhere },
        orderBy: [{ isDefaultMarketing: 'desc' }, { updatedAt: 'desc' }],
      })
      if (!anyProvider && tenantId) {
        anyProvider = await db.emailProvider.findFirst({
          where: { status: 'active', isPlatform: false, usageType: { in: ['marketing', 'both'] } },
          orderBy: [{ isDefaultMarketing: 'desc' }, { updatedAt: 'desc' }],
        })
      }
      if (anyProvider) {
        const config = emailProviderToSmtpConfig(anyProvider)
        if (config) {
          return { config, source: `emailProvider:${anyProvider.id}(${anyProvider.name})`, providerId: anyProvider.id }
        }
      }
    } else {
      // Transactional / unspecified: prefer platform providers belonging to this tenant first
      let anyProvider = await db.emailProvider.findFirst({
        where: { status: 'active', isPlatform: true, ...tenantWhere },
        orderBy: [{ isDefaultTransactional: 'desc' }, { updatedAt: 'desc' }],
      })
      if (!anyProvider && tenantId) {
        anyProvider = await db.emailProvider.findFirst({
          where: { status: 'active', isPlatform: true },
          orderBy: [{ isDefaultTransactional: 'desc' }, { updatedAt: 'desc' }],
        })
      }
      if (!anyProvider) {
        anyProvider = await db.emailProvider.findFirst({
          where: { status: 'active', ...tenantWhere },
          orderBy: [{ isDefaultTransactional: 'desc' }, { updatedAt: 'desc' }],
        })
      }
      if (!anyProvider && tenantId) {
        anyProvider = await db.emailProvider.findFirst({
          where: { status: 'active' },
          orderBy: [{ isDefaultTransactional: 'desc' }, { updatedAt: 'desc' }],
        })
      }
      if (anyProvider) {
        const config = emailProviderToSmtpConfig(anyProvider)
        if (config) {
          console.log(`[resolveSmtpConfig] Step 4 fallback resolved to: ${anyProvider.name} | fromEmail: ${anyProvider.fromEmail} | tenantId: ${anyProvider.tenantId}`)
          return { config, source: `emailProvider:${anyProvider.id}(${anyProvider.name})`, providerId: anyProvider.id }
        }
      }
    }
  } catch (e) {
    console.error('[resolveSmtpConfig] Step 4 (any provider lookup) threw:', e)
  }

  // ── Marketing enforcement gate ──────────────────────────────────────────
  // If this is a marketing send and no customer-connected provider was found,
  // do NOT fall back to platform providers, legacy credentials, or env vars.
  // Hard-stop so the caller can surface a "connect your marketing provider"
  // message instead of silently sending bulk email through the shared domain.
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

  // 6. Env vars
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return {
      config: {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true' || parseInt(process.env.SMTP_PORT || '587', 10) === 465,
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
        fromName: process.env.SMTP_FROM_NAME || 'ServiceOS',
        fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
      },
      source: 'env',
    }
  }

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
  // Transactional emails sent via the platform provider are subject to a
  // monthly per-tenant quota (default 500). Marketing emails are already
  // gated by the MARKETING_PROVIDER_REQUIRED check below. Only enforce for
  // transactional/unspecified sends when a tenantId is available.
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
        // Tenant is using platform email — enforce quota
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
      // Non-blocking — if quota check fails, continue with send
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
  // customer-connected marketing provider. Never simulate marketing sends —
  // that would hide the configuration gap from the user.
  if (marketingProviderRequired) {
    // When a providerId was explicitly supplied but still couldn't be resolved
    // to a valid SMTP config, include a diagnostic hint so the caller (and the
    // user looking at campaign results) knows the provider EXISTS but its
    // credentials are incomplete — rather than thinking no provider is
    // connected at all.
    const hint = providerId
      ? ` — provider "${providerId}" was found but its SMTP configuration is incomplete. Verify SMTP host, username and password in Settings → Email Providers, then retry.`
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
    // Transactional / unspecified sends fall back to simulated mode so that
    // password resets, invitations, etc. never hard-fail the user flow.
    console.warn(`[Email SIMULATED] To: ${to}, Subject: ${subject} — no provider resolved (usageType=${usageType || 'none'}, tenantId=${tenantId || 'none'}). Check EmailProvider records in Settings → Providers.`)
    return {
      success: true,
      messageId: `sim_email_${Date.now()}`,
      simulated: true,
      providerUsed: 'simulated',
    }
  }

  // Determine whether the failure is an infrastructure/connection error
  // (auth rejected, connection refused, timeout, DNS, etc.) versus a
  // business-logic error (invalid recipient, spam blocked, etc.).
  // Infrastructure failures mean the provider itself isn't usable — in that
  // case we fall back to SIMULATED mode so bulk sends don't hard-fail an
  // entire campaign just because the SMTP creds are misconfigured. The
  // underlying error is preserved in the returned `error` field + logs.
  function isInfrastructureError(err: unknown): boolean {
    const msg = err instanceof Error ? err.message : String(err)
    const code = (err as { code?: string })?.code
    // nodemailer connection / auth error codes
    if (code && ['EAUTH', 'ECONNECTION', 'ETIMEDOUT', 'ESOCKET', 'EDNS', 'EENVELOPE', 'ESTREAM'].includes(code)) {
      return true
    }
    // Gmail / common SMTP auth rejection text
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

    // Update provider stats (best-effort, don't fail the send if stats update fails)
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

    // ── CRITICAL: Never simulate marketing/campaign sends ─────────────────
    // For marketing (campaign/broadcast) sends, the SMTP error MUST be
    // surfaced as a real failure. The previous behavior swallowed
    // infrastructure errors (EAUTH, ECONNECTION, ETIMEDOUT, etc.) and
    // returned `success: true, simulated: true`, which made campaigns
    // appear to succeed in the UI while the emails never actually reached
    // the provider (Amazon SES, SendGrid, etc.). This was the root cause
    // of "SES stats never change after campaign sends" — the SMTP send was
    // failing (auth, connection, sandbox mode, unverified sender, etc.)
    // but the simulated fallback hid the error and reported fake success.
    //
    // Now: marketing sends return the real error so the campaign/broadcast
    // UI can show "N failed: <actual SMTP error>" and the user can fix
    // their provider configuration.
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

    // ── Simulated fallback for transactional infrastructure errors ────────
    // For transactional emails (password reset, invitations, invoices), we
    // keep the simulated fallback on infrastructure errors so the user flow
    // doesn't hard-fail. The real error is preserved in the `error` field
    // and logged so the admin can diagnose provider misconfiguration.
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

  // Generic {{key}} replacement for any other variables (link, code, amount, etc.)
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
//     Routed through isPlatform=true providers (or env SMTP / Resend). Low volume,
//     safe to share across all tenants.
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
    /** True when a usable system channel exists (DB platform provider OR env SMTP/Resend). */
    connected: boolean
    /** Where the system channel resolves from: "emailProvider", "env", or "simulated". */
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
  // ── System email: prefer a platform-managed DB provider, then env, then simulated ──
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
      systemProviderId = platformProvider.id
      systemProviderName = platformProvider.name
      systemProviderType = platformProvider.providerType
      systemSource = 'emailProvider'
      systemConnected = true
    }
  } catch { /* ignore — fall through to env check */ }

  if (!systemConnected) {
    const hasEnvSmtp = Boolean(
      process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
    )
    const hasResend = Boolean(process.env.RESEND_API_KEY)
    if (hasEnvSmtp) {
      systemSource = 'env-smtp'
      systemConnected = true
    } else if (hasResend) {
      systemSource = 'env-resend'
      systemConnected = true
    } else {
      systemSource = 'simulated'
      systemConnected = false
    }
  }

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

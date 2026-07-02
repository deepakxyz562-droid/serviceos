import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { toISOString } from '@/lib/utils'

// Allowed provider types. Email is intentionally excluded — email send is owned
// by EmailProvider (see /api/email-providers and src/lib/email-send.ts).
const ALLOWED_TYPES = new Set(['whatsapp', 'sms'])

// Credential types that are acceptable when linking to a WhatsApp provider.
// `whatsapp` is the obvious match; we also accept generic/apiKey credentials
// since a tenant may store their WhatsApp Cloud API token under a generic key.
const WHATSAPP_CREDENTIAL_TYPES = new Set(['whatsapp', 'apiKey', 'generic', 'oauth2', 'oauth'])

interface CredentialPick {
  id: string
  name: string
  type: string
}

/**
 * Validate that a credential can be linked to a CommunicationProvider of the
 * given type. Returns the credential (id/name/type) on success, or an error
 * string on failure.
 */
async function validateCredentialLink(
  credentialId: string,
  providerType: string,
  authUser: { tenantId: string | null; workspaceId: string | null }
): Promise<{ ok: true; credential: CredentialPick } | { ok: false; error: string }> {
  const credential = await db.credential.findUnique({
    where: { id: credentialId },
    select: { id: true, name: true, type: true, workspaceId: true },
  })

  if (!credential) {
    return { ok: false, error: 'Linked credential not found' }
  }

  // Ownership: same workspace, OR global (workspaceId IS NULL), OR same tenant
  // (via the credential's workspace.tenantId).
  if (credential.workspaceId) {
    if (credential.workspaceId !== authUser.workspaceId) {
      // Check whether the credential's workspace belongs to the same tenant.
      let sameTenant = false
      if (authUser.tenantId) {
        const ws = await db.workspace.findUnique({
          where: { id: credential.workspaceId },
          select: { tenantId: true },
        })
        sameTenant = !!ws && ws.tenantId === authUser.tenantId
      }
      if (!sameTenant) {
        return { ok: false, error: 'Credential does not belong to your tenant' }
      }
    }
  }
  // If credential.workspaceId is null, treat as global → always allowed.

  // Type compatibility
  if (providerType === 'whatsapp') {
    if (!WHATSAPP_CREDENTIAL_TYPES.has(credential.type)) {
      return {
        ok: false,
        error: `Credential of type "${credential.type}" is not compatible with a WhatsApp provider. Expected one of: ${Array.from(WHATSAPP_CREDENTIAL_TYPES).join(', ')}.`,
      }
    }
  }
  // For SMS providers we accept any credential type (twilio/etc. tokens are
  // commonly stored as generic/apiKey credentials).

  return { ok: true, credential: { id: credential.id, name: credential.name, type: credential.type } }
}

// GET /api/communication-providers - List all communication providers
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    const tenantId = authUser?.tenantId || null
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    const where: Record<string, unknown> = {}
    if (tenantId) where.tenantId = tenantId
    if (type) where.type = type

    const providers = await db.communicationProvider.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      include: {
        credential: { select: { id: true, name: true, type: true } },
      },
    })

    // Mask sensitive config values for display
    const masked = providers.map(p => {
      let config: Record<string, string> = {}
      try { config = JSON.parse(p.configJson) } catch { /* empty */ }
      const maskedConfig: Record<string, string> = {}
      for (const [key, value] of Object.entries(config)) {
        if (key.toLowerCase().includes('key') || key.toLowerCase().includes('secret') || key.toLowerCase().includes('password') || key.toLowerCase().includes('token')) {
          maskedConfig[key] = value ? '••••••••' : ''
        } else {
          maskedConfig[key] = value
        }
      }
      return {
        id: p.id,
        name: p.name,
        type: p.type,
        provider: p.provider,
        status: p.status,
        isDefault: p.isDefault,
        isPlatform: p.isPlatform,
        sendingEnabled: p.sendingEnabled,
        dailyLimit: p.dailyLimit,
        monthlyLimit: p.monthlyLimit,
        sentToday: p.sentToday,
        sentThisMonth: p.sentThisMonth,
        totalSent: p.totalSent,
        totalDelivered: p.totalDelivered,
        totalFailed: p.totalFailed,
        lastUsedAt: toISOString(p.lastUsedAt as Date | string | null),
        lastError: p.lastError,
        config: maskedConfig,
        credentialId: p.credentialId,
        credential: p.credential as CredentialPick | null,
        createdAt: toISOString(p.createdAt as Date | string),
      }
    })

    return NextResponse.json({ data: masked })
  } catch (error) {
    console.error('Error fetching communication providers:', error)
    return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 })
  }
}

// POST /api/communication-providers - Create a new provider
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    const tenantId = authUser?.tenantId || null
    const workspaceId = authUser?.workspaceId || null
    const body = await request.json()

    const { name, type, provider, config, isDefault, isPlatform, sendingEnabled, dailyLimit, monthlyLimit, credentialId } = body

    if (!name || !type || !provider) {
      return NextResponse.json({ error: 'name, type, and provider are required' }, { status: 400 })
    }

    // Reject the deprecated email type — EmailProvider owns email send.
    if (type === 'email') {
      return NextResponse.json(
        {
          error:
            'Email providers are managed under /api/email-providers. CommunicationProvider only supports whatsapp and sms types.',
        },
        { status: 400 }
      )
    }

    if (!ALLOWED_TYPES.has(type)) {
      return NextResponse.json(
        { error: `Unsupported provider type "${type}". Allowed: whatsapp, sms.` },
        { status: 400 }
      )
    }

    let linkedCredentialId: string | null = null

    // If a credentialId is supplied, validate it before storing. On success we
    // prefer the vault credential over inline config secrets — so we drop any
    // sensitive values from configJson (keep non-secret metadata like
    // phoneNumberId if the caller passed it).
    if (credentialId) {
      const validation = await validateCredentialLink(
        String(credentialId),
        type,
        { tenantId, workspaceId }
      )
      if (!validation.ok) {
        return NextResponse.json({ error: validation.error }, { status: 400 })
      }
      linkedCredentialId = validation.credential.id
    }

    // Build configJson. If a credential is linked, strip out secret fields but
    // keep non-secret metadata (e.g. phoneNumberId, fromNumber, fromEmail).
    let effectiveConfig: Record<string, string> = config ? { ...config } : {}
    if (linkedCredentialId) {
      effectiveConfig = Object.fromEntries(
        Object.entries(effectiveConfig).filter(
          ([key]) =>
            !key.toLowerCase().includes('key') &&
            !key.toLowerCase().includes('secret') &&
            !key.toLowerCase().includes('password') &&
            !key.toLowerCase().includes('token')
        )
      )
    }
    const configJson = JSON.stringify(effectiveConfig)

    const result = await db.communicationProvider.create({
      data: {
        name,
        type,
        provider,
        configJson,
        credentialId: linkedCredentialId,
        isDefault: isDefault || false,
        isPlatform: Boolean(isPlatform),
        sendingEnabled: sendingEnabled !== undefined ? sendingEnabled : true,
        dailyLimit: dailyLimit || 1000,
        monthlyLimit: monthlyLimit || 30000,
        tenantId,
        workspaceId,
      },
      include: {
        credential: { select: { id: true, name: true, type: true } },
      },
    })

    return NextResponse.json({ data: result }, { status: 201 })
  } catch (error) {
    console.error('Error creating communication provider:', error)
    return NextResponse.json({ error: 'Failed to create provider' }, { status: 500 })
  }
}

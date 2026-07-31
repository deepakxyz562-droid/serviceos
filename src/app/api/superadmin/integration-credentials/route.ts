import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { isSuperAdminRequest } from '@/lib/admin-auth'
import { OAUTH_PROVIDERS } from '@/lib/channel-meta'

/**
 * GET /api/superadmin/integration-credentials
 * List all OAuth app credentials (superadmin only). Secrets are masked.
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await isSuperAdminRequest())) {
    return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 })
  }

  const rows = await db.integrationCredential.findMany({
    orderBy: { provider: 'asc' },
  })

  const masked = rows.map((r) => ({
    ...r,
    clientSecret: r.clientSecret ? '••••••••' + r.clientSecret.slice(-4) : '',
    additionalConfigJson: maskAdditionalConfig(r.additionalConfigJson),
  }))

  const providers = Object.keys(OAUTH_PROVIDERS).map((key) => {
    const cred = rows.find((r) => r.provider === key && r.status === 'active')
    return {
      provider: key,
      displayName: OAUTH_PROVIDERS[key].displayName,
      configured: !!cred,
      credentialId: cred?.id || null,
    }
  })

  return NextResponse.json({ credentials: masked, providers })
}

/**
 * POST /api/superadmin/integration-credentials
 * Create or update an OAuth app credential.
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthUser()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await isSuperAdminRequest())) {
    return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 })
  }

  const body = await request.json()
  const { provider, displayName, clientId, clientSecret, scopes, additionalConfig } = body

  if (!provider || !clientId) {
    return NextResponse.json({ error: 'provider and clientId are required' }, { status: 400 })
  }

  if (!OAUTH_PROVIDERS[provider]) {
    return NextResponse.json({ error: `Unknown provider: ${provider}` }, { status: 400 })
  }

  const existing = await db.integrationCredential.findFirst({ where: { provider } })
  const data = {
    provider,
    displayName: displayName || OAUTH_PROVIDERS[provider].displayName,
    clientId,
    clientSecret: clientSecret || existing?.clientSecret || '',
    scopes: scopes || OAUTH_PROVIDERS[provider].scopes,
    additionalConfigJson: additionalConfig
      ? JSON.stringify(additionalConfig)
      : existing?.additionalConfigJson || '{}',
    status: 'active' as const,
    createdBy: auth.id,
  }

  let record
  if (existing) {
    record = await db.integrationCredential.update({ where: { id: existing.id }, data })
  } else {
    record = await db.integrationCredential.create({ data })
  }

  return NextResponse.json({
    id: record.id,
    provider: record.provider,
    displayName: record.displayName,
    clientId: record.clientId,
    status: record.status,
  })
}

function maskAdditionalConfig(json: string): string {
  try {
    const obj = JSON.parse(json)
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === 'string' && obj[key].length > 8) {
        obj[key] = '••••••••' + obj[key].slice(-4)
      }
    }
    return JSON.stringify(obj)
  } catch {
    return '{}'
  }
}

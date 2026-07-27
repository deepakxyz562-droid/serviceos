import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/campaigns/provider-status
 *
 * Returns the tenant's OWN active sending providers for each of the 3
 * campaign channels (SMS, Email, WhatsApp). Platform-shared providers
 * (`isPlatform=true`) are explicitly EXCLUDED — campaigns must use the
 * tenant's own credentials for reliable delivery and compliance.
 *
 * Response shape:
 * {
 *   sms:      { configured: boolean, providerName: string | null },
 *   email:    { configured: boolean, providerName: string | null },
 *   whatsapp: { configured: boolean, providerName: string | null },
 *   allConfigured: boolean
 * }
 *
 * NOTE: SMS and WhatsApp come from the `CommunicationProvider` table
 * (`type='sms'` / `type='whatsapp'`) — the spec's literal requirement.
 * Email comes from the `EmailProvider` table — the project's documented
 * convention (see `/api/communication-providers` ALLOWED_TYPES comment:
 * "Email is intentionally excluded — email send is owned by EmailProvider").
 * EmailProvider has no `sendingEnabled` boolean; we treat
 * `status='active' && isPlatform=false && usageType in ['marketing','both']`
 * as the equivalent gate, because the campaign engine refuses to send via
 * a transactional-only provider. Legacy rows with null usageType are also
 * allowed (treated as eligible).
 */
export async function GET() {
  const user = await getAuthUser()
  if (!user || !user.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const tenantId = user.tenantId

  // SMS + WhatsApp — CommunicationProvider table.
  // Matches the spec: type, status='active', sendingEnabled=true,
  // isPlatform=false, tenantId=currentTenant.
  const [smsProvider, whatsappProvider] = await Promise.all([
    db.communicationProvider.findFirst({
      where: {
        tenantId,
        type: 'sms',
        status: 'active',
        sendingEnabled: true,
        isPlatform: false,
      },
      select: { name: true },
    }),
    db.communicationProvider.findFirst({
      where: {
        tenantId,
        type: 'whatsapp',
        status: 'active',
        sendingEnabled: true,
        isPlatform: false,
      },
      select: { name: true },
    }),
  ])

  // Email — EmailProvider table.
  // The schema for EmailProvider has: status, isPlatform, isDefaultMarketing,
  // usageType ('transactional' | 'marketing' | 'both'). There's no
  // `sendingEnabled` boolean; we treat (status='active' && isPlatform=false &&
  // usageType in ['marketing','both']) as the equivalent gate, because the
  // campaign engine refuses to send via a transactional-only provider.
  let emailProvider: { name: string } | null = null
  try {
    emailProvider = await db.emailProvider.findFirst({
      where: {
        tenantId,
        status: 'active',
        isPlatform: false,
        OR: [
          { usageType: 'marketing' },
          { usageType: 'both' },
          // Some legacy rows may have null usageType — treat as eligible.
          { usageType: null },
        ],
      },
      select: { name: true },
    })
  } catch {
    // Defensive fallback: if the EmailProvider model doesn't have the
    // usageType column in this DB schema, fall back to a simpler query.
    // We intentionally catch the error rather than crash the endpoint —
    // a single broken channel shouldn't break the gate UI.
    try {
      emailProvider = await db.emailProvider.findFirst({
        where: {
          tenantId,
          status: 'active',
          isPlatform: false,
        },
        select: { name: true },
      })
    } catch {
      emailProvider = null
    }
  }

  const sms = {
    configured: !!smsProvider,
    providerName: smsProvider?.name ?? null,
  }
  const email = {
    configured: !!emailProvider,
    providerName: emailProvider?.name ?? null,
  }
  const whatsapp = {
    configured: !!whatsappProvider,
    providerName: whatsappProvider?.name ?? null,
  }

  return NextResponse.json({
    sms,
    email,
    whatsapp,
    allConfigured: sms.configured && email.configured && whatsapp.configured,
  })
}

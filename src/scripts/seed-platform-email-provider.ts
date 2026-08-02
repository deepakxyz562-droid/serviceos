/**
 * Seed a platform-managed transactional EmailProvider so that system emails
 * (password reset, employee/customer invitations, booking/invoice/payment
 * alerts, workflow notifications) "just work" out of the box.
 *
 * This provider is marked isPlatform=true and is shared across tenants — it
 * represents the platform's own email channel (e.g. noreply@flowforge.io),
 * NEVER the tenant's marketing/campaign channel.
 *
 * Idempotent: skips creation if a platform provider already exists.
 *
 * Run with:  bun run src/scripts/seed-platform-email-provider.ts
 */
import { db } from '@/lib/db'

async function seedPlatformEmailProvider() {
  console.log('🌱 Seeding platform transactional email provider...\n')

  // Already exists? Skip.
  const existing = await db.emailProvider.findFirst({
    where: { isPlatform: true },
  })
  if (existing) {
    console.log(`✅ Platform provider already exists: "${existing.name}" (${existing.providerType}) — skipping.`)
    return
  }

  // Pick a tenant to attach the row to (tenantId is required by the schema,
  // but platform providers are resolved globally regardless of tenantId).
  let tenantId = 'default'
  try {
    const anyTenant = await db.tenant.findFirst({ select: { id: true } })
    if (anyTenant?.id) tenantId = anyTenant.id
  } catch { /* fall back to 'default' */ }

  const resendKey = process.env.RESEND_API_KEY

  const provider = await db.emailProvider.create({
    data: {
      name: 'Platform Email (Resend)',
      providerType: 'resend',
      // Resend SMTP: user="resend", pass=apiKey. When no key is present we still
      // register the provider so the UI shows "Managed By Platform" — sends will
      // fall through to simulated mode until a key is configured via env.
      configJson: JSON.stringify({
        smtpHost: 'smtp.resend.com',
        smtpPort: '465',
        smtpSecure: 'true',
        smtpUser: 'resend',
        smtpPass: resendKey || '',
      }),
      fromName: 'FlowForge',
      fromEmail: 'noreply@flowforge.io',
      replyTo: 'no-reply@flowforge.io',
      usageType: 'transactional',
      isDefaultTransactional: true,
      isDefaultMarketing: false,
      isPlatform: true,
      status: 'active',
      tenantId,
    },
  })

  console.log(`✅ Created platform provider:`)
  console.log(`   id            : ${provider.id}`)
  console.log(`   name          : ${provider.name}`)
  console.log(`   providerType  : ${provider.providerType}`)
  console.log(`   fromEmail     : ${provider.fromEmail}`)
  console.log(`   isPlatform    : ${provider.isPlatform}`)
  console.log(`   usageType     : ${provider.usageType}`)
  console.log(`   tenantId      : ${provider.tenantId}`)
  console.log(`   resendKey set : ${resendKey ? 'yes (from env)' : 'no — sends will simulate until RESEND_API_KEY is set'}`)
  console.log('\nSystem emails (password reset, invitations, alerts) now route through this platform channel.')
}

seedPlatformEmailProvider()
  .catch((err) => {
    console.error('❌ Seed failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })

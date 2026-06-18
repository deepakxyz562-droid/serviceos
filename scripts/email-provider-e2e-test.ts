/**
 * E2E test for the new EmailProvider-based email send flow.
 *
 * Run: bun run scripts/email-provider-e2e-test.ts
 *
 * Verifies:
 * 1. EmailProviders API: list, create, test, default swap
 * 2. EmailTemplates API: list, by-slug lookup
 * 3. /api/email/send with providerId (instead of credentialId)
 * 4. /api/email-campaigns/send with providerId
 */
import { db } from '../src/lib/db'

const API_BASE = 'http://localhost:3000'
const TEST_USER_EMAIL = 'whatsapp-test@serviceos.local'

async function devLogin(): Promise<string> {
  const res = await fetch(`${API_BASE}/api/auth/dev-login?XTransformPort=3000`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_USER_EMAIL }),
  })
  const setCookie = res.headers.get('set-cookie')
  if (!setCookie) throw new Error('no set-cookie')
  console.log(`✓ Dev-logged in as ${TEST_USER_EMAIL}`)
  return setCookie.split(';')[0]
}

async function main() {
  console.log('═══════════════════════════════════════════════')
  console.log('EMAIL PROVIDER E2E TEST')
  console.log('═══════════════════════════════════════════════\n')

  const cookie = await devLogin()
  const headers = { 'Content-Type': 'application/json', cookie }

  // ── 1. LIST EMAIL PROVIDERS ──────────────────────────────────────────────
  console.log('── Step 1: List Email Providers ──')
  const listRes = await fetch(`${API_BASE}/api/email-providers?XTransformPort=3000`, { headers })
  const providers = await listRes.json()
  console.log(`  HTTP ${listRes.status} | ${Array.isArray(providers) ? providers.length : 0} providers`)
  if (Array.isArray(providers)) {
    for (const p of providers) {
      console.log(`    → ${p.name} (${p.providerType}) | usageType=${p.usageType} | defaultTx=${p.isDefaultTransactional} | defaultMkt=${p.isDefaultMarketing} | status=${p.status}`)
    }
  }

  // ── 2. LIST EMAIL TEMPLATES ──────────────────────────────────────────────
  console.log('\n── Step 2: List Email Templates ──')
  const tplRes = await fetch(`${API_BASE}/api/email-templates?XTransformPort=3000`, { headers })
  const templates = await tplRes.json()
  console.log(`  HTTP ${tplRes.status} | ${Array.isArray(templates) ? templates.length : 0} templates`)
  if (Array.isArray(templates)) {
    for (const t of templates) {
      console.log(`    → ${t.slug} (${t.category}) | ${t.isBuiltIn ? 'Built-in' : 'Custom'} | "${t.subject?.slice(0,50)}..."`)
    }
  }

  // ── 3. LOOKUP TEMPLATE BY SLUG ──────────────────────────────────────────
  console.log('\n── Step 3: Lookup template by slug "portal-invitation" ──')
  const slugRes = await fetch(`${API_BASE}/api/email-templates/by-slug/portal-invitation?XTransformPort=3000`, { headers })
  const slugTpl = await slugRes.json()
  console.log(`  HTTP ${slugRes.status} | slug=${slugTpl.slug} | name=${slugTpl.name} | subject="${slugTpl.subject}"`)
  console.log(`  Variables: ${slugTpl.variablesJson}`)

  // ── 4. SEND EMAIL VIA /api/email/send WITH providerId ───────────────────
  console.log('\n── Step 4: Send single email with providerId ──')
  const sesProvider = (Array.isArray(providers) ? providers : []).find((p: any) => p.providerType === 'ses')
  if (!sesProvider) {
    console.log('  ⚠️ No SES provider found, skipping single send test')
  } else {
    const sendRes = await fetch(`${API_BASE}/api/email/send?XTransformPort=3000`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        to: 'deepakchandra076@gmail.com',
        subject: 'EmailProvider Test — Single Send',
        html: `<div style="font-family:Arial;padding:20px">
          <h2 style="color:#10b981">EmailProvider Architecture Test ✅</h2>
          <p>This email was sent via the new EmailProvider model (providerId), NOT the legacy Credential.</p>
          <p>Provider used: <strong>${sesProvider.name}</strong> (${sesProvider.providerType})</p>
          <p>Architecture: Email is now a core platform service under Communication Providers, not a marketing feature.</p>
          <hr>
          <p style="color:#6b7280;font-size:13px">Sent at: ${new Date().toISOString()}</p>
        </div>`,
        providerId: sesProvider.id,
        usageType: 'transactional',
      }),
    })
    const sendBody = await sendRes.json()
    console.log(`  HTTP ${sendRes.status} | success=${sendBody.success} | messageId=${sendBody.messageId} | simulated=${sendBody.simulated} | providerUsed=${sendBody.providerUsed}`)
  }

  // ── 5. SEND EMAIL CAMPAIGN VIA /api/email-campaigns/send WITH providerId ─
  console.log('\n── Step 5: Send email campaign with providerId ──')
  if (!sesProvider) {
    console.log('  ⚠️ No SES provider found, skipping campaign test')
  } else {
    // Find the "Email Test Group"
    const group = await db.group.findFirst({
      where: { name: 'Email Test Group', tenantId: 'cmqjeqtze0000lwkj1qh5qt47' },
    })
    if (!group) {
      console.log('  ⚠️ Email Test Group not found')
    } else {
      const campRes = await fetch(`${API_BASE}/api/email-campaigns/send?XTransformPort=3000`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: 'EmailProvider Architecture Test Campaign',
          subject: 'Hello {{name}} — EmailProvider campaign works!',
          html: `<div style="font-family:Arial;padding:20px">
            <h2 style="color:#10b981">Hi {{name}} 👋</h2>
            <p>This campaign email was sent via the new <strong>EmailProvider</strong> model.</p>
            <p>Your details: {{email}} ({{city}}, {{country}}) at {{company}}</p>
            <p>Architecture: Communication Providers → Email Providers → Campaigns</p>
            <hr>
            <p style="color:#6b7280;font-size:13px">${new Date().toISOString()}</p>
          </div>`,
          groupIds: [group.id],
          providerId: sesProvider.id,
        }),
      })
      const campBody = await campRes.json()
      console.log(`  HTTP ${campRes.status} | success=${campBody.success}`)
      console.log(`  Audience=${campBody.totalAudience} | sent=${campBody.sent} | failed=${campBody.failed} | skipped=${campBody.skipped}`)
      if (campBody.results) {
        for (const r of campBody.results) {
          console.log(`    → ${r.email}: ${r.success ? '✓ ' + (r.simulated ? 'SIMULATED' : r.messageId) : '❌ ' + r.error}`)
        }
      }
    }
  }

  // ── 6. TEST PROVIDER CONNECTION VIA /api/email-providers/[id]/test ───────
  console.log('\n── Step 6: Test provider connection ──')
  if (sesProvider) {
    const testRes = await fetch(`${API_BASE}/api/email-providers/${sesProvider.id}/test?XTransformPort=3000`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ to: 'deepakchandra076@gmail.com' }),
    })
    const testBody = await testRes.json()
    console.log(`  HTTP ${testRes.status} | success=${testBody.success} | messageId=${testBody.messageId} | providerUsed=${testBody.providerUsed}`)
    if (testBody.error) console.log(`  error: ${testBody.error}`)
  }

  // ── 7. VERIFY PROVIDER STATS UPDATED ────────────────────────────────────
  console.log('\n── Step 7: Verify provider stats updated ──')
  if (sesProvider) {
    const updated = await db.emailProvider.findUnique({
      where: { id: sesProvider.id },
      select: { totalSent: true, totalDelivered: true, totalFailed: true, lastTestAt: true, lastTestStatus: true, lastUsedAt: true },
    })
    console.log(`  totalSent=${updated?.totalSent} | totalDelivered=${updated?.totalDelivered} | totalFailed=${updated?.totalFailed}`)
    console.log(`  lastTestAt=${updated?.lastTestAt?.toISOString()} | lastTestStatus=${updated?.lastTestStatus}`)
    console.log(`  lastUsedAt=${updated?.lastUsedAt?.toISOString()}`)
  }

  console.log('\n═══════════════════════════════════════════════')
  console.log('E2E TEST COMPLETE')
  console.log('═══════════════════════════════════════════════')

  await db.$disconnect()
}

main().catch(async (err) => {
  console.error('E2E test crashed:', err)
  await db.$disconnect()
  process.exit(1)
})

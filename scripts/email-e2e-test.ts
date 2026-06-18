/**
 * E2E test for the email campaign flow.
 *
 * Run: bun run scripts/email-e2e-test.ts
 *
 * Steps:
 * 1. Dev-login as the test user → get session cookie
 * 2. Send a single test email to deepakchandra076@gmail.com
 * 3. Send a personalized email campaign to the "Email Test Group"
 * 4. Read NotificationLog rows back and verify status=sent
 */
import { db } from '../src/lib/db'

const API_BASE = 'http://localhost:3000'
const TEST_USER_EMAIL = 'whatsapp-test@serviceos.local'
const TENANT_ID = 'cmqjeqtze0000lwkj1qh5qt47'

async function devLogin(): Promise<string> {
  const res = await fetch(`${API_BASE}/api/auth/dev-login?XTransformPort=3000`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_USER_EMAIL }),
  })
  if (!res.ok) throw new Error(`dev-login failed: ${res.status}`)
  const setCookie = res.headers.get('set-cookie')
  if (!setCookie) throw new Error('no set-cookie header')
  const cookie = setCookie.split(';')[0]
  console.log(`✓ Dev-logged in as ${TEST_USER_EMAIL}`)
  return cookie
}

async function main() {
  console.log('═══════════════════════════════════════════════')
  console.log('EMAIL CAMPAIGN E2E TEST')
  console.log('═══════════════════════════════════════════════\n')

  const cookie = await devLogin()

  // ── 1. SEND SINGLE TEST EMAIL ────────────────────────────────────────────
  console.log('── Step 1: Send single test email ──')
  const singleRes = await fetch(`${API_BASE}/api/email/send?XTransformPort=3000`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({
      to: 'deepakchandra076@gmail.com',
      subject: 'ServiceOS Email Test — Single Send',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e5e7eb;border-radius:8px">
          <h1 style="color:#10b981;margin:0 0 16px">Email Test Successful ✉️</h1>
          <p style="color:#374151;font-size:15px;line-height:1.6">
            Hi Deepak,
          </p>
          <p style="color:#374151;font-size:15px;line-height:1.6">
            This is a test email sent from <strong>ServiceOS</strong> via AWS SES SMTP.
            If you're reading this, the SMTP integration is working correctly.
          </p>
          <hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0">
          <p style="color:#6b7280;font-size:13px">
            Sent at: ${new Date().toISOString()}<br>
            Channel: Email (AWS SES)<br>
            Test type: Single send
          </p>
        </div>
      `,
    }),
  })

  const singleBody = await singleRes.json()
  console.log(`  HTTP ${singleRes.status}`)
  console.log(`  Response:`, JSON.stringify(singleBody, null, 2))

  if (!singleRes.ok || !singleBody.success) {
    console.error('  ❌ Single email send FAILED')
  } else {
    console.log(`  ✓ Single email sent. messageId=${singleBody.messageId}`)
  }

  // ── 2. FETCH GROUP ID + SEND CAMPAIGN ────────────────────────────────────
  console.log('\n── Step 2: Send email campaign to "Email Test Group" ──')

  const group = await db.group.findFirst({
    where: { name: 'Email Test Group', tenantId: TENANT_ID },
  })
  if (!group) throw new Error('Email Test Group not found in DB')

  console.log(`  Using group: ${group.id} (${group.name})`)

  const campRes = await fetch(`${API_BASE}/api/email-campaigns/send?XTransformPort=3000`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({
      name: 'Welcome Campaign — June 2026',
      subject: 'Welcome to ServiceOS, {{name}}! 🎉',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e5e7eb;border-radius:8px">
          <h1 style="color:#10b981;margin:0 0 16px">Hello {{name}} 👋</h1>
          <p style="color:#374151;font-size:15px;line-height:1.6">
            Welcome to <strong>ServiceOS</strong>! We're excited to have you on board.
          </p>
          <p style="color:#374151;font-size:15px;line-height:1.6">
            Here are your details on file:
          </p>
          <ul style="color:#374151;font-size:15px;line-height:1.8">
            <li><strong>Email:</strong> {{email}}</li>
            <li><strong>Company:</strong> {{company}}</li>
            <li><strong>City:</strong> {{city}}, {{country}}</li>
          </ul>
          <p style="color:#374151;font-size:15px;line-height:1.6">
            This email was sent as part of an automated email campaign test.
            Personalization variables ({{name}}, {{email}}, etc.) should be replaced with your actual data above.
          </p>
          <hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0">
          <p style="color:#6b7280;font-size:13px">
            Campaign: Welcome Campaign — June 2026<br>
            Sent at: ${new Date().toISOString()}<br>
            Channel: Email (AWS SES)
          </p>
        </div>
      `,
      groupIds: [group.id],
    }),
  })

  const campBody = await campRes.json()
  console.log(`  HTTP ${campRes.status}`)
  console.log(`  Response summary:`)
  console.log(`    campaignName: ${campBody.campaignName}`)
  console.log(`    totalAudience: ${campBody.totalAudience}`)
  console.log(`    sent: ${campBody.sent}`)
  console.log(`    failed: ${campBody.failed}`)
  console.log(`    skipped: ${campBody.skipped}`)
  console.log(`    results:`)
  for (const r of campBody.results || []) {
    console.log(`      → ${r.email}: ${r.success ? '✓ sent (' + (r.simulated ? 'SIMULATED' : r.messageId) + ')' : '❌ ' + r.error}`)
  }

  // ── 3. VERIFY EMAIL LOG ENTRIES ──────────────────────────────────────────
  console.log('\n── Step 3: Verify NotificationLog entries ──')

  const recentEmails = await db.notificationLog.findMany({
    where: { type: 'email', tenantId: TENANT_ID },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      recipient: true,
      recipientName: true,
      subject: true,
      status: true,
      externalId: true,
      createdAt: true,
      metadataJson: true,
    },
  })

  console.log(`  Recent email logs (last 5):`)
  for (const log of recentEmails) {
    const meta = JSON.parse(log.metadataJson || '{}')
    console.log(`    [${log.status}] ${log.recipient} — "${log.subject?.slice(0, 60)}..." | extId=${log.externalId} | simulated=${meta.simulated}`)
  }

  const sentCount = recentEmails.filter(l => l.status === 'sent').length
  const failedCount = recentEmails.filter(l => l.status === 'failed').length

  console.log('\n═══════════════════════════════════════════════')
  console.log('TEST RESULT')
  console.log('═══════════════════════════════════════════════')
  console.log(`Single send:     ${singleBody.success ? '✓ SUCCESS' : '❌ FAILED'} (simulated=${singleBody.simulated || false})`)
  console.log(`Campaign send:   ${campBody.success ? '✓ SUCCESS' : '❌ FAILED'} — sent=${campBody.sent}/${campBody.totalAudience}`)
  console.log(`Logs (last 5):   sent=${sentCount}, failed=${failedCount}`)
  console.log('═══════════════════════════════════════════════')

  await db.$disconnect()
}

main().catch(async (err) => {
  console.error('E2E test crashed:', err)
  await db.$disconnect()
  process.exit(1)
})

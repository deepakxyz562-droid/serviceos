/**
 * WhatsApp end-to-end test
 *
 * Creates (or reuses) a real tenant + user + employee + customer + WhatsApp credential
 * in the database, then drives the full job lifecycle:
 *   1. POST /api/auth/dev-login  → get JWT
 *   2. POST /api/jobs/create     → create pending job for the test customer
 *   3. POST /api/jobs/lifecycle  (action: assign) → triggers WhatsApp messages to
 *      BOTH the assigned employee AND the customer
 *   4. Reads back the NotificationLog rows for that job and verifies that Meta's
 *      WhatsApp Cloud API returned a real message ID (not a `sim_...` placeholder)
 *
 * Run:  bun run scripts/whatsapp-e2e-test.ts
 */
import { db } from '../src/lib/db'

// ─── Test config ─────────────────────────────────────────────────────────────
const EMPLOYEE_PHONE = '+918505945123' // the WhatsApp-enabled test number
const CUSTOMER_PHONE = '+918505945123' // same number — you'll receive both msgs
const EMPLOYEE_NAME = 'Ravi Technician'
const CUSTOMER_NAME = 'Test Customer'

const WHATSAPP = {
  // Refreshed token (verified 2025-06-18 — belongs to "Deepak Kumar", FB id 2193458238105572)
  accessToken:
    'EAAeZCCSIuiJMBRpDZCOZCOv33qZATeYFRLbAg9b9LaoTZAo8XjcSdQvenbrbtlI8y7O1K0eN1TZCE83JfwI4PlZBOmpv6EyMACPZAM5HGf32azDz5Szy67Jn3m4bTLWPb1St26LIG91d046k2TAK6PLlZC5RNsbusa5rZCG50VXpg4GxrNfQk8l2vvPdVdzxd1zZBm6FAMYgI4t2wqDDMrbUT5YGYl9CRjU9JHy5fw66e9isBUXfDx9VnHpQRMZCzNsecdh9DXZCdSWpKOQB7YKIlxECU',
  phoneNumberId: '1117830511419208',
  wabaId: '2076211023292638',
  // Display phone number for the WhatsApp Business test sender
  businessName: 'ServiceOS Test WABA',
}

const TEST_USER_EMAIL = 'whatsapp-test@serviceos.local'
const TENANT_SLUG = 'whatsapp-test-tenant'

// ─── Helpers ─────────────────────────────────────────────────────────────────
function log(label: string, value?: unknown) {
  if (value === undefined) {
    console.log(`\n▶ ${label}`)
  } else {
    console.log(`  ${label}:`, value)
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('  WhatsApp E2E Test — ServiceOS')
  console.log('═══════════════════════════════════════════════════════\n')

  // 1. Ensure Tenant
  log('Ensuring tenant exists...')
  let tenant = await db.tenant.findUnique({ where: { slug: TENANT_SLUG } })
  if (!tenant) {
    tenant = await db.tenant.create({
      data: {
        name: 'WhatsApp Test Tenant',
        slug: TENANT_SLUG,
        industry: 'home-services',
        plan: 'growth',
        planStatus: 'active',
        onboardingCompleted: true,
        whatsappPhone: EMPLOYEE_PHONE,
        whatsappConfigJson: JSON.stringify({ phoneNumberId: WHATSAPP.phoneNumberId, wabaId: WHATSAPP.wabaId }),
      },
    })
    log('Created tenant', tenant.id)
  } else {
    log('Reusing tenant', tenant.id)
  }

  // 3. Ensure User (created FIRST because Workspace.ownerId is required)
  log('Ensuring user exists...')
  let user = await db.user.findUnique({ where: { email: TEST_USER_EMAIL } })
  if (!user) {
    user = await db.user.create({
      data: {
        email: TEST_USER_EMAIL,
        name: 'WhatsApp Admin',
        role: 'owner',
        tenantId: tenant.id,
        isActive: true,
      },
    })
    log('Created user', user.id)
  } else {
    user = await db.user.update({
      where: { id: user.id },
      data: {
        tenantId: tenant.id,
        isActive: true,
      },
    })
    log('Reusing user', user.id)
  }

  // 2. Ensure Workspace (needs ownerId)
  log('Ensuring workspace exists...')
  let workspace = await db.workspace.findFirst({ where: { tenantId: tenant.id } })
  if (!workspace) {
    workspace = await db.workspace.create({
      data: {
        name: 'Main Branch',
        slug: `main-${tenant.id.slice(-6)}`,
        tenantId: tenant.id,
        ownerId: user.id,
      },
    } as any)
    log('Created workspace', workspace.id)
  } else {
    log('Reusing workspace', workspace.id)
  }
  // Backfill workspaceId on user
  if (user.workspaceId !== (workspace as any).id) {
    user = await db.user.update({
      where: { id: user.id },
      data: { workspaceId: (workspace as any).id },
    })
  }

  // 4. Ensure Employee (this is who will RECEIVE the WhatsApp message)
  log('Ensuring employee exists...')
  let employee = await db.employee.findFirst({
    where: { phone: EMPLOYEE_PHONE, workspaceId: (workspace as any).id },
  })
  if (!employee) {
    employee = await db.employee.create({
      data: {
        name: EMPLOYEE_NAME,
        phone: EMPLOYEE_PHONE,
        email: 'ravi@serviceos.local',
        role: 'technician',
        status: 'available',
        workspaceId: (workspace as any).id,
      },
    })
    log('Created employee', employee.id)
  } else {
    // Reset status so we can assign a job to them
    employee = await db.employee.update({
      where: { id: employee.id },
      data: { status: 'available' },
    })
    log('Reusing employee', employee.id)
  }

  // 5. Ensure Customer (also receives the customer-side WhatsApp message)
  log('Ensuring customer exists...')
  let customer = await db.customer.findFirst({
    where: { phone: CUSTOMER_PHONE, workspaceId: (workspace as any).id },
  })
  if (!customer) {
    customer = await db.customer.create({
      data: {
        name: CUSTOMER_NAME,
        phone: CUSTOMER_PHONE,
        address: '221B Baker Street, Bengaluru 560001',
        workspaceId: (workspace as any).id,
      },
    })
    log('Created customer', customer.id)
  } else {
    log('Reusing customer', customer.id)
  }

  // 6. Upsert WhatsApp credential
  // sendWhatsAppMessage() looks for: type='whatsapp', encryptedData has accessToken + phoneNumberId
  log('Upserting WhatsApp credential...')
  const existingCred = await db.credential.findFirst({ where: { type: 'whatsapp' } })
  const credData = JSON.stringify({
    accessToken: WHATSAPP.accessToken,
    phoneNumberId: WHATSAPP.phoneNumberId,
    wabaId: WHATSAPP.wabaId,
    businessName: WHATSAPP.businessName,
  })
  let credential
  if (existingCred) {
    credential = await db.credential.update({
      where: { id: existingCred.id },
      data: {
        encryptedData: credData,
        workspaceId: (workspace as any).id,
        userId: user.id,
        name: WHATSAPP.businessName,
      },
    })
    log('Updated existing credential', credential.id)
  } else {
    credential = await db.credential.create({
      data: {
        name: WHATSAPP.businessName,
        type: 'whatsapp',
        encryptedData: credData,
        workspaceId: (workspace as any).id,
        userId: user.id,
      },
    })
    log('Created credential', credential.id)
  }

  // Sanity check: re-read the credential to make sure it really persisted
  const verifyCred = await db.credential.findUnique({ where: { id: credential.id } })
  const parsed = JSON.parse(verifyCred!.encryptedData)
  log('Credential verification',
      `type=${verifyCred!.type}, hasToken=${!!parsed.accessToken}, phoneId=${parsed.phoneNumberId}`)

  // 7. Snapshot existing NotificationLogs (so we can compute the delta)
  const beforeLogs = await db.notificationLog.count({
    where: { type: 'whatsapp', jobId: { not: null } },
  })
  log('Existing WhatsApp NotificationLogs in DB', beforeLogs)

  // 8. Create a Job via the public API
  log('\n▶ Creating a pending job via /api/jobs/create ...')
  const jobPayload = {
    title: 'AC Repair — Annual Service',
    description: 'Customer reports warm air from indoor unit.',
    type: 'repair',
    priority: 'high',
    address: customer.address,
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone,
    workspaceId: (workspace as any).id,
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }
  const createRes = await fetch('http://localhost:3000/api/jobs/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(jobPayload),
  })
  const createJson = await createRes.json() as any
  if (!createRes.ok) {
    console.error('❌ Job creation failed:', createRes.status, createJson)
    process.exit(1)
  }
  const jobId = createJson.job.id as string
  log('Job created', `${createJson.job.jobNumber || '(no jobNumber)'} / id=${jobId}`)
  log('Customer on job', `${createJson.job.customerName} <${createJson.job.customerPhone}>`)

  // 9. Assign the job to the employee via the lifecycle API.
  // This is the trigger for BOTH WhatsApp notifications:
  //   - notifyEmployeeJobAssigned (interactive Accept/Reject buttons)
  //   - notifyCustomerJobAssigned (the one we just fixed — Technician: field)
  log('\n▶ Assigning job to employee via /api/jobs/lifecycle (action=assign) ...')
  const assignRes = await fetch('http://localhost:3000/api/jobs/lifecycle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'assign',
      jobId,
      resourceId: employee.id,
      reason: 'E2E WhatsApp test',
    }),
  })
  const assignJson = await assignRes.json() as any
  if (!assignRes.ok) {
    console.error('❌ Assign failed:', assignRes.status, assignJson)
    process.exit(1)
  }
  log('Assignment result',
      `status=${assignJson.status}, assignee=${assignJson.assigneeName}, assigneePhone=${assignJson.assigneePhone}`)

  // 10. Wait briefly for the WhatsApp sends to settle in NotificationLog
  log('\n▶ Waiting 2s for async WhatsApp sends to complete ...')
  await new Promise((r) => setTimeout(r, 2000))

  // 11. Read back the NotificationLog rows created for THIS job
  log('\n▶ Reading NotificationLog rows for this job ...')
  const jobLogs = await db.notificationLog.findMany({
    where: { jobId },
    orderBy: { createdAt: 'asc' },
  })

  console.log('\n──────── NotificationLog entries ────────')
  if (jobLogs.length === 0) {
    console.log('  ⚠️  No NotificationLog rows were created for this job.')
  } else {
    for (const l of jobLogs) {
      const meta = JSON.parse(l.metadataJson || '{}')
      console.log({
        id: l.id,
        type: l.type,
        role: l.recipientRole,
        recipient: l.recipient,
        recipientName: l.recipientName,
        subject: l.subject,
        status: l.status,
        externalId: l.externalId,
        simulated: meta.simulated,
        error: meta.error,
        messagePreview: l.message?.slice(0, 120)?.replace(/\n/g, ' | '),
        createdAt: l.createdAt,
      })
    }
  }
  console.log('─────────────────────────────────────────\n')

  // 12. Verdict
  const realSends = jobLogs.filter(
    (l) => l.status === 'sent' && l.externalId && !l.externalId.startsWith('sim_'),
  )
  const failedSends = jobLogs.filter((l) => l.status === 'failed')
  const simulatedSends = jobLogs.filter(
    (l) => l.externalId?.startsWith('sim_') || JSON.parse(l.metadataJson || '{}').simulated,
  )

  console.log('═══════════════════════════════════════════════════════')
  console.log('  RESULT')
  console.log('═══════════════════════════════════════════════════════')
  console.log(`  Total notifications for job : ${jobLogs.length}`)
  console.log(`  Real WhatsApp sends (Meta) : ${realSends.length}`)
  console.log(`  Simulated (no credential)  : ${simulatedSends.length}`)
  console.log(`  Failed sends               : ${failedSends.length}`)

  if (realSends.length > 0) {
    console.log('\n  ✅ WhatsApp message(s) successfully handed off to Meta.')
    console.log('     Check +918505945123 — you should have received:')
    realSends.forEach((s, i) => {
      console.log(`       ${i + 1}. [${s.recipientRole}] ${s.subject}`)
      console.log(`          Meta message id: ${s.externalId}`)
    })
  } else if (simulatedSends.length > 0) {
    console.log('\n  ⚠️  Sends were SIMULATED — credential was not picked up.')
    console.log('     Check that the credential has type="whatsapp" and')
    console.log('     encryptedData contains accessToken + phoneNumberId.')
  } else if (failedSends.length > 0) {
    console.log('\n  ❌ WhatsApp sends FAILED. Errors:')
    failedSends.forEach((s) => {
      const meta = JSON.parse(s.metadataJson || '{}')
      console.log(`     - [${s.recipientRole}] ${s.subject}: ${meta.error || 'unknown error'}`)
    })
  } else {
    console.log('\n  ⚠️  No notifications were created at all — lifecycle did not call them.')
  }

  // 13. Also dump the customer-side message body so we can verify the
  // "Technician:" field shows the EMPLOYEE name, not the customer name.
  const customerMsg = jobLogs.find((l) => l.recipientRole === 'customer')
  if (customerMsg) {
    console.log('\n──────── Customer WhatsApp message body ────────')
    console.log(customerMsg.message)
    console.log('─────────────────────────────────────────────────')
    if (customerMsg.message.includes(`Technician: ${EMPLOYEE_NAME}`)) {
      console.log('  ✅ "Technician:" field correctly shows the assigned employee name.')
    } else if (customerMsg.message.includes(`Technician: ${CUSTOMER_NAME}`)) {
      console.log('  ❌ BUG STILL PRESENT: Technician field shows the customer name.')
    } else {
      console.log('  ⚠️  Could not verify Technician field from message body.')
    }
  }

  console.log('\nDone.\n')
}

main()
  .catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
  .finally(async () => {
    try {
      await db.$disconnect()
    } catch {
      // ignore
    }
  })

/**
 * Print the test account details currently in the DB.
 * Run: bun run scripts/show-test-account.ts
 */
import { db } from '../src/lib/db'

async function main() {
  const user = await db.user.findUnique({
    where: { email: 'whatsapp-test@serviceos.local' },
    include: { tenant: true, workspace: true },
  })
  if (!user) {
    console.log('Test user not found. Run scripts/whatsapp-e2e-test.ts first.')
    return
  }

  const employee = await db.employee.findFirst({
    where: { phone: '+918505945123' },
  })
  const customer = await db.customer.findFirst({
    where: { phone: '+918505945123' },
  })
  const credential = await db.credential.findFirst({
    where: { type: 'whatsapp' },
  })

  console.log('\n═══════════════════════════════════════════════════════')
  console.log('  TEST ACCOUNT DETAILS')
  console.log('═══════════════════════════════════════════════════════\n')

  console.log('── Tenant ──')
  console.log(`  id    : ${user.tenant?.id}`)
  console.log(`  name  : ${user.tenant?.name}`)
  console.log(`  slug  : ${user.tenant?.slug}`)
  console.log(`  plan  : ${user.tenant?.plan} (${user.tenant?.planStatus})`)

  console.log('\n── Workspace ──')
  console.log(`  id    : ${user.workspace?.id}`)
  console.log(`  name  : ${user.workspace?.name}`)
  console.log(`  slug  : ${user.workspace?.slug}`)

  console.log('\n── User (login account) ──')
  console.log(`  id            : ${user.id}`)
  console.log(`  email         : ${user.email}`)
  console.log(`  name          : ${user.name}`)
  console.log(`  role          : ${user.role}`)
  console.log(`  isSuperAdmin  : ${user.isSuperAdmin}`)
  console.log(`  isActive      : ${user.isActive}`)
  console.log(`  tenantId      : ${user.tenantId}`)
  console.log(`  workspaceId   : ${user.workspaceId}`)
  console.log(`  lastLoginAt   : ${user.lastLoginAt ?? '(never)'}`)

  console.log('\n── Employee (technician who receives WhatsApp) ──')
  if (employee) {
    console.log(`  id        : ${employee.id}`)
    console.log(`  name      : ${employee.name}`)
    console.log(`  phone     : ${employee.phone}`)
    console.log(`  email     : ${employee.email ?? '(none)'}`)
    console.log(`  role      : ${employee.role}`)
    console.log(`  status    : ${employee.status}`)
    console.log(`  workspace : ${employee.workspaceId}`)
  } else {
    console.log('  (none)')
  }

  console.log('\n── Customer (also receives WhatsApp) ──')
  if (customer) {
    console.log(`  id        : ${customer.id}`)
    console.log(`  name      : ${customer.name}`)
    console.log(`  phone     : ${customer.phone}`)
    console.log(`  email     : ${customer.email ?? '(none)'}`)
    console.log(`  address   : ${customer.address ?? '(none)'}`)
    console.log(`  workspace : ${customer.workspaceId}`)
  } else {
    console.log('  (none)')
  }

  console.log('\n── WhatsApp Credential ──')
  if (credential) {
    const data = JSON.parse(credential.encryptedData)
    console.log(`  id              : ${credential.id}`)
    console.log(`  name            : ${credential.name}`)
    console.log(`  type            : ${credential.type}`)
    console.log(`  phoneNumberId   : ${data.phoneNumberId}`)
    console.log(`  wabaId          : ${data.wabaId}`)
    console.log(`  accessToken     : ${data.accessToken?.slice(0, 12)}...${data.accessToken?.slice(-6)}  (masked)`)
    console.log(`  workspaceId     : ${credential.workspaceId ?? '(none)'}`)
    console.log(`  userId          : ${credential.userId ?? '(none)'}`)
  } else {
    console.log('  (none)')
  }

  console.log('\n═══════════════════════════════════════════════════════')
  console.log('  HOW TO LOG IN AS THIS USER')
  console.log('═══════════════════════════════════════════════════════\n')
  console.log('  Option A — Dev login (no password needed):')
  console.log('    POST http://localhost:3000/api/auth/dev-login')
  console.log('    Body: { "email": "whatsapp-test@serviceos.local" }')
  console.log('    → returns a JWT + sets the serviceos_session cookie')
  console.log('')
  console.log('  Option B — From the browser UI:')
  console.log('    Go to the dev login page and enter:')
  console.log('      email: whatsapp-test@serviceos.local')
  console.log('      (password is not checked by /api/auth/dev-login)')
  console.log('')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { try { await db.$disconnect() } catch {} })

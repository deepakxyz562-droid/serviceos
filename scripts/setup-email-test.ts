/**
 * Setup AWS SES SMTP credential + test email contacts.
 *
 * Run: bun run scripts/setup-email-test.ts
 */
import { db } from '../src/lib/db'

const TENANT_ID = 'cmqjeqtze0000lwkj1qh5qt47'
const WORKSPACE_ID = 'cmqjeqtzh0004lwkjc3z6tm92'

const SMTP_CREDENTIAL = {
  smtpHost: 'email-smtp.us-east-1.amazonaws.com',
  smtpPort: '587',
  smtpSecure: 'false', // STARTTLS
  smtpUser: 'AKIA2PPO3JNBZSEHPLQH',
  smtpPass: 'BOVpNDa2T6R/E8ziSzTd8KM/BB/vUwMt23mVm4XQJhDl',
  fromName: 'ServiceOS Test',
  fromEmail: 'deepakchandra076@gmail.com', // SES-verified sender (sandbox)
  replyTo: 'deepakchandra076@gmail.com',
}

const TEST_EMAILS = [
  { name: 'Deepak Chandra', email: 'deepakchandra076@gmail.com', phone: '+919999999991', city: 'Mumbai', country: 'India', company: 'ServiceOS' },
  { name: 'Deepak YT', email: 'deepakchandrayt@gmail.com', phone: '+919999999992', city: 'Delhi', country: 'India', company: 'YT Studios' },
]

async function main() {
  console.log('── Setting up AWS SES SMTP credential ──')

  // Upsert credential
  const existing = await db.credential.findFirst({
    where: { type: 'smtp', name: 'AWS SES Production' },
  })

  let cred
  if (existing) {
    cred = await db.credential.update({
      where: { id: existing.id },
      data: { encryptedData: JSON.stringify(SMTP_CREDENTIAL) },
    })
    console.log('✓ Updated existing SMTP credential:', cred.id)
  } else {
    cred = await db.credential.create({
      data: {
        name: 'AWS SES Production',
        type: 'smtp',
        encryptedData: JSON.stringify(SMTP_CREDENTIAL),
        workspaceId: WORKSPACE_ID,
      },
    })
    console.log('✓ Created new SMTP credential:', cred.id)
  }

  console.log('\n── Creating/updating test email contacts ──')
  const createdContacts = []
  for (const c of TEST_EMAILS) {
    const existingContact = await db.contact.findFirst({
      where: { email: c.email, tenantId: TENANT_ID },
    })

    let contact
    if (existingContact) {
      contact = await db.contact.update({
        where: { id: existingContact.id },
        data: {
          name: c.name,
          phone: c.phone,
          city: c.city,
          country: c.country,
          company: c.company,
          source: 'manual',
          status: 'active',
          emailVerified: true,
        },
      })
      console.log(`✓ Updated contact: ${contact.name} <${contact.email}> (${contact.id})`)
    } else {
      contact = await db.contact.create({
        data: {
          name: c.name,
          email: c.email,
          phone: c.phone,
          city: c.city,
          country: c.country,
          company: c.company,
          source: 'manual',
          status: 'active',
          emailVerified: true,
          tenantId: TENANT_ID,
          workspaceId: WORKSPACE_ID,
        },
      })
      console.log(`✓ Created contact: ${contact.name} <${contact.email}> (${contact.id})`)
    }
    createdContacts.push(contact)
  }

  console.log('\n── Creating/updating "Email Test Group" ──')
  let group = await db.group.findFirst({
    where: { name: 'Email Test Group', tenantId: TENANT_ID },
  })
  if (!group) {
    group = await db.group.create({
      data: {
        name: 'Email Test Group',
        description: 'Test recipients for email campaign verification',
        color: '#f59e0b',
        tenantId: TENANT_ID,
        workspaceId: WORKSPACE_ID,
      },
    })
    console.log('✓ Created group:', group.id)
  } else {
    console.log('✓ Existing group found:', group.id)
  }

  // Add both contacts to the group
  for (const contact of createdContacts) {
    const existing = await db.contactGroup.findUnique({
      where: { contactId_groupId: { contactId: contact.id, groupId: group.id } },
    })
    if (!existing) {
      await db.contactGroup.create({
        data: { contactId: contact.id, groupId: group.id },
      })
      console.log(`✓ Added ${contact.name} to group`)
    } else {
      console.log(`✓ Already in group: ${contact.name}`)
    }
  }

  // Update member count
  const count = await db.contactGroup.count({ where: { groupId: group.id } })
  await db.group.update({ where: { id: group.id }, data: { memberCount: count } })

  console.log('\n═══════════════════════════════════════════════')
  console.log('SETUP COMPLETE')
  console.log('═══════════════════════════════════════════════')
  console.log(`SMTP Credential ID: ${cred.id}`)
  console.log(`Group ID:           ${group.id}`)
  console.log(`Test contacts:      ${createdContacts.length}`)
  console.log(`  → ${createdContacts.map(c => c.name + ' <' + c.email + '>').join(', ')}`)
  console.log('═══════════════════════════════════════════════')

  await db.$disconnect()
}

main().catch(async (err) => {
  console.error('Setup failed:', err)
  await db.$disconnect()
  process.exit(1)
})

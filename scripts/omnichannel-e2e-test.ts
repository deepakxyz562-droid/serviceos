/**
 * Omnichannel E2E test — WhatsApp inbound + Website form + unified inbox
 *
 * Reuses the tenant / user / workspace / customer / WhatsApp credential
 * created by `scripts/whatsapp-e2e-test.ts`.
 *
 * Test matrix:
 *   1. UPDATE WhatsApp credential with the new access token
 *   2. OMNICHANNEL CHANNELS — list (auto-creates defaults) / verify WhatsApp
 *      + Website channels exist / configure auto-reply on Website channel
 *   3. WHATSAPP INBOUND — POST /api/omnichannel/ingest { channel:'whatsapp' }
 *      → verify Customer + Conversation + InboxMessage + Lead created
 *   4. WEBSITE FORM — create a Form with submissionActions=['create_lead',
 *      'create_customer','send_whatsapp'] → POST /api/forms/[id]/submit
 *      → verify Lead + Customer + WhatsApp notification (real Meta wamid)
 *   5. UNIFIED INBOX — GET /api/omnichannel/conversations
 *      → verify both WhatsApp and Website conversations appear in the same list
 *      → verify channel filter works
 *   6. STATS — GET /api/omnichannel/stats
 *   7. CLEANUP
 *
 * Run:  bun run scripts/omnichannel-e2e-test.ts
 */
import { db } from '../src/lib/db'

const API = 'http://localhost:3000'
const TEST_USER_EMAIL = 'whatsapp-test@serviceos.local'
const TEST_PHONE = '+918505945123'

const NEW_ACCESS_TOKEN =
  'EAAeZCCSIuiJMBRiDf5eA8XIGOZCcSXLCydj4o91dFOdRuelDZAGgBBdLZCNxFFyRKzZCoNXjYqOLNcvrfE74gU1Od1qiBo5RfrwAXuBqwDD401Ex3q2ZCZBuZAL28XWcTav87coc2qpd1igzT4yNAnlF4qScUnKNAhjduDk7ZBrUIiowNC0QhJeviQCmv5aQTQ2kkAE4HH0d8aRXsSvrnYUhHX18tOhSvQ9PcbrQSsYFZBIubZCVlJsY5HHAED0nF6hMPble2JQDXPM6CpHVrsutj03'

// ─── Helpers ─────────────────────────────────────────────────────────────────
function section(title: string) {
  console.log(`\n═══════════════════════════════════════════════════════`)
  console.log(`  ${title}`)
  console.log(`═══════════════════════════════════════════════════════`)
}
function log(label: string, value?: unknown) {
  if (value === undefined) console.log(`  ▶ ${label}`)
  else console.log(`  ${label}:`, value)
}
function ok(label: string, cond: boolean, detail?: unknown) {
  console.log(`  ${cond ? '✅' : '❌'} ${label}${detail !== undefined ? ` — ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''}`)
  return cond
}

async function api(path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, init)
  let body: any = null
  try { body = await res.json() } catch { /* ignore */ }
  return { status: res.status, body, headers: res.headers }
}

async function login() {
  const r = await api('/api/auth/dev-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_USER_EMAIL }),
  })
  if (r.status !== 200) throw new Error(`Login failed: ${r.status} ${JSON.stringify(r.body)}`)
  const cookie = r.headers.get('set-cookie') || ''
  const token = cookie.match(/serviceos_session=([^;]+)/)?.[1]
  return { token, authHeader: `Bearer ${token}` }
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  section('Omnichannel E2E Test')
  log('Logging in as', TEST_USER_EMAIL)
  const { authHeader } = await login()
  const auth = { Authorization: authHeader, 'Content-Type': 'application/json' }

  const user = await db.user.findUnique({ where: { email: TEST_USER_EMAIL }, include: { workspace: true } })
  if (!user?.tenantId || !user?.workspaceId) throw new Error('Test user/tenant/workspace missing — run whatsapp-e2e-test.ts first')
  const tenantId = user.tenantId
  const workspaceId = user.workspaceId
  log('Tenant', tenantId)

  const cleanup: { forms: string[]; conversations: string[]; leads: string[]; customers: string[] } = {
    forms: [], conversations: [], leads: [], customers: [],
  }

  // ═══════════════════════════════════════════════════════════════════════
  // 1. UPDATE WHATSAPP CREDENTIAL WITH NEW ACCESS TOKEN
  // ═══════════════════════════════════════════════════════════════════════
  section('1. Update WhatsApp credential with new access token')
  const cred = await db.credential.findFirst({ where: { type: 'whatsapp' } })
  if (!cred) throw new Error('WhatsApp credential missing — run whatsapp-e2e-test.ts first')
  const existingData = JSON.parse(cred.encryptedData)
  const updatedData = { ...existingData, accessToken: NEW_ACCESS_TOKEN }
  await db.credential.update({
    where: { id: cred.id },
    data: { encryptedData: JSON.stringify(updatedData) },
  })
  // Verify
  const verifyCred = await db.credential.findUnique({ where: { id: cred.id } })
  const verifyData = JSON.parse(verifyCred!.encryptedData)
  ok('Access token updated',
     verifyData.accessToken === NEW_ACCESS_TOKEN,
     `${verifyData.accessToken.slice(0, 12)}...${verifyData.accessToken.slice(-6)}`)
  log('Credential id', cred.id)

  // ═══════════════════════════════════════════════════════════════════════
  // 2. OMNICHANNEL CHANNELS
  // ═══════════════════════════════════════════════════════════════════════
  section('2. Omnichannel channels')
  const channelsRes = await api('/api/omnichannel/channels', { headers: auth })
  ok('GET /api/omnichannel/channels returns 200', channelsRes.status === 200)
  const channels = channelsRes.body || []
  log('Channels', channels.map((c: any) => `${c.type}=${c.connected ? 'on' : 'off'}`))

  const waChannel = channels.find((c: any) => c.type === 'whatsapp')
  const webChannel = channels.find((c: any) => c.type === 'website')
  ok('WhatsApp channel auto-created', !!waChannel)
  ok('Website channel auto-created', !!webChannel)

  // Enable WhatsApp channel + auto-reply on BOTH channels for testing
  if (waChannel) {
    const upd = await api('/api/omnichannel/channels', {
      method: 'POST', headers: auth,
      body: JSON.stringify({
        channel: 'whatsapp', name: 'WhatsApp Business',
        connected: true, autoCreateLead: true,
        autoReply: true,
        autoReplyMessage: 'Thanks for your message! Our team will respond shortly. 🙏',
      }),
    })
    ok('Update WhatsApp channel with auto-reply', upd.status === 200 || upd.status === 201, upd.body?.error)
  }
  if (webChannel) {
    const upd = await api('/api/omnichannel/channels', {
      method: 'POST', headers: auth,
      body: JSON.stringify({
        channel: 'website', name: 'Website Forms',
        connected: true, autoCreateLead: true,
        autoReply: true,
        autoReplyMessage: 'Thanks for reaching out via our website! Our team will get back to you within 24 hours.',
      }),
    })
    ok('Update Website channel with auto-reply', upd.status === 200 || upd.status === 201, upd.body?.error)
  }

  // Snapshot existing conversations for delta calc
  const convsBefore = await db.conversation.count({ where: { tenantId } })
  log('Existing conversations', convsBefore)

  // ═══════════════════════════════════════════════════════════════════════
  // 3. WHATSAPP INBOUND via /api/omnichannel/ingest
  // ═══════════════════════════════════════════════════════════════════════
  section('3. WhatsApp inbound message via /api/omnichannel/ingest')
  const waInboundPayload = {
    channel: 'whatsapp',
    name: 'Priya WhatsApp User',
    phone: TEST_PHONE,
    email: 'priya@example.com',
    message: 'Hi, I need an AC service quote for my 1.5 ton split AC. Is Sunday morning available?',
    source: 'whatsapp',
    tenantId,
    workspaceId,
  }
  const waInbound = await api('/api/omnichannel/ingest', {
    method: 'POST', headers: auth,
    body: JSON.stringify(waInboundPayload),
  })
  ok('POST /api/omnichannel/ingest (whatsapp) returns 201', waInbound.status === 201, waInbound.body?.error)
  const waConv = waInbound.body?.conversation
  const waLead = waInbound.body?.lead
  const waCustomer = waInbound.body?.customer
  const waAutoLead = waInbound.body?.autoLeadCreated
  ok('Conversation created', !!waConv?.id, waConv)
  // autoLeadCreated=true on first ingest for a phone; on subsequent ingests the
  // existing lead is reused and autoLeadCreated=false. Either way, a lead must
  // be present.
  ok('Lead present (auto-created or reused)', !!waLead?.id, `autoCreated=${waAutoLead}, id=${waLead?.id}`)
  ok('Customer resolved', !!waCustomer?.id, waCustomer?.id)
  if (waConv?.id) cleanup.conversations.push(waConv.id)
  if (waLead?.id) cleanup.leads.push(waLead.id)
  // Don't cleanup the customer — it's the test phone, reused across tests
  const waCustomerId = waCustomer?.id

  // Verify the conversation has the right channel + an InboxMessage
  const waConvCheck = await db.conversation.findUnique({
    where: { id: waConv?.id },
    include: { lead: true },
  })
  ok('Conversation channel = whatsapp', waConvCheck?.channel === 'whatsapp')
  ok('Conversation linked to lead', waConvCheck?.leadId === waLead?.id)
  ok('Conversation lastMessageBody set', waConvCheck?.lastMessageBody?.includes('AC service'))

  const waInboxMsgs = await db.inboxMessage.findMany({
    where: { conversationId: waConv?.conversationId },
  })
  ok('InboxMessage created for WhatsApp inbound', waInboxMsgs.length >= 1, `count=${waInboxMsgs.length}`)
  ok('Inbound message direction=inbound', waInboxMsgs.some((m) => m.direction === 'inbound'))
  // Auto-reply should have created an outbound system/bot message
  ok('Auto-reply message created (outbound)', waInboxMsgs.some((m) => m.direction === 'outbound'))

  // ═══════════════════════════════════════════════════════════════════════
  // 4. WEBSITE FORM via /api/forms/[id]/submit
  // ═══════════════════════════════════════════════════════════════════════
  section('4. Website form submission via /api/forms/[id]/submit')
  // 4a. Create a Form with multiple submission actions
  const formPayload = {
    name: 'AC Service Request Form',
    description: 'Public form for AC service requests',
    type: 'lead_capture',
    status: 'active',
    fieldsJson: JSON.stringify([
      { id: 'name', label: 'Full Name', type: 'text', required: true },
      { id: 'phone', label: 'Phone Number', type: 'tel', required: true },
      { id: 'email', label: 'Email', type: 'email', required: false },
      { id: 'serviceType', label: 'Service Type', type: 'select', options: ['AC Repair', 'AC Install', 'Annual Maintenance'] },
      { id: 'message', label: 'Message', type: 'textarea' },
    ]),
    submissionActions: JSON.stringify(['create_lead', 'create_customer', 'send_whatsapp']),
    fieldMappingJson: JSON.stringify({
      name: 'name', phone: 'phone', email: 'email',
      serviceType: 'serviceType', description: 'message',
    }),
    whatsappUserTemplate: 'Hi {{name}}! 👋 Thanks for submitting the AC service request form. Our team will call you back shortly to confirm the slot.',
    whatsappOwnerTemplate: 'New form submission from {{name}} ({{phone}}) — service: {{serviceType}}',
    tenantId,
    workspaceId,
  }
  const formCreate = await api('/api/forms', { method: 'POST', headers: auth, body: JSON.stringify(formPayload) })
  ok('Create form returns 201', formCreate.status === 201, formCreate.body?.error)
  const formId = formCreate.body?.form?.id || formCreate.body?.id || formCreate.body?.data?.id
  if (formId) cleanup.forms.push(formId)
  log('Created form', formId)

  // 4b. Submit the form (as a website visitor would)
  const submissionPayload = {
    data: {
      name: 'Arjun Form Submitter',
      phone: TEST_PHONE,
      email: 'arjun@example.com',
      serviceType: 'AC Repair',
      message: 'My split AC is leaking water. Need urgent service.',
    },
    source: 'website',
  }
  const submitRes = await api(`/api/forms/${formId}/submit`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(submissionPayload),
  })
  ok('Form submit returns 201', submitRes.status === 201, submitRes.body?.error)
  const actionResults = submitRes.body?.actionResults || {}
  ok('Action: create_lead succeeded', actionResults.create_lead?.success === true, actionResults.create_lead)
  ok('Action: create_customer succeeded', actionResults.create_customer?.success === true, actionResults.create_customer)
  ok('Action: send_whatsapp to user succeeded', actionResults.send_whatsapp_user?.success === true, actionResults.send_whatsapp_user)
  ok('Action: send_whatsapp to owner succeeded', actionResults.send_whatsapp_owner?.success === true, actionResults.send_whatsapp_owner)
  if (actionResults.create_lead?.leadId) cleanup.leads.push(actionResults.create_lead.leadId)

  // 4c. Verify the lead was created with the right source
  const formLeadId = actionResults.create_lead?.leadId
  const formLead = formLeadId ? await db.lead.findUnique({ where: { id: formLeadId } }) : null
  ok('Lead source = form', formLead?.source === 'form' || formLead?.source === 'website', formLead?.source)
  ok('Lead phone matches', formLead?.phone === TEST_PHONE)
  ok('Lead has form_submission tag', (JSON.parse(formLead?.tagsJson || '[]')).includes('form_submission'))

  // 4d. Verify a NotificationLog was created for the WhatsApp send (user template)
  const formNotif = await db.notificationLog.findFirst({
    where: {
      recipient: TEST_PHONE,
      subject: 'Form submission received',
    },
    orderBy: { createdAt: 'desc' },
  })
  ok('NotificationLog created for form WhatsApp send', !!formNotif, formNotif?.externalId)
  if (formNotif?.externalId) {
    const isReal = formNotif.externalId.startsWith('wamid.')
    ok('WhatsApp delivered to Meta with real wamid', isReal, formNotif.externalId)
  }
  // Also verify the owner notification
  const ownerNotif = await db.notificationLog.findFirst({
    where: { subject: { contains: 'New form submission' } },
    orderBy: { createdAt: 'desc' },
  })
  ok('Owner WhatsApp notification sent', !!ownerNotif, ownerNotif?.externalId)

  // 4e. Verify form.submissions counter incremented
  const formAfter = await db.form.findUnique({ where: { id: formId } })
  ok('Form.submissions counter incremented', (formAfter?.submissions ?? 0) >= 1, `count=${formAfter?.submissions}`)

  // ═══════════════════════════════════════════════════════════════════════
  // 5. UNIFIED INBOX — both channels appear in one list
  // ═══════════════════════════════════════════════════════════════════════
  section('5. Unified inbox — both channels in one list')
  const inboxRes = await api('/api/omnichannel/conversations', { headers: auth })
  ok('GET /api/omnichannel/conversations returns 200', inboxRes.status === 200)
  const inbox = inboxRes.body || []
  log('Total conversations in inbox', inbox.length)

  const waConvs = inbox.filter((c: any) => c.channel === 'whatsapp')
  const webConvs = inbox.filter((c: any) => c.channel === 'website')
  ok('WhatsApp conversations present in unified inbox', waConvs.length >= 1, `count=${waConvs.length}`)
  // Note: form submissions don't auto-create conversations (they create leads directly).
  // If there's no website conversation, we'll ingest one explicitly to verify the channel works.
  if (webConvs.length === 0) {
    log('No website conversations yet — ingesting one to verify the website channel...')
    const webIngest = await api('/api/omnichannel/ingest', {
      method: 'POST', headers: auth,
      body: JSON.stringify({
        channel: 'website',
        name: 'Kavya Website Visitor',
        phone: TEST_PHONE,
        email: 'kavya@example.com',
        message: 'I saw your AC service page — do you offer same-day service?',
        source: 'website_form',
        tenantId, workspaceId,
      }),
    })
    ok('POST /api/omnichannel/ingest (website) returns 201', webIngest.status === 201, webIngest.body?.error)
    if (webIngest.body?.conversation?.id) cleanup.conversations.push(webIngest.body.conversation.id)
    if (webIngest.body?.lead?.id) cleanup.leads.push(webIngest.body.lead.id)
  }

  // Re-fetch and verify both channels coexist
  const inbox2Res = await api('/api/omnichannel/conversations', { headers: auth })
  const inbox2 = inbox2Res.body || []
  const waConvs2 = inbox2.filter((c: any) => c.channel === 'whatsapp')
  const webConvs2 = inbox2.filter((c: any) => c.channel === 'website')
  ok('WhatsApp conversations in unified inbox', waConvs2.length >= 1)
  ok('Website conversations in unified inbox', webConvs2.length >= 1)
  log('Unified inbox breakdown', `whatsapp=${waConvs2.length}, website=${webConvs2.length}`)

  // Channel filter test
  const waOnlyRes = await api('/api/omnichannel/conversations?channel=whatsapp', { headers: auth })
  ok('Filter conversations by channel=whatsapp', waOnlyRes.status === 200 &&
     (waOnlyRes.body || []).every((c: any) => c.channel === 'whatsapp'))

  // ═══════════════════════════════════════════════════════════════════════
  // 6. OMNICHANNEL STATS
  // ═══════════════════════════════════════════════════════════════════════
  section('6. Omnichannel stats')
  const statsRes = await api('/api/omnichannel/stats', { headers: auth })
  ok('GET /api/omnichannel/stats returns 200', statsRes.status === 200)
  log('Stats', statsRes.body)

  // ═══════════════════════════════════════════════════════════════════════
  // 7. CLEANUP
  // ═══════════════════════════════════════════════════════════════════════
  section('7. Cleanup')
  for (const id of cleanup.conversations) {
    try {
      // Delete inbox messages first
      const conv = await db.conversation.findUnique({ where: { id } })
      if (conv) {
        await db.inboxMessage.deleteMany({ where: { conversationId: conv.conversationId } })
        await db.conversation.delete({ where: { id } })
        log('Deleted conversation', id)
      }
    } catch (e) { console.log(`  (cleanup conv ${id} failed: ${e})`) }
  }
  for (const id of cleanup.leads) {
    try { await db.lead.delete({ where: { id } }); log('Deleted lead', id) } catch {}
  }
  for (const id of cleanup.forms) {
    try {
      await db.formResponse.deleteMany({ where: { formId: id } })
      await db.form.delete({ where: { id } })
      log('Deleted form', id)
    } catch {}
  }
  // Restore the original customer phone (we may have created customers with TEST_PHONE
  // for Priya/Arjun/Kavya — leave them, they're harmless test data)

  console.log('\n✅ Omnichannel E2E test complete.\n')
}

main()
  .catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
  .finally(async () => {
    try { await db.$disconnect() } catch { /* ignore */ }
  })

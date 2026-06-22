import { db } from '@/lib/db'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface BroadcastRecipient {
  /** Unique key per recipient (prefixed with source to avoid id collisions) */
  key: string
  /** Where this recipient came from — 'contact' (CRM Contact) or 'customer' (service Customer) */
  source: 'contact' | 'customer'
  /** Original record id (Contact.id or Customer.id) */
  refId: string
  name: string
  email: string | null
  phone: string | null
  company?: string | null
  city?: string | null
  country?: string | null
  status?: string | null
}

export interface ResolveAudienceParams {
  /** Caller's tenantId. When null, the resolver auto-detects the first tenant. */
  tenantId: string | null
  /** Stored campaign fields */
  audienceType?: string | null
  audienceId?: string | null
  audienceFiltersJson?: string | null
  /** Direct selectors (override stored fields when present) */
  contactIds?: string[]
  groupIds?: string[]
  customerIds?: string[]
  segmentId?: string
  allContacts?: boolean
  /** Restrict to one channel — when 'email' only return recipients with email,
   *  when 'whatsapp' only return recipients with phone, when undefined return all. */
  channel?: 'email' | 'whatsapp' | 'sms' | 'multi' | undefined
}

export interface ResolveResult {
  recipients: BroadcastRecipient[]
  total: number
  withEmail: number
  withPhone: number
  breakdown: { contacts: number; customers: number }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Normalize a phone number to comparable digits. */
function normalizePhone(p: string | null | undefined): string {
  if (!p) return ''
  return p.replace(/\D/g, '')
}

/** Normalize an email to comparable lowercase. */
function normalizeEmail(e: string | null | undefined): string {
  if (!e) return ''
  return e.trim().toLowerCase()
}

/** Parse the audienceFiltersJson blob (manual emails, customer ids, etc.). */
function parseFilters(filtersJson: string | null | undefined): {
  manualEmails: string
  customerIds: string[]
} {
  if (!filtersJson) return { manualEmails: '', customerIds: [] }
  try {
    const parsed = JSON.parse(filtersJson) as Record<string, unknown>
    const me = parsed?.manualEmails
    const ci = parsed?.customerIds
    return {
      manualEmails: typeof me === 'string' ? me : '',
      customerIds: Array.isArray(ci) ? ci.filter((x): x is string => typeof x === 'string') : [],
    }
  } catch {
    return { manualEmails: '', customerIds: [] }
  }
}

/** Resolve a usable tenantId — falls back to the first tenant when null (admin case). */
export async function resolveTenantId(tenantId: string | null): Promise<string> {
  if (tenantId) return tenantId
  const first = await db.tenant.findFirst({ select: { id: true }, orderBy: { createdAt: 'asc' } })
  return first?.id || 'default'
}

// ─── Main resolver ─────────────────────────────────────────────────────────

/**
 * Resolve a broadcast/campaign audience into a unified recipient list.
 *
 * Sources (in priority order):
 *   1. Direct selectors — contactIds, groupIds (Contact groups), customerIds, segmentId (Customer segments)
 *   2. allContacts flag — fetch every Contact AND every Customer in the tenant
 *   3. Stored campaign fields — audienceType / audienceId / audienceFiltersJson
 *
 * The returned recipients are deduplicated by email AND phone (so the same
 * person reached via both Contact and Customer rows only appears once).
 */
export async function resolveBroadcastAudience(
  params: ResolveAudienceParams,
): Promise<ResolveResult> {
  const tenantId = await resolveTenantId(params.tenantId)
  const filters = parseFilters(params.audienceFiltersJson)

  // ── Decide which selectors to apply ────────────────────────────────────
  const wantAll =
    params.allContacts === true ||
    (!params.contactIds?.length &&
      !params.groupIds?.length &&
      !params.customerIds?.length &&
      !params.segmentId &&
      (params.audienceType === 'all' || !params.audienceType))

  const groupIds = params.groupIds?.length
    ? params.groupIds
    : params.audienceType === 'segment' || params.audienceType === 'contact_list'
      ? params.audienceId
        ? [params.audienceId]
        : []
      : []

  const customerIds = params.customerIds?.length
    ? params.customerIds
    : filters.customerIds

  const segmentId = params.segmentId

  // ── Collect raw recipient rows from each source ────────────────────────
  const contactRecipients: BroadcastRecipient[] = []
  const customerRecipients: BroadcastRecipient[] = []
  const manualRecipients: BroadcastRecipient[] = []

  // (a) Contacts — from explicit ids, group memberships, or "all"
  const contactIdSet = new Set<string>()
  if (params.contactIds?.length) {
    params.contactIds.forEach((id) => contactIdSet.add(id))
  }
  if (groupIds.length) {
    try {
      const memberships = await db.contactGroup.findMany({
        where: { groupId: { in: groupIds } },
        select: { contactId: true },
      })
      memberships.forEach((m) => contactIdSet.add(m.contactId))
    } catch {
      // ContactGroup table may not exist — ignore
    }
  }
  if (wantAll) {
    try {
      const all = await db.contact.findMany({
        where: { tenantId },
        select: { id: true },
      })
      all.forEach((c) => contactIdSet.add(c.id))
    } catch {
      // ignore
    }
  }
  if (contactIdSet.size > 0) {
    try {
      const contacts = await db.contact.findMany({
        where: { id: { in: Array.from(contactIdSet) }, tenantId },
        select: {
          id: true, name: true, email: true, phone: true,
          company: true, city: true, country: true, status: true,
        },
      })
      for (const c of contacts) {
        contactRecipients.push({
          key: `contact:${c.id}`,
          source: 'contact',
          refId: c.id,
          name: c.name || '',
          email: c.email || null,
          phone: c.phone || null,
          company: c.company || null,
          city: c.city || null,
          country: c.country || null,
          status: c.status || null,
        })
      }
    } catch {
      // ignore
    }
  }

  // (b) Customers — from explicit customerIds, segment memberships, or "all"
  const customerIdSet = new Set<string>()
  if (customerIds.length) {
    customerIds.forEach((id) => customerIdSet.add(id))
  }
  if (segmentId) {
    try {
      const segMembers = await db.segmentMember.findMany({
        where: { segmentId },
        select: { customerId: true },
      })
      segMembers.forEach((m) => customerIdSet.add(m.customerId))
    } catch {
      // ignore
    }
  }
  if (wantAll) {
    try {
      // Customer has no tenantId — filter via workspace.tenantId
      const all = await db.customer.findMany({
        where: { workspace: { tenantId } },
        select: { id: true },
      })
      all.forEach((c) => customerIdSet.add(c.id))
    } catch {
      // ignore
    }
  }
  if (customerIdSet.size > 0) {
    try {
      const customers = await db.customer.findMany({
        where: { id: { in: Array.from(customerIdSet) } },
        select: {
          id: true, name: true, email: true, phone: true,
          address: true,
        },
      })
      for (const c of customers) {
        customerRecipients.push({
          key: `customer:${c.id}`,
          source: 'customer',
          refId: c.id,
          name: c.name || '',
          email: c.email || null,
          phone: c.phone || null,
          company: null,
          city: null,
          country: null,
          status: 'active',
        })
      }
    } catch {
      // ignore
    }
  }

  // (c) Manual emails (from audienceFiltersJson.manualEmails)
  if (filters.manualEmails.trim()) {
    const emails = filters.manualEmails
      .split(/[\s,\n]+/)
      .map((e) => e.trim())
      .filter(Boolean)
    const seenEmails = new Set<string>()
    for (const e of emails) {
      const norm = normalizeEmail(e)
      if (!norm || seenEmails.has(norm)) continue
      seenEmails.add(norm)
      manualRecipients.push({
        key: `manual:${norm}`,
        source: 'contact',
        refId: norm,
        name: norm.split('@')[0] || e,
        email: e,
        phone: null,
        status: 'active',
      })
    }
  }

  // ── Deduplicate by email + phone ───────────────────────────────────────
  // Keep first occurrence. Priority: contact > customer > manual (so existing
  // CRM Contact records win over Customer duplicates).
  const all = [...contactRecipients, ...customerRecipients, ...manualRecipients]
  const seenEmails = new Set<string>()
  const seenPhones = new Set<string>()
  const deduped: BroadcastRecipient[] = []

  for (const r of all) {
    const email = normalizeEmail(r.email)
    const phone = normalizePhone(r.phone)
    // Dedupe only on the keys that exist
    const emailDup = email && seenEmails.has(email)
    const phoneDup = phone && seenPhones.has(phone)
    if (emailDup && phoneDup) continue
    if (emailDup && !phone) continue
    if (phoneDup && !email) continue
    // If both empty, dedupe by key (manual entries without contact info)
    if (!email && !phone) {
      if (deduped.some((d) => d.key === r.key)) continue
    }
    if (email) seenEmails.add(email)
    if (phone) seenPhones.add(phone)
    deduped.push(r)
  }

  // ── Channel filter ─────────────────────────────────────────────────────
  let filtered = deduped
  if (params.channel === 'email') {
    filtered = deduped.filter((r) => r.email && r.email.trim())
  } else if (params.channel === 'whatsapp' || params.channel === 'sms') {
    filtered = deduped.filter((r) => r.phone && r.phone.trim())
  } else if (params.channel === 'multi') {
    filtered = deduped.filter((r) => (r.email && r.email.trim()) || (r.phone && r.phone.trim()))
  }

  const withEmail = filtered.filter((r) => r.email && r.email.trim()).length
  const withPhone = filtered.filter((r) => r.phone && r.phone.trim()).length

  return {
    recipients: filtered,
    total: filtered.length,
    withEmail,
    withPhone,
    breakdown: {
      contacts: contactRecipients.length,
      customers: customerRecipients.length,
    },
  }
}

// ─── Personalization helper ────────────────────────────────────────────────

/**
 * Replace {{name}}, {{email}}, {{phone}}, {{company}}, {{city}}, {{country}}
 * placeholders in a string using recipient data.
 */
export function personalizeForRecipient(
  template: string,
  recipient: BroadcastRecipient,
): string {
  return template
    .replace(/\{\{name\}\}/g, recipient.name || '')
    .replace(/\{\{email\}\}/g, recipient.email || '')
    .replace(/\{\{phone\}\}/g, recipient.phone || '')
    .replace(/\{\{company\}\}/g, recipient.company || '')
    .replace(/\{\{city\}\}/g, recipient.city || '')
    .replace(/\{\{country\}\}/g, recipient.country || '')
}

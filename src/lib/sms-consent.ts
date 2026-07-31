/**
 * SMS Marketing Consent — STOP/START keyword handling
 * ----------------------------------------------------
 * TCPA / carrier compliance: when an SMS recipient texts STOP, UNSUBSCRIBE,
 * CANCEL, END, or QUIT to a dedicated number, the sender MUST stop all
 * further marketing messages. UNSTOP/START re-enables. HELP returns info.
 *
 * These helpers are called from /api/sms/inbound when the inbound body
 * matches a recognized keyword. They mark the matching Customer + Contact
 * records as opted-out (or opted-in) and persist a MarketingConsentEvent
 * audit-trail row.
 *
 * Transactional SMS (appointment reminders, invoice notices) is NOT
 * suppressed by an opt-out — only marketing SMS is. (Same rule as email.)
 * The scheduled-messages dispatcher should call hasSmsMarketingConsent()
 * before sending any marketing-classified SMS.
 */

import { db } from '@/lib/db'

/**
 * Mark all Customer + Contact records matching this phone as opted-out of
 * SMS marketing. Writes a MarketingConsentEvent audit row.
 */
export async function optOutSmsMarketing(phone: string, tenantId: string | null): Promise<void> {
  const normalized = normalizePhone(phone)
  if (!normalized) return

  const now = new Date()

  // Update all customers with this phone
  const customers = await db.customer.findMany({
    where: { phone: { contains: normalized.slice(-10) } },
    select: { id: true },
  })
  if (customers.length > 0) {
    await db.customer.updateMany({
      where: { id: { in: customers.map((c) => c.id) } },
      data: {
        marketingConsent: false,
        unsubscribedAt: now,
        marketingConsentSource: 'sms_stop_keyword',
      },
    })
  }

  // Update all contacts with this phone
  const contacts = await db.contact.findMany({
    where: { phone: { contains: normalized.slice(-10) } },
    select: { id: true },
  })
  if (contacts.length > 0) {
    await db.contact.updateMany({
      where: { id: { in: contacts.map((c) => c.id) } },
      data: {
        marketingConsent: false,
        unsubscribedAt: now,
        marketingConsentSource: 'sms_stop_keyword',
        status: 'unsubscribed',
      },
    })
  }

  // Audit trail
  try {
    await db.marketingConsentEvent.create({
      data: {
        entityType: customers[0] ? 'customer' : 'contact',
        entityId: customers[0]?.id || contacts[0]?.id || 'unknown',
        channel: 'sms',
        eventType: 'opt_out',
        source: 'sms_stop_keyword',
        phone: normalized,
        tenantId,
        metadataJson: JSON.stringify({
          rawPhone: phone,
          keyword: 'STOP',
          matchedCustomers: customers.length,
          matchedContacts: contacts.length,
        }),
      },
    })
  } catch (err) {
    console.warn('[optOutSmsMarketing] Failed to write audit trail:', err)
  }
}

/**
 * Re-enable SMS marketing for a phone number (UNSTOP / START keyword).
 */
export async function optInSmsMarketing(phone: string, tenantId: string | null): Promise<void> {
  const normalized = normalizePhone(phone)
  if (!normalized) return

  const now = new Date()

  const customers = await db.customer.findMany({
    where: { phone: { contains: normalized.slice(-10) } },
    select: { id: true },
  })
  if (customers.length > 0) {
    await db.customer.updateMany({
      where: { id: { in: customers.map((c) => c.id) } },
      data: {
        marketingConsent: true,
        marketingConsentAt: now,
        marketingConsentSource: 'sms_start_keyword',
        unsubscribedAt: null,
      },
    })
  }

  const contacts = await db.contact.findMany({
    where: { phone: { contains: normalized.slice(-10) } },
    select: { id: true },
  })
  if (contacts.length > 0) {
    await db.contact.updateMany({
      where: { id: { in: contacts.map((c) => c.id) } },
      data: {
        marketingConsent: true,
        marketingConsentAt: now,
        marketingConsentSource: 'sms_start_keyword',
        unsubscribedAt: null,
        status: 'active',
      },
    })
  }

  try {
    await db.marketingConsentEvent.create({
      data: {
        entityType: customers[0] ? 'customer' : 'contact',
        entityId: customers[0]?.id || contacts[0]?.id || 'unknown',
        channel: 'sms',
        eventType: 'opt_in',
        source: 'sms_start_keyword',
        phone: normalized,
        tenantId,
        metadataJson: JSON.stringify({
          rawPhone: phone,
          keyword: 'START',
          matchedCustomers: customers.length,
          matchedContacts: contacts.length,
        }),
      },
    })
  } catch (err) {
    console.warn('[optInSmsMarketing] Failed to write audit trail:', err)
  }
}

/**
 * Check if a phone number has SMS marketing consent.
 * Used by the scheduled-messages dispatcher before sending marketing SMS.
 */
export async function hasSmsMarketingConsent(phone: string): Promise<boolean> {
  const normalized = normalizePhone(phone)
  if (!normalized) return true // unknown → allow (grandfathered)

  const customer = await db.customer.findFirst({
    where: { phone: { contains: normalized.slice(-10) } },
    select: { marketingConsent: true, unsubscribedAt: true },
    orderBy: { updatedAt: 'desc' },
  })

  if (customer) {
    if (customer.unsubscribedAt) return false
    if (customer.marketingConsent === false) return false
    return true
  }

  const contact = await db.contact.findFirst({
    where: { phone: { contains: normalized.slice(-10) } },
    select: { marketingConsent: true, unsubscribedAt: true, status: true },
    orderBy: { updatedAt: 'desc' },
  })

  if (contact) {
    if (contact.status === 'unsubscribed' || contact.status === 'blocked') return false
    if (contact.unsubscribedAt) return false
    if (contact.marketingConsent === false) return false
    return true
  }

  return true // unknown recipient → allow (grandfathered)
}

/** Normalize a phone number for matching (strip non-digits, keep last 10). */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return digits.length >= 10 ? digits.slice(-10) : digits
}

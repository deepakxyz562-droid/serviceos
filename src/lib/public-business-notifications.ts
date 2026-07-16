/**
 * Public Business Hub — owner notification helper.
 *
 * Called fire-and-forget after a public lead is created. Sends:
 *   - Email to the tenant's owner email (if configured)
 *   - (Future) WhatsApp to the tenant's phone (if configured)
 *
 * Never throws — caller catches all errors.
 */

import { db } from '@/lib/db'

interface OwnerNotificationPayload {
  lead: { id: string }
  intent: 'book' | 'quote' | 'request'
  name: string
  phone: string
  email?: string
  message?: string
}

export async function sendOwnerNotification(
  tenant: { id: string; name: string; email: string | null; phone: string | null },
  payload: OwnerNotificationPayload,
) {
  const { intent, name, phone, email, message } = payload
  const intentLabel =
    intent === 'book' ? 'New Online Booking' :
    intent === 'quote' ? 'New Quote Request' :
    'New Service Request'

  // ── Email notification ──────────────────────────────────────────────────
  if (tenant.email) {
    try {
      // Find the tenant's default email provider (if any).
      const provider = await db.emailProvider.findFirst({
        where: { tenantId: tenant.id, isDefaultTransactional: true, status: 'active' },
        select: { id: true, fromEmail: true, fromName: true },
      }).catch(() => null)

      if (provider) {
        // Use the existing email-send infrastructure.
        const { sendEmail } = await import('@/lib/email-send').catch(() => ({ sendEmail: null }))
        if (sendEmail) {
          await sendEmail({
            tenantId: tenant.id,
            to: tenant.email,
            from: provider.fromEmail || 'notifications@serviceos.com',
            fromName: provider.fromName || 'ServiceOS',
            subject: `${intentLabel}: ${name}`,
            body: [
              `${intentLabel} from your public business hub.`,
              ``,
              `Name: ${name}`,
              `Phone: ${phone}`,
              ...(email ? [`Email: ${email}`] : []),
              ...(message ? [``, `Message:`, message] : []),
              ``,
              `View this lead in your ServiceOS dashboard.`,
            ].join('\n'),
          }).catch((err: unknown) => {
            console.error('[owner-notification] email send failed:', err)
          })
        }
      }
    } catch (err) {
      console.error('[owner-notification] email pipeline error:', err)
    }
  }

  // ── In-app notification (always — even without email) ─────────────────
  try {
    // Find the tenant owner user(s) to send an in-app notification.
    const owners = await db.user.findMany({
      where: { tenantId: tenant.id, role: { in: ['owner', 'admin'] } },
      select: { id: true },
    }).catch(() => [])

    if (owners.length > 0) {
      await db.notification.createMany({
        data: owners.map((o) => ({
          title: intentLabel,
          message: `${name} (${phone}) submitted a ${intent} from your public page.`,
          type: 'lead',
          userId: o.id,
          tenantId: tenant.id,
        })),
      }).catch((err) => {
        console.error('[owner-notification] in-app notification failed:', err)
      })
    }
  } catch (err) {
    console.error('[owner-notification] in-app pipeline error:', err)
  }
}

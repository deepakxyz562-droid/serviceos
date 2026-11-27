/**
 * Appointment Reminder Scheduler
 * ───────────────────────────────────
 * Reads `JobVisit.teamReminder` (none | 1h | 24h | 2d) and schedules customer
 * reminders ahead of the visit. The reminders are persisted as
 * `ScheduledMessage` rows (messageType='appointment_reminder') and dispatched
 * by the /api/cron/scheduled-messages cron — never via setTimeout (which dies
 * on serverless cold-starts).
 *
 * Window: visits whose `scheduledDate` falls within the next 24 hours AND
 *   - teamReminder != 'none'
 *   - status = 'scheduled' (don't remind for cancelled / completed visits)
 *
 * Timing:
 *   - teamReminder='24h' → reminder due 24 hours BEFORE the visit
 *   - teamReminder='1h'  → reminder due  1 hour  BEFORE the visit
 *   - teamReminder='2d'  → reminder due 48 hours BEFORE the visit
 *
 * If the computed reminder time is already in the past (e.g. a visit was
 * created 6 hours before its scheduledDate with teamReminder='24h'), we still
 * schedule the reminder — it'll be picked up immediately by the next
 * scheduled-messages cron tick (better late than never).
 *
 * Channel: prefer email if the customer has an email; else WhatsApp if they
 * have a phone; else SMS (will be skipped at dispatch time if no phone).
 *
 * De-dup: we check for an existing ScheduledMessage with the same
 * messageType + jobId + visitId (stored in metadataJson). One reminder per
 * visit, period.
 */

import { db } from '@/lib/db'
import { resolveTenantLocale } from '@/lib/locale-timezone'

export interface ScheduleAppointmentRemindersResult {
  scheduled: number
}

// ── teamReminder value → minutes-before-visit ──────────────────────────────
const REMINDER_OFFSET_MINUTES: Record<string, number> = {
  '1h': 60,
  '24h': 24 * 60,
  '2d': 48 * 60,
}

function parseTenantSettings(raw?: string | null): Record<string, any> {
  if (!raw) return {}
  try {
    return JSON.parse(raw) || {}
  } catch {
    return {}
  }
}

function formatReminderDateAndTime(date: Date, timeZone: string): { dateStr: string; timeStr: string } {
  const dateStr = date.toLocaleDateString('en-US', {
    timeZone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const timeStr = date.toLocaleTimeString('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
  })
  return { dateStr, timeStr }
}

function resolveTenantReminderContext(tenant?: {
  name?: string | null
  slug?: string | null
  publicSlug?: string | null
  country?: string | null
  settingsJson?: string | null
  planStatus?: string | null
} | null) {
  const settings = parseTenantSettings(tenant?.settingsJson)
  const localeInfo = resolveTenantLocale({
    tenantCountry: tenant?.country,
    settingsJson: settings,
  })
  const businessName =
    (typeof settings.activeGbpTitle === 'string' && settings.activeGbpTitle.trim()) ||
    (typeof settings.bookingPageConfig?.businessName === 'string' &&
      settings.bookingPageConfig.businessName.trim()) ||
    tenant?.name?.trim() ||
    'Our Team'
  const slug =
    settings.bookingPageConfig?.publicSlug ||
    tenant?.publicSlug ||
    tenant?.slug ||
    ''
  const supportUrl = slug
    ? `https://bgos.site/${encodeURIComponent(slug)}`
    : 'https://bgos.site'
  const bookingReminderHours =
    typeof settings.bookingReminderHours === 'string' &&
    ['none', '1h', '24h', '2d'].includes(settings.bookingReminderHours)
      ? settings.bookingReminderHours
      : '24h'

  return {
    localeInfo,
    businessName,
    supportUrl,
    bookingReminderHours,
    planStatus: String(tenant?.planStatus || '').toLowerCase(),
  }
}

function buildReminderHtml(params: {
  customerName: string
  dateStr: string
  timeStr: string
  serviceTitle: string
  visitTitle?: string
  address?: string | null
  businessName: string
}): string {
  return [
    `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">`,
    `<h2>📅 Appointment Reminder</h2>`,
    `<p>Hi ${params.customerName},</p>`,
    `<p>This is a friendly reminder that you have an appointment:</p>`,
    `<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">`,
    `<tr><td style="padding:8px;background:#f9fafb;font-weight:600;border:1px solid #e5e7eb;width:33%;">Date</td><td style="padding:8px;border:1px solid #e5e7eb;">${params.dateStr}</td></tr>`,
    `<tr><td style="padding:8px;background:#f9fafb;font-weight:600;border:1px solid #e5e7eb;">Time</td><td style="padding:8px;border:1px solid #e5e7eb;">${params.timeStr}</td></tr>`,
    `<tr><td style="padding:8px;background:#f9fafb;font-weight:600;border:1px solid #e5e7eb;">Service</td><td style="padding:8px;border:1px solid #e5e7eb;">${params.serviceTitle}</td></tr>`,
    params.visitTitle ? `<tr><td style="padding:8px;background:#f9fafb;font-weight:600;border:1px solid #e5e7eb;">Visit</td><td style="padding:8px;border:1px solid #e5e7eb;">${params.visitTitle}</td></tr>` : '',
    params.address ? `<tr><td style="padding:8px;background:#f9fafb;font-weight:600;border:1px solid #e5e7eb;">Location</td><td style="padding:8px;border:1px solid #e5e7eb;">${params.address}</td></tr>` : '',
    `</table>`,
    `<p>If you need to reschedule, please contact us as soon as possible.</p>`,
    `<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />`,
    `<p style="font-size:12px;color:#9ca3af;">— ${params.businessName}</p>`,
    `</div>`,
  ]
    .filter(Boolean)
    .join('\n')
}

export async function scheduleAppointmentReminders(): Promise<ScheduleAppointmentRemindersResult> {
  const now = new Date()
  const visitWindowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000) // +24h
  const bookingWindowEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000) // +48h

  let scheduled = 0

  // ── 1. Schedule reminders for field-service JobVisits ───────────────────
  const visits = typeof db.jobVisit?.findMany === 'function'
    ? await db.jobVisit.findMany({
        where: {
          scheduledDate: {
            gte: now,
            lte: visitWindowEnd,
          },
          teamReminder: { not: 'none' },
          status: 'scheduled',
        },
      })
    : []

  if (visits.length > 0) {
    const jobIds = Array.from(new Set(visits.map((v) => v.jobId)))
    const jobs = await db.job.findMany({
      where: { id: { in: jobIds } },
      include: { customer: true },
    })
    const jobById = new Map(jobs.map((j) => [j.id, j]))

    const visitTenantIds = Array.from(new Set(visits.map((v) => v.tenantId).filter(Boolean)))
    const visitTenants = visitTenantIds.length > 0 && typeof db.tenant?.findMany === 'function'
      ? await db.tenant
          .findMany({
            where: { id: { in: visitTenantIds } },
            select: {
              id: true,
              name: true,
              slug: true,
              publicSlug: true,
              country: true,
              settingsJson: true,
              planStatus: true,
            },
          })
          .catch(() => [])
      : []
    const visitTenantMap = new Map(visitTenants.map((t) => [t.id, t]))

    for (const visit of visits) {
      const offsetMin = REMINDER_OFFSET_MINUTES[visit.teamReminder]
      if (!offsetMin) continue

      const job = jobById.get(visit.jobId)
      if (!job) continue

      const customer = job.customer
      const customerEmail = customer?.email || job.customerEmail || null
      const customerPhone = customer?.phone || job.customerPhone || null
      const customerName = customer?.name || job.customerName || 'Customer'
      if (!customerEmail && !customerPhone) continue

      let alreadyScheduled = false
      try {
        const existing = await db.scheduledMessage.findMany({
          where: {
            messageType: 'appointment_reminder',
            jobId: job.id,
          },
          select: { id: true, metadataJson: true },
        })
        for (const row of existing) {
          try {
            const meta = JSON.parse(row.metadataJson || '{}') as { visitId?: string }
            if (meta.visitId === visit.id) {
              alreadyScheduled = true
              break
            }
          } catch {}
        }
      } catch (err) {
        console.warn(
          `[AppointmentReminders] dedup check failed for visit ${visit.id} (job ${job.id}):`,
          err
        )
      }
      if (alreadyScheduled) continue

      const dueAt = new Date(visit.scheduledDate.getTime() - offsetMin * 60 * 1000)
      const channel: 'email' | 'whatsapp' | 'sms' = customerEmail ? 'email' : 'whatsapp'
      const ctx = resolveTenantReminderContext(visitTenantMap.get(visit.tenantId))
      const formatted = formatReminderDateAndTime(visit.scheduledDate, ctx.localeInfo.timeZone)
      const visitDateStr = formatted.dateStr
      const visitTimeStr = visit.anytime
        ? 'Anytime during business hours'
        : visit.scheduledTime
          ? visit.endTime
            ? `${visit.scheduledTime} – ${visit.endTime}`
            : visit.scheduledTime
          : formatted.timeStr

      const subject = `Appointment reminder: ${job.title}`
      const bodyText = [
        `Reminder: You have an appointment on ${visitDateStr} at ${visitTimeStr}.`,
        `Service: ${job.title}`,
        visit.title ? `Visit: ${visit.title}` : '',
        job.address ? `Location: ${job.address}` : '',
        '',
        'If you need to reschedule, please contact us as soon as possible.',
        '',
        `— ${ctx.businessName}`,
      ]
        .filter((line) => line !== '')
        .join('\n')

      const bodyHtml = customerEmail
        ? buildReminderHtml({
            customerName,
            dateStr: visitDateStr,
            timeStr: visitTimeStr,
            serviceTitle: job.title,
            visitTitle: visit.title || undefined,
            address: job.address,
            businessName: ctx.businessName,
          })
        : null

      try {
        await db.scheduledMessage.create({
          data: {
            tenantId: visit.tenantId,
            customerId: job.customerId || undefined,
            jobId: job.id,
            messageType: 'appointment_reminder',
            channel,
            recipientEmail: customerEmail,
            recipientPhone: customerPhone,
            subject,
            bodyText,
            bodyHtml,
            dueAt,
            status: 'pending',
            metadataJson: JSON.stringify({
              visitId: visit.id,
              jobVisitNumber: visit.jobVisitNumber,
              teamReminder: visit.teamReminder,
              offsetMinutes: offsetMin,
              scheduledDate: visit.scheduledDate.toISOString(),
              triggeredBy: 'appointment-reminders-cron',
              ...(channel === 'whatsapp'
                ? {
                    metaTemplateName: 'utility_booking_reminder',
                    metaTemplateLanguage: 'en_US',
                    metaTemplateParams: [
                      customerName,
                      ctx.businessName,
                      visitDateStr,
                      visitTimeStr,
                      job.title,
                      ctx.supportUrl,
                    ],
                  }
                : {}),
            }),
          },
        })
        scheduled++
      } catch (err) {
        console.error(
          `[AppointmentReminders] Failed to create ScheduledMessage for visit ${visit.id} (job ${job.id}):`,
          err
        )
      }
    }
  }

  // ── 2. Schedule WhatsApp / Email reminders for BGOS Bookings ──────────
  if (typeof db.booking?.findMany === 'function') {
    const bookings = await db.booking
      .findMany({
        where: {
          scheduledAt: {
            gte: now,
            lte: bookingWindowEnd,
          },
          status: { in: ['confirmed', 'pending'] },
          tenantId: { not: null },
        },
        select: {
          id: true,
          title: true,
          status: true,
          customerId: true,
          customerName: true,
          customerPhone: true,
          customerEmail: true,
          address: true,
          scheduledAt: true,
          tenantId: true,
        },
      })
      .catch(() => [])

    if (bookings.length > 0) {
      const tenantIds = Array.from(
        new Set(bookings.map((b) => b.tenantId).filter((id): id is string => Boolean(id))),
      )
      const customerIds = Array.from(
        new Set(bookings.map((b) => b.customerId).filter((id): id is string => Boolean(id))),
      )

      const [tenants, customers] = await Promise.all([
        tenantIds.length > 0 && typeof db.tenant?.findMany === 'function'
          ? db.tenant
              .findMany({
                where: { id: { in: tenantIds } },
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  publicSlug: true,
                  country: true,
                  settingsJson: true,
                  planStatus: true,
                },
              })
              .catch(() => [])
          : Promise.resolve([]),
        customerIds.length > 0 && typeof db.customer?.findMany === 'function'
          ? db.customer
              .findMany({
                where: { id: { in: customerIds } },
                select: { id: true, name: true, phone: true, email: true },
              })
              .catch(() => [])
          : Promise.resolve([]),
      ])

      const tenantMap = new Map(tenants.map((t) => [t.id, t]))
      const customerMap = new Map(customers.map((c) => [c.id, c]))

      for (const booking of bookings) {
        if (!booking.tenantId || !booking.scheduledAt) continue

        const ctx = resolveTenantReminderContext(tenantMap.get(booking.tenantId))
        if (['expired', 'cancelled', 'canceled', 'suspended'].includes(ctx.planStatus)) {
          continue
        }
        const offsetMin = REMINDER_OFFSET_MINUTES[ctx.bookingReminderHours]
        if (!offsetMin) continue

        const customer = booking.customerId ? customerMap.get(booking.customerId) : null
        const customerPhone = booking.customerPhone || customer?.phone || null
        const customerEmail = booking.customerEmail || customer?.email || null
        const customerName = booking.customerName || customer?.name || 'Customer'
        if (!customerPhone && !customerEmail) continue

        const existingReminder = await db.scheduledMessage
          .findMany({
            where: {
              messageType: 'appointment_reminder',
              bookingId: booking.id,
            },
            select: { id: true },
          })
          .catch(() => [])
        if (existingReminder.length > 0) continue

        const dueAt = new Date(booking.scheduledAt.getTime() - offsetMin * 60 * 1000)
        // Only enqueue once within due window (or slightly overdue) so 48h lookahead honors 1h/24h offsets accurately
        if (dueAt.getTime() - now.getTime() > 60 * 60 * 1000 && ctx.bookingReminderHours === '1h') {
          continue
        }

        const channel: 'whatsapp' | 'email' = customerPhone ? 'whatsapp' : 'email'
        const { dateStr, timeStr } = formatReminderDateAndTime(
          booking.scheduledAt,
          ctx.localeInfo.timeZone,
        )
        const subject = `Appointment reminder: ${booking.title}`
        const bodyText = [
          `Hi ${customerName}, reminder of your appointment with ${ctx.businessName} on ${dateStr} at ${timeStr}.`,
          `Service: ${booking.title}`,
          booking.address ? `Location: ${booking.address}` : '',
          `Details: ${ctx.supportUrl}`,
        ]
          .filter(Boolean)
          .join('\n')
        const bodyHtml = customerEmail
          ? buildReminderHtml({
              customerName,
              dateStr,
              timeStr,
              serviceTitle: booking.title,
              address: booking.address,
              businessName: ctx.businessName,
            })
          : null

        try {
          await db.scheduledMessage.create({
            data: {
              tenantId: booking.tenantId,
              customerId: booking.customerId || undefined,
              bookingId: booking.id,
              messageType: 'appointment_reminder',
              channel,
              recipientEmail: customerEmail,
              recipientPhone: customerPhone,
              subject,
              bodyText,
              bodyHtml,
              dueAt,
              status: 'pending',
              metadataJson: JSON.stringify({
                bookingId: booking.id,
                bookingReminderHours: ctx.bookingReminderHours,
                offsetMinutes: offsetMin,
                scheduledDate: booking.scheduledAt.toISOString(),
                triggeredBy: 'appointment-reminders-cron',
                ...(channel === 'whatsapp'
                  ? {
                      metaTemplateName: 'utility_booking_reminder',
                      metaTemplateLanguage: 'en_US',
                      metaTemplateParams: [
                        customerName,
                        ctx.businessName,
                        dateStr,
                        timeStr,
                        booking.title,
                        ctx.supportUrl,
                      ],
                    }
                  : {}),
              }),
            },
          })
          scheduled++
        } catch (err) {
          console.error(
            `[AppointmentReminders] Failed to create ScheduledMessage for booking ${booking.id}:`,
            err
          )
        }
      }
    }
  }

  return { scheduled }
}

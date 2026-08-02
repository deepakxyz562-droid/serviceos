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

export interface ScheduleAppointmentRemindersResult {
  scheduled: number
}

// ── teamReminder value → minutes-before-visit ──────────────────────────────
const REMINDER_OFFSET_MINUTES: Record<string, number> = {
  '1h': 60,
  '24h': 24 * 60,
  '2d': 48 * 60,
}

export async function scheduleAppointmentReminders(): Promise<ScheduleAppointmentRemindersResult> {
  const now = new Date()
  const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000) // +24h

  // ── Find upcoming visits in the next 24h with reminders enabled ────
  // NOTE: JobVisit has `jobId` but NO Prisma relation to Job (see
  // schema.prisma). We fetch the visits first, then resolve the Job +
  // Customer rows in a follow-up query. Cheaper than N+1 only when the
  // visit count is small (which it is — at most a few dozen upcoming
  // visits per tenant in any 24h window).
  const visits = await db.jobVisit.findMany({
    where: {
      scheduledDate: {
        gte: now,
        lte: windowEnd,
      },
      teamReminder: { not: 'none' },
      status: 'scheduled',
    },
  })

  if (visits.length === 0) {
    return { scheduled: 0 }
  }

  // ── Resolve the parent Jobs + Customers in two batched queries ─────
  const jobIds = Array.from(new Set(visits.map((v) => v.jobId)))
  const jobs = await db.job.findMany({
    where: { id: { in: jobIds } },
    include: { customer: true },
  })
  const jobById = new Map(jobs.map((j) => [j.id, j]))

  let scheduled = 0

  for (const visit of visits) {
    const offsetMin = REMINDER_OFFSET_MINUTES[visit.teamReminder]
    if (!offsetMin) {
      // Unknown teamReminder value — skip. (Defensive: schema says
      // 'none | 1h | 24h | 2d', but stale data could have anything.)
      continue
    }

    const job = jobById.get(visit.jobId)
    if (!job) {
      // Orphaned visit with no parent job — can't link a reminder to it.
      continue
    }

    const customer = job.customer
    const customerEmail = customer?.email || job.customerEmail || null
    const customerPhone = customer?.phone || job.customerPhone || null
    const customerName = customer?.name || job.customerName || 'Customer'

    // If we have neither email nor phone, there's no way to reach the
    // customer — skip (don't create a row that will just fail at dispatch).
    if (!customerEmail && !customerPhone) {
      continue
    }

    // ── De-dup: skip if we've already scheduled a reminder for this visit ──
    // We look up by messageType + jobId, then filter in JS for visitId in
    // metadataJson. (Prisma can't filter on JSON contents portably.)
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
        } catch {
          // ignore parse errors
        }
      }
    } catch (err) {
      console.warn(
        `[AppointmentReminders] dedup check failed for visit ${visit.id} (job ${job.id}):`,
        err
      )
      // Continue — better to risk a duplicate than to silently skip a reminder.
    }
    if (alreadyScheduled) continue

    // ── Compute the reminder's dueAt ──────────────────────────────────
    // dueAt = visit.scheduledDate - offsetMin. If that's already in the
    // past, the message is dispatched on the next scheduled-messages cron
    // tick (better late than never).
    const dueAt = new Date(visit.scheduledDate.getTime() - offsetMin * 60 * 1000)

    // ── Channel selection ─────────────────────────────────────────────
    const channel: 'email' | 'whatsapp' | 'sms' = customerEmail
      ? 'email'
      : 'whatsapp'

    // ── Build the message body ────────────────────────────────────────
    const visitDateStr = visit.scheduledDate.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    const visitTimeStr = visit.anytime
      ? 'Anytime during business hours'
      : visit.scheduledTime
        ? visit.endTime
          ? `${visit.scheduledTime} – ${visit.endTime}`
          : visit.scheduledTime
        : 'Anytime during business hours'

    const subject = `Appointment reminder: ${job.title}`
    const bodyText = [
      `Reminder: You have an appointment on ${visitDateStr} at ${visitTimeStr}.`,
      `Service: ${job.title}`,
      visit.title ? `Visit: ${visit.title}` : '',
      job.address ? `Location: ${job.address}` : '',
      '',
      'If you need to reschedule, please contact us as soon as possible.',
      '',
      '— Fieseros',
    ]
      .filter((line) => line !== '')
      .join('\n')

    const bodyHtml = customerEmail
      ? [
          `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">`,
          `<h2>📅 Appointment Reminder</h2>`,
          `<p>Hi ${customerName},</p>`,
          `<p>This is a friendly reminder that you have an appointment:</p>`,
          `<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">`,
          `<tr><td style="padding:8px;background:#f9fafb;font-weight:600;border:1px solid #e5e7eb;width:33%;">Date</td><td style="padding:8px;border:1px solid #e5e7eb;">${visitDateStr}</td></tr>`,
          `<tr><td style="padding:8px;background:#f9fafb;font-weight:600;border:1px solid #e5e7eb;">Time</td><td style="padding:8px;border:1px solid #e5e7eb;">${visitTimeStr}</td></tr>`,
          `<tr><td style="padding:8px;background:#f9fafb;font-weight:600;border:1px solid #e5e7eb;">Service</td><td style="padding:8px;border:1px solid #e5e7eb;">${job.title}</td></tr>`,
          visit.title ? `<tr><td style="padding:8px;background:#f9fafb;font-weight:600;border:1px solid #e5e7eb;">Visit</td><td style="padding:8px;border:1px solid #e5e7eb;">${visit.title}</td></tr>` : '',
          job.address ? `<tr><td style="padding:8px;background:#f9fafb;font-weight:600;border:1px solid #e5e7eb;">Location</td><td style="padding:8px;border:1px solid #e5e7eb;">${job.address}</td></tr>` : '',
          `</table>`,
          `<p>If you need to reschedule, please contact us as soon as possible.</p>`,
          `<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />`,
          `<p style="font-size:12px;color:#9ca3af;">— Fieseros</p>`,
          `</div>`,
        ]
        .filter(Boolean)
        .join('\n')
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
          }),
        },
      })
      scheduled++
    } catch (err) {
      console.error(
        `[AppointmentReminders] Failed to create ScheduledMessage for visit ${visit.id} (job ${job.id}):`,
        err
      )
      // Continue — one failed create shouldn't abort the whole batch.
    }
  }

  return { scheduled }
}

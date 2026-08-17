/**
 * Recurring Jobs
 * ───────────────
 * Schedule-driven generator for repeat / contract / maintenance jobs.
 *
 * A `RecurringJobSchedule` describes what to create (title, customer, line
 * items, assignees, instructions), how often to create it (frequency +
 * day/time rules) and when to stop (endDate). When `nextRunAt` falls due,
 * the cron runner / API calls `processDueRecurringJobSchedules()` which:
 *
 *   1. Creates a new `Job` (status='scheduled', type='recurring')
 *   2. Creates a linked `JobVisit` with the scheduled date/time + duration
 *   3. Advances `nextRunAt` to the next occurrence
 *   4. Increments `executionCount`, sets `lastRunAt` + `lastJobId`
 *   5. Writes an `ActivityLog` entry
 *
 * If the new `nextRunAt` is past `endDate`, the schedule is auto-deactivated.
 *
 * The cron endpoint is `POST /api/cron/recurring-jobs` (auth via `x-cron-secret`).
 *
 * Plan gating: `recurring_jobs` is a Business-tier feature (see plan-features.ts).
 * The create / pause / resume / generate-now API routes call
 * `requirePlanFeature('recurring_jobs')` before mutating data.
 */

import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity-log';
import { sendWhatsAppMessage } from '@/lib/whatsapp-send';
import { sendSmsMessage } from '@/lib/sms-send';

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Local subset of the Prisma `RecurringJobSchedule` model. Defined locally so
 * the helper functions can be type-checked without importing the generated
 * client (which would pull it into client-side bundles via the API layer).
 */
export interface RecurringJobSchedule {
  id: string;
  tenantId: string;
  customerId: string | null;
  templateJobId: string | null;
  title: string;
  description: string | null;
  frequency: string; // weekly | biweekly | monthly | quarterly | annually
  dayOfWeek: number | null; // 0-6 (Sun-Sat)
  dayOfMonth: number | null; // 1-31
  weekOfMonth: number | null; // 1-5 (for "second Tuesday" patterns)
  timeOfDay: string | null; // "09:30" 24h format
  durationMins: number;
  startDate: Date;
  endDate: Date | null;
  nextRunAt: Date;
  lastRunAt: Date | null;
  lastJobId: string | null;
  executionCount: number;
  assigneeIdsJson: string;
  serviceId: string | null;
  branchId: string | null;
  visitInstructions: string | null;
  checklistIdsJson: string;
  lineItemsJson: string;
  // ── Phase C: Optional billing ──
  // When true, the engine creates an Invoice alongside each generated Job.
  // invoiceTiming: 'on_generation' (draft invoice at job creation) |
  //                'on_completion' (relies on autoCreateInvoiceFromJob firing
  //                from the job-completion lifecycle).
  generateInvoice: boolean;
  invoiceTiming: string; // 'on_generation' | 'on_completion'
  // ── Phase F: Timezone ──
  // IANA timezone name (e.g. "Asia/Kolkata"). When set, nextRunAt +
  // scheduledAt are computed in this timezone. When null, server local time
  // is used (legacy behavior).
  timezone: string | null;
  active: boolean;
  pausedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_STEP: Record<string, number> = {
  weekly: 0,
  biweekly: 0,
  monthly: 1,
  quarterly: 3,
  annually: 12,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function safeParseArray<T = unknown>(json: string | null | undefined, fallback: T[] = []): T[] {
  if (!json) return fallback;
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Apply a "HH:MM" 24h time string to a Date. Returns a new Date.
 * If the time is null/invalid, the hours/minutes are set to 0 (midnight).
 */
function applyTimeOfDay(date: Date, time: string | null | undefined): Date {
  const d = new Date(date);
  if (!time) {
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m) {
    d.setHours(0, 0, 0, 0);
    return d;
  }
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return d;
}

/**
 * Detect whether a thrown error is a unique-constraint violation.
 * Covers both Prisma's P2002 code and the underlying PostgreSQL 23505, plus
 * a defensive message-substring check for drivers that wrap the original.
 *
 * Used by the idempotency fallback in `processSingleSchedule` — if two
 * concurrent cron runs race to create the same `[recurringScheduleId,
 * scheduledAt]` occurrence, the loser treats the error as a duplicate and
 * silently advances `nextRunAt` instead of surfacing the failure.
 */
function isUniqueViolation(err: any): boolean {
  if (!err) return false;
  if (err.code === 'P2002') return true;  // Prisma unique-constraint error
  if (err.code === '23505') return true; // PostgreSQL unique_violation
  const msg = (err.message || '').toLowerCase();
  return msg.includes('unique') && (msg.includes('violat') || msg.includes('constraint'));
}

/**
 * Get the UTC offset (in minutes) for a given IANA timezone at a specific
 * instant. Returns 0 if the timezone is invalid or null/undefined (falls back
 * to UTC).
 *
 * Implementation: we use `Intl.DateTimeFormat.formatToParts` with the target
 * `timeZone` to extract wall-clock (Y/M/D/H/M/S) components, then re-interpret
 * those as UTC. The difference between that fake-UTC instant and the actual
 * UTC instant is the timezone offset (in ms → minutes).
 */
function getTimezoneOffsetMinutes(timezone: string | null | undefined, date: Date): number {
  if (!timezone) return 0;
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const get = (type: string) => Number(parts.find(p => p.type === type)?.value ?? '0');
    const hour = get('hour') % 24; // '24' can appear for midnight in en-US
    const wallClockAsUtc = new Date(Date.UTC(
      get('year'), get('month') - 1, get('day'),
      hour, get('minute'), get('second'),
    ));
    return Math.round((wallClockAsUtc.getTime() - date.getTime()) / 60000);
  } catch {
    return 0; // invalid timezone → treat as UTC
  }
}

/**
 * Convert a wall-clock time in a given timezone to a UTC Date.
 * If timezone is null/undefined, returns `new Date(year, month0, day, hours,
 * minutes, seconds)` (server-local) — matching the legacy `applyTimeOfDay`
 * behavior so callers that don't opt into timezone see no change.
 */
function zonedTimeToUtc(
  timezone: string | null | undefined,
  year: number, month0: number, day: number,
  hours: number, minutes: number, seconds: number = 0,
): Date {
  if (!timezone) {
    return new Date(year, month0, day, hours, minutes, seconds);
  }
  // Pretend the wall-clock time is UTC, then subtract the timezone offset.
  const fakeUtc = new Date(Date.UTC(year, month0, day, hours, minutes, seconds));
  const offsetMinutes = getTimezoneOffsetMinutes(timezone, fakeUtc);
  return new Date(fakeUtc.getTime() - offsetMinutes * 60000);
}

/**
 * Days in a given month (1-31). Month is 0-indexed (0 = Jan).
 */
function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate();
}

/**
 * Find the Nth occurrence of a given weekday in a month.
 * Returns 0 if there's no Nth occurrence (e.g. the 5th Monday doesn't always exist).
 *
 * @param year  e.g. 2024
 * @param month0 0-indexed (0 = January)
 * @param weekday 0-6 (0 = Sunday)
 * @param weekOfMonth 1-5 (1 = first occurrence, 5 = last)
 */
function nthWeekdayOfMonth(
  year: number,
  month0: number,
  weekday: number,
  weekOfMonth: number,
): number {
  const first = new Date(year, month0, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  const day = 1 + offset + (weekOfMonth - 1) * 7;
  if (day > daysInMonth(year, month0)) return 0; // doesn't exist
  return day;
}

// ─── Core: computeNextOccurrence ─────────────────────────────────────────────

/**
 * Compute the next occurrence date for a recurring job schedule.
 *
 * Rules:
 *  - **weekly**: the next `dayOfWeek` strictly AFTER `afterDate` (today is
 *    excluded so we always advance), at `timeOfDay`.
 *  - **biweekly**: same as weekly but jump +14 days from the resulting date.
 *    (i.e. every other week on the same weekday.)
 *  - **monthly / quarterly / annually**: day N of the month that is N months
 *    after `afterDate`'s month. If `weekOfMonth` is also set, use the Nth
 *    `dayOfWeek` of that month instead ("second Tuesday" pattern).
 *    For months that don't have day 31, clamp to the last day.
 *  - If `endDate` is set and the computed next occurrence would be after
 *    `endDate`, return `null` — the caller should deactivate the schedule.
 *  - `timeOfDay` is applied on the final result (defaults to midnight).
 */
export function computeNextOccurrence(
  schedule: Pick<
    RecurringJobSchedule,
    | 'frequency'
    | 'dayOfWeek'
    | 'dayOfMonth'
    | 'weekOfMonth'
    | 'timeOfDay'
    | 'endDate'
    | 'timezone'
  >,
  afterDate: Date,
): Date | null {
  const frequency = schedule.frequency || 'weekly';
  let result: Date;

  if (frequency === 'weekly' || frequency === 'biweekly') {
    const targetDow = schedule.dayOfWeek ?? 0;
    const cursor = new Date(afterDate);
    // Always advance at least one day to avoid re-firing the same day.
    cursor.setDate(cursor.getDate() + 1);
    const cur = cursor.getDay();
    let diff = (targetDow - cur + 7) % 7;
    if (frequency === 'biweekly') diff += 7; // skip a week
    cursor.setDate(cursor.getDate() + diff);
    result = cursor;
  } else {
    // monthly / quarterly / annually
    const step = MONTH_STEP[frequency] || 1;
    const base = new Date(afterDate);
    // Move to the first day of the next period month (N months after current).
    base.setDate(1);
    base.setMonth(base.getMonth() + step);

    if (schedule.weekOfMonth && schedule.dayOfWeek != null) {
      // "Nth weekday of the month" pattern (e.g. 2nd Tuesday).
      const day = nthWeekdayOfMonth(
        base.getFullYear(),
        base.getMonth(),
        schedule.dayOfWeek,
        schedule.weekOfMonth,
      );
      if (day === 0) {
        // The Nth weekday doesn't exist this month (e.g. 5th Tuesday of Feb).
        // Roll forward another month and try again.
        base.setMonth(base.getMonth() + step);
        const retryDay = nthWeekdayOfMonth(
          base.getFullYear(),
          base.getMonth(),
          schedule.dayOfWeek,
          schedule.weekOfMonth,
        );
        base.setDate(retryDay || 1);
      } else {
        base.setDate(day);
      }
    } else {
      // Plain day-of-month.
      const dom = schedule.dayOfMonth ?? 1;
      const max = daysInMonth(base.getFullYear(), base.getMonth());
      base.setDate(Math.min(dom, max));
    }
    result = base;
  }

  // Apply the time-of-day (defaults to 00:00 if unset).
  //
  // Phase F (timezone): when `schedule.timezone` is set, re-interpret the
  // wall-clock time in that IANA zone and produce the corresponding UTC
  // instant. The day arithmetic above ran in server-local but only used the
  // DATE component, so the timezone conversion is the only step that needs
  // the zone. When `timezone` is null/undefined, fall back to the legacy
  // server-local `applyTimeOfDay` behavior — this preserves EXACT prior output
  // for schedules that don't opt into the timezone feature.
  if (schedule.timezone) {
    const m = schedule.timeOfDay
      ? /^(\d{1,2}):(\d{2})$/.exec(schedule.timeOfDay.trim())
      : null;
    const hours = m ? Number(m[1]) : 0;
    const minutes = m ? Number(m[2]) : 0;
    result = zonedTimeToUtc(
      schedule.timezone,
      result.getFullYear(),
      result.getMonth(),
      result.getDate(),
      hours,
      minutes,
      0,
    );
  } else {
    result = applyTimeOfDay(result, schedule.timeOfDay);
  }

  // End-date guard.
  if (schedule.endDate && result > schedule.endDate) {
    return null;
  }

  return result;
}

// ─── Core: processDueRecurringJobSchedules ───────────────────────────────────

/**
 * Process all due recurring job schedules.
 *
 * For each schedule where `active = true AND nextRunAt <= now`:
 *   1. Create a new `Job` (status='scheduled', type='recurring') with the
 *      schedule's title, customer, assignees, service, line items.
 *   2. Create a `JobVisit` linked to the job with the scheduled date/time
 *      and duration.
 *   3. Advance `nextRunAt` to the next occurrence (computed via
 *      `computeNextOccurrence`). If the new value is null (past `endDate`),
 *      set `active = false`.
 *   4. Increment `executionCount`, set `lastRunAt` + `lastJobId`.
 *   5. Write an `ActivityLog` entry.
 *
 * Each schedule is processed in its own `db.$transaction` so a single
 * failure doesn't roll back successful runs.
 *
 * Returns `{ processed, errors }`.
 */
export async function processDueRecurringJobSchedules(): Promise<{
  processed: number;
  errors: number;
}> {
  const now = new Date();
  const due = await db.recurringJobSchedule.findMany({
    where: { active: true, nextRunAt: { lte: now } },
    select: { id: true },
  });

  let processed = 0;
  let errors = 0;

  for (const s of due) {
    try {
      await processSingleSchedule(s.id);
      processed++;
    } catch (err) {
      console.error('[RecurringJobs] processSingleSchedule failed for', s.id, err);
      errors++;
    }
  }

  return { processed, errors };
}

/**
 * Process a single schedule: generate the next job + visit, then advance.
 * Wrapped in a transaction so the job + visit + schedule-update are atomic.
 */
async function processSingleSchedule(scheduleId: string): Promise<void> {
  const schedule = await db.recurringJobSchedule.findUnique({
    where: { id: scheduleId },
  });
  if (!schedule) {
    throw new Error(`Schedule ${scheduleId} not found`);
  }
  if (!schedule.active) {
    return; // someone paused it between pickup and processing
  }

  // Parse JSON fields.
  const assigneeIds = safeParseArray<string>(schedule.assigneeIdsJson);
  const checklistIds = safeParseArray<string>(schedule.checklistIdsJson);
  // lineItemsJson is preserved verbatim — the Job model stores it the same way.

  const firstAssigneeId = assigneeIds[0] ?? null;

  // Resolve assignee name for denormalized storage (best-effort).
  let assigneeName: string | null = null;
  let assigneePhone: string | null = null;
  if (firstAssigneeId) {
    try {
      const emp = await db.employee.findUnique({
        where: { id: firstAssigneeId },
        select: { name: true, phone: true },
      });
      assigneeName = emp?.name ?? null;
      assigneePhone = emp?.phone ?? null;
    } catch {
      // ignore — leave null
    }
  }

  // Resolve customer name/phone/email for the denormalized Job fields.
  let customerName: string | null = null;
  let customerPhone: string | null = null;
  let customerEmail: string | null = null;
  if (schedule.customerId) {
    try {
      const c = await db.customer.findUnique({
        where: { id: schedule.customerId },
        select: { name: true, phone: true, email: true },
      });
      customerName = c?.name ?? null;
      customerPhone = c?.phone ?? null;
      customerEmail = c?.email ?? null;
    } catch {
      // ignore
    }
  }

  // Resolve workspaceId for the new Job (Job has no tenantId column —
  // it links via workspaceId; tenantId lives on the workspace).
  let workspaceId: string | null = schedule.branchId ?? null;
  if (!workspaceId) {
    try {
      const ws = await db.workspace.findFirst({
        where: { tenantId: schedule.tenantId },
        select: { id: true },
      });
      workspaceId = ws?.id ?? null;
    } catch {
      // ignore — Job.workspaceId is nullable
    }
  }

  const scheduledAt = schedule.nextRunAt;
  const scheduledTime = schedule.timeOfDay ?? null;

  // ── Transaction: create Job + JobVisit + update Schedule ──────────────
  const result = await db.$transaction(async (tx) => {
    // 0. Phase A1 — Idempotency pre-check.
    // If a Job already exists for this `[recurringScheduleId, scheduledAt]`
    // occurrence (e.g. the cron ran twice in close succession, or a prior run
    // committed the Job but crashed before advancing nextRunAt), skip the
    // create path entirely and just advance nextRunAt. The unique constraint
    // `@@unique([recurringScheduleId, scheduledAt])` on Job is the safety net;
    // this findFirst is the fast path that avoids throwing.
    const existingJob = await tx.job.findFirst({
      where: {
        recurringScheduleId: schedule.id,
        scheduledAt: schedule.nextRunAt,
      },
      select: { id: true },
    });
    if (existingJob) {
      // Already generated for this occurrence — just advance nextRunAt
      // without creating a duplicate.
      const nextRunAt = computeNextOccurrence(schedule, schedule.nextRunAt);
      const willDeactivate = nextRunAt === null;
      await tx.recurringJobSchedule.update({
        where: { id: schedule.id },
        data: {
          lastRunAt: new Date(),
          lastJobId: existingJob.id,
          executionCount: { increment: 1 },
          nextRunAt: nextRunAt ?? schedule.nextRunAt,
          active: willDeactivate ? false : true,
          pausedAt: willDeactivate ? new Date() : schedule.pausedAt,
        },
      });
      return { skipped: true as const, existingJobId: existingJob.id };
    }

    // 1. Create the Job. Wrapped in try/catch for the unique-constraint race:
    // if another concurrent process created the same occurrence between our
    // findFirst above and our create here, the DB will throw P2002 (Prisma) /
    // 23505 (Postgres). Treat that as a duplicate and advance nextRunAt
    // without surfacing the error to the caller.
    let job: { id: string; title: string };
    try {
      job = await tx.job.create({
        data: {
          title: schedule.title,
          description: schedule.description ?? null,
          status: 'scheduled',
          priority: 'medium',
          type: 'recurring',
          scheduledAt,
          scheduledTime,
          estimatedDuration: schedule.durationMins,
          customerId: schedule.customerId ?? null,
          customerName: customerName ?? null,
          customerPhone: customerPhone ?? null,
          customerEmail: customerEmail ?? null,
          assigneeId: firstAssigneeId,
          assigneeName,
          assigneePhone,
          serviceId: schedule.serviceId ?? null,
          lineItemsJson: schedule.lineItemsJson || '[]',
          visitInstructions: schedule.visitInstructions ?? null,
          linkedChecklistsJson: JSON.stringify(checklistIds),
          workspaceId,
          recurringScheduleId: schedule.id,
        },
      });
    } catch (err: any) {
      if (isUniqueViolation(err)) {
        // Another concurrent process created the Job for this occurrence
        // between our findFirst and create. Advance nextRunAt without
        // creating a duplicate.
        const nextRunAt = computeNextOccurrence(schedule, schedule.nextRunAt);
        const willDeactivate = nextRunAt === null;
        await tx.recurringJobSchedule.update({
          where: { id: schedule.id },
          data: {
            lastRunAt: new Date(),
            nextRunAt: nextRunAt ?? schedule.nextRunAt,
            active: willDeactivate ? false : true,
            pausedAt: willDeactivate ? new Date() : schedule.pausedAt,
          },
        });
        return { skipped: true as const, conflict: true as const };
      }
      throw err;
    }

    // 2. Create the linked JobVisit.
    // Set teamReminder='24h' so the appointment-reminders cron picks it up
    // (previously defaulted to 'none' which caused the cron to skip these
    // visits — customers received no reminder for recurring visits).
    const visitTitle = customerName
      ? `${customerName} - ${schedule.title}`
      : schedule.title;
    const visitNumber = await nextVisitNumber(tx, job.id);
    await tx.jobVisit.create({
      data: {
        jobVisitNumber: visitNumber,
        tenantId: schedule.tenantId,
        jobId: job.id,
        title: visitTitle,
        visitType: 'maintenance',
        instructions: schedule.visitInstructions ?? null,
        scheduledDate: scheduledAt,
        scheduledTime,
        anytime: !schedule.timeOfDay,
        assigneeIdsJson: JSON.stringify(assigneeIds),
        assigneeNamesJson: JSON.stringify(
          assigneeName ? [assigneeName] : [],
        ),
        checklistIdsJson: JSON.stringify(checklistIds),
        teamReminder: '24h',
        status: 'scheduled',
      },
    });

    // 3. Advance the schedule.
    const nextRunAt = computeNextOccurrence(schedule, schedule.nextRunAt);
    const willDeactivate = nextRunAt === null;

    const updated = await tx.recurringJobSchedule.update({
      where: { id: schedule.id },
      data: {
        lastRunAt: new Date(),
        lastJobId: job.id,
        executionCount: { increment: 1 },
        nextRunAt: nextRunAt ?? schedule.nextRunAt,
        active: willDeactivate ? false : true,
        pausedAt: willDeactivate ? new Date() : schedule.pausedAt,
      },
    });

    return { job, updated, nextRunAt, willDeactivate };
  });

  // Phase A1 — if we skipped (dedup hit on pre-check or P2002 race), there's
  // no new Job to log or to notify the customer about. The original job's
  // lifecycle (activity log + WhatsApp/SMS) was handled by whichever run
  // actually created the Job. Just return silently.
  if ('skipped' in result) {
    return;
  }

  // Phase C — Optional billing on generation.
  // When `generateInvoice=true` AND `invoiceTiming='on_generation'`, create a
  // draft Invoice from the freshly-generated Job. This is OUTSIDE the schedule
  // transaction on purpose: `autoCreateInvoiceFromJob` takes its own lock +
  // opens its own transaction, and a failure here must NOT roll back the
  // schedule advance (the Job was created successfully).
  // Dynamic import avoids a circular dependency at module-load time
  // (`invoice-automation` does not import from `recurring-jobs` today, but
  // keeping it dynamic is safer for future refactors).
  if (schedule.generateInvoice && schedule.invoiceTiming === 'on_generation') {
    try {
      const { autoCreateInvoiceFromJob } = await import('@/lib/invoice-automation');
      await autoCreateInvoiceFromJob(result.job.id, { force: true });
    } catch (invoiceErr) {
      console.error('[RecurringJobs] auto-invoice on generation failed:', invoiceErr);
      // Don't fail the schedule advance — the Job was created successfully.
    }
  }

  // 4. Activity log (best-effort, outside the transaction).
  try {
    await logActivity({
      tenantId: schedule.tenantId,
      actorId: null,
      actorName: 'Recurring Jobs Scheduler',
      actorType: 'system',
      action: 'create',
      entityType: 'job',
      entityId: result.job.id,
      entityName: result.job.title,
      description: `Recurring schedule "${schedule.title}" generated job ${result.job.id}${
        result.willDeactivate ? ' (schedule auto-deactivated — past end date)' : ''
      }`,
      metadataJson: JSON.stringify({
        scheduleId: schedule.id,
        jobId: result.job.id,
        executionCount: result.updated.executionCount,
        nextRunAt: result.nextRunAt,
        autoDeactivated: result.willDeactivate,
        customerId: schedule.customerId,
      }),
      severity: 'info',
    });
  } catch (logErr) {
    console.error('[RecurringJobs] activity log failed:', logErr);
  }

  // 5. Customer notification (best-effort, outside the transaction).
  // Send a "your service visit is scheduled" message via WhatsApp + SMS so the
  // customer knows about the upcoming recurring visit. Previously the customer
  // received NO notification at job-generation time.
  if (customerPhone) {
    const visitDate = scheduledAt
      ? new Date(scheduledAt).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })
      : 'soon';
    const visitTimeStr = scheduledTime
      ? ` at ${scheduledTime}`
      : '';
    const assigneeLine = assigneeName ? ` Technician: ${assigneeName}.` : '';
    const messageText = `Hi${customerName ? ` ${customerName}` : ''}, your service visit "${schedule.title}" has been scheduled for ${visitDate}${visitTimeStr}.${assigneeLine} — ${schedule.tenantId ? 'We will see you then!' : ''}`;

    // WhatsApp (best-effort)
    try {
      await sendWhatsAppMessage({
        to: customerPhone,
        message: messageText,
        tenantId: schedule.tenantId,
      });
    } catch (waErr) {
      console.error('[RecurringJobs] customer WhatsApp notification failed:', waErr);
    }

    // SMS (best-effort — only if WhatsApp fails or as a secondary channel)
    try {
      await sendSmsMessage({
        to: customerPhone,
        message: messageText,
        tenantId: schedule.tenantId,
      });
    } catch (smsErr) {
      console.error('[RecurringJobs] customer SMS notification failed:', smsErr);
    }
  }
}

/**
 * Compute the next sequential visit number for a job (1, 2, 3 ...).
 * Mirrors the logic in `/api/jobs/[id]/visits/route.ts` so manual +
 * generated visits share a single counter.
 */
export async function nextVisitNumber(
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
  jobId: string,
): Promise<number> {
  try {
    const last = await tx.jobVisit.findFirst({
      where: { jobId },
      orderBy: { jobVisitNumber: 'desc' },
      select: { jobVisitNumber: true },
    });
    return (last?.jobVisitNumber ?? 0) + 1;
  } catch {
    return 1;
  }
}

// ─── Convenience: manually trigger a single schedule ─────────────────────────

/**
 * Manually trigger generation of the next job for a schedule NOW.
 *
 * Used by the "Generate Now" button in the UI — creates a job immediately
 * (using `schedule.nextRunAt` as the scheduled date) and advances the
 * schedule to the next occurrence. Useful for testing or "run it today"
 * scenarios.
 *
 * Returns the new job id on success.
 */
export async function generateScheduleNow(
  scheduleId: string,
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  try {
    await processSingleSchedule(scheduleId);
    // Read back the last job id for the response.
    const sched = await db.recurringJobSchedule.findUnique({
      where: { id: scheduleId },
      select: { lastJobId: true },
    });
    return { success: true, jobId: sched?.lastJobId ?? undefined };
  } catch (err) {
    console.error('[RecurringJobs] generateScheduleNow error:', err);
    return { success: false, error: String(err) };
  }
}

// ─── Formatting helpers (used by the UI view too) ────────────────────────────

export function formatFrequencyLabel(schedule: {
  frequency: string;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  weekOfMonth: number | null;
  timeOfDay: string | null;
}): string {
  const freq = schedule.frequency || 'weekly';
  const time = schedule.timeOfDay ? ` @ ${schedule.timeOfDay}` : '';
  const ordinal = (n: number): string => {
    if (n === 1) return '1st';
    if (n === 2) return '2nd';
    if (n === 3) return '3rd';
    return `${n}th`;
  };

  if (freq === 'weekly' || freq === 'biweekly') {
    const day = schedule.dayOfWeek != null ? DAY_NAMES[schedule.dayOfWeek] : '—';
    return `${freq === 'biweekly' ? 'Biweekly' : 'Weekly'} on ${day}${time}`;
  }

  const step = freq === 'quarterly' ? 'Quarterly' : freq === 'annually' ? 'Annually' : 'Monthly';
  if (schedule.weekOfMonth && schedule.dayOfWeek != null) {
    return `${step} — ${ordinal(schedule.weekOfMonth)} ${DAY_NAMES[schedule.dayOfWeek]}${time}`;
  }
  if (schedule.dayOfMonth) {
    return `${step} on day ${schedule.dayOfMonth}${time}`;
  }
  return `${step}${time}`;
}

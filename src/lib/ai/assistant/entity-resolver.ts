import { db } from '@/lib/db';

/**
 * Natural date and time parser for AI Copilot.
 * Parses strings like "20 september 12pm", "tomorrow 2pm", "september 20 at 12:00", "today 4:30 pm".
 */
export function parseNaturalDateTime(dateStr?: string, timeStr?: string): { scheduledAt: Date; scheduledTimeString: string } {
  const now = new Date();
  let targetYear = now.getFullYear();
  let targetMonth = now.getMonth();
  let targetDay = now.getDate();
  let targetHours = 9;
  let targetMinutes = 0;

  const combined = `${dateStr || ''} ${timeStr || ''}`.trim().toLowerCase();

  // 1. Check relative days: today / tomorrow / day after tomorrow
  if (combined.includes('tomorrow')) {
    const tmr = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    targetYear = tmr.getFullYear();
    targetMonth = tmr.getMonth();
    targetDay = tmr.getDate();
  } else if (combined.includes('today')) {
    targetYear = now.getFullYear();
    targetMonth = now.getMonth();
    targetDay = now.getDate();
  } else {
    // 2. Check month names: "20 september", "sept 20", "20th sep"
    const months: Record<string, number> = {
      jan: 0, january: 0,
      feb: 1, february: 1,
      mar: 2, march: 2,
      apr: 3, april: 3,
      may: 4,
      jun: 5, june: 5,
      jul: 6, july: 6,
      aug: 7, august: 7,
      sep: 8, sept: 8, september: 8,
      oct: 9, october: 9,
      nov: 10, november: 10,
      dec: 11, december: 11,
    };

    for (const [mName, mIdx] of Object.entries(months)) {
      if (combined.includes(mName)) {
        targetMonth = mIdx;
        // extract day number near month
        const dayMatch = combined.match(new RegExp(`(\\d{1,2})(?:st|nd|rd|th)?\\s*${mName}|${mName}\\s*(\\d{1,2})(?:st|nd|rd|th)?`));
        if (dayMatch) {
          const d = parseInt(dayMatch[1] || dayMatch[2], 10);
          if (!isNaN(d) && d >= 1 && d <= 31) {
            targetDay = d;
          }
        }
        break;
      }
    }

    // 3. Check ISO date pattern YYYY-MM-DD or MM/DD
    const isoMatch = combined.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      targetYear = parseInt(isoMatch[1], 10);
      targetMonth = parseInt(isoMatch[2], 10) - 1;
      targetDay = parseInt(isoMatch[3], 10);
    }
  }

  // 4. Parse time: check timeStr first, then scan combined string for explicit time expressions
  const rawTime = (timeStr || '').trim().toLowerCase();
  const timeText = rawTime || combined;

  // Match formats: "12:30 pm", "12:00", "12pm", "at 12", "9am", "14:00"
  const explicitTimeMatch = timeText.match(/(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/) ||
                            timeText.match(/(?:at\s+)?(\d{1,2}):(\d{2})\b/) ||
                            (rawTime ? rawTime.match(/^(\d{1,2})\s*(am|pm)?$/) : null);

  if (explicitTimeMatch) {
    let h = parseInt(explicitTimeMatch[1], 10);
    const m = explicitTimeMatch[2] ? parseInt(explicitTimeMatch[2], 10) : 0;
    const meridiem = explicitTimeMatch[3];

    if (meridiem === 'pm' && h < 12) h += 12;
    if (meridiem === 'am' && h === 12) h = 0;
    if (h >= 0 && h <= 23) {
      targetHours = h;
      targetMinutes = m;
    }
  }

  const scheduledAt = new Date(targetYear, targetMonth, targetDay, targetHours, targetMinutes, 0, 0);

  // Format readable time string (e.g. "12:00 PM")
  const displayHours = targetHours % 12 === 0 ? 12 : targetHours % 12;
  const displayMinutes = targetMinutes.toString().padStart(2, '0');
  const displayMeridiem = targetHours >= 12 ? 'PM' : 'AM';
  const scheduledTimeString = `${displayHours}:${displayMinutes} ${displayMeridiem}`;

  return { scheduledAt, scheduledTimeString };
}

/**
 * Fuzzy resolve or create a customer record for the tenant.
 */
export async function resolveOrCreateCustomer(
  tenantId: string,
  customerName: string,
  extra?: { phone?: string; email?: string; address?: string }
): Promise<{ customer: any; isNew: boolean }> {
  const trimmed = customerName.trim();

  // Try matching existing customer by name (case-insensitive substring)
  const existing = await db.customer.findFirst({
    where: {
      tenantId,
      name: { contains: trimmed, mode: 'insensitive' },
    },
  });

  if (existing) {
    return { customer: existing, isNew: false };
  }

  // Auto-create customer if missing
  const newCustomer = await db.customer.create({
    data: {
      tenantId,
      name: trimmed,
      phone: extra?.phone || 'Not provided',
      email: extra?.email || null,
      address: extra?.address || null,
    },
  });

  return { customer: newCustomer, isNew: true };
}

/**
 * Resolve employee by name for the tenant.
 */
export async function resolveEmployee(
  tenantId: string,
  employeeName?: string,
  workspaceId?: string | null
): Promise<any | null> {
  if (!employeeName) return null;
  const trimmed = employeeName.trim();

  // Try finding employee in workspace
  if (workspaceId) {
    const employee = await db.employee.findFirst({
      where: {
        workspaceId,
        name: { contains: trimmed, mode: 'insensitive' },
      },
    }).catch(() => null);

    if (employee) return employee;
  }

  // Fallback: search User table by tenantId
  const user = await db.user.findFirst({
    where: {
      tenantId,
      name: { contains: trimmed, mode: 'insensitive' },
    },
  }).catch(() => null);

  return user || null;
}

/**
 * Check if the assigned employee has any overlapping scheduled jobs within 2 hours of target.
 */
export async function checkEmployeeScheduleConflict(
  workspaceId: string,
  assigneeId?: string,
  scheduledAt?: Date
): Promise<string | null> {
  if (!assigneeId || !scheduledAt) return null;

  const windowStart = new Date(scheduledAt.getTime() - 90 * 60 * 1000); // 1.5 hr prior
  const windowEnd = new Date(scheduledAt.getTime() + 90 * 60 * 1000);   // 1.5 hr post

  const conflictingJob = await db.job.findFirst({
    where: {
      workspaceId,
      assigneeId,
      status: { in: ['scheduled', 'in_progress', 'pending'] },
      scheduledAt: { gte: windowStart, lte: windowEnd },
    },
    select: { id: true, title: true, scheduledTime: true },
  });

  if (conflictingJob) {
    return `⚠️ Notice: Assignee is already scheduled on job "${conflictingJob.title}" at ${conflictingJob.scheduledTime || 'this time'}.`;
  }

  return null;
}

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';

/**
 * Timesheet Settings — tenant-scoped configuration for the timesheet
 * experience: duration format, payroll period start day, and the list
 * of timer categories (Break / Driving / Office / Supplies + up to 6
 * custom). Mirrors the Jobber "Timesheet Settings" page.
 *
 * Storage: lives under the `timesheetSettings` key inside
 * `Tenant.settingsJson`. No new Prisma models are introduced — see
 * `prisma/schema.prisma` → `Tenant.settingsJson` (String @default("{}")).
 *
 * Supabase-safe: uses `tenant.findUnique` (by id) and `tenant.update`
 * (by id) — no compound-unique upsert, no SQLite-only functions, no
 * raw SQL.
 */

export interface TimerCategory {
  /** Stable slug like 'break', 'driving', 'office', 'supplies', or 'custom_1'. */
  id: string;
  /** Display label (user-editable — renaming applies to new entries only). */
  label: string;
  /** false for 'break' (unpaid), true for everything else. */
  isPaid: boolean;
  /** true for the 4 built-ins — cannot be deleted, only renamed. */
  isSystem: boolean;
}

export interface TimesheetSettings {
  /** '8h 15m' vs '8.25 hrs' — applies to TOTALS only. */
  durationFormat: 'hours_minutes' | 'decimal';
  /** 0=Sunday, 1=Monday, ..., 6=Saturday. */
  payrollPeriodStartDay: number;
  /** The 4 built-ins + up to 6 custom (max 10 total). */
  timerCategories: TimerCategory[];
}

export const DEFAULT_TIMESHEET_SETTINGS: TimesheetSettings = {
  durationFormat: 'hours_minutes',
  payrollPeriodStartDay: 0, // Sunday
  timerCategories: [
    { id: 'break', label: 'Break', isPaid: false, isSystem: true },
    { id: 'driving', label: 'Driving', isPaid: true, isSystem: true },
    { id: 'office', label: 'Office', isPaid: true, isSystem: true },
    { id: 'supplies', label: 'Supplies', isPaid: true, isSystem: true },
  ],
};

/** Allowed values for the duration format dropdown. */
const DURATION_FORMATS = ['hours_minutes', 'decimal'] as const;

/** Max total categories (4 system + up to 6 custom). */
const MAX_CATEGORIES = 10;

/** Stable ids of the 4 built-in system categories — preserved on every save. */
const SYSTEM_CATEGORY_IDS = new Set(
  DEFAULT_TIMESHEET_SETTINGS.timerCategories.map((c) => c.id),
);

function safeParse(str: string | null | undefined, fallback: unknown = {}): unknown {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

/**
 * Coerce + validate an incoming `timerCategories` array:
 * - Keeps the 4 system built-ins (re-adds them from defaults if missing
 *   so clients can never delete built-ins).
 * - Preserves `id` / `isSystem` for the 4 built-ins (clients can only
 *   rename them).
 * - Validates custom categories: non-empty label, ids `custom_1`..`custom_6`.
 * - Caps the total at MAX_CATEGORIES (10).
 */
function normalizeTimerCategories(input: unknown): TimerCategory[] {
  const arr = Array.isArray(input) ? input : [];
  const seenCustomIds = new Set<string>();
  const customs: TimerCategory[] = [];

  // Step 1: pull the system categories from the incoming payload so we
  // honor client-side renames, but fall back to defaults if the client
  // stripped them out or sent a bad shape.
  const systemCats: TimerCategory[] = DEFAULT_TIMESHEET_SETTINGS.timerCategories.map(
    (def) => {
      const incoming = arr.find(
        (c): c is Record<string, unknown> =>
          !!c &&
          typeof c === 'object' &&
          (c as Record<string, unknown>).id === def.id,
      );
      const label =
        incoming &&
        typeof incoming.label === 'string' &&
        incoming.label.trim().length > 0
          ? incoming.label.trim()
          : def.label;
      // `break` is always unpaid (Jobber spec: "Time for unpaid breaks.
      // These will not count towards regular hours."). Hard-enforce so
      // clients can't break it. Other system cats keep their `isPaid`
      // toggle.
      const isPaid =
        def.id === 'break'
          ? false
          : incoming
            ? Boolean(incoming.isPaid)
            : def.isPaid;
      return { id: def.id, label, isPaid, isSystem: true };
    },
  );

  // Step 2: collect customs (preserve order, dedupe by id).
  let customCounter = 0;
  for (const raw of arr) {
    if (!raw || typeof raw !== 'object') continue;
    const c = raw as Record<string, unknown>;
    if (typeof c.id === 'string' && SYSTEM_CATEGORY_IDS.has(c.id)) continue; // skip system
    const label = typeof c.label === 'string' ? c.label.trim() : '';
    if (label.length === 0) continue;
    customCounter += 1;
    if (customCounter > 6) break; // max 6 customs
    // Normalize the id: stable `custom_N` slug based on order.
    const id = `custom_${customCounter}`;
    if (seenCustomIds.has(id)) continue;
    seenCustomIds.add(id);
    customs.push({ id, label, isPaid: Boolean(c.isPaid), isSystem: false });
  }

  // Step 3: combine + cap.
  const combined = [...systemCats, ...customs];
  return combined.slice(0, MAX_CATEGORIES);
}

/** Coerce + validate an incoming body into a fully-formed TimesheetSettings. */
function normalizeTimesheetSettings(input: unknown): TimesheetSettings {
  const src = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;

  const durationFormat =
    typeof src.durationFormat === 'string' &&
    (DURATION_FORMATS as readonly string[]).includes(src.durationFormat)
      ? (src.durationFormat as 'hours_minutes' | 'decimal')
      : DEFAULT_TIMESHEET_SETTINGS.durationFormat;

  const dayRaw = Number(src.payrollPeriodStartDay);
  const payrollPeriodStartDay =
    Number.isInteger(dayRaw) && dayRaw >= 0 && dayRaw <= 6
      ? dayRaw
      : DEFAULT_TIMESHEET_SETTINGS.payrollPeriodStartDay;

  const timerCategories = normalizeTimerCategories(src.timerCategories);

  return { durationFormat, payrollPeriodStartDay, timerCategories };
}

// GET /api/settings/timesheet — read timesheet settings for the current tenant.
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { settingsJson: true },
    });
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }
    const parsed = safeParse(tenant.settingsJson, {}) as Record<string, unknown>;
    const stored = (parsed.timesheetSettings as Record<string, unknown> | undefined) || {};

    // Deep-merge defaults so any missing sub-keys are filled in.
    const dayRaw = Number(stored.payrollPeriodStartDay);
    const settings: TimesheetSettings = {
      durationFormat:
        stored.durationFormat === 'hours_minutes' || stored.durationFormat === 'decimal'
          ? stored.durationFormat
          : DEFAULT_TIMESHEET_SETTINGS.durationFormat,
      payrollPeriodStartDay:
        Number.isInteger(dayRaw) && dayRaw >= 0 && dayRaw <= 6
          ? dayRaw
          : DEFAULT_TIMESHEET_SETTINGS.payrollPeriodStartDay,
      timerCategories: normalizeTimerCategories(stored.timerCategories),
    };

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Timesheet settings GET error:', error);
    return NextResponse.json({ error: 'Failed to load timesheet settings' }, { status: 500 });
  }
}

// PUT /api/settings/timesheet — update timesheet settings for the current tenant.
// Body: the full TimesheetSettings object (partial updates are tolerated via
// deep-merge with stored values).
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    // Only tenant owner / admin / manager can edit timesheet settings.
    if (user.role !== 'owner' && user.role !== 'admin' && user.role !== 'manager') {
      return NextResponse.json(
        { error: 'Only owners, admins, and managers can update timesheet settings' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const incoming = normalizeTimesheetSettings(body);

    // Merge into the existing settingsJson so we don't clobber unrelated
    // keys (e.g. `workSettings`, `invoiceAutomation`, `emailNotifications`).
    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { settingsJson: true },
    });
    const current = safeParse(tenant?.settingsJson, {}) as Record<string, unknown>;
    const storedTimesheet =
      (current.timesheetSettings as Record<string, unknown> | undefined) || {};

    const storedDayRaw = Number(storedTimesheet.payrollPeriodStartDay);
    const merged: TimesheetSettings = {
      durationFormat: incoming.durationFormat,
      payrollPeriodStartDay:
        Number.isInteger(incoming.payrollPeriodStartDay) &&
        incoming.payrollPeriodStartDay >= 0 &&
        incoming.payrollPeriodStartDay <= 6
          ? incoming.payrollPeriodStartDay
          : Number.isInteger(storedDayRaw) && storedDayRaw >= 0 && storedDayRaw <= 6
            ? storedDayRaw
            : DEFAULT_TIMESHEET_SETTINGS.payrollPeriodStartDay,
      // Always re-normalize the merged category list so system cats are
      // preserved even on partial inputs.
      timerCategories: normalizeTimerCategories(incoming.timerCategories),
    };

    const nextSettings = { ...current, timesheetSettings: merged };
    await db.tenant.update({
      where: { id: user.tenantId },
      data: { settingsJson: JSON.stringify(nextSettings) },
    });
    return NextResponse.json({ settings: merged });
  } catch (error) {
    console.error('Timesheet settings PUT error:', error);
    return NextResponse.json({ error: 'Failed to save timesheet settings' }, { status: 500 });
  }
}

/**
 * use-shift — TanStack Query hooks for employee time tracking.
 *
 * Endpoints (all relative to API_BASE_URL):
 *   GET  /api/employee/shift/today  → { shift: Shift | null } | Shift | null
 *   GET  /api/employee/shift/week   → { shifts, totalHours, totalShifts } | Shift[]
 *   POST /api/employee/shift        → { action: 'clock_in'|'clock_out'|'break_start'|'break_end', latitude?, longitude? }
 *   PATCH /api/employee/shift       → { action: 'break_start'|'break_end' }
 *
 * Mutations invalidate both `['shift','today']` and `['shift','week']` so any
 * screen observing shift state re-fetches immediately after an action.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Shift, ShiftWeek } from '@/types';

/**
 * Parse a `breaksJson` string (stored on EmployeeShift) and return the total
 * break minutes. For an open break, counts up to "now" so the live UI is
 * accurate. Matches the PWA's live-break calculation.
 */
function computeBreakMinutes(breaksJson: string | null | undefined): number {
  if (!breaksJson) return 0;
  try {
    const parsed = JSON.parse(breaksJson) as Array<{
      start: string;
      end: string | null;
      durationMinutes?: number;
    }>;
    if (!Array.isArray(parsed)) return 0;
    let total = 0;
    const now = Date.now();
    for (const b of parsed) {
      if (b.end) {
        total += b.durationMinutes || 0;
      } else if (b.start) {
        total += Math.max(
          1,
          Math.round((now - new Date(b.start).getTime()) / 60000)
        );
      }
    }
    return total;
  } catch {
    return 0;
  }
}

/**
 * Map a raw EmployeeShift row (from the backend) into the mobile app's `Shift`
 * shape. The backend returns Prisma fields:
 *   { id, clockIn, clockOut, status, breaksJson, workingMinutes, breakMinutes, totalMinutes, ... }
 * The mobile app expects:
 *   { id, startTime, endTime, status, totalHours, breakMinutes, location? }
 *
 * Both the `today` and `week` endpoints return rows in the Prisma shape, so
 * this mapping is shared. Without it, the mobile app reads `shift.startTime`
 * and `shift.endTime` which are `undefined` → the UI thinks the user is "off
 * duty" even when there's an active shift in the DB → clock-in returns 409.
 */
function mapShiftRow(row: Record<string, unknown>): Shift {
  const clockIn = row.clockIn as string | undefined;
  const clockOut = row.clockOut as string | null | undefined;
  const status = (row.status as string) || 'active';

  // totalHours: prefer the backend-computed totalMinutes (1 dp), otherwise
  // compute live from clockIn → now (for an active shift) or clockIn → clockOut.
  let totalHours: number | null = null;
  if (typeof row.totalMinutes === 'number' && row.totalMinutes > 0) {
    totalHours = Math.round((row.totalMinutes / 60) * 10) / 10;
  } else if (typeof row.workingMinutes === 'number' && row.workingMinutes > 0) {
    totalHours = Math.round((row.workingMinutes / 60) * 10) / 10;
  } else if (clockIn) {
    const endMs = clockOut ? new Date(clockOut).getTime() : Date.now();
    const startMs = new Date(clockIn).getTime();
    totalHours = Math.round(((endMs - startMs) / 3600000) * 10) / 10;
  }

  // breakMinutes: prefer the explicit field, otherwise compute from breaksJson.
  const breakMinutes =
    typeof row.breakMinutes === 'number'
      ? row.breakMinutes
      : computeBreakMinutes(row.breaksJson as string | null | undefined);

  return {
    id: row.id as string,
    startTime: clockIn as string,
    endTime: (clockOut as string | null) ?? null,
    status,
    totalHours,
    breakMinutes,
    location: (row.location as string | null | undefined) ?? null,
  };
}

/**
 * Normalise the various shapes the API may return for the "today" endpoint.
 *
 * The backend (`/api/employee/shift/today`) returns:
 *   { activeShift: { id, clockIn, clockOut, status, breaksJson } | null, ...totals }
 *
 * The mobile app previously looked for `obj.shift` (not `obj.activeShift`) and
 * expected the row to already have `startTime`/`endTime` fields, so it always
 * returned null — causing the UI to show "off duty" while a shift was active.
 *
 * This normaliser handles:
 *   1. `{ activeShift: <EmployeeShift row | null>, ... }` — the canonical shape
 *   2. `{ shift: <EmployeeShift row | null> }` — alternate key (some legacy endpoints)
 *   3. Bare EmployeeShift row (`{ id, clockIn, ... }`) — direct passthrough
 *   4. Bare mobile `Shift` (`{ id, startTime, ... }`) — already-normalised cache hits
 */
function normaliseToday(res: unknown): Shift | null {
  if (!res) return null;
  if (Array.isArray(res)) return null;
  if (typeof res !== 'object') return null;
  const obj = res as Record<string, unknown>;

  // 1. Canonical: { activeShift: <row | null> }
  if ('activeShift' in obj) {
    const active = obj.activeShift;
    if (!active || typeof active !== 'object') return null;
    return mapShiftRow(active as Record<string, unknown>);
  }

  // 2. Alternate key: { shift: <row | null> }
  if ('shift' in obj) {
    const shift = obj.shift;
    if (!shift || typeof shift !== 'object') return null;
    const row = shift as Record<string, unknown>;
    // Already-normalised mobile shape (cache hit / mutation response).
    if (row.startTime && !row.clockIn) return row as unknown as Shift;
    return mapShiftRow(row);
  }

  // 3. Bare EmployeeShift row (clockIn present, startTime absent).
  if (obj.clockIn && typeof obj.clockIn === 'string') {
    return mapShiftRow(obj);
  }

  // 4. Bare mobile Shift (startTime present).
  if (obj.id && obj.startTime) return obj as unknown as Shift;

  return null;
}

/**
 * Normalise the various shapes the API may return for the "week" endpoint.
 *
 * The backend (`/api/employee/shift/week`) returns:
 *   {
 *     days: [{ date, weekday, isToday, shifts: [<EmployeeShift row>, ...], totalMinutes, ... }, ...],
 *     weekTotalWorkingMinutes, weekTotalBreakMinutes, weekTotalMinutes
 *   }
 *
 * The mobile app expects `{ shifts: Shift[], totalHours, totalShifts }`. We
 * flatten `days[].shifts` into a single list and sum the totals.
 *
 * Fallbacks handle:
 *   - Bare array of Shift rows (legacy)
 *   - `{ shifts: [...] }` (already-correct)
 *   - `{ data: [...] }` (alternate wrapper)
 */
function normaliseWeek(res: unknown): ShiftWeek {
  const empty: ShiftWeek = { shifts: [], totalHours: 0, totalShifts: 0 };
  if (!res) return empty;
  if (Array.isArray(res)) {
    const shifts = (res as Array<Record<string, unknown>>).map(mapShiftRow);
    return {
      shifts,
      totalShifts: shifts.length,
      totalHours: shifts.reduce((sum, s) => sum + (s.totalHours ?? 0), 0),
    };
  }
  if (typeof res !== 'object') return empty;
  const obj = res as Record<string, unknown>;

  // Canonical: { days: [{ shifts: [...] }, ...], weekTotalMinutes }
  if (Array.isArray(obj.days)) {
    const allShifts: Shift[] = [];
    for (const day of obj.days as Array<Record<string, unknown>>) {
      const dayShifts = day.shifts;
      if (Array.isArray(dayShifts)) {
        for (const s of dayShifts as Array<Record<string, unknown>>) {
          allShifts.push(mapShiftRow(s));
        }
      }
    }
    const totalMinutes =
      (typeof obj.weekTotalMinutes === 'number' && obj.weekTotalMinutes) ||
      (typeof obj.weekTotalWorkingMinutes === 'number' &&
        obj.weekTotalWorkingMinutes) ||
      0;
    return {
      shifts: allShifts,
      totalShifts: allShifts.length,
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
    };
  }

  // Already-correct: { shifts: [...], totalHours, totalShifts }
  if (Array.isArray(obj.shifts)) {
    const shifts = (obj.shifts as Array<Record<string, unknown>>).map((s) => {
      // Tolerate already-normalised mobile Shift rows (no clockIn).
      if (s.startTime && !s.clockIn) return s as unknown as Shift;
      return mapShiftRow(s);
    });
    return {
      shifts,
      totalHours:
        (typeof obj.totalHours === 'number' && obj.totalHours) ||
        shifts.reduce((sum, s) => sum + (s.totalHours ?? 0), 0),
      totalShifts:
        (typeof obj.totalShifts === 'number' && obj.totalShifts) ||
        shifts.length,
    };
  }

  // Alternate wrapper: { data: [...] }
  if (Array.isArray(obj.data)) {
    const shifts = (obj.data as Array<Record<string, unknown>>).map(mapShiftRow);
    return {
      shifts,
      totalHours: shifts.reduce((sum, s) => sum + (s.totalHours ?? 0), 0),
      totalShifts: shifts.length,
    };
  }

  return empty;
}

export function useShiftToday() {
  return useQuery({
    queryKey: ['shift', 'today'],
    queryFn: async () => {
      const res = await api.get<unknown>('/api/employee/shift/today');
      return normaliseToday(res);
    },
  });
}

export function useShiftWeek() {
  return useQuery({
    queryKey: ['shift', 'week'],
    queryFn: async () => {
      const res = await api.get<unknown>('/api/employee/shift/week');
      return normaliseWeek(res);
    },
  });
}

// Backward-compatible alias — same shape as {@link useShiftWeek}.
export const useWeekShifts = useShiftWeek;

export interface ShiftActionVars {
  latitude?: number;
  longitude?: number;
}

export function useClockIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: ShiftActionVars = {}) =>
      api.post<{ shift?: Shift } | Shift>(
        '/api/employee/shift',
        {
          action: 'clock_in',
          latitude: vars.latitude,
          longitude: vars.longitude,
        },
        { skipAuth: false }
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shift', 'today'] });
      qc.invalidateQueries({ queryKey: ['shift', 'week'] });
    },
  });
}

export function useClockOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<{ shift?: Shift } | Shift>('/api/employee/shift', { action: 'clock_out' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shift', 'today'] });
      qc.invalidateQueries({ queryKey: ['shift', 'week'] });
    },
  });
}

export function useBreakStart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api
        .post<{ shift?: Shift } | Shift>('/api/employee/shift', { action: 'break_start' })
        .catch(async (err) => {
          // Some backends only accept PATCH for breaks — try PATCH as a fallback.
          if (err?.statusCode === 400 || err?.statusCode === 404 || err?.statusCode === 405) {
            return api.patch<{ shift?: Shift } | Shift>('/api/employee/shift', {
              action: 'break_start',
            });
          }
          throw err;
        }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shift', 'today'] });
      qc.invalidateQueries({ queryKey: ['shift', 'week'] });
    },
  });
}

export function useBreakEnd() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api
        .post<{ shift?: Shift } | Shift>('/api/employee/shift', { action: 'break_end' })
        .catch(async (err) => {
          if (err?.statusCode === 400 || err?.statusCode === 404 || err?.statusCode === 405) {
            return api.patch<{ shift?: Shift } | Shift>('/api/employee/shift', {
              action: 'break_end',
            });
          }
          throw err;
        }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shift', 'today'] });
      qc.invalidateQueries({ queryKey: ['shift', 'week'] });
    },
  });
}

// ── Backward-compat alias for the "today" endpoint ──
export const useTodayShift = useShiftToday;

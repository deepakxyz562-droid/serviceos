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

/** Normalise the various shapes the API may return for the "today" endpoint. */
function normaliseToday(res: unknown): Shift | null {
  if (!res) return null;
  if (Array.isArray(res)) return null;
  if (typeof res !== 'object') return null;
  const obj = res as { shift?: Shift | null } & Partial<Shift>;
  if (obj.shift !== undefined) return obj.shift;
  // Bare shift object fallback
  if ((obj as Shift).id && (obj as Shift).startTime) return obj as Shift;
  return null;
}

/** Normalise the various shapes the API may return for the "week" endpoint. */
function normaliseWeek(res: unknown): ShiftWeek {
  const empty: ShiftWeek = { shifts: [], totalHours: 0, totalShifts: 0 };
  if (!res) return empty;
  if (Array.isArray(res)) {
    const shifts = res as Shift[];
    return {
      shifts,
      totalShifts: shifts.length,
      totalHours: shifts.reduce((sum, s) => sum + (s.totalHours ?? 0), 0),
    };
  }
  if (typeof res !== 'object') return empty;
  const obj = res as Partial<ShiftWeek> & { data?: Shift[] };
  if (Array.isArray(obj.shifts)) {
    return {
      shifts: obj.shifts,
      totalHours: obj.totalHours ?? 0,
      totalShifts: obj.totalShifts ?? obj.shifts.length,
    };
  }
  if (Array.isArray(obj.data)) {
    const shifts = obj.data;
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

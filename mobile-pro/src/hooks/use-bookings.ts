/**
 * use-bookings — TanStack Query hooks for customer bookings.
 *
 * Mirrors the PWA customer portal's bookings data layer:
 *   - useBookings(status?)    → useQuery     (GET /api/bookings?status=)
 *   - useBooking(id)          → useQuery     (GET /api/bookings/[id])
 *   - useCancelBooking()      → useMutation  (PATCH /api/bookings/[id] { status: 'cancelled' })
 *   - useCreateBooking()      → useMutation  (POST /api/bookings)
 *   - useRescheduleBooking()  → useMutation  (PATCH /api/bookings/[id] { scheduledAt })
 *
 * Aliases `useMyBookings` / `useBookingDetail` are kept for backward compat
 * with existing call sites (marketplace book flow, etc.).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Booking } from '@/types';

// ── Helpers ──────────────────────────────────────────────────────────

/** Normalize the various list shapes returned by the backend into a flat array. */
function normalizeBookings(
  r: Booking[] | { data: Booking[] } | { bookings: Booking[] } | undefined
): Booking[] {
  if (!r) return [];
  if (Array.isArray(r)) return r;
  if (Array.isArray((r as { data?: Booking[] }).data)) return (r as { data: Booking[] }).data;
  if (Array.isArray((r as { bookings?: Booking[] }).bookings))
    return (r as { bookings: Booking[] }).bookings;
  return [];
}

export interface CreateBookingParams {
  providerId?: string;
  serviceId?: string;
  scheduledAt: string;
  address?: string;
  notes?: string;
  title?: string;
  duration?: number;
  source?: string;
}

export interface RescheduleBookingParams {
  id: string;
  scheduledAt: string;
}

// ── Queries ──────────────────────────────────────────────────────────

export function useBookings(status?: string) {
  return useQuery({
    queryKey: ['bookings', 'list', status ?? 'all'],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (status) params.status = status;
      const r = await api.get<Booking[] | { data: Booking[] }>('/api/bookings', params);
      return normalizeBookings(r);
    },
  });
}

/** Alias for backward compatibility. */
export const useMyBookings = useBookings;

export function useBooking(id: string | undefined) {
  return useQuery({
    queryKey: ['bookings', id],
    queryFn: () => api.get<Booking>(`/api/bookings/${id}`),
    enabled: !!id,
  });
}

/** Alias for backward compatibility. */
export const useBookingDetail = useBooking;

// ── Mutations ────────────────────────────────────────────────────────

export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.patch<Booking>(`/api/bookings/${id}`, { status: 'cancelled' }),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['bookings', id] });
    },
  });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: CreateBookingParams) =>
      api.post<Booking>('/api/bookings', params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}

export function useRescheduleBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, scheduledAt }: RescheduleBookingParams) =>
      api.patch<Booking>(`/api/bookings/${id}`, { scheduledAt }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['bookings'] });
      qc.invalidateQueries({ queryKey: ['bookings', id] });
    },
  });
}

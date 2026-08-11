/**
 * use-reviews — TanStack Query hooks for customer reviews.
 *
 * Mirrors the PWA customer portal's reviews data layer:
 *   - useReviews(providerId?) → useQuery     (GET /api/reviews?providerId=)
 *   - useMyReviews()          → useQuery     (GET /api/reviews — server scopes by customer)
 *   - useCreateReview()       → useMutation  (POST /api/reviews)
 *
 * On the customer portal, the backend scopes `GET /api/reviews` to the
 * authenticated customer, so `useMyReviews()` simply hits that endpoint.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Review } from '@/types';

// ── Helpers ──────────────────────────────────────────────────────────

function normalizeReviews(
  r: Review[] | { data: Review[] } | { reviews: Review[] } | undefined
): Review[] {
  if (!r) return [];
  if (Array.isArray(r)) return r;
  if (Array.isArray((r as { data?: Review[] }).data)) return (r as { data: Review[] }).data;
  if (Array.isArray((r as { reviews?: Review[] }).reviews))
    return (r as { reviews: Review[] }).reviews;
  return [];
}

export interface CreateReviewParams {
  providerId: string;
  bookingId?: string;
  rating: number;
  comment?: string;
}

// ── Queries ──────────────────────────────────────────────────────────

/**
 * Fetch reviews for a single provider (used by provider profile screens).
 * When `providerId` is omitted, returns ALL reviews — the server still
 * scopes them to the current customer for customer-role tokens.
 */
export function useReviews(providerId?: string) {
  return useQuery({
    queryKey: ['reviews', 'provider', providerId ?? 'all'],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (providerId) params.providerId = providerId;
      const r = await api.get<Review[] | { data: Review[] }>('/api/reviews', params);
      return normalizeReviews(r);
    },
  });
}

/** Customer's own submitted reviews (server scopes by `customerId`). */
export function useMyReviews() {
  return useQuery({
    queryKey: ['reviews', 'mine'],
    queryFn: async () => {
      const r = await api.get<Review[] | { data: Review[] }>('/api/reviews');
      return normalizeReviews(r);
    },
  });
}

// ── Mutations ────────────────────────────────────────────────────────

export function useCreateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: CreateReviewParams) =>
      api.post<Review>('/api/reviews', {
        ...params,
        source: 'portal',
        status: 'published',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews'] });
      qc.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}

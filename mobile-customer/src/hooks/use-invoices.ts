/**
 * use-invoices — TanStack Query hooks for customer invoices.
 *
 * Mirrors the PWA customer portal's invoices data layer:
 *   - useInvoices(status?)     → useQuery     (GET /api/invoices?status=)
 *   - useInvoice(id)           → useQuery     (GET /api/invoices/[id])
 *   - usePayInvoice()          → useMutation  (creates a PayPal order; opens approval URL)
 *   - useCaptureOrder()        → useMutation  (captures a PayPal order after approval)
 *   - useDownloadReceipt()     → useMutation  (returns a printable receipt URL)
 *
 * The PayPal flow:
 *   1. Pay button calls `usePayInvoice().mutateAsync(invoice)` → returns { approvalUrl, orderId }
 *   2. Caller opens `approvalUrl` via `Linking.openURL()`
 *   3. After the user returns, caller calls `useCaptureOrder().mutateAsync({ orderId, invoiceId })`
 *
 * Aliases `useMyInvoices` / `useInvoiceDetail` are kept for backward compat.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Invoice } from '@/types';

// ── Helpers ──────────────────────────────────────────────────────────

function normalizeInvoices(
  r: Invoice[] | { data: Invoice[] } | { invoices: Invoice[] } | undefined
): Invoice[] {
  if (!r) return [];
  if (Array.isArray(r)) return r;
  if (Array.isArray((r as { data?: Invoice[] }).data)) return (r as { data: Invoice[] }).data;
  if (Array.isArray((r as { invoices?: Invoice[] }).invoices))
    return (r as { invoices: Invoice[] }).invoices;
  return [];
}

// ── PayPal API types ─────────────────────────────────────────────────

export interface CreateOrderResponse {
  orderId: string;
  approvalUrl: string;
}

export interface CaptureOrderResponse {
  status: string;
  message?: string;
}

export interface PayInvoiceResult {
  approvalUrl: string;
  orderId: string | null;
  invoiceId: string;
  /** True when the invoice already had a paymentUrl — no capture step needed. */
  direct: boolean;
}

// ── Queries ──────────────────────────────────────────────────────────

export function useInvoices(status?: string) {
  return useQuery({
    queryKey: ['invoices', 'list', status ?? 'all'],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (status) params.status = status;
      const r = await api.get<Invoice[] | { data: Invoice[] }>('/api/invoices', params);
      return normalizeInvoices(r);
    },
  });
}

/** Alias for backward compatibility. */
export const useMyInvoices = useInvoices;

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: ['invoices', id],
    queryFn: () => api.get<Invoice>(`/api/invoices/${id}`),
    enabled: !!id,
  });
}

/** Alias for backward compatibility. */
export const useInvoiceDetail = useInvoice;

// ── Mutations ────────────────────────────────────────────────────────

/**
 * Creates a PayPal order for an invoice. Returns the approval URL to open
 * in a browser. If the invoice already has a `paymentUrl`, returns it
 * directly (no PayPal round-trip needed).
 */
export function usePayInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (invoice: {
      id: string;
      paymentUrl?: string | null;
    }): Promise<PayInvoiceResult> => {
      // Direct payment URL on the invoice — open it as-is.
      if (invoice.paymentUrl) {
        return {
          approvalUrl: invoice.paymentUrl,
          orderId: null,
          invoiceId: invoice.id,
          direct: true,
        };
      }
      // Otherwise create a PayPal order.
      const r = await api.get<CreateOrderResponse>('/api/paypal/create-order', {
        invoiceId: invoice.id,
      });
      return {
        approvalUrl: r.approvalUrl,
        orderId: r.orderId,
        invoiceId: invoice.id,
        direct: false,
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

/**
 * Captures a PayPal order after the user has approved it in the browser.
 * Only needed when `usePayInvoice` returned `direct: false`.
 */
export function useCaptureOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, invoiceId }: { orderId: string; invoiceId: string }) =>
      api.post<CaptureOrderResponse>('/api/paypal/capture-order', {
        orderId,
        invoiceId,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

/**
 * Returns a receipt URL for an invoice. Falls back to the printable HTML
 * endpoint when no `receiptUrl` is present.
 */
export function useDownloadReceipt() {
  return useMutation({
    mutationFn: async (invoice: { id: string; receiptUrl?: string | null }): Promise<string> => {
      if (invoice.receiptUrl) return invoice.receiptUrl;
      return `/api/invoices/${invoice.id}/print`;
    },
  });
}

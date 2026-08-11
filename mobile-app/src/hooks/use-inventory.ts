/**
 * use-inventory — TanStack Query hooks for inventory management.
 *
 * Endpoints (all relative to API_BASE_URL):
 *   GET   /api/inventory/items?search=&status=        → InventoryItem[]
 *   GET   /api/inventory/items/[id]                   → InventoryItem (+ transactions)
 *   PATCH /api/inventory/items/[id]/adjust            → { quantity, reason, type: 'in'|'out' }
 *   GET   /api/inventory/transactions?itemId=         → InventoryTransaction[]
 *
 * Adjust mutations invalidate the list, the item detail, and its transactions
 * so any screen observing inventory state re-fetches immediately.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { InventoryItem, InventoryTransaction } from '@/types';

export interface InventoryListParams {
  search?: string;
  status?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock' | string;
}

function pickList<T>(res: T[] | { data: T[] } | { items: T[] }): T[] {
  if (Array.isArray(res)) return res;
  if (res && typeof res === 'object') {
    if (Array.isArray((res as { data?: T[] }).data)) return (res as { data: T[] }).data;
    if (Array.isArray((res as { items?: T[] }).items)) return (res as { items: T[] }).items;
  }
  return [];
}

export function useInventoryItems(params: InventoryListParams = {}) {
  const { search, status } = params;
  return useQuery({
    queryKey: ['inventory', 'items', { search: search ?? '', status: status ?? 'all' }],
    queryFn: async () => {
      const query: Record<string, string> = {};
      if (search && search.trim()) query.search = search.trim();
      if (status && status !== 'all') query.status = status;
      const res = await api.get<InventoryItem[] | { data: InventoryItem[] } | { items: InventoryItem[] }>(
        '/api/inventory/items',
        query
      );
      return pickList(res);
    },
  });
}

export function useInventoryItemDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['inventory', 'items', id],
    queryFn: () => api.get<InventoryItem>(`/api/inventory/items/${id}`),
    enabled: !!id,
  });
}

export interface AdjustStockVars {
  id: string;
  /** Positive integer quantity to adjust by. */
  quantity: number;
  /** Type of adjustment — sent as `type` field per API contract. */
  type: 'in' | 'out';
  reason?: string;
}

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, quantity, type, reason }: AdjustStockVars) =>
      api.patch<InventoryItem>(`/api/inventory/items/${id}/adjust`, {
        quantity: Math.abs(quantity),
        type,
        reason: reason?.trim() || undefined,
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['inventory', 'items'] });
      qc.invalidateQueries({ queryKey: ['inventory', 'items', vars.id] });
      qc.invalidateQueries({ queryKey: ['inventory', 'transactions', vars.id] });
      qc.invalidateQueries({ queryKey: ['inventory', 'alerts'] });
    },
  });
}

export function useInventoryTransactions(itemId?: string) {
  return useQuery({
    queryKey: ['inventory', 'transactions', itemId],
    queryFn: async () => {
      if (!itemId) return [] as InventoryTransaction[];
      const res = await api.get<
        InventoryTransaction[] | { data: InventoryTransaction[] } | { items: InventoryTransaction[] }
      >('/api/inventory/transactions', { itemId });
      return pickList(res);
    },
    enabled: !!itemId,
  });
}

export function useLowStockAlerts() {
  return useQuery({
    queryKey: ['inventory', 'alerts'],
    queryFn: async () => {
      // Reuse the items list filtered client-side for low/out of stock items.
      const res = await api.get<
        InventoryItem[] | { data: InventoryItem[] } | { items: InventoryItem[] }
      >('/api/inventory/items', { status: 'low_stock' });
      const list = pickList(res);
      if (list.length > 0) return list;
      // Fallback to fetching all and filtering client-side if the API does not
      // honour the status param.
      const allRes = await api.get<
        InventoryItem[] | { data: InventoryItem[] } | { items: InventoryItem[] }
      >('/api/inventory/items');
      return pickList(allRes).filter(
        (item) => item.quantity <= item.reorderLevel
      );
    },
  });
}

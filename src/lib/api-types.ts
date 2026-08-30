/**
 * api-types.ts
 * ============
 * Shared API response types — the single source of truth for the
 * pagination contract across every CRM endpoint.
 *
 * WHY THIS EXISTS:
 *   The Wave 0 audit found 8+ different pagination response shapes across
 *   the API (jobs/customers used {page,pageSize,total,totalPages,hasNextPage},
 *   invoices/leads used {page,limit,total,totalPages}, employees returned a
 *   flat array, expenses returned {expenses,pagination:{total}}...).
 *
 *   This file defines ONE contract. New endpoints should use it. Existing
 *   endpoints can be migrated incrementally — the type is structurally
 *   compatible with the most common existing shape.
 *
 * USAGE (server-side):
 *   import { ok, type PaginatedResponse } from '@/lib/api-types';
 *
 *   export async function GET() {
 *     const data = await db.job.findMany({ ... });
 *     const total = await db.job.count({ ... });
 *     const res: PaginatedResponse<Job> = {
 *       data,
 *       pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
 *     };
 *     return NextResponse.json(res);
 *   }
 *
 * USAGE (client-side):
 *   import { type PaginatedResponse } from '@/lib/api-types';
 *   const res = await apiFetch<PaginatedResponse<Job>>('/api/jobs?page=1&pageSize=50');
 *   // res.data, res.pagination.total, etc.
 */

// ── Pagination request params ───────────────────────────────────────────────

export interface PaginationParams {
  page: number
  pageSize: number
}

// ── Pagination response metadata ────────────────────────────────────────────

export interface PaginationMeta {
  /** 1-indexed page number */
  page: number
  /** Items per page */
  pageSize: number
  /** Total items across all pages */
  total: number
  /** Total number of pages */
  totalPages: number
  /** True if there's a next page (convenience for "Load more" UIs) */
  hasNextPage: boolean
}

// ── Standard paginated response envelope ────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[]
  pagination: PaginationMeta
}

// ── Helper: build a PaginationMeta from raw counts ──────────────────────────

export function buildPaginationMeta(
  page: number,
  pageSize: number,
  total: number
): PaginationMeta {
  return {
    page,
    pageSize,
    total,
    totalPages: pageSize > 0 ? Math.ceil(total / pageSize) : 0,
    hasNextPage: page * pageSize < total,
  }
}

// ── Helper: parse pagination params from a URLSearchParams ──────────────────

export function parsePaginationParams(
  searchParams: URLSearchParams,
  defaults: { page?: number; pageSize?: number; maxPageSize?: number } = {}
): PaginationParams {
  const rawPage = parseInt(searchParams.get('page') || '')
  const page = Number.isNaN(rawPage)
    ? (defaults.page ?? 1)
    : Math.max(1, rawPage)

  const maxPageSize = defaults.maxPageSize ?? 200
  const rawPageSize = parseInt(
    searchParams.get('pageSize') || searchParams.get('limit') || ''
  )
  const requestedPageSize = Number.isNaN(rawPageSize)
    ? (defaults.pageSize ?? 50)
    : rawPageSize
  const pageSize = Math.min(Math.max(1, requestedPageSize), maxPageSize)
  return { page, pageSize }
}

import { describe, it, expect } from 'vitest'
import {
  buildPaginationMeta,
  parsePaginationParams,
  type PaginatedResponse,
} from '@/lib/api-types'

describe('buildPaginationMeta', () => {
  it('builds correct metadata for a standard page', () => {
    const meta = buildPaginationMeta(2, 50, 120)
    expect(meta).toEqual({
      page: 2,
      pageSize: 50,
      total: 120,
      totalPages: 3,
      hasNextPage: true,
    })
  })

  it('handles the last page correctly', () => {
    const meta = buildPaginationMeta(3, 50, 120)
    expect(meta.hasNextPage).toBe(false)
    expect(meta.totalPages).toBe(3)
  })

  it('handles zero results', () => {
    const meta = buildPaginationMeta(1, 50, 0)
    expect(meta.totalPages).toBe(0)
    expect(meta.hasNextPage).toBe(false)
  })

  it('handles page size of 0 safely', () => {
    const meta = buildPaginationMeta(1, 0, 100)
    expect(meta.totalPages).toBe(0)
  })

  it('calculates totalPages correctly for exact multiples', () => {
    expect(buildPaginationMeta(1, 25, 100).totalPages).toBe(4)
    expect(buildPaginationMeta(1, 25, 101).totalPages).toBe(5)
  })
})

describe('parsePaginationParams', () => {
  it('parses page and pageSize from URLSearchParams', () => {
    const params = new URLSearchParams('page=3&pageSize=25')
    expect(parsePaginationParams(params)).toEqual({ page: 3, pageSize: 25 })
  })

  it('falls back to defaults when params are missing', () => {
    const params = new URLSearchParams('')
    expect(parsePaginationParams(params, { page: 1, pageSize: 50 })).toEqual({
      page: 1,
      pageSize: 50,
    })
  })

  it('accepts "limit" as an alias for "pageSize" (backward compat)', () => {
    const params = new URLSearchParams('page=2&limit=30')
    expect(parsePaginationParams(params)).toEqual({ page: 2, pageSize: 30 })
  })

  it('clamps page to minimum 1', () => {
    const params = new URLSearchParams('page=0')
    expect(parsePaginationParams(params).page).toBe(1)
  })

  it('clamps pageSize to minimum 1', () => {
    const params = new URLSearchParams('pageSize=0')
    expect(parsePaginationParams(params).pageSize).toBe(1)
  })

  it('clamps pageSize to maxPageSize', () => {
    const params = new URLSearchParams('pageSize=10000')
    expect(parsePaginationParams(params, { maxPageSize: 200 }).pageSize).toBe(200)
  })

  it('handles invalid (NaN) values gracefully', () => {
    const params = new URLSearchParams('page=abc&pageSize=xyz')
    const result = parsePaginationParams(params, { page: 1, pageSize: 50 })
    expect(result).toEqual({ page: 1, pageSize: 50 })
  })
})

describe('PaginatedResponse type', () => {
  it('can be constructed with the correct shape', () => {
    const res: PaginatedResponse<string> = {
      data: ['a', 'b', 'c'],
      pagination: {
        page: 1,
        pageSize: 10,
        total: 3,
        totalPages: 1,
        hasNextPage: false,
      },
    }
    expect(res.data).toHaveLength(3)
    expect(res.pagination.total).toBe(3)
  })
})

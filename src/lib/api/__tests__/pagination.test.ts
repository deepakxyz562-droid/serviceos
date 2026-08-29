import { describe, it, expect } from 'vitest';
import { buildPaginatedResponse } from '@/lib/api/pagination';

describe('buildPaginatedResponse', () => {
  it('returns correct pagination meta for a full page', () => {
    const data = Array.from({ length: 20 }, (_, i) => ({ id: String(i) }));
    const result = buildPaginatedResponse(data, 100, 1, 20);

    expect(result.data).toHaveLength(20);
    expect(result.pagination).toMatchObject({
      page: 1,
      pageSize: 20,
      total: 100,
      totalPages: 5,
      hasNextPage: true,
      hasPrevPage: false,
    });
  });

  it('marks hasPrevPage true on page 2+', () => {
    const result = buildPaginatedResponse([], 100, 3, 20);
    expect(result.pagination.hasPrevPage).toBe(true);
    expect(result.pagination.hasNextPage).toBe(true);
  });

  it('marks hasNextPage false on last page', () => {
    const result = buildPaginatedResponse([], 100, 5, 20);
    expect(result.pagination.hasNextPage).toBe(false);
  });

  it('returns totalPages of 1 for empty data', () => {
    const result = buildPaginatedResponse([], 0, 1, 20);
    expect(result.pagination.totalPages).toBe(1);
    expect(result.pagination.hasNextPage).toBe(false);
    expect(result.pagination.hasPrevPage).toBe(false);
  });
});

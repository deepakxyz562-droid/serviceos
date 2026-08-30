import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as React from 'react'
import { useJobs, useCustomers, useInvoices, useLeads, useExpenses } from '@/hooks/use-crm-data'

// Mock authFetch
vi.mock('@/lib/api', () => ({
  authFetch: vi.fn(),
}))

import { authFetch } from '@/lib/api'

// Helper to create a wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('useJobs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches jobs from /api/jobs', async () => {
    vi.mocked(authFetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ jobs: [{ id: '1', title: 'Test Job' }] }),
    } as Response)

    const { result } = renderHook(() => useJobs(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.jobs).toHaveLength(1)
    expect(authFetch).toHaveBeenCalledWith(expect.stringContaining('/api/jobs'))
  })

  it('passes status and search params', async () => {
    vi.mocked(authFetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ jobs: [] }),
    } as Response)

    const { result } = renderHook(
      () => useJobs({ status: 'pending', search: 'test' }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const calledUrl = vi.mocked(authFetch).mock.calls[0][0] as string
    expect(calledUrl).toContain('status=pending')
    expect(calledUrl).toContain('search=test')
  })

  it('sets error when fetch fails', async () => {
    vi.mocked(authFetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response)

    const { result } = renderHook(() => useJobs(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Failed to fetch jobs')
  })
})

describe('useCustomers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches contacts from /api/contacts', async () => {
    vi.mocked(authFetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ id: '1', name: 'Alice' }] }),
    } as Response)

    const { result } = renderHook(() => useCustomers(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.customers).toHaveLength(1)
  })

  it('handles { customers: [...] } response (legacy)', async () => {
    vi.mocked(authFetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ customers: [{ id: '1', name: 'Alice' }] }),
    } as Response)

    const { result } = renderHook(() => useCustomers(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.customers).toHaveLength(1)
  })

  it('handles array response (legacy)', async () => {
    vi.mocked(authFetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: '1', name: 'Alice' }],
    } as Response)

    const { result } = renderHook(() => useCustomers(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.customers).toHaveLength(1)
  })
})

describe('useInvoices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches invoices from /api/invoices', async () => {
    vi.mocked(authFetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ invoices: [{ id: '1', total: 100 }] }),
    } as Response)

    const { result } = renderHook(() => useInvoices(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
  })
})

describe('useLeads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches leads with pagination params', async () => {
    vi.mocked(authFetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ leads: [{ id: '1', name: 'Lead 1' }], pagination: { total: 1 } }),
    } as Response)

    const { result } = renderHook(
      () => useLeads({ page: 1, limit: 10 }),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const calledUrl = vi.mocked(authFetch).mock.calls[0][0] as string
    expect(calledUrl).toContain('page=1')
    expect(calledUrl).toContain('limit=10')
    expect(calledUrl).toContain('deleted=false')
  })
})

describe('useExpenses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches expenses from /api/expenses', async () => {
    vi.mocked(authFetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ expenses: [{ id: '1', amount: 50 }] }),
    } as Response)

    const { result } = renderHook(() => useExpenses(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { jobService } from '@/features/jobs/services/job-service'

vi.mock('@/lib/api', () => ({
  authFetch: vi.fn(),
}))

import { authFetch } from '@/lib/api'

describe('jobService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('list', () => {
    it('calls /api/jobs with query params', async () => {
      vi.mocked(authFetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobs: [{ id: '1', title: 'Test' }] }),
      } as Response)

      const result = await jobService.list({ status: 'pending', search: 'test' })

      expect(authFetch).toHaveBeenCalledWith(expect.stringContaining('/api/jobs'))
      const calledUrl = vi.mocked(authFetch).mock.calls[0][0] as string
      expect(calledUrl).toContain('status=pending')
      expect(calledUrl).toContain('search=test')
      expect(calledUrl).toContain('includeDeleted=false')
      expect(result.jobs).toHaveLength(1)
    })

    it('skips status param when status is "all"', async () => {
      vi.mocked(authFetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobs: [] }),
      } as Response)

      await jobService.list({ status: 'all' })

      const calledUrl = vi.mocked(authFetch).mock.calls[0][0] as string
      expect(calledUrl).not.toContain('status=all')
    })

    it('handles legacy array response', async () => {
      vi.mocked(authFetch).mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: '1', title: 'Legacy' }],
      } as Response)

      const result = await jobService.list()
      expect(result.jobs).toHaveLength(1)
      expect(result.pagination).toBeNull()
    })

    it('throws on error response', async () => {
      vi.mocked(authFetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      } as Response)

      await expect(jobService.list()).rejects.toThrow('Server error')
    })
  })

  describe('create', () => {
    it('sends POST to /api/jobs with JSON body', async () => {
      vi.mocked(authFetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '1', title: 'New Job' }),
      } as Response)

      const result = await jobService.create({ title: 'New Job' })

      expect(authFetch).toHaveBeenCalledWith('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Job' }),
      })
      expect(result.id).toBe('1')
    })
  })

  describe('update', () => {
    it('sends PUT to /api/jobs/:id with JSON body', async () => {
      vi.mocked(authFetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '1', title: 'Updated' }),
      } as Response)

      await jobService.update({ id: '1', title: 'Updated' })

      expect(authFetch).toHaveBeenCalledWith('/api/jobs/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated' }),
      })
    })
  })

  describe('updateStatus', () => {
    it('sends PATCH with status body', async () => {
      vi.mocked(authFetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '1', status: 'completed' }),
      } as Response)

      await jobService.updateStatus('1', 'completed')

      expect(authFetch).toHaveBeenCalledWith('/api/jobs/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      })
    })
  })

  describe('delete', () => {
    it('sends DELETE to /api/jobs/:id', async () => {
      vi.mocked(authFetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)

      await jobService.delete('1')

      expect(authFetch).toHaveBeenCalledWith('/api/jobs/1', { method: 'DELETE' })
    })
  })
})

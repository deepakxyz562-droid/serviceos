import { describe, it, expect } from 'vitest'
import {
  formatDate,
  formatDateTime,
  formatTime,
  formatRelativeDate,
  timeAgo,
  formatMinutes,
  formatHMS,
  formatDuration,
  formatNumber,
  formatCurrency,
  formatFileSize,
  todayISO,
  getInitials,
} from '@/lib/format-utils'

describe('format-utils', () => {
  describe('formatDate', () => {
    it('formats a valid date string', () => {
      const result = formatDate('2025-08-16T14:30:00Z')
      expect(result).toMatch(/Aug 16, 2025/)
    })

    it('returns -- for null/undefined', () => {
      expect(formatDate(null)).toBe('--')
      expect(formatDate(undefined)).toBe('--')
      expect(formatDate('')).toBe('--')
    })

    it('returns -- for invalid date', () => {
      expect(formatDate('not-a-date')).toBe('--')
    })

    it('accepts Date objects', () => {
      const d = new Date('2025-08-16T14:30:00Z')
      expect(formatDate(d)).toMatch(/Aug 16, 2025/)
    })
  })

  describe('formatDateTime', () => {
    it('formats date + time', () => {
      const result = formatDateTime('2025-08-16T14:30:00Z')
      expect(result).toMatch(/Aug 16/)
      expect(result).toMatch(/\d{1,2}:\d{2}/)
    })

    it('returns -- for null', () => {
      expect(formatDateTime(null)).toBe('--')
    })
  })

  describe('formatTime', () => {
    it('formats time only', () => {
      const result = formatTime('2025-08-16T14:30:00Z')
      expect(result).toMatch(/\d{1,2}:\d{2}/)
    })
  })

  describe('formatRelativeDate', () => {
    it('returns Today for current date', () => {
      expect(formatRelativeDate(new Date().toISOString())).toBe('Today')
    })

    it('returns Tomorrow for next day', () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      expect(formatRelativeDate(tomorrow.toISOString())).toBe('Tomorrow')
    })

    it('returns Yesterday for previous day', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      expect(formatRelativeDate(yesterday.toISOString())).toBe('Yesterday')
    })
  })

  describe('timeAgo', () => {
    it('returns "just now" for recent time', () => {
      expect(timeAgo(new Date().toISOString())).toBe('just now')
    })

    it('returns minutes ago', () => {
      const d = new Date(Date.now() - 5 * 60 * 1000)
      expect(timeAgo(d.toISOString())).toBe('5m ago')
    })

    it('returns hours ago', () => {
      const d = new Date(Date.now() - 3 * 60 * 60 * 1000)
      expect(timeAgo(d.toISOString())).toBe('3h ago')
    })

    it('returns days ago', () => {
      const d = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      expect(timeAgo(d.toISOString())).toBe('2d ago')
    })

    it('returns -- for null', () => {
      expect(timeAgo(null)).toBe('--')
    })
  })

  describe('formatMinutes', () => {
    it('formats 0 minutes', () => {
      expect(formatMinutes(0)).toBe('0m')
    })

    it('formats minutes only', () => {
      expect(formatMinutes(45)).toBe('45m')
    })

    it('formats hours + minutes', () => {
      expect(formatMinutes(90)).toBe('1h 30m')
      expect(formatMinutes(125)).toBe('2h 5m')
    })

    it('formats exact hours', () => {
      expect(formatMinutes(120)).toBe('2h')
    })

    it('handles negative', () => {
      expect(formatMinutes(-10)).toBe('0m')
    })
  })

  describe('formatHMS', () => {
    it('formats seconds', () => {
      expect(formatHMS(45)).toBe('00:00:45')
    })

    it('formats minutes + seconds', () => {
      expect(formatHMS(125)).toBe('00:02:05')
    })

    it('formats hours + minutes + seconds', () => {
      expect(formatHMS(3661)).toBe('01:01:01')
    })

    it('handles zero', () => {
      expect(formatHMS(0)).toBe('00:00:00')
    })

    it('handles negative', () => {
      expect(formatHMS(-10)).toBe('00:00:00')
    })
  })

  describe('formatDuration', () => {
    it('formats seconds only', () => {
      expect(formatDuration(45)).toBe('45s')
    })

    it('formats minutes + seconds', () => {
      expect(formatDuration(125)).toBe('2m 5s')
    })

    it('formats hours + minutes + seconds', () => {
      expect(formatDuration(3661)).toBe('1h 1m 1s')
    })

    it('handles zero', () => {
      expect(formatDuration(0)).toBe('0s')
    })
  })

  describe('formatNumber', () => {
    it('formats with thousands separators', () => {
      expect(formatNumber(1234567)).toBe('1,234,567')
    })

    it('handles zero', () => {
      expect(formatNumber(0)).toBe('0')
    })

    it('handles NaN', () => {
      expect(formatNumber(NaN)).toBe('0')
    })
  })

  describe('formatCurrency', () => {
    it('formats USD', () => {
      expect(formatCurrency(1234.5)).toMatch(/\$1,234\.50/)
    })

    it('handles zero', () => {
      expect(formatCurrency(0)).toMatch(/\$0\.00/)
    })
  })

  describe('formatFileSize', () => {
    it('formats bytes', () => {
      expect(formatFileSize(500)).toBe('500 B')
    })

    it('formats kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1.0 KB')
    })

    it('formats megabytes', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1.0 MB')
    })

    it('returns empty for undefined', () => {
      expect(formatFileSize(undefined)).toBe('')
    })
  })

  describe('todayISO', () => {
    it('returns today as YYYY-MM-DD', () => {
      const result = todayISO()
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  describe('getInitials', () => {
    it('returns initials for first + last name', () => {
      expect(getInitials('John Doe')).toBe('JD')
    })

    it('returns first letter for single name', () => {
      expect(getInitials('John')).toBe('J')
    })

    it('returns ? for empty', () => {
      expect(getInitials('')).toBe('?')
      expect(getInitials(null)).toBe('?')
      expect(getInitials(undefined)).toBe('?')
    })

    it('handles multiple middle names', () => {
      expect(getInitials('John Michael Doe')).toBe('JD')
    })
  })
})

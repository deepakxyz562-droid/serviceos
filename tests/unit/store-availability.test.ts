import { describe, it, expect } from 'vitest';
import {
  computeStoreAvailability,
  computeStoreAvailabilityFromConfig,
  getIstCurrentDateStr,
  getIstCurrentTimeStr,
  getIstCurrentDayOfWeek,
  formatTime12h,
} from '@/lib/commerce/store-availability';

describe('Store Availability Engine (Daily Heartbeat & Operating Hours)', () => {
  it('formats 24h time to 12h time properly', () => {
    expect(formatTime12h('09:00')).toBe('9:00 AM');
    expect(formatTime12h('12:00')).toBe('12:00 PM');
    expect(formatTime12h('15:30')).toBe('3:30 PM');
    expect(formatTime12h('00:00')).toBe('12:00 AM');
    expect(formatTime12h('23:59')).toBe('11:59 PM');
    expect(formatTime12h('')).toBe('');
  });

  it('correctly calculates IST date string (YYYY-MM-DD)', () => {
    const todayIst = getIstCurrentDateStr();
    expect(todayIst).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('correctly calculates IST time string (HH:mm)', () => {
    const timeIst = getIstCurrentTimeStr();
    expect(timeIst).toMatch(/^\d{2}:\d{2}$/);
  });

  it('correctly calculates IST day of week name', () => {
    const day = getIstCurrentDayOfWeek();
    expect(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']).toContain(day);
  });

  it('marks store CLOSED if manually closed by merchant', () => {
    const today = getIstCurrentDateStr();
    const result = computeStoreAvailability({
      isStoreOpen: false,
      lastActiveDate: today,
      autoCloseIfInactive: true,
      manualCloseReason: 'Store is temporarily closed for restocking',
      businessHours: {
        monday: { open: true, start: '08:00', end: '22:00' },
        tuesday: { open: true, start: '08:00', end: '22:00' },
        wednesday: { open: true, start: '08:00', end: '22:00' },
        thursday: { open: true, start: '08:00', end: '22:00' },
        friday: { open: true, start: '08:00', end: '22:00' },
        saturday: { open: true, start: '08:00', end: '22:00' },
        sunday: { open: true, start: '08:00', end: '22:00' },
      },
    });

    expect(result.isOpen).toBe(false);
    expect(result.isManuallyClosed).toBe(true);
    expect(result.reason).toBe('Store is temporarily closed for restocking');
  });

  it('marks store CLOSED if merchant has NOT checked in today (Daily Inactivity Auto-Close)', () => {
    const result = computeStoreAvailability({
      isStoreOpen: true,
      lastActiveDate: '2020-01-01', // old inactive date
      autoCloseIfInactive: true,
      businessHours: {
        monday: { open: true, start: '00:00', end: '23:59' },
        tuesday: { open: true, start: '00:00', end: '23:59' },
        wednesday: { open: true, start: '00:00', end: '23:59' },
        thursday: { open: true, start: '00:00', end: '23:59' },
        friday: { open: true, start: '00:00', end: '23:59' },
        saturday: { open: true, start: '00:00', end: '23:59' },
        sunday: { open: true, start: '00:00', end: '23:59' },
      },
    });

    expect(result.isOpen).toBe(false);
    expect(result.isDailyInactive).toBe(true);
    expect(result.reason).toContain("hasn't checked in online today");
  });

  it('marks store OPEN if checked in today and within operating hours', () => {
    const today = getIstCurrentDateStr();
    const result = computeStoreAvailability({
      isStoreOpen: true,
      lastActiveDate: today,
      autoCloseIfInactive: true,
      businessHours: {
        monday: { open: true, start: '00:00', end: '23:59' },
        tuesday: { open: true, start: '00:00', end: '23:59' },
        wednesday: { open: true, start: '00:00', end: '23:59' },
        thursday: { open: true, start: '00:00', end: '23:59' },
        friday: { open: true, start: '00:00', end: '23:59' },
        saturday: { open: true, start: '00:00', end: '23:59' },
        sunday: { open: true, start: '00:00', end: '23:59' },
      },
    });

    expect(result.isOpen).toBe(true);
    expect(result.reason).toBe('');
    expect(result.todayHoursText).toBe('12:00 AM - 11:59 PM');
  });

  it('marks store CLOSED if today is marked as a day off in operating hours', () => {
    const today = getIstCurrentDateStr();
    const currentDay = getIstCurrentDayOfWeek();

    const businessHours: any = {
      [currentDay]: { open: false },
    };

    const result = computeStoreAvailability({
      isStoreOpen: true,
      lastActiveDate: today,
      autoCloseIfInactive: true,
      businessHours,
    });

    expect(result.isOpen).toBe(false);
    expect(result.isOutsideHours).toBe(true);
    expect(result.reason).toContain('scheduled closed on');
  });

  it('handles computeStoreAvailabilityFromConfig with null or empty config safely', () => {
    const result = computeStoreAvailabilityFromConfig(null);
    expect(result.isOpen).toBe(true);
    expect(result.reason).toBe('');
  });
});

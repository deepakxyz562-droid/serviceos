import { describe, expect, it } from 'vitest';
import { buildGoogleRegularHoursPeriods } from '@/lib/social/adapters/googlebusiness';

describe('buildGoogleRegularHoursPeriods', () => {
  it('converts open days to Google Business Information API periods and omits closed days', () => {
    const result = buildGoogleRegularHoursPeriods({
      Monday: { open: true, openTime: '09:30', closeTime: '18:00' },
      Tuesday: { open: true, openTime: '09:00', closeTime: '20:45' },
      Saturday: { open: false, openTime: '09:00', closeTime: '18:00' },
      Sunday: { open: true, openTime: '10:00', closeTime: '24:00' },
    });

    expect(result.periods).toEqual([
      {
        openDay: 'MONDAY',
        openTime: { hours: 9, minutes: 30 },
        closeDay: 'MONDAY',
        closeTime: { hours: 18 },
      },
      {
        openDay: 'TUESDAY',
        openTime: { hours: 9 },
        closeDay: 'TUESDAY',
        closeTime: { hours: 20, minutes: 45 },
      },
      {
        openDay: 'SUNDAY',
        openTime: { hours: 10 },
        closeDay: 'SUNDAY',
        closeTime: { hours: 24 },
      },
    ]);
  });

  it('safely clamps malformed clock strings to valid defaults', () => {
    const result = buildGoogleRegularHoursPeriods({
      Wednesday: { open: true, openTime: 'invalid', closeTime: '99:99' },
    });

    expect(result.periods).toEqual([
      {
        openDay: 'WEDNESDAY',
        openTime: { hours: 9 },
        closeDay: 'WEDNESDAY',
        closeTime: { hours: 23, minutes: 59 },
      },
    ]);
  });
});

import { describe, expect, it } from 'vitest';
import {
  getMonthDays,
  getWeekDays,
  formatMonthYear,
  formatDayHeader,
  isSameDay,
  friendlyLayerName,
} from '../bgosmobile/src/lib/calendar-utils';

describe('BGOS Social Calendar & Marketing UI/UX Utilities', () => {
  it('correctly calculates month grid days ensuring complete multiples of 7', () => {
    // Test November 2026 (starts on a Sunday, ends on a Monday)
    const nov2026 = getMonthDays(2026, 10); // 0-indexed month 10 = November
    expect(nov2026.length % 7).toBe(0);

    const currentMonthDays = nov2026.filter((d) => d.isCurrentMonth);
    expect(currentMonthDays.length).toBe(30); // November has 30 days

    // First day of November 2026 is Nov 1
    const firstCurrent = currentMonthDays[0];
    expect(firstCurrent.date.getDate()).toBe(1);
    expect(firstCurrent.date.getMonth()).toBe(10);
  });

  it('correctly calculates 7 consecutive days for week view starting from Monday', () => {
    const testDate = new Date(2026, 10, 4); // Nov 4, 2026 (Wednesday)
    const week = getWeekDays(testDate);
    expect(week.length).toBe(7);

    // Monday should be Nov 2, 2026
    expect(week[0].getDay()).toBe(1); // Monday
    expect(week[0].getDate()).toBe(2);

    // Sunday should be Nov 8, 2026
    expect(week[6].getDay()).toBe(0); // Sunday
    expect(week[6].getDate()).toBe(8);
  });

  it('accurately identifies same calendar day irrespective of time', () => {
    const morning = new Date(2026, 10, 4, 8, 30, 0);
    const evening = new Date(2026, 10, 4, 21, 45, 0);
    const nextDay = new Date(2026, 10, 5, 8, 30, 0);

    expect(isSameDay(morning, evening)).toBe(true);
    expect(isSameDay(morning, nextDay)).toBe(false);
  });

  it('formats month and day headers cleanly', () => {
    const date = new Date(2026, 10, 4); // Nov 4, 2026
    expect(formatMonthYear(date)).toBe('November 2026');
    expect(formatDayHeader(date)).toContain('Nov 4');
  });

  it('converts technical layer IDs to human-friendly design terms', () => {
    expect(friendlyLayerName('headline_1234')).toBe('Headline');
    expect(friendlyLayerName('badge_offer')).toBe('Offer Badge');
    expect(friendlyLayerName('subtitle_text')).toBe('Subtitle');
    expect(friendlyLayerName('cta_button')).toBe('Action Button');
    expect(friendlyLayerName('main_photo')).toBe('Photo');
    expect(friendlyLayerName('company_logo')).toBe('Logo');
    expect(friendlyLayerName('bg_shape')).toBe('Shape');
    expect(friendlyLayerName('custom_unmatched_id_longer_than_twelve')).toBe('custom_unm…');
  });
});

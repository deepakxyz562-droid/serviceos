import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAutopilotDays, type AutopilotConfig } from '@/lib/social/autopilot';
import { computeMarketingScore } from '@/lib/gbp/marketing-score';

describe('Autopilot 7-Day Sprint & Custom Date Range', () => {
  it('correctly calculates total days for 7_days sprint', () => {
    expect(getAutopilotDays('7_days')).toBe(7);
  });

  it('correctly calculates total days for 30_days', () => {
    expect(getAutopilotDays('30_days')).toBe(30);
  });

  it('correctly calculates total days for 1_year', () => {
    expect(getAutopilotDays('1_year')).toBe(365);
  });

  it('correctly calculates total days for custom duration', () => {
    expect(getAutopilotDays('custom', 14)).toBe(14);
    expect(getAutopilotDays('custom', 5)).toBe(5);
    expect(getAutopilotDays('custom', 90)).toBe(90);
  });

  it('clamps custom days safely between 1 and 365', () => {
    expect(getAutopilotDays('custom', 0)).toBe(7); // fallback
    expect(getAutopilotDays('custom', 500)).toBe(365);
  });
});

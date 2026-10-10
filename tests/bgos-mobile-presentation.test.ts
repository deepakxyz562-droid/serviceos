import { validateSocialPost } from '../bgosmobile/src/lib/social-validation';
import { describe, expect, it } from 'vitest';
import { futureLocalTime, localDay } from '../bgosmobile/src/lib/dates';
import { leadStage, leadStages } from '../bgosmobile/src/lib/leads';
import { KANBAN_STATUSES } from '../src/features/leads/utils/lead-helpers';
describe('BGOS mobile workflow contracts', () => {
  it('keeps native stage writes aligned with the existing web pipeline', () => {
    expect([...leadStages]).toEqual(KANBAN_STATUSES);
    expect(leadStage('new')).toBe('new_lead');
    expect(leadStage('proposal')).toBe('quote_sent');
    expect(leadStage('won')).toBe('won');
    expect(leadStage('legacy-custom')).toBe('legacy-custom');
  });
  it('rejects invalid calendar rollover, invalid time and past scheduling', () => {
    expect(futureLocalTime('2030-02-31', '12:30', 0)).toBeNull();
    expect(futureLocalTime('2030-01-01', '24:30', 0)).toBeNull();
    expect(futureLocalTime('2030-01-01', '12:65', 0)).toBeNull();
    expect(futureLocalTime('2030-01-01', '12:30', new Date(2031, 0, 1).getTime())).toBeNull();
    expect(futureLocalTime('2030-1-1', '12:30', 0)).toBeNull();
  });
  it('preserves the selected local calendar day when converting to API timestamps', () => {
    const iso = futureLocalTime('2030-02-28', '14:30', 0)!;
    expect(localDay(new Date(iso))).toBe('2030-02-28');
    expect(new Date(iso).getHours()).toBe(14);
    expect(new Date(iso).getMinutes()).toBe(30);
  });
});

it('prevents channel-incompatible and invalid-media submissions', () => {
  expect(validateSocialPost('Hello', ['instagram'], [])).toMatch(/requires/);
  expect(validateSocialPost('x'.repeat(281), ['twitter', 'facebook'], [])).toMatch(/280/);
  expect(validateSocialPost('Hello', ['facebook'], ['http://example.com/image.png'])).toMatch(/HTTPS/);
  expect(validateSocialPost('Hello', ['facebook'], ['https://user:secret@example.com/image.png'])).toMatch(/HTTPS/);
  expect(validateSocialPost('Hello', ['instagram'], ['https://example.com/image.png'])).toBeNull();
});

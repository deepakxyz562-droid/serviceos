export const DAY_MS = 24 * 60 * 60 * 1000;
export const LEASE_MS = 5 * 60 * 1000;
export const normalizeEmail = (email: string) => email.trim().toLowerCase();
export const validEmail = (email: string) => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) && email.length <= 254;
export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!));

// Balanced three-send cycles: each cycle takes six minutes before cron latency.
// Vary the order without letting 500 random three-minute gaps overrun 24 hours.
export function delaySeconds(sequence: number, phase: number) {
  return [60, 120, 180][(sequence + phase) % 3];
}
export function healthPause(sent: number, bounced: number, complained: number): string | null {
  if (complained > 0) return 'Complaint received. Review recipients and SES reputation before resuming.';
  if (sent >= 20 && bounced / sent >= 0.02) return 'Bounce rate reached 2%. Review list quality before resuming.';
  return null;
}

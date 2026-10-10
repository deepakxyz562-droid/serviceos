export function localDay(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
/** Reject rollover dates (e.g. 31 February), invalid times and DST gaps. */
export function futureLocalTime(day: string, time: string, now = Date.now()): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const [year, month, date] = day.split('-').map(Number); const [hour, minute] = time.split(':').map(Number);
  const value = new Date(year, month - 1, date, hour, minute);
  if (value.getFullYear() !== year || value.getMonth() !== month - 1 || value.getDate() !== date || value.getHours() !== hour || value.getMinutes() !== minute || value.getTime() <= now) return null;
  return value.toISOString();
}

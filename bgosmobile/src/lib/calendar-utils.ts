/**
 * BGOS Social Calendar pure date utilities.
 * Handles month grid calculations, week day slicing, and date formatting.
 */

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function formatDayHeader(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function getMonthDays(year: number, month: number): Array<{ date: Date; isCurrentMonth: boolean }> {
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // Convert Sunday (0) to 7 so Monday is 1, Sunday is 7
  let startingDay = firstDayOfMonth.getDay();
  startingDay = startingDay === 0 ? 7 : startingDay;

  const days: Array<{ date: Date; isCurrentMonth: boolean }> = [];

  // Previous month trailing days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startingDay - 1; i > 0; i--) {
    days.push({
      date: new Date(year, month - 1, prevMonthLastDay - i + 1),
      isCurrentMonth: false,
    });
  }

  // Current month days
  for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
    days.push({
      date: new Date(year, month, i),
      isCurrentMonth: true,
    });
  }

  // Next month leading days to complete full grid (multiples of 7)
  const remaining = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    days.push({
      date: new Date(year, month + 1, i),
      isCurrentMonth: false,
    });
  }

  return days;
}

export function getWeekDays(centerDate: Date): Date[] {
  const d = new Date(centerDate);
  const day = d.getDay();
  // Monday is start of week
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));

  const week: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const next = new Date(monday);
    next.setDate(monday.getDate() + i);
    week.push(next);
  }
  return week;
}

export function friendlyLayerName(id: string): string {
  if (id.includes('headline')) return 'Headline';
  if (id.includes('badge')) return 'Offer Badge';
  if (id.includes('sub')) return 'Subtitle';
  if (id.includes('cta')) return 'Action Button';
  if (id.includes('photo') || id.includes('image')) return 'Photo';
  if (id.includes('logo')) return 'Logo';
  if (id.includes('shape')) return 'Shape';
  return id.length > 12 ? `${id.slice(0, 10)}…` : id;
}

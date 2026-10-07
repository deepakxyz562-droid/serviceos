/** Calendar-day boundaries in the business timezone, including DST changes. */
export function businessDayRange(timezone: string, now = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const parts = formatter.formatToParts(now);
  const part = (key: string) => parts.find((p) => p.type === key)!.value;
  const date = `${part('year')}-${part('month')}-${part('day')}`;
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const midnight = (day: string) => {
    const target = Date.parse(`${day}T00:00:00Z`);
    let guess = target;
    const clock = new Intl.DateTimeFormat('en-GB', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
    for (let i = 0; i < 4; i++) {
      const p = clock.formatToParts(new Date(guess));
      const get = (k: string) => p.find((v) => v.type === k)!.value;
      const wallTime = Date.parse(`${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}Z`);
      const correction = target - wallTime;
      guess += correction;
      if (!correction) break;
    }
    return new Date(guess);
  };
  return { date, start: midnight(date), end: midnight(next.toISOString().slice(0, 10)) };
}

export const POSTED_ORDER_STATUSES = ['CONFIRMED', 'PAID', 'PREPARING', 'READY', 'DELIVERED', 'COMPLETED'];
/** Explicit pagination also avoids the PostgREST server's default row cap. */
export async function readHomePages<T>(read: (skip: number, take: number) => Promise<T[]>) {
  const result: T[] = [];
  const pageSize = 500;
  for (let skip = 0; ; skip += pageSize) {
    const page = await read(skip, pageSize);
    result.push(...page);
    if (page.length < pageSize) return result;
  }
}
export function postedOrderSales(orders: { status: string; total: number; paymentStatus: string }[]) {
  return Math.round(orders.reduce((sum, order) => {
    if (!POSTED_ORDER_STATUSES.includes(order.status) || order.paymentStatus === 'REFUNDED') return sum;
    return sum + (Number.isFinite(order.total) ? order.total : 0);
  }, 0) * 100) / 100;
}

import { NextResponse } from 'next/server';
import { ownerBusiness } from '@/lib/commerce/access';
import { atomicCommerce, commerceError } from '@/lib/commerce/atomic';

export async function GET(req: Request) {
  try {
    const business = await ownerBusiness(req);
    const params = new URL(req.url).searchParams;
    const phone = params.get('phone') || '';
    const section = params.get('section') || 'orders';
    const cursor = params.get('cursor');
    let before = { date: '', id: '' };
    if (!/^[0-9]{7,15}$/.test(phone) || !['orders','ledger'].includes(section)) return NextResponse.json({ error: 'Invalid customer history request.' }, { status: 400 });
    if (cursor) {
      try {
        if (cursor.length > 1024) throw new Error();
        const value = JSON.parse(Buffer.from(cursor,'base64url').toString());
        if (value.phone !== phone || value.section !== section || typeof value.date !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value.date) || !Number.isFinite(Date.parse(value.date)) || typeof value.id !== 'string' || !value.id.length || value.id.length > 200) throw new Error();
        before = { date: value.date, id: value.id };
      } catch { return NextResponse.json({ error: 'Invalid history cursor.' }, { status: 400 }); }
    }
    const data = await atomicCommerce<{ records: Array<{ id: string; createdAt: string }>; balance: number | null; reviewRequired: boolean; ordersCount: number; currency: string }>('customerHistory',[business.id,phone,section,before.date,before.id]);
    const hasMore = data.records.length > 50;
    const records = data.records.slice(0,50);
    const last = records.at(-1);
    const nextCursor = hasMore && last ? Buffer.from(JSON.stringify({ phone, section, date: last.createdAt, id: last.id })).toString('base64url') : null;
    return NextResponse.json({ ...data, records, nextCursor }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'UNAUTHORIZED' || message === 'FORBIDDEN') return NextResponse.json({ error: 'Access denied.' }, { status: message === 'UNAUTHORIZED' ? 401 : 403 });
    const failure = commerceError(error);
    return NextResponse.json({ error: failure.message }, { status: failure.status });
  }
}

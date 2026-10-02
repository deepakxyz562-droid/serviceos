import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireQuoteFlowBusiness } from '@/lib/quote-flow-session';

export async function POST(req: Request) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);
    const updated = await db.aiBusiness.update({
      where: { id: business.id },
      data: { plan: 'PRO' },
    });
    return NextResponse.json({ business: updated, message: 'Upgraded to PRO plan' });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

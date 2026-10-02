import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireQuoteFlowBusiness } from '@/lib/quote-flow-session';

export async function GET(req: Request) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);
    const templates = await db.aiTemplate.findMany({
      where: {
        OR: [{ businessId: business.id }, { businessId: null }, { isSystem: true }],
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });

    return NextResponse.json({
      templates: templates.map((t) => ({
        ...t,
        suggestedItems: t.suggestedItems ? JSON.parse(t.suggestedItems) : [],
      })),
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);
    const body = await req.json();
    const template = await db.aiTemplate.create({
      data: {
        businessId: business.id,
        name: body.name,
        category: body.category || 'Custom',
        suggestedItems: JSON.stringify(body.suggestedItems || []),
        defaultTaxRate: body.defaultTaxRate ?? 0,
        isSystem: false,
      },
    });

    return NextResponse.json({
      template: {
        ...template,
        suggestedItems: body.suggestedItems || [],
      },
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

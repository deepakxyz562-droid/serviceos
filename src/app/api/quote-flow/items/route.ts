import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireQuoteFlowBusiness } from '@/lib/quote-flow-session';

/**
 * GET /api/quote-flow/items
 * List all saved items in the business's item library.
 * Query: ?category=Service&active=true
 */
export async function GET(req: NextRequest) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);
    const url = new URL(req.url);
    const category = url.searchParams.get('category');
    const activeOnly = url.searchParams.get('active') === 'true';

    const items = await db.aiItem.findMany({
      where: {
        businessId: business.id,
        ...(category ? { category } : {}),
        ...(activeOnly ? { isActive: true } : {}),
      },
      orderBy: { updatedAt: 'desc' },
    });
    return NextResponse.json({ items });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/**
 * POST /api/quote-flow/items
 * Create a new saved item.
 */
export async function POST(req: NextRequest) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);
    const body = await req.json();
    const { description, unitPrice, unit, taxRate, category } = body;
    if (!description) {
      return NextResponse.json({ error: 'description is required' }, { status: 400 });
    }
    const item = await db.aiItem.create({
      data: {
        businessId: business.id,
        description,
        unitPrice: Number(unitPrice) || 0,
        unit: unit || null,
        taxRate: taxRate ? Number(taxRate) : 0,
        category: category || null,
      },
    });
    return NextResponse.json({ item });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

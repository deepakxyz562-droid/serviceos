/**
 * Commerce config API — GET/PATCH
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireQuoteFlowBusiness } from '@/lib/quote-flow-session';

export async function GET(req: NextRequest) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);
    let config = await db.gptformCommerceConfig.findFirst({
      where: { businessId: business.id },
    });

    if (!config) {
      config = await db.gptformCommerceConfig.create({
        data: {
          businessId: business.id,
          catalogJson: JSON.stringify([]),
          fieldsJson: JSON.stringify(DEFAULT_FIELDS),
          currency: business.currency || 'INR',
          currencySymbol: business.currencySymbol || '₹',
        },
      });
    }

    return NextResponse.json({ config });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);
    const body = await req.json();

    let config = await db.gptformCommerceConfig.findFirst({
      where: { businessId: business.id },
    });

    if (!config) {
      config = await db.gptformCommerceConfig.create({
        data: {
          businessId: business.id,
          catalogJson: JSON.stringify(body.catalogJson || []),
          fieldsJson: JSON.stringify(body.fieldsJson || DEFAULT_FIELDS),
          upiId: body.upiId || null,
          currency: business.currency || 'INR',
          currencySymbol: business.currencySymbol || '₹',
        },
      });
    } else {
      config = await db.gptformCommerceConfig.update({
        where: { id: config.id },
        data: {
          ...(body.catalogJson !== undefined ? { catalogJson: JSON.stringify(body.catalogJson) } : {}),
          ...(body.fieldsJson !== undefined ? { fieldsJson: JSON.stringify(body.fieldsJson) } : {}),
          ...(body.upiId !== undefined ? { upiId: body.upiId } : {}),
          ...(body.deliveryAreasJson !== undefined ? { deliveryAreasJson: JSON.stringify(body.deliveryAreasJson) } : {}),
          ...(body.greetingMessage !== undefined ? { greetingMessage: body.greetingMessage } : {}),
          ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        },
      });
    }

    return NextResponse.json({ config });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

const DEFAULT_FIELDS = [
  { id: 'product', label: 'What would you like to order?', type: 'product', required: true, mapsTo: 'product' },
  { id: 'quantity', label: 'How many / what size?', type: 'quantity', required: true, mapsTo: 'quantity' },
  { id: 'date', label: 'When do you need it?', type: 'date', required: true, mapsTo: 'deliveryDate' },
  { id: 'deliveryType', label: 'Delivery or pickup?', type: 'choice', required: true, options: ['Delivery', 'Pickup'], mapsTo: 'deliveryType' },
  { id: 'address', label: 'Please share your delivery address', type: 'address', required: false, mapsTo: 'deliveryAddress' },
  { id: 'name', label: 'Your name?', type: 'text', required: true, mapsTo: 'customerName' },
];

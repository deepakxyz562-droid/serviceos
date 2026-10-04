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

    let parsedFieldsData: any = {};
    try {
      const raw = JSON.parse(config.fieldsJson || '[]');
      if (Array.isArray(raw)) {
        parsedFieldsData = {
          fields: raw,
          tables: DEFAULT_TABLES,
          billing: DEFAULT_BILLING,
          discounts: DEFAULT_DISCOUNTS,
        };
      } else {
        parsedFieldsData = {
          fields: raw.fields || DEFAULT_FIELDS,
          tables: raw.tables && raw.tables.length > 0 ? raw.tables : DEFAULT_TABLES,
          billing: { ...DEFAULT_BILLING, ...(raw.billing || {}) },
          discounts: raw.discounts || DEFAULT_DISCOUNTS,
        };
      }
    } catch {
      parsedFieldsData = {
        fields: DEFAULT_FIELDS,
        tables: DEFAULT_TABLES,
        billing: DEFAULT_BILLING,
        discounts: DEFAULT_DISCOUNTS,
      };
    }

    return NextResponse.json({
      config: {
        ...config,
        tables: parsedFieldsData.tables,
        billing: parsedFieldsData.billing,
        discounts: parsedFieldsData.discounts,
        fields: parsedFieldsData.fields,
      },
    });
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

    // Existing fields container
    let container: any = {
      fields: DEFAULT_FIELDS,
      tables: DEFAULT_TABLES,
      billing: DEFAULT_BILLING,
      discounts: DEFAULT_DISCOUNTS,
    };

    if (config?.fieldsJson) {
      try {
        const raw = JSON.parse(config.fieldsJson);
        if (Array.isArray(raw)) {
          container.fields = raw;
        } else {
          container = {
            fields: raw.fields || DEFAULT_FIELDS,
            tables: raw.tables || DEFAULT_TABLES,
            billing: { ...DEFAULT_BILLING, ...(raw.billing || {}) },
            discounts: raw.discounts || DEFAULT_DISCOUNTS,
          };
        }
      } catch {}
    }

    // Merge updates
    if (body.fields !== undefined) container.fields = body.fields;
    if (body.fieldsJson !== undefined) {
      if (Array.isArray(body.fieldsJson)) container.fields = body.fieldsJson;
      else if (typeof body.fieldsJson === 'object') container = { ...container, ...body.fieldsJson };
    }
    if (body.tables !== undefined) container.tables = body.tables;
    if (body.billing !== undefined) container.billing = { ...container.billing, ...body.billing };
    if (body.discounts !== undefined) container.discounts = body.discounts;

    if (!config) {
      config = await db.gptformCommerceConfig.create({
        data: {
          businessId: business.id,
          catalogJson: JSON.stringify(body.catalogJson || []),
          fieldsJson: JSON.stringify(container),
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
          fieldsJson: JSON.stringify(container),
          ...(body.upiId !== undefined ? { upiId: body.upiId } : {}),
          ...(body.deliveryAreasJson !== undefined ? { deliveryAreasJson: JSON.stringify(body.deliveryAreasJson) } : {}),
          ...(body.greetingMessage !== undefined ? { greetingMessage: body.greetingMessage } : {}),
          ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        },
      });
    }

    return NextResponse.json({
      config: {
        ...config,
        tables: container.tables,
        billing: container.billing,
        discounts: container.discounts,
        fields: container.fields,
      },
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export const DEFAULT_TABLES = [
  { id: 'tbl_1', name: 'Table 1', capacity: 4, section: 'Main Floor' },
  { id: 'tbl_2', name: 'Table 2', capacity: 4, section: 'Main Floor' },
  { id: 'tbl_3', name: 'Table 3', capacity: 2, section: 'Main Floor' },
  { id: 'tbl_4', name: 'Table 4', capacity: 6, section: 'Outdoor Patio' },
  { id: 'tbl_5', name: 'Table 5', capacity: 4, section: 'Outdoor Patio' },
];

export const DEFAULT_BILLING = {
  taxRate: 5,
  taxName: 'GST',
  taxType: 'exclusive',
  serviceChargeRate: 0,
  gstin: '',
  billFooterText: 'Thank you for dining with us! Please visit again.',
};

export const DEFAULT_DISCOUNTS = [
  { code: 'WELCOME10', type: 'percentage', value: 10, minOrder: 200, label: '10% Off on Orders Above ₹200' },
  { code: 'FLAT50', type: 'fixed', value: 50, minOrder: 500, label: '₹50 Flat Off on Orders Above ₹500' },
];

const DEFAULT_FIELDS = [
  { id: 'product', label: 'What would you like to order?', type: 'product', required: true, mapsTo: 'product' },
  { id: 'quantity', label: 'How many / what size?', type: 'quantity', required: true, mapsTo: 'quantity' },
  { id: 'date', label: 'When do you need it?', type: 'date', required: true, mapsTo: 'deliveryDate' },
  { id: 'deliveryType', label: 'Delivery or pickup?', type: 'choice', required: true, options: ['Delivery', 'Pickup'], mapsTo: 'deliveryType' },
  { id: 'address', label: 'Please share your delivery address', type: 'address', required: false, mapsTo: 'deliveryAddress' },
  { id: 'name', label: 'Your name?', type: 'text', required: true, mapsTo: 'customerName' },
];

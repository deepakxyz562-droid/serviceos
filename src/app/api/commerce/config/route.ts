/**
 * Commerce config API — GET/PATCH
 */
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireQuoteFlowBusiness } from '@/lib/quote-flow-session';
import { sanitizeUpiId } from '@/lib/upi-qr';
import { computeStoreAvailability, getIstCurrentDateStr } from '@/lib/commerce/store-availability';

export async function GET(req: NextRequest) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);
    let config = await db.gptformCommerceConfig.findFirst({
      where: {
        OR: [{ businessId: business.id }, ...(business.tenantId ? [{ businessId: business.tenantId }] : [])],
      },
      orderBy: { updatedAt: 'desc' },
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
          deliverySettings: DEFAULT_DELIVERY_SETTINGS,
          paymentQrUrl: '',
          enableOnlinePayment: true,
        };
      } else {
        parsedFieldsData = {
          fields: raw.fields || DEFAULT_FIELDS,
          tables: raw.tables && raw.tables.length > 0 ? raw.tables : DEFAULT_TABLES,
          billing: { ...DEFAULT_BILLING, ...(raw.billing || {}) },
          discounts: raw.discounts || DEFAULT_DISCOUNTS,
          deliverySettings: { ...DEFAULT_DELIVERY_SETTINGS, ...(raw.deliverySettings || {}) },
          paymentQrUrl: raw.paymentQrUrl || '',
          enableOnlinePayment: raw.enableOnlinePayment !== undefined ? Boolean(raw.enableOnlinePayment) : true,
          isStoreOpen: raw.isStoreOpen !== undefined ? Boolean(raw.isStoreOpen) : (config?.isActive ?? true),
          lastActiveDate: raw.lastActiveDate || '',
          autoCloseIfInactive: raw.autoCloseIfInactive !== undefined ? Boolean(raw.autoCloseIfInactive) : true,
          manualCloseReason: raw.manualCloseReason || '',
        };
      }
    } catch {
      parsedFieldsData = {
        fields: DEFAULT_FIELDS,
        tables: DEFAULT_TABLES,
        billing: DEFAULT_BILLING,
        discounts: DEFAULT_DISCOUNTS,
        deliverySettings: DEFAULT_DELIVERY_SETTINGS,
        paymentQrUrl: '',
        enableOnlinePayment: true,
        isStoreOpen: config?.isActive ?? true,
        lastActiveDate: '',
        autoCloseIfInactive: true,
        manualCloseReason: '',
      };
    }

    // Auto-record today's heartbeat (merchant active in BOS app today)
    const todayIst = getIstCurrentDateStr();
    if (parsedFieldsData.lastActiveDate !== todayIst) {
      parsedFieldsData.lastActiveDate = todayIst;
      // Persist heartbeat in background
      void db.gptformCommerceConfig.update({
        where: { id: config.id },
        data: {
          fieldsJson: JSON.stringify(parsedFieldsData),
        },
      }).catch(() => null);
    }

    let parsedHours: Record<string, any> = {};
    try {
      if (config.businessHoursJson) parsedHours = JSON.parse(config.businessHoursJson);
    } catch {}

    let parsedDeliveryAreas: string[] = [];
    try {
      if (config.deliveryAreasJson) parsedDeliveryAreas = JSON.parse(config.deliveryAreasJson);
    } catch {}

    const availability = computeStoreAvailability({
      isStoreOpen: parsedFieldsData.isStoreOpen,
      lastActiveDate: parsedFieldsData.lastActiveDate,
      autoCloseIfInactive: parsedFieldsData.autoCloseIfInactive,
      manualCloseReason: parsedFieldsData.manualCloseReason,
      businessHours: parsedHours,
      businessName: business.name,
    });

    return NextResponse.json({
      config: {
        ...config,
        tables: parsedFieldsData.tables,
        billing: parsedFieldsData.billing,
        discounts: parsedFieldsData.discounts,
        fields: parsedFieldsData.fields,
        deliverySettings: parsedFieldsData.deliverySettings,
        paymentQrUrl: parsedFieldsData.paymentQrUrl || '',
        enableOnlinePayment: parsedFieldsData.enableOnlinePayment,
        isStoreOpen: parsedFieldsData.isStoreOpen,
        lastActiveDate: parsedFieldsData.lastActiveDate,
        autoCloseIfInactive: parsedFieldsData.autoCloseIfInactive,
        manualCloseReason: parsedFieldsData.manualCloseReason,
        availability,
        businessHours: parsedHours,
        deliveryAreas: parsedDeliveryAreas,
      },
      business: {
        id: business.id,
        name: business.name,
        ownerName: business.ownerName || '',
        phone: business.phone || '',
        email: business.email || '',
        address: business.address || '',
        logoUrl: business.logoUrl || (parsedFieldsData.logoUrl || ''),
        currency: business.currency || 'INR',
        currencySymbol: business.currencySymbol || '₹',
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

    // 1. Update business profile fields on db.aiBusiness if supplied
    const businessUpdates: Record<string, any> = {};
    if (body.businessName !== undefined) businessUpdates.name = String(body.businessName).trim();
    if (body.name !== undefined) businessUpdates.name = String(body.name).trim();
    if (body.ownerName !== undefined) businessUpdates.ownerName = String(body.ownerName).trim();
    if (body.phone !== undefined) businessUpdates.phone = String(body.phone).trim();
    if (body.email !== undefined) businessUpdates.email = String(body.email).trim();
    if (body.address !== undefined) businessUpdates.address = String(body.address).trim();
    if (body.logoUrl !== undefined) businessUpdates.logoUrl = body.logoUrl ? String(body.logoUrl) : null;
    if (body.currency !== undefined) businessUpdates.currency = String(body.currency);
    if (body.currencySymbol !== undefined) businessUpdates.currencySymbol = String(body.currencySymbol);

    if (Object.keys(businessUpdates).length > 0) {
      await db.aiBusiness.update({
        where: { id: business.id },
        data: businessUpdates,
      });
    }

    let config = await db.gptformCommerceConfig.findFirst({
      where: { businessId: business.id },
    });

    // Existing fields container
    let container: any = {
      fields: DEFAULT_FIELDS,
      tables: DEFAULT_TABLES,
      billing: DEFAULT_BILLING,
      discounts: DEFAULT_DISCOUNTS,
      deliverySettings: DEFAULT_DELIVERY_SETTINGS,
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
            deliverySettings: { ...DEFAULT_DELIVERY_SETTINGS, ...(raw.deliverySettings || {}) },
            logoUrl: raw.logoUrl,
            paymentQrUrl: raw.paymentQrUrl,
            enableOnlinePayment: raw.enableOnlinePayment,
            isStoreOpen: raw.isStoreOpen !== undefined ? Boolean(raw.isStoreOpen) : (config?.isActive ?? true),
            lastActiveDate: raw.lastActiveDate || '',
            autoCloseIfInactive: raw.autoCloseIfInactive !== undefined ? Boolean(raw.autoCloseIfInactive) : true,
            manualCloseReason: raw.manualCloseReason || '',
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
    if (body.billing !== undefined) container.billing = { ...container.billing, ...body.billing };
    if (body.enableGst !== undefined) container.billing = { ...container.billing, enableGst: Boolean(body.enableGst) };
    if (body.taxRate !== undefined) container.billing = { ...container.billing, taxRate: Number(body.taxRate) };
    if (body.taxType !== undefined) container.billing = { ...container.billing, taxType: String(body.taxType) };
    if (body.gstin !== undefined) container.billing = { ...container.billing, gstin: String(body.gstin) };
    if (body.discounts !== undefined) container.discounts = body.discounts;
    if (body.logoUrl !== undefined) container.logoUrl = body.logoUrl;
    if (body.paymentQrUrl !== undefined) container.paymentQrUrl = body.paymentQrUrl;
    if (body.enableOnlinePayment !== undefined) container.enableOnlinePayment = Boolean(body.enableOnlinePayment);
    if (body.deliverySettings !== undefined) {
      container.deliverySettings = { ...container.deliverySettings, ...body.deliverySettings };
    }
    if (body.isStoreOpen !== undefined) container.isStoreOpen = Boolean(body.isStoreOpen);
    if (body.lastActiveDate !== undefined) container.lastActiveDate = String(body.lastActiveDate);
    if (body.autoCloseIfInactive !== undefined) container.autoCloseIfInactive = Boolean(body.autoCloseIfInactive);
    if (body.manualCloseReason !== undefined) container.manualCloseReason = String(body.manualCloseReason);
    // Also accept individual delivery fields
    if (body.minOrderAmount !== undefined) container.deliverySettings.minOrderAmount = Number(body.minOrderAmount);
    if (body.deliveryCharge !== undefined) container.deliverySettings.deliveryCharge = Number(body.deliveryCharge);
    if (body.freeDeliveryAbove !== undefined) container.deliverySettings.freeDeliveryAbove = Number(body.freeDeliveryAbove);
    if (body.deliveryRadiusKm !== undefined) container.deliverySettings.deliveryRadiusKm = Number(body.deliveryRadiusKm);
    if (body.enableLocalDelivery !== undefined) container.deliverySettings.enableLocalDelivery = Boolean(body.enableLocalDelivery);
    if (body.enableStorePickup !== undefined) container.deliverySettings.enableStorePickup = Boolean(body.enableStorePickup);
    if (body.estimatedDeliveryTime !== undefined) container.deliverySettings.estimatedDeliveryTime = String(body.estimatedDeliveryTime);

    // Business hours JSON handling
    let businessHoursJsonVal: string | undefined = undefined;
    if (body.businessHoursJson !== undefined) {
      businessHoursJsonVal = typeof body.businessHoursJson === 'object' ? JSON.stringify(body.businessHoursJson) : String(body.businessHoursJson);
    } else if (body.businessHours !== undefined) {
      businessHoursJsonVal = JSON.stringify(body.businessHours);
    }

    // Delivery areas JSON handling
    let deliveryAreasJsonVal: string | undefined = undefined;
    if (body.deliveryAreasJson !== undefined) {
      deliveryAreasJsonVal = typeof body.deliveryAreasJson === 'object' ? JSON.stringify(body.deliveryAreasJson) : String(body.deliveryAreasJson);
    } else if (body.deliveryAreas !== undefined) {
      deliveryAreasJsonVal = JSON.stringify(body.deliveryAreas);
    }

    const cleanUpiId = body.upiId !== undefined ? (sanitizeUpiId(body.upiId) || null) : undefined;

    const effectiveIsActive = body.isStoreOpen !== undefined
      ? Boolean(body.isStoreOpen)
      : (body.isActive !== undefined ? Boolean(body.isActive) : undefined);

    if (!config) {
      config = await db.gptformCommerceConfig.create({
        data: {
          businessId: business.id,
          catalogJson: JSON.stringify(body.catalogJson || []),
          fieldsJson: JSON.stringify(container),
          upiId: cleanUpiId || null,
          currency: businessUpdates.currency || business.currency || 'INR',
          currencySymbol: businessUpdates.currencySymbol || business.currencySymbol || '₹',
          businessHoursJson: businessHoursJsonVal || '{}',
          deliveryAreasJson: deliveryAreasJsonVal || '[]',
          greetingMessage: body.greetingMessage || null,
          isActive: effectiveIsActive !== undefined ? effectiveIsActive : true,
        },
      });
    } else {
      config = await db.gptformCommerceConfig.update({
        where: { id: config.id },
        data: {
          ...(body.catalogJson !== undefined ? { catalogJson: JSON.stringify(body.catalogJson) } : {}),
          fieldsJson: JSON.stringify(container),
          ...(cleanUpiId !== undefined ? { upiId: cleanUpiId } : {}),
          ...(deliveryAreasJsonVal !== undefined ? { deliveryAreasJson: deliveryAreasJsonVal } : {}),
          ...(businessHoursJsonVal !== undefined ? { businessHoursJson: businessHoursJsonVal } : {}),
          ...(body.greetingMessage !== undefined ? { greetingMessage: body.greetingMessage } : {}),
          ...(effectiveIsActive !== undefined ? { isActive: effectiveIsActive } : {}),
        },
      });
    }

    let parsedHours: Record<string, any> = {};
    try {
      if (config.businessHoursJson) parsedHours = JSON.parse(config.businessHoursJson);
    } catch {}

    const availability = computeStoreAvailability({
      isStoreOpen: container.isStoreOpen !== undefined ? Boolean(container.isStoreOpen) : (config.isActive ?? true),
      lastActiveDate: container.lastActiveDate,
      autoCloseIfInactive: container.autoCloseIfInactive !== undefined ? Boolean(container.autoCloseIfInactive) : true,
      manualCloseReason: container.manualCloseReason || '',
      businessHours: parsedHours,
      businessName: businessUpdates.name || business.name,
    });

    return NextResponse.json({
      config: {
        ...config,
        tables: container.tables,
        billing: container.billing,
        discounts: container.discounts,
        fields: container.fields,
        deliverySettings: container.deliverySettings,
        paymentQrUrl: container.paymentQrUrl || '',
        enableOnlinePayment: container.enableOnlinePayment,
        isStoreOpen: container.isStoreOpen,
        lastActiveDate: container.lastActiveDate,
        autoCloseIfInactive: container.autoCloseIfInactive,
        manualCloseReason: container.manualCloseReason,
        availability,
        businessHours: parsedHours,
      },
      business: {
        id: business.id,
        name: businessUpdates.name || business.name,
        ownerName: businessUpdates.ownerName !== undefined ? businessUpdates.ownerName : business.ownerName,
        phone: businessUpdates.phone !== undefined ? businessUpdates.phone : business.phone,
        email: businessUpdates.email !== undefined ? businessUpdates.email : business.email,
        address: businessUpdates.address !== undefined ? businessUpdates.address : business.address,
        logoUrl: businessUpdates.logoUrl !== undefined ? businessUpdates.logoUrl : business.logoUrl,
      },
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

const DEFAULT_DELIVERY_SETTINGS = {
  minOrderAmount: 200,
  deliveryCharge: 30,
  freeDeliveryAbove: 500,
  deliveryRadiusKm: 5,
  enableLocalDelivery: true,
  enableStorePickup: true,
  estimatedDeliveryTime: '30 - 45 minutes',
};

const DEFAULT_TABLES = [
  { id: 'tbl_1', name: 'Table 1', capacity: 4, section: 'Main Floor' },
  { id: 'tbl_2', name: 'Table 2', capacity: 4, section: 'Main Floor' },
  { id: 'tbl_3', name: 'Table 3', capacity: 2, section: 'Main Floor' },
  { id: 'tbl_4', name: 'Table 4', capacity: 6, section: 'Outdoor Patio' },
  { id: 'tbl_5', name: 'Table 5', capacity: 4, section: 'Outdoor Patio' },
];

const DEFAULT_BILLING = {
  enableGst: false,
  taxRate: 0,
  taxName: 'GST',
  taxType: 'inclusive',
  serviceChargeRate: 0,
  gstin: '',
  billFooterText: 'Thank you for shopping with us! Please visit again.',
};

const DEFAULT_DISCOUNTS = [
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

/**
 * BGOS Public Business Card — lead / quote / callback inquiry endpoint.
 *
 * POST /api/public/business/[slug]/inquiry
 *
 * Captures an unauthenticated inquiry from the standalone white-label
 * BGOS business card (/b/[slug]), links or creates the CRM Customer record,
 * inserts a Lead with source `'bgos_business_page'`, and notifies the business
 * owner via email + in-app + push + WhatsApp.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { notifyOwner } from '@/lib/owner-notifications';
import { parseBgosProducts } from '@/lib/bgos-store-catalog';
import { formatOrderNumber, resolveOrderItemsForSubmission } from '@/lib/bgos-orders';

export const runtime = 'nodejs';

const RATE_LIMIT = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 15;

const orderItemSchema = z.object({
  productId: z.string().trim().max(120).optional(),
  name: z.string().trim().min(1).max(160),
  quantity: z.number().int().min(1).max(99),
  unitPrice: z.number().min(0).max(10_000_000).nullable().optional(),
});

const inquirySchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name').max(160),
  phone: z.string().trim().min(7, 'Please enter a valid phone number').max(40),
  email: z
    .string()
    .trim()
    .email('Please enter a valid email address')
    .optional()
    .or(z.literal('')),
  serviceId: z.string().trim().max(120).optional(),
  serviceName: z.string().trim().max(160).optional(),
  address: z.string().trim().max(300).optional(),
  message: z.string().trim().max(2000).optional(),
  order: z
    .object({
      fulfillment: z.enum(['pickup', 'delivery', 'food_order', 'in_store']).optional(),
      notes: z.string().trim().max(1000).optional(),
      items: z.array(orderItemSchema).min(1).max(50),
    })
    .optional(),
});

function getVisitorFingerprint(req: NextRequest): string {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  const ua = req.headers.get('user-agent') || 'unknown';
  let hash = 0;
  const raw = `${ip}:${ua}`;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
  }
  return `bgos_inq_${Math.abs(hash).toString(36)}`;
}

function checkRateLimit(fp: string): boolean {
  const now = Date.now();
  const entry = RATE_LIMIT.get(fp);
  if (!entry || entry.resetAt < now) {
    RATE_LIMIT.set(fp, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const fp = getVisitorFingerprint(req);
    if (!checkRateLimit(fp)) {
      return NextResponse.json(
        { error: 'Too many inquiries sent recently. Please try again in an hour.' },
        { status: 429 },
      );
    }

    const rawBody = await req.json().catch(() => null);
    if (!rawBody || typeof rawBody !== 'object') {
      return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 });
    }

    const parsed = inquirySchema.safeParse(rawBody);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return NextResponse.json(
        { error: firstIssue?.message || 'Please check your inquiry details' },
        { status: 400 },
      );
    }

    const { name, phone, email, serviceId, serviceName, address, message, order } = parsed.data;
    const phoneDigits = phone.replace(/[^0-9]/g, '');
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      return NextResponse.json(
        { error: 'Please enter a valid 7 to 15 digit phone number' },
        { status: 400 },
      );
    }

    const tenant = await db.tenant.findFirst({
      where: {
        OR: [{ publicSlug: slug }, { slug }, { id: slug }],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        publicSlug: true,
        publicProfileEnabled: true,
        currency: true,
        country: true,
        settingsJson: true,
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    let resolvedService: { id: string; name: string; basePrice: number } | null = null;
    if (serviceId) {
      resolvedService = await db.service
        .findFirst({
          where: { id: serviceId, tenantId: tenant.id, isActive: true },
          select: { id: true, name: true, basePrice: true },
        })
        .catch(() => null);
    }

    const cleanEmail = email || undefined;
    const cleanAddress = address || undefined;
    const cleanMessage = message || undefined;
    const currency = tenant.currency || (tenant.country === 'IN' ? 'INR' : 'USD');
    const currencySymbol = currency === 'INR' ? '₹' : '$';

    const catalogProducts = order ? parseBgosProducts(tenant.settingsJson) : [];
    const resolvedOrder = order
      ? resolveOrderItemsForSubmission(order.items, catalogProducts)
      : null;
    const fulfillmentMode = order?.fulfillment || 'pickup';
    const fulfillmentLabel =
      fulfillmentMode === 'delivery'
        ? 'Local Delivery'
        : fulfillmentMode === 'food_order'
          ? 'Food Order'
          : 'Store Pickup';
    const orderItemsText = resolvedOrder
      ? resolvedOrder.items.map((item) => `${item.quantity}x ${item.name}`).join(', ')
      : '';
    const effectiveServiceName = resolvedOrder
      ? `[Order ${resolvedOrder.items.reduce((s, i) => s + i.quantity, 0)}x] ${resolvedOrder.items[0]?.name || 'Order'}${resolvedOrder.items.length > 1 ? ` +${resolvedOrder.items.length - 1} more` : ''}`.slice(0, 160)
      : resolvedService?.name || serviceName || undefined;

    let customer: { id: string; name: string; phone: string; email: string | null } | null = null;
    try {
      customer = await db.customer.findFirst({
        where: {
          tenantId: tenant.id,
          OR: [{ phone }, ...(cleanEmail ? [{ email: cleanEmail }] : [])],
        },
        select: { id: true, name: true, phone: true, email: true },
      });
      if (!customer) {
        customer = await db.customer.create({
          data: {
            name,
            phone,
            email: cleanEmail,
            address: cleanAddress,
            tenantId: tenant.id,
          },
          select: { id: true, name: true, phone: true, email: true },
        });
      }
    } catch (err) {
      console.warn('[bgos/inquiry] Customer resolve warning:', err);
    }

    const isProductOrder = Boolean(resolvedOrder || effectiveServiceName?.startsWith('[Order'));
    const title = resolvedOrder
      ? `[Product Order] ${name} — ${orderItemsText}`.slice(0, 180)
      : isProductOrder
        ? `[Product Order] ${name} — ${effectiveServiceName}`
        : `[Callback / Quote] ${name}${effectiveServiceName ? ` — ${effectiveServiceName}` : ''}`;

    const descParts: string[] = [];
    if (resolvedOrder) {
      descParts.push(
        `Items: ${resolvedOrder.items
          .map((item) =>
            `${item.quantity}x ${item.name}${item.lineTotal !== null ? ` (${currencySymbol}${item.lineTotal})` : ''}`,
          )
          .join(', ')}`,
      );
      if (resolvedOrder.totalAmount > 0) {
        descParts.push(`Order Total: ${currencySymbol}${resolvedOrder.totalAmount}`);
      }
      descParts.push(`Fulfillment: ${fulfillmentLabel}`);
      if (order?.notes?.trim()) {
        descParts.push(`Notes: ${order.notes.trim()}`);
      }
    }
    if (cleanMessage) descParts.push(cleanMessage);
    if (cleanAddress && cleanAddress !== 'Store Pickup') descParts.push(`Location: ${cleanAddress}`);
    const description = descParts.join('\n') || undefined;

    const tags = isProductOrder
      ? ['product_order', fulfillmentMode, 'order_status:pending']
      : [];
    const leadValue = resolvedOrder ? resolvedOrder.totalAmount : resolvedService?.basePrice || 0;

    const lead = await db.lead.create({
      data: {
        title,
        name,
        phone,
        email: cleanEmail,
        source: 'bgos_business_page',
        status: 'new',
        priority: isProductOrder ? 'high' : 'medium',
        description,
        address: cleanAddress,
        serviceType: effectiveServiceName,
        serviceId: resolvedService?.id,
        customerId: customer?.id,
        tenantId: tenant.id,
        value: leadValue,
        tagsJson: JSON.stringify(tags),
        lineItemsJson: resolvedOrder ? JSON.stringify(resolvedOrder.items) : '[]',
        notesJson: JSON.stringify([
          {
            at: new Date().toISOString(),
            by: 'system',
            ...(isProductOrder ? { type: 'order_status', orderStatus: 'pending' } : {}),
            text: isProductOrder
              ? `Product order received from BGOS storefront /b/${tenant.publicSlug || tenant.slug}.`
              : `Inquiry submitted from BGOS business page /b/${tenant.publicSlug || tenant.slug}.`,
          },
        ]),
      },
    });

    const orderNumber = isProductOrder ? formatOrderNumber(lead.id) : undefined;

    const summaryLines = [
      isProductOrder ? `New Product Order (${orderNumber}) for ${tenant.name}:` : `New inquiry for ${tenant.name}:`,
      `Customer: ${name}`,
      `Phone: ${phone}`,
      cleanEmail ? `Email: ${cleanEmail}` : null,
      resolvedOrder ? `Items: ${orderItemsText}` : effectiveServiceName ? `Service: ${effectiveServiceName}` : null,
      resolvedOrder && resolvedOrder.totalAmount > 0 ? `Total: ${currencySymbol}${resolvedOrder.totalAmount}` : null,
      resolvedOrder ? `Fulfillment: ${fulfillmentLabel}` : null,
      cleanAddress && cleanAddress !== 'Store Pickup' ? `Address: ${cleanAddress}` : null,
      order?.notes?.trim() ? `Notes: ${order.notes.trim()}` : cleanMessage ? `Message: ${cleanMessage}` : null,
    ].filter(Boolean) as string[];

    const emailHtml = `
      <h2 style="margin:0 0 12px 0;color:#0f172a;font-size:18px;">${isProductOrder ? `New Product Order (${escapeHtml(orderNumber || '')})` : 'New Inquiry from Your Business Page'}</h2>
      <p style="margin:0 0 16px 0;color:#475569;">${isProductOrder ? 'A customer placed an order on your BGOS storefront.' : 'A customer requested a quote/callback on your BGOS business page.'}</p>
      <table style="border-collapse:collapse;width:100%;max-width:520px;font-size:14px;">
        <tr><td style="padding:6px 0;color:#64748b;width:130px;">Customer</td><td style="padding:6px 0;color:#0f172a;font-weight:600;">${escapeHtml(name)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Phone</td><td style="padding:6px 0;color:#0f172a;font-weight:600;">${escapeHtml(phone)}</td></tr>
        ${cleanEmail ? `<tr><td style="padding:6px 0;color:#64748b;">Email</td><td style="padding:6px 0;color:#0f172a;">${escapeHtml(cleanEmail)}</td></tr>` : ''}
        ${resolvedOrder ? `<tr><td style="padding:6px 0;color:#64748b;">Items</td><td style="padding:6px 0;color:#0f172a;">${escapeHtml(orderItemsText)}</td></tr>` : effectiveServiceName ? `<tr><td style="padding:6px 0;color:#64748b;">Service</td><td style="padding:6px 0;color:#0f172a;">${escapeHtml(effectiveServiceName)}</td></tr>` : ''}
        ${resolvedOrder && resolvedOrder.totalAmount > 0 ? `<tr><td style="padding:6px 0;color:#64748b;">Order Total</td><td style="padding:6px 0;color:#0f172a;font-weight:600;">${escapeHtml(`${currencySymbol}${resolvedOrder.totalAmount}`)}</td></tr>` : ''}
        ${cleanAddress ? `<tr><td style="padding:6px 0;color:#64748b;">Location</td><td style="padding:6px 0;color:#0f172a;">${escapeHtml(cleanAddress)}</td></tr>` : ''}
      </table>
      ${cleanMessage ? `<p style="margin:16px 0 4px 0;font-weight:600;color:#0f172a;">Details:</p><p style="margin:0;color:#475569;white-space:pre-wrap;">${escapeHtml(cleanMessage)}</p>` : ''}
    `;

    notifyOwner(tenant.id, {
      eventType: 'lead.created',
      eventLabel: isProductOrder ? `New Product Order ${orderNumber}` : 'New Business Page Inquiry',
      leadId: lead.id,
      customerId: customer?.id,
      actionUrl: '/leads',
      whatsappMessage: summaryLines.join('\n'),
      smsMessage: false,
      emailSubject: isProductOrder
        ? `New Order ${orderNumber} from ${name} — ${tenant.name}`
        : `New Inquiry from ${name} — ${tenant.name}`,
      emailText: summaryLines.join('\n'),
      emailHtml,
      pushTitle: isProductOrder ? `New Order ${orderNumber}: ${name}` : `New Inquiry: ${name}`,
      pushBody: isProductOrder
        ? `${name}: ${orderItemsText}${resolvedOrder && resolvedOrder.totalAmount > 0 ? ` (${currencySymbol}${resolvedOrder.totalAmount})` : ''}`
        : `${name} (${phone})${effectiveServiceName ? ` asked about ${effectiveServiceName}` : ''}`,
    }).catch((err) => {
      console.error('[bgos/inquiry] notifyOwner failed:', err);
    });

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      orderNumber: orderNumber || null,
      totalAmount: leadValue,
      currency,
      customerId: customer?.id || null,
      message: isProductOrder
        ? `Order ${orderNumber} received! ${tenant.name} will confirm shortly.`
        : `Thank you! ${tenant.name} received your request and will contact you shortly.`,
    });
  } catch (err) {
    console.error('[bgos/inquiry] Error:', err);
    return NextResponse.json(
      { error: 'Unable to submit your inquiry right now. Please try again.' },
      { status: 500 },
    );
  }
}

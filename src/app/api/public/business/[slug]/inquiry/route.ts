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

export const runtime = 'nodejs';

const RATE_LIMIT = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX = 15;

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

    const { name, phone, email, serviceId, serviceName, address, message } = parsed.data;
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
    const effectiveServiceName = resolvedService?.name || serviceName || undefined;

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

    const title = `[Callback / Quote] ${name}${effectiveServiceName ? ` — ${effectiveServiceName}` : ''}`;
    const descParts: string[] = [];
    if (cleanMessage) descParts.push(cleanMessage);
    if (cleanAddress) descParts.push(`Location: ${cleanAddress}`);
    const description = descParts.join('\n\n') || undefined;

    const lead = await db.lead.create({
      data: {
        title,
        name,
        phone,
        email: cleanEmail,
        source: 'bgos_business_page',
        status: 'new',
        priority: 'medium',
        description,
        address: cleanAddress,
        serviceType: effectiveServiceName,
        serviceId: resolvedService?.id,
        customerId: customer?.id,
        tenantId: tenant.id,
        value: resolvedService?.basePrice || 0,
        notesJson: JSON.stringify([
          {
            at: new Date().toISOString(),
            by: 'system',
            text: `Inquiry submitted from BGOS business page /b/${tenant.publicSlug || tenant.slug}.`,
          },
        ]),
      },
    });

    const summaryLines = [
      `New inquiry for ${tenant.name}:`,
      `Name: ${name}`,
      `Phone: ${phone}`,
      cleanEmail ? `Email: ${cleanEmail}` : null,
      effectiveServiceName ? `Service: ${effectiveServiceName}` : null,
      cleanAddress ? `Address: ${cleanAddress}` : null,
      cleanMessage ? `Message: ${cleanMessage}` : null,
    ].filter(Boolean) as string[];

    const emailHtml = `
      <h2 style="margin:0 0 12px 0;color:#0f172a;font-size:18px;">New Inquiry from Your Business Page</h2>
      <p style="margin:0 0 16px 0;color:#475569;">A customer requested a quote/callback on your BGOS business page.</p>
      <table style="border-collapse:collapse;width:100%;max-width:520px;font-size:14px;">
        <tr><td style="padding:6px 0;color:#64748b;width:130px;">Customer</td><td style="padding:6px 0;color:#0f172a;font-weight:600;">${escapeHtml(name)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;">Phone</td><td style="padding:6px 0;color:#0f172a;font-weight:600;">${escapeHtml(phone)}</td></tr>
        ${cleanEmail ? `<tr><td style="padding:6px 0;color:#64748b;">Email</td><td style="padding:6px 0;color:#0f172a;">${escapeHtml(cleanEmail)}</td></tr>` : ''}
        ${effectiveServiceName ? `<tr><td style="padding:6px 0;color:#64748b;">Service</td><td style="padding:6px 0;color:#0f172a;">${escapeHtml(effectiveServiceName)}</td></tr>` : ''}
        ${cleanAddress ? `<tr><td style="padding:6px 0;color:#64748b;">Location</td><td style="padding:6px 0;color:#0f172a;">${escapeHtml(cleanAddress)}</td></tr>` : ''}
      </table>
      ${cleanMessage ? `<p style="margin:16px 0 4px 0;font-weight:600;color:#0f172a;">Details:</p><p style="margin:0;color:#475569;white-space:pre-wrap;">${escapeHtml(cleanMessage)}</p>` : ''}
    `;

    notifyOwner(tenant.id, {
      eventType: 'lead.created',
      eventLabel: 'New Business Page Inquiry',
      leadId: lead.id,
      customerId: customer?.id,
      actionUrl: '/leads',
      whatsappMessage: summaryLines.join('\n'),
      smsMessage: false,
      emailSubject: `New Inquiry from ${name} — ${tenant.name}`,
      emailText: summaryLines.join('\n'),
      emailHtml,
      pushTitle: `New Inquiry: ${name}`,
      pushBody: `${name} (${phone})${effectiveServiceName ? ` asked about ${effectiveServiceName}` : ''}`,
    }).catch((err) => {
      console.error('[bgos/inquiry] notifyOwner failed:', err);
    });

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      customerId: customer?.id || null,
      message: `Thank you! ${tenant.name} received your request and will contact you shortly.`,
    });
  } catch (err) {
    console.error('[bgos/inquiry] Error:', err);
    return NextResponse.json(
      { error: 'Unable to submit your inquiry right now. Please try again.' },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendEmail } from '@/lib/email-send';
import { BRAND } from '@/lib/brand';
import { RateLimiter, getClientIp, rateLimitResponse } from '@/lib/rate-limit';

/**
 * POST /api/au/demo-request
 *
 * Dedicated public lead capture endpoint for the Australian Landing Page.
 * Captures tradie demo bookings, notifies the sales team, and optionally
 * creates a lead record in the CRM.
 */

const demoLimiter = new RateLimiter(15 * 60 * 1000, 10);

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = demoLimiter.check(ip);
  if (!rl.success) {
    return rateLimitResponse(rl.resetAtMs);
  }

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const phone = String(body.phone || '').trim();
    const businessName = String(body.businessName || '').trim();
    const trade = String(body.trade || 'General Trade').trim();
    const teamSize = String(body.teamSize || '1-5').trim();
    const notes = String(body.notes || '').trim();

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required.' },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid work email address.' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const leadRef = `AU-DEMO-${Date.now().toString(36).toUpperCase()}`;

    // 1. Try to record in db.lead if the demo or default tenant exists
    try {
      const demoTenant = await db.tenant.findFirst({
        where: {
          OR: [
            { slug: 'abc-plumbing-demo' },
            { isPlatformDefault: true },
          ],
        },
      });

      if (demoTenant) {
        await db.lead.create({
          data: {
            name,
            email,
            phone: phone || 'N/A',
            source: 'au_landing_page',
            status: 'new',
            priority: 'high',
            serviceType: trade,
            description: `AU Demo Booking\nBusiness: ${businessName || 'Not specified'}\nTeam Size: ${teamSize}\nRef: ${leadRef}\nNotes: ${notes || 'None'}`,
            tenantId: demoTenant.id,
            tagsJson: JSON.stringify(['AU-Tradie', 'Demo-Request', trade]),
          },
        });
      }
    } catch (dbErr) {
      console.warn('[AUDemoRequest] Database lead record notice (non-fatal):', dbErr);
    }

    // 2. Email internal sales team
    const internalHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #0f172a;">
        <div style="background: linear-gradient(135deg, #059669, #022c22); padding: 20px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 20px;">🇦🇺 New Australian Tradie Demo Request</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 4px 0 0; font-size: 13px;">Ref: ${leadRef}</p>
        </div>
        <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 8px 0; font-weight: 600; width: 140px; color: #64748b;">Full Name</td><td style="padding: 8px 0; font-weight: bold;">${escapeHtml(name)}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 600; color: #64748b;">Email</td><td style="padding: 8px 0;"><a href="mailto:${escapeHtml(email)}" style="color: #059669;">${escapeHtml(email)}</a></td></tr>
            <tr><td style="padding: 8px 0; font-weight: 600; color: #64748b;">Phone</td><td style="padding: 8px 0;">${escapeHtml(phone || 'Not provided')}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 600; color: #64748b;">Business Name</td><td style="padding: 8px 0;">${escapeHtml(businessName || 'Not provided')}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 600; color: #64748b;">Trade</td><td style="padding: 8px 0; color: #059669; font-weight: 600;">${escapeHtml(trade)}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 600; color: #64748b;">Team Size</td><td style="padding: 8px 0;">${escapeHtml(teamSize)}</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 600; color: #64748b;">Submitted Time</td><td style="padding: 8px 0;">${now} (UTC)</td></tr>
            <tr><td style="padding: 8px 0; font-weight: 600; color: #64748b;">IP Address</td><td style="padding: 8px 0;">${escapeHtml(ip)}</td></tr>
          </table>
          ${notes ? `
            <div style="margin-top: 16px; padding: 12px; background: white; border: 1px solid #e2e8f0; border-radius: 6px;">
              <strong style="color: #64748b; font-size: 12px;">Notes:</strong>
              <p style="margin: 4px 0 0; font-size: 14px;">${escapeHtml(notes)}</p>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    await sendEmail({
      to: BRAND.emails.sales,
      subject: `[AU Demo Lead] ${trade} — ${name} (${businessName || 'Tradie'})`,
      html: internalHtml,
      text: `New Australian Demo Request:\nName: ${name}\nEmail: ${email}\nPhone: ${phone}\nBusiness: ${businessName}\nTrade: ${trade}\nTeam: ${teamSize}\nRef: ${leadRef}`,
      usageType: 'transactional',
    }).catch((emailErr) => {
      console.warn('[AUDemoRequest] Sales notification email error:', emailErr);
    });

    return NextResponse.json({
      success: true,
      leadRef,
      message: 'Demo request received. Our Australian team will reach out shortly!',
      demoLoginUrl: '/api/demo-login',
    });
  } catch (err) {
    console.error('[AUDemoRequest] Error processing demo request:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred while booking your demo.' },
      { status: 500 }
    );
  }
}

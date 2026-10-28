import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { sendWhatsAppMessage } from '@/lib/whatsapp-send';
import { logActivity } from '@/lib/activity-log';

/**
 * POST /api/reviews/request
 * Send Google review request invites via WhatsApp to customers from recent
 * completed jobs. This makes the "Request Reviews" + "Automate Review Requests"
 * features REAL — invites go out through the workspace's connected WhatsApp
 * provider (CommunicationProvider → Credential → env fallback chain).
 *
 * Body:
 *   reviewLink?: string   — direct 1-tap Google review link
 *   businessName?: string — display name used in the message
 *   includeDirectLink?: boolean
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const includeDirectLink = body.includeDirectLink !== false;

    // Resolve the workspace review link (tenant.googlePlaceId based) as fallback
    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: {
        name: true,
        googlePlaceId: true,
        googleBusinessProfileUrl: true,
        settingsJson: true,
      },
    });

    let reviewLink: string =
      typeof body.reviewLink === 'string' && body.reviewLink.startsWith('http')
        ? body.reviewLink
        : '';
    if (!reviewLink && tenant?.googleBusinessProfileUrl) {
      reviewLink = tenant.googleBusinessProfileUrl;
    }
    if (!reviewLink && tenant?.googlePlaceId) {
      reviewLink = `https://search.google.com/local/writereview?placeid=${tenant.googlePlaceId}`;
    }

    const businessName: string =
      typeof body.businessName === 'string' && body.businessName.trim()
        ? body.businessName.trim()
        : tenant?.name || 'our team';

    if (!reviewLink) {
      return NextResponse.json(
        {
          error:
            'No Google review link available yet. Connect your Google Business Profile (1-Click Connect) so BGOS can build your direct review link, or share your QR code from the Overview tab.',
          code: 'NO_REVIEW_LINK',
        },
        { status: 400 },
      );
    }

    // Recipients: customers from completed jobs (last 30 days) with a phone number.
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const completedBookings = await db.booking.findMany({
      where: {
        tenantId: user.tenantId,
        status: 'completed',
        customerPhone: { not: null },
        OR: [{ completedAt: { gte: since } }, { scheduledAt: { gte: since } }],
      },
      select: { id: true, customerName: true, customerPhone: true },
      orderBy: [{ completedAt: 'desc' }, { scheduledAt: 'desc' }],
      take: 200,
    });

    // Dedupe by phone
    const byPhone = new Map<string, string | null>();
    for (const b of completedBookings) {
      if (b.customerPhone && !byPhone.has(b.customerPhone)) {
        byPhone.set(b.customerPhone, b.customerName || null);
      }
    }

    if (byPhone.size === 0) {
      return NextResponse.json(
        {
          error:
            'No completed jobs with customer phone numbers in the last 30 days. Add customers with phone numbers to your bookings, or share your review link / QR code directly.',
          code: 'NO_RECIPIENTS',
          sentCount: 0,
        },
        { status: 400 },
      );
    }

    let sentCount = 0;
    const failures: Array<{ phone: string; error: string }> = [];

    for (const [phone, customerName] of byPhone) {
      const firstName = (customerName || 'there').split(' ')[0];
      const message = `Hi ${firstName}, thank you for choosing ${businessName}! If you were happy with our service, could you take 30 seconds to leave us a quick Google review? It helps other locals find us.${includeDirectLink ? `\n${reviewLink}` : ''}`;

      try {
        const result = await sendWhatsAppMessage({
          to: phone,
          message,
          type: 'text',
          tenantId: user.tenantId || undefined,
        });
        if (result.success) {
          sentCount++;
        } else {
          failures.push({ phone, error: result.error || 'Send failed' });
        }
      } catch (err: unknown) {
        failures.push({
          phone,
          error: err instanceof Error ? err.message : 'Send failed',
        });
      }
    }

    if (sentCount > 0) {
      await logActivity({
        tenantId: user.tenantId,
        actorId: user.id,
        actorType: 'user',
        action: 'create',
        entityType: 'review_request',
        entityId: `review-request-${Date.now()}`,
        entityName: businessName,
        description: `Sent ${sentCount} Google review request(s) via WhatsApp.`,
        severity: 'info',
      }).catch(() => {});
    }

    if (sentCount === 0) {
      const firstError = failures[0]?.error || 'WhatsApp provider is not configured';
      return NextResponse.json(
        {
          error: `Could not send review requests: ${firstError}. Connect WhatsApp in Settings → Channels, or share your review link / QR code directly.`,
          code: 'SEND_FAILED',
          sentCount: 0,
          failures: failures.slice(0, 5),
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      sentCount,
      failedCount: failures.length,
      recipients: byPhone.size,
      message: `Review requests sent to ${sentCount} customer${sentCount === 1 ? '' : 's'} via WhatsApp${failures.length > 0 ? ` (${failures.length} failed).` : '.'}`,
      failures: failures.slice(0, 5),
    });
  } catch (error: unknown) {
    console.error('Error sending review requests:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send review requests' },
      { status: 500 },
    );
  }
}

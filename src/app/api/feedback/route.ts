import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { logActivity } from '@/lib/activity-log';

/**
 * POST /api/feedback
 * ─────────────────────────────────────────────────────────────────────────
 * Receive a feedback message from an authenticated mobile app user.
 *
 * Body: { message: string, userId?: string }
 *
 * Auth: any authenticated tenant user (owner/staff/admin). Customer accounts
 * are rejected — they should use the public /api/contact-us flow instead.
 *
 * Storage: there is no dedicated Feedback table in the Prisma schema, so we
 * persist a single ActivityLog row with action="feedback" + entityType=
 * "feedback" so the message is queryable in the audit log alongside every
 * other tenant action. The raw message text is stored in description (full
 * text) and a truncated copy in entityName for the audit list view.
 */

const MAX_MESSAGE_LENGTH = 5000;
const MIN_MESSAGE_LENGTH = 1;

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (user.role === 'customer') {
      return NextResponse.json(
        { error: 'Not available for customer accounts. Use /api/contact-us instead.' },
        { status: 403 },
      );
    }
    const tenantId = user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'No workspace selected.' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const userIdFromClient =
      typeof body.userId === 'string' && body.userId ? body.userId : user.id;

    if (message.length < MIN_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: 'Message cannot be empty.' },
        { status: 400 },
      );
    }
    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Message exceeds ${MAX_MESSAGE_LENGTH} characters.` },
        { status: 413 },
      );
    }

    // Persist as an ActivityLog row so the feedback is queryable in the audit log.
    // Non-fatal: if the ActivityLog write fails (e.g. DB hiccup), we still
    // want to surface a thank-you to the user — log + move on.
    try {
      await logActivity({
        tenantId,
        actorId: userIdFromClient,
        actorName: user.name ?? user.email,
        actorType: 'user',
        action: 'feedback',
        entityType: 'feedback',
        entityId: null,
        entityName: message.slice(0, 120),
        description: message,
        metadataJson: JSON.stringify({
          source: 'mobile_app',
          userAgent: request.headers.get('user-agent') || null,
        }),
        severity: 'info',
      });
    } catch (err) {
      console.error('[feedback] logActivity failed:', err);
    }

    return NextResponse.json({ success: true, message: 'Thank you for your feedback!' });
  } catch (error) {
    console.error('[POST /api/feedback] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit feedback' },
      { status: 500 },
    );
  }
}

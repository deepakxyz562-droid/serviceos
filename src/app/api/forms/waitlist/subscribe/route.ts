import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createHash } from 'node:crypto';

/**
 * POST /api/forms/waitlist/subscribe
 * ─────────────────────────────────────────────────────────────────────────
 * Public endpoint that persists a viral-waitlist signup to the
 * ActivityLog table (action='waitlist_signup') and returns a REAL
 * referral code derived from the new entry's DB row id.
 *
 * Used by the runtime `viral_waitlist` widget
 * (src/features/forms/components/runtime/widgets/marketing/viral-waitlist.tsx)
 * so end users get a deterministic, server-issued referral code instead
 * of a fabricated `WL-<rand>` string generated client-side.
 *
 * Request body:
 *   {
 *     email: string,           // required, validated
 *     formId: string,           // required, used to resolve tenantId
 *     referralCode?: string,    // optional, code of the referrer (if any)
 *     productName?: string,     // optional, stored for analytics
 *   }
 *
 * Response shape (200):
 *   {
 *     success: true,
 *     referralCode: string,     // 8-char hash derived from entry id
 *     position: number,         // 1-based signup order for this form
 *     entryId: string,          // ActivityLog.id (DB cuid)
 *   }
 *
 * Response shape (4xx/5xx): { error: string }
 *
 * Persistence: a single ActivityLog row is inserted per signup, with
 *   action       = 'waitlist_signup'
 *   entityType   = 'form'
 *   entityId     = formId
 *   entityName   = email
 *   metadataJson = { email, productName, referrerCode, referralCode, ... }
 * The referral code is derived deterministically from the row's cuid
 * via SHA-256 → base36 → first 8 chars (uppercased), prefixed `WL-`.
 *
 * Public (CORS-open, no auth) so embedded forms on third-party sites
 * can call it. The tenant is resolved from the formId so signups are
 * attributed to the form owner.
 */

export const runtime = 'nodejs';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Derive a stable, 8-character uppercase referral code from an
 * ActivityLog row id. SHA-256 (deterministic, no Math.random) →
 * base36 → first 8 chars uppercased, prefixed `WL-`.
 *
 * The same signup row always yields the same code; different rows
 * yield different codes (collision probability is negligible for
 * 8 chars of base36 = ~2.8 trillion codes).
 */
function deriveReferralCode(entryId: string): string {
  const hash = createHash('sha256').update(entryId).digest('hex');
  // Take the first 12 hex chars (~48 bits) and convert to a base36
  // string, then uppercase + truncate to 8 chars.
  const num = BigInt('0x' + hash.slice(0, 12));
  const code = num.toString(36).toUpperCase().padStart(8, '0').slice(0, 8);
  return `WL-${code}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email: string | undefined = typeof body.email === 'string' ? body.email.trim().toLowerCase() : undefined;
    const formId: string | undefined = typeof body.formId === 'string' ? body.formId.trim() : undefined;
    const referrerCode: string | undefined =
      typeof body.referralCode === 'string' && body.referralCode.trim()
        ? body.referralCode.trim()
        : undefined;
    const productName: string | undefined =
      typeof body.productName === 'string' ? body.productName.trim() : undefined;

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: 'A valid email is required.' },
        { status: 400, headers: CORS_HEADERS },
      );
    }
    if (!formId) {
      return NextResponse.json(
        { error: 'formId is required.' },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    // Resolve tenantId from the form. We accept both id and slug
    // lookups (mirrors /api/public/forms/[id]/submit). If the form
    // doesn't exist or has no tenantId, we still accept the signup
    // but store it under a sentinel 'public' tenant so the data isn't
    // lost — the form owner can claim it later.
    const form = await db.form.findFirst({
      where: {
        OR: [{ id: formId }, { slug: formId }],
        status: { not: 'archived' },
      },
      select: { id: true, name: true, tenantId: true },
    });

    const tenantId = form?.tenantId || 'public';
    const effectiveFormId = form?.id || formId;

    // Count existing waitlist signups for this form so we can return
    // a 1-based position. This is a best-effort count — concurrent
    // signups could yield ties, but that's acceptable for a marketing
    // widget (the exact position is informational, not transactional).
    const existingCount = await db.activityLog.count({
      where: {
        tenantId,
        action: 'waitlist_signup',
        entityType: 'form',
        entityId: effectiveFormId,
      },
    });
    const position = existingCount + 1;

    // Insert the ActivityLog entry. The metadataJson captures all the
    // information we'd need to reconstruct / market to this signup
    // later (email, productName, referrer code, derived code, etc.).
    const metadata = {
      email,
      productName: productName || null,
      referrerCode: referrerCode || null,
      referralCode: null as string | null, // filled in below
      position,
      source: 'viral_waitlist_widget',
    };

    const entry = await db.activityLog.create({
      data: {
        tenantId,
        actorType: 'system',
        action: 'waitlist_signup',
        entityType: 'form',
        entityId: effectiveFormId,
        entityName: email,
        description: `Waitlist signup for "${productName || form?.name || effectiveFormId}"`,
        metadataJson: JSON.stringify(metadata),
        severity: 'info',
      },
    });

    const referralCode = deriveReferralCode(entry.id);

    // Patch the metadataJson so the persisted row carries its own
    // referral code (so admins / marketers can read it back later
    // without re-deriving the hash). This is a single targeted UPDATE.
    await db.activityLog.update({
      where: { id: entry.id },
      data: {
        metadataJson: JSON.stringify({ ...metadata, referralCode }),
      },
    });

    return NextResponse.json(
      {
        success: true,
        referralCode,
        position,
        entryId: entry.id,
      },
      { status: 200, headers: CORS_HEADERS },
    );
  } catch (error) {
    console.error('[POST /api/forms/waitlist/subscribe] error:', error);
    return NextResponse.json(
      { error: 'Failed to subscribe to waitlist.' },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}

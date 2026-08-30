/**
 * verification-email.ts
 * =====================
 *
 * Email verification flow for new email/password registrations.
 *
 * SECURITY MODEL
 * --------------
 * The raw verification token is NEVER stored in the database. Only its
 * SHA-256 hash is persisted (`User.emailVerifyTokenHash`). This mirrors the
 * password-storage pattern: if the DB is compromised, the attacker cannot
 * recover valid tokens.
 *
 * Flow:
 *   1. issueVerificationToken(user):
 *        - generate raw token = crypto.randomBytes(32).toString('hex')  (64 hex chars)
 *        - hash = sha256(raw token).toString('hex')
 *        - persist hash + 24h expiry on the User row
 *        - return raw token (to be embedded in the email link)
 *
 *   2. sendVerificationEmail(user, rawToken, appUrl):
 *        - renders HTML email with link `/?verify=email&token=<rawToken>`
 *        - sends via sendEmail() with usageType='transactional', no tenantId
 *          (bypasses per-tenant email quota — these are platform-issued emails)
 *
 *   3. verifyEmailToken(rawToken):
 *        - hash = sha256(rawToken)
 *        - find User by emailVerifyTokenHash = hash
 *        - reject if not found, expired, or already verified
 *        - on success: set emailVerified=true, emailVerifiedAt=now, clear
 *          token hash + expiry (single-use)
 *        - return { ok, user } or { ok: false, error }
 *
 * EXPIRY: 24 hours (matches the recommended verification window).
 * SINGLE-USE: token hash is cleared immediately after successful verification.
 */

import { createHash, randomBytes } from 'crypto';
import { db } from '@/lib/db';
import { sendEmail } from '@/lib/email-send';
import { logger } from '@/lib/logger';
import { renderPromotionalFooter } from '@/lib/emails/promotional-footer';

const TOKEN_BYTES = 32; // 256-bit token → 64 hex chars
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate a raw verification token, hash it, persist the hash + 24h expiry
 * on the user, and return the raw token. The caller is responsible for
 * sending the email containing the raw token.
 *
 * If the user already has a pending (non-expired) token, it is replaced.
 */
export async function issueVerificationToken(userId: string): Promise<string> {
  const rawToken = randomBytes(TOKEN_BYTES).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  try {
    await db.user.update({
      where: { id: userId },
      data: {
        emailVerifyTokenHash: tokenHash,
        emailVerifyTokenExpiresAt: expiresAt,
      },
    });
  } catch (updateErr) {
    logger.warn(
      { component: 'email-verification', userId, err: updateErr },
      'db.user.update threw in issueVerificationToken — trying direct Supabase REST fallback',
    );
    try {
      const { getSupabaseAdmin } = await import('@/lib/supabase-db');
      const adminClient = getSupabaseAdmin();
      const { error: directError } = await adminClient
        .from('User')
        .update({
          emailVerifyTokenHash: tokenHash,
          emailVerifyTokenExpiresAt: expiresAt.toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .eq('id', userId);
      if (directError) {
        logger.error(
          { component: 'email-verification', userId, error: directError.message },
          'Direct Supabase update failed in issueVerificationToken',
        );
        throw new Error(`Failed to store verification token: ${directError.message}`);
      }
    } catch (fallbackErr) {
      logger.error(
        { component: 'email-verification', userId, err: fallbackErr },
        'Failed to issue verification token via fallback',
      );
      throw fallbackErr;
    }
  }

  return rawToken;
}

/**
 * Verify a raw token from the email link. Returns the user on success.
 *
 * Single-use: on success, clears the token hash + expiry so it can't be
 * replayed. On failure, the token remains valid until it expires (allows
 * retry if the user clicks a stale link by mistake).
 */
function parseDateMs(value: Date | string | number | null | undefined): number {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const timestamp = Date.parse(value);
    return isNaN(timestamp) ? 0 : timestamp;
  }
  return 0;
}

export async function verifyEmailToken(
  rawToken: string,
): Promise<{ ok: true; userId: string; email: string; alreadyVerified?: boolean } | { ok: false; error: string; code?: string }> {
  if (!rawToken || typeof rawToken !== 'string' || rawToken.trim().length === 0) {
    return { ok: false, error: 'Verification link is missing a valid token.', code: 'INVALID_TOKEN' };
  }

  try {
    const tokenHash = hashToken(rawToken.trim());
    let lastDbError: string | null = null;

    // Find user by token hash. Try the Prisma adapter first, then fall back
    // to a direct Supabase REST query if the adapter throws (the Supabase
    // adapter can fail on certain column lookups like emailVerifyTokenHash).
    let user: { id: string; email: string; emailVerified: boolean; emailVerifyTokenExpiresAt: Date | string | null } | null = null;

    try {
      user = await db.user.findFirst({
        where: { emailVerifyTokenHash: tokenHash },
        select: {
          id: true,
          email: true,
          emailVerified: true,
          emailVerifyTokenExpiresAt: true,
        },
      });
    } catch (findFirstErr) {
      lastDbError = findFirstErr instanceof Error ? findFirstErr.message : String(findFirstErr);
      // The Supabase adapter threw on findFirst. Try a direct Supabase REST query.
      logger.warn(
        { component: 'email-verification', tokenHashPrefix: tokenHash.substring(0, 8), err: findFirstErr },
        'db.user.findFirst threw — trying direct Supabase REST fallback for lookup',
      );

      try {
        const { getSupabaseAdmin } = await import('@/lib/supabase-db');
        const adminClient = getSupabaseAdmin();

        const { data: directUser, error: directError } = await adminClient
          .from('User')
          .select('id, email, emailVerified, emailVerifyTokenExpiresAt')
          .eq('emailVerifyTokenHash', tokenHash)
          .limit(1)
          .single();

        if (directError) {
          lastDbError = directError.message || JSON.stringify(directError);
          logger.error(
            { component: 'email-verification', supabaseError: directError.message },
            'Direct Supabase REST lookup also failed',
          );
        }

        if (directUser) {
          lastDbError = null;
          user = {
            id: directUser.id,
            email: directUser.email,
            emailVerified: directUser.emailVerified === true || directUser.emailVerified === 'true',
            emailVerifyTokenExpiresAt: directUser.emailVerifyTokenExpiresAt || null,
          };
          logger.info(
            { component: 'email-verification', userId: user.id },
            'User found via direct Supabase REST fallback',
          );
        }
      } catch (fallbackErr) {
        lastDbError = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
        logger.error(
          { component: 'email-verification', err: fallbackErr },
          'Direct Supabase REST lookup threw an exception',
        );
      }
    }

    if (!user) {
      if (lastDbError) {
        return {
          ok: false,
          error: 'Unable to verify email due to a database connection issue. Please try again in a moment.',
          code: 'DB_ERROR',
        };
      }
      return {
        ok: false,
        error: 'This verification link is invalid or has already been used. If you have already verified, please log in.',
        code: 'TOKEN_NOT_FOUND',
      };
    }

    if (user.emailVerified) {
      // Already verified — token should have been cleared. Clear it now (defensive) and return success for auto-login.
      try {
        await db.user.update({
          where: { id: user.id },
          data: { emailVerifyTokenHash: null, emailVerifyTokenExpiresAt: null },
        });
      } catch (e) {
        logger.warn({ component: 'email-verification', userId: user.id, err: e }, 'Failed to clear already-verified token (non-fatal)');
      }
      return { ok: true, userId: user.id, email: user.email, alreadyVerified: true };
    }

    const now = Date.now();
    const expiresAtMs = parseDateMs(user.emailVerifyTokenExpiresAt);
    if (expiresAtMs > 0 && expiresAtMs < now) {
      // Expired — clear the stale token so it can't be retried.
      try {
        await db.user.update({
          where: { id: user.id },
          data: { emailVerifyTokenHash: null, emailVerifyTokenExpiresAt: null },
        });
      } catch (e) {
        logger.warn({ component: 'email-verification', userId: user.id, err: e }, 'Failed to clear expired token (non-fatal)');
      }
      return {
        ok: false,
        error: 'This verification link has expired (valid for 24 hours). Please request a new verification link from the login page.',
        code: 'TOKEN_EXPIRED',
      };
    }

    // Success: mark verified + clear token (single-use).
    try {
      await db.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailVerifiedAt: new Date(),
          emailVerifyTokenHash: null,
          emailVerifyTokenExpiresAt: null,
        },
      });
    } catch (updateErr) {
      logger.error(
        { component: 'email-verification', userId: user.id, email: user.email, err: updateErr },
        'db.user.update threw during email verification',
      );
      // Fall through to the re-fetch check + Supabase fallback
    }

    // CRITICAL: Re-fetch the user to verify the update actually persisted.
    // Use try/catch + Supabase fallback (same pattern as the lookup above).
    let updatedUser: { emailVerified: boolean } | null = null;
    try {
      updatedUser = await db.user.findUnique({
        where: { id: user.id },
        select: { emailVerified: true },
      });
    } catch (refetchErr) {
      // Adapter threw on findUnique — try direct Supabase
      logger.warn({ component: 'email-verification', userId: user.id, err: refetchErr }, 'db.user.findUnique threw on re-fetch — trying Supabase');
      try {
        const { getSupabaseAdmin } = await import('@/lib/supabase-db');
        const adminClient = getSupabaseAdmin();
        const { data: recheck } = await adminClient
          .from('User')
          .select('emailVerified')
          .eq('id', user.id)
          .single();
        if (recheck) {
          updatedUser = { emailVerified: recheck.emailVerified === true || recheck.emailVerified === 'true' };
        }
      } catch (e) {
        logger.error({ component: 'email-verification', err: e }, 'Supabase re-fetch also failed');
      }
    }

    if (!updatedUser || !updatedUser.emailVerified) {
      // The Prisma/Supabase adapter update didn't persist.
      // FALLBACK: Try a direct Supabase REST API call to update the User table.
      logger.warn(
        { component: 'email-verification', userId: user.id, email: user.email },
        'Adapter update did not persist — trying direct Supabase REST fallback',
      );

      try {
        const { getSupabaseAdmin } = await import('@/lib/supabase-db');
        const adminClient = getSupabaseAdmin();

        const { error: directError } = await adminClient
          .from('User')
          .update({
            emailVerified: true,
            emailVerifiedAt: new Date().toISOString(),
            emailVerifyTokenHash: null,
            emailVerifyTokenExpiresAt: null,
            updatedAt: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (directError) {
          logger.error(
            { component: 'email-verification', userId: user.id, email: user.email, supabaseError: directError.message },
            'Direct Supabase REST fallback also failed',
          );
          return {
            ok: false,
            error: 'Unable to update verification status due to a database issue. Please try again or contact support.',
            code: 'DB_UPDATE_ERROR',
          };
        }

        // Re-fetch again to confirm the direct update persisted
        const recheckedUser = await db.user.findUnique({
          where: { id: user.id },
          select: { emailVerified: true },
        });

        if (!recheckedUser || !recheckedUser.emailVerified) {
          logger.error(
            { component: 'email-verification', userId: user.id, email: user.email },
            'Direct Supabase REST update also did not persist — emailVerified still false',
          );
          return {
            ok: false,
            error: 'Verification could not be confirmed. Please try clicking the link again.',
            code: 'DB_CONFIRMATION_ERROR',
          };
        }

        logger.info(
          { component: 'email-verification', userId: user.id, email: user.email },
          'Email verified successfully via direct Supabase REST fallback',
        );
        return { ok: true, userId: user.id, email: user.email };

      } catch (fallbackErr) {
        logger.error(
          { component: 'email-verification', userId: user.id, email: user.email, err: fallbackErr },
          'Direct Supabase REST fallback threw an exception',
        );
        return {
          ok: false,
          error: 'An unexpected database error occurred. Please try again or contact support.',
          code: 'DB_FALLBACK_EXCEPTION',
        };
      }
    }

    logger.info(
      { component: 'email-verification', userId: user.id, email: user.email },
      'Email verified successfully (confirmed via re-fetch)',
    );

    return { ok: true, userId: user.id, email: user.email };

  } catch (err) {
    logger.error(
      { component: 'email-verification', err },
      'verifyEmailToken threw an unhandled exception',
    );
    return {
      ok: false,
      error: 'Unable to verify your email. Please try again or request a new verification link.',
      code: 'UNHANDLED_ERROR',
    };
  }
}

/**
 * Send the verification email with the click-link. Mirrors the claim-emails.ts
 * pattern: transactional usageType, no tenantId (bypasses per-tenant quota).
 */
export async function sendVerificationEmail(params: {
  to: string;
  name?: string | null;
  rawToken: string;
  appUrl: string;
}): Promise<void> {
  const { to, name, rawToken, appUrl } = params;
  const verifyLink = `${appUrl}/?verify=email&token=${rawToken}`;
  const displayName = name || 'there';
  const footer = renderPromotionalFooter({ appUrl, existingUser: false });

  const html = renderVerificationEmailHtml({
    displayName,
    verifyLink,
    footerHtml: footer.html,
  });

  const result = await sendEmail({
    to,
    subject: 'Verify your email — Fieseros',
    html,
    text: `Welcome to Fieseros!\n\nPlease verify your email by visiting this link:\n${verifyLink}\n\nThis link expires in 24 hours. If you didn't sign up for Fieseros, you can safely ignore this email.\n\n${footer.text}`,
    usageType: 'transactional',
    // No tenantId — bypasses the per-tenant email quota gate. The user may
    // not even have a tenant yet at this point (registration flow).
  });

  if (!result.success) {
    logger.error(
      { component: 'email-verification', to, error: result.error },
      'Failed to send verification email',
    );
  } else {
    logger.info(
      { component: 'email-verification', to },
      'Verification email sent',
    );
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

// Inline HTML render (mirrors the claim-emails.ts inline HTML pattern, avoids
// JSX/React-render-to-string complexity in a transactional email).
function renderVerificationEmailHtml(params: {
  displayName: string;
  verifyLink: string;
  footerHtml: string;
}): string {
  const { displayName, verifyLink, footerHtml } = params;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email — Fieseros</title>
</head>
<body style="font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f1f5f9;margin:0;padding:0;width:100%">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(15,23,42,0.06),0 1px 3px rgba(15,23,42,0.04);border:1px solid #e2e8f0;max-width:600px;width:100%">
          <tr><td style="background-color:#0f766e;height:6px;line-height:6px"></td></tr>
          <tr>
            <td style="padding:32px 40px 20px;text-align:center;">
              <div style="display:inline-block;width:52px;height:52px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;line-height:52px;color:#0f766e;font-weight:700;font-size:22px;margin-bottom:12px;">&#9993;</div>
              <h1 style="color:#0f172a;font-size:24px;font-weight:700;margin:0 0 6px;letter-spacing:-0.02em;">Verify your email</h1>
              <p style="color:#64748b;font-size:14px;margin:0;">Welcome to Fieseros, ${escapeHtml(displayName)}!</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 40px 36px;color:#334155;font-size:15px;line-height:1.65;">
              <p style="margin:0 0 16px;">You're almost ready to start managing your business with Fieseros. Click the button below to verify your email address:</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
                <tr>
                  <td align="center">
                    <a href="${escapeHtml(verifyLink)}" style="display:inline-block;background-color:#0f766e;color:#ffffff;font-weight:600;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:10px;">Verify my email</a>
                  </td>
                </tr>
              </table>
              <p style="color:#64748b;font-size:13px;margin:18px 0 8px;">Or copy this link into your browser:</p>
              <p style="color:#0f766e;font-size:12px;margin:0 0 24px;word-break:break-all;font-family:monospace;background:#f8fafc;padding:10px 12px;border-radius:6px;border:1px solid #e2e8f0;">${escapeHtml(verifyLink)}</p>
              <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:12px 14px;margin-top:20px;">
                <p style="margin:0;color:#78350f;font-size:12px;line-height:1.5;">
                  <strong>This link expires in 24 hours.</strong> If you didn't create a Fieseros account, you can safely ignore this email.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 32px;">
              ${footerHtml}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

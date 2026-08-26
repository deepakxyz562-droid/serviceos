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

  await db.user.update({
    where: { id: userId },
    data: {
      emailVerifyTokenHash: tokenHash,
      emailVerifyTokenExpiresAt: expiresAt,
    },
  });

  return rawToken;
}

/**
 * Verify a raw token from the email link. Returns the user on success.
 *
 * Single-use: on success, clears the token hash + expiry so it can't be
 * replayed. On failure, the token remains valid until it expires (allows
 * retry if the user clicks a stale link by mistake).
 */
export async function verifyEmailToken(
  rawToken: string,
): Promise<{ ok: true; userId: string; email: string } | { ok: false; error: string }> {
  if (!rawToken || typeof rawToken !== 'string') {
    return { ok: false, error: 'Missing verification token.' };
  }

  const tokenHash = hashToken(rawToken);

  // Find user by token hash. The lookup is indexed (User.emailVerifyTokenHash
  // @@index). We don't use timingSafeEqual here because the DB lookup by hash
  // is constant-time-equivalent (the hash itself is the secret; an attacker
  // can't enumerate hashes without compromising the DB).
  const user = await db.user.findFirst({
    where: { emailVerifyTokenHash: tokenHash },
    select: {
      id: true,
      email: true,
      emailVerified: true,
      emailVerifyTokenExpiresAt: true,
    },
  });

  if (!user) {
    return { ok: false, error: 'Invalid or already-used verification token.' };
  }

  if (user.emailVerified) {
    // Already verified — token should have been cleared. Clear it now (defensive) and return success for auto-login.
    await db.user.update({
      where: { id: user.id },
      data: { emailVerifyTokenHash: null, emailVerifyTokenExpiresAt: null },
    });
    return { ok: true, userId: user.id, email: user.email };
  }

  const now = Date.now();
  const expiresAtMs = user.emailVerifyTokenExpiresAt?.getTime() ?? 0;
  if (expiresAtMs < now) {
    // Expired — clear the stale token so it can't be retried.
    await db.user.update({
      where: { id: user.id },
      data: { emailVerifyTokenHash: null, emailVerifyTokenExpiresAt: null },
    });
    return { ok: false, error: 'This verification link has expired. Please request a new one.' };
  }

  // Success: mark verified + clear token (single-use).
  await db.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      emailVerifiedAt: new Date(),
      emailVerifyTokenHash: null,
      emailVerifyTokenExpiresAt: null,
    },
  });

  logger.info(
    { component: 'email-verification', userId: user.id, email: user.email },
    'Email verified successfully',
  );

  return { ok: true, userId: user.id, email: user.email };
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

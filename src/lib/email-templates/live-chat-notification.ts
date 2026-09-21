/**
 * Live Chat Notification Email Template
 *
 * Sent to tenant admins when a visitor starts a new live chat session.
 * This is the email-first notification path (no SMS required) — ensures
 * the form owner knows about a chat even if Web Push permissions aren't
 * granted or the admin's browser is closed.
 *
 * Used by: /api/public/chat/session/route.ts
 */

interface ChatNotificationEmailData {
  visitorName: string | null;
  visitorEmail: string | null;
  visitorPhone: string | null;
  firstMessage: string | null;
  tenantName: string;
  sessionId: string;
  dashboardUrl: string;
  formName?: string | null;
}

export function renderLiveChatNotificationEmail(data: ChatNotificationEmailData): { subject: string; html: string; text: string } {
  const {
    visitorName,
    visitorEmail,
    visitorPhone,
    firstMessage,
    tenantName,
    dashboardUrl,
    formName,
  } = data;

  const visitorLabel = visitorName || visitorEmail || 'A visitor';
  const subject = formName
    ? `New chat from ${visitorLabel} — ${formName}`
    : `New live chat from ${visitorLabel}`;

  const text = `New live chat request

Business: ${tenantName}
Visitor: ${visitorName || 'Not provided'}
${visitorEmail ? `Email: ${visitorEmail}\n` : ''}${visitorPhone ? `Phone: ${visitorPhone}\n` : ''}${formName ? `Form: ${formName}\n` : ''}
${firstMessage ? `Message: "${firstMessage}"\n` : ''}
Open the chat to reply:
${dashboardUrl}

— ${tenantName} (powered by Fieseros)`;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0d9488 0%,#059669 100%);padding:24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:20px;font-weight:700;color:#ffffff;">
                    New Live Chat Request
                  </td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#d1fae5;margin-top:4px;">
                    ${tenantName}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#1f2937;">
                <tr>
                  <td style="padding-bottom:16px;">
                    <strong style="color:#374151;">Visitor:</strong><br/>
                    <span style="color:#6b7280;">${visitorName || 'Not provided'}</span>
                  </td>
                </tr>
                ${visitorEmail ? `
                <tr>
                  <td style="padding-bottom:16px;">
                    <strong style="color:#374151;">Email:</strong><br/>
                    <span style="color:#6b7280;">${visitorEmail}</span>
                  </td>
                </tr>` : ''}
                ${visitorPhone ? `
                <tr>
                  <td style="padding-bottom:16px;">
                    <strong style="color:#374151;">Phone:</strong><br/>
                    <span style="color:#6b7280;">${visitorPhone}</span>
                  </td>
                </tr>` : ''}
                ${formName ? `
                <tr>
                  <td style="padding-bottom:16px;">
                    <strong style="color:#374151;">Form:</strong><br/>
                    <span style="color:#6b7280;">${formName}</span>
                  </td>
                </tr>` : ''}
                ${firstMessage ? `
                <tr>
                  <td style="padding-bottom:24px;">
                    <strong style="color:#374151;">Message:</strong><br/>
                    <span style="display:block;padding:12px 16px;background-color:#f9fafb;border-left:3px solid #0d9488;border-radius:6px;color:#374151;margin-top:8px;">&ldquo;${firstMessage}&rdquo;</span>
                  </td>
                </tr>` : ''}
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display:inline-block;background-color:#0d9488;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">
                      Open Chat &amp; Reply
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size:12px;color:#9ca3af;text-align:center;margin-top:24px;">
                You received this email because a visitor started a live chat on your website.
                <br/>
                Powered by <a href="https://fieseros.com" style="color:#0d9488;text-decoration:none;">Fieseros</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

/**
 * Chat Handoff Summary Email Template
 *
 * Sent to tenant admins when the AI auto-reply escalates a chat to a human.
 * Includes an AI-generated conversation summary so the human operator can
 * pick up the chat with full context without reading the entire transcript.
 *
 * Used by: src/lib/human-handoff.ts (notifyHumanHandoff function)
 */

interface ChatHandoffSummaryEmailData {
  visitorName: string | null;
  visitorEmail: string | null;
  visitorPhone: string | null;
  tenantName: string;
  formName: string | null;
  sessionId: string;
  conversationSummary: string;
  dashboardUrl: string;
}

export function renderChatHandoffSummaryEmail(data: ChatHandoffSummaryEmailData): { subject: string; html: string; text: string } {
  const {
    visitorName,
    visitorEmail,
    visitorPhone,
    tenantName,
    formName,
    sessionId,
    conversationSummary,
    dashboardUrl,
  } = data;

  const visitorLabel = visitorName || visitorEmail || 'A visitor';
  const subject = formName
    ? `Chat escalated to you — ${visitorLabel} (${formName})`
    : `Chat escalated to you — ${visitorLabel}`;

  const text = `Live chat escalated to you

Business: ${tenantName}
Visitor: ${visitorName || 'Not provided'}
${visitorEmail ? `Email: ${visitorEmail}\n` : ''}${visitorPhone ? `Phone: ${visitorPhone}\n` : ''}${formName ? `Form: ${formName}\n` : ''}

AI-Generated Summary:
${conversationSummary}

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
            <td style="background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);padding:24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:20px;font-weight:700;color:#ffffff;">
                    Chat Escalated to You
                  </td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#fef3c7;margin-top:4px;">
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
                <tr>
                  <td style="padding-bottom:24px;">
                    <strong style="color:#374151;">AI-Generated Summary:</strong><br/>
                    <span style="display:block;padding:16px;background-color:#fef3c7;border-left:3px solid #f59e0b;border-radius:6px;color:#92400e;margin-top:8px;white-space:pre-wrap;">${conversationSummary}</span>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
                <tr>
                  <td align="center">
                    <a href="${dashboardUrl}" style="display:inline-block;background-color:#f59e0b;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 32px;border-radius:8px;">
                      Open Chat &amp; Reply
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size:12px;color:#9ca3af;text-align:center;margin-top:24px;">
                You received this email because the AI auto-reply escalated this chat to a human.
                <br/>
                Powered by <a href="https://fieseros.com" style="color:#f59e0b;text-decoration:none;">Fieseros</a>
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

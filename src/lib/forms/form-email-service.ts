import { sendEmail } from '@/lib/email-send';
import { db } from '@/lib/db';
import type { FormSchema } from '@/lib/forms/form-schema-types';

interface FormSubmissionEmailPayload {
  formTitle: string;
  tenantId: string;
  data: Record<string, unknown>;
  respondentName?: string;
  respondentEmail?: string;
  respondentPhone?: string;
  schema: FormSchema;
}

/**
 * Sends notification email to the business and optional auto-response to submitter.
 * Uses Amazon SES via `sendEmail()` with correct `Reply-To` headers.
 */
export async function sendFormSubmissionEmails(payload: FormSubmissionEmailPayload) {
  const { formTitle, tenantId, data, respondentName, respondentEmail, schema } = payload;

  try {
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, email: true },
    });

    const businessEmail = tenant?.email;
    const businessName = tenant?.name || 'Fieseros Business';

    // ── 1. Send Notification Email to Business ───────────────────────────
    if (schema.settings.actions.sendEmailNotification?.enabled) {
      const targetEmails = schema.settings.actions.sendEmailNotification.toEmails?.length
        ? schema.settings.actions.sendEmailNotification.toEmails
        : businessEmail
        ? [businessEmail]
        : [];

      if (targetEmails.length > 0) {
        const fieldsHtml = Object.entries(data)
          .map(
            ([key, value]) => `
              <div style="margin-bottom: 10px; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
                <strong style="color: #475569; font-size: 12px; text-transform: uppercase;">${key}</strong>
                <div style="color: #0f172a; font-size: 14px; margin-top: 2px;">${
                  typeof value === 'object' ? JSON.stringify(value) : String(value || '—')
                }</div>
              </div>`
          )
          .join('');

        const emailHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
            <div style="padding-bottom: 16px; border-bottom: 2px solid #059669; margin-bottom: 20px;">
              <span style="font-size: 11px; font-weight: 700; color: #059669; text-transform: uppercase; letter-spacing: 0.05em;">New Form Submission</span>
              <h2 style="margin: 4px 0 0; color: #0f172a; font-size: 20px;">${formTitle}</h2>
            </div>
            
            <div style="margin-bottom: 24px;">
              ${fieldsHtml}
            </div>

            <div style="background: #f8fafc; padding: 12px 16px; border-radius: 8px; font-size: 12px; color: #64748b; margin-top: 20px;">
              💡 <strong>Tip:</strong> Simply click <em>Reply</em> in your email app to message ${respondentName || respondentEmail || 'this customer'} directly.
            </div>
          </div>
        `;

        for (const recipient of targetEmails) {
          await sendEmail({
            to: recipient,
            from: `Fieseros Forms <notifications@fieseros.com>`,
            replyTo: respondentEmail || undefined,
            subject: `[New Lead] ${formTitle} - ${respondentName || respondentEmail || 'New Submission'}`,
            html: emailHtml,
            tenantId,
          }).catch((err) => {
            console.error('[form-email] Failed to send business notification:', err);
          });
        }
      }
    }

    // ── 2. Send Customer Auto-Response (if enabled) ───────────────────────
    if (
      schema.settings.actions.sendCustomerAutoresponse?.enabled &&
      respondentEmail
    ) {
      const autoSubject = schema.settings.actions.sendCustomerAutoresponse.subject || 'Thank you for reaching out!';
      const autoBody = schema.settings.actions.sendCustomerAutoresponse.messageBody || 'We have received your request and will contact you shortly.';

      const autoHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
          <h3 style="color: #0f172a; margin-top: 0;">${businessName}</h3>
          <p style="color: #334155; font-size: 14px; line-height: 1.6; white-space: pre-line;">${autoBody}</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0 16px;" />
          <p style="color: #94a3b8; font-size: 11px;">Sent via ${businessName}. Reply directly to this email if you have any questions.</p>
        </div>
      `;

      await sendEmail({
        to: respondentEmail,
        from: `${businessName} <notifications@fieseros.com>`,
        replyTo: businessEmail || undefined,
        subject: autoSubject,
        html: autoHtml,
        tenantId,
      }).catch((err) => {
        console.error('[form-email] Failed to send customer auto-response:', err);
      });
    }
  } catch (error) {
    console.error('[form-email-service] Error:', error);
  }
}

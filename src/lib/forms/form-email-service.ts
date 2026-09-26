import { sendEmail } from '@/lib/email-send';
import { db } from '@/lib/db';
import type { FormSchema } from '@/lib/forms/form-schema-types';

export interface FormSubmissionEmailPayload {
  formTitle: string;
  tenantId: string;
  data: Record<string, unknown>;
  respondentName?: string;
  respondentEmail?: string;
  respondentPhone?: string;
  schema: FormSchema;
  responseId?: string;
  bookingDetails?: {
    scheduledAt: Date;
    scheduledEndTime: Date;
    dateStr: string;
    slot: string;
    timezone: string;
    googleCalendarUrl?: string;
    outlookCalendarUrl?: string;
  };
}

/**
 * Sends actionable notification email to the business and optional auto-response to submitter.
 * Uses provider-agnostic `sendEmail()` with correct `Reply-To` headers, 1-click action buttons,
 * and 1-click calendar sync when an appointment slot was booked.
 */
export async function sendFormSubmissionEmails(payload: FormSubmissionEmailPayload) {
  const { formTitle, tenantId, data, respondentName, respondentEmail, respondentPhone, schema, responseId, bookingDetails } = payload;

  try {
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true, email: true },
    });

    const businessEmail = tenant?.email;
    const businessName = tenant?.name || 'Fieseros Business';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://fieseros.com';

    // ── 1. Send Actionable Notification Email to Business ──────────────────
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
              <div style="margin-bottom: 12px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
                <strong style="color: #64748b; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">${key}</strong>
                <div style="color: #0f172a; font-size: 14px; font-weight: 500; margin-top: 3px;">${
                  typeof value === 'object' ? JSON.stringify(value) : String(value || '—')
                }</div>
              </div>`
          )
          .join('');

        const bookingBannerHtml = bookingDetails ? `
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
            <div style="font-size: 11px; font-weight: 700; color: #15803d; text-transform: uppercase; letter-spacing: 0.05em;">📅 Confirmed Appointment Booked</div>
            <div style="color: #166534; font-size: 16px; font-weight: 700; margin: 4px 0 8px;">
              ${bookingDetails.dateStr} &bull; ${bookingDetails.slot} (${bookingDetails.timezone})
            </div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              ${bookingDetails.googleCalendarUrl ? `<a href="${bookingDetails.googleCalendarUrl}" target="_blank" style="display: inline-block; background: #16a34a; color: #ffffff; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; text-decoration: none; margin-right: 6px;">Add to Google Calendar</a>` : ''}
              ${bookingDetails.outlookCalendarUrl ? `<a href="${bookingDetails.outlookCalendarUrl}" target="_blank" style="display: inline-block; background: #0284c7; color: #ffffff; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; text-decoration: none;">Add to Outlook</a>` : ''}
            </div>
          </div>
        ` : '';

        const emailHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 28px; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
            <div style="padding-bottom: 16px; border-bottom: 2px solid #059669; margin-bottom: 20px;">
              <span style="font-size: 11px; font-weight: 700; color: #059669; text-transform: uppercase; letter-spacing: 0.05em;">⚡ ${bookingDetails ? 'New Appointment & Lead' : 'New Inbound Lead'}</span>
              <h2 style="margin: 6px 0 0; color: #0f172a; font-size: 22px; font-weight: 800;">${formTitle}</h2>
            </div>

            ${bookingBannerHtml}
            
            <div style="margin-bottom: 24px;">
              ${fieldsHtml}
            </div>

            <!-- Action Buttons Bar -->
            <div style="background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; margin-top: 24px;">
              <p style="margin: 0 0 12px; font-size: 12px; font-weight: 700; color: #334155; text-transform: uppercase;">Quick Actions:</p>
              <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                ${
                  respondentPhone
                    ? `<a href="tel:${respondentPhone}" style="display: inline-block; background: #059669; color: #ffffff; padding: 8px 14px; border-radius: 8px; font-size: 12px; font-weight: 600; text-decoration: none; margin-right: 6px; margin-bottom: 6px;">📞 Call (${respondentPhone})</a>`
                    : ''
                }
                <a href="${baseUrl}/app/leads" style="display: inline-block; background: #0284c7; color: #ffffff; padding: 8px 14px; border-radius: 8px; font-size: 12px; font-weight: 600; text-decoration: none; margin-right: 6px; margin-bottom: 6px;">📋 Open in CRM</a>
                <a href="${baseUrl}/app/jobs/new?customerName=${encodeURIComponent(respondentName || '')}&customerPhone=${encodeURIComponent(respondentPhone || '')}&customerEmail=${encodeURIComponent(respondentEmail || '')}" style="display: inline-block; background: #4f46e5; color: #ffffff; padding: 8px 14px; border-radius: 8px; font-size: 12px; font-weight: 600; text-decoration: none; margin-bottom: 6px;">⚡ Dispatch Job</a>
              </div>
              <p style="margin: 12px 0 0; font-size: 11px; color: #64748b;">
                💡 <strong>Direct Reply:</strong> Click <em>Reply</em> in your email client to message ${respondentName || respondentEmail || 'this customer'} directly.
              </p>
            </div>
          </div>
        `;

        for (const recipient of targetEmails) {
          await sendEmail({
            to: recipient,
            from: `Fieseros Forms <notifications@fieseros.com>`,
            replyTo: respondentEmail || undefined,
            subject: `[${bookingDetails ? 'Appointment Booked' : 'New Lead'}] ${formTitle} - ${respondentName || respondentEmail || 'New Submission'}`,
            html: emailHtml,
            tenantId,
          }).catch((err) => {
            console.error('[form-email] Failed to send business notification:', err);
          });
        }
      }
    }

    // ── 2. Send Customer Auto-Response / Appointment Confirmation ─────────
    if (
      (schema.settings.actions.sendCustomerAutoresponse?.enabled || bookingDetails) &&
      respondentEmail
    ) {
      const autoSubject = bookingDetails
        ? `Appointment Confirmed: ${formTitle} with ${businessName}`
        : schema.settings.actions.sendCustomerAutoresponse?.subject || 'Thank you for reaching out!';
      
      const autoBody = schema.settings.actions.sendCustomerAutoresponse?.messageBody || 
        (bookingDetails 
          ? `Your appointment has been confirmed! We have reserved your time on our calendar.`
          : 'We have received your request and will contact you shortly.');

      const customerCalendarHtml = bookingDetails ? `
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0;">
          <div style="font-size: 11px; font-weight: 700; color: #0284c7; text-transform: uppercase;">Your Reserved Time Slot</div>
          <div style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 4px 0 12px;">
            ${bookingDetails.dateStr} &bull; ${bookingDetails.slot} (${bookingDetails.timezone})
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${bookingDetails.googleCalendarUrl ? `<a href="${bookingDetails.googleCalendarUrl}" target="_blank" style="display: inline-block; background: #0284c7; color: #ffffff; padding: 8px 14px; border-radius: 8px; font-size: 12px; font-weight: 600; text-decoration: none; margin-right: 6px;">📅 Add to Google Calendar</a>` : ''}
            ${bookingDetails.outlookCalendarUrl ? `<a href="${bookingDetails.outlookCalendarUrl}" target="_blank" style="display: inline-block; background: #334155; color: #ffffff; padding: 8px 14px; border-radius: 8px; font-size: 12px; font-weight: 600; text-decoration: none;">📅 Add to Outlook</a>` : ''}
          </div>
        </div>
      ` : '';

      const autoHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
          <h3 style="color: #0f172a; margin-top: 0;">${businessName}</h3>
          <p style="color: #334155; font-size: 14px; line-height: 1.6; white-space: pre-line;">${autoBody}</p>
          ${customerCalendarHtml}
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0 16px;" />
          <p style="color: #94a3b8; font-size: 11px;">Sent via ${businessName}. Reply directly to this email if you have any questions or need to reschedule.</p>
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
        console.error('[form-email] Failed to send customer confirmation:', err);
      });
    }
  } catch (error) {
    console.error('[form-email-service] Error:', error);
  }
}

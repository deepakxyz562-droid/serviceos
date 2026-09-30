import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { normalizeFormSchema } from '@/lib/forms/form-schema-types';
import { sendFormSubmissionEmails } from '@/lib/forms/form-email-service';
import { checkFormSubmissionLimit, incrementTenantFormSubmissionCount } from '@/lib/plan-gate';
import {
  parseAppointmentFromSubmission,
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
} from '@/lib/scheduling/calendar-helper';
import { createAppointmentBooking } from '@/lib/scheduling/booking-service';

/**
 * POST /api/public/forms/[id]/submit
 *
 * Public endpoint to handle form submissions from hosted pages,
 * JS embed widgets, and WordPress plugins.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      data?: Record<string, unknown>;
      _hp?: string; // Honeypot field for bot protection
      source?: string;
      conversationId?: string;
    };

    // ── 1. Honeypot check for bots ─────────────────────────────────────────
    if (body._hp) {
      // Silently return success to bot without saving
      return NextResponse.json({ success: true, message: 'Submission received' });
    }

    const submissionData = body.data || {};

    // ── 2. Find Form ───────────────────────────────────────────────────────
    const trimmedId = typeof id === 'string' ? id.replace(/^-+|-+$/g, '') : id;
    const form = await db.form.findFirst({
      where: {
        OR: [
          { id },
          { id: trimmedId },
          { slug: id },
          { slug: trimmedId },
        ],
        status: { not: 'archived' },
      },
      select: {
        id: true,
        name: true,
        tenantId: true,
        schemaJson: true,
        submissionActions: true,
      },
    });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    let schema;
    try {
      schema = form.schemaJson && form.schemaJson !== '{}' ? JSON.parse(form.schemaJson) : null;
    } catch {
      schema = null;
    }
    const normalizedSchema = normalizeFormSchema(schema);

    // ── 3. Extract common respondent fields ─────────────────────────────────
    let respondentName: string | undefined;
    let respondentEmail: string | undefined;
    let respondentPhone: string | undefined;

    for (const [key, val] of Object.entries(submissionData)) {
      const lower = key.toLowerCase();
      const strVal = typeof val === 'string' ? val.trim() : '';
      if (!respondentName && (lower.includes('name') || lower === 'full_name' || lower === 'fullname')) {
        respondentName = strVal;
      }
      if (!respondentEmail && (lower.includes('email') || (strVal && strVal.includes('@')))) {
        respondentEmail = strVal;
      }
      if (!respondentPhone && (lower.includes('phone') || lower.includes('mobile') || lower.includes('tel'))) {
        respondentPhone = strVal;
      }
    }

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // ── 4. Save FormResponse in Database ───────────────────────────────────
    if (form.tenantId) {
      const subQuota = await checkFormSubmissionLimit(form.tenantId);
      if (!subQuota.ok) {
        return NextResponse.json(
          {
            error: 'This form has reached its monthly submission limit. Please contact the form owner.',
            code: 'MONTHLY_SUBMISSION_LIMIT_REACHED',
          },
          { status: 429 },
        );
      }
    }

    const response = await db.formResponse.create({
      data: {
        formId: form.id,
        tenantId: form.tenantId || null,
        workspaceId: form.workspaceId || null,
        dataJson: JSON.stringify(submissionData),
        respondent: respondentEmail || respondentPhone || 'Anonymous',
        respondentName: respondentName || null,
        source: body.source || 'direct',
      },
    });

    // Auto-increment monthly form submission count for the tenant
    if (form.tenantId) {
      incrementTenantFormSubmissionCount(form.tenantId).catch(() => {});
    }

    // Increment submissions count on form
    await db.form
      .update({
        where: { id: form.id },
        data: { submissions: { increment: 1 } },
      })
      .catch(() => {});

    // ── 5. Trigger Action Connectors (Decoupled Engine) ────────────────────

    // A. Native Appointment Engine (Calendly Alternative)
    const apt = parseAppointmentFromSubmission(submissionData, normalizedSchema);
    let createdBooking: any = null;
    let bookingDetails: any = null;

    if (apt.found && apt.scheduledAt && apt.scheduledEndTime) {
      try {
        const bookingResult = await createAppointmentBooking({
          tenantId: form.tenantId || null,
          workspaceId: form.workspaceId || null,
          formId: form.id,
          title: `${form.name} - ${respondentName || respondentEmail || 'Scheduled Appointment'}`,
          serviceName: form.name,
          date: apt.scheduledAt.toISOString(),
          durationMinutes: apt.durationMinutes || 30,
          timezone: apt.timezone || 'UTC',
          customer: {
            name: respondentName || null,
            email: respondentEmail || null,
            phone: respondentPhone || null,
          },
          notes: apt.notes || `Booked via form: ${form.name}`,
          source: 'form',
        });

        createdBooking = bookingResult.booking;
        bookingDetails = {
          scheduledAt: apt.scheduledAt,
          scheduledEndTime: apt.scheduledEndTime,
          dateStr: apt.dateStr || bookingResult.dateStr,
          slot: apt.rawSlot || bookingResult.timeStr,
          timezone: apt.timezone || 'UTC',
          googleCalendarUrl: bookingResult.calendarUrls.google,
          outlookCalendarUrl: bookingResult.calendarUrls.outlook,
        };
      } catch (bookingErr) {
        console.error('[form-submit] Failed to auto-create booking:', bookingErr);
      }
    }

    // B. Send Emails (Business Notification + Customer Auto-Response + Calendar Invites)
    if (form.tenantId) {
      sendFormSubmissionEmails({
        formTitle: form.name,
        tenantId: form.tenantId,
        data: submissionData,
        respondentName,
        respondentEmail,
        respondentPhone,
        schema: normalizedSchema,
        responseId: response.id,
        bookingDetails,
      }).catch((err) => {
        console.error('[form-submit] Email trigger error:', err);
      });
    }

    // B. Create / Update Lead in CRM & AI Intake Pipeline
    let createdLeadId: string | null = null;
    if (form.tenantId || normalizedSchema.settings.actions.createCrmLead?.enabled) {
      try {
        const leadNotes = Object.entries(submissionData)
          .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
          .join('\n');

        const urgencyVal = String(submissionData.f_urgency || submissionData.urgency || '').toLowerCase();
        const fullText = (leadNotes + ' ' + (respondentName || '')).toLowerCase();
        const isEmergency = urgencyVal.includes('emergency') ||
          fullText.includes('emergency') ||
          fullText.includes('burst') ||
          fullText.includes('leak') ||
          fullText.includes('flood') ||
          fullText.includes('no heat') ||
          fullText.includes('locked out');

        const tags = ['ai_intake', form.name];
        if (isEmergency) tags.push('emergency_priority');
        if (createdBooking) tags.push('appointment_scheduled');

        const address = String(submissionData.f_address || submissionData.address || submissionData.location || '');

        const lead = await db.lead.create({
          data: {
            ...(form.tenantId ? { tenantId: form.tenantId } : {}),
            name: respondentName || respondentEmail || respondentPhone || 'Intake Visitor',
            email: respondentEmail || null,
            phone: respondentPhone || '',
            address: address || null,
            source: body.source ? `AI Intake (${body.source})` : `Form: ${form.name}`,
            description: `AI Intake Submission: ${form.name}\n${isEmergency ? '🚨 URGENCY: EMERGENCY DETECTED\n' : ''}\n${leadNotes}`,
            status: isEmergency ? 'hot' : 'new',
            tagsJson: JSON.stringify(tags),
          },
        });

        createdLeadId = lead.id;

        // Link lead back to the form response
        await db.formResponse.update({
          where: { id: response.id },
          data: { leadId: lead.id },
        }).catch(() => {});
      } catch (err) {
        console.error('[form-submit] Failed to auto-create lead:', err);
      }
    }

    // C. Webhook Dispatch (Optional Action)
    if (
      normalizedSchema.settings.actions.webhook?.enabled &&
      normalizedSchema.settings.actions.webhook.url
    ) {
      fetch(normalizedSchema.settings.actions.webhook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'form.submission',
          formId: form.id,
          formName: form.name,
          submissionId: response.id,
          data: submissionData,
          respondent: {
            name: respondentName,
            email: respondentEmail,
            phone: respondentPhone,
          },
          submittedAt: new Date().toISOString(),
        }),
      }).catch((err) => {
        console.error('[form-submit] Webhook dispatch error:', err);
      });
    }

    const submitResponse = NextResponse.json({
      success: true,
      submissionId: response.id,
      successTitle: normalizedSchema.settings.successTitle,
      successMessage: normalizedSchema.settings.successMessage,
      redirectUrl: normalizedSchema.settings.redirectUrl || null,
      booking: createdBooking
        ? {
            id: createdBooking.id,
            scheduledAt: createdBooking.scheduledAt,
            slot: apt.rawSlot,
            timezone: apt.timezone,
            googleCalendarUrl: bookingDetails?.googleCalendarUrl,
            outlookCalendarUrl: bookingDetails?.outlookCalendarUrl,
          }
        : null,
    });
    // ─── CORS headers for embed (WordPress, Shopify, custom sites) ────────
    submitResponse.headers.set('Access-Control-Allow-Origin', '*');
    submitResponse.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    submitResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Accept');
    return submitResponse;
  } catch (error) {
    console.error('[public-form-submit] Error:', error);
    const errResponse = NextResponse.json({ error: 'Failed to process submission' }, { status: 500 });
    errResponse.headers.set('Access-Control-Allow-Origin', '*');
    return errResponse;
  }
}

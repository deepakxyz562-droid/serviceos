import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { normalizeFormSchema } from '@/lib/forms/form-schema-types';
import { sendFormSubmissionEmails } from '@/lib/forms/form-email-service';

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
    const form = await db.form.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
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
    const response = await db.formResponse.create({
      data: {
        formId: form.id,
        tenantId: form.tenantId,
        dataJson: JSON.stringify(submissionData),
        respondent: respondentEmail || respondentPhone || 'Anonymous',
        respondentName: respondentName || null,
        source: body.source || 'direct',
      },
    });

    // Increment submissions count on form
    await db.form
      .update({
        where: { id: form.id },
        data: { submissions: { increment: 1 } },
      })
      .catch(() => {});

    // ── 5. Trigger Action Connectors (Decoupled Engine) ────────────────────

    // A. Send Emails (Business Notification + Customer Auto-Response)
    if (form.tenantId) {
      sendFormSubmissionEmails({
        formTitle: form.name,
        tenantId: form.tenantId,
        data: submissionData,
        respondentName,
        respondentEmail,
        respondentPhone,
        schema: normalizedSchema,
      }).catch((err) => {
        console.error('[form-submit] Email trigger error:', err);
      });
    }

    // B. Create Lead in CRM (Optional Action)
    if (normalizedSchema.settings.actions.createCrmLead?.enabled && form.tenantId) {
      try {
        const leadNotes = Object.entries(submissionData)
          .map(([k, v]) => `${k}: ${v}`)
          .join('\n');

        await db.lead.create({
          data: {
            ...(form.tenantId ? { tenantId: form.tenantId } : {}),
            name: respondentName || respondentEmail || 'Website Form Lead',
            email: respondentEmail || null,
            phone: respondentPhone || '',
            source: 'Website Form',
            description: `Generated via form: ${form.name}\n\n${leadNotes}`,
            status: 'new',
          },
        });
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

    return NextResponse.json({
      success: true,
      submissionId: response.id,
      successTitle: normalizedSchema.settings.successTitle,
      successMessage: normalizedSchema.settings.successMessage,
      redirectUrl: normalizedSchema.settings.redirectUrl || null,
    });
  } catch (error) {
    console.error('[public-form-submit] Error:', error);
    return NextResponse.json({ error: 'Failed to process submission' }, { status: 500 });
  }
}

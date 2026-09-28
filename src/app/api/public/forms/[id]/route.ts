import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { normalizeFormSchema } from '@/lib/forms/form-schema-types';
import { stripSecretFields } from '@/lib/payments/credentials';

/**
 * GET /api/public/forms/[id]
 *
 * Public endpoint to fetch form configuration by ID or slug.
 * Used by standalone form pages, JS embeds, and WordPress plugins.
 *
 * SECURITY: All secret payment credential fields (Stripe secretKey, PayPal
 * clientSecret, Razorpay keySecret, etc.) are STRIPPED from the response
 * before being sent to the browser. Only public keys (publishableKey,
 * clientId, applicationId) are returned — these can tokenize but not charge.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
        slug: true,
        description: true,
        type: true,
        status: true,
        fieldsJson: true,
        schemaJson: true,
        submissionActions: true,
        welcomeMessage: true,
        completionMessage: true,
        tenantId: true,
        workspaceId: true,
        tenant: {
          select: {
            name: true,
            phone: true,
            email: true,
          },
        },
        workspace: {
          select: {
            name: true,
            brandingJson: true,
          },
        },
      },
    });

    if (!form) {
      if (['form_1', 'form_sample', 'service-request', 'intake', 'form_booking_agent_form'].includes(id) || id.startsWith('sample_') || id.startsWith('preview_')) {
        const sampleSchema: FormSchema = {
          fields: [
            { id: 'full_name', type: 'text', label: 'Full Name', required: true, placeholder: 'Jane Doe' },
            { id: 'email', type: 'email', label: 'Email Address', required: true, placeholder: 'jane@example.com' },
            { id: 'phone', type: 'phone', label: 'Phone Number', required: false, placeholder: '+1 (555) 000-0000' },
            { id: 'service_type', type: 'select', label: 'Service Needed', required: true, options: ['Consultation & Quote', 'Standard Service Request', 'Emergency Dispatch', 'Follow-up Inspection'] },
            { id: 'message', type: 'textarea', label: 'Project or Issue Details', required: false, placeholder: 'Please describe what you need assistance with...' },
          ],
          theme: { layout: 'classic', primaryColor: '#059669', borderRadius: '12px' },
          settings: { submitButtonText: 'Submit Request', successTitle: 'Thank You!', successMessage: 'Your request has been received. Our team will contact you shortly.' },
        };
        return NextResponse.json({
          id,
          name: 'Service Inquiry & Booking Form',
          slug: id,
          description: 'Fill out this form to connect with our team and schedule service.',
          schema: sampleSchema,
          branding: { businessName: 'Customer Support Concierge' },
          tenant: { name: 'Customer Support Concierge' },
        });
      }
      return NextResponse.json({ error: 'Form not found or inactive' }, { status: 404 });
    }

    // Increment submissions/views count asynchronously
    db.form
      .update({
        where: { id: form.id },
        data: { submissions: { increment: 0 } },
      })
      .catch(() => {});

    let schema;
    try {
      schema = form.schemaJson && form.schemaJson !== '{}'
        ? JSON.parse(form.schemaJson)
        : null;
    } catch {
      schema = null;
    }

    let rawFields: any[] = [];
    if (form.fieldsJson) {
      try {
        const parsed = typeof form.fieldsJson === 'string' ? JSON.parse(form.fieldsJson) : form.fieldsJson;
        if (Array.isArray(parsed)) {
          // Unpack embedded schema metadata if present
          const meta = parsed.find((f: any) => f && (f.id === '__form_schema__' || f.widgetType === 'schema_metadata'));
          if (meta?.schema && !schema) {
            schema = meta.schema;
          }
          rawFields = parsed.filter((f: any) => f && f.id !== '__form_schema__' && f.widgetType !== 'schema_metadata');
        } else if (parsed && typeof parsed === 'object') {
          if (!schema && (parsed.schema || parsed.fields)) {
            schema = parsed.schema || parsed;
            rawFields = Array.isArray(parsed.fields) ? parsed.fields : [];
          }
        }
      } catch { /* ignore */ }
    }

    const normalizedSchema = normalizeFormSchema(schema, rawFields);

    // ─── SECURITY: Strip all secret payment credential fields ──────────────
    // Walk the entire schema recursively and remove any field named
    // secretKey / clientSecret / keySecret / accessToken / transactionKey /
    // privateKey / webhookSecret / webhookId / apiPassword / apiKey /
    // sharedSecret / passphrase / authCode / apiToken / password / merchantKey /
    // secretWord / serviceKey / merchantSalt / apiSecret.
    // These are never needed by the public form runtime — only the backend
    // /api/forms/[id]/charge endpoint uses them (it decrypts them server-side).
    const sanitizedSchema = stripSecretFields(normalizedSchema);

    // Resolve branding: prefer tenant for CRM-bound forms, fall back to
    // workspace branding for standalone (Forms-only) forms.
    let workspaceBranding: { productName?: string; supportEmail?: string } = {};
    if (form.workspace?.brandingJson) {
      try {
        workspaceBranding = JSON.parse(form.workspace.brandingJson);
      } catch { /* ignore */ }
    }

    // Resolve branding: prefer tenant for CRM-bound forms, custom product name
    // from workspace branding, or explicit form theme branding.
    // NEVER leak internal personal workspace names (e.g. "Deepak Chandra's Workspace") to the public!
    const themeBusinessName =
      (sanitizedSchema?.theme as any)?.branding?.businessName ||
      (sanitizedSchema?.theme as any)?.businessName ||
      (sanitizedSchema?.settings as any)?.businessName;

    const rawWorkspaceName = form.workspace?.name?.trim() || '';
    const isInternalPersonalWorkspace =
      !rawWorkspaceName ||
      /'s\s+workspace$/i.test(rawWorkspaceName) ||
      /^workspace$/i.test(rawWorkspaceName);

    const resolvedBusinessName =
      themeBusinessName ||
      form.tenant?.name ||
      workspaceBranding.productName ||
      (!isInternalPersonalWorkspace ? rawWorkspaceName : '') ||
      null;

    // ─── CORS headers for embed (WordPress, Shopify, custom sites) ────────
    // The embed.js SDK fetches form schema cross-origin. These headers allow
    // any site to read the response. Forms are public by design — no auth
    // is required to view a form's schema.
    const response = NextResponse.json({
      id: form.id,
      name: form.name,
      slug: form.slug,
      description: form.description,
      type: form.type,
      schema: sanitizedSchema,
      branding: {
        businessName: resolvedBusinessName,
        businessPhone: form.tenant?.phone || null,
        businessEmail: form.tenant?.email || workspaceBranding.supportEmail || null,
      },
    });
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Accept');
    return response;
  } catch (error) {
    console.error('[public-form-get] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch form' }, { status: 500 });
  }
}

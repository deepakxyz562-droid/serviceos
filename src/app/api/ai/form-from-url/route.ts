import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { callOpenRouter } from '@/lib/ai-client';
import { FormSchema, DEFAULT_FORM_THEME } from '@/lib/forms/form-schema-types';

/**
 * POST /api/ai/form-from-url
 *
 * Takes a website URL or crawled knowledge object,
 * and generates a high-converting, tailored Form Schema.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    let url = (body.url as string || '').trim();
    const customPrompt = (body.prompt as string || '').trim();

    if (!url && !customPrompt) {
      return NextResponse.json({ error: 'Either a website URL or prompt is required' }, { status: 400 });
    }

    let websiteContent = '';
    let businessName = '';

    if (url) {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }

      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; FieserosBot/1.0; +https://fieseros.com)',
          },
          signal: AbortSignal.timeout(10000),
        });

        if (res.ok) {
          const html = await res.text();
          websiteContent = html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 10000);
        }
      } catch (err) {
        console.warn('[form-from-url] Crawl fetch failed, proceeding with prompt only:', err);
      }
    }

    const systemPrompt = `You are a world-class conversion rate optimization (CRO) expert and AI form architect for Fieseros.
Your job is to generate a multi-step, interactive, high-converting Form Schema for a business based on their website content and requirements.

Website context:
"""
${websiteContent || 'General service business'}
"""

User instructions:
"""
${customPrompt || 'Create a service request and quote booking form'}
"""

You must return a valid FormSchema JSON object matching this structure:
{
  "name": "Form Name (e.g. Request a Free Plumbing Quote)",
  "description": "Short explanation",
  "steps": [
    { "id": "step_1", "title": "Service Needed", "description": "Select the service you require" },
    { "id": "step_2", "title": "Property & Urgency", "description": "Tell us where and when" },
    { "id": "step_3", "title": "Your Information", "description": "Where should we send your estimate?" }
  ],
  "fields": [
    {
      "id": "service_type",
      "type": "dropdown" (or radio/short_answer/long_answer/email/phone/date/numerical/checkbox),
      "label": "What service do you need?",
      "required": true,
      "stepId": "step_1",
      "width": "full",
      "options": [
        { "label": "Service 1 (from website)", "value": "service_1" },
        { "label": "Service 2 (from website)", "value": "service_2" }
      ]
    }
  ],
  "settings": {
    "submitButtonText": "Get Free Quote",
    "successTitle": "Thank you!",
    "successMessage": "We have received your request and will contact you within 15 minutes."
  }
}

Use field types: "short_answer", "long_answer", "dropdown", "radio", "checkbox", "numerical", "email", "phone", "date", "address".
Make sure standard contact fields (name, email, phone) exist on the final step.
Return ONLY valid JSON.`;

    let generated: any = {};

    try {
      const aiResult = await callOpenRouter({
        messages: [{ role: 'user', content: systemPrompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 3000,
      });

      if (aiResult?.content) {
        generated = JSON.parse(aiResult.content);
      }
    } catch (aiErr) {
      console.warn('[form-from-url] AI API call failed, using intelligent fallback:', aiErr);
    }

    // Domain fallback if OpenRouter returned empty
    if (!generated.fields || generated.fields.length === 0) {
      const combined = `${customPrompt} ${websiteContent}`.toLowerCase();
      if (combined.includes('roof') || (combined.includes('sq ft') && combined.includes('material'))) {
        generated = {
          name: 'Roof Replacement & Repair Estimator',
          description: 'Instant live calculation and appointment booking',
          steps: [
            { id: 'step_1', title: '01 Instant quote', description: 'Tell us about the roof' },
            { id: 'step_2', title: '02 Book inspection', description: 'Select property location & upload photos' },
            { id: 'step_3', title: '03 Secure deposit', description: 'Authorize signature & secure deposit' },
          ],
          fields: [
            { id: 'roof_address', type: 'address', label: 'Service Address / Location', required: true, stepId: 'step_1', width: 'full' },
            { id: 'roof_area', type: 'numerical', label: 'Approximate Roof Area (sq ft)', placeholder: '2400', required: true, stepId: 'step_1', width: 'half' },
            {
              id: 'urgency_level',
              type: 'dropdown',
              label: 'Inspection Urgency Level',
              required: true,
              stepId: 'step_1',
              width: 'half',
              options: [
                { label: 'Standard Inspection (Within 48h)', value: 'standard_48h' },
                { label: 'Priority Inspection (Within 24h)', value: 'priority_24h' },
                { label: 'Emergency Same-Day Response', value: 'emergency_same_day' },
              ],
            },
            {
              id: 'roof_material',
              type: 'radio',
              label: 'Architectural Material Options',
              required: true,
              stepId: 'step_1',
              width: 'full',
              options: [
                { label: 'Standard Asphalt Shingle (£3.40 / sq ft)', value: 'standard_asphalt' },
                { label: 'Architectural Metal Standing Seam (£5.80 / sq ft)', value: 'architectural_metal' },
                { label: 'Spanish Clay Tile (£8.20 / sq ft)', value: 'spanish_tile' },
              ],
            },
            { id: 'damage_photos', type: 'image_upload_with_notes', label: 'Upload Roof & Damage Photos', required: false, stepId: 'step_2', width: 'full' },
            { id: 'inspection_slot', type: 'appointment', label: 'Preferred Inspection Date & Time', required: true, stepId: 'step_2', width: 'full' },
            { id: 'customer_name', type: 'short_answer', label: 'Full Name', placeholder: 'John Doe', required: true, stepId: 'step_2', width: 'half' },
            { id: 'customer_phone', type: 'phone', label: 'Mobile Phone Number', placeholder: '+44 7700 900077', required: true, stepId: 'step_2', width: 'half' },
            { id: 'customer_email', type: 'email', label: 'Email Address', placeholder: 'john@example.com', required: true, stepId: 'step_2', width: 'full' },
            { id: 'customer_signature', type: 'signature_pad', label: 'Authorized Customer Signature', required: true, stepId: 'step_3', width: 'full' },
            { id: 'deposit_payment', type: 'payment_stripe', label: 'Secure Inspection Deposit (£99)', required: true, stepId: 'step_3', width: 'full' },
          ],
          settings: {
            submitButtonText: 'Confirm & Secure Estimate',
            successTitle: 'Estimate Request Received!',
            successMessage: 'Your live calculation has been saved and your inspection slot has been reserved.',
          },
        };
      }
    }

    const formSchema: FormSchema = {
      version: 1,
      steps: generated.steps || [
        { id: 'step_1', title: 'Request Details' },
        { id: 'step_2', title: 'Contact Information' },
      ],
      fields: generated.fields || [],
      rules: [],
      theme: DEFAULT_FORM_THEME,
      settings: {
        submitButtonText: generated.settings?.submitButtonText || 'Submit Request',
        successTitle: generated.settings?.successTitle || 'Thank you!',
        successMessage: generated.settings?.successMessage || 'We have received your request.',
        actions: {
          sendEmailNotification: { enabled: true, toEmails: [] },
          createCrmLead: { enabled: true },
        },
      },
    };

    return NextResponse.json({
      success: true,
      name: generated.name || 'Service Request Form',
      description: generated.description || null,
      schema: formSchema,
    });
  } catch (error) {
    console.error('[form-from-url] Error:', error);
    return NextResponse.json({ error: 'Failed to generate form from URL' }, { status: 500 });
  }
}

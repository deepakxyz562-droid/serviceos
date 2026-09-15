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

    const aiResult = await callOpenRouter({
      messages: [{ role: 'user', content: systemPrompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 3000,
    });

    const generated = JSON.parse(aiResult.content || '{}');

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

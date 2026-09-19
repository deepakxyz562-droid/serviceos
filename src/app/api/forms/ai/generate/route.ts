import { NextRequest, NextResponse } from 'next/server';
import { callAI } from '@/lib/ai-client';
import { DEFAULT_FORM_SCHEMA, FormSchema, FormField } from '@/lib/forms/form-schema-types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, industry, style = 'card' } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const systemPrompt = `You are the Fieseros AI Form Architect, an expert in high-converting, smart interactive forms.
Given the user's prompt, generate a complete, valid JSON FormSchema.

The schema MUST follow this exact TypeScript interface:
{
  "version": 1,
  "steps": [
    { "id": "step_1", "title": "Step Title", "description": "Step sublabel" }
  ],
  "fields": [
    {
      "id": "field_unique_id",
      "type": "short_answer" | "long_answer" | "dropdown" | "radio" | "checkbox" | "numerical" | "email" | "phone" | "date" | "time" | "address" | "photo" | "file" | "signature" | "rating" | "heading" | "paragraph" | "control_widget",
      "label": "Question Label",
      "placeholder": "Placeholder text",
      "helpText": "Subtext instruction",
      "required": boolean,
      "stepId": "step_1",
      "width": "full" | "half",
      "options": [{ "label": "Option 1", "value": "opt_1", "price": 0 }],
      "widgetType": string (optional, e.g. "image_upload_with_notes", "route_planner_map", "nearest_location_finder", "form_calculation", "currency_amount_input", "configurable_list", "cloudflare_turnstile", "sms_otp_verification"),
      "widgetConfig": object (optional configuration parameters for the widget)
    }
  ],
  "rules": [],
  "theme": {
    "primaryColor": "#059669",
    "backgroundColor": "#ffffff",
    "textColor": "#0f172a",
    "borderRadius": "0.75rem",
    "layout": "card" | "classic" | "split_media"
  },
  "mediaPanel": {
    "enabled": boolean,
    "position": "left" | "right",
    "splitRatio": "50-50" | "40-60" | "60-40" | "35-65",
    "mediaType": "image" | "video" | "youtube",
    "mediaUrl": string (optional, image or direct MP4 URL),
    "videoEmbedUrl": string (optional, YouTube/Vimeo embed URL),
    "headline": string,
    "subtitle": string,
    "badgeText": string,
    "benefitsList": string[]
  },
  "settings": {
    "submitButtonText": "Submit",
    "successTitle": "Thank you!",
    "successMessage": "We have received your submission and will get back to you shortly.",
    "actions": {
      "sendEmailNotification": { "enabled": true, "toEmails": [] },
      "createCrmLead": { "enabled": true }
    }
  }
}

Guidelines:
1. If the user mentions "split", "2 part", "video on left", "image on left", or "Elementor", set theme.layout to "split_media", configure a compelling mediaPanel with headline & benefits, and create 5 to 6 concise, high-converting fields on the right.
2. Choose specialized widgets intelligently (e.g., use "image_upload_with_notes" for inspections, "nearest_location_finder" or "address" for places, "form_calculation" or "currency_amount_input" for quotes/estimates).
3. Always return valid, parseable JSON only.`;

    const userMessage = `Create a form for: "${prompt}" ${industry ? `in the ${industry} industry` : ''} with layout "${style}".`;

    let schema: FormSchema | null = null;
    let provider = 'heuristic-fallback';
    let model = 'fieseros-smart-rules';

    try {
      const aiRes = await callAI({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.4,
        json: true,
      });

      if (aiRes?.content) {
        provider = aiRes.provider || 'openrouter';
        model = aiRes.model || 'gpt-4o';
        try {
          schema = JSON.parse(aiRes.content);
        } catch {
          const jsonMatch = aiRes.content.match(/\{[\s\S]*\}/);
          if (jsonMatch) schema = JSON.parse(jsonMatch[0]);
        }
      }
    } catch (aiErr) {
      console.warn('callAI failed, falling back to smart heuristic generator:', aiErr);
    }

    // Heuristic Fallback Generator (Guarantees fast, robust response even if AI quota is empty)
    if (!schema) {
      const lower = prompt.toLowerCase();
      const isSplit = style === 'split_media' || lower.includes('split') || lower.includes('2 part') || lower.includes('two part') || lower.includes('video') || lower.includes('elementor');
      const isInspection = lower.includes('inspect') || lower.includes('damage') || lower.includes('photo') || lower.includes('leak');
      const isBooking = lower.includes('book') || lower.includes('appointment') || lower.includes('schedule');
      const isQuote = lower.includes('quote') || lower.includes('estimate') || lower.includes('cost') || lower.includes('calculator');

      const splitMediaPanel = isSplit ? {
        enabled: true,
        position: 'left' as const,
        splitRatio: '50-50' as const,
        mediaType: lower.includes('video') ? ('video' as const) : ('image' as const),
        mediaUrl: lower.includes('video')
          ? 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
          : 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1200&q=80',
        videoEmbedUrl: lower.includes('video') ? 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' : undefined,
        videoAutoplay: true,
        videoMuted: true,
        videoLoop: true,
        headline: prompt.length > 5 ? prompt.slice(0, 50) : 'Fast Professional Service & Inspection',
        subtitle: 'Complete the quick 5-step intake and receive immediate scheduling with upfront pricing.',
        badgeText: '⭐ 5-Star Rated Service Pro',
        benefitsList: [
          'Guaranteed pro response within 15 mins',
          'Licensed, insured & background-checked',
          '100% Price Match & Escrow Guarantee',
        ],
      } : undefined;

      schema = {
        version: 1,
        steps: [
          { id: 'step_1', title: 'Service Intake', description: 'Your information & service request' },
        ],
        fields: [
          { id: 'f_name', type: 'short_answer', label: 'Full Name', placeholder: 'John Doe', required: true, stepId: 'step_1', width: 'half' },
          { id: 'f_phone', type: 'phone', label: 'Phone Number', placeholder: '+1 (555) 000-0000', required: true, stepId: 'step_1', width: 'half' },
          { id: 'f_email', type: 'email', label: 'Email Address', placeholder: 'john@example.com', required: true, stepId: 'step_1', width: 'full' },
          { id: 'f_address', type: 'address', label: 'Service Address / Location', placeholder: '123 Main St, Austin, TX', required: true, stepId: 'step_1', width: 'full' },
          ...(isInspection ? [
            {
              id: 'f_photos',
              type: 'control_widget' as const,
              label: 'Photos of Issue with Notes',
              widgetType: 'image_upload_with_notes',
              required: true,
              stepId: 'step_1',
              width: 'full' as const,
              widgetConfig: { maxFiles: 5, requireNotes: true },
            },
          ] : [
            {
              id: 'f_service_type',
              type: 'dropdown' as const,
              label: 'Requested Service Type',
              placeholder: 'Select service type',
              required: true,
              stepId: 'step_1',
              width: 'full' as const,
              options: [
                { label: 'Standard Maintenance & Tune-Up', value: 'maintenance' },
                { label: 'Emergency Diagnostics & Repair', value: 'emergency' },
                { label: 'New System Installation / Replacement', value: 'installation' },
              ],
            },
          ]),
          {
            id: 'f_notes',
            type: 'long_answer',
            label: 'Additional Notes & Details',
            placeholder: 'Tell us any special instructions or details...',
            required: false,
            stepId: 'step_1',
            width: 'full',
          },
        ],
        rules: [],
        theme: {
          primaryColor: '#059669',
          backgroundColor: '#ffffff',
          textColor: '#0f172a',
          borderRadius: '16px',
          layout: isSplit ? 'split_media' : 'card',
        },
        mediaPanel: splitMediaPanel,
        settings: {
          submitButtonText: 'Get Instant Estimate',
          successTitle: 'Request Received!',
          successMessage: 'We have received your details and our team is reviewing your request.',
          actions: {
            sendEmailNotification: { enabled: true, toEmails: [] },
            createCrmLead: { enabled: true },
          },
        },
      };
      provider = 'smart-engine';
      model = 'heuristic-generator';
    }

    return NextResponse.json({
      success: true,
      schema,
      provider,
      model,
    });
  } catch (error) {
    console.error('AI Form Generation Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate form', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

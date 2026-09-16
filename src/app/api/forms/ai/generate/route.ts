import { NextRequest, NextResponse } from 'next/server';
import { callAI } from '@/lib/ai-client';
import { DEFAULT_FORM_SCHEMA, FormSchema } from '@/lib/forms/form-schema-types';

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
    "layout": "card"
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
1. Always split multi-part requests into logical steps (e.g. Step 1: Customer Contact, Step 2: Service & Damage Details, Step 3: Scheduling & Authorization).
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
      const isInspection = lower.includes('inspect') || lower.includes('damage') || lower.includes('photo') || lower.includes('leak');
      const isBooking = lower.includes('book') || lower.includes('appointment') || lower.includes('schedule');
      const isQuote = lower.includes('quote') || lower.includes('estimate') || lower.includes('cost') || lower.includes('calculator');

      schema = {
        version: 1,
        steps: [
          { id: 'step_1', title: 'Customer Contact', description: 'Your basic information' },
          { id: 'step_2', title: 'Service Details', description: 'Tell us about your request' },
          { id: 'step_3', title: 'Confirmation & Schedule', description: 'Finalize your request' },
        ],
        fields: [
          { id: 'f_name', type: 'short_answer', label: 'Full Name', placeholder: 'John Doe', required: true, stepId: 'step_1', width: 'half' },
          { id: 'f_email', type: 'email', label: 'Email Address', placeholder: 'john@example.com', required: true, stepId: 'step_1', width: 'half' },
          { id: 'f_phone', type: 'phone', label: 'Phone Number', placeholder: '+1 (555) 000-0000', required: true, stepId: 'step_1', width: 'full' },
          { id: 'f_address', type: 'address', label: 'Service Address', placeholder: '123 Main St, Austin, TX', required: true, stepId: 'step_2', width: 'full' },
          ...(isInspection ? [
            {
              id: 'f_photos',
              type: 'control_widget' as const,
              label: 'Photos of Issue with Notes',
              widgetType: 'image_upload_with_notes',
              required: true,
              stepId: 'step_2',
              width: 'full' as const,
              widgetConfig: { maxFiles: 5, requireNotes: true },
            },
          ] : []),
          ...(isQuote ? [
            {
              id: 'f_calc',
              type: 'control_widget' as const,
              label: 'Estimated Price Calculation',
              widgetType: 'form_calculation',
              stepId: 'step_2',
              width: 'full' as const,
              widgetConfig: { formula: '([f_sqft] * 3.5) + 50' },
            },
          ] : []),
          {
            id: 'f_desc',
            type: 'long_answer',
            label: 'Detailed Description of Request',
            placeholder: 'Please explain the issue or requirements in detail...',
            required: true,
            stepId: 'step_2',
            width: 'full',
          },
          {
            id: 'f_sig',
            type: 'signature',
            label: 'Customer Authorization Signature',
            required: true,
            stepId: 'step_3',
            width: 'full',
          },
        ],
        rules: [],
        theme: {
          primaryColor: '#059669',
          backgroundColor: '#ffffff',
          textColor: '#0f172a',
          borderRadius: '0.75rem',
          layout: 'card',
        },
        settings: {
          submitButtonText: 'Submit Request',
          successTitle: 'Thank You!',
          successMessage: 'Your request has been received. Our team will review it and contact you shortly.',
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

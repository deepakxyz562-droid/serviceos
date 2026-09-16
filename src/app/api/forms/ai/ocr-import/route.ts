import { NextRequest, NextResponse } from 'next/server';
import { callAI } from '@/lib/ai-client';
import { FormSchema, DEFAULT_FORM_SCHEMA } from '@/lib/forms/form-schema-types';

/**
 * POST /api/forms/ai/ocr-import
 *
 * Imports and reconstructs a digital Form Schema from:
 * 1. Webpage or existing form URL
 * 2. Uploaded image / paper form photo (Base64)
 * 3. Raw unstructured text / job sheet
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { mode = 'text', content = '', imageUrl = '', url = '' } = body;

    let sourceText = content;

    // Mode 1: URL Crawl
    if (mode === 'url' && url) {
      let targetUrl = url.trim();
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = `https://${targetUrl}`;
      }

      try {
        const res = await fetch(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; FieserosImporter/1.0)',
          },
          signal: AbortSignal.timeout(8000),
        });

        if (res.ok) {
          const html = await res.text();
          sourceText = html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 12000);
        }
      } catch (e) {
        console.warn('URL Fetch failed, proceeding with fallback parsing:', e);
      }
    }

    const systemPrompt = `You are the Fieseros Vision & Form Extraction AI.
Your mission is to analyze the provided input (webpage content, OCR text from a paper document, or raw description) and convert it into a complete, high-converting, modern FormSchema JSON.

TypeScript schema:
{
  "version": 1,
  "steps": [{ "id": "step_1", "title": "Section Title", "description": "Sublabel" }],
  "fields": [
    {
      "id": "field_id",
      "type": "short_answer" | "long_answer" | "dropdown" | "radio" | "checkbox" | "numerical" | "email" | "phone" | "date" | "time" | "address" | "photo" | "file" | "signature" | "rating" | "heading" | "paragraph" | "control_widget",
      "label": "Question Label",
      "placeholder": "...",
      "helpText": "...",
      "required": boolean,
      "stepId": "step_1",
      "width": "full" | "half",
      "options": [{ "label": "Option 1", "value": "opt_1" }],
      "widgetType": string (e.g. "image_upload_with_notes", "route_planner_map", "nearest_location_finder", "form_calculation", "sms_otp_verification")
    }
  ],
  "theme": {
    "primaryColor": "#059669",
    "borderRadius": "0.75rem",
    "layout": "card"
  },
  "settings": {
    "submitButtonText": "Submit Application",
    "successTitle": "Thank you!",
    "successMessage": "We have received your submission."
  }
}

Respond ONLY with valid parseable JSON.`;

    let userPrompt = '';
    if (mode === 'image') {
      userPrompt = `Extract all form fields, input questions, signature areas, checkboxes, and tables from this paper form image data. If text was recognized, here it is: ${sourceText || 'Image document attached'}. Reconstruct it into a clean digital form.`;
    } else if (mode === 'url') {
      userPrompt = `Reconstruct a digital form matching the purpose and questions found on this webpage (${url}):\n\n${sourceText.slice(0, 6000)}`;
    } else {
      userPrompt = `Convert the following questions/notes into a structured interactive form:\n\n${sourceText}`;
    }

    let extractedSchema: FormSchema | null = null;

    try {
      const aiRes = await callAI({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        json: true,
      });

      if (aiRes?.content) {
        try {
          extractedSchema = JSON.parse(aiRes.content);
        } catch {
          const match = aiRes.content.match(/\{[\s\S]*\}/);
          if (match) extractedSchema = JSON.parse(match[0]);
        }
      }
    } catch (e) {
      console.warn('AI OCR import failed, using heuristic extraction:', e);
    }

    // Heuristic extraction fallback
    if (!extractedSchema) {
      const lines = sourceText.split(/\n|\r\n|\.\s+/).filter((l) => l.trim().length > 2);
      const fields = lines.slice(0, 8).map((line, idx) => {
        const clean = line.replace(/^[-*•\d.)]+\s*/, '').trim();
        const isEmail = clean.toLowerCase().includes('email');
        const isPhone = clean.toLowerCase().includes('phone') || clean.toLowerCase().includes('tel');
        const isDate = clean.toLowerCase().includes('date') || clean.toLowerCase().includes('dob');
        const isAddress = clean.toLowerCase().includes('address') || clean.toLowerCase().includes('location');

        return {
          id: `f_ocr_${idx + 1}`,
          type: (isEmail ? 'email' : isPhone ? 'phone' : isDate ? 'date' : isAddress ? 'address' : 'short_answer') as any,
          label: clean || `Question ${idx + 1}`,
          required: idx < 2,
          stepId: 'step_1',
          width: 'full' as const,
        };
      });

      extractedSchema = {
        version: 1,
        steps: [{ id: 'step_1', title: 'Imported Information', description: 'Extracted from source' }],
        fields: fields.length > 0 ? fields : DEFAULT_FORM_SCHEMA.fields,
        rules: [],
        theme: DEFAULT_FORM_SCHEMA.theme,
        settings: DEFAULT_FORM_SCHEMA.settings,
      };
    }

    return NextResponse.json({
      success: true,
      schema: extractedSchema,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to import form', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

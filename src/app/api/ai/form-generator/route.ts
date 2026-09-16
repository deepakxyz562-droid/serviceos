import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { callOpenRouter, isAiConfiguredAsync } from '@/lib/ai-client';
import { FIELD_TYPES } from '@/lib/form-field-types';

/**
 * POST /api/ai/form-generator
 *
 * Generate form fields from a natural-language prompt using the multi-key
 * AI fallback chain (OpenRouter → OpenAI → Anthropic → Gemini).
 *
 * Body: { prompt: string, formType?: string }
 * Returns: { fields: FormField[] }
 *
 * The AI is constrained to the 15 engine field types from FIELD_TYPES.
 * Output is validated + normalized before returning.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if ANY AI provider is configured (DB keys or env vars)
    const configured = await isAiConfiguredAsync();
    if (!configured) {
      return NextResponse.json(
        { error: 'AI is not configured. Ask a superadmin to add an AI provider key in Superadmin → AI Center.' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { prompt, formType } = body as { prompt?: string; formType?: string };

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    // Fast heuristic check for direct comma/list prompts (e.g. "Name, Email, Service Listing (AC Repair, Plumbing), Message, Map in footer")
    const splitOutsideParens = (str: string): string[] => {
      const parts: string[] = [];
      let current = '';
      let inParens = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (char === '(') inParens++;
        else if (char === ')') inParens = Math.max(0, inParens - 1);
        if ((char === ',' || char === ';' || char === '\n') && inParens === 0) {
          if (current.trim()) parts.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      if (current.trim()) parts.push(current.trim());
      return parts;
    };

    const parts = splitOutsideParens(prompt);
    if (parts.length >= 2 || prompt.includes('(')) {
      const fastFields = [];
      let idx = 1;
      for (const rawPart of parts) {
        const part = rawPart.trim();
        if (!part || /^submit$/i.test(part) || /^create\s+(a\s+)?form/i.test(part)) continue;
        const lower = part.toLowerCase();

        if (lower.includes('map') || lower.includes('route planner')) {
          fastFields.push({
            id: `ai-${Date.now()}-${idx++}`,
            type: 'gps',
            label: 'Interactive Route & Location Map',
            required: false,
            placeholder: '',
            description: '',
            options: [],
            widgetType: 'route_planner_map',
          });
          continue;
        }

        if (lower.includes('nearest') || lower.includes('location finder')) {
          fastFields.push({
            id: `ai-${Date.now()}-${idx++}`,
            type: 'gps',
            label: 'Nearest Service Hub',
            required: true,
            placeholder: '',
            description: '',
            options: [],
            widgetType: 'nearest_location_finder',
          });
          continue;
        }

        if (lower.includes('signature') || lower.includes('sign')) {
          fastFields.push({
            id: `ai-${Date.now()}-${idx++}`,
            type: 'signature',
            label: 'Authorized Signature',
            required: true,
            placeholder: '',
            description: '',
            options: [],
            widgetType: 'e_signature',
          });
          continue;
        }

        if (lower.includes('photo') || lower.includes('image') || lower.includes('damage')) {
          fastFields.push({
            id: `ai-${Date.now()}-${idx++}`,
            type: 'photo',
            label: 'Upload Photos with Notes',
            required: false,
            placeholder: '',
            description: '',
            options: [],
            widgetType: 'image_upload_with_notes',
          });
          continue;
        }

        if (lower.includes('stripe') || lower.includes('payment') || lower.includes('credit card')) {
          fastFields.push({
            id: `ai-${Date.now()}-${idx++}`,
            type: 'short_answer',
            label: 'Credit Card Payment (Stripe)',
            required: true,
            placeholder: '',
            description: '',
            options: [],
            widgetType: 'stripe_checkout',
          });
          continue;
        }

        const optionsMatch = part.match(/\(([^)]+)\)|:\s*(.+)$/);
        if (optionsMatch || lower.includes('service') || lower.includes('listing') || lower.includes('dropdown')) {
          let opts: string[] = ['Standard Service', 'Emergency Repair', 'Routine Maintenance'];
          if (optionsMatch) {
            const optStr = optionsMatch[1] || optionsMatch[2];
            opts = optStr.split(/[,|\/]+/).map((o) => o.trim()).filter(Boolean);
          }
          const labelClean = part.replace(/\([^)]+\)|:\s*.+$/g, '').trim() || 'Service Selection';
          fastFields.push({
            id: `ai-${Date.now()}-${idx++}`,
            type: 'dropdown',
            label: labelClean,
            required: true,
            placeholder: 'Select an option',
            description: '',
            options: opts,
          });
          continue;
        }

        if (lower.includes('name')) {
          fastFields.push({
            id: `ai-${Date.now()}-${idx++}`,
            type: 'short_answer',
            label: 'Full Name',
            required: true,
            placeholder: 'John Doe',
            description: '',
            options: [],
          });
          continue;
        }

        if (lower.includes('email')) {
          fastFields.push({
            id: `ai-${Date.now()}-${idx++}`,
            type: 'short_answer',
            label: 'Email Address',
            required: true,
            placeholder: 'john@example.com',
            description: '',
            options: [],
          });
          continue;
        }

        if (lower.includes('phone') || lower.includes('mobile')) {
          fastFields.push({
            id: `ai-${Date.now()}-${idx++}`,
            type: 'short_answer',
            label: 'Phone Number',
            required: true,
            placeholder: '(555) 000-0000',
            description: '',
            options: [],
          });
          continue;
        }

        if (lower.includes('message') || lower.includes('note') || lower.includes('detail')) {
          fastFields.push({
            id: `ai-${Date.now()}-${idx++}`,
            type: 'long_answer',
            label: 'Project Details / Message',
            required: false,
            placeholder: 'Describe your project or service request...',
            description: '',
            options: [],
          });
          continue;
        }

        fastFields.push({
          id: `ai-${Date.now()}-${idx++}`,
          type: 'short_answer',
          label: part.replace(/^(add|include|insert)\s+/i, '').trim(),
          required: false,
          placeholder: '',
          description: '',
          options: [],
        });
      }

      if (fastFields.length >= 2) {
        return NextResponse.json({ fields: fastFields });
      }
    }

    // Build the list of valid field types for the system prompt
    const validTypes = FIELD_TYPES.map((t) => t.value).join(', ');

    const systemPrompt = `You are a form builder assistant for Fieseros, a field-service management platform.
Given a natural-language description, generate an array of form fields that would be useful for the described form.

Valid field types (use ONLY these): ${validTypes}

Field type guidance:
- "short_answer" — single-line text (name, title, short answer)
- "long_answer" — multi-line text (message, description, notes)
- "dropdown" — single-select from options (include "options" array)
- "checkbox" — boolean yes/no
- "numerical" — numbers (quantity, age, amount)
- "photo" — photo upload (job site photos, before/after)
- "video" — video upload
- "gps" — GPS location capture
- "signature" — signature capture (customer sign-off)
- "barcode" — barcode scan
- "qr_scan" — QR code scan
- "asset_selection" — pick from asset inventory
- "ai_image_analysis" — AI-powered image analysis
- "voice_note" — voice recording
- "drawing_markup" — draw on an image/diagram

Return ONLY a valid JSON array (no markdown, no explanation) of field objects with this shape:
[
  {
    "type": "short_answer",
    "label": "Full Name",
    "required": true,
    "placeholder": "John Doe",
    "description": "",
    "options": []
  }
]

Rules:
- Generate 3-12 fields based on the prompt.
- Use sensible labels (Title Case).
- Mark essential fields (name, contact) as required.
- For "dropdown" type, include 3-6 sensible "options".
- For "photo"/"video"/"signature"/"gps"/"barcode"/"qr_scan"/"voice_note"/"drawing_markup"/"ai_image_analysis" types, omit "options" and "placeholder".
- Keep "placeholder" empty for non-text fields.
- Do NOT include an "id" field — the client will generate one.
- Return ONLY the JSON array, no other text.`;

    const userMessage = formType
      ? `Form type: ${formType}\n\nGenerate fields for: ${prompt}`
      : `Generate fields for: ${prompt}`;

    const raw = await callOpenRouter({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      maxTokens: 2000,
      json: true,
    });

    // Extract JSON array from the response
    let jsonStr = raw.trim();
    // Strip markdown code fences
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim();
    }
    // Find the first [ and last ]
    const firstBracket = jsonStr.indexOf('[');
    const lastBracket = jsonStr.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket !== -1) {
      jsonStr = jsonStr.substring(firstBracket, lastBracket + 1);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(
        { error: 'AI returned invalid JSON. Please try again with a more specific prompt.' },
        { status: 502 }
      );
    }

    if (!Array.isArray(parsed)) {
      return NextResponse.json(
        { error: 'AI returned an unexpected format. Please try again.' },
        { status: 502 }
      );
    }

    // Normalize + validate each field
    const validTypeSet = new Set(FIELD_TYPES.map((t) => t.value));
    const normalized = parsed
      .filter((f): f is Record<string, unknown> => typeof f === 'object' && f !== null)
      .map((f, i) => {
        const type = typeof f.type === 'string' && validTypeSet.has(f.type) ? f.type : 'short_answer';
        const label = typeof f.label === 'string' && f.label.trim() ? f.label.trim() : `Field ${i + 1}`;
        const required = typeof f.required === 'boolean' ? f.required : false;
        const placeholder = typeof f.placeholder === 'string' ? f.placeholder : '';
        const description = typeof f.description === 'string' ? f.description : '';
        const options = Array.isArray(f.options)
          ? f.options.filter((o): o is string => typeof o === 'string').slice(0, 10)
          : [];
        return {
          id: `ai-${Date.now()}-${i}`,
          type,
          label,
          required,
          placeholder,
          description,
          options,
        };
      })
      .filter((f) => f.label);

    if (normalized.length === 0) {
      return NextResponse.json(
        { error: 'AI could not generate fields from that prompt. Try describing the fields you need, e.g. "customer name, email, phone, service needed, preferred date".' },
        { status: 422 }
      );
    }

    return NextResponse.json({ fields: normalized });
  } catch (error) {
    console.error('[/api/ai/form-generator] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `AI form generation failed: ${message}` },
      { status: 500 }
    );
  }
}

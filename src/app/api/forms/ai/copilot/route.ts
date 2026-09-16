import { NextRequest, NextResponse } from 'next/server';
import { callAI } from '@/lib/ai-client';
import { FormSchema, FormField } from '@/lib/forms/form-schema-types';
import { WIDGET_REGISTRY } from '@/lib/forms/widgets/widget-registry';

function splitOutsideParens(str: string): string[] {
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
}

function parseCommaOrListPrompt(instruction: string): FormField[] | null {
  // Check if instruction contains multiple items like "name, email, service listing (AC, Plumbing), message, map"
  const parts = splitOutsideParens(instruction);
  if (parts.length < 2 && !instruction.includes('(')) return null;

  const fields: FormField[] = [];
  let index = 1;

  for (const rawPart of parts) {
    const part = rawPart.trim();
    if (!part || /^submit$/i.test(part) || /^create\s+(a\s+)?form/i.test(part)) continue;

    const lower = part.toLowerCase();

    // 1. Map / Location Finder
    if (lower.includes('map') || lower.includes('route planner') || lower.includes('google map')) {
      fields.push({
        id: `widget_map_${Date.now()}_${index++}`,
        type: 'control_widget',
        widgetType: 'route_planner_map',
        label: 'Service Location & Route Planner',
        required: false,
        width: 'full',
        widgetConfig: { provider: 'managed', travelMode: 'DRIVING', unit: 'miles' },
      });
      continue;
    }

    if (lower.includes('nearest') || lower.includes('location finder') || lower.includes('branch finder')) {
      fields.push({
        id: `widget_loc_${Date.now()}_${index++}`,
        type: 'control_widget',
        widgetType: 'nearest_location_finder',
        label: 'Nearest Service Hub',
        required: true,
        width: 'full',
        widgetConfig: { provider: 'managed', distanceUnit: 'miles' },
      });
      continue;
    }

    // 2. Photos / Images with notes
    if (lower.includes('photo') || lower.includes('damage') || lower.includes('image upload') || lower.includes('picture')) {
      fields.push({
        id: `widget_photo_${Date.now()}_${index++}`,
        type: 'control_widget',
        widgetType: 'image_upload_with_notes',
        label: 'Upload Photos with Notes',
        required: false,
        width: 'full',
        widgetConfig: { maxFiles: 10, requireNotes: true },
      });
      continue;
    }

    // 3. E-Signature
    if (lower.includes('signature') || lower.includes('sign off') || lower.includes('sign')) {
      fields.push({
        id: `widget_sign_${Date.now()}_${index++}`,
        type: 'control_widget',
        widgetType: 'e_signature',
        label: 'Authorized Signature',
        required: true,
        width: 'full',
        widgetConfig: { clearable: true },
      });
      continue;
    }

    // 4. Payment / Stripe
    if (lower.includes('stripe') || lower.includes('payment') || lower.includes('credit card') || lower.includes('paypal') || lower.includes('checkout')) {
      const isPaypal = lower.includes('paypal');
      fields.push({
        id: `widget_pay_${Date.now()}_${index++}`,
        type: 'control_widget',
        widgetType: isPaypal ? 'paypal_smart_buttons' : 'stripe_checkout',
        label: isPaypal ? 'PayPal Checkout' : 'Secure Credit Card Payment',
        required: true,
        width: 'full',
        widgetConfig: { currency: 'USD', amount: 50 },
      });
      continue;
    }

    // 5. Service Listing / Dropdown with options
    const optionsMatch = part.match(/\(([^)]+)\)|:\s*(.+)$/);
    if (optionsMatch || lower.includes('service') || lower.includes('listing') || lower.includes('dropdown') || lower.includes('select')) {
      let rawOptions: string[] = ['Standard Service', 'Emergency Repair', 'Routine Maintenance'];
      if (optionsMatch) {
        const optionStr = optionsMatch[1] || optionsMatch[2];
        rawOptions = optionStr.split(/[,|\/]+/).map((o) => o.trim()).filter(Boolean);
      }
      const labelClean = part.replace(/\([^)]+\)|:\s*.+$/g, '').trim() || 'Service Selection';
      fields.push({
        id: `field_srv_${Date.now()}_${index++}`,
        type: 'dropdown',
        label: labelClean,
        required: true,
        width: 'full',
        options: rawOptions.map((opt) => ({ label: opt, value: opt.toLowerCase().replace(/[^a-z0-9]+/g, '_') })),
      });
      continue;
    }

    // 6. Name
    if (lower.includes('name')) {
      fields.push({
        id: `field_name_${Date.now()}_${index++}`,
        type: 'short_answer',
        label: 'Full Name',
        placeholder: 'John Doe',
        required: true,
        width: 'half',
      });
      continue;
    }

    // 7. Email
    if (lower.includes('email')) {
      fields.push({
        id: `field_email_${Date.now()}_${index++}`,
        type: 'email',
        label: 'Email Address',
        placeholder: 'john@example.com',
        required: true,
        width: 'half',
      });
      continue;
    }

    // 8. Phone / WhatsApp
    if (lower.includes('phone') || lower.includes('mobile') || lower.includes('tel') || lower.includes('cell')) {
      fields.push({
        id: `field_phone_${Date.now()}_${index++}`,
        type: 'phone',
        label: 'Phone Number',
        placeholder: '(555) 000-0000',
        required: true,
        width: 'half',
      });
      continue;
    }

    // 9. Message / Notes / Long answer
    if (lower.includes('message') || lower.includes('note') || lower.includes('description') || lower.includes('detail') || lower.includes('comment')) {
      fields.push({
        id: `field_msg_${Date.now()}_${index++}`,
        type: 'long_answer',
        label: 'Project Details / Message',
        placeholder: 'Please provide any specific requirements or details...',
        required: false,
        width: 'full',
      });
      continue;
    }

    // 10. Default generic field
    fields.push({
      id: `field_${Date.now()}_${index++}`,
      type: 'short_answer',
      label: part.replace(/^(add|include|insert)\s+/i, '').trim(),
      required: false,
      width: 'full',
    });
  }

  return fields.length > 0 ? fields : null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const instruction = (body.instruction || body.command || '').trim();
    const currentSchema = body.currentSchema || body.schema || { fields: [] };

    if (!instruction) {
      return NextResponse.json({ error: 'Instruction or command is required' }, { status: 400 });
    }

    const lower = instruction.toLowerCase();
    let updatedSchema: FormSchema | null = null;
    let provider = 'fieseros-smart-rules';
    let model = 'copilot-instant-v2';

    // ─── Fast Zero-Token Heuristic Parser ───────────────────────────────────────
    // If user provided a multi-field specification list (e.g. "Name, Email, Service Listing (AC Repair, Plumbing), Message, Map in footer")
    const parsedListFields = parseCommaOrListPrompt(instruction);
    if (parsedListFields && (parsedListFields.length >= 3 || (!currentSchema.fields || currentSchema.fields.length === 0))) {
      updatedSchema = {
        version: 1,
        name: currentSchema.name || 'Custom AI Generated Form',
        description: currentSchema.description || 'Generated automatically based on your requested fields.',
        steps: [{ id: 'step_1', title: 'Details' }],
        fields: parsedListFields,
        theme: {
          primaryColor: currentSchema.theme?.primaryColor || '#059669',
          borderRadius: currentSchema.theme?.borderRadius || '12px',
          layout: 'classic',
        },
        settings: {
          submitButtonText: 'Submit Request',
          successTitle: 'Thank you!',
          successMessage: 'Your submission has been received.',
        },
      };
    } else if (lower.includes('map') && (lower.includes('footer') || lower.includes('bottom') || lower.includes('end') || lower.includes('add'))) {
      const currentFields = [...(currentSchema.fields || [])];
      currentFields.push({
        id: `widget_map_${Date.now()}`,
        type: 'control_widget',
        widgetType: 'route_planner_map',
        label: 'Interactive Service Route & Location Map',
        required: false,
        width: 'full',
        widgetConfig: { provider: 'managed', travelMode: 'DRIVING', unit: 'miles' },
      });
      updatedSchema = { ...currentSchema, fields: currentFields };
    } else if (lower.includes('stripe') || lower.includes('payment') || lower.includes('credit card')) {
      const currentFields = [...(currentSchema.fields || [])];
      currentFields.push({
        id: `widget_pay_${Date.now()}`,
        type: 'control_widget',
        widgetType: 'stripe_checkout',
        label: 'Secure Credit Card Payment (Stripe)',
        required: true,
        width: 'full',
        widgetConfig: { provider: 'managed', currency: 'USD', amount: 50 },
      });
      updatedSchema = { ...currentSchema, fields: currentFields };
    } else if (lower.includes('photo') || lower.includes('damage') || lower.includes('image')) {
      const currentFields = [...(currentSchema.fields || [])];
      currentFields.push({
        id: `widget_photo_${Date.now()}`,
        type: 'control_widget',
        widgetType: 'image_upload_with_notes',
        label: 'Upload Photos with Notes',
        required: false,
        width: 'full',
        widgetConfig: { maxFiles: 10, requireNotes: true },
      });
      updatedSchema = { ...currentSchema, fields: currentFields };
    } else if (lower.includes('signature') || lower.includes('sign')) {
      const currentFields = [...(currentSchema.fields || [])];
      currentFields.push({
        id: `widget_sign_${Date.now()}`,
        type: 'control_widget',
        widgetType: 'e_signature',
        label: 'Customer Signature',
        required: true,
        width: 'full',
      });
      updatedSchema = { ...currentSchema, fields: currentFields };
    }

    // ─── If LLM is available and instruction is conversational/open-ended ────────
    if (!updatedSchema) {
      try {
        const widgetSample = WIDGET_REGISTRY.slice(0, 30).map((w) => `${w.id} (${w.name})`).join(', ');

        const systemPrompt = `You are the Fieseros AI Form Studio Co-Pilot.
You receive a FormSchema JSON and a user prompt to build or modify form questions, options, widgets, and layout.

Available Widget Types:
- route_planner_map (Interactive Route Map & Mileage)
- nearest_location_finder (Nearest Depot/Branch Locator)
- google_places_autocomplete (Live Address & Postal Autocomplete)
- image_upload_with_notes (Multi-photo upload with caption/notes)
- take_photo_camera (In-form Camera Snapshot)
- e_signature (Digital Touch Signature)
- stripe_checkout (Credit card payment gateway)
- paypal_smart_buttons (PayPal instant checkout)
- calendar_booking (Date & Time slot booking)

Standard Field Types:
- short_answer, long_answer, dropdown (with options array), email, phone, numerical, date, time, checkbox, radio.

Rules:
1. For widgets, set type="control_widget" and widgetType to the appropriate widget ID.
2. If the user asks for a Map in the footer/bottom, append the route_planner_map or nearest_location_finder at the end of the fields array.
3. If the user specifies service options (e.g. "Service listing (AC Repair, Plumbing, Heating)"), output type="dropdown" with options: [{ label: "AC Repair", value: "ac_repair" }, ...].
4. Return ONLY valid JSON matching FormSchema (no markdown formatting, no explanations).`;

        const userMessage = `Current Form Schema:
${JSON.stringify(currentSchema, null, 2)}

User Instruction: "${instruction}"

Return the updated FormSchema JSON object.`;

        const aiRes = await callAI({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.3,
          json: true,
        });

        if (aiRes?.content) {
          provider = aiRes.provider || 'openrouter';
          model = aiRes.model || 'gpt-4o';
          try {
            updatedSchema = JSON.parse(aiRes.content);
          } catch {
            const jsonMatch = aiRes.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) updatedSchema = JSON.parse(jsonMatch[0]);
          }
        }
      } catch (aiErr) {
        console.warn('AI Co-Pilot callAI failed, using fallback heuristic:', aiErr);
      }
    }

    // ─── Ultimate fallback if still null ────────────────────────────────────────
    if (!updatedSchema) {
      const currentFields = [...(currentSchema.fields || [])];
      currentFields.push({
        id: `field_${Date.now()}`,
        type: 'short_answer',
        label: instruction.replace(/^(add|include|insert)\s+/i, '').trim() || 'New Question',
        required: false,
        width: 'full',
      });
      updatedSchema = {
        ...currentSchema,
        fields: currentFields,
      };
    }

    return NextResponse.json({
      success: true,
      schema: updatedSchema,
      provider,
      model,
    });
  } catch (error) {
    console.error('AI Co-Pilot Error:', error);
    return NextResponse.json(
      { error: 'Failed to apply AI Co-Pilot changes', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { callAI } from '@/lib/ai-client';
import { FormSchema, FormField } from '@/lib/forms/form-schema-types';
import { FIELD_REGISTRY } from '@/lib/forms/canonical-widget-registry';

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

/**
 * Checks if the instruction is a full conversational/creative prompt
 * (e.g. "Create a roofing estimate form with roof size in sq ft...")
 * rather than a simple raw comma-separated field list (e.g. "Name, Email, Phone, Map").
 */
function isDescriptivePrompt(instruction: string): boolean {
  const trimmed = instruction.trim().toLowerCase();
  if (/^(create|build|generate|make|design|set\s*up|new)\s+/i.test(trimmed)) return true;
  if (trimmed.includes('estimate') || trimmed.includes('calculator') || trimmed.includes('quote') || trimmed.includes('booking')) return true;
  if (trimmed.length > 50 && !trimmed.includes('(')) return true;
  return false;
}

function parseCommaOrListPrompt(instruction: string): FormField[] | null {
  // If it's a natural language request, do NOT use naive comma splitting.
  if (isDescriptivePrompt(instruction)) return null;

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
    if (lower.includes('stripe') || lower.includes('payment') || lower.includes('credit card') || lower.includes('paypal') || lower.includes('checkout') || lower.includes('deposit')) {
      const isPaypal = lower.includes('paypal');
      fields.push({
        id: `widget_pay_${Date.now()}_${index++}`,
        type: 'control_widget',
        widgetType: isPaypal ? 'paypal_smart_buttons' : 'stripe_checkout',
        label: isPaypal ? 'PayPal Checkout' : 'Secure Deposit Payment',
        required: true,
        width: 'full',
        widgetConfig: { currency: 'USD', amount: 50 },
      });
      continue;
    }

    // 5. Service Listing / Dropdown with options
    const optionsMatch = part.match(/\(([^)]+)\)|:\s*(.+)$/);
    if (optionsMatch || lower.includes('service') || lower.includes('listing') || lower.includes('dropdown') || lower.includes('select') || lower.includes('material')) {
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

/**
 * Synthesizes high-converting domain forms (Roofing, Dental, Cleaning, HVAC, Intake)
 * with multi-step workflows, calculation fields, material options, photos, e-sign, and payments.
 */
function synthesizePresetForm(prompt: string): FormSchema | null {
  const lower = prompt.toLowerCase();

  if (lower.includes('roof') || (lower.includes('material') && lower.includes('sq ft'))) {
    return {
      version: 1,
      steps: [
        { id: 'step_1', title: '01 Instant quote', description: 'Tell us about the roof' },
        { id: 'step_2', title: '02 Book inspection', description: 'Select property location & upload photos' },
        { id: 'step_3', title: '03 Secure deposit', description: 'Authorize signature & secure deposit' },
      ],
      fields: [
        {
          id: 'roof_address',
          type: 'address',
          label: 'Service Address / Location',
          placeholder: 'e.g. 48 King Road, London',
          required: true,
          stepId: 'step_1',
          width: 'full',
        },
        {
          id: 'roof_area',
          type: 'numerical',
          label: 'Approximate Roof Area (sq ft)',
          placeholder: '2400',
          required: true,
          stepId: 'step_1',
          width: 'half',
        },
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
        {
          id: 'damage_photos',
          type: 'control_widget',
          widgetType: 'image_upload_with_notes',
          label: 'Upload Roof & Damage Photos',
          required: false,
          stepId: 'step_2',
          width: 'full',
          widgetConfig: { maxFiles: 10, requireNotes: true },
        },
        {
          id: 'inspection_slot',
          type: 'control_widget',
          widgetType: 'calendar_booking',
          label: 'Preferred Inspection Date & Time',
          required: true,
          stepId: 'step_2',
          width: 'full',
          widgetConfig: { slotDurationMin: 45 },
        },
        {
          id: 'customer_name',
          type: 'short_answer',
          label: 'Full Name',
          placeholder: 'John Doe',
          required: true,
          stepId: 'step_2',
          width: 'half',
        },
        {
          id: 'customer_phone',
          type: 'phone',
          label: 'Mobile Phone Number',
          placeholder: '+44 7700 900077',
          required: true,
          stepId: 'step_2',
          width: 'half',
        },
        {
          id: 'customer_email',
          type: 'email',
          label: 'Email Address',
          placeholder: 'john@example.com',
          required: true,
          stepId: 'step_2',
          width: 'full',
        },
        {
          id: 'customer_signature',
          type: 'control_widget',
          widgetType: 'e_signature',
          label: 'Customer Authorization E-Signature',
          required: true,
          stepId: 'step_3',
          width: 'full',
          widgetConfig: { clearable: true },
        },
        {
          id: 'deposit_payment',
          type: 'control_widget',
          widgetType: 'stripe_checkout',
          label: 'Secure Inspection Deposit',
          required: true,
          stepId: 'step_3',
          width: 'full',
          widgetConfig: { currency: 'GBP', amount: 99 },
        },
      ],
      rules: [],
      theme: {
        primaryColor: '#059669',
        backgroundColor: '#ffffff',
        textColor: '#0f172a',
        borderRadius: '12px',
        layout: 'card',
      },
      settings: {
        submitButtonText: 'Confirm & Secure Estimate',
        successTitle: 'Estimate Request Received!',
        successMessage: 'Your live calculation has been saved and your inspection slot has been reserved.',
        actions: {
          createCrmLead: { enabled: true },
          sendEmailNotification: { enabled: true },
        },
      },
    };
  }

  if (lower.includes('dental') || lower.includes('clinic') || lower.includes('patient')) {
    return {
      version: 1,
      steps: [
        { id: 'step_1', title: '01 Patient Details', description: 'Tell us who you are' },
        { id: 'step_2', title: '02 Select Treatment', description: 'Pick service & doctor' },
        { id: 'step_3', title: '03 Appointment Slot', description: 'Confirm booking' },
      ],
      fields: [
        { id: 'patient_name', type: 'short_answer', label: 'Patient Full Name', required: true, stepId: 'step_1', width: 'half' },
        { id: 'patient_phone', type: 'phone', label: 'Phone Number', required: true, stepId: 'step_1', width: 'half' },
        { id: 'patient_email', type: 'email', label: 'Email Address', required: true, stepId: 'step_1', width: 'full' },
        {
          id: 'treatment_type',
          type: 'dropdown',
          label: 'Select Treatment',
          required: true,
          stepId: 'step_2',
          width: 'full',
          options: [
            { label: 'General Checkup & Clean (£75)', value: 'checkup' },
            { label: 'Emergency Toothache / Pain Relief (£110)', value: 'emergency' },
            { label: 'Cosmetic Teeth Whitening (£295)', value: 'whitening' },
            { label: 'Dental Implant Consultation (£95)', value: 'implant' },
          ],
        },
        {
          id: 'insurance_upload',
          type: 'control_widget',
          widgetType: 'image_upload_with_notes',
          label: 'Insurance Card / Referral Photo',
          required: false,
          stepId: 'step_2',
          width: 'full',
        },
        {
          id: 'booking_slot',
          type: 'control_widget',
          widgetType: 'calendar_booking',
          label: 'Preferred Appointment Slot',
          required: true,
          stepId: 'step_3',
          width: 'full',
        },
      ],
      rules: [],
      theme: { primaryColor: '#0284c7', backgroundColor: '#ffffff', textColor: '#0f172a', borderRadius: '12px', layout: 'card' },
      settings: {
        submitButtonText: 'Confirm Dental Booking',
        successTitle: 'Appointment Confirmed',
        successMessage: 'We have reserved your dental appointment slot and sent an SMS confirmation.',
      },
    };
  }

  if (lower.includes('clean') || lower.includes('maid') || lower.includes('housekeeping')) {
    return {
      version: 1,
      steps: [
        { id: 'step_1', title: '01 Scope & Rooms', description: 'Estimate cleaning scope' },
        { id: 'step_2', title: '02 Schedule & Frequency', description: 'Pick date & discounts' },
      ],
      fields: [
        { id: 'property_address', type: 'address', label: 'Property Address', required: true, stepId: 'step_1', width: 'full' },
        { id: 'bedroom_count', type: 'numerical', label: 'Number of Bedrooms', placeholder: '3', required: true, stepId: 'step_1', width: 'half' },
        { id: 'bathroom_count', type: 'numerical', label: 'Number of Bathrooms', placeholder: '2', required: true, stepId: 'step_1', width: 'half' },
        {
          id: 'clean_frequency',
          type: 'radio',
          label: 'Cleaning Frequency (Save up to 20%)',
          required: true,
          stepId: 'step_1',
          width: 'full',
          options: [
            { label: 'One-Time Deep Clean', value: 'one_time' },
            { label: 'Weekly Service (20% Off)', value: 'weekly' },
            { label: 'Bi-Weekly Service (15% Off)', value: 'bi_weekly' },
          ],
        },
        { id: 'customer_name', type: 'short_answer', label: 'Full Name', required: true, stepId: 'step_2', width: 'half' },
        { id: 'customer_phone', type: 'phone', label: 'Phone Number', required: true, stepId: 'step_2', width: 'half' },
        {
          id: 'booking_date',
          type: 'control_widget',
          widgetType: 'calendar_booking',
          label: 'Preferred First Cleaning Slot',
          required: true,
          stepId: 'step_2',
          width: 'full',
        },
      ],
      rules: [],
      theme: { primaryColor: '#059669', backgroundColor: '#ffffff', textColor: '#0f172a', borderRadius: '12px', layout: 'card' },
      settings: {
        submitButtonText: 'Book Cleaning Service',
        successTitle: 'Booking Request Received',
        successMessage: 'We have dispatched your cleaning request to our scheduling coordinator.',
      },
    };
  }

  if (lower.includes('hvac') || lower.includes('ac') || lower.includes('heat') || lower.includes('furnace')) {
    return {
      version: 1,
      steps: [
        { id: 'step_1', title: '01 HVAC Problem', description: 'Diagnose the issue' },
        { id: 'step_2', title: '02 Location & Dispatch', description: 'Book technician' },
      ],
      fields: [
        { id: 'hvac_address', type: 'address', label: 'Service Location', required: true, stepId: 'step_1', width: 'full' },
        {
          id: 'system_type',
          type: 'dropdown',
          label: 'Equipment Type',
          required: true,
          stepId: 'step_1',
          width: 'half',
          options: [
            { label: 'Central AC System', value: 'central_ac' },
            { label: 'Gas Furnace / Heating', value: 'gas_furnace' },
            { label: 'Heat Pump / Mini-Split', value: 'heat_pump' },
            { label: 'Commercial Rooftop HVAC', value: 'commercial_hvac' },
          ],
        },
        {
          id: 'urgency_level',
          type: 'radio',
          label: 'Urgency Level',
          required: true,
          stepId: 'step_1',
          width: 'half',
          options: [
            { label: 'Emergency (No heat/cooling) — Within 2h', value: 'emergency' },
            { label: 'Standard Diagnostic — Within 24h', value: 'standard' },
          ],
        },
        {
          id: 'equipment_photo',
          type: 'control_widget',
          widgetType: 'image_upload_with_notes',
          label: 'Photo of Equipment Model Badge / Error',
          required: false,
          stepId: 'step_1',
          width: 'full',
        },
        { id: 'customer_name', type: 'short_answer', label: 'Full Name', required: true, stepId: 'step_2', width: 'half' },
        { id: 'customer_phone', type: 'phone', label: 'Phone Number', required: true, stepId: 'step_2', width: 'half' },
        {
          id: 'dispatch_slot',
          type: 'control_widget',
          widgetType: 'calendar_booking',
          label: 'Select Dispatch Window',
          required: true,
          stepId: 'step_2',
          width: 'full',
        },
      ],
      rules: [],
      theme: { primaryColor: '#d97706', backgroundColor: '#ffffff', textColor: '#0f172a', borderRadius: '12px', layout: 'card' },
      settings: {
        submitButtonText: 'Dispatch HVAC Tech',
        successTitle: 'Emergency Tech Dispatched',
        successMessage: 'Your technician has received your ticket and will call with an exact arrival ETA.',
      },
    };
  }

  return null;
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

    // ─── 1. Check for Domain Presets / Full Estimator Form Requests ──────────────
    if (!currentSchema.fields || currentSchema.fields.length === 0 || /create|build|generate|make|quote|estimate|calculator/i.test(instruction)) {
      const preset = synthesizePresetForm(instruction);
      if (preset) {
        updatedSchema = preset;
        provider = 'fieseros-domain-engine';
        model = 'trade-estimator-v3';
      }
    }

    // ─── 2. Fast Shorthand List Parser (e.g. "Name, Email, Phone, Map") ──────────
    if (!updatedSchema) {
      const parsedListFields = parseCommaOrListPrompt(instruction);
      if (parsedListFields && (parsedListFields.length >= 2 || (!currentSchema.fields || currentSchema.fields.length === 0))) {
        updatedSchema = {
          version: 1,
          steps: [{ id: 'step_1', title: 'Details' }],
          fields: parsedListFields,
          rules: currentSchema.rules || [],
          theme: {
            primaryColor: currentSchema.theme?.primaryColor || '#059669',
            backgroundColor: currentSchema.theme?.backgroundColor || '#ffffff',
            textColor: currentSchema.theme?.textColor || '#0f172a',
            borderRadius: currentSchema.theme?.borderRadius || '12px',
            layout: 'classic',
          },
          settings: {
            submitButtonText: 'Submit Request',
            successTitle: 'Thank you!',
            successMessage: 'Your submission has been received.',
            actions: currentSchema.settings?.actions || {},
          },
        };
      }
    }

    // ─── 3. Single-Action Incremental Modifiers ──────────────────────────────────
    if (!updatedSchema) {
      if (lower.includes('map') && (lower.includes('footer') || lower.includes('bottom') || lower.includes('end') || lower.includes('add'))) {
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
      } else if (lower.includes('stripe') || lower.includes('payment') || lower.includes('credit card') || lower.includes('deposit')) {
        const currentFields = [...(currentSchema.fields || [])];
        currentFields.push({
          id: `widget_pay_${Date.now()}`,
          type: 'control_widget',
          widgetType: 'stripe_checkout',
          label: 'Secure Deposit Payment',
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
    }

    // ─── 4. LLM Fallback for open-ended conversational prompts ───────────────────
    if (!updatedSchema) {
      try {
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
2. If the user asks for estimates/calculations, include numerical fields for scope (e.g. sq ft) and dropdown/radio for tiers with price rates.
3. Return ONLY valid JSON matching FormSchema (no markdown formatting, no explanations).`;

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

    // ─── 5. Ultimate fallback if still null ──────────────────────────────────────
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

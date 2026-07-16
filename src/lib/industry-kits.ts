/**
 * industry-kits.ts — SINGLE SOURCE OF TRUTH for Industry Starter Kits.
 *
 * Used by:
 *   - src/app/api/workspaces/industries/route.ts (industry picker list)
 *   - src/app/api/workspaces/[id]/seed/route.ts (install everything)
 *   - src/app/api/workflows/[id]/seed/route.ts (legacy single-workflow seed)
 *   - src/components/onboarding/industry-onboarding.tsx (UI picker)
 *   - src/components/onboarding/saas-onboarding.tsx (SaaS onboarding picker)
 *
 * Standard industry IDs (DO NOT rename — they are persisted on Workspace.industry):
 *   hvac | plumbing | cleaning | electrical | pest-control |
 *   landscaping | roofing | general-contractor
 *
 * Each kit installs (via /api/workspaces/[id]/seed):
 *   - 3 Workflow records (real nodesJson + edgesJson, not empty)
 *   - 3 Form records (fieldsJson populated)
 *   - 3 Checklist records (sectionsJson populated)
 *   - 3 quote templates (stored in workspace.settingsJson.quoteTemplates — no QuoteTemplate model exists)
 *   - 8-10 Service records (with basePrice, duration, checklistId)
 *   - 3 EmailTemplate records (subject + htmlBody + variablesJson)
 *   - 3 WhatsApp templates (stored in workspace.settingsJson.whatsappTemplates — no WhatsAppTemplate model exists)
 *   - Employee roles + job types (stored in workspace.settingsJson — Employee.role is a free string)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IndustryWorkflowDef {
  name: string;
  description: string;
  trigger: string; // e.g. "job_created", "invoice_overdue"
  actions: string[]; // e.g. ["send_whatsapp", "create_follow_up"]
}

export interface IndustryFormDef {
  name: string;
  description: string;
  type:
    | 'lead_capture'
    | 'booking'
    | 'feedback'
    | 'survey'
    | 'quote_request'
    | 'job_request'
    | 'custom';
  fields: string[]; // field names
}

export interface IndustryChecklistDef {
  name: string;
  category: string;
  items: string[];
}

export interface IndustryQuoteTemplateDef {
  name: string;
  lineItems: Array<{ name: string; defaultPrice: number }>;
}

export interface IndustryServiceDef {
  name: string;
  description: string;
  category: string;
  defaultPrice: number;
  duration: string; // human-readable, parsed to minutes
  icon?: string;
}

export interface IndustryEmailTemplateDef {
  name: string;
  slug: string;
  subject: string;
  body: string; // plain text body — converted to htmlBody + textBody at seed time
}

export interface IndustryWhatsAppTemplateDef {
  name: string;
  body: string;
}

export interface IndustryKit {
  id: string;
  name: string;
  icon: string; // lucide icon name (NOT emoji)
  emoji: string; // emoji for fallback rendering
  description: string;
  workflows: IndustryWorkflowDef[];
  forms: IndustryFormDef[];
  checklists: IndustryChecklistDef[];
  quoteTemplates: IndustryQuoteTemplateDef[];
  services: IndustryServiceDef[];
  emailTemplates: IndustryEmailTemplateDef[];
  whatsappTemplates: IndustryWhatsAppTemplateDef[];
  employeeRoles: string[];
  jobTypes: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a human-readable duration like "1h 30m" / "45m" / "2h" to minutes. */
export function durationToMinutes(duration: string): number {
  let minutes = 0;
  const hourMatch = duration.match(/(\d+)\s*h/i);
  const minMatch = duration.match(/(\d+)\s*m/i);
  if (hourMatch) minutes += parseInt(hourMatch[1], 10) * 60;
  if (minMatch) minutes += parseInt(minMatch[1], 10);
  return minutes || 60;
}

/** Plain-text → simple HTML wrapper for email template bodies. */
export function textToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#1f2937;">${escaped.replace(
    /\n/g,
    '<br/>'
  )}</div>`;
}

/** Extract {{variables}} from a template string. */
export function extractVariables(text: string): Array<{ key: string; label: string; required: boolean; example: string }> {
  const matches = text.matchAll(/\{\{\s*(\w+)\s*\}\}/g);
  const seen = new Set<string>();
  const out: Array<{ key: string; label: string; required: boolean; example: string }> = [];
  for (const m of matches) {
    const key = m[1];
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      key,
      label: key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (s) => s.toUpperCase())
        .trim(),
      required: true,
      example: '',
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// HVAC
// ---------------------------------------------------------------------------

const hvacKit: IndustryKit = {
  id: 'hvac',
  name: 'HVAC',
  icon: 'Wind',
  emoji: '❄️',
  description: 'Heating, ventilation, and air conditioning service, repair, and installation',
  workflows: [
    {
      name: 'New Job → Customer Confirmation',
      description:
        'When a new HVAC job is created, send a WhatsApp confirmation to the customer with appointment details and a calendar hold.',
      trigger: 'job_created',
      actions: ['send_whatsapp', 'send_email', 'create_calendar_event'],
    },
    {
      name: 'Job Completed → Review Request',
      description:
        'After a technician marks a job complete, wait 2 hours then send a review-request WhatsApp + email with a 1-tap rating link.',
      trigger: 'job_completed',
      actions: ['wait_2h', 'send_whatsapp', 'send_email', 'create_follow_up'],
    },
    {
      name: 'Invoice Overdue → Reminder',
      description:
        'When an invoice is 3 days overdue, send a polite WhatsApp reminder and create a follow-up task for the office manager.',
      trigger: 'invoice_overdue',
      actions: ['send_whatsapp', 'create_follow_up', 'notify_manager'],
    },
  ],
  forms: [
    {
      name: 'HVAC Service Request',
      description: 'Lead capture form for residential & commercial HVAC service requests.',
      type: 'lead_capture',
      fields: ['fullName', 'phone', 'email', 'serviceAddress', 'systemType', 'issueDescription', 'preferredDate', 'urgency'],
    },
    {
      name: 'Customer Satisfaction Survey',
      description: 'Post-service satisfaction survey sent 24h after job completion.',
      type: 'feedback',
      fields: ['customerName', 'technicianName', 'overallRating', 'punctualityRating', 'qualityRating', 'comments', 'wouldRecommend'],
    },
    {
      name: 'Annual Maintenance Agreement',
      description: 'Sign-up form for an annual HVAC tune-up contract (2 visits/year).',
      type: 'custom',
      fields: ['businessName', 'contactName', 'phone', 'email', 'systemCount', 'planTier', 'billingCycle', 'signature'],
    },
  ],
  checklists: [
    {
      name: 'AC Tune-Up Checklist',
      category: 'AC Service',
      items: [
        'Inspect and clean condenser coils',
        'Check refrigerant pressure and top up if needed',
        'Inspect and replace air filter',
        'Lubricate fan motor and bearings',
        'Check thermostat calibration',
        'Inspect electrical connections and tighten',
        'Measure supply/return temperature differential',
        'Clear condensate drain line',
        'Verify system operation through full cooling cycle',
        'Document readings on work order',
      ],
    },
    {
      name: 'New System Installation Checklist',
      category: 'Installation',
      items: [
        'Verify equipment matches work order (model, tonnage, voltage)',
        'Confirm permits pulled and posted',
        'Disconnect and remove old equipment',
        'Set new pad / mount indoor unit level',
        'Install line-set, vacuum to 500 microns',
        'Wire line-voltage and low-voltage connections',
        'Install new thermostat and configure',
        'Start system, verify refrigerant charge by subcooling/superheat',
        'Walk customer through operation and warranty',
        'Clean work area and haul away old unit',
      ],
    },
    {
      name: 'Safety Inspection Checklist',
      category: 'Inspection',
      items: [
        'Check carbon monoxide detector operation',
        'Inspect heat exchanger for cracks',
        'Test gas pressure and leak-check',
        'Verify flue draft and venting',
        'Inspect blower wheel and clean if needed',
        'Check all safety limits and rollout switches',
        'Test emergency shut-off',
        'Document gas pressure and CO readings',
      ],
    },
  ],
  quoteTemplates: [
    {
      name: 'AC Repair Quote',
      lineItems: [
        { name: 'Diagnostic / Service Call', defaultPrice: 89 },
        { name: 'Refrigerant Recharge (R-410A, up to 2 lbs)', defaultPrice: 145 },
        { name: 'Capacitor Replacement', defaultPrice: 175 },
        { name: 'Labor (1 hr)', defaultPrice: 120 },
      ],
    },
    {
      name: 'New AC Installation',
      lineItems: [
        { name: '3-Ton 16 SEER Condenser + Air Handler', defaultPrice: 3850 },
        { name: 'Line-set & Misc Materials', defaultPrice: 350 },
        { name: 'Smart Thermostat', defaultPrice: 245 },
        { name: 'Labor & Installation', defaultPrice: 1450 },
        { name: 'Permit & Inspection', defaultPrice: 175 },
      ],
    },
    {
      name: 'Annual Maintenance Contract',
      lineItems: [
        { name: 'Spring Cooling Tune-Up', defaultPrice: 129 },
        { name: 'Fall Heating Tune-Up', defaultPrice: 129 },
        { name: 'Priority Service Dispatch', defaultPrice: 0 },
        { name: '15% Repair Discount', defaultPrice: 0 },
      ],
    },
  ],
  services: [
    { name: 'AC Diagnostic & Service Call', description: 'On-site diagnosis of AC issue with written estimate', category: 'repair', defaultPrice: 89, duration: '1h' },
    { name: 'Refrigerant Recharge (R-410A)', description: 'Per pound, up to system capacity', category: 'repair', defaultPrice: 75, duration: '30m' },
    { name: 'Evaporator Coil Cleaning', description: 'Chemical clean of indoor coil, restore airflow', category: 'maintenance', defaultPrice: 195, duration: '1h 30m' },
    { name: 'Condenser Coil Cleaning', description: 'Outdoor unit deep clean with coil cleaner', category: 'maintenance', defaultPrice: 145, duration: '1h' },
    { name: 'Thermostat Installation (Smart)', description: 'Install Wi-Fi smart thermostat, configure scheduling', category: 'installation', defaultPrice: 245, duration: '1h' },
    { name: 'Capacitor Replacement', description: 'Replace failed run/start capacitor', category: 'repair', defaultPrice: 175, duration: '45m' },
    { name: 'AC Tune-Up (Pre-Season)', description: 'Full cooling-season tune-up per manufacturer spec', category: 'maintenance', defaultPrice: 129, duration: '1h 15m' },
    { name: 'Furnace Tune-Up (Pre-Season)', description: 'Heating-season safety + tune-up', category: 'maintenance', defaultPrice: 129, duration: '1h 15m' },
    { name: 'Duct Cleaning (per system)', description: 'Whole-home duct cleaning with sanitizer', category: 'maintenance', defaultPrice: 449, duration: '3h' },
    { name: 'Emergency After-Hours Service', description: 'Same-night emergency dispatch (premium rate)', category: 'emergency', defaultPrice: 249, duration: '1h 30m' },
  ],
  emailTemplates: [
    {
      name: 'Appointment Confirmation',
      slug: 'hvac-appointment-confirmation',
      subject: 'Your {{companyName}} service appointment is confirmed for {{appointmentDate}}',
      body: `Hi {{customerName}},

Your HVAC service appointment is confirmed!

Date: {{appointmentDate}}
Time: {{appointmentTime}}
Technician: {{technicianName}}
Service: {{serviceName}}
Address: {{serviceAddress}}

If you need to reschedule, just reply to this email or call {{companyPhone}}.

Thanks for choosing {{companyName}}!`,
    },
    {
      name: 'Service Completed — Rate Us',
      slug: 'hvac-service-review-request',
      subject: 'How did {{technicianName}} do, {{customerName}}?',
      body: `Hi {{customerName}},

Your {{serviceName}} is complete. We'd love your feedback — it takes 30 seconds and helps us serve you better.

Rate your service: {{reviewLink}}

Thanks again,
The {{companyName}} Team`,
    },
    {
      name: 'Invoice Overdue Reminder',
      slug: 'hvac-invoice-overdue',
      subject: 'Friendly reminder: Invoice {{invoiceNumber}} is past due',
      body: `Hi {{customerName}},

Just a friendly reminder that invoice {{invoiceNumber}} for {{invoiceAmount}} was due on {{dueDate}}.

Pay now: {{paymentLink}}

If you've already paid, please disregard this email. Questions? Reply here or call {{companyPhone}}.

Thanks,
{{companyName}}`,
    },
  ],
  whatsappTemplates: [
    {
      name: 'Tech En Route',
      body: `Hi {{customerName}}, this is {{technicianName}} from {{companyName}}. I'm on my way and should arrive in about {{eta}} minutes. Reply here if you need to reach me. 🚐`,
    },
    {
      name: 'Job Complete',
      body: `✅ Your {{serviceName}} is complete! A receipt has been emailed to you. Rate your experience here: {{reviewLink}} — it really helps us. Thank you, {{customerName}}!`,
    },
    {
      name: 'Maintenance Reminder',
      body: `Hi {{customerName}}, it's been 6 months since your last HVAC tune-up. Book your seasonal maintenance now and stay ahead of breakdowns: {{bookingLink}}`,
    },
  ],
  employeeRoles: ['HVAC Technician', 'Install Lead', 'Service Manager'],
  jobTypes: ['AC Repair', 'Heating Repair', 'Maintenance', 'Installation', 'Inspection', 'Emergency Service', 'Duct Cleaning', 'Thermostat Install', 'Refrigerant Recharge', 'System Replacement'],
};

// ---------------------------------------------------------------------------
// PLUMBING
// ---------------------------------------------------------------------------

const plumbingKit: IndustryKit = {
  id: 'plumbing',
  name: 'Plumbing',
  icon: 'Wrench',
  emoji: '🔧',
  description: 'Pipe repair, drain cleaning, water heater, and fixture installation',
  workflows: [
    {
      name: 'New Job → Customer Confirmation',
      description:
        'When a new plumbing job is created, send a WhatsApp confirmation and add the customer to the route for the assigned day.',
      trigger: 'job_created',
      actions: ['send_whatsapp', 'add_to_route', 'notify_technician'],
    },
    {
      name: 'Job Completed → Review Request',
      description:
        'After a plumbing job is marked complete, wait 1 hour then send a review request via WhatsApp and email.',
      trigger: 'job_completed',
      actions: ['wait_1h', 'send_whatsapp', 'send_email', 'create_follow_up'],
    },
    {
      name: 'Invoice Overdue → Reminder',
      description:
        'When an invoice is 5 days overdue, send a WhatsApp reminder and escalate to a phone call task.',
      trigger: 'invoice_overdue',
      actions: ['send_whatsapp', 'create_call_task', 'notify_manager'],
    },
  ],
  forms: [
    {
      name: 'Plumbing Service Request',
      description: 'Lead capture for residential & commercial plumbing service calls.',
      type: 'lead_capture',
      fields: ['fullName', 'phone', 'email', 'serviceAddress', 'issueType', 'urgency', 'bestTimeToCall', 'description'],
    },
    {
      name: 'Customer Satisfaction Survey',
      description: 'Short 4-question satisfaction survey after every job.',
      type: 'feedback',
      fields: ['customerName', 'plumberName', 'overallRating', 'cleanlinessRating', 'comments', 'wouldRecommend'],
    },
    {
      name: 'Water Heater Quote Request',
      description: 'Quote request form for water heater replacement.',
      type: 'quote_request',
      fields: ['fullName', 'phone', 'email', 'address', 'currentHeaterType', 'householdSize', 'preferredFuelType', 'budgetRange'],
    },
  ],
  checklists: [
    {
      name: 'Water Heater Replacement',
      category: 'Installation',
      items: [
        'Shut off water and gas/electric supply',
        'Drain old tank and disconnect',
        'Inspect pan and floor for damage',
        'Set new heater in place and level',
        'Connect supply lines with dielectric unions',
        'Connect gas line / electric with proper fittings',
        'Install T&P valve and discharge pipe to within 6" of floor',
        'Fill tank, bleed air, check for leaks',
        'Light pilot / restore power, verify temperature setting',
        'Walk customer through operation and warranty',
      ],
    },
    {
      name: 'Drain Cleaning Checklist',
      category: 'Drain Service',
      items: [
        'Identify cleanout access',
        'Run camera to locate blockage',
        'Snake or hydro-jet to clear line',
        'Verify flow with multiple fixtures',
        'Re-scope to confirm clean line',
        'Note any root intrusion or broken pipe',
        'Clean up work area',
        'Provide customer with video + recommendations',
      ],
    },
    {
      name: 'Emergency Leak Repair',
      category: 'Emergency',
      items: [
        'Verify main water shut-off location with customer',
        'Isolate affected fixture / zone',
        'Locate source of leak',
        'Cut out damaged section / replace fitting',
        'Pressure test repair (10 min)',
        'Inspect adjacent area for hidden damage',
        'Document with before/after photos',
        'Provide estimate for any related repairs',
      ],
    },
  ],
  quoteTemplates: [
    {
      name: 'Drain Cleaning Quote',
      lineItems: [
        { name: 'Service Call / Diagnosis', defaultPrice: 79 },
        { name: 'Main Line Snaking (up to 100 ft)', defaultPrice: 195 },
        { name: 'Hydro-Jetting (per line)', defaultPrice: 395 },
        { name: 'Camera Inspection', defaultPrice: 145 },
      ],
    },
    {
      name: 'Water Heater Replacement',
      lineItems: [
        { name: '50-Gallon Gas Water Heater', defaultPrice: 985 },
        { name: 'Permit & Disposal of Old Unit', defaultPrice: 145 },
        { name: 'Labor & Materials', defaultPrice: 685 },
        { name: 'Expansion Tank', defaultPrice: 85 },
      ],
    },
    {
      name: 'Repipe Quote (Whole-Home)',
      lineItems: [
        { name: 'PEX Repipe (per fixture)', defaultPrice: 285 },
        { name: 'Drywall Repair & Patch', defaultPrice: 425 },
        { name: 'Permit & Inspection', defaultPrice: 225 },
        { name: 'Pressure Test & Flush', defaultPrice: 145 },
      ],
    },
  ],
  services: [
    { name: 'Service Call / Diagnosis', description: 'On-site diagnosis of plumbing issue with written estimate', category: 'diagnostic', defaultPrice: 79, duration: '45m' },
    { name: 'Toilet Repair', description: 'Flapper, fill valve, or wax ring replacement', category: 'repair', defaultPrice: 145, duration: '1h' },
    { name: 'Faucet Repair / Replacement', description: 'Repair or replace kitchen/bath faucet', category: 'repair', defaultPrice: 165, duration: '1h' },
    { name: 'Drain Snaking (Main Line)', description: 'Snaking of main sewer line up to 100 ft', category: 'drain', defaultPrice: 195, duration: '1h 30m' },
    { name: 'Hydro-Jetting', description: 'High-pressure jetting to clear stubborn blockages', category: 'drain', defaultPrice: 395, duration: '2h' },
    { name: 'Water Heater Replacement (50 gal gas)', description: 'Remove & replace 50-gallon gas water heater, permit included', category: 'installation', defaultPrice: 1815, duration: '4h' },
    { name: 'Tankless Water Heater Install', description: 'Install new tankless water heater with gas upgrade', category: 'installation', defaultPrice: 3250, duration: '6h' },
    { name: 'Camera Sewer Inspection', description: 'Video inspection of sewer line, includes video file', category: 'inspection', defaultPrice: 145, duration: '1h' },
    { name: 'Slab Leak Detection', description: 'Electronic leak detection under slab', category: 'inspection', defaultPrice: 295, duration: '2h' },
    { name: 'Emergency After-Hours Service', description: 'Same-night emergency dispatch (premium rate)', category: 'emergency', defaultPrice: 225, duration: '1h 30m' },
  ],
  emailTemplates: [
    {
      name: 'Appointment Confirmation',
      slug: 'plumbing-appointment-confirmation',
      subject: 'Your {{companyName}} plumbing appointment — {{appointmentDate}} at {{appointmentTime}}',
      body: `Hi {{customerName}},

Your plumbing appointment is confirmed.

Date: {{appointmentDate}}
Time: {{appointmentTime}}
Technician: {{technicianName}}
Service: {{serviceName}}
Address: {{serviceAddress}}

If you need to reschedule, reply to this email or call {{companyPhone}}.

Thanks,
{{companyName}}`,
    },
    {
      name: 'Service Completed — Rate Us',
      slug: 'plumbing-service-review-request',
      subject: 'Quick rating for {{companyName}}?',
      body: `Hi {{customerName}},

Your {{serviceName}} is complete. Could you take 30 seconds to rate us?

{{reviewLink}}

Thank you!
{{companyName}}`,
    },
    {
      name: 'Invoice Overdue Reminder',
      slug: 'plumbing-invoice-overdue',
      subject: 'Reminder: Invoice {{invoiceNumber}} is past due',
      body: `Hi {{customerName}},

A friendly reminder that invoice {{invoiceNumber}} for {{invoiceAmount}} was due {{dueDate}}.

Pay online: {{paymentLink}}

Questions? Reply here or call {{companyPhone}}.

Thanks,
{{companyName}}`,
    },
  ],
  whatsappTemplates: [
    {
      name: 'Tech En Route',
      body: `Hi {{customerName}} — {{technicianName}} from {{companyName}} here. I'm about {{eta}} minutes away. Please ensure clear access to the work area. 🚐`,
    },
    {
      name: 'Job Complete + Invoice',
      body: `✅ All done, {{customerName}}! Your {{serviceName}} is complete. Your invoice ({{invoiceAmount}}) has been emailed — pay here: {{paymentLink}}. Thanks for choosing {{companyName}}!`,
    },
    {
      name: 'Maintenance Reminder',
      body: `Hi {{customerName}}, time for your annual water heater flush & plumbing inspection. Book now: {{bookingLink}} — {{companyName}}`,
    },
  ],
  employeeRoles: ['Plumber', 'Apprentice', 'Service Manager'],
  jobTypes: ['Repair', 'Installation', 'Drain Cleaning', 'Inspection', 'Water Heater', 'Emergency Service', 'Repipe', 'Leak Detection', 'Fixture Replace', 'Sewer Line'],
};

// ---------------------------------------------------------------------------
// CLEANING
// ---------------------------------------------------------------------------

const cleaningKit: IndustryKit = {
  id: 'cleaning',
  name: 'Cleaning',
  icon: 'Sparkles',
  emoji: '🧹',
  description: 'Residential, commercial, move-in/move-out, and post-construction cleaning',
  workflows: [
    {
      name: 'New Booking → Crew Assignment',
      description:
        'When a booking is created, auto-assign to the best available crew and send a WhatsApp confirmation to the customer.',
      trigger: 'booking_created',
      actions: ['auto_assign_crew', 'send_whatsapp', 'send_email'],
    },
    {
      name: 'Job Completed → Review Request',
      description:
        'After cleaning is marked complete, send a review request and offer a re-clean if rating < 4 stars.',
      trigger: 'job_completed',
      actions: ['send_whatsapp', 'send_email', 'conditional_reclean'],
    },
    {
      name: 'Recurring Reminder → 24h Notice',
      description:
        'Send a 24-hour reminder before a recurring cleaning appointment, with reschedule link.',
      trigger: 'scheduled_reminder',
      actions: ['send_whatsapp', 'send_email', 'create_calendar_event'],
    },
  ],
  forms: [
    {
      name: 'Cleaning Quote Request',
      description: 'Quote request form for one-time or recurring cleaning.',
      type: 'quote_request',
      fields: ['fullName', 'phone', 'email', 'address', 'propertyType', 'squareFootage', 'bedrooms', 'bathrooms', 'cleaningType', 'frequency', 'preferredDate'],
    },
    {
      name: 'Move-In / Move-Out Checklist',
      description: 'Pre-cleaning checklist the customer fills out to scope a move cleaning.',
      type: 'custom',
      fields: ['fullName', 'phone', 'address', 'moveDate', 'propertyType', 'appliancesIncluded', 'carpetedAreas', 'specialInstructions'],
    },
    {
      name: 'Customer Satisfaction Survey',
      description: 'Post-clean satisfaction survey.',
      type: 'feedback',
      fields: ['customerName', 'crewName', 'cleanlinessRating', 'punctualityRating', 'comments', 'wouldRecommend', 'wouldRebook'],
    },
  ],
  checklists: [
    {
      name: 'Standard Home Clean',
      category: 'Residential',
      items: [
        'Dust all surfaces, fans, and blinds',
        'Wipe down kitchen counters, appliances exterior, and sink',
        'Clean kitchen interior (microwave, stove top)',
        'Scrub and sanitize bathrooms (tub, shower, toilet, sink)',
        'Clean mirrors and glass',
        'Vacuum all carpets and rugs',
        'Mop all hard floors',
        'Empty all trash cans and replace bags',
        'Make beds (if requested)',
        'Lock up and return key per procedure',
      ],
    },
    {
      name: 'Move-Out Deep Clean',
      category: 'Move-Out',
      items: [
        'Remove all remaining items and trash',
        'Clean inside all cabinets and drawers',
        'Clean inside refrigerator, oven, and dishwasher',
        'Descale showerheads and faucets',
        'Scrub grout and tile',
        'Wipe down baseboards and door frames',
        'Clean interior windows and sills',
        'Vacuum and shampoo carpets (if requested)',
        'Sweep and mop garage (if applicable)',
        'Take before/after photos for records',
      ],
    },
    {
      name: 'Post-Construction Clean',
      category: 'Post-Construction',
      items: [
        'Remove construction debris and vacuum dust',
        'Wipe down all surfaces (walls, trim, doors)',
        'Clean interior of all cabinets and drawers',
        'Wash interior windows and remove stickers',
        'Polish stainless steel appliances',
        'Scrub and sanitize all bathrooms',
        'Clean light fixtures and ceiling fans',
        'Vacuum and mop all floors',
        'Final walk-through with contractor',
        'Document completion photos',
      ],
    },
  ],
  quoteTemplates: [
    {
      name: 'One-Time Deep Clean',
      lineItems: [
        { name: 'Deep Clean — 3 BR / 2 BA (up to 2,000 sqft)', defaultPrice: 285 },
        { name: 'Interior Fridge', defaultPrice: 35 },
        { name: 'Interior Oven', defaultPrice: 35 },
        { name: 'Interior Windows', defaultPrice: 75 },
      ],
    },
    {
      name: 'Recurring Bi-Weekly Clean',
      lineItems: [
        { name: 'Standard Clean — 3 BR / 2 BA (recurring)', defaultPrice: 135 },
        { name: '10% Recurring Discount', defaultPrice: 0 },
        { name: 'First-Clean Reset Fee (one-time)', defaultPrice: 65 },
      ],
    },
    {
      name: 'Move-Out Clean',
      lineItems: [
        { name: 'Move-Out Deep Clean — 3 BR / 2 BA', defaultPrice: 385 },
        { name: 'Carpet Shampoo (per room)', defaultPrice: 55 },
        { name: 'Wall Spot Cleaning (per hour)', defaultPrice: 65 },
      ],
    },
  ],
  services: [
    { name: 'Standard Home Clean', description: 'Routine cleaning of all living areas, kitchen, and bathrooms', category: 'residential', defaultPrice: 135, duration: '2h 30m' },
    { name: 'Deep Clean', description: 'Top-to-bottom deep clean including baseboards, blinds, and detail work', category: 'residential', defaultPrice: 285, duration: '4h' },
    { name: 'Move-In / Move-Out Clean', description: 'Full clean for empty property, includes inside appliances', category: 'move', defaultPrice: 385, duration: '5h' },
    { name: 'Post-Construction Clean', description: 'Construction dust removal and detail clean for new builds/renovations', category: 'post-construction', defaultPrice: 525, duration: '6h' },
    { name: 'Carpet Shampoo (per room)', description: 'Hot-water extraction carpet cleaning', category: 'addon', defaultPrice: 55, duration: '45m' },
    { name: 'Interior Oven Clean', description: 'Degrease and deep clean oven interior', category: 'addon', defaultPrice: 35, duration: '30m' },
    { name: 'Interior Fridge Clean', description: 'Empty, sanitize, and reorganize refrigerator', category: 'addon', defaultPrice: 35, duration: '30m' },
    { name: 'Window Cleaning (interior)', description: 'Per pane, interior side only', category: 'addon', defaultPrice: 8, duration: '15m' },
    { name: 'Office / Commercial Clean', description: 'Per-hour commercial cleaning (5-hour minimum)', category: 'commercial', defaultPrice: 65, duration: '5h' },
    { name: 'Same-Day Emergency Clean', description: 'Same-day dispatch for urgent cleaning needs (premium)', category: 'emergency', defaultPrice: 225, duration: '3h' },
  ],
  emailTemplates: [
    {
      name: 'Booking Confirmation',
      slug: 'cleaning-booking-confirmation',
      subject: 'Cleaning confirmed for {{appointmentDate}} at {{appointmentTime}}',
      body: `Hi {{customerName}},

Your cleaning is confirmed!

Date: {{appointmentDate}}
Time: {{appointmentTime}}
Crew: {{crewName}}
Service: {{serviceName}}
Address: {{serviceAddress}}

Need to reschedule? Reply or call {{companyPhone}}.

Thanks!
{{companyName}}`,
    },
    {
      name: '24-Hour Reminder',
      slug: 'cleaning-reminder-24h',
      subject: 'Reminder: Cleaning tomorrow at {{appointmentTime}}',
      body: `Hi {{customerName}},

This is a friendly reminder that your cleaning is scheduled for tomorrow, {{appointmentDate}} at {{appointmentTime}}.

Reschedule: {{rescheduleLink}}

See you then!
{{companyName}}`,
    },
    {
      name: 'Service Completed — Rate Us',
      slug: 'cleaning-service-review-request',
      subject: 'How did {{crewName}} do?',
      body: `Hi {{customerName}},

Your cleaning is complete! We'd love your feedback:

{{reviewLink}}

Thanks for choosing {{companyName}}.`,
    },
  ],
  whatsappTemplates: [
    {
      name: 'Crew En Route',
      body: `Hi {{customerName}}, this is {{crewName}} from {{companyName}}. We're about {{eta}} minutes away. Please let us know if there's any access change. 🧹`,
    },
    {
      name: 'Clean Complete',
      body: `✅ Your {{serviceName}} is complete, {{customerName}}! Rate your crew here: {{reviewLink}}. Rebook anytime: {{bookingLink}}`,
    },
    {
      name: 'Recurring Reminder',
      body: `Hi {{customerName}}, your next cleaning is {{appointmentDate}} at {{appointmentTime}}. Need to reschedule? Tap here: {{rescheduleLink}}`,
    },
  ],
  employeeRoles: ['Cleaner', 'Crew Lead', 'Operations Manager'],
  jobTypes: ['Standard Clean', 'Deep Clean', 'Move-In/Out', 'Post-Construction', 'Carpet Shampoo', 'Window Cleaning', 'Commercial Clean', 'Emergency Clean', 'Recurring Visit', 'Addon Service'],
};

// ---------------------------------------------------------------------------
// ELECTRICAL
// ---------------------------------------------------------------------------

const electricalKit: IndustryKit = {
  id: 'electrical',
  name: 'Electrical',
  icon: 'Zap',
  emoji: '⚡',
  description: 'Electrical repair, panel upgrade, lighting, and EV charger installation',
  workflows: [
    {
      name: 'New Job → Customer Confirmation',
      description:
        'When a new electrical job is created, send a WhatsApp confirmation and pre-arrival safety info to the customer.',
      trigger: 'job_created',
      actions: ['send_whatsapp', 'send_email', 'notify_electrician'],
    },
    {
      name: 'Job Completed → Review Request',
      description:
        'After an electrical job is marked complete, wait 2 hours then send a review request via WhatsApp and email.',
      trigger: 'job_completed',
      actions: ['wait_2h', 'send_whatsapp', 'send_email', 'create_follow_up'],
    },
    {
      name: 'Permit Ready → Customer Notification',
      description:
        'When a permit is approved/ready for inspection, notify the customer and schedule the inspector visit.',
      trigger: 'permit_ready',
      actions: ['send_whatsapp', 'send_email', 'schedule_inspection'],
    },
  ],
  forms: [
    {
      name: 'Electrical Service Request',
      description: 'Lead capture form for electrical service calls.',
      type: 'lead_capture',
      fields: ['fullName', 'phone', 'email', 'serviceAddress', 'issueType', 'panelLocation', 'urgency', 'description'],
    },
    {
      name: 'EV Charger Installation Quote',
      description: 'Quote request form for home EV charger installation.',
      type: 'quote_request',
      fields: ['fullName', 'phone', 'email', 'address', 'vehicleMake', 'chargerModel', 'panelAmperage', 'installationLocation', 'preferredDate'],
    },
    {
      name: 'Panel Upgrade Assessment',
      description: 'Pre-visit assessment form for electrical panel upgrades.',
      type: 'custom',
      fields: ['fullName', 'phone', 'address', 'homeAge', 'currentPanelAmperage', 'addedLoads', 'inspectionReason', 'preferredDate'],
    },
  ],
  checklists: [
    {
      name: 'Panel Upgrade Checklist',
      category: 'Panel Upgrade',
      items: [
        'Pull permit and post on site',
        'Shut off main and verify de-energized with meter',
        'Remove old panel and inspect service entrance',
        'Install new panel, level and properly grounded',
        'Land all branch circuits, torque to spec',
        'Install main breaker and bond neutral/ground',
        'Install arc-fault and GFCI breakers as required',
        'Energize and test each circuit',
        'Label every breaker on panel cover',
        'Schedule inspection and walk customer through',
      ],
    },
    {
      name: 'EV Charger Installation',
      category: 'Installation',
      items: [
        'Verify 240V circuit capacity in panel',
        'Pull permit if required',
        'Route conduit / cable to install location',
        'Mount EV charger to wall per manufacturer spec',
        'Wire 240V circuit and dedicated breaker',
        'Connect ground and bond per code',
        'Energize and test unit with vehicle',
        'Configure Wi-Fi / app pairing',
        'Schedule inspection if required',
        'Walk customer through operation',
      ],
    },
    {
      name: 'General Troubleshooting & Repair',
      category: 'Repair',
      items: [
        'Verify reported issue with customer',
        'Test affected circuit / outlet / switch',
        'Inspect breaker and wire connections',
        'Identify root cause (loose wire, bad breaker, etc.)',
        'Perform repair with code-compliant materials',
        'Test repaired circuit under load',
        'Check adjacent outlets/circuits for related issues',
        'Document findings and recommendations',
      ],
    },
  ],
  quoteTemplates: [
    {
      name: 'Outlet / Switch Repair',
      lineItems: [
        { name: 'Service Call / Diagnosis', defaultPrice: 89 },
        { name: 'Replace Receptacle (per ea)', defaultPrice: 65 },
        { name: 'Replace Switch (per ea)', defaultPrice: 65 },
        { name: 'GFCI Upgrade', defaultPrice: 95 },
      ],
    },
    {
      name: '200A Panel Upgrade',
      lineItems: [
        { name: '200A Panel + Main Breaker', defaultPrice: 425 },
        { name: 'Permit & Inspection', defaultPrice: 175 },
        { name: 'Labor & Materials', defaultPrice: 1450 },
        { name: 'Grounding Electrode Upgrade', defaultPrice: 185 },
      ],
    },
    {
      name: 'EV Charger Installation',
      lineItems: [
        { name: 'Level 2 Charger (customer-supplied or $525)', defaultPrice: 525 },
        { name: '40A 240V Circuit & Breaker', defaultPrice: 285 },
        { name: 'Conduit & Wire (per ft)', defaultPrice: 8 },
        { name: 'Labor & Permit', defaultPrice: 495 },
      ],
    },
  ],
  services: [
    { name: 'Service Call / Diagnosis', description: 'On-site diagnosis of electrical issue with written estimate', category: 'diagnostic', defaultPrice: 89, duration: '1h' },
    { name: 'Outlet Replacement', description: 'Replace standard receptacle, includes parts', category: 'repair', defaultPrice: 65, duration: '30m' },
    { name: 'GFCI Outlet Installation', description: 'Install GFCI-protected outlet near water source', category: 'repair', defaultPrice: 95, duration: '45m' },
    { name: 'Switch Replacement', description: 'Replace single-pole / 3-way switch', category: 'repair', defaultPrice: 65, duration: '30m' },
    { name: 'Light Fixture Install', description: 'Install customer-supplied light fixture (standard)', category: 'installation', defaultPrice: 125, duration: '1h' },
    { name: 'Ceiling Fan Install', description: 'Install ceiling fan with light kit on existing box', category: 'installation', defaultPrice: 165, duration: '1h 30m' },
    { name: '200A Panel Upgrade', description: 'Upgrade from 100A/150A to 200A panel with permit', category: 'panel', defaultPrice: 2235, duration: '6h' },
    { name: 'EV Charger Installation (Level 2)', description: 'Install 40A Level 2 EV charger, includes permit', category: 'installation', defaultPrice: 1280, duration: '4h' },
    { name: 'Whole-Home Surge Protection', description: 'Install whole-home surge protector at panel', category: 'installation', defaultPrice: 425, duration: '2h' },
    { name: 'Emergency After-Hours Service', description: 'Same-night emergency dispatch (premium rate)', category: 'emergency', defaultPrice: 225, duration: '1h 30m' },
  ],
  emailTemplates: [
    {
      name: 'Appointment Confirmation',
      slug: 'electrical-appointment-confirmation',
      subject: 'Your {{companyName}} electrical appointment is confirmed for {{appointmentDate}}',
      body: `Hi {{customerName}},

Your electrical service appointment is confirmed.

Date: {{appointmentDate}}
Time: {{appointmentTime}}
Electrician: {{technicianName}}
Service: {{serviceName}}
Address: {{serviceAddress}}

Please ensure panel access is clear. Need to reschedule? Reply or call {{companyPhone}}.

Thanks,
{{companyName}}`,
    },
    {
      name: 'Service Completed — Rate Us',
      slug: 'electrical-service-review-request',
      subject: 'Rate your service with {{technicianName}}',
      body: `Hi {{customerName}},

Your {{serviceName}} is complete. We'd appreciate a quick review:

{{reviewLink}}

Thanks,
{{companyName}}`,
    },
    {
      name: 'Permit / Inspection Notice',
      slug: 'electrical-permit-inspection',
      subject: 'Inspection scheduled for {{inspectionDate}} — access required',
      body: `Hi {{customerName}},

Your electrical inspection has been scheduled for {{inspectionDate}} between {{inspectionWindow}}.

Please ensure the inspector has access to the panel and work area. You don't need to be home, but please leave gates unlocked.

Questions? Call {{companyPhone}}.

{{companyName}}`,
    },
  ],
  whatsappTemplates: [
    {
      name: 'Electrician En Route',
      body: `Hi {{customerName}}, {{technicianName}} from {{companyName}} here. I'm about {{eta}} minutes out. Please make sure the electrical panel is accessible. ⚡`,
    },
    {
      name: 'Job Complete',
      body: `✅ Your {{serviceName}} is complete, {{customerName}}! Receipt emailed. Rate us here: {{reviewLink}} — thanks for choosing {{companyName}}!`,
    },
    {
      name: 'Inspection Reminder',
      body: `Reminder: Your electrical inspection is {{inspectionDate}} between {{inspectionWindow}}. Please ensure access to the work area. Questions? Call {{companyPhone}}.`,
    },
  ],
  employeeRoles: ['Electrician', 'Apprentice', 'Master Electrician'],
  jobTypes: ['Repair', 'Installation', 'Panel Upgrade', 'Lighting', 'EV Charger', 'Inspection', 'Troubleshooting', 'Surge Protection', 'Generator', 'Emergency Service'],
};

// ---------------------------------------------------------------------------
// PEST CONTROL
// ---------------------------------------------------------------------------

const pestControlKit: IndustryKit = {
  id: 'pest-control',
  name: 'Pest Control',
  icon: 'Bug',
  emoji: '🐛',
  description: 'Termite, rodent, insect control and preventative treatments',
  workflows: [
    {
      name: 'New Job → Customer Confirmation',
      description:
        'When a new pest control job is created, send a WhatsApp confirmation with pre-treatment prep instructions.',
      trigger: 'job_created',
      actions: ['send_whatsapp', 'send_email', 'notify_technician'],
    },
    {
      name: 'Job Completed → Review Request',
      description:
        'After a treatment is complete, wait 24 hours then send a review request and re-treatment guarantee info.',
      trigger: 'job_completed',
      actions: ['wait_24h', 'send_whatsapp', 'send_email', 'create_follow_up'],
    },
    {
      name: 'Quarterly Reminder → Recurring Service',
      description:
        '30 days before the next quarterly treatment, send a reminder and lock in the appointment.',
      trigger: 'scheduled_reminder',
      actions: ['send_whatsapp', 'send_email', 'auto_schedule'],
    },
  ],
  forms: [
    {
      name: 'Pest Control Service Request',
      description: 'Lead capture form for pest control service.',
      type: 'lead_capture',
      fields: ['fullName', 'phone', 'email', 'serviceAddress', 'pestType', 'severity', 'propertyType', 'pets', 'preferredDate'],
    },
    {
      name: 'Termite Inspection Request',
      description: 'Quote request for termite inspection / WDO report.',
      type: 'quote_request',
      fields: ['fullName', 'phone', 'email', 'address', 'propertyType', 'homeAge', 'priorTermiteHistory', 'closingDate', 'lender'],
    },
    {
      name: 'Customer Satisfaction Survey',
      description: 'Post-treatment satisfaction survey.',
      type: 'feedback',
      fields: ['customerName', 'technicianName', 'effectivenessRating', 'professionalismRating', 'pestResolved', 'comments', 'wouldRecommend'],
    },
  ],
  checklists: [
    {
      name: 'General Pest Treatment',
      category: 'Treatment',
      items: [
        'Confirm pest type and infestation level with customer',
        'Identify entry points and harborage areas',
        'Remove accessible food/water sources',
        'Apply perimeter spray (exterior foundation)',
        'Apply indoor crack & crevice treatment',
        'Install bait stations as needed',
        'Treat attic / crawlspace if applicable',
        'Provide written treatment record & MSDS',
        'Schedule follow-up if infestation is severe',
        'Document before/after photos',
      ],
    },
    {
      name: 'Termite Treatment (Liquid Barrier)',
      category: 'Termite',
      items: [
        'Confirm termite species and activity zones',
        'Trench around exterior foundation (6" deep)',
        'Apply termiticide per label rate (4 gal/10 linear ft)',
        'Drill & treat slab joints and expansion cracks',
        'Treat bath traps and plumbing penetrations',
        'Install termite monitoring stations every 10 ft',
        'Re-inspect in 30 days for activity',
        'Provide customer treatment diagram & warranty',
        'File WDO report with state if required',
      ],
    },
    {
      name: 'Rodent Control Service',
      category: 'Rodent',
      items: [
        'Inspect attic, crawlspace, and perimeter for entry',
        'Identify runways and droppings',
        'Seal entry points (gaps > 1/4")',
        'Place snap traps in active runways',
        'Install exterior bait stations (locked)',
        'Schedule 1-week follow-up to clear traps',
        'Provide sanitation recommendations',
        'Document trap placement diagram',
      ],
    },
  ],
  quoteTemplates: [
    {
      name: 'One-Time General Pest',
      lineItems: [
        { name: 'Initial Inspection & Treatment', defaultPrice: 145 },
        { name: 'Interior Crack & Crevice', defaultPrice: 65 },
        { name: 'Exterior Perimeter Spray', defaultPrice: 95 },
        { name: 'Follow-up Visit (14 days)', defaultPrice: 75 },
      ],
    },
    {
      name: 'Quarterly Pest Plan',
      lineItems: [
        { name: 'Initial Treatment', defaultPrice: 145 },
        { name: 'Quarterly Service (4x/yr)', defaultPrice: 95 },
        { name: 'Unlimited Free Re-treats', defaultPrice: 0 },
        { name: 'Termite Monitoring', defaultPrice: 0 },
      ],
    },
    {
      name: 'Termite Treatment',
      lineItems: [
        { name: 'Liquid Barrier Treatment (per linear ft)', defaultPrice: 7 },
        { name: 'Termite Bait Stations (per station)', defaultPrice: 65 },
        { name: 'WDO Inspection Report', defaultPrice: 95 },
        { name: '1-Year Renewable Warranty', defaultPrice: 145 },
      ],
    },
  ],
  services: [
    { name: 'General Pest Treatment (Initial)', description: 'Initial inspection and treatment for common household pests', category: 'general', defaultPrice: 145, duration: '1h 30m' },
    { name: 'Quarterly Maintenance Service', description: 'Recurring quarterly perimeter treatment', category: 'recurring', defaultPrice: 95, duration: '45m' },
    { name: 'Termite Inspection (WDO Report)', description: 'Wood-destroying organism inspection with written report', category: 'termite', defaultPrice: 95, duration: '1h 30m' },
    { name: 'Termite Liquid Barrier Treatment', description: 'Per linear foot, includes 1-year warranty', category: 'termite', defaultPrice: 7, duration: '6h' },
    { name: 'Rodent Control Program', description: 'Trapping, exclusion, and bait station install', category: 'rodent', defaultPrice: 295, duration: '2h 30m' },
    { name: 'Bed Bug Treatment', description: 'Heat + chemical treatment for bed bugs (per room)', category: 'specialty', defaultPrice: 285, duration: '4h' },
    { name: 'Mosquito Control (Monthly)', description: 'Monthly mosquito barrier treatment, per acre', category: 'specialty', defaultPrice: 95, duration: '45m' },
    { name: 'Cockroach Elimination', description: 'German cockroach clean-out (kitchen + bathrooms)', category: 'general', defaultPrice: 195, duration: '2h' },
    { name: 'Ant Treatment (Exterior)', description: 'Exterior ant barrier and bait application', category: 'general', defaultPrice: 125, duration: '1h' },
    { name: 'Emergency Same-Day Service', description: 'Same-day dispatch for severe infestations', category: 'emergency', defaultPrice: 225, duration: '2h' },
  ],
  emailTemplates: [
    {
      name: 'Appointment Confirmation + Prep',
      slug: 'pest-appointment-confirmation',
      subject: 'Your {{companyName}} pest control appointment — {{appointmentDate}}',
      body: `Hi {{customerName}},

Your pest control appointment is confirmed!

Date: {{appointmentDate}}
Time: {{appointmentTime}}
Technician: {{technicianName}}
Service: {{serviceName}}
Address: {{serviceAddress}}

PRE-TREATMENT PREP:
- Put away all food and pet bowls
- Cover fish tanks
- Keep kids/pets off treated surfaces until dry (≈2 hrs)

Questions? Reply or call {{companyPhone}}.

{{companyName}}`,
    },
    {
      name: 'Treatment Complete — Rate Us',
      slug: 'pest-service-review-request',
      subject: 'How did {{technicianName}} do?',
      body: `Hi {{customerName}},

Your {{serviceName}} is complete. We'd love your feedback:

{{reviewLink}}

Re-treatment is always free if pests return between services.

{{companyName}}`,
    },
    {
      name: 'Quarterly Service Reminder',
      slug: 'pest-quarterly-reminder',
      subject: 'Your next pest treatment is coming up {{appointmentDate}}',
      body: `Hi {{customerName}},

Your next quarterly pest treatment is scheduled for {{appointmentDate}} between {{appointmentTime}}.

Need to reschedule? Tap here: {{rescheduleLink}}

Thanks for being a {{companyName}} member!

{{companyName}}`,
    },
  ],
  whatsappTemplates: [
    {
      name: 'Tech En Route',
      body: `Hi {{customerName}}, {{technicianName}} from {{companyName}} here. I'm about {{eta}} minutes away. Quick reminder: please put away pet food and cover any fish tanks before I arrive. 🐛`,
    },
    {
      name: 'Treatment Complete',
      body: `✅ Treatment complete, {{customerName}}! Keep kids/pets off treated areas for ~2 hours until dry. Rate us here: {{reviewLink}}. Free re-treat if pests return!`,
    },
    {
      name: 'Quarterly Reminder',
      body: `Hi {{customerName}}, your next quarterly pest treatment is {{appointmentDate}} at {{appointmentTime}}. Reschedule: {{rescheduleLink}}`,
    },
  ],
  employeeRoles: ['Pest Technician', 'Field Supervisor', 'Sales Rep'],
  jobTypes: ['General Pest', 'Termite', 'Rodent', 'Bed Bug', 'Mosquito', 'Inspection', 'Quarterly Service', 'Cockroach Clean-Out', 'Ant Treatment', 'Emergency Service'],
};

// ---------------------------------------------------------------------------
// LANDSCAPING
// ---------------------------------------------------------------------------

const landscapingKit: IndustryKit = {
  id: 'landscaping',
  name: 'Landscaping',
  icon: 'Trees',
  emoji: '🌿',
  description: 'Lawn maintenance, design, hardscaping, and irrigation services',
  workflows: [
    {
      name: 'New Booking → Crew Assignment',
      description:
        'When a landscaping booking is created, auto-assign to the best crew and send WhatsApp confirmation to the customer.',
      trigger: 'booking_created',
      actions: ['auto_assign_crew', 'send_whatsapp', 'send_email'],
    },
    {
      name: 'Job Completed → Review Request',
      description:
        'After a landscaping job is complete, send a review request and offer a recurring maintenance plan.',
      trigger: 'job_completed',
      actions: ['send_whatsapp', 'send_email', 'offer_maintenance_plan'],
    },
    {
      name: 'Seasonal Service Reminder',
      description:
        'Send reminders for seasonal services (spring cleanup, fall leaf removal, winterization) 2 weeks ahead.',
      trigger: 'scheduled_reminder',
      actions: ['send_whatsapp', 'send_email', 'create_follow_up'],
    },
  ],
  forms: [
    {
      name: 'Lawn Maintenance Quote',
      description: 'Quote request for recurring lawn maintenance.',
      type: 'quote_request',
      fields: ['fullName', 'phone', 'email', 'serviceAddress', 'lotSize', 'serviceFrequency', 'gateCode', 'obstacles', 'preferredDay'],
    },
    {
      name: 'Landscape Design Consultation',
      description: 'Consultation request form for landscape design projects.',
      type: 'custom',
      fields: ['fullName', 'phone', 'email', 'address', 'projectType', 'budget', 'timeline', 'inspirationPhotos', 'mustHaves', 'avoidList'],
    },
    {
      name: 'Customer Satisfaction Survey',
      description: 'Post-service satisfaction survey.',
      type: 'feedback',
      fields: ['customerName', 'crewName', 'qualityRating', 'punctualityRating', 'cleanupRating', 'comments', 'wouldRecommend', 'wouldRebook'],
    },
  ],
  checklists: [
    {
      name: 'Weekly Lawn Maintenance',
      category: 'Maintenance',
      items: [
        'Mow lawn at correct height for season',
        'Edge along sidewalks, driveways, and beds',
        'String-trim around trees, fences, and obstacles',
        'Blow clippings off hard surfaces back onto lawn',
        'Inspect for weeds and spot-treat if needed',
        'Check irrigation coverage and flag any issues',
        'Pick up debris and trash',
        'Close and lock all gates',
        'Document any property concerns for customer',
      ],
    },
    {
      name: 'Spring Clean-Up',
      category: 'Seasonal',
      items: [
        'Remove leaves and debris from lawn and beds',
        'Dethatch lawn if needed',
        'Aerate compacted areas',
        'Prune dead/damaged branches from shrubs and trees',
        'Cut back perennials and ornamental grasses',
        'Apply pre-emergent and spring fertilizer',
        'Refresh mulch in beds (top off to 3")',
        'Inspect irrigation system and start up',
        'Edge and redefine bed lines',
        'Clean up haul-away all debris',
      ],
    },
    {
      name: 'Patio / Hardscape Install',
      category: 'Hardscape',
      items: [
        'Mark utilities (call 811) and confirm layout',
        'Excavate to proper depth (7" for paver patio)',
        'Install geotextile and 6" compacted base',
        'Screed 1" bedding sand',
        'Lay pavers in chosen pattern, cut edges',
        'Install edge restraint',
        'Sweep polymeric sand into joints',
        'Compact and mist to activate sand',
        'Clean surface and seal if requested',
        'Walk customer through care & warranty',
      ],
    },
  ],
  quoteTemplates: [
    {
      name: 'Weekly Lawn Maintenance',
      lineItems: [
        { name: 'Weekly Mow & Edge (per visit)', defaultPrice: 45 },
        { name: 'Seasonal Fertilization Program (6 apps)', defaultPrice: 295 },
        { name: 'Weed Control (per app)', defaultPrice: 45 },
      ],
    },
    {
      name: 'Spring Clean-Up',
      lineItems: [
        { name: 'Leaf & Debris Removal', defaultPrice: 165 },
        { name: 'Bed Cleanup & Pruning', defaultPrice: 125 },
        { name: 'Mulch Refresh (per cu yd)', defaultPrice: 95 },
        { name: 'Aeration & Overseed', defaultPrice: 225 },
      ],
    },
    {
      name: 'Paver Patio Install',
      lineItems: [
        { name: 'Paver Material (per sq ft)', defaultPrice: 9 },
        { name: 'Base Prep & Excavation (per sq ft)', defaultPrice: 5 },
        { name: 'Labor & Install (per sq ft)', defaultPrice: 8 },
        { name: 'Edge Restraint (per linear ft)', defaultPrice: 6 },
      ],
    },
  ],
  services: [
    { name: 'Weekly Lawn Mow & Edge', description: 'Weekly lawn mow, edge, trim, and blow-off', category: 'maintenance', defaultPrice: 45, duration: '45m' },
    { name: 'Bi-Weekly Lawn Service', description: 'Bi-weekly mow, edge, trim, and blow-off', category: 'maintenance', defaultPrice: 55, duration: '45m' },
    { name: 'Spring Clean-Up', description: 'Leaf removal, bed cleanup, pruning, and mulch refresh', category: 'seasonal', defaultPrice: 285, duration: '4h' },
    { name: 'Fall Leaf Removal', description: 'Multi-visit fall leaf removal and cleanup', category: 'seasonal', defaultPrice: 165, duration: '3h' },
    { name: 'Mulch Installation (per cu yd)', description: 'Install dyed/mulch, includes edging', category: 'beds', defaultPrice: 95, duration: '1h' },
    { name: 'Shrub & Tree Pruning', description: 'Pruning of shrubs and small trees (per hour)', category: 'pruning', defaultPrice: 65, duration: '2h' },
    { name: 'Aeration & Overseed', description: 'Core aeration and overseed with premium seed', category: 'seasonal', defaultPrice: 225, duration: '2h' },
    { name: 'Paver Patio Installation (per sq ft)', description: 'Full paver patio install, base + materials + labor', category: 'hardscape', defaultPrice: 22, duration: '8h' },
    { name: 'Irrigation System Tune-Up', description: 'Spring start-up, inspection, and head adjustment', category: 'irrigation', defaultPrice: 145, duration: '1h 30m' },
    { name: 'Landscape Design Consultation', description: 'On-site design consultation with rendered plan', category: 'design', defaultPrice: 195, duration: '2h' },
  ],
  emailTemplates: [
    {
      name: 'Service Confirmation',
      slug: 'landscape-service-confirmation',
      subject: 'Your {{companyName}} service is scheduled for {{appointmentDate}}',
      body: `Hi {{customerName}},

Your landscaping service is scheduled!

Date: {{appointmentDate}}
Crew: {{crewName}}
Service: {{serviceName}}
Address: {{serviceAddress}}

Please ensure gate access and mark any irrigation heads or obstacles.

Need to reschedule? Reply or call {{companyPhone}}.

{{companyName}}`,
    },
    {
      name: 'Service Completed — Rate Us',
      slug: 'landscape-service-review-request',
      subject: 'How did {{crewName}} do?',
      body: `Hi {{customerName}},

Your {{serviceName}} is complete. We'd love your feedback:

{{reviewLink}}

Thanks for choosing {{companyName}}!`,
    },
    {
      name: 'Seasonal Service Reminder',
      slug: 'landscape-seasonal-reminder',
      subject: 'Time to book your {{seasonalService}}!',
      body: `Hi {{customerName}},

It's that time of year! Book your {{seasonalService}} now before our schedule fills up.

Book here: {{bookingLink}}

{{companyName}}`,
    },
  ],
  whatsappTemplates: [
    {
      name: 'Crew En Route',
      body: `Hi {{customerName}}, this is {{crewName}} from {{companyName}}. We're about {{eta}} minutes away. Please make sure the gate is unlocked. 🌿`,
    },
    {
      name: 'Service Complete',
      body: `✅ Your {{serviceName}} is complete, {{customerName}}! Rate our crew here: {{reviewLink}}. Rebook anytime: {{bookingLink}}`,
    },
    {
      name: 'Seasonal Reminder',
      body: `Hi {{customerName}}, it's time to book your {{seasonalService}}. Tap here to schedule: {{bookingLink}} — {{companyName}}`,
    },
  ],
  employeeRoles: ['Crew Member', 'Crew Lead', 'Operations Manager'],
  jobTypes: ['Lawn Mow', 'Spring Clean-Up', 'Fall Leaf Removal', 'Mulch Install', 'Pruning', 'Aeration', 'Hardscape', 'Irrigation', 'Design Consult', 'Emergency Storm Cleanup'],
};

// ---------------------------------------------------------------------------
// ROOFING
// ---------------------------------------------------------------------------

const roofingKit: IndustryKit = {
  id: 'roofing',
  name: 'Roofing',
  icon: 'Home',
  emoji: '🏠',
  description: 'Roof repair, replacement, inspection, and gutter services',
  workflows: [
    {
      name: 'New Job → Customer Confirmation',
      description:
        'When a new roofing job is created, send WhatsApp confirmation with project timeline and what to expect.',
      trigger: 'job_created',
      actions: ['send_whatsapp', 'send_email', 'notify_foreman', 'schedule_dumpster'],
    },
    {
      name: 'Job Completed → Review Request',
      description:
        'After a roofing project is complete, wait 3 days then send a review request and warranty info.',
      trigger: 'job_completed',
      actions: ['wait_3d', 'send_whatsapp', 'send_email', 'send_warranty'],
    },
    {
      name: 'Insurance Claim Follow-Up',
      description:
        'After an insurance claim inspection, follow up with the customer in 7 days to schedule the repair.',
      trigger: 'inspection_complete',
      actions: ['wait_7d', 'send_whatsapp', 'send_email', 'create_follow_up'],
    },
  ],
  forms: [
    {
      name: 'Roof Inspection Request',
      description: 'Lead capture form for free roof inspections.',
      type: 'lead_capture',
      fields: ['fullName', 'phone', 'email', 'serviceAddress', 'roofType', 'roofAge', 'issueDescription', 'insuranceClaim', 'preferredDate'],
    },
    {
      name: 'Roof Replacement Quote',
      description: 'Quote request for full roof replacement.',
      type: 'quote_request',
      fields: ['fullName', 'phone', 'email', 'address', 'propertyType', 'roofType', 'squareFootage', 'layers', 'preferredMaterial'],
    },
    {
      name: 'Customer Satisfaction Survey',
      description: 'Post-project satisfaction survey.',
      type: 'feedback',
      fields: ['customerName', 'projectManager', 'qualityRating', 'cleanupRating', 'communicationRating', 'comments', 'wouldRecommend'],
    },
  ],
  checklists: [
    {
      name: 'Roof Inspection',
      category: 'Inspection',
      items: [
        'Inspect roof from ground for sagging/damage',
        'Walk roof (if safe) and document all shingle damage',
        'Inspect flashing around chimneys, vents, and valleys',
        'Check rubber boots and pipe collars for cracking',
        'Inspect gutters for granules and debris',
        'Inspect attic for leaks, water stains, and ventilation',
        'Document with 20+ photos including overhead drone shots',
        'Provide written report with repair recommendations',
        'Estimate remaining roof life',
        'Review financing options with customer',
      ],
    },
    {
      name: 'Roof Replacement',
      category: 'Replacement',
      items: [
        'Tear off existing roofing to deck',
        'Inspect and replace any rotten decking',
        'Install ice & water shield in valleys and eaves',
        'Install synthetic underlayment',
        'Install drip edge and rake edge',
        'Install starter shingles',
        'Lay architectural shingles per manufacturer pattern',
        'Install step flashing at walls and chimneys',
        'Install ridge vent and cap shingles',
        'Magnet-sweep yard for nails, haul away all debris',
      ],
    },
    {
      name: 'Roof Repair (Leak)',
      category: 'Repair',
      items: [
        'Locate leak source from inside attic (water stain)',
        'Inspect corresponding roof area for damage',
        'Replace damaged shingles (minimum 3 ft around)',
        'Re-seal flashing with roof cement',
        'Replace cracked pipe boot',
        'Inspect nearby penetrations for related wear',
        'Test repair with hose (if possible)',
        'Document before/after photos',
        'Provide 1-year repair warranty in writing',
      ],
    },
  ],
  quoteTemplates: [
    {
      name: 'Roof Leak Repair',
      lineItems: [
        { name: 'Service Call / Inspection', defaultPrice: 145 },
        { name: 'Shingle Replacement (per bundle)', defaultPrice: 65 },
        { name: 'Flashing Repair', defaultPrice: 125 },
        { name: 'Pipe Boot Replacement', defaultPrice: 95 },
      ],
    },
    {
      name: 'Architectural Shingle Roof (per sq)',
      lineItems: [
        { name: 'Tear-off (per layer, per sq)', defaultPrice: 100 },
        { name: 'Decking Repair (per sheet, as needed)', defaultPrice: 85 },
        { name: 'Underlayment & Ice/Water Shield (per sq)', defaultPrice: 65 },
        { name: 'Architectural Shingles (per sq)', defaultPrice: 125 },
        { name: 'Labor (per sq)', defaultPrice: 175 },
      ],
    },
    {
      name: 'Gutter Replacement (per ft)',
      lineItems: [
        { name: '5" Aluminum Gutter (per ft)', defaultPrice: 8 },
        { name: 'Downspout (per ft)', defaultPrice: 7 },
        { name: 'Gutter Guards (per ft)', defaultPrice: 9 },
        { name: 'Removal & Haul-Away (per ft)', defaultPrice: 2 },
      ],
    },
  ],
  services: [
    { name: 'Roof Inspection', description: 'Full roof inspection with written report and photos', category: 'inspection', defaultPrice: 145, duration: '1h 30m' },
    { name: 'Roof Leak Repair (Small)', description: 'Repair of small leak, includes shingles and flashing', category: 'repair', defaultPrice: 395, duration: '3h' },
    { name: 'Roof Leak Repair (Large)', description: 'Major leak repair, multiple penetrations', category: 'repair', defaultPrice: 750, duration: '5h' },
    { name: 'Shingle Replacement (per bundle)', description: 'Replace damaged shingles, includes materials', category: 'repair', defaultPrice: 65, duration: '30m' },
    { name: 'Flashing Repair', description: 'Re-seal or replace flashing around chimney/vents', category: 'repair', defaultPrice: 125, duration: '1h' },
    { name: 'Roof Replacement (Architectural, per sq)', description: 'Full tear-off and replace with 30-yr architectural shingles', category: 'replacement', defaultPrice: 465, duration: '8h' },
    { name: 'Gutter Cleaning', description: 'Clean gutters and downspouts, includes haul-away', category: 'gutters', defaultPrice: 195, duration: '2h' },
    { name: 'Gutter Replacement (per ft)', description: 'Install new 5" aluminum gutters with downspouts', category: 'gutters', defaultPrice: 8, duration: '4h' },
    { name: 'Skylight Install/Replace', description: 'Install or replace standard skylight (per unit)', category: 'installation', defaultPrice: 685, duration: '4h' },
    { name: 'Emergency Tarp-Up', description: 'Emergency storm tarp installation', category: 'emergency', defaultPrice: 350, duration: '2h' },
  ],
  emailTemplates: [
    {
      name: 'Project Confirmation',
      slug: 'roofing-project-confirmation',
      subject: 'Your {{companyName}} roofing project is confirmed for {{startDate}}',
      body: `Hi {{customerName}},

Your roofing project is confirmed!

Start Date: {{startDate}}
Estimated Duration: {{projectDuration}}
Project Manager: {{projectManager}}
Address: {{serviceAddress}}

WHAT TO EXPECT:
- Dumpster will be delivered 1 day before
- Crew arrives by 7 AM
- Loud noise expected during tear-off
- Please move vehicles out of driveway

Questions? Call {{companyPhone}}.

{{companyName}}`,
    },
    {
      name: 'Project Completed — Rate Us',
      slug: 'roofing-service-review-request',
      subject: 'Your new roof is on! How did we do?',
      body: `Hi {{customerName}},

Your roofing project is complete! We'd love your feedback:

{{reviewLink}}

Your warranty info and final photos are attached. Please keep this email for your records.

Thanks for choosing {{companyName}}!`,
    },
    {
      name: 'Insurance Claim Follow-Up',
      slug: 'roofing-insurance-followup',
      subject: 'Following up on your roof inspection',
      body: `Hi {{customerName}},

We completed your roof inspection on {{inspectionDate}} and sent the report to your insurance adjuster.

Ready to schedule the repair? Just reply here or call {{companyPhone}}.

We'll handle the rest of the insurance coordination.

{{companyName}}`,
    },
  ],
  whatsappTemplates: [
    {
      name: 'Crew Arriving Tomorrow',
      body: `Hi {{customerName}}, this is {{projectManager}} from {{companyName}}. Our crew will arrive at your property tomorrow at 7 AM. Please move vehicles out of the driveway. The dumpster will be dropped today. 🏠`,
    },
    {
      name: 'Project Complete',
      body: `✅ Roof complete, {{customerName}}! We've cleaned up everything including a magnet sweep for nails. Final photos + warranty emailed. Rate us here: {{reviewLink}}`,
    },
    {
      name: 'Storm Damage Alert',
      body: `Hi {{customerName}}, we saw severe weather hit your area. Need a free storm damage inspection? Tap here to schedule: {{bookingLink}} — {{companyName}}`,
    },
  ],
  employeeRoles: ['Roofer', 'Crew Foreman', 'Project Manager'],
  jobTypes: ['Inspection', 'Leak Repair', 'Shingle Replacement', 'Full Replacement', 'Flashing Repair', 'Gutter Service', 'Skylight', 'Insurance Claim', 'Storm Tarp', 'Emergency Service'],
};

// ---------------------------------------------------------------------------
// GENERAL CONTRACTOR
// ---------------------------------------------------------------------------

const generalContractorKit: IndustryKit = {
  id: 'general-contractor',
  name: 'General Contractor',
  icon: 'Hammer',
  emoji: '🔨',
  description: 'Remodeling, renovations, additions, and project management',
  workflows: [
    {
      name: 'New Lead → Consultation Booking',
      description:
        'When a new lead comes in, send a WhatsApp acknowledgment and a Calendly link to book a site visit.',
      trigger: 'lead_created',
      actions: ['send_whatsapp', 'send_email', 'send_calendly_link', 'create_follow_up'],
    },
    {
      name: 'Project Milestone → Customer Update',
      description:
        'When a project milestone is marked complete, send a progress WhatsApp + email with photos and next steps.',
      trigger: 'milestone_complete',
      actions: ['send_whatsapp', 'send_email', 'send_progress_photos', 'schedule_inspection'],
    },
    {
      name: 'Invoice Overdue → Reminder',
      description:
        'When a project invoice is 5 days overdue, send a WhatsApp reminder and notify the project manager.',
      trigger: 'invoice_overdue',
      actions: ['send_whatsapp', 'send_email', 'notify_project_manager', 'create_follow_up'],
    },
  ],
  forms: [
    {
      name: 'Project Inquiry',
      description: 'Lead capture form for remodeling / renovation projects.',
      type: 'lead_capture',
      fields: ['fullName', 'phone', 'email', 'projectAddress', 'projectType', 'budget', 'timeline', 'projectDescription', 'howDidYouHear', 'preferredContactMethod'],
    },
    {
      name: 'Change Order Request',
      description: 'Customer-initiated change order request form.',
      type: 'custom',
      fields: ['projectName', 'requesterName', 'changeDescription', 'reason', 'urgency', 'budgetImpact', 'timelineImpact'],
    },
    {
      name: 'Project Completion Survey',
      description: 'Survey sent at project close-out.',
      type: 'feedback',
      fields: ['customerName', 'projectName', 'projectManager', 'qualityRating', 'communicationRating', 'timelineRating', 'budgetRating', 'comments', 'wouldRecommend', 'testimonial'],
    },
  ],
  checklists: [
    {
      name: 'Bathroom Remodel',
      category: 'Remodel',
      items: [
        'Pull permit and post on site',
        'Shut off water/electric, set up dust containment',
        'Demo existing fixtures, tile, and drywall',
        'Inspect subfloor and framing for damage',
        'Rough-in plumbing and electrical',
        'Inspect and pass rough-in inspection',
        'Install cement board / moisture barrier',
        'Tile floor and walls, grout, seal',
        'Install vanity, toilet, and fixtures',
        'Paint, install trim, accessories, mirrors',
        'Final clean and walk-through with customer',
      ],
    },
    {
      name: 'Kitchen Remodel',
      category: 'Remodel',
      items: [
        'Pull permit and post on site',
        'Set up dust containment and floor protection',
        'Demo existing cabinets, counters, appliances',
        'Inspect and repair subfloor as needed',
        'Re-frame walls for new layout',
        'Rough-in plumbing, electrical, HVAC',
        'Inspect and pass rough-in inspection',
        'Install drywall, tape, texture, paint',
        'Install cabinets, level and secure',
        'Templated and install countertops',
        'Install tile/backsplash, sink, faucet, appliances',
        'Final punch-list walk-through with customer',
      ],
    },
    {
      name: 'Project Close-Out',
      category: 'Project Management',
      items: [
        'Complete final punch list items',
        'Schedule and pass final inspection',
        'Remove dumpster and clean site',
        'Provide warranty packet (product + workmanship)',
        'Collect final payment',
        'Provide lien waiver',
        'Send review request via email + WhatsApp',
        'Schedule 30-day follow-up call',
        'Add customer to referral program',
        'Archive project files',
      ],
    },
  ],
  quoteTemplates: [
    {
      name: 'Bathroom Remodel',
      lineItems: [
        { name: 'Demo & Disposal', defaultPrice: 850 },
        { name: 'Plumbing Rough-In & Fixtures', defaultPrice: 1850 },
        { name: 'Electrical & Lighting', defaultPrice: 950 },
        { name: 'Tile & Install (per sq ft)', defaultPrice: 18 },
        { name: 'Vanity & Countertop', defaultPrice: 1250 },
        { name: 'Labor & Project Management', defaultPrice: 4950 },
        { name: 'Permit & Inspection', defaultPrice: 425 },
      ],
    },
    {
      name: 'Kitchen Remodel',
      lineItems: [
        { name: 'Demo & Disposal', defaultPrice: 1450 },
        { name: 'Plumbing Rough-In', defaultPrice: 1250 },
        { name: 'Electrical & Lighting', defaultPrice: 2250 },
        { name: 'Drywall & Paint', defaultPrice: 1850 },
        { name: 'Cabinets (per linear ft)', defaultPrice: 285 },
        { name: 'Countertops (per sq ft)', defaultPrice: 65 },
        { name: 'Labor & Project Management', defaultPrice: 7500 },
        { name: 'Permit & Inspection', defaultPrice: 625 },
      ],
    },
    {
      name: 'Home Addition (per sq ft)',
      lineItems: [
        { name: 'Foundation & Framing (per sq ft)', defaultPrice: 45 },
        { name: 'Plumbing & Electrical (per sq ft)', defaultPrice: 25 },
        { name: 'Insulation & Drywall (per sq ft)', defaultPrice: 18 },
        { name: 'Flooring & Finish (per sq ft)', defaultPrice: 22 },
        { name: 'Permit & Architectural', defaultPrice: 4500 },
      ],
    },
  ],
  services: [
    { name: 'Initial Consultation', description: 'On-site project consultation with concept sketch and budget range', category: 'consultation', defaultPrice: 250, duration: '2h' },
    { name: 'Project Estimate / Bid', description: 'Detailed line-item estimate with materials and labor', category: 'consultation', defaultPrice: 500, duration: '4h' },
    { name: 'Bathroom Remodel (Standard)', description: 'Full bathroom remodel, 5x8 ft, mid-tier finishes', category: 'remodel', defaultPrice: 18500, duration: '40h' },
    { name: 'Kitchen Remodel (Standard)', description: 'Full kitchen remodel, 10x12 ft, mid-tier finishes', category: 'remodel', defaultPrice: 32500, duration: '80h' },
    { name: 'Home Addition (per sq ft)', description: 'Ground-level addition, all-in per square foot', category: 'addition', defaultPrice: 195, duration: '160h' },
    { name: 'Drywall Repair (per hour)', description: 'Patch, tape, texture, and paint drywall', category: 'repair', defaultPrice: 75, duration: '3h' },
    { name: 'Interior Painting (per sq ft)', description: 'Paint walls, ceiling, and trim (per square foot of wall)', category: 'painting', defaultPrice: 3, duration: '8h' },
    { name: 'Flooring Installation (per sq ft)', description: 'Install LVP, laminate, or engineered hardwood', category: 'flooring', defaultPrice: 6, duration: '8h' },
    { name: 'Custom Carpentry (per hour)', description: 'Custom built-ins, mantels, trim carpentry', category: 'carpentry', defaultPrice: 95, duration: '4h' },
    { name: 'Project Management (per week)', description: 'Dedicated PM coordination, subs, permits, schedule', category: 'management', defaultPrice: 1250, duration: '40h' },
  ],
  emailTemplates: [
    {
      name: 'Lead Acknowledgment',
      slug: 'gc-lead-acknowledgment',
      subject: 'Thanks for your interest, {{customerName}} — let\'s book your consultation',
      body: `Hi {{customerName}},

Thanks for reaching out about your {{projectType}} project! We've received your inquiry and would love to learn more.

Book a free 30-minute phone consultation here:
{{calendlyLink}}

Or just reply to this email with a good time to call.

Looking forward to working with you,
{{companyName}}`,
    },
    {
      name: 'Milestone Update',
      slug: 'gc-milestone-update',
      subject: 'Project update: {{milestoneName}} complete at {{projectAddress}}',
      body: `Hi {{customerName}},

Quick update on your project:

Milestone Completed: {{milestoneName}}
Date: {{milestoneDate}}
Next Up: {{nextMilestone}}
Estimated Start: {{nextMilestoneDate}}

Photos of progress: {{photoLink}}

Questions? Reply here or call {{companyPhone}}.

{{companyName}}`,
    },
    {
      name: 'Invoice Reminder',
      slug: 'gc-invoice-reminder',
      subject: 'Invoice {{invoiceNumber}} for {{projectName}} — payment due',
      body: `Hi {{customerName}},

A friendly reminder that invoice {{invoiceNumber}} for {{invoiceAmount}} ({{projectName}}) is now due.

Pay online: {{paymentLink}}

Questions about your invoice? Reply here or call {{companyPhone}}.

{{companyName}}`,
    },
  ],
  whatsappTemplates: [
    {
      name: 'Lead Acknowledgment',
      body: `Hi {{customerName}}, thanks for reaching out to {{companyName}} about your {{projectType}} project! I'll personally call you within 1 business hour to discuss. — {{projectManager}}`,
    },
    {
      name: 'Milestone Update',
      body: `📢 Progress update for {{customerName}}: {{milestoneName}} is complete! Photos: {{photoLink}}. Next up: {{nextMilestone}} starting {{nextMilestoneDate}}. Questions? Just reply here.`,
    },
    {
      name: 'Crew On-Site',
      body: `Good morning {{customerName}}, our crew is on-site at {{projectAddress}} and starting work for the day. Estimated wrap: {{eta}}. — {{companyName}}`,
    },
  ],
  employeeRoles: ['Project Manager', 'Lead Carpenter', 'Field Supervisor'],
  jobTypes: ['Consultation', 'Estimate', 'Bathroom Remodel', 'Kitchen Remodel', 'Addition', 'Drywall Repair', 'Painting', 'Flooring', 'Carpentry', 'Project Management'],
};

// ---------------------------------------------------------------------------
// Aggregated exports
// ---------------------------------------------------------------------------

export const INDUSTRY_KITS: IndustryKit[] = [
  hvacKit,
  plumbingKit,
  cleaningKit,
  electricalKit,
  pestControlKit,
  landscapingKit,
  roofingKit,
  generalContractorKit,
];

export function getIndustryKit(id: string): IndustryKit | undefined {
  return INDUSTRY_KITS.find((k) => k.id === id);
}

/** Lightweight list used by industry pickers (id, name, icon, description). */
export const INDUSTRY_LIST = INDUSTRY_KITS.map((k) => ({
  id: k.id,
  label: k.name,
  icon: k.icon,
  emoji: k.emoji,
  description: k.description,
}));

/** Lucide icon name → fallback emoji map (used by UI pickers that need an icon glyph). */
export function industryIconGlyph(kit: { icon: string; emoji: string }): string {
  return kit.emoji;
}

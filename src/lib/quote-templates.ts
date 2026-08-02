/**
 * quote-templates.ts — Industry Quote Templates
 * ---------------------------------------------
 * Pre-baked quote templates for the 7 core Fieseros industries.
 *
 * Each template ships with:
 *   - default line items (labour, materials, equipment, waste removal, permits)
 *   - placeholder-based pricing so a single template can flex across job sizes
 *   - default tax rate + deposit percentage
 *   - industry-appropriate terms & conditions
 *   - an estimated total duration (minutes)
 *
 * Usage:
 *   import { getTemplateForIndustry, applyTemplate } from '@/lib/quote-templates';
 *   const tpl = getTemplateForIndustry('hvac');
 *   const applied = applyTemplate(tpl, { hours: 6, hourlyRate: 75, materialsCost: 1200 });
 *
 * Placeholder syntax:
 *   unitPrice may be a fixed number OR an arithmetic expression string using
 *   {{varName}} tokens. At apply time each token is replaced with the numeric
 *   value supplied in `variables` (0 if missing). Supported operators: + - * / ( ).
 *
 * Examples:
 *   { unitPrice: 75 }                              → 75
 *   { unitPrice: '{{hourlyRate}}' }                 → variables.hourlyRate
 *   { unitPrice: '{{hourlyRate}} * {{hours}}' }     → labour line total
 *   { unitPrice: '{{materialsCost}}' }              → flat materials cost
 *
 * Server-side only — no React/Next deps. Safe to import from route handlers
 * and from the smart-quote AI builder.
 */

// ─── Types ─────────────────────────────────────────────────────────────────

export interface QuoteTemplateItem {
  /** Line-item label, e.g. "Labour" */
  name: string;
  /** Short description shown under the label */
  description: string;
  /** Unit of measure: hour, lot, day, sqft, m2, item, flat */
  unit: string;
  /** Default quantity (caller can override via variables.__quantity_<index>) */
  defaultQuantity: number;
  /** Fixed number OR arithmetic expression string using {{var}} placeholders. */
  unitPrice: number | string;
  /** Optional labour-hours per unit (used by the builder for the timeline). */
  hoursPerUnit?: number;
}

export interface QuoteTemplate {
  /** Unique template ID (kebab-case) */
  id: string;
  /** Industry ID from src/lib/industry-catalog.ts */
  industry: string;
  /** Human-readable template name */
  name: string;
  /** Short description of the template's purpose */
  description: string;
  /** Default line items */
  items: QuoteTemplateItem[];
  /** Default tax rate as a percentage (0–100) */
  defaultTaxRate: number;
  /** Default deposit percentage (0–100) — e.g. 30 = 30% due upfront */
  defaultDepositPct: number;
  /** Plain-text terms & conditions, {{var}} placeholders supported */
  termsAndConditions: string;
  /** Estimated total job duration in minutes */
  estimatedDurationMins: number;
}

/** A line item after template application — fully priced. */
export interface AppliedLineItem {
  name: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  hours: number;
}

/** The fully-priced quote produced by `applyTemplate`. */
export interface AppliedQuote {
  lineItems: AppliedLineItem[];
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  depositPct: number;
  depositAmount: number;
  estimatedHours: number;
  estimatedDurationMins: number;
  termsAndConditions: string;
}

/** Variables accepted by `applyTemplate`. All optional; missing values default to 0. */
export interface TemplateVariables {
  /** Labour rate per hour (e.g. 75) */
  hourlyRate?: number;
  /** Total labour hours for the job (e.g. 6) */
  hours?: number;
  /** Flat materials cost (e.g. 1200) */
  materialsCost?: number;
  /** Flat equipment-rental cost (e.g. 250) */
  equipmentCost?: number;
  /** Waste-removal/disposal cost (e.g. 80) */
  wasteRemovalCost?: number;
  /** Permit/inspection fees (e.g. 150) */
  permitsCost?: number;
  /** Travel/call-out fee (e.g. 50) */
  callOutFee?: number;
  /** Surface area in square feet (e.g. 1200) */
  area?: number;
  /** Number of items/units (e.g. 4 cameras, 5 rooms) */
  quantity?: number;
  /** Number of days the job spans (e.g. 2) */
  days?: number;
  /** Number of crew members (e.g. 2) */
  crew?: number;
  /** Tax rate override (percentage). Defaults to template.defaultTaxRate. */
  taxRate?: number;
  /** Deposit percentage override. Defaults to template.defaultDepositPct. */
  depositPct?: number;
  /** Customer name (for terms & conditions substitution) */
  customerName?: string;
  /** Company name (for terms & conditions substitution) */
  companyName?: string;
  /** Optional per-item quantity overrides: key = item index (0-based) */
  quantities?: Record<number, number>;
  [key: string]: unknown;
}

// ─── Shared terms-and-conditions fragments ─────────────────────────────────

const STANDARD_TERMS = `1. A deposit of {{depositPct}}% of the total is required to confirm the booking. The balance is due on completion.
2. This quote is valid for 30 days from the issue date.
3. Work is guaranteed against defects in workmanship for 90 days. Manufacturer warranties apply to all installed parts.
4. The customer agrees to provide safe site access, water, and electricity at no charge to the crew.
5. Any additional work requested beyond this scope will be billed at {{hourlyRate}}/hour plus materials.
6. Payment is due within 7 days of completion. Late payments incur a 1.5% monthly finance charge.
7. {{companyName}} carries full liability insurance. Certificates available on request.`;

// ─── 7 Industry Templates ──────────────────────────────────────────────────

export const QUOTE_TEMPLATES: QuoteTemplate[] = [
  // ── 1. CLEANING ──────────────────────────────────────────────────────────
  {
    id: 'cleaning-standard',
    industry: 'cleaning',
    name: 'Standard Residential / Commercial Clean',
    description:
      'All-purpose cleaning quote with labour, supplies, equipment, and optional add-ons. Scales with hours and crew size.',
    items: [
      {
        name: 'Labour',
        description: 'Cleaning crew labour (per hour, per technician)',
        unit: 'hour',
        defaultQuantity: 1,
        unitPrice: '{{hourlyRate}} * {{hours}} * {{crew}}',
        hoursPerUnit: 1,
      },
      {
        name: 'Cleaning Supplies',
        description: 'Detergents, disinfectants, microfiber cloths, sponges, etc.',
        unit: 'lot',
        defaultQuantity: 1,
        unitPrice: '{{materialsCost}}',
      },
      {
        name: 'Equipment Rental',
        description: 'Vacuums, mops, steam cleaners, pressure washers as needed.',
        unit: 'lot',
        defaultQuantity: 1,
        unitPrice: '{{equipmentCost}}',
      },
      {
        name: 'Waste Disposal',
        description: 'Bagged refuse haul-away and recycling drop-off.',
        unit: 'lot',
        defaultQuantity: 1,
        unitPrice: '{{wasteRemovalCost}}',
      },
      {
        name: 'Travel / Call-out',
        description: 'Crew travel to and from the site.',
        unit: 'flat',
        defaultQuantity: 1,
        unitPrice: '{{callOutFee}}',
      },
    ],
    defaultTaxRate: 8,
    defaultDepositPct: 25,
    termsAndConditions:
      STANDARD_TERMS +
      '\n8. Recurring cleanings are billed per visit; 24-hour cancellation notice required to avoid a full-visit charge.',
    estimatedDurationMins: 180,
  },

  // ── 2. HVAC ──────────────────────────────────────────────────────────────
  {
    id: 'hvac-service',
    industry: 'hvac',
    name: 'HVAC Service / Install',
    description:
      'HVAC install or repair quote covering licensed technician labour, refrigerant/materials, equipment, permits, and disposal of the old unit.',
    items: [
      {
        name: 'Licensed Technician Labour',
        description: 'EPA-certified HVAC technician labour (per hour).',
        unit: 'hour',
        defaultQuantity: 1,
        unitPrice: '{{hourlyRate}} * {{hours}} * {{crew}}',
        hoursPerUnit: 1,
      },
      {
        name: 'Materials & Refrigerant',
        description: 'Refrigerant, copper lineset, condensate line, fittings, thermostats, etc.',
        unit: 'lot',
        defaultQuantity: 1,
        unitPrice: '{{materialsCost}}',
      },
      {
        name: 'Equipment / Unit',
        description: 'Condenser, air handler, furnace, or heat pump (cost passed through).',
        unit: 'lot',
        defaultQuantity: 1,
        unitPrice: '{{equipmentCost}}',
      },
      {
        name: 'Permit & Inspection',
        description: 'City permit and mechanical inspection fees.',
        unit: 'lot',
        defaultQuantity: 1,
        unitPrice: '{{permitsCost}}',
      },
      {
        name: 'Old Equipment Disposal',
        description: 'Recovery, haul-away, and EPA-compliant disposal of the old unit.',
        unit: 'lot',
        defaultQuantity: 1,
        unitPrice: '{{wasteRemovalCost}}',
      },
    ],
    defaultTaxRate: 7,
    defaultDepositPct: 30,
    termsAndConditions:
      STANDARD_TERMS +
      '\n8. Manufacturer warranty registration is filed on the customer\u2019s behalf. Warranty does not cover damage from improper maintenance or acts of nature.',
    estimatedDurationMins: 360,
  },

  // ── 3. ROOFING ───────────────────────────────────────────────────────────
  {
    id: 'roofing-install-repair',
    industry: 'roofing',
    name: 'Roofing Install / Repair',
    description:
      'Roof install or repair quote covering crew labour, shingles/materials, underlayment, dump fees, and permits.',
    items: [
      {
        name: 'Roofing Crew Labour',
        description: 'Foreman + crew labour (per hour, all crew).',
        unit: 'hour',
        defaultQuantity: 1,
        unitPrice: '{{hourlyRate}} * {{hours}} * {{crew}}',
        hoursPerUnit: 1,
      },
      {
        name: 'Shingles / Roofing Material',
        description: 'Asphalt shingles, metal panels, or tiles — priced per area (sqft).',
        unit: 'sqft',
        defaultQuantity: 1,
        unitPrice: '{{materialsCost}} / {{area}}',
      },
      {
        name: 'Underlayment & Flashing',
        description: 'Synthetic underlayment, ice-and-water shield, drip edge, flashing.',
        unit: 'lot',
        defaultQuantity: 1,
        unitPrice: '{{equipmentCost}}',
      },
      {
        name: 'Permit',
        description: 'Municipal roofing permit.',
        unit: 'lot',
        defaultQuantity: 1,
        unitPrice: '{{permitsCost}}',
      },
      {
        name: 'Tear-off & Dump Fees',
        description: 'Old roofing removal, dumpster rental, and landfill fees.',
        unit: 'lot',
        defaultQuantity: 1,
        unitPrice: '{{wasteRemovalCost}}',
      },
    ],
    defaultTaxRate: 7,
    defaultDepositPct: 40,
    termsAndConditions:
      STANDARD_TERMS +
      '\n8. Roof warranty: 5 years on workmanship + manufacturer warranty on materials (varies by product).',
    estimatedDurationMins: 480,
  },

  // ── 4. ELECTRICAL ────────────────────────────────────────────────────────
  {
    id: 'electrical-service',
    industry: 'electrical',
    name: 'Electrical Service / Install',
    description:
      'Electrical install or repair quote covering licensed electrician labour, wire/devices, panel/materials, and permit/inspection.',
    items: [
      {
        name: 'Licensed Electrician Labour',
        description: 'Master or journeyman electrician labour (per hour).',
        unit: 'hour',
        defaultQuantity: 1,
        unitPrice: '{{hourlyRate}} * {{hours}}',
        hoursPerUnit: 1,
      },
      {
        name: 'Wire, Conduit & Devices',
        description: 'Romex, conduit, boxes, outlets, switches, breakers.',
        unit: 'lot',
        defaultQuantity: 1,
        unitPrice: '{{materialsCost}}',
      },
      {
        name: 'Panel / Equipment',
        description: 'Service panel, transfer switch, EV charger, generator, etc.',
        unit: 'lot',
        defaultQuantity: 1,
        unitPrice: '{{equipmentCost}}',
      },
      {
        name: 'Permit & Inspection',
        description: 'Electrical permit and city inspection fees.',
        unit: 'lot',
        defaultQuantity: 1,
        unitPrice: '{{permitsCost}}',
      },
      {
        name: 'Old Fixture Disposal',
        description: 'Removal and recycling of old fixtures, panels, or wiring.',
        unit: 'lot',
        defaultQuantity: 1,
        unitPrice: '{{wasteRemovalCost}}',
      },
    ],
    defaultTaxRate: 7,
    defaultDepositPct: 30,
    termsAndConditions:
      STANDARD_TERMS +
      '\n8. All work performed to NEC (National Electrical Code) and local amendments. Inspection passed before final invoice.',
    estimatedDurationMins: 240,
  },

  // ── 5. PAINTING ──────────────────────────────────────────────────────────
  {
    id: 'painting-interior-exterior',
    industry: 'painting',
    name: 'Interior / Exterior Painting',
    description:
      'Painting quote covering prep + paint labour, paint/materials, equipment rental, and cleanup. Scales with area and coats.',
    items: [
      {
        name: 'Painter Labour',
        description: 'Prep, mask, cut-in, roll, and trim — per hour, per painter.',
        unit: 'hour',
        defaultQuantity: 1,
        unitPrice: '{{hourlyRate}} * {{hours}} * {{crew}}',
        hoursPerUnit: 1,
      },
      {
        name: 'Paint & Primer',
        description: 'Premium paint + primer — priced by area / number of coats.',
        unit: 'sqft',
        defaultQuantity: 1,
        unitPrice: '{{materialsCost}} / {{area}}',
      },
      {
        name: 'Caulk, Tape & Sundries',
        description: 'Caulk, spackle, sandpaper, drop cloths, tape, brush/roller covers.',
        unit: 'lot',
        defaultQuantity: 1,
        unitPrice: '{{equipmentCost}}',
      },
      {
        name: 'Sprayer / Lift Rental',
        description: 'Airless sprayer, ladders, or scissor-lift rental as needed.',
        unit: 'lot',
        defaultQuantity: 1,
        unitPrice: '{{permitsCost}}',
      },
      {
        name: 'Cleanup & Waste',
        description: 'Paint-can disposal, site cleanup, and haul-away of masking debris.',
        unit: 'lot',
        defaultQuantity: 1,
        unitPrice: '{{wasteRemovalCost}}',
      },
    ],
    defaultTaxRate: 8,
    defaultDepositPct: 30,
    termsAndConditions:
      STANDARD_TERMS +
      '\n8. Paint warranty: 2 years against peeling/blistering. Customer must report defects in writing within 30 days of appearance.',
    estimatedDurationMins: 480,
  },

  // ── 6. SOLAR ─────────────────────────────────────────────────────────────
  {
    id: 'solar-install',
    industry: 'solar',
    name: 'Solar PV Installation',
    description:
      'Solar PV system install quote covering crew labour, panels/inverter/racking, electrical balance-of-system, permits, and old-equipment disposal.',
    items: [
      {
        name: 'Solar Crew Labour',
        description: 'Installer crew labour (per hour, all crew).',
        unit: 'hour',
        defaultQuantity: 1,
        unitPrice: '{{hourlyRate}} * {{hours}} * {{crew}}',
        hoursPerUnit: 1,
      },
      {
        name: 'Solar Panels',
        description: 'PV modules — priced per panel (use quantity = number of panels).',
        unit: 'item',
        defaultQuantity: 1,
        unitPrice: '{{materialsCost}}',
      },
      {
        name: 'Inverter & Racking',
        description: 'String inverter or microinverters, racking, flashings, attachments.',
        unit: 'lot',
        defaultQuantity: 1,
        unitPrice: '{{equipmentCost}}',
      },
      {
        name: 'Permit, Utility & Inspection',
        description: 'City permit, plan review, utility interconnection, and inspections.',
        unit: 'lot',
        defaultQuantity: 1,
        unitPrice: '{{permitsCost}}',
      },
      {
        name: 'Old Equipment Disposal',
        description: 'Removal and recycling of any existing solar or roofing debris.',
        unit: 'lot',
        defaultQuantity: 1,
        unitPrice: '{{wasteRemovalCost}}',
      },
    ],
    defaultTaxRate: 6,
    defaultDepositPct: 40,
    termsAndConditions:
      STANDARD_TERMS +
      '\n8. System production guarantee: 90% in year 1, 80% at year 25 (manufacturer linear warranty). Interconnection approval by utility is required before PTO (permission to operate).',
    estimatedDurationMins: 960,
  },

  // ── 7. MOVING ────────────────────────────────────────────────────────────
  {
    id: 'moving-local',
    industry: 'moving',
    name: 'Local / Long-Distance Move',
    description:
      'Moving quote covering crew labour, truck/fuel, packing materials, and optional storage. Scales with hours, crew size, and distance.',
    items: [
      {
        name: 'Mover Crew Labour',
        description: 'Driver + movers labour (per hour, all crew).',
        unit: 'hour',
        defaultQuantity: 1,
        unitPrice: '{{hourlyRate}} * {{hours}} * {{crew}}',
        hoursPerUnit: 1,
      },
      {
        name: 'Truck & Fuel',
        description: 'Box truck rental, fuel, and tolls.',
        unit: 'lot',
        defaultQuantity: 1,
        unitPrice: '{{equipmentCost}}',
      },
      {
        name: 'Packing Materials',
        description: 'Boxes, tape, bubble wrap, furniture pads, shrink wrap.',
        unit: 'lot',
        defaultQuantity: 1,
        unitPrice: '{{materialsCost}}',
      },
      {
        name: 'Storage (optional)',
        description: 'Short-term container or warehouse storage if needed.',
        unit: 'day',
        defaultQuantity: 1,
        unitPrice: '{{permitsCost}}',
      },
      {
        name: 'Disposal / Donation Haul',
        description: 'Haul-away of items the customer is not taking to the new address.',
        unit: 'lot',
        defaultQuantity: 1,
        unitPrice: '{{wasteRemovalCost}}',
      },
    ],
    defaultTaxRate: 8,
    defaultDepositPct: 30,
    termsAndConditions:
      STANDARD_TERMS +
      '\n8. Valuation coverage: $0.60/lb included (released value). Full-value protection available for an additional charge — ask the crew lead before loading. Customer must declare items over $100/lb in writing prior to loading.',
    estimatedDurationMins: 240,
  },
];

// ─── Lookup helpers ────────────────────────────────────────────────────────

/**
 * Return all templates whose industry matches `industryId`.
 * Returns an empty array if no templates exist for the industry.
 */
export function getTemplatesForIndustry(industryId: string): QuoteTemplate[] {
  return QUOTE_TEMPLATES.filter((t) => t.industry === industryId);
}

/**
 * Return the first (primary) template for an industry, or null if none exists.
 * This is what the Smart Quote Builder uses as its AI-unavailable fallback.
 */
export function getTemplateForIndustry(industryId: string): QuoteTemplate | null {
  return QUOTE_TEMPLATES.find((t) => t.industry === industryId) ?? null;
}

/** Return a template by its unique ID, or null if not found. */
export function getTemplateById(templateId: string): QuoteTemplate | null {
  return QUOTE_TEMPLATES.find((t) => t.id === templateId) ?? null;
}

/** Return all templates. */
export function listTemplates(): QuoteTemplate[] {
  return QUOTE_TEMPLATES;
}

// ─── Placeholder substitution engine ───────────────────────────────────────

function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Resolve a `unitPrice` expression (number OR `{{var}}`-tokenized string)
 * to a concrete number using the supplied variables.
 *
 * Tokens that aren't supplied in `vars` default to 0. Arithmetic expressions
 * are evaluated with a sandboxed `Function` constructor — only the literal
 * variable names are passed in as function parameters, no global access.
 */
function resolveUnitPrice(
  expr: number | string,
  vars: Record<string, number>,
): number {
  if (typeof expr === 'number') {
    return Number.isFinite(expr) ? expr : 0;
  }
  if (typeof expr !== 'string' || expr.trim().length === 0) return 0;

  // Replace {{varName}} tokens with their numeric values (or 0 if missing).
  const substituted = expr.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, name: string) => {
    const v = vars[name];
    return typeof v === 'number' && Number.isFinite(v) ? `(${v})` : '(0)';
  });

  // Quick safety: only allow numbers, whitespace, parentheses, and + - * / .
  if (!/^[\d\s+\-*/().]+$/g.test(substituted)) {
    return 0;
  }

  try {
    // Use Function with the variable names as parameters so the expression
    // can reference them by identifier — but we already substituted above,
    // so we just evaluate the resulting numeric expression directly.
    const fn = new Function(`"use strict"; return (${substituted});`) as () => number;
    const result = fn();
    return typeof result === 'number' && Number.isFinite(result) ? result : 0;
  } catch {
    return 0;
  }
}

/**
 * Substitute {{var}} tokens in a plain-text string (terms & conditions, etc.).
 * Non-numeric variables (customerName, companyName) are supported here.
 * Missing variables are replaced with an empty string.
 */
function substituteText(
  template: string,
  vars: Record<string, string | number>,
): string {
  if (!template) return '';
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, name: string) => {
    const v = vars[name];
    if (v === undefined || v === null) return '';
    return String(v);
  });
}

// ─── Template application ──────────────────────────────────────────────────

/**
 * Apply a template: resolve all unit prices, compute per-line totals,
 * subtotal, tax, deposit, and produce a fully-priced quote.
 *
 * Missing variables default to 0, which means any line whose unitPrice
 * expression depends on a missing variable will be priced at $0 — this is
 * intentional so callers can request a "minimal" quote by only supplying
 * the variables they know.
 */
export function applyTemplate(
  template: QuoteTemplate,
  variables: TemplateVariables = {},
): AppliedQuote {
  // Numeric variable map used by resolveUnitPrice.
  const numericVars: Record<string, number> = {};
  for (const [k, v] of Object.entries(variables)) {
    if (typeof v === 'number' && Number.isFinite(v)) {
      numericVars[k] = v;
    }
  }
  // Sensible defaults so templates produce non-zero totals out-of-the-box.
  if (numericVars.hourlyRate === undefined) numericVars.hourlyRate = 50;
  if (numericVars.hours === undefined) numericVars.hours = 2;
  if (numericVars.crew === undefined) numericVars.crew = 1;

  const taxRate =
    typeof variables.taxRate === 'number' && Number.isFinite(variables.taxRate)
      ? variables.taxRate
      : template.defaultTaxRate;

  const depositPct =
    typeof variables.depositPct === 'number' &&
    Number.isFinite(variables.depositPct)
      ? variables.depositPct
      : template.defaultDepositPct;

  const lineItems: AppliedLineItem[] = template.items.map((item, idx) => {
    const quantity =
      variables.quantities && typeof variables.quantities[idx] === 'number'
        ? Math.max(0, variables.quantities[idx] as number)
        : Math.max(0, item.defaultQuantity);
    const unitPrice = Math.max(0, resolveUnitPrice(item.unitPrice, numericVars));
    const total = round2(quantity * unitPrice);
    const hours = item.hoursPerUnit ? round2(quantity * item.hoursPerUnit) : 0;
    return {
      name: item.name,
      description: item.description,
      quantity: round2(quantity),
      unit: item.unit,
      unitPrice: round2(unitPrice),
      total,
      hours,
    };
  });

  const subtotal = round2(lineItems.reduce((s, li) => s + li.total, 0));
  const tax = round2((subtotal * taxRate) / 100);
  const total = round2(subtotal + tax);
  const depositAmount = round2((total * depositPct) / 100);
  const estimatedHours = round2(lineItems.reduce((s, li) => s + li.hours, 0));
  const estimatedDurationMins =
    estimatedHours > 0 ? estimatedHours * 60 : template.estimatedDurationMins;

  // String variables for the terms & conditions template.
  const textVars: Record<string, string | number> = {
    ...numericVars,
    taxRate,
    depositPct,
    customerName: variables.customerName ?? '',
    companyName: variables.companyName ?? '',
  };

  return {
    lineItems,
    subtotal,
    tax,
    taxRate,
    total,
    depositPct,
    depositAmount,
    estimatedHours,
    estimatedDurationMins,
    termsAndConditions: substituteText(template.termsAndConditions, textVars),
  };
}

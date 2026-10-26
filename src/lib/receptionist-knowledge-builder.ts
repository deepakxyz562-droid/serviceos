/**
 * Receptionist Knowledge Builder & Vapi Training Engine
 * ====================================================
 *
 * Compiles real business owner data (services, pricing, operating hours,
 * service territory, diagnostic fees, warranties, FAQs, and custom instructions)
 * into a structured, highly effective voice system prompt for the Vapi AI Receptionist.
 *
 * Example:
 *   If tenant is "ABC Plumbing", the AI is explicitly trained with:
 *     - Company: ABC Plumbing (Licensed Residential & Commercial Plumbers)
 *     - Service Area: Dallas-Fort Worth Metroplex
 *     - Services: Drain Cleaning ($99), Water Heater Repair ($150+), Leak Detection ($120)
 *     - Policy: $89 diagnostic fee (credited to repair), 24/7 emergency dispatch
 *     - Exact CRM tool execution instructions for phone bookings & lead captures
 */

import { db } from '@/lib/db';

export interface ReceptionistKnowledgeConfig {
  businessTrade?: string;
  serviceArea?: string;
  diagnosticFee?: string;
  emergencyAvailable?: boolean;
  emergencyDetails?: string;
  warrantyPolicy?: string;
  paymentMethods?: string;
  customInstructions?: string;
  faqList?: Array<{ question: string; answer: string }>;
  servicesEnabled?: boolean;
  pricingEnabled?: boolean;
  bookingEnabled?: boolean;
  faqEnabled?: boolean;
}

export interface CompiledReceptionistContext {
  businessName: string;
  industry: string;
  phone: string;
  email: string;
  address: string;
  currency: string;
  serviceArea: string;
  businessHoursText: string;
  receptionistName: string;
  greeting: string;
  afterHoursGreeting: string;
  handoffEnabled: boolean;
  handoffTransferTarget: string | null;
  knowledgeConfig: ReceptionistKnowledgeConfig;
  services: Array<{
    id: string;
    name: string;
    description: string | null;
    basePrice: number | null;
    duration: number | null;
  }>;
  knowledgeDocuments: Array<{
    title: string;
    summary: string;
  }>;
}

/**
 * Format business hours JSON into a concise human-readable schedule.
 */
export function formatWeeklyHours(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') return 'Monday-Friday 8:00 AM - 6:00 PM';
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return 'Monday-Friday 8:00 AM - 6:00 PM';
    const dayMap: Array<{ key: string; label: string }> = [
      { key: 'mon', label: 'Mon' },
      { key: 'tue', label: 'Tue' },
      { key: 'wed', label: 'Wed' },
      { key: 'thu', label: 'Thu' },
      { key: 'fri', label: 'Fri' },
      { key: 'sat', label: 'Sat' },
      { key: 'sun', label: 'Sun' },
    ];
    const parts: string[] = [];
    for (const d of dayMap) {
      const day = parsed[d.key] as { open?: string; close?: string; enabled?: boolean; closed?: boolean } | undefined;
      if (!day) continue;
      if (day.enabled === false || day.closed === true) {
        parts.push(`${d.label}: Closed`);
      } else if (day.open && day.close) {
        parts.push(`${d.label}: ${day.open} - ${day.close}`);
      }
    }
    return parts.length > 0 ? parts.join(', ') : 'Monday-Friday 8:00 AM - 6:00 PM';
  } catch {
    return 'Monday-Friday 8:00 AM - 6:00 PM';
  }
}

/**
 * Load all owner and business context needed to train the receptionist.
 */
export async function getTenantReceptionistContext(
  tenantId: string,
  receptionistId?: string,
): Promise<CompiledReceptionistContext> {
  const [tenant, brandProfile, services, receptionist, knowledgeDocs] = await Promise.all([
    db.tenant.findUnique({
      where: { id: tenantId },
      select: {
        name: true,
        industry: true,
        phone: true,
        email: true,
        address: true,
        currency: true,
        businessHoursJson: true,
        settingsJson: true,
      },
    }),
    db.brandProfile.findUnique({
      where: { tenantId },
      select: {
        businessName: true,
        industry: true,
        serviceArea: true,
        location: true,
        services: true,
        usps: true,
        currentOffers: true,
        aiGeneratedSummary: true,
      },
    }).catch(() => null),
    db.service.findMany({
      where: { tenantId, isActive: true },
      select: {
        id: true,
        name: true,
        description: true,
        basePrice: true,
        duration: true,
      },
      take: 25,
      orderBy: { name: 'asc' },
    }).catch(() => []),
    receptionistId
      ? db.aiReceptionist.findUnique({ where: { id: receptionistId } })
      : db.aiReceptionist.findFirst({ where: { tenantId }, orderBy: { createdAt: 'desc' } }),
    db.aiKnowledgeDocument.findMany({
      where: { tenantId, status: 'ready' },
      select: { title: true, content: true },
      take: 5,
    }).catch(() => []),
  ]);

  let parsedKnowledgeConfig: ReceptionistKnowledgeConfig = {};
  if (receptionist?.knowledgeConfigJson) {
    try {
      parsedKnowledgeConfig = JSON.parse(receptionist.knowledgeConfigJson);
    } catch {
      parsedKnowledgeConfig = {};
    }
  }

  const businessName =
    tenant?.name || brandProfile?.businessName || 'Our Service Company';
  const industry =
    parsedKnowledgeConfig.businessTrade ||
    tenant?.industry ||
    brandProfile?.industry ||
    'Home & Field Services';
  const serviceArea =
    parsedKnowledgeConfig.serviceArea ||
    brandProfile?.serviceArea ||
    brandProfile?.location ||
    tenant?.address ||
    'Local area';

  // Determine hours (custom receptionist hours or tenant business hours)
  const rawHours =
    receptionist?.businessHoursMode === 'custom' && receptionist.customHoursJson
      ? receptionist.customHoursJson
      : tenant?.businessHoursJson;
  const businessHoursText = formatWeeklyHours(rawHours);

  return {
    businessName,
    industry,
    phone: tenant?.phone || '',
    email: tenant?.email || '',
    address: tenant?.address || '',
    currency: tenant?.currency || 'USD',
    serviceArea,
    businessHoursText,
    receptionistName: receptionist?.name || 'Sarah',
    greeting:
      receptionist?.greeting ||
      `Thanks for calling ${businessName}! How can I help you today?`,
    afterHoursGreeting:
      receptionist?.afterHoursGreeting ||
      `Thank you for calling ${businessName}. Our office is currently closed, but I can help you book an appointment or capture your details for immediate follow-up.`,
    handoffEnabled: receptionist?.handoffEnabled ?? true,
    handoffTransferTarget: receptionist?.handoffTransferTarget || null,
    knowledgeConfig: parsedKnowledgeConfig,
    services: services.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      basePrice: s.basePrice,
      duration: s.duration,
    })),
    knowledgeDocs: (knowledgeDocs || []).map((doc) => ({
      title: doc.title,
      summary: (doc.content || '').slice(0, 300),
    })),
  };
}

/**
 * Compile the full, comprehensive prompt that trains Vapi to speak exactly
 * like a dedicated receptionist for the owner's business (e.g. ABC Plumbing).
 */
export function buildReceptionistSystemPrompt(ctx: CompiledReceptionistContext): string {
  const cfg = ctx.knowledgeConfig;
  const currSym = ctx.currency === 'USD' ? '$' : ctx.currency === 'INR' ? '₹' : ctx.currency === 'EUR' ? '€' : '$';

  // 1. Service Catalog Section
  let servicesBlock = '';
  if (cfg.servicesEnabled !== false && ctx.services.length > 0) {
    const serviceLines = ctx.services.map((s) => {
      const priceStr = s.basePrice && cfg.pricingEnabled !== false ? ` - starting at ${currSym}${s.basePrice}` : '';
      const durStr = s.duration ? ` (approx ${s.duration} mins)` : '';
      const descStr = s.description ? `: ${s.description}` : '';
      return `  • ${s.name}${priceStr}${durStr}${descStr}`;
    });
    servicesBlock = `
OFFERED SERVICES & PRICING:
${serviceLines.join('\n')}`;
  }

  // 2. Policies & Fees
  const policies: string[] = [];
  if (cfg.diagnosticFee) {
    policies.push(`  • Diagnostic / Dispatch Fee: ${cfg.diagnosticFee}`);
  }
  if (cfg.emergencyAvailable) {
    policies.push(`  • Emergency Services: 24/7 emergency dispatch available${cfg.emergencyDetails ? ` (${cfg.emergencyDetails})` : ''}.`);
  }
  if (cfg.warrantyPolicy) {
    policies.push(`  • Guarantee / Warranty: ${cfg.warrantyPolicy}`);
  }
  if (cfg.paymentMethods) {
    policies.push(`  • Accepted Payment Methods: ${cfg.paymentMethods}`);
  }
  const policiesBlock = policies.length > 0
    ? `\nBUSINESS POLICIES & FEES:\n${policies.join('\n')}`
    : '';

  // 3. Custom FAQs
  let faqBlock = '';
  if (cfg.faqEnabled !== false && cfg.faqList && cfg.faqList.length > 0) {
    const faqLines = cfg.faqList.map(
      (f, i) => `  Q${i + 1}: ${f.question}\n  A${i + 1}: ${f.answer}`
    );
    faqBlock = `\nFREQUENTLY ASKED QUESTIONS (FAQS):\n${faqLines.join('\n\n')}`;
  }

  // 4. Knowledge Base Documents
  let docBlock = '';
  if (cfg.faqEnabled !== false && ctx.knowledgeDocuments.length > 0) {
    const docLines = ctx.knowledgeDocuments.map(
      (d) => `  [Document: ${d.title}]\n  ${d.summary.replace(/\n+/g, ' ')}`
    );
    docBlock = `\nCOMPANY KNOWLEDGE BASE SNIPPETS:\n${docLines.join('\n')}`;
  }

  // 5. Custom Owner Directives
  const customDirectives = cfg.customInstructions
    ? `\nSPECIAL OWNER INSTRUCTIONS:\n${cfg.customInstructions}\n`
    : '';

  return `You are ${ctx.receptionistName}, the professional, highly capable AI phone receptionist for ${ctx.businessName}.
You are speaking live on a phone call with a customer. Be warm, friendly, concise, and trustworthy.

BUSINESS IDENTITY & COVERAGE:
- Company Name: ${ctx.businessName}
- Industry / Specialty: ${ctx.industry}
- Service Area / Territory: ${ctx.serviceArea}
${ctx.phone ? `- Office Phone: ${ctx.phone}` : ''}
${ctx.address ? `- Shop / Headquarters: ${ctx.address}` : ''}
- Operating Hours: ${ctx.businessHoursText}
${servicesBlock}
${policiesBlock}
${faqBlock}
${docBlock}
${customDirectives}
PRIMARY RESPONSIBILITIES:
1. Greet the caller pleasantly and ask how you can help them today.
2. Listen carefully to their service issue or request without interrupting.
3. Provide accurate information about ${ctx.businessName}'s services, coverage, and scheduling.
4. Convert inquiries into booked appointments or captured sales leads.

CALLER MEMORY & LOOKUP:
- Listen for the caller's name and phone number.
- NEVER repeatedly ask for their name or number if they have already provided it.
- If you have their phone number, call the get_customer tool once to check their history.
- If they are an existing customer, acknowledge them by name and reference their history if relevant.

APPOINTMENT BOOKING WORKFLOW:
1. When a caller wants to book service, ask what service they need and their preferred date/time.
2. Use check_availability to view open calendar slots for that day.
3. Offer 2 convenient time windows to the caller.
4. Confirm their full name, phone number, and service address.
5. If they are a new customer, call create_customer.
6. Once the time is confirmed, call schedule_job to secure their booking.
7. Confirm the booked date and arrival window back to the caller clearly.
- Note: Never claim an appointment is confirmed until schedule_job returns success.

LEAD CAPTURE FOR QUOTES & INQUIRIES:
- If the caller needs an estimate, callback, or describes a complex job:
  - Collect their name, phone number, address, and brief problem description.
  - Call create_lead with notes on what they need.
  - Let them know our team will review and contact them promptly.

HUMAN TRANSFER & ESCALATION:
${ctx.handoffEnabled && ctx.handoffTransferTarget ? `- If the caller asks to speak to a person, manager, or has an emergency, call transfer_to_human to connect them to ${ctx.handoffTransferTarget}.` : '- If a human transfer is requested, politely explain our dispatchers are currently on service calls, take their message, and create a lead for immediate callback.'}

PHONE CONVERSATION RULES:
- Speak naturally in short, clear sentences. Callers cannot read bullet points — keep spoken responses under 2 sentences whenever possible.
- Never invent prices, dates, or promises not listed above. If unsure, offer to have a specialist call them back.
- Allow the caller to finish speaking before responding. Never repeat a question the caller already answered.`;
}

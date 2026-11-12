import { db } from '@/lib/db';
import { callAI } from '@/lib/ai-client';
import { formatCurrency } from '@/lib/currency';
import { getBrandContext, getBrandContextRaw } from '@/lib/brand-context';
import {
  searchKnowledgeBaseHybrid,
  upsertManagedKnowledgeDocument,
} from '@/lib/ai-knowledge';
import {
  type BusinessStructuredFacts,
  queryStructuredFacts,
} from '@/lib/ai-structured-facts';
import {
  listUnansweredQuestionsAsync,
  recordUnansweredQuestion,
} from '@/lib/ai-unanswered-questions';
import {
  getBgosPublicBusinessProfileUncached,
  type BgosPublicBusinessProfile,
} from '@/lib/bgos-public-business';
import {
  getBgosAiQuotaForPlan,
  normalizeBgosPlanCode,
} from '@/lib/bgos-billing';
import {
  type ChatHistoryMessage,
  isEscalationIntent,
  requestHumanHandoff,
} from '@/lib/chat/handoff-service';
import { getTenantBgosEntitlement } from '@/lib/bgos-entitlement';
import { syncChatConversation } from '@/lib/chat/chat-session-sync';
import { mirrorLiveChatMessageToInbox } from '@/lib/live-chat-bridge';
import { tryExecuteChatBooking } from '@/lib/scheduling/chat-booking-helper';
import {
  checkTenantRateLimit,
  inputGuardrail,
  outputGuardrail,
  type GuardrailConfig,
} from '@/lib/agent-guardrails';
import { rewriteQuery } from '@/lib/agent/query-rewriter';
import {
  DEFAULT_FORM_AGENT,
  type FaqPair,
  type FormAgentData,
} from '@/features/forms/types/agent-types';

const AUTO_KB_TITLE = 'Auto-Synced Business Profile & Services';

export interface BusinessChatbotAutoSyncSummary {
  syncedAt: string;
  triggerSource: string;
  servicesCount: number;
  hoursConfigured: boolean;
  hasLocation: boolean;
  hasBrandBrain: boolean;
  hasPhone: boolean;
  faqCount: number;
  unansweredPendingCount: number;
  publicCardSlug: string;
}

export interface PublicBusinessChatbotMeta {
  agentId: string;
  agentName: string;
  roleTitle: string;
  avatarUrl: string | null;
  accentColor: string;
  welcomeGreeting: string;
  allowOwnerHandoff: boolean;
  quickQuestions: string[];
  autoSyncedAt: string | null;
  autoSyncSummary: BusinessChatbotAutoSyncSummary | null;
}

export interface BusinessChatReplyResult {
  reply: string;
  sessionId: string | null;
  agentName: string;
  suggestedQuestions: string[];
  citations?: Array<{ id: number; title: string; snippet: string }>;
  escalatedToHuman?: boolean;
  liveMode?: boolean;
  aiPaused?: boolean;
  agentAvailable?: boolean;
  quotaLimited?: boolean;
  actionCard?: {
    type: 'booking_cta' | 'booking_confirmation' | 'owner_contact_cta';
    bookingUrl?: string;
    whatsappUrl?: string | null;
    phone?: string | null;
    date?: string;
    time?: string;
    service?: string;
  } | null;
}

function safeParseJson<T = Record<string, any>>(raw: unknown, fallback: T): T {
  if (!raw) return fallback;
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw as T;
  if (typeof raw !== 'string') return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

function mapBrandToneToAgentTone(tone?: string | null): FormAgentData['voiceTone'] {
  const clean = String(tone || '').trim().toLowerCase();
  if (clean === 'professional' || clean === 'formal' || clean === 'authoritative') return 'professional';
  if (clean === 'empathetic' || clean === 'caring' || clean === 'warm') return 'empathetic';
  if (clean === 'sales' || clean === 'persuasive' || clean === 'bold') return 'sales';
  if (clean === 'medical' || clean === 'clinical') return 'medical';
  return 'friendly';
}

function formatReadableHoursLine(openTime: string, closeTime: string): string {
  const fmt = (hhmm: string) => {
    const [hStr, mStr] = hhmm.split(':');
    const h = Number(hStr);
    const m = Number(mStr);
    if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
  };
  return `${fmt(openTime)} – ${fmt(closeTime)}`;
}

function buildStructuredFactsFromProfile(
  profile: BgosPublicBusinessProfile,
): BusinessStructuredFacts {
  const operatingHours: Record<string, string> = {};
  for (const row of profile.hours) {
    operatingHours[row.day] = row.open
      ? formatReadableHoursLine(row.openTime, row.closeTime)
      : 'Closed';
  }

  return {
    businessName: profile.businessName,
    tagline: profile.tagline,
    phone: profile.phone || undefined,
    email: profile.email || undefined,
    address: profile.address || undefined,
    serviceAreas: profile.serviceAreas,
    operatingHours,
    emergencyAvailable: false,
    services: profile.services.map((svc) => ({
      name: svc.name,
      price:
        svc.price !== null && svc.price > 0
          ? formatCurrency(svc.price, profile.currency, { compact: true })
          : 'Request quote',
      priceStartingAt: svc.price !== null && svc.price > 0 ? svc.price : undefined,
      description: svc.description || undefined,
      duration: svc.duration ? `${svc.duration} min` : undefined,
      category: svc.category || undefined,
    })),
    pricingPolicies: {},
    bookingRules: {},
    guarantees: [],
    acceptedPayments: [],
    sourceUrl: profile.canonicalUrl,
    updatedAt: new Date().toISOString(),
  };
}

function buildAutoKnowledgeDocumentText(
  profile: BgosPublicBusinessProfile,
  brandSummaryText: string,
  faqs: FaqPair[],
  customInstructions: string,
): string {
  const lines: string[] = [
    `Business Name: ${profile.businessName}`,
    `Category: ${profile.category}`,
    profile.tagline ? `Tagline: ${profile.tagline}` : '',
    profile.description ? `Overview: ${profile.description}` : '',
    profile.phone ? `Phone: ${profile.phone}` : '',
    profile.whatsappPhone ? `WhatsApp: ${profile.whatsappPhone}` : '',
    profile.email ? `Email: ${profile.email}` : '',
    profile.address ? `Address: ${profile.address}` : '',
    profile.serviceAreas.length > 0 ? `Service Areas: ${profile.serviceAreas.join(', ')}` : '',
    profile.rating > 0 && profile.reviewCount > 0
      ? `Google Rating: ${profile.rating.toFixed(1)} / 5 based on ${profile.reviewCount} reviews`
      : '',
  ].filter(Boolean);

  if (profile.hours.length > 0) {
    lines.push('\nOpening Hours:');
    for (const h of profile.hours) {
      lines.push(`- ${h.day}: ${h.open ? formatReadableHoursLine(h.openTime, h.closeTime) : 'Closed'}`);
    }
  }

  if (profile.services.length > 0) {
    lines.push('\nServices & Pricing:');
    for (const svc of profile.services) {
      const priceLabel =
        svc.price !== null && svc.price > 0
          ? formatCurrency(svc.price, profile.currency, { compact: true })
          : 'Price on inquiry';
      const durLabel = svc.duration ? ` (${svc.duration} min)` : '';
      lines.push(
        `- ${svc.name}: ${priceLabel}${durLabel}${svc.description ? ` — ${svc.description}` : ''}`,
      );
    }
  }

  if (brandSummaryText.trim()) {
    lines.push(`\nBrand Identity & Guidelines:\n${brandSummaryText.trim()}`);
  }

  if (customInstructions.trim()) {
    lines.push(`\nOwner Instructions:\n${customInstructions.trim()}`);
  }

  if (faqs.length > 0) {
    lines.push('\nFrequently Asked Questions:');
    for (const faq of faqs) {
      lines.push(`Q: ${faq.question}\nA: ${faq.answer}`);
    }
  }

  return lines.join('\n');
}

function buildStarterFaqsFromProfile(profile: BgosPublicBusinessProfile): FaqPair[] {
  const out: FaqPair[] = [];
  for (const faq of (profile.faqs || []).slice(0, 6)) {
    out.push({
      id: `faq_prof_${out.length + 1}`,
      question: faq.question,
      answer: faq.answer,
    });
  }

  if (out.length === 0) {
    if (profile.services.length > 0) {
      const topServices = profile.services
        .slice(0, 5)
        .map((s) =>
          s.price !== null && s.price > 0
            ? `${s.name} (${formatCurrency(s.price, profile.currency, { compact: true })})`
            : s.name,
        )
        .join(', ');
      out.push({
        id: 'faq_auto_services',
        question: 'What services do you offer?',
        answer: `${profile.businessName} offers ${topServices}. Message us or book online for exact details.`,
      });
    }
    const openDays = profile.hours.filter((h) => h.open);
    if (openDays.length > 0) {
      const first = openDays[0];
      out.push({
        id: 'faq_auto_hours',
        question: 'What are your opening hours?',
        answer: `We are open ${openDays.length} days a week (${first.day} ${formatReadableHoursLine(first.openTime, first.closeTime)}). Check the hours section or ask about any specific day.`,
      });
    }
    if (profile.address) {
      out.push({
        id: 'faq_auto_location',
        question: 'Where are you located?',
        answer: `Our address is ${profile.address}. You can open Google Maps directions right from this page.`,
      });
    }
  }
  return out;
}

async function generateUniqueAgentSlug(baseSlug: string): Promise<string> {
  const cleanBase =
    baseSlug
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 48) || 'business-assistant';
  let candidate = `${cleanBase}-assistant`;
  let counter = 1;
  while (await db.formAgent.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${cleanBase}-assistant-${counter}`;
    counter += 1;
  }
  return candidate;
}

/**
 * Ensures a primary business `FormAgent` exists for `tenantId` and keeps its
 * structured facts, branding, and auto-managed RAG knowledge document synced
 * with Google Business info, `db.service`, Brand Brain, and owner settings.
 */
export async function ensureAndSyncBusinessChatbot(
  tenantId: string,
  options?: { triggerSource?: string },
): Promise<{
  agent: FormAgentData;
  profile: BgosPublicBusinessProfile | null;
  autoSyncSummary: BusinessChatbotAutoSyncSummary | null;
}> {
  const profile = await getBgosPublicBusinessProfileUncached(tenantId);
  if (!profile) {
    return { agent: DEFAULT_FORM_AGENT, profile: null, autoSyncSummary: null };
  }

  const [brandRaw, brandContext, existingAgents, pendingUnanswered] = await Promise.all([
    getBrandContextRaw(tenantId),
    getBrandContext(tenantId),
    db.formAgent
      .findMany({
        where: { tenantId, status: 'active' },
        orderBy: [{ createdAt: 'asc' }],
        take: 10,
      })
      .catch(() => []),
    listUnansweredQuestionsAsync(tenantId, 'pending').catch(() => []),
  ]);

  // Select existing primary business bot or first active FormAgent
  let agentRow =
    existingAgents.find((a) => {
      const cfg = safeParseJson<Record<string, any>>(a.configJson, {});
      return Boolean(cfg.isPrimaryBusinessBot);
    }) || existingAgents[0];

  const structuredFacts = buildStructuredFactsFromProfile(profile);
  const existingCfg = agentRow ? safeParseJson<Record<string, any>>(agentRow.configJson, {}) : {};
  const existingKnowledge = (existingCfg.knowledge || {}) as Partial<FormAgentData['knowledge']>;

  const existingFaqs = Array.isArray(existingKnowledge.faqPairs) ? existingKnowledge.faqPairs : [];
  const mergedFaqs =
    existingFaqs.length > 0 ? existingFaqs : buildStarterFaqsFromProfile(profile);

  const customInstructions = String(existingKnowledge.systemPrompt || '').trim();
  const forbiddenPhrases: string[] = (() => {
    try {
      const arr = brandRaw?.forbiddenPhrases ? JSON.parse(brandRaw.forbiddenPhrases) : [];
      return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : [];
    } catch {
      return [];
    }
  })();

  const existingGuardrails = Array.isArray(existingKnowledge.guardrails)
    ? existingKnowledge.guardrails
    : [];
  const mergedGuardrails = Array.from(
    new Set([
      ...existingGuardrails,
      ...forbiddenPhrases.map((p) => `Never say phrase: "${p}"`),
    ]),
  ).filter(Boolean);

  const syncedAt = new Date().toISOString();
  const autoSyncSummary: BusinessChatbotAutoSyncSummary = {
    syncedAt,
    triggerSource: options?.triggerSource || 'auto_sync',
    servicesCount: profile.services.length,
    hoursConfigured: profile.hours.some((h) => h.open),
    hasLocation: Boolean(profile.address || profile.city),
    hasBrandBrain: Boolean(brandRaw),
    hasPhone: Boolean(profile.phone || profile.whatsappPhone),
    faqCount: mergedFaqs.length,
    unansweredPendingCount: pendingUnanswered.length,
    publicCardSlug: profile.slug,
  };

  const defaultBotName = `${profile.businessName} Assistant`;
  const defaultGreeting = `Hi! 👋 Welcome to **${profile.businessName}**. Ask me about our services, timings, pricing, or tap **Chat with Owner** anytime.`;

  // Preserve manual edits if the owner already customized bot name/greeting
  const isCustomName = Boolean(existingCfg.customBotName);
  const resolvedName =
    agentRow && isCustomName && agentRow.name ? agentRow.name : agentRow?.name || defaultBotName;
  const resolvedGreeting =
    agentRow && agentRow.welcomeGreeting && existingCfg.customGreeting
      ? agentRow.welcomeGreeting
      : agentRow?.welcomeGreeting && agentRow.welcomeGreeting !== DEFAULT_FORM_AGENT.welcomeGreeting
        ? agentRow.welcomeGreeting
        : defaultGreeting;

  const resolvedTone =
    (agentRow?.voiceTone as FormAgentData['voiceTone'] | undefined) ||
    mapBrandToneToAgentTone(brandRaw?.tone);
  const resolvedBrandColor = profile.accentColor || agentRow?.brandColor || '#059669';
  const resolvedAvatar = agentRow?.avatarUrl || profile.logoUrl || '';
  const allowOwnerHandoff = existingCfg.allowOwnerHandoff !== false;

  const nextKnowledge: FormAgentData['knowledge'] = {
    crawledUrls: existingKnowledge.crawledUrls || [],
    documents: existingKnowledge.documents || [],
    faqPairs: mergedFaqs,
    systemPrompt: customInstructions,
    guardrails: mergedGuardrails,
    serviceAreas: profile.serviceAreas,
    structuredFacts,
  };

  const nextConfigJson: Record<string, any> = {
    ...DEFAULT_FORM_AGENT,
    ...existingCfg,
    isPrimaryBusinessBot: true,
    allowOwnerHandoff,
    autoSyncSummary,
    name: resolvedName,
    roleTitle: agentRow?.roleTitle || 'Customer Assistant',
    avatarUrl: resolvedAvatar,
    brandColor: resolvedBrandColor,
    voiceTone: resolvedTone,
    welcomeGreeting: resolvedGreeting,
    knowledge: nextKnowledge,
    channels: {
      ...DEFAULT_FORM_AGENT.channels,
      ...(existingCfg.channels || {}),
      chatbot: {
        ...DEFAULT_FORM_AGENT.channels.chatbot,
        ...(existingCfg.channels?.chatbot || {}),
        primaryColor: resolvedBrandColor,
      },
    },
  };

  if (!agentRow) {
    const slug = await generateUniqueAgentSlug(profile.slug);
    agentRow = await db.formAgent.create({
      data: {
        tenantId,
        slug,
        name: resolvedName,
        roleTitle: 'Customer Assistant',
        avatarUrl: resolvedAvatar,
        statusText: 'Online',
        brandColor: resolvedBrandColor,
        voiceTone: resolvedTone,
        welcomeGreeting: resolvedGreeting,
        greetingSubtitle: 'AI Assistant • Live Owner Support',
        configJson: JSON.stringify({ ...nextConfigJson, slug }),
        status: 'active',
      },
    });
  } else {
    agentRow = await db.formAgent.update({
      where: { id: agentRow.id },
      data: {
        brandColor: resolvedBrandColor,
        ...(!agentRow.avatarUrl && resolvedAvatar ? { avatarUrl: resolvedAvatar } : {}),
        configJson: JSON.stringify({
          ...nextConfigJson,
          id: agentRow.id,
          slug: agentRow.slug,
        }),
      },
    });
  }

  // Upsert the single canonical auto-synced KB document for semantic/BM25 RAG
  const kbDocText = buildAutoKnowledgeDocumentText(
    profile,
    brandContext,
    mergedFaqs,
    customInstructions,
  );
  await upsertManagedKnowledgeDocument({
    tenantId,
    title: AUTO_KB_TITLE,
    text: kbDocText,
    sourceType: 'auto_business_profile',
  }).catch(() => {});

  const agentData: FormAgentData = {
    ...DEFAULT_FORM_AGENT,
    ...nextConfigJson,
    id: agentRow.id,
    tenantId,
    slug: agentRow.slug,
    name: agentRow.name,
    roleTitle: agentRow.roleTitle,
    avatarUrl: agentRow.avatarUrl || resolvedAvatar,
    statusText: agentRow.statusText || 'Online',
    brandColor: agentRow.brandColor || resolvedBrandColor,
    voiceTone: resolvedTone,
    welcomeGreeting: agentRow.welcomeGreeting || resolvedGreeting,
    greetingSubtitle: agentRow.greetingSubtitle || 'AI Assistant • Live Owner Support',
    knowledge: nextKnowledge,
    updatedAt: agentRow.updatedAt.toISOString(),
  };

  return { agent: agentData, profile, autoSyncSummary };
}

export async function getPrimaryBusinessChatbotMeta(
  tenantId: string,
): Promise<PublicBusinessChatbotMeta | null> {
  const { agent, profile, autoSyncSummary } = await ensureAndSyncBusinessChatbot(tenantId, {
    triggerSource: 'page_visit',
  }).catch(() => ({ agent: DEFAULT_FORM_AGENT, profile: null, autoSyncSummary: null }));
  if (!profile) return null;

  const cfg = agent as unknown as Record<string, any>;
  const quickQuestions: string[] = [];
  if (profile.services.length > 0) quickQuestions.push('Services & pricing');
  if (profile.hours.some((h) => h.open)) quickQuestions.push('Opening hours & location');
  if (profile.bookingEnabled) quickQuestions.push('Book an appointment');
  if (cfg.allowOwnerHandoff !== false) quickQuestions.push('Chat with business owner');

  return {
    agentId: agent.id,
    agentName: agent.name || `${profile.businessName} Assistant`,
    roleTitle: agent.roleTitle || 'Customer Assistant',
    avatarUrl: agent.avatarUrl || profile.logoUrl || null,
    accentColor: profile.accentColor || agent.brandColor || '#059669',
    welcomeGreeting: agent.welcomeGreeting,
    allowOwnerHandoff: cfg.allowOwnerHandoff !== false,
    quickQuestions,
    autoSyncedAt: autoSyncSummary?.syncedAt || null,
    autoSyncSummary,
  };
}

async function resolveBusinessPlanInfo(tenantId: string): Promise<{
  effectivePlan: string;
  workspaceId: string | null;
  monthlyQuota: number;
  usedThisMonth: number;
}> {
  const [entitlementRes, productWs, ws] = await Promise.all([
    getTenantBgosEntitlement(tenantId).catch(() => null),
    db.productWorkspace
      .findFirst({ where: { tenantId, product: 'bgos' }, select: { workspaceId: true } })
      .catch(() => null),
    db.workspace
      .findFirst({ where: { tenantId }, select: { id: true }, orderBy: { createdAt: 'asc' } })
      .catch(() => null),
  ]);

  const workspaceId = productWs?.workspaceId || ws?.id || null;
  const normalizedPlan = entitlementRes?.entitlement?.entitled
    ? normalizeBgosPlanCode(entitlementRes.entitlement.plan) || 'free'
    : 'free';

  const monthlyQuota = getBgosAiQuotaForPlan(normalizedPlan);

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const usedThisMonth = await db.publicChatMessage
    .count({
      where: {
        senderType: 'ai',
        createdAt: { gte: monthStart },
        session: { tenantId },
      },
    })
    .catch(() => 0);

  return {
    effectivePlan: normalizedPlan,
    workspaceId,
    monthlyQuota,
    usedThisMonth,
  };
}

function findMatchingFaq(faqs: FaqPair[], message: string): FaqPair | null {
  const lower = message.toLowerCase();
  const stop = new Set([
    'what', 'when', 'where', 'which', 'your', 'about', 'with', 'have', 'does', 'this', 'that', 'from',
  ]);
  for (const faq of faqs) {
    const q = (faq.question || '').toLowerCase();
    if (!q) continue;
    if (lower.includes(q)) return faq;
    const tokens = q.split(/\s+/).filter((t) => t.length > 2 && !stop.has(t));
    if (tokens.length === 0) continue;
    const hits = tokens.filter((t) => lower.includes(t)).length;
    if (hits / tokens.length >= 0.5) return faq;
  }
  return null;
}

function buildDeterministicBusinessAnswer(
  profile: BgosPublicBusinessProfile,
  faqs: FaqPair[],
  structuredFacts: BusinessStructuredFacts,
  message: string,
): { reply: string; matched: boolean; showBookingCta?: boolean } {
  const lower = message.toLowerCase();

  const factMatch = queryStructuredFacts(structuredFacts, message);
  if (factMatch?.matched && factMatch.answer) {
    return { reply: factMatch.answer, matched: true };
  }

  const matchedFaq = findMatchingFaq(faqs, message);
  if (matchedFaq) {
    return { reply: matchedFaq.answer, matched: true };
  }

  if (/\b(service|price|pricing|cost|rate|fee|package|menu|offer|charge)\b/i.test(lower)) {
    if (profile.services.length > 0) {
      const lines = profile.services.slice(0, 8).map((s) => {
        const priceStr =
          s.price !== null && s.price > 0
            ? formatCurrency(s.price, profile.currency, { compact: true })
            : 'Request quote';
        const durStr = s.duration ? ` • ${s.duration} min` : '';
        return `• **${s.name}** — ${priceStr}${durStr}`;
      });
      return {
        reply: `Here are our services at **${profile.businessName}**:\n\n${lines.join('\n')}\n\nWould you like to book a service or ask about something specific?`,
        matched: true,
        showBookingCta: profile.bookingEnabled,
      };
    }
    return {
      reply: `You can share what service you're looking for at **${profile.businessName}** and our team will reply with pricing and availability.`,
      matched: false,
    };
  }

  if (/\b(hour|open|close|timing|time|today|schedule|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i.test(lower)) {
    const openDays = profile.hours.filter((h) => h.open);
    if (openDays.length > 0) {
      const formatted = profile.hours
        .map((h) => `• **${h.day}**: ${h.open ? formatReadableHoursLine(h.openTime, h.closeTime) : 'Closed'}`)
        .join('\n');
      return {
        reply: `Here are the opening hours for **${profile.businessName}**:\n\n${formatted}`,
        matched: true,
      };
    }
  }

  if (/\b(where|address|location|direction|map|reach|area|city|cities)\b/i.test(lower)) {
    const parts: string[] = [];
    if (profile.address) parts.push(`We are located at **${profile.address}**.`);
    if (profile.serviceAreas.length > 0) {
      parts.push(`Service areas: ${profile.serviceAreas.join(', ')}.`);
    }
    if (parts.length > 0) {
      return { reply: parts.join('\n\n'), matched: true };
    }
  }

  if (/\b(phone|call|contact|whatsapp|email|number|reach you)\b/i.test(lower)) {
    const contacts: string[] = [];
    if (profile.phone) contacts.push(`📞 **Phone**: ${profile.phone}`);
    if (profile.whatsappPhone) contacts.push(`💬 **WhatsApp**: ${profile.whatsappPhone}`);
    if (profile.email) contacts.push(`✉️ **Email**: ${profile.email}`);
    if (contacts.length > 0) {
      return {
        reply: `You can reach **${profile.businessName}** directly:\n\n${contacts.join('\n')}`,
        matched: true,
      };
    }
  }

  if (/\b(review|rating|stars|feedback|trusted)\b/i.test(lower) && profile.rating > 0) {
    return {
      reply: `**${profile.businessName}** has a **${profile.rating.toFixed(1)}★** rating${profile.reviewCount > 0 ? ` from **${profile.reviewCount}** customer reviews` : ''}.`,
      matched: true,
    };
  }

  if (/\b(book|appointment|reserve|slot|visit|schedule)\b/i.test(lower)) {
    return {
      reply: profile.bookingEnabled
        ? `I can help you book an appointment with **${profile.businessName}**! Share your preferred date, time, name, and phone number — or tap **Book Appointment** below.`
        : `Tell me what you need help with plus your phone number, and the **${profile.businessName}** team will get back to you quickly.`,
      matched: true,
      showBookingCta: profile.bookingEnabled,
    };
  }

  return {
    reply: `Thanks for messaging **${profile.businessName}**! ${profile.services.length > 0 ? `I can help with our services, prices, timings, location, or connect you directly with the business owner.` : `Ask me about our timings, location, contact details, or tap **Chat with Owner** to speak directly with us.`}`,
    matched: false,
  };
}

/**
 * Process a visitor chat message on `/b/[slug]`.
 */
export async function answerBusinessChatbotMessage(params: {
  profile: BgosPublicBusinessProfile;
  message: string;
  history?: Array<{ sender?: string; role?: string; text?: string; content?: string }>;
  sessionId?: string | null;
  action?: string | null;
  visitor?: {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
  };
}): Promise<BusinessChatReplyResult> {
  const { profile, history = [], sessionId, action, visitor } = params;
  const rawMessage = (params.message || '').trim();
  const whatsappUrl = profile.whatsappDigits
    ? `https://wa.me/${profile.whatsappDigits}?text=${encodeURIComponent(`Hi ${profile.businessName}, I have a question from your business page.`)}`
    : null;

  // Ensure agent + plan context
  const [{ agent }, planInfo] = await Promise.all([
    ensureAndSyncBusinessChatbot(profile.tenantId, { triggerSource: 'chat_turn' }),
    resolveBusinessPlanInfo(profile.tenantId),
  ]);

  const allowOwnerHandoff = (agent as any).allowOwnerHandoff !== false;

  // 1. If visitor already has an active escalated session with owner control (`aiPaused: true`),
  //    route the visitor's message straight to BGOS Mobile Inbox instead of generating an AI reply.
  if (sessionId && action !== 'resume_ai') {
    const existingConv = await db.conversation
      .findFirst({
        where: { conversationId: `live_chat_${sessionId}` },
        select: { aiPaused: true },
      })
      .catch(() => null);

    if (existingConv?.aiPaused && rawMessage) {
      const visitorMsg = await db.publicChatMessage.create({
        data: {
          sessionId,
          senderType: 'visitor',
          senderName: visitor?.name || 'Visitor',
          body: rawMessage,
        },
      });
      await db.publicChatSession
        .update({
          where: { id: sessionId },
          data: { lastMessageAt: new Date(), unreadCount: { increment: 1 } },
        })
        .catch(() => {});

      await mirrorLiveChatMessageToInbox(
        visitorMsg.id,
        sessionId,
        profile.tenantId,
        'visitor',
        rawMessage,
        null,
        visitor?.name || null,
      ).catch(() => {});

      return {
        reply: '',
        sessionId,
        agentName: profile.businessName,
        suggestedQuestions: ['Resume AI Assistant'],
        escalatedToHuman: true,
        liveMode: true,
        aiPaused: true,
      };
    }
  }

  const normalizedHistory: ChatHistoryMessage[] = history.map((h) => ({
    role: h.role === 'user' || h.role === 'assistant' || h.role === 'system' ? h.role : undefined,
    sender:
      h.sender === 'user' || h.sender === 'bot' || h.sender === 'system' || h.sender === 'agent'
        ? h.sender
        : undefined,
    content: h.content,
    text: h.text,
  }));

  // 2. Owner live-chat escalation (`action: 'request_human'` or escalation keyword intent)
  if (action === 'request_human' || isEscalationIntent(rawMessage)) {
    if (!allowOwnerHandoff) {
      return {
        reply: `You can reach **${profile.businessName}** directly${profile.phone ? ` by calling **${profile.phone}**` : ''}${whatsappUrl ? ' or messaging on WhatsApp below' : ''}.`,
        sessionId: sessionId || null,
        agentName: agent.name,
        suggestedQuestions: ['Services & pricing', 'Opening hours & location'],
        actionCard: {
          type: 'owner_contact_cta',
          whatsappUrl,
          phone: profile.phone,
        },
      };
    }

    // Free plan (non-trial): capture contact/alert cleanly AND offer instant WhatsApp/Phone bridge
    if (planInfo.effectivePlan === 'free') {
      const handoff = await requestHumanHandoff({
        tenantId: profile.tenantId,
        workspaceId: planInfo.workspaceId,
        agentId: agent.id,
        agentName: profile.businessName,
        visitor: visitor || {},
        existingSessionId: sessionId || null,
        message: rawMessage || 'Visitor wants to chat with business owner',
        history: normalizedHistory,
        customReason: 'Visitor requested owner from public business page',
      });

      return {
        reply: `I've alerted **${profile.businessName}** with your inquiry! For the fastest response, you can also message us on WhatsApp or call directly below.`,
        sessionId: handoff.liveSessionId,
        agentName: profile.businessName,
        suggestedQuestions: ['Services & pricing', 'Opening hours & location'],
        escalatedToHuman: true,
        agentAvailable: handoff.agentAvailable,
        actionCard: {
          type: 'owner_contact_cta',
          whatsappUrl,
          phone: profile.phone,
        },
      };
    }

    const handoff = await requestHumanHandoff({
      tenantId: profile.tenantId,
      workspaceId: planInfo.workspaceId,
      agentId: agent.id,
      agentName: profile.businessName,
      visitor: visitor || {},
      existingSessionId: sessionId || null,
      message: rawMessage || 'Visitor requested live chat with owner',
      history: normalizedHistory,
    });

    return {
      reply: handoff.reply,
      sessionId: handoff.liveSessionId,
      agentName: profile.businessName,
      suggestedQuestions: ['Book an appointment', 'Resume AI Assistant'],
      escalatedToHuman: true,
      liveMode: true,
      agentAvailable: handoff.agentAvailable,
      actionCard: whatsappUrl
        ? {
            type: 'owner_contact_cta',
            whatsappUrl,
            phone: profile.phone,
          }
        : null,
    };
  }

  // 3. Rate limit + input guardrails
  const rateCheck = checkTenantRateLimit(profile.tenantId);
  if (!rateCheck.allowed) {
    return {
      reply: 'We are receiving many messages right now. Please wait a few seconds or reach us via phone/WhatsApp.',
      sessionId: sessionId || null,
      agentName: agent.name,
      suggestedQuestions: ['Chat with business owner'],
      actionCard: { type: 'owner_contact_cta', whatsappUrl, phone: profile.phone },
    };
  }

  const guardrails = Array.isArray(agent.knowledge?.guardrails)
    ? agent.knowledge.guardrails
    : [];
  const guardrailConfig: GuardrailConfig = {
    blockedTopics: guardrails,
    strictKnowledgeOnly: false,
    piiRedaction: false,
    zeroDataRetention: false,
  };
  const guardCheck = inputGuardrail(rawMessage, guardrailConfig);
  if (!guardCheck.passed) {
    return {
      reply: `I can help with questions about **${profile.businessName}**, our services, pricing, timings, and bookings.`,
      sessionId: sessionId || null,
      agentName: agent.name,
      suggestedQuestions: ['Services & pricing', 'Opening hours & location'],
    };
  }
  const safeMessage = guardCheck.filteredMessage || rawMessage;

  // 4. Quota check (Free tier 50/month -> graceful Owner / WhatsApp fallback)
  if (planInfo.usedThisMonth >= planInfo.monthlyQuota) {
    return {
      reply: `Our automated assistant has reached this month's message limit, but you can still reach **${profile.businessName}** directly${profile.bookingEnabled ? ', book an appointment,' : ''} or message on WhatsApp right away.`,
      sessionId: sessionId || null,
      agentName: agent.name,
      suggestedQuestions: ['Chat with business owner'],
      quotaLimited: true,
      actionCard: {
        type: 'owner_contact_cta',
        whatsappUrl,
        phone: profile.phone,
        bookingUrl: profile.canonicalUrl,
      },
    };
  }

  // 5. Retrieve RAG snippets + Brand Context + Structured Facts
  const structuredFacts =
    (agent.knowledge?.structuredFacts as BusinessStructuredFacts | undefined) ||
    buildStructuredFactsFromProfile(profile);
  const faqs = agent.knowledge?.faqPairs || [];

  const [brandContext, hybridResult] = await Promise.all([
    getBrandContext(profile.tenantId).catch(() => ''),
    searchKnowledgeBaseHybrid(
      profile.tenantId,
      rewriteQuery(safeMessage, {
        businessName: profile.businessName,
        serviceAreas: profile.serviceAreas,
      }),
      { k: 4, strictMode: true },
    ).catch(() => null),
  ]);

  // 6. Attempt natural-language booking execution if visitor provided date/time/contact
  const bookingAttempt = await tryExecuteChatBooking({
    tenantId: profile.tenantId,
    workspaceId: planInfo.workspaceId,
    agentId: agent.id,
    serviceName: profile.services[0]?.name || `${profile.businessName} Consultation`,
    message: safeMessage,
    history,
  }).catch(() => null);

  let replyText = '';
  let actionCard: BusinessChatReplyResult['actionCard'] = null;
  let citations: Array<{ id: number; title: string; snippet: string }> = [];
  let suggestedQuestions: string[] = [];

  if (bookingAttempt?.success) {
    replyText = `🎉 Your booking request for **${bookingAttempt.dateStr} at ${bookingAttempt.timeStr}** has been confirmed with **${profile.businessName}**!`;
    actionCard = {
      type: 'booking_confirmation',
      date: bookingAttempt.dateStr,
      time: bookingAttempt.timeStr,
      service: profile.services[0]?.name || 'Appointment',
    };
  } else {
    // 7. Call LLM grounded strictly in business data + mobile training rules
    const ragSnippets = hybridResult?.snippets || [];
    const ragContext =
      ragSnippets.length > 0
        ? ragSnippets
            .map((s: any, idx: number) => `[Source ${idx + 1}: ${s.documentTitle}]\n${s.content}`)
            .join('\n\n')
        : '';
    citations = (hybridResult?.citations || []).map((c: any) => ({
      id: c.id,
      title: c.title,
      snippet: c.snippet,
    }));

    const hoursLines = profile.hours
      .map((h) => `${h.day}: ${h.open ? formatReadableHoursLine(h.openTime, h.closeTime) : 'Closed'}`)
      .join('; ');
    const servicesLines =
      profile.services.length > 0
        ? profile.services
            .slice(0, 15)
            .map((s) => {
              const price =
                s.price !== null && s.price > 0
                  ? formatCurrency(s.price, profile.currency, { compact: true })
                  : 'Quote on request';
              return `- ${s.name}: ${price}${s.duration ? ` (${s.duration} min)` : ''}${s.description ? ` — ${s.description}` : ''}`;
            })
            .join('\n')
        : 'No structured services listed yet.';

    const faqLines =
      faqs.length > 0
        ? faqs.slice(0, 20).map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')
        : '';

    const systemPrompt = [
      `You are ${agent.name}, the official AI customer assistant for "${profile.businessName}" (${profile.category}).`,
      `Voice tone: ${agent.voiceTone || 'friendly'}. Be concise, warm, helpful, and accurate.`,
      `CRITICAL RULES:`,
      `- ONLY answer using facts provided below. Never invent prices, hours, addresses, or services not listed here.`,
      `- Never mention Fieseros, marketplace, or third-party SaaS platforms; speak strictly as ${profile.businessName}'s assistant.`,
      `- If the answer is unknown, honestly say so and invite the visitor to tap "Chat with Owner"${profile.phone ? ` or call ${profile.phone}` : ''}.`,
      `- At the end of your reply, optionally include <<<SUGGESTIONS: ["Short follow-up 1", "Short follow-up 2"]>>>.`,
      agent.knowledge?.systemPrompt ? `OWNER TRAINING INSTRUCTIONS:\n${agent.knowledge.systemPrompt}` : '',
      agent.knowledge?.guardrails?.length
        ? `GUARDRAILS:\n${agent.knowledge.guardrails.join('\n')}`
        : '',
      brandContext ? `BRAND CONTEXT:\n${brandContext}` : '',
      `BUSINESS DETAILS:\nName: ${profile.businessName}\nCategory: ${profile.category}\nPhone: ${profile.phone || 'Not listed'}\nWhatsApp: ${profile.whatsappPhone || 'Not listed'}\nEmail: ${profile.email || 'Not listed'}\nAddress: ${profile.address || 'Not listed'}\nHours: ${hoursLines}\nRating: ${profile.rating > 0 ? `${profile.rating.toFixed(1)}/5 (${profile.reviewCount} reviews)` : 'Not yet rated'}`,
      `SERVICES:\n${servicesLines}`,
      faqLines ? `TRAINED FAQS:\n${faqLines}` : '',
      ragContext ? `KNOWLEDGE BASE EXCERPTS:\n${ragContext}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    try {
      const llmRes = await callAI({
        messages: [
          { role: 'system', content: systemPrompt },
          ...history.slice(-6).map((h) => ({
            role:
              h.sender === 'user' || h.role === 'user'
                ? ('user' as const)
                : ('assistant' as const),
            content: String(h.text || h.content || '').slice(0, 1200),
          })),
          { role: 'user', content: safeMessage },
        ],
        temperature: 0.3,
        maxTokens: 600,
        usageContext: { tenantId: profile.tenantId, feature: 'bgos_business_chatbot' },
      });
      replyText = (llmRes?.content || '').trim();
    } catch {
      replyText = '';
    }

    if (replyText) {
      const match = replyText.match(/<<<SUGGESTIONS:\s*(\[[\s\S]*?\])\s*>>>/);
      if (match) {
        try {
          const arr = JSON.parse(match[1]);
          if (Array.isArray(arr)) {
            suggestedQuestions = arr
              .filter((q): q is string => typeof q === 'string' && q.trim().length > 0)
              .map((q) => q.trim())
              .slice(0, 3);
          }
        } catch {
          /* ignore */
        }
        replyText = replyText.replace(/<<<SUGGESTIONS:[\s\S]*?>>>/, '').trim();
      }
    }

    // Deterministic grounded fallback when LLM is unavailable or returns empty
    if (!replyText) {
      const det = buildDeterministicBusinessAnswer(profile, faqs, structuredFacts, safeMessage);
      replyText = det.reply;
      if (det.showBookingCta && profile.bookingEnabled) {
        actionCard = { type: 'booking_cta', bookingUrl: profile.canonicalUrl };
      }
      if (!det.matched && hybridResult?.shouldFallback && safeMessage.length > 12) {
        recordUnansweredQuestion(profile.tenantId, safeMessage, 'chat').catch(() => {});
      }
    } else if (
      hybridResult?.shouldFallback &&
      !findMatchingFaq(faqs, safeMessage) &&
      !queryStructuredFacts(structuredFacts, safeMessage)?.matched &&
      safeMessage.length > 15 &&
      !/^(hi|hello|hey|thanks|thank you|ok)$/i.test(safeMessage)
    ) {
      recordUnansweredQuestion(profile.tenantId, safeMessage, 'chat').catch(() => {});
    }

    if (!actionCard && profile.bookingEnabled && /\b(book|appointment|schedule|reserve)\b/i.test(safeMessage)) {
      actionCard = { type: 'booking_cta', bookingUrl: profile.canonicalUrl };
    }
  }

  // Output guardrail sanitization
  const outGuard = outputGuardrail(replyText, guardrailConfig);
  if (!outGuard.passed) {
    replyText = `I can help with services, hours, pricing, and bookings for **${profile.businessName}**. Would you like to speak with the business owner directly?`;
  } else if (outGuard.filteredMessage) {
    replyText = outGuard.filteredMessage;
  }

  // Default contextual suggestions if none generated
  if (suggestedQuestions.length === 0) {
    const defaults: string[] = [];
    if (profile.services.length > 0) defaults.push('Services & pricing');
    if (profile.hours.some((h) => h.open)) defaults.push('Opening hours');
    if (profile.bookingEnabled) defaults.push('Book an appointment');
    if (allowOwnerHandoff) defaults.push('Chat with business owner');
    suggestedQuestions = defaults.slice(0, 3);
  }

  // Persist conversation turn to PublicChatSession & PublicChatMessage
  const syncRes = await syncChatConversation({
    sessionId: sessionId || null,
    tenantId: profile.tenantId,
    workspaceId: planInfo.workspaceId,
    agentId: agent.id,
    visitorName: visitor?.name || null,
    visitorEmail: visitor?.email || null,
    visitorPhone: visitor?.phone || null,
    userMessage: rawMessage,
    aiReply: replyText,
    agentName: agent.name,
  }).catch(() => ({ sessionId: sessionId || null, isNewSession: false }));

  return {
    reply: replyText,
    sessionId: syncRes.sessionId,
    agentName: agent.name,
    suggestedQuestions,
    citations: citations.length > 0 ? citations : undefined,
    actionCard,
  };
}

import { NextRequest, NextResponse } from 'next/server';
import { callAI } from '@/lib/ai-client';
import { searchKnowledgeBaseHybrid } from '@/lib/ai-knowledge';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { DEFAULT_FORM_AGENT, FormAgentData } from '@/features/forms/types/agent-types';
import { isEscalationIntent, requestHumanHandoff } from '@/lib/chat/handoff-service';
import { tryExecuteChatBooking, extractBookingIntent } from '@/lib/scheduling/chat-booking-helper';
import { syncChatConversation } from '@/lib/chat/chat-session-sync';
import { queryStructuredFacts } from '@/lib/ai-structured-facts';
import { inputGuardrail, outputGuardrail, checkTenantRateLimit, type GuardrailConfig } from '@/lib/agent-guardrails';
import { extractConversationFields, getSessionContext, updateSessionMemory } from '@/lib/agent-memory';
import { classifyIntent } from '@/lib/agent/intent-router';
import { rewriteQuery } from '@/lib/agent/query-rewriter';

/**
 * Parse FormAgent.configJson back into a partial config.
 */
function parseConfigJson(raw: unknown): Partial<FormAgentData> {
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Partial<FormAgentData>;
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

/**
 * Load the full FormAgent config from DB.
 */
async function loadAgentFromDb(id: string, fallback: FormAgentData | undefined): Promise<FormAgentData> {
  if (!id || id === 'preview') {
    return fallback || DEFAULT_FORM_AGENT;
  }
  try {
    const agent = await db.formAgent.findFirst({
      where: { OR: [{ id }, { slug: id }] },
    });
    if (!agent) {
      return fallback || DEFAULT_FORM_AGENT;
    }
    const config = parseConfigJson(agent.configJson);
    const merged: FormAgentData = {
      ...DEFAULT_FORM_AGENT,
      ...config,
      id: agent.id,
      tenantId: agent.tenantId || undefined,
      slug: agent.slug || undefined,
      name: agent.name || config.name || DEFAULT_FORM_AGENT.name,
      roleTitle: agent.roleTitle || config.roleTitle || DEFAULT_FORM_AGENT.roleTitle,
    };
    return merged;
  } catch (err) {
    console.warn('[forms/agent-chat] DB agent load failed, falling back to client config:', err);
    return fallback || DEFAULT_FORM_AGENT;
  }
}

/**
 * Contextual suggestion chips generator (Text.com parity)
 * Anticipates the visitor's logical next questions.
 */
function generateContextualSuggestions(message: string, replyText: string, agent: FormAgentData): string[] {
  const lower = (message || '').toLowerCase();
  if (lower.includes('service') || lower.includes('what do you') || lower.includes('offer') || lower.includes('what can you do')) {
    return [
      'What areas do you serve?',
      'Can I get an instant estimate?',
      'Do you offer same-day service?',
    ];
  }
  if (
    lower.includes('area') ||
    lower.includes('location') ||
    lower.includes('city') ||
    lower.includes('cities') ||
    lower.includes('serve') ||
    lower.includes('where')
  ) {
    return [
      'What services do you offer?',
      'Can I get an instant estimate?',
      'Book a service visit',
    ];
  }
  if (
    lower.includes('price') ||
    lower.includes('rate') ||
    lower.includes('cost') ||
    lower.includes('quote') ||
    lower.includes('fee') ||
    lower.includes('estimate')
  ) {
    return [
      'Do you offer free estimates?',
      'Book an appointment',
      'What areas do you serve?',
    ];
  }
  if (
    lower.includes('book') ||
    lower.includes('appointment') ||
    lower.includes('schedule') ||
    lower.includes('tomorrow') ||
    lower.includes('today')
  ) {
    return [
      'What are your service hours?',
      'Do you offer emergency service?',
      'What services do you provide?',
    ];
  }
  if (
    lower.includes('water heater') ||
    lower.includes('drain') ||
    lower.includes('leak') ||
    lower.includes('pipe') ||
    lower.includes('plumb') ||
    lower.includes('roof') ||
    lower.includes('hvac')
  ) {
    return [
      'Can I get an instant estimate?',
      'Book a technician visit',
      'Do you offer warranties on labor?',
    ];
  }
  return [
    'What services do you offer?',
    'Which areas do you serve?',
    'Get an instant estimate',
  ];
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { message = '', history = [], agentConfig } = body;

    const agent: FormAgentData = await loadAgentFromDb(id, agentConfig);
    const lowerMessage = (message || '').toLowerCase().trim();

    // ── Phase A: Input Guardrail — block prompt injection BEFORE LLM call ──
    const guardrailConfig: GuardrailConfig = {
      blockedTopics: agent.knowledge?.guardrails || [],
      strictKnowledgeOnly: false,
      piiRedaction: false,
      zeroDataRetention: false,
    };
    const inputCheck = inputGuardrail(message, guardrailConfig);
    if (!inputCheck.passed) {
      return NextResponse.json({
        success: true,
        reply: "I'm sorry, I can't help with that. Could you ask me about our services instead?",
        sessionId: body.sessionId || null,
      });
    }
    const safeMessage = inputCheck.filteredMessage || message;

    // ── Phase A: Per-tenant rate limiting ──
    if (agent.tenantId) {
      const rateCheck = checkTenantRateLimit(agent.tenantId);
      if (!rateCheck.allowed) {
        return NextResponse.json({
          success: true,
          reply: "I'm receiving a lot of messages right now. Please try again in a moment.",
          sessionId: body.sessionId || null,
        });
      }
    }

    // ── Phase A: Load session memory (customer context from prior turns) ──
    let sessionContext = '';
    if (body.sessionId) {
      sessionContext = await getSessionContext(body.sessionId);
    }

    // 1. Query Knowledge Base with Query Expansion (Hybrid RAG + Confidence Gate)
    let retrievedKnowledge = '';
    let hybridResult: any = null;
    let citations: Array<{ id: number; title: string; url?: string; snippet: string }> = [];
    const kbScope = agent.tenantId || (id !== 'preview' ? id : undefined);

    if (kbScope && safeMessage) {
      try {
        const searchQuery = rewriteQuery(safeMessage, {
          businessName: agent.name,
          serviceAreas: agent.knowledge?.serviceAreas,
        });
        hybridResult = await searchKnowledgeBaseHybrid(kbScope, searchQuery, { k: 4, strictMode: true });
        citations = hybridResult.citations || [];

        if (hybridResult.snippets && hybridResult.snippets.length > 0) {
          retrievedKnowledge = `Indexed Knowledge Base Documents:\n${hybridResult.snippets.map((doc: any, idx: number) => `[Source ${idx + 1}: ${doc.documentTitle}]\n${doc.content || doc.snippet || ''}`).join('\n\n')}`;
        } else if (message.length > 15 && !['hi', 'hello', 'hey', 'start'].includes(lowerMessage)) {
          try {
            const { recordUnansweredQuestion } = await import('@/lib/ai-unanswered-questions');
            recordUnansweredQuestion(kbScope, message, 'forms_chat');
          } catch {
            /* ignore */
          }
        }
      } catch (err) {
        console.warn('[forms/agent-chat] KB search warning:', err);
      }
    }

    // 2. Load connected form schema if present
    let formFieldsPrompt = '';
    let extractedServices: string[] = [];
    let businessProfilePrompt = '';
    const primaryConnectedForm = agent.connectedForms?.[0];
    let formRecord: any = null;
    let fields: any[] = [];

    if (primaryConnectedForm?.id) {
      try {
        formRecord = await db.form.findFirst({
          where: { OR: [{ id: primaryConnectedForm.id }, { slug: primaryConnectedForm.id }] },
          select: { id: true, name: true, description: true, fieldsJson: true, tenantId: true, workspaceId: true },
        });

        if (formRecord) {
          let schemaObj: any = null;
          if (formRecord.fieldsJson) {
            try {
              const parsed = typeof formRecord.fieldsJson === 'string' ? JSON.parse(formRecord.fieldsJson) : formRecord.fieldsJson;
              if (Array.isArray(parsed)) {
                const meta = parsed.find((f: any) => f && f.id === '__form_schema__');
                if (meta?.schema) schemaObj = meta.schema;
                fields = parsed.filter((f: any) => f && f.id !== '__form_schema__');
              }
            } catch {}
          }

          for (const f of fields) {
            const fieldId = (f?.id || '').toLowerCase();
            const fieldLabel = (f?.label || '').toLowerCase();
            const isServiceField =
              fieldId.includes('service') ||
              fieldId.includes('job') ||
              fieldId.includes('repair') ||
              fieldLabel.includes('service') ||
              fieldLabel.includes('work required') ||
              fieldLabel.includes('trade');
            const isNonServiceField =
              fieldId.includes('urgency') ||
              fieldId.includes('priority') ||
              fieldId.includes('status') ||
              fieldLabel.includes('urgency') ||
              fieldLabel.includes('priority') ||
              fieldLabel.includes('time window');

            if (isServiceField && !isNonServiceField && f?.options && Array.isArray(f.options)) {
              for (const opt of f.options) {
                const label = typeof opt === 'string' ? opt : opt?.label || opt?.value;
                if (label && typeof label === 'string' && label.length < 60) {
                  if (!label.startsWith('🚨') && !label.startsWith('📅') && !label.startsWith('💬')) {
                    extractedServices.push(label.trim());
                  }
                }
              }
            }
          }

          if (fields.length > 0) {
            const fieldSummaries = fields
              .slice(0, 10)
              .map((f: any) => `- "${f.label || f.id}" (${f.required ? 'required' : 'optional'})`)
              .join('\n');
            formFieldsPrompt = `Connected Form: "${formRecord.name}" (${formRecord.description || 'Customer inquiry'})\nFields to Collect Conversationally (Only in Action Mode):\n${fieldSummaries}\n\nCONVERSATIONAL FORM FILLING INSTRUCTIONS:\nWhen a visitor expresses explicit interest in booking, getting a quote, or requesting service, guide them conversationally through these questions 1 or 2 at a time. Validate inputs gently.`;
          }
        }
      } catch (err) {
        console.warn('[forms/agent-chat] Form context load warning:', err);
      }
    }

    // 3. Resolve Tenant & Verified Facts
    const tenantId = formRecord?.tenantId || agent.tenantId;
    let tenantRecord: any = null;
    if (tenantId) {
      tenantRecord = await db.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true, industry: true, phone: true, email: true, address: true, website: true },
      }).catch(() => null);
    }

    let structuredFacts = agent.knowledge?.structuredFacts;
    if (!structuredFacts && tenantId) {
      try {
        const factsDoc = await db.aiKnowledgeDocument.findFirst({
          where: { tenantId, title: { contains: 'Verified Facts' } },
          select: { content: true },
        });
        if (factsDoc?.content) {
          try {
            structuredFacts = JSON.parse(factsDoc.content);
          } catch {}
        }
      } catch (err) {
        console.warn('[forms/agent-chat] Verified facts doc load warning:', err);
      }
    }

    const websiteUrl =
      structuredFacts?.sourceUrl ||
      agent.knowledge?.websiteUrl ||
      agent.knowledge?.crawledUrls?.[0] ||
      tenantRecord?.website ||
      null;

    let serviceAreasList = agent.knowledge?.serviceAreas?.length
      ? agent.knowledge.serviceAreas.join(', ')
      : structuredFacts?.serviceAreas?.length
      ? structuredFacts.serviceAreas.join(', ')
      : '';

    if (!serviceAreasList && fields.length > 0) {
      const addressField = fields.find((f: any) => f?.id?.includes('address') || f?.type === 'address');
      if (addressField?.placeholder && addressField.placeholder.includes(',')) {
        const cleaned = addressField.placeholder.replace(/^Street address in /i, '').replace(/\.\.\.$/, '').trim();
        if (cleaned) serviceAreasList = cleaned;
      }
    }

    const bName = structuredFacts?.businessName || tenantRecord?.name || agent.name;
    const bPhone = structuredFacts?.phone || tenantRecord?.phone || '';
    const bEmail = structuredFacts?.email || tenantRecord?.email || '';
    const bAddress = structuredFacts?.address || tenantRecord?.address || '';
    const bWebsite = websiteUrl || '';

    // Extract verified official website pages for contextual hyperlinks (Text.com parity)
    const verifiedPages: Array<{ title: string; url: string }> = [];
    const seenPageUrls = new Set<string>();

    const registerPage = (rawUrl: string, rawTitle?: string) => {
      if (!rawUrl || typeof rawUrl !== 'string') return;
      const trimmed = rawUrl.trim();
      if (!trimmed.startsWith('http')) return;
      const clean = trimmed.replace(/\/+$/, '');
      if (seenPageUrls.has(clean.toLowerCase())) return;
      seenPageUrls.add(clean.toLowerCase());

      let title = rawTitle?.trim();
      if (!title || title.startsWith('http')) {
        try {
          const u = new URL(trimmed);
          const segments = u.pathname.split('/').filter(Boolean);
          if (segments.length === 0) {
            title = 'Official Website';
          } else {
            const last = segments[segments.length - 1];
            title = last
              .replace(/[-_]+/g, ' ')
              .replace(/\.(html|php|aspx|htm)$/i, '')
              .split(' ')
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
              .join(' ');
          }
        } catch {
          title = 'Website Page';
        }
      } else {
        title = title
          .replace(/\s*\|\s*.*$/i, '')
          .replace(/\s*—\s*.*$/i, '')
          .replace(/&amp;/g, '&')
          .trim();
      }
      verifiedPages.push({ title, url: trimmed });
    };

    if (Array.isArray(agent.knowledge?.crawledUrls)) {
      for (const u of agent.knowledge.crawledUrls) registerPage(u);
    }
    if (Array.isArray(agent.knowledge?.documents)) {
      for (const d of agent.knowledge.documents) {
        if (d.type === 'url' || d.name?.startsWith('http')) registerPage(d.name);
      }
    }
    if (websiteUrl) {
      registerPage(websiteUrl, 'Official Website');
    }

    if (kbScope) {
      try {
        const dbDocs = await db.aiKnowledgeDocument.findMany({
          where: { tenantId: kbScope },
          select: { title: true, content: true },
          take: 12,
        });
        for (const doc of dbDocs) {
          const match = doc.content?.match(/^Source URL:\s*([^\s\n]+)/m);
          if (match) {
            registerPage(match[1], doc.title);
          }
        }
      } catch (err) {
        console.warn('[forms/agent-chat] Failed to fetch dbDocs for verified pages:', err);
      }
    }

    const verifiedPagesPrompt = verifiedPages.length > 0
      ? `VERIFIED OFFICIAL WEBSITE PAGES (Hyperlink these naturally using markdown where relevant):
${verifiedPages.slice(0, 10).map((p) => `- [${p.title}](${p.url})`).join('\n')}
HYPERLINK RULE: When mentioning specific services, service areas, or contact information, naturally include relevant markdown links from above (e.g., "visit our [Service Areas](${verifiedPages[0].url}) page"). NEVER invent fake or non-existent URLs!`
      : '';

    const enterpriseGuidelinesPrompt = `STYLE & ENTERPRISE QUALITY GUIDELINES (Text.com / LiveChat Standard):
1. TONE & EXPERTISE:
   - Provide warm, authoritative, highly professional responses. You represent ${agent.name} with complete competence and care.
   - Ground every statement strictly in the business profile and verified facts. Do not invent unlisted flat prices or fake warranties.
2. STRUCTURE & SCANNABILITY:
   - Use bold titles, concise bullet points for multiple items, and clean spacing.
   - Format telephone numbers cleanly (e.g. ${bPhone || '(555) 123-4567'}).
   - Mention key trust badges when relevant (licensed & bonded CCB, warranties, guarantees, same-day service, 24/7 emergency dispatch).
   - Keep answers clear and focused (typically 2-3 concise paragraphs or bulleted list).
3. DYNAMIC NEXT-STEP QUESTIONS (MANDATORY):
   - At the VERY END of every response, you MUST output 2 to 3 logical, concise follow-up questions that anticipate what the customer would ask next.
   - Format: <<<SUGGESTIONS: ["Question 1?", "Question 2?", "Question 3?"]>>>
   - These suggestions must be short (under 8 words each) and actionable.`;

    businessProfilePrompt = [
      `BUSINESS PROFILE:`,
      `- Business Name: ${bName}`,
      `- Industry / Trade: ${tenantRecord?.industry || 'Professional Services'}`,
      bPhone ? `- Phone: ${bPhone}` : '',
      bEmail ? `- Email: ${bEmail}` : '',
      bAddress ? `- Address: ${bAddress}` : '',
      bWebsite ? `- Official Website: ${bWebsite}` : '',
      `- Online scheduling available 24/7`,
    ].filter(Boolean).join('\n');

    // Fetch synced E-commerce products (Shopify / Store catalog / WhatsApp Commerce)
    let productCatalogPrompt = '';
    const storeTenantId = tenantId || agent.tenantId;
    if (storeTenantId) {
      try {
        const [products, commerceConfig] = await Promise.all([
          db.ecommerceProduct.findMany({
            where: { tenantId: storeTenantId, status: 'active' },
            select: {
              title: true,
              description: true,
              price: true,
              currency: true,
              inventoryQuantity: true,
              productType: true,
            },
            take: 20,
          }),
          db.gptformCommerceConfig.findFirst({
            where: {
              OR: [
                { businessId: storeTenantId },
                { agentId: agent.id },
              ],
            },
          }),
        ]);

        const catalogItems: string[] = [];
        if (products.length > 0) {
          products.forEach((p) => {
            catalogItems.push(
              `- ${p.title} (${p.currency || 'USD'} $${p.price.toFixed(2)}${p.inventoryQuantity > 0 ? `, in stock: ${p.inventoryQuantity}` : ', out of stock'})${p.description ? `: ${p.description.slice(0, 100)}` : ''}`
            );
          });
        }

        if (commerceConfig?.catalogJson) {
          try {
            const parsedCatalog = JSON.parse(commerceConfig.catalogJson);
            const cSymbol = commerceConfig.currencySymbol || '₹';
            parsedCatalog.forEach((it: any) => {
              catalogItems.push(
                `- ${it.name} (${cSymbol}${it.price}) [${it.category || 'General'}]${it.description ? `: ${it.description}` : ''}`
              );
            });
          } catch {}
        }

        let liveOrderInfo = '';
        const orderNumMatch = safeMessage.match(/(?:order\s*#?|#)\s*([a-zA-Z0-9]{4,10})/i);
        const phoneMatch = safeMessage.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
        if (orderNumMatch || phoneMatch || lowerMessage.includes('where is my order') || lowerMessage.includes('track my order')) {
          const queryConditions: any[] = [];
          if (orderNumMatch) {
            const term = orderNumMatch[1];
            queryConditions.push({ id: { endsWith: term.toLowerCase() } });
          }
          if (phoneMatch) {
            const cleanPhone = phoneMatch[0].replace(/\D/g, '');
            queryConditions.push({ customerPhone: { contains: cleanPhone } });
          }

          if (queryConditions.length > 0) {
            const matchedOrder = await db.gptformCommerceOrder.findFirst({
              where: {
                OR: queryConditions,
              },
              orderBy: { createdAt: 'desc' },
            });

            if (matchedOrder) {
              const items = JSON.parse(matchedOrder.itemsJson || '[]');
              liveOrderInfo = `\nREAL-TIME ORDER STATUS (Tidio Tracking Parity):
- Order ID: #${matchedOrder.id.slice(-6).toUpperCase()}
- Status: ${matchedOrder.status}
- Customer: ${matchedOrder.customerName || 'Valued Customer'}
- Items: ${items.map((i: any) => `${i.name} × ${i.qty}`).join(', ')}
- Total: ${commerceConfig?.currencySymbol || '₹'}${matchedOrder.total}
- Delivery Address / Table: ${matchedOrder.deliveryAddress || 'N/A'}
- Payment: ${matchedOrder.paymentStatus}
Instructions: Tell the customer their exact order status and details warmly!`;
            }
          }
        }

        if (catalogItems.length > 0 || liveOrderInfo) {
          productCatalogPrompt = `STORE PRODUCTS & ORDER TRACKING (Tidio & Take.app Engine):\n${catalogItems.join('\n')}${liveOrderInfo}\nYou can answer questions about product availability, menu items, prices, and live order tracking.`;
        }
      } catch (err) {
        console.warn('[forms/agent-chat] Product catalog load warning:', err);
      }
    }

    // 4. Intent Classification: Answer Mode vs Action Mode
    const intentResult = classifyIntent(safeMessage);
    const isBookingOrIntake = intentResult.isBookingOrIntake;
    const isInformationalQuery = intentResult.isInformationalQuery;

    // Build context from agent knowledge base + session memory
    const knowledgeContext = [
      `Agent Identity: You are ${agent.name}, ${agent.roleTitle}.`,
      `Tone: ${agent.voiceTone}.`,
      businessProfilePrompt,
      productCatalogPrompt,
      serviceAreasList ? `VERIFIED SERVICE AREAS & CITIES SERVED:\n${serviceAreasList}` : '',
      verifiedPagesPrompt,
      sessionContext ? sessionContext : '',  // Phase A: inject conversation memory
      `System Prompt: ${agent.knowledge?.systemPrompt || ''}`,
      agent.knowledge?.guardrails?.length
        ? `Strict Guardrails:\n- ${agent.knowledge.guardrails.join('\n- ')}`
        : '',
      agent.knowledge?.faqPairs?.length
        ? `Known FAQs:\n${agent.knowledge.faqPairs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')}`
        : '',
      retrievedKnowledge,
      enterpriseGuidelinesPrompt,
      `CONFIDENCE & GROUNDING INSTRUCTIONS:
1. ANSWER MODE (For Informational Questions):
   - Answer the visitor's question directly, factually, and concisely using the Verified Service Areas, Knowledge Base, and FAQs above.
   - If asked about service areas/locations, list the verified cities and regions explicitly (${serviceAreasList || 'our service region'}).
   - If asked about services, list the official offerings directly.
   - NEVER deflect simple informational questions to a form. Answer the question first!
2. ACTION MODE (Only When Visitor Requests Booking/Quote):
   - Guide them conversationally to gather missing appointment/contact details.
3. ZERO HALLUCINATION:
   - If a specific piece of information (e.g. unsupported location or unlisted flat price) is not in our records, state honestly that you don't have that specific item and offer to have a specialist follow up.`,
      formFieldsPrompt,
    ]
      .filter(Boolean)
      .join('\n\n');

    // Check for human escalation intent
    if (isEscalationIntent(message)) {
      const authUser = await getAuthUser().catch(() => null);
      const effectiveTenantId = formRecord?.tenantId || agent.tenantId || authUser?.tenantId || null;
      const effectiveWorkspaceId = formRecord?.workspaceId || authUser?.workspaceId || null;

      const handoff = await requestHumanHandoff({
        tenantId: effectiveTenantId,
        workspaceId: effectiveWorkspaceId,
        agentId: agent.id && agent.id !== 'preview' ? agent.id : null,
        agentName: agent.name || 'AI Assistant',
        formId: primaryConnectedForm?.id || null,
        message,
        history,
      });

      return NextResponse.json({
        success: true,
        reply: handoff.reply,
        escalatedToHuman: true,
        agentAvailable: handoff.agentAvailable,
        availability: handoff.availability,
        sessionId: handoff.liveSessionId,
        suggestedFormId: null,
        agentName: agent.name,
      });
    }

    const authUser = await getAuthUser().catch(() => null);
    const effectiveTenantId = formRecord?.tenantId || agent.tenantId || authUser?.tenantId || null;
    const effectiveWorkspaceId = formRecord?.workspaceId || (agent as any).workspaceId || authUser?.workspaceId || null;

    let replyText = '';
    let suggestedFormId: string | null = null;
    let bookingCard: any = null;

    // ── Step 1: Run LLM to generate primary AI response
    try {
      const bookingIntent = extractBookingIntent(message, history, primaryConnectedForm?.name || agent.roleTitle);
      let dynamicMissingPrompt = '';
      if (bookingIntent.hasIntent && bookingIntent.missingFields.length > 0) {
        dynamicMissingPrompt = `\n\nINTAKE ACTION GUIDANCE:\nThe visitor is interested in scheduling an appointment or estimate. Missing required details: ${bookingIntent.missingFields.join(', ')}. Guide them conversationally to provide their preferred time window and callback phone number so our team can schedule them!`;
      }

      const messages = [
        {
          role: 'system' as const,
          content: `${knowledgeContext}${dynamicMissingPrompt}`,
        },
        ...history.slice(-6).map((h: any) => ({
          role: h.sender === 'user' ? ('user' as const) : ('assistant' as const),
          content: h.text,
        })),
        { role: 'user' as const, content: message },
      ];

      const aiRes = await callAI({
        messages,
        temperature: 0.3,
        preferredModel: agent.llm?.model || undefined,
      });

      replyText = aiRes.content || '';
    } catch (e) {
      console.warn('Chat AI call failed, using intelligent rule responder:', e);
    }

    let suggestedQuestions: string[] = [];
    if (replyText) {
      const suggestionsMatch = replyText.match(/<<<SUGGESTIONS:\s*(\[[\s\S]*?\])\s*>>>/);
      if (suggestionsMatch) {
        try {
          const parsed = JSON.parse(suggestionsMatch[1]);
          if (Array.isArray(parsed)) {
            suggestedQuestions = parsed
              .filter((q: any) => typeof q === 'string' && q.trim().length > 0)
              .map((q: any) => q.trim())
              .slice(0, 4);
          }
        } catch {}
        replyText = replyText.replace(/<<<SUGGESTIONS:[\s\S]*?>>>/, '').trim();
      }
    }

    // ── Step 2: Attempt appointment booking execution
    const bookingResult = await tryExecuteChatBooking({
      tenantId: effectiveTenantId,
      workspaceId: effectiveWorkspaceId,
      formId: primaryConnectedForm?.id || null,
      agentId: agent.id && agent.id !== 'preview' ? agent.id : null,
      serviceName: primaryConnectedForm?.name || agent.roleTitle || 'Consultation & Appointment',
      message,
      history,
      imageUrl: body.imageUrl || undefined,
    });

    if (bookingResult && bookingResult.success) {
      bookingCard = {
        type: 'booking_confirmation',
        leadId: bookingResult.lead?.id,
        bookingId: bookingResult.booking?.id,
        calendarUrls: bookingResult.calendarUrls,
        meetingUrl: bookingResult.meetingUrl,
        name: bookingResult.lead?.name || 'there',
        service: primaryConnectedForm?.name || 'Appointment',
        date: bookingResult.dateStr,
        time: bookingResult.timeStr,
      };

      const meetInfo = bookingResult.meetingUrl
        ? `\n\n🎥 **Video Meeting Link:** [Join Google Meet](${bookingResult.meetingUrl})`
        : '';

      const confirmationLine = `🎉 Your appointment has been confirmed for **${bookingResult.dateStr} at ${bookingResult.timeStr}**.${meetInfo}\n\nYou can add it to your calendar below!`;
      replyText = replyText
        ? `${replyText}\n\n${confirmationLine}`
        : `🎉 Great news, ${bookingResult.lead?.name || 'there'}! ${confirmationLine}`;
    }

    // ── Step 3: Heuristic fallback (only when LLM fails or returns empty)
    if (!replyText) {
      const lower = lowerMessage;
      const firstForm = primaryConnectedForm;

      // Check structured facts first
      if (structuredFacts) {
        const factQuery = queryStructuredFacts(structuredFacts, message);
        if (factQuery && factQuery.matched) {
          replyText = factQuery.answer;
        }
      }

      // Check FAQs with stopword filter
      if (!replyText) {
        const FAQ_STOPWORDS = new Set(['the','what','your','our','this','that','with','from',
          'have','does','do','are','how','when','where','who','why','which','for',
          'and','but','you','yours','about','into','can','could','would','will',
          'should','may','might','must','here','there','was','were','been','being',
          'has','had','did','not','nor','too','very','just','only','also']);
        const matchedFaq = agent.knowledge?.faqPairs?.find((f) => {
          const q = (f.question || '').toLowerCase();
          if (!q) return false;
          if (lower.includes(q)) return true;
          const qTokens = q.split(/\s+/).filter((w) => w.length > 2 && !FAQ_STOPWORDS.has(w));
          if (qTokens.length === 0) return false;
          const hits = qTokens.filter((t) => lower.includes(t)).length;
          return hits / qTokens.length >= 0.5;
        });

        if (matchedFaq) {
          replyText = matchedFaq.answer;
        }
      }

      // Contextual fallbacks
      if (!replyText) {
        const knownServices = Array.from(
          new Set([
            ...(structuredFacts?.services?.map((s) => s.name) || []),
            ...((agent.knowledge as any)?.services || []),
            ...extractedServices,
          ])
        ).filter(Boolean);

        // A. Service Area & Location check (MUST RUN BEFORE GENERAL SERVICES)
        const isAreaQuery =
          lower.includes('area') ||
          lower.includes('location') ||
          lower.includes('city') ||
          lower.includes('cities') ||
          lower.includes('serve') ||
          lower.includes('coverage') ||
          lower.includes('region') ||
          lower.includes('where do you') ||
          lower.includes('where are you') ||
          lower.includes('come to');

        // B. Website / URL query
        const isWebsiteQuery =
          lower.includes('website') ||
          lower.includes('site') ||
          lower.includes('url') ||
          lower.includes('web page') ||
          lower.includes('homepage') ||
          lower.includes('link');

        // C. Contact info query
        const isContactQuery =
          lower.includes('phone') ||
          lower.includes('call') ||
          lower.includes('number') ||
          lower.includes('email') ||
          lower.includes('contact');

        // D. Booking / Scheduling query
        const bookingIntent = extractBookingIntent(message, history, primaryConnectedForm?.name || agent.roleTitle);
        const isBookingQuery =
          bookingIntent.hasIntent ||
          lower.includes('book') ||
          lower.includes('appointment') ||
          lower.includes('schedule') ||
          lower.includes('tomorrow') ||
          lower.includes('calendar');

        if (isAreaQuery) {
          if (serviceAreasList) {
            replyText = `**${agent.name}** proudly serves **${serviceAreasList}** and surrounding communities! Are you located within our service area, or would you like to schedule a service visit?`;
          } else {
            replyText = `**${agent.name}** provides services across our local metro area and surrounding communities. Please share your city or zip code, and I'll confirm immediate coverage for your location!`;
          }
        } else if (isWebsiteQuery) {
          if (websiteUrl) {
            replyText = `You can visit our official website at **[${websiteUrl}](${websiteUrl})** for complete information about our services, testimonials, and online booking!`;
          } else {
            replyText = `You can learn more about **${agent.name}** right here, or let me know what questions you have and I'll be glad to help!`;
          }
        } else if (isContactQuery) {
          const details: string[] = [];
          const phoneVal = structuredFacts?.phone || tenantRecord?.phone;
          const emailVal = structuredFacts?.email || tenantRecord?.email;
          const addressVal = structuredFacts?.address || tenantRecord?.address;
          if (phoneVal) details.push(`📞 **Phone:** ${phoneVal}`);
          if (emailVal) details.push(`✉️ **Email:** ${emailVal}`);
          if (addressVal) details.push(`📍 **Address:** ${addressVal}`);
          if (details.length > 0) {
            replyText = `You can contact **${agent.name}** through:\n\n${details.join('\n')}\n\nOur team is available to assist you!`;
          } else {
            replyText = `You can contact **${agent.name}** directly through this chat, or submit an inquiry to have our team reach out to you!`;
          }
        } else if (isBookingQuery) {
          if (bookingIntent.dateStr && bookingIntent.timeStr) {
            replyText = `I've noted your requested appointment for **${bookingIntent.dateStr} at ${bookingIntent.timeStr}**! To complete your reservation with **${agent.name}**, please provide your **name** and **phone number** (or email).`;
          } else if (bookingIntent.dateStr) {
            replyText = `We'd be glad to schedule an appointment for you on **${bookingIntent.dateStr}**! What time window works best for you (for example, morning 9:00 AM – 12:00 PM or afternoon 1:00 PM – 5:00 PM)?`;
          } else {
            replyText = `I would be happy to help you schedule an appointment with **${agent.name}**! Which day and time window works best for you, and what service do you need?`;
          }
        } else if (
          lower.includes('service') ||
          lower.includes('rate') ||
          lower.includes('pricing') ||
          lower.includes('cost') ||
          lower.includes('price') ||
          lower.includes('fee') ||
          lower.includes('offer') ||
          lower.includes('what do you do') ||
          lower.includes('what can you do')
        ) {
          // Check if user asked about a specific service
          const matchedService = knownServices.find((s) => {
            const sLower = s.toLowerCase();
            return lower.includes(sLower) || (sLower.length > 5 && lower.includes(sLower.replace(/\s+(repair|replacement|installation|services?)/g, '')));
          });

          if (matchedService) {
            replyText = `**${agent.name}** provides professional **${matchedService}**! We offer upfront, transparent pricing and free estimates before starting any job. Would you like an instant quote or to schedule an appointment for ${matchedService}?`;
          } else if (knownServices.length > 0) {
            replyText = `**${agent.name}** offers a full range of professional services, including:\n\n${knownServices.map((s) => `• **${s}**`).join('\n')}\n\nOur rates depend on the specific scope of work, and we provide transparent, upfront estimates before beginning any job. Would you like an instant quote or to schedule an appointment?`;
          } else {
            replyText = `**${agent.name}** provides comprehensive ${agent.roleTitle || 'services'} with upfront, transparent rates and free estimates. Would you like to tell me more about your project so I can provide an accurate quote?`;
          }
        } else if (lower.includes('question') || lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
          replyText = `Hello! I'm **${agent.name}**, your **${agent.roleTitle}**. How can I help you today? Feel free to ask about our services, service areas, or request an estimate!`;
        } else {
          replyText = `Thank you for reaching out! I'm **${agent.name}**, your **${agent.roleTitle}**. How can I assist you with your project today?`;
        }
      }
    }

    // ── Step 4: Strict Form Card Attachment (Action Mode ONLY)
    // NEVER attach the form card on pure informational questions or greetings!
    if (primaryConnectedForm?.id && isBookingOrIntake && !isInformationalQuery) {
      suggestedFormId = primaryConnectedForm.id;
    }

    // Sync conversation into PublicChatSession
    const syncRes = await syncChatConversation({
      sessionId: body.sessionId || null,
      tenantId: effectiveTenantId,
      workspaceId: effectiveWorkspaceId,
      formId: primaryConnectedForm?.id || null,
      agentId: agent.id && agent.id !== 'preview' ? agent.id : null,
      visitorName: body.visitorName || null,
      visitorEmail: body.visitorEmail || null,
      visitorPhone: body.visitorPhone || null,
      userMessage: message,
      aiReply: replyText,
      agentName: agent.name,
    });

    // ── Phase A: Output Guardrail — redact PII, detect system prompt leaks ──
    const outputCheck = outputGuardrail(replyText, guardrailConfig);
    if (!outputCheck.passed) {
      replyText = "I apologize for the confusion. How can I help you with your service needs today?";
    } else if (outputCheck.filteredMessage) {
      replyText = outputCheck.filteredMessage;
    }

    // ── Phase A: Update session memory (extract fields from this turn) ──
    if (syncRes?.sessionId) {
      const allMessages = [
        ...(history || []).map((h: any) => ({ sender: h.sender || h.role, text: h.text || h.content })),
        { sender: 'user', text: message },
        { sender: 'ai', text: replyText },
      ];
      const extractedFields = extractConversationFields(allMessages);
      updateSessionMemory(syncRes.sessionId, extractedFields).catch(() => {});
    }

    if (suggestedQuestions.length === 0) {
      suggestedQuestions = generateContextualSuggestions(safeMessage, replyText, agent);
    }

    return NextResponse.json({
      success: true,
      reply: replyText,
      suggestedQuestions,
      sessionId: syncRes.sessionId,
      suggestedFormId: suggestedFormId || null,
      suggestedForm: suggestedFormId ? primaryConnectedForm : null,
      card: bookingCard,
      citations: citations.length > 0 ? citations : undefined,
      confidence: hybridResult
        ? {
            score: hybridResult.confidenceScore,
            tier: hybridResult.confidenceTier,
            verified: hybridResult.confidenceTier === 'HIGH' || !!hybridResult.structuredFactMatch,
          }
        : undefined,
      chips: [
        { label: '📅 Book Consultation', action: 'book' },
        { label: '⚡ Request Quote', action: 'quote' },
        { label: '💬 Talk to Specialist', action: 'request_human' },
      ],
      agentName: agent.name,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate agent response', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

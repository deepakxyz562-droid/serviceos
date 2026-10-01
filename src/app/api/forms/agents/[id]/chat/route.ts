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

    if (primaryConnectedForm?.id) {
      try {
        formRecord = await db.form.findFirst({
          where: { OR: [{ id: primaryConnectedForm.id }, { slug: primaryConnectedForm.id }] },
          select: { id: true, name: true, description: true, fieldsJson: true, schemaJson: true, tenantId: true, workspaceId: true },
        });

        if (formRecord) {
          let fields: any[] = [];
          let schemaObj: any = null;

          if (formRecord.schemaJson) {
            try {
              schemaObj = typeof formRecord.schemaJson === 'string' ? JSON.parse(formRecord.schemaJson) : formRecord.schemaJson;
              if (Array.isArray(schemaObj?.fields)) fields = schemaObj.fields;
            } catch {}
          }

          if (fields.length === 0 && formRecord.fieldsJson) {
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
            if (f?.options && Array.isArray(f.options)) {
              for (const opt of f.options) {
                const label = typeof opt === 'string' ? opt : opt?.label || opt?.value;
                if (label && typeof label === 'string' && label.length < 50) {
                  extractedServices.push(label);
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

          const tenantId = formRecord.tenantId || agent.tenantId;
          if (tenantId) {
            const tenant = await db.tenant.findUnique({
              where: { id: tenantId },
              select: { name: true, industry: true, phone: true, email: true, address: true },
            }).catch(() => null);

            if (tenant) {
              businessProfilePrompt = `BUSINESS PROFILE:\n- Business Name: ${tenant.name}\n- Industry / Trade: ${tenant.industry || 'Professional Services'}\n- Phone: ${tenant.phone || 'Available online'}\n- Email: ${tenant.email || ''}\n- Online scheduling available 24/7`;
            }
          }
        }
      } catch (err) {
        console.warn('[forms/agent-chat] Form context load warning:', err);
      }
    }

    // 3. Extract service areas & structured facts from agent config
    const structuredFacts = agent.knowledge?.structuredFacts;
    const serviceAreasList = agent.knowledge?.serviceAreas?.length
      ? agent.knowledge.serviceAreas.join(', ')
      : structuredFacts?.serviceAreas?.length
      ? structuredFacts.serviceAreas.join(', ')
      : '';

    // 4. Intent Classification: Answer Mode vs Action Mode
    const intentResult = classifyIntent(safeMessage);
    const isBookingOrIntake = intentResult.isBookingOrIntake;
    const isInformationalQuery = intentResult.isInformationalQuery;

    // Build context from agent knowledge base + session memory
    const knowledgeContext = [
      `Agent Identity: You are ${agent.name}, ${agent.roleTitle}.`,
      `Tone: ${agent.voiceTone}.`,
      businessProfilePrompt,
      serviceAreasList ? `VERIFIED SERVICE AREAS & CITIES SERVED:\n${serviceAreasList}` : '',
      sessionContext ? sessionContext : '',  // Phase A: inject conversation memory
      `System Prompt: ${agent.knowledge?.systemPrompt || ''}`,
      agent.knowledge?.guardrails?.length
        ? `Strict Guardrails:\n- ${agent.knowledge.guardrails.join('\n- ')}`
        : '',
      agent.knowledge?.faqPairs?.length
        ? `Known FAQs:\n${agent.knowledge.faqPairs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')}`
        : '',
      retrievedKnowledge,
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

        if (
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
          if (knownServices.length > 0) {
            replyText = `**${agent.name}** offers a full range of professional services, including:\n\n${knownServices.map((s) => `• **${s}**`).join('\n')}\n\nOur rates depend on the specific scope of work, and we provide transparent, upfront estimates before beginning any job. Would you like an instant quote or to schedule an appointment?`;
          } else {
            replyText = `**${agent.name}** provides comprehensive ${agent.roleTitle || 'services'} with upfront, transparent rates and free estimates. Would you like to tell me more about your project so I can provide an accurate quote?`;
          }
        } else if (isInformationalQuery && serviceAreasList && (lower.includes('location') || lower.includes('area') || lower.includes('serve') || lower.includes('where'))) {
          replyText = `**${agent.name}** proudly serves **${serviceAreasList}** and surrounding communities! Feel free to let me know what you need or ask any questions.`;
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

    return NextResponse.json({
      success: true,
      reply: replyText,
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

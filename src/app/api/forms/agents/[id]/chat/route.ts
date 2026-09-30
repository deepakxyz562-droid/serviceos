import { NextRequest, NextResponse } from 'next/server';
import { callAI } from '@/lib/ai-client';
import { searchKnowledgeBase, searchKnowledgeBaseHybrid } from '@/lib/ai-knowledge';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { DEFAULT_FORM_AGENT, FormAgentData } from '@/features/forms/types/agent-types';
import { isEscalationIntent, requestHumanHandoff } from '@/lib/chat/handoff-service';
import { tryExecuteChatBooking } from '@/lib/scheduling/chat-booking-helper';
import { syncChatConversation } from '@/lib/chat/chat-session-sync';

/**
 * Parse FormAgent.configJson (which stores the full FormAgentData shape) back
 * into a partial config we can merge with DEFAULT_FORM_AGENT.
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
 * Load the full FormAgent config (including knowledge, guardrails, FAQs) from
 * the DB by route `id`. This is critical because the client may send a
 * sanitized agentConfig (via sanitizePublicAgent) that strips knowledge /
 * tenantId / settings — trusting it would cause the agent to ignore its
 * configured persona, guardrails, and FAQs.
 *
 * Falls back to the client-supplied agentConfig only for preview mode
 * (id === 'preview') or when the DB lookup fails.
 */
async function loadAgentFromDb(id: string, fallback: FormAgentData | undefined): Promise<FormAgentData> {
  // Preview mode (studio simulator) — no DB record exists yet.
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

    // Re-fetch the full agent config (with knowledge/guardrails/FAQs) from DB
    // instead of trusting the client-supplied agentConfig, which may be
    // sanitized (knowledge stripped) by sanitizePublicAgent().
    const agent: FormAgentData = await loadAgentFromDb(id, agentConfig);

    // Retrieve relevant vector embeddings from knowledge base (Hybrid RAG)
    let retrievedKnowledge = '';
    let hybridResult: any = null;
    let citations: Array<{ id: number; title: string; url?: string; snippet: string }> = [];
    const kbScope = agent.tenantId || (id !== 'preview' ? id : undefined);

    if (kbScope && message) {
      try {
        hybridResult = await searchKnowledgeBaseHybrid(kbScope, message, { k: 3, strictMode: true });
        citations = hybridResult.citations || [];

        if (hybridResult.snippets && hybridResult.snippets.length > 0) {
          retrievedKnowledge = `Indexed Knowledge Base Documents:\n${hybridResult.snippets.map((doc: any) => `- ${doc.content || doc.snippet || ''}`).join('\n')}`;
        } else if (message.length > 15 && !['hi', 'hello', 'hey', 'start'].includes(message.trim().toLowerCase())) {
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

    // If connected form exists, load its field schema to enable natural conversational form filling
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

          // Extract services mentioned in options or fields
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
            formFieldsPrompt = `Connected Form: "${formRecord.name}" (${formRecord.description || 'Customer inquiry'})\nFields to Collect Conversationally:\n${fieldSummaries}\n\nCONVERSATIONAL FORM FILLING INSTRUCTIONS:\nWhen a visitor expresses interest in booking, getting a quote, or requesting service, guide them conversationally through these questions 1 or 2 at a time rather than asking all at once. Validate inputs gently (e.g. verify phone or address). When key required details are provided, summarize their request warmly!`;
          }

          // Load Tenant or Workspace profile to know business name, hours, and trade
          const tenantId = formRecord.tenantId || agent.tenantId;
          if (tenantId) {
            const tenant = await db.tenant.findUnique({
              where: { id: tenantId },
              select: { name: true, industry: true, phone: true, email: true, address: true },
            }).catch(() => null);

            if (tenant) {
              // NOTE: business hours are not stored on the Tenant model — do NOT
              // fabricate "Mon-Fri 8-6, Sat 9-3" which is wrong for most businesses.
              // The agent will ask visitors to confirm hours if asked.
              businessProfilePrompt = `BUSINESS PROFILE:\n- Business Name: ${tenant.name}\n- Industry / Trade: ${tenant.industry || 'Professional Services'}\n- Phone: ${tenant.phone || 'Available online'}\n- Email: ${tenant.email || ''}\n- Operating Hours: Not specified in our records — if the visitor asks, ask them to contact us or check our website for current hours.\n- Online scheduling & inquiry form available 24/7 with immediate confirmation\n- Offered Services: ${extractedServices.length > 0 ? extractedServices.slice(0, 12).join(', ') : 'Custom quotes, on-site service, consultations, and professional service inquiries'}`;
            }
          }
        } else if (primaryConnectedForm) {
          // If form is not yet saved to DB (e.g. in-memory studio preview), extract fields from agent config or body
          const fallbackFields = (primaryConnectedForm as any).fields || (body as any).formSchema?.fields || [];
          if (Array.isArray(fallbackFields) && fallbackFields.length > 0) {
            for (const f of fallbackFields) {
              if (f?.options && Array.isArray(f.options)) {
                for (const opt of f.options) {
                  const label = typeof opt === 'string' ? opt : opt?.label || opt?.value;
                  if (label && typeof label === 'string' && label.length < 50) {
                    extractedServices.push(label);
                  }
                }
              }
            }
            const fieldSummaries = fallbackFields
              .slice(0, 10)
              .map((f: any) => `- "${f.label || f.id}" (${f.required ? 'required' : 'optional'})`)
              .join('\n');
            formFieldsPrompt = `Connected Form: "${primaryConnectedForm.name || 'Service Request'}" (${primaryConnectedForm.description || 'Customer inquiry'})\nFields to Collect Conversationally:\n${fieldSummaries}\n\nCONVERSATIONAL FORM FILLING INSTRUCTIONS:\nWhen a visitor expresses interest in booking, getting a quote, or requesting service, guide them conversationally through these questions 1 or 2 at a time rather than asking all at once. Validate inputs gently (e.g. verify phone or address). When key required details are provided, summarize their request warmly!`;
          }
        }
      } catch (err) {
        console.warn('[forms/agent-chat] Form/Business context load warning:', err);
      }
    }

    if (!businessProfilePrompt) {
      // No tenant record loaded — do NOT fabricate business hours.
      // Previously this hardcoded "Mon-Fri 8-6, Sat 9-3" which was wrong for
      // most businesses. Instead, instruct the agent to ask the visitor to
      // confirm hours rather than state potentially incorrect ones.
      businessProfilePrompt = `BUSINESS & AVAILABILITY:\n- Operating Hours: Not specified in our records — if the visitor asks about hours, ask them to contact us or check our website for current hours.\n- Availability: Online scheduling and inquiry form available 24/7.\n- Response Time: Typically within 15 minutes during operating hours.`;
    }

    // Build context from agent knowledge base
    const knowledgeContext = [
      `Agent Persona: You are ${agent.name}, ${agent.roleTitle}.`,
      `Tone: ${agent.voiceTone}.`,
      businessProfilePrompt,
      `System Prompt: ${agent.knowledge?.systemPrompt || ''}`,
      agent.knowledge?.guardrails?.length
        ? `Strict Guardrails:\n- ${agent.knowledge.guardrails.join('\n- ')}`
        : '',
      agent.knowledge?.faqPairs?.length
        ? `Known FAQs:\n${agent.knowledge.faqPairs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')}`
        : '',
      retrievedKnowledge,
      formFieldsPrompt,
      agent.connectedForms?.length
        ? `Available Connected Forms to recommend:\n${agent.connectedForms.map((form) => `- Form ID "${form.id}": "${form.name}" (${form.description || ''})`).join('\n')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n\n');
    const lowerMessage = (message || '').toLowerCase().trim();


    // Check for human escalation intent via unified handoff service
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
        suggestedFormId: primaryConnectedForm?.id || null,
        agentName: agent.name,
      });
    }

    const authUser = await getAuthUser().catch(() => null);
    // NOTE: removed the `firstTenant` fallback — it caused conversations and
    // KB queries to be scoped to the wrong tenant when no tenantId could be
    // resolved from the agent/form/auth context. The public chat route
    // (/api/public/ai/agent-chat) already fixed this; this route now matches.
    const effectiveTenantId = formRecord?.tenantId || agent.tenantId || authUser?.tenantId || null;
    const effectiveWorkspaceId = formRecord?.workspaceId || (agent as any).workspaceId || authUser?.workspaceId || null;

    let replyText = '';
    let suggestedFormId: string | null = null;
    let bookingCard: any = null;

    // Check for real appointment booking execution
    const bookingResult = await tryExecuteChatBooking({
      tenantId: effectiveTenantId,
      workspaceId: effectiveWorkspaceId,
      formId: primaryConnectedForm?.id || null,
      agentId: agent.id && agent.id !== 'preview' ? agent.id : null,
      serviceName: primaryConnectedForm?.name || agent.roleTitle || 'Consultation & Appointment',
      message,
      history,
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

      replyText = `🎉 Great news, ${bookingResult.lead?.name || 'there'}! Your appointment has been successfully scheduled and confirmed for **${bookingResult.dateStr} at ${bookingResult.timeStr}**.${meetInfo}\n\nOur team has added this to our calendar. You can also add it to your calendar below!`;
    }

    if (!replyText) {
      try {
        const messages = [
          {
            role: 'system' as const,
            content: `${knowledgeContext}\n\nKeep responses concise, helpful, and formatted with markdown. Never say cold deflective phrases like "please use our connected form". Help visitors conversationally: answer their questions directly, guide them through booking or submitting their inquiry right here in the chat, or invite them to tap the interactive form card below.\nIf the visitor provides appointment details (date, time, name), warmly summarize and confirm their appointment request.`,
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
          model: agent.llm?.model || undefined,
        });

        replyText = aiRes.content || '';
      } catch (e) {
        console.warn('Chat AI call failed, using intelligent rule responder:', e);
      }
    }

    // Intelligent heuristic response fallback (used when LLM provider is temporarily unavailable)
    if (!replyText) {
      const lower = lowerMessage;
      const firstForm = primaryConnectedForm;
      const formName = firstForm?.name || 'Inquiry Form';

      // 1. Check agent's configured FAQs first
      const matchedFaq = agent.knowledge?.faqPairs?.find((f) => {
        const q = (f.question || '').toLowerCase();
        if (!q) return false;
        const words = lower.split(/\s+/).filter((w) => w.length > 3);
        return lower.includes(q) || q.includes(lower) || (words.length > 0 && words.some((w) => q.includes(w)));
      });

      if (matchedFaq) {
        replyText = matchedFaq.answer;
        suggestedFormId = firstForm?.id || null;
      } else {
        const isServiceQuery = lower.includes('service') || lower.includes('clean') || lower.includes('window') ||
          lower.includes('repair') || lower.includes('install') || lower.includes('wash') || lower.includes('roof') ||
          lower.includes('hvac') || lower.includes('plumb') || lower.includes('offer') || lower.includes('work') ||
          lower.includes('what do you do');
        
        const isTimingQuery = lower.includes('hour') || lower.includes('time') || lower.includes('open') ||
          lower.includes('availab') || lower.includes('when') || lower.includes('day') || lower.includes('schedule') ||
          lower.includes('weekend') || lower.includes('sunday') || lower.includes('saturday');

        if (isTimingQuery) {
          replyText = `Our online booking and appointment request system is available 24/7 for you to select your preferred date and time, and our team responds promptly to confirm scheduling during operating hours!`;
          suggestedFormId = firstForm?.id || null;
        } else if (isServiceQuery) {
          const servicesList = extractedServices.length > 0
            ? `including **${extractedServices.slice(0, 4).join('**, **')}**`
            : 'tailored to your exact project specifications';
          replyText = `Yes! We provide professional services ${servicesList}. To get an accurate quote and confirm immediate availability, you can complete our **${formName}** or let me know the details of your project!`;
          suggestedFormId = firstForm?.id || null;
        } else if (lower.includes('price') || lower.includes('cost') || lower.includes('estimate') || lower.includes('quote') || lower.includes('fee') || lower.includes('rate')) {
          replyText = `We provide upfront, transparent pricing. You can submit a quick request through our **${formName}** to receive an immediate estimate.`;
          suggestedFormId = firstForm?.id || null;
        } else if (lower.includes('question') || lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
          replyText = `Hello! I'm **${agent.name}**, your **${agent.roleTitle}**. How can I help you today? Feel free to ask any question or let me know what project you have in mind!`;
        } else {
          replyText = `Thank you for reaching out! I'm **${agent.name}**, your **${agent.roleTitle}**. How can I assist you with your project today? You can also complete our **${formName}** at any time.`;
          suggestedFormId = firstForm?.id || null;
        }
      }
    }

    // Always resolve connected form recommendation if query touches on booking, quotes, forms, or applications
    if (!suggestedFormId && primaryConnectedForm?.id) {
      const formIntentKeywords = ['book', 'schedule', 'appointment', 'quote', 'apply', 'form', 'contact', 'consultation', 'service', 'inquiry'];
      if (formIntentKeywords.some((kw) => lowerMessage.includes(kw) || replyText.toLowerCase().includes(kw))) {
        suggestedFormId = primaryConnectedForm.id;
      }
    }

    // Sync conversation into PublicChatSession and PublicChatMessage for real-time Live Chat board
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

    return NextResponse.json({
      success: true,
      reply: replyText,
      sessionId: syncRes.sessionId,
      suggestedFormId: suggestedFormId || primaryConnectedForm?.id || null,
      suggestedForm: primaryConnectedForm || null,
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

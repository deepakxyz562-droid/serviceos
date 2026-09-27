import { NextRequest, NextResponse } from 'next/server';
import { callAI } from '@/lib/ai-client';
import { searchKnowledgeBase } from '@/lib/ai-knowledge';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { DEFAULT_FORM_AGENT, FormAgentData } from '@/features/forms/types/agent-types';
import { isEscalationIntent, requestHumanHandoff } from '@/lib/chat/handoff-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { message = '', history = [], agentConfig } = body;

    const agent: FormAgentData = agentConfig || DEFAULT_FORM_AGENT;

    // Retrieve relevant vector embeddings from knowledge base
    let retrievedKnowledge = '';
    const kbScope = agent.tenantId || (id !== 'preview' ? id : undefined);
    if (kbScope && message) {
      try {
        const kbResults = await searchKnowledgeBase(kbScope, message, 3);
        if (kbResults && kbResults.length > 0) {
          retrievedKnowledge = `Indexed Knowledge Base Documents:\n${kbResults.map((doc: any) => `- ${doc.content || doc.snippet || ''}`).join('\n')}`;
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
          select: { id: true, name: true, description: true, fieldsJson: true, tenantId: true, workspaceId: true },
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
              businessProfilePrompt = `BUSINESS PROFILE & OPERATING HOURS:\n- Business Name: ${tenant.name}\n- Industry / Trade: ${tenant.industry || 'Professional Services'}\n- Phone: ${tenant.phone || 'Available online'}\n- Email: ${tenant.email || ''}\n- Operating Hours & Availability:\n  * Monday – Friday: 8:00 AM – 6:00 PM\n  * Saturday: 9:00 AM – 3:00 PM\n  * Sunday: Closed for regular calls (Online booking & emergency requests accepted 24/7)\n  * Appointment scheduling & online form available 24/7 with immediate confirmation\n- Offered Services: ${extractedServices.length > 0 ? extractedServices.slice(0, 12).join(', ') : 'Custom quotes, on-site service, consultations, and professional service inquiries'}`;
            }
          }
        }
      } catch (err) {
        console.warn('[forms/agent-chat] Form/Business context load warning:', err);
      }
    }

    if (!businessProfilePrompt) {
      businessProfilePrompt = `BUSINESS & AVAILABILITY TIMINGS:\n- Hours: Monday through Friday 8:00 AM – 6:00 PM, Saturday 9:00 AM – 3:00 PM.\n- Availability: Online scheduling and inquiry form available 24/7.\n- Response Time: Typically within 15 minutes during operating hours.`;
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

    let replyText = '';
    let suggestedFormId: string | null = null;

    try {
      const messages = [
        {
          role: 'system' as const,
          content: `${knowledgeContext}\n\nKeep responses concise, helpful, and formatted with markdown. If the user expresses intent to register, schedule, book, or submit an inquiry, recommend completing the connected form.`,
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
      });

      replyText = aiRes.content || '';
    } catch (e) {
      console.warn('Chat AI call failed, using intelligent rule responder:', e);
    }

    // Intelligent heuristic response fallback (used when LLM provider is temporarily unavailable)
    if (!replyText) {
      const lower = lowerMessage;
      const firstForm = primaryConnectedForm;
      const formName = firstForm?.name || 'Inquiry Form';
      
      const isServiceQuery = lower.includes('service') || lower.includes('clean') || lower.includes('window') ||
        lower.includes('repair') || lower.includes('install') || lower.includes('wash') || lower.includes('roof') ||
        lower.includes('hvac') || lower.includes('plumb') || lower.includes('offer') || lower.includes('work') ||
        lower.includes('what do you do');
      
      const isTimingQuery = lower.includes('hour') || lower.includes('time') || lower.includes('open') ||
        lower.includes('availab') || lower.includes('when') || lower.includes('day') || lower.includes('schedule') ||
        lower.includes('weekend') || lower.includes('sunday') || lower.includes('saturday');

      if (isTimingQuery) {
        replyText = `Our team is available Monday through Friday from 8:00 AM to 6:00 PM, and Saturday from 9:00 AM to 3:00 PM. Our online booking form is available 24/7 for you to select your preferred date and time!`;
        suggestedFormId = firstForm?.id || null;
      } else if (isServiceQuery) {
        const servicesList = extractedServices.length > 0
          ? `including **${extractedServices.slice(0, 4).join('**, **')}**`
          : 'tailored to your exact project specifications';
        replyText = `Yes! We provide professional services ${servicesList}. To get an accurate quote and confirm immediate availability, you can complete our **${formName}** or let me know the details of your project!`;
        suggestedFormId = firstForm?.id || null;
      } else if (lower.includes('price') || lower.includes('cost') || lower.includes('estimate') || lower.includes('quote') || lower.includes('fee') || lower.includes('rate')) {
        replyText = `We provide upfront, competitive pricing. You can submit a quick request through our **${formName}** to receive an immediate estimate.`;
        suggestedFormId = firstForm?.id || null;
      } else if (lower.includes('question') || lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
        replyText = `Hello! I would be glad to help answer your questions. What service or project are you looking for assistance with today?`;
      } else {
        replyText = `Thank you for reaching out! I'm **${agent.name}**, your **${agent.roleTitle}**. How can I assist you with your project today? You can also complete our **${formName}** at any time.`;
        suggestedFormId = firstForm?.id || null;
      }
    }

    // Always resolve connected form recommendation if query touches on booking, quotes, forms, or applications
    if (!suggestedFormId && primaryConnectedForm?.id) {
      const formIntentKeywords = ['book', 'schedule', 'appointment', 'quote', 'apply', 'form', 'contact', 'consultation', 'service', 'inquiry'];
      if (formIntentKeywords.some((kw) => lowerMessage.includes(kw) || replyText.toLowerCase().includes(kw))) {
        suggestedFormId = primaryConnectedForm.id;
      }
    }

    return NextResponse.json({
      success: true,
      reply: replyText,
      suggestedFormId: suggestedFormId || primaryConnectedForm?.id || null,
      agentName: agent.name,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate agent response', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

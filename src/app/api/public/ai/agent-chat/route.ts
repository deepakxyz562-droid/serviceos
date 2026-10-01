import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { callAI } from '@/lib/ai-client';
import { searchKnowledgeBase, searchKnowledgeBaseHybrid } from '@/lib/ai-knowledge';
import { requestHumanHandoff, isEscalationIntent } from '@/lib/chat/handoff-service';
import { createAppointmentBooking } from '@/lib/scheduling/booking-service';
import { tryExecuteChatBooking, extractBookingIntent } from '@/lib/scheduling/chat-booking-helper';
import { syncChatConversation } from '@/lib/chat/chat-session-sync';
import { traceChatTurn } from '@/lib/ai-chat-tracer';

export const runtime = 'nodejs';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json();
    const {
      agentId,
      tenantId: explicitTenantId,
      message,
      history = [],
      action,
      bookingData,
    } = body;

    // 1. Resolve Workspace / Tenant context from the agentId or explicit IDs.
    //    NEVER fall back to "first active tenant" — that was a security hole
    //    (any anonymous visitor could bill AI calls to an unrelated tenant).
    let tenantId: string | undefined = explicitTenantId;
    let workspaceId: string | undefined;
    let tenantName = 'Service Pro';
    let tenantPhone = '';
    let tenantEmail = '';

    let primaryConnectedForm: any = null;

    // Agent knowledge extracted from configJson (systemPrompt, faqPairs, guardrails)
    let agentKnowledge: {
      systemPrompt: string;
      faqPairs: { question: string; answer: string }[];
      guardrails: string[];
    } | null = null;

    if (agentId && !tenantId) {
      // Check if agentId is a Tenant id or Form id or AiAgent id
      const tenant = await db.tenant.findUnique({
        where: { id: agentId },
        select: { id: true, name: true, phone: true, email: true },
      });
      if (tenant) {
        tenantId = tenant.id;
        tenantName = tenant.name;
        tenantPhone = tenant.phone || '';
        tenantEmail = tenant.email || '';
      } else {
        // 1. Try resolving via FormAgent (chatbot studio agent)
        const formAgent = await db.formAgent.findFirst({
          where: { OR: [{ id: agentId }, { slug: agentId }] },
          include: {
            tenant: { select: { id: true, name: true, phone: true, email: true } },
          },
        });

        if (formAgent) {
          const agentConfig = (formAgent.configJson as any) || {};
          if (Array.isArray(agentConfig.connectedForms) && agentConfig.connectedForms.length > 0) {
            primaryConnectedForm = agentConfig.connectedForms[0];
          }

          // Extract the agent's configured knowledge (systemPrompt, faqPairs,
          // guardrails) from configJson — previously the public chat route
          // ignored these entirely, building its own system prompt from scratch.
          // This meant the wizard-generated systemPrompt (with crawled business
          // context) was never used by the public widget.
          if (agentConfig.knowledge) {
            agentKnowledge = {
              systemPrompt: agentConfig.knowledge.systemPrompt || '',
              faqPairs: agentConfig.knowledge.faqPairs || [],
              guardrails: agentConfig.knowledge.guardrails || [],
            };
          }

          if (formAgent.tenant) {
            tenantId = formAgent.tenant.id;
            tenantName = formAgent.tenant.name;
            tenantPhone = formAgent.tenant.phone || '';
            tenantEmail = formAgent.tenant.email || '';
          } else {
            // Standalone FormAgent without explicit tenant
            tenantId = formAgent.id;
            tenantName = formAgent.name || 'AI Assistant';
          }
        } else {
          // 2. Try resolving via Form (supports both tenant-scoped and standalone forms)
          const form = await db.form.findFirst({
            where: { OR: [{ id: agentId }, { slug: agentId }] },
            include: {
              tenant: { select: { id: true, name: true, phone: true, email: true } },
              workspace: { select: { id: true, name: true, brandingJson: true } },
            },
          });
          if (form) {
            primaryConnectedForm = {
              id: form.id,
              name: form.name,
              description: form.description,
            };
            workspaceId = form.workspaceId || undefined;
            if (form.tenant) {
              tenantId = form.tenant.id;
              tenantName = form.tenant.name;
              tenantPhone = form.tenant.phone || '';
              tenantEmail = form.tenant.email || '';
            } else if (form.workspace) {
              // Standalone form (no CRM tenant) — branding from workspace
              tenantName = form.workspace.name;
              try {
                const branding = JSON.parse(form.workspace.brandingJson || '{}');
                if (branding.supportEmail) tenantEmail = branding.supportEmail;
              } catch { /* ignore parse errors */ }
            }
          }
        }
      }
    }

    // SECURITY: No silent tenant fallback.
    // Previously this fell back to db.tenant.findFirst() — allowing anonymous
    // visitors to bill AI calls to an arbitrary tenant. The comment below said
    // "No silent fallback" but the fallback had already executed above.
    // Now we return a clear 400 if no tenant/workspace context was resolved.
    if (!tenantId && !workspaceId) {
      return NextResponse.json(
        { error: 'Unable to resolve agent context. Provide a valid agentId, tenantId, or form slug.' },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    // ─── Check Availability Action ─────────────────────────────────────────
    if (action === 'check_availability') {
      const targetDate = body.date || new Date().toISOString().split('T')[0];
      const slotDuration = Number(body.slotDuration) || 30;

      // Default working hours: 09:00 to 17:00 (configurable per tenant in future)
      const startHour = 9;
      const endHour = 17;
      const slots: string[] = [];
      const tz = body.timezone || 'America/New_York';

      for (let h = startHour; h < endHour; h++) {
        // Exclude 12:00 to 13:00 lunch break
        if (h === 12) continue;
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        slots.push(`${h12}:00 ${ampm}`);
        if (slotDuration <= 30) {
          slots.push(`${h12}:30 ${ampm}`);
        }
      }

      return NextResponse.json(
        {
          success: true,
          date: targetDate,
          slots,
          timezone: tz,
        },
        { headers: CORS_HEADERS },
      );
    }

    // ─── Direct Booking Action ──────────────────────────────────────────────
    if (action === 'confirm_booking' && bookingData) {
      const { name, phone, email, service, date, time, notes } = bookingData;

      const bookingResult = await createAppointmentBooking({
        tenantId: tenantId || null,
        workspaceId: workspaceId || null,
        agentId: agentId || null,
        serviceName: service || 'Service Consultation',
        date: date || new Date().toISOString().split('T')[0],
        time: time || '10:00 AM',
        durationMinutes: 45,
        customer: {
          name: name || 'Chat Visitor',
          email: email || '',
          phone: phone || '',
        },
        notes: `[Booked via AI Chat]\nNotes: ${notes || 'None'}`,
        source: 'ai_chat_widget',
      });

      const meetInfo = bookingResult.meetingUrl
        ? `\n\n🎥 **Video Meeting Link:** [Join Google Meet](${bookingResult.meetingUrl})`
        : '';

      return NextResponse.json(
        {
          success: true,
          reply: `🎉 Great news, ${name || 'there'}! Your appointment request has been confirmed for **${bookingResult.dateStr} at ${bookingResult.timeStr}**.${meetInfo} Our team will contact you at ${phone || email || 'your number'} if any adjustments are needed.`,
          card: {
            type: 'booking_confirmation',
            leadId: bookingResult.lead?.id,
            bookingId: bookingResult.booking?.id,
            calendarUrls: bookingResult.calendarUrls,
            meetingUrl: bookingResult.meetingUrl,
            name,
            service,
            date: bookingResult.dateStr,
            time: bookingResult.timeStr,
          },
        },
        { headers: CORS_HEADERS },
      );
    }

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    // 2. Query Knowledge Base for Context & Citations (Hybrid RAG + Confidence Gate)
    //    Use workspaceId for standalone forms, tenantId for CRM-bound.
    const kbScope = workspaceId || tenantId;
    let kbContext = '';
    let citations: Array<{ id: number; title: string; url?: string; snippet: string }> = [];
    let hybridResult: any = null;
    const responseChips: Array<{ label: string; action: string; value?: string }> = [
      { label: '📅 Book Online', action: 'book' },
      { label: '⚡ Get Instant Quote', action: 'quote' },
      { label: '💬 Talk to a Human', action: 'request_human' },
    ];

    if (kbScope) {
      try {
        hybridResult = await searchKnowledgeBaseHybrid(kbScope, message, { k: 4, strictMode: true });
        citations = hybridResult.citations || [];

        if (hybridResult.snippets.length > 0) {
          kbContext = hybridResult.snippets
            .map((r: any, i: number) => `[Source ${i + 1}: ${r.documentTitle}]\n${r.content}`)
            .join('\n\n');
        }

        // Low confidence fallback on substantive questions -> record to unanswered questions
        if (
          hybridResult.shouldFallback &&
          message.length > 15 &&
          !['hi', 'hello', 'hey', 'start'].includes(message.trim().toLowerCase())
        ) {
          try {
            const { recordUnansweredQuestion } = await import('@/lib/ai-unanswered-questions');
            recordUnansweredQuestion(kbScope, message, 'chat');
          } catch {
            /* ignore */
          }
        }
      } catch (e) {
        console.warn('[agent-chat] Hybrid KB search skipped/empty:', e);
      }
    }

    // ─── Human Handoff / Escalation Action (Text.com Parity) ──────────────
    if (action === 'request_human' || isEscalationIntent(message)) {
      const handoff = await requestHumanHandoff({
        tenantId: tenantId || null,
        workspaceId: workspaceId || null,
        agentId: agentId || null,
        agentName: tenantName,
        visitor: {
          name: body.visitorName || null,
          email: body.visitorEmail || null,
          phone: body.visitorPhone || null,
        },
        message: message || '',
        history,
      });

      return NextResponse.json(
        {
          reply: handoff.reply,
          humanHandoff: true,
          status: handoff.status,
          sessionId: handoff.liveSessionId,
          businessName: tenantName,
          agentAvailable: handoff.agentAvailable,
          availability: handoff.availability,
        },
        { headers: CORS_HEADERS },
      );
    }

    // 3. Fetch Existing Business Services & Today's Open Slots
    //    (tenant-scoped only — standalone forms don't have a CRM service catalog)
    const todayStr = new Date().toISOString().split('T')[0];
    const services = tenantId
      ? await db.serviceItem.findMany({
          where: { tenantId },
          select: { name: true, description: true, defaultPrice: true },
          take: 8,
        })
      : [];

    const servicesList = services.length > 0
      ? services.map((s) => `- ${s.name} ($${s.defaultPrice || 'Custom Quote'}): ${s.description || ''}`).join('\n')
      : 'Services: Not yet configured — check our website or knowledge base for details.';

    // 4. Construct AI Prompt with Zero-Hallucination Guardrails
    // Include the agent's configured knowledge (systemPrompt, faqPairs, guardrails)
    // from the wizard-generated configJson — previously ignored entirely.
    const agentSystemPrompt = agentKnowledge?.systemPrompt || '';
    const agentFaqs = agentKnowledge?.faqPairs?.length
      ? agentKnowledge.faqPairs.map(f => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')
      : '';
    const agentGuardrails = agentKnowledge?.guardrails?.length
      ? agentKnowledge.guardrails.map(g => `- ${g}`).join('\n')
      : '';

    const systemPrompt = `You are the friendly, professional 24/7 AI Website Employee & Booking Assistant for "${tenantName}".
Business Contact: Phone: ${tenantPhone || 'Available upon booking'}, Email: ${tenantEmail || 'support@' + tenantName.toLowerCase().replace(/\s+/g, '') + '.com'}

${agentSystemPrompt ? `AGENT INSTRUCTIONS:\n${agentSystemPrompt}\n` : ''}
BUSINESS SERVICES & PRICING:
${servicesList}

KNOWLEDGE BASE & FAQS:
${kbContext || 'We provide top-tier professional field services with guaranteed customer satisfaction.'}
${agentFaqs ? `\nCONFIGURED FAQs:\n${agentFaqs}\n` : ''}
${agentGuardrails ? `\nAGENT GUARDRAILS:\n${agentGuardrails}\n` : ''}
CONFIDENCE & ZERO-HALLUCINATION GUARDRAIL:
Confidence Level: ${hybridResult?.confidenceTier || 'NORMAL'}
${
  hybridResult?.structuredFactMatch
    ? `VERIFIED DETERMINISTIC FACT FOUND (Confidence: ${Math.round(hybridResult.structuredFactMatch.confidence * 100)}%):\n"${hybridResult.structuredFactMatch.answer}"\nInstruction: Use this exact verified fact in your response. Do not invent contradictory numbers or rules.`
    : hybridResult?.shouldFallback
    ? `STRICT "DON'T GUESS" MODE ACTIVE (Confidence: Low):\nThe requested question was not found in our verified knowledge base.\nInstruction: Politely inform the visitor that you don't have our verified policy on that exact item yet, reassure them that you've logged this for the management team, and offer to have someone call them back or let them book an initial consultation. DO NOT GUESS PRICING OR SPECIFIC POLICIES.`
    : hybridResult?.shouldClarify
    ? `LOW CONFIDENCE - CLARIFYING MODE:\nThe knowledge base partially matches this query.\nInstruction: Answer what you know, but ask a targeted clarifying question (e.g. residential vs commercial, issue severity, or specific service type) before providing exact commitments.`
    : `GROUNDED RAG MODE:\nAnswer from the provided knowledge base snippets. Append citations like [1] or [2] to facts.`
}

YOUR CAPABILITIES:
1. Answer visitor questions accurately using the knowledge base and services listed above.
2. CITATION INSTRUCTION: When your answer uses facts from the Knowledge Base sources above, append citation markers like [1] or [2] right after the referenced sentence.
3. If the user wants to book or schedule, offer clear time slots (e.g. 09:00 AM, 11:30 AM, 02:00 PM, 04:30 PM).
4. If they give their name, phone, or preferred time, encourage them to confirm their booking.
5. If the user asks to speak with a real human agent or support team, politely let them know they can click the "Talk to a Human" button or leave their contact details.
6. Keep replies concise, helpful, friendly, and under 3 paragraphs.

MANDATORY CONTRACTOR & INTAKE GUARDRAILS:
1. NEVER INVENT PRICING: Only quote rates or flat fees that exist word-for-word in our verified knowledge base. If not listed, invite the customer to describe their issue so our technician can provide an accurate quote on-site.
2. ESTIMATE DISCLAIMER: Whenever you mention an estimated price, range, or fee, you MUST explicitly append: "Please note that all initial estimates are preliminary and subject to on-site evaluation by our technician/contractor."
3. BOOKING VERIFICATION: Never tell the customer an appointment is confirmed until the system provides a confirmed booking record. If a requested time is given, politely say: "I have recorded your request for [Time/Date]. Our dispatch team will confirm your slot shortly."
4. ADVISORY URGENCY: If the visitor reports active life-safety hazards (e.g. smell of natural gas, live electrical sparks, severe flooding near outlets), advise them immediately to step away to safety, call emergency services (911) if needed, and contact our 24/7 emergency dispatch line directly.

SPECIAL PROTOCOL FOR CARDS:
If the user expresses clear interest in booking or asks for available dates/slots, append this EXACT JSON block at the very end of your response on its own line:
\`\`\`card
{
  "type": "slot_picker",
  "service": "<detected service or general inquiry>",
  "date": "${todayStr}",
  "slots": ["09:00 AM", "11:30 AM", "02:00 PM", "04:30 PM"]
}
\`\`\`

If the user asks for a price/quote and matches a known service, you can optionally include:
\`\`\`card
{
  "type": "quote_card",
  "service": "<service name>",
  "estimate": "<price or price range>"
}
\`\`\`
`;

    // 5. Build conversation history with intake action guidance
    const bookingIntent = extractBookingIntent(message, history, primaryConnectedForm?.name || 'Appointment');
    let dynamicMissingPrompt = '';
    if (bookingIntent.hasIntent) {
      if (bookingIntent.missingFields.length > 0) {
        dynamicMissingPrompt = `\n\nINTAKE ACTION GUIDANCE:\nThe visitor is interested in scheduling or an estimate. Missing required details: ${bookingIntent.missingFields.join(', ')}. Guide them conversationally to provide their preferred date/time and callback phone number so our team can schedule them!`;
      }
    }

    const conversationMessages = [
      { role: 'system' as const, content: `${systemPrompt}${dynamicMissingPrompt}` },
      ...history.slice(-6).map((m: ChatMessage) => ({
        role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ];

    // 6. Run LLM FIRST to generate a real answer to the visitor's question.
    //    Booking execution runs second and only attaches a confirmation card if
    //    the intent engine (now fixed with whole-word matching and informational-
    //    query guard) determines this is a genuine booking request.
    let rawReply = '';
    let cardData: Record<string, unknown> | null = null;

    // Lower temperature from 0.6 → 0.3 to reduce hallucination when the
    // system prompt is generic. The forms chat route already uses 0.3.
    const aiResponse = await callAI({
      messages: conversationMessages,
      temperature: hybridResult?.shouldFallback ? 0.2 : 0.3,
      maxTokens: 500,
    });

    rawReply = aiResponse.content || "Hello! How can I assist you today?";

    // Check for ```card ... ```
    const cardMatch = rawReply.match(/```card\s*([\s\S]*?)\s*```/);
    if (cardMatch) {
      try {
        cardData = JSON.parse(cardMatch[1]);
        rawReply = rawReply.replace(/```card[\s\S]*?```/, '').trim();
      } catch (err) {
        console.warn('[agent-chat] Failed to parse card JSON:', err);
      }
    }

    // 7. Check for real natural language appointment booking execution (AFTER LLM).
    //    The booking helper now uses whole-word keyword matching and an informational-
    //    query guard, so "website", "services", "jobs" etc. will NOT trigger a booking.
    const bookingResult = await tryExecuteChatBooking({
      tenantId: tenantId || null,
      workspaceId: workspaceId || null,
      formId: primaryConnectedForm?.id || null,
      agentId: agentId || null,
      serviceName: primaryConnectedForm?.name || 'Appointment & Consultation',
      message,
      history,
      imageUrl: body.imageUrl || undefined,
    });

    if (bookingResult && bookingResult.success) {
      cardData = {
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
        ? `\n\n📹 **Google Meet Video Call Link:** ${bookingResult.meetingUrl}`
        : '';

      // Append booking confirmation below the LLM answer (not replace it).
      const confirmationLine = `🎉 Your appointment request has been confirmed and booked for **${bookingResult.dateStr} at ${bookingResult.timeStr}**.${meetInfo}\n\nOur team has added this to the calendar and will follow up with you. You can also add it to your calendar below!`;
      rawReply = rawReply
        ? `${rawReply}\n\n${confirmationLine}`
        : `🎉 Great news, ${bookingResult.lead?.name || 'there'}! ${confirmationLine}`;
    }

    // Sync conversation into PublicChatSession and PublicChatMessage for real-time Live Chat board
    const syncRes = await syncChatConversation({
      sessionId: body.sessionId || null,
      tenantId: tenantId || null,
      workspaceId: workspaceId || null,
      formId: primaryConnectedForm?.id || null,
      agentId: agentId || null,
      visitorName: body.visitorName || null,
      visitorEmail: body.visitorEmail || null,
      visitorPhone: body.visitorPhone || null,
      userMessage: message,
      aiReply: rawReply,
      agentName: tenantName,
    });

    // ── Write per-turn trace (Phase 8: Traces) ──
    traceChatTurn({
      sessionId: syncRes?.sessionId || body.sessionId || null,
      tenantId: tenantId || null,
      workspaceId: workspaceId || null,
      agentId: agentId || null,
      formId: primaryConnectedForm?.id || null,
      userMessage: message,
      historyLength: history?.length || 0,
      retrievedDocIds: citations?.map((c: any) => c.id?.toString()) || [],
      confidenceTier: hybridResult?.confidenceTier || null,
      confidenceScore: hybridResult?.confidenceScore || null,
      modelUsed: aiResponse?.model || null,
      temperature: 0.3,
      promptTokens: aiResponse?.usage?.prompt_tokens || 0,
      completionTokens: aiResponse?.usage?.completion_tokens || 0,
      responseText: rawReply,
      cardType: cardData?.type || null,
      latencyMs: Date.now() - startTime,
      outcome: bookingResult?.success ? 'booked' : isEscalationIntent(message) ? 'escalated' : 'answered',
    });

    return NextResponse.json(
      {
        reply: rawReply,
        card: cardData,
        sessionId: syncRes.sessionId,
        suggestedForm: primaryConnectedForm || undefined,
        suggestedFormId: primaryConnectedForm?.id || undefined,
        citations: citations.length > 0 ? citations : undefined,
        confidence: hybridResult
          ? {
              score: hybridResult.confidenceScore,
              tier: hybridResult.confidenceTier,
              verified: hybridResult.confidenceTier === 'HIGH' || !!hybridResult.structuredFactMatch,
              category: hybridResult.structuredFactMatch?.category,
            }
          : undefined,
        chips: responseChips,
        businessName: tenantName,
      },
      { headers: CORS_HEADERS },
    );
  } catch (error) {
    console.error('[agent-chat] Fatal error:', error);
    // Trace the failure
    traceChatTurn({
      userMessage: body?.message || '',
      historyLength: body?.history?.length || 0,
      tenantId: tenantId || null,
      agentId: agentId || null,
      latencyMs: Date.now() - startTime,
      outcome: 'failed',
      failureCategory: 'llm_timeout',
      responseText: String(error?.message || error).slice(0, 500),
    });
    return NextResponse.json(
      {
        reply: "I'm having a little trouble checking our calendar right now. Please leave your name and phone number and our team will get right back to you!",
      },
      { status: 200, headers: CORS_HEADERS },
    );
  }
}

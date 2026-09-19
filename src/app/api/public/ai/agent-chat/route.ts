import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { callAI } from '@/lib/ai-client';
import { searchKnowledgeBase } from '@/lib/ai-knowledge';

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
        // Try resolving via Form (supports both tenant-scoped and standalone forms)
        const form = await db.form.findFirst({
          where: { OR: [{ id: agentId }, { slug: agentId }] },
          include: {
            tenant: { select: { id: true, name: true, phone: true, email: true } },
            workspace: { select: { id: true, name: true, brandingJson: true } },
          },
        });
        if (form) {
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

    // Hard requirement: we must have EITHER a tenantId OR a workspaceId.
    // No silent fallback — return a clear error if context is unresolved.
    if (!tenantId && !workspaceId) {
      return NextResponse.json(
        { error: 'Unable to resolve agent context. Provide a valid agentId, tenantId, or form slug.' },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    // ─── Direct Booking Action ──────────────────────────────────────────────
    if (action === 'confirm_booking' && bookingData) {
      const { name, phone, email, service, date, time, notes } = bookingData;

      const newLead = await db.lead.create({
        data: {
          tenantId: tenantId || null,
          name: name || 'Website Chat Visitor',
          phone: phone || '',
          email: email || '',
          serviceType: service || 'General Inquiry',
          notes: `[Booked via AI Chat]\nPreferred Slot: ${date || 'Anytime'} at ${time || 'Flexible'}\nNotes: ${notes || 'None'}`,
          status: 'new',
          source: 'ai_chat_widget',
        },
      });

      return NextResponse.json(
        {
          success: true,
          reply: `🎉 Great news, ${name || 'there'}! Your appointment request has been confirmed for **${date || 'upcoming'} at ${time || 'scheduled time'}**. Our team will contact you at ${phone || email || 'your number'} if any adjustments are needed.`,
          card: {
            type: 'booking_confirmation',
            leadId: newLead.id,
            name,
            service,
            date,
            time,
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

    // 2. Query Knowledge Base for Context & Citations
    //    Use workspaceId for standalone forms, tenantId for CRM-bound.
    const kbScope = workspaceId || tenantId;
    let kbContext = '';
    const citations: Array<{ id: number; title: string; url?: string; snippet: string }> = [];

    if (kbScope) {
      try {
        const searchResults = await searchKnowledgeBase(kbScope, message, 4);
        if (searchResults.length > 0) {
          kbContext = searchResults
            .map((r, i) => {
              const srcUrl = (r.documentTitle?.startsWith('http') ? r.documentTitle : undefined) || (r.content.match(/Source URL:\s*([^\s\n]+)/)?.[1]);
              citations.push({
                id: i + 1,
                title: r.documentTitle || `Document ${i + 1}`,
                url: srcUrl,
                snippet: r.content.slice(0, 240),
              });
              return `[Source ${i + 1}: ${r.documentTitle}]\n${r.content}`;
            })
            .join('\n\n');
        } else if (message.length > 15 && !['hi', 'hello', 'hey', 'start'].includes(message.trim().toLowerCase())) {
          // Record potential unanswered query
          try {
            const { recordUnansweredQuestion } = await import('@/lib/ai-unanswered-questions');
            recordUnansweredQuestion(kbScope, message, 'chat');
          } catch { /* ignore */ }
        }
      } catch (e) {
        console.warn('[agent-chat] KB search skipped/empty:', e);
      }
    }

    // ─── Human Handoff / Escalation Action ─────────────────────────────────
    if (action === 'request_human') {
      return NextResponse.json(
        {
          reply: `I have alerted our team! A representative from ${tenantName} will join this chat or reach out to you shortly. You can also leave your phone or email below.`,
          humanHandoff: true,
          status: 'human_requested',
          businessName: tenantName,
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
      : '- General Service & Repair\n- Consultation & Estimate';

    // 4. Construct AI Prompt
    const systemPrompt = `You are the friendly, professional 24/7 AI Website Employee & Booking Assistant for "${tenantName}".
Business Contact: Phone: ${tenantPhone || 'Available upon booking'}, Email: ${tenantEmail || 'support@' + tenantName.toLowerCase().replace(/\s+/g, '') + '.com'}

BUSINESS SERVICES & PRICING:
${servicesList}

KNOWLEDGE BASE & FAQS:
${kbContext || 'We provide top-tier professional field services with guaranteed customer satisfaction.'}

YOUR CAPABILITIES:
1. Answer visitor questions accurately using the knowledge base and services listed above.
2. CITATION INSTRUCTION: When your answer uses facts from the Knowledge Base sources above, append citation markers like [1] or [2] right after the referenced sentence.
3. If the user wants to book or schedule, offer clear time slots (e.g. 09:00 AM, 11:30 AM, 02:00 PM, 04:30 PM).
4. If they give their name, phone, or preferred time, encourage them to confirm their booking.
5. If the user asks to speak with a real human agent or support team, politely let them know they can click the "Talk to a Human" button or leave their contact details.
6. Keep replies concise, helpful, friendly, and under 3 paragraphs.

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

    // 5. Build conversation history
    const conversationMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...history.slice(-6).map((m: ChatMessage) => ({
        role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ];

    // 6. Call AI
    const aiResponse = await callAI(conversationMessages, {
      temperature: 0.7,
      maxTokens: 500,
    });

    let rawReply = aiResponse.text || "Hello! How can I assist you today?";
    let cardData: Record<string, unknown> | null = null;

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

    return NextResponse.json(
      {
        reply: rawReply,
        card: cardData,
        citations: citations.length > 0 ? citations : undefined,
        businessName: tenantName,
      },
      { headers: CORS_HEADERS },
    );
  } catch (error) {
    console.error('[agent-chat] Fatal error:', error);
    return NextResponse.json(
      {
        reply: "I'm having a little trouble checking our calendar right now. Please leave your name and phone number and our team will get right back to you!",
      },
      { status: 200, headers: CORS_HEADERS },
    );
  }
}

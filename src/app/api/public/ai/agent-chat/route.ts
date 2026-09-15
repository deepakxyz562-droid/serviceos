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

    // 1. Resolve Tenant
    let tenantId = explicitTenantId;
    let tenantName = 'Service Pro';
    let tenantPhone = '';
    let tenantEmail = '';

    if (agentId) {
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
        const form = await db.form.findFirst({
          where: { OR: [{ id: agentId }, { slug: agentId }] },
          include: { tenant: { select: { id: true, name: true, phone: true, email: true } } },
        });
        if (form && form.tenant) {
          tenantId = form.tenant.id;
          tenantName = form.tenant.name;
          tenantPhone = form.tenant.phone || '';
          tenantEmail = form.tenant.email || '';
        }
      }
    }

    if (!tenantId) {
      // Fallback to first active tenant if testing/unspecified
      const fallbackTenant = await db.tenant.findFirst({
        select: { id: true, name: true, phone: true, email: true },
      });
      if (fallbackTenant) {
        tenantId = fallbackTenant.id;
        tenantName = fallbackTenant.name;
        tenantPhone = fallbackTenant.phone || '';
        tenantEmail = fallbackTenant.email || '';
      } else {
        return NextResponse.json(
          { error: 'Tenant context could not be resolved' },
          { status: 400, headers: CORS_HEADERS },
        );
      }
    }

    // ─── Direct Booking Action ──────────────────────────────────────────────
    if (action === 'confirm_booking' && bookingData) {
      const { name, phone, email, service, date, time, notes } = bookingData;
      
      const newLead = await db.lead.create({
        data: {
          tenantId,
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

    // 2. Query Knowledge Base for Context
    let kbContext = '';
    try {
      const searchResults = await searchKnowledgeBase(tenantId, message, 4);
      if (searchResults.length > 0) {
        kbContext = searchResults
          .map((r) => `[Document: ${r.title}]\n${r.snippet}`)
          .join('\n\n');
      }
    } catch (e) {
      console.warn('[agent-chat] KB search skipped/empty:', e);
    }

    // 3. Fetch Existing Business Services & Today's Open Slots
    const todayStr = new Date().toISOString().split('T')[0];
    const services = await db.serviceItem.findMany({
      where: { tenantId },
      select: { name: true, description: true, defaultPrice: true },
      take: 8,
    });

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
2. If the user wants to book or schedule, offer clear time slots (e.g. 09:00 AM, 11:30 AM, 02:00 PM, 04:30 PM).
3. If they give their name, phone, or preferred time, encourage them to confirm their booking.
4. Keep replies concise, helpful, friendly, and under 3 paragraphs.

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

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { callAI } from '@/lib/ai-client';
import { sendWhatsAppMessage } from '@/lib/whatsapp-send';

export const dynamic = 'force-dynamic';

/**
 * POST /api/whatsapp/webhook
 *
 * WhatsApp Business API inbound message webhook.
 *
 * Receives incoming WhatsApp messages from customers → routes them to the
 * tenant's AI Form Agent for a conversational response.
 *
 * Flow:
 *   1. Customer sends WhatsApp message to the business's WhatsApp number
 *   2. Meta/WhatsApp API forwards the message to this webhook
 *   3. This route looks up the tenant by the recipient phone number
 *   4. Fetches the tenant's active FormAgent config
 *   5. Calls the AI (callAI) with the agent's persona + knowledge
 *   6. Sends the AI response back via WhatsApp (sendWhatsAppMessage)
 *
 * Environment variables needed:
 *   WHATSAPP_VERIFY_TOKEN — for webhook verification (GET endpoint)
 *   WhatsApp API credentials configured in tenant settings
 */

// GET — WhatsApp webhook verification
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'fieseros_verify';

  if (mode === 'subscribe' && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

// POST — Receive inbound WhatsApp message → route to AI agent
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Parse WhatsApp webhook payload
    // Meta's WhatsApp Business API sends: entry[].changes[].value.messages[]
    const entries = body?.entry || [];
    
    for (const entry of entries) {
      const changes = entry?.changes || [];
      
      for (const change of changes) {
        const value = change?.value;
        if (!value) continue;

        const messages = value?.messages || [];
        const metadata = value?.metadata;
        const contacts = value?.contacts || [];

        // The business's WhatsApp phone number (identifies the tenant)
        const businessPhoneNumber = metadata?.phone_number_id;
        const displayPhoneNumber = metadata?.display_phone_number;

        for (const message of messages) {
          const from = message?.from; // customer's phone number
          const messageText = message?.text?.body || message?.button?.text || '';
          const contactName = contacts.find((c: any) => c.wa_id === from)?.profile?.name || 'Customer';

          if (!from || !messageText) continue;

          // 1. Find the tenant by WhatsApp phone number
          const tenant = await db.tenant.findFirst({
            where: {
              whatsappPhone: displayPhoneNumber || from,
            },
            select: {
              id: true,
              name: true,
              whatsappConfigJson: true,
            },
          }).catch(() => null);

          if (!tenant) {
            console.warn('[whatsapp-webhook] No tenant found for phone:', displayPhoneNumber);
            continue;
          }

          // 2. Find the tenant's active FormAgent
          const agent = await db.formAgent.findFirst({
            where: {
              tenantId: tenant.id,
              status: 'active',
            },
          }).catch(() => null);

          // 3. Build AI context
          const agentConfig = agent?.configJson as Record<string, unknown> || {};
          const knowledge = (agentConfig.knowledge as Record<string, unknown>) || {};
          const systemPrompt = String(knowledge.systemPrompt || `You are a helpful assistant for ${tenant.name}.`);
          const guardrails = (knowledge.guardrails as string[]) || [];
          const faqPairs = (knowledge.faqPairs as Array<{ question: string; answer: string }>) || [];
          const agentName = agent?.name || agentConfig.name || 'AI Assistant';
          const voiceTone = agent?.voiceTone || agentConfig.voiceTone || 'friendly';

          const knowledgeContext = [
            `Agent Persona: You are ${agentName}, working for ${tenant.name}.`,
            `Tone: ${voiceTone}.`,
            `System Prompt: ${systemPrompt}`,
            guardrails.length ? `Guardrails:\n- ${guardrails.join('\n- ')}` : '',
            faqPairs.length ? `FAQs:\n${faqPairs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')}` : '',
          ].filter(Boolean).join('\n\n');

          // 4. Call the AI
          let replyText = '';
          try {
            const aiRes = await callAI({
              messages: [
                {
                  role: 'system',
                  content: `${knowledgeContext}\n\nKeep responses concise (max 200 words) and formatted for WhatsApp (no markdown). Respond helpfully to the customer's message.`,
                },
                { role: 'user', content: messageText },
              ],
              temperature: 0.4,
            });
            replyText = aiRes.content || '';
          } catch (aiError) {
            console.error('[whatsapp-webhook] AI call failed:', aiError);
            replyText = `Hi! I'm ${agentName} from ${tenant.name}. I received your message but I'm having trouble responding right now. Please try again or call us directly.`;
          }

          // 5. Send the AI response back via WhatsApp
          if (replyText) {
            try {
              await sendWhatsAppMessage({
                to: from,
                message: replyText,
                tenantId: tenant.id,
              });
            } catch (sendError) {
              console.error('[whatsapp-webhook] Failed to send reply:', sendError);
            }
          }

          // 6. Store the conversation in the CRM (if tenant has conversations)
          try {
            const conversationId = `wa_${from}_${tenant.id}`;
            await db.conversation.upsert({
              where: { conversationId },
              create: {
                conversationId,
                customerPhone: from,
                customerName: contactName,
                tenantId: tenant.id,
                channel: 'whatsapp',
                lastMessageAt: new Date(),
                lastMessageBody: messageText,
                lastDirection: 'inbound',
              },
              update: {
                customerName: contactName,
                lastMessageAt: new Date(),
                lastMessageBody: messageText,
                lastDirection: 'inbound',
              },
            });
          } catch {
            // Conversation storage is best-effort
          }
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[whatsapp-webhook POST]', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 },
    );
  }
}

/**
 * Unified Live Chat Handoff Service (Text.com / Intercom Parity)
 *
 * Centralized service to handle human escalation across all conversational channels:
 * - AI Chatbot Studio & Simulator
 * - Public AI Widget (/api/public/ai/agent-chat)
 * - Standalone Public Chat (/chat/[agentId])
 * - WhatsApp & External Connectors
 */

import { db } from '@/lib/db';
import { createNotification } from '@/lib/notifications';
import { checkAgentAvailability, type AgentAvailabilityResult } from '@/lib/presence';

export interface ChatHistoryMessage {
  role?: 'user' | 'assistant' | 'system';
  sender?: 'user' | 'bot' | 'system' | 'agent';
  content?: string;
  text?: string;
}

export interface VisitorInfo {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  fingerprint?: string | null;
}

export interface HandoffRequest {
  tenantId?: string | null;
  workspaceId?: string | null;
  formId?: string | null;
  agentId?: string | null;
  agentName?: string | null;
  visitor?: VisitorInfo;
  message?: string;
  history?: ChatHistoryMessage[];
  existingSessionId?: string | null;
  customReason?: string;
}

export interface HandoffResult {
  success: boolean;
  liveSessionId: string | null;
  status: 'waiting_for_agent' | 'failed';
  reply: string;
  escalatedToHuman: boolean;
  agentAvailable: boolean;
  availability: AgentAvailabilityResult;
  metadata?: Record<string, unknown>;
}

// Escalation trigger keywords
export const ESCALATION_KEYWORDS = [
  'human',
  'live agent',
  'real person',
  'speak to a person',
  'talk to a person',
  'talk to a human',
  'speak to a human',
  'operator',
  'representative',
  'live chat',
  'support agent',
  'customer service',
  'transfer me',
  'escalate',
  'agent please',
  'talk to someone',
  'speak with someone',
  'help desk',
];

/**
 * Check if user message expresses escalation intent to a human operator.
 */
export function isEscalationIntent(message: string): boolean {
  if (!message || typeof message !== 'string') return false;
  const lower = message.toLowerCase().trim();
  return ESCALATION_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Extract captured visitor entities from chat history for operator context summary.
 */
export function extractTranscriptSummary(
  history: ChatHistoryMessage[] = [],
  currentMessage = ''
): {
  recap: string;
  capturedEmail?: string;
  capturedPhone?: string;
} {
  let capturedEmail: string | undefined;
  let capturedPhone: string | undefined;

  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const phoneRegex = /(?:\+?(\d{1,3}))?[-. (]*(\d{3})[-. )]*(\d{3})[-. ]*(\d{4})(?: *x(\d+))?/;

  const allTexts = [
    ...history.map((h) => h.content || h.text || ''),
    currentMessage,
  ];

  for (const text of allTexts) {
    if (!capturedEmail) {
      const match = text.match(emailRegex);
      if (match) capturedEmail = match[0];
    }
    if (!capturedPhone) {
      const match = text.match(phoneRegex);
      if (match) capturedPhone = match[0];
    }
  }

  const lastUserMessages = history
    .filter((h) => (h.role === 'user' || h.sender === 'user') && (h.content || h.text))
    .slice(-3)
    .map((h) => h.content || h.text);

  const recap = lastUserMessages.length > 0
    ? `Visitor inquiries: ${lastUserMessages.join(' ➔ ')}`
    : 'Visitor initiated live chat escalation.';

  return { recap, capturedEmail, capturedPhone };
}

/**
 * Executes a human escalation handoff:
 * 1. Creates/Updates PublicChatSession with status 'waiting_for_agent'.
 * 2. Structures metadata with captured summary and visitor contact details.
 * 3. Seeds conversation history into PublicChatMessage for the operator console.
 * 4. Inserts a prominent System Alert message in the session.
 */
export async function requestHumanHandoff(
  request: HandoffRequest
): Promise<HandoffResult> {
  const {
    tenantId: rawTenantId,
    workspaceId,
    formId,
    agentId,
    agentName = 'AI Assistant',
    visitor = {},
    message = '',
    history = [],
    existingSessionId,
    customReason,
  } = request;

  try {
    // Resolve tenantId & workspaceId from request or linked Form/Agent
    let tenantId = rawTenantId || null;
    let effectiveWorkspaceId = workspaceId || null;

    if ((!tenantId || !effectiveWorkspaceId) && formId) {
      const formRecord = await db.form.findUnique({
        where: { id: formId },
        select: { tenantId: true, workspaceId: true },
      }).catch(() => null);
      if (formRecord) {
        tenantId = tenantId || formRecord.tenantId;
        effectiveWorkspaceId = effectiveWorkspaceId || formRecord.workspaceId;
      }
    }

    if ((!tenantId || !effectiveWorkspaceId) && agentId) {
      const agentRecord = await db.formAgent.findUnique({
        where: { id: agentId },
        select: { tenantId: true, workspaceId: true },
      }).catch(() => null);
      if (agentRecord) {
        tenantId = tenantId || agentRecord.tenantId;
        effectiveWorkspaceId = effectiveWorkspaceId || agentRecord.workspaceId;
      }
    }

    if (!tenantId && !effectiveWorkspaceId) {
      const firstTenant = await db.tenant.findFirst({ select: { id: true } }).catch(() => null);
      tenantId = firstTenant?.id || null;
    }

    const { recap, capturedEmail, capturedPhone } = extractTranscriptSummary(
      history,
      message
    );

    const visitorEmail = visitor.email || capturedEmail || null;
    const visitorPhone = visitor.phone || capturedPhone || null;
    const visitorName = visitor.name || 'Chat Visitor';

    let session: any = null;

    if (existingSessionId) {
      // Check if session exists
      session = await db.publicChatSession.findUnique({
        where: { id: existingSessionId },
      }).catch(() => null);
    }

    const metadata = {
      source: 'ai_chatbot_escalation',
      agentId: agentId || null,
      agentName,
      escalationReason: customReason || 'User requested human operator',
      summary: recap,
      escalatedAt: new Date().toISOString(),
    };

    if (session) {
      // Update existing session to waiting_for_agent
      session = await db.publicChatSession.update({
        where: { id: session.id },
        data: {
          status: 'waiting_for_agent',
          unreadCount: (session.unreadCount || 0) + 1,
          lastMessageAt: new Date(),
          visitorName: session.visitorName || visitorName,
          visitorEmail: session.visitorEmail || visitorEmail,
          visitorPhone: session.visitorPhone || visitorPhone,
          metadataJson: JSON.stringify({
            ...(session.metadataJson ? JSON.parse(session.metadataJson) : {}),
            ...metadata,
          }),
        },
      });
    } else if (tenantId || effectiveWorkspaceId) {
      // Create new session in waiting_for_agent status
      session = await db.publicChatSession.create({
        data: {
          tenantId: tenantId || null,
          workspaceId: effectiveWorkspaceId || null,
          formId: formId || null,
          visitorName,
          visitorEmail,
          visitorPhone,
          visitorFingerprint: visitor.fingerprint || null,
          status: 'waiting_for_agent',
          unreadCount: 1,
          lastMessageAt: new Date(),
          metadataJson: JSON.stringify(metadata),
        },
      });
    }

    const liveSessionId = session?.id || null;

    if (liveSessionId) {
      // Seed prior chat history for operator console context
      if (Array.isArray(history) && history.length > 0) {
        for (const h of history.slice(-10)) {
          const body = h.content || h.text;
          if (!body) continue;
          const isUser = h.role === 'user' || h.sender === 'user';
          await db.publicChatMessage.create({
            data: {
              sessionId: liveSessionId,
              senderType: isUser ? 'visitor' : 'system',
              senderName: isUser ? visitorName : agentName,
              body: String(body),
            },
          }).catch(() => {});
        }
      }

      // Add the user's triggering message if provided
      if (message) {
        await db.publicChatMessage.create({
          data: {
            sessionId: liveSessionId,
            senderType: 'visitor',
            senderName: visitorName,
            body: message,
          },
        }).catch(() => {});
      }

      // Add system escalation alert banner
      await db.publicChatMessage.create({
        data: {
          sessionId: liveSessionId,
          senderType: 'system',
          senderName: 'System',
          body: `🔔 Visitor requested live human agent escalation. Summary: ${recap}`,
        },
      }).catch(() => {});

      // Dispatch urgent in-app notification to all tenant/workspace operators and admins
      try {
        const recipients = await db.user.findMany({
          where: {
            ...(tenantId ? { tenantId } : { workspaceId: effectiveWorkspaceId }),
            role: { in: ['owner', 'admin', 'operator', 'agent'] },
            isActive: true,
          },
          select: { id: true },
        });

        const snippet = message.length > 90 ? `${message.slice(0, 87)}...` : message;
        const alertText = `${visitorName || 'A visitor'} requested live specialist assistance on ${agentName}${snippet ? `: "${snippet}"` : ''}`;

        await Promise.all(
          recipients.map((r) =>
            createNotification({
              tenantId: tenantId || effectiveWorkspaceId || '',
              recipientId: r.id,
              type: 'reminder',
              category: 'customer',
              title: '🔔 Live Agent Escalation',
              message: alertText,
              priority: 'urgent',
              actionUrl: `/?view=liveChat&session=${liveSessionId}`,
              actionLabel: 'Join Live Chat',
              senderType: 'system',
              metadataJson: JSON.stringify({
                sessionId: liveSessionId,
                agentName,
                visitorName,
                source: 'live_chat_escalation',
              }),
            }).catch(() => null)
          )
        );
      } catch (notifErr) {
        console.warn('[handoff-service] In-app notification creation failed:', notifErr);
      }
    }

    const availability = await checkAgentAvailability(tenantId, effectiveWorkspaceId);
    const isAvailable = availability.isOnline && availability.isWithinHours;

    const reply = isAvailable
      ? `I have alerted our live operator team! A specialist from ${agentName} is currently online and will join this conversation momentarily. You can also share any additional details below.`
      : `Our live specialists are currently offline or away (Operating Hours: ${availability.businessHoursText}). I have recorded your inquiry and alerted our team! Please leave your email or phone number below, or book a time directly on our calendar so we can follow up with you.`;

    return {
      success: true,
      liveSessionId,
      status: 'waiting_for_agent',
      reply,
      escalatedToHuman: true,
      agentAvailable: isAvailable,
      availability,
      metadata,
    };
  } catch (error) {
    console.error('[handoff-service] Escalation failed:', error);
    const fallbackAvailability: AgentAvailabilityResult = {
      isOnline: false,
      isWithinHours: true,
      businessHoursText: 'Mon–Fri 8:00 AM – 6:00 PM',
      onlineCount: 0,
    };
    return {
      success: false,
      liveSessionId: null,
      status: 'failed',
      reply: `I've notified our team! An agent will review your inquiry as soon as possible. Please share your email or phone number so we can reach you.`,
      escalatedToHuman: true,
      agentAvailable: false,
      availability: fallbackAvailability,
    };
  }
}

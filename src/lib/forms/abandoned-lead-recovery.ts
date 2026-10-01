/**
 * Abandoned Lead Recovery Service — Chatley-Parity Sales Outreach
 * ===============================================================
 * Automatically identifies website visitors or callers who started an inquiry,
 * provided contact information (phone number or email), but did not finalize
 * their booking or form submission.
 *
 * Provides:
 *   1. scanAbandonedSessions(tenantId, idleMinutes)
 *   2. triggerReengagementOutreach(sessionId, options)
 */

import { prisma } from '@/lib/prisma';
import { sendSms } from '@/lib/sms-send';

export interface AbandonedSessionCandidate {
  sessionId: string;
  tenantId: string;
  visitorName?: string;
  visitorPhone?: string;
  visitorEmail?: string;
  lastMessageSnippet: string;
  intentDetected?: string;
  urgencyDetected?: string;
  lastActiveAt: Date;
  minutesIdle: number;
}

export async function scanAbandonedSessions({
  tenantId,
  idleMinutes = 15,
  maxAgeHours = 48,
}: {
  tenantId?: string;
  idleMinutes?: number;
  maxAgeHours?: number;
}): Promise<AbandonedSessionCandidate[]> {
  const now = new Date();
  const idleThreshold = new Date(now.getTime() - idleMinutes * 60 * 1000);
  const maxAgeThreshold = new Date(now.getTime() - maxAgeHours * 60 * 60 * 1000);

  try {
    // Find sessions that have had activity between maxAge and idleThreshold
    const candidateSessions = await (prisma as any).publicChatSession.findMany({
      where: {
        ...(tenantId ? { tenantId } : {}),
        updatedAt: {
          gte: maxAgeThreshold,
          lte: idleThreshold,
        },
        // Only consider active sessions (not yet marked closed/converted)
        status: { in: ['ACTIVE', 'active', 'IDLE', 'idle'] },
      },
      include: {
        chatTurns: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      take: 50,
    });

    const results: AbandonedSessionCandidate[] = [];

    for (const session of candidateSessions) {
      // Check if session has a valid captured phone or email
      const phone = session.visitorPhone || extractPhoneFromTurns(session.chatTurns);
      const email = session.visitorEmail || extractEmailFromTurns(session.chatTurns);
      const name = session.visitorName || extractNameFromTurns(session.chatTurns);

      if (phone || email) {
        const lastTurn = session.chatTurns?.[0];
        const lastActive = session.updatedAt || new Date();
        const diffMinutes = Math.round((now.getTime() - new Date(lastActive).getTime()) / (60 * 1000));

        results.push({
          sessionId: session.id,
          tenantId: session.tenantId,
          visitorName: name,
          visitorPhone: phone,
          visitorEmail: email,
          lastMessageSnippet: lastTurn?.userMessage || 'Inquiry initiated',
          intentDetected: lastTurn?.intentDetected || 'booking',
          urgencyDetected: lastTurn?.urgencyScore || 'normal',
          lastActiveAt: lastActive,
          minutesIdle: diffMinutes,
        });
      }
    }

    return results;
  } catch (error) {
    console.error('[AbandonedRecovery] scan error:', error);
    return [];
  }
}

export async function triggerReengagementOutreach({
  candidate,
  agentName = 'Our Team',
  companyName = 'our team',
  customMessage,
}: {
  candidate: AbandonedSessionCandidate;
  agentName?: string;
  companyName?: string;
  customMessage?: string;
}): Promise<{ success: boolean; channel?: string; messageId?: string; error?: string }> {
  const nameGreeting = candidate.visitorName ? `Hi ${candidate.visitorName}` : 'Hi there';

  const defaultSms = `${nameGreeting}! This is ${agentName} from ${companyName}. We noticed you started an inquiry earlier. Would you like us to finalize your quote or reserve your appointment time? Reply YES to continue.`;
  const messageBody = customMessage || defaultSms;

  if (candidate.visitorPhone) {
    try {
      const res = await sendSms({
        to: candidate.visitorPhone,
        message: messageBody,
        tenantId: candidate.tenantId,
      });

      // Mark session as re-engaged
      await (prisma as any).publicChatSession.update({
        where: { id: candidate.sessionId },
        data: {
          status: 'RE_ENGAGED',
          updatedAt: new Date(),
        },
      }).catch(() => {});

      return { success: true, channel: 'sms', messageId: res.messageId };
    } catch (err: any) {
      return { success: false, error: err?.message || 'SMS delivery failed' };
    }
  }

  return { success: false, error: 'No reachable phone number' };
}

function extractPhoneFromTurns(turns: any[] = []): string | undefined {
  const phoneRegex = /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/;
  for (const turn of turns) {
    const match = (turn.userMessage || '').match(phoneRegex);
    if (match) return match[0];
  }
  return undefined;
}

function extractEmailFromTurns(turns: any[] = []): string | undefined {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/;
  for (const turn of turns) {
    const match = (turn.userMessage || '').match(emailRegex);
    if (match) return match[0];
  }
  return undefined;
}

function extractNameFromTurns(turns: any[] = []): string | undefined {
  const nameRegex = /(?:my name is|i am|i'm|this is)\s+([A-Za-z]{2,25})/i;
  for (const turn of turns) {
    const match = (turn.userMessage || '').match(nameRegex);
    if (match && !['yes', 'no', 'here', 'ready', 'interested'].includes(match[1].toLowerCase())) {
      return match[1];
    }
  }
  return undefined;
}

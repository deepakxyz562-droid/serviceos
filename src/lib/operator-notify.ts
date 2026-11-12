import { db } from '@/lib/db';
import { createNotification } from '@/lib/notifications';
import { sendWebPushToUser } from '@/lib/web-push-send';

export interface NotifyLiveChatEscalationInput {
  tenantId?: string | null;
  workspaceId?: string | null;
  sessionId: string;
  conversationId?: string | null;
  visitorName?: string | null;
  agentName?: string | null;
  message?: string | null;
  title?: string;
  isFollowUp?: boolean;
  recipientIds?: string[];
}

/**
 * Notify active tenant operators across BOTH:
 *   1. In-app AppNotification rows (read by Web & Mobile foreground poller)
 *   2. Web Push + Expo Push subscriptions (read by Mobile lock-screen/background push)
 *
 * Designed to never throw so chat/handoff flows remain resilient if push
 * delivery or DB queries encounter transient errors.
 */
export async function notifyTenantLiveChatEscalation(
  input: NotifyLiveChatEscalationInput,
): Promise<{ recipientCount: number; pushAttempted: number; pushDelivered: number }> {
  let targetTenantId = input.tenantId?.trim() || '';

  if (!targetTenantId && input.workspaceId) {
    const ws = await db.workspace
      .findUnique({
        where: { id: input.workspaceId },
        select: { tenantId: true },
      })
      .catch(() => null);
    targetTenantId = ws?.tenantId?.trim() || '';
  }

  if (!targetTenantId && input.sessionId) {
    const session = await db.publicChatSession
      .findUnique({
        where: { id: input.sessionId },
        select: { tenantId: true },
      })
      .catch(() => null);
    targetTenantId = session?.tenantId?.trim() || '';
  }

  if (!targetTenantId) {
    return { recipientCount: 0, pushAttempted: 0, pushDelivered: 0 };
  }

  let recipientIds = Array.isArray(input.recipientIds)
    ? Array.from(new Set(input.recipientIds.filter(Boolean)))
    : [];

  if (recipientIds.length === 0) {
    const users = await db.user
      .findMany({
        where: {
          tenantId: targetTenantId,
          isActive: true,
          role: { notIn: ['customer', 'client', 'guest'] },
        },
        select: { id: true },
        take: 25,
      })
      .catch(() => []);
    recipientIds = users.map((u) => u.id);
  }

  if (recipientIds.length === 0) {
    return { recipientCount: 0, pushAttempted: 0, pushDelivered: 0 };
  }

  const targetConversationId = input.conversationId || `live_chat_${input.sessionId}`;
  const visitorLabel = input.visitorName?.trim() || 'A visitor';
  const businessLabel = input.agentName?.trim() || 'your business page';
  const rawSnippet = input.message?.trim() || '';
  const snippet = rawSnippet.length > 90 ? `${rawSnippet.slice(0, 87)}...` : rawSnippet;

  const title =
    input.title ||
    (input.isFollowUp ? '💬 Live Chat Customer Reply' : '🔔 Live Agent Escalation');

  const body = input.isFollowUp
    ? `${visitorLabel} on ${businessLabel}: "${snippet || 'Sent a new message'}"`
    : `${visitorLabel} wants to chat with a team member on ${businessLabel}${snippet ? `: "${snippet}"` : ''}`;

  const actionUrl = `/?product=bgos&view=omnichannel&conversation=${targetConversationId}`;

  const metadataJson = JSON.stringify({
    sessionId: input.sessionId,
    conversationId: targetConversationId,
    agentName: businessLabel,
    visitorName: visitorLabel,
    source: 'live_chat_escalation',
    isFollowUp: !!input.isFollowUp,
  });

  const pushData: Record<string, unknown> = {
    route: '/inbox',
    destination: 'inbox',
    conversationId: targetConversationId,
    sessionId: input.sessionId,
    source: 'live_chat_escalation',
    visitorName: visitorLabel,
  };

  let pushAttempted = 0;
  let pushDelivered = 0;

  await Promise.all(
    recipientIds.map(async (recipientId) => {
      await Promise.allSettled([
        createNotification({
          tenantId: targetTenantId,
          recipientId,
          type: 'reminder',
          category: 'customer',
          title,
          message: body,
          priority: 'urgent',
          actionUrl,
          actionLabel: 'Open in Inbox',
          senderType: 'system',
          sourceType: 'live_chat_session',
          sourceId: input.sessionId,
          metadataJson,
        }),
        (async () => {
          const pushResult = await sendWebPushToUser(recipientId, targetTenantId, {
            title,
            body,
            url: actionUrl,
            tag: `live-chat-${input.sessionId}`,
            requireInteraction: !input.isFollowUp,
            data: pushData,
          });
          pushAttempted += pushResult.sent + pushResult.failed;
          pushDelivered += pushResult.sent;
        })(),
      ]);
    }),
  );

  return {
    recipientCount: recipientIds.length,
    pushAttempted,
    pushDelivered,
  };
}

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDb, mockCreateNotification, mockSendWebPushToUser } = vi.hoisted(() => ({
  mockDb: {
    workspace: { findUnique: vi.fn() },
    publicChatSession: { findUnique: vi.fn() },
    user: { findMany: vi.fn() },
  },
  mockCreateNotification: vi.fn(),
  mockSendWebPushToUser: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/lib/notifications', () => ({ createNotification: mockCreateNotification }));
vi.mock('@/lib/web-push-send', () => ({ sendWebPushToUser: mockSendWebPushToUser }));

import { notifyTenantLiveChatEscalation } from '@/lib/operator-notify';
import { notificationDestination } from '../../bgosmobile/src/lib/notification-routing';

describe('notifyTenantLiveChatEscalation & mobile deep link routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateNotification.mockResolvedValue({ id: 'notif_1' });
    mockSendWebPushToUser.mockResolvedValue({
      sent: 1,
      failed: 0,
      deactivated: 0,
      notConfigured: false,
    });
  });

  it('creates an urgent in-app notification and delivers Expo/Web push to all active tenant operators', async () => {
    mockDb.user.findMany.mockResolvedValue([{ id: 'owner_1' }, { id: 'mgr_2' }]);

    const res = await notifyTenantLiveChatEscalation({
      tenantId: 'tenant_1',
      sessionId: 'sess_abc',
      conversationId: 'live_chat_sess_abc',
      visitorName: 'Aarav',
      agentName: 'Abc Kirana',
      message: 'Need to speak with the store owner about my bulk order.',
    });

    expect(res).toEqual({ recipientCount: 2, pushAttempted: 2, pushDelivered: 2 });
    expect(mockCreateNotification).toHaveBeenCalledTimes(2);
    expect(mockSendWebPushToUser).toHaveBeenCalledTimes(2);

    expect(mockSendWebPushToUser).toHaveBeenNthCalledWith(
      1,
      'owner_1',
      'tenant_1',
      expect.objectContaining({
        title: '🔔 Live Agent Escalation',
        tag: 'live-chat-sess_abc',
        requireInteraction: true,
        data: {
          route: '/inbox',
          destination: 'inbox',
          conversationId: 'live_chat_sess_abc',
          sessionId: 'sess_abc',
          source: 'live_chat_escalation',
          visitorName: 'Aarav',
        },
      }),
    );

    const pushData = mockSendWebPushToUser.mock.calls[0][2].data;
    expect(notificationDestination(pushData)).toBe(
      '/inbox?conversationId=live_chat_sess_abc&sessionId=sess_abc',
    );
  });

  it('resolves tenantId from workspaceId and formats follow-up customer replies when AI is paused', async () => {
    mockDb.workspace.findUnique.mockResolvedValue({ tenantId: 'tenant_ws' });

    const res = await notifyTenantLiveChatEscalation({
      tenantId: null,
      workspaceId: 'ws_1',
      sessionId: 'sess_xyz',
      visitorName: 'Priya',
      agentName: 'Style Studio',
      message: 'Are you available now?',
      isFollowUp: true,
      recipientIds: ['owner_ws'],
    });

    expect(res).toEqual({ recipientCount: 1, pushAttempted: 1, pushDelivered: 1 });
    expect(mockSendWebPushToUser).toHaveBeenCalledWith(
      'owner_ws',
      'tenant_ws',
      expect.objectContaining({
        title: '💬 Live Chat Customer Reply',
        body: 'Priya on Style Studio: "Are you available now?"',
        requireInteraction: false,
      }),
    );
  });

  it('routes escalation notifications by source/sessionId even if explicit route is missing', () => {
    expect(
      notificationDestination({
        source: 'live_chat_escalation',
        conversationId: 'conv_db_1',
      }),
    ).toBe('/inbox?conversationId=conv_db_1');
    expect(notificationDestination({ url: '/?product=bgos&view=omnichannel' })).toBe('/inbox');
  });
});

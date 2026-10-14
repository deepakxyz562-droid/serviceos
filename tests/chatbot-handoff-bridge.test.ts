import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  tenantFind: vi.fn(),
  userFindMany: vi.fn(),
  formFindUnique: vi.fn(),
  formAgentFindUnique: vi.fn(),
  sessionFindUnique: vi.fn(),
  sessionCreate: vi.fn(),
  sessionUpdate: vi.fn(),
  messageCreate: vi.fn(),
  conversationFindFirst: vi.fn(),
  conversationCreate: vi.fn(),
  inboxMessageCreate: vi.fn(),
  notificationCreate: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    tenant: { findFirst: mocks.tenantFind },
    user: { findMany: mocks.userFindMany },
    form: { findUnique: mocks.formFindUnique },
    formAgent: { findUnique: mocks.formAgentFindUnique },
    publicChatSession: {
      findUnique: mocks.sessionFindUnique,
      create: mocks.sessionCreate,
      update: mocks.sessionUpdate,
    },
    publicChatMessage: {
      create: mocks.messageCreate,
    },
    conversation: {
      findFirst: mocks.conversationFindFirst,
      create: mocks.conversationCreate,
    },
    inboxMessage: {
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
      create: mocks.inboxMessageCreate,
    },
  },
}));

vi.mock('@/lib/notifications', () => ({
  createNotification: mocks.notificationCreate,
}));

vi.mock('@/lib/presence', () => ({
  checkAgentAvailability: vi.fn().mockResolvedValue({
    isOnline: true,
    isWithinHours: true,
    businessHoursText: '9 AM - 6 PM',
  }),
}));

import { requestHumanHandoff } from '@/lib/chat/handoff-service';

describe('Chatbot Human Handoff Bridge & Inbox Routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.tenantFind.mockResolvedValue({ id: 'tenant-123' });
    mocks.sessionCreate.mockResolvedValue({
      id: 'sess-xyz',
      tenantId: 'tenant-123',
      visitorName: 'Priya Sharma',
      visitorEmail: 'priya@gmail.com',
      visitorPhone: '+91 98765 43210',
    });
    mocks.sessionFindUnique.mockResolvedValue({
      id: 'sess-xyz',
      tenantId: 'tenant-123',
      visitorName: 'Priya Sharma',
      visitorEmail: 'priya@gmail.com',
      visitorPhone: '+91 98765 43210',
    });
    mocks.messageCreate.mockImplementation(async ({ data }) => ({
      id: `pcm-${Date.now()}-${Math.random()}`,
      ...data,
      createdAt: new Date(),
    }));
    mocks.conversationFindFirst.mockResolvedValue(null);
    mocks.conversationCreate.mockImplementation(async ({ data }) => ({
      id: 'conv-pk-1',
      ...data,
    }));
    mocks.inboxMessageCreate.mockImplementation(async ({ data }) => ({
      id: 'inbox-msg-1',
      ...data,
    }));
    mocks.userFindMany.mockResolvedValue([
      { id: 'user-operator-1', role: 'operator' },
      { id: 'user-admin-1', role: 'ADMIN' },
    ]);
    mocks.notificationCreate.mockResolvedValue({ id: 'notif-1' });
  });

  it('creates an omnichannel conversation and mirrors escalated chat into InboxMessage', async () => {
    const result = await requestHumanHandoff({
      tenantId: 'tenant-123',
      agentName: 'AC Support AI',
      visitor: {
        name: 'Priya Sharma',
        email: 'priya@gmail.com',
        phone: '+91 98765 43210',
      },
      message: 'My AC is not cooling, can I speak to a technician?',
      history: [
        { role: 'user', content: 'Hello, need help' },
        { role: 'assistant', content: 'How can I assist you with your AC today?' },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.liveSessionId).toBe('sess-xyz');

    // 1. Verifies conversation was created for omnichannel inbox
    expect(mocks.conversationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          conversationId: 'live_chat_sess-xyz',
          channel: 'livechat',
          tenantId: 'tenant-123',
          customerName: 'Priya Sharma',
        }),
      })
    );

    // 2. Verifies messages were mirrored to InboxMessage
    expect(mocks.inboxMessageCreate).toHaveBeenCalled();
    const calls = mocks.inboxMessageCreate.mock.calls;
    const contents = calls.map((c: any) => c[0]?.data?.content);
    expect(contents.some((c: string) => c.includes('My AC is not cooling'))).toBe(true);
    expect(contents.some((c: string) => c.includes('Hello, need help'))).toBe(true);

    // 3. Verifies notifications sent to operators with proper BGOS Omnichannel routing
    expect(mocks.notificationCreate).toHaveBeenCalled();
    const notifCalls = mocks.notificationCreate.mock.calls;
    expect(notifCalls.length).toBe(2);
    expect(notifCalls[0][0].actionUrl).toBe(
      '/?product=bgos&view=omnichannel&conversation=live_chat_sess-xyz'
    );
    expect(notifCalls[0][0].actionLabel).toBe('Open in Inbox');
  });
});

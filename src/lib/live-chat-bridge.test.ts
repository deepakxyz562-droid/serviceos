import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockDb,
  mockCreateInboundMessage,
  mockCreateOutboundMessage,
} = vi.hoisted(() => ({
  mockDb: {
    workspace: {
      findFirst: vi.fn(),
    },
    conversation: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
    publicChatSession: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    publicChatMessage: {
      create: vi.fn(),
    },
  },
  mockCreateInboundMessage: vi.fn(),
  mockCreateOutboundMessage: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/lib/inbox-message-service', () => ({
  createInboundMessage: mockCreateInboundMessage,
  createOutboundMessage: mockCreateOutboundMessage,
}));

import {
  extractLiveChatSessionId,
  findOrCreateLiveChatConversation,
  mirrorInboxReplyToLiveChat,
  mirrorLiveChatMessageToInbox,
} from '@/lib/live-chat-bridge';

describe('live-chat-bridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.workspace.findFirst.mockResolvedValue({ id: 'ws_1' });
    mockDb.conversation.updateMany.mockResolvedValue({ count: 1 });
    mockDb.publicChatSession.update.mockResolvedValue({ id: 'sess_1' });
  });

  it('extracts sessionId from live_chat conversationIds only', () => {
    expect(extractLiveChatSessionId('live_chat_sess_abc')).toBe('sess_abc');
    expect(extractLiveChatSessionId('live_chat_')).toBeNull();
    expect(extractLiveChatSessionId('wa_919876543210')).toBeNull();
  });

  it('backfills workspaceId when an existing live_chat conversation has null workspaceId', async () => {
    mockDb.conversation.findFirst.mockResolvedValue({
      conversationId: 'live_chat_sess_1',
      workspaceId: null,
    });

    const convId = await findOrCreateLiveChatConversation('sess_1', 'ten_1', 'Alice', null, null);
    expect(convId).toBe('live_chat_sess_1');
    expect(mockDb.conversation.updateMany).toHaveBeenCalledWith({
      where: { conversationId: 'live_chat_sess_1', workspaceId: null },
      data: { workspaceId: 'ws_1' },
    });
  });

  it('mirrors visitor messages to InboxMessage with resolved workspaceId', async () => {
    mockDb.publicChatSession.findUnique.mockResolvedValue({
      visitorName: 'Bob',
      visitorPhone: '+919999999999',
      visitorEmail: null,
      tenantId: 'ten_1',
      workspaceId: null,
    });
    mockDb.conversation.findFirst.mockResolvedValue({
      conversationId: 'live_chat_sess_2',
      workspaceId: 'ws_1',
    });

    await mirrorLiveChatMessageToInbox('msg_1', 'sess_2', 'ten_1', 'visitor', 'Need a haircut tomorrow', null, 'Bob');

    expect(mockCreateInboundMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'ten_1',
        conversationId: 'live_chat_sess_2',
        channel: 'livechat',
        content: 'Need a haircut tomorrow',
        externalId: 'livechat_msg_1',
        workspaceId: 'ws_1',
      }),
    );
  });

  it('mirrors Inbox admin reply back to PublicChatMessage and clears unreadCount', async () => {
    mockDb.publicChatSession.findUnique.mockResolvedValue({ id: 'sess_3', status: 'escalated' });
    mockDb.publicChatMessage.create.mockResolvedValue({ id: 'pcm_99' });

    const res = await mirrorInboxReplyToLiveChat({
      conversationId: 'live_chat_sess_3',
      senderType: 'admin',
      senderId: 'usr_owner',
      senderName: 'Owner',
      body: 'Hi! We can fit you in at 4 PM today.',
    });

    expect(res).toEqual({ messageId: 'pcm_99', sessionId: 'sess_3' });
    expect(mockDb.publicChatMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sessionId: 'sess_3',
          senderType: 'admin',
          body: 'Hi! We can fit you in at 4 PM today.',
        }),
      }),
    );
    expect(mockDb.publicChatSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sess_3' },
        data: expect.objectContaining({ unreadCount: 0, status: 'claimed' }),
      }),
    );
  });

  it('returns null when mirroring non-livechat conversation IDs', async () => {
    const res = await mirrorInboxReplyToLiveChat({
      conversationId: 'whatsapp_123',
      senderType: 'admin',
      body: 'Hello',
    });
    expect(res).toBeNull();
    expect(mockDb.publicChatMessage.create).not.toHaveBeenCalled();
  });
});

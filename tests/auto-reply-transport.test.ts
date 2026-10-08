import { expect, it, vi } from 'vitest';
const database = vi.hoisted(() => ({ tenant: { findUnique: vi.fn() } }));
vi.mock('@/lib/db', () => ({ db: database }));
vi.mock('@/lib/presence', () => ({ isTenantOnline: vi.fn() }));
vi.mock('@/lib/ai-client', () => ({ callAI: vi.fn(), isAiConfiguredAsync: vi.fn() }));
vi.mock('@/lib/forms/form-to-chat-context', () => ({ getFormChatContext: vi.fn() }));
vi.mock('@/lib/sms-send', () => ({ sendSmsMessage: vi.fn() }));
vi.mock('@/lib/whatsapp-send', () => ({ sendWhatsAppMessage: vi.fn() }));
import { maybeAutoReply } from '@/lib/auto-reply';
it('does not claim an outbound reply for unimplemented transports', async () => {
  for (const channel of ['instagram', 'messenger', 'email']) {
    expect(await maybeAutoReply({ tenantId: 'mine', conversationId: 'conversation', visitorMessage: 'Hello', channel })).toEqual({ replied: false, reason: 'unsupported_channel' });
  }
  expect(database.tenant.findUnique).not.toHaveBeenCalled();
});
it('requires a recipient before generating or recording a phone-channel reply', async () => {
  expect(await maybeAutoReply({ tenantId: 'mine', conversationId: 'conversation', visitorMessage: 'Hello', channel: 'whatsapp' })).toEqual({ replied: false, reason: 'send_failed' });
  expect(database.tenant.findUnique).not.toHaveBeenCalled();
});

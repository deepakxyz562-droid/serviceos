import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockDb,
  mockCallAI,
  mockBrandRaw,
  mockBrandCtx,
  mockSearchKB,
  mockUpsertKB,
  mockRequestHandoff,
  mockMirrorInbox,
  mockSyncChat,
  mockRateLimit,
} = vi.hoisted(() => ({
  mockDb: {
    formAgent: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    aiKnowledgeDocument: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
    aiKnowledgeChunk: { findMany: vi.fn() },
    publicChatSession: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() },
    publicChatMessage: { create: vi.fn(), count: vi.fn() },
    conversation: { findFirst: vi.fn() },
    workspace: { findFirst: vi.fn() },
    productWorkspace: { findFirst: vi.fn(), findMany: vi.fn() },
    productSubscription: { findMany: vi.fn(), findFirst: vi.fn() },
    subscription: { findMany: vi.fn(), findFirst: vi.fn() },
    tenant: { findUnique: vi.fn() },
  },
  mockCallAI: vi.fn(),
  mockBrandRaw: vi.fn().mockResolvedValue(null),
  mockBrandCtx: vi.fn().mockResolvedValue(''),
  mockSearchKB: vi.fn().mockResolvedValue([]),
  mockUpsertKB: vi.fn().mockResolvedValue({ id: 'kb_auto', chunkCount: 2 }),
  mockRequestHandoff: vi.fn().mockResolvedValue({ escalated: true, conversationId: 'live_chat_s1' }),
  mockMirrorInbox: vi.fn().mockResolvedValue(undefined),
  mockSyncChat: vi.fn().mockResolvedValue(undefined),
  mockRateLimit: vi.fn().mockReturnValue({ allowed: true }),
}));

vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/lib/ai-client', () => ({ callAI: mockCallAI }));
vi.mock('@/lib/brand-context', () => ({
  getBrandContextRaw: mockBrandRaw,
  getBrandContext: mockBrandCtx,
}));
vi.mock('@/lib/ai-knowledge', () => ({
  searchKnowledgeBaseHybrid: mockSearchKB,
  upsertManagedKnowledgeDocument: mockUpsertKB,
}));
vi.mock('@/lib/chat/handoff-service', () => ({
  isEscalationIntent: (text: string) => /owner|human|person/i.test(text),
  requestHumanHandoff: mockRequestHandoff,
}));
vi.mock('@/lib/chat/chat-session-sync', () => ({ syncChatConversation: mockSyncChat }));
vi.mock('@/lib/live-chat-bridge', () => ({ mirrorLiveChatMessageToInbox: mockMirrorInbox }));
vi.mock('@/lib/scheduling/chat-booking-helper', () => ({
  tryExecuteChatBooking: vi.fn().mockResolvedValue(null),
}));
vi.mock('@/lib/agent-guardrails', () => ({
  checkTenantRateLimit: mockRateLimit,
  inputGuardrail: (text: string) => ({ passed: true, filteredMessage: text }),
  outputGuardrail: (text: string) => ({ passed: true, filteredMessage: text }),
}));
vi.mock('@/lib/agent/query-rewriter', () => ({
  rewriteQuery: vi.fn(async (q: string) => q),
}));
vi.mock('@/lib/bgos-public-business', () => ({
  getBgosPublicBusinessProfileUncached: vi.fn(),
}));

import {
  recordUnansweredQuestion,
  listUnansweredQuestionsAsync,
  resolveUnansweredQuestionAsync,
} from '@/lib/ai-unanswered-questions';
import {
  answerBusinessChatbotMessage,
  ensureAndSyncBusinessChatbot,
} from '@/lib/bgos-business-chatbot';
import type { BgosPublicBusinessProfile } from '@/lib/bgos-public-business';

const SAMPLE_PROFILE: BgosPublicBusinessProfile = {
  tenantId: 'ten_salon',
  slug: 'royal-salon',
  canonicalUrl: 'https://bgos.fieseros.com/b/royal-salon',
  businessName: 'Royal Unisex Salon',
  tagline: 'Luxury hair & skin care in Patna',
  category: 'Beauty Salon',
  description: 'Full-service hair styling, bridal makeup, and keratin treatments.',
  logoUrl: null,
  coverImage: null,
  accentColor: '#1E3A5F',
  phone: '+919876543210',
  whatsappPhone: '+919876543210',
  whatsappDigits: '919876543210',
  email: 'hello@royalsalon.example',
  website: null,
  address: 'Boring Road, Patna',
  city: 'Patna',
  state: 'Bihar',
  country: 'IN',
  currency: 'INR',
  timeZone: 'Asia/Kolkata',
  serviceAreas: ['Boring Road', 'Kankarbagh'],
  rating: 4.8,
  reviewCount: 120,
  googleMapsUrl: null,
  verified: true,
  hours: [
    { day: 'Monday', shortDay: 'Mon', open: true, openTime: '10:00', closeTime: '20:00' },
    { day: 'Sunday', shortDay: 'Sun', open: false, openTime: '10:00', closeTime: '20:00' },
  ],
  services: [
    {
      id: 'svc_1',
      name: 'Haircut & Styling',
      description: 'Precision cut',
      price: 499,
      duration: 45,
      category: 'Hair',
      isInquiryOnly: false,
    },
  ],
  reviews: [],
  gallery: [],
  faqs: [],
  bookingEnabled: true,
  pageVisibility: {
    published: true,
    showServices: true,
    showPhotos: true,
    showReviews: true,
    showFaqs: true,
    showInquiryForm: true,
    showHours: true,
    showChatbot: true,
  },
  showReviews: true,
  showGallery: true,
  planTier: 'starter',
  planStatus: 'active',
};

describe('bgos-business-chatbot & unanswered questions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.formAgent.findMany.mockResolvedValue([]);
    mockDb.formAgent.findUnique.mockResolvedValue(null);
    mockDb.formAgent.create.mockImplementation(async ({ data }: any) => ({
      id: 'agent_1',
      ...data,
      updatedAt: new Date(),
    }));
    mockDb.aiKnowledgeDocument.findFirst.mockResolvedValue(null);
    mockDb.aiKnowledgeDocument.findMany.mockResolvedValue([]);
    mockDb.aiKnowledgeDocument.create.mockImplementation(async ({ data }: any) => ({
      id: 'uq_db_1',
      ...data,
      updatedAt: new Date(),
    }));
    mockDb.workspace.findFirst.mockResolvedValue({ id: 'ws_1' });
    mockDb.productWorkspace.findFirst.mockResolvedValue({ workspaceId: 'ws_1' });
    mockDb.productWorkspace.findMany.mockResolvedValue([{ workspaceId: 'ws_1' }]);
    mockDb.productSubscription.findMany.mockResolvedValue([]);
    mockDb.subscription.findMany.mockResolvedValue([]);
    mockDb.publicChatSession.findUnique.mockResolvedValue(null);
    mockDb.publicChatSession.update.mockResolvedValue({ id: 'sess_updated' });
    mockDb.publicChatSession.create.mockResolvedValue({
      id: 'sess_new',
      tenantId: 'ten_salon',
      visitorName: null,
      visitorPhone: null,
      visitorEmail: null,
    });
    mockDb.publicChatMessage.create.mockResolvedValue({ id: 'pcm_1' });
    mockDb.publicChatMessage.count.mockResolvedValue(0);
    mockDb.conversation.findFirst.mockResolvedValue(null);
    mockDb.publicChatSession.count.mockResolvedValue(0);
    mockDb.tenant.findUnique.mockResolvedValue({
      id: 'ten_salon',
      plan: 'starter',
      planStatus: 'active',
      trialEndsAt: null,
    });
  });

  it('stores unanswered questions using valid AiKnowledgeDocument columns (no sourceUrl)', async () => {
    const item = await recordUnansweredQuestion('ten_uq_1', 'Do you do bridal trials on Sundays?', 'chat');
    expect(item.status).toBe('pending');
    expect(item.question).toContain('bridal trials');

    // Wait a microtask for async _persistToDb
    await new Promise((r) => setTimeout(r, 10));
    if (mockDb.aiKnowledgeDocument.create.mock.calls.length > 0) {
      const arg = mockDb.aiKnowledgeDocument.create.mock.calls[0][0];
      expect(arg.data.mimeType).toBe('application/json');
      expect(arg.data).not.toHaveProperty('sourceUrl');
    }

    const listed = await listUnansweredQuestionsAsync('ten_uq_1', 'pending');
    expect(listed.some((q) => q.id === item.id)).toBe(true);

    const resolved = await resolveUnansweredQuestionAsync('ten_uq_1', item.id, 'resolve', 'Yes, by advance appointment.');
    expect(resolved?.status).toBe('resolved');
  });

  it('auto-provisions primary chatbot and syncs auto_business_profile RAG doc', async () => {
    const { getBgosPublicBusinessProfileUncached } = await import('@/lib/bgos-public-business');
    vi.mocked(getBgosPublicBusinessProfileUncached).mockResolvedValue(SAMPLE_PROFILE);

    const res = await ensureAndSyncBusinessChatbot('ten_salon', { triggerSource: 'test_sync' });
    expect(res.autoSyncSummary?.servicesCount).toBe(1);
    expect(res.autoSyncSummary?.hoursConfigured).toBe(true);
    expect(mockDb.formAgent.create).toHaveBeenCalledTimes(1);
    expect(mockUpsertKB).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'ten_salon',
        sourceType: 'auto_business_profile',
      }),
    );
  });

  it('handles Supabase string updatedAt, cleans legacy template names/Unsplash avatars, and skips redundant KB upserts via kbHash', async () => {
    const { getBgosPublicBusinessProfileUncached } = await import('@/lib/bgos-public-business');
    vi.mocked(getBgosPublicBusinessProfileUncached).mockResolvedValue(SAMPLE_PROFILE);

    const legacyAgent = {
      id: 'agent_legacy',
      tenantId: 'ten_salon',
      slug: 'royal-salon-assistant',
      name: 'Patient Intake & Consultation Booking Assistant',
      roleTitle: 'Customer Assistant',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
      statusText: 'Online',
      brandColor: '#1E3A5F',
      voiceTone: 'friendly',
      welcomeGreeting: 'Welcome!',
      greetingSubtitle: 'AI Assistant',
      configJson: JSON.stringify({ isPrimaryBusinessBot: true }),
      status: 'active',
      updatedAt: '2026-11-12T06:00:00.000Z',
    };
    mockDb.formAgent.findMany.mockResolvedValue([legacyAgent]);
    mockDb.formAgent.update.mockImplementation(async ({ data }: any) => ({
      ...legacyAgent,
      ...data,
      updatedAt: '2026-11-12T06:01:00.000Z',
    }));

    const first = await ensureAndSyncBusinessChatbot('ten_salon', { triggerSource: 'page_visit' });
    expect(first.agent.name).toBe('Royal Unisex Salon Assistant');
    expect(first.agent.avatarUrl).toBe('');
    expect(first.agent.updatedAt).toBe('2026-11-12T06:01:00.000Z');
    expect(first.autoSyncSummary?.kbHash).toBeTruthy();
    expect(mockUpsertKB).toHaveBeenCalledTimes(1);

    // Second call with matching kbHash should skip re-ingesting KB chunks
    const persistedCfg = mockDb.formAgent.update.mock.calls[0][0].data.configJson;
    mockDb.formAgent.findMany.mockResolvedValue([
      {
        ...legacyAgent,
        name: 'Royal Unisex Salon Assistant',
        avatarUrl: '',
        configJson: persistedCfg,
      },
    ]);
    await ensureAndSyncBusinessChatbot('ten_salon', { triggerSource: 'page_visit' });
    expect(mockUpsertKB).toHaveBeenCalledTimes(1);
  });

  it('enforces Free tier 50/month AI chat quota with graceful Owner WhatsApp/Phone CTA fallback', async () => {
    mockDb.tenant.findUnique.mockResolvedValue({
      id: 'ten_salon',
      plan: 'free',
      planStatus: 'active',
      trialEndsAt: null,
    });
    mockDb.publicChatSession.count.mockResolvedValue(50);
    mockDb.publicChatMessage.count.mockResolvedValue(50);

    const reply = await answerBusinessChatbotMessage({
      profile: SAMPLE_PROFILE,
      message: 'How much for keratin?',
    });

    expect(reply.quotaLimited).toBe(true);
    expect(reply.actionCard?.type).toBe('owner_contact_cta');
    expect(reply.actionCard?.whatsappUrl).toContain('wa.me/919876543210');
    expect(mockCallAI).not.toHaveBeenCalled();
  });

  it('mirrors visitor message and skips AI reply when owner live-chat mode (aiPaused) is active', async () => {
    mockDb.publicChatSession.findUnique.mockResolvedValue({
      id: 'sess_live',
      tenantId: 'ten_salon',
      visitorName: 'Riya',
      visitorPhone: null,
      visitorEmail: null,
    });
    mockDb.conversation.findFirst.mockResolvedValue({ aiPaused: true, status: 'escalated' });

    const reply = await answerBusinessChatbotMessage({
      profile: SAMPLE_PROFILE,
      message: 'Are you available at 5 PM?',
      sessionId: 'sess_live',
      visitor: { name: 'Riya' },
    });

    expect(reply.aiPaused).toBe(true);
    expect(reply.liveMode).toBe(true);
    expect(mockCallAI).not.toHaveBeenCalled();
    expect(mockMirrorInbox).toHaveBeenCalledWith(
      'pcm_1',
      'sess_live',
      'ten_salon',
      'visitor',
      'Are you available at 5 PM?',
      null,
      'Riya',
    );
  });
});

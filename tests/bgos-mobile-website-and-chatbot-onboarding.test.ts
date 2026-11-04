import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const m = vi.hoisted(() => ({
  findAuthUser: vi.fn(),
  findTenant: vi.fn(),
  updateTenant: vi.fn(),
  findSocialAccount: vi.fn(),
  findManySocialAccount: vi.fn(),
  upsertBrandProfile: vi.fn(),
  countAiKnowledgeDoc: vi.fn(),
  createAiKnowledgeDoc: vi.fn(),
  findFirstAiKnowledgeDoc: vi.fn(),
  updateAiKnowledgeDoc: vi.fn(),
  createAiKnowledgeChunk: vi.fn(),
  findFirstFormAgent: vi.fn(),
  createFormAgent: vi.fn(),
  crawlSingleUrl: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getAuthUser: m.findAuthUser,
}));

vi.mock('@/lib/db', () => ({
  db: {
    tenant: {
      findUnique: m.findTenant,
      update: m.updateTenant,
    },
    socialAccount: {
      findMany: m.findManySocialAccount,
      findFirst: m.findSocialAccount,
    },
    brandProfile: {
      upsert: m.upsertBrandProfile,
    },
    aiKnowledgeDocument: {
      count: m.countAiKnowledgeDoc,
      create: m.createAiKnowledgeDoc,
      findFirst: m.findFirstAiKnowledgeDoc,
      update: m.updateAiKnowledgeDoc,
    },
    aiKnowledgeChunk: {
      create: m.createAiKnowledgeChunk,
    },
    formAgent: {
      findFirst: m.findFirstFormAgent,
      create: m.createFormAgent,
    },
  },
}));

vi.mock('@/lib/ai-crawler', () => ({
  crawlSingleUrl: m.crawlSingleUrl,
}));

vi.mock('@/lib/ai-embeddings', () => ({
  LOCAL_HASH_MODEL: 'local-hash-v1',
  localHashEmbed: () => Array(64).fill(0.1),
  embedText: async () => ({ embedding: Array(64).fill(0.1), model: 'local-hash-v1' }),
}));

import { GET as getOnboarding, POST as postOnboarding } from '@/app/api/bgos/onboarding/route';
import { trainBgosChatbotKnowledge } from '@/lib/bgos-onboarding-knowledge';

beforeEach(() => {
  vi.resetAllMocks();
  m.findAuthUser.mockResolvedValue({
    id: 'user-1',
    email: 'owner@example.com',
    role: 'owner',
    tenantId: 'tenant-1',
  });
  m.findTenant.mockResolvedValue({
    id: 'tenant-1',
    name: 'Premier Plumbing',
    address: '100 Market St',
    industry: 'Plumbing',
    onboardingStep: 2,
    onboardingCompleted: false,
    settingsJson: JSON.stringify({
      locationWebsite: 'https://premierplumbing.com',
      website: 'https://premierplumbing.com',
      gbpAutomations: {
        autoReplyReviews: true,
        autoGeneratePosts: true,
        autoPublishPhotos: true,
        enableChatbot: true,
      },
    }),
  });
  m.findManySocialAccount.mockResolvedValue([
    {
      id: 'sa-1',
      accountId: 'loc-1',
      accountName: 'Premier Plumbing GBP',
      isActive: true,
      metadata: JSON.stringify({
        locationTitle: 'Premier Plumbing',
        address: '100 Market St',
        category: 'Plumber',
        website: 'https://premierplumbing.com',
      }),
    },
  ]);
  m.updateTenant.mockResolvedValue({ id: 'tenant-1' });
  m.upsertBrandProfile.mockResolvedValue({ id: 'bp-1' });
  m.countAiKnowledgeDoc.mockResolvedValue(0);
  m.createAiKnowledgeDoc.mockResolvedValue({ id: 'doc-1' });
  m.createAiKnowledgeChunk.mockResolvedValue({ id: 'chunk-1' });
  m.findFirstFormAgent.mockResolvedValue(null);
  m.createFormAgent.mockResolvedValue({ id: 'agent-1' });
});

it('GET /api/bgos/onboarding returns website and enableChatbot automation', async () => {
  const req = new NextRequest('https://fieseros.com/api/bgos/onboarding');
  const res = await getOnboarding(req);
  expect(res.status).toBe(200);

  const data = await res.json();
  expect(data.website).toBe('https://premierplumbing.com');
  expect(data.activeLocation?.website).toBe('https://premierplumbing.com');
  expect(data.automations?.enableChatbot).toBe(true);
});

it('POST /api/bgos/onboarding saves website, automations, and updates tenant record', async () => {
  const req = new NextRequest('https://fieseros.com/api/bgos/onboarding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      step: 3,
      locationName: 'Premier Plumbing Pros',
      locationAddress: '200 High St',
      locationCategory: 'Plumbing Service',
      locationPinCode: '400703',
      locationWebsite: 'https://premierplumbingpros.com',
      automations: {
        autoReplyReviews: true,
        autoGeneratePosts: true,
        autoPublishPhotos: true,
        enableChatbot: true,
      },
      offerings: ['Drain Cleaning', 'Water Heater Repair'],
      aboutText: 'Top-rated plumbing specialists serving the metro area.',
    }),
  });

  const res = await postOnboarding(req);
  expect(res.status).toBe(200);

  expect(m.updateTenant).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { id: 'tenant-1' },
      data: expect.objectContaining({
        website: 'https://premierplumbingpros.com',
        name: 'Premier Plumbing Pros',
        address: '200 High St',
        industry: 'Plumbing Service',
      }),
    }),
  );
});

it('trainBgosChatbotKnowledge crawls website and ingests RAG documents when website is provided', async () => {
  m.crawlSingleUrl.mockResolvedValue({
    url: 'https://premierplumbing.com',
    title: 'Premier Plumbing — 24/7 Licensed Plumbers',
    text: 'We provide drain cleaning starting at $99, water heater repair, and 24/7 emergency dispatch.',
    charCount: 95,
  });

  const result = await trainBgosChatbotKnowledge({
    tenantId: 'tenant-1',
    userId: 'user-1',
    businessName: 'Premier Plumbing',
    industry: 'Plumbing',
    address: '100 Market St',
    phone: '+15551234567',
    website: 'https://premierplumbing.com',
    offerings: ['Drain Cleaning', 'Water Heater Repair'],
    aboutText: 'Licensed residential and commercial plumbers.',
    hours: {
      Monday: { open: true, openTime: '08:00', closeTime: '18:00' },
      Sunday: { open: false },
    },
  });

  expect(result.profileIngested).toBe(true);
  expect(result.websiteCrawled).toBe(true);
  expect(m.crawlSingleUrl).toHaveBeenCalledWith('https://premierplumbing.com');
  expect(m.createFormAgent).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        name: 'Premier Plumbing AI Assistant',
        status: 'active',
      }),
    }),
  );
});

it('trainBgosChatbotKnowledge still trains chatbot and creates agent when NO website is provided', async () => {
  const result = await trainBgosChatbotKnowledge({
    tenantId: 'tenant-1',
    userId: 'user-1',
    businessName: 'Local Corner Barber',
    industry: 'Barbershop',
    address: '50 Main St',
    phone: '+15559876543',
    website: '', // No website!
    offerings: ['Haircut', 'Beard Trim'],
    aboutText: 'Friendly neighborhood barbershop with walk-ins welcome.',
    hours: null,
  });

  expect(result.profileIngested).toBe(true);
  expect(result.websiteCrawled).toBe(false);
  expect(m.crawlSingleUrl).not.toHaveBeenCalled();
  expect(m.createAiKnowledgeDoc).toHaveBeenCalled();
  expect(m.createFormAgent).toHaveBeenCalled();
});

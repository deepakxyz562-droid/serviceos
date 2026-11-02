// @vitest-environment node
import { beforeEach, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';

const m = vi.hoisted(() => ({
  auth: vi.fn(),
  ai: vi.fn(),
  db: {
    tenant: {
      findUnique: vi.fn(),
    },
    socialAccount: {
      findMany: vi.fn(),
    },
    review: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({ getAuthUser: m.auth }));
vi.mock('@/lib/ai-client', () => ({ callAI: m.ai }));
vi.mock('@/lib/db', () => ({ db: m.db }));

import { GET } from '@/app/api/social/prompts/suggestions/route';

beforeEach(() => {
  vi.resetAllMocks();
  m.auth.mockResolvedValue({ tenantId: 'tenant-123' });
  m.db.tenant.findUnique.mockResolvedValue({
    name: 'Fieseros Heating & Plumbing',
    industry: 'HVAC & Plumbing',
    city: 'Leeds',
    website: 'https://fieseros.com',
    brandProfile: {
      businessName: 'Fieseros Heating',
      industry: 'Plumbing & Heating',
      location: 'Leeds & West Yorkshire',
      website: 'https://fieseros.com',
      services: JSON.stringify(['Emergency Boiler Repair', 'Central Heating Powerflush']),
      usps: 'Gas Safe certified, same-day response, transparent quotes',
      currentOffers: '£50 off new boiler installations',
    },
  });
  m.db.socialAccount.findMany.mockResolvedValue([]);
  m.db.review.findMany.mockResolvedValue([
    { author: 'David M.', text: 'Super fast boiler repair, Mike was punctual and professional.', rating: 5 },
  ]);
});

it('requires authentication to fetch suggestions', async () => {
  m.auth.mockResolvedValue(null);
  const res = await GET(new NextRequest('http://localhost/api/social/prompts/suggestions'));
  expect(res.status).toBe(401);
});

it('returns 5 tailored prompt suggestions for HVAC when configured with trade services', async () => {
  const res = await GET(new NextRequest('http://localhost/api/social/prompts/suggestions'));
  expect(res.status).toBe(200);
  const json = await res.json();
  expect(json.businessName).toBe('Fieseros Heating');
  expect(json.website).toBe('https://fieseros.com');
  expect(Array.isArray(json.suggestions)).toBe(true);
  expect(json.suggestions.length).toBe(5);

  const hero = json.suggestions.find((s: any) => s.category === 'service');
  expect(hero.chipLabel).toContain('Emergency Boiler Repair');
  expect(hero.prompt).toContain('Emergency Boiler Repair');
  expect(hero.icon).toBeDefined();
  expect(hero.title).toContain('Emergency Boiler Repair');
  json.suggestions.forEach((s: any) => {
    expect(s.icon).toBeDefined();
    expect(s.title).toBeDefined();
    expect(s.chipLabel).toBeDefined();
  });

  const aiSugg = json.suggestions.find((s: any) => s.category === 'ai_assistant');
  expect(aiSugg).toBeDefined();
  expect(aiSugg.chipLabel).toContain('Booking');
  expect(aiSugg.prompt).toContain('Fieseros Heating');
});

it('prioritizes connected Google Business Profile for FieserOS and eliminates HVAC suggestions', async () => {
  m.db.tenant.findUnique.mockResolvedValue({
    name: 'Deepak Chandra',
    industry: 'Services',
    city: 'Patna',
    website: null,
    brandProfile: {
      businessName: 'deepak chandra',
      industry: 'Services',
      location: null,
      website: null,
      services: null, // null/empty services!
      usps: null,
      currentOffers: null,
    },
  });
  m.db.socialAccount.findMany.mockResolvedValue([
    {
      id: 'acc-fieseros',
      platform: 'googlebusiness',
      accountName: 'FieserOS',
      metadata: JSON.stringify({
        locationId: '10777612572223040949',
        locationTitle: 'FieserOS',
        category: 'Software company',
        website: 'https://fieseros.com/',
        address: '80, Murlichak, Jagdeopath, Patna, Bihar, 800014',
      }),
      updatedAt: new Date(),
    },
  ]);

  const res = await GET(new NextRequest('http://localhost/api/social/prompts/suggestions'));
  expect(res.status).toBe(200);
  const json = await res.json();

  expect(json.businessName).toBe('FieserOS');
  expect(json.industry).toBe('Software company');
  expect(json.website).toBe('https://fieseros.com/');

  // Ensure NO boiler repair or emergency heating appears
  const allPrompts = json.suggestions.map((s: any) => `${s.chipLabel} ${s.prompt} ${s.headline}`).join(' ');
  expect(allPrompts).not.toContain('Emergency Heating');
  expect(allPrompts).not.toContain('Boiler Repair');

  // Verify software / AI assistant suggestions are present
  const aiSugg = json.suggestions.find((s: any) => s.category === 'ai_assistant');
  expect(aiSugg).toBeDefined();
  expect(aiSugg.chipLabel).toContain('AI Workflow');
  expect(aiSugg.prompt).toContain('Fieseros AI Assistant');
});

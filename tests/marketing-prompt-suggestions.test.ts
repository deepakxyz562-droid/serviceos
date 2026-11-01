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
      businessName: 'Fieseros',
      industry: 'Plumbing & Heating',
      location: 'Leeds & West Yorkshire',
      website: 'https://fieseros.com',
      services: JSON.stringify(['Emergency Boiler Repair', 'Central Heating Powerflush']),
      usps: 'Gas Safe certified, same-day response, transparent quotes',
      currentOffers: '£50 off new boiler installations',
    },
  });
  m.db.review.findMany.mockResolvedValue([
    { author: 'David M.', text: 'Super fast boiler repair, Mike was punctual and professional.', rating: 5 },
  ]);
});

it('requires authentication to fetch suggestions', async () => {
  m.auth.mockResolvedValue(null);
  const res = await GET(new NextRequest('http://localhost/api/social/prompts/suggestions'));
  expect(res.status).toBe(401);
});

it('returns 5 tailored prompt suggestions based on tenant profile and reviews', async () => {
  const res = await GET(new NextRequest('http://localhost/api/social/prompts/suggestions'));
  expect(res.status).toBe(200);
  const json = await res.json();
  expect(json.businessName).toBe('Fieseros');
  expect(json.website).toBe('https://fieseros.com');
  expect(Array.isArray(json.suggestions)).toBe(true);
  expect(json.suggestions.length).toBe(5);

  const hero = json.suggestions.find((s: any) => s.category === 'service');
  expect(hero.chipLabel).toContain('Emergency Boiler Repair');
  expect(hero.prompt).toContain('Emergency Boiler Repair');

  const reviewSugg = json.suggestions.find((s: any) => s.category === 'review');
  expect(reviewSugg.chipLabel).toContain('David M.');
  expect(reviewSugg.prompt).toContain('David M.');

  const aiSugg = json.suggestions.find((s: any) => s.category === 'ai_assistant');
  expect(aiSugg.prompt).toContain('Fieseros AI Assistant');
});

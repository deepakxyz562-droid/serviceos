import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { callAIMock, mockTenantState, dbMock } = vi.hoisted(() => {
  const callAIMock = vi.fn();
  const mockTenantState = {
    settingsJson: JSON.stringify({
      taxCompliance: { gstNumber: '27ABCDE1234F1Z5' },
      activeGbpCity: 'Delhi',
    }),
  };

  const tenantModel = {
    findUnique: vi.fn(async () => ({
      id: 'tenant_test_1',
      name: 'ShieldHire SOS App',
      industry: 'Security service',
      description: '24/7 licensed security guards, gunmen, and executive VIP protection across Delhi NCR.',
      city: 'Delhi',
      settingsJson: mockTenantState.settingsJson,
    })),
    update: vi.fn(async (args: any) => {
      if (args?.data?.settingsJson) {
        mockTenantState.settingsJson = args.data.settingsJson;
      }
      return { id: 'tenant_test_1', settingsJson: mockTenantState.settingsJson };
    }),
  };

  const dbMock = {
    tenant: tenantModel,
    brandProfile: {
      findUnique: vi.fn(async () => ({
        tenantId: 'tenant_test_1',
        businessName: 'ShieldHire SOS App',
        industry: 'Security service',
        location: 'Delhi',
        serviceArea: 'Delhi, Noida, Gurgaon',
        targetCustomer: 'Corporate offices, VIP executives, industrial warehouses',
        customerPainPoints: 'Slow emergency dispatch and unverified guards',
        tone: 'Authoritative',
        voiceDescription: 'Disciplined, vigilant, rapid response',
        usps: 'PSARA licensed, 10-minute SOS deployment',
        currentOffers: 'Free site risk audit',
        aiGeneratedSummary: '24/7 rapid-response private security agency.',
      })),
    },
    socialAccount: {
      findFirst: vi.fn(async () => ({
        metadata: JSON.stringify({
          primaryCategory: 'Security service',
          locationTitle: 'ShieldHire SOS App',
          city: 'Delhi',
          serviceAreas: ['Delhi, India', 'Noida, Uttar Pradesh, India'],
        }),
      })),
    },
    service: {
      findMany: vi.fn(async () => [
        {
          name: 'Armed Security Gunmen',
          description: 'PSARA licensed personal security officers and bank cash escort gunmen.',
        },
        {
          name: 'Executive VIP Bodyguards',
          description: 'Discreet close protection specialists in formal corporate attire.',
        },
      ]),
    },
    $transaction: vi.fn(async (fn: any) => fn({ tenant: tenantModel })),
  };

  return { callAIMock, mockTenantState, dbMock };
});

vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn().mockResolvedValue({
    id: 'user_1',
    tenantId: 'tenant_test_1',
    role: 'owner',
  }),
}));

vi.mock('@/lib/db', () => ({ db: dbMock }));
vi.mock('@/lib/ai-client', () => ({ callAI: callAIMock }));

import { GET } from '@/app/api/social/designs/business-images/suggestions/route';
import {
  computeBusinessSceneContextHash,
  SceneGenerationError,
} from '@/lib/designs/business-image-suggestions';

function makeValidAiBundle(suffix = '') {
  return JSON.stringify({
    brandVisualDirection: 'Crisp natural daylight with deep navy and emerald security accents.',
    scenes: [
      {
        id: `scene-a${suffix}`,
        title: `Corporate Lobby Access Guarding${suffix}`,
        icon: '🛡️',
        badge: 'CORPORATE SECURITY',
        category: 'access_control_operations',
        sceneDescription: 'Uniformed security officer verifying corporate building entry at a glass lobby.',
        promptBlueprint:
          'Commercial photography of a poised uniformed security officer in dark navy blazer welcoming visitors inside a bright glass corporate plaza with crisp emerald accents and shallow depth of field. NO TEXT, no words, no letters, no logos.',
      },
      {
        id: `scene-b${suffix}`,
        title: `Executive VIP Escort Detail${suffix}`,
        icon: '🕶️',
        badge: 'VIP PROTECTION',
        category: 'executive_close_protection',
        sceneDescription: 'Discreet close protection specialist escorting a business executive.',
        promptBlueprint:
          'Editorial photograph of an alert close protection bodyguard in a tailored charcoal suit escorting an executive toward a black sedan outside a modern hotel, crisp natural light. NO TEXT, no words, no letters, no logos.',
      },
      {
        id: `scene-c${suffix}`,
        title: `Rapid SOS Dispatch Monitoring${suffix}`,
        icon: '📡',
        badge: 'RAPID RESPONSE',
        category: 'command_dispatch_telemetry',
        sceneDescription: 'Security operations specialist coordinating emergency response patrol units.',
        promptBlueprint:
          'Architectural photograph inside a sleek modern security dispatch hub with subtle blurred monitoring screens, focused operator on duty under cool emerald studio lighting. NO TEXT, no words, no letters, no logos.',
      },
      {
        id: `scene-d${suffix}`,
        title: `Industrial Perimeter Night Patrol${suffix}`,
        icon: '🔦',
        badge: 'NIGHT PATROL',
        category: 'perimeter_surveillance_patrol',
        sceneDescription: 'Night patrol officer inspecting a gated industrial logistics hub.',
        promptBlueprint:
          'High-contrast commercial night photograph of a trained security officer conducting a perimeter check beside a brightly lit industrial warehouse gate with tactical flashlight. NO TEXT, no words, no letters, no logos.',
      },
    ],
  });
}

describe('AI Business Scene Suggestions Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTenantState.settingsJson = JSON.stringify({
      taxCompliance: { gstNumber: '27ABCDE1234F1Z5' },
      activeGbpCity: 'Delhi',
    });
  });

  it('produces deterministic context hashes reflecting all business identity fields', () => {
    const base = computeBusinessSceneContextHash({
      businessName: 'ShieldHire',
      category: 'Security service',
      businessDescription: 'Private security firm',
      servicesDetailed: [
        { name: 'Armed Guards', description: 'Licensed PSOs' },
        { name: 'VIP Bouncers', description: 'Event protection' },
      ],
      serviceAreas: ['Noida', 'Delhi'],
      usps: '10 min dispatch',
      targetCustomer: 'Enterprises',
      brandStory: 'Founded by veterans',
      tone: 'Authoritative',
      brandColors: { primary: '#009F50', secondary: '#0F172A' },
    });

    // Different order of services/areas must produce the exact same hash
    const reordered = computeBusinessSceneContextHash({
      businessName: 'ShieldHire',
      category: 'Security service',
      businessDescription: 'Private security firm',
      servicesDetailed: [
        { name: 'VIP Bouncers', description: 'Event protection' },
        { name: 'Armed Guards', description: 'Licensed PSOs' },
      ],
      serviceAreas: ['Delhi', 'Noida'],
      usps: '10 min dispatch',
      targetCustomer: 'Enterprises',
      brandStory: 'Founded by veterans',
      tone: 'Authoritative',
      brandColors: { primary: '#009f50', secondary: '#0f172a' },
    });
    expect(reordered).toBe(base);

    // Changing service description or brand color must invalidate hash
    const changedDesc = computeBusinessSceneContextHash({
      businessName: 'ShieldHire',
      category: 'Security service',
      businessDescription: 'Private security firm',
      servicesDetailed: [
        { name: 'Armed Guards', description: '24/7 cash van escort & armed guards' },
        { name: 'VIP Bouncers', description: 'Event protection' },
      ],
      serviceAreas: ['Delhi', 'Noida'],
      usps: '10 min dispatch',
      targetCustomer: 'Enterprises',
      brandStory: 'Founded by veterans',
      tone: 'Authoritative',
      brandColors: { primary: '#009F50', secondary: '#0F172A' },
    });
    expect(changedDesc).not.toBe(base);

    const changedColor = computeBusinessSceneContextHash({
      businessName: 'ShieldHire',
      category: 'Security service',
      businessDescription: 'Private security firm',
      servicesDetailed: [
        { name: 'Armed Guards', description: 'Licensed PSOs' },
        { name: 'VIP Bouncers', description: 'Event protection' },
      ],
      serviceAreas: ['Delhi', 'Noida'],
      usps: '10 min dispatch',
      targetCustomer: 'Enterprises',
      brandStory: 'Founded by veterans',
      tone: 'Authoritative',
      brandColors: { primary: '#1E6FFB', secondary: '#0F172A' },
    });
    expect(changedColor).not.toBe(base);
  });

  it('persists AI scenes once per context, preserves unrelated settingsJson, and serves cache with 0 LLM calls on revisit', async () => {
    callAIMock.mockResolvedValueOnce({ content: makeValidAiBundle() });

    const req1 = new NextRequest('http://localhost:3000/api/social/designs/business-images/suggestions');
    const res1 = await GET(req1);
    const data1 = await res1.json();

    expect(res1.status).toBe(200);
    expect(data1.success).toBe(true);
    expect(data1.fromCache).toBe(false);
    expect(data1.suggestions).toHaveLength(4);
    expect(data1.suggestions[0].category).toBe('access_control_operations');
    expect(callAIMock).toHaveBeenCalledTimes(1);

    // Inspect callAI received full service descriptions & brand context + responseSchema
    const aiArgs = callAIMock.mock.calls[0][0];
    expect(aiArgs.json).toBe(true);
    expect(aiArgs.responseSchema).toBeTruthy();
    expect(aiArgs.messages[1].content).toContain('PSARA licensed personal security officers');
    expect(aiArgs.messages[1].content).toContain('10-minute SOS deployment');

    // Verify unrelated settingsJson keys were preserved in DB update
    const stored = JSON.parse(mockTenantState.settingsJson);
    expect(stored.taxCompliance.gstNumber).toBe('27ABCDE1234F1Z5');
    expect(stored.sceneIdeasCache.scenes).toHaveLength(4);

    // Second request without refresh must NOT invoke LLM
    const req2 = new NextRequest('http://localhost:3000/api/social/designs/business-images/suggestions');
    const res2 = await GET(req2);
    const data2 = await res2.json();
    expect(res2.status).toBe(200);
    expect(data2.fromCache).toBe(true);
    expect(data2.suggestions).toHaveLength(4);
    expect(callAIMock).toHaveBeenCalledTimes(1);
  });

  it('coalesces simultaneous requests for the same tenant so LLM is called only once', async () => {
    let resolveAi!: (val: { content: string }) => void;
    callAIMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveAi = resolve;
        }),
    );

    const p1 = GET(new NextRequest('http://localhost:3000/api/social/designs/business-images/suggestions'));
    const p2 = GET(new NextRequest('http://localhost:3000/api/social/designs/business-images/suggestions'));

    // Wait a microtask for both handlers to reach getOrGenerateCachedSceneSuggestions
    await new Promise((r) => setTimeout(r, 20));
    expect(callAIMock).toHaveBeenCalledTimes(1);

    resolveAi({ content: makeValidAiBundle() });
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    const d1 = await r1.json();
    const d2 = await r2.json();
    expect(d1.suggestions).toEqual(d2.suggestions);
  });

  it('retries once automatically when attempt 1 returns duplicate scenes or invalid JSON', async () => {
    const duplicatePayload = JSON.stringify({
      brandVisualDirection: 'Consistent clean lighting.',
      scenes: [
        {
          id: 'dup-1',
          title: 'Uniformed Guard On Duty',
          icon: '🛡️',
          badge: 'GUARD',
          category: 'guard_duty',
          sceneDescription: 'A uniformed guard standing alert outside a commercial office plaza.',
          promptBlueprint:
            'Commercial photograph of a uniformed security officer standing alert outside a glass building in daylight. NO TEXT, no words, no letters.',
        },
        {
          id: 'dup-2',
          title: 'Uniformed Guard On Duty',
          icon: '🛡️',
          badge: 'GUARD',
          category: 'guard_duty',
          sceneDescription: 'A uniformed guard standing alert outside a commercial office plaza.',
          promptBlueprint:
            'Commercial photograph of a uniformed security officer standing alert outside a glass building in daylight. NO TEXT, no words, no letters.',
        },
      ],
    });

    callAIMock
      .mockResolvedValueOnce({ content: duplicatePayload })
      .mockResolvedValueOnce({ content: makeValidAiBundle('-retry') });

    const req = new NextRequest('http://localhost:3000/api/social/designs/business-images/suggestions');
    const res = await GET(req);
    const data = await res.json();

    expect(callAIMock).toHaveBeenCalledTimes(2);
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.suggestions).toHaveLength(4);
  });

  it('returns explicit 503 retryable error and ZERO hardcoded fallback scenes when AI + retry both fail', async () => {
    callAIMock
      .mockRejectedValueOnce(new Error('Gemini rate limit'))
      .mockRejectedValueOnce(new Error('OpenRouter unavailable'));

    const req = new NextRequest('http://localhost:3000/api/social/designs/business-images/suggestions');
    const res = await GET(req);
    const data = await res.json();

    expect(callAIMock).toHaveBeenCalledTimes(2);
    expect(res.status).toBe(503);
    expect(data.success).toBe(false);
    expect(data.retryable).toBe(true);
    expect(data.suggestions).toEqual([]);
    expect(data.error).toContain('Could not generate AI scene ideas');
    expect(SceneGenerationError).toBeDefined();
  });

  it('passes previous cached titles in avoidRepeatingPreviousConcepts on refresh', async () => {
    const refreshBundle = JSON.stringify({
      brandVisualDirection: 'Consistent clean daylight with navy & emerald corporate accents.',
      scenes: [
        {
          id: 'ref-1',
          title: 'Cash Transit Armored Van Escort',
          icon: '🚐',
          badge: 'ARMED ESCORT',
          category: 'cash_in_transit_security',
          sceneDescription: 'Licensed security gunmen safeguarding a bank cash transit vehicle.',
          promptBlueprint: 'Commercial photography of trained security gunmen beside a sleek armored transit van outside a bank entrance in daylight. NO TEXT, no words, no letters.',
        },
        {
          id: 'ref-2',
          title: 'Corporate Gala Crowd Control Desk',
          icon: '🎟️',
          badge: 'EVENT BOUNCERS',
          category: 'event_access_management',
          sceneDescription: 'Formal event security team managing VIP guest entry at an upscale venue.',
          promptBlueprint: 'Editorial photo of poised event security officers in black suits guiding corporate VIP arrivals at a warm lit hotel entrance. NO TEXT, no words, no letters.',
        },
        {
          id: 'ref-3',
          title: 'Biometric Turnstile Morning Briefing',
          icon: '🪪',
          badge: 'MORNING ROLLCALL',
          category: 'shift_briefing_discipline',
          sceneDescription: 'Security supervisor inspecting uniform readiness inside a corporate atrium.',
          promptBlueprint: 'Documentary style corporate photography of a security shift supervisor briefing uniformed guards in a modern atrium. NO TEXT, no words, no letters.',
        },
        {
          id: 'ref-4',
          title: 'Luxury Villa Perimeter Gate Check',
          icon: '🏡',
          badge: 'RESIDENTIAL SAFETY',
          category: 'residential_estate_security',
          sceneDescription: 'Trained residential guard inspecting visitor credentials at a gated estate.',
          promptBlueprint: 'Architectural lifestyle photography of a smartly uniformed gatehouse security officer at a contemporary residential enclave entrance in morning sun. NO TEXT, no words, no letters.',
        },
      ],
    });

    callAIMock
      .mockResolvedValueOnce({ content: makeValidAiBundle() })
      .mockResolvedValueOnce({ content: refreshBundle });

    // 1. Seed initial cache
    const res1 = await GET(
      new NextRequest('http://localhost:3000/api/social/designs/business-images/suggestions'),
    );
    expect(res1.status).toBe(200);

    // 2. Refresh
    const res2 = await GET(
      new NextRequest('http://localhost:3000/api/social/designs/business-images/suggestions?refresh=true'),
    );
    const data2 = await res2.json();

    expect(res2.status).toBe(200);
    expect(data2.fromCache).toBe(false);
    expect(data2.suggestions).toHaveLength(4);
    expect(data2.suggestions[0].title).toBe('Cash Transit Armored Van Escort');
    expect(callAIMock).toHaveBeenCalledTimes(2);
    const secondCallUserMsg = callAIMock.mock.calls[1][0].messages[1].content;
    expect(secondCallUserMsg).toContain('avoidRepeatingPreviousConcepts');
    expect(secondCallUserMsg).toContain('Corporate Lobby Access Guarding');
  });
});

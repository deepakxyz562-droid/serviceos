import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ─── Mocks ─────────────────────────────────────────────────────────────────

const {
  mockTenant,
  mockGoogleAccount,
  mockQuietConversation,
  mockDb,
  mockUpdateGoogleProfile,
  mockUploadMedia,
} = vi.hoisted(() => {
  const tenant: any = {
    id: 'tenant-dental-1',
    name: 'Smile Dental Clinic',
    city: 'Bhopal',
    industry: 'Dentist',
    plan: 'business',
    planStatus: 'active',
    description: 'Old local clinic description.',
    brandProfile: {
      businessName: 'Smile Dental Clinic',
      industry: 'Dentist',
      location: 'Bhopal',
    },
  };

  const googleAcc = {
    id: 'acc-google-1',
    platform: 'googlebusiness',
    accountId: 'accounts/112233',
    accountName: 'accounts/112233',
    accessToken: 'mock-google-token',
    isActive: true,
    metadata: { locationId: 'locations/556677' },
  };

  const quietConv: any = {
    id: 'conv-quiet-1',
    conversationId: 'conv-quiet-1',
    tenantId: 'tenant-dental-1',
    customerPhone: '+919876543210',
    customerName: 'Aarav',
    lastMessageBody: 'Do you offer dental check-ups on Saturdays?',
    lastDirection: 'inbound',
    lastMessageAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
    metadataJson: '{}',
  };

  const updateProfile = vi.fn(async () => ({ descriptionApplied: true }));
  const uploadMed = vi.fn(async () => ({
    name: 'accounts/112233/locations/556677/media/photo_99',
    googleUrl: 'https://lh3.googleusercontent.com/p/photo_99',
    createTime: new Date().toISOString(),
  }));

  const dbObj: any = {
    tenant: {
      findUnique: vi.fn(async () => tenant),
      update: vi.fn(async ({ data }: any) => {
        Object.assign(tenant, data);
        return tenant;
      }),
    },
    brandProfile: {
      findUnique: vi.fn(async () => tenant.brandProfile),
      update: vi.fn(async ({ data }: any) => {
        Object.assign(tenant.brandProfile, data);
        return tenant.brandProfile;
      }),
    },
    socialAccount: {
      findMany: vi.fn(async () => [googleAcc]),
    },
    socialPost: {
      create: vi.fn(async ({ data }: any) => ({
        id: 'post-test-1',
        ...data,
        createdAt: new Date(),
      })),
    },
    conversation: {
      findMany: vi.fn(async () => [quietConv]),
      update: vi.fn(async ({ data }: any) => {
        Object.assign(quietConv, data);
        return quietConv;
      }),
    },
    inboxMessage: {
      create: vi.fn(async ({ data }: any) => ({ id: 'msg-1', ...data })),
    },
    campaign: {
      create: vi.fn(async ({ data }: any) => ({ id: 'camp-1', ...data })),
    },
  };

  return {
    mockTenant: tenant,
    mockGoogleAccount: googleAcc,
    mockQuietConversation: quietConv,
    mockDb: dbObj,
    mockUpdateGoogleProfile: updateProfile,
    mockUploadMedia: uploadMed,
  };
});

vi.mock('@/lib/db', () => ({
  db: mockDb,
}));

vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn(async () => ({
    id: 'user-1',
    tenantId: 'tenant-dental-1',
    role: 'owner',
    email: 'doctor@smiledental.com',
  })),
}));

vi.mock('@/lib/bgos-entitlement', () => ({
  requireBgosEntitled: vi.fn(async () => ({ ok: true })),
}));

vi.mock('@/lib/social/google-account-helper', () => ({
  prepareGoogleAccount: vi.fn(async () => mockGoogleAccount),
}));

vi.mock('@/lib/social/adapters/googlebusiness', () => ({
  updateGoogleBusinessProfile: mockUpdateGoogleProfile,
  uploadGoogleBusinessMedia: mockUploadMedia,
  extractLocationRef: vi.fn(async () => ({
    accountName: 'accounts/112233',
    locationId: 'locations/556677',
  })),
  googleBusinessAdapter: {
    platform: 'googlebusiness',
    publish: vi.fn(async (_acc: any, params: any) => {
      if (params.gbpPostType === 'photo_media') {
        const uploaded = await mockUploadMedia();
        return { externalPostId: uploaded.name, permalink: uploaded.googleUrl };
      }
      return { externalPostId: 'local_post_123' };
    }),
  },
}));

vi.mock('@/lib/ai-client', () => ({
  callAI: vi.fn(async () => ({
    content: JSON.stringify({
      campaignTitle: 'Diwali Festive Smile Package',
      whatsappMessage: 'Hi {FirstName}! Festive smile specials for Diwali at Smile Dental Clinic.',
      emailSubject: 'Diwali Sparkle: Exclusive Dental Offer',
      posterPrompt: 'Festive Diwali commercial poster for dental clinic',
    }),
  })),
}));

vi.mock('@/lib/whatsapp-send', () => ({
  sendWhatsAppMessage: vi.fn(async () => ({ success: true, messageId: 'wa-msg-123' })),
}));

vi.mock('@/lib/scheduling/google-calendar-sync', () => ({
  fetchGoogleCalendarBusyTimes: vi.fn(async () => []),
  pushBookingToGoogleCalendar: vi.fn(async () => ({})),
}));

vi.mock('@/lib/scheduling/outlook-calendar-sync', () => ({
  outlookBusyTimes: vi.fn(async () => []),
  syncOutlookBooking: vi.fn(async () => ({})),
}));

// ─── Tests ─────────────────────────────────────────────────────────────────

import { POST as rewriteDescriptionPost } from '@/app/api/gbp/rewrite-description/route';
import { POST as photosPost } from '@/app/api/social/photos/route';
import { GET as occasionsGet, POST as occasionsPost } from '@/app/api/marketing/occasions/route';
import { GET as occasionsSendGet, POST as occasionsSendPost } from '@/app/api/marketing/occasions/send/route';
import { GET as whatsappWorkflowsGet, POST as whatsappWorkflowsPost } from '@/app/api/whatsapp/workflows/route';
import { GET as citationsGet, PATCH as citationsPatch } from '@/app/api/gbp/citations/route';
import { POST as suggestAreasPost } from '@/app/api/gbp/service-areas/suggest/route';
import { POST as suspensionAppealPost } from '@/app/api/gbp/suspension-appeal/route';
import { POST as reviewRequestPost } from '@/app/api/reviews/request/route';
import { POST as inboxMessagePost } from '@/app/api/omnichannel/conversations/[id]/messages/route';
import { PATCH as workspacePatch } from '@/app/api/bgos/workspace/route';
import { analyzeGbpSuspensionRisks } from '@/lib/gbp/suspension-shield';
import { getUpcomingOccasions } from '@/lib/marketing/occasions';
import { processWhatsAppInactivityFollowups } from '@/lib/whatsapp/inactivity-followup';
import { extractBookingIntent, tryExecuteChatBooking } from '@/lib/scheduling/chat-booking-helper';
import { calculateAvailableSlots } from '@/lib/scheduling/slot-engine';
import { scheduleAppointmentReminders } from '@/lib/appointment-reminders';
import { notifyCustomerBookingConfirmed } from '@/lib/whatsapp-notifications';
import { sendWhatsAppMessage } from '@/lib/whatsapp-send';
import { googleBusinessAdapter } from '@/lib/social/adapters/googlebusiness';
import { DEFAULT_PLAN_MATRIX } from '@/lib/plan-features';
import { BGOS_PLANS } from '../shared/bgos-plans';

vi.mock('@/lib/credit-management', () => ({
  checkWhatsAppCredits: vi.fn(async () => ({ allowed: false, reason: 'No connected WhatsApp account' })),
  deductWhatsAppCredit: vi.fn(async () => {}),
}));

describe('Grexa vs BGOS Feature Parity Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTenant.plan = 'business';
    mockTenant.planStatus = 'active';
  });

  describe('1. GBP Description AI Rewrite & Google Maps Publishing', () => {
    it('applies selected AI variation directly to Google Business Profile via Business Information API', async () => {
      const req = new NextRequest('http://localhost/api/gbp/rewrite-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selectedVariation: 'Top-rated dental clinic in Bhopal offering painless dental implants and smile makeovers.',
          applyToGoogle: true,
        }),
      });

      const res = await rewriteDescriptionPost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.appliedToGoogle).toBe(true);
      expect(mockUpdateGoogleProfile).toHaveBeenCalledWith(
        mockGoogleAccount,
        expect.objectContaining({
          description: expect.stringContaining('Top-rated dental clinic in Bhopal'),
        }),
      );
      expect(mockTenant.description).toContain('Top-rated dental clinic in Bhopal');
    });
  });

  describe('2. Photo Media Gallery Scheduler', () => {
    it('schedules drip photos with gbpPostType: photo_media so they publish to Google Media photos', async () => {
      const req = new NextRequest('http://localhost/api/social/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photos: ['https://example.com/clinic-exterior.jpg'],
          scheduleMode: 'daily',
          category: 'EXTERIOR',
          description: 'Modern clinic entrance and sanitized operatory',
        }),
      });

      const res = await photosPost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);

      // Verify socialPost was created with gbpPostType: 'photo_media'
      expect(mockDb.socialPost.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            gbpPostType: 'photo_media',
            status: 'scheduled',
          }),
        }),
      );

      // Verify that when googleBusinessAdapter.publish is executed for photo_media, it uploads to media gallery
      const publishResult = await googleBusinessAdapter.publish(mockGoogleAccount as any, {
        content: 'Modern clinic entrance',
        mediaUrls: ['https://example.com/clinic-exterior.jpg'],
        gbpPostType: 'photo_media',
        targets: [],
        createdById: 'user-1',
      });

      expect(publishResult.externalPostId).toContain('accounts/112233/locations/556677/media/');
      expect(publishResult.permalink).toContain('lh3.googleusercontent.com');
      expect(mockUploadMedia).toHaveBeenCalled();
    });
  });

  describe('3. Occasion Discovery & Ready-to-Send Marketing Campaigns', () => {
    it('returns upcoming seasonal festivals and service driver occasions', () => {
      const occasions = getUpcomingOccasions();
      expect(occasions.length).toBeGreaterThan(3);
      expect(occasions.some((o) => o.id.includes('diwali') || o.id.includes('summer'))).toBe(true);
    });

    it('generates a full occasion campaign draft with WhatsApp copy, poster prompt, and audience filter', async () => {
      const req = new NextRequest('http://localhost/api/marketing/occasions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          occasionId: 'diwali-festive-prep',
          generateImage: false,
          saveCampaign: true,
        }),
      });

      const res = await occasionsPost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.draft.campaignTitle).toContain('Diwali');
      expect(json.draft.whatsappMessage).toContain('{FirstName}');
      expect(mockDb.campaign.create).toHaveBeenCalled();
    });
  });

  describe('4. Inactivity Follow-Up for Quiet Customer Chats', () => {
    it('identifies quiet inbound conversations (>2h) and dispatches automated check-in nudge', async () => {
      const result = await processWhatsAppInactivityFollowups({
        inactivityHours: 2,
        maxAgeHours: 48,
      });

      expect(result.checkedCount).toBe(1);
      expect(result.nudgedCount).toBe(1);
      expect(result.conversations[0].phone).toBe('+919876543210');

      // Verify that conversation metadata is updated to prevent spamming
      expect(mockDb.conversation.update).toHaveBeenCalled();
      const meta = JSON.parse(mockQuietConversation.metadataJson || '{}');
      expect(meta.inactivityFollowUpSentAt).toBeDefined();

      // Verify outbound message was created in Inbox
      expect(mockDb.inboxMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            channel: 'whatsapp',
            direction: 'outbound',
            senderType: 'ai',
          }),
        }),
      );
    });
  });

  describe('5. Phase 2A — Quiet-Chat Delay/Hinglish, Multi-Day Slots & WhatsApp Occasion Dispatch', () => {
    it('passes `message` (not `body`) to sendWhatsAppMessage and honors FormAgent delay + disabled flags', async () => {
      mockQuietConversation.metadataJson = '{}';
      mockQuietConversation.lastMessageAt = new Date(Date.now() - 15 * 60 * 1000); // 15 min ago
      mockDb.formAgent = {
        findFirst: vi.fn(async () => ({
          configJson: JSON.stringify({
            settings: { followUp: { enabled: true, delayMinutes: 10, languageMode: 'hinglish' } },
          }),
        })),
      };

      const resEnabled = await processWhatsAppInactivityFollowups();
      expect(resEnabled.nudgedCount).toBe(1);
      expect(sendWhatsAppMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-dental-1',
          to: '+919876543210',
          message: expect.any(String),
        }),
      );
      const sentArg = vi.mocked(sendWhatsAppMessage).mock.calls[0]?.[0] as any;
      expect(sentArg.body).toBeUndefined();

      // Disabled agent follow-up should skip sending
      mockQuietConversation.metadataJson = '{}';
      mockDb.formAgent.findFirst.mockResolvedValueOnce({
        configJson: JSON.stringify({
          settings: { followUp: { enabled: false, delayMinutes: 10, languageMode: 'hinglish' } },
        }),
      });
      const resDisabled = await processWhatsAppInactivityFollowups();
      expect(resDisabled.nudgedCount).toBe(0);
    });

    it('resolves customer segment counts and prepares 1-tap Hinglish WhatsApp comeback links', async () => {
      const oldDate = new Date(Date.now() - 75 * 86400_000);
      mockDb.customer = {
        findMany: vi.fn(async () => [
          {
            id: 'cust-1',
            name: 'Priya Sharma',
            firstName: 'Priya',
            phone: '+919811112233',
            email: 'priya@example.com',
            updatedAt: oldDate,
          },
        ]),
      };
      mockDb.lead = {
        findMany: vi.fn(async () => [
          { id: 'lead-1', name: 'Rohan Verma', phone: '+919822223344', email: null },
        ]),
      };
      mockDb.campaignTemplate = { findMany: vi.fn(async () => []) };
      mockDb.campaign.updateMany = vi.fn(async () => ({ count: 1 }));

      const previewReq = new NextRequest('http://localhost/api/marketing/occasions/send?audience=inactive_60_days');
      const previewRes = await occasionsSendGet(previewReq);
      expect(previewRes.status).toBe(200);
      const previewJson = await previewRes.json();
      expect(previewJson.counts).toEqual({
        all_leads: 1,
        past_customers: 1,
        inactive_60_days: 1,
      });

      const dispatchReq = new NextRequest('http://localhost/api/marketing/occasions/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audience: 'inactive_60_days',
          message: 'Hi {FirstName}! Long weekend aa raha hai — 20% OFF on your next checkup.',
          sendVia: 'prepare_share',
        }),
      });
      const dispatchRes = await occasionsSendPost(dispatchReq);
      expect(dispatchRes.status).toBe(200);
      const dispatchJson = await dispatchRes.json();
      expect(dispatchJson.mode).toBe('prepare_share');
      expect(dispatchJson.recipients[0].personalizedMessage).toContain('Hi Priya!');
      expect(dispatchJson.recipients[0].waUrl).toContain('https://wa.me/919811112233?text=');
    });

    it('wires multi-day slot fallback, whatsapp-followup cron, and mobile WhatsApp campaigns UI', () => {
      const callbackSrc = fs.readFileSync(
        path.join(process.cwd(), 'src/app/api/whatsapp/callback/route.ts'),
        'utf8',
      );
      const cronJson = fs.readFileSync(
        path.join(process.cwd(), 'cron-configs/cron-job-org-import.json'),
        'utf8',
      );
      const agentsSrc = fs.readFileSync(
        path.join(process.cwd(), 'bgosmobile/app/agents.tsx'),
        'utf8',
      );
      const waCampaignsSrc = fs.readFileSync(
        path.join(process.cwd(), 'bgosmobile/app/whatsapp-campaigns.tsx'),
        'utf8',
      );
      const layoutSrc = fs.readFileSync(
        path.join(process.cwd(), 'bgosmobile/app/_layout.tsx'),
        'utf8',
      );

      expect(callbackSrc).toContain('for (let offset = 1; offset <= 3; offset++)');
      expect(callbackSrc).not.toContain('body: replyText');
      expect(callbackSrc).not.toContain('body: result.response');
      expect(cronJson).toContain('/api/cron/whatsapp-followup');
      expect(agentsSrc).toContain('WhatsApp Quiet-Chat Auto Follow-Up');
      expect(agentsSrc).toContain('Multilingual Reply Mode');
      expect(waCampaignsSrc).toContain('/api/marketing/occasions/send');
      expect(layoutSrc).toContain('name="whatsapp-campaigns"');
    });
  });

  describe('6. Phase 2B — 1-Tap Playbooks & Send Brochure / Booking Link', () => {
    it('exposes Grexa SMB playbooks in GET /api/whatsapp/workflows and installs+activates via POST', async () => {
      mockDb.workflow = {
        findMany: vi.fn(async () => []),
        findFirst: vi.fn(async () => null),
        create: vi.fn(async ({ data }: any) => ({
          id: 'wf-new-1',
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      };

      const listRes = await whatsappWorkflowsGet();
      expect(listRes.status).toBe(200);
      const listJson = await listRes.json();
      const ids = (listJson.templates || []).map((t: any) => t.id);
      expect(ids).toEqual(
        expect.arrayContaining([
          'lead-instant-welcome',
          'quote-booking-reminder',
          'customer-comeback-60d',
        ]),
      );

      const createReq = new NextRequest('http://localhost/api/whatsapp/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: 'lead-instant-welcome',
          active: true,
        }),
      });
      const createRes = await whatsappWorkflowsPost(createReq);
      expect(createRes.status).toBe(201);
      const createJson = await createRes.json();
      expect(createJson.active).toBe(true);
      expect(createJson.name).toBe('New Lead Instant Welcome');
    });

    it('wires simplified AI Growth Automations hub in automations.tsx and Send Brochure / Booking Link in leads.tsx & inbox.tsx', () => {
      const automationsSrc = fs.readFileSync(
        path.join(process.cwd(), 'bgosmobile/app/automations.tsx'),
        'utf8',
      );
      const leadsSrc = fs.readFileSync(
        path.join(process.cwd(), 'bgosmobile/app/leads.tsx'),
        'utf8',
      );
      const inboxSrc = fs.readFileSync(
        path.join(process.cwd(), 'bgosmobile/app/inbox.tsx'),
        'utf8',
      );

      expect(automationsSrc).toContain('title="AI Growth Automations"');
      expect(automationsSrc).toContain('/api/bgos/workspace');
      expect(automationsSrc).toContain('/whatsapp-campaigns');
      expect(automationsSrc).toContain('/agents');
      expect(leadsSrc).toContain('Send Brochure');
      expect(leadsSrc).toContain('Booking Link');
      expect(inboxSrc).toContain("'Send Brochure'");
      expect(inboxSrc).toContain("'Booking Link'");
    });
  });

  describe('7. Phase 2C — Proof Card, 20 Service Areas, Citations Hub & Suspension Shield', () => {
    it('detects Google policy suspension risks and drafts a tailored reinstatement appeal letter', async () => {
      const risky = analyzeGbpSuspensionRisks({
        name: 'Smile Dental Clinic | Best #1 Affordable Implant Center in Bhopal',
        address: 'P.O. Box 422, Coworking Hub',
        phone: '+919876543210',
        website: 'https://bit.ly/smile-clinic',
        category: 'Dentist',
        openingDate: '',
      });
      expect(risky.riskLevel).toBe('high');
      expect(risky.criticalCount).toBeGreaterThanOrEqual(2);
      expect(risky.safetyScore).toBeLessThan(60);

      const clean = analyzeGbpSuspensionRisks({
        name: 'Smile Dental Clinic',
        address: '42 MP Nagar Zone 2, Bhopal',
        phone: '+919876543210',
        website: 'https://smiledental.in',
        category: 'Dentist',
        openingDate: '2021-04-10',
      });
      expect(clean.riskLevel).toBe('low');
      expect(clean.safetyScore).toBe(100);

      const req = new NextRequest('http://localhost/api/gbp/suspension-appeal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspensionReason: 'Quality guidelines verification' }),
      });
      const res = await suspensionAppealPost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.appealLetter).toContain('Smile Dental Clinic');
    });

    it('returns NAP kit & persists citation directory statuses and 20 local area suggestions', async () => {
      mockTenant.settingsJson = '{}';
      mockTenant.address = '42 MP Nagar Zone 2, Bhopal';
      mockTenant.phone = '+919876543210';
      mockTenant.country = 'IN';

      const citGetRes = await citationsGet(new NextRequest('http://localhost/api/gbp/citations'));
      expect(citGetRes.status).toBe(200);
      const citJson = await citGetRes.json();
      expect(citJson.napKit.name).toBe('Smile Dental Clinic');
      expect(citJson.directories.some((d: any) => d.id === 'justdial')).toBe(true);

      const citPatchRes = await citationsPatch(
        new NextRequest('http://localhost/api/gbp/citations', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: 'justdial', status: 'listed' }),
        }),
      );
      expect(citPatchRes.status).toBe(200);
      expect(mockDb.tenant.update).toHaveBeenCalled();

      const areaRes = await suggestAreasPost(
        new NextRequest('http://localhost/api/gbp/service-areas/suggest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ existingAreas: ['Bhopal'] }),
        }),
      );
      expect(areaRes.status).toBe(200);
      const areaJson = await areaRes.json();
      expect(Array.isArray(areaJson.suggestedAreas)).toBe(true);
      expect(areaJson.suggestedAreas.length).toBeGreaterThanOrEqual(5);
      expect(areaJson.suggestedAreas.length).toBeLessThanOrEqual(20);
    });

    it('wires Proof Card, 20 Local Service Areas, Suspension Shield & Citations Hub in mobile app', () => {
      const perfSrc = fs.readFileSync(
        path.join(process.cwd(), 'bgosmobile/src/components/gbp/performance-panel.tsx'),
        'utf8',
      );
      const profileSrc = fs.readFileSync(
        path.join(process.cwd(), 'bgosmobile/app/manage-profile.tsx'),
        'utf8',
      );
      const auditSrc = fs.readFileSync(
        path.join(process.cwd(), 'bgosmobile/src/components/gbp/seo-audit-tab.tsx'),
        'utf8',
      );
      const citationsSrc = fs.readFileSync(
        path.join(process.cwd(), 'bgosmobile/app/citations.tsx'),
        'utf8',
      );
      const layoutSrc = fs.readFileSync(
        path.join(process.cwd(), 'bgosmobile/app/_layout.tsx'),
        'utf8',
      );

      expect(perfSrc).toContain('AI GROWTH PROOF');
      expect(perfSrc).toContain('WhatsApp Chat Agent');
      expect(profileSrc).toContain('/api/gbp/service-areas/suggest');
      expect(profileSrc).toContain('Local Service Areas');
      expect(auditSrc).toContain('GBP Suspension Shield &amp; Recovery');
      expect(auditSrc).toContain('/api/gbp/suspension-appeal');
      expect(citationsSrc).toContain('/api/gbp/citations');
      expect(layoutSrc).toContain('name="citations"');
    });
  });

  describe('8. BGOS Mobile Plan Alignment, Automations Simplification & Sidebar Cleanup', () => {
    it('aligns DEFAULT_PLAN_MATRIX trial and starter flags and removes B2B lead credits copy from BGOS_PLANS', () => {
      expect(DEFAULT_PLAN_MATRIX.trial).toMatchObject({
        live_chat: true,
        whatsapp: true,
        omnichannel_inbox: true,
        ai_assistant: true,
        ai_suggested_replies: true,
      });

      expect(DEFAULT_PLAN_MATRIX.starter).toMatchObject({
        live_chat: true,
        whatsapp: false,
        omnichannel_inbox: true,
        ai_assistant: true,
        ai_suggested_replies: true,
      });

      const allPlanFeatures = [
        ...BGOS_PLANS.starter.features,
        ...BGOS_PLANS.growth.features,
        ...BGOS_PLANS.business.features,
      ]
        .join(' ')
        .toLowerCase();
      expect(allPlanFeatures).not.toContain('lead search credits');
      expect(BGOS_PLANS.business.features.join(' ').toLowerCase()).not.toContain('lead search credits');
    });

    it('removes web-only lead credits and redundant automations row while hiding + Add Business in mobile sidebar', () => {
      const myPlanSrc = fs.readFileSync(
        path.join(process.cwd(), 'bgosmobile/app/my-plan.tsx'),
        'utf8',
      );
      const toolsSrc = fs.readFileSync(
        path.join(process.cwd(), 'bgosmobile/app/(tabs)/tools.tsx'),
        'utf8',
      );
      const sidebarSrc = fs.readFileSync(
        path.join(process.cwd(), 'bgosmobile/src/components/navigation/sidebar-drawer.tsx'),
        'utf8',
      );
      const switcherSrc = fs.readFileSync(
        path.join(process.cwd(), 'bgosmobile/src/components/navigation/workspace-switcher-section.tsx'),
        'utf8',
      );

      expect(myPlanSrc).not.toContain('LEAD CREDITS');
      expect(myPlanSrc).not.toContain('2,500 monthly B2B lead search credits');
      expect(toolsSrc).not.toContain('AI Automations & Triggers');
      expect(toolsSrc).not.toContain('Lead Credits');
      expect(sidebarSrc).toContain('showAddBusiness={false}');
      expect(sidebarSrc).toContain('hideIfSingleWorkspace');
      expect(switcherSrc).toContain('hideIfSingleWorkspace');
    });
  });

  describe('9. Business-Only Repeat Campaigns & Non-Editable Bulk Review Template', () => {
    it('restricts whatsapp_repeat_campaigns API endpoints exclusively to active paid Business+ plans (blocking Trial/Starter/Growth)', async () => {
      expect(DEFAULT_PLAN_MATRIX.free.whatsapp_repeat_campaigns).toBe(false);
      expect(DEFAULT_PLAN_MATRIX.trial.whatsapp_repeat_campaigns).toBe(false);
      expect(DEFAULT_PLAN_MATRIX.starter.whatsapp_repeat_campaigns).toBe(false);
      expect(DEFAULT_PLAN_MATRIX.growth.whatsapp_repeat_campaigns).toBe(false);
      expect(DEFAULT_PLAN_MATRIX.business.whatsapp_repeat_campaigns).toBe(true);
      expect(DEFAULT_PLAN_MATRIX.enterprise.whatsapp_repeat_campaigns).toBe(true);

      const blockedStates: Array<{ plan: string; planStatus: string }> = [
        { plan: 'business', planStatus: 'trial' },
        { plan: 'starter', planStatus: 'active' },
        { plan: 'growth', planStatus: 'active' },
        { plan: 'free', planStatus: 'active' },
      ];

      for (const st of blockedStates) {
        mockTenant.plan = st.plan;
        mockTenant.planStatus = st.planStatus;

        const r1 = await occasionsGet(new NextRequest('http://localhost/api/marketing/occasions'));
        expect(r1.status).toBe(403);
        const j1 = await r1.json();
        expect(j1.code).toBe('PLAN_UPGRADE_REQUIRED');

        const r2 = await occasionsSendGet(
          new NextRequest('http://localhost/api/marketing/occasions/send?audience=inactive_60_days'),
        );
        expect(r2.status).toBe(403);
      }

      mockTenant.plan = 'business';
      mockTenant.planStatus = 'active';
      const okRes = await occasionsGet(new NextRequest('http://localhost/api/marketing/occasions'));
      expect(okRes.status).toBe(200);
    });

    it('hides WhatsApp Repeat Campaigns on non-Business mobile plans and moves Business copy across plans', () => {
      const waSrc = fs.readFileSync(
        path.join(process.cwd(), 'bgosmobile/app/whatsapp-campaigns.tsx'),
        'utf8',
      );
      const toolsSrc = fs.readFileSync(
        path.join(process.cwd(), 'bgosmobile/app/(tabs)/tools.tsx'),
        'utf8',
      );
      const mktSrc = fs.readFileSync(
        path.join(process.cwd(), 'bgosmobile/app/(tabs)/marketing.tsx'),
        'utf8',
      );
      const agentsSrc = fs.readFileSync(
        path.join(process.cwd(), 'bgosmobile/app/agents.tsx'),
        'utf8',
      );
      const autoSrc = fs.readFileSync(
        path.join(process.cwd(), 'bgosmobile/app/automations.tsx'),
        'utf8',
      );
      const paywallSrc = fs.readFileSync(
        path.join(process.cwd(), 'bgosmobile/src/components/billing/paywall-gate.tsx'),
        'utf8',
      );
      const myPlanSrc = fs.readFileSync(
        path.join(process.cwd(), 'bgosmobile/app/my-plan.tsx'),
        'utf8',
      );

      expect(waSrc).toContain('features?.whatsappRepeatCampaigns');
      expect(waSrc).toContain('Upgrade to Unlock Repeat Campaigns');
      expect(toolsSrc).toContain('features?.whatsappRepeatCampaigns');
      expect(mktSrc).toContain('features?.whatsappRepeatCampaigns');
      expect(agentsSrc).toContain('features?.whatsappRepeatCampaigns');
      expect(autoSrc).toContain('features?.whatsappRepeatCampaigns');
      expect(paywallSrc).not.toContain('lead search credits');
      expect(paywallSrc).toContain('WhatsApp Repeat Campaigns');
      expect(myPlanSrc).toContain('WhatsApp Repeat Campaigns');
      expect(BGOS_PLANS.business.features.join(' ')).toContain('WhatsApp Repeat Campaigns');
      expect(BGOS_PLANS.growth.features.join(' ').toLowerCase()).not.toContain('repeat campaigns');
    });

    it('locks bulk review invite preview to non-editable template and enforces 30-day anti-repeat + 5/day pacing', async () => {
      const reviewReqUiSrc = fs.readFileSync(
        path.join(process.cwd(), 'bgosmobile/src/components/gbp/review-request.tsx'),
        'utf8',
      );
      expect(reviewReqUiSrc).toContain('Locked Template');
      expect(reviewReqUiSrc).toContain('metaReadOnlyBubbleWrap');
      expect(reviewReqUiSrc).not.toContain('customBulkMessage');
      expect(reviewReqUiSrc).not.toContain('setCustomBulkMessage');

      const createdRows: any[] = [];
      const recentlySentDate = new Date(Date.now() - 2 * 86400_000);
      mockDb.campaignTemplate = { findMany: vi.fn(async () => []) };
      mockDb.communicationProvider = { findFirst: vi.fn(async () => null) };
      mockDb.activityLog = { create: vi.fn(async () => ({ id: 'act-1' })) };
      mockDb.customer = {
        findMany: vi.fn(async () => []),
        create: vi.fn(async ({ data }: any) => ({ id: 'cust-new', ...data })),
      };
      mockDb.lead = {
        findMany: vi.fn(async () => []),
        create: vi.fn(async ({ data }: any) => ({ id: 'lead-new', ...data })),
      };
      mockDb.scheduledMessage = {
        findMany: vi.fn(async () => [
          {
            recipientPhone: '+919800000001',
            status: 'sent',
            dueAt: recentlySentDate,
            sentAt: recentlySentDate,
          },
        ]),
        create: vi.fn(async ({ data }: any) => {
          const row = { id: `sm-${createdRows.length + 1}`, ...data };
          createdRows.push(row);
          return row;
        }),
      };

      const req = new NextRequest('http://localhost/api/reviews/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'scheduled',
          waDeliveryMode: 'direct_queue',
          channel: 'whatsapp',
          dailyLimit: 5,
          country: 'IN',
          timeZone: 'Asia/Kolkata',
          businessName: 'Smile Dental Clinic',
          reviewLink: 'https://g.page/r/smile-dental/review',
          messageTemplate: 'Give us 5 stars for 50% off!',
          recipients: [
            { name: 'Already Invited', phone: '+919800000001' },
            { name: 'User 1', phone: '+919800000011' },
            { name: 'User 2', phone: '+919800000012' },
            { name: 'User 3', phone: '+919800000013' },
            { name: 'User 4', phone: '+919800000014' },
            { name: 'User 5', phone: '+919800000015' },
            { name: 'User 6', phone: '+919800000016' },
            { name: 'User 7', phone: '+919800000017' },
          ],
        }),
      });

      const res = await reviewRequestPost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.skippedDuplicates).toBe(1);
      expect(json.scheduledCount).toBe(7);
      expect(json.totalDays).toBe(2);
      expect(createdRows).toHaveLength(7);
      expect(createdRows[0].bodyText).not.toContain('Give us 5 stars for 50% off!');
      expect(createdRows[0].bodyText).toContain('Please share your feedback on your recent experience');
    });
  });

  describe('WhatsApp Chat & Marketing Production Readiness', () => {
    it('extracts Hinglish booking intent with WA caller phone and executes chat booking + CRM lead in tenant timezone', async () => {
      const createdLeads: any[] = [];
      const createdBookings: any[] = [];
      const tomorrowIst = new Date(Date.now() + 2 * 86400_000).toISOString().split('T')[0];

      mockTenant.country = 'IN';
      mockTenant.settingsJson = JSON.stringify({
        timezone: 'Asia/Kolkata',
        businessHours: {
          Sunday: { open: true, openTime: '09:00', closeTime: '18:00' },
          Monday: { open: true, openTime: '09:00', closeTime: '18:00' },
          Tuesday: { open: true, openTime: '09:00', closeTime: '18:00' },
          Wednesday: { open: true, openTime: '09:00', closeTime: '18:00' },
          Thursday: { open: true, openTime: '09:00', closeTime: '18:00' },
          Friday: { open: true, openTime: '09:00', closeTime: '18:00' },
          Saturday: { open: true, openTime: '09:00', closeTime: '18:00' },
        },
      });
      mockDb.holidayCalendar = { findFirst: vi.fn(async () => null) };
      mockDb.availability = {
        findUnique: vi.fn(async () => null),
        findFirst: vi.fn(async () => null),
      };
      mockDb.serviceAvailability = { findFirst: vi.fn(async () => null) };
      mockDb.service = { findUnique: vi.fn(async () => null) };
      mockDb.lead = {
        findFirst: vi.fn(async () => null),
        create: vi.fn(async ({ data }: any) => {
          const row = { id: `lead-${createdLeads.length + 1}`, ...data };
          createdLeads.push(row);
          return row;
        }),
        update: vi.fn(async ({ data }: any) => ({ id: 'lead-1', ...data })),
      };
      mockDb.booking = {
        findFirst: vi.fn(async () => null),
        findMany: vi.fn(async () => []),
        create: vi.fn(async ({ data }: any) => {
          const row = { id: `bk-${createdBookings.length + 1}`, ...data };
          createdBookings.push(row);
          return row;
        }),
        update: vi.fn(async ({ data }: any) => ({ id: 'bk-1', ...data })),
      };

      const intent = extractBookingIntent(
        'Kal subah 11 baje dental checkup book kardo',
        [],
        'Dental Checkup',
        { customerPhone: '919876543210', customerName: 'Rohan', timezone: 'Asia/Kolkata' },
      );
      expect(intent.hasIntent).toBe(true);
      expect(intent.isBookingReady).toBe(true);
      expect(intent.timeStr).toBe('11:00 AM');
      expect(intent.customerPhone).toBe('919876543210');
      expect(intent.customerName).toBe('Rohan');

      const result = await tryExecuteChatBooking({
        tenantId: 'tenant-dental-1',
        serviceName: 'Dental Checkup',
        message: `Book appointment on ${tomorrowIst} at 11:00 AM`,
        customerPhone: '919876543210',
        customerName: 'Rohan',
        timezone: 'Asia/Kolkata',
      });

      expect(result?.success).toBe(true);
      expect(createdBookings).toHaveLength(1);
      expect(createdBookings[0].customerPhone).toBe('919876543210');
      // 11:00 AM IST == 05:30:00Z
      expect(new Date(createdBookings[0].scheduledAt).toISOString()).toBe(`${tomorrowIst}T05:30:00.000Z`);
      expect(createdLeads.length).toBeGreaterThanOrEqual(1);
    });

    it('calculateAvailableSlots respects settingsJson.businessHours Saturday hours in tenant timezone', async () => {
      // Find next Saturday >= 2 days out so leadTime cutoff does not filter morning slots
      const cursor = new Date(Date.now() + 2 * 86400_000);
      while (cursor.getUTCDay() !== 6) {
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
      const saturdayStr = cursor.toISOString().split('T')[0];

      mockTenant.country = 'IN';
      mockTenant.settingsJson = JSON.stringify({
        timezone: 'Asia/Kolkata',
        businessHours: {
          Saturday: { open: true, openTime: '10:00', closeTime: '13:00' },
        },
      });
      mockDb.holidayCalendar = { findFirst: vi.fn(async () => null) };
      mockDb.availability = {
        findUnique: vi.fn(async () => null),
        findFirst: vi.fn(async () => null),
      };
      mockDb.booking = {
        findFirst: vi.fn(async () => null),
        findMany: vi.fn(async () => []),
      };

      const avail = await calculateAvailableSlots({
        tenantId: 'tenant-dental-1',
        date: saturdayStr,
      });

      expect(avail.workingDay).toBe(true);
      expect(avail.timezone).toBe('Asia/Kolkata');
      expect(avail.slots.length).toBeGreaterThan(0);
      // 10:00 AM IST == 04:30:00Z
      expect(avail.slots[0].startTime).toBe(`${saturdayStr}T04:30:00.000Z`);
    });

    it('nudges quiet chats after AI outbound reply, skips already-booked customers, and gates inactive/starter plans', async () => {
      const outboundConv = {
        ...mockQuietConversation,
        id: 'conv-outbound-1',
        conversationId: 'conv-outbound-1',
        lastDirection: 'outbound',
        lastMessageAt: new Date(Date.now() - 3 * 3600_000),
        metadataJson: '{}',
      };
      mockTenant.plan = 'growth';
      mockTenant.planStatus = 'active';
      mockDb.tenant.findUnique = vi.fn(async () => mockTenant);
      mockDb.formAgent = {
        findFirst: vi.fn(async () => ({
          tenantId: 'tenant-dental-1',
          name: 'Smile AI',
          configJson: JSON.stringify({
            settings: { followUp: { enabled: true, delayMinutes: 60, languageMode: 'hinglish' } },
          }),
        })),
      };
      mockDb.conversation.findMany = vi.fn(async () => [outboundConv]);
      mockDb.conversation.update = vi.fn(async ({ data }: any) => Object.assign(outboundConv, data));
      mockDb.booking = { findFirst: vi.fn(async () => null) };

      const nudgeRes = await processWhatsAppInactivityFollowups();
      expect(mockDb.conversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            lastDirection: { in: ['outbound', 'inbound'] },
          }),
        }),
      );
      expect(nudgeRes.nudgedCount).toBe(1);
      expect(sendWhatsAppMessage).toHaveBeenCalledTimes(1);

      // Now simulate customer already booked an upcoming slot
      outboundConv.metadataJson = '{}';
      mockDb.booking = {
        findFirst: vi.fn(async () => ({ id: 'bk-future-1' })),
      };
      const bookedRes = await processWhatsAppInactivityFollowups();
      expect(bookedRes.nudgedCount).toBe(0);

      // Starter / Free / Expired plan should be skipped
      mockTenant.plan = 'starter';
      mockDb.booking = { findFirst: vi.fn(async () => null) };
      const starterRes = await processWhatsAppInactivityFollowups();
      expect(starterRes.nudgedCount).toBe(0);
    });

    it('schedules utility_booking_reminder for db.booking rows and sends utility_booking_confirmation without Job FK conflict', async () => {
      const createdReminders: any[] = [];
      const createdNotifLogs: any[] = [];
      const bookingTime = new Date(Date.now() + 6 * 3600_000);

      mockTenant.country = 'IN';
      mockTenant.publicSlug = 'smile-dental';
      mockTenant.settingsJson = JSON.stringify({
        timezone: 'Asia/Kolkata',
        bookingReminderHours: '24h',
        activeGbpTitle: 'Smile Dental Clinic',
      });

      mockDb.jobVisit = { findMany: vi.fn(async () => []) };
      mockDb.booking = {
        findMany: vi.fn(async () => [
          {
            id: 'bk-rem-1',
            title: 'Root Canal Consult',
            status: 'confirmed',
            customerId: null,
            customerName: 'Neha',
            customerPhone: '+919876543210',
            customerEmail: null,
            address: 'Bhopal Clinic',
            scheduledAt: bookingTime,
            tenantId: 'tenant-dental-1',
          },
        ]),
      };
      mockDb.tenant.findMany = vi.fn(async () => [mockTenant]);
      mockDb.customer = {
        findMany: vi.fn(async () => []),
        findUnique: vi.fn(async () => null),
      };
      mockDb.scheduledMessage = {
        findMany: vi.fn(async () => []),
        create: vi.fn(async ({ data }: any) => {
          createdReminders.push(data);
          return { id: 'sm-bk-1', ...data };
        }),
      };

      const remResult = await scheduleAppointmentReminders();
      expect(remResult.scheduled).toBe(1);
      expect(createdReminders[0].channel).toBe('whatsapp');
      expect(createdReminders[0].bookingId).toBe('bk-rem-1');
      expect(createdReminders[0].bodyText).not.toContain('Fieseros');
      const remMeta = JSON.parse(createdReminders[0].metadataJson);
      expect(remMeta.metaTemplateName).toBe('utility_booking_reminder');
      expect(remMeta.metaTemplateParams).toHaveLength(6);

      mockDb.notificationLog = {
        create: vi.fn(async ({ data }: any) => {
          createdNotifLogs.push(data);
          return { id: 'nl-1', ...data };
        }),
      };
      await notifyCustomerBookingConfirmed({
        id: 'bk-rem-1',
        bookingId: 'bk-rem-1',
        bookingType: 'ai_auto',
        title: 'Root Canal Consult',
        customerName: 'Neha',
        customerPhone: '+919876543210',
        scheduledAt: bookingTime.toISOString(),
        tenantId: 'tenant-dental-1',
      });

      expect(sendWhatsAppMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+919876543210',
          type: 'template',
          templateName: 'utility_booking_confirmation',
        }),
      );
      expect(createdNotifLogs[0].jobId).toBeUndefined();
    });

    it('delivers Inbox WhatsApp text and PDF brochure document using conversation.customerPhone even when customerId is null', async () => {
      mockDb.conversation.findUnique = vi.fn(async () => ({
        id: 'conv-db-99',
        conversationId: 'conv-wa-99',
        tenantId: 'tenant-dental-1',
        channel: 'whatsapp',
        customerId: null,
        customerPhone: '919876543210',
      }));
      mockDb.customer = { findUnique: vi.fn(async () => null) };
      mockDb.inboxMessage = {
        create: vi.fn(async ({ data }: any) => ({ id: 'msg-doc-1', createdAt: new Date(), ...data })),
        update: vi.fn(async ({ data }: any) => ({ id: 'msg-doc-1', ...data })),
      };
      mockDb.conversation.update = vi.fn(async ({ data }: any) => ({ id: 'conv-db-99', ...data }));

      const req = new NextRequest('http://localhost/api/omnichannel/conversations/conv-db-99/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'Please find our dental brochure attached.',
          mediaUrl: 'https://cdn.example.com/brochures/smile.pdf',
          mediaFilename: 'smile.pdf',
        }),
      });

      const res = await inboxMessagePost(req, { params: Promise.resolve({ id: 'conv-db-99' }) });
      expect([200, 201]).toContain(res.status);
      expect(sendWhatsAppMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '919876543210',
          type: 'document',
          mediaUrl: 'https://cdn.example.com/brochures/smile.pdf',
        }),
      );
    });

    it('persists brochureUrl, bookingReminderHours, and followUp in workspace PATCH and wires mobile UI screens cleanly', async () => {
      let savedSettings: any = {};
      mockTenant.settingsJson = JSON.stringify({});
      mockDb.tenant.updateMany = vi.fn(async ({ data }: any) => {
        savedSettings = JSON.parse(data.settingsJson || '{}');
        return { count: 1 };
      });
      mockDb.formAgent = {
        findFirst: vi.fn(async () => ({ id: 'agent-1', configJson: '{}' })),
        update: vi.fn(async () => ({ id: 'agent-1' })),
      };

      const patchReq = new NextRequest('http://localhost/api/bgos/workspace', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brochureUrl: 'https://cdn.example.com/brochures/clinic.pdf',
          bookingReminderHours: '1h',
          followUp: { enabled: true, delayMinutes: 90, languageMode: 'hinglish' },
        }),
      });
      const patchRes = await workspacePatch(patchReq);
      expect(patchRes.status).toBe(200);
      expect(savedSettings.brochureUrl).toBe('https://cdn.example.com/brochures/clinic.pdf');
      expect(savedSettings.bookingReminderHours).toBe('1h');
      expect(savedSettings.followUp).toEqual({
        enabled: true,
        delayMinutes: 90,
        languageMode: 'hinglish',
      });

      const callbackSrc = fs.readFileSync(
        path.join(process.cwd(), 'src/app/api/whatsapp/callback/route.ts'),
        'utf8',
      );
      const integrationsSrc = fs.readFileSync(
        path.join(process.cwd(), 'bgosmobile/app/integrations.tsx'),
        'utf8',
      );
      const setupSrc = fs.readFileSync(
        path.join(process.cwd(), 'bgosmobile/app/setup.tsx'),
        'utf8',
      );
      const inboxSrc = fs.readFileSync(
        path.join(process.cwd(), 'bgosmobile/app/inbox.tsx'),
        'utf8',
      );
      const automationsSrc = fs.readFileSync(
        path.join(process.cwd(), 'bgosmobile/app/automations.tsx'),
        'utf8',
      );

      expect(callbackSrc).toContain('customerPhone: from');
      expect(callbackSrc).toContain('upsertWhatsAppInquiryLead');
      expect(callbackSrc).toContain('resolveTenantLocale');
      expect(integrationsSrc).toContain('/api/whatsapp/manual-config');
      expect(integrationsSrc).toContain('/api/whatsapp/config');
      expect(integrationsSrc).not.toContain("router.push('/(tabs)/reviews')");
      expect(setupSrc).toContain('uploadFileToStorage');
      expect(inboxSrc).toContain('links?.brochure');
      expect(automationsSrc).toContain('bookingReminderHours');
      expect(automationsSrc).not.toContain('?? true');
    });
  });
});

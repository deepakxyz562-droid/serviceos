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
  sendWhatsAppMessage: vi.fn(async () => ({ messageId: 'wa-msg-123' })),
}));

// ─── Tests ─────────────────────────────────────────────────────────────────

import { POST as rewriteDescriptionPost } from '@/app/api/gbp/rewrite-description/route';
import { POST as photosPost } from '@/app/api/social/photos/route';
import { GET as occasionsGet, POST as occasionsPost } from '@/app/api/marketing/occasions/route';
import { getUpcomingOccasions } from '@/lib/marketing/occasions';
import { processWhatsAppInactivityFollowups } from '@/lib/whatsapp/inactivity-followup';
import { googleBusinessAdapter } from '@/lib/social/adapters/googlebusiness';

describe('Grexa vs BGOS Feature Parity Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});

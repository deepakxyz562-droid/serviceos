import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  NOTIFICATION_TYPES,
  categoryForType,
  iconForType,
  shouldDeliverNotification,
} from '@/lib/notifications';
import { verifySocialCronAuth } from '@/lib/social/cron-auth';
import { PATCH as patchChecklist } from '@/app/api/jobs/[id]/checklist/route';
import { db } from '@/lib/db';
import * as authLib from '@/lib/auth';
import * as pushLib from '@/lib/web-push-send';

vi.mock('@/lib/email-send', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true, messageId: 'msg-test-123' }),
}));

vi.mock('@/lib/db', () => ({
  db: {
    tenant: {
      findUnique: vi.fn(),
    },
    job: {
      findUnique: vi.fn(),
    },
    jobChecklist: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    socialPost: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
    appNotification: {
      create: vi.fn(),
    },
    notificationPreference: {
      findFirst: vi.fn(),
    },
    customerTimelineEntry: {
      create: vi.fn(),
    },
    workspace: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn(),
}));

vi.mock('@/lib/web-push-send', () => ({
  sendWebPushToUser: vi.fn().mockResolvedValue({ sent: 1, failed: 0 }),
}));

describe('Checklist and Social Post Notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Notification System Registration', () => {
    it('registers checklist and post notification types', () => {
      expect(NOTIFICATION_TYPES).toContain('checklist_assigned');
      expect(NOTIFICATION_TYPES).toContain('checklist_completed');
      expect(NOTIFICATION_TYPES).toContain('checklist_reminder');
      expect(NOTIFICATION_TYPES).toContain('social_post');
      expect(NOTIFICATION_TYPES).toContain('daily_growth_tips');
      expect(NOTIFICATION_TYPES).toContain('gbp_photo_nudge');
    });

    it('maps checklist types to job category and social post to workflow category', () => {
      expect(categoryForType('checklist_assigned')).toBe('job');
      expect(categoryForType('checklist_completed')).toBe('job');
      expect(categoryForType('checklist_reminder')).toBe('job');
      expect(categoryForType('social_post')).toBe('workflow');
      expect(categoryForType('daily_growth_tips')).toBe('workflow');
      expect(categoryForType('gbp_photo_nudge')).toBe('workflow');
    });

    it('provides icons for checklist and social post types', () => {
      const chkDone = iconForType('checklist_completed');
      expect(chkDone.icon).toBe('CheckCircle2');
      expect(chkDone.color).toContain('emerald');

      const chkAssign = iconForType('checklist_assigned');
      expect(chkAssign.icon).toBe('ClipboardCheck');

      const socialPost = iconForType('social_post');
      expect(socialPost.icon).toBe('Share2');

      const dailyTips = iconForType('daily_growth_tips');
      expect(dailyTips.icon).toBe('Sparkles');

      const photoNudge = iconForType('gbp_photo_nudge');
      expect(photoNudge.icon).toBe('Camera');
      expect(photoNudge.color).toContain('blue');
    });

    it('evaluates delivery preferences for checklist and social post notifications', async () => {
      vi.mocked(db.notificationPreference.findFirst).mockResolvedValue(null as any);
      const allowed = await shouldDeliverNotification('usr-1', 'checklist_completed');
      expect(allowed).toBe(true);

      vi.mocked(db.notificationPreference.findFirst).mockResolvedValue({
        userId: 'usr-1',
        inAppEnabled: true,
        typePrefsJson: JSON.stringify({ checklist_completed: false }),
      } as any);

      const blocked = await shouldDeliverNotification('usr-1', 'checklist_completed');
      expect(blocked).toBe(false);
    });
  });

  describe('2. Checklist Completion Triggers Notifications & Web Push', () => {
    it('dispatches in-app notification and push to tenant managers when checklist completed', async () => {
      vi.mocked(authLib.getAuthUser).mockResolvedValue({
        id: 'tech-1',
        name: 'Alex Technician',
        tenantId: 'tenant-123',
      } as any);

      vi.mocked(db.job.findUnique).mockResolvedValue({
        id: 'job-999',
        customerId: 'cust-1',
        workspaceId: 'ws-1',
      } as any);

      vi.mocked(db.workspace.findUnique).mockResolvedValue({
        tenantId: 'tenant-123',
      } as any);

      vi.mocked(db.jobChecklist.findFirst).mockResolvedValue({
        id: 'jc-1',
        name: 'Safety Inspection',
        status: 'in_progress',
        itemsJson: '[]',
      } as any);

      vi.mocked(db.jobChecklist.update).mockResolvedValue({
        id: 'jc-1',
        name: 'Safety Inspection',
        status: 'completed',
        itemsJson: '[]',
      } as any);

      vi.mocked(db.user.findMany).mockResolvedValue([
        { id: 'mgr-1' },
        { id: 'mgr-2' },
      ] as any);

      vi.mocked(db.notificationPreference.findFirst).mockResolvedValue(null as any);
      vi.mocked(db.appNotification.create).mockResolvedValue({ id: 'notif-1' } as any);

      const req = new NextRequest('http://localhost/api/jobs/job-999/checklist', {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'completed',
        }),
      });

      const res = await patchChecklist(req, {
        params: Promise.resolve({ id: 'job-999' }),
      });

      expect(res.status).toBe(200);

      // Verify appNotification.create was called
      expect(db.appNotification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-123',
            recipientId: 'mgr-1',
            type: 'checklist_completed',
            title: expect.stringContaining('Safety Inspection'),
          }),
        }),
      );

      // Verify sendWebPushToUser was called for device push delivery
      expect(pushLib.sendWebPushToUser).toHaveBeenCalledWith(
        'mgr-1',
        'tenant-123',
        expect.objectContaining({
          title: expect.stringContaining('Safety Inspection'),
          tag: 'checklist-jc-1',
        }),
      );
    });
  });

  describe('3. Social Cron Auth Security', () => {
    it('accepts CRON_SECRET or SOCIAL_PUBLISH_TOKEN via header', () => {
      process.env.CRON_SECRET = 'cron-secret-123';
      process.env.SOCIAL_PUBLISH_TOKEN = 'social-token-456';

      const cronReq = new NextRequest('http://localhost/api/social/publish-due', {
        headers: { 'x-cron-secret': 'cron-secret-123' },
      });
      expect(verifySocialCronAuth(cronReq)).toBeNull();

      const socialReq = new NextRequest('http://localhost/api/social/publish-due', {
        headers: { 'x-social-publish-token': 'social-token-456' },
      });
      expect(verifySocialCronAuth(socialReq)).toBeNull();

      const badReq = new NextRequest('http://localhost/api/social/publish-due', {
        headers: { 'x-cron-secret': 'wrong-secret' },
      });
      const badRes = verifySocialCronAuth(badReq);
      expect(badRes).not.toBeNull();
      expect(badRes?.status).toBe(401);
    });

    it('dispatches notification for immediate draft post publish completion/failure', async () => {
      const { publishPost } = await import('@/lib/social/publisher');
      vi.mocked(db.socialPost.findUnique).mockResolvedValue({
        id: 'post-1',
        tenantId: 'tenant-123',
        status: 'draft',
        content: 'Check out our latest special offer',
        mediaUrls: '[]',
        publishTargets: '[]',
      } as any);
      vi.mocked(db.socialPost.updateMany).mockResolvedValue({ count: 1 } as any);
      vi.mocked(db.socialPost.update).mockResolvedValue({} as any);
      vi.mocked(db.user.findMany).mockResolvedValue([{ id: 'mgr-1' }] as any);
      vi.mocked(db.appNotification.create).mockResolvedValue({ id: 'notif-p1' } as any);

      await publishPost('post-1');

      expect(db.appNotification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-123',
            recipientId: 'mgr-1',
            type: 'social_post',
            title: expect.stringContaining('failed'),
          }),
        }),
      );
    });
  });

  describe('4. Google-Style Photo Growth Mailer & Test Suite', () => {
    it('renders Google Business Profile photo growth template matching the official style', async () => {
      const { renderBgosPhotoGrowthEmail } = await import('@/lib/emails/bgos/templates');
      const email = renderBgosPhotoGrowthEmail({
        businessName: 'Fieseros Auto Care',
        category: 'Automotive',
        rating: 4.8,
        reviewCount: 95,
      });

      expect(email.subject).toContain('Attract more customers with photos, Fieseros Auto Care');
      expect(email.html).toContain('Attract more customers with <span style="color:#1a73e8;">photos</span>');
      expect(email.html).toContain('Google Business Profile');
      expect(email.html).toContain('Add photos');
      expect(email.html).toContain('Get more views');
      expect(email.html).toContain('Need help?');
      expect(email.text).toContain('Attract more customers with photos');
    });

    it('dispatches full test suite via POST /api/notifications/test-suite', async () => {
      const { POST: postTestSuite } = await import('@/app/api/notifications/test-suite/route');
      vi.mocked(authLib.getAuthUser).mockResolvedValue({
        id: 'usr-admin',
        email: 'owner@fieseros.com',
        name: 'Deepak',
        tenantId: 'tenant-999',
      } as any);

      vi.mocked(db.tenant.findUnique).mockResolvedValue({
        id: 'tenant-999',
        name: 'Fieseros Dental Clinic',
        email: 'clinic@fieseros.com',
        industry: 'Healthcare',
        settingsJson: '{}',
      } as any);

      vi.mocked(db.appNotification.create).mockResolvedValue({ id: 'notif-test-1' } as any);

      const req = new NextRequest('http://localhost/api/notifications/test-suite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'all' }),
      });

      const res = await postTestSuite(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.emailsSent.length).toBeGreaterThanOrEqual(1);
      expect(data.notificationsCreated.length).toBeGreaterThanOrEqual(1);
      expect(pushLib.sendWebPushToUser).toHaveBeenCalled();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
  db: {
    tenant: {
      findUnique: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
    appNotification: {
      create: vi.fn(),
    },
    customerTimelineEntry: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  getAuthUser: vi.fn(),
}));

vi.mock('@/lib/web-push-send', () => ({
  sendWebPushToUser: vi.fn().mockResolvedValue({ sent: 1, failed: 0 }),
}));

vi.mock('@/lib/email-send', () => ({
  sendEmail: vi.fn().mockResolvedValue({
    success: true,
    messageId: 'msg-fieseros-phone-test-123',
    providerUsed: 'smtp.gmail.com',
  }),
}));

describe('Self-Test: Fieseros Account with Phone 8505945123', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles user logged in with phone 8505945123 and dispatches all in-app + push notifications', async () => {
    const { POST: postTestSuite } = await import('@/app/api/notifications/test-suite/route');
    const { getAuthUser } = await import('@/lib/auth');
    const { db } = await import('@/lib/db');
    const { sendWebPushToUser } = await import('@/lib/web-push-send');

    // Simulate user logged in with phone 8505945123
    vi.mocked(getAuthUser).mockResolvedValue({
      id: 'usr-fieseros-8505945123',
      email: 'phone_8505945123@bgos.site',
      name: 'Fieseros Business Owner',
      tenantId: 'tenant-fieseros-8505945123',
    } as any);

    vi.mocked(db.tenant.findUnique).mockResolvedValue({
      id: 'tenant-fieseros-8505945123',
      name: 'Fieseros Auto & Home Services',
      email: null,
      industry: 'Auto Repair & Local Services',
      settingsJson: '{}',
    } as any);

    let notifCounter = 0;
    vi.mocked(db.appNotification.create).mockImplementation(async ({ data }: any) => {
      notifCounter++;
      return { id: `notif-${notifCounter}`, ...data } as any;
    });

    // 1. Run with action = 'all' without email override
    const req = new NextRequest('http://localhost:3000/api/notifications/test-suite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'all' }),
    });

    const res = await postTestSuite(req);
    const data = await res.json();

    console.log('\n--- Scenario 1: Phone Login (8505945123) without email override ---');
    console.log('Status code:', res.status);
    console.log('Response ok:', data.ok);
    console.log('In-app notifications created:', data.notificationsCreated.length);
    console.log('Notifications:', data.notificationsCreated.map((n: any) => n.title));
    console.log('Push dispatched:', data.pushDispatched);
    console.log('Email outcomes:', data.emailsSent);

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.notificationsCreated.length).toBe(4); // photo nudge, review growth, checklist, post
    expect(data.notificationsCreated.map((n: any) => n.type)).toContain('gbp_photo_nudge');
    expect(data.notificationsCreated.map((n: any) => n.type)).toContain('checklist_completed');
    expect(data.notificationsCreated.map((n: any) => n.type)).toContain('social_post');
    expect(sendWebPushToUser).toHaveBeenCalled();

    // Verify phone login notice was reported for email
    expect(data.emailsSent[0].status).toBe('skipped_phone_login');
    expect(data.emailsSent[0].error).toContain('Logged in with phone number');
  });

  it('sends Google Photo Growth email when user with phone 8505945123 provides recipient email', async () => {
    const { POST: postTestSuite } = await import('@/app/api/notifications/test-suite/route');
    const { getAuthUser } = await import('@/lib/auth');
    const { db } = await import('@/lib/db');
    const { sendEmail } = await import('@/lib/email-send');

    vi.mocked(getAuthUser).mockResolvedValue({
      id: 'usr-fieseros-8505945123',
      email: 'phone_8505945123@bgos.site',
      name: 'Fieseros Business Owner',
      tenantId: 'tenant-fieseros-8505945123',
    } as any);

    vi.mocked(db.tenant.findUnique).mockResolvedValue({
      id: 'tenant-fieseros-8505945123',
      name: 'Fieseros Auto & Home Services',
      email: null,
      industry: 'Auto Repair & Local Services',
      settingsJson: '{}',
    } as any);

    vi.mocked(db.appNotification.create).mockResolvedValue({ id: 'notif-test-123' } as any);

    // 2. Run with action = 'photo_email' and real recipient email provided
    const req = new NextRequest('http://localhost:3000/api/notifications/test-suite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'photo_email',
        to: 'deepak@fieseros.com',
      }),
    });

    const res = await postTestSuite(req);
    const data = await res.json();

    console.log('\n--- Scenario 2: Phone Login (8505945123) with email deepak@fieseros.com ---');
    console.log('Status code:', res.status);
    console.log('Email sent outcome:', data.emailsSent);
    console.log('Notifications created:', data.notificationsCreated);

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.emailsSent[0].to).toBe('deepak@fieseros.com');
    expect(data.emailsSent[0].status).toBe('sent');
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'deepak@fieseros.com',
        subject: expect.stringContaining('Attract more customers with photos'),
        html: expect.stringContaining('Attract more customers with <span style="color:#1a73e8;">photos</span>'),
      })
    );
  });
});

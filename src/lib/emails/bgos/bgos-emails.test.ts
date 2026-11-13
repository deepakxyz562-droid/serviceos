import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db', () => ({
  db: {
    workspace: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    productWorkspace: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    emailSuppression: {
      findFirst: vi.fn(),
    },
    notificationLog: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    tenant: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    contact: {
      updateMany: vi.fn(),
    },
    customer: {
      updateMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
    marketingConsentEvent: {
      create: vi.fn(),
    },
  },
}));

vi.mock('@/lib/email-send', () => ({
  sendEmail: vi.fn(),
}));

import { db } from '@/lib/db';
import { sendEmail } from '@/lib/email-send';
import {
  buildGoogleReviewLink,
  getBgosPricingForTenant,
  isDeliverableEmail,
  isSyntheticPlaceholderEmail,
  renderBgosConnectGbpNudgeEmail,
  renderBgosFirstPostNudgeEmail,
  renderBgosPasswordResetEmail,
  renderBgosPostTrialInactiveEmail,
  renderBgosPromoEmail,
  renderBgosReviewGrowthEmail,
  renderBgosTrialEndingEmail,
  renderBgosTrialExpiredEmail,
  renderBgosUnrepliedReviewsEmail,
  renderBgosVerificationEmail,
  renderBgosWelcomeEmail,
  renderBgosWinBackEmail,
  resolveBgosBaseUrl,
} from './templates';
import {
  dispatchBgosEmail,
  hasBgosEmailBeenSent,
  isBgosContext,
  parseBgosEmailPrefs,
  sendBgosPasswordResetEmail,
  sendBgosVerificationEmail,
  sendBgosWelcomeEmail,
} from './sender';
import {
  type BgosTenantSnapshot,
  evaluateBgosLifecycleDecision,
} from './lifecycle';
import {
  applyUnsubscribe,
  decodeHtmlUrlEntities,
  injectTracking,
  normalizeClickDestination,
  unsubscribeUrl,
} from '@/lib/email-consent';

function makeSnapshot(overrides: Partial<BgosTenantSnapshot> = {}): BgosTenantSnapshot {
  const now = new Date('2026-11-10T10:00:00Z');
  return {
    tenantId: 'tenant-bgos-1',
    businessName: 'Abc kirana',
    recipientEmail: 'owner@abckirana.com',
    recipientName: 'Rajesh Sharma',
    createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    plan: 'starter',
    planStatus: 'trial',
    trialEndsAt: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000),
    suspendedAt: null,
    country: 'IN',
    currency: 'INR',
    phone: '+919876543210',
    settingsJson: null,
    isPaidActive: false,
    gbpConnected: true,
    placeId: 'ChIJ1234567890',
    reviewUrl: 'https://g.page/r/Cdi_Xot9-1n6ECA/review',
    totalReviewsCount: 2,
    unrepliedOldReviewsCount: 0,
    publishedPostsCount: 2,
    lastActivityAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    sentHistory: [],
    ...overrides,
  };
}

describe('BGOS Email Templates & Helpers', () => {
  it('filters deliverable emails and rejects synthetic phone/local/Apple sub-relay placeholders', () => {
    expect(isDeliverableEmail('owner@abckirana.com')).toBe(true);
    expect(isDeliverableEmail('founder+bgos@company.co.in')).toBe(true);
    expect(isDeliverableEmail('user123@privaterelay.appleid.com')).toBe(true);

    expect(isDeliverableEmail(null)).toBe(false);
    expect(isDeliverableEmail('')).toBe(false);
    expect(isDeliverableEmail('not-an-email')).toBe(false);
    expect(isDeliverableEmail('phone_919876543210@bgos.site')).toBe(false);
    expect(isDeliverableEmail('phone_919876543210@bgos.fieseros.com')).toBe(false);
    expect(isDeliverableEmail('123456@merchant.bos.local')).toBe(false);
    expect(isDeliverableEmail('owner@tenant.test')).toBe(false);
    expect(isDeliverableEmail('owner@invalid.invalid')).toBe(false);
    expect(isDeliverableEmail('owner@example.com')).toBe(false);
    expect(isDeliverableEmail('001234.abcdef1234567890abcdef.1234@privaterelay.appleid.com')).toBe(
      false,
    );

    // Transactional password reset / verification still works on RFC 2606 example.com
    // test fixtures while rejecting truly synthetic unreachable placeholders.
    expect(isSyntheticPlaceholderEmail('owner@example.com')).toBe(false);
    expect(isSyntheticPlaceholderEmail('phone_919876543210@bgos.site')).toBe(true);
    expect(isSyntheticPlaceholderEmail('phone_919876543210@bgos.fieseros.com')).toBe(true);
    expect(isSyntheticPlaceholderEmail('001234.abcdef1234567890abcdef.1234@privaterelay.appleid.com')).toBe(true);
  });

  it('resolves regional INR vs USD pricing for BGOS plans', () => {
    expect(getBgosPricingForTenant({ country: 'IN' })).toEqual({
      currencyCode: 'INR',
      starterPrice: '₹499/mo',
      growthPrice: '₹1,499/mo',
      businessPrice: '₹3,999/mo',
    });
    expect(getBgosPricingForTenant({ phone: '+919811122233' }).currencyCode).toBe('INR');
    expect(getBgosPricingForTenant({ currency: 'INR' }).currencyCode).toBe('INR');
    expect(getBgosPricingForTenant({ country: 'US', currency: 'USD' })).toEqual({
      currencyCode: 'USD',
      starterPrice: '$9/mo',
      growthPrice: '$29/mo',
      businessPrice: '$79/mo',
    });
  });

  it('builds Google review links and resolves BGOS public URL safely', () => {
    expect(buildGoogleReviewLink('ChIJ abc')).toBe(
      'https://search.google.com/local/writereview?placeid=ChIJ%20abc',
    );
    expect(buildGoogleReviewLink('')).toBeNull();
    expect(buildGoogleReviewLink(null)).toBeNull();

    expect(resolveBgosBaseUrl('https://bgos.site/')).toBe('https://bgos.site');
    expect(resolveBgosBaseUrl('https://bgos.fieseros.com/')).toBe('https://bgos.fieseros.com');
    expect(resolveBgosBaseUrl('https://fieseros.com')).toBe('https://bgos.site');
    expect(resolveBgosBaseUrl('http://localhost:3000/')).toBe('http://localhost:3000');
  });

  it('renders Google-style "Go from X to more than 5 reviews" growth nudge accurately', () => {
    const mail = renderBgosReviewGrowthEmail({
      businessName: 'Abc kirana',
      reviewCount: 0,
      reviewUrl: 'https://g.page/r/Cdi_Xot9-1n6ECA/review',
      placeId: 'ChIJfallback',
    });

    expect(mail.subject).toContain('Go from 0 to more than 5 reviews');
    expect(mail.subject).toContain('Abc kirana');
    expect(mail.html).toContain('Go from 0 to more than 5 reviews');
    expect(mail.html).toContain(
      'Business Profiles like yours with 5 or more reviews can get up to twice as many customers.',
    );
    expect(mail.html).toContain('https://g.page/r/Cdi_Xot9-1n6ECA/review');
    expect(mail.html).toContain('{{unsubscribe_url}}');
    expect(mail.text).toContain('https://g.page/r/Cdi_Xot9-1n6ECA/review');
    expect(mail.text).toContain('Unsubscribe: {{unsubscribe_url}}');

    const fallbackMail = renderBgosReviewGrowthEmail({
      businessName: 'Sharma <Farm>',
      reviewCount: 3,
      placeId: 'ChIJ_XYZ',
    });
    expect(fallbackMail.html).toContain('Go from 3 to more than 5 reviews');
    expect(fallbackMail.html).toContain(
      'https://search.google.com/local/writereview?placeid=ChIJ_XYZ',
    );
    expect(fallbackMail.html).toContain('Sharma &lt;Farm&gt;');
  });

  it('renders transactional emails without unsubscribe link and marketing emails with unsubscribe tag', () => {
    const verify = renderBgosVerificationEmail({
      ownerName: 'Rajesh',
      verifyLink: 'https://bgos.fieseros.com/api/auth/verify-email?token=abc',
    });
    expect(verify.html).not.toContain('{{unsubscribe_url}}');
    expect(verify.html).toContain('Verify Email &amp; Open BGOS');

    const reset = renderBgosPasswordResetEmail({
      ownerName: 'Rajesh',
      businessName: 'Abc kirana',
      resetUrl: 'https://bgos.fieseros.com/reset-password?token=xyz&product=bgos',
    });
    expect(reset.html).not.toContain('{{unsubscribe_url}}');
    expect(reset.html).toContain('reset-password?token=xyz&amp;product=bgos');

    const ending = renderBgosTrialEndingEmail({
      businessName: 'Abc kirana',
      daysRemaining: 2,
      trialEndsAtLabel: 'Nov 12, 2026',
      reviewsCount: 4,
      postsCount: 3,
      pricing: getBgosPricingForTenant({ country: 'IN' }),
    });
    expect(ending.html).not.toContain('{{unsubscribe_url}}');
    expect(ending.html).toContain('₹499/mo');

    const expired = renderBgosTrialExpiredEmail({
      businessName: 'Abc kirana',
      pricing: getBgosPricingForTenant({ country: 'US' }),
    });
    expect(expired.html).not.toContain('{{unsubscribe_url}}');
    expect(expired.html).toContain('Free Plan ($0)');
    expect(expired.html).toContain('$9/mo');

    const welcome = renderBgosWelcomeEmail({
      ownerName: 'Rajesh',
      businessName: 'Abc kirana',
      trialDays: 7,
    });
    expect(welcome.html).toContain('{{unsubscribe_url}}');
    expect(welcome.html).toContain('view=integrations');
    expect(welcome.html).toContain('view=reviews');
    expect(welcome.html).toContain('view=socialMedia');

    const inactive = renderBgosPostTrialInactiveEmail({
      businessName: 'Abc kirana',
      inactiveDays: 5,
      gbpConnected: true,
      reviewsCount: 1,
      pricing: getBgosPricingForTenant({ country: 'IN' }),
    });
    expect(inactive.html).toContain('₹499/mo');
    expect(inactive.html).toContain('{{unsubscribe_url}}');
    expect(inactive.html).not.toMatch(/\b\d+%\s*off\b/i);

    const winback = renderBgosWinBackEmail({
      businessName: 'Abc kirana',
      inactiveDays: 14,
      pricing: getBgosPricingForTenant({ country: 'US' }),
    });
    expect(winback.html).toContain('$9/mo');
    expect(winback.html).toContain('{{unsubscribe_url}}');
    expect(winback.html).not.toMatch(/\b\d+%\s*off\b/i);

    const unrepliedRendered = renderBgosUnrepliedReviewsEmail({
      businessName: 'Abc kirana',
      pendingCount: 2,
    });
    expect(unrepliedRendered.html).toContain('bgos.site/app?product=bgos&amp;view=reviews');
    expect(unrepliedRendered.html).toContain('{{unsubscribe_url}}');

    const promo = renderBgosPromoEmail({
      businessName: 'Abc kirana',
      subject: 'New AI Poster Studio for {{businessName}}',
      headline: 'Turn {{businessName}} photos into posters',
      bodyParagraphs: ['Generate local promos for {{businessName}} using uploaded photos.'],
      highlights: ['Works with your existing photos', 'Publish straight to Google'],
      ctaLabel: 'Open AI Studio',
      ctaUrl: 'https://bgos.site/app?product=bgos&view=socialMedia',
    });
    expect(promo.subject).toBe('New AI Poster Studio for Abc kirana');
    expect(promo.html).toContain('Turn Abc kirana photos into posters');
    expect(promo.html).toContain('{{unsubscribe_url}}');
  });
});

describe('BGOS Email Preferences & Lifecycle Engine', () => {
  const NOW = new Date('2026-11-10T10:00:00Z');
  const DAY = 24 * 60 * 60 * 1000;
  const HOUR = 60 * 60 * 1000;

  it('parses bgosEmailPrefs defaults and unsubscribed state', () => {
    expect(parseBgosEmailPrefs(null)).toEqual({
      productNudges: true,
      marketing: true,
      weeklyDigest: false,
      unsubscribedAt: null,
      unsubscribeSource: null,
    });

    expect(
      parseBgosEmailPrefs(
        JSON.stringify({
          gbpSummaryConfig: { enabled: true },
          bgosEmailPrefs: { marketing: false },
        }),
      ),
    ).toMatchObject({
      productNudges: true,
      marketing: false,
      weeklyDigest: true,
    });

    expect(
      parseBgosEmailPrefs(
        JSON.stringify({
          bgosEmailPrefs: {
            unsubscribedAt: '2026-11-01T00:00:00Z',
            unsubscribeSource: 'one_click',
          },
        }),
      ),
    ).toMatchObject({
      productNudges: false,
      marketing: false,
      weeklyDigest: false,
      unsubscribedAt: '2026-11-01T00:00:00Z',
    });
  });

  it('skips suspended tenants and undeliverable email accounts', () => {
    const suspended = evaluateBgosLifecycleDecision(
      makeSnapshot({ suspendedAt: new Date(NOW.getTime() - DAY) }),
      NOW,
    );
    expect(suspended).toEqual({ action: 'skip', reason: 'tenant_suspended' });

    const phoneOnly = evaluateBgosLifecycleDecision(
      makeSnapshot({ recipientEmail: 'phone_919876543210@bgos.fieseros.com' }),
      NOW,
    );
    expect(phoneOnly).toEqual({ action: 'skip', reason: 'undeliverable_email' });
  });

  it('triggers 2-day trial ending reminder and deduplicates same trial cycle', () => {
    const endingSnap = makeSnapshot({
      planStatus: 'trial',
      trialEndsAt: new Date(NOW.getTime() + 36 * HOUR),
    });
    const d1 = evaluateBgosLifecycleDecision(endingSnap, NOW);
    expect(d1.action).toBe('send');
    expect(d1.emailKey).toBe('bgos_trial_ending_2d');
    expect(d1.category).toBe('transactional');

    const d2 = evaluateBgosLifecycleDecision(
      makeSnapshot({
        ...endingSnap,
        sentHistory: [
          {
            emailKey: 'bgos_trial_ending_2d',
            cycleKey: d1.cycleKey,
            sentAt: new Date(NOW.getTime() - 25 * HOUR),
          },
        ],
      }),
      NOW,
    );
    expect(d2.emailKey).not.toBe('bgos_trial_ending_2d');
  });

  it('triggers trial expired right after trialEndsAt passes', () => {
    const expiredSnap = makeSnapshot({
      planStatus: 'expired',
      trialEndsAt: new Date(NOW.getTime() - 12 * HOUR),
    });
    const d = evaluateBgosLifecycleDecision(expiredSnap, NOW);
    expect(d.action).toBe('send');
    expect(d.emailKey).toBe('bgos_trial_expired');
    expect(d.category).toBe('transactional');
  });

  it('triggers Day +3 post-trial unpaid & inactive rescue email, and Day +10-14 win-back later', () => {
    const unpaidDay4 = makeSnapshot({
      planStatus: 'expired',
      isPaidActive: false,
      trialEndsAt: new Date(NOW.getTime() - 4 * DAY),
      lastActivityAt: new Date(NOW.getTime() - 4 * DAY),
      sentHistory: [
        {
          emailKey: 'bgos_trial_expired',
          cycleKey: 'trial_expired:2026-11-06',
          sentAt: new Date(NOW.getTime() - 4 * DAY),
        },
      ],
    });
    const d4 = evaluateBgosLifecycleDecision(unpaidDay4, NOW);
    expect(d4.action).toBe('send');
    expect(d4.emailKey).toBe('bgos_post_trial_inactive_3d');
    expect(d4.category).toBe('nudge');

    const unpaidDay12 = makeSnapshot({
      planStatus: 'expired',
      isPaidActive: false,
      trialEndsAt: new Date(NOW.getTime() - 12 * DAY),
      lastActivityAt: new Date(NOW.getTime() - 12 * DAY),
      sentHistory: [
        {
          emailKey: 'bgos_post_trial_inactive_3d',
          cycleKey: 'post_trial_inactive_3d:2026-10-29',
          sentAt: new Date(NOW.getTime() - 8 * DAY),
        },
      ],
    });
    const d12 = evaluateBgosLifecycleDecision(unpaidDay12, NOW);
    expect(d12.action).toBe('send');
    expect(d12.emailKey).toBe('bgos_post_trial_winback_14d');
    expect(d12.category).toBe('marketing');
  });

  it('NEVER sends trial or post-trial rescue emails to active paid tenants', () => {
    const paidSnap = makeSnapshot({
      planStatus: 'active',
      plan: 'growth',
      isPaidActive: true,
      trialEndsAt: new Date(NOW.getTime() - 12 * DAY),
      lastActivityAt: new Date(NOW.getTime() - 12 * DAY),
      totalReviewsCount: 10,
      publishedPostsCount: 5,
    });
    const d = evaluateBgosLifecycleDecision(paidSnap, NOW);
    expect(d.action).toBe('skip');
    expect(d.reason).toBe('no_rule_matched');
  });

  it('enforces 72h frequency cap for nudges and rescues after recent sends', () => {
    const recentWelcomeSnap = makeSnapshot({
      gbpConnected: false,
      createdAt: new Date(NOW.getTime() - 36 * HOUR),
      sentHistory: [
        {
          emailKey: 'bgos_welcome',
          cycleKey: 'welcome:tenant-bgos-1',
          sentAt: new Date(NOW.getTime() - 36 * HOUR),
        },
      ],
    });
    const d = evaluateBgosLifecycleDecision(recentWelcomeSnap, NOW);
    expect(d).toEqual({ action: 'skip', reason: 'cooldown_72h' });
  });

  it('respects opt-out preferences for productNudges and marketing', () => {
    const optedOutNudges = makeSnapshot({
      planStatus: 'expired',
      trialEndsAt: new Date(NOW.getTime() - 4 * DAY),
      lastActivityAt: new Date(NOW.getTime() - 4 * DAY),
      settingsJson: JSON.stringify({
        bgosEmailPrefs: { productNudges: false, marketing: true },
      }),
    });
    const d1 = evaluateBgosLifecycleDecision(optedOutNudges, NOW);
    expect(d1).toEqual({ action: 'skip', reason: 'opted_out_nudges' });

    const optedOutMarketing = makeSnapshot({
      planStatus: 'expired',
      trialEndsAt: new Date(NOW.getTime() - 12 * DAY),
      lastActivityAt: new Date(NOW.getTime() - 12 * DAY),
      settingsJson: JSON.stringify({
        bgosEmailPrefs: { productNudges: false, marketing: false },
      }),
    });
    const d2 = evaluateBgosLifecycleDecision(optedOutMarketing, NOW);
    expect(d2).toEqual({ action: 'skip', reason: 'opted_out_nudges' });
  });

  it('triggers connect-GBP, <5 review growth, and first-post nudges cleanly, while keeping unreplied reviews push/in-app only', () => {
    const connectSnap = makeSnapshot({
      gbpConnected: false,
      createdAt: new Date(NOW.getTime() - 36 * HOUR),
      totalReviewsCount: 0,
    });
    expect(evaluateBgosLifecycleDecision(connectSnap, NOW).emailKey).toBe(
      'bgos_connect_gbp_nudge',
    );

    const reviewGrowthSnap = makeSnapshot({
      gbpConnected: true,
      totalReviewsCount: 1,
      unrepliedOldReviewsCount: 0,
      publishedPostsCount: 2,
      createdAt: new Date(NOW.getTime() - 72 * HOUR),
    });
    const rg = evaluateBgosLifecycleDecision(reviewGrowthSnap, NOW);
    expect(rg.emailKey).toBe('bgos_review_growth_0_to_5');
    expect(rg.rendered?.html).toContain('Go from 1 to more than 5 reviews');

    // Unreplied review alerts moved out of unsolicited emails to Push + In-App Notifications
    const unrepliedSnap = makeSnapshot({
      gbpConnected: true,
      totalReviewsCount: 8,
      unrepliedOldReviewsCount: 2,
      publishedPostsCount: 2,
    });
    const unrepliedDecision = evaluateBgosLifecycleDecision(unrepliedSnap, NOW);
    expect(unrepliedDecision.action).toBe('skip');
    expect(unrepliedDecision.reason).toBe('no_rule_matched');
    expect(unrepliedDecision.emailKey).not.toBe('bgos_unreplied_reviews');

    const firstPostSnap = makeSnapshot({
      gbpConnected: true,
      totalReviewsCount: 8,
      unrepliedOldReviewsCount: 0,
      publishedPostsCount: 0,
      createdAt: new Date(NOW.getTime() - 120 * HOUR),
    });
    expect(evaluateBgosLifecycleDecision(firstPostSnap, NOW).emailKey).toBe(
      'bgos_first_post_nudge',
    );
  });
});

describe('BGOS Sender Guardrails, Idempotency & Context Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.emailSuppression.findFirst).mockResolvedValue(null);
    vi.mocked(db.notificationLog.findMany).mockResolvedValue([]);
    vi.mocked(db.notificationLog.create).mockResolvedValue({ id: 'log-1' } as any);
    vi.mocked(db.tenant.findUnique).mockResolvedValue({ settingsJson: null } as any);
  });

  it('detects BGOS vs CRM workspaces properly', async () => {
    vi.mocked(db.workspace.findUnique).mockResolvedValueOnce({
      id: 'ws-1',
      tenantId: 't-1',
      productType: 'bgos',
    } as any);
    vi.mocked(db.productWorkspace.findUnique).mockResolvedValueOnce({
      product: 'bgos',
    } as any);
    vi.mocked(db.workspace.findMany).mockResolvedValueOnce([{ id: 'ws-1', productType: 'bgos' }] as any);
    vi.mocked(db.productWorkspace.findMany).mockResolvedValueOnce([{ product: 'bgos' }] as any);

    const res = await isBgosContext({ workspaceId: 'ws-1', tenantId: 't-1' });
    expect(res).toEqual({ isBgos: true, isBgosOnly: true });

    vi.mocked(db.workspace.findMany).mockResolvedValueOnce([{ id: 'ws-2', productType: 'crm' }] as any);
    vi.mocked(db.productWorkspace.findMany).mockResolvedValueOnce([{ product: 'crm' }] as any);

    const crmRes = await isBgosContext({ tenantId: 't-crm' });
    expect(crmRes).toEqual({ isBgos: false, isBgosOnly: false });
  });

  it('enforces idempotency on sendBgosWelcomeEmail', async () => {
    vi.mocked(db.notificationLog.findMany).mockResolvedValueOnce([
      {
        recipient: 'owner@abckirana.com',
        metadataJson: JSON.stringify({ product: 'bgos', emailKey: 'bgos_welcome' }),
      },
    ] as any);

    const outcome = await sendBgosWelcomeEmail({
      to: 'owner@abckirana.com',
      businessName: 'Abc kirana',
      tenantId: 't-1',
      trialDays: 7,
    });

    expect(outcome).toEqual({ sent: false, skipped: true, reason: 'already_sent' });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('dispatches BGOS welcome email via platformMarketing & skipTenantQuota flags', async () => {
    vi.mocked(sendEmail).mockResolvedValueOnce({
      success: true,
      messageId: 'msg-123',
      providerUsed: 'emailProvider:ses(AWS SES)',
    });

    const outcome = await sendBgosWelcomeEmail({
      to: 'owner@abckirana.com',
      ownerName: 'Rajesh',
      businessName: 'Abc kirana',
      tenantId: 't-1',
      trialDays: 7,
    });

    expect(outcome).toEqual({ sent: true, messageId: 'msg-123' });
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'owner@abckirana.com',
        usageType: 'marketing',
        platformMarketing: true,
        skipTenantQuota: true,
        trackingBaseUrl: 'https://bgos.site',
        tenantId: 't-1',
        campaignId: 'bgos_welcome',
      }),
    );
    expect(db.notificationLog.create).toHaveBeenCalledTimes(1);
  });

  it('skips welcome email when address is suppressed', async () => {
    vi.mocked(db.emailSuppression.findFirst).mockResolvedValueOnce({ id: 'sup-1' } as any);

    const outcome = await sendBgosWelcomeEmail({
      to: 'bounced@abckirana.com',
      businessName: 'Abc kirana',
      tenantId: 't-1',
    });

    expect(outcome).toEqual({ sent: false, skipped: true, reason: 'email_suppressed' });
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('respects category consent in dispatchBgosEmail and sends transactional emails with skipTenantQuota', async () => {
    const skipped = await dispatchBgosEmail({
      tenantId: 't-1',
      to: 'owner@abckirana.com',
      settingsJson: JSON.stringify({ bgosEmailPrefs: { marketing: false } }),
      emailKey: 'bgos_promo_broadcast',
      cycleKey: 'promo:1',
      category: 'marketing',
      subject: 'Promo',
      html: '<p>Promo</p>',
      text: 'Promo',
    });
    expect(skipped).toEqual({ sent: false, skipped: true, reason: 'opted_out_marketing' });
    expect(sendEmail).not.toHaveBeenCalled();

    vi.mocked(sendEmail).mockResolvedValueOnce({ success: true, messageId: 'msg-ver' });
    const ver = await sendBgosVerificationEmail({
      to: 'owner@abckirana.com',
      verifyLink: 'https://bgos.fieseros.com/api/auth/verify-email?token=abc',
      tenantId: 't-1',
    });
    expect(ver.sent).toBe(true);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        usageType: 'transactional',
        skipTenantQuota: true,
      }),
    );

    vi.mocked(sendEmail).mockResolvedValueOnce({ success: true, messageId: 'msg-rst' });
    const rst = await sendBgosPasswordResetEmail({
      to: 'owner@abckirana.com',
      resetUrl: 'https://bgos.fieseros.com/reset-password?token=xyz',
      tenantId: 't-1',
    });
    expect(rst.sent).toBe(true);
    expect(await hasBgosEmailBeenSent({ tenantId: 't-1', emailKey: 'bgos_welcome' })).toBe(false);
  });

  it('routes BGOS tracking/unsubscribe links onto bgos.fieseros.com and syncs Tenant opt-out', async () => {
    const uUrl = unsubscribeUrl('tok123', 'https://bgos.fieseros.com');
    expect(uUrl).toBe('https://bgos.fieseros.com/api/public/unsubscribe?t=tok123');

    const tracked = injectTracking(
      `<a href="https://bgos.fieseros.com/app?product=bgos&amp;view=reviews">Reply</a><a href="${uUrl}">Unsub</a></body>`,
      'tok123',
      'https://bgos.fieseros.com',
    );
    expect(tracked).toContain(
      `https://bgos.fieseros.com/api/email/click/tok123?u=${encodeURIComponent('https://bgos.fieseros.com/app?product=bgos&view=reviews')}`,
    );
    expect(tracked).not.toContain('%26amp%3B');
    expect(tracked).toContain(`href="${uUrl}"`);
    expect(tracked).toContain('https://bgos.fieseros.com/api/email/open/tok123/pixel.png');

    expect(
      decodeHtmlUrlEntities('https://bgos.fieseros.com/app?product=bgos&amp;view=reviews&#x26;tab=pending'),
    ).toBe('https://bgos.fieseros.com/app?product=bgos&view=reviews&tab=pending');
    expect(
      normalizeClickDestination('https://bgos.fieseros.com/app?product=bgos&amp;view=reviews'),
    ).toBe('https://bgos.fieseros.com/app?product=bgos&view=reviews');
    expect(normalizeClickDestination('javascript:alert(1)')).toBeNull();
    expect(normalizeClickDestination('   ')).toBeNull();

    vi.mocked(db.user.findMany).mockResolvedValueOnce([{ tenantId: 't-bgos' }] as any);
    vi.mocked(db.tenant.findMany)
      .mockResolvedValueOnce([] as any)
      .mockResolvedValueOnce([
        {
          id: 't-bgos',
          settingsJson: JSON.stringify({ gbpSummaryConfig: { enabled: true } }),
        },
      ] as any);

    await applyUnsubscribe('owner@abckirana.com', 'one_click', 't-bgos');

    expect(db.tenant.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 't-bgos' },
        data: {
          settingsJson: expect.stringContaining('"productNudges":false'),
        },
      }),
    );
    const updatedJson = JSON.parse(
      vi.mocked(db.tenant.update).mock.calls[0][0].data.settingsJson as string,
    );
    expect(updatedJson.bgosEmailPrefs).toMatchObject({
      marketing: false,
      productNudges: false,
      weeklyDigest: false,
      unsubscribeSource: 'one_click',
    });
    expect(updatedJson.gbpSummaryConfig.enabled).toBe(false);
  });
});

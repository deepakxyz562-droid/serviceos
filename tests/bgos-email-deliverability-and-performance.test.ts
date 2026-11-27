import { describe, expect, it, vi } from 'vitest';
import {
  buildBgosAppOpenUrl,
  escapeHtml,
  isDeliverableEmail,
  isSyntheticPlaceholderEmail,
  renderBgosDailyActionChecklistEmail,
} from '@/lib/emails/bgos/templates';
import { resolveBgosDeepLink } from '../bgosmobile/src/lib/notification-routing';

describe('BGOS Email Deliverability & Performance Guardrails', () => {
  it('correctly identifies synthetic phone placeholder emails and marks them undeliverable', () => {
    const synthetic = 'phone_9779068220@bgos.site';
    expect(isSyntheticPlaceholderEmail(synthetic)).toBe(true);
    expect(isDeliverableEmail(synthetic)).toBe(false);

    const syntheticFieseros = 'phone_9779068220@bgos.fieseros.com';
    expect(isSyntheticPlaceholderEmail(syntheticFieseros)).toBe(true);
    expect(isDeliverableEmail(syntheticFieseros)).toBe(false);

    // Real business emails must be deliverable
    const realGoogleEmail = 'deepak@fieseros.com';
    expect(isSyntheticPlaceholderEmail(realGoogleEmail)).toBe(false);
    expect(isDeliverableEmail(realGoogleEmail)).toBe(true);

    const gmail = 'owner8220@gmail.com';
    expect(isSyntheticPlaceholderEmail(gmail)).toBe(false);
    expect(isDeliverableEmail(gmail)).toBe(true);
  });

  it('resolves real connected Google email over synthetic phone email', () => {
    const meta = {
      googleEmail: 'verified-owner@gmail.com',
      locationTitle: 'ShieldHire SOS App',
    };
    const ownerUser = {
      name: 'Owner 8220',
      email: 'phone_9779068220@bgos.site',
    };
    const tenant = {
      email: null,
      brandProfile: { contactEmail: null },
    };

    const candidateEmails = [
      meta.googleEmail,
      tenant.brandProfile?.contactEmail,
      tenant.email,
      ownerUser?.email,
    ].filter((e): e is string => Boolean(e) && typeof e === 'string');

    const recipientEmail = candidateEmails.find((e) => isDeliverableEmail(e)) || null;

    expect(recipientEmail).toBe('verified-owner@gmail.com');
    expect(recipientEmail).not.toContain('phone_');
  });

  it('rejects sending when only synthetic phone email is present', () => {
    const meta: { googleEmail?: string } = {};
    const ownerUser = {
      name: 'Owner 8220',
      email: 'phone_9779068220@bgos.site',
    };
    const tenant = {
      email: null,
      brandProfile: { contactEmail: null },
    };

    const candidateEmails = [
      meta.googleEmail,
      tenant.brandProfile?.contactEmail,
      tenant.email,
      ownerUser?.email,
    ].filter((e): e is string => Boolean(e) && typeof e === 'string');

    const recipientEmail = candidateEmails.find((e) => isDeliverableEmail(e)) || null;

    expect(recipientEmail).toBeNull();
    // Deliverability guard would skip sending
    const canSend = Boolean(recipientEmail && isDeliverableEmail(recipientEmail));
    expect(canSend).toBe(false);
  });

  it('resolves active workspace name over unbound cross-tenant profiles', () => {
    const unboundOtherProfile = {
      id: 'loc_shiv_ganga',
      name: 'shiv-ganga market',
      isBoundToCurrentWorkspace: false,
      isBoundToOtherWorkspace: true,
    };
    const workspaceData = {
      name: 'FieserOS',
    };

    // Mobile resolution logic
    const isBoundToActive = Boolean(unboundOtherProfile.isBoundToCurrentWorkspace);
    const workspaceName = workspaceData.name && workspaceData.name !== 'My Business' ? workspaceData.name : null;
    const profileName =
      (isBoundToActive ? unboundOtherProfile.name : null) ||
      workspaceName ||
      unboundOtherProfile.name ||
      'FieserOS';

    expect(profileName).toBe('FieserOS');
    expect(profileName).not.toBe('shiv-ganga market');
  });

  it('matches profile by workspace name when unbound and does not leak unrelated profiles', () => {
    const profiles = [
      { id: 'loc_1', name: 'shiv-ganga market', isBoundToOtherWorkspace: true },
      { id: 'loc_2', name: 'FieserOS Software', isBoundToOtherWorkspace: false },
    ];
    const tenantName = 'fieseros';

    const nameMatched = profiles.find(
      (p) =>
        !p.isBoundToOtherWorkspace &&
        (p.name.toLowerCase().includes(tenantName) || tenantName.includes(p.name.toLowerCase())),
    );

    expect(nameMatched?.id).toBe('loc_2');
    expect(nameMatched?.name).toBe('FieserOS Software');
  });

  it('renders crisp BGOS logo header, replaces 999 days sentinel, and routes Daily Checklist CTAs through /open app links', () => {
    const email = renderBgosDailyActionChecklistEmail({
      businessName: 'FieserOS',
      unrepliedReviewsCount: 0,
      daysSinceLastPhoto: 999,
      posterHeadline: 'Keep FieserOS visible on Google Maps',
      appUrl: 'https://bgos.site',
    });

    expect(email.html).toContain('https://bgos.site/bgos/icon-192.png');
    expect(email.html).toContain('width="40" height="40"');
    expect(email.html).toContain('Business Growth OS');
    expect(email.html).not.toContain('999 day');
    expect(email.html).toContain('No fresh Google Business photos have been posted recently.');
    const expectedStudioUrl = buildBgosAppOpenUrl('https://bgos.site', { view: 'socialMedia', socialTab: 'ai-content' });
    expect(email.html).toContain(escapeHtml(expectedStudioUrl));
    expect(email.text).toContain(expectedStudioUrl);
    expect(email.html).toContain(buildBgosAppOpenUrl('https://bgos.site', { view: 'reviews' }));
    expect(email.html).toContain(buildBgosAppOpenUrl('https://bgos.site', { view: 'photos' }));
    expect(email.html).toContain(buildBgosAppOpenUrl('https://bgos.site', { view: 'dashboard' }));
    expect(email.html).toContain(buildBgosAppOpenUrl('https://bgos.site', { view: 'helpCenter' }));
    expect(email.html).toContain(buildBgosAppOpenUrl('https://bgos.site', { view: 'settings' }));
  });

  it('resolves incoming mailer app/universal links to mobile screens while ignoring OAuth callbacks', () => {
    expect(resolveBgosDeepLink('bgos://open?view=socialMedia&socialTab=ai-content')).toBe('/(tabs)/marketing?mode=media_studio');
    expect(resolveBgosDeepLink('https://bgos.site/open?view=reviews')).toBe('/(tabs)/reviews');
    expect(resolveBgosDeepLink('https://bgos.site/open?view=photos')).toBe('/(tabs)/marketing?mode=media');
    expect(resolveBgosDeepLink('bgos://open?view=inbox')).toBe('/inbox');
    expect(resolveBgosDeepLink('bgos://open?view=customers')).toBe('/(tabs)/customers');
    expect(resolveBgosDeepLink('bgos://open?view=dashboard')).toBe('/(tabs)');
    expect(resolveBgosDeepLink('https://bgos.site/open?view=helpCenter')).toBe('/help');
    expect(resolveBgosDeepLink('https://bgos.site/open?view=settings')).toBe('/settings');
    expect(resolveBgosDeepLink('https://bgos.site/open?view=growthReport')).toBe('/growth-report');

    // Preserve OAuth callback flows
    expect(resolveBgosDeepLink('bgos://gbp-callback?google=connected')).toBeNull();
    expect(resolveBgosDeepLink('bgos://auth-callback?token=abc')).toBeNull();
  });

  it('serves valid .well-known Universal Links & Android Asset Links JSON manifests', async () => {
    const appleRoute = await import('@/app/.well-known/apple-app-site-association/route');
    const androidRoute = await import('@/app/.well-known/assetlinks.json/route');

    const appleRes = await appleRoute.GET();
    expect(appleRes.status).toBe(200);
    const appleJson = await appleRes.json();
    expect(appleJson.applinks).toBeTruthy();

    const androidRes = await androidRoute.GET();
    expect(androidRes.status).toBe(200);
    const androidJson = await androidRes.json();
    expect(Array.isArray(androidJson)).toBe(true);
  });

  it('builds Android intent:// + Google Play fallback on /open while keeping iOS and Desktop safe', async () => {
    const { buildBgosOpenHandoffConfig } = await import('@/lib/bgos/open-handoff');

    const android = buildBgosOpenHandoffConfig({
      view: 'reviews',
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
    });
    expect(android.platform).toBe('android');
    expect(android.isMobile).toBe(true);
    expect(android.appSchemeUrl).toBe('bgos://open?view=reviews');
    expect(android.androidIntentUrl).toContain('intent://open?view=reviews#Intent;scheme=bgos;package=com.fieseros.bgos;');
    expect(android.androidIntentUrl).toContain('S.browser_fallback_url=');
    expect(android.storeUrl).toContain('https://play.google.com/store/apps/details?id=com.fieseros.bgos');
    expect(android.storeUrl).toContain('referrer=');
    expect(android.storeLabel).toBe('Install BGOS on Google Play');

    const iosNoStore = buildBgosOpenHandoffConfig({
      view: 'socialMedia',
      socialTab: 'ai-content',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
      iosAppStoreUrl: '',
    });
    expect(iosNoStore.platform).toBe('ios');
    expect(iosNoStore.storeUrl).toBeNull();
    expect(iosNoStore.appSchemeUrl).toBe('bgos://open?view=socialMedia&socialTab=ai-content');

    const iosWithStore = buildBgosOpenHandoffConfig({
      view: 'photos',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)',
      iosAppStoreUrl: 'https://apps.apple.com/app/id123456789',
    });
    expect(iosWithStore.storeUrl).toBe('https://apps.apple.com/app/id123456789');
    expect(iosWithStore.storeLabel).toBe('Download BGOS on App Store');

    const desktop = buildBgosOpenHandoffConfig({
      view: 'dashboard',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Safari/537.36',
    });
    expect(desktop.platform).toBe('desktop');
    expect(desktop.isMobile).toBe(false);
    expect(desktop.webFallbackUrl).toBe('/app?product=bgos&view=dashboard');
  });
});

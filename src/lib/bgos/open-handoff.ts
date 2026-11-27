export const BGOS_ANDROID_PACKAGE = 'com.fieseros.bgos';
export const DEFAULT_BGOS_PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${BGOS_ANDROID_PACKAGE}`;

export type MobilePlatform = 'android' | 'ios' | 'mobile' | 'desktop';

export interface BgosOpenHandoffConfig {
  platform: MobilePlatform;
  isMobile: boolean;
  appSchemeUrl: string;
  androidIntentUrl: string;
  storeUrl: string | null;
  storeLabel: string | null;
  webFallbackUrl: string;
  actionTitle: string;
}

export function detectMobilePlatform(userAgent: string): MobilePlatform {
  const ua = (userAgent || '').trim();
  if (/Android/i.test(ua)) return 'android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Mobile/i.test(ua)) return 'mobile';
  return 'desktop';
}

export function actionLabelForOpenView(view: string, socialTab: string): string {
  if (socialTab === 'ai-content' || view === 'studio' || view === 'socialMedia') {
    return 'Opening AI Creative Studio';
  }
  if (view === 'reviews') return 'Opening Google Reviews';
  if (view === 'photos') return 'Opening Media & Photos';
  if (view === 'growthReport' || view === 'growth-report') return 'Opening Growth Report';
  if (view === 'helpCenter' || view === 'help') return 'Opening Help Center';
  if (view === 'settings') return 'Opening Settings';
  if (view === 'billing') return 'Opening BGOS Plan';
  return 'Opening BGOS App';
}

/**
 * Builds Android Play Store URL with campaign/deep-link install referrer so
 * first-time installs from emails carry target view attribution.
 */
export function buildAndroidPlayStoreUrl(params: {
  view: string;
  socialTab?: string;
  tab?: string;
  mode?: string;
  basePlayStoreUrl?: string;
}): string {
  const base = (
    params.basePlayStoreUrl ||
    process.env.BGOS_ANDROID_PLAY_STORE_URL ||
    DEFAULT_BGOS_PLAY_STORE_URL
  ).trim();

  try {
    const parsed = new URL(base);
    if (!parsed.searchParams.has('id')) {
      parsed.searchParams.set('id', BGOS_ANDROID_PACKAGE);
    }
    const refParts = [
      'utm_source=bgos_mailer',
      'utm_medium=email',
      `view=${encodeURIComponent(params.view)}`,
    ];
    if (params.socialTab) refParts.push(`socialTab=${encodeURIComponent(params.socialTab)}`);
    if (params.tab) refParts.push(`tab=${encodeURIComponent(params.tab)}`);
    if (params.mode) refParts.push(`mode=${encodeURIComponent(params.mode)}`);
    parsed.searchParams.set('referrer', refParts.join('&'));
    return parsed.toString();
  } catch {
    return DEFAULT_BGOS_PLAY_STORE_URL;
  }
}

export function buildBgosOpenHandoffConfig(input: {
  view?: string;
  socialTab?: string;
  tab?: string;
  mode?: string;
  userAgent?: string;
  androidPlayStoreUrl?: string;
  iosAppStoreUrl?: string;
}): BgosOpenHandoffConfig {
  const view = (input.view || '').trim() || 'dashboard';
  const socialTab = (input.socialTab || '').trim();
  const tab = (input.tab || '').trim();
  const mode = (input.mode || '').trim();

  const webQs = new URLSearchParams({ product: 'bgos', view });
  if (socialTab) webQs.set('socialTab', socialTab);
  if (tab) webQs.set('tab', tab);
  if (mode) webQs.set('mode', mode);
  const webFallbackUrl = `/app?${webQs.toString()}`;

  const appQs = new URLSearchParams({ view });
  if (socialTab) appQs.set('socialTab', socialTab);
  if (tab) appQs.set('tab', tab);
  if (mode) appQs.set('mode', mode);
  const query = appQs.toString();
  const appSchemeUrl = `bgos://open?${query}`;

  const playStoreUrl = buildAndroidPlayStoreUrl({
    view,
    socialTab,
    tab,
    mode,
    basePlayStoreUrl: input.androidPlayStoreUrl,
  });

  // Chrome & WebView Android Intent URI opens the app directly when installed,
  // or falls back automatically to Google Play Store when not installed.
  const androidIntentUrl =
    `intent://open?${query}#Intent;` +
    `scheme=bgos;` +
    `package=${BGOS_ANDROID_PACKAGE};` +
    `S.browser_fallback_url=${encodeURIComponent(playStoreUrl)};` +
    `end`;

  const platform = detectMobilePlatform(input.userAgent || '');
  const iosUrl = (
    input.iosAppStoreUrl ||
    process.env.BGOS_IOS_APP_STORE_URL ||
    ''
  ).trim();

  let storeUrl: string | null = null;
  let storeLabel: string | null = null;
  if (platform === 'android') {
    storeUrl = playStoreUrl;
    storeLabel = 'Install BGOS on Google Play';
  } else if (platform === 'ios' && iosUrl) {
    storeUrl = iosUrl;
    storeLabel = 'Download BGOS on App Store';
  }

  return {
    platform,
    isMobile: platform !== 'desktop',
    appSchemeUrl,
    androidIntentUrl,
    storeUrl,
    storeLabel,
    webFallbackUrl,
    actionTitle: actionLabelForOpenView(view, socialTab),
  };
}

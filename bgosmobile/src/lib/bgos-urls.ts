import { WEB_URL } from './constants';

/**
 * Canonical web view ids are defined in shared/bgos-navigation.ts.
 * Connected social channels (OAuth connect/disconnect) are managed on the web
 * inside the Marketing Studio screen, whose canonical view id is `socialMedia`
 * — NOT `integrations` (that web view covers other third-party integrations).
 */
export const BGOS_CHANNELS_WEB_VIEW = 'socialMedia';

/**
 * URL for managing connected social channels (Facebook / Instagram / Google
 * Business OAuth accounts) in the BGOS web portal.
 */
export function getBgosChannelsWebUrl(additionalParams?: Record<string, string>): string {
  return getBgosWebUrl(BGOS_CHANNELS_WEB_VIEW, additionalParams);
}

/**
 * Builds an authentic URL into the BGOS web portal for a given view.
 * Guarantees `product=bgos` is ALWAYS present, preventing the browser
 * from loading the customer-facing portal instead of the business workstation.
 */
export function getBgosWebUrl(view?: string, additionalParams?: Record<string, string>): string {
  const base = `${WEB_URL}/app?product=bgos`;
  const viewPart = view ? `&view=${encodeURIComponent(view)}` : '';
  if (!additionalParams) {
    return `${base}${viewPart}`;
  }
  const extra = Object.entries(additionalParams)
    .filter(([_, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `&${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('');
  return `${base}${viewPart}${extra}`;
}

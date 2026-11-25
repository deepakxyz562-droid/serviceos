import { Alert, Linking } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { getToken } from './auth';
import { WEB_URL } from './constants';

export type SocialConnectPlatform =
  | 'googlebusiness'
  | 'facebook'
  | 'instagram'
  | 'linkedin'
  | 'pinterest'
  | 'threads';

/**
 * Shared mobile OAuth launcher matching the Channels screen (`app/integrations.tsx`).
 * Uses the signed-in session token (`?auth=`) + `originHost` + mobile deep-link callback
 * so every social OAuth provider authenticates uniformly without duplicating URL builders.
 */
export async function connectSocialPlatform(
  platform: SocialConnectPlatform,
  options?: { returnView?: string; oauthPath?: string },
): Promise<{ error?: string }> {
  const token = await getToken().catch(() => null);
  const returnUrl = 'bgos://gbp-callback';
  const authQuery = token ? `&auth=${encodeURIComponent(token)}` : '';
  const returnView = options?.returnView || 'growth';
  const basePath = options?.oauthPath || `/api/oauth/${platform}`;

  const targetUrl =
    platform === 'googlebusiness'
      ? `${WEB_URL}/api/oauth/googlebusiness/connect?product=bgos&client=mobile&returnView=${encodeURIComponent(returnView)}` +
        `&redirectUri=${encodeURIComponent(returnUrl)}` +
        `&originHost=${encodeURIComponent(WEB_URL)}` +
        authQuery
      : `${WEB_URL}${basePath}?product=bgos&originHost=${encodeURIComponent(WEB_URL)}` +
        `&returnUrl=${encodeURIComponent(returnUrl)}` +
        authQuery;

  try {
    const result = await WebBrowser.openAuthSessionAsync(targetUrl, returnUrl);
    if (result.type === 'success' && result.url?.includes('error=')) {
      try {
        const parsed = new URL(result.url);
        const err = parsed.searchParams.get('error');
        if (err) return { error: decodeURIComponent(err) };
      } catch {}
    }
    return {};
  } catch {
    try {
      await Linking.openURL(targetUrl);
      return {};
    } catch {
      Alert.alert('Connection Link', `Please open ${targetUrl} in your browser to authorize.`);
      return { error: 'Could not open browser' };
    }
  }
}

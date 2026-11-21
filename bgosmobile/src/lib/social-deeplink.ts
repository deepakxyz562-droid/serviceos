import { Linking } from 'react-native';

/**
 * Open Facebook, Instagram, or Google Business profile using native app deep link
 * with automatic fallback to system web browser if the app is not installed.
 */
export async function openSocialAppOrWeb(
  platform: 'facebook' | 'instagram' | 'googlebusiness' | 'linkedin' | string,
  webUrl: string,
): Promise<void> {
  if (!webUrl) return;

  try {
    if (platform === 'instagram') {
      const match = webUrl.match(/instagram\.com\/([a-zA-Z0-9._]+)/i);
      if (match && match[1] && !['p', 'reel', 'stories', 'explore'].includes(match[1])) {
        const nativeUrl = `instagram://user?username=${match[1]}`;
        const canOpen = await Linking.canOpenURL(nativeUrl).catch(() => false);
        if (canOpen) {
          await Linking.openURL(nativeUrl);
          return;
        }
      }
    } else if (platform === 'facebook') {
      const nativeUrl = `fb://facewebmodal/f?href=${encodeURIComponent(webUrl)}`;
      const canOpen = await Linking.canOpenURL(nativeUrl).catch(() => false);
      if (canOpen) {
        await Linking.openURL(nativeUrl);
        return;
      }
    }
  } catch {
    // Fall back to standard web navigation
  }

  await Linking.openURL(webUrl).catch(() => {});
}

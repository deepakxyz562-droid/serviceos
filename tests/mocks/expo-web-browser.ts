export const WebBrowserPresentationStyle = {
  PAGE_SHEET: 'pageSheet',
  FULL_SCREEN: 'fullScreen',
} as const;

export async function openBrowserAsync() {
  return { type: 'cancel' as const };
}

export async function openAuthSessionAsync() {
  return { type: 'cancel' as const };
}

export function maybeCompleteAuthSession() {
  return { type: 'failed' as const };
}

const expoWebBrowserMock = {
  WebBrowserPresentationStyle,
  openBrowserAsync,
  openAuthSessionAsync,
  maybeCompleteAuthSession,
};

export default expoWebBrowserMock;

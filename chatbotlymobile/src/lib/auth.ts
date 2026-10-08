import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'chatbotly_auth_token';
const REFRESH_TOKEN_KEY = 'chatbotly_refresh_token';

export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setTokens(token: string, refreshToken?: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    if (refreshToken) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    }
  } catch (err) {
    console.warn('[Chatbotly Auth] Error setting tokens:', err);
  }
}

export async function clearTokens(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  } catch {}
}

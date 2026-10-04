import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'gptform_token';
const REFRESH_TOKEN_KEY = 'gptform_refresh_token';
const USER_KEY = 'gptform_user_data';

let memoryToken: string | null = null;
let memoryRefreshToken: string | null = null;
let memoryUserData: any | null = null;

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(key, value);
    } catch {}
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (err) {
    console.warn(`[auth] SecureStore setItem failed for key ${key}:`, err);
  }
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch (err) {
    console.warn(`[auth] SecureStore getItem failed for key ${key}:`, err);
    return null;
  }
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(key);
    } catch {}
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (err) {
    console.warn(`[auth] SecureStore deleteItem failed for key ${key}:`, err);
  }
}

export async function getToken(): Promise<string | null> {
  if (memoryToken) return memoryToken;
  const stored = await getItem(TOKEN_KEY);
  if (stored) {
    memoryToken = stored;
  }
  return stored;
}

export async function getRefreshToken(): Promise<string | null> {
  if (memoryRefreshToken) return memoryRefreshToken;
  const stored = await getItem(REFRESH_TOKEN_KEY);
  if (stored) {
    memoryRefreshToken = stored;
  }
  return stored || memoryToken;
}

export async function setTokens(token: string, refreshToken?: string): Promise<void> {
  memoryToken = token;
  memoryRefreshToken = refreshToken || token;
  await setItem(TOKEN_KEY, token);
  await setItem(REFRESH_TOKEN_KEY, refreshToken || token);
}

export async function clearTokens(): Promise<void> {
  memoryToken = null;
  memoryRefreshToken = null;
  memoryUserData = null;
  await deleteItem(TOKEN_KEY);
  await deleteItem(REFRESH_TOKEN_KEY);
  await deleteItem(USER_KEY);
}

export async function getStoredUserData(): Promise<any | null> {
  if (memoryUserData) return memoryUserData;
  const data = await getItem(USER_KEY);
  if (!data) return null;
  try {
    const parsed = JSON.parse(data);
    memoryUserData = parsed;
    return parsed;
  } catch {
    return null;
  }
}

export async function setStoredUserData(user: any): Promise<void> {
  memoryUserData = user;
  await setItem(USER_KEY, JSON.stringify(user));
}

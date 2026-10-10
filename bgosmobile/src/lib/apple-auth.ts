import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { apiRequest } from './api';
import type { SessionResponse } from '../stores/auth-store';

export async function isAppleAuthAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function appleSignIn(): Promise<SessionResponse | null> {
  if (Platform.OS !== 'ios') {
    throw new Error('Apple Sign-In is only available on iOS devices.');
  }

  const available = await isAppleAuthAvailable();
  if (!available) {
    throw new Error('Apple Sign-In is not supported on this device.');
  }

  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error('Apple did not provide an identity token.');
    }

    const fullName = credential.fullName
      ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ')
      : undefined;

    return await apiRequest<SessionResponse>('/api/bgos/mobile-auth/apple', {
      method: 'POST',
      body: {
        identityToken: credential.identityToken,
        user: credential.user,
        email: credential.email || undefined,
        fullName: fullName || undefined,
        product: 'bgos',
      },
      skipAuth: true,
    });
  } catch (error: any) {
    if (error.code === 'ERR_REQUEST_CANCELED') {
      return null; // User cancelled the Apple sign-in dialog
    }
    throw error;
  }
}

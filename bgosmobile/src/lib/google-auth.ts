import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { apiRequest } from './api';
import type { SessionResponse } from '../stores/auth-store';
const RETURN_URL = 'bgos://auth-callback';
export async function googleSignIn(): Promise<SessionResponse | null> {
  const config = await apiRequest<{ enabled: boolean; startUrl: string }>('/api/bgos/mobile-auth/config', { skipAuth: true });
  if (!config.enabled) throw new Error('Google sign-in needs server configuration. Please use email sign-in for now.');
  const start = new URL(config.startUrl);
  if (start.protocol !== 'https:' && !__DEV__) throw new Error('Google sign-in requires a secure server.');
  const bytes = await Crypto.getRandomBytesAsync(32);
  const verifier = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier, { encoding: Crypto.CryptoEncoding.BASE64 });
  start.searchParams.set('challenge', digest.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''));
  const result = await WebBrowser.openAuthSessionAsync(start.toString(), RETURN_URL);
  if (result.type !== 'success') return null;
  const returned = new URL(result.url);
  if (`${returned.protocol}//${returned.host}${returned.pathname}` !== RETURN_URL) throw new Error('Invalid sign-in response.');
  if (returned.searchParams.get('error') === 'cancelled') return null;
  const ticket = returned.searchParams.get('ticket');
  if (!ticket) throw new Error('Sign-in expired. Please try again.');
  return apiRequest<SessionResponse>('/api/bgos/mobile-auth/exchange', { method: 'POST', body: { ticket, verifier }, skipAuth: true });
}

import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('@/lib/auth', () => ({ getAppUrl: () => 'https://fieseros.com' }));
import { challengeFor, randomVerifier, readMobileState, sealMobileState } from '@/lib/bgos-mobile-auth';
import { isBgosIdentity } from '../shared/bgos-identity';
import { notificationDestination } from '../bgosmobile/src/lib/notification-routing';
beforeEach(() => {
  vi.stubEnv('GOOGLE_CLIENT_ID', 'test-client'); vi.stubEnv('GOOGLE_CLIENT_SECRET', 'test-secret'); vi.stubEnv('SOCIAL_CRYPTO_KEY', 'test-encryption-key');
});
it('authenticates encrypted handoffs and rejects tampering and expiry', () => {
  const state = { nonce: randomVerifier(), challenge: challengeFor('a'.repeat(64)), verifier: randomVerifier(), expires: Date.now() + 60000, code: 'single-use-google-code' };
  const ticket = sealMobileState(state);
  expect(ticket).not.toContain(state.code);
  expect(readMobileState(ticket)).toMatchObject(state);
  expect(readMobileState('AAAA' + ticket.slice(4))).toBeNull();
  expect(readMobileState(sealMobileState({ ...state, expires: Date.now() - 1 }))).toBeNull();
  expect(challengeFor('b'.repeat(64))).not.toBe(state.challenge);
});
it('requires configured encryption and Google credentials', () => {
  vi.stubEnv('GOOGLE_CLIENT_SECRET', '');
  expect(readMobileState('anything')).toBeNull();
  expect(() => sealMobileState({ nonce: '', challenge: '', verifier: '', expires: 0 })).toThrow('not configured');
});
it('allows BGOS aliases but rejects BOS, customer and administrator identities', () => {
  for (const productType of ['bgos', 'chatbotly', 'forms']) expect(isBgosIdentity({ user: { role: 'owner' }, workspace: { productType } })).toBe(true);
  for (const productType of ['bos', 'crm', 'quoteflow', '']) expect(isBgosIdentity({ user: { role: 'owner' }, workspace: { productType } })).toBe(false);
  expect(isBgosIdentity({ user: { role: 'customer' }, workspace: { productType: 'bgos' } })).toBe(false);
});
it('routes notification taps only to supported BGOS screens', () => {
  expect(notificationDestination({ url: '/?view=messages&conversation=123' })).toBe('/(tabs)/inbox');
  for (const url of ['https://attacker.example', '//attacker.example', '/?view=jobs', '/?view=store']) expect(notificationDestination({ url })).toBeNull();
});

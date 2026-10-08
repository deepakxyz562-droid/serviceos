const mockSecureValues = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn((key: string) => Promise.resolve(mockSecureValues.get(key) ?? null)),
  setItemAsync: jest.fn((key: string, value: string) => {
    mockSecureValues.set(key, value);
    return Promise.resolve();
  }),
  deleteItemAsync: jest.fn((key: string) => {
    mockSecureValues.delete(key);
    return Promise.resolve();
  }),
}));

import { clearTokens, getRefreshToken, getToken, setTokens } from '../auth';

describe('Nuvora token storage', () => {
  beforeEach(async () => {
    mockSecureValues.clear();
    await clearTokens();
  });

  it('stores access and refresh tokens separately', async () => {
    await setTokens('access-token', 'refresh-token');

    await expect(getToken()).resolves.toBe('access-token');
    await expect(getRefreshToken()).resolves.toBe('refresh-token');
  });

  it('never substitutes an access token for a missing refresh token', async () => {
    await setTokens('access-only');

    await expect(getToken()).resolves.toBe('access-only');
    await expect(getRefreshToken()).resolves.toBeNull();
  });

  it('clears both credentials', async () => {
    await setTokens('access-token', 'refresh-token');
    await clearTokens();

    await expect(getToken()).resolves.toBeNull();
    await expect(getRefreshToken()).resolves.toBeNull();
  });
});

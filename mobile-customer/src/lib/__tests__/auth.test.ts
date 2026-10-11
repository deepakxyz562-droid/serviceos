const secureValues = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED: 'WHEN_UNLOCKED',
  getItemAsync: jest.fn((key: string) => Promise.resolve(secureValues.get(key) ?? null)),
  setItemAsync: jest.fn((key: string, value: string) => {
    secureValues.set(key, value);
    return Promise.resolve();
  }),
  deleteItemAsync: jest.fn((key: string) => {
    secureValues.delete(key);
    return Promise.resolve();
  }),
}));

import { clearTokens, getRefreshToken, getToken, setTokens } from '../auth';

describe('Fieseros token storage', () => {
  beforeEach(async () => {
    secureValues.clear();
    await clearTokens();
  });

  it('persists the access and refresh credentials independently', async () => {
    await setTokens('access-token', 'refresh-token');

    await expect(getToken()).resolves.toBe('access-token');
    await expect(getRefreshToken()).resolves.toBe('refresh-token');
  });

  it('removes all session credentials on logout cleanup', async () => {
    await setTokens('access-token', 'refresh-token');
    await clearTokens();

    await expect(getToken()).resolves.toBeNull();
    await expect(getRefreshToken()).resolves.toBeNull();
  });
});

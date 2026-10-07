const secureValues = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
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

import { api, clearToken, normalizePath, saveToken } from '../client';

function response(status: number, payload: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: jest.fn().mockResolvedValue(JSON.stringify(payload)),
    json: jest.fn().mockResolvedValue(payload),
  } as unknown as Response;
}

describe('QuoteFlow API client', () => {
  beforeEach(async () => {
    secureValues.clear();
    await clearToken();
    jest.restoreAllMocks();
  });

  it('normalizes legacy mobile routes', () => {
    expect(normalizePath('/api/mobile/business')).toBe('/api/quote-flow/mobile/business');
    expect(normalizePath('/api/mobile/ai/draft')).toBe('/api/quote-flow/ai/draft');
    expect(normalizePath('/api/quote-flow/invoices')).toBe('/api/quote-flow/invoices');
  });

  it('rotates refresh credentials and retries once after a 401', async () => {
    await saveToken('access-old', 'refresh-old');
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(response(401, { error: 'expired' }))
      .mockResolvedValueOnce(response(200, {
        accessToken: 'access-new',
        refreshToken: 'refresh-new',
      }))
      .mockResolvedValueOnce(response(200, { id: 'invoice-1' }));

    await expect(api('/api/mobile/invoices')).resolves.toEqual({ id: 'invoice-1' });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][1]?.body).toBe(JSON.stringify({ refreshToken: 'refresh-old' }));
    expect((fetchMock.mock.calls[2][1]?.headers as Record<string, string>).Authorization)
      .toBe('Bearer access-new');
  });
});

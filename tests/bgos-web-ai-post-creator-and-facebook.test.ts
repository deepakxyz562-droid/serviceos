import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Facebook Adapter & Publisher Media Normalization', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('exports persistDataUriToStorage and returns dataUri when unconfigured', async () => {
    const { persistDataUriToStorage } = await import('@/lib/social/publisher');
    const dummyDataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    const result = await persistDataUriToStorage('tenant-1', dummyDataUri);
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });

  it('handles Facebook data URI photo publish via binary FormData source', async () => {
    const { getAdapter } = await import('@/lib/social/registry');
    await import('@/lib/social/adapters/facebook');
    const adapter = getAdapter('facebook');
    expect(adapter).toBeDefined();

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'photo_12345', post_id: 'page123_post999' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const dummyDataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    const result = await adapter!.publish(
      {
        id: 'acc-1',
        platform: 'facebook',
        accountId: 'page123',
        accountName: 'Test Page',
        accessToken: 'fake_fb_token',
        metadata: { pageId: 'page123' },
      },
      {
        content: 'Test Facebook Post',
        mediaUrls: [dummyDataUri],
      }
    );

    expect(result.externalPostId).toBe('page123_post999');
    expect(fetchMock).toHaveBeenCalled();
    const [calledUrl, calledOptions] = fetchMock.mock.calls[0];
    expect(calledUrl).toContain('/photos');
    expect(calledOptions.body).toBeInstanceOf(FormData);
  });
});

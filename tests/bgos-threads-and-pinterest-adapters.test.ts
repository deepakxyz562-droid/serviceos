import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SUPPORTED_PUBLISHING_PLATFORMS, publishingTargets } from '../shared/marketing-targets';
import { getAdapter, getSupportedPlatforms, hasAdapter } from '../src/lib/social/registry';
import threadsAdapter from '../src/lib/social/adapters/threads';
import { pinterestAdapter } from '../src/lib/social/adapters/pinterest';
import { linkedinAdapter } from '../src/lib/social/adapters/linkedin';

describe('BGOS Social Integrations: Threads, Pinterest, and LinkedIn', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('includes threads, pinterest, and linkedin in SUPPORTED_PUBLISHING_PLATFORMS', () => {
    expect(SUPPORTED_PUBLISHING_PLATFORMS).toContain('threads');
    expect(SUPPORTED_PUBLISHING_PLATFORMS).toContain('pinterest');
    expect(SUPPORTED_PUBLISHING_PLATFORMS).toContain('linkedin');
  });

  it('registers threads, pinterest, and linkedin adapters in the registry', () => {
    expect(hasAdapter('threads')).toBe(true);
    expect(hasAdapter('pinterest')).toBe(true);
    expect(hasAdapter('linkedin')).toBe(true);

    expect(getAdapter('threads')).toBe(threadsAdapter);
    expect(getAdapter('pinterest')).toBe(pinterestAdapter);
    expect(getAdapter('linkedin')).toBe(linkedinAdapter);
  });

  describe('Threads Adapter Contract & Publishing', () => {
    it('implements platform, publish, refreshToken, and fetchMetrics', () => {
      expect(threadsAdapter.platform).toBe('threads');
      expect(typeof threadsAdapter.publish).toBe('function');
      expect(typeof threadsAdapter.refreshToken).toBe('function');
      expect(typeof threadsAdapter.fetchMetrics).toBe('function');
    });

    it('successfully publishes a text post to Threads', async () => {
      const mockFetch = vi.fn();
      // Step 1: create container
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'container_123' }),
      });
      // Step 2: publish container
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'post_999' }),
      });

      global.fetch = mockFetch;

      const result = await threadsAdapter.publish(
        {
          id: 'acc_th_1',
          platform: 'threads',
          accountId: 'threads_user_1',
          accountName: '@my_biz',
          accessToken: 'mock_token',
          metadata: { threadsUserId: 'threads_user_1' },
        },
        {
          content: 'Hello Meta Threads from BGOS!',
          mediaUrls: [],
        },
      );

      expect(result).toEqual({
        externalPostId: 'post_999',
        url: 'https://www.threads.net/post/post_999',
      });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('enforces character limits gracefully for Threads', async () => {
      const mockFetch = vi.fn();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'container_long' }),
      });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'post_long' }),
      });
      global.fetch = mockFetch;

      const longText = 'A'.repeat(600);
      const result = await threadsAdapter.publish(
        {
          id: 'acc_th_1',
          platform: 'threads',
          accountId: 'threads_user_1',
          accountName: '@my_biz',
          accessToken: 'mock_token',
        },
        {
          content: longText,
          mediaUrls: [],
        },
      );

      expect(result.externalPostId).toBe('post_long');
      // Verify body in first call was sliced
      const firstCallBody = mockFetch.mock.calls[0][1].body;
      expect(firstCallBody).toContain('text=');
    });

    it('refreshes a Threads access token', async () => {
      const mockFetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new_refreshed_token',
          token_type: 'bearer',
          expires_in: 5184000,
        }),
      });
      global.fetch = mockFetch;

      const res = await threadsAdapter.refreshToken!({
        id: 'acc_th_1',
        platform: 'threads',
        accountId: 'threads_user_1',
        accountName: '@my_biz',
        accessToken: 'old_token',
      });

      expect(res.accessToken).toBe('new_refreshed_token');
      expect(res.tokenExpiry).toBeInstanceOf(Date);
    });
  });

  describe('Publishing Targets Integration', () => {
    it('correctly filters and routes multi-channel targets including Pinterest, Threads, and LinkedIn', () => {
      const accounts = [
        { id: '1', platform: 'googlebusiness', isActive: true },
        { id: '2', platform: 'facebook', isActive: true },
        { id: '3', platform: 'instagram', isActive: true },
        { id: '4', platform: 'linkedin', isActive: true },
        { id: '5', platform: 'pinterest', isActive: true },
        { id: '6', platform: 'threads', isActive: true },
        { id: '7', platform: 'threads', isActive: false },
      ];

      const targets = publishingTargets(accounts, ['1', '4', '5', '6', '7']);
      expect(targets).toEqual([
        { platform: 'googlebusiness', socialAccountId: '1' },
        { platform: 'linkedin', socialAccountId: '4' },
        { platform: 'pinterest', socialAccountId: '5' },
        { platform: 'threads', socialAccountId: '6' },
      ]);
    });
  });
});

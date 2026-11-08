import { describe, it, expect } from 'vitest';
import {
  publishingTargets,
  selectedPublishingIds,
  type PublishingAccount,
} from '../shared/marketing-targets';

describe('BGOS Publishing Targets & Account Selection', () => {
  const mockAccounts: PublishingAccount[] = [
    {
      id: 'acc_gbp_1',
      platform: 'googlebusiness',
      accountName: 'Downtown Dental Care',
      accountId: 'loc_12345',
      isActive: true,
    },
    {
      id: 'acc_fb_1',
      platform: 'facebook',
      accountName: 'Downtown Dental Page',
      accountId: 'fb_page_678',
      isActive: true,
    },
    {
      id: 'acc_ig_1',
      platform: 'instagram',
      accountName: '@downtowndental',
      accountId: 'ig_user_999',
      isActive: true,
    },
    {
      id: 'acc_inactive_1',
      platform: 'googlebusiness',
      accountName: 'Old Clinic',
      isActive: false,
    },
    {
      id: 'acc_li_1',
      platform: 'linkedin',
      accountName: 'Downtown Dental LinkedIn',
      accountId: 'urn:li:organization:123',
      isActive: true,
    },
    {
      id: 'acc_pin_1',
      platform: 'pinterest',
      accountName: 'Dental Care Pins',
      accountId: 'pin_456',
      isActive: true,
    },
    {
      id: 'acc_th_1',
      platform: 'threads',
      accountName: '@downtowndental',
      accountId: 'th_789',
      isActive: true,
    },
  ];

  it('defaults to pre-selecting the active Google Business Profile account when manual selection is null', () => {
    const selected = selectedPublishingIds(mockAccounts, null, 'acc_gbp_1');
    expect(selected).toEqual(['acc_gbp_1']);
  });

  it('falls back to the first active Google Business account if saved ID is missing or not provided', () => {
    const selected = selectedPublishingIds(mockAccounts, null, null);
    expect(selected).toEqual(['acc_gbp_1']);
  });

  it('respects manual user selection when checkboxes are checked or unchecked', () => {
    // User checks Google + Instagram
    const manualIds = ['acc_gbp_1', 'acc_ig_1'];
    const selected = selectedPublishingIds(mockAccounts, manualIds, 'acc_gbp_1');
    expect(selected).toEqual(['acc_gbp_1', 'acc_ig_1']);
  });

  it('filters out inactive accounts even if present in manualIds', () => {
    const manualIds = ['acc_gbp_1', 'acc_inactive_1'];
    const selected = selectedPublishingIds(mockAccounts, manualIds);
    expect(selected).toEqual(['acc_gbp_1']);
  });

  it('correctly maps selected IDs to publishingTargets payload for API dispatch', () => {
    const selected = ['acc_gbp_1', 'acc_fb_1'];
    const targets = publishingTargets(mockAccounts, selected);

    expect(targets).toEqual([
      { platform: 'googlebusiness', socialAccountId: 'acc_gbp_1' },
      { platform: 'facebook', socialAccountId: 'acc_fb_1' },
    ]);
  });

  it('returns empty targets when no accounts are selected', () => {
    const targets = publishingTargets(mockAccounts, []);
    expect(targets).toEqual([]);
  });

  it('correctly dispatches targets for LinkedIn, Pinterest, and Threads accounts', () => {
    const selected = ['acc_li_1', 'acc_pin_1', 'acc_th_1'];
    const targets = publishingTargets(mockAccounts, selected);

    expect(targets).toEqual([
      { platform: 'linkedin', socialAccountId: 'acc_li_1' },
      { platform: 'pinterest', socialAccountId: 'acc_pin_1' },
      { platform: 'threads', socialAccountId: 'acc_th_1' },
    ]);
  });
});

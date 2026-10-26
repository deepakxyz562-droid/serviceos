import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useAppStore } from '@/store/app-store';

afterEach(cleanup);

beforeEach(() => {
  useAppStore.getState().setAuth({
    isAuthenticated: true,
    user: { id: 'owner-1', email: 'owner@example.com', name: 'Real Owner', role: 'owner', tenantId: 't-real' },
    tenant: { id: 't-real', name: 'Acme Services', city: 'Phoenix, AZ' },
    workspace: { id: 'w-real', productType: 'bgos' },
  });
  useAppStore.setState({ currentView: 'socialMedia', leftSidebarOpen: true });
});

describe('Marketing Studio Connected Channels Verification', () => {
  it('correctly maps googlebusiness to Google Business Connected state and respects provider status for WhatsApp/Email/SMS', async () => {
    // Mock APIs:
    // Google Business is connected in social accounts
    // Email is configured in provider status; WhatsApp and SMS are unconfigured
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/social/accounts')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: [
              {
                id: 'acc-gbp-1',
                platform: 'googlebusiness',
                accountId: 'locations/loc-1',
                accountName: 'Acme Services Phoenix',
                isActive: true,
              },
            ],
          }),
        });
      }
      if (url.includes('/api/campaigns/provider-status')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            whatsapp: { configured: false, providerName: null },
            email: { configured: true, providerName: 'AWS SES' },
            sms: { configured: false, providerName: null },
            allConfigured: false,
          }),
        });
      }
      if (url.includes('/api/social/posts')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ posts: [] }),
        });
      }
      if (url.includes('/api/campaigns')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ campaigns: [] }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      });
    });

    const { BgosSocialMarketing } = await import('@/components/bgos/social-marketing');

    render(<BgosSocialMarketing isDemo={false} />);

    // Wait for the async API data to populate connectedPlatforms
    let smsButton: HTMLElement | null = null;
    await waitFor(() => {
      const heading = screen.getByRole('heading', { level: 2, name: 'Connected Channels' });
      const channelsCard = heading.parentElement?.parentElement!;

      // Find the Google Business channel container
      const gbpRow = within(channelsCard).getByText('Google Business').closest('button');
      expect(gbpRow?.textContent).not.toContain('Not Connected');
      expect(gbpRow?.textContent).toContain('Connected');

      // Facebook & Instagram should be Not Connected
      const fbRow = within(channelsCard).getByText('Facebook').closest('button');
      expect(fbRow?.textContent).toContain('Not Connected');

      const igRow = within(channelsCard).getByText('Instagram').closest('button');
      expect(igRow?.textContent).toContain('Not Connected');

      // Email (SES) was configured in provider status -> Connected
      const emailRow = within(channelsCard).getByText('Email (SES)').closest('button');
      expect(emailRow?.textContent).not.toContain('Not Connected');
      expect(emailRow?.textContent).toContain('Connected');

      // WhatsApp & SMS were not configured -> Not Connected (truthful, not hardcoded!)
      const waRow = within(channelsCard).getByText('WhatsApp').closest('button');
      expect(waRow?.textContent).toContain('Not Connected');

      const smsRow = within(channelsCard).getByText('SMS (Twilio)').closest('button');
      expect(smsRow?.textContent).toContain('Not Connected');
      smsButton = smsRow;
    });

    // Clicking SMS opens settings
    expect(smsButton).not.toBeNull();
    fireEvent.click(smsButton!);
    expect(useAppStore.getState().currentView).toBe('settings');
  });
});

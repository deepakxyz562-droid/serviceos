import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { useAppStore } from '@/store/app-store';

afterEach(cleanup);

beforeEach(() => {
  useAppStore.getState().setAuth({
    isAuthenticated: true,
    user: { id: 'owner-1', email: 'owner@example.com', name: 'Real Owner', role: 'owner', tenantId: 't-real' },
    tenant: { id: 't-real', name: 'Acme Services', city: 'Phoenix, AZ' },
    workspace: { id: 'w-real', productType: 'bgos' },
  });
  useAppStore.setState({ currentView: 'dashboard', leftSidebarOpen: true, mobileSidebarOpen: false });

  // Mock global fetch to return safe empty data by default
  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes('/api/dashboard/stats')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ leads: 0, appointments: 0, calls: 0, messages: 0, reviews: 0 }),
      });
    }
    if (url.includes('/api/conversations')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ conversations: [] }),
      });
    }
    if (url.includes('/api/omnichannel/visitors')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ visitors: [] }),
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
    if (url.includes('/api/social/accounts')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ accounts: [] }),
      });
    }
    return Promise.resolve({
      ok: true,
      json: async () => ({}),
    });
  });
});

describe('BGOS Production Zero-State Verification', () => {
  it('BgosDashboard in production mode renders zero mock tasks or activities', async () => {
    const { BgosDashboard } = await import('@/components/bgos/dashboard');

    render(<BgosDashboard isDemo={false} />);

    // Production identity
    expect(screen.getByText('Acme Services')).toBeDefined();

    // MUST NOT render hardcoded sample records
    expect(screen.queryByText('Anita Desai')).toBeNull();
    expect(screen.queryByText('Call back Priya Singh')).toBeNull();
    expect(screen.queryByText('Follow up with Rahul Kumar')).toBeNull();

    // Clean empty state indicators
    expect(screen.getByText(/All caught up!/i)).toBeDefined();
    expect(screen.getByText(/No pending follow-ups or urgent tasks/i)).toBeDefined();
    expect(screen.getByText(/No activity in this view/i)).toBeDefined();
  });

  it('BgosOmnichannelInbox in production mode renders zero mock conversations or live lurkers', async () => {
    const { BgosOmnichannelInbox } = await import('@/components/bgos/omnichannel-inbox');

    render(<BgosOmnichannelInbox isDemo={false} />);

    // MUST NOT render sample mock thread
    expect(screen.queryByText('Priya Sharma')).toBeNull();
    expect(screen.queryByText('Deep Clean')).toBeNull();

    // Clean empty state indicator for conversations
    expect(screen.getByText(/No conversations yet/i)).toBeDefined();
  });

  it('BgosOmnichannelInbox Live Visitors tab in production mode starts with clean radar', async () => {
    const { BgosOmnichannelInbox } = await import('@/components/bgos/omnichannel-inbox');

    render(<BgosOmnichannelInbox initialTab="visitors" isDemo={false} />);

    // MUST NOT render hardcoded sample visitor
    expect(screen.queryByText('Visitor #8487')).toBeNull();
    expect(screen.queryByText('Returning Lead')).toBeNull();

    // Clean empty radar message
    expect(screen.getByText(/Live Radar Active — No Visitors Browsing Right Now/i)).toBeDefined();
  });

  it('BgosSocialMarketing in production mode renders zero mock campaigns or posts', async () => {
    const { BgosSocialMarketing } = await import('@/components/bgos/social-marketing');

    render(<BgosSocialMarketing isDemo={false} />);

    // MUST NOT render hardcoded sample campaign or posts
    expect(screen.queryByText('Spring Promo Blast')).toBeNull();
    expect(screen.queryByText(/Transform Your Weekend with a Fresh Space/i)).toBeNull();

    // Clean empty campaign and schedule state
    expect(screen.getByText(/No active campaigns/i)).toBeDefined();
  });
});

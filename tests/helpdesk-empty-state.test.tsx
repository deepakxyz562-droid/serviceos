import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { HelpCenterView } from '@/components/bgos/helpdesk-workstation';
import { BgosNavigation } from '@/components/bgos/navigation';
import { BGOS_NAVIGATION } from '../shared/bgos-navigation';
import { useAppStore } from '@/store/app-store';

afterEach(cleanup);

beforeEach(() => {
  useAppStore.getState().setAuth({
    isAuthenticated: true,
    user: { id: 'owner', email: 'owner@test.com', name: 'Owner', role: 'owner', tenantId: 'tenant_123' },
    tenant: { id: 'tenant_123', name: 'Acme HVAC' },
    workspace: { id: 'ws_123', productType: 'bgos' },
  });
  useAppStore.setState({ currentView: 'helpCenter', leftSidebarOpen: true });
});

describe('Helpdesk Workstation & Navigation robustness', () => {
  it('renders gracefully without crashing when tickets API returns an empty list', async () => {
    // Mock /api/support/tickets to return empty list (simulating fresh tenant)
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/support/tickets')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ tickets: [], empty: true, isSample: false }),
        } as Response);
      }
      return originalFetch(url);
    });

    try {
      render(<HelpCenterView />);

      // Wait for empty state to resolve
      expect(await screen.findByText('No tickets found')).toBeDefined();
      expect(screen.getByText('No Ticket Selected')).toBeDefined();
      expect(screen.getByText('Customer & Ticket Info')).toBeDefined();

      // Verify status pills reflect real empty database counts (0)
      expect(screen.getByRole('button', { name: /All\s*0/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /Open\s*0/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /In Progress\s*0/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /Waiting\s*0/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /Resolved\s*0/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /Closed\s*0/i })).toBeDefined();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('verifies BGOS navigation does not contain hardcoded 12 and 3 badges on Inbox and Tickets & Support', () => {
    render(<BgosNavigation />);

    // Verify BGOS_NAVIGATION definition has no badge property on Inbox or Tickets & Support
    const coreItems = BGOS_NAVIGATION.find((s) => s.title === 'Core')?.items || [];
    const inboxItem = coreItems.find((i) => i.view === 'omnichannel');
    const ticketsItem = coreItems.find((i) => i.view === 'helpCenter');

    expect(inboxItem).toBeDefined();
    expect((inboxItem as any)?.badge).toBeUndefined();

    expect(ticketsItem).toBeDefined();
    expect((ticketsItem as any)?.badge).toBeUndefined();

    // Verify rendered buttons for Inbox and Tickets & Support do not display hardcoded '12' or '3' badge spans
    const inboxBtn = screen.getByRole('button', { name: /^Inbox$/i });
    expect(inboxBtn).toBeDefined();

    const ticketsBtn = screen.getByRole('button', { name: /^Tickets & Support$/i });
    expect(ticketsBtn).toBeDefined();

    // Query for any standalone badge with '12' or '3' in the navigation
    expect(screen.queryByText('12')).toBeNull();
    expect(screen.queryByText('3')).toBeNull();
  });
});

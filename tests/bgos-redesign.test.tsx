import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BgosLeadBoard } from '@/components/bgos/lead-presentation';
import { BgosMobileNavigation, BgosNavigation } from '@/components/bgos/navigation';
import { useAppStore } from '@/store/app-store';
import type { Lead } from '@/features/leads/types';

afterEach(cleanup);
beforeEach(() => {
  useAppStore.getState().setAuth({ isAuthenticated: true, user: { id: 'owner', email: 'owner@test.com', name: 'Owner', role: 'owner', tenantId: 't' }, tenant: { id: 't' }, workspace: { id: 'w', productType: 'bgos' } });
  useAppStore.setState({ currentView: 'dashboard', leftSidebarOpen: true, mobileSidebarOpen: false });
});
it('routes desktop CRM to existing lead records and keeps contacts under the same section', () => {
  render(<BgosNavigation />);
  fireEvent.click(screen.getByRole('button', { name: 'Leads & CRM', exact: true }));
  expect(useAppStore.getState().currentView).toBe('leads');
  expect(screen.queryByRole('button', { name: /store|inventory|invoice|jobs/i })).toBeNull();
});
it('mobile More opens the same product drawer without BOS quick actions', () => {
  render(<BgosMobileNavigation />);
  fireEvent.click(screen.getByRole('button', { name: 'Leads & CRM' }));
  expect(useAppStore.getState().currentView).toBe('leads');
  fireEvent.click(screen.getByRole('button', { name: 'More' }));
  expect(useAppStore.getState().mobileSidebarOpen).toBe(true);
  expect(screen.queryByText(/store|invoice|jobs/i)).toBeNull();
});
it('opens a real lead from the board and keeps failed loads distinct from empty data', () => {
  const lead = { id: 'lead-1', name: 'Customer One', status: 'contacted', source: 'website', value: 200, phone: '123' } as Lead;
  const onLeadClick = vi.fn();
  const onRetry = vi.fn();
  const props = { leads: [lead], loading: false, error: null, onRetry, onLeadClick, onAddLead: vi.fn(), formatCompact: String };
  const view = render(<BgosLeadBoard {...props} />);
  fireEvent.click(screen.getByRole('button', { name: /Customer One/ }));
  expect(onLeadClick).toHaveBeenCalledWith(lead);
  view.rerender(<BgosLeadBoard {...props} leads={[]} error="Network unavailable" />);
  expect(screen.queryByText('Your next relationship starts here')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(onRetry).toHaveBeenCalledOnce();
});

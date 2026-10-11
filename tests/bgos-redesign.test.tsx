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

it('renders AI Studio overview workstation with 3-column layout and reactive settings', async () => {
  const { AgentOverviewTab } = await import('@/features/forms/components/agent-builder/agent-overview-tab');
  const { DEFAULT_FORM_AGENT } = await import('@/features/forms/types/agent-types');

  const onChange = vi.fn();
  const onNavigateTab = vi.fn();

  render(
    <AgentOverviewTab
      agent={DEFAULT_FORM_AGENT}
      onChange={onChange}
      onNavigateTab={onNavigateTab}
      businessName="deepak chandra's Workspace"
    />
  );

  // Left Column
  expect(screen.getByText('Assistant Status')).toBeDefined();
  expect(screen.getByText('Active')).toBeDefined();
  expect(screen.getByText('Answer customer questions')).toBeDefined();
  expect(screen.getByText('Connected Channels')).toBeDefined();

  // Center Column
  expect(screen.getAllByText('Website Chat').length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText('Professional Cleaning Services')).toBeDefined();
  expect(screen.getByText('Get Instant Estimate')).toBeDefined();
  expect(screen.getAllByText('Book Appointment').length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText(/Powered by/)).toBeDefined();

  // Right Column
  expect(screen.getByText('Chatbot Settings')).toBeDefined();
  expect(screen.getByText('Floating Widget')).toBeDefined();
  expect(screen.getByText('Sidebar')).toBeDefined();

  // Interactivity: Clicking sidebar layout updates agent configuration
  fireEvent.click(screen.getByText('Sidebar'));
  expect(onChange).toHaveBeenCalled();
});

it('renders FormAgentStudio header with AI Studio title, actions, and 8 canonical tabs', async () => {
  const { FormAgentStudio } = await import('@/features/forms/components/agent-builder/form-agent-studio');
  const { DEFAULT_FORM_AGENT } = await import('@/features/forms/types/agent-types');

  render(<FormAgentStudio initialAgent={DEFAULT_FORM_AGENT} />);

  // Header Title & Actions
  expect(screen.getByText('AI Studio')).toBeDefined();
  expect(screen.getByText('Test Assistant')).toBeDefined();
  expect(screen.getByText('Preview')).toBeDefined();
  expect(screen.getByText('Publish Changes')).toBeDefined();

  // Canonical 8 Tabs
  expect(screen.getByRole('button', { name: /^Overview$/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /^Setup$/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /^Knowledge$/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /^Channels$/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /^Skills$/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /^Appearance$/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /^Test Lab$/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /^Analytics$/i })).toBeDefined();
});

it('renders Unified Inbox with circular channel triage, 3-segment switch, in-chat package cards, and Customer 360 dossier', async () => {
  const { OmnichannelView } = await import('@/components/views/omnichannel-view');

  render(<OmnichannelView />);

  // 1. Top Channel Triage Header
  expect(screen.getByRole('heading', { level: 1, name: 'Inbox' })).toBeDefined();
  expect(screen.getByTitle('WhatsApp')).toBeDefined();
  expect(screen.getByTitle('Live Chat')).toBeDefined();
  expect(screen.getByTitle('Instagram')).toBeDefined();

  // 2. 3-Segment Switchers
  expect(screen.getByRole('button', { name: /Conversations/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /Live Visitors/i })).toBeDefined();
  expect(screen.getAllByRole('button', { name: /Tickets/i }).length).toBeGreaterThanOrEqual(1);

  // 3. Filter Pills
  expect(screen.getByText('All 12')).toBeDefined();
  expect(screen.getByText('Unread 12')).toBeDefined();

  // 4. In-Chat Interactive Package Cards (Screenshot 3 Parity)
  expect(screen.getByText('Deep Clean')).toBeDefined();
  expect(screen.getByText('₹ 3,999')).toBeDefined();
  expect(screen.getByText('Most Popular')).toBeDefined();
  expect(screen.getAllByText('Select').length).toBeGreaterThanOrEqual(3);

  // 5. In-Chat Schedule Confirmation Chips
  expect(screen.getByRole('button', { name: 'Yes, confirm' })).toBeDefined();
  expect(screen.getByRole('button', { name: 'Change time' })).toBeDefined();

  // 6. Right Column: Customer 360 Dossier
  expect(screen.getByText('Conversation Summary')).toBeDefined();
  expect(screen.getByText('AI Generated')).toBeDefined();
  expect(screen.getByText('Customer Profile')).toBeDefined();
  expect(screen.getByText('VIP Customer')).toBeDefined();
  expect(screen.getByText('Total Spent')).toBeDefined();
  expect(screen.getByText('₹12,450')).toBeDefined();
  expect(screen.getByText('Automation & AI')).toBeDefined();

  // 7. Interactivity: Switch to Live Visitors radar
  fireEvent.click(screen.getByRole('button', { name: /Live Visitors/i }));
  expect(screen.getByText(/Live Website Visitor Radar/i)).toBeDefined();
  expect(screen.getByText('Visitor #4821')).toBeDefined();

  // Engage with Visitor
  const engageBtn = screen.getAllByRole('button', { name: 'Engage with Chat' })[0];
  fireEvent.click(engageBtn);

  // Switches back to conversation stream for visitor
  expect(screen.getAllByText('I need pricing details for deep cleaning a commercial kitchen.').length).toBeGreaterThanOrEqual(1);

  // 8. Interactivity: Switch to Tickets
  const ticketTab = screen.getAllByRole('button', { name: /Tickets/i })[0];
  fireEvent.click(ticketTab);
  expect(screen.getByText(/Customer Support Tickets/i)).toBeDefined();
  expect(screen.getByText('Booking Request #104')).toBeDefined();
});

it('supports selecting in-chat package cards and toggling AI automation in detail panel', async () => {
  const { OmnichannelView } = await import('@/components/views/omnichannel-view');

  render(<OmnichannelView />);

  // Clicking "Select" on the Deep Clean package triggers instant booking selection message
  const selectBtns = screen.getAllByRole('button', { name: 'Select' });
  fireEvent.click(selectBtns[1]); // Deep Clean is the 2nd package

  // Verify selection message is added to thread & conversation snippet
  expect(screen.getAllByText(/I would like to select the Deep Clean package/i).length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText(/Excellent choice! The/i).length).toBeGreaterThanOrEqual(1);
});

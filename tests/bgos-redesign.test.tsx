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

it('renders Tickets & Support Helpdesk workstation with 5 KPI cards, AI Triage, and Customer Dossier', async () => {
  const { HelpCenterView } = await import('@/components/views/help-center-view');

  render(<HelpCenterView />);

  // 1. Header & Badge
  expect(screen.getByRole('heading', { level: 1, name: /Tickets & Support Helpdesk/i })).toBeDefined();
  expect(screen.getByText(/AI Copilot Triaging Active/i)).toBeDefined();
  expect(screen.getByRole('button', { name: /Ticket Settings/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /Export CSV/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /Create Ticket/i })).toBeDefined();

  // 2. 5 KPI Telemetry Cards
  expect(screen.getByText('Open Backlog')).toBeDefined();
  expect(screen.getByText('Unassigned')).toBeDefined();
  expect(screen.getByText('Avg First Response')).toBeDefined();
  expect(screen.getByText('Resolution Rate')).toBeDefined();
  expect(screen.getByText('CSAT Satisfaction')).toBeDefined();
  expect(screen.getByText('94.2%')).toBeDefined();
  expect(screen.getByText('4.85')).toBeDefined();

  // 3. Sub-Navigation Filter Tabs
  expect(screen.getByRole('button', { name: /All Tickets/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /My Assigned/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /Urgent & Escalated/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /Reschedule Requests/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /Quality & Complaints/i })).toBeDefined();

  // 4. Column 1: Queue Feed Cards
  expect(screen.getByText('Queue Feed')).toBeDefined();
  expect(screen.getAllByText('#TK-1082').length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText('#TK-1081')).toBeDefined();
  expect(screen.getByText('#TK-1080')).toBeDefined();
  expect(screen.getByText('#TK-1079')).toBeDefined();
  expect(screen.getByText('#TK-1078')).toBeDefined();

  // 5. Column 2: Active Ticket & AI Triage
  expect(screen.getAllByText(/Reschedule move-out clean to Monday, May 5/i).length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText(/AI Copilot Smart Triage Summary/i)).toBeDefined();
  expect(screen.getByText(/Triage Confidence 99.4%/i)).toBeDefined();
  expect(screen.getByText(/Recommended 1-Click Resolution/i)).toBeDefined();
  expect(screen.getByRole('button', { name: /Update Schedule & Send WhatsApp/i })).toBeDefined();

  // 6. Column 3: Customer Dossier & Context
  expect(screen.getByText('Customer Dossier')).toBeDefined();
  expect(screen.getAllByText('Emily Davis').length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText('$780')).toBeDefined();
  expect(screen.getByText('LTV Spent')).toBeDefined();
  expect(screen.getByText('#ORD-4491')).toBeDefined();
  expect(screen.getByText('Move-out Deep Clean')).toBeDefined();
  expect(screen.getByText(/Property Notes:/i)).toBeDefined();
  expect(screen.getByText(/SLA Target Milestones/i)).toBeDefined();

  // 7. Interactivity: Clicking "Update Schedule & Send WhatsApp" applies resolution
  const actionBtn = screen.getByRole('button', { name: /Update Schedule & Send WhatsApp/i });
  fireEvent.click(actionBtn);

  // Resolution message should be appended to the conversation thread
  expect(screen.getAllByText(/Technician Kevin Harris is assigned/i).length).toBeGreaterThanOrEqual(1);

  // 8. Interactivity: Clicking "Resolve" marks ticket as solved
  const resolveBtn = screen.getByRole('button', { name: /^Resolve$/i });
  fireEvent.click(resolveBtn);
});

it('renders Marketing Studio with 5 KPI cards, AI Post Generator, live preview canvas, and campaign velocity', async () => {
  const { SocialMediaView } = await import('@/components/views/tenant/social-media-view');

  render(<SocialMediaView />);

  // 1. Header & Primary Actions
  expect(screen.getByRole('heading', { level: 1, name: /Marketing Studio/i })).toBeDefined();
  expect(screen.getByText(/AI Enabled/i)).toBeDefined();
  expect(screen.getByRole('button', { name: /\+ Create Campaign/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /Create Post/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /View Analytics/i })).toBeDefined();

  // 2. 5 KPI Telemetry Cards
  expect(screen.getByText('Posts Published')).toBeDefined();
  expect(screen.getByText('Total Reach')).toBeDefined();
  expect(screen.getByText('Engagements')).toBeDefined();
  expect(screen.getByText('New Leads')).toBeDefined();
  expect(screen.getByText('Estimated Pipeline')).toBeDefined();
  expect(screen.getByText('1.2M')).toBeDefined();
  expect(screen.getByText('4,856')).toBeDefined();
  expect(screen.getByText('342')).toBeDefined();
  expect(screen.getByText('$18,420')).toBeDefined();

  // 3. Sub-Navigation Tabs
  expect(screen.getByRole('button', { name: /^Overview$/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /AI Post Generator/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /Social Media Accounts/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /Posts Feed/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /Post Composer/i })).toBeDefined();

  // 4. Column 1: AI Post Generator
  expect(screen.getByText('Post Concept or Offer Details')).toBeDefined();
  expect(screen.getByRole('button', { name: /Generate 3 Posts/i })).toBeDefined();
  expect(screen.getByText('Quick Prompts')).toBeDefined();
  expect(screen.getByText('Spring Cleaning 20%')).toBeDefined();
  expect(screen.getByText('Move-in Special')).toBeDefined();

  // 5. Column 2: Post Preview Canvas
  expect(screen.getByText('Post Preview')).toBeDefined();
  expect(screen.getByText('Cinderella Cleaners')).toBeDefined();
  expect(screen.getByText(/@cinderellacleaners • Tucson, AZ/i)).toBeDefined();
  expect(screen.getByRole('button', { name: /^Schedule$/i })).toBeDefined();

  // 6. Column 3: Calendar & Platform Integrations
  expect(screen.getByText('Content Calendar')).toBeDefined();
  expect(screen.getByText('Apr 21 – Apr 27, 2025')).toBeDefined();
  expect(screen.getByText('Channel Integrations')).toBeDefined();
  expect(screen.getAllByText('Instagram').length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText('Facebook').length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText('Google Biz')).toBeDefined();
  expect(screen.getByText('WhatsApp')).toBeDefined();

  // 7. Lower Section: Recent Posts Velocity & Active Campaigns
  expect(screen.getByText('Recent Posts & Content Velocity')).toBeDefined();
  expect(screen.getByText('Spring Cleaning Promo 2025')).toBeDefined();
  expect(screen.getByText('Active Campaigns')).toBeDefined();
  expect(screen.getByText('Move-in Sanitization')).toBeDefined();
  expect(screen.getByText('Google 5-Star Booster')).toBeDefined();
  expect(screen.getByText('Give $30, Get $30')).toBeDefined();

  // 8. Bottom Visual Bar: Creative Assets & AI Suggestions
  expect(screen.getByText('Top Performing Creative Assets')).toBeDefined();
  expect(screen.getByText('Spring Kitchen Reset')).toBeDefined();
  expect(screen.getByText('Content Suggestions')).toBeDefined();
  expect(screen.getByText('Dust storm recovery cleaning tips')).toBeDefined();

  // 9. Interactivity: Clicking a Quick Prompt updates the concept text
  const moveInPrompt = screen.getByText('Move-in Special');
  fireEvent.click(moveInPrompt);
  expect(screen.getByText('Move-in Ready')).toBeDefined();
  expect(screen.getByText('Move-In Fresh Home Sanitization')).toBeDefined();

  // 10. Interactivity: Clicking "Schedule" adds to calendar and shows confirmation notice
  const scheduleBtn = screen.getByRole('button', { name: /^Schedule$/i });
  fireEvent.click(scheduleBtn);
  expect(screen.getByText(/Successfully scheduled to IG! Added to Content Calendar./i)).toBeDefined();
});

it('renders Google Business & Reviews with 5 KPIs, Review Trend, triage feed, and AI Review Reply', async () => {
  const { ReviewsView } = await import('@/components/views/reviews-view');

  render(<ReviewsView />);

  // 1. Header & Navigation Tabs
  expect(screen.getByRole('heading', { level: 1, name: /Google Business & Reviews/i })).toBeDefined();
  expect(screen.getByText('Connected')).toBeDefined();
  expect(screen.getByRole('button', { name: /Sync GBP/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /^Overview$/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /^Reviews$/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /^Posts$/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /^Q&A$/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /^Insights$/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /^Photos$/i })).toBeDefined();

  // 2. 5 KPI Telemetry Cards
  expect(screen.getByText('Google Rating')).toBeDefined();
  expect(screen.getByText('4.8')).toBeDefined();
  expect(screen.getByText('(326 reviews)')).toBeDefined();
  expect(screen.getByText('Total Reviews')).toBeDefined();
  expect(screen.getByText('326')).toBeDefined();
  expect(screen.getByText('New Reviews')).toBeDefined();
  expect(screen.getByText('24')).toBeDefined();
  expect(screen.getByText('Average Response Time')).toBeDefined();
  expect(screen.getByText('2.4 hours')).toBeDefined();
  expect(screen.getByText('Response Rate')).toBeDefined();
  expect(screen.getByText('100%')).toBeDefined();

  // 3. Middle Tier: Review Trend, Breakdown & Get More Reviews
  expect(screen.getByText('Review Trend')).toBeDefined();
  expect(screen.getByText('Review Breakdown')).toBeDefined();
  expect(screen.getByText('5 stars')).toBeDefined();
  expect(screen.getByText('72%')).toBeDefined();
  expect(screen.getByText('Get More Reviews')).toBeDefined();
  expect(screen.getByRole('button', { name: /Copy Review Link/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /Send via SMS/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /Send via Email/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /Download QR Code/i })).toBeDefined();

  // 4. Column 1: Reviews List & Triage
  expect(screen.getByText('Reviews (326)')).toBeDefined();
  expect(screen.getByRole('button', { name: /All \(326\)/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /Replied \(326\)/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /5 ★ \(235\)/i })).toBeDefined();
  expect(screen.getByPlaceholderText(/Search reviews, customer name or keywords.../i)).toBeDefined();
  expect(screen.getAllByText('Priya Singh').length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText('Rahul Kumar').length).toBeGreaterThanOrEqual(1);

  // 5. Column 2: Active Review Inspector
  expect(screen.getAllByText(/Amazing service! The team was professional/i).length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText('Your Reply')).toBeDefined();
  expect(screen.getByText('Customer Details')).toBeDefined();
  expect(screen.getByText('Tucson, AZ')).toBeDefined();
  expect(screen.getByRole('button', { name: /View in Google/i })).toBeDefined();

  // 6. Column 3: AI Review Reply (Beta), Insights & Quick Actions
  expect(screen.getByText('AI Review Reply')).toBeDefined();
  expect(screen.getByRole('button', { name: /Generate Reply/i })).toBeDefined();
  expect(screen.getByText('Review Insights')).toBeDefined();
  expect(screen.getAllByText(/cleaning/i).length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText(/professional/i).length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText('Actions')).toBeDefined();
  expect(screen.getByText('Request Reviews')).toBeDefined();
  expect(screen.getByText('Set Auto-Reply Rules')).toBeDefined();

  // 7. Interactivity: Selecting another review updates the inspector
  const rahulItem = screen.getAllByText('Rahul Kumar')[0];
  fireEvent.click(rahulItem);
  expect(screen.getAllByText(/Great service. Very friendly staff and reasonable pricing/i).length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText('Oro Valley, AZ')).toBeDefined();

  // 8. Interactivity: Generate Reply button updates reply draft
  const generateBtn = screen.getByRole('button', { name: /Generate Reply/i });
  fireEvent.click(generateBtn);
});

it('renders Campaigns & Outreach prospecting workstation with 6-stage funnel, search filters, business table, and dossier', async () => {
  const { BgosOutreach } = await import('@/components/bgos/outreach');
  const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <BgosOutreach />
    </QueryClientProvider>
  );

  // 1. Header & Navigation Tabs
  expect(screen.getByRole('heading', { level: 1, name: /Campaigns & Outreach/i })).toBeDefined();
  expect(screen.getByText('Multi-Channel')).toBeDefined();
  expect(screen.getByRole('button', { name: /Create Campaign/i })).toBeDefined();

  // Sub-Navigation Tabs
  expect(screen.getByRole('button', { name: /Find Prospects/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /Campaigns/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /Sequences/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /Audience & Segments/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /Reports/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /Settings/i })).toBeDefined();

  // 2. 6-Stage B2B Outreach Stepper
  expect(screen.getByText('Discover')).toBeDefined();
  expect(screen.getByText('Qualify')).toBeDefined();
  expect(screen.getByText('Select Audience')).toBeDefined();
  expect(screen.getByText('Personalize')).toBeDefined();
  expect(screen.getByText('Review & Send')).toBeDefined();
  expect(screen.getByText('Track & Follow Up')).toBeDefined();

  // 3. Search Controls Card
  expect(screen.getByText('Find Business Prospects')).toBeDefined();
  expect(screen.getByDisplayValue('office cleaning')).toBeDefined();
  expect(screen.getByDisplayValue('Tucson, Arizona')).toBeDefined();
  expect(screen.getByRole('button', { name: /^Search$/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /Saved Searches/i })).toBeDefined();

  // 4. Results Table
  expect(screen.getByText('Businesses Found (1,248)')).toBeDefined();
  expect(screen.getByRole('button', { name: /AI Qualify/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /Export/i })).toBeDefined();
  expect(screen.getAllByText('Desert Sky Offices').length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText('Pima Medical Center').length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText('Arizona Law Group').length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText('Riverside Accounting').length).toBeGreaterThanOrEqual(1);

  // 5. Business Details Dossier (Default: Desert Sky Offices)
  expect(screen.getByText('Business Details')).toBeDefined();
  expect(screen.getByText('92% Match')).toBeDefined();
  expect(screen.getAllByText('desertskyoffices.com').length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText('Business Information')).toBeDefined();
  expect(screen.getAllByText('AI Insights').length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText('High potential lead')).toBeDefined();
  expect(screen.getByText('Recommended Message Angle')).toBeDefined();
  expect(screen.getByRole('button', { name: /Add to Outreach/i })).toBeDefined();

  // 6. Interactivity: Selecting another business updates the dossier
  const pimaRow = screen.getAllByText('Pima Medical Center')[0];
  fireEvent.click(pimaRow);
  expect(screen.getByText('88% Match')).toBeDefined();
  expect(screen.getAllByText('pimamedical.com').length).toBeGreaterThanOrEqual(1);

  // 7. Interactivity: Clicking Add to Outreach triggers action
  const addBtn = screen.getByRole('button', { name: /Add to Outreach/i });
  fireEvent.click(addBtn);

  // 8. Interactivity: Clicking Create Campaign opens dialog modal
  const createBtn = screen.getByRole('button', { name: /Create Campaign/i });
  fireEvent.click(createBtn);
  expect(screen.getByText('Create Outreach Campaign')).toBeDefined();
});

it('renders Forms & Funnels executive dashboard with 4 KPIs, template carousel, table, right rail, and transitions to visual builder', async () => {
  const { FormBuilderView } = await import('@/components/views/form-builder-view');

  render(<FormBuilderView />);

  // 1. Header & Global CTA
  expect(screen.getByRole('heading', { level: 1, name: /^Forms/i })).toBeDefined();
  expect(
    screen.getByText(/Create high-converting forms.*to capture leads, book appointments and grow your business\./i)
  ).toBeDefined();
  expect(screen.getAllByRole('button', { name: /Create Form/i }).length).toBeGreaterThanOrEqual(1);

  // 2. Sub-Navigation Tabs
  expect(screen.getByRole('button', { name: /^Overview$/i })).toBeDefined();
  expect(screen.getAllByRole('button', { name: /^Forms$/i }).length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByRole('button', { name: /^Funnels$/i }).length).toBeGreaterThanOrEqual(1);
  expect(screen.getByRole('button', { name: /^Templates$/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /^Submissions$/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /^Analytics$/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /^Settings$/i })).toBeDefined();

  // 3. 4 Growth KPI Telemetry Cards
  expect(screen.getByText('Total Forms')).toBeDefined();
  expect(screen.getByText('12')).toBeDefined();
  expect(screen.getByText('+20% vs last month')).toBeDefined();

  expect(screen.getByText('Total Funnels')).toBeDefined();
  expect(screen.getByText('6')).toBeDefined();
  expect(screen.getByText('+50% vs last month')).toBeDefined();

  expect(screen.getByText('Leads Captured')).toBeDefined();
  expect(screen.getAllByText('428').length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText('+38% vs last month')).toBeDefined();

  expect(screen.getByText('Appointments Booked')).toBeDefined();
  expect(screen.getByText('126')).toBeDefined();
  expect(screen.getByText('+12% vs last month')).toBeDefined();

  // 4. Popular Templates Carousel
  expect(screen.getByText('Popular Templates')).toBeDefined();
  expect(screen.getByText('View All Templates')).toBeDefined();
  expect(screen.getAllByText('Home Cleaning Quote').length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText('Appointment Booking').length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText('Contact Us Form')).toBeDefined();
  expect(screen.getAllByText('Service Request').length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText('Survey Form')).toBeDefined();
  expect(screen.getByText('Landing Page Funnel')).toBeDefined();

  // 5. Recent Forms & Funnels Table
  expect(screen.getByRole('button', { name: /^All$/i })).toBeDefined();
  expect(screen.getAllByRole('button', { name: /^Forms$/i }).length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByRole('button', { name: /^Funnels$/i }).length).toBeGreaterThanOrEqual(1);
  expect(screen.getByRole('button', { name: /^Drafts$/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /^Published$/i })).toBeDefined();
  expect(screen.getByText('Diwali Offer Landing Page')).toBeDefined();
  expect(screen.getByText('Service Request Form')).toBeDefined();

  // 6. Right Rail: Lead Sources Donut & Quick Actions
  expect(screen.getByText('Lead Sources')).toBeDefined();
  expect(screen.getByText('Total Leads')).toBeDefined();
  expect(screen.getByText('Website')).toBeDefined();
  expect(screen.getByText('42%')).toBeDefined();
  expect(screen.getByText('Google Business')).toBeDefined();
  expect(screen.getAllByText('24%').length).toBeGreaterThanOrEqual(1);

  expect(screen.getByText('Quick Actions')).toBeDefined();
  expect(screen.getAllByRole('button', { name: /^Create Form$/i }).length).toBeGreaterThanOrEqual(1);
  expect(screen.getByRole('button', { name: /^Create Funnel$/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /Browse Templates/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /View Submissions/i })).toBeDefined();

  // 7. Form Submissions Live Triage
  expect(screen.getByText('Form Submissions')).toBeDefined();
  expect(screen.getByText('Priya Singh')).toBeDefined();
  expect(screen.getByText('Rahul Kumar')).toBeDefined();
  expect(screen.getByText('Sneha Patel')).toBeDefined();

  // 8. Interactivity: Transition into Visual Funnel & Form Builder Workstation
  const createFunnelBtn = screen.getAllByRole('button', { name: /Create Form/i })[0];
  fireEvent.click(createFunnelBtn);

  // Verifies Visual Builder Workstation is mounted
  expect(screen.getByText(/Service Request Form|Home Cleaning Quote Funnel/i)).toBeDefined();
  expect(screen.getByText('Published')).toBeDefined();
  expect(screen.getByRole('button', { name: /^Build$/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /^Design$/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /^Settings$/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /^Preview$/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /^Publish$/i })).toBeDefined();

  // 3-Column Workstation Layout Checks
  // Left: Add Elements
  expect(screen.getByText('Add Elements')).toBeDefined();
  expect(screen.getByText('Form Elements')).toBeDefined();
  expect(screen.getByText('Basic Fields')).toBeDefined();
  expect(screen.getByText('Text Input')).toBeDefined();
  expect(screen.getByText('Radio Buttons')).toBeDefined();

  // Center: Live Stage Canvas
  expect(screen.getByRole('button', { name: /Desktop/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /Mobile/i })).toBeDefined();
  expect(screen.getByText('Service')).toBeDefined();
  expect(screen.getByText('Details')).toBeDefined();
  expect(screen.getByText('Quote')).toBeDefined();
  expect(screen.getByText('Contact')).toBeDefined();
  expect(screen.getByText('Professional Home Cleaning Services')).toBeDefined();
  expect(screen.getByText('What type of cleaning do you need?')).toBeDefined();
  expect(screen.getAllByText('Regular Home Cleaning').length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText('Deep Cleaning')).toBeDefined();
  expect(screen.getByText('Move In/Out Cleaning')).toBeDefined();
  expect(screen.getByText('Office Cleaning')).toBeDefined();
  expect(screen.getByRole('button', { name: /Next Step/i })).toBeDefined();

  // Right: Element Settings Inspector
  expect(screen.getByText('Element Settings')).toBeDefined();
  expect(screen.getByRole('button', { name: /^Content$/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /^Style$/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /^Advanced$/i })).toBeDefined();
  expect(screen.getByText('Option Settings')).toBeDefined();
  expect(screen.getByText('Selected by default')).toBeDefined();
  expect(screen.getByText('Required field')).toBeDefined();
  expect(screen.getByRole('button', { name: /Delete Element/i })).toBeDefined();

  // 9. Interactivity: Selecting another service option updates inspector
  const deepCleaningOption = screen.getByText('Deep Cleaning');
  fireEvent.click(deepCleaningOption);
  expect(screen.getByDisplayValue('Deep Cleaning')).toBeDefined();

  // 10. Interactivity: Next Step button advances stage
  const nextStepBtn = screen.getByRole('button', { name: /Next Step/i });
  fireEvent.click(nextStepBtn);
  expect(screen.getByText(/Step 2 of 4/i)).toBeDefined();
});

it('renders Live Website Visitor Radar workstation inside Inbox with telemetry strip, visitor stream, live keystroke mirror, and dossier', async () => {
  const { OmnichannelView } = await import('@/components/views/omnichannel-view');

  render(<OmnichannelView initialTab="visitors" />);

  // 1. Radar Header & Online Badges
  expect(screen.getByText(/Live Website Visitor Radar/i)).toBeDefined();
  expect(screen.getByText(/3 Online Now/i)).toBeDefined();
  expect(screen.getByText(/28 Active Visitors/i)).toBeDefined();

  // 2. 5 Telemetry Metrics
  expect(screen.getByText('Active Live Visitors')).toBeDefined();
  expect(screen.getByText('In Active Chat')).toBeDefined();
  expect(screen.getByText('High Intent Lurkers')).toBeDefined();
  expect(screen.getByText('Avg Session Time')).toBeDefined();
  expect(screen.getByText('Trigger Conversion')).toBeDefined();

  // 3. Sub-filter tabs & Stream
  expect(screen.getByRole('button', { name: /Live Stream/i })).toBeDefined();
  expect(screen.getAllByRole('button', { name: /High Intent/i }).length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByRole('button', { name: /Chatting/i }).length).toBeGreaterThanOrEqual(1);

  // 4. Real-time Keystroke Mirror
  expect(screen.getByText(/Real-Time Keystroke Telemetry Preview/i)).toBeDefined();
  expect(screen.getByText(/do you guys bring your own organic supplies for hardwood fl/i)).toBeDefined();

  // 5. Proactive Rules Engine
  expect(screen.getByText('Proactive Radar Trigger Rules')).toBeDefined();
  expect(screen.getByText('Cart/Booking Hesitation')).toBeDefined();
  expect(screen.getByText('High-Value Calculator')).toBeDefined();
  expect(screen.getByText('Repeat Visitor Welcome')).toBeDefined();

  // 6. Right Column: Visitor Dossier & Takeover
  expect(screen.getAllByText('Visitor #8487').length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText('Returning Lead')).toBeDefined();
  expect(screen.getByText('AI Nudge Recommended')).toBeDefined();
  expect(screen.getByRole('button', { name: /Dispatch AI Nudge/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /Instant Human Takeover/i })).toBeDefined();

  // 7. Interactivity: Dispatch AI Nudge
  const nudgeBtn = screen.getByRole('button', { name: /Dispatch AI Nudge/i });
  fireEvent.click(nudgeBtn);
  expect(screen.getByText(/Nudge Dispatched/i)).toBeDefined();
});

it('renders BGOS Executive Command Center Dashboard with 5 KPIs, Business Growth spline, Donut breakdown, Upcoming Appointments, Activity feed, AI cockpit, Tasks, and 6 Quick Launchers', async () => {
  const { DashboardView } = await import('@/components/views/dashboard-view');

  render(<DashboardView />);

  // 1. Header greeting & store identity
  expect(screen.getByText(/Here's what's happening with your business today/i)).toBeDefined();
  expect(screen.getByText('Cinderella Cleaners')).toBeDefined();
  expect(screen.getByText('Tucson, Arizona')).toBeDefined();

  // 2. 5 Growth KPI Cards
  expect(screen.getByText('New Leads')).toBeDefined();
  expect(screen.getAllByText('124').length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText('Appointments').length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText('86').length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText('Phone Calls')).toBeDefined();
  expect(screen.getByText('312')).toBeDefined();
  expect(screen.getAllByText('Messages').length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText('1,248').length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText('Google Rating')).toBeDefined();
  expect(screen.getByText('4.8')).toBeDefined();
  expect(screen.getByText('326 reviews')).toBeDefined();

  // 3. Middle Row: Business Growth & Leads by Source
  expect(screen.getByText('Business Growth')).toBeDefined();
  expect(screen.getByText('Leads by Source')).toBeDefined();
  expect(screen.getAllByText('428').length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText('Total Leads')).toBeDefined();
  expect(screen.getAllByText('Website').length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText('Google Business').length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText('Social Media').length).toBeGreaterThanOrEqual(1);

  // 4. Upcoming Appointments
  expect(screen.getByText('Upcoming Appointments')).toBeDefined();
  expect(screen.getByText('Priya Singh')).toBeDefined();
  expect(screen.getByText('Office Deep Clean')).toBeDefined();
  expect(screen.getByText('Sneha Patel')).toBeDefined();

  // 5. Bottom Row: Recent Activity Feed & Filter Pills
  expect(screen.getByText('Recent Activity')).toBeDefined();
  expect(screen.getByRole('button', { name: 'All' })).toBeDefined();
  expect(screen.getAllByRole('button', { name: /Leads/i }).length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByRole('button', { name: /Appointments/i }).length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByRole('button', { name: /Calls/i }).length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText('Anita Desai')).toBeDefined();

  // 6. Your AI Assistant Cockpit
  expect(screen.getByText('Your AI Assistant')).toBeDefined();
  expect(screen.getByText('Online')).toBeDefined();
  expect(screen.getByRole('button', { name: 'Test AI' })).toBeDefined();
  expect(screen.getByRole('button', { name: /Train Knowledge/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /View Conversations/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /Configure Channels/i })).toBeDefined();

  // 7. Tasks & Follow-ups Checklist
  expect(screen.getByText('Tasks & Follow-ups')).toBeDefined();
  expect(screen.getByText('Call back Priya Singh')).toBeDefined();
  expect(screen.getByText('Follow up with Rahul Kumar')).toBeDefined();

  // Interactivity: Toggle a task checkbox
  const taskRow = screen.getByText('Call back Priya Singh');
  fireEvent.click(taskRow);

  // 8. Footer 6 Quick Action Launchers
  expect(screen.getByText('Create Campaign')).toBeDefined();
  expect(screen.getByText('Find New Leads')).toBeDefined();
  expect(screen.getByText('Build a Form')).toBeDefined();
  expect(screen.getByText('Create Funnel')).toBeDefined();
  expect(screen.getByText('Design a Post')).toBeDefined();
  expect(screen.getByText('Test Phone Agent')).toBeDefined();
});

it('renders Digital Presence Website Builder workstation with 3-column studio layout, live dual preview, section editor, and AI dock', async () => {
  const { CreatorProfileView } = await import('@/components/views/creator-profile-view');

  render(<CreatorProfileView />);

  // 1. Header controls
  expect(screen.getByText('Website Builder')).toBeDefined();
  expect(screen.getByText('Live Studio')).toBeDefined();
  expect(screen.getByRole('button', { name: /Preview/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /Save Changes/i })).toBeDefined();

  // 2. Navigation tabs
  expect(screen.getByRole('button', { name: /Design/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /Pages/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /Services & Products/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /SEO & Domain/i })).toBeDefined();

  // 3. Column 1: Website Sections & Page Settings
  expect(screen.getByText('Website Sections')).toBeDefined();
  expect(screen.getByText('Header & Navigation')).toBeDefined();
  expect(screen.getByText('Hero Banner')).toBeDefined();
  expect(screen.getByText('About Us')).toBeDefined();
  expect(screen.getByText('Why Choose Us')).toBeDefined();
  expect(screen.getByText('Page Settings')).toBeDefined();
  expect(screen.getByText('Page URL')).toBeDefined();
  expect(screen.getByText('SEO Preview')).toBeDefined();

  // 4. Column 2: Section Editor
  expect(screen.getByText(/Edit Section: Hero Banner/i)).toBeDefined();
  expect(screen.getByDisplayValue('A cleaner home. A brighter you.')).toBeDefined();
  expect(screen.getByDisplayValue('Book a Cleaning')).toBeDefined();
  expect(screen.getByDisplayValue('Get a Free Quote')).toBeDefined();
  expect(screen.getAllByText('Trusted & Verified').length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText('Flexible Scheduling').length).toBeGreaterThanOrEqual(1);

  // 5. Column 3: Live Preview & AI Assistant Dock
  expect(screen.getByText('Live Website Preview')).toBeDefined();
  expect(screen.getByRole('button', { name: /Desktop/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /Mobile/i })).toBeDefined();
  expect(screen.getAllByText('Cinderella Cleaners').length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText('AI Content Assistant')).toBeDefined();
  expect(screen.getByText('Generate Content')).toBeDefined();
  expect(screen.getByText('Improve SEO')).toBeDefined();
  expect(screen.getByText('Rewrite Copy')).toBeDefined();
});







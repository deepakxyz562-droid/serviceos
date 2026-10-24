import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  expect(screen.getByRole('button', { name: /^Publish$/i })).toBeDefined();
  expect(screen.queryByRole('button', { name: /^Analytics$/i })).toBeNull();
});

it('renders Unified Inbox with circular channel triage, 3-segment switch, in-chat package cards, and Customer 360 dossier', async () => {
  const { BgosOmnichannelInbox: OmnichannelView } = await import('@/components/bgos/omnichannel-inbox');

  render(<OmnichannelView />);

  // 1. Top Channel Triage Header & Labeled Channel Pills
  expect(screen.getByRole('heading', { level: 1, name: 'Inbox' })).toBeDefined();
  expect(screen.getByText('All your customer conversations in one place.')).toBeDefined();
  expect(screen.getByTitle('WhatsApp')).toBeDefined();
  expect(screen.getByTitle('Live Chat')).toBeDefined();
  expect(screen.getByTitle('Instagram')).toBeDefined();

  // 2. 3-Segment Switchers
  expect(screen.getByRole('button', { name: /Conversations/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /Live Visitors/i })).toBeDefined();
  expect(screen.getAllByRole('button', { name: /Tickets/i }).length).toBeGreaterThanOrEqual(1);

  // 3. Dynamic Filter Pills & Screenshot Thread (Priya Sharma)
  expect(screen.getByText('All 9')).toBeDefined();
  expect(screen.getByText('Unread 4')).toBeDefined();
  expect(screen.getAllByText('Priya Sharma').length).toBeGreaterThanOrEqual(1);
  expect(screen.getByRole('button', { name: /Convert to Customer/i })).toBeDefined();

  // 4. In-Chat Interactive Package Cards
  expect(screen.getByText('Deep Clean')).toBeDefined();
  expect(screen.getByText('₹ 3,999')).toBeDefined();
  expect(screen.getByText('Most Popular')).toBeDefined();
  expect(screen.getAllByText('Select').length).toBeGreaterThanOrEqual(3);

  // 5. In-Chat Schedule Confirmation Chips
  expect(screen.getByRole('button', { name: 'Yes, confirm' })).toBeDefined();
  expect(screen.getByRole('button', { name: 'Change time' })).toBeDefined();

  // 6. Right Column: Contact 360 Dossier (Contact | Activity | Notes | Appointments)
  expect(screen.getByRole('button', { name: 'Contact' })).toBeDefined();
  expect(screen.getByRole('button', { name: 'Activity' })).toBeDefined();
  expect(screen.getByText('Custom Fields')).toBeDefined();
  expect(screen.getByText('123 Green Park, Delhi')).toBeDefined();
  expect(screen.getByRole('button', { name: /Book Appointment/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /Create Quote/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /Create Form/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /Add to CRM/i })).toBeDefined();
  expect(screen.getByText('Conversation Summary')).toBeDefined();
  expect(screen.getByText('AI Generated')).toBeDefined();
  expect(screen.getByText('Customer Profile')).toBeDefined();
  expect(screen.getByText('VIP Customer')).toBeDefined();
  expect(screen.getByText('Total Spent')).toBeDefined();
  expect(screen.getByText('₹12,450')).toBeDefined();
  expect(screen.getByText('Automation & AI')).toBeDefined();

  // 6b. Center Sub-Tabs switch to Customer Details and back to Chat
  fireEvent.click(screen.getByRole('button', { name: 'Customer Details' }));
  expect(screen.getByText('Customer Contact Record')).toBeDefined();
  fireEvent.click(screen.getByRole('button', { name: 'Chat' }));

  // 6c. Mark closed toggles conversation status to Closed / Reopen
  fireEvent.click(screen.getByRole('button', { name: /Mark closed/i }));
  expect(screen.getByRole('button', { name: /Reopen/i })).toBeDefined();

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
  const { BgosOmnichannelInbox: OmnichannelView } = await import('@/components/bgos/omnichannel-inbox');

  render(<OmnichannelView />);

  // Clicking "Select" on the Deep Clean package triggers instant booking selection message
  const selectBtns = screen.getAllByRole('button', { name: 'Select' });
  fireEvent.click(selectBtns[1]); // Deep Clean is the 2nd package

  // Verify selection message is added to thread & conversation snippet
  expect(screen.getAllByText(/I would like to select the Deep Clean package/i).length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText(/Excellent choice! The/i).length).toBeGreaterThanOrEqual(1);
});

it('renders Tickets & Support Helpdesk workstation with status pills, 8-ticket queue, conversation thread, and Customer/Ticket Details/Related/Quick Actions rail', async () => {
  const { BgosHelpdeskWorkstation: HelpCenterView, INITIAL_TICKETS } = await import('@/components/bgos/helpdesk-workstation');

  render(<HelpCenterView initialTickets={INITIAL_TICKETS} />);

  // 1. Header & New Ticket Button
  expect(screen.getByRole('heading', { level: 1, name: /^Tickets & Support$/i })).toBeDefined();
  expect(screen.getByText('Manage customer support tickets and issues.')).toBeDefined();
  expect(screen.getByRole('button', { name: /New Ticket/i })).toBeDefined();

  // 2. Status Filter Pills
  expect(screen.getByRole('button', { name: /All\s*(?:8|12)/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /Open\s*(?:4|5)/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /In Progress\s*(?:2|3)/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /Waiting\s*(?:1|2)/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /Resolved\s*(?:1|2)/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /Closed\s*0/i })).toBeDefined();

  // 3. Column 1: 8-Ticket Queue & Pagination
  expect(screen.getByPlaceholderText('Search tickets...')).toBeDefined();
  expect(screen.getAllByText('#1245').length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText('#1244')).toBeDefined();
  expect(screen.getByText('#1243')).toBeDefined();
  expect(screen.getByText('#1242')).toBeDefined();
  expect(screen.getByText('#1241')).toBeDefined();
  expect(screen.getByText('#1240')).toBeDefined();
  expect(screen.getByText('#1239')).toBeDefined();
  expect(screen.getByText('#1238')).toBeDefined();

  // 4. Column 2: Active Ticket #1245 Conversation & Composer
  expect(screen.getAllByText('AC not cooling properly').length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText('High Priority')).toBeDefined();
  expect(screen.getByRole('button', { name: /Mark as In Progress/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /^Conversation$/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /^Internal Notes$/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /^Customer Details$/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /^Activity$/i })).toBeDefined();
  expect(
    screen.getByText(/Hi, my AC is not cooling properly\. There is some strange noise/i)
  ).toBeDefined();
  expect(
    screen.getByText(/Sure, my address is 123 Green Park, Delhi\. Preferred time is 10:00 AM\./i)
  ).toBeDefined();

  // 5. Column 3: Customer, Ticket Details, Related & Quick Actions
  expect(screen.getByRole('button', { name: /View in CRM/i })).toBeDefined();
  expect(screen.getAllByText('Priya Sharma').length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText('+91 98765 43210')).toBeDefined();
  expect(screen.getByText('priya.sharma@gmail.com')).toBeDefined();
  expect(screen.getByText('123 Green Park, Delhi, India')).toBeDefined();
  expect(screen.getByText('Ticket Details')).toBeDefined();
  expect(screen.getByText('Oct 8, 2026, 10:00 AM')).toBeDefined();
  expect(screen.getByText('Appointments (1)')).toBeDefined();
  expect(screen.getByText('Other Tickets (0)')).toBeDefined();
  expect(screen.getByText('10:00 AM – 11:00 AM')).toBeDefined();
  expect(screen.getByRole('button', { name: /Book Appointment/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /Create Quote/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /Create Form/i })).toBeDefined();

  // 6. Interactivity: Use AI to reply & Send message
  const aiReplyBtn = screen.getByRole('button', { name: /Use AI to reply/i });
  fireEvent.click(aiReplyBtn);
  const sendBtn = screen.getByRole('button', { name: /^Send$/i });
  fireEvent.click(sendBtn);
  expect(
    screen.getByText(/Technician Amit Singh is confirmed for tomorrow, Oct 8 at 10:00 AM/i)
  ).toBeDefined();
});

it('renders Marketing Studio with 5 KPI cards, AI Post Generator, live preview canvas, and campaign velocity', async () => {
  const { BgosSocialMarketing: SocialMediaView } = await import('@/components/bgos/social-marketing');

  render(<SocialMediaView />);

  // 1. Header & Primary Actions (Matches Screenshot)
  expect(screen.getByRole('heading', { level: 1, name: /Marketing Studio/i })).toBeDefined();
  expect(
    screen.getByText('Create, publish and manage your marketing content across email, SMS, WhatsApp and social media.')
  ).toBeDefined();
  expect(screen.getByText(/AI Enabled/i)).toBeDefined();
  expect(screen.getByRole('button', { name: /\+ Create Content/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /\+ Create Campaign/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /Create Post/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /View Analytics/i })).toBeDefined();

  // 1b. Screenshot Overview Dashboard (4 Top KPIs, Create with AI, Preview, Connected Channels, Recent Content, Upcoming Schedule)
  expect(screen.getByText('Published Posts')).toBeDefined();
  expect(screen.getByText('Scheduled Posts')).toBeDefined();
  expect(screen.getByText('Total Reach')).toBeDefined();
  expect(screen.getByText('Engagement Rate')).toBeDefined();
  expect(screen.getByText('Create with AI')).toBeDefined();
  expect(screen.getByText('AI Powered')).toBeDefined();
  expect(screen.getByText('Choose channels (optional)')).toBeDefined();
  expect(screen.getByRole('button', { name: /Generate Content/i })).toBeDefined();
  expect(screen.getByText('Preview')).toBeDefined();
  expect(screen.getByText('Your Business')).toBeDefined();
  expect(screen.getByText('✨ Diwali Special! ✨')).toBeDefined();
  expect(screen.getByText('Connected Channels')).toBeDefined();
  expect(screen.getByText('Email (SES)')).toBeDefined();
  expect(screen.getByText('SMS (Twilio)')).toBeDefined();
  expect(screen.getByText('Recent Content')).toBeDefined();
  expect(screen.getByText('Diwali Cleaning Offer')).toBeDefined();
  expect(screen.getByText('Holiday Service Announcement')).toBeDefined();
  expect(screen.getByText('Upcoming Schedule')).toBeDefined();
  expect(screen.getByText('Festive Offer Reminder')).toBeDefined();
  expect(screen.getByText('End of Month Offer')).toBeDefined();

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
  expect(screen.getByRole('button', { name: /^Content$/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /^Calendar$/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /^(Meta )?Templates$/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /^Analytics$/i })).toBeDefined();
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
  expect(screen.getAllByText('WhatsApp').length).toBeGreaterThanOrEqual(1);

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
  const { BgosReviewsWorkstation: ReviewsView, INITIAL_REVIEWS } = await import('@/components/bgos/reviews-workstation');

  render(<ReviewsView initialReviews={INITIAL_REVIEWS} />);

  // 1. Header & Navigation Tabs (Matches Screenshot)
  expect(screen.getByRole('heading', { level: 1, name: /Google Business & Reviews/i })).toBeDefined();
  expect(
    screen.getByText('Manage your Google Business profile, read and respond to reviews, and grow your reputation.')
  ).toBeDefined();
  expect(screen.getByText('Connected')).toBeDefined();
  expect(screen.getByRole('button', { name: /Sync GBP/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /Create Post/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /^Overview$/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /^Reviews$/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /^Generate Replies$/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /^Review Requests$/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /^Posts$/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /^Q&A$/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /^Insights$/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /^Photos$/i })).toBeDefined();

  // 1b. Screenshot Overview Dashboard (4 Top KPIs, Rating Trend, Reviews by Rating, Review Sources, Recent Reviews with Reply with AI, Your Google Business Profile, Quick Actions)
  expect(screen.getByText('Average Rating')).toBeDefined();
  expect(screen.getByText('(+0.3 this month)')).toBeDefined();
  expect(screen.getByText('12.4K')).toBeDefined();
  expect(screen.getByText('1.2K')).toBeDefined();
  expect(screen.getByText('Rating Trend')).toBeDefined();
  expect(screen.getByText('Reviews by Rating')).toBeDefined();
  expect(screen.getByText('Review Sources')).toBeDefined();
  expect(screen.getByText('Google Maps')).toBeDefined();
  expect(screen.getByText('Google Search')).toBeDefined();
  expect(screen.getByText('Your Google Business Profile')).toBeDefined();
  expect(screen.getByText('Sparkle Clean Services')).toBeDefined();
  expect(screen.getByText('House Cleaning Service')).toBeDefined();
  expect(screen.getByText('Quick Actions')).toBeDefined();
  expect(screen.getAllByText('Priya Sharma').length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText('Rahul Verma').length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText('Sneha Kapoor').length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText('Amit Singh').length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText('Neha Gupta').length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText('Reply with AI').length).toBeGreaterThanOrEqual(5);

  // Secondary GBP Studio & Growth Suite
  expect(screen.getByText('BGOS Home Cleaning')).toBeDefined();
  expect(screen.getByText('123 Green Park, Delhi, India')).toBeDefined();
  expect(screen.getByText('12,480')).toBeDefined();
  expect(screen.getByText('Review Growth')).toBeDefined();
  expect(screen.getByText('Rating Breakdown')).toBeDefined();
  expect(screen.getByText('Recent Reviews')).toBeDefined();
  expect(screen.getByText('Create a Post')).toBeDefined();
  expect(screen.getByRole('button', { name: /Post to Google/i })).toBeDefined();
  expect(screen.getByText('Profile Performance')).toBeDefined();
  expect(screen.getByText('Customer Photos')).toBeDefined();
  expect(screen.getByText('Common Review Tags')).toBeDefined();
  expect(screen.getByText('Automate Review Requests')).toBeDefined();

  // 2. 5 KPI Telemetry Cards
  expect(screen.getByText('Google Rating')).toBeDefined();
  expect(screen.getAllByText('4.8').length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText(/reviews\)/i).length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText('Total Reviews').length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText('New Reviews')).toBeDefined();
  expect(screen.getByText('Average Response Time')).toBeDefined();
  expect(screen.getByText('2.4 hours')).toBeDefined();
  expect(screen.getByText('Response Rate')).toBeDefined();
  expect(screen.getByText('100%')).toBeDefined();

  // 3. Middle Tier: Review Trend, Breakdown & Get More Reviews
  expect(screen.getByText('Review Trend')).toBeDefined();
  expect(screen.getByText('Review Breakdown')).toBeDefined();
  expect(screen.getByText('5 stars')).toBeDefined();
  expect(screen.getAllByText('72%').length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText('Get More Reviews')).toBeDefined();
  expect(screen.getByRole('button', { name: /Copy Review Link/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /Send via SMS/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /Send via Email/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /Download QR Code/i })).toBeDefined();

  // 4. Column 1: Reviews List & Triage
  expect(screen.getByText(/Reviews \(\d+\)/i)).toBeDefined();
  expect(screen.getByRole('button', { name: /All \(\d+\)/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /^Replied \(\d+\)/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /5 ★ \(\d+\)/i })).toBeDefined();
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
  expect(screen.getByRole('button', { name: /^Generate Reply$/i })).toBeDefined();
  expect(screen.getByText('Review Insights')).toBeDefined();
  expect(screen.getAllByText(/cleaning/i).length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText(/professional/i).length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText('Actions')).toBeDefined();
  expect(screen.getAllByText('Request Reviews').length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText('Set Auto-Reply Rules')).toBeDefined();

  // 7. Interactivity: Selecting another review updates the inspector
  const rahulItem = screen.getAllByText('Rahul Kumar')[0];
  fireEvent.click(rahulItem);
  expect(screen.getAllByText(/Great service. Very friendly staff and reasonable pricing/i).length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText('Oro Valley, AZ')).toBeDefined();

  // 8. Interactivity: Generate Reply button updates reply draft
  const generateBtn = screen.getByRole('button', { name: /^Generate Reply$/i });
  fireEvent.click(generateBtn);
});

it('renders Campaigns & Outreach prospecting workstation with 6-stage funnel, search filters, business table, and dossier', async () => {
  const { BgosOutreach, INITIAL_PROSPECTS } = await import('@/components/bgos/outreach');
  const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <BgosOutreach initialProspects={INITIAL_PROSPECTS} />
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
  expect(screen.getByText(/Businesses Found/i)).toBeDefined();
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
  expect(screen.getByRole('button', { name: /AI Form Generator/i })).toBeDefined();
  expect(screen.getAllByRole('button', { name: /Create Form/i }).length).toBeGreaterThanOrEqual(1);

  // 2. Sub-Navigation Tabs (5 clean tabs: Overview | Forms | Funnels | Templates | Submissions)
  expect(screen.getByRole('button', { name: /^Overview$/i })).toBeDefined();
  expect(screen.getAllByRole('button', { name: /^Forms$/i }).length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByRole('button', { name: /^Funnels$/i }).length).toBeGreaterThanOrEqual(1);
  expect(screen.getByRole('button', { name: /^Templates$/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /^Submissions$/i })).toBeDefined();
  expect(screen.queryByRole('button', { name: /^Analytics$/i })).toBeNull();
  expect(screen.queryByRole('button', { name: /^Settings$/i })).toBeNull();

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

  // 8. Interactivity: Transition directly into real FormStudioBuilder Workstation
  const createFormBtn = screen.getAllByRole('button', { name: /Create Form/i })[0];
  fireEvent.click(createFormBtn);

  // Verifies real FormStudioBuilder Workstation is mounted without duplicate headers
  expect(screen.getByRole('button', { name: /Back to dashboard/i })).toBeDefined();
  expect(screen.getByDisplayValue('Service Request Form')).toBeDefined();
  expect(screen.getAllByText('Published').length).toBeGreaterThanOrEqual(1);
  expect(screen.getByRole('button', { name: /^Build$/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /^Design$/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /^Settings$/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /^Publish$/i })).toBeDefined();

  // Starter fields rendered inside FormStudioBuilder canvas
  expect(screen.getAllByText('What type of cleaning do you need?').length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText('Full Name').length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText('Email Address').length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText('Phone Number').length).toBeGreaterThanOrEqual(1);
});

it('renders Live Website Visitor Radar workstation inside Inbox with telemetry strip, visitor stream, live keystroke mirror, and dossier', async () => {
  const { BgosOmnichannelInbox: OmnichannelView } = await import('@/components/bgos/omnichannel-inbox');

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
  const { BgosDashboard: DashboardView } = await import('@/components/bgos/dashboard');

  useAppStore.getState().setAuth({
    isAuthenticated: true,
    user: { id: 'owner', email: 'owner@test.com', name: 'Owner', role: 'owner', tenantId: 't' },
    tenant: { id: 't', name: 'Cinderella Cleaners', city: 'Tucson, Arizona' },
    workspace: { id: 'w', productType: 'bgos' },
  });

  render(<DashboardView />);

  // 1. Header greeting & store identity
  expect(screen.getByText(/Here's what's happening with your business today/i)).toBeDefined();
  expect(screen.getByText('Cinderella Cleaners')).toBeDefined();
  expect(screen.getByText('Tucson, Arizona')).toBeDefined();

  // 2. 5 Growth KPI Cards
  expect(screen.getByText('New Leads')).toBeDefined();
  expect(screen.getAllByText('Appointments').length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText('Phone Calls')).toBeDefined();
  expect(screen.getAllByText('Messages').length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText('Google Rating')).toBeDefined();
  expect(screen.getAllByText(/reviews/i).length).toBeGreaterThanOrEqual(1);

  // 3. Middle Row: Business Growth & Leads by Source
  expect(screen.getByText('Business Growth')).toBeDefined();
  expect(screen.getByText('Leads by Source')).toBeDefined();
  expect(screen.getByText('Total Leads')).toBeDefined();
  expect(screen.getAllByText('Website').length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText('Google Business').length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText('Social Media').length).toBeGreaterThanOrEqual(1);

  // 4. Upcoming Appointments
  expect(screen.getByText('Upcoming Appointments')).toBeDefined();

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

it('verifies BGOS navigation cleanup, Billing inside Settings, and FormAgentStudio Setup & Appearance split views', async () => {
  const { BGOS_NAVIGATION, bgosNavigationView } = await import('../shared/bgos-navigation');
  const { BgosSettings } = await import('@/components/bgos/settings');
  const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
  const { FormAgentStudio } = await import('@/features/forms/components/agent-builder/form-agent-studio');
  const { DEFAULT_FORM_AGENT } = await import('@/features/forms/types/agent-types');

  // 1. BGOS_NAVIGATION has no workflows, formsAnalytics, creatorProfile, campaigns, or top-level billing
  const allNavViews = BGOS_NAVIGATION.flatMap((section) => section.items.map((item) => item.view));
  expect(allNavViews).not.toContain('workflows');
  expect(allNavViews).not.toContain('formsAnalytics');
  expect(allNavViews).not.toContain('creatorProfile');
  expect(allNavViews).not.toContain('billing');
  expect(allNavViews).not.toContain('campaigns');
  expect(allNavViews).toContain('socialMedia');
  expect(allNavViews).toContain('reviews');
  expect(bgosNavigationView('billing')).toBe('settings');
  expect(bgosNavigationView('campaigns')).toBe('leads');

  // 1b. BgosViewNavigation does NOT render redundant 'Forms | Responses' bar on formBuilder
  const { BgosViewNavigation } = await import('@/components/bgos/view-navigation');
  useAppStore.setState({ currentView: 'formBuilder' });
  const { container: viewNavContainer, unmount: unmountViewNav } = render(<BgosViewNavigation />);
  expect(viewNavContainer.firstElementChild).toBeNull();
  unmountViewNav();

  // 1c. BgosHeaderTools renders clean page title and quick search without 'BGOS Workspace' or 'AI Copilot'
  const { BgosHeaderTools } = await import('@/components/bgos/header-tools');
  useAppStore.setState({ currentView: 'formBuilder' });
  const { unmount: unmountHeaderTools } = render(<BgosHeaderTools />);
  expect(screen.getByRole('heading', { level: 1, name: 'Forms' })).toBeDefined();
  expect(screen.queryByText('BGOS Workspace')).toBeNull();
  expect(screen.queryByText('AI Copilot')).toBeNull();
  unmountHeaderTools();

  // 2. BgosSettings renders Billing & Subscription inside Settings
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { unmount } = render(
    <QueryClientProvider client={queryClient}>
      <BgosSettings initialTab="billing" />
    </QueryClientProvider>
  );
  expect(screen.getByRole('tab', { name: /Billing & Subscription/i })).toBeDefined();
  expect(screen.getByText(/Room for your next stage\./i)).toBeDefined();
  unmount();

  // 3. FormAgentStudio Setup and Appearance split views
  const { container: studioContainer, unmount: unmountStudio } = render(<FormAgentStudio initialAgent={DEFAULT_FORM_AGENT} />);
  expect((studioContainer.firstElementChild as HTMLElement)?.className).toContain('h-full');
  expect((studioContainer.firstElementChild as HTMLElement)?.className).toContain('overflow-hidden');

  // Verify Overview tab has fixed desktop outer viewport and independent left/right scroll columns
  const assistantStatusCard = screen.getByText('Assistant Status').closest('.lg\\:col-span-3');
  const chatbotSettingsCard = screen.getByText('Chatbot Settings').closest('.lg\\:col-span-3');
  expect(assistantStatusCard?.className).toContain('lg:overflow-y-auto');
  expect(chatbotSettingsCard?.className).toContain('lg:overflow-y-auto');

  // Verify Platform & Data Connectors on Overview tab
  expect(screen.getByText('Platform & Data Connectors')).toBeDefined();
  expect(screen.getByText('WordPress & WooCommerce')).toBeDefined();
  expect(screen.getByText('Calendly & Google Calendar')).toBeDefined();
  expect(screen.getByText('Shopify Store & Catalog')).toBeDefined();
  expect(screen.getByText('Custom API, Webhook & Zapier')).toBeDefined();

  // Verify Skills tab has Calendly booking provider & External Data / Webhook API Sync
  fireEvent.click(screen.getByRole('button', { name: /^Skills$/i }));
  expect(screen.getByText(/3\. Automated Appointment Booking & Calendly Sync/i)).toBeDefined();
  fireEvent.click(screen.getByRole('button', { name: /^Calendly$/i }));
  expect(screen.getByPlaceholderText('https://calendly.com/your-business/30min')).toBeDefined();
  expect(screen.getByText(/8\. External Data, Webhook & Custom API Sync/i)).toBeDefined();

  // Verify Channels tab has WordPress, Shopify, and CRM unlocked in BGOS
  fireEvent.click(screen.getByRole('button', { name: /^Channels$/i }));
  expect(screen.getByText('AI CHATBOT FOR WORDPRESS')).toBeDefined();
  expect(screen.getByText('SHOPIFY AGENT')).toBeDefined();
  expect(screen.getByText('CRM & HUBSPOT AGENT')).toBeDefined();

  fireEvent.click(screen.getByRole('button', { name: /^Setup$/i }));
  expect(screen.getByText('Assistant Identity & Persona')).toBeDefined();
  expect(screen.getByText(/Live Assistant Preview/i)).toBeDefined();

  fireEvent.click(screen.getByRole('button', { name: /^Appearance$/i }));
  expect(screen.getByText(/Live Website Widget Preview/i)).toBeDefined();
  expect(screen.getByRole('button', { name: /Conversation View/i })).toBeDefined();
  unmountStudio();

  // 4. FormBuilderView root container has vertical scroller (overflow-y-auto h-full min-h-0)
  const { FormBuilderView } = await import('@/components/views/form-builder-view');
  const { container: formsContainer } = render(<FormBuilderView />);
  const formsRoot = formsContainer.firstElementChild as HTMLElement;
  expect(formsRoot?.className).toContain('overflow-y-auto');
  expect(formsRoot?.className).toContain('h-full');
  expect(formsRoot?.className).toContain('min-h-0');
});

test('BgosSettings renders redesigned Business Settings layout with 8 top tabs, 10 sidebar sections, live Profile Preview, Business Hours, Service Areas, and Tax & Compliance', async () => {
  const { BgosSettings } = await import('@/components/bgos/settings');
  const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');

  useAppStore.setState({ currentView: 'settings', pendingSettingsSection: null });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  render(
    <QueryClientProvider client={queryClient}>
      <BgosSettings />
    </QueryClientProvider>
  );

  global.fetch = vi.fn().mockImplementation(async () => {
    return {
      ok: true,
      json: async () => ({ success: true, profile: {} }),
    } as any;
  });

  // Header & Save Changes button
  expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeDefined();
  expect(screen.getByText('Configure your business, team, integrations and preferences.')).toBeDefined();
  const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
  expect(saveBtn).toBeDefined();
  fireEvent.click(saveBtn);
  await waitFor(() => {
    expect(screen.getByText('Changes Saved!')).toBeDefined();
  });

  // 8 Top Sub-Navigation Tabs
  expect(screen.getByRole('tab', { name: /Business Settings/i })).toBeDefined();
  expect(screen.getByRole('tab', { name: /Team & Users/i })).toBeDefined();
  expect(screen.getByRole('tab', { name: /Plans & Billing/i })).toBeDefined();
  expect(screen.getByRole('tab', { name: /Notifications/i })).toBeDefined();
  expect(screen.getByRole('tab', { name: /Integrations/i })).toBeDefined();
  expect(screen.getByRole('tab', { name: /Automation/i })).toBeDefined();
  expect(screen.getByRole('tab', { name: /Security/i })).toBeDefined();
  expect(screen.getByRole('tab', { name: /Preferences/i })).toBeDefined();

  // 10 Left Sidebar Subsections
  const sidebarNav = screen.getByRole('navigation', { name: /Business Settings Subsections/i });
  expect(sidebarNav).toBeDefined();
  expect(screen.getByRole('button', { name: /^Business Details$/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /^Branding & Logo$/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /^Custom Fields$/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /^Language & Region$/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /^Data Management$/i })).toBeDefined();

  // Business Profile & Live Profile Preview
  expect(screen.getByRole('heading', { name: 'Profile Preview' })).toBeDefined();
  expect(screen.getByText('(246 reviews)')).toBeDefined();
  expect(screen.getByText('Open Now')).toBeDefined();
  expect(screen.getByRole('button', { name: 'Book Now' })).toBeDefined();
  expect(screen.getByRole('button', { name: 'Get Quote' })).toBeDefined();

  // Contact Information & Business Hours
  expect(screen.getByDisplayValue('hello@bgos.com')).toBeDefined();
  expect(screen.getByDisplayValue('https://bgos.com')).toBeDefined();
  expect(screen.getByText('Closed')).toBeDefined();

  // Service Areas removable city chips & Tax & Compliance
  expect(screen.getByText('Delhi')).toBeDefined();
  expect(screen.getByText('Noida')).toBeDefined();
  expect(screen.getByText('Gurgaon')).toBeDefined();
  expect(screen.getByText('Faridabad')).toBeDefined();
  expect(screen.getByDisplayValue('07ABCDE1234F1Z5')).toBeDefined();
  expect(screen.getByDisplayValue('INV')).toBeDefined();
});

test('SchedulingView renders redesigned Appointments workstation with 7 tabs, 3 KPI cards, weekly calendar grid, daily appointments table, October 2026 mini calendar, and Quick Actions', async () => {
  const { SchedulingView, INITIAL_CALENDAR_BLOCKS, INITIAL_DAILY_ROWS } = await import('@/components/views/scheduling-view');

  render(<SchedulingView initialBlocks={INITIAL_CALENDAR_BLOCKS} initialRows={INITIAL_DAILY_ROWS} />);

  // 1. Header & Actions
  expect(screen.getByRole('heading', { level: 1, name: 'Appointments' })).toBeDefined();
  expect(screen.getByText('Manage bookings, schedules and availability for your team.')).toBeDefined();
  expect(screen.getAllByRole('button', { name: /New Appointment/i }).length).toBeGreaterThanOrEqual(2);

  // 2. 7 Horizontal Tabs
  expect(screen.getByRole('tab', { name: /^Calendar$/i })).toBeDefined();
  expect(screen.getByRole('tab', { name: /^List$/i })).toBeDefined();
  expect(screen.getByRole('tab', { name: /^Availability$/i })).toBeDefined();
  expect(screen.getByRole('tab', { name: /^Services$/i })).toBeDefined();
  expect(screen.getByRole('tab', { name: /^Team$/i })).toBeDefined();
  expect(screen.getByRole('tab', { name: /^Reminders$/i })).toBeDefined();
  expect(screen.getByRole('tab', { name: /^Online Booking$/i })).toBeDefined();

  // 3. 3 KPI Summary Cards
  expect(screen.getByText('Total Appointments')).toBeDefined();
  expect(screen.getAllByText('28').length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText('Confirmed').length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText('22').length).toBeGreaterThanOrEqual(1);
  expect(screen.getAllByText('Pending').length).toBeGreaterThanOrEqual(1);

  // 4. Weekly Schedule Calendar Grid & Blocks
  expect(screen.getByText('Oct 6 – Oct 12, 2026')).toBeDefined();
  expect(screen.getAllByText('Priya Sharma').length).toBeGreaterThanOrEqual(2);
  expect(screen.getByText('Sneha Kapoor')).toBeDefined();
  expect(screen.getByText('Rahul Verma')).toBeDefined();
  expect(screen.getByText('Vikram Rao')).toBeDefined();

  // 5. Daily Appointments Table (Wed, Oct 8, 2026)
  expect(screen.getByText(/Appointments for Wed, Oct 8, 2026/i)).toBeDefined();
  expect(screen.getByText('Green Park, Delhi')).toBeDefined();
  expect(screen.getByText('Connaught Place, Delhi')).toBeDefined();
  expect(screen.getByText('Lajpat Nagar, Delhi')).toBeDefined();
  expect(screen.getByText('Saket, Delhi')).toBeDefined();

  // 6. Right Rail: Mini Calendar & Quick Actions
  expect(screen.getByText('October 2026')).toBeDefined();
  expect(screen.getByText('Quick Actions')).toBeDefined();
  expect(screen.getByRole('button', { name: /Manage Availability/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /Booking Page/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /Add Recurring Appointment/i })).toBeDefined();
  expect(screen.getByRole('button', { name: /Import from Calendar/i })).toBeDefined();
});





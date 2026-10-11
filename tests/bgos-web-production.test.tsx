import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BgosHeaderTools } from '@/components/bgos/header-tools';
import { BgosDashboard } from '@/components/bgos/dashboard';
import { BgosOutreach } from '@/components/bgos/outreach';
import { ReviewsView } from '@/components/views/reviews-view';
import { useAppStore } from '@/store/app-store';
import { BgosAssistantOverview } from '@/components/bgos/assistant-overview';
import { DEFAULT_FORM_AGENT } from '@/features/forms/types/agent-types';
import { useBgosDocumentBrand } from '@/components/bgos/document-brand';

const mocks = vi.hoisted(() => ({ request: vi.fn(), leads: vi.fn() }));
vi.mock('@/lib/client-auth', () => ({ authFetch: mocks.request }));
vi.mock('@/lib/api', () => ({ authFetch: mocks.request }));
vi.mock('@/hooks/use-crm-data', () => ({ useLeads: mocks.leads }));
vi.mock('@/features/forms/components/agent-builder/agent-device-simulator', () => ({ AgentDeviceSimulator: () => <div>Test preview</div> }));

function mount(ui: React.ReactNode) {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{ui}</QueryClientProvider>);
}
beforeEach(() => {
  vi.clearAllMocks();
  useAppStore.getState().setAuth({ isAuthenticated: true, user: { id: 'u', role: 'owner', name: 'Owner' }, tenant: { id: 't', name: 'Example' }, workspace: { id: 'w', productType: 'bgos' } });
  useAppStore.setState({ aiDrawerOpen: false, currentView: 'dashboard' });
  mocks.leads.mockReturnValue({ data: { leads: [], pagination: { total: 0 } }, isPending: false, isError: false, refetch: vi.fn() });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('opens the real shared copilot and searches canonical pages', () => {
  render(<BgosHeaderTools />);
  fireEvent.click(screen.getByRole('button', { name: 'AI Copilot' }));
  expect(useAppStore.getState().aiDrawerOpen).toBe(true);
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Automations' } });
  fireEvent.click(screen.getByRole('button', { name: 'Automations' }));
  expect(useAppStore.getState().currentView).toBe('workflows');
});
it('keeps zero inbox counts zero instead of displaying sample activity', async () => {
  mocks.request.mockImplementation(async (url: string) => Response.json(url.includes('workspace') ? { name: 'Example', plan: { code: 'free', status: 'active' } } : []));
  mount(<BgosDashboard />);
  await screen.findByText('No conversations yet. Connect a channel to get started.');
  expect(screen.getByRole('button', { name: /Unread messages/ }).querySelector('strong')).toHaveTextContent(/^0$/);
  expect(screen.queryByText('126')).toBeNull();
  expect(screen.queryByText('48')).toBeNull();
});
it('distinguishes failed dashboard reads from empty business data', async () => {
  mocks.request.mockResolvedValue(new Response('{}', { status: 503 }));
  mount(<BgosDashboard />);
  await waitFor(() => expect(screen.getAllByRole('alert').length).toBeGreaterThan(0));
  expect(screen.queryByText('New customer messages will appear here.')).toBeNull();
});
it('shows unavailable channel status and binds appearance edits to the agent draft', () => {
  const change = vi.fn();
  render(<BgosAssistantOverview agent={DEFAULT_FORM_AGENT} onChange={change} onNavigateTab={vi.fn()} onOpenSettings={vi.fn()} onOpenForm={vi.fn()} businessName="Example" />);
  expect(screen.queryByText('Connected')).toBeNull();
  expect(screen.queryByText('248')).toBeNull();
  fireEvent.change(screen.getByLabelText('Assistant name'), { target: { value: 'Front desk' } });
  const update = change.mock.calls[0][0];
  expect(update(DEFAULT_FORM_AGENT).name).toBe('Front desk');
});
it('reports review read failures without inserting demonstration reviews', async () => {
  mocks.request.mockResolvedValue(new Response('{}', { status: 503 }));
  render(<ReviewsView />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Reviews could not be loaded');
  expect(screen.queryByText('Cinderella Cleaners')).toBeNull();
});
it('does not mark a failed batch approval as successful', async () => {
  mocks.request.mockImplementation(async (_url: string, options?: RequestInit) => options?.method === 'PATCH'
    ? Response.json({ error: 'Approval unavailable' }, { status: 503 })
    : Response.json({ batches: [{ id: 'b1', name: 'First outreach', status: 'pending_approval', totalRecipients: 1, sentCount: 0, failedCount: 0, messageContent: 'Hello', description: 'Subject' }] }));
  mount(<BgosOutreach />);
  fireEvent.click(await screen.findByRole('button', { name: 'Approve batch' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Approval unavailable');
  expect(screen.queryByText('Batch approved.')).toBeNull();
});
it('restores other product branding when leaving BGOS', () => {
  function Brand({ active }: { active: boolean }) { useBgosDocumentBrand(active); return null; }
  document.title = 'Other app';
  const link = document.createElement('link'); link.rel = 'manifest'; link.href = '/manifest.json'; document.head.appendChild(link);
  const view = render(<Brand active />);
  expect(document.title).toBe('BGOS — Business Growth OS');
  expect(link.getAttribute('href')).toBe('/bgos/manifest.webmanifest');
  view.rerender(<Brand active={false} />);
  expect(document.title).toBe('Other app');
  expect(link.getAttribute('href')).toBe('/manifest.json');
  link.remove();
});

it('does not insert sample forms into an empty workspace', async () => {
  mocks.request.mockImplementation(async () => Response.json({ forms: [] }));
  const { FormBuilderView } = await import('@/components/views/form-builder-view');
  mount(<FormBuilderView />);
  await screen.findByText('No forms yet. Create a form or choose a template to get started.');
  expect(screen.queryByText('Diwali Offer Landing Page')).toBeNull();
  expect(screen.queryByText('+20% vs last month')).toBeNull();
});
it('keeps failed form loads distinct from empty workspaces', async () => {
  mocks.request.mockImplementation(async () => Response.json({ error: 'Forms temporarily unavailable' }, { status: 503 }));
  const { FormBuilderView } = await import('@/components/views/form-builder-view');
  mount(<FormBuilderView />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Forms temporarily unavailable');
  expect(screen.queryByText('No forms yet. Create a form or choose a template to get started.')).toBeNull();
});

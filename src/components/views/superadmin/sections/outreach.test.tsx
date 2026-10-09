import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { OutreachSection } from './outreach';
const mocks = vi.hoisted(() => ({ fetch: vi.fn() }));
vi.mock('@/lib/client-auth', () => ({ authFetch: mocks.fetch }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const data = { items: [ { id: 't1', name: 'Alpha Company', email: 'alpha@example.com' }, { id: 't2', name: 'Beta Company', email: 'beta@example.com' } ], total: 2,
  state: { enabled: false, dailyLimit: 500 }, stats: { used: 0, queued: 0, sentTotal: 0 }, providers: [] };
beforeEach(() => { mocks.fetch.mockReset(); });
afterEach(cleanup);
it('keeps an older AI response from overwriting a newly selected recipient', async () => {
  let resolveDraft: (response: unknown) => void = () => {};
  mocks.fetch.mockImplementation((url: string) => url.includes('generate-email') ? new Promise(resolve => { resolveDraft = resolve; }) : Promise.resolve({ ok: true, json: async () => data }));
  render(<OutreachSection />);
  fireEvent.click(await screen.findByText('Alpha Company'));
  fireEvent.click(screen.getByText('Generate draft'));
  fireEvent.click(screen.getByText('Beta Company'));
  resolveDraft({ ok: true, json: async () => ({ subject: 'Alpha subject', body: 'Alpha body', source: 'ai' }) });
  await waitFor(() => expect(screen.getByLabelText('Recipient')).toHaveValue('beta@example.com'));
  expect(screen.getByLabelText('Subject')).toHaveValue('');
  expect(screen.getByLabelText('Message')).toHaveValue('');
});
it('queues the selected company with its edited draft without sending immediately', async () => {
  mocks.fetch.mockImplementation((url: string, options?: { method?: string }) => {
    if (url.includes('generate-email')) return Promise.resolve({ ok: true, json: async () => ({ subject: 'Scheduling question', body: 'Hi Alpha team', source: 'ai' }) });
    if (options?.method === 'POST') return Promise.resolve({ ok: true, json: async () => ({ queued: 1, results: [] }) });
    return Promise.resolve({ ok: true, json: async () => data });
  });
  render(<OutreachSection />); fireEvent.click(await screen.findByText('Alpha Company'));
  fireEvent.click(screen.getByText('Generate draft'));
  await waitFor(() => expect(screen.getByLabelText('Subject')).toHaveValue('Scheduling question'));
  fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'My edited message' } });
  fireEvent.click(screen.getByText('Add to queue'));
  await waitFor(() => expect(mocks.fetch).toHaveBeenCalledWith('/api/superadmin/outreach/automation', expect.objectContaining({ method: 'POST', body: JSON.stringify({ action: 'queue', tenantIds: ['t1'], draft: { subject: 'Scheduling question', body: 'My edited message' } }) })));
});

import React from 'react';
import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { resolveBlueprintCapabilities } from '../shared/blueprint/presets';

const mocks = vi.hoisted(() => ({ fetch: vi.fn(), navigate: vi.fn(), setBlueprint: vi.fn(), state: {} as any }));
vi.mock('@/lib/api', () => ({ authFetch: mocks.fetch }));
vi.mock('@/store/app-store', () => ({ useAppStore: () => mocks.state }));
vi.mock('@/components/onboarding/business-blueprint-wizard', () => ({ BusinessBlueprintWizard: () => null }));
import { BusinessHomeView } from '@/components/dashboard/business-home';

describe('merchant Home', () => {
  beforeEach(() => {
    cleanup(); vi.clearAllMocks();
    mocks.state = {
      blueprint: { businessType: 'grocery', country: 'IN', language: 'en', businessName: 'Sharma Shop', capabilities: resolveBlueprintCapabilities('grocery'), version: 1 },
      auth: { user: { id: 'owner-a' }, tenant: { id: 'tenant-a', name: 'Sharma Shop' } },
      setCurrentView: mocks.navigate, setBlueprint: mocks.setBlueprint,
    };
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ businessId: 'business-a', currency: 'INR', date: '2026-10-07', timezone: 'Asia/Kolkata', salesSource: 'orders', metrics: { sales: 250, balance: null, lowStock: 2 } })));
  });
  it('renders the kirana Home with honest missing totals and direct selling tasks', async () => {
    render(<BusinessHomeView />);
    await screen.findByText('₹250.00');
    expect(screen.getByRole('heading', { name: 'Sharma Shop' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Balance/ })).toHaveTextContent('—');
    expect(screen.queryByText('Ava')).not.toBeInTheDocument();
    expect(screen.queryByText('Quick Shortcuts')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add Product' }));
    expect(mocks.navigate).toHaveBeenCalledWith('commerce');
    expect(sessionStorage.getItem('nuvora_commerce_tab')).toBe('catalog');
  });
  it('uses Hindi labels on the same Home without changing the currency', async () => {
    mocks.state.blueprint.language = 'hi';
    render(<BusinessHomeView />);
    await screen.findByText('₹250.00');
    expect(screen.getByText('लेना है')).toBeInTheDocument();
    expect(screen.getByText('देना है')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'सामान जोड़ें' })).toBeInTheDocument();
  });
  it('shows an actionable setup state for a new business', async () => {
    mocks.fetch.mockResolvedValue(new Response('{}', { status: 404 }));
    render(<BusinessHomeView />);
    await screen.findByText('Finish your business setup to see your Home.');
    expect(screen.getByText('Business setup', { selector: 'button' })).toBeInTheDocument();
  });
  it('does not turn request failures into zero-valued sales', async () => {
    mocks.fetch.mockRejectedValue(new Error('Offline'));
    render(<BusinessHomeView />);
    await screen.findByRole('alert');
    expect(screen.queryByText('₹0.00')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Try again', { selector: 'button' }));
    await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(2));
  });
});

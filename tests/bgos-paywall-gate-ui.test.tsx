import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  billingState: {
    data: null as any,
    loading: false,
    error: null as string | null,
    refresh: vi.fn(),
    setData: vi.fn(),
  },
  authState: {
    user: { id: 'u_biz', email: 'deepakchandra076@gmail.com', tenantId: 't_biz' },
    logout: vi.fn(),
  },
}));

vi.mock('../bgosmobile/src/hooks/use-resource', () => ({
  useResource: vi.fn(() => mocks.billingState),
}));

vi.mock('../bgosmobile/src/stores/auth-store', () => ({
  useAuthStore: (selector?: (s: typeof mocks.authState) => unknown) =>
    selector ? selector(mocks.authState) : mocks.authState,
}));

vi.mock('../bgosmobile/src/components/ui', () => ({
  Brand: () => React.createElement('div', { 'data-testid': 'brand' }, 'BGOS'),
  colors: {
    brand: '#009F50',
    muted: '#60758A',
  },
}));

vi.mock('expo-web-browser', () => ({
  openBrowserAsync: vi.fn(),
  WebBrowserPresentationStyle: { PAGE_SHEET: 'pageSheet' },
}));

import { PaywallGate } from '../bgosmobile/src/components/billing/paywall-gate';

describe('bgosmobile PaywallGate verification & paywall state safety', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.billingState.data = null;
    mocks.billingState.loading = false;
    mocks.billingState.error = null;
    mocks.billingState.refresh = vi.fn();
    mocks.authState.user = {
      id: 'u_biz',
      email: 'deepakchandra076@gmail.com',
      tenantId: 't_biz',
    };
    mocks.authState.logout = vi.fn();
  });

  it('renders protected children when backend entitlement is active', () => {
    mocks.billingState.data = {
      subscription: { plan: 'business', status: 'active' },
      entitlement: {
        entitled: true,
        isTrial: false,
        isPaid: true,
        trialExpired: false,
        trialDaysLeft: 0,
        status: 'active',
        plan: 'business',
      },
      defaultRegion: 'india',
    };

    render(
      <PaywallGate>
        <div data-testid="protected-app">Business Dashboard</div>
      </PaywallGate>,
    );

    expect(screen.getByTestId('protected-app')).toBeTruthy();
    expect(screen.queryByText(/Complete Payment to Continue/i)).toBeNull();
  });

  it('never shows Complete Payment to Continue when /api/bgos/billing fails with an error and shows Retry + email', () => {
    mocks.billingState.data = null;
    mocks.billingState.loading = false;
    mocks.billingState.error = 'Billing service temporarily unavailable. Please retry.';

    render(
      <PaywallGate>
        <div data-testid="protected-app">Business Dashboard</div>
      </PaywallGate>,
    );

    expect(screen.queryByText(/Complete Payment to Continue/i)).toBeNull();
    expect(screen.getByText(/Could not verify subscription/i)).toBeTruthy();
    expect(screen.getByText(/Billing service temporarily unavailable/i)).toBeTruthy();
    expect(screen.getByText(/Signed in as: deepakchandra076@gmail\.com/i)).toBeTruthy();

    fireEvent.click(screen.getByText(/Retry Verification/i));
    expect(mocks.billingState.refresh).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByText(/Sign Out \/ Switch Account/i));
    expect(mocks.authState.logout).toHaveBeenCalledOnce();
  });

  it('shows Complete Payment to Continue along with signed-in email only when backend confirms trial expired', () => {
    mocks.billingState.data = {
      subscription: { plan: 'starter', status: 'expired' },
      entitlement: {
        entitled: false,
        isTrial: false,
        isPaid: false,
        trialExpired: true,
        trialDaysLeft: 0,
        status: 'expired',
        plan: 'starter',
      },
      defaultRegion: 'india',
      gateways: { razorpay: true, creem: true },
    };
    mocks.authState.user.email = 'deepakxyz7890@gmail.com';

    render(
      <PaywallGate>
        <div data-testid="protected-app">Business Dashboard</div>
      </PaywallGate>,
    );

    expect(screen.queryByTestId('protected-app')).toBeNull();
    expect(screen.getByText(/Complete Payment to Continue/i)).toBeTruthy();
    expect(screen.getByText(/Signed in as: deepakxyz7890@gmail\.com/i)).toBeTruthy();
  });
});

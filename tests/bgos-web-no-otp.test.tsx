import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

const productState = vi.hoisted(() => ({
  product: 'bgos' as 'bgos' | 'crm',
}));

vi.mock('firebase/auth', () => ({
  RecaptchaVerifier: vi.fn(),
  signInWithPhoneNumber: vi.fn(),
}));

vi.mock('@/lib/firebase-web', () => ({
  getFirebaseWebAuth: vi.fn(() => ({})),
  getFirebaseErrorCode: vi.fn(() => ''),
  mapFirebasePhoneError: vi.fn(() => 'Error'),
}));

vi.mock('@/components/bgos/brand', () => ({
  BgosBrand: () => React.createElement('div', { 'data-testid': 'bgos-brand' }, 'BGOS'),
}));

vi.mock('@/components/bgos/document-brand', () => ({
  useBgosDocumentBrand: vi.fn(),
}));

vi.mock('../shared/product-context', () => ({
  getAppProduct: () => productState.product,
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: (_, tag: string) =>
        ({ children, ...props }: any) =>
          React.createElement(tag, props, children),
    },
  ),
  AnimatePresence: ({ children }: any) => React.createElement(React.Fragment, null, children),
}));

import { AuthPage } from '@/components/auth/auth-page';

describe('BGOS Web AuthPage OTP Removal', () => {
  afterEach(cleanup);

  it('hides Mobile OTP login toggle on BGOS web login', () => {
    productState.product = 'bgos';
    render(<AuthPage onAuthSuccess={vi.fn()} initialTab="login" />);

    expect(screen.queryByRole('button', { name: /Mobile OTP/i })).toBeNull();
    expect(screen.getByLabelText(/Email/i)).toBeTruthy();
    expect(screen.getByLabelText(/Password/i)).toBeTruthy();
  });

  it('keeps Mobile OTP login toggle available on non-BGOS CRM web login', () => {
    productState.product = 'crm';
    render(<AuthPage onAuthSuccess={vi.fn()} initialTab="login" />);

    expect(screen.getByRole('button', { name: /Mobile OTP/i })).toBeTruthy();
  });

  it('hides Mobile OTP login toggle when ?product=bgos is present in URL', () => {
    productState.product = 'crm';
    const originalUrl = window.location.href;
    window.history.replaceState({}, '', '/?auth=login&product=bgos');
    render(<AuthPage onAuthSuccess={vi.fn()} initialTab="login" />);

    expect(screen.queryByRole('button', { name: /Mobile OTP/i })).toBeNull();
    window.history.replaceState({}, '', originalUrl);
  });
});

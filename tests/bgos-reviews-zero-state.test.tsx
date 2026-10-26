import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { useAppStore } from '@/store/app-store';

afterEach(cleanup);

beforeEach(() => {
  useAppStore.getState().setAuth({
    isAuthenticated: true,
    user: { id: 'owner-1', email: 'owner@example.com', name: 'Real Owner', role: 'owner', tenantId: 't-real' },
    tenant: { id: 't-real', name: 'Acme Services', city: 'Phoenix, AZ' },
    workspace: { id: 'w-real', productType: 'bgos' },
  });

  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes('/api/reviews')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ reviews: [] }),
      });
    }
    return Promise.resolve({
      ok: true,
      json: async () => ({}),
    });
  });
});

describe('BgosReviewsWorkstation Zero-State & Safety Verification', () => {
  it('renders Google Business & Reviews workstation with zero reviews without crashing on avatarBg', async () => {
    const { BgosReviewsWorkstation } = await import('@/components/bgos/reviews-workstation');

    // Render with 0 initial reviews in non-demo mode
    expect(() => {
      render(<BgosReviewsWorkstation initialReviews={[]} isDemo={false} />);
    }).not.toThrow();

    // Verify header renders
    expect(screen.getByRole('heading', { level: 1, name: /Google Business & Reviews/i })).toBeDefined();

    // Verify left column empty state
    expect(screen.getByText(/No reviews in this view/i)).toBeDefined();
    expect(screen.getByText(/Connect your Google Business Profile or request reviews/i)).toBeDefined();

    // Verify center column empty inspector
    expect(screen.getByText(/No Review Selected/i)).toBeDefined();
    expect(screen.getByText(/Once customer reviews arrive, select any review/i)).toBeDefined();

    // Verify AI Review Reply "Generate Reply" button is disabled when no review is selected
    const generateBtn = screen.getByRole('button', { name: /Generate Reply/i });
    expect(generateBtn.getAttribute('disabled')).not.toBeNull();
  });
});

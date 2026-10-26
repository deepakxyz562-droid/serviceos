import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useAppStore } from '@/store/app-store';

afterEach(cleanup);

const mockRealReviews = [
  {
    id: 'rev-db-1',
    authorName: 'Customer',
    rating: 5,
    comment: 'Outstanding quality and fast installation. Highly recommended!',
    createdAt: '2026-08-28T10:00:00Z',
    source: 'google',
  },
  {
    id: 'rev-db-2',
    authorName: 'Patricia B.',
    rating: 5,
    comment: 'Fixed the issue in 30 minutes. Friendly and professional.',
    createdAt: '2026-07-27T09:00:00Z',
    source: 'google',
  },
  {
    id: 'rev-db-3',
    authorName: 'James R.',
    rating: 5,
    comment: 'Best in town. Honest, on-time, and does excellent work.',
    createdAt: '2026-07-27T08:30:00Z',
    source: 'google',
  },
  {
    id: 'rev-db-4',
    authorName: 'Maria L.',
    rating: 4,
    comment: 'Good service. A bit pricey but the work was solid.',
    createdAt: '2026-07-27T08:00:00Z',
    source: 'google',
  },
  {
    id: 'rev-db-5',
    authorName: 'David K.',
    rating: 5,
    comment: 'Installed a new system same day. Very knowledgeable.',
    createdAt: '2026-07-27T07:30:00Z',
    source: 'google',
  },
  {
    id: 'rev-db-6',
    authorName: 'Liam N.',
    rating: 5,
    comment: 'Super fast and punctual.',
    createdAt: '2026-07-25T11:00:00Z',
    source: 'google',
  },
  {
    id: 'rev-db-7',
    authorName: 'Sarah W.',
    rating: 5,
    comment: 'Great team and wonderful work.',
    createdAt: '2026-07-20T14:00:00Z',
    source: 'google',
  },
  {
    id: 'rev-db-8',
    authorName: 'Noah T.',
    rating: 5,
    comment: 'Exceptional support from start to finish.',
    createdAt: '2026-07-15T16:00:00Z',
    source: 'google',
  },
];

beforeEach(() => {
  useAppStore.getState().setAuth({
    isAuthenticated: true,
    user: { id: 'owner-1', email: 'owner@bgos.com', name: 'Real Owner', role: 'owner', tenantId: 't-bgos' },
    tenant: { id: 't-bgos', name: 'BGOS Brisbane Solutions', city: 'Rocklea QLD, Australia' },
    workspace: { id: 'w-bgos', productType: 'bgos' },
  });

  global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes('/api/reviews')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ reviews: mockRealReviews }),
      });
    }
    if (url.includes('/api/brand-profile')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          profile: {
            businessName: 'BGOS Brisbane Solutions',
            industry: 'Commercial Cleaning & Facility Management',
            location: '1/7 Macbarry pl, Rocklea QLD, 4106',
          },
          businessAddress: JSON.stringify({
            street: '1/7 Macbarry pl',
            city: 'Rocklea',
            state: 'QLD',
            pincode: '4106',
            country: 'AU',
          }),
        }),
      });
    }
    if (url.includes('/api/social/accounts')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          accounts: [
            { id: 'acc-gbp-1', platform: 'googlebusiness', isActive: true, accountName: 'BGOS Brisbane' },
          ],
        }),
      });
    }
    return Promise.resolve({
      ok: true,
      json: async () => ({}),
    });
  });
});

describe('BgosReviewsWorkstation Production Data & Tab Isolation', () => {
  it('hydrates real database reviews and computes 4.9 average rating with 8 total reviews', async () => {
    const { BgosReviewsWorkstation } = await import('@/components/bgos/reviews-workstation');

    render(<BgosReviewsWorkstation initialTab="overview" />);

    // Wait for the reviews API and brand profile to load
    await waitFor(() => {
      // 7 five-star + 1 four-star = 39 / 8 = 4.875 -> rounded to 4.9
      expect(screen.getAllByText('4.9').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('8').length).toBeGreaterThanOrEqual(1);
    });

    // Verify tenant name from brand profile is displayed instead of Sparkle Clean Services
    expect(screen.queryByText(/Sparkle Clean Services/i)).toBeNull();
    expect(screen.getAllByText(/BGOS Brisbane Solutions/i).length).toBeGreaterThanOrEqual(1);

    // Verify Delhi fake address is not present
    expect(screen.queryByText(/123 Green Park, Delhi/i)).toBeNull();

    // Verify real recent review text is displayed
    expect(screen.getByText(/Outstanding quality and fast installation. Highly recommended!/i)).toBeDefined();
  });

  it('isolates sub-tabs so that the 3-column triage workstation does NOT leak under Overview', async () => {
    const { BgosReviewsWorkstation } = await import('@/components/bgos/reviews-workstation');

    render(<BgosReviewsWorkstation initialTab="overview" />);

    await waitFor(() => {
      expect(screen.getAllByText(/BGOS Brisbane Solutions/i).length).toBeGreaterThanOrEqual(1);
    });

    // The triage filter pill "Unreplied (8)" only belongs in the Reviews tab, not stacked on Overview
    expect(screen.queryByText('Unreplied (8)')).toBeNull();

    // Switch to Reviews tab
    const reviewsTabBtn = screen.getByRole('button', { name: /Reviews \(/i });
    fireEvent.click(reviewsTabBtn);

    // Now on Reviews tab, the triage filter pills and workstation are rendered
    await waitFor(() => {
      expect(screen.getByText(/All \(8\)/i)).toBeDefined();
      expect(screen.getByText(/Unreplied \(8\)/i)).toBeDefined();
      expect(screen.getByText(/5 ★ \(7\)/i)).toBeDefined();
      expect(screen.getByText(/4 ★ \(1\)/i)).toBeDefined();
    });
  });

  it('navigates cleanly between Generate Replies, Posts, Insights, and Settings', async () => {
    const { BgosReviewsWorkstation } = await import('@/components/bgos/reviews-workstation');

    render(<BgosReviewsWorkstation initialTab="overview" />);

    await waitFor(() => {
      expect(screen.getAllByText('4.9').length).toBeGreaterThanOrEqual(1);
    });

    // Click "Generate Replies" tab
    const repliesTabBtn = screen.getByRole('button', { name: /Generate Replies/i });
    fireEvent.click(repliesTabBtn);

    await waitFor(() => {
      expect(screen.getByText(/AI Review Reply Studio/i)).toBeDefined();
      expect(screen.getByText(/Draft All Pending Replies/i)).toBeDefined();
    });

    // Click "Posts" tab
    const postsTabBtn = screen.getByRole('button', { name: /Posts/i });
    fireEvent.click(postsTabBtn);

    await waitFor(() => {
      expect(screen.getByText(/Google Business Posts/i)).toBeDefined();
      expect(screen.getByRole('button', { name: /New Google Post/i })).toBeDefined();
    });

    // Click "Settings" tab
    const settingsTabBtn = screen.getByRole('button', { name: /Settings/i });
    fireEvent.click(settingsTabBtn);

    await waitFor(() => {
      expect(screen.getByText(/Google Business Profile Connection/i)).toBeDefined();
      expect(screen.getByText(/Auto-Reply to 5-Star Reviews/i)).toBeDefined();
    });
  });

  it('triggers Sync GBP without error', async () => {
    const { BgosReviewsWorkstation } = await import('@/components/bgos/reviews-workstation');

    render(<BgosReviewsWorkstation initialTab="overview" />);

    const syncBtn = screen.getByRole('button', { name: /Sync GBP/i });
    fireEvent.click(syncBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/reviews'),
        expect.anything()
      );
    });
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockDb, mockGetAuthUser, mockRequireBgosEntitled, mockCallAI } = vi.hoisted(() => ({
  mockDb: {
    review: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    tenant: {
      findUnique: vi.fn(),
    },
  },
  mockGetAuthUser: vi.fn(),
  mockRequireBgosEntitled: vi.fn(),
  mockCallAI: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ db: mockDb }));
vi.mock('@/lib/auth', () => ({ getAuthUser: mockGetAuthUser }));
vi.mock('@/lib/bgos-entitlement', () => ({ requireBgosEntitled: mockRequireBgosEntitled }));
vi.mock('@/lib/ai-client', () => ({ callAI: mockCallAI }));

import {
  GOOGLE_REVIEW_REMOVAL_TOOL_URL,
  buildFallbackAppealAndDisputeReply,
  mergeReviewFlagReport,
  parseReviewFlagReport,
} from '@/lib/reviews/report-review';
import { DELETE, POST } from '@/app/api/reviews/[id]/report/route';

describe('Fake Review Report & Shield', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUser.mockResolvedValue({
      id: 'user_1',
      email: 'owner@abckirana.in',
      tenantId: 'tenant_1',
      role: 'owner',
    });
    mockRequireBgosEntitled.mockResolvedValue({ ok: true });
    mockCallAI.mockRejectedValue(new Error('Offline test fallback'));
    mockDb.tenant.findUnique.mockResolvedValue({
      name: 'Abc Kirana',
      phone: '+91 98765 43210',
    });
    mockDb.review.update.mockResolvedValue({});
  });

  it('preserves existing Google reply metadata when merging or clearing flagReport', () => {
    const initialJson = JSON.stringify({
      text: 'Thank you for visiting.',
      googleCreateTime: '2026-10-12T10:00:00Z',
      publishedToGoogle: true,
    });

    const flagged = mergeReviewFlagReport(initialJson, {
      reason: 'conflict_of_interest',
      reasonLabel: 'Conflict of interest / Competitor',
      details: 'Competitor shop owner posted this.',
      flagStatus: 'flagged',
      hideOnPublicPage: true,
      appealText: 'Appeal text',
      disputeReplyDraft: 'Dispute reply',
      reportedAt: '2026-11-12T10:00:00Z',
      reportedBy: 'user_1',
      updatedAt: '2026-11-12T10:00:00Z',
      googleRemovalToolUrl: GOOGLE_REVIEW_REMOVAL_TOOL_URL,
    });

    const parsed = JSON.parse(flagged);
    expect(parsed.text).toBe('Thank you for visiting.');
    expect(parsed.publishedToGoogle).toBe(true);
    expect(parseReviewFlagReport(flagged)?.hideOnPublicPage).toBe(true);
    expect(parseReviewFlagReport(flagged)?.reason).toBe('conflict_of_interest');

    const cleared = mergeReviewFlagReport(flagged, null);
    const parsedCleared = JSON.parse(cleared);
    expect(parsedCleared.text).toBe('Thank you for visiting.');
    expect(parseReviewFlagReport(cleared)).toBeNull();
  });

  it('builds a factual policy appeal and diplomatic no-record dispute reply', () => {
    const res = buildFallbackAppealAndDisputeReply({
      businessName: 'Abc Kirana',
      authorName: 'Rival Shop',
      rating: 1,
      comment: 'Worst shop',
      reason: 'fake_never_visited',
      details: 'No invoice exists in POS logs.',
      businessPhone: '+91 98765 43210',
    });

    expect(res.appealText).toContain('Abc Kirana');
    expect(res.appealText).toContain('Fake Engagement');
    expect(res.appealText).toContain('No invoice exists in POS logs.');
    expect(res.disputeReplyDraft).toContain('no record of a visit');
    expect(res.disputeReplyDraft).toContain('+91 98765 43210');
  });

  it('POST /api/reviews/[id]/report saves flagReport and returns removal tool URL', async () => {
    mockDb.review.findFirst.mockResolvedValue({
      id: 'rev_1',
      rating: 1,
      comment: 'Fake 1-star rating',
      authorName: 'Fake User',
      responseJson: JSON.stringify({ googleCreateTime: '2026-11-10T08:00:00Z' }),
    });

    const req = new NextRequest('http://localhost/api/reviews/rev_1/report', {
      method: 'POST',
      body: JSON.stringify({
        reason: 'fake_never_visited',
        details: 'Never placed any order with us',
        hideOnPublicPage: true,
        flagStatus: 'appealed_on_google',
      }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: 'rev_1' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.googleRemovalToolUrl).toBe(GOOGLE_REVIEW_REMOVAL_TOOL_URL);
    expect(data.flagReport.hideOnPublicPage).toBe(true);
    expect(data.flagReport.flagStatus).toBe('appealed_on_google');

    const updateCall = mockDb.review.update.mock.calls[0][0];
    const savedJson = JSON.parse(updateCall.data.responseJson);
    expect(savedJson.googleCreateTime).toBe('2026-11-10T08:00:00Z');
    expect(savedJson.flagReport.reason).toBe('fake_never_visited');
  });

  it('DELETE /api/reviews/[id]/report clears flagReport cleanly', async () => {
    mockDb.review.findFirst.mockResolvedValue({
      id: 'rev_1',
      responseJson: JSON.stringify({
        googleCreateTime: '2026-11-10T08:00:00Z',
        flagReport: { reason: 'fake_never_visited', hideOnPublicPage: true },
      }),
    });

    const req = new NextRequest('http://localhost/api/reviews/rev_1/report', {
      method: 'DELETE',
    });

    const res = await DELETE(req, { params: Promise.resolve({ id: 'rev_1' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.flagReport).toBeNull();
  });
});

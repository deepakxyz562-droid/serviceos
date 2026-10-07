import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sessionDb } = vi.hoisted(() => ({
  sessionDb: {
    create: vi.fn(),
    findUnique: vi.fn(),
    updateMany: vi.fn(),
  },
}));

vi.mock('@/lib/db', () => ({ db: { authRefreshSession: sessionDb } }));

import {
  hashRefreshToken,
  issueRefreshSession,
  rotateRefreshSession,
} from '@/lib/auth-refresh-session';

describe('auth refresh sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionDb.create.mockResolvedValue({});
    sessionDb.updateMany.mockResolvedValue({ count: 1 });
  });

  it('stores a hash rather than the raw refresh token', async () => {
    const issued = await issueRefreshSession({ type: 'user', id: 'user-1' });
    const data = sessionDb.create.mock.calls[0][0].data;

    expect(issued.token.length).toBeGreaterThan(32);
    expect(data.tokenHash).toBe(hashRefreshToken(issued.token));
    expect(data.tokenHash).not.toContain(issued.token);
  });

  it('rotates an active token and preserves its family', async () => {
    sessionDb.findUnique.mockResolvedValue({
      id: 'session-1',
      familyId: 'family-1',
      subjectType: 'user',
      subjectId: 'user-1',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      userAgent: null,
      ipAddress: null,
    });

    const result = await rotateRefreshSession('a'.repeat(48));
    expect(result.status).toBe('rotated');
    if (result.status === 'rotated') {
      expect(result.subject).toEqual({ type: 'user', id: 'user-1' });
      expect(result.session.familyId).toBe('family-1');
    }
    expect(sessionDb.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'session-1', revokedAt: null },
    }));
  });

  it('revokes a token family when an already-used token is replayed', async () => {
    sessionDb.findUnique.mockResolvedValue({
      id: 'session-1',
      familyId: 'family-1',
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
    });

    await expect(rotateRefreshSession('b'.repeat(48))).resolves.toEqual({ status: 'reused' });
    expect(sessionDb.updateMany).toHaveBeenCalledWith({
      where: { familyId: 'family-1', revokedAt: null },
      data: expect.objectContaining({ revokeReason: 'refresh_token_reuse' }),
    });
  });
});

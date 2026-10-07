import { createHash, randomBytes, randomUUID } from 'crypto';

import { db } from '@/lib/db';

const REFRESH_TOKEN_BYTES = 48;
export const REFRESH_SESSION_MAX_MS = 90 * 24 * 60 * 60 * 1000;

export type RefreshSubjectType = 'user' | 'customer';

export interface RefreshSubject {
  type: RefreshSubjectType;
  id: string;
}

export interface RefreshSessionMetadata {
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface IssuedRefreshSession {
  token: string;
  expiresAt: Date;
  familyId: string;
}

export type RotateRefreshResult =
  | { status: 'rotated'; subject: RefreshSubject; session: IssuedRefreshSession }
  | { status: 'invalid' | 'expired' | 'reused' };

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function generateRefreshToken(): string {
  return randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
}

export async function issueRefreshSession(
  subject: RefreshSubject,
  metadata: RefreshSessionMetadata = {},
  familyId = randomUUID(),
): Promise<IssuedRefreshSession> {
  const token = generateRefreshToken();
  const expiresAt = new Date(Date.now() + REFRESH_SESSION_MAX_MS);

  await db.authRefreshSession.create({
    data: {
      familyId,
      subjectType: subject.type,
      subjectId: subject.id,
      tokenHash: hashRefreshToken(token),
      expiresAt,
      userAgent: metadata.userAgent?.slice(0, 500) || null,
      ipAddress: metadata.ipAddress?.slice(0, 100) || null,
    },
  });

  return { token, expiresAt, familyId };
}

export async function rotateRefreshSession(
  token: string,
  metadata: RefreshSessionMetadata = {},
): Promise<RotateRefreshResult> {
  if (!token || token.length < 32) return { status: 'invalid' };

  const tokenHash = hashRefreshToken(token);
  const current = await db.authRefreshSession.findUnique({ where: { tokenHash } });
  if (!current) return { status: 'invalid' };

  if (current.revokedAt) {
    await db.authRefreshSession.updateMany({
      where: { familyId: current.familyId, revokedAt: null },
      data: { revokedAt: new Date(), revokeReason: 'refresh_token_reuse' },
    });
    return { status: 'reused' };
  }

  if (new Date(current.expiresAt).getTime() <= Date.now()) {
    await db.authRefreshSession.updateMany({
      where: { id: current.id, revokedAt: null },
      data: { revokedAt: new Date(), revokeReason: 'expired' },
    });
    return { status: 'expired' };
  }

  const nextToken = generateRefreshToken();
  const nextHash = hashRefreshToken(nextToken);
  const rotatedAt = new Date();
  const claimed = await db.authRefreshSession.updateMany({
    where: { id: current.id, revokedAt: null },
    data: {
      revokedAt: rotatedAt,
      lastUsedAt: rotatedAt,
      revokeReason: 'rotated',
      replacedByHash: nextHash,
    },
  });

  if (!claimed || claimed.count !== 1) {
    await db.authRefreshSession.updateMany({
      where: { familyId: current.familyId, revokedAt: null },
      data: { revokedAt: rotatedAt, revokeReason: 'refresh_token_race' },
    });
    return { status: 'reused' };
  }

  const expiresAt = new Date(Date.now() + REFRESH_SESSION_MAX_MS);
  await db.authRefreshSession.create({
    data: {
      familyId: current.familyId,
      subjectType: current.subjectType,
      subjectId: current.subjectId,
      tokenHash: nextHash,
      expiresAt,
      userAgent: metadata.userAgent?.slice(0, 500) || current.userAgent || null,
      ipAddress: metadata.ipAddress?.slice(0, 100) || current.ipAddress || null,
    },
  });

  return {
    status: 'rotated',
    subject: {
      type: current.subjectType as RefreshSubjectType,
      id: current.subjectId,
    },
    session: { token: nextToken, expiresAt, familyId: current.familyId },
  };
}

export async function revokeRefreshSession(token: string, reason = 'logout'): Promise<void> {
  if (!token) return;
  const current = await db.authRefreshSession.findUnique({
    where: { tokenHash: hashRefreshToken(token) },
    select: { familyId: true },
  });
  if (!current) return;
  await db.authRefreshSession.updateMany({
    where: { familyId: current.familyId, revokedAt: null },
    data: { revokedAt: new Date(), revokeReason: reason },
  });
}

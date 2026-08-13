import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { encryptToken, maskEncryptedToken } from '@/lib/social/crypto';
import { logActivity } from '@/lib/activity-log';
import type { SocialPlatform } from '@/lib/social/types';

/**
 * Social Accounts API
 * -------------------
 * Endpoints for managing connected SocialAccount rows.
 *
 *   GET    /api/social/accounts              — list tenant's accounts (no tokens)
 *   POST   /api/social/accounts              — create (used by OAuth callbacks)
 *   DELETE /api/social/accounts?id=<accId>   — soft-delete (isActive=false)
 *
 * TOKEN SECURITY:
 *   - accessToken and refreshToken are NEVER returned to the client.
 *   - GET returns only a masked hint (e.g. "EAA...Qpo") so the user can
 *     visually verify which token is stored, without the secret ever
 *     leaving the server.
 *   - POST encrypts tokens at rest before persisting.
 *
 * All endpoints require authentication via getAuthUser().
 */

const VALID_PLATFORMS: SocialPlatform[] = [
  'facebook',
  'instagram',
  'googlebusiness',
  'linkedin',
  'pinterest',
  'twitter',
];

function isValidPlatform(p: string): p is SocialPlatform {
  return (VALID_PLATFORMS as string[]).includes(p);
}

// ─── GET — list tenant's accounts ──────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const tenantId = user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Could not resolve tenant.' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const platformFilter = searchParams.get('platform');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const where: {
      tenantId: string;
      platform?: string;
      isActive?: boolean;
    } = { tenantId };
    if (platformFilter && isValidPlatform(platformFilter)) {
      where.platform = platformFilter;
    }
    if (!includeInactive) {
      where.isActive = true;
    }

    const accounts = await db.socialAccount.findMany({
      where,
      orderBy: [{ platform: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        platform: true,
        accountId: true,
        accountName: true,
        scopes: true,
        metadata: true,
        tokenExpiry: true,
        isActive: true,
        accessToken: true, // returned but masked below — never plaintext
        createdAt: true,
        updatedAt: true,
      },
    });

    // Strip + mask tokens before sending to client.
    const safe = accounts.map((a) => {
      let metadata: Record<string, unknown> | null = null;
      if (a.metadata) {
        try {
          const parsed = JSON.parse(a.metadata);
          if (parsed && typeof parsed === 'object') {
            metadata = parsed as Record<string, unknown>;
          }
        } catch {
          // ignore corrupt metadata
        }
      }
      return {
        id: a.id,
        platform: a.platform,
        accountId: a.accountId,
        accountName: a.accountName,
        scopes: a.scopes,
        metadata,
        tokenExpiry: a.tokenExpiry,
        isActive: a.isActive,
        accessTokenMasked: maskEncryptedToken(a.accessToken),
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      };
    });

    return NextResponse.json({ data: safe });
  } catch (error) {
    console.error('[api/social/accounts] GET error:', error);
    return NextResponse.json({ error: 'Failed to load accounts' }, { status: 500 });
  }
}

// ─── POST — create a new SocialAccount (OAuth callback consumer) ───────────

interface CreateAccountBody {
  platform: string;
  accountId: string;
  accountName: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiry?: string; // ISO string
  scopes?: string;
  metadata?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const tenantId = user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Could not resolve tenant.' }, { status: 400 });
    }

    const body = (await request.json()) as CreateAccountBody;
    if (!body || !body.platform || !body.accountId || !body.accountName || !body.accessToken) {
      return NextResponse.json(
        { error: 'platform, accountId, accountName, and accessToken are required.' },
        { status: 400 },
      );
    }
    if (!isValidPlatform(body.platform)) {
      return NextResponse.json(
        { error: `Invalid platform '${body.platform}'. Valid: ${VALID_PLATFORMS.join(', ')}` },
        { status: 400 },
      );
    }

    // Encrypt tokens before persisting.
    const encryptedAccess = encryptToken(body.accessToken);
    const encryptedRefresh = body.refreshToken ? encryptToken(body.refreshToken) : null;
    const tokenExpiry = body.tokenExpiry ? new Date(body.tokenExpiry) : null;
    const scopes = body.scopes || '';
    const metadataStr = body.metadata ? JSON.stringify(body.metadata) : null;

    // Upsert: if (tenantId, platform, accountId) already exists (e.g. user
    // reconnects the same FB page), update the tokens instead of erroring
    // on the unique constraint.
    const account = await db.socialAccount.upsert({
      where: {
        tenantId_platform_accountId: {
          tenantId,
          platform: body.platform,
          accountId: body.accountId,
        },
      },
      create: {
        tenantId,
        platform: body.platform,
        accountId: body.accountId,
        accountName: body.accountName,
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        tokenExpiry,
        scopes,
        metadata: metadataStr,
        connectedById: user.id,
        isActive: true,
      },
      update: {
        accountName: body.accountName,
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        tokenExpiry,
        scopes,
        metadata: metadataStr,
        connectedById: user.id,
        isActive: true,
      },
      select: {
        id: true,
        platform: true,
        accountId: true,
        accountName: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Audit log (best-effort, never throws).
    await logActivity({
      tenantId,
      actorId: user.id,
      actorType: 'user',
      action: 'create',
      entityType: 'social_account',
      entityId: account.id,
      entityName: `${account.platform}:${account.accountName}`,
      description: `Connected ${account.platform} account "${account.accountName}".`,
      severity: 'info',
    }).catch(() => {});

    return NextResponse.json({ data: account }, { status: 201 });
  } catch (error) {
    console.error('[api/social/accounts] POST error:', error);
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
}

// ─── DELETE — soft-delete (isActive=false) ─────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const tenantId = user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Could not resolve tenant.' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('id');
    if (!accountId) {
      return NextResponse.json({ error: 'id query parameter is required.' }, { status: 400 });
    }

    // Verify ownership before soft-deleting.
    const existing = await db.socialAccount.findFirst({
      where: { id: accountId, tenantId },
      select: { id: true, platform: true, accountName: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    }

    await db.socialAccount.update({
      where: { id: accountId },
      data: { isActive: false },
    });

    await logActivity({
      tenantId,
      actorId: user.id,
      actorType: 'user',
      action: 'delete',
      entityType: 'social_account',
      entityId: accountId,
      entityName: `${existing.platform}:${existing.accountName}`,
      description: `Disconnected ${existing.platform} account "${existing.accountName}".`,
      severity: 'warning',
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[api/social/accounts] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}

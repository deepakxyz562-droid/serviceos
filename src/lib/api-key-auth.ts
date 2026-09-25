import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createHash } from 'crypto';

/**
 * API Key Authentication
 *
 * Validates API keys sent via the `x-api-key` header.
 * API keys are stored as SHA-256 hashes in the `ApiKey` table.
 *
 * Scopes:
 *   - forms:read — list/get forms
 *   - forms:write — create/update/delete forms + fields
 *   - forms:publish — publish/unpublish forms
 *   - forms:generate — use AI to generate forms
 */

export interface ApiKeyUser {
  userId: string;
  tenantId: string | null;
  workspaceId: string | null;
  scopes: string[];
  apiKeyId: string;
}

/**
 * Hash a plaintext API key using SHA-256.
 */
export function hashApiKey(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex');
}

/**
 * Generate a new API key string.
 * Format: fieseros_<random_48_chars>
 */
export function generateApiKey(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = '';
  for (let i = 0; i < 48; i++) {
    key += chars[Math.floor(Math.random() * chars.length)];
  }
  return `fieseros_${key}`;
}

/**
 * Validate an API key from the request header.
 * Returns the user info if valid, null if invalid.
 *
 * Usage in API routes:
 *   const user = await validateApiKeyRequest(request);
 *   if (!user) return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
 *   if (!user.scopes.includes('forms:write')) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
 */
export async function validateApiKeyRequest(request: NextRequest): Promise<ApiKeyUser | null> {
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey) return null;

  try {
    const keyHash = hashApiKey(apiKey);
    const apiKeyRecord = await db.apiKey.findUnique({
      where: { keyHash },
      include: {
        user: {
          select: {
            id: true,
            tenantId: true,
            workspaceId: true,
          },
        },
      },
    });

    if (!apiKeyRecord) return null;

    // Update lastUsed timestamp
    await db.apiKey.update({
      where: { id: apiKeyRecord.id },
      data: { lastUsed: new Date() },
    });

    let scopes: string[] = [];
    try {
      scopes = JSON.parse(apiKeyRecord.scopes || '[]');
    } catch {
      scopes = [];
    }

    return {
      userId: apiKeyRecord.userId,
      tenantId: apiKeyRecord.user.tenantId,
      workspaceId: apiKeyRecord.user.workspaceId,
      scopes,
      apiKeyId: apiKeyRecord.id,
    };
  } catch (error) {
    console.error('[api-key-auth] Error validating API key:', error);
    return null;
  }
}

/**
 * Check if a user has a specific scope.
 */
export function hasScope(user: ApiKeyUser, scope: string): boolean {
  return user.scopes.includes(scope) || user.scopes.includes('*');
}

/**
 * Middleware-style helper: validate API key + scope in one call.
 * Returns (null, NextResponse) if invalid, (user, null) if valid.
 */
export async function requireApiKey(request: NextRequest, requiredScope: string): Promise<[ApiKeyUser | null, NextResponse | null]> {
  const user = await validateApiKeyRequest(request);
  if (!user) {
    return [null, NextResponse.json({ error: 'Invalid or missing API key. Provide x-api-key header.' }, { status: 401 })];
  }
  if (!hasScope(user, requiredScope)) {
    return [null, NextResponse.json({ error: `Insufficient permissions. Required scope: ${requiredScope}` }, { status: 403 })];
  }
  return [user, null];
}

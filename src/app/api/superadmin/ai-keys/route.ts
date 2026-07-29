import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import { encryptKey, maskEncryptedKey } from '@/lib/ai-key-crypto';

/**
 * Superadmin route for managing AiProviderKey rows (the multi-key fallback
 * chain for outbound AI calls — see src/lib/ai-key-crypto.ts for storage).
 *
 * Security invariants:
 *   - Never return the raw `encryptedKey` (or decrypted plaintext) to the client.
 *     Always project through `maskEncryptedKey()` first.
 *   - All handlers are superadmin-only.
 */

const VALID_PROVIDERS = ['openrouter', 'openai', 'anthropic', 'gemini'] as const;
type Provider = (typeof VALID_PROVIDERS)[number];

function isProvider(value: unknown): value is Provider {
  return typeof value === 'string' && (VALID_PROVIDERS as readonly string[]).includes(value);
}

/** Project a raw DB row into the public shape (masked key, no encrypted blob). */
function projectRow(row: {
  id: string;
  provider: string;
  label: string;
  encryptedKey: string;
  priority: number;
  isActive: boolean;
  lastUsedAt: Date | null;
  lastErrorAt: Date | null;
  lastError: string | null;
  requestCount: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    provider: row.provider,
    label: row.label,
    maskedKey: maskEncryptedKey(row.encryptedKey),
    priority: row.priority,
    isActive: row.isActive,
    lastUsedAt: row.lastUsedAt,
    lastErrorAt: row.lastErrorAt,
    lastError: row.lastError,
    requestCount: row.requestCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * GET /api/superadmin/ai-keys
 * Lists all keys ordered by priority asc then createdAt asc.
 * Returns masked keys — never the raw encryptedKey.
 */
export async function GET(_request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }

    const rows = await db.aiProviderKey.findMany({
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });

    return NextResponse.json({ keys: rows.map(projectRow) });
  } catch (error) {
    console.error('[SuperAdmin AI Keys GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch AI provider keys' }, { status: 500 });
  }
}

/**
 * POST /api/superadmin/ai-keys
 * Body: { provider, label, key, priority?, isActive? }
 *
 * Creates a new key. The plaintext `key` is encrypted with `encryptKey()` and
 * only the resulting `encryptedKey` is stored. The response includes a masked
 * version of the key, never the plaintext or the encrypted blob.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }

    const body = await request.json() as {
      provider?: unknown;
      label?: unknown;
      key?: unknown;
      priority?: unknown;
      isActive?: unknown;
    };

    if (!isProvider(body.provider)) {
      return NextResponse.json(
        { error: `provider must be one of: ${VALID_PROVIDERS.join(', ')}` },
        { status: 400 },
      );
    }
    if (typeof body.label !== 'string' || body.label.trim().length === 0) {
      return NextResponse.json({ error: 'label is required' }, { status: 400 });
    }
    if (typeof body.key !== 'string' || body.key.trim().length === 0) {
      return NextResponse.json({ error: 'key is required' }, { status: 400 });
    }

    const priority =
      typeof body.priority === 'number' && Number.isFinite(body.priority)
        ? Math.trunc(body.priority)
        : 0;
    const isActive = typeof body.isActive === 'boolean' ? body.isActive : true;

    const encryptedKey = encryptKey(body.key);

    const created = await db.aiProviderKey.create({
      data: {
        provider: body.provider,
        label: body.label.trim(),
        encryptedKey,
        priority,
        isActive,
      },
    });

    return NextResponse.json({ key: projectRow(created) }, { status: 201 });
  } catch (error) {
    console.error('[SuperAdmin AI Keys POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create AI provider key' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import { maskEncryptedKey } from '@/lib/ai-key-crypto';

/**
 * PATCH/DELETE /api/superadmin/ai-keys/[id]
 *
 * Security invariants:
 *   - Never return the raw `encryptedKey` (or decrypted plaintext) to the client.
 *     Always project through `maskEncryptedKey()` first.
 *   - All handlers are superadmin-only.
 *   - PATCH may NOT update `encryptedKey` — key rotation requires DELETE + POST.
 */

interface RouteContext {
  params: Promise<{ id: string }>;
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
 * PATCH /api/superadmin/ai-keys/[id]
 * Body: { label?, priority?, isActive? }
 *
 * Updates editable metadata. The encrypted key itself is NOT updatable here —
 * rotate keys by deleting and re-creating the row.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'Key ID is required' }, { status: 400 });
    }

    const body = await request.json() as {
      label?: unknown;
      priority?: unknown;
      isActive?: unknown;
      encryptedKey?: unknown;
    };

    // Guardrail: refuse to mutate the encrypted key via PATCH. Rotation must go
    // through DELETE + POST so the plaintext is handled once, at creation time.
    if (body.encryptedKey !== undefined) {
      return NextResponse.json(
        { error: 'Cannot update encryptedKey via PATCH. Delete and re-create the key to rotate.' },
        { status: 400 },
      );
    }

    const update: Record<string, unknown> = {};
    if (typeof body.label === 'string') {
      if (body.label.trim().length === 0) {
        return NextResponse.json({ error: 'label cannot be empty' }, { status: 400 });
      }
      update.label = body.label.trim();
    }
    if (body.priority !== undefined) {
      if (typeof body.priority !== 'number' || !Number.isFinite(body.priority)) {
        return NextResponse.json({ error: 'priority must be a number' }, { status: 400 });
      }
      update.priority = Math.trunc(body.priority);
    }
    if (typeof body.isActive === 'boolean') {
      update.isActive = body.isActive;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { error: 'No updatable fields provided (allowed: label, priority, isActive)' },
        { status: 400 },
      );
    }

    const existing = await db.aiProviderKey.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'AI provider key not found' }, { status: 404 });
    }

    const updated = await db.aiProviderKey.update({
      where: { id },
      data: update,
    });

    return NextResponse.json({ key: projectRow(updated) });
  } catch (error) {
    console.error('[SuperAdmin AI Keys PATCH] Error:', error);
    return NextResponse.json({ error: 'Failed to update AI provider key' }, { status: 500 });
  }
}

/**
 * DELETE /api/superadmin/ai-keys/[id]
 * Permanently removes a key from the fallback chain.
 */
export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }

    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: 'Key ID is required' }, { status: 400 });
    }

    const existing = await db.aiProviderKey.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'AI provider key not found' }, { status: 404 });
    }

    await db.aiProviderKey.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[SuperAdmin AI Keys DELETE] Error:', error);
    return NextResponse.json({ error: 'Failed to delete AI provider key' }, { status: 500 });
  }
}

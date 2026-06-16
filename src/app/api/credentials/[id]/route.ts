import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  encryptCredentialData,
  decryptCredentialData,
  maskCredentialData,
} from '@/lib/credential-crypto';

function safeJsonParse(str: string | null, fallback: unknown = {}) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

/**
 * Decrypt a credential's stored payload into a plain object.
 *
 * Supports both the new `aes-256-gcm:` encrypted format and legacy
 * `JSON.stringify()` records.
 */
function readCredentialData(encryptedData: string | null): Record<string, any> {
  if (!encryptedData) return {};
  if (encryptedData.startsWith('aes-256-gcm:')) {
    return decryptCredentialData(encryptedData);
  }
  return safeJsonParse(encryptedData, {}) as Record<string, any>;
}

/**
 * Whether a key should be treated as a sensitive secret. Mirrors the
 * client-side `isSensitiveField` helper in `credential-fields.ts`.
 */
function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return (
    lower.includes('key') ||
    lower.includes('secret') ||
    lower.includes('password') ||
    lower.includes('token') ||
    lower.includes('private')
  );
}

/**
 * Returns true when the supplied value should be treated as "no change"
 * for a sensitive field during a PUT. The frontend leaves sensitive
 * fields blank (empty string) on edit, and may also send back the masked
 * sentinel `'••••••••'` returned by the GET endpoint.
 */
function isUnchangedSensitiveValue(value: unknown): boolean {
  if (value === undefined) return true;
  if (typeof value !== 'string') return false;
  if (value === '') return true;
  if (value.startsWith('••••')) return true;
  return false;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const credential = await db.credential.findUnique({ where: { id } });

    if (!credential) {
      return NextResponse.json(
        { error: 'Credential not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: credential.id,
      name: credential.name,
      type: credential.type,
      data: maskCredentialData(readCredentialData(credential.encryptedData)),
      workspaceId: credential.workspaceId,
      userId: credential.userId,
      createdAt: credential.createdAt,
      updatedAt: credential.updatedAt,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch credential';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await db.credential.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Credential not found' },
        { status: 404 }
      );
    }

    const data: any = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.type !== undefined) data.type = body.type;
    if (body.data !== undefined) {
      // Decrypt the existing payload so we can preserve sensitive values
      // that the frontend left blank or sent back masked.
      const existingData = readCredentialData(existing.encryptedData);
      const incoming: Record<string, any> = body.data || {};

      // Start from the existing decrypted data so any fields the client
      // omitted entirely are preserved as-is.
      const merged: Record<string, any> = { ...existingData };

      for (const [key, newValue] of Object.entries(incoming)) {
        if (isSensitiveKey(key) && isUnchangedSensitiveValue(newValue)) {
          // Keep the existing decrypted value for this sensitive field.
          // (merged already has it from existingData.)
          continue;
        }
        merged[key] = newValue;
      }

      data.encryptedData = encryptCredentialData(merged);
    }
    if (body.workspaceId !== undefined) data.workspaceId = body.workspaceId;

    const credential = await db.credential.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      id: credential.id,
      name: credential.name,
      type: credential.type,
      data: maskCredentialData(
        decryptCredentialData(credential.encryptedData)
      ),
      workspaceId: credential.workspaceId,
      userId: credential.userId,
      createdAt: credential.createdAt,
      updatedAt: credential.updatedAt,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update credential';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.credential.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Credential not found' },
        { status: 404 }
      );
    }

    await db.credential.delete({ where: { id } });

    return NextResponse.json({ success: true, id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete credential';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

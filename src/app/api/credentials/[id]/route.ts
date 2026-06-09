import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function maskCredentialData(data: Record<string, any>): Record<string, any> {
  const masked: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string' && value.length > 0) {
      if (
        key.toLowerCase().includes('password') ||
        key.toLowerCase().includes('secret') ||
        key.toLowerCase().includes('key') ||
        key.toLowerCase().includes('token')
      ) {
        masked[key] = '••••••••';
      } else if (value.length <= 4) {
        masked[key] = '••••';
      } else {
        masked[key] = value.slice(0, 2) + '••••' + value.slice(-2);
      }
    } else {
      masked[key] = value;
    }
  }
  return masked;
}

function safeJsonParse(str: string | null, fallback: unknown = {}) {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

/**
 * Checks if a value appears to be a masked placeholder from the API.
 * Masked values contain bullet characters (•).
 */
function isMaskedValue(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return value.includes('•');
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
      data: maskCredentialData(safeJsonParse(credential.encryptedData, {})),
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
    if (body.workspaceId !== undefined) data.workspaceId = body.workspaceId;

    // Handle data update with smart merge:
    // If body.data is provided, merge it with existing data, filtering out
    // masked values (containing •) so that unchanged sensitive fields
    // retain their original values from the database.
    if (body.data !== undefined) {
      const existingData = safeJsonParse(existing.encryptedData, {});
      const incomingData = body.data as Record<string, any>;

      // Filter out masked values — the user didn't change these fields
      const cleanedData: Record<string, any> = {};
      for (const [key, value] of Object.entries(incomingData)) {
        if (!isMaskedValue(value)) {
          cleanedData[key] = value;
        }
      }

      // Merge: existing data as base, overwritten by non-masked incoming values
      const mergedData = { ...existingData, ...cleanedData };
      data.encryptedData = JSON.stringify(mergedData);
    }

    const credential = await db.credential.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      id: credential.id,
      name: credential.name,
      type: credential.type,
      data: maskCredentialData(safeJsonParse(credential.encryptedData, {})),
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

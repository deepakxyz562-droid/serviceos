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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    const where: any = {};
    if (type) {
      where.type = type;
    }

    const credentials = await db.credential.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({
      credentials: credentials.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        data: maskCredentialData(readCredentialData(c.encryptedData)),
        workspaceId: c.workspaceId,
        userId: c.userId,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch credentials';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || !body.type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      );
    }

    const encryptedData = encryptCredentialData(body.data || {});

    const credential = await db.credential.create({
      data: {
        name: body.name,
        type: body.type,
        encryptedData,
        workspaceId: body.workspaceId || null,
        userId: body.userId || null,
      },
    });

    return NextResponse.json(
      {
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
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create credential';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

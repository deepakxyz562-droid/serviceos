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
    if (body.data !== undefined) data.encryptedData = JSON.stringify(body.data);
    if (body.workspaceId !== undefined) data.workspaceId = body.workspaceId;

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

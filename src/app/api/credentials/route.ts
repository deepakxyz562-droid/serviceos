import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function maskCredentialData(data: Record<string, any>): Record<string, any> {
  const masked: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string' && value.length > 0) {
      if (key.toLowerCase().includes('password') || key.toLowerCase().includes('secret') || key.toLowerCase().includes('key') || key.toLowerCase().includes('token')) {
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
        data: maskCredentialData(safeJsonParse(c.encryptedData, {})),
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

    const credential = await db.credential.create({
      data: {
        name: body.name,
        type: body.type,
        encryptedData: JSON.stringify(body.data || {}),
        workspaceId: body.workspaceId || null,
        userId: body.userId || null,
      },
    });

    return NextResponse.json(
      {
        id: credential.id,
        name: credential.name,
        type: credential.type,
        data: maskCredentialData(safeJsonParse(credential.encryptedData, {})),
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

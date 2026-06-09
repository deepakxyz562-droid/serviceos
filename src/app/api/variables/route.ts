import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const variables = await db.variable.findMany({
      orderBy: { key: 'asc' },
    });

    return NextResponse.json({
      variables: variables.map((v) => ({
        id: v.id,
        key: v.key,
        value: '••••••••', // Always mask variable values
        workspaceId: v.workspaceId,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch variables';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.key) {
      return NextResponse.json(
        { error: 'Variable key is required' },
        { status: 400 }
      );
    }

    if (body.value === undefined) {
      return NextResponse.json(
        { error: 'Variable value is required' },
        { status: 400 }
      );
    }

    // Upsert by key: find existing variable with the same key and update it, or create new
    const existing = await db.variable.findFirst({
      where: { key: body.key },
    });

    let variable;
    if (existing) {
      // Update existing variable
      variable = await db.variable.update({
        where: { id: existing.id },
        data: {
          valueEncrypted: String(body.value),
          workspaceId: body.workspaceId || existing.workspaceId,
        },
      });
    } else {
      // Create new variable
      variable = await db.variable.create({
        data: {
          key: body.key,
          valueEncrypted: String(body.value),
          workspaceId: body.workspaceId || null,
        },
      });
    }

    return NextResponse.json(
      {
        id: variable.id,
        key: variable.key,
        value: '••••••••',
        workspaceId: variable.workspaceId,
        createdAt: variable.createdAt,
        updatedAt: variable.updatedAt,
      },
      { status: existing ? 200 : 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create/update variable';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Variable ID is required' },
        { status: 400 }
      );
    }

    const existing = await db.variable.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Variable not found' },
        { status: 404 }
      );
    }

    await db.variable.delete({ where: { id } });
    return NextResponse.json({ success: true, id });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete variable';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

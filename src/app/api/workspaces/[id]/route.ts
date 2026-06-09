import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const workspace = await db.workspace.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            workflows: true,
            employees: true,
            jobs: true,
            customers: true,
            resources: true,
          },
        },
      },
    });
    if (!workspace)
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ workspace });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch workspace' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const workspace = await db.workspace.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.industry !== undefined && { industry: body.industry }),
        ...(body.logo !== undefined && { logo: body.logo }),
        ...(body.plan && { plan: body.plan }),
        ...(body.settingsJson && {
          settingsJson: JSON.stringify(body.settingsJson),
        }),
      },
    });
    return NextResponse.json({ workspace });
  } catch {
    return NextResponse.json(
      { error: 'Failed to update workspace' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.workspace.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Failed to delete workspace' },
      { status: 500 }
    );
  }
}

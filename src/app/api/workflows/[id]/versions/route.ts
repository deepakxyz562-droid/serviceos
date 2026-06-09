import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const versions = await db.workflowVersion.findMany({
      where: { workflowId: id },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({
      versions: versions.map((v) => ({
        id: v.id,
        workflowId: v.workflowId,
        message: v.message,
        createdAt: v.createdAt,
        snapshotSize: v.snapshotJson.length,
      })),
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch versions' }, { status: 500 });
  }
}

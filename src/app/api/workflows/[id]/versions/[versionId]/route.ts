import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const { id, versionId } = await params;
    const version = await db.workflowVersion.findFirst({
      where: { id: versionId, workflowId: id },
    });
    if (!version)
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    return NextResponse.json({ version });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch version' }, { status: 500 });
  }
}

// POST to restore a version
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  try {
    const { id, versionId } = await params;
    const version = await db.workflowVersion.findFirst({
      where: { id: versionId, workflowId: id },
    });
    if (!version)
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });

    const snapshot = JSON.parse(version.snapshotJson);

    // Create a new version snapshot before restoring (backup current state)
    const current = await db.workflow.findUnique({ where: { id } });
    if (current) {
      await db.workflowVersion.create({
        data: {
          workflowId: id,
          snapshotJson: JSON.stringify({
            nodes: JSON.parse(current.nodesJson),
            edges: JSON.parse(current.edgesJson),
            settings: JSON.parse(current.settingsJson),
          }),
          message: 'Auto-backup before restoring version',
        },
      });
    }

    // Restore the version
    await db.workflow.update({
      where: { id },
      data: {
        nodesJson: JSON.stringify(snapshot.nodes || []),
        edgesJson: JSON.stringify(snapshot.edges || []),
        ...(snapshot.settings && {
          settingsJson: JSON.stringify(snapshot.settings),
        }),
      },
    });

    return NextResponse.json({ success: true, message: 'Version restored' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to restore' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { promises as fs } from 'fs';
import path from 'path';

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

/**
 * Resolve the absolute filesystem path for a stored photo URL.
 * Only returns a path inside public/uploads/ (no path traversal).
 */
function resolveLocalFilePath(url: string): string | null {
  if (!url.startsWith('/uploads/')) return null;
  const relative = url.replace('/uploads/', '');
  const absolute = path.join(UPLOADS_DIR, path.basename(relative));
  // Ensure no path traversal escaped UPLOADS_DIR
  if (!absolute.startsWith(UPLOADS_DIR)) return null;
  return absolute;
}

/**
 * DELETE /api/jobs/[id]/photos/[photoId]
 * Removes the photo file from disk (best-effort) + the DB record.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId, photoId } = await params;

    const photo = await db.jobPhoto.findUnique({
      where: { id: photoId },
    });

    if (!photo || photo.jobId !== jobId) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // Remove the file from disk (best-effort, non-fatal)
    if (photo.url) {
      const absPath = resolveLocalFilePath(photo.url);
      if (absPath) {
        try {
          await fs.unlink(absPath);
        } catch {
          // File may already be gone, or storage is remote. Non-fatal.
        }
      }
    }

    // Remove the DB record
    await db.jobPhoto.delete({ where: { id: photoId } });

    // Best-effort: also remove the timeline entry that referenced this photo
    try {
      await db.customerTimelineEntry.deleteMany({
        where: { sourceType: 'JobPhoto', sourceId: photoId },
      });
    } catch {
      // non-fatal
    }

    return NextResponse.json({ success: true, id: photoId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete photo';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/jobs/[id]/photos/[photoId]
 * Updates the caption and/or notes on a photo.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId, photoId } = await params;
    const body = await request.json();

    const photo = await db.jobPhoto.findUnique({ where: { id: photoId } });
    if (!photo || photo.jobId !== jobId) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    const updateData: { caption?: string; notes?: string } = {};
    if (typeof body.caption === 'string') updateData.caption = body.caption;
    if (typeof body.notes === 'string') updateData.notes = body.notes;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });
    }

    const updated = await db.jobPhoto.update({
      where: { id: photoId },
      data: updateData,
    });

    return NextResponse.json({ photo: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update photo';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

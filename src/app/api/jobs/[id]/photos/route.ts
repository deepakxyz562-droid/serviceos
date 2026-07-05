import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { promises as fs } from 'fs';
import path from 'path';

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');
const PUBLIC_UPLOADS_URL = '/uploads';

const VALID_PHOTO_TYPES = ['before', 'after', 'progress', 'issue', 'other'];

/**
 * Ensure the uploads directory exists (idempotent).
 */
async function ensureUploadsDir() {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  } catch {
    // ignore — likely already exists
  }
}

/**
 * Extract the binary content + mime type from a base64 data URL.
 * Returns null if the string is not a data URL.
 */
function parseDataUrl(dataUrl: string): { buffer: Buffer; mimeType: string } | null {
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
  if (!match) return null;
  const mimeType = match[1];
  const buffer = Buffer.from(match[2], 'base64');
  return { buffer, mimeType };
}

/**
 * Generate a filesystem-safe filename for a photo.
 */
function generateFileName(jobId: string, photoType: string, ext: string) {
  const safeType = photoType.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  return `${jobId}-${safeType}-${Date.now()}.${ext}`;
}

/**
 * GET /api/jobs/[id]/photos?type=before|after|progress|issue|other
 * Returns photos sorted by capturedAt ascending.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    // Verify the job exists (so we don't return data for unknown jobs)
    const job = await db.job.findUnique({
      where: { id: jobId },
      select: { id: true, customerId: true, workspaceId: true },
    });
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const where: { jobId: string; photoType?: string } = { jobId };
    if (type && VALID_PHOTO_TYPES.includes(type)) {
      where.photoType = type;
    }

    const photos = await db.jobPhoto.findMany({
      where,
      orderBy: { capturedAt: 'asc' },
    });

    return NextResponse.json({ photos });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch photos';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/jobs/[id]/photos
 * Body: JSON with photoType, file (base64 data URL or { dataUrl, name, type }),
 * caption?, notes?, latitude?, longitude?, accuracy?, capturedAt?, syncStatus?
 *
 * Or multipart/form-data with the same fields (file as File).
 *
 * Saves the image to public/uploads/, creates the JobPhoto record,
 * and emits a CustomerTimelineEntry.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await params;

    const job = await db.job.findUnique({
      where: { id: jobId },
      select: { id: true, customerId: true, customerName: true, workspaceId: true },
    });
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // ── Parse body: support both JSON and multipart/form-data ──
    let photoType: string = 'before';
    let fileDataUrl = '';
    let fileName: string | undefined;
    let caption: string | undefined;
    let notes: string | undefined;
    let latitude: number | undefined;
    let longitude: number | undefined;
    let accuracy: number | undefined;
    let capturedAt: Date | undefined;
    let syncStatus: string = 'synced';

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      photoType = (formData.get('photoType') as string) || 'before';
      const file = formData.get('file');
      if (file && file instanceof File) {
        // Convert File to base64 data URL
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const b64 = buffer.toString('base64');
        fileDataUrl = `data:${file.type || 'image/jpeg'};base64,${b64}`;
        fileName = file.name;
      } else if (typeof formData.get('file') === 'string') {
        fileDataUrl = formData.get('file') as string;
      }
      caption = (formData.get('caption') as string) || undefined;
      notes = (formData.get('notes') as string) || undefined;
      latitude = formData.get('latitude') ? Number(formData.get('latitude')) : undefined;
      longitude = formData.get('longitude') ? Number(formData.get('longitude')) : undefined;
      accuracy = formData.get('accuracy') ? Number(formData.get('accuracy')) : undefined;
      const capAt = formData.get('capturedAt') as string | null;
      if (capAt) capturedAt = new Date(capAt);
      syncStatus = (formData.get('syncStatus') as string) || 'synced';
    } else {
      const body = await request.json();
      photoType = body.photoType || 'before';
      // `file` may be a data URL string OR { dataUrl, name, type }
      if (typeof body.file === 'string') {
        fileDataUrl = body.file;
      } else if (body.file && typeof body.file === 'object' && body.file.dataUrl) {
        fileDataUrl = body.file.dataUrl;
        fileName = body.file.name;
      }
      caption = body.caption;
      notes = body.notes;
      latitude = body.latitude != null ? Number(body.latitude) : undefined;
      longitude = body.longitude != null ? Number(body.longitude) : undefined;
      accuracy = body.accuracy != null ? Number(body.accuracy) : undefined;
      if (body.capturedAt) capturedAt = new Date(body.capturedAt);
      syncStatus = body.syncStatus || 'synced';
    }

    if (!VALID_PHOTO_TYPES.includes(photoType)) {
      return NextResponse.json(
        { error: `Invalid photoType. Must be one of: ${VALID_PHOTO_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    if (!fileDataUrl) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const parsed = parseDataUrl(fileDataUrl);
    if (!parsed) {
      return NextResponse.json(
        { error: 'Invalid file format. Expected base64 data URL.' },
        { status: 400 }
      );
    }

    // ── Write to public/uploads/ ──
    await ensureUploadsDir();
    const ext = parsed.mimeType === 'image/png' ? 'png' : parsed.mimeType === 'image/webp' ? 'webp' : 'jpg';
    const safeFileName = generateFileName(jobId, photoType, ext);
    const filePath = path.join(UPLOADS_DIR, safeFileName);
    await fs.writeFile(filePath, parsed.buffer);
    const publicUrl = `${PUBLIC_UPLOADS_URL}/${safeFileName}`;

    // ── Create the JobPhoto record ──
    const photo = await db.jobPhoto.create({
      data: {
        tenantId: job.workspaceId || user.tenantId || 'default',
        jobId,
        customerId: job.customerId || undefined,
        photoType,
        url: publicUrl,
        thumbnailUrl: publicUrl,
        fileName: fileName || safeFileName,
        mimeType: parsed.mimeType || 'image/jpeg',
        size: parsed.buffer.length,
        capturedBy: user.id,
        capturedByName: user.name || user.email,
        capturedAt: capturedAt || new Date(),
        latitude,
        longitude,
        accuracy,
        caption,
        notes,
        syncStatus,
      },
    });

    // ── Emit a CustomerTimelineEntry (non-fatal) ──
    try {
      if (job.customerId) {
        await db.customerTimelineEntry.create({
          data: {
            tenantId: job.workspaceId || user.tenantId || 'default',
            customerId: job.customerId,
            entryType: 'photo',
            title: `${photoType} photo added`,
            description: caption || `${photoType} photo for job ${jobId}`,
            sourceType: 'JobPhoto',
            sourceId: photo.id,
            metadataJson: JSON.stringify({
              jobId,
              photoType,
              url: publicUrl,
              caption: caption || null,
            }),
            actorId: user.id,
            actorName: user.name || user.email,
            actorType: 'user',
            eventDate: photo.capturedAt,
          },
        });
      }
    } catch (timelineErr) {
      console.error('[PhotosAPI] Failed to create timeline entry:', timelineErr);
    }

    return NextResponse.json({ photo }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to upload photo';
    console.error('[PhotosAPI] POST error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

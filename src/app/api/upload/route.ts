import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { uploadFile, STORAGE_BUCKETS, StorageBucket } from '@/lib/supabase-storage';
import { db } from '@/lib/db';

const ALLOWED_MIME_TYPES = new Set([
  // Images
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/avif',
  // Videos
  'video/mp4',
  'video/quicktime', // .mov
  'video/webm',
  'video/x-m4v',
  'video/mpeg',
  // Documents
  'application/pdf',
]);

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB (supports videos and high-res graphics)

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const tenantId = authUser.tenantId || authUser.workspaceId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Workspace context required' }, { status: 400 });
    }

    const formData = (await request.formData()) as unknown as {
      get(name: string): FormDataEntryValue | File | Blob | string | null;
    };
    const rawFile = formData.get('file');

    if (!rawFile || typeof rawFile === 'string' || typeof (rawFile as Blob).arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'No valid file provided' }, { status: 400 });
    }

    const file = rawFile as Blob & { name?: string; size: number; type: string };

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File exceeds maximum allowed size of 100MB' },
        { status: 400 },
      );
    }

    const originalName = (typeof file.name === 'string' && file.name.trim()) ? file.name.trim() : 'media';
    const ext = originalName.split('.').pop()?.toLowerCase() || '';
    const rawMime = (file.type || '').trim().toLowerCase();
    const mime =
      rawMime === 'image/jpg'
        ? 'image/jpeg'
        : rawMime === 'image'
          ? 'image/jpeg'
          : rawMime === 'video'
            ? (ext === 'mov' ? 'video/quicktime' : 'video/mp4')
            : !rawMime || rawMime === 'application/octet-stream'
              ? ext === 'png'
                ? 'image/png'
                : ext === 'webp'
                  ? 'image/webp'
                  : ext === 'mp4'
                    ? 'video/mp4'
                    : ext === 'mov'
                      ? 'video/quicktime'
                      : ext === 'pdf'
                        ? 'application/pdf'
                        : ext === 'jpg' || ext === 'jpeg'
                          ? 'image/jpeg'
                          : 'application/octet-stream'
              : rawMime;

    const isImage = mime.startsWith('image/');
    const isVideo = mime.startsWith('video/');

    if (!ALLOWED_MIME_TYPES.has(mime) && !isImage && !isVideo) {
      return NextResponse.json(
        { error: `File type ${mime} is not supported. Please upload an image (PNG, JPG, WEBP) or video (MP4, MOV).` },
        { status: 400 },
      );
    }

    const folderParam = (formData.get('folder') as string) || (isVideo ? 'social-videos' : 'social-posts');
    const requestedBucket = (formData.get('bucket') as string) || '';
    const bucketParam = Object.values(STORAGE_BUCKETS).includes(requestedBucket as StorageBucket)
      ? (requestedBucket as StorageBucket)
      : STORAGE_BUCKETS.campaignAssets;
    const saveToLibrary = formData.get('saveToLibrary') === 'true';

    const timestamp = Date.now();
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${timestamp}_${sanitizedName}`;
    const bytes = Buffer.from(await file.arrayBuffer());

    const { url, path } = await uploadFile({
      bucket: bucketParam,
      file: bytes,
      companyId: tenantId,
      folder: folderParam,
      fileName,
      contentType: mime,
    });

    // Save to ImageLibrary if requested or if tenant is logged in
    if (saveToLibrary && isImage && authUser.tenantId) {
      try {
        await db.imageLibrary.create({
          data: {
            tenantId: authUser.tenantId,
            name: originalName || sanitizedName,
            url,
            folder: folderParam,
            mediaType: mime,
            size: file.size,
            uploadedBy: authUser.id,
          },
        });
      } catch (dbErr) {
        console.warn('[api/upload] ImageLibrary save warning:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      url,
      path,
      name: originalName,
      size: file.size,
      mimeType: mime,
      isVideo,
      isImage,
    });
  } catch (err: any) {
    console.error('[api/upload] Upload error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to process file upload' },
      { status: 500 },
    );
  }
}

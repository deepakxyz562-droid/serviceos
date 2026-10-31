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
    const authUser = await getAuthUser();
    const tenantId = authUser?.tenantId || authUser?.workspaceId || 'public';

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File exceeds maximum allowed size of 100MB' },
        { status: 400 },
      );
    }

    const mime = file.type || 'application/octet-stream';
    const isImage = mime.startsWith('image/');
    const isVideo = mime.startsWith('video/');

    if (!ALLOWED_MIME_TYPES.has(mime) && !isImage && !isVideo) {
      return NextResponse.json(
        { error: `File type ${mime} is not supported. Please upload an image (PNG, JPG, WEBP) or video (MP4, MOV).` },
        { status: 400 },
      );
    }

    const folderParam = (formData.get('folder') as string) || (isVideo ? 'social-videos' : 'social-posts');
    const bucketParam = (formData.get('bucket') as string) || STORAGE_BUCKETS.companyAssets;
    const saveToLibrary = formData.get('saveToLibrary') === 'true';

    const timestamp = Date.now();
    const sanitizedName = (file.name || 'media').replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${timestamp}_${sanitizedName}`;

    const { url, path } = await uploadFile({
      bucket: bucketParam as StorageBucket,
      file,
      companyId: tenantId,
      folder: folderParam,
      fileName,
      contentType: mime,
    });

    // Save to ImageLibrary if requested or if tenant is logged in
    if (saveToLibrary && isImage && authUser?.tenantId) {
      try {
        await db.imageLibrary.create({
          data: {
            tenantId: authUser.tenantId,
            name: file.name || sanitizedName,
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
      name: file.name,
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

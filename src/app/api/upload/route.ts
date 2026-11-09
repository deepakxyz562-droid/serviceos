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
  'image/heic',
  'image/heif',
  'image/svg+xml',
  'image/avif',
  // Videos
  'video/mp4',
  'video/quicktime', // .mov
  'video/webm',
  'video/x-m4v',
  'video/3gpp',
  'video/x-matroska',
  'video/x-msvideo',
  'video/avi',
  'video/mpeg',
  // Documents
  'application/pdf',
]);

const EXT_TO_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif',
  avif: 'image/avif',
  mp4: 'video/mp4',
  m4v: 'video/x-m4v',
  mov: 'video/quicktime',
  webm: 'video/webm',
  '3gp': 'video/3gpp',
  mkv: 'video/x-matroska',
  avi: 'video/x-msvideo',
  mpeg: 'video/mpeg',
  mpg: 'video/mpeg',
  pdf: 'application/pdf',
};

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB (supports videos and high-res graphics)

function getDevCorsHeaders(request: NextRequest): Record<string, string> {
  if (process.env.NODE_ENV === 'production') return {};
  const origin = request.headers.get('origin');
  if (!origin) return {};
  const isLocalOrigin =
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    origin.includes('192.168.') ||
    origin.includes('10.0.');
  if (!isLocalOrigin) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
  };
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin') || '*';
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function POST(request: NextRequest) {
  const corsHeaders = getDevCorsHeaders(request);
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: corsHeaders });
    }
    const tenantId = authUser.tenantId || authUser.workspaceId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Workspace context required' }, { status: 400, headers: corsHeaders });
    }

    const formData = (await request.formData()) as unknown as {
      get(name: string): FormDataEntryValue | File | Blob | string | null;
    };
    const rawFile = formData.get('file');

    if (!rawFile || typeof rawFile === 'string' || typeof (rawFile as Blob).arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'No valid file provided' }, { status: 400, headers: corsHeaders });
    }

    const file = rawFile as Blob & { name?: string; size: number; type: string };

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File exceeds maximum allowed size of 100MB' },
        { status: 400, headers: corsHeaders },
      );
    }

    const originalName = (typeof file.name === 'string' && file.name.trim()) ? file.name.trim() : 'media';
    const ext = originalName.split('.').pop()?.toLowerCase() || '';
    const rawMime = (file.type || '').trim().toLowerCase();
    const mime =
      rawMime === 'image/jpg'
        ? 'image/jpeg'
        : rawMime === 'video/avi'
          ? 'video/x-msvideo'
          : rawMime === 'image'
            ? (EXT_TO_MIME[ext] || 'image/jpeg')
            : rawMime === 'video'
              ? (EXT_TO_MIME[ext] || 'video/mp4')
              : !rawMime || rawMime === 'application/octet-stream'
                ? (EXT_TO_MIME[ext] || 'application/octet-stream')
                : rawMime;

    const isImage = mime.startsWith('image/');
    const isVideo = mime.startsWith('video/');

    if (!ALLOWED_MIME_TYPES.has(mime) && !isImage && !isVideo) {
      return NextResponse.json(
        { error: `File type ${mime} is not supported. Please upload an image (PNG, JPG, WEBP) or video (MP4, MOV, WEBM).` },
        { status: 400, headers: corsHeaders },
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
      requirePublicUrl: bucketParam === STORAGE_BUCKETS.campaignAssets && process.env.NODE_ENV === 'production',
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

    return NextResponse.json(
      {
        success: true,
        url,
        path,
        name: originalName,
        size: file.size,
        mimeType: mime,
        isVideo,
        isImage,
      },
      { headers: corsHeaders },
    );
  } catch (err: any) {
    console.error('[api/upload] Upload error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to process file upload' },
      { status: 500, headers: corsHeaders },
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { uploadFile, STORAGE_BUCKETS, type StorageBucket } from '@/lib/supabase-storage';
import { canUseInbox } from '@/lib/conversation-access';

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'image/avif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-m4v',
  'video/3gpp',
  'video/x-matroska',
  'video/x-msvideo',
  'video/avi',
  'video/mpeg',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
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
  csv: 'text/csv',
  txt: 'text/plain',
};

const MAX_IMAGE_DOC_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

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

function resolveMime(rawType: string | undefined, fileName: string): string {
  const normalized = (rawType || '').trim().toLowerCase();
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (normalized === 'image/jpg') return 'image/jpeg';
  if (normalized === 'video/avi') return 'video/x-msvideo';
  if (normalized === 'image') return EXT_TO_MIME[ext] || 'image/jpeg';
  if (normalized === 'video') return EXT_TO_MIME[ext] || 'video/mp4';
  if (!normalized || normalized === 'application/octet-stream') {
    return EXT_TO_MIME[ext] || 'application/octet-stream';
  }
  return normalized;
}

export async function POST(request: NextRequest) {
  const corsHeaders = getDevCorsHeaders(request);
  try {
    const authUser = await getAuthUser(request);
    if (!canUseInbox(authUser)) {
      return NextResponse.json(
        { error: 'Operator authentication required' },
        { status: authUser ? 403 : 401, headers: corsHeaders }
      );
    }

    let formData: {
      get(name: string): FormDataEntryValue | File | Blob | string | null;
    };
    try {
      formData = (await request.formData()) as unknown as {
        get(name: string): FormDataEntryValue | File | Blob | string | null;
      };
    } catch (formErr) {
      const formMsg = formErr instanceof Error ? formErr.message : String(formErr);
      console.warn('[Omnichannel Upload] Failed parsing multipart formData:', formMsg);
      const isTooLarge = /limit|size|length|exceeded|too large|body/i.test(formMsg);
      return NextResponse.json(
        {
          error: isTooLarge
            ? 'Upload body exceeded server size limit or connection was interrupted. Try direct upload or a smaller file.'
            : 'Could not read uploaded file body (connection interrupted or file too large). Try direct upload or a smaller file.',
        },
        { status: isTooLarge ? 413 : 400, headers: corsHeaders }
      );
    }
    const rawFile = formData.get('file');

    if (!rawFile || typeof rawFile === 'string' || typeof (rawFile as Blob).arrayBuffer !== 'function') {
      return NextResponse.json(
        { error: 'No valid file payload provided. Please select a photo, video, or document.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const file = rawFile as Blob & { name?: string; size: number; type: string };
    const originalName = (typeof file.name === 'string' && file.name.trim()) ? file.name.trim() : 'media-upload';
    const mime = resolveMime(file.type, originalName);
    const isImage = mime.startsWith('image/');
    const isVideo = mime.startsWith('video/');

    if (!ALLOWED_MIME_TYPES.has(mime) && !isImage && !isVideo) {
      return NextResponse.json(
        { error: `File type ${mime} is not supported. Please upload an image, video (MP4/MOV/WEBM), or PDF/document.` },
        { status: 400, headers: corsHeaders }
      );
    }

    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_DOC_SIZE;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File exceeds maximum allowed size of ${isVideo ? '100MB' : '25MB'}` },
        { status: 400, headers: corsHeaders }
      );
    }

    const companyId = authUser?.tenantId || authUser?.workspaceId || 'workspace';
    const timestamp = Date.now();
    const ext = originalName.includes('.')
      ? ''
      : isVideo
        ? mime === 'video/quicktime'
          ? '.mov'
          : mime === 'video/3gpp'
            ? '.3gp'
            : '.mp4'
        : isImage
          ? `.${mime.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg'}`
          : '';
    const sanitizedName = `${originalName}${ext}`.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${timestamp}_${sanitizedName}`;

    const folderParam = (formData.get('folder') as string) || (isVideo ? 'media-videos' : 'inbox-attachments');
    const visibilityParam = formData.get('visibility');
    const bucket: StorageBucket =
      visibilityParam === 'public' || folderParam.includes('social') || folderParam.includes('gbp') || folderParam.includes('media')
        ? STORAGE_BUCKETS.campaignAssets
        : STORAGE_BUCKETS.crmFiles;

    const bytes = Buffer.from(await file.arrayBuffer());

    const { url, path } = await uploadFile({
      bucket,
      file: bytes,
      companyId,
      folder: folderParam,
      fileName,
      contentType: mime,
      requirePublicUrl: visibilityParam === 'public' && process.env.NODE_ENV === 'production',
    });

    return NextResponse.json(
      {
        success: true,
        url,
        path,
        fileName: originalName,
        fileSize: file.size,
        mimeType: mime,
        isVideo,
        isImage,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error('[Omnichannel Upload] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process file upload. Please try again.' },
      { status: 500, headers: corsHeaders }
    );
  }
}

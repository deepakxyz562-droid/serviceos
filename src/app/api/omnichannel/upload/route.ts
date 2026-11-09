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
  mpeg: 'video/mpeg',
  mpg: 'video/mpeg',
  pdf: 'application/pdf',
  csv: 'text/csv',
  txt: 'text/plain',
};

const MAX_IMAGE_DOC_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

function resolveMime(rawType: string | undefined, fileName: string): string {
  const normalized = (rawType || '').trim().toLowerCase();
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (normalized === 'image/jpg') return 'image/jpeg';
  if (normalized === 'image') return EXT_TO_MIME[ext] || 'image/jpeg';
  if (normalized === 'video') return EXT_TO_MIME[ext] || 'video/mp4';
  if (!normalized || normalized === 'application/octet-stream') {
    return EXT_TO_MIME[ext] || 'application/octet-stream';
  }
  return normalized;
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!canUseInbox(authUser)) {
      return NextResponse.json(
        { error: 'Operator authentication required' },
        { status: authUser ? 403 : 401 }
      );
    }

    const formData = (await request.formData()) as unknown as {
      get(name: string): FormDataEntryValue | File | Blob | string | null;
    };
    const rawFile = formData.get('file');

    if (!rawFile || typeof rawFile === 'string' || typeof (rawFile as Blob).arrayBuffer !== 'function') {
      return NextResponse.json(
        { error: 'No valid file payload provided. Please select a photo, video, or document.' },
        { status: 400 }
      );
    }

    const file = rawFile as Blob & { name?: string; size: number; type: string };
    const originalName = (typeof file.name === 'string' && file.name.trim()) ? file.name.trim() : 'media-upload';
    const mime = resolveMime(file.type, originalName);
    const isImage = mime.startsWith('image/');
    const isVideo = mime.startsWith('video/');

    if (!ALLOWED_MIME_TYPES.has(mime) && !isImage && !isVideo) {
      return NextResponse.json(
        { error: `File type ${mime} is not supported. Please upload an image, video (MP4/MOV), or PDF/document.` },
        { status: 400 }
      );
    }

    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_DOC_SIZE;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File exceeds maximum allowed size of ${isVideo ? '100MB' : '25MB'}` },
        { status: 400 }
      );
    }

    const companyId = authUser?.tenantId || authUser?.workspaceId || 'workspace';
    const timestamp = Date.now();
    const ext = originalName.includes('.')
      ? ''
      : isVideo
        ? '.mp4'
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
    });

    return NextResponse.json({
      success: true,
      url,
      path,
      fileName: originalName,
      fileSize: file.size,
      mimeType: mime,
      isVideo,
      isImage,
    });
  } catch (error) {
    console.error('[Omnichannel Upload] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process file upload. Please try again.' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import {
  createPresignedUploadTarget,
  STORAGE_BUCKETS,
  type StorageBucket,
} from '@/lib/supabase-storage';
import { canUseInbox } from '@/lib/conversation-access';

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
const GBP_RECOMMENDED_VIDEO_MAX = 75 * 1024 * 1024; // 75MB Google Business advisory

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
  try {
    const authUser = await getAuthUser(request);
    if (!canUseInbox(authUser)) {
      return NextResponse.json(
        { error: 'Operator authentication required' },
        { status: authUser ? 403 : 401 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const rawName = typeof body.fileName === 'string' && body.fileName.trim() ? body.fileName.trim() : 'media-upload';
    const rawMime = typeof body.mimeType === 'string' ? body.mimeType : '';
    const fileSize = typeof body.fileSize === 'number' && Number.isFinite(body.fileSize) ? body.fileSize : 0;

    const mime = resolveMime(rawMime, rawName);
    const isImage = mime.startsWith('image/');
    const isVideo = mime.startsWith('video/');

    if (!isImage && !isVideo && mime !== 'application/pdf' && !mime.startsWith('text/')) {
      return NextResponse.json(
        { error: `File type ${mime} is not supported.` },
        { status: 400 },
      );
    }

    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_DOC_SIZE;
    if (fileSize > maxSize) {
      return NextResponse.json(
        { error: `File exceeds maximum allowed size of ${isVideo ? '100MB' : '25MB'}.` },
        { status: 400 },
      );
    }

    const folderParam =
      typeof body.folder === 'string' && body.folder.trim()
        ? body.folder.trim().replace(/[^a-zA-Z0-9_-]/g, '')
        : isVideo
          ? 'media-videos'
          : 'inbox-attachments';
    const visibilityParam = body.visibility === 'public' ? 'public' : 'private';
    const bucket: StorageBucket =
      visibilityParam === 'public' ||
      folderParam.includes('social') ||
      folderParam.includes('gbp') ||
      folderParam.includes('media')
        ? STORAGE_BUCKETS.campaignAssets
        : STORAGE_BUCKETS.crmFiles;

    const ext = rawName.includes('.')
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
    const sanitizedName = `${rawName}${ext}`.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${Date.now()}_${sanitizedName}`;
    const companyId = authUser?.tenantId || authUser?.workspaceId || 'workspace';

    const target = await createPresignedUploadTarget({
      bucket,
      companyId,
      folder: folderParam,
      fileName,
      contentType: mime,
    });

    return NextResponse.json({
      success: true,
      ...target,
      mimeType: mime,
      isVideo,
      isImage,
      gbpVideoWarning:
        isVideo && fileSize > GBP_RECOMMENDED_VIDEO_MAX
          ? 'Google Business Profile recommends videos under 75MB (1080p, <= 30s) for reliable ingestion.'
          : undefined,
    });
  } catch (error) {
    console.error('[Omnichannel Upload Presign] Error:', error);
    return NextResponse.json(
      { error: 'Failed to prepare direct upload.' },
      { status: 500 },
    );
  }
}

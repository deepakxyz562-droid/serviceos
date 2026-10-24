import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { uploadFile, STORAGE_BUCKETS } from '@/lib/supabase-storage';
import { canUseInbox } from '@/lib/omnichannel/access';

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!canUseInbox(authUser)) {
      return NextResponse.json(
        { error: 'Operator authentication required' },
        { status: authUser ? 403 : 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File exceeds maximum allowed size of 15MB' },
        { status: 400 }
      );
    }

    const mime = file.type || 'application/octet-stream';
    if (!ALLOWED_MIME_TYPES.has(mime) && !mime.startsWith('image/')) {
      return NextResponse.json(
        { error: `File type ${mime} is not supported. Please upload an image or PDF/document.` },
        { status: 400 }
      );
    }

    const companyId = authUser?.tenantId || authUser?.workspaceId || 'workspace';
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${timestamp}_${sanitizedName}`;

    const { url, path } = await uploadFile({
      bucket: STORAGE_BUCKETS.crmFiles,
      file,
      companyId,
      folder: 'inbox-attachments',
      fileName,
      contentType: mime,
    });

    return NextResponse.json({
      success: true,
      url,
      path,
      fileName: file.name,
      fileSize: file.size,
      mimeType: mime,
    });
  } catch (error) {
    console.error('[Omnichannel Upload] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process file upload. Please try again.' },
      { status: 500 }
    );
  }
}

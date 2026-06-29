import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { uploadFile, STORAGE_BUCKETS, type StorageBucket, isS3Configured, ensureS3Bucket } from '@/lib/supabase-storage'
import { db } from '@/lib/db'
import { randomUUID } from 'crypto'
import path from 'path'

/**
 * POST /api/upload
 * Multipart file upload with S3 → Supabase → local fallback.
 *
 * Storage priority:
 *   1. AWS S3 (if AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY + AWS_S3_BUCKET configured)
 *   2. Supabase Storage (if NEXT_PUBLIC_SUPABASE_URL + keys configured)
 *   3. Local filesystem (public/uploads/...)
 *
 * FormData fields:
 *   - file           (File)     – required
 *   - bucket         (string)   – optional, defaults to "template-assets"
 *   - folder         (string)   – optional, defaults to "general"
 *   - saveToLibrary  (string)   – optional, "true" (default) or "false"
 *
 * Returns { url, name, mediaType, size, path, imageLibraryId?, storage? }
 */

// Auto-ensure S3 bucket on first upload (one-time setup)
let s3BucketEnsured = false

const ALLOWED_MIME = [
  'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf',
  'video/mp4',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'text/csv',
  'text/plain',
]

const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided (field name must be "file")' }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 })
    }

    if (!ALLOWED_MIME.includes(file.type)) {
      return NextResponse.json(
        { error: `File type "${file.type}" not allowed. Allowed: images, PDF, MP4, Word, Excel, CSV, ZIP, TXT.` },
        { status: 400 }
      )
    }

    // Resolve bucket & folder
    const rawBucket = (formData.get('bucket') as string) || 'template-assets'
    const folder = (formData.get('folder') as string) || 'general'
    const saveToLibrary = (formData.get('saveToLibrary') as string) !== 'false'

    const validBuckets = Object.values(STORAGE_BUCKETS) as readonly string[]
    const bucket: StorageBucket = validBuckets.includes(rawBucket)
      ? (rawBucket as StorageBucket)
      : 'template-assets'

    const companyId = user.tenantId || 'default'  // Storage path prefix (folder org)
    const imageLibraryTenantId = user.tenantId || null  // DB: null = global/shared

    // Generate a unique filename to avoid collisions
    const ext = path.extname(file.name) || `.${file.type.split('/')[1]}`
    const uniqueName = `${randomUUID()}${ext}`

    // Auto-ensure S3 bucket on first upload
    if (isS3Configured() && !s3BucketEnsured) {
      const result = await ensureS3Bucket()
      s3BucketEnsured = result.ok
      if (!result.ok) {
        console.warn('[Upload] S3 bucket setup failed:', result.message)
      }
    }

    // Upload via the storage helper (S3 → Supabase → local fallback)
    const { path: filePath, url } = await uploadFile({
      bucket,
      file,
      companyId,
      folder,
      fileName: uniqueName,
      contentType: file.type,
    })

    // Determine which storage was actually used
    const storage = isS3Configured() ? 's3' : (isSupabaseStorageConfigured() ? 'supabase' : 'local')
    let imageLibraryId: string | undefined
    let dbWarning: string | undefined

    // Save a record in the ImageLibrary table for the vault
    if (saveToLibrary) {
      try {
        const record = await db.imageLibrary.create({
          data: {
            tenantId: imageLibraryTenantId,
            name: file.name,
            url,
            folder,
            mediaType: file.type,
            size: file.size,
            uploadedBy: user.id,
          },
        })
        imageLibraryId = record.id
      } catch (dbErr) {
        // Log the full error so we can diagnose RLS / schema issues
        const errMsg = dbErr instanceof Error ? dbErr.message : String(dbErr)
        console.error('[Upload] ImageLibrary record failed:', errMsg)

        // If this is an RLS error on Supabase, provide a clear hint
        if (errMsg.includes('new row violates row-level security') || errMsg.includes('policy')) {
          console.error('[Upload] HINT: Run this SQL in Supabase SQL Editor:')
          console.error('[Upload]   ALTER TABLE "ImageLibrary" ENABLE ROW LEVEL SECURITY;')
          console.error('[Upload]   CREATE POLICY "service_role_all_ImageLibrary" ON "ImageLibrary" FOR ALL USING (auth.role() = \'service_role\') WITH CHECK (auth.role() = \'service_role\');')
        }

        // Return a warning so the client knows the DB save failed
        dbWarning = 'File uploaded to storage but ImageLibrary DB record failed: ' + errMsg
      }
    }

    return NextResponse.json(
      {
        url,
        name: file.name,
        mediaType: file.type,
        size: file.size,
        path: filePath,
        imageLibraryId,
        storage,
        warning: dbWarning,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
  }
}

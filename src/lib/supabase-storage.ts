/**
 * Unified Storage Helper
 *
 * Server-side utilities for file uploads with priority:
 *   1. AWS S3 (if configured)  ← PRIMARY
 *   2. Supabase Storage (if configured)
 *   3. Local filesystem fallback (public/uploads/...)
 */

import { getSupabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase'
import { writeFile, mkdir, unlink, readdir, stat } from 'fs/promises'
import path from 'path'
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketCorsCommand,
  PutPublicAccessBlockCommand,
  PutBucketPolicyCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl as getSignedUrlS3 } from '@aws-sdk/s3-request-presigner'

// ── AWS S3 Client (lazy-init) ──────────────────────────────────────────────

let _s3Client: S3Client | null = null
let _s3Configured: boolean | null = null

function getS3Client(): S3Client | null {
  if (_s3Client) return _s3Client
  const region = process.env.AWS_REGION || 'us-east-1'
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY

  if (!accessKeyId || !secretAccessKey) return null

  _s3Client = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  })
  return _s3Client
}

export function isS3Configured(): boolean {
  if (_s3Configured !== null) return _s3Configured
  const configured = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_S3_BUCKET)
  _s3Configured = configured
  return configured
}

function getS3Bucket(): string {
  return process.env.AWS_S3_BUCKET || 'serviceos-uploads'
}

function getS3Region(): string {
  return process.env.AWS_REGION || 'us-east-1'
}

// ── Bucket Constants ────────────────────────────────────────────────────────

export const STORAGE_BUCKETS = {
  avatars: 'avatars',
  companyAssets: 'company-assets',
  crmFiles: 'crm-files',
  jobAttachments: 'job-attachments',
  invoiceFiles: 'invoice-files',
  templateAssets: 'template-assets',
  campaignAssets: 'campaign-assets',
  exports: 'exports',
} as const

export type StorageBucket = typeof STORAGE_BUCKETS[keyof typeof STORAGE_BUCKETS]

// ── Helper ──────────────────────────────────────────────────────────────────

export function isSupabaseStorageConfigured(): boolean {
  return isSupabaseAdminConfigured()
}

// ── Upload ──────────────────────────────────────────────────────────────────

export interface UploadFileParams {
  bucket: StorageBucket
  file: File | Buffer
  companyId: string
  folder: string
  fileName: string
  contentType: string
}

export async function uploadFile(
  params: UploadFileParams
): Promise<{ path: string; url: string }> {
  const { bucket, file, companyId, folder, fileName, contentType } = params
  const storagePath = `${companyId}/${folder}/${fileName}`

  // ── Priority 1: AWS S3 ──────────────────────────────────────────────────
  if (isS3Configured()) {
    try {
      const client = getS3Client()!
      const arrayBuffer = file instanceof File ? await file.arrayBuffer() : file
      const s3Key = `${bucket}/${storagePath}`

      await client.send(
        new PutObjectCommand({
          Bucket: getS3Bucket(),
          Key: s3Key,
          Body: Buffer.from(arrayBuffer),
          ContentType: contentType,
          ACL: 'public-read', // Make uploaded files publicly accessible
        })
      )

      const url = getS3PublicUrl(s3Key)
      console.log(`[Storage] Uploaded to S3: ${s3Key}`)
      return { path: storagePath, url }
    } catch (err) {
      console.error('[Storage] S3 upload error:', err instanceof Error ? err.message : err)
      // Fall through to Supabase or local
    }
  }

  // ── Priority 2: Supabase Storage ────────────────────────────────────────
  if (isSupabaseStorageConfigured()) {
    const supabaseAdmin = getSupabaseAdmin()!
    const arrayBuffer = file instanceof File ? await file.arrayBuffer() : file
    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(storagePath, arrayBuffer, { contentType, upsert: true })

    if (error) {
      console.error('[Storage] Supabase upload error:', error.message)
      // Fall through to local fallback
    } else {
      const url = getPublicUrl(bucket, storagePath)
      return { path: storagePath, url }
    }
  }

  // ── Priority 3: Local filesystem fallback ───────────────────────────────
  const localDir = path.join(
    process.cwd(),
    'public',
    'uploads',
    bucket,
    companyId,
    folder
  )
  await mkdir(localDir, { recursive: true })

  const localPath = path.join(localDir, fileName)
  const bytes = file instanceof File ? await file.arrayBuffer() : file
  await writeFile(localPath, Buffer.from(bytes))

  const url = `/uploads/${bucket}/${storagePath}`
  return { path: storagePath, url }
}

// ── S3 Public URL ───────────────────────────────────────────────────────────

function getS3PublicUrl(key: string): string {
  const bucket = getS3Bucket()
  const region = getS3Region()
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`
}

// ── Signed URL ──────────────────────────────────────────────────────────────

export async function getSignedUrl(
  bucket: StorageBucket,
  filePath: string,
  expiresIn = 3600
): Promise<string | null> {
  // Priority 1: S3 signed URL
  if (isS3Configured()) {
    try {
      const client = getS3Client()!
      const s3Key = `${bucket}/${filePath}`

      const command = new GetObjectCommand({
        Bucket: getS3Bucket(),
        Key: s3Key,
      })

      return await getSignedUrlS3(client, command, { expiresIn })
    } catch (err) {
      console.error('[Storage] S3 signed URL error:', err instanceof Error ? err.message : err)
    }
  }

  // Priority 2: Supabase signed URL
  if (isSupabaseStorageConfigured()) {
    const supabaseAdmin = getSupabaseAdmin()!
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn)

    if (error) {
      console.error('[Storage] Supabase signed URL error:', error.message)
      return null
    }

    return data?.signedUrl ?? null
  }

  return null
}

// ── Public URL ──────────────────────────────────────────────────────────────

export function getPublicUrl(bucket: StorageBucket, filePath: string): string {
  // Priority 1: S3 public URL
  if (isS3Configured()) {
    return getS3PublicUrl(`${bucket}/${filePath}`)
  }

  // Priority 2: Supabase public URL
  if (isSupabaseStorageConfigured()) {
    const supabaseAdmin = getSupabaseAdmin()!
    const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(filePath)
    return data?.publicUrl ?? `/uploads/${bucket}/${filePath}`
  }

  // Priority 3: Local path
  return `/uploads/${bucket}/${filePath}`
}

// ── Delete ──────────────────────────────────────────────────────────────────

export async function deleteFile(
  bucket: StorageBucket,
  filePath: string
): Promise<boolean> {
  // Priority 1: S3
  if (isS3Configured()) {
    try {
      const client = getS3Client()!
      const s3Key = `${bucket}/${filePath}`

      await client.send(
        new DeleteObjectCommand({
          Bucket: getS3Bucket(),
          Key: s3Key,
        })
      )
      console.log(`[Storage] Deleted from S3: ${s3Key}`)
      return true
    } catch (err) {
      console.error('[Storage] S3 delete error:', err instanceof Error ? err.message : err)
      // Fall through to try other storages
    }
  }

  // Priority 2: Supabase
  if (isSupabaseStorageConfigured()) {
    const supabaseAdmin = getSupabaseAdmin()!
    const { error } = await supabaseAdmin.storage.from(bucket).remove([filePath])
    if (!error) return true
    console.error('[Storage] Supabase delete error:', error.message)
  }

  // Priority 3: Local filesystem
  try {
    const localPath = path.join(process.cwd(), 'public', 'uploads', bucket, filePath)
    await unlink(localPath)
    return true
  } catch (err) {
    // ENOENT means file doesn't exist locally — that's OK (may only exist in S3/Supabase)
    if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
      return true
    }
    console.error('[Storage] Local delete error:', err)
    return false
  }
}

// ── List Files ──────────────────────────────────────────────────────────────

export interface StorageFileInfo {
  name: string
  path: string
  size: number
  contentType: string
  createdAt: string
}

export async function listFiles(
  bucket: StorageBucket,
  companyId: string,
  folder?: string
): Promise<StorageFileInfo[]> {
  const prefix = folder ? `${companyId}/${folder}` : companyId

  // Priority 1: S3
  if (isS3Configured()) {
    try {
      const client = getS3Client()!
      const s3Prefix = `${bucket}/${prefix}`

      const response = await client.send(
        new ListObjectsV2Command({
          Bucket: getS3Bucket(),
          Prefix: s3Prefix,
          MaxKeys: 1000,
        })
      )

      if (response.Contents && response.Contents.length > 0) {
        return response.Contents.filter((obj) => obj.Key && !obj.Key.endsWith('/')).map((obj) => {
          const key = obj.Key!
          const name = key.split('/').pop() || key
          const relativePath = key.replace(`${bucket}/`, '')
          return {
            name,
            path: relativePath,
            size: obj.Size ?? 0,
            contentType: guessContentType(name),
            createdAt: obj.LastModified?.toISOString() ?? new Date().toISOString(),
          }
        })
      }
    } catch (err) {
      console.error('[Storage] S3 list error:', err instanceof Error ? err.message : err)
      // Fall through
    }
  }

  // Priority 2: Supabase
  if (isSupabaseStorageConfigured()) {
    const supabaseAdmin = getSupabaseAdmin()!
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .list(prefix, { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } })

    if (error) {
      console.error('[Storage] Supabase list error:', error.message)
    } else if (data) {
      return data
        .filter((item) => item.id)
        .map((item) => ({
          name: item.name,
          path: `${prefix}/${item.name}`,
          size: item.metadata?.size ?? 0,
          contentType: item.metadata?.mimetype ?? 'application/octet-stream',
          createdAt: item.created_at ?? new Date().toISOString(),
        }))
    }
  }

  // Priority 3: Local filesystem
  try {
    const localDir = path.join(process.cwd(), 'public', 'uploads', bucket, prefix)
    const entries = await readdir(localDir)
    const files: StorageFileInfo[] = []

    for (const entry of entries) {
      const fullPath = path.join(localDir, entry)
      const info = await stat(fullPath)
      if (info.isFile()) {
        files.push({
          name: entry,
          path: `${prefix}/${entry}`,
          size: info.size,
          contentType: guessContentType(entry),
          createdAt: info.mtime.toISOString(),
        })
      }
    }

    return files
  } catch {
    return []
  }
}

// ── Internal ────────────────────────────────────────────────────────────────

function guessContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase()
  const map: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.mp4': 'video/mp4',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  }
  return map[ext] ?? 'application/octet-stream'
}

// ── S3 Bucket Setup Helper ─────────────────────────────────────────────────
/**
 * Ensures the S3 bucket exists and has proper CORS + public read policy.
 * Called on first upload attempt if needed.
 */
export async function ensureS3Bucket(): Promise<{ ok: boolean; message: string }> {
  if (!isS3Configured()) {
    return { ok: false, message: 'S3 not configured (missing AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, or AWS_S3_BUCKET)' }
  }

  try {
    const client = getS3Client()!
    const bucket = getS3Bucket()

    // Check if bucket exists
    try {
      await client.send(new HeadBucketCommand({ Bucket: bucket }))
      console.log(`[Storage] S3 bucket "${bucket}" already exists`)
    } catch {
      // Bucket doesn't exist — create it
      console.log(`[Storage] Creating S3 bucket "${bucket}"...`)
      await client.send(new CreateBucketCommand({
        Bucket: bucket,
        ObjectOwnership: 'ObjectWriter',
      }))
      console.log(`[Storage] S3 bucket "${bucket}" created`)
    }

    // Disable block public access (so ACL: public-read works)
    try {
      await client.send(new PutPublicAccessBlockCommand({
        Bucket: bucket,
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: false,
          IgnorePublicAcls: false,
          BlockPublicPolicy: false,
          RestrictPublicBuckets: false,
        },
      }))
    } catch (err) {
      console.warn('[Storage] Could not disable public access block:', err instanceof Error ? err.message : err)
    }

    // Set bucket policy for public read
    const bucketPolicy = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'PublicReadGetObject',
          Effect: 'Allow',
          Principal: '*',
          Action: 's3:GetObject',
          Resource: `arn:aws:s3:::${bucket}/*`,
        },
      ],
    }

    try {
      await client.send(new PutBucketPolicyCommand({
        Bucket: bucket,
        Policy: JSON.stringify(bucketPolicy),
      }))
      console.log(`[Storage] Public read policy set on bucket "${bucket}"`)
    } catch (err) {
      console.warn('[Storage] Could not set bucket policy:', err instanceof Error ? err.message : err)
    }

    // Set CORS configuration
    const corsConfig = {
      CORSRules: [
        {
          AllowedHeaders: ['*'],
          AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE'],
          AllowedOrigins: ['*'],
          ExposeHeaders: ['ETag', 'x-amz-request-id'],
          MaxAgeSeconds: 3600,
        },
      ],
    }

    try {
      await client.send(new PutBucketCorsCommand({
        Bucket: bucket,
        CORSConfiguration: corsConfig,
      }))
      console.log(`[Storage] CORS configuration set on bucket "${bucket}"`)
    } catch (err) {
      console.warn('[Storage] Could not set CORS:', err instanceof Error ? err.message : err)
    }

    return { ok: true, message: `S3 bucket "${bucket}" is ready (exists, public read, CORS configured)` }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[Storage] S3 bucket setup error:', message)
    return { ok: false, message: `S3 bucket setup failed: ${message}` }
  }
}

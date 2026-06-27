/**
 * Supabase Storage Helper
 *
 * Server-side utilities for file uploads via Supabase Storage.
 * Falls back to the local filesystem (/public/uploads/...) when
 * Supabase is not configured.
 */

import { getSupabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase'
import { writeFile, mkdir, unlink, readdir, stat } from 'fs/promises'
import path from 'path'

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

  // ── Local filesystem fallback ───────────────────────────────────────────
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

// ── Signed URL ──────────────────────────────────────────────────────────────

export async function getSignedUrl(
  bucket: StorageBucket,
  filePath: string,
  expiresIn = 3600
): Promise<string | null> {
  if (!isSupabaseStorageConfigured()) return null

  const supabaseAdmin = getSupabaseAdmin()!
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(filePath, expiresIn)

  if (error) {
    console.error('[Storage] Signed URL error:', error.message)
    return null
  }

  return data?.signedUrl ?? null
}

// ── Public URL ──────────────────────────────────────────────────────────────

export function getPublicUrl(bucket: StorageBucket, filePath: string): string {
  if (isSupabaseStorageConfigured()) {
    const supabaseAdmin = getSupabaseAdmin()!
    const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(filePath)
    return data?.publicUrl ?? `/uploads/${bucket}/${filePath}`
  }

  return `/uploads/${bucket}/${filePath}`
}

// ── Delete ──────────────────────────────────────────────────────────────────

export async function deleteFile(
  bucket: StorageBucket,
  filePath: string
): Promise<boolean> {
  if (isSupabaseStorageConfigured()) {
    const supabaseAdmin = getSupabaseAdmin()!
    const { error } = await supabaseAdmin.storage.from(bucket).remove([filePath])
    if (error) {
      console.error('[Storage] Supabase delete error:', error.message)
      // Fall through to local fallback
    } else {
      return true
    }
  }

  // ── Local filesystem fallback ───────────────────────────────────────────
  try {
    const localPath = path.join(process.cwd(), 'public', 'uploads', bucket, filePath)
    await unlink(localPath)
    return true
  } catch (err) {
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

  if (isSupabaseStorageConfigured()) {
    const supabaseAdmin = getSupabaseAdmin()!
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .list(prefix, { limit: 1000, sortBy: { column: 'created_at', order: 'desc' } })

    if (error) {
      console.error('[Storage] Supabase list error:', error.message)
      // Fall through to local fallback
    } else if (data) {
      return data
        .filter((item) => item.id) // skip folders (items without an id)
        .map((item) => ({
          name: item.name,
          path: `${prefix}/${item.name}`,
          size: item.metadata?.size ?? 0,
          contentType: item.metadata?.mimetype ?? 'application/octet-stream',
          createdAt: item.created_at ?? new Date().toISOString(),
        }))
    }
  }

  // ── Local filesystem fallback ───────────────────────────────────────────
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

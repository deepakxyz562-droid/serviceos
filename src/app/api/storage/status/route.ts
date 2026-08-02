import { NextResponse } from 'next/server'
import { isS3Configured, ensureS3Bucket, isSupabaseStorageConfigured } from '@/lib/supabase-storage'

/**
 * GET /api/storage/status
 * Returns the current storage configuration status.
 * Used by super-admin dashboard to show storage provider info.
 */
export async function GET() {
  const s3Configured = isS3Configured()
  const supabaseConfigured = isSupabaseStorageConfigured()

  // Determine active storage provider
  let activeProvider: 's3' | 'supabase' | 'local'
  if (s3Configured) {
    activeProvider = 's3'
  } else if (supabaseConfigured) {
    activeProvider = 'supabase'
  } else {
    activeProvider = 'local'
  }

  const status: {
    activeProvider: string
    providers: {
      s3: { configured: boolean; bucket?: string; region?: string }
      supabase: { configured: boolean }
      local: { configured: boolean; path: string }
    }
    bucketSetup?: { ok: boolean; message: string }
  } = {
    activeProvider,
    providers: {
      s3: {
        configured: s3Configured,
        ...(s3Configured ? {
          bucket: process.env.AWS_S3_BUCKET,
          region: process.env.AWS_REGION || 'us-east-1',
        } : {}),
      },
      supabase: { configured: supabaseConfigured },
      local: {
        configured: true, // Always available as fallback
        path: '/public/uploads/',
      },
    },
  }

  // If S3 is configured, check bucket setup status
  if (s3Configured) {
    const bucketResult = await ensureS3Bucket()
    status.bucketSetup = bucketResult
  }

  return NextResponse.json(status)
}

/**
 * POST /api/storage/status
 * Manually trigger S3 bucket setup (create bucket, set policy, set CORS).
 */
export async function POST() {
  const result = await ensureS3Bucket()
  return NextResponse.json(result)
}

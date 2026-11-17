import { NextRequest, NextResponse } from 'next/server';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import { purgeSupabaseStorageBucket } from '@/lib/supabase-storage';
import { db } from '@/lib/db';

const TARGET_BUCKETS = [
  'bgos-business-images',
  'template-assets',
  'campaign-assets',
  'company-assets',
];

export async function POST(request: NextRequest) {
  try {
    const isSuperAdmin = await isSuperAdminRequest();
    // Also allow execution if private maintenance token is passed in header
    const maintHeader = request.headers.get('x-maintenance-key');
    const isValidToken = maintHeader && maintHeader === (process.env.INTERNAL_API_SECRET || process.env.CRON_SECRET);

    if (!isSuperAdmin && !isValidToken) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const results: Record<string, { deleted: number; errors: string[] }> = {};
    let totalDeleted = 0;

    for (const bucket of TARGET_BUCKETS) {
      const res = await purgeSupabaseStorageBucket(bucket);
      results[bucket] = res;
      totalDeleted += res.deleted;
    }

    // Clean up DB records pointing to Supabase storage
    let dbDeletedCount = 0;
    try {
      const dbRes = await db.imageLibrary?.deleteMany?.({
        where: {
          OR: [
            { url: { contains: 'supabase.co' } },
            { url: { contains: '/storage/v1/object/public' } },
          ],
        },
      });
      dbDeletedCount = dbRes?.count || 0;
    } catch (dbErr) {
      console.warn('[clean-supabase-storage] DB delete error:', dbErr);
    }

    return NextResponse.json({
      success: true,
      message: `Cleaned ${totalDeleted} files from Supabase Storage and ${dbDeletedCount} DB records.`,
      storageResults: results,
      dbDeletedCount,
    });
  } catch (error) {
    console.error('[clean-supabase-storage] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

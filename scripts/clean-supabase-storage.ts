/**
 * Cleanup Script: Clean all images stored in Supabase Storage buckets
 * and remove any database ImageLibrary records referencing Supabase storage.
 *
 * Usage:
 *   npx tsx scripts/clean-supabase-storage.ts
 */

import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.log('[CleanSupabase] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  console.log('[CleanSupabase] Supabase is not configured or already detached.');
  process.exit(0);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const prisma = new PrismaClient();

const TARGET_BUCKETS = [
  'bgos-business-images',
  'template-assets',
  'campaign-assets',
  'company-assets',
];

async function listAllFiles(bucket: string, dir = ''): Promise<string[]> {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .list(dir, { limit: 1000 });

  if (error) {
    console.warn(`[CleanSupabase] Could not list bucket "${bucket}" dir "${dir}":`, error.message);
    return [];
  }

  if (!data || data.length === 0) return [];

  const files: string[] = [];
  for (const item of data) {
    const itemPath = dir ? `${dir}/${item.name}` : item.name;
    if (!item.id || item.metadata === null) {
      // folder
      const nested = await listAllFiles(bucket, itemPath);
      files.push(...nested);
    } else {
      files.push(itemPath);
    }
  }
  return files;
}

async function main() {
  console.log('========================================================');
  console.log(' Starting Supabase Storage Cleanup for Business Images  ');
  console.log('========================================================');

  let totalDeletedFiles = 0;

  for (const bucket of TARGET_BUCKETS) {
    console.log(`\nChecking Supabase storage bucket: "${bucket}"...`);
    try {
      const files = await listAllFiles(bucket);
      if (files.length === 0) {
        console.log(`  Bucket "${bucket}" is clean (0 files).`);
        continue;
      }

      console.log(`  Found ${files.length} file(s) in "${bucket}". Purging...`);
      for (let i = 0; i < files.length; i += 100) {
        const batch = files.slice(i, i + 100);
        const { data, error } = await supabaseAdmin.storage.from(bucket).remove(batch);
        if (error) {
          console.error(`  Error removing batch from "${bucket}":`, error.message);
        } else {
          const count = data?.length || batch.length;
          totalDeletedFiles += count;
          console.log(`  Deleted ${count} files from "${bucket}".`);
        }
      }
    } catch (err) {
      console.warn(`  Bucket "${bucket}" check error (may not exist in Supabase):`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\nTotal files deleted from Supabase Storage: ${totalDeletedFiles}`);

  // Purge any ImageLibrary database records pointing to Supabase storage
  try {
    const deletedDbRows = await prisma.imageLibrary.deleteMany({
      where: {
        OR: [
          { url: { contains: 'supabase.co' } },
          { url: { contains: '/storage/v1/object/public' } },
        ],
      },
    });
    console.log(`\nDeleted ${deletedDbRows.count} ImageLibrary DB records pointing to Supabase Storage.`);
  } catch (dbErr) {
    console.warn('\nImageLibrary DB cleanup warning:', dbErr instanceof Error ? dbErr.message : dbErr);
  } finally {
    await prisma.$disconnect();
  }

  console.log('\n========================================================');
  console.log(' Supabase Storage Cleanup Complete!                     ');
  console.log('========================================================');
}

main().catch((err) => {
  console.error('Fatal error during Supabase storage cleanup:', err);
  process.exit(1);
});

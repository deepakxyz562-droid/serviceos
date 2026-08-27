/**
 * GET /sitemap1.xml
 * ==================
 *
 * Serves bucket 1 (businesses where SHA-256(tenantId) % 4 === 1).
 *
 * This is a STATIC FILE served from /tmp or Supabase Storage — NO DB queries.
 * The daily cron generates this file. First request after deploy may 404
 * until the cron runs.
 *
 * Submit this URL directly in Google Search Console.
 */

import { serveSitemapFile } from '@/app/sitemap-helpers';

export const revalidate = 3600; // 1h ISR

export async function GET() {
  return serveSitemapFile(1);
}

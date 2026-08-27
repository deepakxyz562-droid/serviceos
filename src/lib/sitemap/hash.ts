/**
 * Sitemap hash — deterministic file assignment.
 *
 * Each tenant is permanently assigned to one of 4 sitemap files based on:
 *   bucket = SHA-256(tenantId)[0] % 4      (0-3)
 *   fileNumber = bucket                     (0-3)
 *
 * File layout (simple URLs, no index):
 *   sitemap.xml    → bucket 0 (static URLs + businesses where hash % 4 === 0)
 *   sitemap1.xml   → bucket 1 (businesses where hash % 4 === 1)
 *   sitemap2.xml   → bucket 2 (businesses where hash % 4 === 2)
 *   sitemap3.xml   → bucket 3 (businesses where hash % 4 === 3)
 *
 * This guarantees:
 *   - A tenant ALWAYS stays in the same sitemap file (stable across regenerations)
 *   - Adding a new tenant NEVER shifts other tenants between files
 *   - Only the file containing the changed tenant needs regeneration
 *   - Each file has ~23,500 URLs (94K / 4) — well under Google's 50K limit
 */
import { createHash } from 'crypto';

export const BUSINESS_FILE_COUNT = 4; // 4 buckets (0-3)
export const TOTAL_SITEMAP_FILES = 4; // sitemap.xml + sitemap1-3.xml

/**
 * Compute the sitemap file number (0-3) for a given tenant ID.
 * Uses SHA-256 for uniform distribution across the 4 buckets.
 *
 * File 0 = sitemap.xml (also contains static URLs)
 * File 1 = sitemap1.xml
 * File 2 = sitemap2.xml
 * File 3 = sitemap3.xml
 */
export function getSitemapFileNumber(tenantId: string): number {
  const hash = createHash('sha256').update(tenantId).digest();
  return hash[0] % BUSINESS_FILE_COUNT; // 0-3
}

/**
 * Get ALL business file numbers (0-3). Used for full regenerations.
 */
export function getAllBusinessFileNumbers(): number[] {
  return Array.from({ length: BUSINESS_FILE_COUNT }, (_, i) => i);
}

/**
 * Convert a file number (0-3) to the URL filename.
 * File 0 → 'sitemap.xml'
 * File 1 → 'sitemap1.xml'
 * File 2 → 'sitemap2.xml'
 * File 3 → 'sitemap3.xml'
 */
export function getSitemapFileName(fileNumber: number): string {
  if (fileNumber === 0) return 'sitemap.xml';
  return `sitemap${fileNumber}.xml`;
}

/**
 * Convert a filename to a file number.
 * 'sitemap.xml' → 0
 * 'sitemap1.xml' → 1
 * 'sitemap2.xml' → 2
 * 'sitemap3.xml' → 3
 */
export function getSitemapFileNumberFromName(fileName: string): number {
  if (fileName === 'sitemap.xml') return 0;
  const match = fileName.match(/^sitemap(\d+)\.xml$/);
  if (match) return parseInt(match[1], 10);
  return 0;
}

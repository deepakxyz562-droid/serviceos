/**
 * Sitemap hash — deterministic file assignment.
 *
 * Each tenant is permanently assigned to one of 10 sitemap files based on:
 *   bucket = SHA-256(tenantId)[0] % 10      (0-9)
 *   fileNumber = bucket + 1                  (1-10)
 *
 * This guarantees:
 *   - A tenant ALWAYS stays in the same sitemap file (stable across regenerations)
 *   - Adding a new tenant NEVER shifts other tenants between files
 *   - Only the file containing the changed tenant needs regeneration
 *
 * File layout:
 *   0.xml       — static URLs (services, blog, legal, etc.) — NOT hash-based
 *   1.xml..10.xml — business URLs, split by SHA-256(tenantId) % 10
 */
import { createHash } from 'crypto';

export const BUSINESS_FILE_COUNT = 10; // files 1..10
export const TOTAL_SITEMAP_FILES = 11; // 0 (static) + 1..10 (business)

/**
 * Compute the sitemap file number (1-10) for a given tenant ID.
 * Uses SHA-256 for uniform distribution across the 10 buckets.
 */
export function getSitemapFileNumber(tenantId: string): number {
  const hash = createHash('sha256').update(tenantId).digest();
  const bucket = hash[0] % BUSINESS_FILE_COUNT; // 0-9
  return bucket + 1; // 1-10
}

/**
 * Get ALL business file numbers (1-10). Used for full regenerations.
 */
export function getAllBusinessFileNumbers(): number[] {
  return Array.from({ length: BUSINESS_FILE_COUNT }, (_, i) => i + 1);
}

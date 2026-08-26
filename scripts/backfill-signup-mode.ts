/**
 * Backfill script: set signupMode='crm_trial' on existing CRM-registered tenants.
 * ============================================================================
 *
 * PROBLEM
 * -------
 * The `/api/auth/register` and `/api/auth/google/callback` routes previously
 * created tenants with `signupMode = NULL` (the field was added to the schema
 * but never populated by the registration routes). This made CRM-registered
 * tenants indistinguishable from "legacy / undecided" tenants in downstream
 * filters that check `signupMode === 'crm_trial'`.
 *
 * FIX
 * ---
 * Both registration routes now set `signupMode = 'crm_trial'`. This script
 * backfills existing tenants that were registered before the fix.
 *
 * BACKFILL CRITERIA
 * ----------------
 *   signupMode IS NULL
 *   AND listingTier = 'claimed'   ← marks a real registered business
 *   AND claimed = true            ← confirms the business was claimed by an owner
 *
 * Tenants that should NOT be touched:
 *   - listingTier='free' + claimed=false → unclaimed OSM/Google seed data (keep NULL)
 *   - listingTier='claimed_free'         → marketplace-only claims (signupMode='listing_only' already set)
 *   - signupMode IS NOT NULL             → already classified
 *
 * SAFETY
 * ------
 *   - DRY RUN mode (default): prints the tenants that WOULD be updated, no writes.
 *   - EXECUTE mode (--execute): performs the update.
 *   - Idempotent: safe to run multiple times.
 *
 * USAGE
 * -----
 *   bun run scripts/backfill-signup-mode.ts              # dry run (default)
 *   bun run scripts/backfill-signup-mode.ts --execute    # actual update
 *
 * PRODUCTION CHECK (before running --execute)
 * ------------------------------------------
 *   1. Take a Supabase backup (Project Settings → Backups → Create backup).
 *   2. Run dry-run mode and review the affected tenants.
 *   3. Run --execute.
 *   4. Verify: SELECT count(*) FROM "Tenant" WHERE "signupMode" IS NULL AND
 *      "listingTier" = 'claimed' AND "claimed" = true; → should return 0.
 */

// ─── Supabase credentials ─────────────────────────────────────────────────────
// Read the service role key from scripts/seed-supabase.ts to avoid drift
// between this script and the canonical credential source. The URL is stable
// and safe to hardcode; the key is sensitive and must match seed-supabase.ts.
import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = 'https://rmzaxqxzultxetlgsgic.supabase.co';
const SEED_FILE = join(process.cwd(), 'scripts', 'seed-supabase.ts');
const SEED_CONTENT = readFileSync(SEED_FILE, 'utf8');
const KEY_MATCH = SEED_CONTENT.match(/SERVICE_ROLE_KEY\s*=\s*'([^']+)'/);
if (!KEY_MATCH) {
  console.error('Could not extract SERVICE_ROLE_KEY from scripts/seed-supabase.ts');
  process.exit(1);
}
const SERVICE_ROLE_KEY = KEY_MATCH[1];
const REST_URL = `${SUPABASE_URL}/rest/v1`;

const DRY_RUN = !process.argv.includes('--execute');

interface Tenant {
  id: string;
  name: string;
  slug: string;
  email?: string;
  listingTier: string;
  claimed: boolean;
  signupMode: string | null;
  createdAt: string;
}

async function fetchMatchingTenants(): Promise<Tenant[]> {
  // Use PostgREST to fetch matching rows. We set a generous limit (10K) — the
  // expected match count is small (only claimed CRM tenants with NULL signupMode,
  // which is a handful at most). The WHERE clause uses indexed columns
  // (listingTier, claimed) so the query is fast despite the 91K-row table.
  const url = new URL(`${REST_URL}/Tenant`);
  url.searchParams.set('select', 'id,name,slug,email,listingTier,claimed,signupMode,createdAt');
  // Filter on listingTier first (indexed) — this narrows from 91K → ~hundreds.
  // Then claimed=true narrows further. signupMode IS NULL is applied last.
  url.searchParams.set('listingTier', 'eq.claimed');
  url.searchParams.set('claimed', 'eq.true');
  url.searchParams.set('signupMode', 'is.null');
  url.searchParams.set('order', 'createdAt.desc');
  url.searchParams.set('limit', '10000');

  const res = await fetch(url, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error(`Query failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as Tenant[];
}

async function countMatching(): Promise<number> {
  // Avoid COUNT(*) (which full-scans and times out on the 91K-row Tenant table).
  // Instead, fetch matching rows and count locally — the match set is small
  // (only claimed CRM tenants with NULL signupMode).
  const matches = await fetchMatchingTenants();
  return matches.length;
}

async function updateBatch(ids: string[]): Promise<number> {
  // PostgREST doesn't support IN with a long array directly in the URL — use
  // the `in()` filter with comma-separated values. For long lists we chunk.
  if (ids.length === 0) return 0;
  const url = new URL(`${REST_URL}/Tenant`);
  url.searchParams.set('signupMode', 'is.null');
  url.searchParams.set('listingTier', 'eq.claimed');
  url.searchParams.set('claimed', 'eq.true');
  // The `id` filter is the chunk of IDs to update this batch.
  url.searchParams.set('id', `in.(${ids.join(',')})`);

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ signupMode: 'crm_trial' }),
  });
  if (!res.ok) {
    throw new Error(`Update failed: ${res.status} ${await res.text()}`);
  }
  // PostgREST PATCH with return=minimal doesn't return rows; the re-checked
  // filters in the WHERE clause ensure only matching rows are updated.
  return ids.length;
}

async function main() {
  console.log('============================================================');
  console.log('  Backfill: signupMode = "crm_trial" for CRM tenants');
  console.log('============================================================');
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'EXECUTE (will update rows)'}`);
  console.log(`  Target: ${SUPABASE_URL}`);
  console.log('============================================================\n');

  const totalCount = await countMatching();
  console.log(`Tenants matching backfill criteria: ${totalCount}\n`);

  if (totalCount === 0) {
    console.log('No tenants need backfilling. Nothing to do.');
    return;
  }

  const matches = await fetchMatchingTenants();
  console.log('Matching tenants (up to 1000 shown):');
  console.log('-'.repeat(80));
  for (const t of matches.slice(0, 100)) {
    console.log(
      `  ${String(t.name).slice(0, 40).padEnd(40)}  slug=${t.slug}  created=${String(t.createdAt).slice(0, 10)}`,
    );
  }
  if (matches.length > 100) {
    console.log(`  ... and ${matches.length - 100} more`);
  }
  console.log('-'.repeat(80));
  console.log(`Total: ${matches.length}\n`);

  if (DRY_RUN) {
    console.log('DRY RUN — no rows were updated.');
    console.log('To execute the backfill, run:');
    console.log('  bun run scripts/backfill-signup-mode.ts --execute');
    return;
  }

  // ── Execute the backfill in batches of 100 ──────────────────────────────
  console.log('Executing backfill...\n');
  let updated = 0;
  const BATCH_SIZE = 100;
  for (let i = 0; i < matches.length; i += BATCH_SIZE) {
    const batch = matches.slice(i, i + BATCH_SIZE).map((t) => t.id);
    const count = await updateBatch(batch);
    updated += count;
    console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}: updated ${count} rows (cumulative: ${updated})`);
  }

  console.log(`\nBackfill complete. ${updated} tenant(s) updated to signupMode='crm_trial'.`);

  // ── Verify ──────────────────────────────────────────────────────────────
  const remaining = await countMatching();
  console.log(`\nVerification: ${remaining} tenant(s) still match backfill criteria (should be 0).`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

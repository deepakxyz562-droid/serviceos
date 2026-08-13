/**
 * Global Config Carrier Tenant
 *
 * WHY THIS EXISTS:
 * Global menu config (and other platform-wide settings) are stored as a JSON
 * key (`globalMenuConfig`) inside a Tenant row's `settingsJson` column. The
 * question is: WHICH tenant row should be the carrier?
 *
 * THE BUG THIS FIXES:
 * Previously, the carrier was selected with `db.tenant.findMany({ take: 1 })`
 * — NO orderBy. On Supabase (PostgREST), `SELECT * FROM "Tenant" LIMIT 1`
 * returns rows in ARBITRARY physical order. With multiple tenants in
 * production, the PUT handler would write to Tenant A (whichever PostgREST
 * returned first at that instant), and the immediate GET would land on
 * Tenant B (a different physical row) → Tenant B had no `globalMenuConfig`
 * → the GET's destructive auto-init wrote defaults (all enabled:true) to
 * Tenant B → the user's toggle appeared to revert.
 *
 * THE FIX:
 * Use a dedicated SENTINEL tenant named `[System] Global Menu Config`. This
 * tenant is NOT a real business — it exists solely to hold platform-wide
 * config. Selection is deterministic: `findFirst({ where: { name } })`
 * returns the same row on every Vercel instance, every request.
 *
 * The sentinel is auto-created on first access if it doesn't exist (handles
 * fresh databases + local dev). The user also created one manually in
 * Supabase (id `0cZCPusk...`) — `findFirst` by name will find it.
 */

import { db } from '@/lib/db';

export const SENTINEL_TENANT_NAME = '[System] Global Menu Config';
export const SENTINEL_TENANT_SLUG = 'system-global-menu-config';

// Unique-ish placeholder values so the sentinel never conflicts with real
// tenants. These fields are required by the schema but never used.
const SENTINEL_PLACEHOLDER_EMAIL = 'system-global-config@fieseros.internal';
const SENTINEL_PLACEHOLDER_PHONE = '+10000000000';

interface CarrierTenant {
  id: string;
  settingsJson: string;
}

type DbClient = typeof db | Parameters<Parameters<typeof db.$transaction>[0]>[0];

/**
 * Get the sentinel carrier tenant for global config storage.
 * Auto-creates it on first access if missing.
 *
 * Accepts an optional `client` parameter so it can be used inside a
 * `db.$transaction(async (tx) => ...)` callback — the `tx` client shares
 * the same Prisma proxy interface.
 *
 * Returns null only if the tenant cannot be created (DB unavailable).
 */
export async function getGlobalConfigCarrierTenant(
  client: DbClient = db
): Promise<CarrierTenant | null> {
  try {
    // 1. Deterministic lookup by name — same row on every instance/request.
    const existing = await client.tenant.findFirst({
      where: { name: SENTINEL_TENANT_NAME },
    });
    if (existing) {
      return {
        id: existing.id,
        settingsJson: existing.settingsJson ?? '{}',
      };
    }

    // 2. Auto-create on first access (fresh DB / local dev / migration gap).
    //    Use create() — the slug is unique so a concurrent create would throw,
    //    which we catch and fall back to a re-read.
    try {
      const created = await client.tenant.create({
        data: {
          name: SENTINEL_TENANT_NAME,
          slug: SENTINEL_TENANT_SLUG,
          email: SENTINEL_PLACEHOLDER_EMAIL,
          phone: SENTINEL_PLACEHOLDER_PHONE,
          plan: 'starter',
          planStatus: 'active',
          onboardingCompleted: true,
          settingsJson: '{}',
        },
      });
      console.log('[global-config-carrier] Created sentinel tenant:', created.id);
      return {
        id: created.id,
        settingsJson: '{}',
      };
    } catch (createError) {
      // Concurrent create (another instance won the race) — re-read.
      const fallback = await client.tenant.findFirst({
        where: { name: SENTINEL_TENANT_NAME },
      });
      if (fallback) {
        return {
          id: fallback.id,
          settingsJson: fallback.settingsJson ?? '{}',
        };
      }
      throw createError;
    }
  } catch (error) {
    console.error('[global-config-carrier] Failed to get/create carrier tenant:', error);
    return null;
  }
}

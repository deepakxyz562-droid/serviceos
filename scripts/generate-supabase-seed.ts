/**
 * scripts/generate-supabase-seed.ts
 *
 * Generates an idempotent Supabase/Postgres seed SQL file from the
 * marketplace seed data currently in the local SQLite database.
 *
 * Output: supabase-seed-marketplace.sql
 *
 * The generated SQL:
 *   - Uses INSERT ... ON CONFLICT DO NOTHING (idempotent — safe to re-run)
 *   - Escapes all string values as Postgres single-quoted literals
 *   - Converts JS Date / ISO strings to Postgres TIMESTAMP literals
 *   - Converts JS booleans to Postgres TRUE / FALSE
 *   - Converts null to NULL
 *   - Quotes column names to preserve Prisma's camelCase naming
 *
 * Run: bun run scripts/generate-supabase-seed.ts
 */

import { db } from '@/lib/db';
import { writeFileSync } from 'fs';

// ── Helpers ────────────────────────────────────────────────────────────────

/** Escape a JS value into a Postgres SQL literal. */
function sqlVal(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  if (v instanceof Date) return `'${v.toISOString()}'::TIMESTAMP(3)`;
  if (typeof v === 'string') {
    // Handle ISO date strings that should be timestamps
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v)) {
      return `'${v}'::TIMESTAMP(3)`;
    }
    // Escape single quotes by doubling them
    return `'${v.replace(/'/g, "''")}'`;
  }
  // Objects/arrays → stringify as JSON string
  try {
    return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
  } catch {
    return 'NULL';
  }
}

/** Quote a camelCase identifier (Prisma maps camelCase → "camelCase"). */
function q(col: string): string {
  return `"${col}"`;
}

/** Generate an idempotent INSERT block. */
function insertBlock(
  table: string,
  columns: string[],
  rows: Record<string, unknown>[],
): string {
  if (rows.length === 0) return `-- No rows for ${table}\n`;
  const cols = columns.map(q).join(', ');
  const values = rows
    .map((row) => `  (${columns.map((c) => sqlVal(row[c])).join(', ')})`)
    .join(',\n');

  // ON CONFLICT (id) DO NOTHING — idempotent re-runs
  return `INSERT INTO "${table}" (${cols}) VALUES
${values}
ON CONFLICT ("id") DO NOTHING;
`;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('Fetching marketplace seed data from SQLite...');

  // 1. Fetch all marketplace tenants + related data
  const tenants = await db.tenant.findMany({
    where: { marketplaceOptIn: true },
    orderBy: { createdAt: 'asc' },
  });
  const tenantIds = tenants.map((t) => t.id);

  const services = await db.service.findMany({
    where: { tenantId: { in: tenantIds } },
    orderBy: { createdAt: 'asc' },
  });
  // Null out FK fields that reference tables we do NOT seed (Job, Customer, Employee).
  // Marketplace reviews are standalone (authorName + source like Google) and do not
  // require a linked job/customer/employee. Keeping these non-null would cause
  // FK constraint failures when running the seed in a fresh Supabase DB.
  const reviews = (
    await db.review.findMany({
      where: { tenantId: { in: tenantIds } },
      orderBy: { createdAt: 'asc' },
    })
  ).map((r) => ({
    ...r,
    jobId: null,
    customerId: null,
    employeeId: null,
  }));
  const portfolio = await db.providerPortfolio.findMany({
    where: { tenantId: { in: tenantIds } },
    orderBy: { createdAt: 'asc' },
  });
  const certifications = await db.providerCertification.findMany({
    where: { tenantId: { in: tenantIds } },
    orderBy: { createdAt: 'asc' },
  });
  const featuredListings = await db.featuredListing.findMany({
    where: { tenantId: { in: tenantIds } },
    orderBy: { createdAt: 'asc' },
  });

  console.log(
    `Found: ${tenants.length} tenants, ${services.length} services, ${reviews.length} reviews, ${portfolio.length} portfolio items, ${certifications.length} certifications, ${featuredListings.length} featured listings`,
  );

  // 2. Build the SQL
  const header = `-- ====================================================================
-- FIESEROS — SUPABASE SEED DATA: MARKETPLACE PROVIDERS
-- Auto-generated from local SQLite database
-- Generated: ${new Date().toISOString()}
--
-- This seed file populates the marketplace with ${tenants.length} realistic
-- fictional service-provider businesses across multiple industries.
--
-- All providers have full marketplace eligibility:
--   marketplaceOptIn = true
--   identityVerified = true
--   businessVerified = true
--   insuranceVerified = true
--   stripeConnected = true (MOCK — uses acct_demo_* account IDs)
--   publicProfileEnabled = true
--   planStatus = 'active'
--
-- Idempotent: uses INSERT ... ON CONFLICT (id) DO NOTHING
--   → Safe to re-run any number of times
--   → Existing rows with matching IDs are left untouched
--
-- Run order: supabase-migration.sql FIRST (creates tables), then this file.
--
-- NOTE: Stripe Connect accounts are MOCK (acct_demo_*). To go live, replace
--       stripeAccountId with real Stripe Connect account IDs and set
--       STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET env vars.
-- ====================================================================

BEGIN;

`;

  // Tenant columns (all fields from the Prisma model)
  const tenantCols = [
    'id', 'name', 'slug', 'industry', 'logo', 'phone', 'email', 'address',
    'country', 'currency', 'whatsappPhone', 'whatsappConfigJson', 'plan',
    'planStatus', 'trialEndsAt', 'planStartedAt', 'planEndsAt', 'settingsJson',
    'onboardingCompleted', 'onboardingStep', 'suspendedAt', 'suspensionReason',
    'whiteLabelJson', 'region', 'mrr', 'arr', 'churnRate', 'identityVerified',
    'businessVerified', 'insuranceVerified', 'stripeConnected', 'stripeAccountId',
    'stripePayoutsEnabled', 'profileCompletionPct', 'marketplaceOptIn',
    'marketplaceTermsAcceptedAt', 'pricingType', 'callOutFee', 'travelFeePerKm',
    'emergencySurchargePct', 'weekendSurchargePct', 'emergencyServiceAvailable',
    'vatNumber', 'licenceNumber', 'insuranceProvider', 'insurancePolicyNumber',
    'insuranceExpiryDate', 'languagesJson', 'employeesCount',
    'businessCategoriesJson', 'publicProfileEnabled', 'publicSlug', 'city',
    'state', 'postalCode', 'tagline', 'description', 'coverImage', 'galleryJson',
    'businessHoursJson', 'serviceAreasJson', 'socialLinksJson', 'faqsJson',
    'rating', 'reviewCount', 'seoTitle', 'seoDescription', 'createdAt', 'updatedAt',
  ];

  const serviceCols = [
    'id', 'name', 'description', 'longDescription', 'slug', 'image', 'category',
    'basePrice', 'duration', 'icon', 'isActive', 'isPublic', 'checklistId',
    'tenantId', 'createdAt', 'updatedAt',
  ];

  const reviewCols = [
    'id', 'rating', 'comment', 'authorName', 'source', 'status', 'responseJson',
    'externalUrl', 'npsScore', 'googleReviewId', 'reviewUrl', 'jobId',
    'customerId', 'employeeId', 'tenantId', 'createdAt', 'updatedAt',
  ];

  // IMPORTANT: column lists must match the CURRENT Prisma schema field names.
  // These 3 models were refactored (individual fields → JSON blobs, columns renamed).
  // The old lists referenced stale field names that no longer exist.
  const portfolioCols = [
    'id', 'tenantId', 'itemsJson', 'videosJson', 'awardsJson', 'projectsJson',
    'teamJson', 'isActive', 'createdAt', 'updatedAt',
  ];

  // verifiedById excluded — it's a FK to User which we do not seed.
  // All existing rows have verifiedById = NULL anyway.
  const certCols = [
    'id', 'tenantId', 'name', 'issuer', 'issueDate', 'expiryDate',
    'certificateNumber', 'documentUrl', 'isVerified', 'verifiedAt',
    'createdAt', 'updatedAt',
  ];

  const featuredCols = [
    'id', 'tenantId', 'type', 'priority', 'startDate', 'endDate', 'isActive',
    'amountCharged', 'currency', 'paymentRef', 'metadataJson', 'createdAt',
    'updatedAt',
  ];

  const body = [
    `-- ════════════════════════════════════════════════════════════════════
-- 1. MARKETPLACE PROVIDER TENANTS (${tenants.length} rows)
-- ════════════════════════════════════════════════════════════════════
`,
    insertBlock('Tenant', tenantCols, tenants as unknown as Record<string, unknown>[]),
    `\n-- ════════════════════════════════════════════════════════════════════
-- 2. SERVICES (${services.length} rows)
-- ════════════════════════════════════════════════════════════════════
`,
    insertBlock('Service', serviceCols, services as unknown as Record<string, unknown>[]),
    `\n-- ════════════════════════════════════════════════════════════════════
-- 3. REVIEWS (${reviews.length} rows)
-- ════════════════════════════════════════════════════════════════════
`,
    insertBlock('Review', reviewCols, reviews as unknown as Record<string, unknown>[]),
    `\n-- ════════════════════════════════════════════════════════════════════
-- 4. PROVIDER PORTFOLIO (${portfolio.length} rows)
-- ════════════════════════════════════════════════════════════════════
`,
    insertBlock('ProviderPortfolio', portfolioCols, portfolio as unknown as Record<string, unknown>[]),
    `\n-- ════════════════════════════════════════════════════════════════════
-- 5. PROVIDER CERTIFICATIONS (${certifications.length} rows)
-- ════════════════════════════════════════════════════════════════════
`,
    insertBlock('ProviderCertification', certCols, certifications as unknown as Record<string, unknown>[]),
    `\n-- ════════════════════════════════════════════════════════════════════
-- 6. FEATURED LISTINGS (${featuredListings.length} rows)
-- ════════════════════════════════════════════════════════════════════
`,
    insertBlock('FeaturedListing', featuredCols, featuredListings as unknown as Record<string, unknown>[]),
    `
COMMIT;

-- ════════════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES (run after seeding to confirm)
-- ════════════════════════════════════════════════════════════════════
-- SELECT count(*) AS tenant_count FROM "Tenant" WHERE "marketplaceOptIn" = TRUE;
-- SELECT count(*) AS service_count FROM "Service" s JOIN "Tenant" t ON s."tenantId" = t."id" WHERE t."marketplaceOptIn" = TRUE;
-- SELECT count(*) AS review_count FROM "Review" r JOIN "Tenant" t ON r."tenantId" = t."id" WHERE t."marketplaceOptIn" = TRUE;
-- SELECT count(*) AS portfolio_count FROM "ProviderPortfolio" p JOIN "Tenant" t ON p."tenantId" = t."id" WHERE t."marketplaceOptIn" = TRUE;
-- SELECT count(*) AS cert_count FROM "ProviderCertification" c JOIN "Tenant" t ON c."tenantId" = t."id" WHERE t."marketplaceOptIn" = TRUE;
-- SELECT count(*) AS featured_count FROM "FeaturedListing" WHERE "isActive" = TRUE;
--
-- Expected counts:
--   tenant_count   = ${tenants.length}
--   service_count  = ${services.length}
--   review_count   = ${reviews.length}
--   portfolio_count = ${portfolio.length}
--   cert_count     = ${certifications.length}
--   featured_count = ${featuredListings.length}
-- ════════════════════════════════════════════════════════════════════
`,
  ].join('\n');

  const sql = header + body;
  const outPath = 'supabase-seed-marketplace.sql';
  writeFileSync(outPath, sql);

  console.log(`\n✅ Generated ${outPath}`);
  console.log(`   Size: ${(sql.length / 1024).toFixed(1)} KB`);
  console.log(`   Lines: ${sql.split('\n').length}`);
  console.log(`   Tables seeded: Tenant, Service, Review, ProviderPortfolio, ProviderCertification, FeaturedListing`);
  console.log(`   Total rows: ${tenants.length + services.length + reviews.length + portfolio.length + certifications.length + featuredListings.length}`);

  await db.$disconnect();
}

main().catch((err) => {
  console.error('Failed to generate seed SQL:', err);
  process.exit(1);
});

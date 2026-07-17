/**
 * Backfill Hub defaults for all existing tenants.
 *
 * One-time script. Run with:
 *   bun run scripts/backfill-hub-defaults.ts                  # backfill all tenants
 *   bun run scripts/backfill-hub-defaults.ts <slug>           # backfill a single tenant
 *   bun run scripts/backfill-hub-defaults.ts --dry-run        # preview only, no DB writes
 *   bun run scripts/backfill-hub-defaults.ts <slug> --dry-run # preview single tenant
 *
 * For each tenant that is missing Hub fields (publicProfileEnabled=false OR
 * any of tagline/description/coverImage/etc. is empty) OR has zero Service
 * rows, this script:
 *   1. Calls applyHubDefaultsToTenant() — fills empty tenant.* fields
 *      (tagline, description HTML, cover image, business hours, service
 *      areas, FAQs, SEO title/description, city/state/postalCode).
 *   2. Calls seedDefaultServicesForTenant() — if the tenant has zero
 *      services, inserts 8-10 industry-kit services (isActive=true,
 *      isPublic=true) so the public "Services Offered" section renders.
 *
 * It NEVER overwrites fields the user has already set — it only fills
 * empty ones. It NEVER creates duplicate services — it only seeds when
 * the tenant's catalog is empty.
 *
 * Production usage (Supabase):
 *   Copy production .env (with USE_SUPABASE_DB=true,
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) to your laptop,
 *   then run `bun run scripts/backfill-hub-defaults.ts`.
 *
 *   Or use the superadmin API endpoint:
 *     POST /api/superadmin/backfill-hub  (superadmin-only)
 */
import { db } from '../src/lib/db'
import {
  applyHubDefaultsToTenant,
  seedDefaultServicesForTenant,
  computeHubDefaults,
} from '../src/lib/public-business'
import { getIndustryKit } from '../src/lib/industry-kits'

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const targetSlug = args.find((a) => !a.startsWith('--'))

  if (dryRun) {
    console.log('━'.repeat(70))
    console.log('DRY RUN — no database writes will be performed')
    console.log('━'.repeat(70))
  }

  const where = targetSlug ? { slug: targetSlug } : {}
  const tenants = await db.tenant.findMany({
    where,
    select: {
      id: true,
      name: true,
      slug: true,
      industry: true,
      publicProfileEnabled: true,
      tagline: true,
      description: true,
      coverImage: true,
      onboardingCompleted: true,
      address: true,
      city: true,
      state: true,
      postalCode: true,
      phone: true,
      country: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  console.log(`\nFound ${tenants.length} tenant(s) to inspect.`)

  // For each tenant, also check how many services they already have so we
  // can report whether seeding would happen.
  let populatedHub = 0
  let seededServices = 0
  let skipped = 0
  let failed = 0

  for (const t of tenants) {
    const needsHubBackfill =
      !t.publicProfileEnabled ||
      !t.tagline ||
      !t.description ||
      !t.coverImage

    const serviceCount = await db.service.count({ where: { tenantId: t.id } })
    const needsServiceSeed = serviceCount === 0
    const kit = t.industry ? getIndustryKit(t.industry) : undefined
    const seedableCount = kit?.services?.length ?? 0

    if (!needsHubBackfill && !needsServiceSeed) {
      console.log(
        `  ✓ skip  slug="${t.slug}"  name="${t.name}"  (hub OK, ${serviceCount} services)`
      )
      skipped++
      continue
    }

    if (dryRun) {
      const actions: string[] = []
      if (needsHubBackfill) {
        // Preview what computeHubDefaults would set
        const preview = computeHubDefaults({
          id: t.id,
          name: t.name,
          slug: t.slug,
          industry: t.industry,
          address: t.address,
          phone: t.phone,
          email: '',
          country: t.country || 'US',
          city: t.city,
          state: t.state,
          postalCode: t.postalCode,
          tagline: t.tagline,
          description: t.description,
          coverImage: t.coverImage,
          businessHoursJson: '',
          serviceAreasJson: '',
          socialLinksJson: '',
          faqsJson: '',
          seoTitle: '',
          seoDescription: '',
          publicSlug: '',
          publicProfileEnabled: t.publicProfileEnabled,
        })
        actions.push(
          `hub: tagline="${preview.tagline.slice(0, 50)}…", city=${preview.city ?? 'null'}, cover=${preview.coverImage ? 'set' : 'none'}`
        )
      }
      if (needsServiceSeed) {
        actions.push(
          `services: would seed ${seedableCount} from industry="${t.industry ?? 'null'}"${kit ? '' : ' (NO KIT — skipping)'}`
        )
      }
      console.log(
        `  ◎ dry   slug="${t.slug}"  name="${t.name}"  →  ${actions.join(' | ')}`
      )
      continue
    }

    try {
      if (needsHubBackfill) {
        await applyHubDefaultsToTenant(t.id)
        console.log(
          `  ★ hub   slug="${t.slug}"  name="${t.name}"  industry="${t.industry ?? 'null'}"`
        )
        populatedHub++
      }
      if (needsServiceSeed && seedableCount > 0) {
        const n = await seedDefaultServicesForTenant(t.id)
        if (n > 0) {
          console.log(
            `  ★ svc   slug="${t.slug}"  name="${t.name}"  seeded ${n} services from industry="${t.industry}"`
          )
          seededServices++
        }
      }
    } catch (err) {
      console.error(
        `  ✗ FAIL  slug="${t.slug}"  name="${t.name}"  →`,
        err instanceof Error ? err.message : err
      )
      failed++
    }
  }

  console.log('\n' + '━'.repeat(70))
  if (dryRun) {
    console.log(
      `Dry run complete: ${tenants.length} inspected, ${skipped} already OK, ${tenants.length - skipped} would be updated.`
    )
  } else {
    console.log(
      `Backfill complete: ${populatedHub} hub-populated, ${seededServices} service-seeded, ${skipped} skipped, ${failed} failed.`
    )
  }
  console.log('━'.repeat(70))
  await db.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

/**
 * Seed a test business with a rich-enough public profile so we can verify
 * the public business hub page at /{industry}/{city}/{slug} works end-to-end.
 *
 * Run: bun run src/scripts/seed-public-business.ts
 */

import { db } from '../lib/db'
import { mapIndustryToUrlSlug } from '../lib/seo/schemas'

async function main() {
  const slug = 'john-plumbing'
  const industry = 'Plumbing'
  const city = 'Dallas'
  const state = 'TX'

  console.log(`[seed-public-business] Looking for existing tenant with slug="${slug}"...`)

  // Find or create the tenant.
  let tenant = await db.tenant.findUnique({ where: { slug } })

  if (!tenant) {
    console.log('[seed-public-business] Creating new tenant...')
    tenant = await db.tenant.create({
      data: {
        name: 'John Plumbing',
        slug,
        industry,
        phone: '+1 214 555 0142',
        email: 'owner@johnplumbing.example.com',
        address: '1420 Main Street',
        city,
        state,
        country: 'US',
        currency: 'USD',
        whatsappPhone: '+1 214 555 0142',
        plan: 'starter',
        planStatus: 'active',
        onboardingCompleted: true,
        // Public profile fields:
        publicProfileEnabled: true,
        publicSlug: slug,
        tagline: '24/7 Emergency Plumbing • Licensed & Insured • Dallas since 2009',
        description: `John Plumbing has been serving the Dallas-Fort Worth metroplex since 2009. We are a family-owned and operated plumbing company specializing in emergency repairs, drain cleaning, water heater installation, and commercial plumbing services. Our master plumbers are licensed, insured, and background-checked for your peace of mind.

We pride ourselves on honest pricing, on-time arrivals, and quality workmanship. Every job is backed by our 100% satisfaction guarantee. Call us day or night — we're available 24/7 for emergencies.`,
        coverImage: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1200&h=400&fit=crop',
        logo: 'https://images.unsplash.com/photo-1581092919535-90a3b3a8f80e?w=200&h=200&fit=crop',
        rating: 4.9,
        reviewCount: 127,
        city,
        state,
        postalCode: '75201',
        businessHoursJson: JSON.stringify({
          mon: { open: '07:00', close: '19:00' },
          tue: { open: '07:00', close: '19:00' },
          wed: { open: '07:00', close: '19:00' },
          thu: { open: '07:00', close: '19:00' },
          fri: { open: '07:00', close: '19:00' },
          sat: { open: '08:00', close: '17:00' },
          sun: { open: '00:00', close: '23:59' },  // 24/7 emergency
        }),
        serviceAreasJson: JSON.stringify(['Dallas', 'Fort Worth', 'Plano', 'Irving', 'Arlington', 'Garland', 'Richardson', 'Frisco']),
        socialLinksJson: JSON.stringify({
          facebook: 'https://facebook.com/johnplumbing',
          instagram: 'https://instagram.com/johnplumbing',
          twitter: 'https://twitter.com/johnplumbing',
        }),
        faqsJson: JSON.stringify([
          { question: 'Do you offer 24/7 emergency service?', answer: 'Yes. We are available 24 hours a day, 7 days a week for plumbing emergencies. Call us at +1 214 555 0142 anytime.' },
          { question: 'Are you licensed and insured?', answer: 'Yes. John Plumbing is fully licensed (TX Master Plumber License #M-123456) and carries $2M general liability insurance.' },
          { question: 'Do you offer free estimates?', answer: 'Yes, we offer free over-the-phone estimates for most jobs. For complex installations, we may schedule an on-site inspection at no charge.' },
          { question: 'What areas do you serve?', answer: 'We serve the entire Dallas-Fort Worth metroplex including Dallas, Fort Worth, Plano, Irving, Arlington, Garland, Richardson, and Frisco.' },
          { question: 'Do you offer a warranty?', answer: 'Yes. All our work is backed by a 1-year parts and labor warranty. Water heater installations carry the manufacturer warranty plus our 1-year labor warranty.' },
        ]),
        galleryJson: JSON.stringify([
          { url: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=400&h=400&fit=crop', caption: 'Water heater installation' },
          { url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop', caption: 'Drain cleaning service' },
          { url: 'https://images.unsplash.com/photo-1607400201515-c2c41c07d307?w=400&h=400&fit=crop', caption: 'Bathroom remodel plumbing' },
          { url: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&h=400&fit=crop', caption: 'Pipe repair work' },
        ]),
      },
    })
    console.log(`[seed-public-business] ✓ Created tenant ${tenant.id}`)
  } else {
    console.log('[seed-public-business] Updating existing tenant with public profile...')
    tenant = await db.tenant.update({
      where: { slug },
      data: {
        industry,
        phone: '+1 214 555 0142',
        email: 'owner@johnplumbing.example.com',
        address: '1420 Main Street',
        city,
        state,
        publicProfileEnabled: true,
        publicSlug: slug,
        tagline: '24/7 Emergency Plumbing • Licensed & Insured • Dallas since 2009',
        description: `John Plumbing has been serving the Dallas-Fort Worth metroplex since 2009. We are a family-owned and operated plumbing company specializing in emergency repairs, drain cleaning, water heater installation, and commercial plumbing services. Our master plumbers are licensed, insured, and background-checked for your peace of mind.

We pride ourselves on honest pricing, on-time arrivals, and quality workmanship. Every job is backed by our 100% satisfaction guarantee. Call us day or night — we're available 24/7 for emergencies.`,
        coverImage: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1200&h=400&fit=crop',
        logo: 'https://images.unsplash.com/photo-1581092919535-90a3b3a8f80e?w=200&h=200&fit=crop',
        rating: 4.9,
        reviewCount: 127,
        postalCode: '75201',
        businessHoursJson: JSON.stringify({
          mon: { open: '07:00', close: '19:00' },
          tue: { open: '07:00', close: '19:00' },
          wed: { open: '07:00', close: '19:00' },
          thu: { open: '07:00', close: '19:00' },
          fri: { open: '07:00', close: '19:00' },
          sat: { open: '08:00', close: '17:00' },
          sun: { open: '00:00', close: '23:59' },
        }),
        serviceAreasJson: JSON.stringify(['Dallas', 'Fort Worth', 'Plano', 'Irving', 'Arlington', 'Garland', 'Richardson', 'Frisco']),
        socialLinksJson: JSON.stringify({
          facebook: 'https://facebook.com/johnplumbing',
          instagram: 'https://instagram.com/johnplumbing',
          twitter: 'https://twitter.com/johnplumbing',
        }),
        faqsJson: JSON.stringify([
          { question: 'Do you offer 24/7 emergency service?', answer: 'Yes. We are available 24 hours a day, 7 days a week for plumbing emergencies. Call us at +1 214 555 0142 anytime.' },
          { question: 'Are you licensed and insured?', answer: 'Yes. John Plumbing is fully licensed (TX Master Plumber License #M-123456) and carries $2M general liability insurance.' },
          { question: 'Do you offer free estimates?', answer: 'Yes, we offer free over-the-phone estimates for most jobs. For complex installations, we may schedule an on-site inspection at no charge.' },
          { question: 'What areas do you serve?', answer: 'We serve the entire Dallas-Fort Worth metroplex including Dallas, Fort Worth, Plano, Irving, Arlington, Garland, Richardson, and Frisco.' },
          { question: 'Do you offer a warranty?', answer: 'Yes. All our work is backed by a 1-year parts and labor warranty. Water heater installations carry the manufacturer warranty plus our 1-year labor warranty.' },
        ]),
        galleryJson: JSON.stringify([
          { url: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=400&h=400&fit=crop', caption: 'Water heater installation' },
          { url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop', caption: 'Drain cleaning service' },
          { url: 'https://images.unsplash.com/photo-1607400201515-c2c41c07d307?w=400&h=400&fit=crop', caption: 'Bathroom remodel plumbing' },
          { url: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=400&h=400&fit=crop', caption: 'Pipe repair work' },
        ]),
      },
    })
    console.log(`[seed-public-business] ✓ Updated tenant ${tenant.id}`)
  }

  // Seed services (need ≥3 for indexability).
  console.log('[seed-public-business] Seeding services...')
  const existingServices = await db.service.findMany({ where: { tenantId: tenant.id } })

  const servicesToCreate = [
    {
      name: 'Emergency Plumbing',
      description: '24/7 emergency plumbing service for burst pipes, severe leaks, and sewer backups.',
      longDescription: 'When a plumbing emergency strikes, you need a plumber fast. John Plumbing offers 24/7 emergency response throughout the Dallas-Fort Worth area. Our master plumbers arrive within 60 minutes for most calls, equipped to handle burst pipes, sewer backups, gas leaks, water heater failures, and flooding.',
      category: 'emergency',
      basePrice: 150,
      duration: 90,
      isPublic: true,
      slug: 'emergency-plumbing',
    },
    {
      name: 'Drain Cleaning',
      description: 'Professional drain cleaning for slow drains, clogs, and backups.',
      longDescription: 'Slow drains and recurring clogs are more than a nuisance — they can signal deeper plumbing issues. Our drain cleaning service uses professional-grade augers and hydro-jetting equipment to clear blockages without damaging your pipes. We also offer camera inspection to identify recurring problem areas.',
      category: 'drain',
      basePrice: 89,
      duration: 60,
      isPublic: true,
      slug: 'drain-cleaning',
    },
    {
      name: 'Water Heater Installation',
      description: 'Tank and tankless water heater installation, repair, and replacement.',
      longDescription: 'No hot water? We install, repair, and replace all major water heater brands including tank, tankless, and hybrid heat pump models. Our master plumbers will help you choose the right size and efficiency level for your home, and we handle all permits and inspections.',
      category: 'water-heater',
      basePrice: 1200,
      duration: 240,
      isPublic: true,
      slug: 'water-heater-installation',
    },
    {
      name: 'Bathroom & Kitchen Plumbing',
      description: 'Fixture installation, pipe repair, and remodel rough-ins for bathrooms and kitchens.',
      longDescription: 'From a simple faucet replacement to a full bathroom or kitchen remodel, our plumbers handle all residential plumbing work. We install sinks, toilets, garbage disposals, dishwashers, ice makers, and showers. All fixtures are installed to code and backed by our 1-year labor warranty.',
      category: 'fixtures',
      basePrice: 200,
      duration: 120,
      isPublic: true,
      slug: 'bathroom-kitchen-plumbing',
    },
  ]

  for (const svc of servicesToCreate) {
    const existing = existingServices.find((s) => s.name === svc.name)
    if (existing) {
      await db.service.update({
        where: { id: existing.id },
        data: {
          ...svc,
          isPublic: true,
        },
      })
      console.log(`[seed-public-business]   ✓ Updated service: ${svc.name}`)
    } else {
      await db.service.create({
        data: {
          ...svc,
          tenantId: tenant.id,
        },
      })
      console.log(`[seed-public-business]   ✓ Created service: ${svc.name}`)
    }
  }

  // Seed a few reviews (need ≥1 for the reviews section).
  console.log('[seed-public-business] Seeding reviews...')
  const existingReviews = await db.review.findMany({ where: { tenantId: tenant.id } })

  const reviewsToCreate = [
    { rating: 5, comment: 'John came out at 2am for a burst pipe. Fast, professional, and fair price. Will use again!', authorName: 'Sarah M.' },
    { rating: 5, comment: 'Installed our new water heater same day. Very knowledgeable and cleaned up everything. Highly recommend.', authorName: 'David K.' },
    { rating: 4, comment: 'Good drain cleaning service. A bit pricey but the work was solid.', authorName: 'Maria L.' },
    { rating: 5, comment: 'Best plumber in Dallas. Honest, on-time, and does excellent work. We use them for all our rental properties.', authorName: 'James R.' },
    { rating: 5, comment: 'Fixed a leak under the kitchen sink in 30 minutes. Friendly and professional.', authorName: 'Patricia B.' },
  ]

  for (const rev of reviewsToCreate) {
    const exists = existingReviews.some((r) => r.authorName === rev.authorName)
    if (!exists) {
      await db.review.create({
        data: {
          ...rev,
          tenantId: tenant.id,
          status: 'published',
          source: 'internal',
          responseJson: JSON.stringify({}),
        },
      })
      console.log(`[seed-public-business]   ✓ Created review from ${rev.authorName}`)
    }
  }

  // Compute and show the canonical URL.
  const industrySlug = mapIndustryToUrlSlug(tenant.industry)
  const citySlug = (tenant.city || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-')
  console.log('')
  console.log(`[seed-public-business] ✅ Done!`)
  console.log(`[seed-public-business] Public URL: https://serviceos.com/${industrySlug}/${citySlug}/${tenant.slug}`)
  console.log(`[seed-public-business] Short URL:  https://serviceos.com/b/${tenant.slug}`)
  console.log('')
  console.log('[seed-public-business] Indexability check:')
  console.log(`  publicProfileEnabled: ${tenant.publicProfileEnabled}`)
  console.log(`  description length:   ${tenant.description?.length || 0} (need ≥100)`)
  const svcCount = await db.service.count({ where: { tenantId: tenant.id, isActive: true, isPublic: true } })
  console.log(`  public services:      ${svcCount} (need ≥3)`)
  console.log(`  has image:            ${Boolean(tenant.coverImage || tenant.logo)}`)
}

main()
  .catch((err) => {
    console.error('[seed-public-business] ✗ Error:', err)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })

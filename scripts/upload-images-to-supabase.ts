/**
 * Upload Template Studio Images to Supabase Storage
 *
 * This script uploads all generated template images to Supabase Storage
 * and updates the database records with the correct public URLs.
 *
 * Usage:
 *   bun run scripts/upload-images-to-supabase.ts
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL - Your Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key for admin access
 *   DIRECT_URL - Database connection URL (for updating records)
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL || ''

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const db = new PrismaClient({ datasourceUrl: directUrl, log: ['error', 'warn'] })

// Image definitions: local file -> Supabase Storage path
const images = [
  // Email headers (template-assets bucket, public)
  { local: 'generated-images/email/welcome-header.png', bucket: 'template-assets', remote: 'default/email/welcome-header.png', folder: 'email' },
  { local: 'generated-images/email/invoice-header.png', bucket: 'template-assets', remote: 'default/email/invoice-header.png', folder: 'email' },
  { local: 'generated-images/email/booking-header.png', bucket: 'template-assets', remote: 'default/email/booking-header.png', folder: 'email' },
  { local: 'generated-images/email/marketing-header.png', bucket: 'template-assets', remote: 'default/email/marketing-header.png', folder: 'email' },
  // WhatsApp banners
  { local: 'generated-images/whatsapp/appointment-banner.png', bucket: 'template-assets', remote: 'default/whatsapp/appointment-banner.png', folder: 'whatsapp' },
  { local: 'generated-images/whatsapp/offer-banner.png', bucket: 'template-assets', remote: 'default/whatsapp/offer-banner.png', folder: 'whatsapp' },
  { local: 'generated-images/whatsapp/order-banner.png', bucket: 'template-assets', remote: 'default/whatsapp/order-banner.png', folder: 'whatsapp' },
  // Pabbly-style email images
  { local: 'generated-images/email/red-velvet-cake.png', bucket: 'template-assets', remote: 'default/email/red-velvet-cake.png', folder: 'email' },
  { local: 'generated-images/email/birthday-party.png', bucket: 'template-assets', remote: 'default/email/birthday-party.png', folder: 'email' },
  { local: 'generated-images/email/bright-smiles.png', bucket: 'template-assets', remote: 'default/email/bright-smiles.png', folder: 'email' },
  { local: 'generated-images/email/marketing-insights.png', bucket: 'template-assets', remote: 'default/email/marketing-insights.png', folder: 'email' },
  { local: 'generated-images/email/signature-watch.png', bucket: 'template-assets', remote: 'default/email/signature-watch.png', folder: 'email' },
  { local: 'generated-images/email/education-webinar.png', bucket: 'template-assets', remote: 'default/email/education-webinar.png', folder: 'email' },
  { local: 'generated-images/email/savor-every-bite.png', bucket: 'template-assets', remote: 'default/email/savor-every-bite.png', folder: 'email' },
  { local: 'generated-images/email/travel-vacation.png', bucket: 'template-assets', remote: 'default/email/travel-vacation.png', folder: 'email' },
]

async function main() {
  console.log('📤 Uploading Template Studio images to Supabase Storage...\n')

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars')
    process.exit(1)
  }

  // Get the first tenant for updating ImageLibrary records
  const tenant = await db.tenant.findFirst({ orderBy: { createdAt: 'asc' } })
  if (!tenant) {
    console.error('❌ No tenant found in database. Create a tenant first.')
    process.exit(1)
  }
  console.log(`🏢 Using tenant: ${tenant.name} (${tenant.id})\n`)

  const results: { name: string; url: string; status: string }[] = []

  for (const img of images) {
    const localPath = path.resolve(process.cwd(), img.local)

    if (!fs.existsSync(localPath)) {
      console.error(`   ❌ File not found: ${img.local}`)
      results.push({ name: img.local, url: '', status: 'file-not-found' })
      continue
    }

    const fileBuffer = fs.readFileSync(localPath)
    const fileName = path.basename(img.local)

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(img.bucket)
      .upload(img.remote, fileBuffer, {
        contentType: 'image/png',
        upsert: true, // overwrite if exists
      })

    if (error) {
      console.error(`   ❌ Upload failed: ${fileName} — ${error.message}`)
      results.push({ name: fileName, url: '', status: `error: ${error.message}` })
      continue
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(img.bucket)
      .getPublicUrl(img.remote)

    const publicUrl = urlData.publicUrl
    console.log(`   ✅ ${fileName} → ${publicUrl}`)

    // Update ImageLibrary record (if exists with old URL pattern)
    const oldUrlPattern = `/uploads/template-assets/${img.remote}`
    const updated = await db.imageLibrary.updateMany({
      where: { url: oldUrlPattern },
      data: { url: publicUrl },
    })

    if (updated.count > 0) {
      console.log(`      📝 Updated ${updated.count} ImageLibrary record(s)`)
    }

    results.push({ name: fileName, url: publicUrl, status: 'ok' })
  }

  // Now update EmailTemplate and CampaignTemplate records that reference old URLs
  console.log('\n📝 Updating template records with new URLs...')

  const urlMappings: Record<string, string> = {}
  for (const r of results) {
    if (r.status === 'ok' && r.url) {
      // Map old pattern -> new Supabase URL
      const oldBase = `/uploads/template-assets/default/`
      const img = images.find(i => path.basename(i.local) === r.name)
      if (img) {
        urlMappings[`${oldBase}${img.remote}`] = r.url
      }
    }
  }

  // Update EmailTemplates
  const emailTemplates = await db.emailTemplate.findMany()
  for (const tmpl of emailTemplates) {
    let updated = false
    let htmlBody = tmpl.htmlBody

    for (const [oldUrl, newUrl] of Object.entries(urlMappings)) {
      if (htmlBody.includes(oldUrl)) {
        htmlBody = htmlBody.replaceAll(oldUrl, newUrl)
        updated = true
      }
    }

    if (updated) {
      await db.emailTemplate.update({
        where: { id: tmpl.id },
        data: { htmlBody },
      })
      console.log(`   ✅ Updated EmailTemplate: ${tmpl.name}`)
    }
  }

  // Update CampaignTemplates
  const campaignTemplates = await db.campaignTemplate.findMany()
  for (const tmpl of campaignTemplates) {
    let updated = false
    let content = tmpl.content
    let headerMediaUrl = tmpl.headerMediaUrl

    for (const [oldUrl, newUrl] of Object.entries(urlMappings)) {
      if (content?.includes(oldUrl)) {
        content = content.replaceAll(oldUrl, newUrl)
        updated = true
      }
      if (headerMediaUrl === oldUrl) {
        headerMediaUrl = newUrl
        updated = true
      }
    }

    if (updated) {
      await db.campaignTemplate.update({
        where: { id: tmpl.id },
        data: { content, headerMediaUrl },
      })
      console.log(`   ✅ Updated CampaignTemplate: ${tmpl.name}`)
    }
  }

  // Update BrandKit logoUrl
  const brandKits = await db.brandKit.findMany()
  for (const bk of brandKits) {
    let updated = false
    let logoUrl = bk.logoUrl

    for (const [oldUrl, newUrl] of Object.entries(urlMappings)) {
      if (logoUrl === oldUrl) {
        logoUrl = newUrl
        updated = true
      }
    }

    if (updated) {
      await db.brandKit.update({
        where: { id: bk.id },
        data: { logoUrl },
      })
      console.log(`   ✅ Updated BrandKit: ${bk.id}`)
    }
  }

  // Print summary
  console.log('\n═══════════════════════════════════════════')
  console.log('📊 Upload Summary:')
  const ok = results.filter(r => r.status === 'ok').length
  const failed = results.filter(r => r.status !== 'ok').length
  console.log(`   Uploaded:  ${ok}`)
  console.log(`   Failed:    ${failed}`)
  console.log('═══════════════════════════════════════════')

  if (ok > 0) {
    console.log('\n✅ Images uploaded! Public URLs:')
    for (const r of results.filter(r => r.status === 'ok')) {
      console.log(`   ${r.name}: ${r.url}`)
    }
  }

  console.log('\n✨ Upload complete!\n')
}

main()
  .then(async () => {
    await db.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Upload failed:', e)
    await db.$disconnect()
    process.exit(1)
  })

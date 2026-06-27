import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, generateSlug } from '@/lib/auth'
import { ALL_PACKS } from '@/lib/template-packs-data'
import { detectVariablesFromContent } from '@/lib/template-vars'

/**
 * POST /api/template-packs/install
 * Installs a template pack for the current tenant — creates all EmailTemplate
 * and CampaignTemplate records from the pack definition.
 *
 * Body: { slug: string }
 * Idempotent: if already installed, returns existing templates.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const tenantId = user.tenantId || 'default'
    const workspaceId = user.workspaceId || null

    const body = await request.json()
    const slug = body.slug

    if (!slug || typeof slug !== 'string') {
      return NextResponse.json({ error: 'slug is required' }, { status: 400 })
    }

    const pack = ALL_PACKS.find((p) => p.slug === slug)
    if (!pack) {
      return NextResponse.json({ error: `Pack "${slug}" not found` }, { status: 404 })
    }

    const createdEmail: string[] = []
    const createdWhatsapp: string[] = []

    for (const spec of pack.templates) {
      if (spec.channel === 'email') {
        const emailSlug = generateSlug(`${pack.slug}-${spec.name}`)

        // Check if already exists for this tenant
        const existing = await db.emailTemplate.findFirst({
          where: { slug: emailSlug, tenantId },
          select: { id: true },
        })
        if (existing) {
          createdEmail.push(existing.id)
          continue
        }

        const created = await db.emailTemplate.create({
          data: {
            name: spec.name,
            slug: emailSlug,
            category: spec.category || 'transactional',
            subject: spec.subject || spec.name,
            htmlBody: spec.htmlBody || '<p></p>',
            textBody: null,
            variablesJson: JSON.stringify(detectVariablesFromContent(spec.subject, spec.htmlBody)),
            isBuiltIn: false,
            tenantId,
            workspaceId,
            language: 'en',
            status: 'published',
            tagsJson: JSON.stringify([pack.slug]),
          },
        })
        createdEmail.push(created.id)
      } else if (spec.channel === 'whatsapp') {
        // Check if already exists (by name + tenant)
        const existing = await db.campaignTemplate.findFirst({
          where: { name: spec.name, tenantId },
          select: { id: true },
        })
        if (existing) {
          createdWhatsapp.push(existing.id)
          continue
        }

        const ctaButton = (spec.buttons || []).find((b) => b.type === 'website')
        const created = await db.campaignTemplate.create({
          data: {
            name: spec.name,
            description: pack.description,
            category: spec.category || 'general',
            content: spec.content || '',
            mediaUrl: null,
            mediaType: null,
            ctaText: ctaButton?.text || null,
            ctaUrl: ctaButton?.value || null,
            variablesJson: JSON.stringify(detectVariablesFromContent(spec.content, spec.headerText, spec.footerText)),
            isApproved: false,
            tenantId,
            workspaceId,
            language: 'en',
            templateType: spec.templateType || 'text',
            headerText: spec.headerText || null,
            footerText: spec.footerText || null,
            buttonsJson: JSON.stringify(spec.buttons || []),
            status: 'published',
            isFavorite: false,
            tagsJson: JSON.stringify([pack.slug]),
          },
        })
        createdWhatsapp.push(created.id)
      }
    }

    // Record the installation
    await db.templatePack.upsert({
      where: { slug },
      create: {
        slug,
        name: pack.name,
        description: pack.description,
        category: pack.category,
        industry: pack.industry || null,
        icon: pack.icon,
        color: pack.color,
        templatesJson: JSON.stringify(pack.templates),
        isInstalled: true,
        installedBy: tenantId,
        installCount: 1,
      },
      update: {
        isInstalled: true,
        installedBy: tenantId,
        installCount: { increment: 1 },
      },
    })

    return NextResponse.json({
      data: {
        slug,
        installed: true,
        emailTemplatesCreated: createdEmail.length,
        whatsappTemplatesCreated: createdWhatsapp.length,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Error installing template pack:', error)
    return NextResponse.json({ error: 'Failed to install template pack' }, { status: 500 })
  }
}

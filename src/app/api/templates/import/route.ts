import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, generateSlug } from '@/lib/auth'
import { detectVariablesFromContent } from '@/lib/template-vars'

/**
 * POST /api/templates/import
 *
 * Bulk-import Email and/or WhatsApp (CampaignTemplate) templates from a JSON
 * payload.  Designed for the Template Studio "Import → From File" workflow.
 *
 * Accepts a JSON body of the shape:
 *   {
 *     "templates": [
 *       {
 *         "channel": "email" | "whatsapp",
 *         "name": "Welcome Email",
 *         "category": "transactional",        // optional
 *         "subject": "Welcome!",               // required for email
 *         "htmlBody": "<p>Hi {{customer.name}}</p>", // required for email
 *         "textBody": "...",                   // optional
 *         "description": "...",                // optional
 *         "language": "en",                    // optional
 *         "status": "draft" | "published",     // optional
 *         "tags": ["welcome", "onboarding"],   // optional
 *         // WhatsApp-only fields:
 *         "content": "Hi {{1}}",               // required for whatsapp
 *         "templateType": "text" | "image" | "document" | "video",  // optional
 *         "headerText": "...",                 // optional
 *         "footerText": "...",                 // optional
 *         "buttons": [{ "type": "quick_reply", "text": "Yes" }]     // optional
 *       }
 *     ]
 *   }
 *
 * Returns 201 with a summary: { imported, email, whatsapp, skipped, errors[] }
 * Idempotent: templates with the same name (WA) or slug (email) for the
 * current tenant are skipped, not duplicated.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const tenantId = user.tenantId || 'default'
    const workspaceId = user.workspaceId || null

    const body = await request.json().catch(() => ({}))
    const list = Array.isArray(body?.templates) ? body.templates : null

    if (!list || list.length === 0) {
      return NextResponse.json(
        { error: 'Body must include a non-empty "templates" array' },
        { status: 400 },
      )
    }

    const validEmailCategories = ['transactional', 'marketing', 'system']
    const validWaCategories = [
      'general', 'promotional', 'reminder', 'seasonal', 'follow_up',
      're_engagement', 'marketing', 'utility', 'authentication',
    ]

    const encodeJson = (val: unknown, defaultVal = '[]'): string => {
      if (val === undefined || val === null) return defaultVal
      if (typeof val === 'string') {
        try { JSON.parse(val); return val } catch { return defaultVal }
      }
      if (Array.isArray(val) || typeof val === 'object') return JSON.stringify(val)
      return defaultVal
    }

    let emailCreated = 0
    let waCreated = 0
    let skipped = 0
    const errors: { name?: string; error: string }[] = []

    for (const raw of list) {
      if (!raw || typeof raw !== 'object') {
        errors.push({ error: 'Template entry must be an object' })
        continue
      }
      const t = raw as Record<string, unknown>
      const channel = typeof t.channel === 'string' ? t.channel.toLowerCase() : ''
      const name = typeof t.name === 'string' ? t.name.trim() : ''

      if (!name) {
        errors.push({ error: 'Template "name" is required' })
        continue
      }
      if (channel !== 'email' && channel !== 'whatsapp') {
        errors.push({ name, error: 'Invalid or missing "channel" (must be "email" or "whatsapp")' })
        continue
      }

      const tags = Array.isArray(t.tags) ? t.tags.map(String) : []
      const tagsJson = JSON.stringify(['imported', ...tags])
      const language = typeof t.language === 'string' && t.language ? t.language : 'en'
      const status = typeof t.status === 'string' && t.status ? t.status : 'published'
      const description = typeof t.description === 'string' && t.description ? t.description : null

      try {
        if (channel === 'email') {
          const subject = typeof t.subject === 'string' ? t.subject.trim() : ''
          const htmlBody = typeof t.htmlBody === 'string' ? t.htmlBody : ''
          if (!subject) {
            errors.push({ name, error: 'Email template requires "subject"' })
            continue
          }
          if (!htmlBody) {
            errors.push({ name, error: 'Email template requires "htmlBody"' })
            continue
          }
          const category =
            typeof t.category === 'string' && validEmailCategories.includes(t.category)
              ? t.category
              : 'transactional'

          // Idempotency check #1: skip if a template with the same name already
          // exists for this tenant (so re-importing the same file is safe).
          const existingByName = await db.emailTemplate.findFirst({
            where: { name, tenantId },
            select: { id: true },
          })
          if (existingByName) {
            skipped++
            continue
          }

          // Build a deterministic slug from the name.  If a template with that
          // slug already exists (edge case: same slug derived from a different
          // name), fall back to a slug with a short random suffix so the import
          // still succeeds without failing the @@unique([slug, tenantId]) check.
          let slug = generateSlug(name)
          if (!slug) {
            errors.push({ name, error: 'Could not generate a valid slug' })
            continue
          }
          const existingBySlug = await db.emailTemplate.findFirst({
            where: { slug, tenantId },
            select: { id: true },
          })
          if (existingBySlug) {
            slug = generateSlug(`${name}-${Date.now().toString(36).slice(-4)}`)
          }
          const textBody = typeof t.textBody === 'string' && t.textBody ? t.textBody : null
          await db.emailTemplate.create({
            data: {
              name,
              slug,
              category,
              description,
              subject,
              htmlBody,
              textBody,
              variablesJson: JSON.stringify(
                detectVariablesFromContent(subject, htmlBody),
              ),
              isBuiltIn: false,
              isDefault: false,
              tenantId,
              workspaceId,
              language,
              status: status === 'draft' ? 'draft' : 'published',
              isFavorite: false,
              tagsJson,
              attachmentsJson: '[]',
            },
          })
          emailCreated++
        } else {
          // WhatsApp / CampaignTemplate
          const content = typeof t.content === 'string' ? t.content : ''
          if (!content) {
            errors.push({ name, error: 'WhatsApp template requires "content"' })
            continue
          }
          const category =
            typeof t.category === 'string' && validWaCategories.includes(t.category)
              ? t.category
              : 'general'
          const templateType =
            typeof t.templateType === 'string' &&
            ['text', 'image', 'document', 'video'].includes(t.templateType)
              ? t.templateType
              : 'text'
          const headerText = typeof t.headerText === 'string' && t.headerText ? t.headerText : null
          const footerText = typeof t.footerText === 'string' && t.footerText ? t.footerText : null
          const buttons = Array.isArray(t.buttons) ? t.buttons : []
          const ctaButton = buttons.find(
            (b): b is { type: string; text: string; value?: string } =>
              typeof b === 'object' && b !== null && (b as { type: string }).type === 'website',
          )

          // Idempotency: skip if name+tenant already exists
          const existing = await db.campaignTemplate.findFirst({
            where: { name, tenantId },
            select: { id: true },
          })
          if (existing) {
            skipped++
            continue
          }

          await db.campaignTemplate.create({
            data: {
              name,
              description,
              category,
              content,
              mediaUrl: null,
              mediaType: null,
              ctaText: ctaButton?.text || null,
              ctaUrl: ctaButton?.value || null,
              variablesJson: JSON.stringify(
                detectVariablesFromContent(content, headerText || undefined, footerText || undefined),
              ),
              isApproved: false,
              tenantId,
              workspaceId,
              language,
              templateType,
              headerText,
              headerMediaUrl: null,
              headerMediaType: null,
              footerText,
              buttonsJson: encodeJson(buttons),
              status: status === 'draft' ? 'draft' : 'published',
              isFavorite: false,
              tagsJson,
            },
          })
          waCreated++
        }
      } catch (e) {
        errors.push({
          name,
          error: e instanceof Error ? e.message : 'Failed to import template',
        })
      }
    }

    return NextResponse.json(
      {
        data: {
          imported: emailCreated + waCreated,
          email: emailCreated,
          whatsapp: waCreated,
          skipped,
          errors,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error('[templates/import] Error:', error)
    return NextResponse.json({ error: 'Failed to import templates' }, { status: 500 })
  }
}

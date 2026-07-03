/**
 * Auto-Import Notification Templates
 * ──────────────────────────────────
 * When a new tenant registers, automatically import the 5 essential
 * notification WhatsApp templates into their CampaignTemplate table.
 *
 * The 5 notification templates match the WhatsApp notifications sent
 * by whatsapp-notifications.ts:
 *   1. 🔔 New Job Assigned (to technician)
 *   2. ✅ Technician Assigned (to customer)
 *   3. 🚀 Technician On The Way (to customer)
 *   4. 🎉 Job Completed! (to technician)
 *   5. ✅ Service Completed (to customer, with rating)
 *
 * These are imported as "draft" status. The tenant must then submit
 * them to Meta for approval via the WhatsApp Setup Wizard or the
 * Template Catalog UI.
 */

import { db } from '@/lib/db'
import { PRE_BUILT_WHATSAPP_TEMPLATES } from '@/lib/whatsapp-prebuilt-templates'
import { detectVariablesFromContent } from '@/lib/template-vars'

// Keys of the notification templates that should be auto-imported for every tenant
const NOTIFICATION_TEMPLATE_KEYS = [
  'notification_new_job_assigned',
  'notification_service_completed',
  'utility_technician_assigned',
  'utility_technician_en_route',
  'utility_job_completed',
]

export interface AutoImportResult {
  imported: number
  skipped: number
  errors: string[]
}

/**
 * Auto-import notification templates for a specific tenant.
 * Skips templates that already exist (by name).
 *
 * @param tenantId - The tenant to import templates for
 * @param workspaceId - Optional workspace ID for the templates
 * @param companyName - Company name to replace {{company.name}} references
 * @returns Import result with count of imported, skipped, and any errors
 */
export async function autoImportNotificationTemplates(
  tenantId: string,
  workspaceId?: string | null,
  companyName?: string
): Promise<AutoImportResult> {
  const result: AutoImportResult = { imported: 0, skipped: 0, errors: [] }

  // Get the notification templates from the pre-built catalog
  const templatesToImport = PRE_BUILT_WHATSAPP_TEMPLATES.filter(t =>
    NOTIFICATION_TEMPLATE_KEYS.includes(t.key)
  )

  if (templatesToImport.length === 0) {
    result.errors.push('No notification templates found in catalog')
    return result
  }

  // Check which templates already exist (by name) for this tenant
  const existingNames = await db.campaignTemplate.findMany({
    where: {
      tenantId,
      name: { in: templatesToImport.map(t => t.name) },
    },
    select: { name: true },
  })
  const existingNameSet = new Set(existingNames.map(e => e.name))

  const effectiveCompanyName = companyName || 'Our Company'

  for (const tmpl of templatesToImport) {
    try {
      if (existingNameSet.has(tmpl.name)) {
        result.skipped++
        continue
      }

      // Replace {{company.name}} style references in footer
      const footerText = tmpl.footerText?.replace(/\{\{2\}\}|\{\{1\}\}/g, effectiveCompanyName) || null

      const detectedVars = detectVariablesFromContent(tmpl.bodyText, tmpl.headerText, footerText)

      await db.campaignTemplate.create({
        data: {
          name: tmpl.name,
          description: tmpl.description,
          category: tmpl.businessCategory,
          content: tmpl.bodyText,
          variablesJson: JSON.stringify(detectedVars),
          isApproved: false,
          tenantId,
          workspaceId: workspaceId || null,
          language: tmpl.language,
          templateType: tmpl.templateType.toLowerCase(),
          headerText: tmpl.headerText || null,
          footerText,
          buttonsJson: JSON.stringify(tmpl.buttons || []),
          status: 'draft',
          tagsJson: JSON.stringify([
            tmpl.metaCategory.toLowerCase(),
            tmpl.businessCategory,
            'notification',
            'auto-imported',
          ]),
        },
      })
      result.imported++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      result.errors.push(`${tmpl.name}: ${msg}`)
    }
  }

  return result
}

/**
 * Auto-import for ALL existing tenants that don't have notification templates yet.
 * Useful for one-time migration / backfill.
 */
export async function autoImportForAllTenants(): Promise<{
  tenantsProcessed: number
  totalImported: number
  errors: string[]
}> {
  const tenants = await db.tenant.findMany({ select: { id: true, name: true } })

  let totalImported = 0
  const allErrors: string[] = []

  for (const tenant of tenants) {
    const result = await autoImportNotificationTemplates(tenant.id, null, tenant.name)
    totalImported += result.imported
    allErrors.push(...result.errors)
  }

  return { tenantsProcessed: tenants.length, totalImported, errors: allErrors }
}

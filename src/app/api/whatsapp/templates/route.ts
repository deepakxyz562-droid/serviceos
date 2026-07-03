import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { PRE_BUILT_WHATSAPP_TEMPLATES, type WhatsAppPreBuiltTemplate } from '@/lib/whatsapp-prebuilt-templates';
import { detectVariablesFromContent } from '@/lib/template-vars';
import { resolveWhatsAppConfig } from '@/lib/whatsapp-config';

const WHATSAPP_API_BASE = 'https://graph.facebook.com/v25.0';

/**
 * Strip ALL emojis and emoji-like characters from a string.
 * Covers Unicode emoji ranges comprehensively.
 */
function stripEmojis(text: string): string {
  return text
    // Remove emoji modifiers, symbols, and pictographs
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')   // Misc symbols, dingbats
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')   // Variation selectors
    .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Supplemental symbols
    .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '') // Chess symbols, etc.
    .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '') // Symbols extended
    .replace(/[\u{2702}-\u{27B0}]/gu, '')   // Dingbats
    .replace(/[\u{200D}]/gu, '')             // Zero-width joiner
    .replace(/[\u{20E3}]/gu, '')             // Combining enclosing keycap
    .replace(/[\u{E0020}-\u{E007F}]/gu, '') // Tags
    // Clean up any resulting double spaces
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Ensure body text does not start or end with a variable {{N}}.
 * If it does, wrap with surrounding text.
 */
function ensureBodyNotStartsOrEndsWithVariable(bodyText: string): string {
  let text = bodyText;

  // Check if body starts with a variable like {{1}}
  if (/^\{\{\d+\}\}/.test(text)) {
    text = 'Hello, ' + text;
  }

  // Check if body ends with a variable like {{1}}
  if (/\{\{\d+\}\}$/.test(text)) {
    text = text + ' thank you.';
  }

  return text;
}

/**
 * Strip variable patterns {{N}} from footer text.
 * Meta does not allow variables in footer.
 */
function stripVariablesFromFooter(footerText: string): string {
  return footerText.replace(/\{\{\d+\}\}/g, '').replace(/\s{2,}/g, ' ').trim();
}

/**
 * GET /api/whatsapp/templates
 * List WhatsApp templates for the current tenant.
 * Also returns the setup status (whether Meta is connected, templates imported, etc.)
 * Query: metaCategory, status, setup=true (returns setup status only)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';

    const { searchParams } = new URL(request.url);
    const setupMode = searchParams.get('setup') === 'true';

    // If setup mode, return connection + template status
    if (setupMode) {
      const [providers, templates] = await Promise.all([
        db.communicationProvider.findMany({
          where: { type: 'whatsapp', status: 'active', sendingEnabled: true },
          orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
        }),
        db.campaignTemplate.findMany({
          where: { tenantId, templateType: { in: ['text', 'image', 'document', 'video'] } },
          orderBy: [{ createdAt: 'desc' }],
        }),
      ]);

      const hasActiveProvider = providers.length > 0;
      const importedTemplates = templates.filter(t => t.externalId); // Has been submitted to Meta
      const approvedTemplates = templates.filter(t => t.status === 'approved' || t.isApproved);

      return NextResponse.json({
        setupStatus: {
          metaConnected: hasActiveProvider,
          providerCount: providers.length,
          defaultProvider: providers.find(p => p.isDefault) || providers[0] || null,
          templatesImported: importedTemplates.length,
          templatesApproved: approvedTemplates.length,
          totalTemplates: templates.length,
          preBuiltCount: PRE_BUILT_WHATSAPP_TEMPLATES.length,
          essentialCount: PRE_BUILT_WHATSAPP_TEMPLATES.filter(t => t.essential).length,
          setupStep: !hasActiveProvider ? 1 : importedTemplates.length === 0 ? 3 : approvedTemplates.length === 0 ? 5 : 6,
        },
        preBuiltTemplates: PRE_BUILT_WHATSAPP_TEMPLATES,
      });
    }

    // Normal list mode
    const metaCategory = searchParams.get('metaCategory');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');

    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      db.campaignTemplate.findMany({
        where,
        orderBy: [{ isApproved: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.campaignTemplate.count({ where }),
    ]);

    return NextResponse.json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('[WhatsApp Templates] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

/**
 * POST /api/whatsapp/templates
 * Import pre-built templates into the tenant's CampaignTemplate table.
 * Body: { action: 'import', templateKeys?: string[], companyName?: string }
 *   - templateKeys: specific templates to import (default: all essential)
 *   - companyName: replaces {{company.name}} variable references
 *
 * Body: { action: 'submit', templateId: string }
 *   - Submits a template to Meta for approval via the WhatsApp Business API
 *
 * Body: { action: 'sync_status' }
 *   - Syncs approval status from Meta for all pending templates
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';
    const body = await request.json();
    const action = body.action || 'import';

    // ─── IMPORT pre-built templates ───────────────────────────────
    if (action === 'import') {
      const requestedKeys = body.templateKeys as string[] | undefined;
      const companyName = (body.companyName as string) || 'Our Company';

      // Select templates to import
      const templatesToImport = requestedKeys
        ? PRE_BUILT_WHATSAPP_TEMPLATES.filter(t => requestedKeys.includes(t.key))
        : PRE_BUILT_WHATSAPP_TEMPLATES.filter(t => t.essential);

      if (templatesToImport.length === 0) {
        return NextResponse.json({ error: 'No templates selected for import' }, { status: 400 });
      }

      // Check which templates already exist (by name)
      const existingNames = await db.campaignTemplate.findMany({
        where: { tenantId, name: { in: templatesToImport.map(t => t.name) } },
        select: { name: true },
      });
      const existingNameSet = new Set(existingNames.map(e => e.name));

      const created = [];
      for (const tmpl of templatesToImport) {
        if (existingNameSet.has(tmpl.name)) continue; // Skip duplicates

        // Replace {{company.name}} style references in footer — also strip any remaining variables
        let footerText = tmpl.footerText?.replace(/\{\{2\}\}|\{\{1\}\}/g, companyName) || null;
        if (footerText) {
          footerText = stripVariablesFromFooter(footerText) || null;
        }

        const detectedVars = detectVariablesFromContent(tmpl.bodyText, tmpl.headerText, footerText);

        const record = await db.campaignTemplate.create({
          data: {
            name: tmpl.name,
            description: tmpl.description,
            category: tmpl.businessCategory,
            content: tmpl.bodyText,
            variablesJson: JSON.stringify(detectedVars),
            isApproved: false,
            tenantId,
            workspaceId: user.workspaceId || null,
            language: tmpl.language,
            templateType: tmpl.templateType.toLowerCase(),
            headerText: tmpl.headerText || null,
            footerText,
            buttonsJson: JSON.stringify(tmpl.buttons || []),
            status: 'draft',
            tagsJson: JSON.stringify([tmpl.metaCategory.toLowerCase(), tmpl.businessCategory]),
          },
        });
        created.push(record);
      }

      return NextResponse.json({
        imported: created.length,
        skipped: templatesToImport.length - created.length,
        templates: created,
      }, { status: 201 });
    }

    // ─── SUBMIT a template to Meta for approval ──────────────────
    if (action === 'submit') {
      const templateId = body.templateId as string;
      if (!templateId) {
        return NextResponse.json({ error: 'templateId is required' }, { status: 400 });
      }

      const template = await db.campaignTemplate.findFirst({
        where: { id: templateId, tenantId },
      });
      if (!template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }

      // Resolve WhatsApp credentials via DB fallback chain (tenant own → platform → env)
      const waConfig = await resolveWhatsAppConfig(tenantId);

      if (!waConfig.accessToken || !waConfig.phoneNumberId) {
        return NextResponse.json({ error: 'No active WhatsApp provider configured. Connect Meta first.' }, { status: 400 });
      }

      const accessToken = waConfig.accessToken;
      const wabaId = waConfig.wabaId || '';

      if (!wabaId) {
        return NextResponse.json({ error: 'WhatsApp provider missing business account ID (wabaId). Update provider config.' }, { status: 400 });
      }

      // Map local category to Meta category
      const metaCategory = body.metaCategory || mapToMetaCategory(template.category, template.tagsJson);

      // Build Meta API template payload
      const metaPayload = buildMetaTemplatePayload(template, metaCategory);

      try {
        const response = await fetch(`${WHATSAPP_API_BASE}/${wabaId}/message_templates`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(metaPayload),
        });

        const responseData = await response.json();

        if (!response.ok) {
          const errMsg = responseData?.error?.message || `Meta API error: ${response.status}`;
          console.error('[WhatsApp Templates] Meta submission error:', responseData?.error);

          // Update template status to rejected
          await db.campaignTemplate.update({
            where: { id: templateId },
            data: { status: 'rejected' },
          });

          return NextResponse.json({ error: errMsg, metaError: responseData?.error }, { status: 400 });
        }

        // Success — update template with Meta ID
        const metaTemplateId = responseData?.id || '';
        const metaStatus = responseData?.status || 'PENDING';

        await db.campaignTemplate.update({
          where: { id: templateId },
          data: {
            externalId: metaTemplateId,
            status: mapMetaStatusToLocal(metaStatus),
            isApproved: metaStatus === 'APPROVED',
          },
        });

        return NextResponse.json({
          success: true,
          metaId: metaTemplateId,
          status: metaStatus,
          message: metaStatus === 'APPROVED'
            ? 'Template approved! Ready to use.'
            : 'Template submitted to Meta. Approval typically takes 5-30 minutes.',
        });
      } catch (fetchError) {
        console.error('[WhatsApp Templates] Meta API fetch error:', fetchError);
        return NextResponse.json({ error: 'Failed to connect to Meta API. Check your provider configuration.' }, { status: 500 });
      }
    }

    // ─── SUBMIT ALL pending templates to Meta ─────────────────────
    if (action === 'submit_all') {
      const pendingTemplates = await db.campaignTemplate.findMany({
        where: { tenantId, status: 'draft', externalId: null },
      });

      if (pendingTemplates.length === 0) {
        return NextResponse.json({ message: 'No pending templates to submit', submitted: 0 });
      }

      const waConfig = await resolveWhatsAppConfig(tenantId);

      if (!waConfig.accessToken || !waConfig.phoneNumberId) {
        return NextResponse.json({ error: 'No active WhatsApp provider configured.' }, { status: 400 });
      }

      const accessToken = waConfig.accessToken;
      const wabaId = waConfig.wabaId || '';

      if (!wabaId) {
        return NextResponse.json({ error: 'WhatsApp provider missing business account ID.' }, { status: 400 });
      }

      const results = { submitted: 0, failed: 0, errors: [] as string[] };

      for (const tmpl of pendingTemplates) {
        const metaCategory = mapToMetaCategory(tmpl.category, tmpl.tagsJson);
        const metaPayload = buildMetaTemplatePayload(tmpl, metaCategory);

        try {
          const response = await fetch(`${WHATSAPP_API_BASE}/${wabaId}/message_templates`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(metaPayload),
          });

          const responseData = await response.json();

          if (response.ok) {
            await db.campaignTemplate.update({
              where: { id: tmpl.id },
              data: {
                externalId: responseData?.id || '',
                status: mapMetaStatusToLocal(responseData?.status || 'PENDING'),
                isApproved: responseData?.status === 'APPROVED',
              },
            });
            results.submitted++;
          } else {
            const errMsg = responseData?.error?.error_user_msg || responseData?.error?.message || 'Unknown error';
            await db.campaignTemplate.update({
              where: { id: tmpl.id },
              data: { status: 'rejected' },
            });
            results.failed++;
            results.errors.push(`${tmpl.name}: ${errMsg}`);
          }
        } catch {
          results.failed++;
          results.errors.push(`${tmpl.name}: Network error`);
        }
      }

      return NextResponse.json(results);
    }

    // ─── SYNC status from Meta for all templates ──────────────────
    if (action === 'sync_status') {
      const waConfig = await resolveWhatsAppConfig(tenantId);

      if (!waConfig.accessToken || !waConfig.phoneNumberId) {
        return NextResponse.json({ error: 'No active WhatsApp provider.' }, { status: 400 });
      }

      const accessToken = waConfig.accessToken;
      const wabaId = waConfig.wabaId || '';

      if (!wabaId) {
        return NextResponse.json({ error: 'Provider missing business account ID.' }, { status: 400 });
      }

      try {
        const response = await fetch(
          `${WHATSAPP_API_BASE}/${wabaId}/message_templates?limit=100`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          return NextResponse.json({ error: 'Failed to fetch from Meta', details: errData }, { status: 500 });
        }

        const data = await response.json() as { data: Array<{ id: string; name: string; status: string; category: string; language: string }> };
        let synced = 0;
        let created = 0;

        for (const metaTmpl of (data.data || [])) {
          // First try matching by externalId
          let local = await db.campaignTemplate.findFirst({
            where: { externalId: metaTmpl.id, tenantId },
          });

          // If no match by externalId, try matching by name
          if (!local) {
            local = await db.campaignTemplate.findFirst({
              where: { name: metaTmpl.name, tenantId },
            });
          }

          if (local) {
            // Update existing record with Meta status and externalId
            await db.campaignTemplate.update({
              where: { id: local.id },
              data: {
                externalId: metaTmpl.id,
                status: mapMetaStatusToLocal(metaTmpl.status),
                isApproved: metaTmpl.status === 'APPROVED',
              },
            });
            synced++;
          } else {
            // No local match — create a new CampaignTemplate record for this Meta template
            // Determine a reasonable category from Meta's category
            const localCategory = mapMetaCategoryToLocal(metaTmpl.category);
            const metaCategoryLower = metaTmpl.category?.toLowerCase() || 'utility';

            try {
              await db.campaignTemplate.create({
                data: {
                  name: metaTmpl.name,
                  description: `Template synced from Meta (${metaTmpl.status})`,
                  category: localCategory,
                  content: '', // Body text not available from list endpoint
                  variablesJson: '[]',
                  isApproved: metaTmpl.status === 'APPROVED',
                  tenantId,
                  workspaceId: null,
                  language: metaTmpl.language || 'en',
                  templateType: 'text',
                  externalId: metaTmpl.id,
                  status: mapMetaStatusToLocal(metaTmpl.status),
                  tagsJson: JSON.stringify([metaCategoryLower, localCategory]),
                },
              });
              created++;
            } catch (createErr) {
              console.error('[WhatsApp Templates] Failed to create record for Meta template:', metaTmpl.name, createErr);
            }
          }
        }

        return NextResponse.json({ synced, created, total: (data.data || []).length });
      } catch {
        return NextResponse.json({ error: 'Failed to sync from Meta API' }, { status: 500 });
      }
    }

    return NextResponse.json({ error: 'Invalid action. Use: import, submit, submit_all, sync_status' }, { status: 400 });
  } catch (error) {
    console.error('[WhatsApp Templates] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────

function mapToMetaCategory(localCategory: string, tagsJson: string): string {
  // Check tagsJson for meta category hint
  try {
    const tags = JSON.parse(tagsJson) as string[];
    if (tags.includes('authentication')) return 'AUTHENTICATION';
    if (tags.includes('marketing')) return 'MARKETING';
    if (tags.includes('utility')) return 'UTILITY';
  } catch { /* empty */ }

  // Map from business category
  const marketingCategories = ['promotions', 'leads', 'referrals', 'reviews'];
  const authCategories = ['auth'];

  if (marketingCategories.includes(localCategory)) return 'MARKETING';
  if (authCategories.includes(localCategory)) return 'AUTHENTICATION';
  return 'UTILITY'; // Default to UTILITY (highest approval rate)
}

function mapMetaCategoryToLocal(metaCategory: string): string {
  const lower = metaCategory?.toLowerCase() || '';
  if (lower === 'authentication') return 'auth';
  if (lower === 'marketing') return 'promotions';
  return 'general';
}

function mapMetaStatusToLocal(metaStatus: string): string {
  const map: Record<string, string> = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    PENDING_DELETION: 'disabled',
    DELETED: 'disabled',
    DISABLED: 'disabled',
    IN_APPEAL: 'pending',
    PAUSED: 'paused',
  };
  return map[metaStatus] || 'pending';
}

function buildMetaTemplatePayload(
  template: {
    name: string;
    content: string;
    headerText: string | null;
    footerText: string | null;
    buttonsJson: string;
    templateType: string;
    language: string;
  },
  metaCategory: string
): Record<string, unknown> {
  // Clean template name for Meta (lowercase, underscores, no spaces)
  const cleanName = template.name
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 512);

  const payload: Record<string, unknown> = {
    name: cleanName,
    category: metaCategory,
    language: template.language === 'en' ? 'en_US' : template.language,
  };

  // Build components
  const components: Record<string, unknown>[] = [];

  // Header — Meta doesn't allow emojis, formatting, or newlines in headers
  if (template.headerText) {
    const cleanHeader = stripEmojis(template.headerText)
      .replace(/[*_~`]/g, '')    // Remove markdown formatting
      .replace(/\n/g, ' ')       // Replace newlines with space
      .trim();
    if (cleanHeader) {
      components.push({
        type: 'HEADER',
        format: 'TEXT',
        text: cleanHeader.slice(0, 60), // Meta limit: 60 chars
      });
    }
  }

  // Body — different format for AUTHENTICATION vs others
  if (metaCategory === 'AUTHENTICATION') {
    // AUTHENTICATION category: BODY must NOT have a text field
    // Instead use add_safety_recommendation
    components.push({
      type: 'BODY',
      add_safety_recommendation: true,
    });
  } else {
    // UTILITY / MARKETING: body with text, ensuring compliance
    let bodyText = stripEmojis(template.content);
    bodyText = ensureBodyNotStartsOrEndsWithVariable(bodyText);
    components.push({
      type: 'BODY',
      text: bodyText,
    });
  }

  // Footer — strip emojis and variables (Meta doesn't allow variables in footer)
  if (template.footerText) {
    const cleanFooter = stripEmojis(stripVariablesFromFooter(template.footerText));
    if (cleanFooter) {
      components.push({
        type: 'FOOTER',
        text: cleanFooter.slice(0, 60), // Meta limit: 60 chars
      });
    }
  }

  // Buttons
  try {
    const buttons = JSON.parse(template.buttonsJson) as Array<{ type: string; text: string; url?: string; phoneNumber?: string }>;
    if (buttons.length > 0) {
      const metaButtons = buttons.slice(0, 3).map((btn) => {
        // Strip emojis and special chars from button text (Meta restriction)
        let cleanBtnText = stripEmojis(btn.text)
          .replace(/[*_~`]/g, '')   // Remove markdown
          .trim()
          .slice(0, 25);

        // Fallback if button text becomes empty after stripping
        if (!cleanBtnText) cleanBtnText = 'Option';

        const btnPayload: Record<string, unknown> = {
          type: btn.type === 'quick_reply' ? 'QUICK_REPLY' : btn.type.toUpperCase(),
          text: cleanBtnText,
        };

        if (btn.type.toUpperCase() === 'URL' && btn.url) {
          btnPayload.url = btn.url;
        }
        if (btn.type.toUpperCase() === 'CALL' && btn.phoneNumber) {
          btnPayload.phone_number = btn.phoneNumber;
        }
        if (btn.type.toUpperCase() === 'COPY_CODE') {
          // COPY_CODE button for AUTHENTICATION templates
          // Meta requires the button type to be COPY_CODE with otp_type
          btnPayload.type = 'COPY_CODE';
          btnPayload.otp_type = 'ONE_TIME_AUTH_CODE';
        }

        return btnPayload;
      });
      components.push({ type: 'BUTTONS', buttons: metaButtons });
    }
  } catch { /* no buttons */ }

  payload.components = components;
  return payload;
}

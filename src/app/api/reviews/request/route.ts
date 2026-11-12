import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { sendWhatsAppMessage } from '@/lib/whatsapp-send';
import { sendSmsMessage } from '@/lib/sms-send';
import { checkWhatsAppCredits } from '@/lib/credit-management';
import { logActivity } from '@/lib/activity-log';
import { prepareGoogleAccount } from '@/lib/social/google-account-helper';
import { getAppUrl } from '@/lib/brand';
import { resolveWhatsAppConfig } from '@/lib/whatsapp-config';
import {
  BGOS_CANONICAL_META_TEMPLATES,
  REVIEW_INVITE_TEMPLATE_NAMES,
  buildMetaTemplateSendPayload,
  buildReviewInviteTemplateParams,
  formatBgosMetaTemplateBody,
  hasDynamicUrlButton,
  isReviewInviteTemplateName,
  sanitizeReviewPersonalNote,
} from '@/lib/bgos-meta-templates';
import {
  resolveTenantLocale,
  normalizePhoneWithCountry,
  computeLocalScheduledDate,
  getLocalDateParts,
  parseHourMinute,
} from '@/lib/locale-timezone';
import { normalizePhone } from '@/lib/customer-normalize';

interface ReviewCrmSyncSummary {
  customersCreated: number;
  customersMatched: number;
  leadsCreated: number;
  leadsMatched: number;
}

function getPhoneTail(raw: string | null | undefined): string | null {
  const digits = normalizePhone(raw);
  if (!digits) return null;
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

function isPlaceholderCustomerName(name: string | null | undefined): boolean {
  const trimmed = (name || '').trim();
  if (!trimmed) return true;
  return /^Customer\s+\d+$/i.test(trimmed) || /^Customer$/i.test(trimmed);
}

/**
 * Dedupe & upsert review-invite recipients into Customer and Lead CRM tables.
 * Preserves existing real names, never creates duplicate Customer/Lead rows for
 * the same normalized phone, and uses 'won' stage by default so open Deals aren't polluted.
 */
async function syncReviewRecipientsToCrm(params: {
  tenantId: string;
  workspaceId?: string | null;
  recipients: Array<[string, string | null]>;
  channel: 'whatsapp' | 'sms';
  source: string;
  saveToCustomers: boolean;
  saveToLeads: boolean;
  leadStatus: string;
}): Promise<ReviewCrmSyncSummary> {
  const summary: ReviewCrmSyncSummary = {
    customersCreated: 0,
    customersMatched: 0,
    leadsCreated: 0,
    leadsMatched: 0,
  };
  if ((!params.saveToCustomers && !params.saveToLeads) || params.recipients.length === 0) {
    return summary;
  }

  const canQueryCustomers = typeof (db as any).customer?.findMany === 'function' && typeof (db as any).customer?.create === 'function';
  const canQueryLeads = typeof (db as any).lead?.findMany === 'function' && typeof (db as any).lead?.create === 'function';
  if (!canQueryCustomers && !canQueryLeads) {
    return summary;
  }

  let resolvedWorkspaceId = params.workspaceId || null;
  let tenantCurrency = 'USD';
  try {
    if (!resolvedWorkspaceId && typeof (db as any).workspace?.findFirst === 'function') {
      const ws = await db.workspace.findFirst({
        where: { tenantId: params.tenantId },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      resolvedWorkspaceId = ws?.id ?? null;
    }
    if (typeof (db as any).tenant?.findUnique === 'function') {
      const tenant = await db.tenant.findUnique({
        where: { id: params.tenantId },
        select: { currency: true },
      });
      if (tenant?.currency) tenantCurrency = tenant.currency;
    }
  } catch {}

  const customerByKey = new Map<string, { id: string; name: string }>();
  if (canQueryCustomers) {
    try {
      const existingCustomers = await db.customer.findMany({
        where: { tenantId: params.tenantId },
        select: { id: true, name: true, phone: true, normalizedPhone: true },
        take: 2500,
      });
      for (const c of existingCustomers) {
        const norm = c.normalizedPhone || normalizePhone(c.phone);
        const tail = getPhoneTail(norm || c.phone);
        const entry = { id: c.id, name: c.name };
        if (norm) customerByKey.set(norm, entry);
        if (tail) customerByKey.set(`tail:${tail}`, entry);
      }
    } catch {}
  }

  const leadByKey = new Map<string, { id: string; customerId: string | null; tagsJson: string; notesJson: string }>();
  if (canQueryLeads) {
    try {
      const existingLeads = await db.lead.findMany({
        where: { tenantId: params.tenantId },
        select: { id: true, phone: true, customerId: true, tagsJson: true, notesJson: true },
        take: 2500,
      });
      for (const l of existingLeads) {
        const norm = normalizePhone(l.phone);
        const tail = getPhoneTail(l.phone);
        const entry = {
          id: l.id,
          customerId: l.customerId || null,
          tagsJson: l.tagsJson || '[]',
          notesJson: l.notesJson || '[]',
        };
        if (l.customerId) leadByKey.set(`cust:${l.customerId}`, entry);
        if (norm) leadByKey.set(norm, entry);
        if (tail) leadByKey.set(`tail:${tail}`, entry);
      }
    } catch {}
  }

  const timestampIso = new Date().toISOString();
  const noteEntry = {
    text: `Google review invite sent via ${params.channel.toUpperCase()} (${params.source || 'review_request'})`,
    createdAt: timestampIso,
  };

  for (const [phone, rawName] of params.recipients) {
    const normPhone = normalizePhone(phone);
    const tail = getPhoneTail(phone);
    if (!normPhone && !tail) continue;

    const cleanInputName = typeof rawName === 'string' && rawName.trim() ? rawName.trim() : '';
    const displayName = cleanInputName || `Customer ${phone.slice(-4)}`;

    // 1. Customer upsert
    let customerId: string | null = null;
    if (canQueryCustomers) {
      const existingCustomer =
        (normPhone ? customerByKey.get(normPhone) : undefined) ||
        (tail ? customerByKey.get(`tail:${tail}`) : undefined);

      if (existingCustomer) {
        customerId = existingCustomer.id;
        summary.customersMatched++;
        if (
          cleanInputName &&
          isPlaceholderCustomerName(existingCustomer.name) &&
          typeof (db as any).customer?.update === 'function'
        ) {
          await db.customer
            .update({ where: { id: existingCustomer.id }, data: { name: cleanInputName } })
            .catch(() => {});
          existingCustomer.name = cleanInputName;
        }
      } else if (params.saveToCustomers) {
        try {
          const createdCustomer = await db.customer.create({
            data: {
              name: displayName,
              phone,
              normalizedPhone: normPhone,
              workspaceId: resolvedWorkspaceId,
              tenantId: params.tenantId,
              leadSource: 'review_request',
              preferredCurrency: tenantCurrency,
            },
            select: { id: true, name: true },
          });
          customerId = createdCustomer.id;
          const entry = { id: createdCustomer.id, name: createdCustomer.name };
          if (normPhone) customerByKey.set(normPhone, entry);
          if (tail) customerByKey.set(`tail:${tail}`, entry);
          summary.customersCreated++;
        } catch {
          // Handle concurrent creation gracefully by looking up once
          if (normPhone && typeof (db as any).customer?.findFirst === 'function') {
            const raced = await db.customer
              .findFirst({ where: { tenantId: params.tenantId, normalizedPhone: normPhone }, select: { id: true, name: true } })
              .catch(() => null);
            if (raced) {
              customerId = raced.id;
              customerByKey.set(normPhone, raced);
              summary.customersMatched++;
            }
          }
        }
      }
    }

    // 2. Lead upsert (link existing Lead or create a non-polluting post-service Lead)
    if (canQueryLeads) {
      const existingLead =
        (customerId ? leadByKey.get(`cust:${customerId}`) : undefined) ||
        (normPhone ? leadByKey.get(normPhone) : undefined) ||
        (tail ? leadByKey.get(`tail:${tail}`) : undefined);

      if (existingLead) {
        summary.leadsMatched++;
        if (typeof (db as any).lead?.update === 'function') {
          let nextTags: string[] = [];
          try {
            const parsedTags = JSON.parse(existingLead.tagsJson || '[]');
            if (Array.isArray(parsedTags)) nextTags = parsedTags.map(String);
          } catch {}
          if (!nextTags.includes('review_requested')) nextTags.push('review_requested');

          let nextNotes: Array<Record<string, unknown>> = [];
          try {
            const parsedNotes = JSON.parse(existingLead.notesJson || '[]');
            if (Array.isArray(parsedNotes)) nextNotes = parsedNotes;
          } catch {}
          nextNotes.unshift(noteEntry);

          await db.lead
            .update({
              where: { id: existingLead.id },
              data: {
                ...(customerId && !existingLead.customerId ? { customerId } : {}),
                tagsJson: JSON.stringify(nextTags.slice(0, 12)),
                notesJson: JSON.stringify(nextNotes.slice(0, 30)),
              },
            })
            .catch(() => {});
        }
      } else if (params.saveToLeads) {
        try {
          const createdLead = await db.lead.create({
            data: {
              title: `Review Invite · ${displayName}`,
              name: displayName,
              phone,
              source: 'review_request',
              status: params.leadStatus,
              priority: 'low',
              value: 0,
              description: noteEntry.text,
              tenantId: params.tenantId,
              customerId,
              tagsJson: JSON.stringify(['review_requested']),
              notesJson: JSON.stringify([noteEntry]),
            },
            select: { id: true, customerId: true, tagsJson: true, notesJson: true },
          });
          const leadEntry = {
            id: createdLead.id,
            customerId: createdLead.customerId || null,
            tagsJson: createdLead.tagsJson || '["review_requested"]',
            notesJson: createdLead.notesJson || '[]',
          };
          if (customerId) leadByKey.set(`cust:${customerId}`, leadEntry);
          if (normPhone) leadByKey.set(normPhone, leadEntry);
          if (tail) leadByKey.set(`tail:${tail}`, leadEntry);
          summary.leadsCreated++;
        } catch {}
      }
    }
  }

  return summary;
}

interface RecipientInput {
  name?: string;
  phone: string;
}

export interface ReviewMetaTemplateOption {
  name: string;
  displayName: string;
  language: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'DRAFT';
  category: 'MARKETING' | 'UTILITY';
  bodyText: string;
  variableDescriptions: string[];
  defaultExampleValues: string[];
  supportsCustomNote: boolean;
  hasDynamicUrlButton: boolean;
  buttonText?: string;
  buttons?: Array<{ type: string; text: string; url?: string; example?: string[] }>;
  isCustom?: boolean;
}

function toIsoStringSafe(val: unknown): string | null {
  if (!val) return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val.toISOString();
  }
  if (typeof val === 'string') {
    const s = val.trim();
    if (!s) return null;
    const normalized =
      /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(s) && !s.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(s)
        ? `${s.replace(' ', 'T')}Z`
        : s;
    const d = new Date(normalized);
    return isNaN(d.getTime()) ? s : d.toISOString();
  }
  return null;
}

async function resolveWorkspaceReviewContext(
  tenantId: string,
  bodyReviewLink?: unknown,
  bodyBusinessName?: unknown,
  overrideCountry?: string | null,
  overrideTimeZone?: string | null,
) {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      slug: true,
      country: true,
      settingsJson: true,
      googlePlaceId: true,
      googleBusinessProfileUrl: true,
      brandProfile: {
        select: { businessName: true },
      },
    },
  });

  const locale = resolveTenantLocale({
    tenantCountry: tenant?.country,
    settingsJson: tenant?.settingsJson,
    overrideCountry,
    overrideTimeZone,
  });

  let reviewLink =
    typeof bodyReviewLink === 'string' && bodyReviewLink.startsWith('http')
      ? bodyReviewLink.trim()
      : '';
  if (!reviewLink && tenant?.googleBusinessProfileUrl) {
    reviewLink = tenant.googleBusinessProfileUrl;
  }
  if (!reviewLink && tenant?.googlePlaceId) {
    reviewLink = `https://search.google.com/local/writereview?placeid=${tenant.googlePlaceId}`;
  }
  if (!reviewLink) {
    try {
      const googleAccount = await prepareGoogleAccount(tenantId);
      const meta = (googleAccount?.metadata || {}) as Record<string, any>;
      if (meta.placeId) {
        reviewLink = `https://search.google.com/local/writereview?placeid=${meta.placeId}`;
      } else if (meta.mapsUri) {
        reviewLink = meta.mapsUri;
      }
    } catch {}
  }

  const businessName =
    typeof bodyBusinessName === 'string' && bodyBusinessName.trim()
      ? bodyBusinessName.trim()
      : tenant?.brandProfile?.businessName || tenant?.name || 'our team';

  // Fallback to Google Maps search query link if the business has a name so bulk invites don't hard-fail before Place ID sync
  if (!reviewLink && businessName && businessName !== 'our team') {
    reviewLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(businessName)}`;
  }

  const shortRedirectCode = (tenant?.slug || tenantId || '').trim();
  const appOrigin = getAppUrl().replace(/\/+$/, '');
  const shortReviewUrl = shortRedirectCode
    ? `${appOrigin}/r/${encodeURIComponent(shortRedirectCode)}`
    : reviewLink;

  return { businessName, reviewLink, shortRedirectCode, shortReviewUrl, locale };
}

function normalizeCampaignStatus(
  status?: string | null,
  isApproved?: boolean | null,
): 'APPROVED' | 'PENDING' | 'REJECTED' | 'DRAFT' {
  if (isApproved) return 'APPROVED';
  const s = String(status || '').trim().toLowerCase();
  if (s === 'approved') return 'APPROVED';
  if (s === 'rejected') return 'REJECTED';
  if (s === 'pending') return 'PENDING';
  return 'DRAFT';
}

function parseButtonsSafe(
  raw: string | null | undefined,
): Array<{ type: string; text: string; url?: string; example?: string[] }> {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function getReviewTemplateCatalog(tenantId: string): Promise<ReviewMetaTemplateOption[]> {
  let dbRows: Array<{
    id: string;
    name: string;
    description?: string | null;
    category: string;
    language: string;
    status: string;
    isApproved: boolean;
    content: string;
    buttonsJson: string;
    tagsJson?: string;
  }> = [];

  try {
    const findMany = (
      db as unknown as {
        campaignTemplate?: {
          findMany?: (args: unknown) => Promise<typeof dbRows>;
        };
      }
    )?.campaignTemplate?.findMany;

    if (typeof findMany === 'function') {
      const rows = await findMany({
        where: { tenantId },
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          language: true,
          status: true,
          isApproved: true,
          content: true,
          buttonsJson: true,
          tagsJson: true,
        },
      });
      if (Array.isArray(rows)) {
        dbRows = rows;
      }
    }
  } catch {
    dbRows = [];
  }

  const dbByName = new Map<string, (typeof dbRows)[number]>();
  for (const row of dbRows) {
    const key = String(row.name || '').trim().toLowerCase();
    if (!key) continue;
    const prev = dbByName.get(key);
    // Prefer approved records if duplicate template names exist across languages
    if (!prev || (!prev.isApproved && (row.isApproved || row.status === 'approved'))) {
      dbByName.set(key, row);
    }
  }

  const options: ReviewMetaTemplateOption[] = [];
  const seenNames = new Set<string>();

  for (const name of REVIEW_INVITE_TEMPLATE_NAMES) {
    const canon = BGOS_CANONICAL_META_TEMPLATES.find((t) => t.name === name);
    if (!canon) continue;
    const dbRow = dbByName.get(name.toLowerCase());
    const dbButtons = dbRow ? parseButtonsSafe(dbRow.buttonsJson) : [];
    const effectiveButtons = dbButtons.length > 0 ? dbButtons : canon.buttons || [];
    const effectiveBody = dbRow?.content?.trim() ? dbRow.content.trim() : canon.bodyText;
    const status = dbRow ? normalizeCampaignStatus(dbRow.status, dbRow.isApproved) : canon.status;
    const urlBtn = effectiveButtons.find((b) => String(b.type || '').toUpperCase() === 'URL');

    seenNames.add(canon.name.toLowerCase());
    options.push({
      name: canon.name,
      displayName: canon.displayName,
      language: dbRow?.language || canon.language,
      status,
      category: canon.category === 'UTILITY' ? 'UTILITY' : 'MARKETING',
      bodyText: effectiveBody,
      variableDescriptions: canon.variableDescriptions,
      defaultExampleValues: canon.defaultExampleValues,
      supportsCustomNote: Boolean(canon.supportsCustomNote),
      hasDynamicUrlButton: hasDynamicUrlButton(effectiveButtons),
      buttonText: urlBtn?.text || 'Leave Google Review',
      buttons: effectiveButtons,
      isCustom: false,
    });
  }

  // Include tenant's own APPROVED custom review templates created in Meta Templates Studio
  for (const row of dbRows) {
    const key = String(row.name || '').trim().toLowerCase();
    if (!key || seenNames.has(key)) continue;
    const status = normalizeCampaignStatus(row.status, row.isApproved);
    if (status !== 'APPROVED') continue;
    if (!row.content?.trim()) continue;

    const categoryLower = String(row.category || '').toLowerCase();
    const isReviewCandidate =
      isReviewInviteTemplateName(row.name) ||
      categoryLower === 'reviews';
    if (!isReviewCandidate) continue;

    const buttons = parseButtonsSafe(row.buttonsJson);
    const urlBtn = buttons.find((b) => String(b.type || '').toUpperCase() === 'URL');
    const varMatches = row.content.match(/\{\{(\d+)\}\}/g) || [];
    const maxVar = varMatches.reduce((max, tok) => {
      const n = Number.parseInt(tok.replace(/[{}]/g, ''), 10);
      return Number.isFinite(n) && n > max ? n : max;
    }, 0);
    const variableDescriptions = Array.from({ length: maxVar }, (_, idx) => {
      if (idx === 0) return 'Customer Name';
      if (idx === 1) return 'Business Name';
      if (idx === 2) return 'Review Link or Note';
      return `Variable ${idx + 1}`;
    });

    seenNames.add(key);
    options.push({
      name: row.name,
      displayName: row.description?.trim() || row.name.replace(/_/g, ' '),
      language: row.language || 'en_US',
      status,
      category: categoryLower === 'general' ? 'UTILITY' : 'MARKETING',
      bodyText: row.content.trim(),
      variableDescriptions,
      defaultExampleValues: variableDescriptions.map((_, idx) => `Sample ${idx + 1}`),
      supportsCustomNote: maxVar >= 3,
      hasDynamicUrlButton: hasDynamicUrlButton(buttons),
      buttonText: urlBtn?.text,
      buttons,
      isCustom: true,
    });
  }

  return options;
}

function resolveSelectedReviewTemplate(
  catalog: ReviewMetaTemplateOption[],
  requestedName?: unknown,
  requestedLanguage?: unknown,
): ReviewMetaTemplateOption {
  const reqName = typeof requestedName === 'string' ? requestedName.trim() : '';
  if (reqName) {
    const exact = catalog.find((t) => t.name.toLowerCase() === reqName.toLowerCase());
    if (exact) return exact;
  }

  const reqLang = typeof requestedLanguage === 'string' ? requestedLanguage.trim().toLowerCase() : '';
  if (reqLang === 'hi') {
    const hiApproved = catalog.find((t) => t.language.toLowerCase().startsWith('hi') && t.status === 'APPROVED');
    if (hiApproved) return hiApproved;
    const hiTpl = catalog.find((t) => t.language.toLowerCase().startsWith('hi'));
    if (hiTpl) return hiTpl;
  }

  return (
    catalog.find((t) => t.status === 'APPROVED') ||
    catalog.find((t) => t.name === 'bgos_review_clean_feedback') ||
    catalog.find((t) => t.name === 'bgos_review_invite_en') ||
    catalog[0]
  );
}

function buildReviewInviteMessage(options: {
  customerName?: string | null;
  businessName: string;
  reviewLink: string;
  includeDirectLink?: boolean;
  customTemplate?: string;
}): string {
  const { customerName, businessName, reviewLink, includeDirectLink = true, customTemplate } = options;
  const trimmedName = (customerName || '').trim();
  const firstName = trimmedName ? trimmedName.split(/\s+/)[0] : '';

  if (customTemplate && customTemplate.trim()) {
    let text = customTemplate
      .replace(/\{firstName\}|\{FirstName\}/g, firstName || 'there')
      .replace(/\{name\}|\{Name\}/g, trimmedName || 'there')
      .replace(/\{businessName\}/g, businessName)
      .replace(/\{reviewLink\}/g, reviewLink);
    if (includeDirectLink && !text.includes(reviewLink)) {
      text += `\n\n${reviewLink}`;
    }
    return text.trim();
  }

  const greeting = firstName ? `Hello ${firstName},` : 'Hello there,';
  return `${greeting}\n\nPlease share your feedback on your recent experience at *${businessName}*:\n${reviewLink}\n\n*${businessName}* Team`;
}

function buildTemplatePreviewMessage(options: {
  template: ReviewMetaTemplateOption;
  parameters: string[];
  reviewLink: string;
}): string {
  const rendered = formatBgosMetaTemplateBody(
    {
      name: options.template.name,
      displayName: options.template.displayName,
      category: options.template.category,
      language: options.template.language,
      status: options.template.status,
      bodyText: options.template.bodyText,
      variableDescriptions: options.template.variableDescriptions,
      defaultExampleValues: options.template.defaultExampleValues,
      serviceTouchpoint: 'completion',
    },
    options.parameters,
  );
  if (options.reviewLink && !rendered.includes(options.reviewLink)) {
    return `${rendered}\n\n🔗 Review Link: ${options.reviewLink}`;
  }
  return rendered;
}

async function isWhatsAppCloudReady(tenantId: string): Promise<{ ready: boolean; source: string }> {
  try {
    const credit = await checkWhatsAppCredits(tenantId);
    if (!credit.allowed) return { ready: false, source: 'blocked' };
    const waConfig = await resolveWhatsAppConfig(tenantId);
    if (waConfig.accessToken && waConfig.phoneNumberId) {
      return { ready: true, source: waConfig.source || 'provider' };
    }
    return { ready: false, source: waConfig.source || 'none' };
  } catch {
    return { ready: false, source: 'none' };
  }
}

async function isSmsGatewayReady(tenantId: string): Promise<boolean> {
  try {
    const provider = await db.communicationProvider.findFirst({
      where: {
        type: 'sms',
        status: 'active',
        sendingEnabled: true,
        OR: [{ tenantId }, { isPlatform: true }],
      },
      select: { id: true },
    });
    if (provider) return true;
    return Boolean(
      process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_PHONE_NUMBER,
    );
  } catch {
    return false;
  }
}

/**
 * GET /api/reviews/request
 * Returns bulk review invite queue summary, upcoming batches, CRM contact candidates,
 * workspace country/timezone metadata, and real WhatsApp/SMS channel readiness.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const overrideCountry = searchParams.get('country');
    const overrideTimeZone = searchParams.get('timeZone');

    const tenantId = user.tenantId;
    const ctx = await resolveWorkspaceReviewContext(tenantId, undefined, undefined, overrideCountry, overrideTimeZone);

    const [waStatus, smsAvailable, metaTemplates, scheduledRows, recentBookings, crmCustomers] = await Promise.all([
      isWhatsAppCloudReady(tenantId),
      isSmsGatewayReady(tenantId),
      getReviewTemplateCatalog(tenantId),
      db.scheduledMessage
        .findMany({
          where: { tenantId, messageType: 'review_request' },
          orderBy: { dueAt: 'asc' },
          take: 150,
          select: {
            id: true,
            channel: true,
            recipientPhone: true,
            bodyText: true,
            dueAt: true,
            sentAt: true,
            status: true,
            lastError: true,
            metadataJson: true,
          },
        })
        .catch(() => []),
      db.booking
        .findMany({
          where: {
            tenantId,
            customerPhone: { not: null },
          },
          orderBy: [{ completedAt: 'desc' }, { scheduledAt: 'desc' }],
          take: 60,
          select: { id: true, customerName: true, customerPhone: true, status: true },
        })
        .catch(() => []),
      db.customer
        .findMany({
          where: {
            tenantId,
            phone: { not: '' },
          },
          orderBy: { createdAt: 'desc' },
          take: 60,
          select: { id: true, name: true, phone: true },
        })
        .catch(() => []),
    ]);

    const hasWhatsAppProvider = waStatus.ready;
    const hasApprovedReviewTemplate = metaTemplates.some((t) => t.status === 'APPROVED');
    const activeMetaTemplateStatus =
      metaTemplates.find((t) => t.status === 'APPROVED')?.status || metaTemplates[0]?.status || 'PENDING';

    const pendingPhones = new Set(
      scheduledRows
        .filter((r) => r.status === 'pending' && r.recipientPhone)
        .map((r) => r.recipientPhone as string),
    );

    const candidateMap = new Map<
      string,
      { name: string; phone: string; source: 'booking' | 'crm'; alreadyQueued: boolean }
    >();
    for (const b of recentBookings) {
      const norm = b.customerPhone ? normalizePhoneWithCountry(b.customerPhone, ctx.locale.callingCode) : null;
      if (norm && !candidateMap.has(norm)) {
        candidateMap.set(norm, {
          name: b.customerName?.trim() || 'Customer',
          phone: norm,
          source: 'booking',
          alreadyQueued: pendingPhones.has(norm),
        });
      }
    }
    for (const c of crmCustomers) {
      const norm = c.phone ? normalizePhoneWithCountry(c.phone, ctx.locale.callingCode) : null;
      if (norm && !candidateMap.has(norm)) {
        candidateMap.set(norm, {
          name: c.name?.trim() || 'Customer',
          phone: norm,
          source: 'crm',
          alreadyQueued: pendingPhones.has(norm),
        });
      }
    }

    const items = scheduledRows.map((row) => {
      let meta: Record<string, any> = {};
      try {
        meta = JSON.parse(row.metadataJson || '{}');
      } catch {}
      return {
        id: row.id,
        channel: row.channel,
        phone: row.recipientPhone || '',
        customerName: typeof meta.customerName === 'string' ? meta.customerName : '',
        source: typeof meta.source === 'string' ? meta.source : 'manual',
        batchDay: typeof meta.batchDay === 'number' ? meta.batchDay : undefined,
        timeZone: typeof meta.timeZone === 'string' ? meta.timeZone : ctx.locale.timeZone,
        country: typeof meta.country === 'string' ? meta.country : ctx.locale.country,
        metaTemplateName: typeof meta.metaTemplateName === 'string' ? meta.metaTemplateName : null,
        metaTemplateStatus: typeof meta.metaTemplateStatus === 'string' ? meta.metaTemplateStatus : null,
        message: row.bodyText || '',
        dueAt: toIsoStringSafe(row.dueAt) || new Date().toISOString(),
        sentAt: toIsoStringSafe(row.sentAt),
        status: row.status,
        lastError: row.lastError || null,
      };
    });

    const pendingCount = items.filter((i) => i.status === 'pending').length;
    const sentCount = items.filter((i) => i.status === 'sent').length;
    const failedCount = items.filter((i) => i.status === 'failed').length;
    const nextPending = items.find((i) => i.status === 'pending');

    return NextResponse.json({
      hasWhatsAppProvider,
      waConfigSource: waStatus.source,
      smsAvailable,
      businessName: ctx.businessName,
      reviewLink: ctx.reviewLink,
      shortRedirectCode: ctx.shortRedirectCode,
      shortReviewUrl: ctx.shortReviewUrl,
      metaTemplates,
      hasApprovedReviewTemplate,
      activeMetaTemplateStatus,
      locale: ctx.locale,
      queue: {
        pending: pendingCount,
        sent: sentCount,
        failed: failedCount,
        total: items.length,
        dailyLimit: 5,
        nextBatchAt: nextPending?.dueAt || null,
        items: items.slice(0, 100),
      },
      candidates: Array.from(candidateMap.values()).slice(0, 60),
    });
  } catch (error) {
    console.error('[api/reviews/request] GET error:', error);
    return NextResponse.json({ error: 'Failed to load review invite queue' }, { status: 500 });
  }
}

/**
 * POST /api/reviews/request
 * Send, bulk-schedule, or dispatch Google review invites in the tenant's country timezone.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const action = typeof body.action === 'string' ? body.action.trim() : '';

    // Fast path: allow marking a 1-tap WhatsApp queue item as sent, or running due pending invites
    if (action === 'mark_sent' && typeof body.id === 'string') {
      const existing = await db.scheduledMessage.findFirst({
        where: { id: body.id.trim(), tenantId: user.tenantId, messageType: 'review_request' },
        select: { id: true },
      });
      if (!existing) {
        return NextResponse.json({ error: 'Scheduled invite not found' }, { status: 404 });
      }
      await db.scheduledMessage.update({
        where: { id: existing.id },
        data: { status: 'sent', sentAt: new Date(), lastError: null, updatedAt: new Date() },
      });
      return NextResponse.json({ success: true, id: existing.id, status: 'sent' });
    }

    if (action === 'dispatch_now' || action === 'retry_failed') {
      const targetIds: string[] = Array.isArray(body.ids)
        ? body.ids.filter((id: unknown): id is string => typeof id === 'string')
        : typeof body.id === 'string'
          ? [body.id]
          : [];

      const [rows, ctx, metaTemplates] = await Promise.all([
        db.scheduledMessage.findMany({
          where: {
            tenantId: user.tenantId,
            messageType: 'review_request',
            ...(targetIds.length > 0
              ? { id: { in: targetIds } }
              : action === 'retry_failed'
                ? { status: 'failed' }
                : { status: 'pending' }),
          },
          orderBy: { dueAt: 'asc' },
          take: 10,
        }),
        resolveWorkspaceReviewContext(user.tenantId),
        getReviewTemplateCatalog(user.tenantId),
      ]);

      if (!rows.length) {
        return NextResponse.json({ success: true, sentCount: 0, failedCount: 0, message: 'No matching invites to send right now.' });
      }

      let sentCount = 0;
      let failedCount = 0;
      let lastErrorMsg = '';
      for (const row of rows) {
        if (!row.recipientPhone) {
          failedCount++;
          continue;
        }
        try {
          let rowMeta: Record<string, any> = {};
          try {
            rowMeta = JSON.parse(row.metadataJson || '{}');
          } catch {}

          let result;
          if (row.channel === 'sms') {
            result = await sendSmsMessage({
              to: row.recipientPhone,
              message: row.bodyText || row.subject || '',
              tenantId: user.tenantId,
              countryCode: typeof rowMeta.country === 'string' ? rowMeta.country : ctx.locale.country,
            });
          } else {
            const tplName =
              (typeof rowMeta.metaTemplateName === 'string' && rowMeta.metaTemplateName.trim()) ||
              'bgos_review_invite_en';
            const matchedTpl =
              metaTemplates.find((t) => t.name.toLowerCase() === tplName.toLowerCase()) ||
              BGOS_CANONICAL_META_TEMPLATES.find((t) => t.name === tplName);
            const computed = buildReviewInviteTemplateParams({
              templateName: tplName,
              customerName: typeof rowMeta.customerName === 'string' ? rowMeta.customerName : undefined,
              businessName: ctx.businessName,
              serviceName: typeof rowMeta.serviceName === 'string' ? rowMeta.serviceName : undefined,
              customNote: typeof rowMeta.customNote === 'string' ? rowMeta.customNote : undefined,
              shortRedirectCode: ctx.shortRedirectCode,
              reviewLink: typeof rowMeta.reviewLink === 'string' ? rowMeta.reviewLink : ctx.reviewLink,
              bodyText: matchedTpl?.bodyText,
              buttons: matchedTpl?.buttons,
            });
            const tplParams =
              Array.isArray(rowMeta.metaTemplateParams) && rowMeta.metaTemplateParams.length > 0
                ? rowMeta.metaTemplateParams.map((p: unknown) => String(p ?? ''))
                : computed.parameters;
            const tplLang =
              (typeof rowMeta.metaTemplateLanguage === 'string' && rowMeta.metaTemplateLanguage.trim()) ||
              matchedTpl?.language ||
              'en_US';
            const buttonUrlParam =
              typeof rowMeta.metaButtonUrlParam === 'string' && rowMeta.metaButtonUrlParam.trim()
                ? rowMeta.metaButtonUrlParam.trim()
                : !Array.isArray(rowMeta.metaTemplateParams)
                  ? computed.buttonUrlParam
                  : undefined;

            const payload = buildMetaTemplateSendPayload(tplName, tplParams, tplLang, buttonUrlParam);
            result = await sendWhatsAppMessage({
              to: row.recipientPhone,
              message: row.bodyText || row.subject || tplName,
              type: 'template',
              templateName: payload.templateName,
              templateLanguage: payload.templateLanguage,
              templateComponents: payload.templateComponents,
              tenantId: user.tenantId,
            });
          }

          if (row.channel !== 'sms' && 'simulated' in result && result.simulated) {
            failedCount++;
            lastErrorMsg =
              'WhatsApp Cloud API credentials are not configured (simulated send skipped). Connect Meta Cloud API or use 1-Tap Send WA.';
            await db.scheduledMessage.update({
              where: { id: row.id },
              data: { status: 'failed', lastError: lastErrorMsg.slice(0, 500), attempts: { increment: 1 }, updatedAt: new Date() },
            });
          } else if (result.success) {
            sentCount++;
            await db.scheduledMessage.update({
              where: { id: row.id },
              data: { status: 'sent', sentAt: new Date(), lastError: null, attempts: { increment: 1 }, updatedAt: new Date() },
            });
          } else {
            failedCount++;
            lastErrorMsg = result.error || 'Provider send failed';
            await db.scheduledMessage.update({
              where: { id: row.id },
              data: { status: 'failed', lastError: lastErrorMsg.slice(0, 500), attempts: { increment: 1 }, updatedAt: new Date() },
            });
          }
        } catch (err) {
          failedCount++;
          lastErrorMsg = err instanceof Error ? err.message : 'Send failed';
          await db.scheduledMessage.update({
            where: { id: row.id },
            data: { status: 'failed', lastError: lastErrorMsg.slice(0, 500), attempts: { increment: 1 }, updatedAt: new Date() },
          });
        }
      }

      return NextResponse.json({
        success: sentCount > 0,
        sentCount,
        failedCount,
        error: sentCount === 0 && lastErrorMsg ? lastErrorMsg : undefined,
        message:
          sentCount > 0
            ? `Sent ${sentCount} invite${sentCount === 1 ? '' : 's'}${failedCount > 0 ? ` (${failedCount} failed)` : ''}.`
            : lastErrorMsg || 'Could not send invites — connect WhatsApp Cloud API or SMS in Channels, or use 1-Tap Send WA.',
      });
    }

    const includeDirectLink = body.includeDirectLink !== false;
    const isScheduledMode = body.mode === 'drip' || body.mode === 'scheduled' || body.mode === 'bulk';
    const channel: 'whatsapp' | 'sms' = body.channel === 'sms' ? 'sms' : 'whatsapp';
    const dailyLimit = Math.min(25, Math.max(1, Number.parseInt(String(body.dailyLimit || 5), 10) || 5));
    const customTemplate = typeof body.messageTemplate === 'string' ? body.messageTemplate : undefined;
    const serviceName = typeof body.serviceName === 'string' && body.serviceName.trim() ? body.serviceName.trim() : undefined;
    const sanitizedCustomNote =
      typeof body.customNote === 'string' && body.customNote.trim()
        ? sanitizeReviewPersonalNote(body.customNote, 120)
        : undefined;
    const waDeliveryMode = body.waDeliveryMode === 'direct_queue' ? 'direct_queue' : 'template';
    const markSentImmediately = body.markSentImmediately === true && waDeliveryMode === 'direct_queue';
    const sourceLabel = typeof body.source === 'string' ? body.source : 'manual';
    const overrideCountry = typeof body.country === 'string' ? body.country.trim().toUpperCase() : undefined;
    const overrideTimeZone = typeof body.timeZone === 'string' ? body.timeZone.trim() : undefined;
    const preferredTime = typeof body.preferredTime === 'string' ? body.preferredTime : '10:00';
    const sendFirstBatchToday = body.startToday !== false;
    const saveToCustomers = body.saveToCustomers !== false;
    const saveToLeads = body.saveToLeads !== false;
    const requestedLeadStatus =
      typeof body.leadStatus === 'string' &&
      ['new', 'contacted', 'qualified', 'proposal', 'won', 'completed'].includes(body.leadStatus)
        ? body.leadStatus
        : 'won';

    const [{ businessName, reviewLink, shortRedirectCode, shortReviewUrl, locale }, waStatus, smsReady, metaTemplates] =
      await Promise.all([
        resolveWorkspaceReviewContext(
          user.tenantId,
          body.reviewLink,
          body.businessName,
          overrideCountry,
          overrideTimeZone,
        ),
        channel === 'whatsapp' ? isWhatsAppCloudReady(user.tenantId) : Promise.resolve({ ready: false, source: 'sms' }),
        channel === 'sms' ? isSmsGatewayReady(user.tenantId) : Promise.resolve(true),
        getReviewTemplateCatalog(user.tenantId),
      ]);

    const hasWhatsAppProvider = waStatus.ready;
    const selectedTemplate = resolveSelectedReviewTemplate(
      metaTemplates,
      body.templateName,
      body.templateLanguage,
    );
    const selectedTemplateLanguage =
      (typeof body.templateLanguage === 'string' && body.templateLanguage.trim()) ||
      selectedTemplate.language ||
      'en_US';
    const hasApprovedReviewTemplate = metaTemplates.some((t) => t.status === 'APPROVED');

    if (!reviewLink) {
      return NextResponse.json(
        {
          error:
            'No Google review link available yet. Connect your Google Business Profile or add your business name so BGOS can build your review link.',
          code: 'NO_REVIEW_LINK',
        },
        { status: 400 },
      );
    }

    // Build deduplicated recipient map from explicit payload OR recent bookings/customers
    const byPhone = new Map<string, string | null>();
    if (Array.isArray(body.recipients) && body.recipients.length > 0) {
      for (const rec of body.recipients as RecipientInput[]) {
        if (!rec || typeof rec.phone !== 'string') continue;
        const norm = normalizePhoneWithCountry(rec.phone, locale.callingCode);
        if (norm && !byPhone.has(norm)) {
          byPhone.set(norm, typeof rec.name === 'string' && rec.name.trim() ? rec.name.trim() : null);
        }
      }
    } else {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const completedBookings = await db.booking.findMany({
        where: {
          tenantId: user.tenantId,
          status: 'completed',
          customerPhone: { not: null },
          OR: [{ completedAt: { gte: since } }, { scheduledAt: { gte: since } }],
        },
        select: { id: true, customerName: true, customerPhone: true },
        orderBy: [{ completedAt: 'desc' }, { scheduledAt: 'desc' }],
        take: 200,
      });

      for (const b of completedBookings) {
        const norm = b.customerPhone ? normalizePhoneWithCountry(b.customerPhone, locale.callingCode) : null;
        if (norm && !byPhone.has(norm)) {
          byPhone.set(norm, b.customerName || null);
        }
      }

      if (byPhone.size === 0 && isScheduledMode) {
        const customers = await db.customer.findMany({
          where: { tenantId: user.tenantId, phone: { not: '' } },
          orderBy: { createdAt: 'desc' },
          take: 100,
          select: { name: true, phone: true },
        });
        for (const c of customers) {
          const norm = c.phone ? normalizePhoneWithCountry(c.phone, locale.callingCode) : null;
          if (norm && !byPhone.has(norm)) {
            byPhone.set(norm, c.name || null);
          }
        }
      }
    }

    if (byPhone.size === 0) {
      return NextResponse.json(
        {
          error:
            'No valid customer phone numbers found. Upload a CSV, paste customer numbers, or pick from CRM contacts.',
          code: 'NO_RECIPIENTS',
          sentCount: 0,
        },
        { status: 400 },
      );
    }

    if (isScheduledMode) {
      // Check already-pending recipients so accidental double-clicks don't duplicate invites
      const existingPending = await db.scheduledMessage.findMany({
        where: {
          tenantId: user.tenantId,
          messageType: 'review_request',
          status: 'pending',
        },
        select: { recipientPhone: true },
      });
      const existingSet = new Set(existingPending.map((r) => r.recipientPhone).filter(Boolean));

      const entries = Array.from(byPhone.entries());
      const newEntries = entries.filter(([phone]) => !existingSet.has(phone));
      const skippedDuplicates = entries.length - newEntries.length;

      if (newEntries.length === 0) {
        if (markSentImmediately) {
          if (typeof (db as any).scheduledMessage?.updateMany === 'function') {
            await db.scheduledMessage
              .updateMany({
                where: {
                  tenantId: user.tenantId,
                  messageType: 'review_request',
                  status: 'pending',
                  recipientPhone: { in: entries.map(([p]) => p) },
                },
                data: { status: 'sent', sentAt: new Date(), updatedAt: new Date() },
              })
              .catch(() => {});
          }
          const crmSync = await syncReviewRecipientsToCrm({
            tenantId: user.tenantId,
            workspaceId: user.workspaceId,
            recipients: entries,
            channel,
            source: sourceLabel,
            saveToCustomers,
            saveToLeads,
            leadStatus: requestedLeadStatus,
          }).catch(() => ({
            customersCreated: 0,
            customersMatched: 0,
            leadsCreated: 0,
            leadsMatched: 0,
          }));
          return NextResponse.json({
            success: true,
            mode: 'direct_tap',
            channel,
            scheduledCount: 0,
            queuedCount: 0,
            skippedDuplicates,
            crmSync,
            message: 'Recorded review request & synced CRM.',
          });
        }
        return NextResponse.json(
          {
            error: 'All selected phone numbers are already scheduled in your pending review queue.',
            code: 'ALREADY_QUEUED',
            skippedDuplicates,
          },
          { status: 400 },
        );
      }

      const now = new Date();
      const { hour: baseHour, minute: baseMinute } = parseHourMinute(preferredTime, 10, 0);
      const localNow = getLocalDateParts(now, locale.timeZone);
      // Only start Day 0 today if local time in the user's country is before 8:00 PM; otherwise start tomorrow morning!
      const canStartToday = sendFirstBatchToday && localNow.hour < 20;
      const daySlots: Record<number, { date: string; count: number }> = {};
      let firstBatchAt: string | null = null;
      const createdIds: string[] = [];

      const useFreeformCustom = Boolean(
        customTemplate &&
          customTemplate.trim() &&
          (channel === 'sms' || waDeliveryMode === 'direct_queue' || !hasWhatsAppProvider),
      );

      for (let idx = 0; idx < newEntries.length; idx++) {
        const [phone, customerName] = newEntries[idx];
        const batchDay = Math.floor(idx / dailyLimit);
        const slotIndex = idx % dailyLimit;

        let dueAt: Date;
        if (batchDay === 0 && canStartToday) {
          // Respect preferred local hour if it's still ahead today; otherwise space softly 5m + 15m*slot apart
          const candidatePreferredToday = computeLocalScheduledDate({
            dayOffset: 0,
            hour: Math.min(18, baseHour + Math.floor(slotIndex / 2)),
            minute: (baseMinute + (slotIndex % 2) * 30) % 60,
            timeZone: locale.timeZone,
            now,
          });
          if (candidatePreferredToday.getTime() > now.getTime() + 2 * 60_000) {
            dueAt = candidatePreferredToday;
          } else {
            dueAt = new Date(now.getTime() + (5 + slotIndex * 15) * 60 * 1000);
          }
        } else {
          const offsetDays = canStartToday ? batchDay : batchDay + 1;
          const slotHour = Math.min(18, baseHour + Math.floor(slotIndex / 2));
          const slotMinute = (baseMinute + (slotIndex % 2) * 30) % 60;
          dueAt = computeLocalScheduledDate({
            dayOffset: offsetDays,
            hour: slotHour,
            minute: slotMinute,
            timeZone: locale.timeZone,
            now,
          });
        }

        if (!firstBatchAt) firstBatchAt = dueAt.toISOString();
        const dayKey = batchDay;
        if (!daySlots[dayKey]) {
          daySlots[dayKey] = { date: dueAt.toISOString(), count: 0 };
        }
        daySlots[dayKey].count += 1;

        const tplParams = buildReviewInviteTemplateParams({
          templateName: selectedTemplate.name,
          customerName,
          businessName,
          serviceName,
          customNote: sanitizedCustomNote,
          shortRedirectCode,
          reviewLink,
          bodyText: selectedTemplate.bodyText,
          buttons: selectedTemplate.buttons,
        });

        const messageText = useFreeformCustom
          ? buildReviewInviteMessage({
              customerName,
              businessName,
              reviewLink,
              includeDirectLink,
              customTemplate,
            })
          : channel === 'whatsapp'
            ? buildTemplatePreviewMessage({
                template: selectedTemplate,
                parameters: tplParams.parameters,
                reviewLink: includeDirectLink ? (shortReviewUrl || reviewLink) : '',
              })
            : buildReviewInviteMessage({
                customerName,
                businessName,
                reviewLink,
                includeDirectLink,
                customTemplate,
              });

        const row = await db.scheduledMessage.create({
          data: {
            tenantId: user.tenantId,
            messageType: 'review_request',
            channel,
            recipientPhone: phone,
            subject: `Google Review Request · ${businessName}`,
            bodyText: messageText,
            dueAt: markSentImmediately ? now : dueAt,
            status: markSentImmediately ? 'sent' : 'pending',
            ...(markSentImmediately ? { sentAt: now } : {}),
            metadataJson: JSON.stringify({
              customerName: customerName || '',
              source: sourceLabel,
              reviewLink,
              shortReviewUrl,
              batchDay: batchDay + 1,
              timeZone: locale.timeZone,
              country: locale.country,
              serviceName: serviceName || null,
              customNote: sanitizedCustomNote || null,
              metaTemplateName: selectedTemplate.name,
              metaTemplateLanguage: selectedTemplateLanguage,
              metaTemplateStatus: selectedTemplate.status,
              metaTemplateParams: tplParams.parameters,
              metaButtonUrlParam: tplParams.buttonUrlParam || null,
            }),
          },
        });
        createdIds.push(row.id);
      }

      const crmSync = await syncReviewRecipientsToCrm({
        tenantId: user.tenantId,
        workspaceId: user.workspaceId,
        recipients: newEntries,
        channel,
        source: sourceLabel,
        saveToCustomers,
        saveToLeads,
        leadStatus: requestedLeadStatus,
      }).catch(() => ({
        customersCreated: 0,
        customersMatched: 0,
        leadsCreated: 0,
        leadsMatched: 0,
      }));

      await logActivity({
        tenantId: user.tenantId,
        actorId: user.id,
        actorType: 'user',
        action: 'create',
        entityType: 'review_request',
        entityId: createdIds[0] || `bulk-review-${Date.now()}`,
        entityName: businessName,
        description: `Bulk scheduled ${newEntries.length} Google review message(s) at ${dailyLimit}/day (${locale.timeZone}) via ${channel}.`,
        severity: 'info',
      }).catch(() => {});

      const totalDays = Math.ceil(newEntries.length / dailyLimit);
      return NextResponse.json({
        success: true,
        mode: 'scheduled',
        channel,
        scheduledCount: newEntries.length,
        queuedCount: newEntries.length,
        skippedDuplicates,
        dailyLimit,
        totalDays,
        firstBatchAt,
        timeZone: locale.timeZone,
        country: locale.country,
        hasWhatsAppProvider,
        smsAvailable: smsReady,
        metaTemplateName: selectedTemplate.name,
        metaTemplateLanguage: selectedTemplateLanguage,
        activeMetaTemplateStatus: selectedTemplate.status,
        hasApprovedReviewTemplate,
        shortReviewUrl,
        crmSync,
        batches: Object.entries(daySlots).map(([dayIdx, info]) => ({
          day: Number(dayIdx) + 1,
          date: info.date,
          count: info.count,
        })),
        message:
          channel === 'whatsapp' && !hasWhatsAppProvider
            ? `Scheduled ${newEntries.length} invite${newEntries.length === 1 ? '' : 's'} at ${dailyLimit}/day (${locale.timeZone}). Tap "1-Tap Send WA" on pending items or connect WhatsApp Cloud API in Channels.`
            : channel === 'sms' && !smsReady
              ? `Scheduled ${newEntries.length} invite${newEntries.length === 1 ? '' : 's'} (${locale.timeZone}). Connect an SMS gateway in Settings → Providers for live carrier delivery.`
              : `Scheduled ${newEntries.length} review invite${newEntries.length === 1 ? '' : 's'} at ${dailyLimit}/day (${totalDays} day${totalDays === 1 ? '' : 's'}, ${locale.timeZone}).`,
      });
    }

    // Immediate dispatch path
    let sentCount = 0;
    const sentRecipients: Array<[string, string | null]> = [];
    const failures: Array<{ phone: string; error: string }> = [];

    for (const [phone, customerName] of byPhone) {
      const tplParams = buildReviewInviteTemplateParams({
        templateName: selectedTemplate.name,
        customerName,
        businessName,
        serviceName,
        customNote: sanitizedCustomNote,
        shortRedirectCode,
        reviewLink,
        bodyText: selectedTemplate.bodyText,
        buttons: selectedTemplate.buttons,
      });

      const message =
        channel === 'sms'
          ? buildReviewInviteMessage({
              customerName,
              businessName,
              reviewLink,
              includeDirectLink,
              customTemplate,
            })
          : buildTemplatePreviewMessage({
              template: selectedTemplate,
              parameters: tplParams.parameters,
              reviewLink: includeDirectLink ? (shortReviewUrl || reviewLink) : '',
            });

      try {
        let result;
        if (channel === 'sms') {
          result = await sendSmsMessage({
            to: phone,
            message,
            tenantId: user.tenantId || undefined,
            countryCode: locale.country,
          });
        } else {
          const payload = buildMetaTemplateSendPayload(
            selectedTemplate.name,
            tplParams.parameters,
            selectedTemplateLanguage,
            tplParams.buttonUrlParam,
          );
          result = await sendWhatsAppMessage({
            to: phone,
            message,
            type: 'template',
            templateName: payload.templateName,
            templateLanguage: payload.templateLanguage,
            templateComponents: payload.templateComponents,
            tenantId: user.tenantId || undefined,
          });
        }

        if (channel !== 'sms' && 'simulated' in result && result.simulated) {
          failures.push({
            phone,
            error:
              'WhatsApp Cloud API credentials are not configured (simulated send skipped). Connect Meta Cloud API or save to Queue for 1-Tap Send WA.',
          });
        } else if (result.success) {
          sentCount++;
          sentRecipients.push([phone, customerName]);
        } else {
          failures.push({ phone, error: result.error || 'Send failed' });
        }
      } catch (err: unknown) {
        failures.push({
          phone,
          error: err instanceof Error ? err.message : 'Send failed',
        });
      }
    }

    if (sentCount > 0) {
      await logActivity({
        tenantId: user.tenantId,
        actorId: user.id,
        actorType: 'user',
        action: 'create',
        entityType: 'review_request',
        entityId: `review-request-${Date.now()}`,
        entityName: businessName,
        description: `Sent ${sentCount} Google review request(s) via ${channel}.`,
        severity: 'info',
      }).catch(() => {});
    }

    if (sentCount === 0) {
      const firstError = failures[0]?.error || 'Messaging provider is not configured';
      return NextResponse.json(
        {
          error: `Could not send review requests: ${firstError}. Schedule in Bulk Invites (5/Day) or connect WhatsApp/SMS in Settings → Channels.`,
          code: 'SEND_FAILED',
          sentCount: 0,
          failures: failures.slice(0, 5),
        },
        { status: 400 },
      );
    }

    let crmSync: ReviewCrmSyncSummary = {
      customersCreated: 0,
      customersMatched: 0,
      leadsCreated: 0,
      leadsMatched: 0,
    };
    if (sentRecipients.length > 0) {
      crmSync = await syncReviewRecipientsToCrm({
        tenantId: user.tenantId,
        workspaceId: user.workspaceId,
        recipients: sentRecipients,
        channel,
        source: sourceLabel,
        saveToCustomers,
        saveToLeads,
        leadStatus: requestedLeadStatus,
      }).catch(() => crmSync);
    }

    return NextResponse.json({
      success: true,
      mode: 'immediate',
      sentCount,
      failedCount: failures.length,
      recipients: byPhone.size,
      metaTemplateName: channel === 'whatsapp' ? selectedTemplate.name : undefined,
      crmSync,
      message: `Review requests sent to ${sentCount} customer${sentCount === 1 ? '' : 's'} via ${channel}${failures.length > 0 ? ` (${failures.length} failed).` : '.'}`,
      failures: failures.slice(0, 5),
    });
  } catch (error: unknown) {
    console.error('Error sending review requests:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send review requests' },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/reviews/request
 * Mark a 1-tap WhatsApp queue item as sent, retry a failed invite, or adjust schedule time.
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const id = typeof body.id === 'string' ? body.id.trim() : '';
    const action = typeof body.action === 'string' ? body.action.trim() : '';
    if (!id) {
      return NextResponse.json({ error: 'Queue item id is required' }, { status: 400 });
    }

    const existing = await db.scheduledMessage.findFirst({
      where: { id, tenantId: user.tenantId, messageType: 'review_request' },
      select: { id: true, status: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Scheduled invite not found' }, { status: 404 });
    }

    if (action === 'mark_sent') {
      await db.scheduledMessage.update({
        where: { id: existing.id },
        data: { status: 'sent', sentAt: new Date(), lastError: null, updatedAt: new Date() },
      });
      return NextResponse.json({ success: true, id: existing.id, status: 'sent' });
    }

    if (action === 'retry') {
      await db.scheduledMessage.update({
        where: { id: existing.id },
        data: { status: 'pending', lastError: null, dueAt: new Date(), updatedAt: new Date() },
      });
      return NextResponse.json({ success: true, id: existing.id, status: 'pending' });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (error) {
    console.error('[api/reviews/request] PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update scheduled invite' }, { status: 500 });
  }
}

/**
 * DELETE /api/reviews/request?id=<scheduledMessageId> | ?clearPending=true
 * Cancel a single scheduled invite or clear pending bulk invites.
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id')?.trim();
    const clearPending = searchParams.get('clearPending') === 'true';

    if (clearPending) {
      const result = await db.scheduledMessage.deleteMany({
        where: {
          tenantId: user.tenantId,
          messageType: 'review_request',
          status: 'pending',
        },
      });
      return NextResponse.json({ success: true, deletedCount: result.count });
    }

    if (!id) {
      return NextResponse.json({ error: 'Queue item id is required' }, { status: 400 });
    }

    const existing = await db.scheduledMessage.findFirst({
      where: { id, tenantId: user.tenantId, messageType: 'review_request' },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Scheduled invite not found' }, { status: 404 });
    }

    await db.scheduledMessage.delete({ where: { id: existing.id } });
    return NextResponse.json({ success: true, id: existing.id });
  } catch (error) {
    console.error('[api/reviews/request] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to remove scheduled invite' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { resolveTenantLocale, getCountryLocaleMeta, isValidTimeZone } from '@/lib/locale-timezone';
import { resolveInstallCountryAndBilling } from '@/lib/bgos-billing';
import { isSeededDummyService, sanitizePublicImageUrl } from '@/lib/bgos-business-sanitizers';
import {
  parseBgosProducts,
  parseBgosStoreSettings,
  parseSocialProfiles,
} from '@/lib/bgos-store-catalog';
import type { BgosPageVisibility, BgosWorkspace } from '../../../../../shared/bgos-contracts';

const pageVisibilityPatchSchema = z.object({
  published: z.boolean().optional(),
  showServices: z.boolean().optional(),
  showProducts: z.boolean().optional(),
  showPhotos: z.boolean().optional(),
  showReviews: z.boolean().optional(),
  showFaqs: z.boolean().optional(),
  showInquiryForm: z.boolean().optional(),
  showHours: z.boolean().optional(),
  showChatbot: z.boolean().optional(),
});

const patch = z.object({
  mode: z.enum(['local', 'agency']).optional(),
  country: z.string().min(2).max(4).optional(),
  timeZone: z.string().min(2).max(80).optional(),
  profileAssistant: z.boolean().optional(),
  offlineReply: z.boolean().optional(),
  gbpAutomations: z.object({
    replyToReviews: z.boolean().optional(),
    generatePosts: z.boolean().optional(),
    postingSchedule: z.boolean().optional(),
    mediaSchedule: z.boolean().optional(),
  }).optional(),
  bookingPageConfig: z.object({
    businessName: z.string().optional(),
    phone: z.string().optional(),
    whatsapp: z.string().optional(),
    email: z.string().optional(),
    website: z.string().optional(),
    address: z.string().optional(),
    tagline: z.string().optional(),
    headline: z.string().optional(),
    seoDescription: z.string().optional(),
    coverImage: z.string().nullable().optional(),
    logoUrl: z.string().nullable().optional(),
    accentColor: z.string().optional(),
    publicSlug: z.string().optional(),
    onlineBookingEnabled: z.boolean().optional(),
    pageVisibility: pageVisibilityPatchSchema.optional(),
  }).optional(),
  intakeFormId: z.string().optional(),
  clearSeededDummyServices: z.boolean().optional(),
  importGbpServices: z.boolean().optional(),
}).strict();
function parse(value: string | null) { try { return JSON.parse(value || '{}'); } catch { return {}; } }

function normalizePublicSlugInput(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

export async function GET(): Promise<NextResponse>;
export async function GET(request: NextRequest): Promise<NextResponse>;
export async function GET(request?: NextRequest): Promise<NextResponse> {
  const user = await getAuthUser(request);
  if (!user?.tenantId || user.role === 'customer') return NextResponse.json({ error: 'Workspace authentication required' }, { status: 401 });
  try {
    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: {
        name: true,
        slug: true,
        publicSlug: true,
        publicProfileEnabled: true,
        country: true,
        phone: true,
        whatsappPhone: true,
        email: true,
        website: true,
        address: true,
        tagline: true,
        logo: true,
        coverImage: true,
        description: true,
        settingsJson: true,
        socialLinksJson: true,
        plan: true,
        planStatus: true,
        googlePlaceId: true,
        brandProfile: {
          select: {
            businessName: true,
            industry: true,
            website: true,
            location: true,
          },
        },
      },
    });
    if (!tenant) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    const settings = parse(tenant.settingsJson);
    const locationBilling = await resolveInstallCountryAndBilling({
      request: request ?? null,
      tenant,
    });
    const resolvedLocale = resolveTenantLocale({
      tenantCountry: locationBilling.countryCode || tenant.country,
      settingsJson: settings,
    });
    // Resolve primary intake form: explicitly configured or most recently updated active form
    let form: { id: string; name: string; slug: string | null } | null = null;
    if (settings.intakeFormId) {
      form = await db.form.findFirst({
        where: { id: settings.intakeFormId, tenantId: user.tenantId, status: 'active', slug: { not: null } },
        select: { id: true, name: true, slug: true },
      });
    }
    if (!form) {
      form = await db.form.findFirst({
        where: { tenantId: user.tenantId, ...(user.workspaceId ? { workspaceId: user.workspaceId } : {}), status: 'active', slug: { not: null } },
        select: { id: true, name: true, slug: true },
        orderBy: { updatedAt: 'desc' },
      });
    }
    const tenantServices = db.service?.findMany
      ? await db.service
          .findMany({
            where: { tenantId: user.tenantId, isActive: true },
            select: { id: true, slug: true, name: true, description: true, basePrice: true, duration: true },
          })
          .catch(() => [])
      : [];
    const hasSeededDummyServices = Array.isArray(tenantServices)
      ? tenantServices.some((s) =>
          isSeededDummyService({
            slug: s.slug,
            name: s.name,
            description: s.description,
            basePrice: s.basePrice,
            duration: s.duration,
          }),
        )
      : false;
    const gbpServices: string[] = Array.isArray(settings.activeGbpServices)
      ? Array.from(
          new Set(
            settings.activeGbpServices
              .map((s: unknown) => (typeof s === 'string' ? s.trim() : ''))
              .filter(Boolean),
          ),
        )
      : [];

    const profile = settings.creatorProfile;
    const subscription = user.workspaceId ? await db.productSubscription.findUnique({ where: { workspaceId: user.workspaceId } }) : null;
    const bookingPageConfig = settings.bookingPageConfig || {};
    const brandDetails = settings.brandBrain?.brandDetails || {};
    const branding = settings.branding || {};
    const effectiveBusinessName =
      (typeof settings.activeGbpTitle === 'string' && settings.activeGbpTitle.trim()) ||
      bookingPageConfig.businessName ||
      tenant.brandProfile?.businessName ||
      tenant.name;
    const isAgencyMode = settings.bgos?.mode === 'agency';
    const businessSlug =
      bookingPageConfig.publicSlug ||
      tenant.publicSlug ||
      tenant.slug ||
      tenant.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const rawAccent =
      bookingPageConfig.accentColor ||
      brandDetails.primaryColor ||
      branding.primaryColor ||
      '';
    const resolvedAccentColor = /^#[0-9a-f]{6}$/i.test(String(rawAccent).trim())
      ? String(rawAccent).trim()
      : '#009F50';
    const resolvedLogoUrl =
      sanitizePublicImageUrl(bookingPageConfig.logoUrl) ||
      sanitizePublicImageUrl(brandDetails.logoUrl) ||
      sanitizePublicImageUrl(tenant.logo) ||
      null;
    const resolvedCoverImage =
      sanitizePublicImageUrl(bookingPageConfig.coverImage) ||
      sanitizePublicImageUrl(tenant.coverImage) ||
      null;
    const rawVisibility = bookingPageConfig.pageVisibility || {};
    const pageVisibility: BgosPageVisibility = {
      published: tenant.publicProfileEnabled !== false && rawVisibility.published !== false,
      showServices: rawVisibility.showServices !== false,
      showProducts: rawVisibility.showProducts !== false,
      showPhotos: rawVisibility.showPhotos !== false,
      showReviews: rawVisibility.showReviews !== false,
      showFaqs: rawVisibility.showFaqs !== false,
      showInquiryForm: rawVisibility.showInquiryForm !== false,
      showHours: rawVisibility.showHours !== false,
      showChatbot: rawVisibility.showChatbot !== false,
    };
    const products = parseBgosProducts(settings);
    const storeSettings = parseBgosStoreSettings(settings);
    const socialProfiles = parseSocialProfiles(tenant.socialLinksJson, settings);

    const data: BgosWorkspace = {
      name: effectiveBusinessName,
      mode: isAgencyMode ? 'agency' : 'local',
      publicSlug: businessSlug,
      locale: {
        country: resolvedLocale.country,
        countryName: resolvedLocale.countryName,
        callingCode: resolvedLocale.callingCode,
        timeZone: resolvedLocale.timeZone,
        locale: resolvedLocale.locale,
      },
      bookingPageConfig: {
        businessName: effectiveBusinessName,
        phone: bookingPageConfig.phone || tenant.phone || '',
        whatsapp: bookingPageConfig.whatsapp || tenant.whatsappPhone || '',
        email: bookingPageConfig.email || tenant.email || '',
        website: bookingPageConfig.website || tenant.website || '',
        address: bookingPageConfig.address || tenant.address || '',
        tagline: bookingPageConfig.tagline || tenant.tagline || '',
        headline: bookingPageConfig.headline || '',
        seoDescription: bookingPageConfig.seoDescription || tenant.description || '',
        coverImage: resolvedCoverImage,
        logoUrl: resolvedLogoUrl,
        accentColor: resolvedAccentColor,
        publicSlug: businessSlug,
        onlineBookingEnabled: bookingPageConfig.onlineBookingEnabled ?? true,
        pageVisibility,
      },
      gbpServices,
      hasSeededDummyServices,
      products,
      storeSettings,
      socialProfiles,
      intakeForm: form && form.slug ? { id: form.id, name: form.name, slug: form.slug } : null,
      links: {
        profile:
          isAgencyMode && profile?.isEnabled && profile.handle
            ? `/p/${encodeURIComponent(profile.handle)}`
            : `/b/${encodeURIComponent(businessSlug)}`,
        booking: `/book/${encodeURIComponent(businessSlug)}`,
        form: form?.slug ? `/f/${encodeURIComponent(form.slug)}` : null,
        review: tenant.googlePlaceId ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(tenant.googlePlaceId)}` : null,
      },
      automations: {
        profileAssistant: profile?.aiAgentEnabled === true,
        offlineReply: settings.autoReplyOffline?.enabled === true,
        gbp: settings.gbpAutomations || {
          replyToReviews: false,
          generatePosts: false,
          postingSchedule: false,
          mediaSchedule: false,
        },
      },
      plan: { code: subscription?.billingSource === 'product' ? subscription.plan : tenant.plan, status: subscription?.billingSource === 'product' ? subscription.status : tenant.planStatus },
      billing: {
        region: locationBilling.defaultRegion,
        currency: locationBilling.currency,
        countryCode: locationBilling.countryCode,
        startingPriceLabel: locationBilling.startingPriceLabel,
      },
    };
    return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return NextResponse.json({ error: 'Workspace unavailable. Please retry.' }, { status: 503 }); }
}

export async function PATCH(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user?.tenantId || !['owner', 'admin', 'standalone_user'].includes(user.role)) return NextResponse.json({ error: 'Workspace owner access required' }, { status: user ? 403 : 401 });
  const input = patch.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ error: 'Invalid workspace settings' }, { status: 400 });
  try {
    // Compare-and-swap preserves unrelated settings when another editor saves concurrently.
    const tenant = await db.tenant.findUnique({ where: { id: user.tenantId }, select: { settingsJson: true } });
    if (!tenant) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    const settings = parse(tenant.settingsJson);
    const updateData: Record<string, any> = {};

    if (input.data.mode) settings.bgos = { ...settings.bgos, mode: input.data.mode };
    if (input.data.country) {
      const normalizedCountry = input.data.country.trim().toUpperCase();
      settings.country = normalizedCountry;
      settings.countryVerified = true;
      if (!input.data.timeZone && !settings.timezone) {
        settings.timezone = getCountryLocaleMeta(normalizedCountry).timeZone;
      }
    }
    if (input.data.timeZone && isValidTimeZone(input.data.timeZone)) {
      settings.timezone = input.data.timeZone.trim();
    }
    if (input.data.profileAssistant !== undefined) {
      if (!settings.creatorProfile) return NextResponse.json({ error: 'Create your digital profile first' }, { status: 409 });
      settings.creatorProfile.aiAgentEnabled = input.data.profileAssistant;
    }
    if (input.data.offlineReply !== undefined) settings.autoReplyOffline = { ...settings.autoReplyOffline, enabled: input.data.offlineReply };
    if (input.data.gbpAutomations) settings.gbpAutomations = { ...(settings.gbpAutomations || {}), ...input.data.gbpAutomations };

    const cfg = input.data.bookingPageConfig;
    if (cfg) {
      const nextCfg: Record<string, any> = { ...(settings.bookingPageConfig || {}), ...cfg };

      if (cfg.coverImage !== undefined) {
        if (cfg.coverImage && cfg.coverImage.trim()) {
          const safeCover = sanitizePublicImageUrl(cfg.coverImage);
          if (!safeCover) {
            return NextResponse.json({ error: 'Cover image must be uploaded to cloud storage first.' }, { status: 400 });
          }
          nextCfg.coverImage = safeCover;
          updateData.coverImage = safeCover;
        } else {
          nextCfg.coverImage = null;
          updateData.coverImage = null;
        }
      }

      if (cfg.logoUrl !== undefined) {
        if (cfg.logoUrl && cfg.logoUrl.trim()) {
          const safeLogo = sanitizePublicImageUrl(cfg.logoUrl);
          if (!safeLogo) {
            return NextResponse.json({ error: 'Logo image must be uploaded to cloud storage first.' }, { status: 400 });
          }
          nextCfg.logoUrl = safeLogo;
          updateData.logo = safeLogo;
        } else {
          nextCfg.logoUrl = null;
          updateData.logo = null;
        }
        settings.brandBrain = {
          ...(settings.brandBrain || {}),
          brandDetails: {
            ...(settings.brandBrain?.brandDetails || {}),
            logoUrl: nextCfg.logoUrl,
          },
        };
      }

      if (cfg.accentColor !== undefined) {
        const cleanAccent = cfg.accentColor.trim();
        if (!/^#[0-9a-f]{6}$/i.test(cleanAccent)) {
          return NextResponse.json({ error: 'Accent color must be a valid hex code (e.g. #0f766e).' }, { status: 400 });
        }
        nextCfg.accentColor = cleanAccent;
        settings.brandBrain = {
          ...(settings.brandBrain || {}),
          brandDetails: {
            ...(settings.brandBrain?.brandDetails || {}),
            primaryColor: cleanAccent,
          },
        };
        settings.branding = {
          ...(settings.branding || {}),
          primaryColor: cleanAccent,
        };
      }

      if (cfg.publicSlug !== undefined) {
        const normalizedSlug = normalizePublicSlugInput(cfg.publicSlug);
        if (normalizedSlug.length < 2) {
          return NextResponse.json({ error: 'Page URL slug must be at least 2 alphanumeric characters.' }, { status: 400 });
        }
        const collision = db.tenant.findFirst
          ? await db.tenant
              .findFirst({
                where: {
                  id: { not: user.tenantId },
                  OR: [{ publicSlug: normalizedSlug }, { slug: normalizedSlug }],
                },
                select: { id: true },
              })
              .catch(() => null)
          : null;
        if (collision) {
          return NextResponse.json({ error: 'This page URL is already taken. Try a different handle.' }, { status: 409 });
        }
        nextCfg.publicSlug = normalizedSlug;
        updateData.publicSlug = normalizedSlug;
      }

      if (cfg.pageVisibility) {
        nextCfg.pageVisibility = {
          ...(settings.bookingPageConfig?.pageVisibility || {}),
          ...cfg.pageVisibility,
        };
        if (cfg.pageVisibility.published !== undefined) {
          updateData.publicProfileEnabled = Boolean(cfg.pageVisibility.published);
        }
      }

      if (cfg.businessName !== undefined && cfg.businessName.trim()) {
        nextCfg.businessName = cfg.businessName.trim();
        if (typeof settings.activeGbpTitle === 'string' && settings.activeGbpTitle.trim()) {
          settings.activeGbpTitle = cfg.businessName.trim();
        }
      }
      if (cfg.phone !== undefined) updateData.phone = cfg.phone.trim() || null;
      if (cfg.whatsapp !== undefined) updateData.whatsappPhone = cfg.whatsapp.trim() || null;
      if (cfg.email !== undefined) updateData.email = cfg.email.trim() || null;
      if (cfg.website !== undefined) updateData.website = cfg.website.trim() || null;
      if (cfg.address !== undefined) updateData.address = cfg.address.trim() || null;
      if (cfg.tagline !== undefined) updateData.tagline = cfg.tagline.trim() || null;
      if (cfg.seoDescription !== undefined) updateData.description = cfg.seoDescription.trim() || null;

      settings.bookingPageConfig = nextCfg;
    }

    if (input.data.intakeFormId !== undefined) {
      settings.intakeFormId = input.data.intakeFormId;
    }
    if (input.data.clearSeededDummyServices && Array.isArray(settings.seoServices)) {
      settings.seoServices = settings.seoServices.filter((s: any) => {
        if (!s || typeof s.name !== 'string') return true;
        const derivedSlug = normalizePublicSlugInput(s.name);
        return !isSeededDummyService({
          slug: derivedSlug,
          name: s.name,
          description: typeof s.description === 'string' ? s.description : '',
        });
      });
    }
    updateData.settingsJson = JSON.stringify(settings);
    if (input.data.country) {
      const normalizedCountry = input.data.country.trim().toUpperCase();
      updateData.country = normalizedCountry;
      updateData.currency = normalizedCountry === 'IN' ? 'INR' : 'USD';
    }

    const updated = await db.tenant.updateMany({ where: { id: user.tenantId, settingsJson: tenant.settingsJson }, data: updateData });
    if (!updated.count) return NextResponse.json({ error: 'Settings changed in another session. Refresh and retry.' }, { status: 409 });

    let removedDummyCount = 0;
    if (input.data.clearSeededDummyServices && db.service?.findMany && db.service?.deleteMany) {
      const rows = await db.service
        .findMany({
          where: { tenantId: user.tenantId },
          select: { id: true, slug: true, name: true, description: true, basePrice: true, duration: true },
        })
        .catch(() => []);
      const dummyIds = rows
        .filter((s) =>
          isSeededDummyService({
            slug: s.slug,
            name: s.name,
            description: s.description,
            basePrice: s.basePrice,
            duration: s.duration,
          }),
        )
        .map((s) => s.id);
      if (dummyIds.length > 0) {
        const res = await db.service.deleteMany({ where: { tenantId: user.tenantId, id: { in: dummyIds } } }).catch(() => ({ count: 0 }));
        removedDummyCount = res.count || 0;
      }
    }

    let importedGbpCount = 0;
    if (input.data.importGbpServices && db.service?.findMany && db.service?.create) {
      const gbpList: string[] = Array.isArray(settings.activeGbpServices)
        ? settings.activeGbpServices
            .map((s: unknown) => (typeof s === 'string' ? s.trim() : ''))
            .filter(Boolean)
        : [];
      if (gbpList.length > 0) {
        const existingRows = await db.service
          .findMany({
            where: { tenantId: user.tenantId },
            select: { name: true, slug: true },
          })
          .catch(() => []);
        const existingNames = new Set(existingRows.map((s) => s.name.trim().toLowerCase()));
        const existingSlugs = new Set(existingRows.map((s) => (s.slug || '').trim().toLowerCase()));

        for (const serviceName of gbpList) {
          if (existingNames.has(serviceName.toLowerCase())) continue;
          const baseSlug = normalizePublicSlugInput(serviceName) || 'service';
          let candidateSlug = baseSlug;
          let counter = 1;
          while (existingSlugs.has(candidateSlug)) {
            candidateSlug = `${baseSlug}-${counter}`;
            counter += 1;
          }
          existingNames.add(serviceName.toLowerCase());
          existingSlugs.add(candidateSlug);
          await db.service
            .create({
              data: {
                tenantId: user.tenantId,
                name: serviceName,
                slug: candidateSlug,
                description: `Professional ${serviceName} offered by ${settings.bookingPageConfig?.businessName || 'our team'}.`,
                basePrice: 0,
                duration: 60,
                isActive: true,
              },
            })
            .then(() => {
              importedGbpCount += 1;
            })
            .catch(() => {});
        }
      }
    }

    const { ensureAndSyncBusinessChatbot } = await import('@/lib/bgos-business-chatbot');
    await ensureAndSyncBusinessChatbot(user.tenantId, { triggerSource: 'workspace_update' }).catch(() => {});

    return NextResponse.json({
      success: true,
      ...(input.data.clearSeededDummyServices ? { removedDummyCount } : {}),
      ...(input.data.importGbpServices ? { importedGbpCount } : {}),
    });
  } catch { return NextResponse.json({ error: 'Could not save workspace settings' }, { status: 503 }); }
}

import { cache } from 'react';
import { db } from '@/lib/db';
import { loadTenantEmailBranding } from '@/lib/tenant-branding';
import { formatStoreAddress } from '@/lib/format-utils';
import { getCountryLocaleMeta } from '@/lib/locale-timezone';
import { mergeStructuredServices } from '@/lib/gbp/seo-context';
import { prepareGoogleAccount } from '@/lib/social/google-account-helper';
import {
  fetchGoogleBusinessPlaceDetails,
  listGoogleBusinessMedia,
} from '@/lib/social/adapters/googlebusiness';
import {
  computeOpenNowStatus,
  filterSeededFaqs,
  filterSeededServiceAreas,
  isSeededDummyService,
  isSeededDummyText,
  normalizeHoursSchedule,
  normalizeRegionState,
  normalizeWhatsAppDigits,
  resolveBusinessCurrency,
  resolveCountryCode,
  sanitizePublicImageUrl,
  type BgosBusinessHoursRow,
} from '@/lib/bgos-business-sanitizers';
import {
  parseBgosProducts,
  parseBgosStoreSettings,
  parseSocialProfiles,
} from '@/lib/bgos-store-catalog';
import type {
  BgosPageVisibility,
  BgosProduct,
  BgosStoreSettings,
} from '../../shared/bgos-contracts';

export interface BgosPublicService {
  id: string;
  name: string;
  description: string;
  duration: number | null;
  price: number | null;
  category: string;
  isInquiryOnly: boolean;
}

export interface BgosPublicReview {
  id: string;
  rating: number;
  comment: string | null;
  authorName: string;
  source: string;
  createdAt: string;
  replyText?: string | null;
}

export interface BgosPublicGalleryItem {
  url: string;
  caption?: string | null;
}

export interface BgosPublicActivity {
  id: string;
  type: 'offer' | 'event' | 'whats_new';
  title: string;
  summary: string;
  imageUrl: string | null;
  startDate: string | null;
  endDate: string | null;
  couponCode: string | null;
  actionType: 'BOOK' | 'ORDER' | 'SHOP' | 'LEARN_MORE' | 'SIGN_UP' | 'CALL';
  actionUrl: string | null;
  publishedAt: string | null;
}

export interface BgosPublicBusinessProfile {
  tenantId: string;
  slug: string;
  canonicalUrl: string;
  businessName: string;
  tagline: string;
  description: string;
  category: string;
  additionalCategories: string[];
  logoUrl: string | null;
  coverImage: string | null;
  accentColor: string;
  phone: string | null;
  whatsappPhone: string | null;
  whatsappDigits: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string;
  currency: string;
  timeZone: string;
  latitude: number | null;
  longitude: number | null;
  googlePlaceId: string | null;
  mapsUrl: string | null;
  reviewUrl: string | null;
  rating: number;
  reviewCount: number;
  openNow: boolean | null;
  hours: BgosBusinessHoursRow[];
  services: BgosPublicService[];
  products: BgosProduct[];
  activities?: BgosPublicActivity[];
  storeSettings: BgosStoreSettings;
  gallery: BgosPublicGalleryItem[];
  reviews: BgosPublicReview[];
  faqs: Array<{ question: string; answer: string }>;
  serviceAreas: string[];
  socialLinks: Record<string, string>;
  bookingEnabled: boolean;
  pageVisibility: BgosPageVisibility;
  intakeFormSlug: string | null;
  hideFieserosBranding: boolean;
  marketplaceOptIn: boolean;
  isGoogleVerified: boolean;
  seoTitle: string;
  seoDescription: string;
}

function safeJsonObject(raw?: string | null): Record<string, any> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function safeJsonArray(raw?: string | null): any[] {
  if (!raw) return [];
  try {
    let parsed = JSON.parse(raw);
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch {}
    }
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function stripHtmlTags(raw?: string | null): string {
  if (!raw) return '';
  return raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise.catch(() => fallback),
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

interface PlacesPublicSnapshot {
  rating?: number;
  userRatingCount?: number;
  formattedAddress?: string;
  category?: string;
  phone?: string;
  website?: string;
  mapsUri?: string;
  openNow?: boolean;
  latitude?: number;
  longitude?: number;
  regularHours?: Record<string, { open: boolean; openTime: string; closeTime: string }>;
}

const PLACES_SNAPSHOT_CACHE = new Map<string, { data: PlacesPublicSnapshot | null; expiresAt: number }>();

const PLACES_DAY_KEYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

function parsePlacesHours(
  periods?: Array<{ open?: { day?: number; hour?: number; minute?: number }; close?: { day?: number; hour?: number; minute?: number } }>,
): Record<string, { open: boolean; openTime: string; closeTime: string }> | undefined {
  if (!Array.isArray(periods) || periods.length === 0) return undefined;
  const hours: Record<string, { open: boolean; openTime: string; closeTime: string }> = {
    Monday: { open: false, openTime: '09:00', closeTime: '17:00' },
    Tuesday: { open: false, openTime: '09:00', closeTime: '17:00' },
    Wednesday: { open: false, openTime: '09:00', closeTime: '17:00' },
    Thursday: { open: false, openTime: '09:00', closeTime: '17:00' },
    Friday: { open: false, openTime: '09:00', closeTime: '17:00' },
    Saturday: { open: false, openTime: '09:00', closeTime: '17:00' },
    Sunday: { open: false, openTime: '09:00', closeTime: '17:00' },
  };
  const fmt = (t?: { hour?: number; minute?: number }) =>
    `${String(typeof t?.hour === 'number' ? t.hour : 0).padStart(2, '0')}:${String(
      typeof t?.minute === 'number' ? t.minute : 0,
    ).padStart(2, '0')}`;
  for (const p of periods) {
    const idx = p.open?.day;
    if (typeof idx !== 'number' || idx < 0 || idx > 6) continue;
    hours[PLACES_DAY_KEYS[idx]] = {
      open: true,
      openTime: fmt(p.open),
      closeTime: p.close ? fmt(p.close) : '23:59',
    };
  }
  return hours;
}

async function fetchPublicPlaceSnapshot(placeId?: string | null): Promise<PlacesPublicSnapshot | null> {
  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey || !placeId || placeId.startsWith('demo_')) return null;

  const cleanId = placeId.startsWith('places/') ? placeId.slice('places/'.length) : placeId;
  if (!cleanId) return null;

  const cached = PLACES_SNAPSHOT_CACHE.get(cleanId);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  try {
    const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(cleanId)}`, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask':
          'rating,userRatingCount,formattedAddress,primaryTypeDisplayName,nationalPhoneNumber,websiteUri,googleMapsUri,regularOpeningHours,currentOpeningHours,location',
      },
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) {
      PLACES_SNAPSHOT_CACHE.set(cleanId, { data: null, expiresAt: Date.now() + 5 * 60 * 1000 });
      return null;
    }
    const data = (await res.json()) as any;
    const snap: PlacesPublicSnapshot = {
      rating: typeof data.rating === 'number' ? data.rating : undefined,
      userRatingCount: typeof data.userRatingCount === 'number' ? data.userRatingCount : undefined,
      formattedAddress: typeof data.formattedAddress === 'string' ? data.formattedAddress : undefined,
      category: typeof data.primaryTypeDisplayName?.text === 'string' ? data.primaryTypeDisplayName.text : undefined,
      phone: typeof data.nationalPhoneNumber === 'string' ? data.nationalPhoneNumber : undefined,
      website: typeof data.websiteUri === 'string' ? data.websiteUri : undefined,
      mapsUri: typeof data.googleMapsUri === 'string' ? data.googleMapsUri : undefined,
      openNow:
        typeof data.currentOpeningHours?.openNow === 'boolean'
          ? data.currentOpeningHours.openNow
          : typeof data.regularOpeningHours?.openNow === 'boolean'
            ? data.regularOpeningHours.openNow
            : undefined,
      latitude: typeof data.location?.latitude === 'number' ? data.location.latitude : undefined,
      longitude: typeof data.location?.longitude === 'number' ? data.location.longitude : undefined,
      regularHours: parsePlacesHours(data.regularOpeningHours?.periods),
    };
    PLACES_SNAPSHOT_CACHE.set(cleanId, { data: snap, expiresAt: Date.now() + 15 * 60 * 1000 });
    return snap;
  } catch {
    return null;
  }
}

export function getBgosPublicCanonicalUrl(slug: string): string {
  return `https://bgos.site/${encodeURIComponent(slug)}`;
}

/**
 * Load a clean, white-label BGOS Business Profile for `/b/[slug]`.
 * Strictly strips untouched marketplace dummy data (`Dallas`, `TX`, `Emergency Service 150`, etc.)
 * and hydrates from live Google Place + tenant branding + real services & reviews.
 */
export async function getBgosPublicBusinessProfileUncached(
  slugOrId: string,
): Promise<BgosPublicBusinessProfile | null> {
  const cleanSlug = decodeURIComponent(slugOrId || '').trim();
  if (!cleanSlug) return null;

  const tenant = await db.tenant
    .findFirst({
      where: {
        OR: [{ slug: cleanSlug }, { publicSlug: cleanSlug }, { id: cleanSlug }],
        suspendedAt: null,
      },
      select: {
          id: true,
          name: true,
          slug: true,
          publicSlug: true,
          publicProfileEnabled: true,
          industry: true,
          logo: true,
          coverImage: true,
          tagline: true,
          description: true,
          phone: true,
          whatsappPhone: true,
          email: true,
          website: true,
          address: true,
          city: true,
          state: true,
          postalCode: true,
          country: true,
          currency: true,
          latitude: true,
          longitude: true,
          googlePlaceId: true,
          googleBusinessVerified: true,
          rating: true,
          reviewCount: true,
          businessHoursJson: true,
          galleryJson: true,
          serviceAreasJson: true,
          socialLinksJson: true,
          faqsJson: true,
          seoTitle: true,
          seoDescription: true,
          marketplaceOptIn: true,
          settingsJson: true,
          brandProfile: {
            select: {
              businessName: true,
              industry: true,
              location: true,
              serviceArea: true,
              aiGeneratedSummary: true,
              usps: true,
            },
          },
        },
      })
      .catch(() => null);

    if (!tenant) return null;

    const settings = safeJsonObject(tenant.settingsJson);
    const bookingConfig = safeJsonObject(
      settings.bookingPageConfig ? JSON.stringify(settings.bookingPageConfig) : null,
    );
    const brandDetails = settings?.brandBrain?.brandDetails || {};

    const [dbServices, dbReviews, activeForm, branding, googleAccount, dbActivityPosts] = await Promise.all([
      db.service
        .findMany({
          where: { tenantId: tenant.id, isActive: true },
          select: {
            id: true,
            slug: true,
            name: true,
            description: true,
            longDescription: true,
            duration: true,
            basePrice: true,
            category: true,
          },
          orderBy: { createdAt: 'asc' },
          take: 40,
        })
        .catch(() => []),
      db.review
        .findMany({
          where: { tenantId: tenant.id, status: 'published' },
          select: {
            id: true,
            rating: true,
            comment: true,
            authorName: true,
            source: true,
            createdAt: true,
            responseJson: true,
          },
          orderBy: [{ createdAt: 'desc' }],
          take: 25,
        })
        .catch(() => []),
      db.form
        .findFirst({
          where: { tenantId: tenant.id, status: 'active', slug: { not: null } },
          select: { slug: true },
          orderBy: { updatedAt: 'desc' },
        })
        .catch(() => null),
      loadTenantEmailBranding(tenant.id),
      prepareGoogleAccount(tenant.id).catch(() => null),
      typeof (db as any).socialPost?.findMany === 'function'
        ? (db as any).socialPost
            .findMany({
              where: {
                tenantId: tenant.id,
                status: { in: ['published', 'scheduled', 'partial'] },
                gbpPostType: { in: ['offer', 'event', 'whats_new'] },
              },
              select: {
                id: true,
                content: true,
                mediaUrls: true,
                linkUrl: true,
                gbpPostType: true,
                gbpOfferData: true,
                publishedAt: true,
                scheduledAt: true,
                createdAt: true,
              },
              orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
              take: 15,
            })
            .catch(() => [])
        : Promise.resolve([]),
    ]);

    const placeDetails = googleAccount
      ? await withTimeout(fetchGoogleBusinessPlaceDetails(googleAccount), 2200, null)
      : null;

    const candidatePlaceId =
      placeDetails?.placeId ||
      (typeof settings.activeGbpPlaceId === 'string' ? settings.activeGbpPlaceId.trim() : '') ||
      tenant.googlePlaceId ||
      null;

    const [placeSnap, gbpMediaRes] = await Promise.all([
      candidatePlaceId ? withTimeout(fetchPublicPlaceSnapshot(candidatePlaceId), 2200, null) : Promise.resolve(null),
      googleAccount
        ? withTimeout(listGoogleBusinessMedia(googleAccount, { pageSize: 12 }), 2200, { mediaItems: [] as any[] })
        : Promise.resolve({ mediaItems: [] as any[] }),
    ]);

    const businessName =
      bookingConfig.businessName?.trim() ||
      (typeof settings.activeGbpTitle === 'string' && settings.activeGbpTitle.trim()) ||
      placeDetails?.title?.trim() ||
      tenant.brandProfile?.businessName?.trim() ||
      tenant.name;

    const category =
      (typeof settings.activeGbpCategory === 'string' && settings.activeGbpCategory.trim()) ||
      placeDetails?.category?.trim() ||
      placeSnap?.category?.trim() ||
      tenant.brandProfile?.industry?.trim() ||
      tenant.industry?.trim() ||
      'Local Business';

    const rawPhone =
      bookingConfig.phone?.trim() ||
      brandDetails.phoneOnPoster?.trim() ||
      placeDetails?.phone?.trim() ||
      placeSnap?.phone?.trim() ||
      tenant.phone?.trim() ||
      null;
    const phone = rawPhone ? rawPhone.replace(/^[\s\\]+/, '').trim() : null;

    const rawAddress =
      (typeof settings.activeGbpAddress === 'string' && settings.activeGbpAddress.trim()) ||
      placeDetails?.address?.trim() ||
      placeSnap?.formattedAddress?.trim() ||
      brandDetails.addressOnPoster?.trim() ||
      tenant.address?.trim() ||
      null;

    const effectiveCountry = resolveCountryCode({
      country: (typeof settings.country === 'string' ? settings.country : null) || tenant.country,
      address: rawAddress,
      phone,
    });

    const rawCity =
      (typeof settings.activeGbpCity === 'string' && settings.activeGbpCity.trim()) ||
      tenant.city?.trim() ||
      null;
    const city = rawCity && rawCity.toLowerCase() === 'dallas' && effectiveCountry !== 'US' ? null : rawCity;

    const state = normalizeRegionState({
      state: tenant.state,
      country: effectiveCountry,
      address: rawAddress,
      city,
    });

    const address = rawAddress ? formatStoreAddress(rawAddress, city) || rawAddress : null;
    const currency = resolveBusinessCurrency({
      currency: tenant.currency,
      country: effectiveCountry,
      address,
      phone,
    });

    const localeMeta = getCountryLocaleMeta(
      effectiveCountry,
      typeof settings.timezone === 'string' ? settings.timezone : null,
    );
    const timeZone =
      typeof settings.timezone === 'string' && settings.timezone.trim()
        ? settings.timezone.trim()
        : localeMeta.timeZone;

    const whatsappPhone =
      bookingConfig.whatsapp?.trim() ||
      tenant.whatsappPhone?.trim() ||
      phone;
    const whatsappDigits = normalizeWhatsAppDigits(whatsappPhone, effectiveCountry);

    const email = bookingConfig.email?.trim() || tenant.email?.trim() || null;

    const rawWebsite =
      bookingConfig.website?.trim() ||
      placeDetails?.website?.trim() ||
      placeSnap?.website?.trim() ||
      tenant.website?.trim() ||
      null;
    const canonicalSlug = tenant.publicSlug || tenant.slug;
    const canonicalUrl = getBgosPublicCanonicalUrl(canonicalSlug);
    const externalWebsite =
      rawWebsite && !rawWebsite.includes(`/b/${canonicalSlug}`) && !rawWebsite.includes('fieseros.com/')
        ? rawWebsite
        : null;

    // ── Services (strictly real or GBP-sourced, zero Emergency 150 dummy rows) ──
    const realDbServices = dbServices.filter(
      (svc) =>
        !isSeededDummyService({
          slug: svc.slug,
          name: svc.name,
          description: svc.description,
          basePrice: svc.basePrice,
          duration: svc.duration,
        }),
    );
    const services: BgosPublicService[] = realDbServices.map((svc) => ({
      id: svc.id,
      name: svc.name,
      description: stripHtmlTags(svc.longDescription || svc.description),
      duration: svc.duration || null,
      price: typeof svc.basePrice === 'number' && svc.basePrice > 0 ? svc.basePrice : null,
      category: svc.category || category,
      isInquiryOnly: !(typeof svc.basePrice === 'number' && svc.basePrice > 0),
    }));

    if (services.length === 0) {
      const seoServices = mergeStructuredServices(settings, []);
      const realSeoServices = seoServices.filter((s) => {
        const derivedSlug = s.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        return !isSeededDummyService({
          slug: derivedSlug,
          name: s.name,
          description: s.description,
        });
      });
      const gbpServiceNames = Array.isArray(settings.activeGbpServices)
        ? settings.activeGbpServices.filter((x: unknown): x is string => typeof x === 'string' && x.trim().length > 0)
        : [];
      for (const s of realSeoServices) {
        services.push({
          id: s.id || `seo-${s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
          name: s.name,
          description: s.description || '',
          duration: null,
          price: null,
          category: s.category || category,
          isInquiryOnly: true,
        });
      }
      if (services.length === 0) {
        for (const name of gbpServiceNames) {
          services.push({
            id: `gbp-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
            name: name.trim(),
            description: '',
            duration: null,
            price: null,
            category,
            isInquiryOnly: true,
          });
        }
      }
    }

    // ── Photos & Logo ──
    const logoUrl =
      sanitizePublicImageUrl(bookingConfig.logoUrl) ||
      sanitizePublicImageUrl(brandDetails.logoUrl) ||
      sanitizePublicImageUrl(tenant.logo) ||
      null;

    const tenantGallery: BgosPublicGalleryItem[] = safeJsonArray(tenant.galleryJson)
      .map((item): BgosPublicGalleryItem | null => {
        if (typeof item === 'string' && item.trim()) {
          return { url: item.trim(), caption: null };
        }
        if (item && typeof item.url === 'string' && item.url.trim()) {
          return {
            url: item.url.trim(),
            caption: typeof item.caption === 'string' ? item.caption : null,
          };
        }
        return null;
      })
      .filter((x): x is BgosPublicGalleryItem => x !== null && Boolean(x.url));

    const gbpPhotos: BgosPublicGalleryItem[] = Array.isArray(gbpMediaRes?.mediaItems)
      ? gbpMediaRes.mediaItems
          .map((m: any) => ({
            url: String(m.googleUrl || m.thumbnailUrl || '').trim(),
            caption: m.category ? String(m.category) : null,
          }))
          .filter((x) => x.url && !/\.(mp4|mov|webm)(\?|$)/i.test(x.url))
      : [];

    const seenUrls = new Set<string>();
    const gallery: BgosPublicGalleryItem[] = [];
    for (const img of [...gbpPhotos, ...tenantGallery]) {
      if (!seenUrls.has(img.url)) {
        seenUrls.add(img.url);
        gallery.push(img);
      }
    }

    // Show cover banner image ONLY when manually set by the owner; otherwise render the brand gradient.
    const coverImage =
      sanitizePublicImageUrl(bookingConfig.coverImage) ||
      sanitizePublicImageUrl(tenant.coverImage) ||
      null;

    // ── Rating & Reviews ──
    const reviews: BgosPublicReview[] = dbReviews
      .filter((r) => {
        const resp = safeJsonObject(r.responseJson);
        return resp?.flagReport?.hideOnPublicPage !== true;
      })
      .slice(0, 10)
      .map((r) => {
        const resp = safeJsonObject(r.responseJson);
        return {
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          authorName: r.authorName?.trim() || 'Verified Customer',
          source: r.source || 'google',
          createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
          replyText: typeof resp.text === 'string' && resp.text.trim() ? resp.text.trim() : null,
        };
      });

    const isSeededFakeScore =
      tenant.rating === 4.9 && tenant.reviewCount === 127 && reviews.length === 0 && !placeSnap?.userRatingCount;

    const rating =
      typeof placeSnap?.rating === 'number' && placeSnap.rating > 0
        ? Number(placeSnap.rating.toFixed(1))
        : !isSeededFakeScore && tenant.rating > 0
          ? Number(tenant.rating.toFixed(1))
          : reviews.length > 0
            ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1))
            : 0;

    const reviewCount =
      typeof placeSnap?.userRatingCount === 'number' && placeSnap.userRatingCount > 0
        ? placeSnap.userRatingCount
        : !isSeededFakeScore && tenant.reviewCount > 0
          ? tenant.reviewCount
          : reviews.length;

    // ── Hours & Open Status ──
    const hours = normalizeHoursSchedule(
      tenant.businessHoursJson,
      placeDetails?.regularHours || placeSnap?.regularHours || null,
    );
    const openNow =
      typeof placeSnap?.openNow === 'boolean' ? placeSnap.openNow : computeOpenNowStatus(hours, timeZone);

    // ── Tagline, Description, FAQs & Areas ──
    const candidateTagline =
      bookingConfig.headline?.trim() ||
      (typeof brandDetails.tagline === 'string' ? brandDetails.tagline.trim() : '') ||
      tenant.tagline?.trim() ||
      '';
    const tagline =
      candidateTagline && !isSeededDummyText(candidateTagline)
        ? candidateTagline
        : city
          ? `${category} in ${city}`
          : category;

    const candidateDesc = stripHtmlTags(
      bookingConfig.seoDescription?.trim() ||
        (typeof brandDetails.businessStory === 'string' ? brandDetails.businessStory.trim() : '') ||
        tenant.brandProfile?.aiGeneratedSummary?.trim() ||
        tenant.description ||
        '',
    );
    const description =
      candidateDesc && !isSeededDummyText(candidateDesc)
        ? candidateDesc
        : `${businessName} provides ${category.toLowerCase()} services${city ? ` in ${city}` : ''}. Book an appointment or send a quick inquiry directly via phone or WhatsApp.`;

    const rawFaqs = [
      ...safeJsonArray(tenant.faqsJson),
      ...(Array.isArray(settings?.brandBrain?.faqs)
        ? settings.brandBrain.faqs.map((f: any) => ({ question: f?.q || f?.question, answer: f?.a || f?.answer }))
        : []),
    ];
    const faqs = filterSeededFaqs(rawFaqs);

    const serviceAreas = filterSeededServiceAreas(safeJsonArray(tenant.serviceAreasJson));

    const mapsUrl =
      placeDetails?.mapsUri ||
      placeSnap?.mapsUri ||
      (candidatePlaceId
        ? `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(candidatePlaceId)}`
        : address
          ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${businessName} ${address}`)}`
          : null);

    const reviewUrl = candidatePlaceId
      ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(candidatePlaceId)}`
      : null;

    const socialProfilesMerged = parseSocialProfiles(tenant.socialLinksJson, settings);
    const socialLinksRaw = { ...safeJsonObject(tenant.socialLinksJson), ...socialProfilesMerged };
    const socialLinks: Record<string, string> = {};
    for (const [k, v] of Object.entries(socialLinksRaw)) {
      if (typeof v === 'string' && /^https?:\/\//i.test(v.trim())) {
        socialLinks[k] = v.trim();
      }
    }
    const products = parseBgosProducts(settings).filter((p) => p.inStock !== false);
    const storeSettings = parseBgosStoreSettings(settings);
    const todayYmd = new Date().toISOString().slice(0, 10);
    const activities: BgosPublicActivity[] = (Array.isArray(dbActivityPosts) ? dbActivityPosts : [])
      .map((post: any): BgosPublicActivity | null => {
        const offerMeta = safeJsonObject(post.gbpOfferData);
        const endDate =
          typeof offerMeta.endDate === 'string' && offerMeta.endDate.trim()
            ? offerMeta.endDate.trim().slice(0, 10)
            : null;
        if (endDate && endDate < todayYmd) return null;
        const lines = String(post.content || '')
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);
        const rawType = post.gbpPostType === 'offer' || post.gbpPostType === 'event' ? post.gbpPostType : 'whats_new';
        const title =
          (typeof offerMeta.title === 'string' && offerMeta.title.trim()) ||
          lines[0] ||
          (rawType === 'offer' ? 'Special Offer' : rawType === 'event' ? 'Upcoming Event' : 'Business Update');
        const summary =
          lines.length > 1
            ? lines.slice(1).join(' ')
            : lines[0] && lines[0] !== title
              ? lines[0]
              : String(post.content || '').trim();
        const mediaArr = safeJsonArray(post.mediaUrls);
        const imageUrl =
          typeof mediaArr[0] === 'string' ? sanitizePublicImageUrl(mediaArr[0]) || null : null;
        const validActions = new Set(['BOOK', 'ORDER', 'SHOP', 'LEARN_MORE', 'SIGN_UP', 'CALL']);
        const actionType = validActions.has(String(offerMeta.actionType))
          ? (offerMeta.actionType as BgosPublicActivity['actionType'])
          : rawType === 'offer'
            ? 'ORDER'
            : rawType === 'event'
              ? 'BOOK'
              : 'LEARN_MORE';
        return {
          id: String(post.id),
          type: rawType,
          title: title.slice(0, 120),
          summary: summary.slice(0, 320),
          imageUrl,
          startDate:
            typeof offerMeta.startDate === 'string' && offerMeta.startDate.trim()
              ? offerMeta.startDate.trim().slice(0, 10)
              : null,
          endDate,
          couponCode:
            typeof offerMeta.couponCode === 'string' && offerMeta.couponCode.trim()
              ? offerMeta.couponCode.trim()
              : null,
          actionType,
          actionUrl:
            (typeof offerMeta.redeemUrl === 'string' && /^https?:\/\//i.test(offerMeta.redeemUrl.trim())
              ? offerMeta.redeemUrl.trim()
              : null) ||
            (typeof post.linkUrl === 'string' && /^https?:\/\//i.test(post.linkUrl.trim())
              ? post.linkUrl.trim()
              : null),
          publishedAt: post.publishedAt
            ? new Date(post.publishedAt).toISOString()
            : post.scheduledAt
              ? new Date(post.scheduledAt).toISOString()
              : post.createdAt
                ? new Date(post.createdAt).toISOString()
                : null,
        };
      })
      .filter((a): a is BgosPublicActivity => Boolean(a))
      .slice(0, 6);

    const brandPrimary =
      (typeof bookingConfig.accentColor === 'string' && bookingConfig.accentColor.trim()) ||
      (typeof brandDetails?.primaryColor === 'string' && brandDetails.primaryColor.trim()) ||
      branding?.primaryColor ||
      '';
    const accentColor = /^#[0-9a-f]{6}$/i.test(brandPrimary) ? brandPrimary : '#009F50';

    const seoTitle =
      tenant.seoTitle?.trim() && !isSeededDummyText(tenant.seoTitle)
        ? tenant.seoTitle.trim()
        : `${businessName}${city ? ` — ${category} in ${city}` : ` — ${category}`}`;

    const seoDescription =
      tenant.seoDescription?.trim() && !isSeededDummyText(tenant.seoDescription)
        ? tenant.seoDescription.trim()
        : description.slice(0, 155);

    const additionalCategories = Array.isArray(settings.additionalCategories)
      ? settings.additionalCategories.filter((x: unknown): x is string => typeof x === 'string' && x.trim().length > 0)
      : [];

    const rawVisibility =
      bookingConfig?.pageVisibility && typeof bookingConfig.pageVisibility === 'object'
        ? (bookingConfig.pageVisibility as Partial<BgosPageVisibility>)
        : {};
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

    return {
      tenantId: tenant.id,
      slug: canonicalSlug,
      canonicalUrl,
      businessName,
      tagline,
      description,
      category,
      additionalCategories,
      logoUrl,
      coverImage,
      accentColor,
      phone,
      whatsappPhone,
      whatsappDigits,
      email,
      website: externalWebsite,
      address,
      city,
      state,
      postalCode: tenant.postalCode?.trim() || null,
      country: effectiveCountry,
      currency,
      timeZone,
      latitude: placeSnap?.latitude ?? tenant.latitude ?? null,
      longitude: placeSnap?.longitude ?? tenant.longitude ?? null,
      googlePlaceId: candidatePlaceId,
      mapsUrl,
      reviewUrl,
      rating,
      reviewCount,
      openNow,
      hours,
      services,
      products,
      activities,
      storeSettings,
      gallery,
      reviews,
      faqs,
      serviceAreas,
      socialLinks,
      bookingEnabled: bookingConfig.onlineBookingEnabled !== false,
      pageVisibility,
      intakeFormSlug: activeForm?.slug || null,
      hideFieserosBranding: branding.hideFieserosBranding,
      marketplaceOptIn: Boolean(tenant.marketplaceOptIn),
      isGoogleVerified: Boolean(tenant.googleBusinessVerified || googleAccount || candidatePlaceId),
      seoTitle,
      seoDescription,
    };
}

export const getBgosPublicBusinessProfile = cache(
  async (slugOrId: string): Promise<BgosPublicBusinessProfile | null> => {
    return getBgosPublicBusinessProfileUncached(slugOrId);
  },
);

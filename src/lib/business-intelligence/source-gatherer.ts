import { db } from '@/lib/db';
import type { BusinessIntelligenceRawEvidence } from './types';

/**
 * Gathers authentic raw evidence for a tenant across:
 *  1. Connected Google Business Profile (SocialAccount metadata)
 *  2. Customer Reviews (Google reviews in Review table)
 *  3. Tenant Settings & authentic offerings (settingsJson)
 *  4. Tenant Database records (name, industry, address)
 *
 * Strictly tenant-isolated.
 */
export async function gatherBusinessEvidence(tenantId: string): Promise<BusinessIntelligenceRawEvidence> {
  if (!tenantId) {
    throw new Error('[business-intelligence] tenantId is required');
  }

  // 1. Fetch Tenant and settings
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      industry: true,
      address: true,
      settingsJson: true,
      brandProfile: {
        select: {
          businessName: true,
          industry: true,
          website: true,
          services: true,
          products: true,
          tone: true,
        },
      },
      socialAccounts: {
        where: { platform: 'googlebusiness', isActive: true },
        select: {
          accountName: true,
          metadata: true,
        },
      },
    },
  });

  if (!tenant) {
    throw new Error(`[business-intelligence] Tenant ${tenantId} not found`);
  }

  // Parse settingsJson
  let settings: Record<string, any> = {};
  try {
    if (tenant.settingsJson) {
      settings = JSON.parse(tenant.settingsJson);
    }
  } catch (err) {
    console.warn(`[business-intelligence] Error parsing settingsJson for tenant ${tenantId}:`, err);
  }

  // Extract GBP details from SocialAccount
  let gbpPrimaryCategory: string | null = settings.activeGbpCategory || settings.locationCategory || null;
  const gbpAdditionalCategories: string[] = [];
  let gbpLocationName: string | null = settings.activeGbpTitle || null;
  let gbpWebsiteUrl: string | null = null;
  let gbpAttributes: Record<string, any> = {};

  for (const sa of tenant.socialAccounts || []) {
    if (sa.metadata) {
      try {
        const meta = JSON.parse(sa.metadata);
        if (meta.primaryCategory || meta.category || meta.categoryName) {
          gbpPrimaryCategory = meta.primaryCategory || meta.category || meta.categoryName;
        }
        if (Array.isArray(meta.additionalCategories)) {
          gbpAdditionalCategories.push(...meta.additionalCategories);
        }
        if (meta.name || meta.title || meta.locationName) {
          gbpLocationName = meta.name || meta.title || meta.locationName;
        }
        if (meta.websiteUri || meta.website) {
          gbpWebsiteUrl = meta.websiteUri || meta.website;
        }
        if (meta.attributes) {
          gbpAttributes = meta.attributes;
        }
      } catch {}
    }
  }

  // 2. Fetch up to 10 authentic Google Reviews to understand actual customer experiences
  let recentReviews: Array<{ author: string; rating: number; text: string }> = [];
  try {
    const reviewRows = await db.review.findMany({
      where: {
        tenantId,
        source: 'google',
        comment: { not: null },
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        authorName: true,
        rating: true,
        comment: true,
      },
    });

    recentReviews = reviewRows
      .filter((r) => r.comment && r.comment.trim().length > 5)
      .map((r) => ({
        author: r.authorName || 'Customer',
        rating: r.rating,
        text: r.comment!.trim(),
      }));
  } catch (err) {
    console.warn(`[business-intelligence] Could not fetch reviews for tenant ${tenantId}:`, err);
  }

  // Filter out internal/placeholder strings
  const rawBusinessName = (tenant.name || '').trim();
  const cleanBusinessName = /^(owner\s+\d+|my business|test business|default business)$/i.test(rawBusinessName)
    ? gbpLocationName || rawBusinessName
    : rawBusinessName;

  // Extract offerings
  const offerings: string[] = Array.isArray(settings.offerings)
    ? settings.offerings.filter((o: any) => typeof o === 'string' && o.trim().length > 0)
    : [];

  const websiteUrl = gbpWebsiteUrl || tenant.brandProfile?.website || null;

  return {
    tenantId,
    businessName: cleanBusinessName || 'Local Business',
    industryFromDb: tenant.industry,
    addressFromDb: tenant.address,
    cityFromDb: settings.city || null,
    gbpPrimaryCategory,
    gbpAdditionalCategories: Array.from(new Set(gbpAdditionalCategories)),
    gbpLocationName,
    gbpAttributes,
    offeringsFromSettings: offerings,
    aboutBusinessFromSettings: settings.aboutBusiness ? [String(settings.aboutBusiness)] : [],
    recentReviews,
    websiteUrl: websiteUrl && !websiteUrl.includes('localhost') && !websiteUrl.includes('fieseros.com') ? websiteUrl : null,
    websiteSnippet: null,
  };
}

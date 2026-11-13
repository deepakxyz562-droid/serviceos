import { extractLocationRef } from '@/lib/social/adapters/googlebusiness';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { prepareGoogleAccount } from '@/lib/social/google-account-helper';
import { logActivity } from '@/lib/activity-log';

export const dynamic = 'force-dynamic';

/**
 * POST /api/gbp/website/generate
 * 1-Click Google Business Website Generator:
 * Builds an SEO-optimized public business hub for the tenant and synchronizes
 * the resulting live URL to Google Business Profile (websiteUri) on Google Maps.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    if(!body||typeof body!=='object'||Array.isArray(body))return NextResponse.json({error:'Send a JSON object'},{status:400});
    const { syncToGoogle = true } = body;

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      include: {
        brandProfile: true,
        socialAccounts: {
          where: { platform: 'googlebusiness', isActive: true },
          take: 1,
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Ensure slug is clean and publicProfileEnabled is true
    const slug = tenant.slug || tenant.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const websiteOrigin = (process.env.BGOS_PUBLIC_URL || 'https://bgos.site').replace(/\/+$/, '');
    const websiteUrl = `${websiteOrigin}/b/${slug}`;

    const { getTenantSeoContext } = await import('@/lib/gbp/seo-context');
    const { revalidatePublicBusiness } = await import('@/lib/public-business');
    const { submitTenantUrlToIndexNow } = await import('@/lib/indexnow');

    const tenantMeta = await db.tenant
      .findUnique({
        where: { id: user.tenantId },
        select: {
          website: true,
          industry: true,
          city: true,
          seoTitle: true,
          seoDescription: true,
          faqsJson: true,
        },
      })
      .catch(() => null);
    const previousWebsiteUrl = tenantMeta?.website || null;
    const seoCtx = await getTenantSeoContext(user.tenantId).catch(() => null);
    const businessName = seoCtx?.businessName || tenant.brandProfile?.businessName || tenant.name;
    const category = seoCtx?.category || tenantMeta?.industry || 'Local Services';
    const city = seoCtx?.city || tenantMeta?.city || 'your area';
    const topKeywords = seoCtx?.priorityKeywords.slice(0, 4) || [];
    const topServices = seoCtx?.seoServices.slice(0, 4).map((s) => s.name) || [];

    const existingFaqs = (() => {
      try {
        const arr = JSON.parse(tenantMeta?.faqsJson || '[]');
        return Array.isArray(arr) ? arr : [];
      } catch {
        return [];
      }
    })();

    const enrichedFaqs =
      existingFaqs.length >= 2
        ? existingFaqs
        : [
            {
              question: `What ${category.toLowerCase()} services does ${businessName} provide in ${city}?`,
              answer: `${businessName} offers ${topServices.join(', ') || category} across ${city} with fast local support.`,
            },
            {
              question: `How can I contact ${businessName} for ${topKeywords[0] || category} in ${city}?`,
              answer: `Book directly through our official Google Business landing page or request a callback for ${topKeywords.slice(0, 2).join(' and ') || category} in ${city}.`,
            },
            ...(topKeywords[0]
              ? [
                  {
                    question: `Do you serve ${city} customers searching for ${topKeywords[0]}?`,
                    answer: `Yes, ${businessName} specializes in ${topKeywords.join(', ')} throughout ${city} and surrounding neighborhoods.`,
                  },
                ]
              : []),
          ];

    const richDescription =
      tenant.description && tenant.description.trim().length >= 120
        ? tenant.description
        : `${businessName} provides trusted ${category.toLowerCase()} in ${city}. Specializing in ${topServices.join(', ') || topKeywords.join(', ') || category}${topKeywords.length > 0 ? ` — including ${topKeywords.slice(0, 3).join(', ')}` : ''}. Book online or contact our team today.`;

    const seoTitle =
      tenantMeta?.seoTitle && tenantMeta.seoTitle.trim().length >= 25
        ? tenantMeta.seoTitle
        : `${businessName} — ${topKeywords[0] || category} in ${city}`.slice(0, 62);

    const seoDescription =
      tenantMeta?.seoDescription && tenantMeta.seoDescription.trim().length >= 80
        ? tenantMeta.seoDescription
        : `Looking for ${topKeywords.slice(0, 2).join(' or ') || category} in ${city}? Book ${businessName} for localized services, verified info, and quick contact.`.slice(0, 155);

    // Enable dedicated GBP landing page on tenant with Search-Term-aligned metadata & FAQs
    await db.tenant.update({
      where: { id: user.tenantId },
      data: {
        slug,
        website: websiteUrl,
        publicProfileEnabled: true,
        claimed: true,
        description: richDescription.slice(0, 740),
        seoTitle,
        seoDescription,
        faqsJson: JSON.stringify(enrichedFaqs),
      },
    });

    revalidatePublicBusiness(slug);
    void submitTenantUrlToIndexNow({ slug, industry: tenantMeta?.industry || category, city });

    let syncedToGoogle = false;
    let googleNotice: string | null = null;

    if (syncToGoogle) {
      const googleAccount = await prepareGoogleAccount(user.tenantId);
      if (googleAccount?.accessToken && googleAccount.metadata) {
        try {
          const {locationId}=await extractLocationRef(googleAccount);
          if(locationId){
            const patchUrl=`https://mybusinessbusinessinformation.googleapis.com/v1/locations/${encodeURIComponent(locationId)}?updateMask=websiteUri`;
            const gRes = await fetch(patchUrl, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${googleAccount.accessToken}`,
              },
              body: JSON.stringify({ websiteUri: websiteUrl }),
            });

            if (gRes.ok) {
              syncedToGoogle = true;
            } else {
              const errJson = await gRes.json().catch(() => ({}));
              console.warn('[api/gbp/website/generate] Google Business website update notice:', errJson);
              googleNotice = errJson.error?.message || 'Google Business Profile verification pending';
            }
          }
        } catch (gErr: any) {
          console.warn('[api/gbp/website/generate] Google Business sync notice:', gErr.message);
          googleNotice = gErr.message;
        }
      }
    }

    // Record website in settings
    let settings: Record<string, any> = {};
    try {
      settings = JSON.parse(tenant.settingsJson || '{}');
    } catch {}

    settings.businessWebsite = {
      url: websiteUrl,
      previousWebsiteUrl,
      generatedAt: new Date().toISOString(),
      syncedToGoogle,
      status: syncedToGoogle ? 'published' : 'published_unverified',
    };

    await db.tenant.update({
      where: { id: user.tenantId },
      data: { settingsJson: JSON.stringify(settings) },
    });

    await logActivity({
      tenantId: user.tenantId,
      actorId: user.id,
      actorType: 'user',
      action: 'gbp_website_generated',
      entityType: 'website',
      entityId: slug,
      description: `Generated Google Business website at ${websiteUrl}`,
      severity: 'info',
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      websiteUrl,
      slug,
      syncedToGoogle,
      googleNotice,
      message: syncedToGoogle
        ? `Business website enabled and linked to your Google Business Profile websiteUri!`
        : `Business website enabled at ${websiteUrl}! (Google Business Profile sync notice: ${googleNotice || 'Connect Google to auto-sync'})`,
    });
  } catch (error: any) {
    console.error('[api/gbp/website/generate] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate website' },
      { status: 500 }
    );
  }
}

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
    const websiteUrl = `https://bgos.fieseros.com/b/${slug}`;

    // Enable public website on tenant
    await db.tenant.update({
      where: { id: user.tenantId },
      data: {
        slug,
        website: websiteUrl,
        publicProfileEnabled: true,
        description:
          tenant.description ||
          `Learn about ${tenant.brandProfile?.businessName || tenant.name}, its services and ways to get in touch.`,
      },
    });

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
      generatedAt: new Date().toISOString(),
      syncedToGoogle,
      status: 'published_unverified',
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

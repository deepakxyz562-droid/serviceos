import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { prepareGoogleAccount } from '@/lib/social/google-account-helper';
import { logActivity } from '@/lib/activity-log';

export const dynamic = 'force-dynamic';

/**
 * POST /api/gbp/locations/create
 * Create a new Google Business Profile / page for the tenant.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      businessName,
      primaryCategory,
      addressLines,
      locality,
      administrativeArea,
      postalCode,
      regionCode = 'IN',
      phone,
      websiteUri,
      openingHours,
    } = body;

    if (!businessName?.trim()) {
      return NextResponse.json({ error: 'Business name is required' }, { status: 400 });
    }

    if (!primaryCategory?.trim()) {
      return NextResponse.json({ error: 'Primary category is required' }, { status: 400 });
    }

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      include: { brandProfile: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    let googleLocationId: string | null = null;
    let googleVerificationUrl: string | null = null;
    let publishedToGoogle = false;
    let googleApiNotice: string | null = null;

    // Check if Google Business account is connected with valid tokens
    const googleAccount = await prepareGoogleAccount(user.tenantId);

    if (googleAccount && googleAccount.accessToken) {
      try {
        const accountId = googleAccount.accountId;
        const apiUrl = `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${accountId}/locations`;

        const locationPayload = {
          title: businessName.trim(),
          languageCode: 'en',
          storefrontAddress: {
            regionCode: regionCode || 'IN',
            locality: locality?.trim() || tenant.city || 'Patna',
            administrativeArea: administrativeArea?.trim() || 'Bihar',
            postalCode: postalCode?.trim() || '800001',
            addressLines: Array.isArray(addressLines) && addressLines.length > 0 ? addressLines : ['Main St'],
          },
          phoneNumbers: phone ? { primaryPhone: phone.trim() } : undefined,
          categories: {
            primaryCategory: {
              displayName: primaryCategory.trim(),
            },
          },
          websiteUri: websiteUri || `https://bgos.fieseros.com/b/${tenant.slug}`,
        };

        const gRes = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${googleAccount.accessToken}`,
          },
          body: JSON.stringify(locationPayload),
        });

        if (gRes.ok) {
          const gData = await gRes.json();
          googleLocationId = gData.name || null;
          publishedToGoogle = true;
        } else {
          const errData = await gRes.json().catch(() => ({}));
          console.warn('[api/gbp/locations/create] Google Business API location create notice:', errData);
          googleApiNotice = errData.error?.message || 'Google Business verification required';
        }
      } catch (gErr: any) {
        console.warn('[api/gbp/locations/create] Error calling Google Business API:', gErr.message);
        googleApiNotice = gErr.message;
      }
    }

    // Save/Update Tenant Brand Profile with newly created business page details
    const updatedLocation = locality?.trim() || tenant.city || 'Patna';
    const updatedPhone = phone?.trim() || tenant.phone;

    await db.tenant.update({
      where: { id: user.tenantId },
      data: {
        name: businessName.trim(),
        city: updatedLocation,
        phone: updatedPhone,
        address: Array.isArray(addressLines) ? addressLines.join(', ') : addressLines || tenant.address,
        brandProfile: {
          upsert: {
            create: {
              businessName: businessName.trim(),
              industry: primaryCategory.trim(),
              location: updatedLocation,
              contactPhone: updatedPhone,
              website: websiteUri || `https://bgos.fieseros.com/b/${tenant.slug}`,
            },
            update: {
              businessName: businessName.trim(),
              industry: primaryCategory.trim(),
              location: updatedLocation,
              contactPhone: updatedPhone,
              website: websiteUri || `https://bgos.fieseros.com/b/${tenant.slug}`,
            },
          },
        },
      },
    });

    // Update settingsJson to track created Google page
    let settings: Record<string, any> = {};
    try {
      settings = JSON.parse(tenant.settingsJson || '{}');
    } catch {}

    settings.gbpPage = {
      title: businessName.trim(),
      category: primaryCategory.trim(),
      locality: updatedLocation,
      googleLocationId,
      publishedToGoogle,
      createdAt: new Date().toISOString(),
      status: publishedToGoogle ? 'published' : 'verification_pending',
    };

    await db.tenant.update({
      where: { id: user.tenantId },
      data: { settingsJson: JSON.stringify(settings) },
    });

    await logActivity({
      tenantId: user.tenantId,
      actorId: user.id,
      actorType: 'user',
      action: 'gbp_page_created',
      entityType: 'gbp_location',
      entityId: googleLocationId || 'local-page',
      description: `Created Google Business Page for ${businessName.trim()}`,
      severity: 'info',
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      publishedToGoogle,
      googleLocationId,
      googleApiNotice,
      googleVerificationUrl: `https://business.google.com/create?fp=${encodeURIComponent(businessName.trim())}`,
      page: settings.gbpPage,
      message: publishedToGoogle
        ? 'Google Business Profile page created and synced to Google Maps!'
        : 'Google Business Profile created. Proceed to Google verification link to claim ownership.',
    });
  } catch (error: any) {
    console.error('[api/gbp/locations/create] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create Google Business page' },
      { status: 500 }
    );
  }
}

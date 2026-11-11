import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { prepareGoogleAccount } from '@/lib/social/google-account-helper';
import { updateGoogleBusinessProfile } from '@/lib/social/adapters/googlebusiness';
import { invalidatePlacePayloadCache } from '@/app/api/gbp/place/route';
import { safeParseJsonObject } from '@/lib/gbp/seo-context';
import { generateLocalizedServiceDescriptions } from '@/lib/gbp/service-optimizer';

export const dynamic = 'force-dynamic';

/**
 * POST /api/gbp/competitors/apply-advantage
 *
 * One-click action from Competitor Spy:
 *  - Add missing secondary categories found on top competitors
 *  - Enable missing GBP trust attributes
 *  - Turn a competitor service/review theme into a localized 300-500 char GBP service
 * Persists locally in Tenant settings and optionally syncs straight to live Google Business Profile.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      addCategories?: string[];
      addAttributes?: string[];
      addServiceName?: string;
      targetKeyword?: string;
      pushToGoogle?: boolean;
      locationId?: string;
    };

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { id: true, country: true, settingsJson: true },
    });
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const settings = safeParseJsonObject(tenant.settingsJson);
    const currentCats: string[] = Array.isArray(settings.additionalCategories)
      ? settings.additionalCategories.filter((c: unknown): c is string => typeof c === 'string')
      : [];
    const currentAttrs: Record<string, unknown> =
      settings.attributes && typeof settings.attributes === 'object' ? { ...settings.attributes } : {};

    let nextCategories = [...currentCats];
    let categoriesChanged = false;
    if (Array.isArray(body.addCategories)) {
      for (const raw of body.addCategories) {
        const clean = String(raw || '').trim();
        if (!clean) continue;
        if (!nextCategories.some((c) => c.toLowerCase() === clean.toLowerCase())) {
          if (nextCategories.length < 9) {
            nextCategories.push(clean);
            categoriesChanged = true;
          }
        }
      }
      settings.additionalCategories = nextCategories;
    }

    let attributesChanged = false;
    const addedBoolAttributes: Record<string, boolean> = {};
    if (Array.isArray(body.addAttributes)) {
      for (const raw of body.addAttributes) {
        const clean = String(raw || '').trim();
        if (!clean) continue;
        currentAttrs[clean] = true;
        addedBoolAttributes[clean] = true;
        attributesChanged = true;
      }
      settings.attributes = currentAttrs;
    }

    if (categoriesChanged || attributesChanged) {
      await db.tenant.update({
        where: { id: user.tenantId },
        data: { settingsJson: JSON.stringify(settings) },
      });
    }

    const pushToGoogle = body.pushToGoogle !== false;
    let syncedToGoogle = false;
    const googleWarnings: string[] = [];
    const appliedMasks: string[] = [];

    if (pushToGoogle && (categoriesChanged || attributesChanged)) {
      try {
        const googleAccount = await prepareGoogleAccount(user.tenantId, body.locationId);
        if (googleAccount?.accessToken) {
          const res = await updateGoogleBusinessProfile(googleAccount, {
            ...(categoriesChanged ? { additionalCategories: nextCategories } : {}),
            ...(attributesChanged ? { attributes: addedBoolAttributes } : {}),
            regionCode: (tenant.country || 'IN').toUpperCase(),
          });
          appliedMasks.push(...res.appliedMasks);
          googleWarnings.push(...res.warnings);
          syncedToGoogle = res.appliedMasks.length > 0;
        }
      } catch (err: unknown) {
        googleWarnings.push(err instanceof Error ? err.message : 'Google Business sync notice');
      }
    }

    let addedService: unknown = null;
    if (typeof body.addServiceName === 'string' && body.addServiceName.trim()) {
      const svcRes = await generateLocalizedServiceDescriptions({
        tenantId: user.tenantId,
        services: [
          {
            name: body.addServiceName.trim(),
            targetKeyword: body.targetKeyword?.trim(),
          },
        ],
        save: true,
        pushToGoogle,
        locationId: body.locationId,
      });
      addedService = svcRes.services[0] || null;
      if (svcRes.syncedToGoogle) {
        syncedToGoogle = true;
        appliedMasks.push('serviceItems');
      }
      googleWarnings.push(...svcRes.googleWarnings);
    }

    invalidatePlacePayloadCache(user.tenantId);

    return NextResponse.json({
      success: true,
      additionalCategories: nextCategories,
      attributes: currentAttrs,
      addedService,
      syncedToGoogle,
      appliedMasks,
      googleWarnings,
    });
  } catch (error: unknown) {
    console.error('[/api/gbp/competitors/apply-advantage] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to apply competitor advantage' },
      { status: 500 },
    );
  }
}

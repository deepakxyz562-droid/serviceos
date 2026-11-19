import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getTenantSeoContext } from '@/lib/gbp/seo-context';
import { generateLocalizedServiceDescriptions } from '@/lib/gbp/service-optimizer';
import { invalidateBootstrapCache } from '@/lib/bgos/bootstrap-cache';
import {
  setPendingGoogleUpdate,
  checkAndEnforcePendingLock,
  type PendingGoogleUpdate,
} from '@/lib/gbp/pending-update';
import { sendBgosGbpUpdatePendingEmail } from '@/lib/emails/bgos/sender';

export const dynamic = 'force-dynamic';

/**
 * POST /api/gbp/services/optimize
 *
 * Generates 300-500 character localized SEO descriptions for one or all services,
 * pairing each service with real Google Search Terms + city/service areas.
 * Optionally saves to DB & pushes serviceItems directly to Google Business Profile.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      services?: Array<{
        id?: string;
        name: string;
        targetKeyword?: string;
        existingDescription?: string;
        category?: string;
      }>;
      serviceName?: string;
      targetKeyword?: string;
      save?: boolean;
      pushToGoogle?: boolean;
      locationId?: string;
    };

    let servicesInput = Array.isArray(body.services) ? body.services : [];
    if (servicesInput.length === 0 && typeof body.serviceName === 'string' && body.serviceName.trim()) {
      servicesInput = [
        {
          name: body.serviceName.trim(),
          targetKeyword: body.targetKeyword?.trim(),
        },
      ];
    }

    if (servicesInput.length === 0) {
      const ctx = await getTenantSeoContext(user.tenantId);
      servicesInput = (ctx?.seoServices || []).map((s) => ({
        id: s.id,
        name: s.name,
        targetKeyword: s.targetKeyword,
        existingDescription: s.description,
        category: s.category,
      }));
    }

    if (servicesInput.length === 0) {
      return NextResponse.json(
        { error: 'Provide at least one service name to generate a localized 300-500 character SEO description.' },
        { status: 400 },
      );
    }

    if (body.pushToGoogle) {
      const currentTenant = await db.tenant.findUnique({
        where: { id: user.tenantId },
        select: { settingsJson: true },
      });
      const lockCheck = checkAndEnforcePendingLock(currentTenant?.settingsJson);
      if (lockCheck.locked) {
        return NextResponse.json(
          {
            error: lockCheck.reason,
            locked: true,
            pending: lockCheck.pending,
          },
          { status: 409 },
        );
      }
    }

    const result = await generateLocalizedServiceDescriptions({
      tenantId: user.tenantId,
      services: servicesInput,
      save: Boolean(body.save || body.pushToGoogle),
      pushToGoogle: Boolean(body.pushToGoogle),
      locationId: typeof body.locationId === 'string' ? body.locationId : undefined,
    });

    if (result.syncedToGoogle) {
      const newPending: PendingGoogleUpdate = {
        status: 'PENDING',
        type: 'services',
        label: 'Optimized Services',
        submittedAt: new Date().toISOString(),
        targetFields: ['serviceItems'],
        hasPendingEdits: true,
      };
      await setPendingGoogleUpdate(user.tenantId, newPending).catch(() => {});
      sendBgosGbpUpdatePendingEmail({
        tenantId: user.tenantId,
        updateLabel: 'Optimized Services',
        updateType: 'services',
        requiresVerification: false,
      }).catch((err) => console.warn('[sendBgosGbpUpdatePendingEmail error]:', err));
    }

    if (body.save || body.pushToGoogle) {
      invalidateBootstrapCache(user.tenantId);
    }

    return NextResponse.json({
      success: true,
      ...result,
      services: result.services.map((s) => ({
        ...s,
        charCount: s.description.length,
      })),
    });
  } catch (error: unknown) {
    console.error('[/api/gbp/services/optimize] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to optimize service descriptions' },
      { status: 500 },
    );
  }
}

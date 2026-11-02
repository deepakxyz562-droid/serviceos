import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getUpcomingOccasions, generateOccasionCampaignDraft } from '@/lib/marketing/occasions';

export const dynamic = 'force-dynamic';

/**
 * GET /api/marketing/occasions
 * Returns upcoming seasonal festivals, holidays, and business occasions for the tenant.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const occasions = getUpcomingOccasions();
    return NextResponse.json({
      success: true,
      occasions,
      total: occasions.length,
    });
  } catch (error: unknown) {
    console.error('[marketing/occasions] GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch occasions' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/marketing/occasions
 * Drafts or creates a ready-to-send occasion campaign with AI copy and Cloudflare Flux-1 graphic.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      occasionId?: string;
      generateImage?: boolean;
      saveCampaign?: boolean;
    };

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      include: { brandProfile: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const businessName =
      tenant.brandProfile?.businessName || tenant.name || 'Local Service Pro';
    const industry =
      tenant.brandProfile?.industry || (tenant as any)?.industry || 'Professional Services';
    const city =
      tenant.brandProfile?.location || tenant.city || 'your area';

    const draft = await generateOccasionCampaignDraft({
      tenantId: user.tenantId,
      occasionId: body.occasionId || 'diwali-festive-prep',
      businessName,
      industry,
      city,
      actorId: user.id,
      generateImage: body.generateImage ?? true,
    });

    let savedCampaignId: string | null = null;
    if (body.saveCampaign) {
      const campaign = await db.campaign.create({
        data: {
          tenantId: user.tenantId,
          name: draft.campaignTitle,
          channel: 'whatsapp',
          type: 'promotional',
          status: 'draft',
          messageContent: draft.whatsappMessage,
          mediaUrls: draft.posterUrl ? JSON.stringify([draft.posterUrl]) : '[]',
          audienceType: 'segment',
          audienceFiltersJson: JSON.stringify({ segment: draft.targetAudience }),
          createdById: user.id || 'system',
        },
      });
      savedCampaignId = campaign.id;
    }

    return NextResponse.json({
      success: true,
      draft,
      savedCampaignId,
      message: `Occasion campaign draft prepared for "${draft.occasion.title}".`,
    });
  } catch (error: unknown) {
    console.error('[marketing/occasions] POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate occasion campaign' },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateBusinessSceneSuggestions } from '@/lib/designs/business-image-suggestions';

export const dynamic = 'force-dynamic';

/**
 * GET /api/social/designs/business-images/suggestions
 * Generates Gemini visual photography suggestions for the authenticated business
 * (mirroring the social post page suggestion pills UX).
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryParam = searchParams.get('category');
    const businessNameParam = searchParams.get('businessName');
    const refreshParam = searchParams.get('refresh') === 'true';

    const [tenant, brandProfile, gbpAccount, merchantServices] = await Promise.all([
      db.tenant.findUnique({
        where: { id: user.tenantId },
        select: { name: true, industry: true, city: true, settingsJson: true },
      }).catch(() => null),
      db.brandProfile.findUnique({
        where: { id: user.tenantId },
      }).catch(() => null),
      (db.socialAccount?.findFirst({
        where: { tenantId: user.tenantId, platform: 'googlebusiness', isActive: true },
      }) ?? Promise.resolve(null)).catch(() => null),
      (db.service?.findMany({
        where: { tenantId: user.tenantId },
        select: { name: true },
        take: 10,
      }) ?? Promise.resolve([])).catch(() => []),
    ]);

    let gbpCategory = '';
    let gbpTitle = '';
    if (gbpAccount?.metadata) {
      try {
        const meta = typeof gbpAccount.metadata === 'string' ? JSON.parse(gbpAccount.metadata) : gbpAccount.metadata;
        gbpCategory = meta.primaryCategory || meta.category || '';
        gbpTitle = meta.locationTitle || meta.businessName || '';
      } catch {
        // ignore
      }
    }

    if (!gbpCategory && tenant?.settingsJson) {
      try {
        const s = JSON.parse(tenant.settingsJson);
        gbpCategory = s.activeGbpCategory || '';
        if (!gbpTitle) gbpTitle = s.activeGbpTitle || '';
      } catch {
        // ignore
      }
    }

    const businessName =
      businessNameParam ||
      brandProfile?.businessName ||
      gbpTitle ||
      tenant?.name ||
      'Local Business';

    const category =
      categoryParam ||
      brandProfile?.industry ||
      gbpCategory ||
      tenant?.industry ||
      'Services';

    const city = brandProfile?.location || tenant?.city || 'Patna';
    const services = merchantServices.map((s) => s.name).filter(Boolean);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const suggestions = await generateBusinessSceneSuggestions(
      {
        businessName,
        category,
        services,
        city,
        isRefresh: refreshParam,
      },
      controller.signal,
    );

    clearTimeout(timeout);

    return NextResponse.json({
      success: true,
      businessName,
      category,
      city,
      suggestions,
    });
  } catch (error: unknown) {
    console.error('[business-images/suggestions] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate scene suggestions' },
      { status: 500 },
    );
  }
}

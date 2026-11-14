import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { checkBgosSlugAvailability, normalizeBgosSlug } from '@/lib/bgos-slug-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request).catch(() => null);
    const searchParams = request.nextUrl.searchParams;
    const rawSlug = searchParams.get('slug') || '';
    const businessName = searchParams.get('businessName') || undefined;
    const city = searchParams.get('city') || undefined;
    const category = searchParams.get('category') || undefined;

    if (!rawSlug.trim()) {
      return NextResponse.json(
        {
          available: false,
          slug: '',
          url: 'https://bgos.site/',
          error: 'Missing required "slug" parameter.',
          suggestions: [],
        },
        { status: 400 }
      );
    }

    const result = await checkBgosSlugAvailability({
      slug: rawSlug,
      excludeTenantId: user?.tenantId || null,
      businessName,
      city,
      category,
    });

    return NextResponse.json(result, {
      status: result.available ? 200 : 200, // Return 200 with available: false so client can read suggestions without catching exceptions
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        available: false,
        slug: '',
        url: 'https://bgos.site/',
        error: err?.message || 'Failed to check slug availability.',
        suggestions: [],
      },
      { status: 500 }
    );
  }
}

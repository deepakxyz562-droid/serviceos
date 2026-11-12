import { NextRequest, NextResponse } from 'next/server';
import { getBgosPublicBusinessProfileUncached } from '@/lib/bgos-public-business';
import { buildGoogleMerchantXmlFeed } from '@/lib/gbp/merchant-feed';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const profile = await getBgosPublicBusinessProfileUncached(slug);
  if (!profile) {
    return NextResponse.json({ error: 'Business profile not found' }, { status: 404 });
  }

  const xml = buildGoogleMerchantXmlFeed({
    businessName: profile.businessName,
    description: profile.description,
    canonicalUrl: profile.canonicalUrl,
    currency: profile.currency,
    products: profile.products,
  });

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
    },
  });
}

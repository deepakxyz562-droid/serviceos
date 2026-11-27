import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export type CitationStatusValue = 'listed' | 'pending' | 'needs_fix';

interface CitationDirectoryDef {
  id: string;
  name: string;
  region: 'IN' | 'GLOBAL';
  priority: 'High' | 'Medium';
  categoryTag: string;
  submitUrl: string;
  buildSearchUrl: (bizName: string, city: string) => string;
}

const CITATION_DIRECTORIES: CitationDirectoryDef[] = [
  {
    id: 'google_maps',
    name: 'Google Business Profile',
    region: 'GLOBAL',
    priority: 'High',
    categoryTag: 'Primary Search & Maps',
    submitUrl: 'https://business.google.com/',
    buildSearchUrl: (n, c) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${n} ${c}`.trim())}`,
  },
  {
    id: 'apple_maps',
    name: 'Apple Business Connect',
    region: 'GLOBAL',
    priority: 'High',
    categoryTag: 'iOS & Siri Search',
    submitUrl: 'https://businessconnect.apple.com/',
    buildSearchUrl: (n, c) => `https://maps.apple.com/?q=${encodeURIComponent(`${n} ${c}`.trim())}`,
  },
  {
    id: 'bing_places',
    name: 'Bing Places for Business',
    region: 'GLOBAL',
    priority: 'High',
    categoryTag: 'Microsoft & ChatGPT Search',
    submitUrl: 'https://www.bingplaces.com/',
    buildSearchUrl: (n, c) => `https://www.bing.com/maps?q=${encodeURIComponent(`${n} ${c}`.trim())}`,
  },
  {
    id: 'justdial',
    name: 'Justdial',
    region: 'IN',
    priority: 'High',
    categoryTag: 'Top India Local Directory',
    submitUrl: 'https://www.justdial.com/Free-Listing',
    buildSearchUrl: (n, c) => `https://www.google.com/search?q=${encodeURIComponent(`site:justdial.com "${n}" ${c}`.trim())}`,
  },
  {
    id: 'sulekha',
    name: 'Sulekha Business',
    region: 'IN',
    priority: 'High',
    categoryTag: 'Home & Local Services India',
    submitUrl: 'https://www.sulekha.com/collateral/business-listing',
    buildSearchUrl: (n, c) => `https://www.google.com/search?q=${encodeURIComponent(`site:sulekha.com "${n}" ${c}`.trim())}`,
  },
  {
    id: 'indiamart',
    name: 'IndiaMART',
    region: 'IN',
    priority: 'Medium',
    categoryTag: 'B2B & Suppliers India',
    submitUrl: 'https://seller.indiamart.com/',
    buildSearchUrl: (n) => `https://www.google.com/search?q=${encodeURIComponent(`site:indiamart.com "${n}"`.trim())}`,
  },
  {
    id: 'facebook_page',
    name: 'Facebook Business Page',
    region: 'GLOBAL',
    priority: 'High',
    categoryTag: 'Social & AI Trust Signal',
    submitUrl: 'https://www.facebook.com/pages/create/',
    buildSearchUrl: (n, c) => `https://www.facebook.com/search/top?q=${encodeURIComponent(`${n} ${c}`.trim())}`,
  },
  {
    id: 'instagram_biz',
    name: 'Instagram Professional',
    region: 'GLOBAL',
    priority: 'Medium',
    categoryTag: 'Visual Discovery',
    submitUrl: 'https://www.instagram.com/',
    buildSearchUrl: (n) => `https://www.google.com/search?q=${encodeURIComponent(`site:instagram.com "${n}"`.trim())}`,
  },
  {
    id: 'magicpin',
    name: 'Magicpin / Local Discovery',
    region: 'IN',
    priority: 'Medium',
    categoryTag: 'Retail, Salons & Dining',
    submitUrl: 'https://magicpin.in/business/',
    buildSearchUrl: (n, c) => `https://www.google.com/search?q=${encodeURIComponent(`site:magicpin.in "${n}" ${c}`.trim())}`,
  },
  {
    id: 'foursquare',
    name: 'Foursquare City Guide',
    region: 'GLOBAL',
    priority: 'Medium',
    categoryTag: 'Location Data Aggregator',
    submitUrl: 'https://foursquare.com/add-place',
    buildSearchUrl: (n, c) => `https://foursquare.com/explore?q=${encodeURIComponent(`${n} ${c}`.trim())}`,
  },
  {
    id: 'hotfrog',
    name: 'Hotfrog Business Directory',
    region: 'GLOBAL',
    priority: 'Medium',
    categoryTag: 'Local Web Citation',
    submitUrl: 'https://www.hotfrog.com/add-your-business',
    buildSearchUrl: (n) => `https://www.google.com/search?q=${encodeURIComponent(`site:hotfrog.com "${n}"`.trim())}`,
  },
  {
    id: 'yellowpages',
    name: 'Yellow Pages / Yelp Network',
    region: 'GLOBAL',
    priority: 'Medium',
    categoryTag: 'Global NAP Citation',
    submitUrl: 'https://biz.yelp.com/',
    buildSearchUrl: (n, c) => `https://www.google.com/search?q=${encodeURIComponent(`site:yellowpages.com "${n}" ${c}`.trim())}`,
  },
];

function safeParseJson(raw?: string | null): Record<string, any> {
  try {
    const v = raw ? JSON.parse(raw) : {};
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
}

/**
 * GET /api/gbp/citations
 * Returns the tenant's Canonical NAP Kit + curated local directory checklist & status.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      include: { brandProfile: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const settings = safeParseJson(tenant.settingsJson);
    const savedStatuses: Record<string, { status: CitationStatusValue; listedUrl?: string; updatedAt?: string }> =
      settings.citationStatuses && typeof settings.citationStatuses === 'object'
        ? settings.citationStatuses
        : {};

    const name =
      (typeof settings.activeGbpTitle === 'string' && settings.activeGbpTitle.trim()) ||
      tenant.brandProfile?.businessName ||
      tenant.name;
    const address =
      (typeof settings.activeGbpAddress === 'string' && settings.activeGbpAddress.trim()) ||
      tenant.address ||
      tenant.brandProfile?.location ||
      tenant.city ||
      '';
    const city =
      (typeof settings.activeGbpCity === 'string' && settings.activeGbpCity.trim()) ||
      tenant.city ||
      (address ? address.split(',')[0]?.trim() : '') ||
      '';
    const phone = tenant.phone || settings.communicationPhone || '';
    const website = tenant.website || tenant.brandProfile?.website || '';
    const category =
      (typeof settings.activeGbpCategory === 'string' && settings.activeGbpCategory.trim()) ||
      tenant.brandProfile?.industry ||
      tenant.industry ||
      'Local Business';
    const description = tenant.description || tenant.brandProfile?.aiGeneratedSummary || '';
    const country = (tenant.country || 'IN').toUpperCase();

    const orderedDirs = [...CITATION_DIRECTORIES].sort((a, b) => {
      const aMatch = a.region === country ? 0 : 1;
      const bMatch = b.region === country ? 0 : 1;
      return aMatch - bMatch;
    });

    const directories = orderedDirs.map((d) => {
      const saved = savedStatuses[d.id];
      // Google Business Profile automatically defaults to 'listed' if connected or Place ID exists
      const defaultStatus: CitationStatusValue =
        d.id === 'google_maps' && (tenant.googlePlaceId || settings.activeGbpPlaceId)
          ? 'listed'
          : 'pending';
      return {
        id: d.id,
        name: d.name,
        region: d.region,
        priority: d.priority,
        categoryTag: d.categoryTag,
        submitUrl: d.submitUrl,
        searchUrl: d.buildSearchUrl(name, city),
        status: saved?.status || defaultStatus,
        listedUrl: saved?.listedUrl || null,
        updatedAt: saved?.updatedAt || null,
      };
    });

    const listedCount = directories.filter((d) => d.status === 'listed').length;
    const completionPct = Math.round((listedCount / Math.max(1, directories.length)) * 100);

    return NextResponse.json({
      success: true,
      napKit: {
        name,
        category,
        address,
        city,
        phone,
        website,
        description,
      },
      summary: {
        listedCount,
        totalDirectories: directories.length,
        completionPct,
      },
      directories,
    });
  } catch (error: unknown) {
    console.error('[gbp/citations] GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch citations' },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/gbp/citations
 * Saves directory status (`listed` | `pending` | `needs_fix`) & optional live URL.
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      id?: string;
      status?: CitationStatusValue;
      listedUrl?: string;
    };

    const dirId = (body.id || '').trim();
    if (!dirId || !CITATION_DIRECTORIES.some((d) => d.id === dirId)) {
      return NextResponse.json({ error: 'Valid directory id is required' }, { status: 400 });
    }

    const status: CitationStatusValue =
      body.status === 'listed' || body.status === 'needs_fix' ? body.status : 'pending';

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { settingsJson: true },
    });
    const settings = safeParseJson(tenant?.settingsJson);
    const citationStatuses =
      settings.citationStatuses && typeof settings.citationStatuses === 'object'
        ? { ...settings.citationStatuses }
        : {};

    citationStatuses[dirId] = {
      status,
      listedUrl: typeof body.listedUrl === 'string' ? body.listedUrl.trim() || null : citationStatuses[dirId]?.listedUrl || null,
      updatedAt: new Date().toISOString(),
    };
    settings.citationStatuses = citationStatuses;

    await db.tenant.update({
      where: { id: user.tenantId },
      data: { settingsJson: JSON.stringify(settings) },
    });

    return NextResponse.json({
      success: true,
      id: dirId,
      status,
    });
  } catch (error: unknown) {
    console.error('[gbp/citations] PATCH error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update citation status' },
      { status: 500 },
    );
  }
}

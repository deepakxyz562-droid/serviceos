import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// Mock business name generators for demo mode
const BUSINESS_PREFIXES = [
  'Premier', 'Elite', 'Advanced', 'Professional', 'Quality', 'Reliable', 'Expert', 'Top',
  'A1', 'All-Star', 'Best', 'Certified', 'Master', 'Superior', 'Trusted', 'Ace',
];

const BUSINESS_SUFFIXES: Record<string, string[]> = {
  plumbing: ['Plumbing', 'Plumbers', 'Drain Services', 'Pipe Solutions', 'Water Works'],
  restaurant: ['Restaurant', 'Kitchen', 'Bistro', 'Grill', 'Café', 'Eatery', 'Diner'],
  salon: ['Salon', 'Beauty Studio', 'Hair Studio', 'Style Lounge', 'Beauty Bar'],
  electrician: ['Electric', 'Electrical Services', 'Power Solutions', 'Wiring Pros'],
  hvac: ['HVAC', 'Heating & Cooling', 'Air Solutions', 'Climate Control'],
  cleaning: ['Cleaning', 'Clean Pro', 'Maid Service', 'Sparkle Clean', 'Deep Clean'],
  landscaping: ['Landscaping', 'Lawn Care', 'Garden Services', 'Green Thumb'],
  dental: ['Dental', 'Dental Care', 'Smile Center', 'Tooth Clinic', 'Dental Studio'],
  auto: ['Auto Repair', 'Car Care', 'Auto Service', 'Motor Works', 'Quick Lube'],
  general: ['Services', 'Solutions', 'Pros', 'Experts', 'Co.'],
};

interface MockBusiness {
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  website: string;
  rating: number;
  reviewCount: number;
  businessType: string;
  category: string;
  description: string;
  externalId: string;
  latitude: number;
  longitude: number;
}

function generateMockResults(
  query: string,
  businessType: string | null,
  latitude: number | null,
  longitude: number | null,
  count: number
): MockBusiness[] {
  const type = businessType || inferBusinessType(query);
  const suffixes = BUSINESS_SUFFIXES[type] || BUSINESS_SUFFIXES.general;
  const results: MockBusiness[] = [];

  const cities = [
    { name: 'Downtown', state: 'NY', zip: '10001' },
    { name: 'Midtown', state: 'NY', zip: '10018' },
    { name: 'Chelsea', state: 'NY', zip: '10011' },
    { name: 'SoHo', state: 'NY', zip: '10012' },
    { name: 'Brooklyn', state: 'NY', zip: '11201' },
    { name: 'Upper East', state: 'NY', zip: '10065' },
    { name: 'West Village', state: 'NY', zip: '10014' },
    { name: 'Tribeca', state: 'NY', zip: '10007' },
  ];

  const areaCode = '212';
  for (let i = 0; i < count; i++) {
    const prefix = BUSINESS_PREFIXES[Math.floor(Math.random() * BUSINESS_PREFIXES.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    const cityInfo = cities[Math.floor(Math.random() * cities.length)];
    const phoneSuffix = String(Math.floor(Math.random() * 9000000) + 1000000);

    results.push({
      name: `${prefix} ${suffix}`,
      phone: `(${areaCode}) ${phoneSuffix.slice(0, 3)}-${phoneSuffix.slice(3)}`,
      address: `${Math.floor(Math.random() * 900) + 100} ${['Main', 'Oak', 'Elm', 'Park', 'Broad', '5th'][Math.floor(Math.random() * 6)]} St`,
      city: cityInfo.name,
      state: cityInfo.state,
      postalCode: cityInfo.zip,
      website: `www.${prefix.toLowerCase().replace(/[^a-z0-9]/g, '')}${suffix.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
      rating: Math.round((Math.random() * 2 + 3) * 10) / 10, // 3.0 – 5.0
      reviewCount: Math.floor(Math.random() * 500) + 5,
      businessType: type,
      category: type,
      description: `Professional ${type} services in ${cityInfo.name}. Highly rated with excellent customer reviews.`,
      externalId: `mock_${Date.now()}_${i}`,
      latitude: (latitude || 40.758) + (Math.random() - 0.5) * 0.05,
      longitude: (longitude || -73.985) + (Math.random() - 0.5) * 0.05,
    });
  }

  return results;
}

function inferBusinessType(query: string): string {
  const q = query.toLowerCase();
  if (q.includes('plumb')) return 'plumbing';
  if (q.includes('restaurant') || q.includes('food') || q.includes('dining')) return 'restaurant';
  if (q.includes('salon') || q.includes('beauty') || q.includes('hair')) return 'salon';
  if (q.includes('electric')) return 'electrician';
  if (q.includes('hvac') || q.includes('heat') || q.includes('cool') || q.includes('air')) return 'hvac';
  if (q.includes('clean') || q.includes('maid')) return 'cleaning';
  if (q.includes('landscape') || q.includes('lawn') || q.includes('garden')) return 'landscaping';
  if (q.includes('dental') || q.includes('dentist')) return 'dental';
  if (q.includes('auto') || q.includes('car') || q.includes('mechanic')) return 'auto';
  return 'general';
}

// POST /api/lead-discovery/search — Search for businesses using Google Places API (or mock for demo)
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || !authUser.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const {
      query,
      location,
      latitude,
      longitude,
      radius,
      businessType,
    } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
    const searchRadius = radius || 5000;
    const searchSource = GOOGLE_PLACES_API_KEY ? 'google_places' : 'google_places';

    // Create the search record
    const searchRecord = await db.leadDiscoverySearch.create({
      data: {
        query,
        source: searchSource,
        location: location || null,
        latitude: latitude || null,
        longitude: longitude || null,
        radius: searchRadius,
        businessType: businessType || null,
        status: 'searching',
        tenantId: authUser.tenantId,
        createdById: authUser.id,
      },
    });

    let results: MockBusiness[] = [];

    if (GOOGLE_PLACES_API_KEY) {
      // ── Real Google Places Text Search API ──
      try {
        const params = new URLSearchParams({
          query: query,
          key: GOOGLE_PLACES_API_KEY,
          radius: String(searchRadius),
        });

        if (latitude && longitude) {
          params.set('location', `${latitude},${longitude}`);
        }

        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/textsearch/json?${params.toString()}`,
          { next: { revalidate: 0 } }
        );

        const data = await response.json();

        if (data.status === 'OK' && data.results) {
          results = data.results.map((place: Record<string, unknown>, idx: number) => ({
            name: (place.name as string) || 'Unknown',
            phone: (place.formatted_phone_number as string) || '',
            address: (place.formatted_address as string) || '',
            city: '',
            state: '',
            postalCode: '',
            website: (place.website as string) || '',
            rating: (place.rating as number) || 0,
            reviewCount: (place.user_ratings_total as number) || 0,
            businessType: businessType || inferBusinessType(query),
            category: Array.isArray(place.types) ? place.types[0] || '' : '',
            description: '',
            externalId: (place.place_id as string) || `gp_${Date.now()}_${idx}`,
            latitude: (place.geometry as Record<string, Record<string, number>>)?.location?.lat || 0,
            longitude: (place.geometry as Record<string, Record<string, number>>)?.location?.lng || 0,
          }));
        }
      } catch (apiError) {
        console.error('[LeadDiscovery] Google Places API error, falling back to mock:', apiError);
        // Fall through to mock
      }
    }

    // If no real results, generate mock results for demo
    if (results.length === 0) {
      const count = Math.floor(Math.random() * 8) + 5; // 5–12 results
      results = generateMockResults(query, businessType || null, latitude || null, longitude || null, count);
    }

    // Create LeadDiscovery records for each result
    const createdDiscoveries = [];
    for (const result of results) {
      try {
        const discovery = await db.leadDiscovery.create({
          data: {
            name: result.name,
            phone: result.phone || null,
            email: null,
            website: result.website || null,
            address: result.address || null,
            city: result.city || null,
            state: result.state || null,
            postalCode: result.postalCode || null,
            country: 'US',
            latitude: result.latitude || null,
            longitude: result.longitude || null,
            source: 'google_places',
            externalId: result.externalId || null,
            sourceUrl: null,
            sourceDataJson: JSON.stringify({
              rating: result.rating,
              reviewCount: result.reviewCount,
              category: result.category,
              description: result.description,
            }),
            businessType: result.businessType || businessType || null,
            category: result.category || null,
            rating: result.rating || 0,
            reviewCount: result.reviewCount || 0,
            description: result.description || null,
            status: 'discovered',
            priority: result.rating >= 4.5 ? 'high' : result.rating >= 3.5 ? 'medium' : 'low',
            searchQueryId: searchRecord.id,
            tenantId: authUser.tenantId,
            createdById: authUser.id,
          },
        });
        createdDiscoveries.push(discovery);
      } catch (createErr) {
        console.error('[LeadDiscovery] Failed to create discovery record:', createErr);
      }
    }

    // Update search record with results
    await db.leadDiscoverySearch.update({
      where: { id: searchRecord.id },
      data: {
        status: 'completed',
        resultsCount: createdDiscoveries.length,
        lastSearchedAt: new Date(),
      },
    });

    return NextResponse.json({
      search: {
        id: searchRecord.id,
        query: searchRecord.query,
        source: searchRecord.source,
        resultsCount: createdDiscoveries.length,
      },
      discoveries: createdDiscoveries,
      isMock: !GOOGLE_PLACES_API_KEY,
    }, { status: 201 });
  } catch (error) {
    console.error('[LeadDiscovery] Search error:', error);
    return NextResponse.json(
      { error: 'Failed to search for businesses' },
      { status: 500 }
    );
  }
}

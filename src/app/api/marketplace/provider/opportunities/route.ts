import { NextRequest, NextResponse } from 'next/server';
import { calculateHaversineDistanceMiles } from '@/lib/marketplace/matching-engine';

export const dynamic = 'force-dynamic';

/**
 * GET /api/marketplace/provider/opportunities
 * Returns matching marketplace opportunities for a provider's "Find Work" feed.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const maxDistance = Number(searchParams.get('maxDistance')) || 50;
    const urgency = searchParams.get('urgency');
    const providerLat = Number(searchParams.get('lat')) || 41.8781;
    const providerLon = Number(searchParams.get('lon')) || -87.6298;

    // Opportunities dataset
    const opportunities = [
      {
        id: 'opp_hvac_01',
        title: 'Emergency AC Diagnostic & Repair',
        category: 'hvac',
        categoryLabel: 'HVAC & Cooling',
        serviceType: 'AC Diagnostic',
        description: 'Outdoor unit turns on but indoor blower fan is silent. 80-degree house.',
        propertyType: 'Residential',
        urgency: 'same_day',
        budgetDisplay: '$250 – $500',
        budgetMin: 250,
        budgetMax: 500,
        city: 'Chicago',
        state: 'IL',
        postalCode: '60601',
        lat: 41.8818,
        lon: -87.6232,
        preferredDate: 'Today, Sept 18',
        preferredTime: 'Morning (9:00 AM - 12:00 PM)',
        photosCount: 2,
        proposalsReceived: 2,
        createdAt: '15 mins ago',
        aiSummary: 'Likely capacitor or blower motor relay issue based on symptom pattern.',
      },
      {
        id: 'opp_plumb_02',
        title: 'Water Heater Pilot Light Won’t Stay Lit',
        category: 'plumbing',
        categoryLabel: 'Plumbing',
        serviceType: 'Water Heater Repair',
        description: 'Bradford White 40-gallon gas heater. Pilot goes out immediately after releasing the dial.',
        propertyType: 'Residential',
        urgency: 'this_week',
        budgetDisplay: '$180 – $350',
        budgetMin: 180,
        budgetMax: 350,
        city: 'Evanston',
        state: 'IL',
        postalCode: '60201',
        lat: 42.0451,
        lon: -87.6877,
        preferredDate: 'Tomorrow, Sept 19',
        preferredTime: 'Flexible',
        photosCount: 1,
        proposalsReceived: 1,
        createdAt: '45 mins ago',
        aiSummary: 'Probable thermocouple replacement or burner assembly cleaning needed.',
      },
      {
        id: 'opp_elec_03',
        title: 'EV Charger Level 2 Installation (NEMA 14-50)',
        category: 'electrical',
        categoryLabel: 'Electrical',
        serviceType: 'EV Charger Setup',
        description: 'Need 50A 240V dedicated line run from main basement panel to attached garage (approx 25 ft).',
        propertyType: 'Residential',
        urgency: 'flexible',
        budgetDisplay: '$600 – $1,100',
        budgetMin: 600,
        budgetMax: 1100,
        city: 'Oak Park',
        state: 'IL',
        postalCode: '60302',
        lat: 41.885,
        lon: -87.7845,
        preferredDate: 'This Weekend',
        preferredTime: 'Afternoon',
        photosCount: 3,
        proposalsReceived: 3,
        createdAt: '2 hours ago',
        aiSummary: 'Standard 240V 50A breaker run with conduit to garage wall receptacle.',
      },
      {
        id: 'opp_roof_04',
        title: 'Asphalt Shingle Leak Inspection After Storm',
        category: 'roofing',
        categoryLabel: 'Roofing',
        serviceType: 'Roof Leak Repair',
        description: 'Water spot on master bedroom ceiling following yesterday heavy rains. 2-story home.',
        propertyType: 'Residential',
        urgency: 'same_day',
        budgetDisplay: '$300 – $750',
        budgetMin: 300,
        budgetMax: 750,
        city: 'Naperville',
        state: 'IL',
        postalCode: '60540',
        lat: 41.7508,
        lon: -88.1535,
        preferredDate: 'Today or Tomorrow',
        preferredTime: 'Morning',
        photosCount: 4,
        proposalsReceived: 1,
        createdAt: '3 hours ago',
        aiSummary: 'Flashing or damaged valley shingles likely culprit on wind-facing slope.',
      },
    ];

    // Compute live distance and filter
    const computed = opportunities.map((opp) => {
      const distance = calculateHaversineDistanceMiles(providerLat, providerLon, opp.lat, opp.lon);
      return {
        ...opp,
        distanceMiles: distance,
        distanceDisplay: `${distance} miles away`,
      };
    });

    const filtered = computed.filter((opp) => {
      if (category && category !== 'all' && opp.category !== category) return false;
      if (urgency && urgency !== 'all' && opp.urgency !== urgency) return false;
      if (opp.distanceMiles > maxDistance) return false;
      return true;
    });

    return NextResponse.json({
      success: true,
      count: filtered.length,
      opportunities: filtered,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch opportunities' }, { status: 500 });
  }
}

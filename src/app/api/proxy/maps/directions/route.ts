import { NextRequest, NextResponse } from 'next/server';
import { recordMeteredUsage } from '@/lib/wallet/usage-wallet';

// Helper: Haversine distance in miles / km
function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  unit: 'miles' | 'km' = 'miles'
): number {
  const R = unit === 'miles' ? 3958.8 : 6371; // Radius of Earth
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

// GET /api/proxy/maps/directions?origin=...&destination=...&provider=managed|osm|byok&apiKey=...&tenantId=...
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const origin = (searchParams.get('origin') || '').trim();
  const destination = (searchParams.get('destination') || '').trim();
  const provider = searchParams.get('provider') || 'osm';
  const customApiKey = searchParams.get('apiKey') || '';
  const tenantId = searchParams.get('tenantId') || 'default';
  const unit = (searchParams.get('unit') || 'miles') as 'miles' | 'km';

  if (!origin || !destination) {
    return NextResponse.json(
      { error: 'Origin and destination query parameters are required' },
      { status: 400 }
    );
  }

  try {
    // Mode 1: BYOK or Managed Google Directions
    const googleKey = customApiKey || process.env.GOOGLE_MAPS_API_KEY;
    if ((provider === 'managed' || provider === 'byok') && googleKey) {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(
        origin
      )}&destination=${encodeURIComponent(destination)}&key=${googleKey}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.status === 'OK' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const leg = route.legs[0];

        if (provider === 'managed' && tenantId) {
          await recordMeteredUsage(tenantId, 'maps.directions');
        }

        return NextResponse.json({
          provider: 'google',
          distanceText: leg.distance.text,
          distanceValueMeters: leg.distance.value,
          durationText: leg.duration.text,
          durationValueSeconds: leg.duration.value,
          startAddress: leg.start_address,
          endAddress: leg.end_address,
          overviewPolyline: route.overview_polyline?.points,
        });
      }
    }

    // Mode 2: Free OSRM (Open Source Routing Machine) or Geocoding + Haversine fallback
    // First, geocode origin and destination via OSM
    const [origRes, destRes] = await Promise.all([
      fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(origin)}&format=json&limit=1`, {
        headers: { 'User-Agent': 'Fieseros-FormStudio/2.0' },
      }).then((r) => r.json()),
      fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destination)}&format=json&limit=1`, {
        headers: { 'User-Agent': 'Fieseros-FormStudio/2.0' },
      }).then((r) => r.json()),
    ]);

    if (Array.isArray(origRes) && origRes.length > 0 && Array.isArray(destRes) && destRes.length > 0) {
      const origLat = parseFloat(origRes[0].lat);
      const origLon = parseFloat(origRes[0].lon);
      const destLat = parseFloat(destRes[0].lat);
      const destLon = parseFloat(destRes[0].lon);

      // Try OSRM public routing API
      try {
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origLon},${origLat};${destLon},${destLat}?overview=simplified`;
        const osrmRes = await fetch(osrmUrl).then((r) => r.json());

        if (osrmRes.code === 'Ok' && osrmRes.routes && osrmRes.routes.length > 0) {
          const r = osrmRes.routes[0];
          const distanceMiles = Number((r.distance * 0.000621371).toFixed(1));
          const distanceKm = Number((r.distance / 1000).toFixed(1));
          const durationMins = Math.round(r.duration / 60);

          return NextResponse.json({
            provider: 'osrm',
            distanceText: unit === 'miles' ? `${distanceMiles} mi` : `${distanceKm} km`,
            distanceValueMeters: Math.round(r.distance),
            durationText: `${durationMins} mins`,
            durationValueSeconds: Math.round(r.duration),
            startAddress: origRes[0].display_name,
            endAddress: destRes[0].display_name,
            geometry: r.geometry,
          });
        }
      } catch {
        // Fallback to Haversine straight line approximation
      }

      const dist = calculateHaversineDistance(origLat, origLon, destLat, destLon, unit);
      const approxDurationMins = Math.round((dist / (unit === 'miles' ? 35 : 55)) * 60);

      return NextResponse.json({
        provider: 'haversine_estimate',
        distanceText: `${dist} ${unit}`,
        distanceValueMeters: Math.round(dist * (unit === 'miles' ? 1609.34 : 1000)),
        durationText: `~${approxDurationMins} mins (est.)`,
        durationValueSeconds: approxDurationMins * 60,
        startAddress: origRes[0].display_name,
        endAddress: destRes[0].display_name,
      });
    }

    return NextResponse.json({ error: 'Could not calculate route between locations' }, { status: 404 });
  } catch (error) {
    console.error('Directions proxy error:', error);
    return NextResponse.json({ error: 'Routing service unavailable' }, { status: 500 });
  }
}

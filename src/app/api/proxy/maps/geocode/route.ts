import { NextRequest, NextResponse } from 'next/server';
import { recordMeteredUsage } from '@/lib/wallet/usage-wallet';

// GET /api/proxy/maps/geocode?address=123+Main+St&provider=managed|osm|byok&apiKey=...&tenantId=...
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = (searchParams.get('address') || '').trim();
  const provider = searchParams.get('provider') || 'osm';
  const customApiKey = searchParams.get('apiKey') || '';
  const tenantId = searchParams.get('tenantId') || 'default';

  if (!address) {
    return NextResponse.json({ error: 'Address query parameter is required' }, { status: 400 });
  }

  try {
    // Mode 1: BYOK or Managed Google Maps
    const googleKey = customApiKey || process.env.GOOGLE_MAPS_API_KEY;
    if ((provider === 'managed' || provider === 'byok') && googleKey) {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${googleKey}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const result = data.results[0];
        const lat = result.geometry.location.lat;
        const lng = result.geometry.location.lng;
        const formattedAddress = result.formatted_address;

        if (provider === 'managed' && tenantId) {
          await recordMeteredUsage(tenantId, 'maps.geocode');
        }

        return NextResponse.json({
          provider: 'google',
          formattedAddress,
          lat,
          lng,
          components: result.address_components,
          raw: result,
        });
      }
    }

    // Mode 2: Free Built-in OpenStreetMap (Nominatim) — Zero API keys required
    const osmUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&addressdetails=1&limit=1`;
    const osmRes = await fetch(osmUrl, {
      headers: {
        'User-Agent': 'Fieseros-FormStudio/2.0 (support@fieseros.com)',
      },
    });
    const osmData = await osmRes.json();

    if (Array.isArray(osmData) && osmData.length > 0) {
      const first = osmData[0];
      return NextResponse.json({
        provider: 'osm',
        formattedAddress: first.display_name,
        lat: parseFloat(first.lat),
        lng: parseFloat(first.lon),
        components: first.address,
        raw: first,
      });
    }

    return NextResponse.json({ error: 'Location not found' }, { status: 404 });
  } catch (error) {
    console.error('Geocode proxy error:', error);
    return NextResponse.json({ error: 'Geocoding service unavailable' }, { status: 500 });
  }
}

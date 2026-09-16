import { NextRequest, NextResponse } from 'next/server';
import { recordMeteredUsage } from '@/lib/wallet/usage-wallet';

// GET /api/proxy/maps/places?input=Austin&provider=managed|osm|byok&apiKey=...&tenantId=...
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const input = (searchParams.get('input') || '').trim();
  const provider = searchParams.get('provider') || 'osm';
  const customApiKey = searchParams.get('apiKey') || '';
  const tenantId = searchParams.get('tenantId') || 'default';

  if (!input) {
    return NextResponse.json({ predictions: [] });
  }

  try {
    // Mode 1: BYOK or Managed Google Places
    const googleKey = customApiKey || process.env.GOOGLE_MAPS_API_KEY;
    if ((provider === 'managed' || provider === 'byok') && googleKey) {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${googleKey}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.status === 'OK' && data.predictions) {
        if (provider === 'managed' && tenantId) {
          await recordMeteredUsage(tenantId, 'maps.places');
        }

        const predictions = data.predictions.map((p: { description: string; place_id: string; structured_formatting?: { main_text: string; secondary_text: string } }) => ({
          description: p.description,
          placeId: p.place_id,
          mainText: p.structured_formatting?.main_text || p.description,
          secondaryText: p.structured_formatting?.secondary_text || '',
          provider: 'google',
        }));

        return NextResponse.json({ predictions });
      }
    }

    // Mode 2: Free Built-in OpenStreetMap (Nominatim search)
    const osmUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(input)}&format=json&addressdetails=1&limit=5`;
    const osmRes = await fetch(osmUrl, {
      headers: {
        'User-Agent': 'Fieseros-FormStudio/2.0 (support@fieseros.com)',
      },
    });
    const osmData = await osmRes.json();

    if (Array.isArray(osmData)) {
      const predictions = osmData.map((item: { place_id: number; display_name: string; lat: string; lon: string; name?: string }) => ({
        description: item.display_name,
        placeId: String(item.place_id),
        mainText: item.name || item.display_name.split(',')[0],
        secondaryText: item.display_name.split(',').slice(1).join(',').trim(),
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        provider: 'osm',
      }));

      return NextResponse.json({ predictions });
    }

    return NextResponse.json({ predictions: [] });
  } catch (error) {
    console.error('Places proxy error:', error);
    return NextResponse.json({ error: 'Places autocomplete unavailable' }, { status: 500 });
  }
}

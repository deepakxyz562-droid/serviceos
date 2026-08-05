import { NextRequest, NextResponse } from 'next/server';
import { getIpLocation } from '@/lib/ip-geolocation';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const loc = await getIpLocation(req);
    return NextResponse.json(loc, {
      headers: {
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    console.error('[/api/geocode/ip] Failed to geolocate:', err);
    return NextResponse.json({ error: 'Failed to geolocate' }, { status: 500 });
  }
}

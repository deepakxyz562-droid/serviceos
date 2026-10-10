import { NextResponse } from 'next/server';
import { callbackUrl, mobileAuthConfigured } from '@/lib/bgos-mobile-auth';
export async function GET() {
  return NextResponse.json({ enabled: mobileAuthConfigured(), startUrl: new URL('/api/bgos/mobile-auth/google', callbackUrl()).toString() }, { headers: { 'Cache-Control': 'no-store' } });
}

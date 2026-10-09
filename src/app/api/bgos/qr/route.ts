import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { GET as workspace } from '../workspace/route';
import type { BgosWorkspace } from '../../../../../shared/bgos-contracts';

export async function GET(request: NextRequest) {
  const result = await workspace();
  if (!result.ok) return result;
  const data: BgosWorkspace = await result.json();
  const target = request.nextUrl.searchParams.get('target') === 'review' ? data.links.review : data.links.profile;
  if (!target) return NextResponse.json({ error: 'Publish your profile or connect your Google Business location first.' }, { status: 409 });
  const base = process.env.BGOS_PUBLIC_URL || 'https://bgos.fieseros.com';
  const url = new URL(target, base).toString();
  const image = await QRCode.toDataURL(url, { width: 720, margin: 4, errorCorrectionLevel: 'M', color: { dark: '#10243A', light: '#FFFFFF' } });
  return NextResponse.json({ image, url }, { headers: { 'Cache-Control': 'private, no-store' } });
}

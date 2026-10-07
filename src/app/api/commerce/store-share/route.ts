import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { db } from '@/lib/db';
import { ownerBusiness } from '@/lib/commerce/access';

export const runtime = 'nodejs';
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);

export async function GET(req: Request) {
  try {
    const business = await ownerBusiness(req);
    const tenant = business.tenantId ? await db.tenant.findUnique({ where: { id: business.tenantId }, select: { id: true, slug: true, name: true } }) : null;
    if (!tenant) return NextResponse.json({ error: 'Store setup is incomplete.' }, { status: 409 });
    const config = await db.gptformCommerceConfig.findFirst({ where: { businessId: business.id } });
    if (!config?.isActive) return NextResponse.json({ error: 'Publish your store before sharing its link.' }, { status: 409 });
    const origin = new URL(process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'https://fieseros.com').origin;
    const storeUrl = `${origin}/store/${encodeURIComponent(tenant.slug || tenant.id)}`;
    const qrDataUrl = await QRCode.toDataURL(storeUrl, { width: 900, margin: 4, errorCorrectionLevel: 'M' });
    const hi = new URL(req.url).searchParams.get('language') === 'hi';
    const title = hi ? 'ऑर्डर करने के लिए स्कैन करें' : 'Scan to order';
    const subtitle = hi ? 'अपने फ़ोन के कैमरे से स्कैन करें और हमारी ऑनलाइन दुकान देखें।' : 'Scan with your phone camera to browse our online store.';
    const html = `<!DOCTYPE html><html lang="${hi ? 'hi' : 'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(tenant.name)}</title><style>@page{size:A5;margin:15mm}body{font-family:Arial,sans-serif;text-align:center;color:#12382b;padding:20px}h1{font-size:28px;overflow-wrap:anywhere}img{width:260px;max-width:100%}p{line-height:1.6;overflow-wrap:anywhere}</style></head><body><h1>${escapeHtml(tenant.name)}</h1><h2>${title}</h2><img alt="QR" src="${qrDataUrl}"><p>${subtitle}</p><p>${escapeHtml(storeUrl)}</p></body></html>`;
    return NextResponse.json({ name: tenant.name, storeUrl, qrDataUrl, html }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const status = message === 'UNAUTHORIZED' ? 401 : message === 'FORBIDDEN' ? 403 : message === 'BUSINESS_NOT_FOUND' ? 404 : 503;
    return NextResponse.json({ error: status === 503 ? 'Store sharing is temporarily unavailable.' : 'Store access unavailable.' }, { status });
  }
}

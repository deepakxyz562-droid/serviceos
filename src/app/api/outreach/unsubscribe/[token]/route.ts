import { NextRequest, NextResponse } from 'next/server';
import { locked, outreachDb } from '@/lib/outreach/db';
const tokenPattern = /^[a-f0-9]{64}$/;
export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!tokenPattern.test(token)) return new NextResponse('Invalid link', { status: 404 });
  const row = await outreachDb.outreachQueue.findUnique({ where: { unsubscribeToken: token }, select: { id: true } });
  if (!row) return new NextResponse('Invalid link', { status: 404 });
  // GET is non-mutating: email link scanners must not unsubscribe users.
  return new NextResponse('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribe</title></head><body style="font:18px system-ui;max-width:500px;margin:80px auto;padding:24px"><h1>Stop outreach emails</h1><p>Unsubscribe this address and company from future outreach.</p><form method="post"><button style="padding:12px 24px">Unsubscribe</button></form></body></html>', { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
}
export async function POST(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!tokenPattern.test(token)) return new NextResponse('Invalid link', { status: 404 });
  const found = await locked(async tx => {
    const row = await tx.outreachQueue.findUnique({ where: { unsubscribeToken: token } });
    if (!row) return false;
    await tx.tenant.updateMany({ where: { id: row.tenantId }, data: { outreachDisabled: true, outreachDisabledAt: new Date(), outreachDisabledReason: 'Recipient unsubscribed' } });
    const existing = await tx.emailSuppression.findFirst({ where: { email: row.email, tenantId: null } });
    const data = { reason: 'manual', source: 'recipient_unsubscribe', resolvedAt: null };
    if (existing) await tx.emailSuppression.update({ where: { id: existing.id }, data });
    else await tx.emailSuppression.create({ data: { ...data, email: row.email } });
    await tx.outreachQueue.update({ where: { id: row.id }, data: { status: 'unsubscribed', error: 'Recipient unsubscribed.' } });
    return true;
  });
  return new NextResponse(found ? 'You have been unsubscribed from outreach emails.' : 'Invalid link', { status: found ? 200 : 404, headers: { 'Cache-Control': 'no-store' } });
}

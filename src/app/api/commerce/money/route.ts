import { ownerBusiness } from '@/lib/commerce/access';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { counterCustomerPhone } from '../../../../../shared/walk-in-customer';
import { resolveTenantBlueprint } from '@/lib/blueprint';
import { businessDayRange } from '@/lib/business-home-data';
import { atomicCommerce, commerceError } from '@/lib/commerce/atomic';
import { MONEY_KINDS, moneyMinor, type MoneySnapshot } from '../../../../../shared/money';


function failure(error: unknown) {
  if (error instanceof Error && ['UNAUTHORIZED','FORBIDDEN'].includes(error.message)) return NextResponse.json({ error: 'Access denied' }, { status: error.message === 'UNAUTHORIZED' ? 401 : 403 });
  const { message, status } = commerceError(error);
  return NextResponse.json({ error: message }, { status });
}
export async function GET(req: Request) {
  try {
    const business = await ownerBusiness(req);
    const tenant = business.tenantId ? await db.tenant.findUnique({ where: { id: business.tenantId } }) : null;
    const bp = resolveTenantBlueprint(tenant);
    const timezone = bp.timezone || (bp.country === 'IN' ? 'Asia/Kolkata' : 'UTC');
    const day = businessDayRange(timezone);
    const data = await atomicCommerce<MoneySnapshot>('snapshot', [business.id, day.start.toISOString(), day.end.toISOString()]);
    return NextResponse.json({ ...data, currency: business.currency }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return failure(error); }
}
export async function POST(req: Request) {
  try {
    const business = await ownerBusiness(req);
    const body = await req.json().catch(() => null);
    const key = req.headers.get('Idempotency-Key') || body?.requestKey;
    if (!body || !MONEY_KINDS.includes(body.kind) || typeof key !== 'string' || key.length < 8 || key.length > 128) return NextResponse.json({ error: 'Invalid money entry' }, { status: 400 });
    if(body.kind==='SUPPLIER_REVIEW'&&body.supplierReviewComplete!==true)return NextResponse.json({error:'Confirm all outstanding supplier bills have been entered.'},{status:400});
    const amountMinor = moneyMinor(body.amount, body.kind === 'OPENING' || body.kind === 'RECONCILE_ORDER' || body.kind==='SUPPLIER_REVIEW');
    if (body.account && !['CASH','BANK'].includes(body.account)) return NextResponse.json({ error: 'Invalid account' }, { status: 400 });
    if (body.kind==='SUPPLIER_BILL' && (typeof body.reference !== 'string' || !body.reference.trim())) return NextResponse.json({ error: 'Bill number is required' }, { status: 400 });
    const command = { kind: body.kind, amountMinor, account: body.account || 'CASH', customerPhone: counterCustomerPhone(body.customerPhone), customerName: typeof body.customerName==='string'?body.customerName.slice(0,200):undefined, invoiceId:typeof body.invoiceId==='string'?body.invoiceId:undefined, supplierId: typeof body.supplierId === 'string' ? body.supplierId : undefined, orderId: typeof body.orderId === 'string' ? body.orderId : undefined, reference: typeof body.reference === 'string' ? body.reference.trim().slice(0,200) : undefined, supplierReviewComplete: body.supplierReviewComplete === true };
    const result = await atomicCommerce('finance', [business.id, key, command]);
    return NextResponse.json(result);
  } catch (error) { return failure(error); }
}

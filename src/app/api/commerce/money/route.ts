import { ownerBusiness, resolveStaffSessionFromRequest } from '@/lib/commerce/access';
import type { ResolvedStaffSession } from '@/lib/commerce/staff-helper';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { counterCustomerPhone } from '../../../../../shared/walk-in-customer';
import { resolveTenantBlueprint } from '@/lib/blueprint';
import { businessDayRange } from '@/lib/business-home-data';
import { atomicCommerce, commerceError } from '@/lib/commerce/atomic';
import { auditAmountLabel, logCommerceActivity, resolveCommerceActor } from '@/lib/commerce/audit';
import { MONEY_KINDS, moneyMinor, type MoneyKind, type MoneySnapshot } from '../../../../../shared/money';

const MONEY_PERMISSION_MAP: Record<MoneyKind, keyof ResolvedStaffSession['permissions']> = {
  INVOICE_PAYMENT: 'canCreateInvoices',
  ORDER_PAYMENT: 'canPosBilling',
  RECONCILE_ORDER: 'canPosBilling',
  MONEY_IN: 'canPosBilling',
  COLLECTION: 'canManageKhata',
  CREDIT_SALE: 'canManageKhata',
  SUPPLIER_REVIEW: 'canManageKhata',
  SUPPLIER_BILL: 'canManageKhata',
  SUPPLIER_PAYMENT: 'canManageKhata',
  EXPENSE: 'canManageSettings',
  OPENING: 'canManageSettings',
};

function failure(error: unknown) {
  if (error instanceof Error && ['UNAUTHORIZED','FORBIDDEN','FORBIDDEN_INSUFFICIENT_ROLE'].includes(error.message)) {
    return NextResponse.json({ error: 'Access denied: Insufficient permissions for this action' }, { status: error.message === 'UNAUTHORIZED' ? 401 : 403 });
  }
  const { message, status } = commerceError(error);
  return NextResponse.json({ error: message }, { status });
}
export async function GET(req: Request) {
  try {
    const session = await resolveStaffSessionFromRequest(req);
    if (!session.permissions.canViewReports && !session.permissions.canPosBilling) {
      throw new Error('FORBIDDEN_INSUFFICIENT_ROLE');
    }
    const business = session.business;
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
    const body = await req.json().catch(() => null);
    if (!body || !MONEY_KINDS.includes(body.kind)) {
      return NextResponse.json({ error: 'Invalid money entry' }, { status: 400 });
    }
    const requiredPerm = MONEY_PERMISSION_MAP[body.kind as MoneyKind];
    const business = await ownerBusiness(req, requiredPerm);
    const key = req.headers.get('Idempotency-Key') || body?.requestKey;
    if (typeof key !== 'string' || key.length < 8 || key.length > 128) return NextResponse.json({ error: 'Invalid money entry' }, { status: 400 });
    if(body.kind==='SUPPLIER_REVIEW'&&body.supplierReviewComplete!==true)return NextResponse.json({error:'Confirm all outstanding supplier bills have been entered.'},{status:400});
    const amountMinor = moneyMinor(body.amount, body.kind === 'OPENING' || body.kind === 'RECONCILE_ORDER' || body.kind==='SUPPLIER_REVIEW');
    if (body.account && !['CASH','BANK'].includes(body.account)) return NextResponse.json({ error: 'Invalid account' }, { status: 400 });
    if (body.kind==='SUPPLIER_BILL' && (typeof body.reference !== 'string' || !body.reference.trim())) return NextResponse.json({ error: 'Bill number is required' }, { status: 400 });
    const command = { kind: body.kind, amountMinor, account: body.account || 'CASH', customerPhone: counterCustomerPhone(body.customerPhone), customerName: typeof body.customerName==='string'?body.customerName.slice(0,200):undefined, invoiceId:typeof body.invoiceId==='string'?body.invoiceId:undefined, supplierId: typeof body.supplierId === 'string' ? body.supplierId : undefined, orderId: typeof body.orderId === 'string' ? body.orderId : undefined, reference: typeof body.reference === 'string' ? body.reference.trim().slice(0,200) : undefined, category: typeof body.category === 'string' ? body.category.trim().slice(0,60) : undefined, supplierReviewComplete: body.supplierReviewComplete === true };
    const result = await atomicCommerce('finance', [business.id, key, command]);

    // Commerce audit trail — fire-and-forget; a logging failure can never
    // fail the ledger entry that just succeeded (logCommerceActivity
    // swallows). Every money kind is logged. When this handler runs as the
    // internal delegate of /api/commerce/expenses, the wrapper logs the
    // richer 'expense' row itself — skip here so the operation is not
    // double-logged.
    if (req.headers.get('x-commerce-audit-via') !== 'expenses') {
      const moneyResult = result as { success?: boolean; kind?: string; amount?: number };
      const moneyActor = await resolveCommerceActor(req);
      await logCommerceActivity({
        business,
        actorId: moneyActor.actorId,
        actorName: moneyActor.actorName,
        action: 'create',
        entityType: 'money',
        entityId: key,
        entityName: String(body.kind),
        description: `Money entry: ${body.kind} ${auditAmountLabel(business, Number(moneyResult?.amount) || 0)}`,
        metadata: {
          kind: body.kind,
          amount: moneyResult?.amount ?? null,
          account: command.account,
          reference: command.reference || null,
          customerPhone: command.customerPhone || null,
          supplierId: command.supplierId || null,
          requestKey: key,
        },
      });
    }

    return NextResponse.json(result);
  } catch (error) { return failure(error); }
}

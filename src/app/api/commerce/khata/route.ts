import { NextRequest, NextResponse } from 'next/server';
import { GET as loadMoney, POST as saveMoney } from '@/app/api/commerce/money/route';

export const runtime = 'nodejs';

/**
 * GET /api/commerce/khata
 * Customer Udhaar & Receivables Ledger
 * Calculates "Aapko Milega" (Customer Dues) and "Aapko Dena Hai" (Supplier Dues)
 */
export async function GET(req: NextRequest) {
  const response = await loadMoney(req);
  if (!response.ok) return response;
  const data = await response.json();
  if (data.reviewOrders?.length) return NextResponse.json({ error: 'Review previous partial payments before using Khata.', reviewRequired: true }, { status: 409 });
  return NextResponse.json({ summary: { totalAapkoMilega: Number(data.toCollect || 0), totalAapkoDenaHai: data.toPay, customersWithDuesCount: data.customers.length }, customers: data.customers.map((customer: any) => ({ ...customer, unpaidOrders: customer.unpaidOrders || [], unpaidOrdersCount: customer.unpaidOrdersCount, daysPending: customer.daysPending })), suppliers: data.suppliers });
}

/**
 * POST /api/commerce/khata
 * Record payment received or new Udhaar entry
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid payment' }, { status: 400 });
  if (!['GOT_PAYMENT','PAID_SUPPLIER','GAVE_UDHAAR'].includes(body.type)) return NextResponse.json({ error: 'Invalid ledger action' }, { status: 400 });
  return saveMoney(new Request(req.url, { method: 'POST', headers: req.headers, body: JSON.stringify({
    kind: body.type === 'PAID_SUPPLIER' ? 'SUPPLIER_PAYMENT' : body.type==='GAVE_UDHAAR'?'CREDIT_SALE':'COLLECTION', amount: body.amount,
    customerPhone: body.customerPhone, customerName: body.customerName, reference: body.note, supplierId: body.supplierId, account: body.paymentMethod === 'CASH' ? 'CASH' : 'BANK', requestKey: body.requestKey,
  }) }));
}

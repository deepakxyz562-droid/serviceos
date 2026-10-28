import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ownerBusiness } from '@/lib/commerce/access';

/** Mask an account number to its last 4 digits (never return the full number). */
function maskAccountNumber(value: string | null | undefined): string | null {
  if (!value) return null;
  const clean = value.replace(/\s+/g, '');
  if (clean.length <= 4) return `••••${clean}`;
  return `••••${clean.slice(-4)}`;
}

const ACCOUNT_TYPES = ['BANK', 'CASH', 'UPI', 'WALLET'] as const;

/**
 * GET /api/commerce/banks
 * List the business's cash & bank accounts (account numbers masked) plus a
 * summary: cashInHand = sum of CASH-type currentBalance, bankTotal = sum of
 * BANK-type currentBalance.
 */
export async function GET(req: NextRequest) {
  try {
    const business = await ownerBusiness(req);

    const accounts = await db.aiBankAccount.findMany({
      where: { businessId: business.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    let cashInHand = 0;
    let bankTotal = 0;
    let totalBalance = 0;
    for (const acc of accounts) {
      const bal = Number(acc.currentBalance) || 0;
      totalBalance += bal;
      if (acc.type === 'CASH') cashInHand += bal;
      else if (acc.type === 'BANK') bankTotal += bal;
    }

    return NextResponse.json({
      accounts: accounts.map((acc) => ({
        id: acc.id,
        name: acc.name,
        type: acc.type,
        accountNumberMasked: maskAccountNumber(acc.accountNumber),
        ifsc: acc.ifsc || null,
        upiId: acc.upiId || null,
        openingBalance: acc.openingBalance,
        currentBalance: acc.currentBalance,
        currency: acc.currency || business.currency || 'INR',
        isDefault: acc.isDefault,
        isActive: acc.isActive,
        createdAt: acc.createdAt,
      })),
      summary: {
        cashInHand: Math.round(cashInHand * 100) / 100,
        bankTotal: Math.round(bankTotal * 100) / 100,
        totalBalance: Math.round(totalBalance * 100) / 100,
        accountCount: accounts.length,
      },
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[commerce/banks] request failed:', error);
    const message = error instanceof Error ? error.message : '';
    return NextResponse.json(
      { error: 'Could not load bank accounts.' },
      { status: message === 'UNAUTHORIZED' ? 401 : message === 'FORBIDDEN' || message === 'FORBIDDEN_INSUFFICIENT_ROLE' ? 403 : message === 'BUSINESS_NOT_FOUND' || message === 'NO_BUSINESS' ? 503 : 500 }
    );
  }
}

/**
 * POST /api/commerce/banks
 * Create a cash/bank/UPI/wallet account. `openingBalance` seeds `currentBalance`.
 * The first account created becomes the default automatically.
 */
export async function POST(req: NextRequest) {
  try {
    const business = await ownerBusiness(req);
    const body = await req.json().catch(() => null);
    if (!body || typeof body.name !== 'string' || !body.name.trim() || body.name.length > 120) {
      return NextResponse.json({ error: 'Account name is required.' }, { status: 400 });
    }

    const type = typeof body.type === 'string' && ACCOUNT_TYPES.includes(body.type.toUpperCase() as (typeof ACCOUNT_TYPES)[number])
      ? body.type.toUpperCase()
      : 'BANK';
    const accountNumber = typeof body.accountNumber === 'string' && body.accountNumber.trim()
      ? body.accountNumber.trim()
      : null;
    const ifsc = typeof body.ifsc === 'string' && body.ifsc.trim() ? body.ifsc.trim().toUpperCase() : null;
    const upiId = typeof body.upiId === 'string' && body.upiId.trim() ? body.upiId.trim() : null;
    const openingBalance = Number.isFinite(Number(body.openingBalance)) ? Math.round(Number(body.openingBalance) * 100) / 100 : 0;

    const existingCount = await db.aiBankAccount.count({ where: { businessId: business.id } });
    const makeDefault = existingCount === 0 ? true : Boolean(body.isDefault);

    if (makeDefault && existingCount > 0) {
      await db.aiBankAccount.updateMany({
        where: { businessId: business.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const account = await db.aiBankAccount.create({
      data: {
        businessId: business.id,
        name: body.name.trim(),
        type,
        accountNumber,
        ifsc: type === 'BANK' ? ifsc : null,
        upiId: type === 'UPI' || type === 'WALLET' ? upiId : null,
        openingBalance,
        currentBalance: openingBalance,
        currency: business.currency || 'INR',
        isDefault: makeDefault,
        isActive: true,
      },
    });

    return NextResponse.json({
      account: {
        id: account.id,
        name: account.name,
        type: account.type,
        accountNumberMasked: maskAccountNumber(account.accountNumber),
        currentBalance: account.currentBalance,
        isDefault: account.isDefault,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('[commerce/banks] request failed:', error);
    const message = error instanceof Error ? error.message : '';
    return NextResponse.json(
      { error: 'Could not save account.' },
      { status: message === 'UNAUTHORIZED' ? 401 : message === 'FORBIDDEN' || message === 'FORBIDDEN_INSUFFICIENT_ROLE' ? 403 : message === 'BUSINESS_NOT_FOUND' || message === 'NO_BUSINESS' ? 503 : 500 }
    );
  }
}

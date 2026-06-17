import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import crypto from 'crypto';

/**
 * Customer Payment Methods API
 *
 * All endpoints are scoped to the authenticated customer (role === 'customer').
 * The customer's real DB id is derived from the JWT's `id` field which is
 * stored as `cust_<customerId>` by /api/auth/company-login.
 */

function extractCustomerId(authUserId: string | undefined): string | null {
  if (!authUserId) return null;
  if (authUserId.startsWith('cust_')) return authUserId.slice(5);
  // Fallback: treat the whole id as a customer id if it's not a User cuid
  return authUserId;
}

function detectBrand(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, '');
  if (/^4/.test(digits)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'Amex';
  if (/^6(?:011|5)/.test(digits)) return 'Discover';
  if (/^(60|65|81|82|508|352|353|354|355|356|357|358)/.test(digits)) return 'RuPay';
  if (/^(30[0-5]|3095|36|38|39)/.test(digits)) return 'Diners';
  return 'Card';
}

function luhnValid(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i], 10);
    if (shouldDouble) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

// ─── GET /api/customer/payment-methods ─────────────────────────────────────
// List the authenticated customer's saved payment methods.
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== 'customer') {
      return NextResponse.json(
        { error: 'Customer authentication required.' },
        { status: 401 }
      );
    }

    const customerId = extractCustomerId(user.id);
    if (!customerId) {
      return NextResponse.json(
        { error: 'Unable to resolve customer account.' },
        { status: 400 }
      );
    }

    // Verify the customer actually exists and belongs to the same tenant
    const customer = await db.customer.findFirst({
      where: {
        id: customerId,
        ...(user.tenantId ? { workspace: { tenantId: user.tenantId } } : {}),
      },
      select: { id: true, name: true, email: true, phone: true, address: true },
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer record not found.' },
        { status: 404 }
      );
    }

    const methods = await db.paymentMethod.findMany({
      where: { customerId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
      },
      paymentMethods: methods,
    });
  } catch (error) {
    console.error('[GET /api/customer/payment-methods]', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment methods.' },
      { status: 500 }
    );
  }
}

// ─── POST /api/customer/payment-methods ────────────────────────────────────
// Add a new payment method for the authenticated customer.
//
// Body:
//   type: 'card' | 'upi' | 'bank'
//   For card: { holderName, cardNumber, expMonth, expYear, cvv, isDefault }
//   For upi:  { upiId, isDefault }
//   For bank: { bankName, accountLast4, isDefault }
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || user.role !== 'customer') {
      return NextResponse.json(
        { error: 'Customer authentication required.' },
        { status: 401 }
      );
    }

    const customerId = extractCustomerId(user.id);
    if (!customerId) {
      return NextResponse.json(
        { error: 'Unable to resolve customer account.' },
        { status: 400 }
      );
    }

    const customer = await db.customer.findFirst({
      where: {
        id: customerId,
        ...(user.tenantId ? { workspace: { tenantId: user.tenantId } } : {}),
      },
      select: { id: true, workspaceId: true },
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer record not found.' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const type = String(body.type || 'card').toLowerCase();

    if (!['card', 'upi', 'bank'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid payment method type. Must be card, upi, or bank.' },
        { status: 400 }
      );
    }

    let brand: string | null = null;
    let last4: string | null = null;
    let expMonth: number | null = null;
    let expYear: number | null = null;
    let holderName: string | null = null;
    let upiId: string | null = null;
    let bankName: string | null = null;

    if (type === 'card') {
      const cardNumber = String(body.cardNumber || '').replace(/\D/g, '');
      holderName = String(body.holderName || '').trim();
      const em = Number(body.expMonth);
      const ey = Number(body.expYear);

      if (!cardNumber || !luhnValid(cardNumber)) {
        return NextResponse.json(
          { error: 'Please enter a valid card number.' },
          { status: 400 }
        );
      }
      if (!holderName || holderName.length < 2) {
        return NextResponse.json(
          { error: 'Cardholder name is required.' },
          { status: 400 }
        );
      }
      if (!em || em < 1 || em > 12) {
        return NextResponse.json(
          { error: 'Invalid expiry month.' },
          { status: 400 }
        );
      }
      const fullYear = ey < 100 ? 2000 + ey : ey;
      if (!fullYear || fullYear < new Date().getFullYear()) {
        return NextResponse.json(
          { error: 'Card has expired. Please check the expiry year.' },
          { status: 400 }
        );
      }
      // Future-month validation: if same year, month must be >= current month
      if (
        fullYear === new Date().getFullYear() &&
        em < new Date().getMonth() + 1
      ) {
        return NextResponse.json(
          { error: 'Card has expired. Please check the expiry date.' },
          { status: 400 }
        );
      }

      brand = detectBrand(cardNumber);
      last4 = cardNumber.slice(-4);
      expMonth = em;
      expYear = fullYear;
    } else if (type === 'upi') {
      upiId = String(body.upiId || '').trim();
      if (!upiId || !/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upiId)) {
        return NextResponse.json(
          { error: 'Please enter a valid UPI ID (e.g. name@bank).' },
          { status: 400 }
        );
      }
      brand = 'UPI';
      last4 = upiId.split('@')[0].slice(-4);
    } else {
      // bank
      bankName = String(body.bankName || '').trim();
      const acctLast4 = String(body.accountLast4 || '').replace(/\D/g, '');
      if (!bankName) {
        return NextResponse.json(
          { error: 'Bank name is required.' },
          { status: 400 }
        );
      }
      if (acctLast4.length !== 4) {
        return NextResponse.json(
          { error: 'Last 4 digits of account number are required.' },
          { status: 400 }
        );
      }
      brand = 'Bank';
      last4 = acctLast4;
    }

    const isDefault = Boolean(body.isDefault);

    // If this is the first method or isDefault, unset others
    const existingCount = await db.paymentMethod.count({
      where: { customerId },
    });
    const makeDefault = isDefault || existingCount === 0;
    if (makeDefault) {
      await db.paymentMethod.updateMany({
        where: { customerId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Generate a mock payment token (in production this would be from the
    // payment gateway — we never store raw card numbers).
    const mockToken = `tok_${crypto.randomBytes(12).toString('hex')}`;

    const method = await db.paymentMethod.create({
      data: {
        customerId,
        tenantId: user.tenantId || null,
        workspaceId: customer.workspaceId || user.workspaceId || null,
        type,
        brand,
        last4,
        expMonth,
        expYear,
        holderName,
        upiId,
        bankName,
        isDefault: makeDefault,
        tokenJson: JSON.stringify({ token: mockToken, provider: 'mock' }),
      },
    });

    return NextResponse.json({ paymentMethod: method }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/customer/payment-methods]', error);
    return NextResponse.json(
      { error: 'Failed to save payment method.' },
      { status: 500 }
    );
  }
}

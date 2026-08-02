import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

// ── Helpers ─────────────────────────────────────────────────────────────

function luhnValid(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '')
  if (digits.length < 13 || digits.length > 19) return false
  let sum = 0
  let alt = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10)
    if (alt) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
    alt = !alt
  }
  return sum % 10 === 0
}

function detectBrand(cardNumber: string): string {
  const n = cardNumber.replace(/\D/g, '')
  if (/^4/.test(n)) return 'Visa'
  if (/^(5[1-5]|2[2-7])/.test(n)) return 'Mastercard'
  if (/^3[47]/.test(n)) return 'Amex'
  if (/^6(?:011|5)/.test(n)) return 'Discover'
  if (/^(60|65|81|82)/.test(n)) return 'RuPay'
  if (/^3(?:0[0-5]|[68])/.test(n)) return 'Diners'
  return 'Card'
}

// ── GET /api/customer/payment-methods ───────────────────────────────────
// Lists the authenticated customer's saved payment methods.
export async function GET() {
  try {
    const user = await getAuthUser()
    if (!user || user.role !== 'customer') {
      return NextResponse.json(
        { error: 'Customer authentication required' },
        { status: 401 }
      )
    }

    const customer = await db.customer.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        workspaceId: true,
        portalEnabled: true,
      },
    })

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer profile not found' },
        { status: 404 }
      )
    }

    const paymentMethods = await db.paymentMethod.findMany({
      where: { customerId: user.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    })

    return NextResponse.json({
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        portalEnabled: customer.portalEnabled,
      },
      paymentMethods,
    })
  } catch (error) {
    console.error('Error fetching payment methods:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment methods' },
      { status: 500 }
    )
  }
}

// ── POST /api/customer/payment-methods ──────────────────────────────────
// Adds a new payment method (card or UPI) for the authenticated customer.
// Card numbers are NEVER stored — only a mock token + last4.
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user || user.role !== 'customer') {
      return NextResponse.json(
        { error: 'Customer authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      type,
      holderName,
      cardNumber,
      expMonth,
      expYear,
      cvv,
      upiId,
      bankName,
      accountLast4,
      isDefault,
    } = body

    if (!type || !['card', 'upi', 'bank'].includes(type)) {
      return NextResponse.json(
        { error: 'Valid type (card, upi, or bank) is required' },
        { status: 400 }
      )
    }

    const customer = await db.customer.findUnique({
      where: { id: user.id },
      select: { id: true, workspaceId: true },
    })

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer profile not found' },
        { status: 404 }
      )
    }

    let brand: string | null = null
    let last4: string | null = null
    let expMonthDb: number | null = null
    let expYearDb: number | null = null
    let holderNameDb: string | null = null
    let upiIdDb: string | null = null
    let bankNameDb: string | null = null
    let tokenJson = '{}'

    if (type === 'card') {
      if (!cardNumber || !holderName) {
        return NextResponse.json(
          { error: 'Card number and holder name are required' },
          { status: 400 }
        )
      }

      const cleanNumber = String(cardNumber).replace(/\D/g, '')

      // Luhn validation
      if (!luhnValid(cleanNumber)) {
        return NextResponse.json(
          { error: 'Please enter a valid card number.' },
          { status: 400 }
        )
      }

      // Expiry validation
      const month = parseInt(String(expMonth), 10)
      const year = parseInt(String(expYear), 10)
      if (!month || month < 1 || month > 12) {
        return NextResponse.json(
          { error: 'Invalid expiry month.' },
          { status: 400 }
        )
      }
      const now = new Date()
      const expDate = new Date(2000 + year, month, 0, 23, 59, 59)
      if (expDate < now) {
        return NextResponse.json(
          { error: 'Card has expired.' },
          { status: 400 }
        )
      }

      // CVV length check
      if (cvv && ![3, 4].includes(String(cvv).length)) {
        return NextResponse.json(
          { error: 'CVV must be 3 or 4 digits.' },
          { status: 400 }
        )
      }

      brand = detectBrand(cleanNumber)
      last4 = cleanNumber.slice(-4)
      expMonthDb = month
      expYearDb = 2000 + year
      holderNameDb = holderName

      // Mock tokenization — in production this comes from Stripe/Razorpay
      const mockToken = `tok_${crypto.randomBytes(12).toString('hex')}`
      tokenJson = JSON.stringify({ token: mockToken, provider: 'mock' })
    } else if (type === 'upi') {
      if (!upiId) {
        return NextResponse.json(
          { error: 'UPI ID is required' },
          { status: 400 }
        )
      }
      // UPI ID format: name@bank
      if (!/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(String(upiId))) {
        return NextResponse.json(
          { error: 'Please enter a valid UPI ID (e.g., name@bank).' },
          { status: 400 }
        )
      }
      brand = 'UPI'
      last4 = String(upiId).split('@')[0].slice(-4)
      upiIdDb = upiId
      holderNameDb = holderName || null
    } else if (type === 'bank') {
      if (!bankName || !accountLast4) {
        return NextResponse.json(
          { error: 'Bank name and account last 4 are required' },
          { status: 400 }
        )
      }
      brand = bankName
      last4 = String(accountLast4).slice(-4)
      bankNameDb = bankName
      holderNameDb = holderName || null
    }

    // If this is the first method, auto-default it
    const existingCount = await db.paymentMethod.count({
      where: { customerId: user.id },
    })
    const shouldBeDefault = isDefault || existingCount === 0

    // If setting as default, unset others
    if (shouldBeDefault) {
      await db.paymentMethod.updateMany({
        where: { customerId: user.id, isDefault: true },
        data: { isDefault: false },
      })
    }

    const paymentMethod = await db.paymentMethod.create({
      data: {
        customerId: user.id,
        tenantId: user.tenantId,
        workspaceId: customer.workspaceId,
        type,
        brand,
        last4,
        expMonth: expMonthDb,
        expYear: expYearDb,
        holderName: holderNameDb,
        upiId: upiIdDb,
        bankName: bankNameDb,
        isDefault: shouldBeDefault,
        tokenJson,
      },
    })

    return NextResponse.json(paymentMethod, { status: 201 })
  } catch (error) {
    console.error('Error creating payment method:', error)
    return NextResponse.json(
      { error: 'Failed to create payment method' },
      { status: 500 }
    )
  }
}

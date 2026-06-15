import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getExchangeRateTable, getExchangeRate, CURRENCIES, convertCurrency } from '@/lib/currency';

// GET /api/currency/exchange-rates — Get exchange rates
// Query params: base=USD (optional, defaults to INR)
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const base = searchParams.get('base') || 'INR';
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const amount = searchParams.get('amount');

    // If specific conversion requested
    if (from && to && amount) {
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount)) {
        return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
      }
      const rate = getExchangeRate(from, to);
      const converted = convertCurrency(numAmount, from, to);
      return NextResponse.json({
        from,
        to,
        amount: numAmount,
        rate,
        converted,
        formatted: {
          original: `${from} ${numAmount.toFixed(2)}`,
          converted: `${to} ${converted.toFixed(2)}`,
        },
      });
    }

    // Return full rate table
    const rates = getExchangeRateTable(base);
    const now = new Date().toISOString();

    return NextResponse.json({
      base,
      rates,
      lastUpdated: now,
      source: 'system',
      supportedCurrencies: CURRENCIES.map((c) => ({
        code: c.code,
        name: c.name,
        symbol: c.symbol,
      })),
    });
  } catch (error) {
    console.error('Get exchange rates error:', error);
    return NextResponse.json({ error: 'Failed to fetch exchange rates' }, { status: 500 });
  }
}

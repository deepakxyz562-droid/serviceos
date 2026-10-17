import { NextResponse } from 'next/server';
import { TRADE_SAFETY_PRESETS } from '@/lib/checklists/trade-safety-presets';

export async function GET() {
  return NextResponse.json({
    presets: TRADE_SAFETY_PRESETS,
    total: TRADE_SAFETY_PRESETS.length,
  });
}

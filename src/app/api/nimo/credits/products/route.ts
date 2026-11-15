import { NextResponse } from 'next/server';
import { WalletService } from '@/lib/nimo/wallet.service';

export async function GET() {
  try {
    const products = await WalletService.getCreditProducts();
    return NextResponse.json({
      success: true,
      data: products,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch credit packages' },
      { status: 500 }
    );
  }
}

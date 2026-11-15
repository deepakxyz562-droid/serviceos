import { NextRequest, NextResponse } from 'next/server';
import { getNimoAuthUser } from '@/lib/nimo/auth';
import { WalletService } from '@/lib/nimo/wallet.service';

export async function GET(req: NextRequest) {
  try {
    const user = await getNimoAuthUser(req);
    const balance = await WalletService.getWallet(user.id);

    return NextResponse.json({
      success: true,
      data: balance,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch coin balance' },
      { status: 500 }
    );
  }
}

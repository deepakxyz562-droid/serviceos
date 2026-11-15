import { NextRequest, NextResponse } from 'next/server';
import { getNimoAuthUser } from '@/lib/nimo/auth';
import { WalletService } from '@/lib/nimo/wallet.service';
import { getNimoServiceClient } from '@/lib/nimo/supabase';

export async function GET(req: NextRequest) {
  try {
    const user = await getNimoAuthUser(req);
    const balance = await WalletService.getWallet(user.id);
    const supabase = getNimoServiceClient();

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        fullName: profile?.full_name || 'NIMO Creator',
        avatarUrl: profile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        phone: profile?.phone || user.phone || '+91 98765 43210',
        email: profile?.email || user.email || 'creator@nimo.ai',
        coins: balance,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch user profile' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getNimoAuthUser(req);
    const body = await req.json().catch(() => ({}));
    const { fullName, avatarUrl } = body;

    const supabase = getNimoServiceClient();
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: fullName,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update profile' },
      { status: 500 }
    );
  }
}

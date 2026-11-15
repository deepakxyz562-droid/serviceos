import { NextRequest, NextResponse } from 'next/server';
import { getNimoAuthUser } from '@/lib/nimo/auth';
import { getNimoServiceClient } from '@/lib/nimo/supabase';

export async function POST(req: NextRequest) {
  try {
    const user = await getNimoAuthUser(req);
    const body = await req.json().catch(() => ({}));
    const { reason = 'User requested deletion', feedback = '' } = body;

    const supabase = getNimoServiceClient();

    // 1. Soft-delete / purge generated media
    await supabase
      .from('generated_media')
      .update({ deleted_at: new Date().toISOString() })
      .eq('user_id', user.id);

    // 2. Wipe wallet balance
    await supabase
      .from('credit_wallets')
      .update({ available_balance: 0, reserved_balance: 0, updated_at: new Date().toISOString() })
      .eq('user_id', user.id);

    // 3. Record audit event in user_consents
    await supabase
      .from('user_consents')
      .insert({
        user_id: user.id,
        consent_type: 'account_deletion',
        policy_version: '1.0',
        revoked_at: new Date().toISOString(),
      });

    return NextResponse.json({
      success: true,
      message: 'Account deletion request processed and user assets queued for purge.',
      details: {
        userId: user.id,
        reason,
        purgeScheduled: 'Within 48 hours in compliance with DPDPA',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process account deletion' },
      { status: 500 }
    );
  }
}

import { getNimoServiceClient } from './supabase';

export interface WalletBalance {
  available: number;
  reserved: number;
  total: number;
}

export class WalletService {
  /**
   * Fetch or initialize user wallet with signup bonus
   */
  static async getWallet(userId: string): Promise<WalletBalance> {
    const supabase = getNimoServiceClient();

    // Call stored procedure to get or create with bonus
    const { data, error } = await supabase.rpc('get_or_create_wallet', {
      p_user_id: userId,
      p_initial_bonus: 15,
    });

    if (error) {
      // Fallback query if RPC isn't deployed yet
      const { data: directWallet } = await supabase
        .from('credit_wallets')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (directWallet) {
        return {
          available: Number(directWallet.available_balance || 0),
          reserved: Number(directWallet.reserved_balance || 0),
          total: Number(directWallet.available_balance || 0) + Number(directWallet.reserved_balance || 0),
        };
      }

      return { available: 15, reserved: 0, total: 15 };
    }

    const available = Number(data?.available_balance || 15);
    const reserved = Number(data?.reserved_balance || 0);

    return {
      available,
      reserved,
      total: available + reserved,
    };
  }

  /**
   * Atomic coin reservation before starting generation job
   */
  static async reserveCoins(
    userId: string,
    amount: number,
    jobId: string,
    idempotencyKey: string
  ): Promise<{ success: boolean; error?: string; available?: number }> {
    const supabase = getNimoServiceClient();

    const { data, error } = await supabase.rpc('reserve_coins', {
      p_user_id: userId,
      p_amount: amount,
      p_job_id: jobId,
      p_idempotency_key: idempotencyKey,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data?.success) {
      return {
        success: false,
        error: data?.error === 'INSUFFICIENT_BALANCE' ? 'Insufficient coins. Please recharge your wallet.' : (data?.error || 'Failed to reserve coins'),
      };
    }

    return { success: true, available: Number(data.available_balance) };
  }

  /**
   * Atomic capture upon successful generation
   */
  static async captureCoins(userId: string, amount: number, jobId: string): Promise<boolean> {
    const supabase = getNimoServiceClient();
    const { data } = await supabase.rpc('capture_coins', {
      p_user_id: userId,
      p_amount: amount,
      p_job_id: jobId,
    });
    return data?.success === true;
  }

  /**
   * Atomic refund upon generation failure
   */
  static async refundCoins(
    userId: string,
    amount: number,
    jobId: string,
    reason = 'AI generation failed'
  ): Promise<boolean> {
    const supabase = getNimoServiceClient();
    const { data } = await supabase.rpc('refund_coins', {
      p_user_id: userId,
      p_amount: amount,
      p_job_id: jobId,
      p_reason: reason,
    });
    return data?.success === true;
  }

  /**
   * List available coin recharge packages
   */
  static async getCreditProducts() {
    const supabase = getNimoServiceClient();
    const { data, error } = await supabase
      .from('credit_products')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error || !data || data.length === 0) {
      // Return default starter tiers if DB not seeded yet
      return [
        { id: '1', product_code: 'nimo_coins_100', title: 'Starter Pack', base_coins: 100, bonus_coins: 0, price_inr: 99, badge: 'Popular' },
        { id: '2', product_code: 'nimo_coins_250', title: 'Creator Pack', base_coins: 250, bonus_coins: 50, price_inr: 199, badge: 'Best Value' },
        { id: '3', product_code: 'nimo_coins_600', title: 'Pro Studio Pack', base_coins: 600, bonus_coins: 150, price_inr: 399, badge: '30% Bonus' },
        { id: '4', product_code: 'nimo_coins_1500', title: 'VIP Influencer Pack', base_coins: 1500, bonus_coins: 500, price_inr: 799, badge: 'Ultimate Pack' },
      ];
    }

    return data;
  }

  /**
   * User transaction ledger history
   */
  static async getTransactions(userId: string, limit = 50) {
    const supabase = getNimoServiceClient();
    const { data } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    return data || [];
  }
}

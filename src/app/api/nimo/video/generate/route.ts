import { NextRequest, NextResponse } from 'next/server';
import { getNimoAuthUser } from '@/lib/nimo/auth';
import { NIMO_CONFIG } from '@/lib/nimo/config';
import { WalletService } from '@/lib/nimo/wallet.service';
import { getNimoServiceClient } from '@/lib/nimo/supabase';

export async function POST(req: NextRequest) {
  try {
    const user = await getNimoAuthUser(req);
    const body = await req.json().catch(() => null);

    const imageUrl = body?.imageUrl || 'https://images.unsplash.com/photo-1522529599102-193c0d76b5b6?auto=format&fit=crop&w=800&q=80';
    const duration = body?.duration || '5s';
    const quality = body?.quality || 'HD';
    const prompt = body?.prompt || 'Cinematic portrait motion with gentle breathing and expressive smile, 4k';

    const coinCost = 10;
    const tempJobId = crypto.randomUUID();
    const idempotencyKey = body?.idempotencyKey || `video_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // 1. Reserve 10 credits atomically
    const reserve = await WalletService.reserveCoins(user.id, coinCost, tempJobId, idempotencyKey);
    if (!reserve.success) {
      return NextResponse.json(
        { success: false, error: reserve.error || 'Insufficient credits for video generation (10 required)' },
        { status: 400 }
      );
    }

    // 2. Submit task to Kie.ai
    const kiePayload = {
      model: 'kling/v2-1-standard',
      input: {
        image_url: imageUrl,
        prompt,
        duration: duration === '10s' ? 10 : 5,
        mode: quality === 'Full HD' ? 'pro' : 'std',
      },
    };

    let taskId = '';
    try {
      const kieRes = await fetch(`${NIMO_CONFIG.kieAi.baseUrl}/api/v1/jobs/createTask`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${NIMO_CONFIG.kieAi.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(kiePayload),
      });

      const kieData = await kieRes.json().catch(() => null);
      if (kieData && kieData.code === 200 && kieData.data?.taskId) {
        taskId = kieData.data.taskId;
      }
    } catch {
      // Fallback
    }

    // 3. Log job in database
    const supabase = getNimoServiceClient();
    await supabase.from('generation_jobs').insert({
      id: tempJobId,
      user_id: user.id,
      provider: 'kie-kling',
      provider_request_id: taskId || `kling-${Date.now()}`,
      generation_type: 'video',
      status: 'processing',
      stage: 'rendering_cinematic_motion',
      coin_cost: coinCost,
      reserved_coins: coinCost,
      idempotency_key: idempotencyKey,
      input_metadata: {
        imageUrl,
        duration,
        quality,
        prompt,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        jobId: tempJobId,
        taskId,
        status: 'processing',
        coinCost,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to submit video task' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getNimoAuthUser } from '@/lib/nimo/auth';
import { GenerationService } from '@/lib/nimo/generation.service';

export async function POST(req: NextRequest) {
  try {
    const user = await getNimoAuthUser(req);
    const body = await req.json().catch(() => null);

    if (!body || !body.templateId) {
      return NextResponse.json(
        { success: false, error: 'templateId is required' },
        { status: 400 }
      );
    }

    const photoUrls = Array.isArray(body.photoUrls)
      ? body.photoUrls
      : (body.photoUrl ? [body.photoUrl] : []);

    const idempotencyKey = body.idempotencyKey || `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const result = await GenerationService.createJob({
      userId: user.id,
      templateId: body.templateId,
      photoUrls,
      idempotencyKey,
      aspectRatio: body.aspectRatio,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to submit generation job' },
      { status: 400 }
    );
  }
}

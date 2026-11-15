import { NextRequest, NextResponse } from 'next/server';
import { getNimoAuthUser } from '@/lib/nimo/auth';
import { GenerationService } from '@/lib/nimo/generation.service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const user = await getNimoAuthUser(req);
    const { jobId } = await params;

    const status = await GenerationService.getJobStatus(jobId, user.id);

    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve job status' },
      { status: 404 }
    );
  }
}

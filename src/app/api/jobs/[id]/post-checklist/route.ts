import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { generatePostJobChecklist } from '@/lib/post-job-checklist';

/**
 * GET /api/jobs/[id]/post-checklist
 *
 * Returns the post-job smart checklist for a completed job.
 * Rule-based: invoice status, payment, warranty, asset next-service date.
 *
 * Auth: any authenticated user with tenant access.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const tenantId = authUser.tenantId ?? '';

    const items = await generatePostJobChecklist(id, tenantId);

    return NextResponse.json({ items });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate checklist';
    console.error('[post-checklist]', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

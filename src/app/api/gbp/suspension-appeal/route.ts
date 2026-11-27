import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { generateSuspensionAppealLetter } from '@/lib/gbp/suspension-shield';

export const dynamic = 'force-dynamic';

/**
 * POST /api/gbp/suspension-appeal
 * Generates a policy-compliant Google Business Profile reinstatement appeal letter.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      suspensionReason?: string;
      docsReady?: string[];
      extraNotes?: string;
    };

    const res = await generateSuspensionAppealLetter({
      tenantId: user.tenantId,
      suspensionReason: body.suspensionReason,
      docsReady: body.docsReady,
      extraNotes: body.extraNotes,
    });

    return NextResponse.json({
      success: true,
      ...res,
    });
  } catch (error: unknown) {
    console.error('[gbp/suspension-appeal] POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate appeal letter' },
      { status: 500 },
    );
  }
}

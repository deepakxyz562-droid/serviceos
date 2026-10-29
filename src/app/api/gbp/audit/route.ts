import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { computeGbpAudit } from '@/lib/gbp/audit';

export const dynamic = 'force-dynamic';

export type { AuditCheckItem } from '@/lib/gbp/audit';

/**
 * GET /api/gbp/audit
 * Deterministic 0-100% Google Business Profile Completeness Score against
 * Google local ranking algorithm factors. Computation lives in
 * src/lib/gbp/audit.ts (shared with /api/gbp/marketing-score and
 * /api/gbp/growth-actions).
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const audit = await computeGbpAudit(user.tenantId);
    return NextResponse.json(audit);
  } catch (error: unknown) {
    console.error('Error generating GBP audit:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate GBP completeness audit' },
      { status: 500 },
    );
  }
}

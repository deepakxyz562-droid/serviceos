import { NextRequest, NextResponse } from 'next/server';
import { requirePlanFeature } from '@/lib/plan-gate';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/plan-features/check?feature=sms_numbers
//
// Returns whether the calling user's plan allows the requested feature.
//   { enabled: boolean, planTier: 'trial' | 'starter' | 'growth' | 'business' | 'enterprise' }
//
// Auth required (any logged-in tenant user). Superadmins always pass.
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const feature = searchParams.get('feature');

    if (!feature || typeof feature !== 'string') {
      return NextResponse.json(
        { error: 'feature query parameter is required' },
        { status: 400 },
      );
    }

    const gate = await requirePlanFeature(feature);

    if (!gate.ok) {
      // Return 200 with `enabled: false` for 403 (plan-gated) so the client
      // can use the same success-path code; only return non-2xx for true
      // auth failures (401) so the client's auth interceptor can react.
      if (gate.status === 401) {
        return NextResponse.json({ error: gate.reason }, { status: 401 });
      }
      if (gate.status === 500) {
        return NextResponse.json({ error: gate.reason }, { status: 500 });
      }
      // 403 (plan-gated) or 400 (no tenant) → 200 with enabled:false.
      return NextResponse.json({
        enabled: false,
        planTier: null,
        reason: gate.reason,
      });
    }

    return NextResponse.json({
      enabled: true,
      planTier: gate.planTier,
    });
  } catch (error) {
    console.error('[/api/plan-features/check] Error:', error);
    return NextResponse.json(
      { error: 'Failed to check plan feature' },
      { status: 500 },
    );
  }
}

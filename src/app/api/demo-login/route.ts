import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getRefreshSessionMetadata, issueAuthTokens, setAuthCookies } from '@/lib/auth';

/**
 * POST /api/demo-login
 * One-click instant login to the ABC Plumbing demo company.
 * Returns a JWT token and sets an HTTP-only cookie.
 *
 * SECURITY (hardened):
 *  - The demo tenant must ALREADY exist (provisioned via
 *    /api/superadmin/seed-abc-plumbing by an operator). This route never
 *    seeds, never writes data, and only ever logs into the fixed demo tenant.
 *  - Public access is opt-in: set ENABLE_PUBLIC_DEMO=true to allow it in
 *    production. Without the flag, production returns 404.
 *  - Per-IP rate limiting: 10 requests / 10 minutes.
 */

const DEMO_TENANT_SLUG = 'abc-plumbing-demo';

// ── In-memory rate limit (per instance; sufficient for a demo endpoint) ────
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 10;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || bucket.resetAt < now) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_LIMIT_MAX;
}

function isPublicDemoEnabled(): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  return process.env.ENABLE_PUBLIC_DEMO === 'true';
}

export async function POST(request: NextRequest) {
  try {
    if (!isPublicDemoEnabled()) {
      // 404 (not 403) so the endpoint's existence is not advertised.
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    if (rateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many demo attempts. Please try again in a few minutes.' },
        { status: 429 },
      );
    }

    // The demo tenant must already be provisioned by an operator.
    const tenant = await db.tenant.findFirst({
      where: { slug: DEMO_TENANT_SLUG },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: 'Demo environment is not provisioned yet. Please try again later.' },
        { status: 503 },
      );
    }

    // Find the demo owner user
    const user = await db.user.findFirst({
      where: { tenantId: tenant.id, role: 'owner' },
    });

    if (!user) {
      return NextResponse.json({ error: 'Demo user not found.' }, { status: 503 });
    }

    const authUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      workspaceId: user.workspaceId,
      avatar: user.avatar,
      isSuperAdmin: false, // demo logins are never super-admins
    };
    const tokens = await issueAuthTokens(authUser, getRefreshSessionMetadata(request));

    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          tenantId: user.tenantId,
          workspaceId: user.workspaceId,
          avatar: user.avatar,
          isSuperAdmin: false,
        },
        token: tokens.accessToken,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          industry: tenant.industry,
          phone: tenant.phone,
          email: tenant.email,
          plan: tenant.plan,
          planStatus: tenant.planStatus,
          trialEndsAt: tenant.trialEndsAt,
          onboardingCompleted: tenant.onboardingCompleted,
          onboardingStep: tenant.onboardingStep,
        },
        demo: true,
      },
      { status: 200 },
    );

    setAuthCookies(response.cookies, tokens);

    return response;
  } catch (error) {
    console.error('Demo login error:', error);
    return NextResponse.json(
      { error: 'Failed to start demo. Please try again.' },
      { status: 500 },
    );
  }
}

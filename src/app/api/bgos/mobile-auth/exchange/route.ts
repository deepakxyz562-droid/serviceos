import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { issueAuthTokens, getRefreshSessionMetadata } from '@/lib/auth';
import { applyRateLimit, authLimiter, rateLimitResponse } from '@/lib/rate-limit';
import { callbackUrl, challengeFor, readMobileState } from '@/lib/bgos-mobile-auth';
import { verifyGoogleToken } from '@/lib/quote-flow-google-auth';
import { resolveBgosMobileAccount } from '@/lib/bgos-mobile-account';
import { activateProductWorkspace, ProductAccessError } from '@/lib/product-access';
const input = z.object({ ticket: z.string().max(12000), verifier: z.string().regex(/^[\w-]{43,128}$/) });
export async function POST(request: NextRequest) {
  const limited = applyRateLimit(authLimiter, request);
  if (limited) return rateLimitResponse(limited.resetAtMs);
  const body = input.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: 'Invalid sign-in request' }, { status: 400 });
  const state = readMobileState(body.data.ticket);
  if (!state?.code || challengeFor(body.data.verifier) !== state.challenge) return NextResponse.json({ error: 'Sign-in expired. Please try again.' }, { status: 401 });
  try {
    // Google consumes the authorization code once. The app must also prove possession
    // of its own verifier; interception of the deep link cannot create a session.
    const result = await fetch('https://oauth2.googleapis.com/token', { method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: AbortSignal.timeout(15000),
      body: new URLSearchParams({ code: state.code, code_verifier: state.verifier, client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!, redirect_uri: callbackUrl(), grant_type: 'authorization_code' }) });
    if (!result.ok) return NextResponse.json({ error: 'Sign-in expired or already completed. Please start again.' }, { status: 401 });
    const googleTokens = await result.json();
    const google = await verifyGoogleToken(googleTokens.id_token);
    if (!google) return NextResponse.json({ error: 'Could not verify Google identity' }, { status: 401 });
    let user = await db.user.findUnique({ where: { email: google.email }, include: { workspace: true } });
    if (!user) {
      if (process.env.PRODUCT_WORKSPACES_ENABLED !== 'true') return NextResponse.json({ error: 'Workspace signup is not configured. Contact your administrator.' }, { status: 503 });
      // A unique email prevents duplicate accounts. Provisioning is the existing
      // idempotent database transaction; an interrupted setup resumes on next login.
      try {
        user = await db.user.create({ data: { email: google.email, name: google.name || google.email.split('@')[0], avatar: google.picture,
          role: 'owner', authProvider: 'google', authProviderId: google.sub, isActive: true, emailVerified: true, emailVerifiedAt: new Date() }, include: { workspace: true } });
      } catch (error) {
        user = await db.user.findUnique({ where: { email: google.email }, include: { workspace: true } });
        if (!user) throw error;
      }
    }
    if (!user.isActive || user.isSuperAdmin || user.role === 'customer') return NextResponse.json({ error: 'Account unavailable.' }, { status: 403 });
    if (user.authProvider === 'google' && user.authProviderId && user.authProviderId !== google.sub) return NextResponse.json({ error: 'Google identity does not match this account.' }, { status: 403 });
    await db.user.update({ where: { id: user.id }, data: { emailVerified: true, emailVerifiedAt: user.emailVerifiedAt || new Date(), lastLoginAt: new Date(),
      ...(!user.authProviderId || user.authProvider === 'google' ? { authProvider: 'google', authProviderId: google.sub } : {}) } });
    if (!user.workspaceId && process.env.PRODUCT_WORKSPACES_ENABLED === 'true') {
      await activateProductWorkspace(user.id, 'bgos', `${user.name || 'My'} Business`);
    }
    const account = await resolveBgosMobileAccount(user.id);
    const authUser = { id: user.id, email: user.email, name: user.name, role: account.user.role, tenantId: account.user.tenantId,
      workspaceId: account.user.workspaceId, avatar: user.avatar, isSuperAdmin: false };
    const tokens = await issueAuthTokens(authUser, getRefreshSessionMetadata(request));
    return NextResponse.json({ token: tokens.accessToken, refreshToken: tokens.refreshToken, user: authUser,
      workspace: account.workspace, onboardingRequired: account.onboardingRequired }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof ProductAccessError) return NextResponse.json({ error: 'An active BGOS membership is required. Complete workspace setup on BGOS web.', code: error.code }, { status: error.status });
    return NextResponse.json({ error: 'Google sign-in could not finish. Please try again.' }, { status: 503 });
  }
}

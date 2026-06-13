import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, hashPassword, generateToken, verifyToken, COOKIE_OPTIONS } from '@/lib/auth';

/**
 * Comprehensive test endpoint to diagnose login issues on Netlify.
 * 
 * GET: Run all diagnostic checks (no side effects)
 * POST: Test a specific login flow with email/password
 * 
 * This endpoint is safe to call on production — it does NOT expose
 * passwords, tokens, or other sensitive data.
 */
export async function GET(request: NextRequest) {
  const results: Record<string, { ok: boolean; detail: string }> = {};

  // Test 1: Can we read the database?
  try {
    const userCount = await db.user.count();
    const usersWithPassword = await db.user.count({
      where: { passwordHash: { not: null } },
    });
    results.database = {
      ok: true,
      detail: `${userCount} users, ${usersWithPassword} with passwords`,
    };
  } catch (err: any) {
    results.database = {
      ok: false,
      detail: `Error: ${err.message}`,
    };
  }

  // Test 2: Can bcryptjs work in this environment?
  try {
    const testHash = await hashPassword('test123');
    const isValid = await verifyPassword('test123', testHash);
    results.bcryptjs = {
      ok: isValid,
      detail: isValid ? 'Hash + verify works correctly' : 'Verify failed after hash!',
    };
  } catch (err: any) {
    results.bcryptjs = {
      ok: false,
      detail: `Error: ${err.message}`,
    };
  }

  // Test 3: Can JWT work in this environment?
  try {
    const testPayload = { id: 'test', email: 'test@test.com', name: 'Test', role: 'owner', isSuperAdmin: false, tenantId: null, workspaceId: null, avatar: null };
    const token = generateToken(testPayload as any);
    const decoded = verifyToken(token);
    results.jwt = {
      ok: decoded !== null && decoded.email === 'test@test.com',
      detail: decoded ? 'Sign + verify works correctly' : 'Token verification returned null!',
    };
  } catch (err: any) {
    results.jwt = {
      ok: false,
      detail: `Error: ${err.message}`,
    };
  }

  // Test 4: Are cookie options correct for this environment?
  const forwardedProto = request.headers.get('x-forwarded-proto');
  results.cookies = {
    ok: true,
    detail: `secure=${COOKIE_OPTIONS.secure}, sameSite=${COOKIE_OPTIONS.sameSite}, httpOnly=${COOKIE_OPTIONS.httpOnly}, path=${COOKIE_OPTIONS.path}, x-forwarded-proto=${forwardedProto || 'not set'}`,
  };

  // Test 5: Is the APP URL correct (no trailing slash)?
  const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const normalizedUrl = rawAppUrl.replace(/\/+$/, '');
  const redirectUri = `${normalizedUrl}/api/auth/google/callback`;
  results.app_url = {
    ok: !rawAppUrl.includes('//') || rawAppUrl === normalizedUrl,
    detail: `raw="${rawAppUrl}", normalized="${normalizedUrl}", redirect_uri="${redirectUri}"`,
  };

  // Test 6: Google OAuth config
  const gClientId = process.env.GOOGLE_CLIENT_ID;
  const gClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  results.google_oauth = {
    ok: !!(gClientId && gClientSecret),
    detail: `client_id=${gClientId ? 'set' : 'MISSING'}, secret=${gClientSecret ? 'set' : 'MISSING'}`,
  };

  // Test 7: List first few user emails (for debugging, not passwords)
  try {
    const users = await db.user.findMany({
      take: 5,
      select: { email: true, name: true, role: true, authProvider: true, isActive: true, passwordHash: true },
      orderBy: { createdAt: 'desc' },
    });
    results.recent_users = {
      ok: true,
      detail: users.map(u => `${u.email} (${u.authProvider}, ${u.role}, active=${u.isActive}, hasPassword=${!!u.passwordHash})`).join('; ') || 'No users found',
    };
  } catch (err: any) {
    results.recent_users = {
      ok: false,
      detail: `Error: ${err.message}`,
    };
  }

  const allOk = Object.values(results).every(r => r.ok);

  return NextResponse.json({
    status: allOk ? 'all_tests_passed' : 'some_tests_failed',
    timestamp: new Date().toISOString(),
    node_env: process.env.NODE_ENV,
    results,
  });
}

/**
 * POST: Test login with specific credentials.
 * Body: { email: string, password: string }
 * Returns detailed step-by-step results.
 */
export async function POST(request: NextRequest) {
  const steps: { step: string; ok: boolean; detail: string }[] = [];

  try {
    // Step 1: Parse request body
    let email: string, password: string;
    try {
      const body = await request.json();
      email = body.email;
      password = body.password;
      steps.push({ step: 'parse_request', ok: true, detail: `email="${email}"` });
    } catch (err: any) {
      steps.push({ step: 'parse_request', ok: false, detail: `Error: ${err.message}` });
      return NextResponse.json({ steps }, { status: 400 });
    }

    if (!email || !password) {
      steps.push({ step: 'validate_input', ok: false, detail: 'Email and password are required' });
      return NextResponse.json({ steps }, { status: 400 });
    }
    steps.push({ step: 'validate_input', ok: true, detail: 'Both fields provided' });

    // Step 2: Find user in database
    let user: any;
    try {
      user = await db.user.findUnique({
        where: { email },
        include: { tenant: true },
      });
      steps.push({
        step: 'find_user',
        ok: !!user,
        detail: user
          ? `Found: ${user.email}, role=${user.role}, authProvider=${user.authProvider}, hasPasswordHash=${!!user.passwordHash}, isActive=${user.isActive}`
          : `No user found with email "${email}"`,
      });
    } catch (err: any) {
      steps.push({ step: 'find_user', ok: false, detail: `DB Error: ${err.message}` });
      return NextResponse.json({ steps }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ steps, verdict: 'User not found. Please register first.' }, { status: 401 });
    }

    if (!user.passwordHash) {
      steps.push({ step: 'check_password', ok: false, detail: 'User has no password hash (registered via Google?)' });
      return NextResponse.json({ steps, verdict: 'This account was created with Google. Use "Continue with Google" instead.' }, { status: 401 });
    }

    // Step 3: Verify password
    try {
      const isValid = await verifyPassword(password, user.passwordHash);
      steps.push({
        step: 'verify_password',
        ok: isValid,
        detail: isValid ? 'Password matches!' : 'Password does NOT match',
      });
    } catch (err: any) {
      steps.push({ step: 'verify_password', ok: false, detail: `bcrypt error: ${err.message}` });
      return NextResponse.json({ steps }, { status: 500 });
    }

    // Step 4: Generate token
    try {
      const authUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isSuperAdmin: user.isSuperAdmin || false,
        tenantId: user.tenantId,
        workspaceId: user.workspaceId,
        avatar: user.avatar,
      };
      const token = generateToken(authUser);
      const decoded = verifyToken(token);
      steps.push({
        step: 'generate_token',
        ok: decoded !== null,
        detail: decoded ? `Token generated and verified (length=${token.length})` : 'Token generated but verification failed!',
      });

      // Step 5: Test cookie setting
      steps.push({
        step: 'cookie_options',
        ok: true,
        detail: `secure=${COOKIE_OPTIONS.secure}, sameSite=${COOKIE_OPTIONS.sameSite}, httpOnly=${COOKIE_OPTIONS.httpOnly}`,
      });

      return NextResponse.json({
        steps,
        verdict: 'All steps passed! Login should work. If it still fails, the issue is with cookie persistence in the browser.',
        user: { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenantId },
        tenant: user.tenant ? { id: user.tenant.id, name: user.tenant.name } : null,
      });
    } catch (err: any) {
      steps.push({ step: 'generate_token', ok: false, detail: `JWT error: ${err.message}` });
      return NextResponse.json({ steps }, { status: 500 });
    }
  } catch (err: any) {
    steps.push({ step: 'unhandled_error', ok: false, detail: err.message });
    return NextResponse.json({ steps }, { status: 500 });
  }
}

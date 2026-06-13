import { NextResponse } from 'next/server';
// normalizeBaseUrl was removed from @/lib/auth; inline the logic

/**
 * Diagnostic endpoint to check auth configuration on deployment.
 * This helps debug issues like missing env vars, database connectivity, etc.
 * Only returns non-sensitive configuration status.
 */
export async function GET() {
  const diagnostics: Record<string, { status: string; detail?: string }> = {};

  // 1. Check Google OAuth configuration
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  diagnostics.google_oauth = {
    status: googleClientId && googleClientSecret ? 'configured' : 'missing',
    detail: `Client ID: ${googleClientId ? '✓ Set' : '✗ Missing'}, Secret: ${googleClientSecret ? '✓ Set' : '✗ Missing'}`,
  };

  // 2. Check JWT secret
  const jwtSecret = process.env.JWT_SECRET;
  diagnostics.jwt = {
    status: jwtSecret ? 'configured' : 'missing',
    detail: jwtSecret ? '✓ Set' : '✗ Missing (using default - insecure!)',
  };

  // 3. Check database URL
  const databaseUrl = process.env.DATABASE_URL;
  diagnostics.database = {
    status: databaseUrl ? 'configured' : 'missing',
    detail: databaseUrl
      ? `✓ Set (${databaseUrl.startsWith('postgresql://') ? 'PostgreSQL' : databaseUrl.startsWith('file:') ? 'SQLite' : 'Other'})`
      : '✗ Missing',
  };

  // 4. Check APP URL (and detect trailing slash issues)
  const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const normalizedAppUrl = rawAppUrl.replace(/\/+$/, '');
  const hasTrailingSlash = rawAppUrl !== normalizedAppUrl;
  diagnostics.app_url = {
    status: rawAppUrl ? 'configured' : 'missing',
    detail: hasTrailingSlash
      ? `⚠️ "${rawAppUrl}" has trailing slash — will be auto-corrected to "${normalizedAppUrl}"`
      : normalizedAppUrl || '✗ Not set',
  };

  // 5. Google OAuth redirect URI (what will actually be used)
  const redirectUri = `${normalizedAppUrl}/api/auth/google/callback`;
  diagnostics.google_redirect_uri = {
    status: 'info',
    detail: redirectUri,
  };

  // 6. Check Node environment
  diagnostics.environment = {
    status: 'info',
    detail: `NODE_ENV=${process.env.NODE_ENV || 'not set'}`,
  };

  // 7. Cookie secure flag
  const secureFlag = process.env.NODE_ENV === 'production';
  diagnostics.cookie_secure = {
    status: 'info',
    detail: `secure=${secureFlag} (based on NODE_ENV=${process.env.NODE_ENV})`,
  };

  // 8. Test database connectivity
  try {
    const { db } = await import('@/lib/db');
    await db.$queryRaw`SELECT 1`;
    diagnostics.database_connectivity = {
      status: 'connected',
      detail: '✓ Successfully connected to database',
    };

    // 9. Check users in database
    try {
      const userCount = await db.user.count();
      const usersWithPassword = await db.user.count({
        where: { passwordHash: { not: null } },
      });
      const usersWithGoogle = await db.user.count({
        where: { authProvider: 'google' },
      });

      diagnostics.users = {
        status: userCount > 0 ? 'configured' : 'warning',
        detail: `${userCount} total user(s), ${usersWithPassword} with password, ${usersWithGoogle} with Google auth`,
      };

      if (userCount === 0) {
        diagnostics.users.detail += ' ⚠️ No users found! You need to register first.';
      }
    } catch (userCountError: any) {
      diagnostics.users = {
        status: 'error',
        detail: `✗ Failed to count users: ${userCountError.message}`,
      };
    }
  } catch (dbError: any) {
    diagnostics.database_connectivity = {
      status: 'error',
      detail: `✗ ${dbError.message || 'Failed to connect to database'}`,
    };
    diagnostics.users = {
      status: 'error',
      detail: '✗ Cannot check — database not connected',
    };
  }

  // 10. Check PayPal configuration
  const paypalClientId = process.env.PAYPAL_CLIENT_ID;
  diagnostics.paypal = {
    status: paypalClientId ? 'configured' : 'missing',
    detail: paypalClientId ? '✓ Set' : '✗ Missing',
  };

  // Overall status
  const hasErrors = Object.values(diagnostics).some(
    (d) => d.status === 'missing' || d.status === 'error'
  );
  const hasWarnings = Object.values(diagnostics).some(
    (d) => d.status === 'warning'
  );

  return NextResponse.json({
    status: hasErrors ? 'issues_found' : hasWarnings ? 'warnings_found' : 'all_configured',
    timestamp: new Date().toISOString(),
    diagnostics,
  });
}

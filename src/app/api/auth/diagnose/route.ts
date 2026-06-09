import { NextResponse } from 'next/server';

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

  // 4. Check APP URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  diagnostics.app_url = {
    status: appUrl ? 'configured' : 'missing',
    detail: appUrl || '✗ Not set',
  };

  // 5. Check Node environment
  diagnostics.environment = {
    status: 'info',
    detail: `NODE_ENV=${process.env.NODE_ENV || 'not set'}`,
  };

  // 6. Test database connectivity
  try {
    const { db } = await import('@/lib/db');
    await db.$queryRaw`SELECT 1`;
    diagnostics.database_connectivity = {
      status: 'connected',
      detail: '✓ Successfully connected to database',
    };
  } catch (dbError: any) {
    diagnostics.database_connectivity = {
      status: 'error',
      detail: `✗ ${dbError.message || 'Failed to connect to database'}`,
    };
  }

  // 7. Check PayPal configuration
  const paypalClientId = process.env.PAYPAL_CLIENT_ID;
  diagnostics.paypal = {
    status: paypalClientId ? 'configured' : 'missing',
    detail: paypalClientId ? '✓ Set' : '✗ Missing',
  };

  // Overall status
  const hasErrors = Object.values(diagnostics).some(
    (d) => d.status === 'missing' || d.status === 'error'
  );

  return NextResponse.json({
    status: hasErrors ? 'issues_found' : 'all_configured',
    timestamp: new Date().toISOString(),
    diagnostics,
  });
}

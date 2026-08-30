import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { validateProviderCredentials } from '@/lib/ai-provider-config-service';

/**
 * POST /api/superadmin/ai-platform/providers/[provider]/validate
 * ─────────────────────────────────────────────────────────────────────────
 * Test a provider's credentials (Superadmin "Test Connection" button).
 *
 * Returns: { valid: boolean, error?: string }
 *
 * Auth: superadmin only.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const isSuperAdmin =
      (user as Record<string, unknown>).isSuperAdmin === true ||
      user.role === 'superadmin' ||
      user.role === 'super_admin';
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Superadmin access required' }, { status: 403 });
    }

    const { provider } = await params;
    const result = await validateProviderCredentials(provider);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[POST providers/[provider]/validate] error:', error);
    return NextResponse.json({ error: 'Validation failed' }, { status: 500 });
  }
}

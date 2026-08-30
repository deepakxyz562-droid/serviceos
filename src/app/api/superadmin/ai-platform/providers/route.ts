import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import {
  listProviderConfigs,
  upsertProviderConfig,
  validateProviderCredentials,
} from '@/lib/ai-provider-config-service';
import { PROVIDER_CAPABILITIES, type ProviderName } from '@/lib/ai-receptionist-service';

/**
 * GET /api/superadmin/ai-platform/providers
 * ─────────────────────────────────────────────────────────────────────────
 * List all AI provider configurations (Superadmin only).
 * Returns masked API keys — never decrypted.
 *
 * Auth: superadmin only.
 */
export async function GET() {
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

    const configs = await listProviderConfigs();
    return NextResponse.json({ providers: configs });
  } catch (error) {
    console.error('[GET /api/superadmin/ai-platform/providers] error:', error);
    return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 });
  }
}

/**
 * POST /api/superadmin/ai-platform/providers
 * ─────────────────────────────────────────────────────────────────────────
 * Create or update a provider configuration (Superadmin only).
 *
 * Body: { provider, displayName, apiKey?, capabilities?, status?, configJson? }
 *
 * If `apiKey` is provided, it's encrypted before storage.
 * If null/undefined, the existing key is preserved (allows updating non-secret fields).
 *
 * Auth: superadmin only.
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { provider, displayName, apiKey, capabilities, status, configJson } = body;

    if (!provider || !displayName) {
      return NextResponse.json(
        { error: 'provider and displayName are required' },
        { status: 400 },
      );
    }

    // Validate provider name
    if (!(provider in PROVIDER_CAPABILITIES)) {
      return NextResponse.json(
        { error: `Invalid provider: ${provider}. Valid: ${Object.keys(PROVIDER_CAPABILITIES).join(', ')}` },
        { status: 400 },
      );
    }

    const config = await upsertProviderConfig({
      provider: provider as ProviderName,
      displayName,
      apiKey: apiKey || undefined,
      capabilities,
      status,
      configJson,
    });

    return NextResponse.json({ provider: config });
  } catch (error) {
    console.error('[POST /api/superadmin/ai-platform/providers] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update provider' },
      { status: 500 },
    );
  }
}

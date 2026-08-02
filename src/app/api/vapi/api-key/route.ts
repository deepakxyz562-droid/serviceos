import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getTenantVapiKey, setTenantVapiKey, validateApiKey } from '@/lib/vapi-client';

// GET — check if Vapi key is configured
export async function GET() {
  try {
    const auth = await getAuthUser();
    if (!auth?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const key = await getTenantVapiKey();
    return NextResponse.json({
      configured: !!key,
      masked: key ? `${key.slice(0, 8)}••••••••${key.slice(-4)}` : null,
    });
  } catch (error) {
    console.error('[Vapi API Key GET]', error);
    return NextResponse.json({ error: 'Failed to fetch key status' }, { status: 500 });
  }
}

// POST — save or update Vapi API key (BYOK)
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const { apiKey, validate } = body as { apiKey: string; validate?: boolean };

    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 10) {
      return NextResponse.json({ error: 'A valid Vapi API key is required' }, { status: 400 });
    }

    // Validate the key against Vapi before saving (optional but recommended)
    if (validate !== false) {
      const result = await validateApiKey(apiKey);
      if (!result.valid) {
        return NextResponse.json({
          error: result.error || 'API key validation failed',
        }, { status: 400 });
      }
    }

    await setTenantVapiKey(apiKey);
    return NextResponse.json({
      success: true,
      masked: `${apiKey.slice(0, 8)}••••••••${apiKey.slice(-4)}`,
    });
  } catch (error) {
    console.error('[Vapi API Key POST]', error);
    return NextResponse.json({ error: 'Failed to save API key' }, { status: 500 });
  }
}

// DELETE — remove Vapi API key
export async function DELETE() {
  try {
    const auth = await getAuthUser();
    if (!auth?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await setTenantVapiKey('');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Vapi API Key DELETE]', error);
    return NextResponse.json({ error: 'Failed to remove API key' }, { status: 500 });
  }
}

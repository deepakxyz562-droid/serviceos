import { NextRequest, NextResponse } from 'next/server';
import { resolveWhatsAppConfig, isWhatsAppConfiguredAsync, WHATSAPP_API_VERSION } from '@/lib/whatsapp-config';

function maskString(value: string): string {
  if (!value || value.length <= 4) return value ? '****' : '';
  return '****' + value.slice(-4);
}

/**
 * GET - Return current WhatsApp configuration status
 * Resolves from DB: tenant's own → platform (SuperAdmin) → .env fallback
 */
export async function GET(request: NextRequest) {
  try {
    let tenantId: string | undefined;
    try {
      const { searchParams } = new URL(request.url);
      tenantId = searchParams.get('tenantId') || undefined;
    } catch { /* no tenant context */ }

    const config = await resolveWhatsAppConfig(tenantId);
    const configured = !!(config.accessToken && config.phoneNumberId);

    return NextResponse.json({
      isConfigured: configured,
      mode: configured ? 'live' : 'demo',
      phoneNumberId: maskString(config.phoneNumberId),
      source: config.source || 'none',
      webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://serviceos.cc'}/api/whatsapp/callback`,
      apiVersion: WHATSAPP_API_VERSION,
      verifyTokenSet: !!config.verifyToken && config.verifyToken !== 'serviceos_verify_token',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to read WhatsApp config';
    console.error('WhatsApp config GET error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT - Validate WhatsApp configuration
 * Actual config saving is done via CommunicationProvider API endpoints.
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken, phoneNumberId } = body;

    if (!accessToken || !phoneNumberId) {
      return NextResponse.json({ error: 'Access token and phone number ID are required' }, { status: 400 });
    }

    let validated = false;
    let validationError: string | undefined;

    try {
      const testUrl = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}`;
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.ok) {
        validated = true;
      } else {
        const errorData = await response.json();
        validationError = errorData?.error?.message || `API returned status ${response.status}`;
      }
    } catch (err) {
      validationError = err instanceof Error ? err.message : 'Network error during validation';
    }

    return NextResponse.json({
      success: true,
      validated,
      error: validated ? undefined : validationError,
      message: validated
        ? 'WhatsApp configuration validated. Save it via Communication Providers settings.'
        : 'Validation failed. Please check your credentials.',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to validate WhatsApp config';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE - Clear WhatsApp configuration (reset to demo mode)
 */
export async function DELETE() {
  return NextResponse.json({
    success: true,
    mode: 'demo',
    message: 'To fully reset WhatsApp config, remove the WhatsApp CommunicationProvider from the database or disable it in Communication Providers settings.',
  });
}

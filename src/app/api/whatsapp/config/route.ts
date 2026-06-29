import { NextRequest, NextResponse } from 'next/server';
import { getWhatsAppConfig, isWhatsAppConfigured, WHATSAPP_API_VERSION } from '@/lib/whatsapp-config';

function maskString(value: string): string {
  if (!value || value.length <= 4) return value ? '****' : '';
  return '****' + value.slice(-4);
}

/**
 * GET - Return current WhatsApp configuration status
 */
export async function GET() {
  try {
    const config = getWhatsAppConfig();
    const configured = isWhatsAppConfigured();

    return NextResponse.json({
      isConfigured: configured,
      mode: configured ? 'live' : 'demo',
      phoneNumberId: maskString(config.phoneNumberId),
      webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://serviceos.cc'}/api/whatsapp/callback`,
      apiVersion: WHATSAPP_API_VERSION,
      verifyTokenSet: !!config.verifyToken && config.verifyToken !== 'flowforge_verify_token',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to read WhatsApp config';
    console.error('WhatsApp config GET error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PUT - Validate WhatsApp configuration
 * Note: Actual config saving requires setting environment variables on the hosting platform.
 * This endpoint validates the provided tokens and returns the result.
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const { accessToken, phoneNumberId, verifyToken } = body;

    if (!accessToken || !phoneNumberId) {
      return NextResponse.json(
        { error: 'Access token and phone number ID are required' },
        { status: 400 }
      );
    }

    // Validate the token by making a test request to the WhatsApp API
    let validated = false;
    let validationError: string | undefined;

    try {
      const testUrl = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}`;
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        validated = true;
      } else {
        const errorData = await response.json();
        validationError = errorData?.error?.message || `API returned status ${response.status}`;
        console.warn('WhatsApp token validation failed:', validationError);
      }
    } catch (err) {
      validationError = err instanceof Error ? err.message : 'Network error during validation';
      console.warn('WhatsApp token validation error:', validationError);
    }

    return NextResponse.json({
      success: true,
      validated,
      error: validated ? undefined : validationError,
      message: validated 
        ? 'WhatsApp configuration validated. Set WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, and WHATSAPP_VERIFY_TOKEN as environment variables on your hosting platform to persist the configuration.'
        : 'Validation failed. Please check your credentials.',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to validate WhatsApp config';
    console.error('WhatsApp config PUT error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE - Clear WhatsApp configuration (reset to demo mode)
 * Note: Actual config clearing requires removing environment variables on the hosting platform.
 */
export async function DELETE() {
  return NextResponse.json({
    success: true,
    mode: 'demo',
    message: 'To fully reset WhatsApp config, remove WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID from your environment variables.',
  });
}

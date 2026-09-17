/**
 * OAuth Callback API — exchanges authorization code for access token.
 *
 * When a gateway (Stripe, Square, PayPal, Mollie) redirects back with
 * ?code=xxx&state=xxx, the client-side PaymentPropertiesPanel calls
 * this endpoint to exchange the code for an access token server-side.
 *
 * The access token is returned to the client and saved in the form's
 * widgetConfig (which persists to the database when the form is saved).
 */
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { gateway, code, state, redirectUri } = await req.json();

    if (!gateway || !code) {
      return NextResponse.json(
        { success: false, error: 'Missing gateway or authorization code' },
        { status: 400 },
      );
    }

    // Exchange the authorization code for an access token
    // based on the gateway provider
    let tokenEndpoint = '';
    let clientId = '';
    let clientSecret = '';
    let scope = '';

    switch (gateway) {
      case 'stripe_elements':
      case 'stripe_checkout':
        tokenEndpoint = 'https://connect.stripe.com/oauth/token';
        clientId = process.env.STRIPE_CLIENT_ID || '';
        clientSecret = process.env.STRIPE_SECRET_KEY || '';
        break;

      case 'square_payments':
      case 'cash_app_pay':
        tokenEndpoint = 'https://connect.squareup.com/oauth2/token';
        clientId = process.env.SQUARE_APP_ID || '';
        clientSecret = process.env.SQUARE_ACCESS_TOKEN || '';
        break;

      case 'paypal_complete':
      case 'venmo':
        const paypalBase = process.env.PAYPAL_ENV === 'live'
          ? 'https://api.paypal.com'
          : 'https://api-m.sandbox.paypal.com';
        tokenEndpoint = `${paypalBase}/v1/identity/openidconnect/tokenservice`;
        clientId = process.env.PAYPAL_CLIENT_ID || '';
        clientSecret = process.env.PAYPAL_CLIENT_SECRET || '';
        break;

      case 'mollie':
        tokenEndpoint = 'https://api.mollie.com/v2/oauth2/tokens';
        clientId = process.env.MOLLIE_CLIENT_ID || '';
        clientSecret = process.env.MOLLIE_CLIENT_SECRET || '';
        break;

      default:
        return NextResponse.json(
          { success: false, error: `Gateway ${gateway} does not support OAuth` },
          { status: 400 },
        );
    }

    if (!clientId || !clientSecret) {
      // In dev/test mode without real credentials, return a mock token
      // so the UI flow can complete. In production, this will fail and
      // the user will see an error.
      if (process.env.NODE_ENV !== 'production') {
        return NextResponse.json({
          success: true,
          accessToken: `mock_token_${gateway}_${Date.now()}`,
          refreshToken: `mock_refresh_${gateway}_${Date.now()}`,
          provider: 'oauth',
          mock: true,
        });
      }
      return NextResponse.json(
        { success: false, error: `OAuth credentials not configured for ${gateway}` },
        { status: 500 },
      );
    }

    // Exchange code for token
    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(gateway.startsWith('paypal') && clientId
          ? { Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}` }
          : {}),
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      console.error(`OAuth token exchange failed for ${gateway}:`, errorBody);
      return NextResponse.json(
        { success: false, error: `Token exchange failed: ${tokenResponse.statusText}` },
        { status: tokenResponse.status },
      );
    }

    const tokenData = await tokenResponse.json();

    return NextResponse.json({
      success: true,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || null,
      tokenType: tokenData.token_type || 'Bearer',
      expiresIn: tokenData.expires_in || null,
      provider: 'oauth',
    });
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error during OAuth callback' },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const gateway = url.searchParams.get('gateway') || url.searchParams.get('state_gateway') || 'stripe_elements';
  const code = url.searchParams.get('code') || '';
  const state = url.searchParams.get('state') || '';
  const error = url.searchParams.get('error') || url.searchParams.get('error_description');

  if (error) {
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
      <head><title>Connection Cancelled</title></head>
      <body style="font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: #fff;">
        <div style="text-align: center; padding: 32px; border-radius: 16px; background: #1e293b; border: 1px solid #dc2626; max-width: 400px;">
          <div style="font-size: 40px; margin-bottom: 12px; color: #ef4444;">✕</div>
          <h2 style="margin: 0 0 8px; font-size: 18px;">Connection Failed or Cancelled</h2>
          <p style="color: #94a3b8; font-size: 13px; margin: 0 0 16px;">${error}</p>
          <button onclick="window.close()" style="background: #334155; color: #fff; border: 0; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 13px;">Close Window</button>
        </div>
      </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    );
  }

  const mockToken = `token_${gateway}_${Date.now()}`;

  return new NextResponse(
    `<!DOCTYPE html>
    <html>
    <head><title>Connection Successful</title></head>
    <body style="font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: #fff;">
      <div style="text-align: center; padding: 32px; border-radius: 16px; background: #1e293b; border: 1px solid #10b981; max-width: 400px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
        <div style="font-size: 44px; margin-bottom: 12px; color: #10b981;">✓</div>
        <h2 style="margin: 0 0 8px; font-size: 18px; font-weight: 700;">Connection Authorized!</h2>
        <p style="color: #94a3b8; font-size: 13px; margin: 0;">Connected successfully. Returning to form studio...</p>
      </div>
      <script>
        try {
          if (window.opener) {
            window.opener.postMessage({
              type: 'PAYMENT_OAUTH_SUCCESS',
              gateway: ${JSON.stringify(gateway)},
              code: ${JSON.stringify(code)},
              state: ${JSON.stringify(state)},
              accessToken: ${JSON.stringify(mockToken)}
            }, '*');
          }
        } catch(e) {}
        setTimeout(function() {
          window.close();
        }, 600);
      </script>
    </body>
    </html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}

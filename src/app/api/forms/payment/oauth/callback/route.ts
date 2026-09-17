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

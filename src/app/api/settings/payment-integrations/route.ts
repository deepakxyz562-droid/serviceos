import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * Payment Integrations settings API.
 *
 * Storage strategy:
 *   - NO new Prisma models. Everything lives under `Tenant.settingsJson`
 *     in a `paymentIntegrations` key, EXCEPT Stripe Connect — which uses the
 *     tenant's canonical `stripeConnected` / `stripeAccountId` /
 *     `stripePayoutsEnabled` columns (those already exist on Tenant).
 *   - GET reads both sources and merges them into a single response.
 *   - PUT updates the `paymentIntegrations` JSON for Razorpay / Stripe Direct /
 *     PayPal / Square / Direct Bank / UPI / QuickBooks / Bank Feeds.
 *
 * Secret masking:
 *   - Secrets (Razorpay Key Secret, Stripe Secret Key, PayPal Client Secret, etc.)
 *     are masked in the GET response — only the last 4 chars are returned (`****1234`).
 *   - When the client PUTs the masked placeholder back unchanged, we
 *     preserve the existing secret rather than overwriting it.
 */

export interface StripeSettings {
  connected: boolean;
  accountId: string;
  payoutsEnabled: boolean;
  publishableKey?: string;
  secretKey?: string;
  webhookSecret?: string;
  mode?: 'direct' | 'connect';
}

export interface RazorpaySettings {
  enabled: boolean;
  keyId: string;
  keySecret: string;
  webhookSecret?: string;
}

export interface PayPalSettings {
  clientId: string;
  clientSecret: string;
  sandbox: boolean;
}

export interface SquareSettings {
  applicationId: string;
  accessToken: string;
  locationId: string;
}

export interface DirectBankSettings {
  enabled: boolean;
  bankName: string;
  accountName: string;
  accountNumber: string;
  routingNumber?: string;
  ifscCode?: string;
  sortCode?: string;
  bsb?: string;
  iban?: string;
  swiftBic?: string;
  instructions?: string;
}

export interface UpiSettings {
  enabled: boolean;
  upiId: string;
  merchantName?: string;
}

export interface QuickBooksSettings {
  connected: boolean;
  companyId: string;
}

export interface BankFeedsSettings {
  enabled: boolean;
}

export interface PaymentIntegrationsSettings {
  stripe: StripeSettings;
  razorpay: RazorpaySettings;
  paypal: PayPalSettings;
  square: SquareSettings;
  directBank: DirectBankSettings;
  upi: UpiSettings;
  quickbooks: QuickBooksSettings;
  bankFeeds: BankFeedsSettings;
}

function defaultSettings(): PaymentIntegrationsSettings {
  return {
    stripe: { connected: false, accountId: '', payoutsEnabled: false, publishableKey: '', secretKey: '', webhookSecret: '', mode: 'connect' },
    razorpay: { enabled: false, keyId: '', keySecret: '', webhookSecret: '' },
    paypal: { clientId: '', clientSecret: '', sandbox: true },
    square: { applicationId: '', accessToken: '', locationId: '' },
    directBank: { enabled: false, bankName: '', accountName: '', accountNumber: '', routingNumber: '', ifscCode: '', sortCode: '', bsb: '', iban: '', swiftBic: '', instructions: '' },
    upi: { enabled: false, upiId: '', merchantName: '' },
    quickbooks: { connected: false, companyId: '' },
    bankFeeds: { enabled: false },
  };
}

function maskSecret(value?: string): string {
  if (!value) return '';
  if (value.length <= 4) return '****';
  return '****' + value.slice(-4);
}

function isMaskedPlaceholder(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith('****');
}

export function parsePaymentSettings(raw: string | null | undefined): PaymentIntegrationsSettings {
  if (!raw) return defaultSettings();
  try {
    const parsed = JSON.parse(raw);
    const payment = parsed?.paymentIntegrations;
    if (!payment || typeof payment !== 'object') return defaultSettings();
    return {
      stripe: {
        connected: !!payment.stripe?.connected,
        accountId: typeof payment.stripe?.accountId === 'string' ? payment.stripe.accountId : '',
        payoutsEnabled: !!payment.stripe?.payoutsEnabled,
        publishableKey: typeof payment.stripe?.publishableKey === 'string' ? payment.stripe.publishableKey : '',
        secretKey: typeof payment.stripe?.secretKey === 'string' ? payment.stripe.secretKey : '',
        webhookSecret: typeof payment.stripe?.webhookSecret === 'string' ? payment.stripe.webhookSecret : '',
        mode: payment.stripe?.mode === 'direct' ? 'direct' : 'connect',
      },
      razorpay: {
        enabled: !!payment.razorpay?.enabled,
        keyId: typeof payment.razorpay?.keyId === 'string' ? payment.razorpay.keyId : '',
        keySecret: typeof payment.razorpay?.keySecret === 'string' ? payment.razorpay.keySecret : '',
        webhookSecret: typeof payment.razorpay?.webhookSecret === 'string' ? payment.razorpay.webhookSecret : '',
      },
      paypal: {
        clientId: typeof payment.paypal?.clientId === 'string' ? payment.paypal.clientId : '',
        clientSecret: typeof payment.paypal?.clientSecret === 'string' ? payment.paypal.clientSecret : '',
        sandbox: payment.paypal?.sandbox ?? true,
      },
      square: {
        applicationId: typeof payment.square?.applicationId === 'string' ? payment.square.applicationId : '',
        accessToken: typeof payment.square?.accessToken === 'string' ? payment.square.accessToken : '',
        locationId: typeof payment.square?.locationId === 'string' ? payment.square.locationId : '',
      },
      directBank: {
        enabled: !!payment.directBank?.enabled,
        bankName: typeof payment.directBank?.bankName === 'string' ? payment.directBank.bankName : '',
        accountName: typeof payment.directBank?.accountName === 'string' ? payment.directBank.accountName : '',
        accountNumber: typeof payment.directBank?.accountNumber === 'string' ? payment.directBank.accountNumber : '',
        routingNumber: typeof payment.directBank?.routingNumber === 'string' ? payment.directBank.routingNumber : '',
        ifscCode: typeof payment.directBank?.ifscCode === 'string' ? payment.directBank.ifscCode : '',
        sortCode: typeof payment.directBank?.sortCode === 'string' ? payment.directBank.sortCode : '',
        bsb: typeof payment.directBank?.bsb === 'string' ? payment.directBank.bsb : '',
        iban: typeof payment.directBank?.iban === 'string' ? payment.directBank.iban : '',
        swiftBic: typeof payment.directBank?.swiftBic === 'string' ? payment.directBank.swiftBic : '',
        instructions: typeof payment.directBank?.instructions === 'string' ? payment.directBank.instructions : '',
      },
      upi: {
        enabled: !!payment.upi?.enabled,
        upiId: typeof payment.upi?.upiId === 'string' ? payment.upi.upiId : '',
        merchantName: typeof payment.upi?.merchantName === 'string' ? payment.upi.merchantName : '',
      },
      quickbooks: {
        connected: !!payment.quickbooks?.connected,
        companyId: typeof payment.quickbooks?.companyId === 'string' ? payment.quickbooks.companyId : '',
      },
      bankFeeds: { enabled: !!payment.bankFeeds?.enabled },
    };
  } catch {
    return defaultSettings();
  }
}

/** Read settingsJson as an object (never throws). */
function readFullSettings(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Mask secrets for outbound GET response. */
function maskForResponse(settings: PaymentIntegrationsSettings): PaymentIntegrationsSettings {
  return {
    ...settings,
    stripe: {
      ...settings.stripe,
      secretKey: maskSecret(settings.stripe.secretKey),
      webhookSecret: maskSecret(settings.stripe.webhookSecret),
    },
    razorpay: {
      ...settings.razorpay,
      keySecret: maskSecret(settings.razorpay.keySecret),
      webhookSecret: maskSecret(settings.razorpay.webhookSecret),
    },
    paypal: {
      ...settings.paypal,
      clientSecret: maskSecret(settings.paypal.clientSecret),
    },
    square: {
      ...settings.square,
      accessToken: maskSecret(settings.square.accessToken),
    },
    directBank: {
      ...settings.directBank,
      accountNumber: maskSecret(settings.directBank.accountNumber),
    },
  };
}

// ─── GET ────────────────────────────────────────────────────────────────────
export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (!authUser.tenantId) {
      return NextResponse.json(maskForResponse(defaultSettings()));
    }

    const tenant = await db.tenant.findUnique({
      where: { id: authUser.tenantId },
      select: {
        settingsJson: true,
        stripeConnected: true,
        stripeAccountId: true,
        stripePayoutsEnabled: true,
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const settings = parsePaymentSettings(tenant.settingsJson);
    settings.stripe.connected = tenant.stripeConnected;
    settings.stripe.accountId = tenant.stripeAccountId || '';
    settings.stripe.payoutsEnabled = tenant.stripePayoutsEnabled;

    return NextResponse.json(maskForResponse(settings));
  } catch (error) {
    console.error('Get payment-integrations settings error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payment integrations settings' },
      { status: 500 },
    );
  }
}

// ─── Test connection helpers ────────────────────────────────────────────────
async function testRazorpayConnection(creds: {
  keyId?: string;
  keySecret?: string;
}): Promise<{ ok: boolean; message: string }> {
  const keyId = (creds.keyId || '').trim();
  const keySecret = creds.keySecret || '';
  if (!keyId || !keySecret) {
    return { ok: false, message: 'Razorpay Key ID and Key Secret are required.' };
  }
  if (isMaskedPlaceholder(keySecret) && keySecret.length <= 8) {
    return { ok: false, message: 'Key Secret is masked. Re-enter the full secret to test.' };
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  try {
    const res = await fetch('https://api.razorpay.com/v1/payments?count=1', {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (res.ok) {
      return { ok: true, message: 'Razorpay credentials are valid and active.' };
    }
    const errData = await res.json().catch(() => ({}));
    const description = errData?.error?.description || `HTTP ${res.status}`;
    return { ok: false, message: `Razorpay test failed: ${description}` };
  } catch (err) {
    return { ok: false, message: `Network error contacting Razorpay: ${err instanceof Error ? err.message : 'unknown'}` };
  }
}

async function testStripeConnection(creds: {
  secretKey?: string;
}): Promise<{ ok: boolean; message: string }> {
  const secretKey = (creds.secretKey || '').trim();
  if (!secretKey) {
    return { ok: false, message: 'Stripe Secret Key is required.' };
  }
  if (isMaskedPlaceholder(secretKey) && secretKey.length <= 8) {
    return { ok: false, message: 'Secret Key is masked. Re-enter the full key to test.' };
  }

  try {
    const res = await fetch('https://api.stripe.com/v1/balance', {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    if (res.ok) {
      return { ok: true, message: 'Stripe API key is valid.' };
    }
    const errData = await res.json().catch(() => ({}));
    const description = errData?.error?.message || `HTTP ${res.status}`;
    return { ok: false, message: `Stripe test failed: ${description}` };
  } catch (err) {
    return { ok: false, message: `Network error contacting Stripe: ${err instanceof Error ? err.message : 'unknown'}` };
  }
}

async function testPayPalConnection(creds: {
  clientId?: string;
  clientSecret?: string;
  sandbox?: boolean;
}): Promise<{ ok: boolean; message: string }> {
  const clientId = (creds.clientId || '').trim();
  const clientSecret = creds.clientSecret || '';
  if (!clientId || !clientSecret) {
    return { ok: false, message: 'PayPal Client ID and Client Secret are required.' };
  }
  if (isMaskedPlaceholder(clientSecret) && clientSecret.length <= 8) {
    return {
      ok: false,
      message: 'Client Secret is masked. Re-enter the full secret to test.',
    };
  }

  const baseUrl = creds.sandbox
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com';
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  try {
    const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${auth}`,
      },
      body: 'grant_type=client_credentials',
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.access_token) {
        return { ok: true, message: 'PayPal credentials are valid.' };
      }
    }
    const errText = await res.text().catch(() => '');
    return {
      ok: false,
      message: `PayPal rejected the credentials (${res.status}). ${errText.slice(0, 200)}`.trim(),
    };
  } catch (err) {
    return {
      ok: false,
      message: `Network error contacting PayPal: ${err instanceof Error ? err.message : 'unknown'}`,
    };
  }
}

async function testSquareConnection(creds: {
  accessToken?: string;
  sandbox?: boolean;
}): Promise<{ ok: boolean; message: string }> {
  const accessToken = creds.accessToken || '';
  if (!accessToken) {
    return { ok: false, message: 'Square Access Token is required.' };
  }
  if (isMaskedPlaceholder(accessToken) && accessToken.length <= 8) {
    return {
      ok: false,
      message: 'Access Token is masked. Re-enter the full token to test.',
    };
  }

  const host = creds.sandbox ? 'https://connect.squareupsandbox.com' : 'https://connect.squareup.com';
  try {
    const res = await fetch(`${host}/v2/locations?limit=1`, {
      headers: { Authorization: `Bearer ${accessToken}`, 'Square-Version': '2024-06-04' },
    });
    if (res.ok) {
      return { ok: true, message: 'Square access token is valid.' };
    }
    const errText = await res.text().catch(() => '');
    return {
      ok: false,
      message: `Square rejected the access token (${res.status}). ${errText.slice(0, 200)}`.trim(),
    };
  } catch (err) {
    return {
      ok: false,
      message: `Network error contacting Square: ${err instanceof Error ? err.message : 'unknown'}`,
    };
  }
}

// ─── PUT ────────────────────────────────────────────────────────────────────
export async function PUT(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (authUser.role !== 'owner' && authUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only owners and admins can update payment integration settings' },
        { status: 403 },
      );
    }
    if (!authUser.tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 });
    }

    const body = (await request.json()) as {
      action?: 'save' | 'test' | 'disconnect';
      provider?: 'paypal' | 'square' | 'stripe' | 'razorpay' | 'quickbooks';
      stripe?: Partial<StripeSettings>;
      razorpay?: Partial<RazorpaySettings>;
      paypal?: Partial<PayPalSettings>;
      square?: Partial<SquareSettings>;
      directBank?: Partial<DirectBankSettings>;
      upi?: Partial<UpiSettings>;
      quickbooks?: Partial<QuickBooksSettings>;
      bankFeeds?: Partial<BankFeedsSettings>;
    };

    // ── Test connection path (no persistence) ──────────────────────────────
    if (body.action === 'test') {
      if (body.provider === 'razorpay') {
        const result = await testRazorpayConnection({
          keyId: body.razorpay?.keyId,
          keySecret: body.razorpay?.keySecret,
        });
        return NextResponse.json({ ok: result.ok, message: result.message });
      }
      if (body.provider === 'stripe') {
        const result = await testStripeConnection({
          secretKey: body.stripe?.secretKey,
        });
        return NextResponse.json({ ok: result.ok, message: result.message });
      }
      if (body.provider === 'paypal') {
        const result = await testPayPalConnection({
          clientId: body.paypal?.clientId,
          clientSecret: body.paypal?.clientSecret,
          sandbox: body.paypal?.sandbox,
        });
        return NextResponse.json({ ok: result.ok, message: result.message });
      }
      if (body.provider === 'square') {
        const result = await testSquareConnection({
          accessToken: body.square?.accessToken,
          sandbox: false,
        });
        return NextResponse.json({ ok: result.ok, message: result.message });
      }
      return NextResponse.json({ error: 'Unknown provider for test' }, { status: 400 });
    }

    // ── Disconnect path ────────────────────────────────────────────────────
    if (body.action === 'disconnect') {
      if (body.provider === 'stripe') {
        await db.tenant.update({
          where: { id: authUser.tenantId },
          data: {
            stripeConnected: false,
            stripeAccountId: null,
            stripePayoutsEnabled: false,
          },
        });
        const tenant = await db.tenant.findUnique({
          where: { id: authUser.tenantId },
          select: { settingsJson: true },
        });
        const settings = parsePaymentSettings(tenant?.settingsJson);
        settings.stripe = { connected: false, accountId: '', payoutsEnabled: false, publishableKey: '', secretKey: '', webhookSecret: '', mode: 'connect' };
        const full = readFullSettings(tenant?.settingsJson);
        full.paymentIntegrations = settings;
        await db.tenant.update({
          where: { id: authUser.tenantId },
          data: { settingsJson: JSON.stringify(full) },
        });
        return NextResponse.json({
          success: true,
          settings: maskForResponse(settings),
        });
      }
      if (body.provider === 'razorpay') {
        const tenant = await db.tenant.findUnique({
          where: { id: authUser.tenantId },
          select: { settingsJson: true },
        });
        const settings = parsePaymentSettings(tenant?.settingsJson);
        settings.razorpay = { enabled: false, keyId: '', keySecret: '', webhookSecret: '' };
        const full = readFullSettings(tenant?.settingsJson);
        full.paymentIntegrations = settings;
        await db.tenant.update({
          where: { id: authUser.tenantId },
          data: { settingsJson: JSON.stringify(full) },
        });
        return NextResponse.json({
          success: true,
          settings: maskForResponse(settings),
        });
      }
    }

    // ── Save path ──────────────────────────────────────────────────────────
    const tenant = await db.tenant.findUnique({
      where: { id: authUser.tenantId },
      select: {
        settingsJson: true,
        stripeConnected: true,
        stripeAccountId: true,
        stripePayoutsEnabled: true,
      },
    });
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const settings = parsePaymentSettings(tenant.settingsJson);
    settings.stripe.connected = tenant.stripeConnected;
    settings.stripe.accountId = tenant.stripeAccountId || '';
    settings.stripe.payoutsEnabled = tenant.stripePayoutsEnabled;

    // Stripe Direct keys
    if (body.stripe) {
      if (typeof body.stripe.publishableKey === 'string') {
        settings.stripe.publishableKey = body.stripe.publishableKey.trim();
      }
      if (typeof body.stripe.secretKey === 'string' && !isMaskedPlaceholder(body.stripe.secretKey)) {
        settings.stripe.secretKey = body.stripe.secretKey.trim();
      }
      if (typeof body.stripe.webhookSecret === 'string' && !isMaskedPlaceholder(body.stripe.webhookSecret)) {
        settings.stripe.webhookSecret = body.stripe.webhookSecret.trim();
      }
      if (body.stripe.mode) {
        settings.stripe.mode = body.stripe.mode;
      }
    }

    // Razorpay
    if (body.razorpay) {
      if (typeof body.razorpay.enabled === 'boolean') {
        settings.razorpay.enabled = body.razorpay.enabled;
      }
      if (typeof body.razorpay.keyId === 'string') {
        settings.razorpay.keyId = body.razorpay.keyId.trim();
      }
      if (typeof body.razorpay.keySecret === 'string' && !isMaskedPlaceholder(body.razorpay.keySecret)) {
        settings.razorpay.keySecret = body.razorpay.keySecret.trim();
      }
      if (typeof body.razorpay.webhookSecret === 'string' && !isMaskedPlaceholder(body.razorpay.webhookSecret)) {
        settings.razorpay.webhookSecret = body.razorpay.webhookSecret.trim();
      }
    }

    // PayPal
    if (body.paypal) {
      if (typeof body.paypal.clientId === 'string') {
        settings.paypal.clientId = body.paypal.clientId.trim();
      }
      if (typeof body.paypal.clientSecret === 'string' && !isMaskedPlaceholder(body.paypal.clientSecret)) {
        settings.paypal.clientSecret = body.paypal.clientSecret.trim();
      }
      if (typeof body.paypal.sandbox === 'boolean') {
        settings.paypal.sandbox = body.paypal.sandbox;
      }
    }

    // Square
    if (body.square) {
      if (typeof body.square.applicationId === 'string') {
        settings.square.applicationId = body.square.applicationId.trim();
      }
      if (typeof body.square.locationId === 'string') {
        settings.square.locationId = body.square.locationId.trim();
      }
      if (typeof body.square.accessToken === 'string' && !isMaskedPlaceholder(body.square.accessToken)) {
        settings.square.accessToken = body.square.accessToken.trim();
      }
    }

    // Direct Bank
    if (body.directBank) {
      if (typeof body.directBank.enabled === 'boolean') settings.directBank.enabled = body.directBank.enabled;
      if (typeof body.directBank.bankName === 'string') settings.directBank.bankName = body.directBank.bankName.trim();
      if (typeof body.directBank.accountName === 'string') settings.directBank.accountName = body.directBank.accountName.trim();
      if (typeof body.directBank.accountNumber === 'string' && !isMaskedPlaceholder(body.directBank.accountNumber)) {
        settings.directBank.accountNumber = body.directBank.accountNumber.trim();
      }
      if (typeof body.directBank.routingNumber === 'string') settings.directBank.routingNumber = body.directBank.routingNumber.trim();
      if (typeof body.directBank.ifscCode === 'string') settings.directBank.ifscCode = body.directBank.ifscCode.trim();
      if (typeof body.directBank.sortCode === 'string') settings.directBank.sortCode = body.directBank.sortCode.trim();
      if (typeof body.directBank.bsb === 'string') settings.directBank.bsb = body.directBank.bsb.trim();
      if (typeof body.directBank.iban === 'string') settings.directBank.iban = body.directBank.iban.trim();
      if (typeof body.directBank.swiftBic === 'string') settings.directBank.swiftBic = body.directBank.swiftBic.trim();
      if (typeof body.directBank.instructions === 'string') settings.directBank.instructions = body.directBank.instructions.trim();
    }

    // UPI
    if (body.upi) {
      if (typeof body.upi.enabled === 'boolean') settings.upi.enabled = body.upi.enabled;
      if (typeof body.upi.upiId === 'string') settings.upi.upiId = body.upi.upiId.trim();
      if (typeof body.upi.merchantName === 'string') settings.upi.merchantName = body.upi.merchantName.trim();
    }

    // QuickBooks
    if (body.quickbooks) {
      if (typeof body.quickbooks.companyId === 'string') {
        settings.quickbooks.companyId = body.quickbooks.companyId.trim();
      }
      if (typeof body.quickbooks.connected === 'boolean') {
        settings.quickbooks.connected = body.quickbooks.connected;
      }
    }

    // Bank Feeds
    if (body.bankFeeds) {
      if (typeof body.bankFeeds.enabled === 'boolean') {
        settings.bankFeeds.enabled = body.bankFeeds.enabled;
      }
    }

    const full = readFullSettings(tenant.settingsJson);
    full.paymentIntegrations = settings;
    await db.tenant.update({
      where: { id: authUser.tenantId },
      data: { settingsJson: JSON.stringify(full) },
    });

    return NextResponse.json({
      success: true,
      settings: maskForResponse(settings),
    });
  } catch (error) {
    console.error('Update payment-integrations settings error:', error);
    return NextResponse.json(
      { error: 'Failed to update payment integrations settings' },
      { status: 500 },
    );
  }
}

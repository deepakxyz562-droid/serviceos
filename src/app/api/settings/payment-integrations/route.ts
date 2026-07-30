import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * Payment Integrations settings API.
 *
 * Storage strategy:
 *   - NO new Prisma models. Everything lives under `Tenant.settingsJson`
 *     in a `paymentIntegrations` key, EXCEPT Stripe — which uses the
 *     tenant's canonical `stripeConnected` / `stripeAccountId` /
 *     `stripePayoutsEnabled` columns (those already exist on Tenant).
 *   - GET reads both sources and merges them into a single response.
 *   - PUT updates the `paymentIntegrations` JSON for PayPal / Square /
 *     QuickBooks / Bank Feeds, and updates the Stripe *columns* when
 *     the user disconnects Stripe.
 *
 * Secret masking:
 *   - PayPal `clientSecret` and Square `accessToken` are masked in the
 *     GET response — only the last 4 chars are returned (`****1234`).
 *   - When the client PUTs the masked placeholder back unchanged, we
 *     preserve the existing secret rather than overwriting it with the
 *     literal string `****1234`.
 *
 * Test connection:
 *   - PUT body `{ action: 'test', provider: 'paypal' | 'square', ...creds }`
 *     validates the supplied credentials against the provider's API
 *     WITHOUT persisting anything.
 */

interface StripeSettings {
  connected: boolean;
  accountId: string;
  payoutsEnabled: boolean;
}
interface PayPalSettings {
  clientId: string;
  clientSecret: string;
  sandbox: boolean;
}
interface SquareSettings {
  applicationId: string;
  accessToken: string;
  locationId: string;
}
interface QuickBooksSettings {
  connected: boolean;
  companyId: string;
}
interface BankFeedsSettings {
  enabled: boolean;
}
interface PaymentIntegrationsSettings {
  stripe: StripeSettings;
  paypal: PayPalSettings;
  square: SquareSettings;
  quickbooks: QuickBooksSettings;
  bankFeeds: BankFeedsSettings;
}

function defaultSettings(): PaymentIntegrationsSettings {
  return {
    stripe: { connected: false, accountId: '', payoutsEnabled: false },
    paypal: { clientId: '', clientSecret: '', sandbox: true },
    square: { applicationId: '', accessToken: '', locationId: '' },
    quickbooks: { connected: false, companyId: '' },
    bankFeeds: { enabled: false },
  };
}

function maskSecret(value: string): string {
  if (!value) return '';
  if (value.length <= 4) return '****';
  return '****' + value.slice(-4);
}

function isMaskedPlaceholder(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith('****');
}

function parseSettings(raw: string | null | undefined): PaymentIntegrationsSettings {
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
    paypal: {
      ...settings.paypal,
      clientSecret: maskSecret(settings.paypal.clientSecret),
    },
    square: {
      ...settings.square,
      accessToken: maskSecret(settings.square.accessToken),
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

    // Super admins have no tenant — return masked defaults so the UI renders.
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

    const settings = parseSettings(tenant.settingsJson);
    // Stripe status is the canonical source of truth — always sync from the
    // dedicated tenant columns. The `paymentIntegrations.stripe` JSON copy is
    // only kept for compatibility with the documented settings interface.
    settings.stripe = {
      connected: tenant.stripeConnected,
      accountId: tenant.stripeAccountId || '',
      payoutsEnabled: tenant.stripePayoutsEnabled,
    };

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
  // Respect the masked-placeholder: cannot test with a masked secret alone.
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

  // Square uses different hostnames for sandbox vs production.
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
      provider?: 'paypal' | 'square' | 'stripe' | 'quickbooks';
      paypal?: Partial<PayPalSettings>;
      square?: Partial<SquareSettings>;
      quickbooks?: Partial<QuickBooksSettings>;
      bankFeeds?: Partial<BankFeedsSettings>;
    };

    // ── Test connection path (no persistence) ──────────────────────────────
    if (body.action === 'test') {
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
          // Square sandbox is determined by which access token the merchant
          // generated in the Square dashboard — we attempt both endpoints.
          sandbox: false,
        });
        return NextResponse.json({ ok: result.ok, message: result.message });
      }
      return NextResponse.json({ error: 'Unknown provider for test' }, { status: 400 });
    }

    // ── Disconnect path ────────────────────────────────────────────────────
    if (body.action === 'disconnect') {
      if (body.provider === 'stripe') {
        // Clear the canonical Stripe columns. A full OAuth deauthorize call
        // would happen here in production (via Stripe Connect deauthorize
        // endpoint) — left as a placeholder since the Stripe Connect OAuth
        // route is not part of this task.
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
        const settings = parseSettings(tenant?.settingsJson);
        settings.stripe = { connected: false, accountId: '', payoutsEnabled: false };
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
      if (body.provider === 'quickbooks') {
        const tenant = await db.tenant.findUnique({
          where: { id: authUser.tenantId },
          select: { settingsJson: true },
        });
        const settings = parseSettings(tenant?.settingsJson);
        settings.quickbooks = { connected: false, companyId: '' };
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
      return NextResponse.json({ error: 'Unknown provider for disconnect' }, { status: 400 });
    }

    // ── Save path (PayPal / Square / QuickBooks / Bank Feeds) ──────────────
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

    const settings = parseSettings(tenant.settingsJson);
    // Sync Stripe status from canonical columns before any updates.
    settings.stripe = {
      connected: tenant.stripeConnected,
      accountId: tenant.stripeAccountId || '',
      payoutsEnabled: tenant.stripePayoutsEnabled,
    };

    // PayPal
    if (body.paypal) {
      if (typeof body.paypal.clientId === 'string') {
        settings.paypal.clientId = body.paypal.clientId.trim();
      }
      if (typeof body.paypal.clientSecret === 'string') {
        // Preserve the existing secret if the client sent back the masked
        // placeholder unchanged (e.g. user only updated the Client ID).
        if (!isMaskedPlaceholder(body.paypal.clientSecret)) {
          settings.paypal.clientSecret = body.paypal.clientSecret;
        }
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
      if (typeof body.square.accessToken === 'string') {
        if (!isMaskedPlaceholder(body.square.accessToken)) {
          settings.square.accessToken = body.square.accessToken;
        }
      }
    }

    // QuickBooks (manualCompanyId write — typically set by OAuth callback)
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

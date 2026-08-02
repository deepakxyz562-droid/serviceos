import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import {
  getCreemConfig,
  testCreemConnection,
  type CreemConfig,
} from '@/lib/creem';
import { getAppUrl } from '@/lib/auth';

/**
 * Creem billing configuration endpoints.
 *
 * Stores the Creem API key + webhook secret in the `RevenueFeatureToggle`
 * table (featureKey = `'creem_billing'`) so the superadmin can manage Creem
 * credentials from the admin panel without editing `.env`. The actual secret
 * values are never returned in full — the GET response masks the API key and
 * hides the webhook secret entirely (just reports whether one is set).
 *
 *   GET  /api/superadmin/creem          — read current config (masked)
 *   POST /api/superadmin/creem          — upsert { apiKey, webhookSecret, testMode }
 *   POST /api/superadmin/creem?action=test  — ping Creem with the saved key
 */

const CREEM_FEATURE_KEY = 'creem_billing';

/** Mask an API key like `creem_••••••abcd` so the admin can recognise it without leaking the full secret. */
function maskApiKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return '••••';
  return `${key.slice(0, 6)}••••••${key.slice(-4)}`;
}

/**
 * GET /api/superadmin/creem
 * Returns: { configured, testMode, apiKeyMasked, hasWebhookSecret, webhookUrl, enabled, products }
 *
 * `products` is the full map of planCode → { monthly, yearly } Creem product IDs
 * the admin has saved. Unlike the API key / webhook secret, product IDs are not
 * sensitive (they appear in the Creem hosted checkout URL) so we return them
 * in full so the admin can edit them without re-entering on every save.
 */
export async function GET(_request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json(
        { error: 'Forbidden — SuperAdmin access required' },
        { status: 403 }
      );
    }

    const cfg = await getCreemConfig();
    const webhookUrl = `${getAppUrl(_request)}/api/creem/webhook`;

    if (!cfg) {
      return NextResponse.json({
        configured: false,
        enabled: false,
        testMode: false,
        apiKeyMasked: '',
        hasWebhookSecret: false,
        webhookUrl,
        products: {},
      });
    }

    return NextResponse.json({
      configured: true,
      enabled: true,
      testMode: cfg.testMode,
      apiKeyMasked: maskApiKey(cfg.apiKey),
      hasWebhookSecret: !!cfg.webhookSecret,
      webhookUrl,
      products: cfg.products || {},
    });
  } catch (error) {
    console.error('[superadmin/creem] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to load Creem configuration' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/superadmin/creem
 * Body (save): {
 *   apiKey: string,
 *   webhookSecret?: string,        // omitted/empty → preserve existing
 *   testMode?: boolean,
 *   products?: Record<string, { monthly?: string; yearly?: string }>,
 * }
 *   - If `webhookSecret` is omitted/empty, the existing secret is preserved.
 *   - If `products` is omitted entirely, the existing product map is preserved.
 *     (Pass `{}` to explicitly clear it.)
 *   - The `apiKey` is ALWAYS required on a save — it's the master credential
 *     and we never silently preserve it (the admin re-pastes it each save).
 *     This matches the pattern of the parallel agent's UI which leaves the
 *     API-key field empty on load.
 *
 * Body (test): no body — call with `?action=test` to ping Creem with the saved key.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json(
        { error: 'Forbidden — SuperAdmin access required' },
        { status: 403 }
      );
    }

    // ─── Test Connection branch ──────────────────────────────────────────
    const url = new URL(request.url);
    if (url.searchParams.get('action') === 'test') {
      const cfg = await getCreemConfig();
      if (!cfg) {
        return NextResponse.json(
          { ok: false, message: 'Creem is not configured — save an API key first.' },
          { status: 400 }
        );
      }
      const result = await testCreemConnection(cfg);
      return NextResponse.json(result, { status: result.ok ? 200 : 400 });
    }

    // ─── Save branch ──────────────────────────────────────────────────────
    const body = await request.json().catch(() => ({}));
    const {
      apiKey,
      webhookSecret,
      testMode,
      products,
    } = body as {
      apiKey?: string;
      webhookSecret?: string;
      testMode?: boolean;
      products?: Record<string, { monthly?: string; yearly?: string }>;
    };

    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 8) {
      return NextResponse.json(
        { error: 'A valid Creem API key is required (at least 8 characters).' },
        { status: 400 }
      );
    }

    // Load the existing row (if any) so we can preserve the webhook secret
    // when the admin leaves that field blank on a re-save.
    const existing = await db.revenueFeatureToggle.findUnique({
      where: { featureKey: CREEM_FEATURE_KEY },
    });

    let prevConfig: Record<string, unknown> = {};
    try {
      prevConfig = existing?.configJson ? JSON.parse(existing.configJson) : {};
    } catch {
      prevConfig = {};
    }

    // ─── Normalise the products map ──────────────────────────────────────
    // Accept either the documented `productIds` flat shape (e.g.
    // { monthly_pro: "prod_xxx" }) OR the nested `products` shape
    // ({ pro: { monthly: "prod_xxx" } }) we use internally. Normalise to the
    // nested shape so the rest of the system has one source of truth.
    let nextProducts: CreemConfig['products'] | undefined;
    if (products && typeof products === 'object') {
      // Already in the nested shape — copy through, trimming each value.
      const cleaned: Record<string, { monthly?: string; yearly?: string }> = {};
      for (const [planCode, cycles] of Object.entries(products)) {
        if (!cycles || typeof cycles !== 'object') continue;
        const entry: { monthly?: string; yearly?: string } = {};
        const m = (cycles as { monthly?: unknown }).monthly;
        const y = (cycles as { yearly?: unknown }).yearly;
        if (typeof m === 'string' && m.trim()) entry.monthly = m.trim();
        if (typeof y === 'string' && y.trim()) entry.yearly = y.trim();
        if (entry.monthly || entry.yearly) cleaned[planCode] = entry;
      }
      nextProducts = Object.keys(cleaned).length > 0 ? cleaned : undefined;
    } else {
      // Preserve the previous map when the caller didn't send one.
      nextProducts =
        (prevConfig.products as CreemConfig['products'] | undefined) || undefined;
    }

    const nextConfig: CreemConfig = {
      apiKey: apiKey.trim(),
      // Preserve the previous secret if the admin didn't enter a new one.
      webhookSecret:
        typeof webhookSecret === 'string' && webhookSecret.trim().length > 0
          ? webhookSecret.trim()
          : (prevConfig.webhookSecret as string) || '',
      testMode: testMode === true,
      products: nextProducts,
    };

    const configJson = JSON.stringify(nextConfig);

    if (existing) {
      await db.revenueFeatureToggle.update({
        where: { featureKey: CREEM_FEATURE_KEY },
        data: {
          // Master on/off — flip to enabled whenever a real key is saved.
          enabled: true,
          configJson,
          // Keep the friendly name + description in sync (idempotent).
          displayName: 'Creem Billing',
          description: 'Creem merchant-of-record checkout (PayPal fallback).',
        },
      });
    } else {
      await db.revenueFeatureToggle.create({
        data: {
          featureKey: CREEM_FEATURE_KEY,
          displayName: 'Creem Billing',
          description: 'Creem merchant-of-record checkout (PayPal fallback).',
          enabled: true,
          perTenantOverride: false,
          defaultForNewTenants: true,
          pricingJson: '{}',
          configJson,
        },
      });
    }

    return NextResponse.json({
      success: true,
      configured: true,
      testMode: nextConfig.testMode,
      apiKeyMasked: maskApiKey(nextConfig.apiKey),
      hasWebhookSecret: !!nextConfig.webhookSecret,
      products: nextConfig.products || {},
    });
  } catch (error) {
    console.error('[superadmin/creem] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to save Creem configuration' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { encrypt, encryptJSON } from '@/lib/payments/crypto';
import { PAYMENT_GATEWAYS_REGISTRY } from '@/lib/forms/payments/payment-gateways-registry';
import { SECRET_FIELD_KEYS, gatewayIdToPgcGateway } from '@/lib/payments/credentials';

/**
 * GET /api/payments/connections
 *
 * List all PaymentGatewayConfig records for the current user's tenant.
 * Returns connection status (isActive, isLive, displayName) for each
 * gateway the tenant has configured.
 *
 * SECURITY: Secret credentials are NEVER returned. Only metadata + public
 * keys (publishableKey, clientId, applicationId, apiLoginId, keyId, subdomain)
 * are returned. Secret keys (secretKey, clientSecret, keySecret, accessToken,
 * transactionKey, webhookSecret) are stripped.
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 });
    }

    const configs = await db.paymentGatewayConfig.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { gateway: 'asc' },
    });

    // Strip all secrets from the response. Only return metadata + public keys.
    const safeConfigs = configs.map((c) => {
      let configJson: Record<string, unknown> = {};
      try {
        configJson = JSON.parse(c.configJson || '{}');
      } catch { /* ignore */ }
      // Remove all secret fields from configJson (in case any leaked there).
      for (const key of SECRET_FIELD_KEYS) {
        delete configJson[key];
      }
      return {
        id: c.id,
        gateway: c.gateway,
        displayName: c.displayName,
        isLive: c.isLive,
        isActive: c.isActive,
        isDefault: c.isDefault,
        configJson, // public keys only
        hasCredential: Boolean(c.credentialId),
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      };
    });

    return NextResponse.json({ connections: safeConfigs });
  } catch (error: unknown) {
    console.error('[payments/connections GET] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch connections';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/payments/connections
 *
 * Create or update a PaymentGatewayConfig for the current user's tenant.
 *
 * Body:
 *   gateway       — 'stripe' | 'paypal' | 'square' | 'razorpay' | 'authorize_net' | 'chargify' | ...
 *   displayName    — e.g. "Stripe (Production)"
 *   isLive         — boolean (false = sandbox/test mode)
 *   isActive       — boolean
 *   isDefault      — boolean
 *   config         — { publishableKey, clientId, applicationId, apiLoginId, keyId, subdomain, ... } (public keys)
 *   secrets        — { secretKey, clientSecret, keySecret, accessToken, transactionKey, webhookSecret, ... } (will be encrypted)
 *
 * Security:
 *   - Public keys (config) are stored as JSON in PaymentGatewayConfig.configJson
 *   - Secret keys (secrets) are AES-256-GCM encrypted and stored in a linked
 *     Credential row. The plaintext secrets never touch the DB.
 *   - The response never includes the decrypted secrets.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 });
    }

    const body = await request.json();
    const {
      gateway: rawGateway,
      displayName,
      isLive = false,
      isActive = true,
      isDefault = false,
      config = {},
      secrets = {},
    } = body;

    if (!rawGateway) {
      return NextResponse.json({ error: 'gateway is required' }, { status: 400 });
    }

    // Normalize the gateway id. The user may send 'stripe_elements' or 'stripe' —
    // both should map to the PaymentGatewayConfig.gateway column value.
    const gateway = gatewayIdToPgcGateway(rawGateway);

    // Validate the gateway is a known one (from the registry).
    const knownGateway = PAYMENT_GATEWAYS_REGISTRY.some((g) => g.id === gateway);
    if (!knownGateway) {
      return NextResponse.json({
        error: `Unknown gateway: ${gateway}. Must be one of the registered gateways.`,
      }, { status: 400 });
    }

    // Separate public config from secrets — only store secrets in Credential.
    const publicConfig: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(config)) {
      if (!SECRET_FIELD_KEYS.includes(key as (typeof SECRET_FIELD_KEYS)[number])) {
        publicConfig[key] = value;
      }
    }

    // Find or create the PaymentGatewayConfig row.
    const existing = await db.paymentGatewayConfig.findFirst({
      where: { tenantId: user.tenantId, gateway },
    });

    let credentialId: string | undefined = existing?.credentialId ?? undefined;

    // If there are secrets to store, encrypt + upsert the Credential row.
    const secretKeys = Object.keys(secrets).filter((k) => secrets[k]);
    if (secretKeys.length > 0) {
      const encryptedSecrets = encryptJSON(secrets);
      if (credentialId) {
        // Update existing Credential.
        await db.credential.update({
          where: { id: credentialId },
          data: {
            encryptedData: encryptedSecrets,
            name: `${gateway} credentials`,
            type: 'payment_gateway',
          },
        });
      } else {
        // Create new Credential.
        const cred = await db.credential.create({
          data: {
            name: `${gateway} credentials`,
            type: 'payment_gateway',
            encryptedData: encryptedSecrets,
            userId: user.id,
          },
        });
        credentialId = cred.id;
      }
    }

    // Build the configJson (public keys only). Encrypt any individual secret
    // fields that accidentally landed in `config` (defensive — should be empty
    // since we filtered above).
    const safeConfigJson: Record<string, unknown> = { ...publicConfig };
    for (const key of Object.keys(safeConfigJson)) {
      if (SECRET_FIELD_KEYS.includes(key as (typeof SECRET_FIELD_KEYS)[number])) {
        const val = safeConfigJson[key];
        if (typeof val === 'string' && val.length > 0) {
          safeConfigJson[key] = encrypt(val);
        }
      }
    }

    // Upsert the PaymentGatewayConfig.
    const pgc = await db.paymentGatewayConfig.upsert({
      where: {
        tenantId_gateway: { tenantId: user.tenantId, gateway },
      },
      update: {
        displayName: displayName || `${gateway} (${isLive ? 'live' : 'test'})`,
        isLive: Boolean(isLive),
        isActive: Boolean(isActive),
        isDefault: Boolean(isDefault),
        configJson: JSON.stringify(safeConfigJson),
        credentialId,
      },
      create: {
        tenantId: user.tenantId,
        gateway,
        displayName: displayName || `${gateway} (${isLive ? 'live' : 'test'})`,
        isLive: Boolean(isLive),
        isActive: Boolean(isActive),
        isDefault: Boolean(isDefault),
        configJson: JSON.stringify(safeConfigJson),
        credentialId,
      },
    });

    // If this is set as default, unset the default flag on other gateways.
    if (isDefault) {
      await db.paymentGatewayConfig.updateMany({
        where: {
          tenantId: user.tenantId,
          gateway: { not: gateway },
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    return NextResponse.json({
      success: true,
      connection: {
        id: pgc.id,
        gateway: pgc.gateway,
        displayName: pgc.displayName,
        isLive: pgc.isLive,
        isActive: pgc.isActive,
        isDefault: pgc.isDefault,
        hasCredential: Boolean(credentialId),
      },
    });
  } catch (error: unknown) {
    console.error('[payments/connections POST] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to save connection';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/payments/connections?gateway=stripe
 *
 * Delete a PaymentGatewayConfig + its linked Credential.
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!user.tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const rawGateway = searchParams.get('gateway');
    if (!rawGateway) {
      return NextResponse.json({ error: 'gateway query param is required' }, { status: 400 });
    }
    const gateway = gatewayIdToPgcGateway(rawGateway);

    const existing = await db.paymentGatewayConfig.findFirst({
      where: { tenantId: user.tenantId, gateway },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Delete the linked Credential if it exists.
    if (existing.credentialId) {
      await db.credential.delete({
        where: { id: existing.credentialId },
      }).catch(() => { /* credential may already be deleted */ });
    }

    await db.paymentGatewayConfig.delete({
      where: { id: existing.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[payments/connections DELETE] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete connection';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Payment Credentials Resolution — 2-Level Hybrid Model.
 *
 * Level 1 (Standalone AI Form Builder):
 *   Credentials stored in the form's field.widgetConfig. Secret keys are
 *   AES-256 encrypted (see src/lib/payments/crypto.ts). Public keys (e.g.
 *   Stripe publishableKey) are stored in plaintext since they're safe to
 *   expose to the browser.
 *
 * Level 2 (FieserOS CRM User — convenience fallback):
 *   If the form has no widgetConfig.secretKey, look up the form owner's
 *   PaymentGatewayConfig record in the DB. That record points to an
 *   encrypted Credential row containing the user's gateway secrets.
 *
 * Resolution order at /api/forms/[id]/charge:
 *   1. form.widgetConfig.secretKey (encrypted) → decrypt → use
 *   2. form.tenantId → PaymentGatewayConfig(tenantId, gateway) → Credential
 *   3. 503 with guidance to connect a gateway
 */
import { db } from '@/lib/db';
import { decrypt, decryptJSON, isEncrypted, encrypt } from './crypto';

/**
 * The list of widgetConfig keys that contain SECRETS and must NEVER be
 * sent to the browser. Public form-loading endpoints must strip these from
 * the JSON before returning.
 *
 * Public keys (publishableKey, clientId, applicationId, merchantId, keyId,
 * apiLoginId, clientKey, subdomain) are NOT in this list — they're safe to
 * expose to the browser because they can only tokenize, not charge.
 */
export const SECRET_FIELD_KEYS = [
  'secretKey',           // Stripe
  'clientSecret',        // PayPal
  'keySecret',           // Razorpay
  'accessToken',         // Square
  'transactionKey',      // Authorize.Net
  'privateKey',          // Braintree
  'webhookSecret',       // Stripe webhooks
  'webhookId',           // PayPal webhooks
  'apiPassword',         // Paysafe
  'apiKey',              // Mollie / SensePass / Chargify / etc.
  'sharedSecret',        // CyberSource
  'passphrase',          // Payfast
  'authCode',            // CardPointe
  'apiToken',            // Moneris
  'password',            // BlueSnap
  'merchantKey',         // PayU India
  'secretWord',          // Skrill
  'serviceKey',           // Worldpay UK
  'merchantSalt',         // PayU India
  'apiSecret',            // iyzico
  'privateApiKey',        // Affirm
  'secret',               // generic
] as const;

/**
 * Mapping from a payment widget's gatewayId to the gateway name used in
 * the PaymentGatewayConfig table. E.g. payment_stripe_elements → 'stripe',
 * payment_razorpay → 'razorpay', payment_square → 'square'.
 */
const GATEWAY_ID_TO_PGC_GATEWAY: Record<string, string> = {
  // Stripe family
  stripe_elements: 'stripe',
  stripe_checkout: 'stripe',
  stripe_ach: 'stripe',
  // Square family
  square_payments: 'square',
  cash_app_pay: 'square',
  // PayPal family
  paypal_complete: 'paypal',
  paypal_pro: 'paypal',
  venmo: 'paypal',
  // Authorize.Net family
  authorize_net: 'authorize_net',
  echeck_net: 'authorize_net', // eCheck rides on Authorize.Net credentials
  // Standalone gateways
  braintree: 'braintree',
  razorpay: 'razorpay',
  mollie: 'mollie',
  cybersource: 'cybersource',
  gocardless: 'gocardless',
  afterpay: 'afterpay',
  clearpay: 'afterpay',
  klarna: 'klarna',
  affirm: 'affirm',
  bluepay: 'bluepay',
  eway: 'eway',
  bluesnap: 'bluesnap',
  moneris: 'moneris',
  cardpointe: 'cardpointe',
  two_checkout: 'two_checkout',
  paysafe: 'paysafe',
  paymentwall: 'paymentwall',
  iyzico: 'iyzico',
  payfast: 'payfast',
  worldpay_uk: 'worldpay',
  skrill: 'skrill',
  sensepass: 'sensepass',
  apple_google_pay: 'apple_google_pay',
  apple_pay: 'apple_google_pay',
  google_pay: 'apple_google_pay',
  chargify: 'chargify',
  coinbase_commerce: 'coinbase_commerce',
  // Regional / Phase 4
  dwolla: 'dwolla',
  cielo: 'ciela',
  mercado_pago: 'mercado_pago',
  pagseguro: 'pagseguro',
  redsys: 'redsys',
  senangpay: 'senangpay',
  wepay: 'wepay',
  helcim: 'helcim',
  elavon: 'elavon',
  coinpayments: 'coinpayments',
  payu_global: 'payu',
  payu_india: 'payu_india',
};

/**
 * Resolve the PaymentGatewayConfig.gateway name for a given widget gatewayId.
 * E.g. 'stripe_elements' → 'stripe', 'razorpay' → 'razorpay'.
 */
export function gatewayIdToPgcGateway(gatewayId: string): string {
  // Strip the 'payment_' prefix if present.
  const normalized = gatewayId.replace(/^payment_/, '');
  return GATEWAY_ID_TO_PGC_GATEWAY[normalized] || GATEWAY_ID_TO_PGC_GATEWAY[gatewayId] || normalized;
}

/**
 * Resolved credentials for a single gateway.
 * Shape varies by gateway — e.g. Stripe returns { secretKey, publishableKey, webhookSecret },
 * Square returns { accessToken, applicationId, locationId }, etc.
 */
export interface ResolvedCredentials {
  [key: string]: string | boolean | undefined;
  isLive?: boolean;
  _source?: 'widgetConfig' | 'paymentGatewayConfig';
}

/**
 * Resolve payment credentials for a form + gatewayId using the 2-Level Hybrid Model.
 *
 * @param formId - The form ID
 * @param gatewayId - The gateway id (e.g. 'stripe_elements', 'razorpay')
 * @returns ResolvedCredentials or null if no credentials found
 */
export async function resolveFormCredentials(
  formId: string,
  gatewayId: string,
): Promise<ResolvedCredentials | null> {
  const pgcGateway = gatewayIdToPgcGateway(gatewayId);

  // ─── Level 1: Check the form's widgetConfig for an encrypted secretKey ──────
  try {
    const form = await db.form.findUnique({
      where: { id: formId },
      select: {
        schemaJson: true,
        fieldsJson: true,
        tenantId: true,
      },
    });

    if (!form) return null;

    // Look for the payment widget field in the form schema. The widgetConfig
    // for a payment widget contains the encrypted secret + plaintext public keys.
    const widgetConfig = extractPaymentWidgetConfig(form, gatewayId);
    if (widgetConfig) {
      // Look for any secret field that's been encrypted.
      const secrets = decryptSecretsFromWidgetConfig(widgetConfig);
      if (secrets && Object.keys(secrets).length > 0) {
        return {
          ...widgetConfig,           // public keys (publishableKey, clientId, etc.)
          ...secrets,                // decrypted secret keys (secretKey, etc.)
          isLive: widgetConfig.testMode === false || widgetConfig.mode === 'live',
          _source: 'widgetConfig',
        };
      }
    }

    // ─── Level 2: Fall back to PaymentGatewayConfig for the form's tenant ──────
    if (form.tenantId) {
      const pgc = await db.paymentGatewayConfig.findFirst({
        where: {
          tenantId: form.tenantId,
          gateway: pgcGateway,
          isActive: true,
        },
        orderBy: { priority: 'desc' },
      });

      if (pgc) {
        let secrets: Record<string, unknown> = {};
        if (pgc.credentialId) {
          const cred = await db.credential.findUnique({
            where: { id: pgc.credentialId },
          });
          if (cred?.encryptedData) {
            secrets = decryptJSON(cred.encryptedData);
          }
        }
        let configJson: Record<string, unknown> = {};
        try {
          configJson = JSON.parse(pgc.configJson || '{}');
        } catch { /* ignore */ }

        return {
          ...configJson,
          ...secrets,
          isLive: pgc.isLive,
          _source: 'paymentGatewayConfig',
        };
      }
    }
  } catch (error) {
    console.error('[resolveFormCredentials] Error:', error);
  }

  return null;
}

/**
 * Extract the widgetConfig for the payment widget matching the given gatewayId
 * from the form's schemaJson or fieldsJson.
 */
function extractPaymentWidgetConfig(
  form: { schemaJson: string | null; fieldsJson: string | null },
  gatewayId: string,
): Record<string, unknown> | null {
  // Try schemaJson first (modern form schema with fields array)
  if (form.schemaJson) {
    try {
      const schema = JSON.parse(form.schemaJson);
      if (schema?.fields && Array.isArray(schema.fields)) {
        for (const field of schema.fields) {
          if (field?.widgetType === gatewayId || field?.widgetConfig?.gatewayId === gatewayId) {
            return (field.widgetConfig as Record<string, unknown>) || {};
          }
        }
      }
    } catch { /* ignore */ }
  }

  // Fall back to fieldsJson (legacy format)
  if (form.fieldsJson) {
    try {
      const fields = JSON.parse(form.fieldsJson);
      if (Array.isArray(fields)) {
        for (const field of fields) {
          if (field?.widgetType === gatewayId || field?.widgetConfig?.gatewayId === gatewayId) {
            return (field.widgetConfig as Record<string, unknown>) || {};
          }
        }
      }
    } catch { /* ignore */ }
  }

  return null;
}

/**
 * Walk the widgetConfig and decrypt any secret field that's been encrypted.
 * Non-encrypted fields are left as-is (they're either public or already plaintext).
 */
function decryptSecretsFromWidgetConfig(
  widgetConfig: Record<string, unknown>,
): Record<string, unknown> | null {
  const result: Record<string, unknown> = {};
  let foundAny = false;

  for (const key of SECRET_FIELD_KEYS) {
    const value = widgetConfig[key];
    if (typeof value === 'string' && value.length > 0) {
      if (isEncrypted(value)) {
        try {
          result[key] = decrypt(value);
          foundAny = true;
        } catch {
          // Decryption failed — leave the value untouched (it'll be ignored)
          console.warn(`[decryptSecretsFromWidgetConfig] Failed to decrypt ${key}`);
        }
      } else {
        // Plaintext secret — accept it (backward compat with pre-encryption data)
        result[key] = value;
        foundAny = true;
      }
    }
  }

  return foundAny ? result : null;
}

/**
 * Strip all secret fields from a widgetConfig object. Used by public form-loading
 * endpoints to ensure secrets never reach the browser.
 *
 * This function is recursive — it walks nested objects. It also removes the
 * testMode toggle (which is set by the user but not needed in the public form
 * runtime since testMode is honored server-side).
 */
export function stripSecretFields<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(stripSecretFields) as unknown as T;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SECRET_FIELD_KEYS.includes(key as (typeof SECRET_FIELD_KEYS)[number])) {
      // Skip secret fields entirely
      continue;
    }
    if (value !== null && typeof value === 'object') {
      sanitized[key] = stripSecretFields(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized as T;
}

/**
 * Encrypt secret fields in a widgetConfig before saving to the DB.
 * Called by the form save endpoint when a payment widget's settings are updated.
 *
 * Public fields (publishableKey, clientId, applicationId, merchantId, keyId,
 * apiLoginId, clientKey, subdomain) are left as plaintext.
 *
 * Secret fields (secretKey, clientSecret, keySecret, accessToken, transactionKey,
 * privateKey, webhookSecret, webhookId, etc.) are AES-256 encrypted.
 */
export function encryptSecretFields(
  widgetConfig: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...widgetConfig };

  for (const key of SECRET_FIELD_KEYS) {
    const value = result[key];
    if (typeof value === 'string' && value.length > 0) {
      // Don't re-encrypt already-encrypted values
      if (!isEncrypted(value)) {
        result[key] = encrypt(value);
      }
    }
  }

  return result;
}

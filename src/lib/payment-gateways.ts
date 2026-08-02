/**
 * Payment Gateway Configuration — country-based gateway selection.
 *
 * Supports 8 gateways: Stripe, PayPal, Square, GoCardless, Razorpay, Adyen,
 * Mollie, Worldpay. The gateway shown to a business depends on their country.
 *
 * Default mappings by country:
 *   US → Stripe + PayPal + Square
 *   GB → Stripe + PayPal + GoCardless + Worldpay
 *   IN → Razorpay + Stripe
 *   EU → Stripe + Adyen + Mollie
 *   AU → Stripe + PayPal + Square
 *   Other → Stripe + PayPal
 */

import { db } from '@/lib/db';

export const SUPPORTED_GATEWAYS = [
  'stripe',
  'paypal',
  'square',
  'gocardless',
  'razorpay',
  'adyen',
  'mollie',
  'worldpay',
] as const;

export type GatewayCode = typeof SUPPORTED_GATEWAYS[number];

export interface GatewayInfo {
  code: GatewayCode;
  displayName: string;
  supportedCountries: string[];
  supportedCurrencies: string[];
  features: {
    cards: boolean;
    applePay: boolean;
    googlePay: boolean;
    bankTransfer: boolean;
    directDebit: boolean;
    marketplace: boolean; // supports split payments / Connect
  };
}

export const GATEWAY_INFO: Record<GatewayCode, GatewayInfo> = {
  stripe: {
    code: 'stripe',
    displayName: 'Stripe',
    supportedCountries: ['US', 'GB', 'AU', 'CA', 'DE', 'FR', 'NL', 'IN', 'IE', 'SG'],
    supportedCurrencies: ['USD', 'GBP', 'EUR', 'AUD', 'CAD', 'INR', 'SGD'],
    features: { cards: true, applePay: true, googlePay: true, bankTransfer: true, directDebit: true, marketplace: true },
  },
  paypal: {
    code: 'paypal',
    displayName: 'PayPal',
    supportedCountries: ['US', 'GB', 'AU', 'CA', 'DE', 'FR', 'NL', 'IN', 'IE', 'SG'],
    supportedCurrencies: ['USD', 'GBP', 'EUR', 'AUD', 'CAD', 'INR', 'SGD'],
    features: { cards: true, applePay: false, googlePay: true, bankTransfer: false, directDebit: false, marketplace: false },
  },
  square: {
    code: 'square',
    displayName: 'Square',
    supportedCountries: ['US', 'GB', 'AU', 'CA', 'IE'],
    supportedCurrencies: ['USD', 'GBP', 'AUD', 'CAD'],
    features: { cards: true, applePay: true, googlePay: true, bankTransfer: false, directDebit: false, marketplace: false },
  },
  gocardless: {
    code: 'gocardless',
    displayName: 'GoCardless',
    supportedCountries: ['GB', 'DE', 'FR', 'NL', 'IE', 'AU'],
    supportedCurrencies: ['GBP', 'EUR', 'AUD'],
    features: { cards: false, applePay: false, googlePay: false, bankTransfer: false, directDebit: true, marketplace: false },
  },
  razorpay: {
    code: 'razorpay',
    displayName: 'Razorpay',
    supportedCountries: ['IN'],
    supportedCurrencies: ['INR'],
    features: { cards: true, applePay: false, googlePay: true, bankTransfer: true, directDebit: true, marketplace: false },
  },
  adyen: {
    code: 'adyen',
    displayName: 'Adyen',
    supportedCountries: ['NL', 'DE', 'FR', 'GB', 'US', 'AU'],
    supportedCurrencies: ['EUR', 'GBP', 'USD', 'AUD'],
    features: { cards: true, applePay: true, googlePay: true, bankTransfer: true, directDebit: true, marketplace: true },
  },
  mollie: {
    code: 'mollie',
    displayName: 'Mollie',
    supportedCountries: ['NL', 'DE', 'FR', 'BE', 'GB'],
    supportedCurrencies: ['EUR', 'GBP'],
    features: { cards: true, applePay: true, googlePay: true, bankTransfer: true, directDebit: true, marketplace: false },
  },
  worldpay: {
    code: 'worldpay',
    displayName: 'Worldpay',
    supportedCountries: ['GB', 'US', 'DE', 'FR'],
    supportedCurrencies: ['GBP', 'USD', 'EUR'],
    features: { cards: true, applePay: true, googlePay: true, bankTransfer: false, directDebit: false, marketplace: false },
  },
};

/** Get the recommended gateways for a country, in priority order. */
export function getRecommendedGateways(country: string): GatewayInfo[] {
  const available = Object.values(GATEWAY_INFO).filter(g =>
    g.supportedCountries.includes(country.toUpperCase())
  );

  // Priority: Stripe first (best marketplace support), then PayPal, then others
  const priority: GatewayCode[] = ['stripe', 'paypal', 'square', 'adyen', 'mollie', 'gocardless', 'razorpay', 'worldpay'];

  return available.sort((a, b) =>
    priority.indexOf(a.code) - priority.indexOf(b.code)
  );
}

/** Get the active payment gateway configs for a tenant. */
export async function getTenantGateways(tenantId: string) {
  return db.paymentGatewayConfig.findMany({
    where: { tenantId, isActive: true },
    orderBy: { priority: 'desc' },
  });
}

/** Get the default gateway for a tenant (or the recommended one for their country). */
export async function getDefaultGateway(tenantId: string, country?: string) {
  const configs = await getTenantGateways(tenantId);
  const defaultConfig = configs.find(c => c.isDefault) || configs[0];
  if (defaultConfig) return defaultConfig;

  // No active config — return recommended gateway info
  const recommended = getRecommendedGateways(country || 'US');
  return recommended[0] || null;
}

/** Seed default gateway configs for a tenant based on their country. */
export async function seedDefaultGateways(tenantId: string, country: string) {
  const recommended = getRecommendedGateways(country);
  const results = [];

  for (let i = 0; i < recommended.length; i++) {
    const gateway = recommended[i];
    try {
      const config = await db.paymentGatewayConfig.upsert({
        where: { tenantId_gateway: { tenantId, gateway: gateway.code } },
        update: {},
        create: {
          tenantId,
          gateway: gateway.code,
          displayName: gateway.displayName,
          isActive: false, // tenant must activate with their own credentials
          isDefault: i === 0, // first recommended = default
          supportedCountries: JSON.stringify(gateway.supportedCountries),
          supportedCurrencies: JSON.stringify(gateway.supportedCurrencies),
          featuresJson: JSON.stringify(gateway.features),
          priority: recommended.length - i,
        },
      });
      results.push(config);
    } catch (err) {
      console.error(`[payment-gateways] Failed to seed ${gateway.code}:`, err);
    }
  }

  return results;
}

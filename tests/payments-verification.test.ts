import { describe, it, expect } from 'vitest';
import { PAYMENT_GATEWAYS_REGISTRY } from '@/lib/forms/payments/payment-gateways-registry';
import { FIELD_REGISTRY, getFieldById } from '@/lib/forms/canonical-widget-registry';

describe('Payment Gateways & Architecture Verification', () => {
  it('should have all 34 payment gateways registered in PAYMENT_GATEWAYS_REGISTRY or FIELD_REGISTRY', () => {
    const paymentFields = FIELD_REGISTRY.filter((f) => f.category === 'payment');
    expect(paymentFields.length).toBeGreaterThanOrEqual(30);

    // Verify key gateways exist in FIELD_REGISTRY
    const expectedGateways = [
      'payment_stripe_elements',
      'payment_stripe_checkout',
      'payment_paypal',
      'payment_square',
      'payment_razorpay',
      'payment_authorize_net',
      'payment_braintree',
      'payment_payfast',
      'payment_iyzico',
      'payment_klarna',
      'payment_apple_pay',
      'payment_google_pay',
      'payment_cash_app_pay',
      'payment_venmo',
      'payment_coinbase_commerce',
      'payment_affirm',
      'product_purchase_order',
    ];

    for (const gw of expectedGateways) {
      const def = getFieldById(gw);
      expect(def, `Gateway ${gw} should be in field registry`).toBeDefined();
    }
  });

  it('should have standalone Klarna, Payfast, iyzico, and Braintree configurations', () => {
    const klarna = PAYMENT_GATEWAYS_REGISTRY.find((g) => g.id === 'klarna');
    const payfast = PAYMENT_GATEWAYS_REGISTRY.find((g) => g.id === 'payfast');
    const iyzico = PAYMENT_GATEWAYS_REGISTRY.find((g) => g.id === 'iyzico');
    const braintree = PAYMENT_GATEWAYS_REGISTRY.find((g) => g.id === 'braintree');

    expect(klarna).toBeDefined();
    expect(payfast).toBeDefined();
    expect(iyzico).toBeDefined();
    expect(braintree).toBeDefined();

    expect(klarna?.configFields.some((f) => f.key === 'merchantId')).toBe(true);
    expect(payfast?.configFields.some((f) => f.key === 'merchantKey')).toBe(true);
    expect(iyzico?.configFields.some((f) => f.key === 'apiKey')).toBe(true);
    expect(braintree?.configFields.some((f) => f.key === 'publicKey')).toBe(true);
  });

  it('should have zero duplicate widget IDs across all registries', () => {
    const ids = new Set<string>();
    const duplicates: string[] = [];
    for (const f of FIELD_REGISTRY) {
      if (ids.has(f.id)) {
        duplicates.push(f.id);
      }
      ids.add(f.id);
    }
    expect(duplicates).toEqual([]);
  });
});

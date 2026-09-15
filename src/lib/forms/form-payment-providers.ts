/**
 * Form Payment Provider Interface
 *
 * Defines the contract for payment adapters that can collect payments
 * on form submissions. Each provider (Stripe, PayPal, Razorpay, etc.)
 * implements this interface.
 *
 * Usage:
 *   import { getPaymentProvider } from '@/lib/forms/form-payment-providers';
 *   const provider = getPaymentProvider('stripe');
 *   const checkout = await provider.createCheckout({
 *     amount: 49.99,
 *     currency: 'USD',
 *     formId: 'form_123',
 *     formName: 'HVAC Service Request',
 *     customerEmail: 'john@example.com',
 *   });
 */

export interface FormCheckoutRequest {
  amount: number; // in major currency units (e.g. dollars, not cents)
  currency: string; // ISO 4217 (USD, EUR, INR, etc.)
  formId: string;
  formName: string;
  formResponseId?: string;
  customerEmail?: string;
  customerName?: string;
  metadata?: Record<string, unknown>;
  successUrl?: string;
  cancelUrl?: string;
}

export interface FormCheckoutResult {
  provider: string;
  checkoutUrl: string; // redirect URL for hosted checkout
  sessionId?: string; // provider's session ID
  paymentIntentId?: string; // provider's payment intent ID
}

export interface FormPaymentVerification {
  verified: boolean;
  amount: number;
  currency: string;
  transactionId: string;
  paidAt: string; // ISO timestamp
  metadata?: Record<string, unknown>;
}

export interface FormPaymentProvider {
  id: string;
  name: string;
  /**
   * Create a checkout session for a form payment.
   * Redirects the user to the provider's hosted checkout page.
   */
  createCheckout(req: FormCheckoutRequest): Promise<FormCheckoutResult>;
  /**
   * Verify that a payment was completed (called after redirect back
   * from the provider's checkout, or from the webhook handler).
   */
  verifyPayment(sessionIdOrToken: string): Promise<FormPaymentVerification>;
  /**
   * Refund a payment (full or partial).
   */
  refund(transactionId: string, amount?: number): Promise<{ success: boolean; refundId?: string; error?: string }>;
  /**
   * Handle the provider's webhook (payment completed, failed, refunded).
   * Returns 200 to acknowledge, or non-200 to retry.
   */
  handleWebhook(payload: unknown, headers: Record<string, string>): Promise<{ status: number; body: unknown }>;
}

// ── Provider registry ──

const PROVIDERS = new Map<string, FormPaymentProvider>();

export function registerPaymentProvider(provider: FormPaymentProvider) {
  PROVIDERS.set(provider.id, provider);
}

export function getPaymentProvider(id: string): FormPaymentProvider | undefined {
  return PROVIDERS.get(id);
}

export function listPaymentProviders(): string[] {
  return Array.from(PROVIDERS.keys());
}

// ── Stub provider (for development/testing) ──

registerPaymentProvider({
  id: 'stub',
  name: 'Test Provider (no real charge)',
  async createCheckout(req: FormCheckoutRequest): Promise<FormCheckoutResult> {
    const sessionId = `stub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return {
      provider: 'stub',
      checkoutUrl: `/api/forms/payment/stub/callback?session=${sessionId}&amount=${req.amount}&currency=${req.currency}`,
      sessionId,
    };
  },
  async verifyPayment(sessionId: string): Promise<FormPaymentVerification> {
    return {
      verified: true,
      amount: 0,
      currency: 'USD',
      transactionId: sessionId,
      paidAt: new Date().toISOString(),
    };
  },
  async refund(transactionId: string) {
    return { success: true, refundId: `refund_${transactionId}` };
  },
  async handleWebhook(payload: unknown) {
    return { status: 200, body: { received: true, payload } };
  },
});

// Note: real providers (Stripe, PayPal, Razorpay) should be registered
// in their respective route files or a central bootstrap file.
// Example:
//   import Stripe from 'stripe';
//   registerPaymentProvider({
//     id: 'stripe',
//     name: 'Stripe',
//     async createCheckout(req) { ... },
//     ...
//   });

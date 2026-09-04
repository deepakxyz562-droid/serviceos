/**
 * Provider-neutral payment error types.
 *
 * Every adapter throws these (or a subclass) so marketplace code can catch
 * payment errors without knowing which provider is active. The `provider`
 * field on each error lets the caller log which provider failed.
 */

export type PaymentProviderName = 'airwallex';

/**
 * Base error for all payment-provider failures. Marketplace code should
 * catch `PaymentError` (not provider-specific errors) so swapping providers
 * doesn't require touching try/catch blocks.
 */
export class PaymentError extends Error {
  /** Which provider threw this error. */
  readonly provider: PaymentProviderName;
  /** Provider's raw error code (e.g. Airwallex `INVALID_ARGUMENT`, Stripe `card_declined`). */
  readonly providerCode?: string;
  /** HTTP status from the provider (if applicable). */
  readonly httpStatus?: number;
  /** Whether the operation is retryable (transient network error vs. permanent rejection). */
  readonly retryable: boolean;

  constructor(args: {
    message: string;
    provider: PaymentProviderName;
    providerCode?: string;
    httpStatus?: number;
    retryable?: boolean;
    cause?: unknown;
  }) {
    super(args.message);
    this.name = 'PaymentError';
    this.provider = args.provider;
    this.providerCode = args.providerCode;
    this.httpStatus = args.httpStatus;
    this.retryable = args.retryable ?? false;
    if (args.cause !== undefined) {
      (this as { cause?: unknown }).cause = args.cause;
    }
  }
}

/** Thrown when the provider's API credentials are not configured. */
export class ProviderNotConfiguredError extends PaymentError {
  constructor(provider: PaymentProviderName) {
    super({
      message: `${provider} is not configured — missing API credentials. Set the required env vars.`,
      provider,
      retryable: false,
    });
    this.name = 'ProviderNotConfiguredError';
  }
}

/** Thrown when a tenant hasn't completed provider onboarding (no connected account). */
export class AccountNotConnectedError extends PaymentError {
  constructor(provider: PaymentProviderName, tenantId: string) {
    super({
      message: `Tenant ${tenantId} has not connected a ${provider} account. Complete "Set up payments" first.`,
      provider,
      retryable: false,
    });
    this.name = 'AccountNotConnectedError';
  }
}

/** Thrown when the connected account exists but isn't verified (payouts disabled). */
export class AccountNotVerifiedError extends PaymentError {
  constructor(provider: PaymentProviderName, accountId: string, pendingRequirements: string[]) {
    const reqs = pendingRequirements.length
      ? ` Pending: ${pendingRequirements.join('; ')}`
      : '';
    super({
      message: `${provider} account ${accountId} is not verified — payouts disabled.${reqs}`,
      provider,
      retryable: false,
    });
    this.name = 'AccountNotVerifiedError';
  }
}

/** Thrown when an amount/currency is invalid. */
export class InvalidPaymentInputError extends PaymentError {
  constructor(provider: PaymentProviderName, field: string, reason: string) {
    super({
      message: `Invalid ${field}: ${reason}`,
      provider,
      providerCode: 'INVALID_ARGUMENT',
      retryable: false,
    });
    this.name = 'InvalidPaymentInputError';
  }
}

/** Thrown when the provider's API returns an authentication error (expired token, bad key). */
export class ProviderAuthError extends PaymentError {
  constructor(provider: PaymentProviderName, message: string) {
    super({
      message: `${provider} authentication failed: ${message}`,
      provider,
      providerCode: 'AUTH_ERROR',
      retryable: false,
    });
    this.name = 'ProviderAuthError';
  }
}

/** Thrown when a webhook signature verification fails. */
export class WebhookSignatureError extends PaymentError {
  constructor(provider: PaymentProviderName, reason: string) {
    super({
      message: `${provider} webhook signature verification failed: ${reason}`,
      provider,
      providerCode: 'SIGNATURE_MISMATCH',
      retryable: false,
    });
    this.name = 'WebhookSignatureError';
  }
}

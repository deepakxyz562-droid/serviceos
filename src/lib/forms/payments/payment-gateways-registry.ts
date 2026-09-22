/**
 * Payment Gateways Registry — 33 Gateways & Alternative Payment Methods (APMs).
 *
 * Provides complete metadata, category classification, supported currencies,
 * brand logos (SVG vectors), JotForm-parity connection specifications, and
 * configuration schemas for all 33 gateways.
 */

export type PaymentCategory = 'all' | 'cards' | 'wallets' | 'bnpl' | 'bank' | 'regional' | 'offline';

export type PaymentTypeOption = 'sell_products' | 'sell_subscriptions' | 'user_defined_amount' | 'collect_donations';

export interface PaymentMethodItem {
  id: string;
  label: string;
  badge?: string;
  defaultChecked?: boolean;
}

export interface PaymentGatewayDef {
  id: string;
  fieldType: string; // e.g. control_stripe, control_square, control_payuMoney
  name: string;
  subtitle?: string; // e.g. "Powered by Square"
  category: 'cards' | 'wallets' | 'bnpl' | 'bank' | 'regional' | 'offline';
  description: string;
  badge?: string;
  currencies: string[];
  features: string[];
  brandColor: string;
  logoBg: string;
  supportsZeroConfig: boolean; // Platform-managed 0-config mode available
  iconSvg: string; // inline SVG markup or path
  supportedPaymentTypes: PaymentTypeOption[];
  supportedPaymentMethods?: PaymentMethodItem[];
  supportsAuthorizationOnly?: boolean;
  supportsCustomerRecord?: boolean;
  supportsReceiptEmail?: boolean;
  supportsBillingInfo?: boolean;
  supportsShippingInfo?: boolean;
  supportsDecimalSeparator?: boolean;
  supportsBusinessLocation?: boolean;
  supportsOrderFulfillment?: boolean;
  fieldMappings?: Array<{
    key: string;
    label: string;
    fieldTypeFilter?: 'email' | 'phone' | 'text' | 'any';
    helpText?: string;
  }>;
  configFields?: Array<{
    key: string;
    label: string;
    type: 'text' | 'password' | 'select' | 'boolean';
    placeholder?: string;
    options?: Array<{ label: string; value: string }>;
    description?: string;
  }>;
  /** Whether this gateway has a real backend that creates charges at the provider.
   *  When false, the gateway appears in the palette with a "Coming Soon" badge
   *  and the runtime shows a simulated payment (no real charge). */
  implemented?: boolean;
}

export const PAYMENT_CATEGORIES: { id: PaymentCategory; label: string; count: number }[] = [
  { id: 'all', label: 'All Gateways', count: 34 },
  { id: 'cards', label: 'Credit / Debit Cards', count: 12 },
  { id: 'wallets', label: 'Digital Wallets', count: 7 },
  { id: 'bnpl', label: 'Buy Now Pay Later', count: 2 },
  { id: 'bank', label: 'Direct Bank / ACH', count: 3 },
  { id: 'regional', label: 'Regional / Local', count: 9 },
  { id: 'offline', label: 'Offline / Invoicing', count: 1 },
];

export const ISO_CURRENCY_LABELS: Record<string, string> = {
  USD: 'USD - United States Dollars',
  EUR: 'EUR - Euros',
  GBP: 'GBP - British Pounds',
  CAD: 'CAD - Canadian Dollars',
  AUD: 'AUD - Australian Dollars',
  JPY: 'JPY - Japanese Yen',
  INR: 'INR - Indian Rupees',
  CHF: 'CHF - Swiss Francs',
  BRL: 'BRL - Brazilian Real',
  MXN: 'MXN - Mexican Peso',
  SGD: 'SGD - Singapore Dollars',
  HKD: 'HKD - Hong Kong Dollars',
  NZD: 'NZD - New Zealand Dollars',
  SEK: 'SEK - Swedish Krona',
  NOK: 'NOK - Norwegian Krone',
  DKK: 'DKK - Danish Krone',
  PLN: 'PLN - Polish Zloty',
  TRY: 'TRY - Turkish Lira',
  ZAR: 'ZAR - South African Rand',
  COP: 'COP - Colombian Peso',
  PEN: 'PEN - Peruvian Sol',
  ILS: 'ILS - Israeli Shekel',
  BTC: 'BTC - Bitcoin',
  ETH: 'ETH - Ethereum',
  USDC: 'USDC - USD Coin',
  KRW: 'KRW - South Korean Won',
};

export const PAYMENT_GATEWAYS_REGISTRY: PaymentGatewayDef[] = [
  // 1. Stripe Elements
  {
    id: 'stripe_elements',
    fieldType: 'control_stripe',
    name: 'Stripe',
    category: 'cards',
    description: 'Accept Visa, Mastercard, Amex, Apple Pay, Google Pay, Link & ACH.',
    badge: 'POPULAR',
    currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'JPY', 'SGD', 'CHF', 'BRL', 'MXN', 'SEK', 'NOK', 'DKK', 'PLN'],
    features: ['Credit/Debit Cards', 'Apple Pay', 'Google Pay', 'Link 1-Click', 'ACH Direct Debit', 'Klarna'],
    brandColor: '#635BFF',
    logoBg: '#635BFF',
    supportsZeroConfig: true,
    iconSvg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#635BFF"/><path d="M19.4 16.5c0-1.2 1-1.7 2.6-1.7 2.3 0 5.2.7 7.5 2V11.2c-2.5-1-5.1-1.4-7.5-1.4-6.2 0-10.4 3.2-10.4 8.7 0 8.5 11.7 7.1 11.7 10.8 0 1.4-1.2 1.9-3 1.9-2.6 0-6-.1-8.5-2.6v5.8c2.8 1.2 5.8 1.7 8.5 1.7 6.4 0 10.8-3.1 10.8-8.8 0-9.2-11.7-7.6-11.7-10.8z" fill="#FFF"/></svg>`,
    supportedPaymentTypes: ['sell_products', 'sell_subscriptions', 'user_defined_amount', 'collect_donations'],
    supportedPaymentMethods: [
      { id: 'card', label: 'Debit or Credit Card', defaultChecked: true },
      { id: 'link', label: 'Enable 1-Click Checkout with link', defaultChecked: true },
      { id: 'ach', label: 'ACH Bank Transfer', badge: 'New', defaultChecked: false },
      { id: 'klarna', label: 'Klarna', badge: 'New', defaultChecked: false },
    ],
    supportsAuthorizationOnly: true,
    supportsCustomerRecord: true,
    supportsReceiptEmail: true,
    supportsBillingInfo: true,
    supportsDecimalSeparator: true,
    fieldMappings: [
      { key: 'customerEmailField', label: 'Customer Email Field', fieldTypeFilter: 'email', helpText: 'Map customer email for automatic Stripe receipts & 3D Secure notices.' },
      { key: 'customDataField', label: 'Custom Metadata Field', fieldTypeFilter: 'any', helpText: 'Attach form data as Stripe metadata.' },
    ],
    configFields: [
      { key: 'publishableKey', label: 'Publishable Key', type: 'text', placeholder: 'pk_live_...' },
      { key: 'secretKey', label: 'Secret Key', type: 'password', placeholder: 'sk_live_...' },
      { key: 'webhookSecret', label: 'Webhook Signing Secret', type: 'password', placeholder: 'whsec_...' },
    ],
    implemented: true,
  },
  // 2. Stripe Checkout (Hosted)
  {
    id: 'stripe_checkout',
    fieldType: 'control_stripeCheckout',
    name: 'Stripe Checkout',
    category: 'cards',
    description: 'Hosted Stripe payment page with dynamic tax, billing address & shipping.',
    badge: 'HOSTED',
    currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'JPY', 'SGD', 'BRL', 'MXN'],
    features: ['Hosted Checkout', '30+ Payment Methods', 'Auto Tax Calculation', 'Mobile Optimized'],
    brandColor: '#635BFF',
    logoBg: '#635BFF',
    supportsZeroConfig: true,
    iconSvg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#635BFF"/><path d="M12 20l6 6 12-12" stroke="#FFF" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    supportedPaymentTypes: ['sell_products', 'sell_subscriptions', 'user_defined_amount', 'collect_donations'],
    supportsAuthorizationOnly: false,
    supportsCustomerRecord: true,
    supportsReceiptEmail: true,
    supportsBillingInfo: true,
    fieldMappings: [
      { key: 'customerEmailField', label: 'Customer Email Field', fieldTypeFilter: 'email' },
      { key: 'customDataField', label: 'Custom Data Field', fieldTypeFilter: 'any' },
    ],
    configFields: [
      { key: 'publishableKey', label: 'Publishable Key', type: 'text', placeholder: 'pk_live_...' },
      { key: 'secretKey', label: 'Secret Key', type: 'password', placeholder: 'sk_live_...' },
    ],
    implemented: true,
  },
  // 3. Square
  {
    id: 'square_payments',
    fieldType: 'control_square',
    name: 'Square',
    category: 'cards',
    description: 'Accept credit cards, Cash App Pay, Afterpay, and Apple/Google Pay with Square.',
    badge: 'POPULAR',
    currencies: ['USD', 'CAD', 'GBP', 'AUD', 'EUR', 'JPY'],
    features: ['Credit Cards', 'Cash App Pay', 'Afterpay', 'Gift Cards', 'Square POS Sync'],
    brandColor: '#006AFF',
    logoBg: '#006AFF',
    supportsZeroConfig: true,
    iconSvg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#000"/><path fill="#fff" d="M26.658 10H13.342A3.342 3.342 0 0 0 10 13.342v13.316A3.342 3.342 0 0 0 13.342 30h13.316A3.342 3.342 0 0 0 30 26.658V13.342A3.342 3.342 0 0 0 26.658 10Zm-.294 15.309c0 .583-.472 1.055-1.055 1.055H14.69a1.056 1.056 0 0 1-1.055-1.055V14.69c0-.583.472-1.055 1.055-1.055h10.62c.583 0 1.055.472 1.055 1.055v10.62Zm-8.486-2.594a.605.605 0 0 1-.605-.608V17.87c0-.335.27-.607.605-.607h4.248c.335 0 .605.272.605.607v4.247a.605.605 0 0 1-.605.608h-4.248Z"/></svg>`,
    supportedPaymentTypes: ['sell_products', 'sell_subscriptions', 'user_defined_amount', 'collect_donations'],
    supportedPaymentMethods: [
      { id: 'card', label: 'Credit Card', defaultChecked: true },
      { id: 'googlepay', label: 'Google Pay', defaultChecked: true },
      { id: 'applepay', label: 'Apple Pay', defaultChecked: true },
      { id: 'cashapp', label: 'Cash App Pay', defaultChecked: true },
      { id: 'ach', label: 'ACH Bank Transfer', defaultChecked: false },
      { id: 'afterpay', label: 'Afterpay / Clearpay', defaultChecked: true },
    ],
    supportsAuthorizationOnly: true,
    supportsReceiptEmail: true,
    supportsBusinessLocation: true,
    supportsOrderFulfillment: true,
    fieldMappings: [
      { key: 'customerEmailField', label: 'Customer Email', fieldTypeFilter: 'email', helpText: 'Send Square payment receipt link to this customer email.' },
    ],
    configFields: [
      { key: 'applicationId', label: 'Square Application ID', type: 'text', placeholder: 'sq0idp-...' },
      { key: 'accessToken', label: 'Square Access Token', type: 'password', placeholder: 'EAAA...' },
      { key: 'locationId', label: 'Location ID', type: 'text', placeholder: 'L...' },
    ],
  },
  // 4. Cash App Pay (Powered by Square)
  {
    id: 'cash_app_pay',
    fieldType: 'control_square_cashapp',
    name: 'Cash App Pay',
    subtitle: 'Powered by Square',
    category: 'wallets',
    description: 'Instant mobile payments via Cash App QR scan or mobile redirect.',
    badge: 'POPULAR',
    currencies: ['USD', 'GBP'],
    features: ['1-Tap Cash App', 'QR Code Scan on Desktop', 'Zero card numbers needed', 'Instant settlement'],
    brandColor: '#00D632',
    logoBg: '#00D632',
    supportsZeroConfig: true,
    iconSvg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#00D632"/><path d="M22.5 12h-5v2.2c-2.4.5-4 2.2-4 4.5 0 2.8 2.2 4.1 4.5 4.8l1.5.5c1.4.5 2 1.1 2 2 0 1.1-1.1 1.8-2.5 1.8-1.7 0-3-.7-3.8-1.8l-2.4 2c1.3 1.8 3.3 2.7 5.7 2.9V32h3v-2.2c2.6-.5 4.3-2.3 4.3-4.7 0-2.8-2-4.1-4.6-5l-1.5-.5c-1.3-.4-1.8-1-1.8-1.8 0-.9.9-1.6 2.2-1.6 1.4 0 2.5.5 3.2 1.4l2.4-1.8c-1.1-1.4-2.7-2.3-4.8-2.6V12z" fill="#FFF"/></svg>`,
    supportedPaymentTypes: ['sell_products', 'user_defined_amount', 'collect_donations'],
    supportsAuthorizationOnly: true,
    supportsReceiptEmail: true,
    supportsBusinessLocation: true,
    supportsOrderFulfillment: true,
    fieldMappings: [
      { key: 'customerEmailField', label: 'Customer Email', fieldTypeFilter: 'email' },
    ],
    configFields: [
      { key: 'applicationId', label: 'Square Application ID', type: 'text', placeholder: 'sq0idp-...' },
      { key: 'accessToken', label: 'Square Access Token', type: 'password', placeholder: 'EAAA...' },
      { key: 'locationId', label: 'Location ID', type: 'text', placeholder: 'L...' },
    ],
  },
  // 5. PayPal & Venmo
  {
    id: 'paypal_complete',
    fieldType: 'control_paypalcomplete',
    name: 'PayPal',
    category: 'wallets',
    description: 'Accept PayPal, Venmo, Pay in 4, and major credit cards with PayPal Smart Buttons.',
    badge: 'POPULAR',
    currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'BRL', 'MXN', 'JPY', 'CHF'],
    features: ['PayPal Wallet', 'Venmo (US)', 'Pay in 4 BNPL', 'Credit/Debit Card Fields'],
    brandColor: '#003087',
    logoBg: '#003087',
    supportsZeroConfig: true,
    iconSvg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#003087"/><path fill="#0079C1" d="M26.2 14.5c-.3 2.3-2.1 7.2-7.5 7.2h-3.4l-1.5 9.5h-3.6l3.3-21h7.8c3.4 0 5.2 1.8 4.9 4.3z"/><path fill="#00457C" d="M21.5 21.7c-.3 2.3-2.1 7.2-7.5 7.2h-3.4l-1.5 9.5h-3.6l3.3-21h7.8c3.4 0 5.2 1.8 4.9 4.3z" opacity=".4"/></svg>`,
    supportedPaymentTypes: ['sell_products', 'sell_subscriptions', 'user_defined_amount', 'collect_donations'],
    supportedPaymentMethods: [
      { id: 'paypal', label: 'PayPal', defaultChecked: true },
      { id: 'paypal_credit', label: 'PayPal Credit / Pay in 4', defaultChecked: true },
      { id: 'venmo', label: 'Venmo', defaultChecked: true },
      { id: 'cards', label: 'Credit or Debit Card Fields', defaultChecked: true },
    ],
    supportsAuthorizationOnly: true,
    supportsBillingInfo: true,
    fieldMappings: [
      { key: 'customerEmailField', label: 'Customer Email Field', fieldTypeFilter: 'email' },
    ],
    configFields: [
      { key: 'clientId', label: 'PayPal Client ID', type: 'text', placeholder: 'Client ID from PayPal Developer' },
      { key: 'clientSecret', label: 'PayPal Client Secret', type: 'password', placeholder: 'Client Secret' },
    ],
  },
  // 6. Authorize.Net
  {
    id: 'authorize_net',
    fieldType: 'control_authnet',
    name: 'Authorize.Net',
    category: 'cards',
    description: 'Enterprise payment processing for US & Canadian credit cards and eCheck ACH.',
    currencies: ['USD', 'CAD', 'GBP', 'EUR'],
    features: ['Credit Cards', 'eCheck ACH', 'Customer Information Manager (CIM)', 'Fraud Detection'],
    brandColor: '#002D62',
    logoBg: '#002D62',
    supportsZeroConfig: false,
    iconSvg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#E67E22"/><path d="M12 28L20 12L28 28H23L20 22L17 28H12Z" fill="#FFF"/></svg>`,
    supportedPaymentTypes: ['sell_products', 'sell_subscriptions', 'user_defined_amount', 'collect_donations'],
    supportsBillingInfo: true,
    supportsShippingInfo: true,
    configFields: [
      { key: 'apiLoginId', label: 'API Login ID', type: 'text' },
      { key: 'transactionKey', label: 'Transaction Key', type: 'password' },
      { key: 'clientKey', label: 'Public Client Key', type: 'text' },
    ],
  },
  // 7. Braintree
  {
    id: 'braintree',
    fieldType: 'control_braintree',
    name: 'Braintree',
    category: 'cards',
    description: 'PayPal-backed global payment gateway for cards, PayPal, Venmo & digital wallets.',
    currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'SGD', 'HKD'],
    features: ['Hosted Fields', 'PayPal & Venmo', 'Vaulting & Recurring', '3D Secure 2.0'],
    brandColor: '#000000',
    logoBg: '#000000',
    supportsZeroConfig: false,
    iconSvg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#001F3F"/><path d="M14 12h7a5 5 0 0 1 4 8 5 5 0 0 1-4 8h-7V12zm4 4v4h3a2 2 0 0 0 0-4h-3zm0 6v4h3a2 2 0 0 0 0-4h-3z" fill="#FFF"/></svg>`,
    supportedPaymentTypes: ['sell_products', 'sell_subscriptions', 'user_defined_amount', 'collect_donations'],
    supportsBillingInfo: true,
    configFields: [
      { key: 'merchantId', label: 'Merchant ID', type: 'text' },
      { key: 'publicKey', label: 'Public Key', type: 'text' },
      { key: 'privateKey', label: 'Private Key', type: 'password' },
    ],
  },
  // 8. Razorpay
  {
    id: 'razorpay',
    fieldType: 'control_razorpay',
    name: 'Razorpay',
    category: 'regional',
    description: 'All-in-one payment gateway for India with UPI, cards, netbanking, and wallets.',
    badge: 'POPULAR',
    currencies: ['INR', 'USD', 'EUR', 'GBP', 'SGD', 'AED'],
    features: ['UPI QR & Intent', 'RuPay, Visa, Mastercard', '50+ NetBanking banks', 'Razorpay Subscriptions'],
    brandColor: '#0C2340',
    logoBg: '#0C2340',
    supportsZeroConfig: true,
    iconSvg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#0C2340"/><path d="M12 28l8-16 8 16h-5l-3-6-3 6h-5z" fill="#3395FF"/></svg>`,
    supportedPaymentTypes: ['sell_products', 'sell_subscriptions', 'user_defined_amount', 'collect_donations'],
    fieldMappings: [
      { key: 'customerEmailField', label: 'Customer Email Field', fieldTypeFilter: 'email' },
      { key: 'customerPhoneField', label: 'Customer Phone Field', fieldTypeFilter: 'phone' },
    ],
    configFields: [
      { key: 'keyId', label: 'Key ID', type: 'text', placeholder: 'rzp_live_...' },
      { key: 'keySecret', label: 'Key Secret', type: 'password', placeholder: '...' },
    ],
  },
  // 9. Afterpay
  {
    id: 'afterpay',
    fieldType: 'control_square_afterpay',
    name: 'Afterpay',
    subtitle: 'Powered by Square',
    category: 'bnpl',
    description: 'Split payments into 4 interest-free installments paid every 2 weeks.',
    badge: 'BNPL',
    currencies: ['USD', 'CAD', 'AUD', 'NZD', 'GBP'],
    features: ['4 Interest-Free Payments', 'Boosts Average Order Value', 'Immediate Merchant Payout'],
    brandColor: '#B2FCE4',
    logoBg: '#111827',
    supportsZeroConfig: true,
    iconSvg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#111827"/><path d="M12 24l4-8h4l-4 8h-4zm8 0l4-8h4l-4 8h-4z" fill="#B2FCE4"/></svg>`,
    supportedPaymentTypes: ['sell_products', 'user_defined_amount'],
    supportsBusinessLocation: true,
    configFields: [
      { key: 'applicationId', label: 'Square Application ID', type: 'text' },
      { key: 'accessToken', label: 'Square Access Token', type: 'password' },
    ],
  },
  // 10. Clearpay (UK / EU)
  {
    id: 'clearpay',
    fieldType: 'control_square_clearpay',
    name: 'Clearpay',
    subtitle: 'Powered by Square',
    category: 'bnpl',
    description: 'UK and European BNPL solution by Afterpay for 4 flexible installments.',
    badge: 'BNPL',
    currencies: ['GBP', 'EUR'],
    features: ['4 Installments (UK & EU)', 'High conversion rates', 'Full merchant fraud protection'],
    brandColor: '#B2FCE4',
    logoBg: '#111827',
    supportsZeroConfig: true,
    iconSvg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#000"/><path d="M13 23l3.5-6h3.5l-3.5 6H13zm7 0l3.5-6h3.5l-3.5 6H20z" fill="#B2FCE4"/></svg>`,
    supportedPaymentTypes: ['sell_products', 'user_defined_amount'],
    supportsBusinessLocation: true,
  },
  // 11. Apple Pay & Google Pay
  {
    id: 'apple_google_pay',
    fieldType: 'control_apple_google_pay',
    name: 'Apple Pay & Google Pay',
    category: 'wallets',
    description: 'Native 1-click biometric payment button for iOS Safari and Android Chrome.',
    badge: '1-CLICK',
    currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'JPY'],
    features: ['FaceID / TouchID biometric', 'Google Wallet 1-Tap', 'Auto-fills shipping & billing', '0 Friction'],
    brandColor: '#000000',
    logoBg: '#000000',
    supportsZeroConfig: true,
    iconSvg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#000"/><path d="M15.5 15a3.5 3.5 0 0 1 2.8-1.5c1.2 0 2.2.8 2.9.8s1.6-.8 2.8-.8c1.5 0 2.7.8 3.4 2-3 1.6-2.5 5.5.5 6.7-.6 1.8-1.5 3.6-3 3.6-.7 0-1.2-.4-2-.4s-1.4.4-2.1.4c-1.5 0-2.5-1.7-3.2-3.6-1.3-3.2-.2-6.5.7-7.2zm3.3-3.2c.6-.8 1-1.8.9-2.8-.9.1-2 .6-2.6 1.4-.5.7-.9 1.7-.8 2.7 1 0 2-.5 2.5-1.3z" fill="#FFF"/></svg>`,
    supportedPaymentTypes: ['sell_products', 'sell_subscriptions', 'user_defined_amount', 'collect_donations'],
  },
  // 12. Mollie (Europe)
  {
    id: 'mollie',
    fieldType: 'control_mollie',
    name: 'Mollie',
    category: 'regional',
    description: 'Leading European payment gateway with iDEAL, Bancontact, SOFORT, EPS & Cartes Bancaires.',
    badge: 'EU POPULAR',
    currencies: ['EUR', 'GBP', 'CHF', 'PLN', 'SEK', 'NOK', 'DKK'],
    features: ['iDEAL (Netherlands)', 'Bancontact (Belgium)', 'SOFORT / Giropay', 'EPS (Austria)', 'Cartes Bancaires (France)'],
    brandColor: '#2B3137',
    logoBg: '#2B3137',
    supportsZeroConfig: true,
    iconSvg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#2B3137"/><path d="M11 26V14h3.6l3.4 7.5L21.4 14H25v12h-3.2v-7.2L18.7 25h-1.4L14.2 18.8V26H11zm16.5 0V14h3.3v12h-3.3z" fill="#FFF"/></svg>`,
    supportedPaymentTypes: ['sell_products', 'sell_subscriptions', 'user_defined_amount', 'collect_donations'],
    supportedPaymentMethods: [
      { id: 'ideal', label: 'iDEAL (Netherlands)', defaultChecked: true },
      { id: 'bancontact', label: 'Bancontact (Belgium)', defaultChecked: true },
      { id: 'sofort', label: 'SOFORT Banking', defaultChecked: false },
      { id: 'cards', label: 'Credit Cards', defaultChecked: true },
    ],
    configFields: [
      { key: 'apiKey', label: 'Mollie API Key', type: 'password', placeholder: 'live_...' },
      { key: 'profileId', label: 'Profile ID', type: 'text', placeholder: 'pfl_...' },
    ],
  },
  // 13. CyberSource
  {
    id: 'cybersource',
    fieldType: 'control_cybersource',
    name: 'CyberSource',
    category: 'cards',
    description: 'Visa solution for enterprise card acceptance, tokenization & Decision Manager fraud management.',
    currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'],
    features: ['Visa CyberSource Tokenization', 'Decision Manager Fraud Guard', 'Global Currency Support'],
    brandColor: '#003366',
    logoBg: '#003366',
    supportsZeroConfig: false,
    iconSvg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#003366"/><circle cx="20" cy="20" r="9" stroke="#FFF" stroke-width="2.5"/><path d="M20 15v10M15 20h10" stroke="#FFF" stroke-width="2.5"/></svg>`,
    supportedPaymentTypes: ['sell_products', 'sell_subscriptions', 'user_defined_amount'],
    configFields: [
      { key: 'merchantId', label: 'CyberSource Merchant ID', type: 'text' },
      { key: 'apiKeyId', label: 'Key ID', type: 'text' },
      { key: 'sharedSecret', label: 'Shared Secret Key', type: 'password' },
    ],
  },
  // 14. eCheck.Net
  {
    id: 'echeck_net',
    fieldType: 'control_echeck',
    name: 'eCheck.Net',
    category: 'bank',
    description: 'Accept electronic check (ACH) payments directly from US bank accounts with lowest processing fees.',
    currencies: ['USD'],
    features: ['Direct ACH Bank Routing', 'Zero Interchange fees', 'Verified US Routing Number validation'],
    brandColor: '#2C3E50',
    logoBg: '#2C3E50',
    supportsZeroConfig: false,
    iconSvg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#2C3E50"/><path d="M12 16h16v10H12z" stroke="#FFF" stroke-width="2"/><path d="M15 22h10M15 19h5" stroke="#FFF" stroke-width="1.5"/></svg>`,
    supportedPaymentTypes: ['sell_products', 'sell_subscriptions', 'user_defined_amount', 'collect_donations'],
  },
  // 15. BluePay
  {
    id: 'bluepay',
    fieldType: 'control_bluepay',
    name: 'BluePay',
    category: 'cards',
    description: 'US & Canadian payment gateway for credit cards, debit cards and ACH verification.',
    currencies: ['USD', 'CAD'],
    features: ['Credit Cards', 'ACH / EFT', 'Recurring Auto-Bill'],
    brandColor: '#00539B',
    logoBg: '#00539B',
    supportsZeroConfig: false,
    iconSvg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#00539B"/><path d="M14 13h7c3 0 5 1.5 5 4s-2 4-5 4h-7V13zm3 3v5h4c1.5 0 2.5-.8 2.5-2.5S22.5 16 21 16h-4zm-3 8h7c3.5 0 5.5 1.5 5.5 4.5s-2 4.5-5.5 4.5h-7V24zm3 3v6h4c1.8 0 2.8-.8 2.8-3s-1-3-2.8-3h-4z" fill="#FFF"/></svg>`,
    supportedPaymentTypes: ['sell_products', 'sell_subscriptions', 'user_defined_amount'],
  },
  // 16. Eway
  {
    id: 'eway',
    fieldType: 'control_eway',
    name: 'Eway',
    category: 'regional',
    description: 'Top payment gateway provider in Australia & New Zealand with Beagle Fraud protection.',
    currencies: ['AUD', 'NZD', 'SGD', 'HKD', 'GBP'],
    features: ['Australia & New Zealand Cards', 'Beagle Anti-Fraud', 'Token Payments'],
    brandColor: '#FF6B00',
    logoBg: '#FF6B00',
    supportsZeroConfig: false,
    iconSvg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#FF6B00"/><path d="M12 15h16v3H15v3h11v3H15v4h13v3H12V15z" fill="#FFF"/></svg>`,
    supportedPaymentTypes: ['sell_products', 'sell_subscriptions', 'user_defined_amount'],
  },
  // 17. PayU (Global)
  {
    id: 'payu_global',
    fieldType: 'control_payu',
    name: 'PayU',
    category: 'regional',
    description: 'Global payment gateway for high-growth emerging markets in LatAm, EMEA & Asia.',
    currencies: ['USD', 'EUR', 'BRL', 'MXN', 'COP', 'PEN', 'PLN', 'ZAR'],
    features: ['Local Credit & Debit Cards', 'Cash Voucher Payments (Boleto, OXXO)', 'Bank Transfers'],
    brandColor: '#A6C307',
    logoBg: '#1A1A1A',
    supportsZeroConfig: false,
    iconSvg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#1A1A1A"/><path d="M13 14h4v7c0 2 1 3 3 3s3-1 3-3v-7h4v7c0 4-2.5 6-7 6s-7-2-7-6v-7z" fill="#A6C307"/></svg>`,
    supportedPaymentTypes: ['sell_products', 'sell_subscriptions', 'user_defined_amount'],
  },
  // 18. PayU India (UPI / QR)
  {
    id: 'payu_india',
    fieldType: 'control_payuMoney',
    name: 'PayU India',
    category: 'regional',
    description: 'UPI (Google Pay, PhonePe, Paytm), RuPay cards, NetBanking & EMI for India.',
    badge: 'INDIA #1',
    currencies: ['INR'],
    features: ['Instant UPI QR Code', 'Google Pay, PhonePe, Paytm', '50+ Indian NetBanking banks', 'RuPay & EMI'],
    brandColor: '#A6C307',
    logoBg: '#0A2540',
    supportsZeroConfig: true,
    iconSvg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#0A2540"/><path d="M14 13h4v7c0 2 1 3 3 3s3-1 3-3v-7h4v7c0 4-2.5 6-7 6s-7-2-7-6v-7z" fill="#A6C307"/><circle cx="28" cy="15" r="2.5" fill="#A6C307"/></svg>`,
    supportedPaymentTypes: ['sell_products', 'sell_subscriptions', 'user_defined_amount', 'collect_donations'],
    configFields: [
      { key: 'merchantKey', label: 'PayU Merchant Key', type: 'text' },
      { key: 'merchantSalt', label: 'PayU Merchant Salt', type: 'password' },
    ],
  },
  // 19. Worldpay UK
  {
    id: 'worldpay_uk',
    fieldType: 'control_worldpay',
    name: 'Worldpay UK',
    category: 'cards',
    description: 'Global leader in smart omnichannel card processing for UK & European businesses.',
    currencies: ['GBP', 'EUR', 'USD'],
    features: ['UK & European Cards', '3D Secure 2.2', 'Multi-currency settlement'],
    brandColor: '#DA291C',
    logoBg: '#DA291C',
    supportsZeroConfig: false,
    iconSvg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#DA291C"/><circle cx="16" cy="20" r="5" stroke="#FFF" stroke-width="2"/><circle cx="24" cy="20" r="5" stroke="#FFF" stroke-width="2"/></svg>`,
    supportedPaymentTypes: ['sell_products', 'sell_subscriptions', 'user_defined_amount'],
  },
  // 20. BlueSnap
  {
    id: 'bluesnap',
    fieldType: 'control_bluesnap',
    name: 'BlueSnap',
    category: 'cards',
    description: 'All-in-one payment orchestration platform supporting 100+ currencies and local acquirers.',
    currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'ILS', 'SGD'],
    features: ['Smart Routing', 'Built-in Chargeback Protection', 'Multi-currency processing'],
    brandColor: '#1E3A8A',
    logoBg: '#1E3A8A',
    supportsZeroConfig: false,
    iconSvg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#1E3A8A"/><path d="M12 28l8-16 8 16h-5l-3-6-3 6h-5z" fill="#38BDF8"/></svg>`,
    supportedPaymentTypes: ['sell_products', 'sell_subscriptions', 'user_defined_amount'],
  },
  // 21. Moneris
  {
    id: 'moneris',
    fieldType: 'control_moneris',
    name: 'Moneris',
    category: 'regional',
    description: "Canada's largest financial payment processor with Interac Online and Canadian card support.",
    badge: 'CANADA',
    currencies: ['CAD', 'USD'],
    features: ['Interac Online', 'Visa & Mastercard Canada', 'Moneris Vault Tokenization'],
    brandColor: '#005A9C',
    logoBg: '#005A9C',
    supportsZeroConfig: false,
    iconSvg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#005A9C"/><path d="M13 27V13h3.5l3.5 8 3.5-8H27v14h-3v-8.5l-3.5 7.5h-1L16 18.5V27h-3z" fill="#FFF"/></svg>`,
    supportedPaymentTypes: ['sell_products', 'sell_subscriptions', 'user_defined_amount'],
  },
  // 22. GoCardless
  {
    id: 'gocardless',
    fieldType: 'control_gocardless',
    name: 'GoCardless',
    category: 'bank',
    description: 'Direct Debit specialist for recurring subscriptions and invoices via BACS, SEPA, ACH & PAD.',
    badge: 'DIRECT DEBIT',
    currencies: ['GBP', 'EUR', 'USD', 'CAD', 'AUD', 'NZD'],
    features: ['UK BACS Direct Debit', 'Euro SEPA Core', 'US ACH Debit', 'Lowest transaction fee (1%)'],
    brandColor: '#00DC82',
    logoBg: '#0E1E25',
    supportsZeroConfig: true,
    iconSvg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#0E1E25"/><circle cx="20" cy="20" r="8" stroke="#00DC82" stroke-width="2.5"/><path d="M20 15v10" stroke="#00DC82" stroke-width="2.5"/></svg>`,
    supportedPaymentTypes: ['sell_products', 'sell_subscriptions', 'user_defined_amount'],
  },
  // 23. Payfast
  {
    id: 'payfast',
    fieldType: 'control_payfast',
    name: 'Payfast',
    category: 'regional',
    description: "South Africa's leading payment gateway with Instant EFT, credit cards, Masterpass and Mobicred.",
    badge: 'SOUTH AFRICA',
    currencies: ['ZAR'],
    features: ['Instant EFT (South Africa)', 'Visa, Mastercard & Amex', 'Masterpass QR', 'Mobicred BNPL'],
    brandColor: '#E60000',
    logoBg: '#1A1A1A',
    supportsZeroConfig: false,
    iconSvg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#E60000"/><path d="M14 13h12v3.5H18v3.5h7v3.5h-7v6.5H14V13z" fill="#FFF"/></svg>`,
    supportedPaymentTypes: ['sell_products', 'sell_subscriptions', 'user_defined_amount'],
  },
  // 24. Venmo
  {
    id: 'venmo',
    fieldType: 'control_paypal_venmo',
    name: 'Venmo',
    category: 'wallets',
    description: 'Allow US customers to pay quickly using their Venmo social payment balance or bank account.',
    badge: 'POPULAR',
    currencies: ['USD'],
    features: ['1-Tap Venmo App Switch', 'Social payment splitting', 'US Mobile standard'],
    brandColor: '#008CFF',
    logoBg: '#008CFF',
    supportsZeroConfig: true,
    iconSvg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#008CFF"/><path d="M25 12l-5 16h-4.5L13 15h4l1.5 9.5 3-12.5H25z" fill="#FFF"/></svg>`,
    supportedPaymentTypes: ['sell_products', 'user_defined_amount', 'collect_donations'],
  },
  // 25. SensePass
  {
    id: 'sensepass',
    fieldType: 'control_sensepass',
    name: 'SensePass',
    category: 'wallets',
    description: 'Omnichannel digital wallet network allowing customer payments via any mobile wallet or crypto.',
    currencies: ['USD', 'EUR', 'GBP', 'CAD', 'BTC', 'ETH', 'USDC'],
    features: ['Universal QR Payment Hub', 'Crypto (BTC, ETH, USDC)', 'Supports 50+ Wallets'],
    brandColor: '#4A154B',
    logoBg: '#4A154B',
    supportsZeroConfig: false,
    iconSvg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#4A154B"/><rect x="13" y="13" width="14" height="14" rx="3" stroke="#FFF" stroke-width="2"/><circle cx="20" cy="20" r="3" fill="#FFF"/></svg>`,
    supportedPaymentTypes: ['sell_products', 'user_defined_amount'],
  },
  // 26. Purchase Order (Offline)
  {
    id: 'purchase_order',
    fieldType: 'control_purchase_order',
    name: 'Purchase Order',
    category: 'offline',
    description: 'Collect PO numbers and generate Net-30 or Net-60 offline invoices with zero processing fee.',
    badge: 'B2B INVOICE',
    currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'JPY'],
    features: ['PO Number Validation', 'Net 30/60 Invoicing', 'Zero Transaction Fees', 'Direct CRM Invoice Sync'],
    brandColor: '#475569',
    logoBg: '#475569',
    supportsZeroConfig: true,
    iconSvg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#475569"/><path d="M14 11h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2V13a2 2 0 0 1 2-2zm2 4v2h8v-2h-8zm0 4v2h8v-2h-8zm0 4v2h5v-2h-5z" fill="#FFF"/></svg>`,
    supportedPaymentTypes: ['sell_products', 'user_defined_amount'],
    configFields: [
      { key: 'requirePoNumber', label: 'Require PO Number', type: 'toggle_with_description', description: 'Require a PO number field in the billing form before submission.' },
      { key: 'paymentTerms', label: 'Payment Terms', type: 'select', options: [
        { label: 'Due on Receipt', value: 'due_on_receipt' },
        { label: 'Net 15 Days', value: 'net_15' },
        { label: 'Net 30 Days', value: 'net_30' },
        { label: 'Net 60 Days', value: 'net_60' },
      ]},
    ],
  },
  // 27. CardPointe / CardConnect
  {
    id: 'cardpointe',
    fieldType: 'control_cardconnect',
    name: 'CardPointe',
    category: 'cards',
    description: 'Fiserv CardConnect PCI-certified payment gateway with Point-to-Point Encryption (P2PE).',
    currencies: ['USD', 'CAD'],
    features: ['Fiserv P2PE Encryption', 'CardSecure Tokenization', 'Interchange Optimization'],
    brandColor: '#0070BA',
    logoBg: '#0070BA',
    supportsZeroConfig: false,
    iconSvg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#0070BA"/><rect x="12" y="14" width="16" height="12" rx="2" stroke="#FFF" stroke-width="2"/><line x1="12" y1="18" x2="28" y2="18" stroke="#FFF" stroke-width="2"/></svg>`,
    supportedPaymentTypes: ['sell_products', 'sell_subscriptions', 'user_defined_amount'],
  },
  // 28. 2Checkout / Verifone
  {
    id: 'two_checkout',
    fieldType: 'control_2co',
    name: '2Checkout',
    category: 'cards',
    description: 'Verifone global payment platform supporting 200+ countries, local cards and tax compliance.',
    currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'BRL', 'INR'],
    features: ['200+ Global Markets', 'Merchant of Record (MoR) Tax handling', 'Localized Checkouts'],
    brandColor: '#FF6F00',
    logoBg: '#FF6F00',
    supportsZeroConfig: false,
    iconSvg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#FF6F00"/><path d="M13 15h14l-8 10h8v3H13l8-10h-8v-3z" fill="#FFF"/></svg>`,
    supportedPaymentTypes: ['sell_products', 'sell_subscriptions', 'user_defined_amount'],
  },
  // 29. Paysafe
  {
    id: 'paysafe',
    fieldType: 'control_paysafe',
    name: 'Paysafe',
    category: 'wallets',
    description: 'Global specialized payments provider with digital wallets, cash online and credit cards.',
    currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
    features: ['PaysafeCard Cash Online', 'Digital Wallet Integration', 'Global Payment API'],
    brandColor: '#E60000',
    logoBg: '#111827',
    supportsZeroConfig: false,
    iconSvg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#111827"/><path d="M14 13h7a5 5 0 0 1 0 10h-4v4h-3V13zm3 3v4h4a2 2 0 0 0 0-4h-4z" fill="#E60000"/></svg>`,
    supportedPaymentTypes: ['sell_products', 'user_defined_amount'],
  },
  // 30. iyzico (Turkey)
  {
    id: 'iyzico',
    fieldType: 'control_iyzico',
    name: 'iyzico',
    category: 'regional',
    description: "Turkey's leading fintech payment platform supporting Turkish Lira, BKM Express and installment cards.",
    badge: 'TURKEY #1',
    currencies: ['TRY', 'USD', 'EUR', 'GBP'],
    features: ['Pay with iyzico (1-Click)', 'Turkish Bank Installments (Taksit)', 'Protected Shopping Guarantee'],
    brandColor: '#1E64FF',
    logoBg: '#1E64FF',
    supportsZeroConfig: true,
    iconSvg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#1E64FF"/><circle cx="16" cy="14" r="2" fill="#FFF"/><path d="M14 18h4v9h-4zM22 18h4v9h-4z" fill="#FFF"/><circle cx="24" cy="14" r="2" fill="#FFF"/></svg>`,
    supportedPaymentTypes: ['sell_products', 'sell_subscriptions', 'user_defined_amount'],
  },
  // 31. Skrill
  {
    id: 'skrill',
    fieldType: 'control_skrill',
    name: 'Skrill',
    category: 'wallets',
    description: 'International digital wallet allowing fast cross-border money transfers and 40+ currencies.',
    currencies: ['USD', 'EUR', 'GBP', 'PLN', 'AUD', 'CAD'],
    features: ['Skrill 1-Tap', 'Multi-currency E-Wallet', 'Global VIP Transfer'],
    brandColor: '#811847',
    logoBg: '#811847',
    supportsZeroConfig: false,
    iconSvg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#811847"/><path d="M14 24.5c.8.6 1.8 1 2.8 1 1.5 0 2.2-.6 2.2-1.4 0-2.3-5-1.5-5-5.2 0-2.2 1.8-3.9 4.8-3.9 1.3 0 2.4.3 3.2.8l-.8 2.3c-.7-.4-1.5-.7-2.4-.7-1.3 0-1.9.5-1.9 1.2 0 2.2 5 1.4 5 5.1 0 2.2-1.7 4.1-5.1 4.1-1.5 0-2.9-.4-3.8-1l1-2.3z" fill="#FFF"/></svg>`,
    supportedPaymentTypes: ['sell_products', 'user_defined_amount'],
  },
  // 32. Chargify / Maxio
  {
    id: 'chargify',
    fieldType: 'control_chargify',
    name: 'Chargify (Maxio)',
    category: 'cards',
    description: 'Advanced B2B SaaS subscription billing, recurring contracts, and tiered usage pricing.',
    badge: 'B2B SAAS',
    currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD'],
    features: ['B2B Subscription Management', 'Metered / Usage-based Billing', 'Dunning & Churn Prevention'],
    brandColor: '#00B0FF',
    logoBg: '#0A192F',
    supportsZeroConfig: false,
    iconSvg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#0A192F"/><path d="M19 11l-7 10h6l-2 8 9-11h-6l2-7z" fill="#00B0FF"/></svg>`,
    supportedPaymentTypes: ['sell_subscriptions'],
    configFields: [
      { key: 'apiKey', label: 'Chargify API Key', type: 'password', placeholder: 'chrg_live_...' },
      { key: 'subdomain', label: 'Chargify Subdomain', type: 'text', placeholder: 'yourcompany' },
    ],
  },
  // 33. Paymentwall
  {
    id: 'paymentwall',
    fieldType: 'control_paymentwall',
    name: 'Paymentwall',
    category: 'regional',
    description: 'Global monetization platform supporting 150+ local payment methods, bank transfers and prepaid cards.',
    badge: '150+ APMs',
    currencies: ['USD', 'EUR', 'GBP', 'JPY', 'KRW', 'BRL', 'INR', 'CAD'],
    features: ['150+ Alternative Payment Methods', 'Mobiamo Carrier Billing', 'Brick Global Credit Cards'],
    brandColor: '#2C3E50',
    logoBg: '#E74C3C',
    supportsZeroConfig: true,
    iconSvg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#E74C3C"/><path d="M12 14h16v12H12z" stroke="#FFF" stroke-width="2.5"/><line x1="12" y1="18" x2="28" y2="18" stroke="#FFF" stroke-width="2"/></svg>`,
    supportedPaymentTypes: ['sell_products', 'user_defined_amount', 'collect_donations'],
  },
  // 34. Stripe Financial ACH (Phase C addition)
  {
    id: 'stripe_ach',
    fieldType: 'control_stripe_ach',
    name: 'Stripe Financial ACH',
    category: 'bank',
    description: 'Instant bank verification and low-fee direct debit via Stripe ACH.',
    badge: 'NEW',
    currencies: ['USD'],
    features: ['Instant Bank Verification', 'Plaid Integration', '1-3 Business Days Settlement'],
    brandColor: '#635BFF',
    logoBg: '#635BFF',
    supportsZeroConfig: true,
    iconSvg: `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#635BFF"/><path d="M12 16h16v8H12z" stroke="#FFF" stroke-width="2"/><path d="M16 20h8" stroke="#FFF" stroke-width="1.5"/></svg>`,
    supportedPaymentTypes: ['sell_products', 'user_defined_amount', 'collect_donations'],
    configFields: [
      { key: 'publishableKey', label: 'Publishable Key', type: 'text', placeholder: 'pk_live_...' },
      { key: 'secretKey', label: 'Secret Key', type: 'password', placeholder: 'sk_live_...' },
    ],
    implemented: true,
  },
];

export function getPaymentGatewayById(id: string): PaymentGatewayDef | undefined {
  return PAYMENT_GATEWAYS_REGISTRY.find(
    (g) => g.id === id || g.fieldType === id || `payment_${g.id}` === id
  );
}

export function searchPaymentGateways(query: string, category?: PaymentCategory): PaymentGatewayDef[] {
  let list = PAYMENT_GATEWAYS_REGISTRY;

  if (category && category !== 'all') {
    list = list.filter((g) => g.category === category);
  }

  if (!query || !query.trim()) {
    return list;
  }

  const q = query.toLowerCase().trim();
  return list.filter(
    (g) =>
      g.name.toLowerCase().includes(q) ||
      g.description.toLowerCase().includes(q) ||
      g.fieldType.toLowerCase().includes(q) ||
      g.features.some((f) => f.toLowerCase().includes(q)) ||
      g.currencies.some((c) => c.toLowerCase().includes(q))
  );
}

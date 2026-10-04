export type BusinessType =
  | 'retail'
  | 'restaurant'
  | 'grocery'
  | 'services'
  | 'salon'
  | 'wholesale'
  | 'freelancer'
  | 'online_store'
  | 'manufacturing'
  | 'other';

export interface BusinessCapabilities {
  // Commerce & Storefront
  onlineStore: boolean;
  orders: boolean;
  posRegister: boolean;
  catalog: boolean;
  inventory: boolean;
  purchases: boolean;
  suppliers: boolean;

  // Restaurant & Dining
  dining: boolean;
  tables: boolean;
  kitchenKot: boolean;
  reservations: boolean;

  // Field Service & Jobs
  leads: boolean;
  jobs: boolean;
  dispatch: boolean;
  calendarBooking: boolean;

  // Billing, Invoicing & Ledger
  invoicing: boolean;
  quotes: boolean;
  expenses: boolean;
  customerCredit: boolean; // "Khata" in India, "Customer Credit Ledger" in US/Canada/Australia

  // Customers & Growth
  customers: boolean;
  loyalty: boolean;
  marketingBlasts: boolean;
  aiReceptionist: boolean;
  customDomain: boolean;
}

export type CountryCode = 'US' | 'CA' | 'AU' | 'IN' | 'GB' | 'GLOBAL';

export interface CurrencyConfig {
  code: string;       // 'USD', 'CAD', 'AUD', 'INR', 'GBP'
  symbol: string;     // '$', '₹', '£'
  decimals: number;   // 2
  position: 'prefix' | 'suffix';
}

export interface TaxConfig {
  label: string;             // 'Sales Tax', 'GST/HST', 'GST', 'VAT'
  defaultRate: number;       // e.g. 8.25, 13, 10, 18
  hasStates: boolean;
  supportsExemptions: boolean;
  taxNumberLabel: string;    // 'EIN / Tax ID', 'BN / GST No', 'ABN', 'GSTIN'
}

export interface PaymentConfig {
  methods: ('card' | 'apple_pay' | 'google_pay' | 'upi' | 'bank_transfer' | 'cash')[];
  defaultGateway: 'stripe' | 'airwallex' | 'razorpay' | 'direct_upi';
  supportsUpi: boolean;
}

export interface VocabularyConfig {
  customerCredit: string;    // 'Customer Credit', 'Customer Ledger', 'Khata (Udhaar)'
  customerCreditSubtitle: string;
  invoice: string;           // 'Invoice', 'Tax Invoice'
  estimate: string;          // 'Estimate', 'Quote', 'Proposal'
  taxLabel: string;          // 'Sales Tax', 'GST', 'VAT'
  taxIdLabel: string;        // 'Tax ID', 'GSTIN', 'ABN', 'BN'
}

export interface CountryPack {
  code: CountryCode;
  name: string;
  flag: string;
  currency: CurrencyConfig;
  tax: TaxConfig;
  payments: PaymentConfig;
  accounting: {
    primaryIntegrations: ('quickbooks' | 'xero' | 'myob' | 'tally')[];
  };
  vocabulary: VocabularyConfig;
}

export interface TenantBlueprint {
  businessType: BusinessType;
  businessName?: string;
  country: CountryCode;
  capabilities: BusinessCapabilities;
  configuredAt?: string;
  version: number;
}

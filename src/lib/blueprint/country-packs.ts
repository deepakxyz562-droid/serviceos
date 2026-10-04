import type { CountryCode, CountryPack } from './types';

export const COUNTRY_PACKS: Record<CountryCode, CountryPack> = {
  US: {
    code: 'US',
    name: 'United States',
    flag: '🇺🇸',
    currency: {
      code: 'USD',
      symbol: '$',
      decimals: 2,
      position: 'prefix',
    },
    tax: {
      label: 'Sales Tax',
      defaultRate: 7.25,
      hasStates: true,
      supportsExemptions: true,
      taxNumberLabel: 'EIN / State Tax ID',
    },
    payments: {
      methods: ['card', 'apple_pay', 'google_pay', 'bank_transfer', 'cash'],
      defaultGateway: 'stripe',
      supportsUpi: false,
    },
    accounting: {
      primaryIntegrations: ['quickbooks', 'xero'],
    },
    vocabulary: {
      customerCredit: 'Customer Credit',
      customerCreditSubtitle: 'Receivables, balances & credit accounts',
      invoice: 'Invoice',
      estimate: 'Estimate / Proposal',
      taxLabel: 'Sales Tax',
      taxIdLabel: 'EIN',
    },
  },

  CA: {
    code: 'CA',
    name: 'Canada',
    flag: '🇨🇦',
    currency: {
      code: 'CAD',
      symbol: '$',
      decimals: 2,
      position: 'prefix',
    },
    tax: {
      label: 'GST/HST',
      defaultRate: 13.0,
      hasStates: true,
      supportsExemptions: true,
      taxNumberLabel: 'CRA Business Number / GST',
    },
    payments: {
      methods: ['card', 'apple_pay', 'google_pay', 'bank_transfer', 'cash'],
      defaultGateway: 'stripe',
      supportsUpi: false,
    },
    accounting: {
      primaryIntegrations: ['quickbooks', 'xero'],
    },
    vocabulary: {
      customerCredit: 'Customer Credit',
      customerCreditSubtitle: 'Customer account balances & aging',
      invoice: 'Tax Invoice',
      estimate: 'Estimate',
      taxLabel: 'GST/HST',
      taxIdLabel: 'BN / GST No.',
    },
  },

  AU: {
    code: 'AU',
    name: 'Australia',
    flag: '🇦🇺',
    currency: {
      code: 'AUD',
      symbol: '$',
      decimals: 2,
      position: 'prefix',
    },
    tax: {
      label: 'GST',
      defaultRate: 10.0,
      hasStates: false,
      supportsExemptions: false,
      taxNumberLabel: 'ABN (Australian Business Number)',
    },
    payments: {
      methods: ['card', 'apple_pay', 'google_pay', 'bank_transfer', 'cash'],
      defaultGateway: 'stripe',
      supportsUpi: false,
    },
    accounting: {
      primaryIntegrations: ['xero', 'myob'],
    },
    vocabulary: {
      customerCredit: 'Customer Ledger',
      customerCreditSubtitle: 'Outstanding customer balances & credits',
      invoice: 'Tax Invoice',
      estimate: 'Quote',
      taxLabel: 'GST',
      taxIdLabel: 'ABN',
    },
  },

  IN: {
    code: 'IN',
    name: 'India',
    flag: '🇮🇳',
    currency: {
      code: 'INR',
      symbol: '₹',
      decimals: 2,
      position: 'prefix',
    },
    tax: {
      label: 'GST',
      defaultRate: 18.0,
      hasStates: true,
      supportsExemptions: true,
      taxNumberLabel: 'GSTIN (GST Identification Number)',
    },
    payments: {
      methods: ['upi', 'card', 'bank_transfer', 'cash'],
      defaultGateway: 'direct_upi',
      supportsUpi: true,
    },
    accounting: {
      primaryIntegrations: ['tally', 'quickbooks'],
    },
    vocabulary: {
      customerCredit: 'Customer Khata (Udhaar)',
      customerCreditSubtitle: 'Aapko Milega • Credit tracking & WhatsApp UPI',
      invoice: 'GST Bill & Invoice',
      estimate: 'Quotation / Estimate',
      taxLabel: 'GST (CGST/SGST/IGST)',
      taxIdLabel: 'GSTIN',
    },
  },

  GB: {
    code: 'GB',
    name: 'United Kingdom',
    flag: '🇬🇧',
    currency: {
      code: 'GBP',
      symbol: '£',
      decimals: 2,
      position: 'prefix',
    },
    tax: {
      label: 'VAT',
      defaultRate: 20.0,
      hasStates: false,
      supportsExemptions: false,
      taxNumberLabel: 'VAT Registration Number',
    },
    payments: {
      methods: ['card', 'apple_pay', 'google_pay', 'bank_transfer', 'cash'],
      defaultGateway: 'stripe',
      supportsUpi: false,
    },
    accounting: {
      primaryIntegrations: ['xero', 'quickbooks'],
    },
    vocabulary: {
      customerCredit: 'Customer Account',
      customerCreditSubtitle: 'Customer credit ledger & statements',
      invoice: 'VAT Invoice',
      estimate: 'Quote',
      taxLabel: 'VAT',
      taxIdLabel: 'VAT No.',
    },
  },

  GLOBAL: {
    code: 'GLOBAL',
    name: 'International',
    flag: '🌐',
    currency: {
      code: 'USD',
      symbol: '$',
      decimals: 2,
      position: 'prefix',
    },
    tax: {
      label: 'Tax',
      defaultRate: 0.0,
      hasStates: false,
      supportsExemptions: false,
      taxNumberLabel: 'Tax ID',
    },
    payments: {
      methods: ['card', 'bank_transfer', 'cash'],
      defaultGateway: 'stripe',
      supportsUpi: false,
    },
    accounting: {
      primaryIntegrations: ['quickbooks', 'xero'],
    },
    vocabulary: {
      customerCredit: 'Customer Balance',
      customerCreditSubtitle: 'Outstanding customer receivables',
      invoice: 'Invoice',
      estimate: 'Estimate',
      taxLabel: 'Tax',
      taxIdLabel: 'Tax ID',
    },
  },
};

export function getCountryPack(countryCode?: string | null): CountryPack {
  if (!countryCode) return COUNTRY_PACKS.US;
  const upper = countryCode.toUpperCase() as CountryCode;
  return COUNTRY_PACKS[upper] || COUNTRY_PACKS.GLOBAL;
}

/**
 * Format money cleanly based on country pack currency configuration
 */
export function formatMoney(amount: number | string | null | undefined, countryOrCode?: CountryPack | CountryCode | string | null): string {
  const numeric = typeof amount === 'number' ? amount : typeof amount === 'string' ? parseFloat(amount) : 0;
  const safeVal = isNaN(numeric) ? 0 : numeric;
  const pack = typeof countryOrCode === 'object' && countryOrCode !== null && 'currency' in countryOrCode
    ? countryOrCode
    : getCountryPack(countryOrCode);

  const formattedNum = safeVal.toLocaleString(undefined, {
    minimumFractionDigits: pack.currency.decimals,
    maximumFractionDigits: pack.currency.decimals,
  });

  return pack.currency.position === 'suffix'
    ? `${formattedNum} ${pack.currency.symbol}`
    : `${pack.currency.symbol}${formattedNum}`;
}

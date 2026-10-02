export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export type DocumentType = 'TAX_INVOICE' | 'BILL_OF_SUPPLY' | 'SIMPLE_BILL' | 'ESTIMATE';

export interface CalcLineItem {
  description?: string;
  qty: number;
  unitPrice: number;
  taxRate?: number; // e.g. 18 for 18% GST
  hsnCode?: string;
}

export interface DetailedInvoiceTotals {
  documentType: DocumentType;
  taxableAmount: number;
  gstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  subtotal: number;
  discount: number;
  shippingFee: number;
  tax: number;
  total: number;
}

export interface ProposalTier {
  id: string; // 'essential' | 'professional' | 'premium'
  name: string; // e.g. "Essential Package", "Professional (Recommended)", "Premium Turnkey"
  badge?: string;
  isRecommended?: boolean;
  description?: string;
  items: CalcLineItem[];
  discountValue?: number;
  discountType?: 'AMOUNT' | 'PERCENT' | string;
  totals?: DetailedInvoiceTotals;
}

/**
 * Pure arithmetic for quotes and invoices.
 * Supports Tax Invoice (GST itemized), Bill of Supply (tax-exempt), and Simple Bill.
 * Client and server safe (zero db or auth dependencies).
 */
export function computeInvoiceTotals(options: {
  items: CalcLineItem[];
  documentType?: DocumentType | string;
  discountValue?: number;
  discountType?: 'AMOUNT' | 'PERCENT' | string;
  globalTaxRate?: number;
  shippingFee?: number;
  currency?: string;
}): DetailedInvoiceTotals {
  const {
    items = [],
    documentType = 'TAX_INVOICE',
    discountValue = 0,
    discountType = 'AMOUNT',
    globalTaxRate = 0,
    shippingFee = 0,
  } = options;

  const docType = (documentType.toUpperCase() as DocumentType) || 'TAX_INVOICE';

  if (docType === 'BILL_OF_SUPPLY') {
    // Composition or tax-exempt: NO GST/Tax charged
    const rawSubtotal = items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.unitPrice) || 0), 0);
    const subtotal = round2(rawSubtotal);
    const discount =
      discountType === 'PERCENT'
        ? round2((subtotal * (Number(discountValue) || 0)) / 100)
        : Math.min(round2(Number(discountValue) || 0), subtotal);
    const total = round2(Math.max(0, subtotal - discount) + (Number(shippingFee) || 0));

    return {
      documentType: 'BILL_OF_SUPPLY',
      taxableAmount: subtotal,
      gstAmount: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      subtotal,
      discount,
      shippingFee: round2(Number(shippingFee) || 0),
      tax: 0,
      total,
    };
  }

  if (docType === 'SIMPLE_BILL') {
    // Simple receipt: subtotal with global tax & discount in adjustment
    const rawSubtotal = items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.unitPrice) || 0), 0);
    const subtotal = round2(rawSubtotal);
    const discount =
      discountType === 'PERCENT'
        ? round2((subtotal * (Number(discountValue) || 0)) / 100)
        : Math.min(round2(Number(discountValue) || 0), subtotal);
    const taxable = Math.max(0, subtotal - discount);
    const tax = round2((taxable * (Number(globalTaxRate) || 0)) / 100);
    const total = round2(taxable + tax + (Number(shippingFee) || 0));

    return {
      documentType: 'SIMPLE_BILL',
      taxableAmount: taxable,
      gstAmount: tax,
      cgstAmount: round2(tax / 2),
      sgstAmount: round2(tax / 2),
      subtotal,
      discount,
      shippingFee: round2(Number(shippingFee) || 0),
      tax,
      total,
    };
  }

  // Default: TAX_INVOICE (or ESTIMATE with itemized GST)
  let taxableSum = 0;
  let gstSum = 0;

  for (const item of items) {
    const itemQty = Number(item.qty) || 0;
    const itemPrice = Number(item.unitPrice) || 0;
    const itemTaxable = itemQty * itemPrice;
    const itemTaxRate = typeof item.taxRate === 'number' ? item.taxRate : Number(globalTaxRate) || 0;
    const itemTax = itemTaxable * (itemTaxRate / 100);

    taxableSum += itemTaxable;
    gstSum += itemTax;
  }

  const taxableAmount = round2(taxableSum);
  const gstAmount = round2(gstSum);
  const subtotal = round2(taxableAmount + gstAmount);

  let discount = 0;
  if (discountType === 'PERCENT') {
    discount = round2((subtotal * (Number(discountValue) || 0)) / 100);
  } else {
    discount = Math.min(round2(Number(discountValue) || 0), subtotal);
  }

  const cgstAmount = round2(gstAmount / 2);
  const sgstAmount = round2(gstAmount / 2);
  const total = round2(Math.max(0, subtotal - discount) + (Number(shippingFee) || 0));

  return {
    documentType: docType,
    taxableAmount,
    gstAmount,
    cgstAmount,
    sgstAmount,
    subtotal,
    discount,
    shippingFee: round2(Number(shippingFee) || 0),
    tax: gstAmount,
    total,
  };
}

/**
 * Computes totals for a single proposal tier (Good/Better/Best)
 */
export function computeTierTotals(
  tier: ProposalTier,
  docType: DocumentType | string = 'ESTIMATE',
  currency = 'INR'
): ProposalTier {
  const totals = computeInvoiceTotals({
    items: tier.items,
    documentType: docType,
    discountValue: tier.discountValue,
    discountType: tier.discountType,
    currency,
  });
  return { ...tier, totals };
}

/**
 * Standard Good / Better / Best starter template
 */
export function generateDefaultTiers(baseItems: CalcLineItem[] = []): ProposalTier[] {
  const validBase = baseItems.length > 0 ? baseItems : [{ description: 'Core Scope & Delivery', qty: 1, unitPrice: 1000, taxRate: 18 }];
  
  return [
    {
      id: 'essential',
      name: 'Essential Package',
      badge: 'Good',
      description: 'Standard delivery covering core specifications with standard turnaround.',
      isRecommended: false,
      items: validBase,
    },
    {
      id: 'professional',
      name: 'Professional Package',
      badge: 'Best Value',
      description: 'Complete solution including priority turnaround, revisions & 30-day warranty.',
      isRecommended: true,
      items: [
        ...validBase,
        { description: 'Priority Support & Expedited Turnaround', qty: 1, unitPrice: Math.round(validBase[0].unitPrice * 0.4), taxRate: 18 },
        { description: 'Extended 30-Day Revision Guarantee', qty: 1, unitPrice: Math.round(validBase[0].unitPrice * 0.2), taxRate: 18 },
      ],
    },
    {
      id: 'premium',
      name: 'Premium Enterprise',
      badge: 'All-Inclusive',
      description: 'Turnkey enterprise package with 24/7 dedicated support & 6-month maintenance.',
      isRecommended: false,
      items: [
        ...validBase,
        { description: 'Priority Support & Expedited Turnaround', qty: 1, unitPrice: Math.round(validBase[0].unitPrice * 0.4), taxRate: 18 },
        { description: 'Dedicated VIP Support & Training (1 Year)', qty: 1, unitPrice: Math.round(validBase[0].unitPrice * 0.7), taxRate: 18 },
        { description: '6 Months Ongoing Maintenance & Updates', qty: 1, unitPrice: Math.round(validBase[0].unitPrice * 0.5), taxRate: 18 },
      ],
    },
  ];
}

/**
 * Legacy compatible computeTotals
 */
export function computeTotals(
  items: { qty: number; unitPrice: number; taxRate?: number }[],
  discountValue: number,
  discountType: 'AMOUNT' | 'PERCENT' | string,
  taxRate: number,
  currency = 'USD'
) {
  const result = computeInvoiceTotals({
    items,
    documentType: 'TAX_INVOICE',
    discountValue,
    discountType,
    globalTaxRate: taxRate,
    currency,
  });
  return {
    subtotal: result.subtotal,
    taxableAmount: result.taxableAmount,
    gstAmount: result.gstAmount,
    discount: result.discount,
    tax: result.tax,
    total: result.total,
  };
}

export function formatCurrency(amount: number, currency = 'INR', symbol?: string) {
  const n = Number(amount) || 0;
  const curr = (currency || 'INR').toUpperCase();
  const defaultSymbol = curr === 'INR' ? '₹' : curr === 'EUR' ? '€' : curr === 'GBP' ? '£' : '$';
  const displaySymbol = symbol !== undefined ? symbol : defaultSymbol;
  const locale = curr === 'INR' ? 'en-IN' : 'en-US';

  const formattedNumber = n.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${displaySymbol}${formattedNumber}`;
}

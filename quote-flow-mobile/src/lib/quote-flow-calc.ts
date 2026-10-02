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

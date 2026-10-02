export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Pure arithmetic for quotes and invoices.
 * Client and server safe (zero db or auth dependencies).
 */
export function computeTotals(
  items: { qty: number; unitPrice: number }[],
  discountValue: number,
  discountType: 'AMOUNT' | 'PERCENT' | string,
  taxRate: number,
  currency = 'USD'
) {
  const subtotal = items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.unitPrice) || 0), 0);
  let discount = 0;
  if (discountType === 'PERCENT') {
    discount = (subtotal * (Number(discountValue) || 0)) / 100;
  } else {
    discount = Math.min(Number(discountValue) || 0, subtotal);
  }
  const taxable = Math.max(0, subtotal - discount);
  const tax = (taxable * (Number(taxRate) || 0)) / 100;
  const total = taxable + tax;
  return {
    subtotal: round2(subtotal),
    discount: round2(discount),
    tax: round2(tax),
    total: round2(total),
  };
}

export function formatCurrency(amount: number, currency = 'USD', symbol = '$') {
  const n = Number(amount) || 0;
  return `${symbol}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

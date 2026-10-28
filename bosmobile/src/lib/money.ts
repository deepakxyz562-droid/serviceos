// Shared money helpers for BOS mobile — single source of truth for currency
// formatting, GST state logic and stable share links. No fake data, ever.

export const DEFAULT_CURRENCY_SYMBOL = '₹';

/** en-IN grouped currency, e.g. ₹ 1,23,456.78 */
export function formatInr(amount: number | null | undefined, symbol: string = DEFAULT_CURRENCY_SYMBOL): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return `${symbol}—`;
  return `${symbol}${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Compact en-IN grouping without the symbol, for dense chips/badges. */
export function formatAmount(n: number | null | undefined): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** DD MMM YYYY (e.g. 27 Oct 2026). Honest '—' for invalid dates. */
export function formatDateShort(value: string | number | Date | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Stable, honest invoice share URL. Uses the deployed BOS host when
 * EXPO_PUBLIC_APP_URL is configured; never invents a fake domain.
 */
export function buildInvoiceUrl(invoiceId: string | null | undefined): string {
  const base = (process.env.EXPO_PUBLIC_APP_URL || 'https://bos.fieseros.com').replace(/\/+$/, '');
  return `${base}/invoice/${invoiceId || ''}`;
}

/** First two characters of a GSTIN are the state code. Empty → ''. */
export function extractGstStateCode(gstin: string | null | undefined): string {
  const g = (gstin || '').trim().toUpperCase();
  return /^\d{2}/.test(g) ? g.slice(0, 2) : '';
}

export interface GstSplitLine {
  qty: number;
  unitPrice: number;
  gstRate?: number | null;
}

export interface GstSplitResult {
  interstate: boolean;
  taxableTotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  taxTotal: number;
  grandTotal: number;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Vyapar-style GST split: CGST+SGST for intra-state, IGST for inter-state.
 * Falls back to intra-state when the customer's state is unknown (B2C).
 */
export function gstSplitForLines(
  lines: GstSplitLine[],
  opts: { storeGstin?: string | null; customerGstin?: string | null; placeOfSupply?: string | null; fallbackRate?: number }
): GstSplitResult {
  const storeState = extractGstStateCode(opts.storeGstin);
  const clientState = extractGstStateCode(opts.placeOfSupply || opts.customerGstin);
  const interstate = Boolean(clientState) && Boolean(storeState) && storeState !== clientState;

  let taxableTotal = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  for (const line of lines) {
    const taxable = (Number(line.qty) || 0) * (Number(line.unitPrice) || 0);
    const rate = Number(line.gstRate ?? opts.fallbackRate ?? 0);
    taxableTotal += taxable;
    if (interstate) igst += taxable * (rate / 100);
    else {
      cgst += taxable * (rate / 200);
      sgst += taxable * (rate / 200);
    }
  }
  const taxTotal = round2(cgst + sgst + igst);
  return {
    interstate,
    taxableTotal: round2(taxableTotal),
    cgst: round2(cgst),
    sgst: round2(sgst),
    igst: round2(igst),
    taxTotal,
    grandTotal: round2(taxableTotal + taxTotal),
  };
}

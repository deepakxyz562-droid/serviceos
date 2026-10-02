/**
 * Mobile currency formatter — locale-aware with Intl.NumberFormat.
 *
 * Previously used toFixed(2) with no thousand separators. Now uses
 * Intl.NumberFormat for proper locale formatting (en-IN for INR with
 * lakh/crore grouping, en-US for others).
 *
 * This file is kept for backward compatibility — new code should import
 * from @/lib/quote-flow-calc instead (which has the same implementation).
 */
export function formatCurrency(amount: number, currency = "USD", symbol?: string) {
  const n = Number(amount) || 0;
  const curr = (currency || "USD").toUpperCase();
  const defaultSymbol =
    curr === "INR" ? "₹" : curr === "EUR" ? "€" : curr === "GBP" ? "£" : "$";
  const displaySymbol = symbol !== undefined ? symbol : defaultSymbol;
  const locale = curr === "INR" ? "en-IN" : "en-US";

  const formattedNumber = n.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${displaySymbol}${formattedNumber}`;
}

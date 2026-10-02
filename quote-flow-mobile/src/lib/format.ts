/**
 * Mobile currency formatter — duplicated from web's lib/session.ts to keep the
 * mobile bundle self-contained (no Next.js imports).
 */
export function formatCurrency(amount: number, currency = "USD", symbol = "$") {
  if (currency === "USD" || currency === "AUD" || currency === "CAD" || currency === "NZD") {
    return `${symbol}${amount.toFixed(2)}`;
  }
  if (currency === "EUR") return `€${amount.toFixed(2)}`;
  if (currency === "GBP") return `£${amount.toFixed(2)}`;
  if (currency === "INR") return `₹${amount.toFixed(2)}`;
  if (currency === "JPY") return `¥${Math.round(amount)}`;
  return `${symbol}${amount.toFixed(2)}`;
}

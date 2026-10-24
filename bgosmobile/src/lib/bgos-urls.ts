import { WEB_URL } from './constants';

/**
 * Builds an authentic URL into the BGOS web portal for a given view.
 * Guarantees `product=bgos` is ALWAYS present, preventing the browser
 * from loading the customer-facing portal instead of the business workstation.
 */
export function getBgosWebUrl(view?: string, additionalParams?: Record<string, string>): string {
  const base = `${WEB_URL}/app?product=bgos`;
  const viewPart = view ? `&view=${encodeURIComponent(view)}` : '';
  if (!additionalParams) {
    return `${base}${viewPart}`;
  }
  const extra = Object.entries(additionalParams)
    .filter(([_, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `&${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('');
  return `${base}${viewPart}${extra}`;
}

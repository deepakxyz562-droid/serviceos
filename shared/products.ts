import { productForHostname, type ProductApp } from './product-context';

export const PRODUCTS = ['crm', 'bos', 'chatbotly', 'quoteflow', 'marketplace'] as const;
export const PRODUCT_LABELS: Record<ProductApp, string> = {
  crm: 'Fieseros CRM', bos: 'BOS', chatbotly: 'Chatbotly', quoteflow: 'QuoteFlow', marketplace: 'Marketplace',
};
export function isProduct(value: unknown): value is ProductApp {
  return typeof value === 'string' && (PRODUCTS as readonly string[]).includes(value);
}
export function normalizeProduct(value: string): ProductApp {
  if (['forms', 'gptform', 'chatboly'].includes(value)) return 'chatbotly';
  return isProduct(value) ? value : 'crm';
}
export function productUrl(product: ProductApp): string {
  return product === 'crm' ? 'https://fieseros.com/app' : product === 'marketplace'
    ? 'https://fieseros.com/marketplace/dashboard' : `https://${product}.fieseros.com`;
}
/** The selector is untrusted input; membership is always checked on the server. */
export function requestedProduct(headers: { get(name: string): string | null }): ProductApp | null {
  const explicit = headers.get('x-product-app');
  if (isProduct(explicit)) return explicit;
  const host = (headers.get('x-forwarded-host') || headers.get('host') || '').split(',')[0].trim();
  const product = productForHostname(host);
  return product === 'crm' ? null : product;
}

export function subscriptionAllowsAccess(subscription: {
  status: string; trialEndsAt?: Date | string | null; currentPeriodEnd?: Date | string | null;
}, now = Date.now()): boolean {
  if (subscription.status === 'trial') {
    return !!subscription.trialEndsAt && new Date(subscription.trialEndsAt).getTime() > now;
  }
  if (subscription.status !== 'active') return false;
  return !subscription.currentPeriodEnd || new Date(subscription.currentPeriodEnd).getTime() > now;
}

/** Only redirect public GET/HEAD pages; API callbacks keep their original method/body. */
export function marketplaceRedirect(path: string, search = ''): string {
  if (path === '/' || path === '/marketplace') return `https://fieseros.com/marketplace${search}`;
  if (['/login', '/register', '/app', '/dashboard'].includes(path)) {
    return `https://fieseros.com/marketplace/dashboard${search}`;
  }
  const destination = /^\/[^/]+$/.test(path) && !path.includes('.') ? `/marketplace${path}` : path;
  return `https://fieseros.com${destination}${search}`;
}

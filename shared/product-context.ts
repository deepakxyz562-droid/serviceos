/**
 * Multi-Product Context System
 * ============================
 * Dispatches active application between:
 * 1. BOS (Business Operating System: POS, stock, khata, invoices, daybook) -> bos.fieseros.com
 * 2. Chatbotly (AI Conversational Forms, AI Agents, Live Inbox & Bookings) -> chatbotly.fieseros.com
 * 3. QuoteFlow (Dedicated AI Quote & Instant Invoice Platform) -> quoteflow.fieseros.com
 * 4. Marketplace (On-Demand Gig Requests, Proposals & Contractor Payouts) -> marketplace.fieseros.com
 * 5. Fieseros CRM (Field Service Contractors & Trade Management) -> fieseros.com
 */

export type ProductApp = 'bos' | 'chatbotly' | 'crm' | 'quoteflow' | 'marketplace';

export type ProductIdentity = {
  workspace?: {
    productType?: string | null;
  } | null;
  tenant?: {
    productType?: string | null;
    signupMode?: string | null;
    plan?: string | null;
  } | null;
  user?: {
    role?: string | null;
    isSuperAdmin?: boolean;
  } | null;
};

export function getWorkspaceProduct(auth?: ProductIdentity): ProductApp {
  if (auth?.user?.isSuperAdmin || ['superadmin', 'super_admin'].includes(auth?.user?.role || '')) {
    return 'crm';
  }

  const product = auth?.workspace?.productType || auth?.tenant?.productType;
  if (product === 'crm') return 'crm';
  if (product === 'quoteflow') return 'quoteflow';
  if (product === 'marketplace') return 'marketplace';
  if (product === 'bos') return 'bos';
  if (product === 'chatbotly' || product === 'chatboly') return 'chatbotly';
  if (product === 'forms' || product === 'gptform') return 'chatbotly';
  if (product) return 'crm'; // Explicit identity wins over legacy signup flags.

  if (
    ['standalone', 'forms_standalone'].includes(auth?.tenant?.signupMode || '') ||
    (auth?.tenant?.plan || '').startsWith('standalone') ||
    auth?.user?.role === 'standalone_user'
  ) {
    return 'bos';
  }

  return 'crm';
}

/** Host is presentation context only; authorization always uses workspace identity. */
export function productForHostname(hostname: string): ProductApp {
  const host = hostname.toLowerCase().split(':')[0];
  const products: Record<string, ProductApp> = {
    'bos.fieseros.com': 'bos', 'chatbotly.fieseros.com': 'chatbotly',
    'chatboly.fieseros.com': 'chatbotly', 'quoteflow.fieseros.com': 'quoteflow',
    'marketplace.fieseros.com': 'marketplace',
  };
  return products[host] || 'crm';
}

export function getAppProduct(auth?: ProductIdentity): ProductApp {
  if (auth?.user?.isSuperAdmin || ['superadmin', 'super_admin'].includes(auth?.user?.role || '')) return 'crm';
  if (typeof window !== 'undefined') {
    const product = productForHostname(window.location.hostname);
    if (product !== 'crm') return product;
  }
  return getWorkspaceProduct(auth);
}

export function isBosWorkspace(auth?: ProductIdentity): boolean {
  return getAppProduct(auth) === 'bos';
}

export function isChatbotlyWorkspace(auth?: ProductIdentity): boolean {
  return getAppProduct(auth) === 'chatbotly';
}

export function isQuoteflowWorkspace(auth?: ProductIdentity): boolean {
  return getAppProduct(auth) === 'quoteflow';
}

export function isMarketplaceWorkspace(auth?: ProductIdentity): boolean {
  return getAppProduct(auth) === 'marketplace';
}

export function isGptFormWorkspace(auth?: ProductIdentity): boolean {
  const p = getWorkspaceProduct(auth);
  return p === 'bos' || p === 'chatbotly';
}

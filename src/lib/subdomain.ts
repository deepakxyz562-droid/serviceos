/**
 * ServiceOS Subdomain Detection Library
 *
 * Handles subdomain extraction, validation, and URL construction
 * for the multi-tenant SaaS architecture.
 *
 * Subdomain convention:
 *   - Root domain: serviceos.cc → landing page / generic login
 *   - Super admin: admin.serviceos.cc → admin dashboard
 *   - Tenant: {slug}.serviceos.cc → company workspace
 */

// ─── Subdomain Extraction ──────────────────────────────────────────────────────

/**
 * Extract subdomain from a hostname.
 *
 * Examples:
 *   "abc-plumbing.serviceos.cc" → "abc-plumbing"
 *   "admin.serviceos.cc"         → "admin"
 *   "serviceos.cc"               → null (root domain)
 *   "localhost:3000"                          → null (dev)
 *   "192.168.1.1:3000"                        → null (IP)
 *
 * @param hostname - The full hostname (may include port)
 * @returns The subdomain string, or null if root domain / localhost / IP
 */
export function extractSubdomain(hostname: string): string | null {
  // Remove port if present
  const host = hostname.split(':')[0];

  // Localhost / IP = no subdomain
  if (host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return null;
  }

  const parts = host.split('.');

  // Determine the "root" hostname from NEXT_PUBLIC_APP_URL so we can
  // figure out what constitutes a subdomain relative to our deployment.
  // For "https://serviceos.cc" the root host is "serviceos.cc"
  // and any extra prefix label is a tenant/admin subdomain.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  let rootHost = '';
  try {
    rootHost = new URL(appUrl).hostname;
  } catch {
    // fallback: no APP_URL set
  }

  // If the hostname exactly matches the root domain, there is no subdomain.
  if (rootHost && host === rootHost) {
    return null;
  }

  // If the hostname ends with ".{rootHost}", the subdomain is the prefix.
  // e.g., "abc.serviceos.cc" endsWith ".serviceos.cc"
  if (rootHost && host.endsWith(`.${rootHost}`)) {
    const subdomain = host.slice(0, host.length - rootHost.length - 1);
    // "www" is treated as no subdomain (canonical root)
    if (subdomain === 'www') return null;
    return subdomain;
  }

  // Fallback for custom domains or when NEXT_PUBLIC_APP_URL is not set:
  // For *.netlify.app: subdomain is the first part when we have 4+ parts
  // e.g., abc.serviceos.cc → parts = ['abc', 'serviceos', 'cc']
  if (parts.length >= 4) {
    const subdomain = parts[0];
    if (subdomain === 'www') return null;
    return subdomain;
  }

  // For *.yourdomain.com (custom domain with 3 parts)
  if (parts.length === 3) {
    const subdomain = parts[0];
    if (subdomain === 'www') return null;
    return subdomain;
  }

  // Root domain (2 parts)
  return null;
}

// ─── Subdomain Classification ──────────────────────────────────────────────────

/**
 * Check if the subdomain is the super admin subdomain.
 *
 * @param subdomain - The extracted subdomain (or null)
 * @returns True if this is the super admin subdomain ("admin")
 */
export function isSuperAdminSubdomain(subdomain: string | null): boolean {
  return subdomain === 'admin';
}

// ─── URL Construction ──────────────────────────────────────────────────────────

/**
 * Build the full subdomain URL for a tenant.
 *
 * @param tenantSlug - The tenant's slug (used as subdomain)
 * @returns Full URL like "https://abc-plumbing.serviceos.cc"
 */
export function buildTenantUrl(tenantSlug: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://serviceos.cc';
  const url = new URL(appUrl);
  return `${url.protocol}//${tenantSlug}.${url.host}`;
}

/**
 * Build the super admin URL.
 *
 * @returns Full URL like "https://admin.serviceos.cc"
 */
export function buildSuperAdminUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://serviceos.cc';
  const url = new URL(appUrl);
  return `${url.protocol}//admin.${url.host}`;
}

/**
 * Get the root domain URL (no subdomain).
 *
 * @returns Full URL like "https://serviceos.cc"
 */
export function getRootDomainUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://serviceos.cc';
  return appUrl.replace(/\/+$/, '');
}

// ─── Cookie Domain ─────────────────────────────────────────────────────────────

/**
 * Get cookie domain that works across subdomains.
 *
 * For "serviceos.cc" → ".serviceos.cc"
 * For localhost → undefined (browser default)
 *
 * The leading dot allows cookies to be shared across all subdomains,
 * which is essential for the session cookie to work when a user
 * logs in on the root domain and is redirected to their tenant subdomain.
 *
 * @returns The cookie domain string, or undefined for localhost
 */
export function getCookieDomain(): string | undefined {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  if (!appUrl) return undefined;

  try {
    const url = new URL(appUrl);
    const host = url.hostname;

    // localhost / IP → no domain attribute needed
    if (host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      return undefined;
    }

    // Add leading dot for subdomain sharing: ".serviceos.cc"
    return `.${host}`;
  } catch {
    return undefined;
  }
}

// ─── Subdomain Validation ──────────────────────────────────────────────────────

/** Reserved subdomains that cannot be used by tenants */
export const RESERVED_SUBDOMAINS = [
  'admin',
  'app',
  'www',
  'api',
  'mail',
  'smtp',
  'ftp',
  'blog',
  'docs',
  'support',
  'help',
  'status',
  'dev',
  'staging',
  'test',
  'demo',
] as const;

/** Minimum length for a subdomain */
export const SUBDOMAIN_MIN_LENGTH = 3;

/** Maximum length for a subdomain */
export const SUBDOMAIN_MAX_LENGTH = 63;

/**
 * Validate and sanitize a subdomain string.
 *
 * - Converts to lowercase
 * - Removes invalid characters (only a-z, 0-9, hyphens allowed)
 * - Collapses multiple hyphens
 * - Strips leading/trailing hyphens
 *
 * @param input - Raw subdomain input
 * @returns Sanitized subdomain, or null if invalid
 */
export function sanitizeSubdomain(input: string): string | null {
  const clean = input
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (clean.length < SUBDOMAIN_MIN_LENGTH || clean.length > SUBDOMAIN_MAX_LENGTH) {
    return null;
  }

  return clean;
}

/**
 * Check if a subdomain is reserved.
 *
 * @param subdomain - The sanitized subdomain to check
 * @returns True if the subdomain is reserved
 */
export function isReservedSubdomain(subdomain: string): boolean {
  return (RESERVED_SUBDOMAINS as readonly string[]).includes(subdomain);
}

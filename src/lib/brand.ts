/**
 * Fieseros — Centralized Brand Configuration
 * ============================================
 *
 * Single source of truth for all brand-related strings: name, domain,
 * emails, subdomain conventions, and tagline.
 *
 * WHY THIS EXISTS:
 *   Previously "ServiceOS" / "serviceos.cc" were hardcoded across 250+
 *   files. A rebrand required touching every file. Now, any brand change
 *   is a 1-file edit here, and every importer picks it up.
 *
 * USAGE:
 *   import { BRAND } from '@/lib/brand';
 *   <h1>{BRAND.name}</h1>
 *   <a href={`mailto:${BRAND.emails.support}`}>Support</a>
 *   const url = BRAND.url; // https://fieseros.com
 *
 * NOTE:
 *   This file is imported by both server and client components. Keep it
 *   free of server-only imports (no fs, no database). It must be a pure
 *   data module so it can be tree-shaken into client bundles safely.
 */

export const BRAND = {
  /** Display name shown in UI, headers, titles. */
  name: 'Fieseros',

  /** Root domain (no protocol, no subdomain). */
  domain: 'fieseros.com',

  /** Full origin URL with protocol. Used for metadataBase, canonical, OG. */
  url: 'https://fieseros.com',

  /** Marketing tagline. */
  tagline: 'The Operating System for Service Businesses',

  /** Short description for meta tags. */
  description:
    'Fieseros — The Operating System for service businesses. Replace scattered texts, emails, and spreadsheets. Leads, dispatch, invoicing, and automated Email, SMS & Push operations.',

  /** Super-admin subdomain label (prepended to root domain). */
  adminSubdomain: 'admin',

  /** Full super-admin URL. */
  adminUrl: 'https://admin.fieseros.com',

  /**
   * Official email addresses. All inboxes should be created on the
   * fieseros.com mail provider (see infrastructure setup guide).
   */
  emails: {
    general: 'hello@fieseros.com',
    sales: 'sales@fieseros.com',
    support: 'support@fieseros.com',
    help: 'help@fieseros.com',
    admin: 'admin@fieseros.com',
    legal: 'legal@fieseros.com',
    privacy: 'privacy@fieseros.com',
    dpo: 'dpo@fieseros.com',
    security: 'security@fieseros.com',
    abuse: 'abuse@fieseros.com',
    notifications: 'notifications@fieseros.com',
    demo: 'demo@fieseros.com',
  },

  /** Default from-email for transactional emails sent by the platform. */
  fromEmail: 'notifications@fieseros.com',

  /** Default reply-to for transactional emails. */
  replyToEmail: 'hello@fieseros.com',

  /** PWA / cache identifiers (must stay lowercase, no spaces). */
  cachePrefix: 'fieseros',
  syncTag: 'fieseros-sync',

  /** Social/profile URLs (update when profiles are created). */
  social: {
    twitter: 'https://twitter.com/fieseros',
    linkedin: 'https://linkedin.com/company/fieseros',
    github: 'https://github.com/fieseros',
  },

  /** Legal entity name (used in legal pages). */
  legalEntity: 'Fieseros, Inc.',

  /** Copyright line. */
  copyright: `© ${new Date().getFullYear()} Fieseros, Inc. All rights reserved.`,
} as const;

/**
 * Convenience exports for the most commonly used fields.
 * Components can import { BRAND } or individual constants.
 */
export const BRAND_NAME = BRAND.name;
export const BRAND_DOMAIN = BRAND.domain;
export const BRAND_URL = BRAND.url;
export const BRAND_TAGLINE = BRAND.tagline;

/**
 * Get the root domain URL from env (production) or fallback to brand config.
 * Used by subdomain.ts and anywhere the app needs to know its own origin.
 *
 * Respects NEXT_PUBLIC_APP_URL so local dev / staging / preview deployments
 * can override the default production URL.
 */
export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || BRAND.url;
}

/**
 * Build a tenant subdomain URL.
 * @example buildTenantUrl('abc-plumbing') → 'https://abc-plumbing.fieseros.com'
 */
export function buildTenantUrl(tenantSlug: string): string {
  const appUrl = getAppUrl();
  const url = new URL(appUrl);
  return `${url.protocol}//${tenantSlug}.${url.host}`;
}

/**
 * Build the super-admin URL.
 * @example → 'https://admin.fieseros.com'
 */
export function buildAdminUrl(): string {
  const appUrl = getAppUrl();
  const url = new URL(appUrl);
  return `${url.protocol}//${BRAND.adminSubdomain}.${url.host}`;
}

/**
 * Get the cookie domain that works across all subdomains.
 * @example → '.fieseros.com' (production) | undefined (localhost)
 */
export function getCookieDomain(): string | undefined {
  const appUrl = getAppUrl();
  if (!appUrl) return undefined;
  try {
    const url = new URL(appUrl);
    const host = url.hostname;
    if (host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      return undefined;
    }
    return `.${host}`;
  } catch {
    return undefined;
  }
}

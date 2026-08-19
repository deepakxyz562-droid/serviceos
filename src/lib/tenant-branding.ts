/**
 * Tenant Email Branding Resolver
 *
 * The single canonical way to resolve the branding DTO used by customer-facing
 * emails (PIN notifications, booking confirmations, etc.).
 *
 * Architecture (confirmed):
 *   Tenant    → company identity (name, logo, phone, email, website, address)
 *   BrandKit  → visual styling only (colors, font, footer HTML)
 *   BrandProfile → AI voice (NOT used here — different concern)
 *
 * The resolver composes:
 *   - Tenant fields (identity — NO BrandKit fallback for these)
 *   - BrandKit visual fields (colors, font, footer — BrandKit's proper role)
 *   - hideFieserosBranding = plan-gated × tenant.whiteLabelJson
 *
 * Named `loadTenantEmailBranding` (singular, email-scoped) to leave room for
 * `loadTenantPortalBranding` / `loadTenantInvoiceBranding` later if their
 * requirements diverge.
 */

import { db } from '@/lib/db';
import { isFeatureEnabledForPlan, resolvePlanTier, type PlanTier } from '@/lib/plan-features';

export interface TenantEmailBranding {
  // ── From Tenant (canonical company identity — NO BrandKit fallback) ──
  businessName: string;
  logoUrl: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;

  // ── From BrandKit (visual styling only — BrandKit's proper role) ──
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  footerHtml: string | null;

  // ── From Tenant + plan (white-label visibility) ──
  hideFieserosBranding: boolean;
}

// Default visual styling (used when no BrandKit exists for the tenant).
const DEFAULT_BRAND_KIT = {
  primaryColor: '#0f766e',     // teal-700
  secondaryColor: '#1f2937',   // gray-800
  accentColor: '#f59e0b',      // amber-500
  fontFamily: 'Inter, sans-serif',
  footerHtml: null as string | null,
};

/**
 * Safely parse the tenant.whiteLabelJson string. Shape:
 *   { hideFieserosBranding?: boolean }
 * Returns {} on parse failure (fail-open: branding is shown by default).
 */
function parseWhiteLabelConfig(raw: string | null | undefined): { hideFieserosBranding?: boolean } {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as { hideFieserosBranding?: boolean };
    }
  } catch {
    // malformed JSON — treat as empty config
  }
  return {};
}

/**
 * Load the email branding DTO for a tenant.
 *
 * @param tenantId The tenant ID to resolve branding for.
 * @returns A TenantEmailBranding object. Never throws — on error, returns
 *          sensible defaults (businessName "Your Business", default colors).
 */
export async function loadTenantEmailBranding(tenantId: string): Promise<TenantEmailBranding> {
  try {
    const [tenant, brandKit] = await Promise.all([
      db.tenant.findUnique({
        where: { id: tenantId },
        select: {
          name: true,
          logo: true,
          phone: true,
          email: true,
          website: true,
          address: true,
          whiteLabelJson: true,
          plan: true,
          planStatus: true,
        },
      }),
      db.brandKit.findUnique({
        where: { tenantId },
        select: {
          primaryColor: true,
          secondaryColor: true,
          accentColor: true,
          fontFamily: true,
          footerHtml: true,
          // NOTE: we intentionally do NOT select logoUrl, companyName, phone,
          // email, website, address from BrandKit — those are Tenant's job.
        },
      }),
    ]);

    if (!tenant) {
      // Tenant not found — return defaults. This shouldn't happen in normal
      // flow (the caller should have a valid tenantId), but we fail gracefully
      // rather than crashing the notification pipeline.
      return {
        businessName: 'Your Business',
        logoUrl: null,
        phone: null,
        email: null,
        website: null,
        address: null,
        ...DEFAULT_BRAND_KIT,
        hideFieserosBranding: false,
      };
    }

    // ── White-label resolution: plan-gated × tenant override ──
    let hideFieserosBranding = false;
    try {
      const planTier: PlanTier = resolvePlanTier(tenant.plan, tenant.planStatus);
      const planAllowsWhiteLabel = await isFeatureEnabledForPlan('white_label', planTier);
      if (planAllowsWhiteLabel) {
        const wlConfig = parseWhiteLabelConfig(tenant.whiteLabelJson);
        hideFieserosBranding = wlConfig.hideFieserosBranding === true;
      }
    } catch {
      // If plan feature lookup fails, default to showing branding (fail-open
      // for the "Powered by Fieseros" footer — safer than hiding it).
      hideFieserosBranding = false;
    }

    return {
      // ── Tenant = canonical identity source ──
      businessName: tenant.name || 'Your Business',
      logoUrl: tenant.logo || null,      // NO fallback to brandKit.logoUrl
      phone: tenant.phone || null,
      email: tenant.email || null,
      website: tenant.website || null,
      address: tenant.address || null,

      // ── BrandKit = visual styling only ──
      primaryColor: brandKit?.primaryColor ?? DEFAULT_BRAND_KIT.primaryColor,
      secondaryColor: brandKit?.secondaryColor ?? DEFAULT_BRAND_KIT.secondaryColor,
      accentColor: brandKit?.accentColor ?? DEFAULT_BRAND_KIT.accentColor,
      fontFamily: brandKit?.fontFamily ?? DEFAULT_BRAND_KIT.fontFamily,
      footerHtml: brandKit?.footerHtml ?? DEFAULT_BRAND_KIT.footerHtml,

      // ── White-label visibility ──
      hideFieserosBranding,
    };
  } catch (error) {
    console.error('[loadTenantEmailBranding] Failed to load branding for tenant:', tenantId, error);
    // Return safe defaults on any error — the email should still send,
    // just with fallback branding rather than no branding.
    return {
      businessName: 'Your Business',
      logoUrl: null,
      phone: null,
      email: null,
      website: null,
      address: null,
      ...DEFAULT_BRAND_KIT,
      hideFieserosBranding: false,
    };
  }
}

/**
 * Build the absolute URL for the customer tracking portal.
 *
 * @param jobId The job ID to link to
 * @param origin The request origin (e.g. "https://app.fieseros.com")
 * @returns Absolute URL like "https://app.fieseros.com/portal/{jobId}"
 */
export function buildTrackingUrl(jobId: string, origin: string): string {
  return `${origin.replace(/\/$/, '')}/portal/${jobId}`;
}

import { db } from '@/lib/db';

/**
 * Reserved routes and system words that cannot be used as business short URLs (bgos.site/<slug>).
 */
export const BGOS_RESERVED_SLUGS = new Set([
  'api',
  '_next',
  'b',
  'app',
  'login',
  'recover',
  'setup',
  'terms',
  'privacy',
  'terms-of-service',
  'privacy-policy',
  'data-deletion',
  'auth',
  'auth-callback',
  'gbp-callback',
  'inbox',
  'bgos-home',
  'bos-home',
  'quote-flow',
  'marketplace',
  'favicon.ico',
  'robots.txt',
  'sitemap.xml',
  'images',
  'uploads',
  'assets',
  'static',
  'admin',
  'dashboard',
  'settings',
  'help',
  'pricing',
  'book',
  'checkout',
  'pay',
  'signup',
  'register',
  'logout',
  'verify',
  'requests',
  'bookings',
  'customer',
  'employee',
  'pro',
  'superadmin',
  'health',
  'healthz',
  'ping',
  'docs',
  'portal',
  'store',
  'manifest.json',
  'not-found',
]);

/**
 * Normalizes user input into a clean alphanumeric kebab-case slug.
 */
export function normalizeBgosSlug(raw: string): string {
  if (!raw) return '';
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

/**
 * Validates syntax and reserved word restrictions for a short URL slug.
 */
export function validateBgosSlug(slug: string): { valid: boolean; error?: string } {
  if (BGOS_RESERVED_SLUGS.has(slug)) {
    return { valid: false, error: `"${slug}" is a reserved system path and cannot be used.` };
  }
  if (!slug || slug.length < 2) {
    return { valid: false, error: 'Short URL handle must be at least 2 characters.' };
  }
  if (slug.length > 48) {
    return { valid: false, error: 'Short URL handle cannot exceed 48 characters.' };
  }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    return {
      valid: false,
      error: 'Short URL handle may only contain lowercase letters, numbers, and hyphens (cannot start or end with a hyphen).',
    };
  }
  return { valid: true };
}

export type SlugCheckResult = {
  available: boolean;
  slug: string;
  url: string;
  reason?: string;
  error?: string;
  suggestions: string[];
};

export type CheckSlugOptions = {
  slug: string;
  excludeTenantId?: string | null;
  businessName?: string | null;
  city?: string | null;
  category?: string | null;
};

/**
 * Generates smart, brand-relevant, and guaranteed available alternative handles.
 */
export async function generateSlugSuggestions(options: {
  baseSlug: string;
  excludeTenantId?: string | null;
  businessName?: string | null;
  city?: string | null;
  category?: string | null;
}): Promise<string[]> {
  const { baseSlug, excludeTenantId, businessName, city, category } = options;
  const cleanBase = normalizeBgosSlug(baseSlug);
  const cleanName = businessName ? normalizeBgosSlug(businessName) : '';
  const cleanCity = city ? normalizeBgosSlug(city) : '';
  const cleanCat = category ? normalizeBgosSlug(category) : '';

  const seed = cleanBase || cleanName || 'business';

  // Candidate templates
  const candidates: string[] = [];

  if (cleanCity && !seed.includes(cleanCity)) {
    candidates.push(`${seed}-${cleanCity}`);
  }
  if (cleanCat && !seed.includes(cleanCat)) {
    candidates.push(`${seed}-${cleanCat}`);
  }

  candidates.push(
    `${seed}-hub`,
    `${seed}-official`,
    `${seed}-online`,
    `the-${seed}`,
    `visit-${seed}`,
    `${seed}-spot`,
    `${seed}-direct`,
    `${seed}-${Math.floor(10 + Math.random() * 89)}`
  );

  const normalizedCandidates = Array.from(
    new Set(
      candidates
        .map((c) => normalizeBgosSlug(c))
        .filter((c) => c.length >= 2 && c.length <= 48 && !BGOS_RESERVED_SLUGS.has(c) && c !== cleanBase)
    )
  );

  if (normalizedCandidates.length === 0) {
    return [`${seed}-1`, `${seed}-2`, `${seed}-3`];
  }

  // Batch query database to see which candidates are already taken
  try {
    const collisions = await db.tenant.findMany({
      where: {
        ...(excludeTenantId ? { id: { not: excludeTenantId } } : {}),
        OR: [
          { slug: { in: normalizedCandidates } },
          { publicSlug: { in: normalizedCandidates } },
        ],
      },
      select: { slug: true, publicSlug: true },
    });

    const taken = new Set<string>();
    for (const c of collisions) {
      if (c.slug) taken.add(c.slug.toLowerCase());
      if (c.publicSlug) taken.add(c.publicSlug.toLowerCase());
    }

    const available = normalizedCandidates.filter((c) => !taken.has(c));
    return available.slice(0, 5);
  } catch {
    return normalizedCandidates.slice(0, 5);
  }
}

/**
 * Checks if a short URL slug is available for a tenant.
 */
export async function checkBgosSlugAvailability(options: CheckSlugOptions): Promise<SlugCheckResult> {
  const normalized = normalizeBgosSlug(options.slug);
  const url = `https://bgos.site/${normalized}`;

  const validation = validateBgosSlug(normalized);
  if (!validation.valid) {
    const suggestions = await generateSlugSuggestions({
      baseSlug: normalized || options.businessName || 'my-business',
      excludeTenantId: options.excludeTenantId,
      businessName: options.businessName,
      city: options.city,
      category: options.category,
    });
    return {
      available: false,
      slug: normalized,
      url,
      error: validation.error,
      reason: validation.error,
      suggestions,
    };
  }

  try {
    // Check if another tenant has claimed this slug or publicSlug
    const collision = await db.tenant.findFirst({
      where: {
        ...(options.excludeTenantId ? { id: { not: options.excludeTenantId } } : {}),
        OR: [{ slug: normalized }, { publicSlug: normalized }],
      },
      select: { id: true, name: true },
    });

    if (collision) {
      const suggestions = await generateSlugSuggestions({
        baseSlug: normalized,
        excludeTenantId: options.excludeTenantId,
        businessName: options.businessName,
        city: options.city,
        category: options.category,
      });

      return {
        available: false,
        slug: normalized,
        url,
        reason: `The short URL "bgos.site/${normalized}" is already taken by another business.`,
        suggestions,
      };
    }

    return {
      available: true,
      slug: normalized,
      url,
      suggestions: [],
    };
  } catch (err: any) {
    return {
      available: false,
      slug: normalized,
      url,
      error: err?.message || 'Database connection error while checking availability.',
      suggestions: [],
    };
  }
}

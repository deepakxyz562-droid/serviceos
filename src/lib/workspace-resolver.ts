import { db } from '@/lib/db';
import { cache } from '@/lib/cache';

/**
 * Resolve a workspace by custom domain.
 *
 * Used by the standalone Forms product to support per-workspace custom
 * domains (e.g., "forms.acme.com" → Acme's workspace).
 *
 * Cached for 5 minutes to avoid a DB round-trip on every request.
 * Bust by calling `cache.invalidateByPrefix('custom-domain:')` after
 * a workspace updates its customDomain.
 */
const CUSTOM_DOMAIN_TTL = 5 * 60_000;

export async function resolveWorkspaceByDomain(
  hostname: string
): Promise<{ id: string; name: string; productType: string; brandingJson: string } | null> {
  if (!hostname) return null;

  // Strip port if present
  const domain = hostname.split(':')[0].toLowerCase();

  // Check cache
  const cacheKey = `custom-domain:${domain}`;
  const cached = cache.get<{ id: string; name: string; productType: string; brandingJson: string }>(cacheKey);
  if (cached) return cached;

  try {
    const workspace = await db.workspace.findUnique({
      where: { customDomain: domain },
      select: {
        id: true,
        name: true,
        productType: true,
        brandingJson: true,
      },
    });

    if (workspace) {
      cache.set(cacheKey, workspace, CUSTOM_DOMAIN_TTL);
    }
    return workspace;
  } catch (error) {
    console.error('[resolveWorkspaceByDomain] Error:', error);
    return null;
  }
}

/**
 * Check if a hostname is a custom domain (not the default fieseros.com
 * or its subdomains).
 */
export function isCustomDomain(hostname: string): boolean {
  if (!hostname) return false;
  const domain = hostname.split(':')[0].toLowerCase();
  // Default domains that are NOT custom
  const defaultDomains = ['fieseros.com', 'www.fieseros.com', 'forms.fieseros.com', 'localhost', '127.0.0.1'];
  if (defaultDomains.includes(domain)) return false;
  // Any other domain is custom
  return !domain.endsWith('.fieseros.com');
}

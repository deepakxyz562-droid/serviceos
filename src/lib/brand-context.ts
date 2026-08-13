import { db } from '@/lib/db';

/**
 * Brand Brain — Engine 4
 * ----------------------
 * Captures a tenant's brand identity (voice, persona, audience, USPs, etc.)
 * so every AI-generated post/email/SMS is on-brand.
 *
 * This module is the SINGLE source of truth for "what brand context string
 * do we prepend to an AI prompt?" Every AI route that wants on-brand
 * generation calls `getBrandContext(tenantId)` and prepends the result as
 * the first system message in its `messages` array.
 *
 * The string is intentionally human-readable and structured — LLMs follow
 * labeled sections better than free-form prose.
 */

// Prisma's generated BrandProfile type. We import the type via `import type`
// so this file stays free of side-effects and is safe to import from both
// server routes and (via the type only) any shared module.
import type { BrandProfile } from '@prisma/client';

// ─── Types ─────────────────────────────────────────────────────────────────

/** Subset of BrandProfile that consumers actually need (UI + context). */
export type BrandProfileData = BrandProfile;

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Parse a JSON array column (services, products, forbiddenPhrases, competitors)
 * into a `string[]`. Returns `[]` on null/parse-failure/invalid-shape so
 * callers can safely `.join(', ')` without null-checks.
 */
function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((x): x is string => typeof x === 'string')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Append a labelled line to the context builder only if the value is
 * non-empty. Keeps the final string compact (no empty labels).
 */
function pushLine(lines: string[], label: string, value: string | null | undefined): void {
  if (value && value.trim()) {
    lines.push(`${label}: ${value.trim()}`);
  }
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Fetch the tenant's BrandProfile as a typed object.
 *
 * Returns `null` when the tenant has no BrandProfile yet (first-time setup),
 * or when `tenantId` is falsy (anonymous / unauthenticated call).
 *
 * Use this from UI routes that need the raw fields (e.g. the Brand Brain
 * admin form). For AI prompts, prefer `getBrandContext()` instead.
 */
export async function getBrandContextRaw(
  tenantId: string | null | undefined,
): Promise<BrandProfileData | null> {
  if (!tenantId) return null;
  try {
    const profile = await db.brandProfile.findUnique({
      where: { tenantId },
    });
    return profile ?? null;
  } catch (err) {
    console.error('[brand-context] getBrandContextRaw failed:', err);
    return null;
  }
}

/**
 * Build the system-prompt string the AI uses to stay on-brand.
 *
 * Format (only populated lines are included):
 *   You are writing content for {businessName}, a {industry} business in {location}.
 *   Target audience: {targetCustomer}
 *   Brand voice: {tone} — {voiceDescription}
 *   Key services: {services}
 *   USPs: {usps}
 *   Current offers: {currentOffers}
 *   Call to action: {defaultCta}
 *   Avoid these phrases: {forbiddenPhrases}
 *
 * If the tenant has no BrandProfile (or the lookup fails), returns a minimal
 * generic context so AI routes never crash and still produce reasonable
 * output. This is the "fail-open" pattern — better to generate *something*
 * on-brand-ish than to throw a 500.
 */
export async function getBrandContext(tenantId: string | null | undefined): Promise<string> {
  const profile = await getBrandContextRaw(tenantId);

  if (!profile) {
    return (
      'You are writing content for a small service business. ' +
      'Keep the tone professional, friendly, and concise. ' +
      'Do not invent prices, dates, or guarantees. ' +
      'Prefer clear calls-to-action that drive the reader to book or contact the business.'
    );
  }

  const services = parseJsonArray(profile.services);
  const products = parseJsonArray(profile.products);
  const forbidden = parseJsonArray(profile.forbiddenPhrases);
  const competitors = parseJsonArray(profile.competitors);

  const lines: string[] = [];

  // Identity (opener — always included if businessName is set)
  const industry = profile.industry?.trim() || 'service';
  const location = profile.location?.trim();
  const opener = location
    ? `You are writing content for ${profile.businessName}, a ${industry} business in ${location}.`
    : `You are writing content for ${profile.businessName}, a ${industry} business.`;
  lines.push(opener);

  if (profile.serviceArea?.trim()) {
    lines.push(`Service area: ${profile.serviceArea.trim()}`);
  }
  if (profile.website?.trim()) {
    lines.push(`Website: ${profile.website.trim()}`);
  }

  // Target audience
  pushLine(lines, 'Target audience', profile.targetCustomer);
  pushLine(lines, 'Customer pain points', profile.customerPainPoints);

  // Brand voice
  if (profile.tone?.trim() || profile.voiceDescription?.trim()) {
    const voiceParts: string[] = [];
    if (profile.tone?.trim()) voiceParts.push(profile.tone.trim());
    if (profile.voiceDescription?.trim()) voiceParts.push(profile.voiceDescription.trim());
    lines.push(`Brand voice: ${voiceParts.join(' — ')}`);
  }
  if (forbidden.length > 0) {
    lines.push(`Avoid these phrases: ${forbidden.join(', ')}`);
  }
  pushLine(lines, 'Call to action', profile.defaultCta);

  // Offering
  if (services.length > 0) {
    lines.push(`Key services: ${services.join(', ')}`);
  }
  if (products.length > 0) {
    lines.push(`Products: ${products.join(', ')}`);
  }
  pushLine(lines, 'USPs (unique selling points)', profile.usps);
  pushLine(lines, 'Current offers', profile.currentOffers);

  // Competitors (for tone differentiation — never copy them)
  if (competitors.length > 0) {
    lines.push(`Known competitors (differentiate from, do not mention by name unless asked): ${competitors.join(', ')}`);
  }

  // Closing guidance
  lines.push(
    'Stay on-brand: match the tone above, use the customer\'s language for pain points, ' +
      'and end with the call to action when appropriate. Never invent prices, dates, or guarantees not stated above.',
  );

  return lines.join('\n');
}

import { db } from '@/lib/db';
import { gatherBusinessEvidence } from './source-gatherer';
import { conductAiBusinessResearch } from './research-agent';
import type { StructuredBusinessIntelligence } from './types';

// In-memory cache for ultra-fast repeated lookups within the same process (10 min TTL)
const MEMORY_CACHE = new Map<string, { data: StructuredBusinessIntelligence; expiresAt: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Formats a StructuredBusinessIntelligence profile into an authoritative,
 * structured system prompt section for all AI modules.
 */
export function formatBusinessIntelligenceForPrompt(
  intelligence: StructuredBusinessIntelligence,
): string {
  const verifiedServices = intelligence.verifiedServices.map((s) => s.name).join(', ');
  const inferredServices = intelligence.inferredServices.map((s) => s.name).join(', ');
  const locationStr =
    intelligence.location.value?.formattedAddress ||
    intelligence.location.value?.city ||
    'Local area';

  return `=======================================================
BUSINESS INTELLIGENCE CONTEXT (AUTHORITATIVE & VERIFIED):
=======================================================
• Business Name: ${intelligence.businessName.value}
• Exact Industry: ${intelligence.industry.value}
• Primary Category: ${intelligence.businessCategory.value} (${intelligence.businessSubcategory.value})
• Business Type: ${intelligence.businessType.value}
• Location / Market: ${locationStr}
• Description: ${intelligence.description.value}
• Verified Services: ${verifiedServices || 'Custom services'}
${inferredServices ? `• Additional Industry Capabilities: ${inferredServices}` : ''}
• Target Audience: ${intelligence.targetAudience.value.join(', ')}
• Recommended Brand Tone: ${intelligence.brandTone.value}
• Recommended Content Themes:
${intelligence.marketingContentPillars.map((p) => `  - ${p}`).join('\n')}

STRICT NEGATIVE BOUNDARIES (ZERO TOLERANCE FOR CROSS-INDUSTRY CONTAMINATION):
The following topics and industries are strictly prohibited for this business:
${intelligence.negativeBoundaries.map((b) => `  - DO NOT mention ${b}`).join('\n')}
=======================================================`;
}

/**
 * Retrieves the business intelligence profile for a tenant.
 * Uses a tiered caching strategy:
 *  1. In-memory Map (fastest)
 *  2. DB settingsJson.businessIntelligence (persistent)
 *  3. On-demand AI Research Agent with Gemini / NVIDIA LLM (source-grounded)
 *
 * Automatically backfills and synchronizes the BrandProfile table with authentic values.
 */
export async function getBusinessIntelligence(
  tenantId: string,
  options?: { forceRefresh?: boolean },
): Promise<StructuredBusinessIntelligence> {
  if (!tenantId) {
    throw new Error('[business-intelligence] tenantId is required');
  }

  // 1. Check in-memory cache
  const cachedMem = MEMORY_CACHE.get(tenantId);
  if (!options?.forceRefresh && cachedMem && cachedMem.expiresAt > Date.now()) {
    return cachedMem.data;
  }

  // 2. Check DB settingsJson persistence (unless forced)
  if (!options?.forceRefresh) {
    try {
      const tenant = await db.tenant.findUnique({
        where: { id: tenantId },
        select: { settingsJson: true },
      });

      if (tenant?.settingsJson) {
        const parsed = JSON.parse(tenant.settingsJson);
        const stored = parsed?.businessIntelligence as StructuredBusinessIntelligence | undefined;

        if (
          stored &&
          stored.businessName?.value &&
          stored.industry?.value &&
          Array.isArray(stored.verifiedServices) &&
          Array.isArray(stored.marketingContentPillars) &&
          Array.isArray(stored.negativeBoundaries)
        ) {
          // Check age (valid for 14 days)
          const ageMs = Date.now() - Date.parse(stored.analyzedAt || '2000-01-01');
          if (Number.isFinite(ageMs) && ageMs < 14 * 24 * 60 * 60 * 1000) {
            MEMORY_CACHE.set(tenantId, { data: stored, expiresAt: Date.now() + CACHE_TTL_MS });
            return stored;
          }
        }
      }
    } catch (err) {
      console.warn(`[business-intelligence] Failed to read stored intelligence for ${tenantId}:`, err);
    }
  }

  // 3. Perform fresh AI business research
  const evidence = await gatherBusinessEvidence(tenantId);
  const intelligence = await conductAiBusinessResearch(evidence);

  // 4. Persist to DB settingsJson
  try {
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { settingsJson: true, brandProfile: { select: { id: true } } },
    });

    let currentSettings: Record<string, any> = {};
    if (tenant?.settingsJson) {
      try {
        currentSettings = JSON.parse(tenant.settingsJson);
      } catch {}
    }

    currentSettings.businessIntelligence = intelligence;
    currentSettings.locationCategory = intelligence.businessCategory.value;

    await db.tenant.update({
      where: { id: tenantId },
      data: {
        industry: intelligence.businessCategory.value,
        settingsJson: JSON.stringify(currentSettings),
      },
    });

    // 5. Synchronize BrandProfile table to heal placeholder data (Requirement 7)
    const verifiedServiceNames = intelligence.verifiedServices.map((s) => s.name);
    const summaryText = `${intelligence.businessName.value} is a leading ${intelligence.businessCategory.value} in ${
      intelligence.location.value?.formattedAddress || intelligence.location.value?.city || 'the local market'
    }, specializing in ${verifiedServiceNames.slice(0, 3).join(', ') || intelligence.businessSubcategory.value}.`;

    const existingBrandProfile = await db.brandProfile.findUnique({
      where: { tenantId },
    });

    if (existingBrandProfile) {
      await db.brandProfile.update({
        where: { id: existingBrandProfile.id },
        data: {
          businessName: intelligence.businessName.value,
          industry: intelligence.businessCategory.value,
          location:
            intelligence.location.value?.formattedAddress || intelligence.location.value?.city || undefined,
          services: JSON.stringify(verifiedServiceNames),
          aiGeneratedSummary: summaryText,
          tone: intelligence.brandTone.value,
        },
      });
    } else {
      await db.brandProfile.create({
        data: {
          tenantId,
          businessName: intelligence.businessName.value,
          industry: intelligence.businessCategory.value,
          location:
            intelligence.location.value?.formattedAddress || intelligence.location.value?.city || undefined,
          services: JSON.stringify(verifiedServiceNames),
          aiGeneratedSummary: summaryText,
          tone: intelligence.brandTone.value,
        },
      });
    }
  } catch (err) {
    console.warn(`[business-intelligence] Failed to persist intelligence for ${tenantId}:`, err);
  }

  // 6. Update in-memory cache
  MEMORY_CACHE.set(tenantId, { data: intelligence, expiresAt: Date.now() + CACHE_TTL_MS });

  return intelligence;
}

/**
 * Invalidates the cache for a tenant, triggering a fresh analysis on next access.
 */
export function invalidateBusinessIntelligence(tenantId: string): void {
  MEMORY_CACHE.delete(tenantId);
}

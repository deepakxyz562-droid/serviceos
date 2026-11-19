import { callAI } from '@/lib/ai-client';
import {
  getTenantSeoContext,
  upsertTenantStructuredServices,
  finalizeLocalizedServiceDescription,
  type StructuredSeoService,
} from '@/lib/gbp/seo-context';

export { finalizeLocalizedServiceDescription };
import { prepareGoogleAccount } from '@/lib/social/google-account-helper';
import { updateGoogleBusinessProfile } from '@/lib/social/adapters/googlebusiness';
import { invalidatePlacePayloadCache } from '@/app/api/gbp/place/route';
import { invalidateBootstrapCache } from '@/lib/bgos/bootstrap-cache';
import { getGbpCategoryByNameOrAlias } from '@/lib/gbp/master-category-catalog';

export interface ServiceOptimizeItemInput {
  id?: string;
  name: string;
  targetKeyword?: string;
  existingDescription?: string;
  category?: string;
}

export function pickKeywordForService(
  serviceName: string,
  priorityKeywords: string[],
): string {
  const tokens = serviceName
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3);

  let bestMatch: string | undefined;
  let bestScore = 0;

  for (const kw of priorityKeywords) {
    const kwLower = kw.toLowerCase();
    let score = 0;
    for (const token of tokens) {
      if (kwLower.includes(token)) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = kw;
    }
  }

  return bestMatch || serviceName;
}



/**
 * Generate 300-500 character localized descriptions (Search Term + City/Area) for one or more
 * services, persist them across settingsJson/db.service, and optionally sync live to Google GBP.
 */
export async function generateLocalizedServiceDescriptions(params: {
  tenantId: string;
  services: ServiceOptimizeItemInput[];
  save?: boolean;
  pushToGoogle?: boolean;
  locationId?: string;
}): Promise<{
  services: StructuredSeoService[];
  saved: boolean;
  syncedToGoogle: boolean;
  googleWarnings: string[];
}> {
  const ctx = await getTenantSeoContext(params.tenantId);
  if (!ctx) {
    throw new Error('Workspace SEO context could not be loaded.');
  }

  const city = ctx.city || ctx.serviceAreas[0] || 'Local Area';
  const priorityKeywords = ctx.priorityKeywords;

  let servicesInput = Array.isArray(params.services) && params.services.length > 0 ? params.services : [];
  if (servicesInput.length === 0) {
    // If services not explicitly provided, load existing catalog services needing 300-500 char upgrade
    servicesInput = (ctx.seoServices || []).map((s) => ({
      id: s.id,
      name: s.name,
      targetKeyword: s.targetKeyword,
      existingDescription: s.description,
      category: s.category,
    }));
  }

  // If still empty, seed recommendations from verified master category catalog
  if (servicesInput.length === 0) {
    const masterCat = getGbpCategoryByNameOrAlias(ctx.category || 'Local Services');
    if (masterCat && masterCat.coreProducts.length > 0) {
      servicesInput = masterCat.coreProducts.slice(0, 8).map((p) => ({
        name: p,
        category: masterCat.displayName,
      }));
    }
  }

  const targets = servicesInput
    .map((s) => ({
      id: s.id,
      name: String(s.name || '').trim(),
      targetKeyword: (s.targetKeyword || '').trim() || pickKeywordForService(String(s.name || ''), priorityKeywords),
      existingDescription: (s.existingDescription || '').trim(),
      category: s.category || ctx.category || 'general',
    }))
    .filter((s) => s.name.length > 0)
    .slice(0, 20);

  if (targets.length === 0) {
    return { services: [], saved: false, syncedToGoogle: false, googleWarnings: [] };
  }

  const prompt = `You are a Google Business Profile Local SEO copywriter.
Business: "${ctx.businessName}"
Category: "${ctx.category || 'Local Services'}"
Primary City/Location: "${city}"
${ctx.serviceAreas.length > 0 ? `Nearby Service Areas: ${ctx.serviceAreas.join(', ')}` : ''}
${ctx.searchTerms.length > 0 ? `Top Customer Google Search Terms: ${ctx.searchTerms.slice(0, 10).map((s) => s.keyword).join(', ')}` : ''}

Task:
Write a unique, high-converting Google Business Profile service description for EACH service below.

STRICT RULES FOR EVERY DESCRIPTION:
1. Length MUST be strictly between 320 and 475 characters (never under 300 or over 500).
2. MUST naturally include the service's Target Keyword AND "${city}" (plus a neighborhood/service area if relevant).
3. NO spammy keyword lists, NO URLs, NO phone numbers, NO HTML, NO exclamation spam.
4. Explain customer value, reliability, and end with a concise booking/quote call to action.

Services to write for:
${targets.map((t, i) => `${i + 1}. Service: "${t.name}" | Target Keyword: "${t.targetKeyword}"`).join('\n')}

Respond ONLY with a valid JSON array matching the exact order above:
[
  { "name": "exact service name", "targetKeyword": "used keyword", "description": "320-475 char localized SEO description" }
]`;

  let aiRows: Array<{ name?: string; targetKeyword?: string; description?: string }> = [];
  try {
    const aiRes = await callAI({
      messages: [
        { role: 'system', content: 'Return ONLY valid JSON array with no markdown fences.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.45,
      usageContext: { tenantId: params.tenantId, feature: 'gbp_service_seo_writer' },
    });
    const raw = (aiRes?.content || '').replace(/```json/gi, '').replace(/```/g, '').trim();
    const match = raw.match(/\[[\s\S]*\]/);
    const parsed = JSON.parse(match ? match[0] : raw);
    if (Array.isArray(parsed)) aiRows = parsed;
  } catch (err) {
    console.warn('[service-optimizer] AI generation fallback activated:', err instanceof Error ? err.message : err);
  }

  const generated: StructuredSeoService[] = targets.map((target, idx) => {
    const byName = aiRows.find((r) => r?.name?.trim().toLowerCase() === target.name.toLowerCase()) || aiRows[idx];
    const finalizedDesc = finalizeLocalizedServiceDescription(String(byName?.description || ''), {
      serviceName: target.name,
      targetKeyword: target.targetKeyword,
      city,
      businessName: ctx.businessName,
      serviceAreas: ctx.serviceAreas,
    });
    return {
      id: target.id,
      name: target.name,
      targetKeyword: byName?.targetKeyword?.trim() || target.targetKeyword,
      description: finalizedDesc,
      category: target.category,
      syncedToGoogle: false,
    };
  });

  let finalList = generated;
  let saved = false;
  let syncedToGoogle = false;
  let googleWarnings: string[] = [];

  if (params.save) {
    // Merge generated updates into full existing service catalog so unedited items aren't dropped
    const mergedMap = new Map<string, StructuredSeoService>(
      ctx.seoServices.map((s) => [s.name.toLowerCase(), s]),
    );
    for (const item of generated) {
      mergedMap.set(item.name.toLowerCase(), item);
    }
    const mergedAll = Array.from(mergedMap.values());

    if (params.pushToGoogle) {
      try {
        const googleAccount = await prepareGoogleAccount(params.tenantId, params.locationId);
        if (googleAccount?.accessToken) {
          const pushRes = await updateGoogleBusinessProfile(googleAccount, {
            serviceItems: mergedAll.map((s) => ({
              name: s.name,
              description: s.description,
            })),
          });
          googleWarnings = pushRes.warnings;
          syncedToGoogle = pushRes.appliedMasks.includes('serviceItems');
          if (syncedToGoogle) {
            for (const item of mergedAll) item.syncedToGoogle = true;
          }
        }
      } catch (err: unknown) {
        googleWarnings.push(err instanceof Error ? err.message : 'Google service sync notice');
      }
    }

    await upsertTenantStructuredServices(params.tenantId, mergedAll);
    saved = true;
    finalList = generated.map((g) => ({ ...g, syncedToGoogle: syncedToGoogle || g.syncedToGoogle }));
    invalidatePlacePayloadCache(params.tenantId);
    invalidateBootstrapCache(params.tenantId);
  }

  return { services: finalList, saved, syncedToGoogle, googleWarnings };
}

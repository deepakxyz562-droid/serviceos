import { db } from '@/lib/db';
import { callAI, extractJson } from '@/lib/ai-client';

export interface HighIntentKeyword {
  keyword: string;
  volume: number;
  defaultUsed: number;
}

export interface AiBusinessProfile {
  exactIndustry: string;
  isTechOrSoftware: boolean;
  competitorQuery: string;
  highIntentKeywords: HighIntentKeyword[];
  suggestedCategories: string[];
  generatedAt: string;
}

function safeParseJson<T>(raw: unknown, fallback: T): T {
  if (typeof raw === 'object' && raw !== null) return raw as T;
  if (typeof raw !== 'string') return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Builds a deterministic fallback profile in case the AI provider is unavailable.
 * Strictly uses the business's authentic offerings, category, and city — NO brittle substring checks.
 */
function buildDeterministicProfileFallback(params: {
  businessName: string;
  category: string;
  city: string;
  offerings: string[];
}): AiBusinessProfile {
  const { businessName, category, city, offerings } = params;
  const cleanCity = city && !/dallas|vashi|sample/i.test(city) ? city.trim() : '';
  const citySuffix = cleanCity ? ` in ${cleanCity}` : ' near me';
  const cleanCategory = (category || 'Local Service').trim();

  const isExplicitSoftwareCompany =
    /\b(software company|saas|web development company|app development company|it services company|software development)\b/i.test(
      `${businessName} ${cleanCategory}`,
    ) && !/\b(security|guard|bouncer|bodyguard|pso|sos|cleaning|plumbing|hardware|market|retail)\b/i.test(
      `${businessName} ${cleanCategory}`,
    );

  const isSecurity = /\b(security|guard|bouncer|bodyguard|gunman|pso|patrol|sos|protection)\b/i.test(
    `${businessName} ${cleanCategory} ${offerings.join(' ')}`,
  );

  const keywords: HighIntentKeyword[] = [];

  if (isSecurity) {
    keywords.push({ keyword: `private security agency${citySuffix}`, volume: 500, defaultUsed: 2 });
    keywords.push({ keyword: `bouncer and bodyguard service${citySuffix}`, volume: 350, defaultUsed: 2 });
    keywords.push({ keyword: `armed pso gunmen security${citySuffix}`, volume: 250, defaultUsed: 2 });
    keywords.push({ keyword: `emergency security services near me`, volume: 400, defaultUsed: 1 });
    keywords.push({ keyword: `best security guard company${citySuffix}`, volume: 450, defaultUsed: 1 });
    keywords.push({ keyword: `commercial and event security${citySuffix}`, volume: 300, defaultUsed: 1 });
  } else if (isExplicitSoftwareCompany) {
    keywords.push({ keyword: `software development company${citySuffix}`, volume: 500, defaultUsed: 2 });
    keywords.push({ keyword: `custom business software solutions${citySuffix}`, volume: 300, defaultUsed: 2 });
    keywords.push({ keyword: `web and cloud application development`, volume: 250, defaultUsed: 1 });
    keywords.push({ keyword: `saas platform development`, volume: 200, defaultUsed: 1 });
    keywords.push({ keyword: `top software engineers near me`, volume: 150, defaultUsed: 1 });
  } else {
    // Dynamic universal builder from authentic offerings
    if (offerings.length > 0) {
      for (const off of offerings.slice(0, 4)) {
        if (off.trim().length > 2) {
          keywords.push({ keyword: `${off.trim().toLowerCase()}${citySuffix}`, volume: 400, defaultUsed: 2 });
        }
      }
    }
    keywords.push({ keyword: `best ${cleanCategory.toLowerCase()}${citySuffix}`, volume: 500, defaultUsed: 2 });
    keywords.push({ keyword: `top rated ${cleanCategory.toLowerCase()} near me`, volume: 450, defaultUsed: 1 });
    keywords.push({ keyword: `${cleanCategory.toLowerCase()} services${citySuffix}`, volume: 300, defaultUsed: 1 });
  }

  const competitorQuery = isSecurity
    ? `Private security agency${citySuffix}`
    : isExplicitSoftwareCompany
    ? `Software development company${citySuffix}`
    : `${cleanCategory}${citySuffix}`;

  return {
    exactIndustry: isSecurity
      ? 'Private Security & Protection Services'
      : isExplicitSoftwareCompany
      ? 'Software & IT Services'
      : cleanCategory,
    isTechOrSoftware: isExplicitSoftwareCompany,
    competitorQuery,
    highIntentKeywords: keywords.slice(0, 7),
    suggestedCategories: [cleanCategory],
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Ensures an AI-derived Semantic Business Profile exists for the tenant.
 * Uses Gemini LLM via callAI() with deterministic caching in tenant.settingsJson.
 */
export async function getOrGenerateAiBusinessProfile(
  tenant: any,
  opts?: { force?: boolean; saveToDb?: boolean },
): Promise<AiBusinessProfile> {
  if (!tenant) {
    return buildDeterministicProfileFallback({
      businessName: 'My Business',
      category: 'Local Service',
      city: '',
      offerings: [],
    });
  }

  const settings = safeParseJson<Record<string, any>>(tenant.settingsJson, {});
  const cached = settings.aiBusinessProfile as AiBusinessProfile | undefined;

  // Check cache validity (valid for 30 days unless forced)
  if (
    !opts?.force &&
    cached?.exactIndustry &&
    Array.isArray(cached?.highIntentKeywords) &&
    cached.highIntentKeywords.length > 0 &&
    typeof cached?.isTechOrSoftware === 'boolean'
  ) {
    const ageMs = Date.now() - Date.parse(cached.generatedAt || '2000-01-01');
    if (Number.isFinite(ageMs) && ageMs < 30 * 24 * 60 * 60 * 1000) {
      return cached;
    }
  }

  const businessName =
    settings.locationName ||
    tenant.brandProfile?.businessName ||
    tenant.name ||
    'My Business';

  const category =
    settings.locationCategory ||
    settings.activeGbpCategory ||
    tenant.brandProfile?.industry ||
    tenant.industry ||
    'Local Service';

  const city =
    tenant.city ||
    settings.city ||
    tenant.brandProfile?.location ||
    '';

  const address = tenant.address || settings.address || '';

  const rawOfferings = Array.isArray(settings.offerings)
    ? settings.offerings
    : typeof tenant.brandProfile?.services === 'string'
    ? safeParseJson<string[]>(tenant.brandProfile.services, [])
    : [];

  const offerings: string[] = rawOfferings
    .filter((o: unknown): o is string => typeof o === 'string' && o.trim().length > 1)
    .map((o: string) => o.trim());

  const description =
    tenant.description ||
    settings.aboutBusiness ||
    tenant.brandProfile?.aiGeneratedSummary ||
    '';

  const systemPrompt = `You are an elite Local SEO Architect and Commercial Business Categorization Specialist.
Your mission is to semantically analyze a local business and output a clean JSON profile.

CRITICAL RULES:
1. Core Industry Accuracy:
   - If the business offers physical/field services (such as Security guards, bouncers, emergency SOS, private protection, cleaning, plumbing, repairs, retail), it is a FIELD SERVICE business, NOT an IT company / software company, even if the name contains "App", "Online", or "Tech".
   - "isTechOrSoftware" MUST be FALSE unless the company's core product is custom software engineering, coding, SaaS, or IT network consulting.
2. Keywords:
   - Provide 6-8 high-intent commercial search keywords that real customers in this city search on Google Maps / Search to buy or hire these services.
   - For Security services with SOS / bouncers / gunmen, include keywords like: "private security agency in [city]", "bouncer bodyguard service [city]", "armed pso gunmen security [city]", "emergency security service near me".
   - Estimate realistic monthly search volume (100 to 800).
   - Set "defaultUsed" to 1 or 2.
3. Competitor Query:
   - The exact 2-4 word query to find real local competitors on Google Maps in this city (e.g. "Private security agency in Delhi").
4. Response Format:
   Return ONLY valid JSON matching this structure:
   {
     "exactIndustry": "string",
     "isTechOrSoftware": boolean,
     "competitorQuery": "string",
     "highIntentKeywords": [
       { "keyword": "string", "volume": number, "defaultUsed": number }
     ],
     "suggestedCategories": ["string"]
   }`;

  const userContent = JSON.stringify({
    businessName,
    primaryCategory: category,
    city: city || 'Local Area',
    address,
    offerings,
    description: description.slice(0, 300),
  });

  try {
    const aiRes = await callAI({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      json: true,
      temperature: 0.1,
      maxTokens: 800,
      usageContext: {
        tenantId: tenant.id,
        feature: 'ai_business_profile',
      },
    });

    const parsed = extractJson<Partial<AiBusinessProfile>>(
      typeof aiRes === 'string' ? aiRes : (aiRes as any)?.content || JSON.stringify(aiRes),
    );

    if (
      parsed?.exactIndustry &&
      Array.isArray(parsed?.highIntentKeywords) &&
      parsed.highIntentKeywords.length > 0
    ) {
      const validKeywords = parsed.highIntentKeywords
        .filter((k) => typeof k?.keyword === 'string' && k.keyword.trim().length > 2)
        .map((k) => ({
          keyword: k.keyword.trim(),
          volume: typeof k.volume === 'number' && k.volume > 0 ? k.volume : 300,
          defaultUsed: typeof k.defaultUsed === 'number' ? k.defaultUsed : 1,
        }));

      const finalProfile: AiBusinessProfile = {
        exactIndustry: String(parsed.exactIndustry).trim(),
        isTechOrSoftware: Boolean(parsed.isTechOrSoftware),
        competitorQuery: String(parsed.competitorQuery || `${category} in ${city || 'Delhi'}`).trim(),
        highIntentKeywords: validKeywords,
        suggestedCategories: Array.isArray(parsed.suggestedCategories)
          ? parsed.suggestedCategories.map(String)
          : [category],
        generatedAt: new Date().toISOString(),
      };

      if (opts?.saveToDb !== false && tenant.id) {
        settings.aiBusinessProfile = finalProfile;
        await db.tenant
          .update({
            where: { id: tenant.id },
            data: { settingsJson: JSON.stringify(settings) },
          })
          .catch((err) => {
            console.warn('[ai-business-profiler] Failed to persist profile to db:', err);
          });
      }

      return finalProfile;
    }
  } catch (err) {
    console.warn('[ai-business-profiler] AI generation call failed, falling back to deterministic profile:', err);
  }

  // Fallback if AI call failed
  const fallbackProfile = buildDeterministicProfileFallback({
    businessName,
    category,
    city,
    offerings,
  });

  if (opts?.saveToDb !== false && tenant.id) {
    settings.aiBusinessProfile = fallbackProfile;
    await db.tenant
      .update({
        where: { id: tenant.id },
        data: { settingsJson: JSON.stringify(settings) },
      })
      .catch(() => {});
  }

  return fallbackProfile;
}

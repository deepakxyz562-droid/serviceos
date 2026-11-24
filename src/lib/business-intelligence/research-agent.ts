import { callAI, extractJson } from '@/lib/ai-client';
import type {
  BusinessIntelligenceRawEvidence,
  StructuredBusinessIntelligence,
  ServiceItem,
} from './types';

/**
 * Builds the comprehensive AI research prompt.
 */
function buildResearchPrompt(evidence: BusinessIntelligenceRawEvidence): string {
  const reviewsSummary = evidence.recentReviews?.length
    ? evidence.recentReviews.slice(0, 5).map((r, i) => `[Review ${i + 1} - ${r.rating}★]: "${r.text}"`).join('\n')
    : 'No customer reviews available yet.';

  const offeringsSummary = evidence.offeringsFromSettings?.length
    ? evidence.offeringsFromSettings.join(', ')
    : 'None explicitly listed.';

  return `Analyze this business and return a structured JSON profile.
EVIDENCE:
• Business Name: "${evidence.businessName}"
• Database Industry: ${evidence.industryFromDb || 'Not specified'}
• Location: ${evidence.addressFromDb || evidence.cityFromDb || 'Not specified'}
• Google Business Profile Category: ${evidence.gbpPrimaryCategory || 'Not connected'}
• Additional Categories: ${evidence.gbpAdditionalCategories?.join(', ') || 'None'}
• Verified Offerings: ${offeringsSummary}
• Description: ${evidence.aboutBusinessFromSettings?.[0] || 'None'}
• Real Customer Reviews:
${reviewsSummary}

RULES:
1. Grounding: Do NOT guess services from name alone. If it is a Film Studio, it is in Entertainment & Media / Film Production, NOT IT consulting or dentistry.
2. Separate verified_services (explicit evidence in reviews, category, offerings) from inferred_services (standard industry offerings).
3. List 4–6 marketing_content_pillars specific to this business.
4. List 5–8 negative_boundaries: industries/topics this business strictly DOES NOT DO (e.g. non-tech businesses must strictly forbid "IT Strategy & Consulting", "Software Engineering", "Cloud Migration", "Cybersecurity").
5. Return compact JSON ONLY.

JSON SCHEMA:
{
  "business_name": "${evidence.businessName}",
  "industry": "string",
  "business_category": "string",
  "business_subcategory": "string",
  "business_type": "Creative Studio|Service Business|Physical Location|Retail|Hospitality|Healthcare|Home Services|Technology|Other",
  "description": "string",
  "verified_services": [
    { "name": "string", "source": "google_business_profile|customer_reviews|database_records", "evidence": "string" }
  ],
  "inferred_services": ["string"],
  "unknown_attributes": ["string"],
  "target_audience": ["string"],
  "business_model": "string",
  "location": { "city": "string", "state": "string", "formatted_address": "string" },
  "marketing_content_pillars": ["string"],
  "negative_boundaries": ["string"],
  "brand_tone": "string",
  "usps": ["string"],
  "confidence_score": 85
}`;
}

/**
 * Executes AI research to generate the structured Business Intelligence profile.
 */
export async function conductAiBusinessResearch(
  evidence: BusinessIntelligenceRawEvidence,
): Promise<StructuredBusinessIntelligence> {
  const prompt = buildResearchPrompt(evidence);

  const aiRes = await callAI({
    messages: [
      {
        role: 'system',
        content:
          'You are an elite AI Business Intelligence Specialist. Output valid, compact JSON only. Never fabricate services.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.1,
    maxTokens: 4096,
  });

  const parsed = extractJson<any>(aiRes.content);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`[business-intelligence] Failed to parse AI research JSON: ${aiRes.content.slice(0, 200)}`);
  }

  // Calculate sources used
  const sourcesSet = new Set<any>();
  if (evidence.gbpPrimaryCategory || evidence.gbpLocationName) sourcesSet.add('google_business_profile');
  if (evidence.recentReviews?.length) sourcesSet.add('customer_reviews');
  if (evidence.websiteUrl) sourcesSet.add('business_website');
  if (evidence.businessName || evidence.industryFromDb || evidence.offeringsFromSettings?.length) {
    sourcesSet.add('database_records');
  }
  sourcesSet.add('ai_inference');

  // Map verified_services
  const rawVerified = Array.isArray(parsed.verified_services) ? parsed.verified_services : [];
  const verifiedServices: ServiceItem[] = rawVerified.map((s: any) => ({
    name: typeof s === 'string' ? s : s.name || '',
    category: typeof s === 'object' ? s.category : undefined,
    confidence: 'VERIFIED' as const,
    source: (typeof s === 'object' && s.source) || 'customer_reviews',
    evidenceSnippet: typeof s === 'object' ? s.evidence : undefined,
  })).filter((s: ServiceItem) => s.name.trim().length > 0);

  // Map inferred_services
  const rawInferred = Array.isArray(parsed.inferred_services) ? parsed.inferred_services : [];
  const inferredServices: ServiceItem[] = rawInferred.map((s: any) => ({
    name: typeof s === 'string' ? s : s.name || '',
    confidence: 'INFERRED' as const,
    source: 'ai_inference' as const,
  })).filter((s: ServiceItem) => s.name.trim().length > 0);

  const marketingContentPillars: string[] = Array.isArray(parsed.marketing_content_pillars)
    ? parsed.marketing_content_pillars.filter((p: any) => typeof p === 'string' && p.trim().length > 0)
    : [];

  const negativeBoundaries: string[] = Array.isArray(parsed.negative_boundaries)
    ? parsed.negative_boundaries.filter((n: any) => typeof n === 'string' && n.trim().length > 0)
    : [];

  const unknownAttributes: string[] = Array.isArray(parsed.unknown_attributes)
    ? parsed.unknown_attributes.filter((u: any) => typeof u === 'string' && u.trim().length > 0)
    : [];

  const targetAudienceValues: string[] = Array.isArray(parsed.target_audience)
    ? parsed.target_audience
    : ['Local customers and clients'];

  const usps: string[] = Array.isArray(parsed.usps)
    ? parsed.usps.filter((u: any) => typeof u === 'string' && u.trim().length > 0)
    : [];

  const confidenceScore = typeof parsed.confidence_score === 'number'
    ? Math.min(100, Math.max(0, parsed.confidence_score))
    : verifiedServices.length > 0 ? 90 : 70;

  return {
    businessName: {
      value: parsed.business_name || evidence.businessName,
      confidence: 'VERIFIED',
      source: 'database_records',
    },
    industry: {
      value: parsed.industry || evidence.industryFromDb || 'Service Business',
      confidence: 'VERIFIED',
      source: evidence.gbpPrimaryCategory ? 'google_business_profile' : 'database_records',
    },
    businessCategory: {
      value: parsed.business_category || evidence.gbpPrimaryCategory || evidence.industryFromDb || 'Local Service',
      confidence: 'VERIFIED',
      source: 'google_business_profile',
    },
    businessSubcategory: {
      value: parsed.business_subcategory || parsed.business_category || 'Specialized Service',
      confidence: 'INFERRED',
      source: 'ai_inference',
    },
    businessType: {
      value: parsed.business_type || 'Service Business',
      confidence: 'VERIFIED',
      source: 'database_records',
    },
    description: {
      value:
        parsed.description ||
        `${evidence.businessName} provides specialized services tailored to its local and commercial clients.`,
      confidence: 'VERIFIED',
      source: 'database_records',
    },
    verifiedServices,
    inferredServices,
    unknownAttributes,
    products: [],
    targetAudience: {
      value: targetAudienceValues,
      confidence: 'INFERRED',
      source: 'customer_reviews',
    },
    businessModel: {
      value: parsed.business_model || 'Direct Service & Project Contracts',
      confidence: 'INFERRED',
      source: 'database_records',
    },
    location: {
      value: parsed.location || {
        city: evidence.cityFromDb || undefined,
        formattedAddress: evidence.addressFromDb || undefined,
      },
      confidence: evidence.addressFromDb ? 'VERIFIED' : 'INFERRED',
      source: 'database_records',
    },
    marketingContentPillars: marketingContentPillars.length > 0 ? marketingContentPillars : [
      'Featured Services Spotlight',
      'Behind the Scenes & Process',
      'Client Results & Transformations',
      'Expert Advice & Industry Tips',
    ],
    negativeBoundaries: negativeBoundaries.length > 0 ? negativeBoundaries : [
      'IT Strategy & Consulting',
      'Software Engineering & Cloud Architecture',
      'Cybersecurity & Network Auditing',
    ],
    brandTone: {
      value: parsed.brand_tone || 'Professional, creative, engaging and customer-centric',
      confidence: 'INFERRED',
      source: 'database_records',
    },
    usps,
    confidenceScore,
    sourcesUsed: Array.from(sourcesSet),
    analyzedAt: new Date().toISOString(),
    version: 1,
  };
}

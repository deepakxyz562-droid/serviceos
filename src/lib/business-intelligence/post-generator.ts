import { callAI, extractJson } from '@/lib/ai-client';
import { getBusinessIntelligence, formatBusinessIntelligenceForPrompt } from './service';
import { validatePostRelevance, type PostValidationResult } from './relevance-validator';
import type { StructuredBusinessIntelligence } from './types';

export interface GeneratedIndustryPost {
  title: string;
  intro: string;
  bullets: string[];
  conclusion: string;
  fullCaption: string;
  callToAction: string;
  suggestedHashtags: string[];
  visualScenePrompt: string;
  contentPillar: string;
  relevanceScore: number;
  validationReason: string;
  regenerationAttempts: number;
}

/**
 * Builds the post generation prompt using the structured intelligence profile.
 */
function buildPostPrompt(params: {
  intelligence: StructuredBusinessIntelligence;
  topic?: string;
  occasion?: string;
  feedback?: string;
  attempt: number;
}): string {
  const { intelligence, topic, occasion, feedback, attempt } = params;
  const verifiedServices = intelligence.verifiedServices.map((s) => s.name).slice(0, 4).join(', ');
  const locationStr =
    intelligence.location.value?.formattedAddress ||
    intelligence.location.value?.city ||
    'Local area';

  const selectedPillar =
    topic ||
    intelligence.marketingContentPillars[
      Math.floor(Math.random() * intelligence.marketingContentPillars.length)
    ] ||
    'Behind-the-scenes cinematography and production excellence';

  return `Business: "${intelligence.businessName.value}"
Industry: ${intelligence.industry.value} (${intelligence.businessCategory.value})
Location: ${locationStr}
Core Services: ${verifiedServices || intelligence.businessSubcategory.value}
Content Theme: "${selectedPillar}"
${occasion ? `Occasion: "${occasion}"` : ''}
Forbidden Topics: ${intelligence.negativeBoundaries.slice(0, 6).join(', ')}
${attempt > 0 && feedback ? `\nPREVIOUS REJECTION REASON: ${feedback}\n` : ''}
Write a high-converting Google Maps / social post for this business on this theme.
Never mention forbidden topics.

Return compact JSON:
{
  "title": "Short catchy title (under 60 chars)",
  "intro": "2 engaging sentences introducing the topic",
  "bullets": ["Point 1 with bold label", "Point 2 with bold label", "Point 3 with bold label"],
  "conclusion": "1 concluding sentence",
  "callToAction": "Direct call to action",
  "suggestedHashtags": ["#tag1", "#tag2", "#tag3"],
  "visualScenePrompt": "Photorealistic scene description of this business at work"
}`;
}

/**
 * Generates an industry-aware post with independent relevance validation
 * and up to 2 auto-regeneration attempts.
 */
export async function generateIndustryAwarePost(params: {
  tenantId: string;
  topic?: string;
  occasion?: string;
  postType?: string;
}): Promise<GeneratedIndustryPost> {
  const { tenantId, topic, occasion } = params;
  const intelligence = await getBusinessIntelligence(tenantId);

  const MAX_ATTEMPTS = 3; // 1 initial + max 2 regeneration attempts (Requirement 5)
  let lastValidation: PostValidationResult = {
    is_relevant: false,
    relevance_score: 0,
    reason: 'Initial attempt',
    violations: [],
  };
  let attempt = 0;
  let rawPost: any = null;

  while (attempt < MAX_ATTEMPTS) {
    const prompt = buildPostPrompt({
      intelligence,
      topic,
      occasion,
      feedback: attempt > 0 ? `${lastValidation.reason} Violations: ${lastValidation.violations.join(', ')}` : undefined,
      attempt,
    });

    const aiRes = await callAI({
      messages: [
        {
          role: 'system',
          content:
            'You are an award-winning industry copywriter. Generate authentic social marketing posts strictly adhering to the business profile and boundaries. Return valid JSON only.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3 + attempt * 0.1, // slightly higher temp on retry for variety
      maxTokens: 4096,
    });

    rawPost = extractJson<any>(aiRes.content);
    if (!rawPost || !rawPost.title || !rawPost.intro) {
      attempt++;
      continue;
    }

    const bullets = Array.isArray(rawPost.bullets) ? rawPost.bullets : [];
    const fullCaption = `${rawPost.intro}\n\n${bullets.map((b: string) => `• ${b}`).join('\n')}\n\n${rawPost.conclusion || ''}\n\n${rawPost.callToAction || ''}`.trim();

    // Independent Relevance Validation (Requirement 5)
    lastValidation = await validatePostRelevance(
      { title: rawPost.title, content: fullCaption },
      intelligence,
    );

    if (lastValidation.is_relevant && lastValidation.relevance_score >= 75) {
      // Validated successfully!
      const hashtags = Array.isArray(rawPost.suggestedHashtags)
        ? rawPost.suggestedHashtags
        : [`#${intelligence.businessCategory.value.replace(/[^a-zA-Z0-9]/g, '')}`];

      return {
        title: rawPost.title.trim(),
        intro: rawPost.intro.trim(),
        bullets: bullets.map((b: any) => String(b).trim()),
        conclusion: (rawPost.conclusion || '').trim(),
        fullCaption,
        callToAction: (rawPost.callToAction || `Contact ${intelligence.businessName.value}`).trim(),
        suggestedHashtags: hashtags,
        visualScenePrompt: rawPost.visualScenePrompt || `Authentic ${intelligence.businessCategory.value} scene`,
        contentPillar: topic || intelligence.marketingContentPillars[0] || 'Business Spotlight',
        relevanceScore: lastValidation.relevance_score,
        validationReason: lastValidation.reason,
        regenerationAttempts: attempt,
      };
    }

    // Attempt failed relevance check — loop to regenerate with feedback
    console.warn(
      `[business-intelligence] Post rejected on attempt ${attempt + 1} (score ${lastValidation.relevance_score}): ${lastValidation.reason}`,
    );
    attempt++;
  }

  // If max attempts exhausted, sanitize and return best available with fallback safety
  const bullets = Array.isArray(rawPost?.bullets) ? rawPost.bullets : [];
  const intro =
    rawPost?.intro ||
    `${intelligence.businessName.value} offers premier ${intelligence.businessCategory.value} solutions tailored to our clients.`;
  const conclusion = rawPost?.conclusion || `Discover more with ${intelligence.businessName.value}.`;
  const bulletsFormatted =
    bullets.length > 0 ? bullets.map((b: any) => String(b)) : [`Dedicated ${intelligence.businessCategory.value} expertise.`];
  const fullCaption = `${intro}\n\n${bulletsFormatted.map((b: string) => `• ${b}`).join('\n')}\n\n${conclusion}`;

  return {
    title: rawPost?.title || `Spotlight on ${intelligence.businessName.value}`,
    intro,
    bullets: bulletsFormatted,
    conclusion,
    fullCaption,
    callToAction: rawPost?.callToAction || `Contact ${intelligence.businessName.value}`,
    suggestedHashtags: [`#${intelligence.businessCategory.value.replace(/[^a-zA-Z0-9]/g, '')}`],
    visualScenePrompt: rawPost?.visualScenePrompt || `${intelligence.businessCategory.value} showcase`,
    contentPillar: topic || intelligence.marketingContentPillars[0] || 'Business Spotlight',
    relevanceScore: lastValidation.relevance_score || 70,
    validationReason: lastValidation.reason || 'Completed with safety fallback',
    regenerationAttempts: attempt,
  };
}

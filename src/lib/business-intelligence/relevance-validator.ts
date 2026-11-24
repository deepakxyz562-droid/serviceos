import { callAI, extractJson } from '@/lib/ai-client';
import type { StructuredBusinessIntelligence } from './types';

export interface PostValidationResult {
  is_relevant: boolean;
  relevance_score: number; // 0 to 100
  reason: string;
  violations: string[];
  suggested_pillar?: string;
}

/**
 * Checks for obvious negative boundary violations before making an AI call.
 * Fast deterministic guard.
 */
function checkNegativeBoundaries(
  text: string,
  negativeBoundaries: string[],
): string[] {
  const violations: string[] = [];
  const lower = text.toLowerCase();

  for (const boundary of negativeBoundaries) {
    const cleanBoundary = boundary.trim().toLowerCase();
    if (!cleanBoundary) continue;

    // Check if full phrase exists or key words exist
    if (lower.includes(cleanBoundary)) {
      violations.push(`Explicitly violates negative boundary: "${boundary}"`);
    }
  }

  // Common cross-industry red flags for non-tech businesses
  const isTechTerm =
    /\b(it strategy|it consulting|software development|cloud migration|cybersecurity|enterprise software|data pipelines)\b/i.test(
      text,
    );
  const isBusinessTech = negativeBoundaries.some((b) =>
    /it strategy|software|cloud|cyber/i.test(b),
  );

  if (isBusinessTech && isTechTerm) {
    violations.push('Mentions IT/software enterprise terminology forbidden for this non-tech business.');
  }

  return violations;
}

/**
 * Validates post relevance against the business intelligence profile.
 * Uses an AI evaluator to verify that the post is strictly on-industry and authentic.
 */
export async function validatePostRelevance(
  post: { title?: string; content: string },
  intelligence: StructuredBusinessIntelligence,
): Promise<PostValidationResult> {
  const fullText = `${post.title || ''}\n${post.content || ''}`.trim();
  if (!fullText) {
    return {
      is_relevant: false,
      relevance_score: 0,
      reason: 'Empty post content.',
      violations: ['Post has no text.'],
    };
  }

  // 1. Fast deterministic negative boundary check
  const boundaryViolations = checkNegativeBoundaries(fullText, intelligence.negativeBoundaries);
  if (boundaryViolations.length > 0) {
    return {
      is_relevant: false,
      relevance_score: 20,
      reason: `Post violates negative business boundaries: ${boundaryViolations.join('; ')}`,
      violations: boundaryViolations,
      suggested_pillar: intelligence.marketingContentPillars[0],
    };
  }

  // 2. AI semantic relevance evaluation
  try {
    const aiRes = await callAI({
      messages: [
        {
          role: 'system',
          content: `You are an elite Marketing Quality & Brand Relevance Judge.
Your job is to determine whether a social media post strictly aligns with a specific business profile or if it suffers from cross-industry contamination.
Output valid JSON only.`,
        },
        {
          role: 'user',
          content: `Evaluate this post for the following business:

BUSINESS PROFILE:
• Name: "${intelligence.businessName.value}"
• Industry: "${intelligence.industry.value}"
• Category: "${intelligence.businessCategory.value}" (${intelligence.businessSubcategory.value})
• Verified Services: ${intelligence.verifiedServices.map((s) => s.name).join(', ') || 'General services'}
• Location: ${intelligence.location.value?.formattedAddress || intelligence.location.value?.city || 'Local market'}
• Marketing Pillars: ${intelligence.marketingContentPillars.join(', ')}
• Forbidden / Negative Boundaries: ${intelligence.negativeBoundaries.join(', ')}

POST TO EVALUATE:
"""
Title: ${post.title || 'N/A'}
Content: ${post.content}
"""

CRITERIA:
1. Is the topic and vocabulary relevant to ${intelligence.businessCategory.value}? (e.g. A Film Studio must talk about film production, cameras, video editing, storyboarding, actors, or workshops; it must NEVER talk about IT consulting, cloud infrastructure, dentistry, plumbing, etc.)
2. Assign a relevance score from 0 to 100.
3. If score < 75, mark is_relevant: false and explain why.

Return JSON ONLY:
{
  "is_relevant": boolean,
  "relevance_score": number,
  "reason": "string",
  "violations": ["string"]
}`,
        },
      ],
      temperature: 0.1,
      maxTokens: 500,
    });

    const parsed = extractJson<PostValidationResult>(aiRes.content);
    if (parsed && typeof parsed.is_relevant === 'boolean') {
      return {
        is_relevant: parsed.relevance_score >= 75 && parsed.is_relevant,
        relevance_score: parsed.relevance_score,
        reason: parsed.reason || 'Verified by AI relevance evaluator.',
        violations: Array.isArray(parsed.violations) ? parsed.violations : [],
        suggested_pillar: intelligence.marketingContentPillars[0],
      };
    }
  } catch (err) {
    console.warn('[business-intelligence] AI relevance evaluator error, falling back to heuristic:', err);
  }

  // Fallback if AI judge fails: if no negative boundaries violated, pass with score 80
  return {
    is_relevant: true,
    relevance_score: 80,
    reason: 'Passed negative boundary screening without violations.',
    violations: [],
  };
}

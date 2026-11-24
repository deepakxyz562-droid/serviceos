import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateIndustryAwarePost } from '@/lib/business-intelligence/post-generator';
import { getBusinessIntelligence } from '@/lib/business-intelligence/service';
import { validateBrandSafety } from '@/lib/brand-safety-gate';
import { resolveBusinessPostVisual } from '@/lib/designs/dynamic-visual-resolver';

export const dynamic = 'force-dynamic';

interface AiPostRequest {
  topic: string;
  targetKeyword?: string;
  postType?: 'whats_new' | 'offer' | 'event' | 'product';
  tone?: string;
  offerDetails?: {
    title?: string;
    discount?: string;
    couponCode?: string;
    validDays?: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as AiPostRequest;
    const targetKeyword = body.targetKeyword?.trim();
    const topic = body.topic?.trim() || (targetKeyword ? `${targetKeyword} Update` : undefined);
    const postType = body.postType || 'whats_new';

    // 1. Generate post using the shared Business Intelligence Engine with relevance validation
    const intelligence = await getBusinessIntelligence(user.tenantId);
    const generated = await generateIndustryAwarePost({
      tenantId: user.tenantId,
      topic,
      occasion: body.offerDetails?.title,
      postType,
    });

    const businessName = intelligence.businessName.value;
    const industry = intelligence.businessCategory.value;
    const location = intelligence.location.value?.formattedAddress || intelligence.location.value?.city || 'Local Area';

    // Layer 1: Resolve high-quality matched visual photo
    const visualImageUrl = await resolveBusinessPostVisual({
      tenantId: user.tenantId,
      industry,
      topic: topic || generated.contentPillar,
      imageKeyword: generated.contentPillar,
      imagePrompt: generated.visualScenePrompt,
    });

    // Layer 2: Deterministic Brand Safety Gate validation
    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      include: { brandProfile: true },
    });

    const forbiddenPhrases = (() => {
      try {
        const fp = tenant?.brandProfile?.forbiddenPhrases;
        return fp ? JSON.parse(fp) : [];
      } catch {
        return [];
      }
    })();
    const competitors = (() => {
      try {
        const cp = tenant?.brandProfile?.competitors;
        return cp ? JSON.parse(cp) : [];
      } catch {
        return [];
      }
    })();

    const safetyCheck = validateBrandSafety(`${generated.title}\n${generated.fullCaption}`, {
      tenantId: user.tenantId,
      activeBusinessName: businessName,
      forbiddenPhrases,
      competitors,
    });

    // If cross-tenant contamination or severe violations found, sanitize content to active business
    let finalHeadline = generated.title;
    let finalContent = generated.fullCaption;
    if (!safetyCheck.passed) {
      for (const v of safetyCheck.violations) {
        if (v.type === 'cross_tenant_contamination' && v.matchedText) {
          const esc = v.matchedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const reg = new RegExp(`\\b${esc}\\b`, 'gi');
          finalHeadline = finalHeadline.replace(reg, businessName);
          finalContent = finalContent.replace(reg, businessName);
        }
      }
    }

    return NextResponse.json({
      success: true,
      post: {
        headline: finalHeadline,
        content: finalContent,
        ctaType: 'CALL',
        ctaLabel: generated.callToAction || 'Call Now',
        postType,
        topic: generated.contentPillar,
        suggestedOffer: body.offerDetails,
        imagePrompt: generated.visualScenePrompt,
        visualImageUrl,
        relevanceScore: generated.relevanceScore,
        validationReason: generated.validationReason,
        safety: {
          passed: safetyCheck.passed,
          warnings: safetyCheck.warnings.map((w) => w.message),
        },
      },
    });
  } catch (error: unknown) {
    console.error('Error generating AI GBP post:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate AI post' },
      { status: 500 },
    );
  }
}

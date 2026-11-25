import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import {
  getOrGenerateCachedSceneSuggestions,
  loadBusinessSceneContextFromTenant,
  SceneGenerationError,
} from '@/lib/designs/business-image-suggestions';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/social/designs/business-images/suggestions
 * Returns AI-generated, schema-validated, context-cached commercial photography scene concepts.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryParam = searchParams.get('category');
    const businessNameParam = searchParams.get('businessName');
    const refreshParam = searchParams.get('refresh') === 'true';

    const { existingSettingsJson, context } = await loadBusinessSceneContextFromTenant({
      tenantId: user.tenantId,
      categoryOverride: categoryParam,
      businessNameOverride: businessNameParam,
      isRefresh: refreshParam,
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 38_000);

    try {
      const result = await getOrGenerateCachedSceneSuggestions({
        tenantId: user.tenantId,
        existingSettingsJson,
        signal: controller.signal,
        context,
      });

      return NextResponse.json({
        success: true,
        businessName: context.businessName,
        category: context.category,
        city: context.city || '',
        brandVisualDirection: result.brandVisualDirection,
        contextHash: result.contextHash,
        fromCache: result.fromCache,
        suggestions: result.suggestions,
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error: unknown) {
    console.error('[business-images/suggestions] Error:', error);
    const isAiErr = error instanceof SceneGenerationError;
    return NextResponse.json(
      {
        success: false,
        retryable: isAiErr ? error.retryable : true,
        code: isAiErr ? error.code : 'AI_SCENE_GENERATION_FAILED',
        error:
          error instanceof Error
            ? error.message
            : 'Could not generate AI scene ideas right now. Please try again.',
        suggestions: [],
      },
      { status: isAiErr ? 503 : 500 },
    );
  }
}

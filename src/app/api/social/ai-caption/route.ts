import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getBrandContext } from '@/lib/brand-context';

/**
 * AI Caption Generator
 * --------------------
 *   POST /api/social/ai-caption
 *   body: { topic: string, platforms: string[], tone?: string }
 *   returns: { caption: string }
 *
 * Uses z-ai-web-dev-sdk + the tenant's Brand Brain context to generate
 * an on-brand caption suitable for the requested platforms.
 *
 * The Brand Brain (src/lib/brand-context.ts) provides business name,
 * industry, voice, USPs, forbidden phrases, etc. If the tenant hasn't
 * set up their Brand Brain yet, the helper returns a generic fallback
 * context so the route never crashes.
 *
 * z-ai-web-dev-sdk is server-only — MUST NOT be imported on the client.
 */

interface AiCaptionBody {
  topic: string;
  platforms: string[];
  tone?: string;
}

async function getZai(): Promise<{ zai: any; error?: string } | null> {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();
    return { zai };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[api/social/ai-caption] ZAI.create() failed:', msg);
    return {
      zai: null,
      error: 'AI assistant is not configured. Set ZAI_API_KEY to enable AI caption generation.',
    };
  }
}

const PLATFORM_LIMITS: Record<string, number> = {
  twitter: 280,
  instagram: 2200,
  facebook: 5000,
  linkedin: 3000,
  pinterest: 500,
  googlebusiness: 1500,
};

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const tenantId = user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Could not resolve tenant.' }, { status: 400 });
    }

    const body = (await request.json()) as AiCaptionBody;
    if (!body?.topic || !body.topic.trim()) {
      return NextResponse.json({ error: 'topic is required.' }, { status: 400 });
    }
    if (!Array.isArray(body.platforms) || body.platforms.length === 0) {
      return NextResponse.json(
        { error: 'platforms array is required (at least one).' },
        { status: 400 },
      );
    }

    // Load brand context (fail-open: returns a generic context if no BrandProfile).
    const brandContext = await getBrandContext(tenantId);

    // Determine the tightest character limit across selected platforms.
    // The AI is asked to keep the caption under this limit so it fits on
    // the most restrictive platform (usually X at 280 chars).
    const limits = body.platforms
      .map((p) => PLATFORM_LIMITS[p] ?? 5000)
      .sort((a, b) => a - b);
    const charLimit = limits[0];

    const tone = body.tone || 'professional, friendly';

    const systemPrompt =
      brandContext +
      '\n\n' +
      'You are a social media copywriter. Given a topic, write ONE engaging caption that works across ' +
      `the requested platforms: ${body.platforms.join(', ')}. ` +
      `Tone: ${tone}. ` +
      `Maximum length: ${charLimit} characters (must fit on the most restrictive platform). ` +
      'Include 2-4 relevant hashtags at the end (omit hashtags for LinkedIn unless they fit naturally). ' +
      'Do not use emojis unless the tone is explicitly casual. ' +
      'Do not invent prices, dates, or promotions not stated in the brand context. ' +
      'End with a single clear call-to-action. ' +
      'Respond as a plain text string — NO markdown, NO code fences, NO JSON, NO explanations.';

    const userPrompt = `TOPIC: ${body.topic.trim()}\n\nWrite the caption now.`;

    const zaiResult = await getZai();
    if (!zaiResult || !zaiResult.zai) {
      return NextResponse.json(
        { error: zaiResult?.error || 'AI service unavailable.' },
        { status: 503 },
      );
    }

    let caption = '';
    try {
      const response = await zaiResult.zai.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
      });
      caption = response?.choices?.[0]?.message?.content || '';
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[api/social/ai-caption] LLM call failed:', msg);
      return NextResponse.json(
        { error: `The AI service could not be reached (${msg}). Please try again.` },
        { status: 502 },
      );
    }

    // Clean up the response — strip code fences if the model added them anyway.
    caption = caption.trim();
    if (caption.startsWith('```')) {
      caption = caption.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();
    }

    // Truncate to the character limit as a safety net.
    if (caption.length > charLimit) {
      caption = caption.slice(0, charLimit - 1).trimEnd() + '…';
    }

    if (!caption) {
      return NextResponse.json(
        { error: 'AI returned an empty response. Please try again.' },
        { status: 502 },
      );
    }

    return NextResponse.json({ caption });
  } catch (error) {
    console.error('[api/social/ai-caption] POST error:', error);
    return NextResponse.json({ error: 'Failed to generate caption' }, { status: 500 });
  }
}

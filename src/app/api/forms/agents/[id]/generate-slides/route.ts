import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { callAI } from '@/lib/ai-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/forms/agents/[id]/generate-slides
 * ─────────────────────────────────────────────────────────────────────────
 * Generates a slide deck from a prompt using the LLM (z-ai-web-dev-sdk).
 * Returns a JSON array of slides: { id, title, bullets[], notes, graphic }.
 *
 * Body: { prompt: string, slideCount?: number }
 *
 * This replaces the previous setTimeout(1400ms) stub that returned hardcoded
 * slide text regardless of the prompt.
 *
 * Auth: any authenticated tenant user. The agent must belong to the caller's
 * tenant.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id: agentId } = await params;

    const agent = await db.formAgent.findFirst({
      where: { id: agentId, tenantId: authUser.tenantId },
      select: { id: true, name: true, roleTitle: true, configJson: true },
    });
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { prompt, slideCount = 5 } = body as { prompt?: string; slideCount?: number };
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    const systemPrompt = `You are a presentation generator for an AI agent named "${agent.name}" (role: ${agent.roleTitle}).
Generate a ${slideCount}-slide presentation about: "${prompt.trim()}".

Return STRICT JSON only (no markdown fences, no commentary). The JSON shape:
{
  "slides": [
    {
      "title": "string — slide title (max 80 chars)",
      "bullets": ["string", "string", "string"] — 3-5 concise bullets (max 100 chars each),
      "notes": "string — speaker notes the agent will say when presenting this slide (max 300 chars)",
      "graphic": "overview" | "checklist" | "chart" | "cta" | "quote" | "timeline" | "stats"
    }
  ]
}

The first slide should be an overview/intro. The last slide should be a CTA.
Make the content specific to the prompt — do NOT use generic placeholder text.`;

    const aiResult = await callAI({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate a ${slideCount}-slide deck about: ${prompt.trim()}` },
      ],
      temperature: 0.7,
      maxTokens: 2048,
      json: true,
      usageContext: { tenantId: authUser.tenantId, feature: 'presentation_slides' },
    });

    const content = aiResult.content || '';

    let jsonStr = content.trim();
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim();
    }

    let parsed: { slides?: any[] };
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error('[generate-slides] LLM returned non-JSON:', content.slice(0, 200));
      return NextResponse.json(
        { error: 'AI returned malformed slide data. Please try again.' },
        { status: 502 },
      );
    }

    if (!parsed.slides || !Array.isArray(parsed.slides) || parsed.slides.length === 0) {
      return NextResponse.json(
        { error: 'AI returned no slides. Please try a different prompt.' },
        { status: 502 },
      );
    }

    const slides = parsed.slides.slice(0, slideCount).map((s: any, i: number) => ({
      id: `gen_${Date.now()}_${i}`,
      title: String(s.title || `Slide ${i + 1}`).slice(0, 120),
      bullets: Array.isArray(s.bullets)
        ? s.bullets.slice(0, 6).map((b: any) => String(b).slice(0, 140))
        : [],
      notes: String(s.notes || '').slice(0, 400),
      graphic: ['overview', 'checklist', 'chart', 'cta', 'quote', 'timeline', 'stats'].includes(s.graphic)
        ? s.graphic
        : 'overview',
    }));

    return NextResponse.json({ slides, prompt: prompt.trim() });
  } catch (error) {
    console.error('[POST /api/forms/agents/[id]/generate-slides] error:', error);
    const msg = error instanceof Error ? error.message : 'Slide generation failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { checkAiQuota } from '@/lib/ai-usage-tracker';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { callAI } from '@/lib/ai-client';
import {
  validateDesign,
  createFieserosCampaignDesign,
  createCommercialPosterDesign,
  type MarketingDesign,
} from '../../../../../../shared/marketing-design';

export const maxDuration = 60;

const ALLOWED_IMAGE_DOMAINS = ['images.unsplash.com', 'serviceos-uploads.s3.us-east-1.amazonaws.com'];

function isAllowedHost(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_IMAGE_DOMAINS.includes(parsed.hostname);
  } catch {
    return false;
  }
}

function normalizeHexColor(val: unknown, fallback = '#ffffff'): string {
  if (typeof val !== 'string') return fallback;
  const trimmed = val.trim();
  if (trimmed.toLowerCase() === 'transparent') return 'transparent';
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed;
  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
  }
  if (trimmed.toLowerCase() === 'white') return '#ffffff';
  if (trimmed.toLowerCase() === 'black') return '#000000';
  return fallback;
}

function extractJson(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {}

  const blockMatch = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(trimmed);
  if (blockMatch && blockMatch[1]) {
    try {
      return JSON.parse(blockMatch[1].trim());
    } catch {}
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = trimmed.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch {}

    try {
      const sanitized = candidate.replace(/,\s*([}\]])/g, '$1');
      return JSON.parse(sanitized);
    } catch {}
  }

  throw new Error('Unexpected token: not valid JSON');
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user?.tenantId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  try {
    const body = await request.json();
    let design: MarketingDesign;
    try {
      design = validateDesign(body.design);
    } catch {
      design = createFieserosCampaignDesign();
    }

    if (typeof body.prompt !== 'string' || !body.prompt.trim() || body.prompt.length > 4000) {
      return NextResponse.json({ error: 'Provide a prompt of 1–4000 characters' }, { status: 400 });
    }

    const quota = await checkAiQuota(user.tenantId);
    if (!quota.ok) return quota.response!;

    // Images remain independent assets: never ask a text model to invent asset URLs.
    const sources = design.layers.filter((l) => l.type === 'image' && typeof l.src === 'string').map((l) => l.src!);
    const compact = {
      ...design,
      layers: design.layers.map((l) => (l.type === 'image' ? { ...l, src: `asset:${sources.indexOf(l.src!)}` } : l)),
    };

    const result = await callAI({
      messages: [
        {
          role: 'system',
          content:
            'Edit a marketing design as JSON. Return ONLY {"design": <complete document>, "caption": <string>, "alternativeHeadlines": [<string>, <string>, <string>]}. Preserve version 1 and the layer schema exactly. Canvas dimensions 320..2160; maximum 40 layers. Types: text, image, shape. Coordinates must fit the canvas. All layers require id, type, x, y, width, height, color, background, fontSize (8..200), opacity (0..1). Text layers require text. Image layers require src. Colors must be six-digit hex or transparent. Preserve existing content unless asked to change it. Use only existing asset:N image references; never invent images, offers, contact details or claim that an image was generated. Keep editable text separate from images. Return a useful layout based on the prompt. Provide 3 punchy alternative headline options in alternativeHeadlines.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            prompt: body.prompt,
            design: compact,
            caption: typeof body.caption === 'string' ? body.caption.slice(0, 5000) : '',
            mode: body.mode || 'graphic',
          }),
        },
      ],
      temperature: 0.4,
      usageContext: { tenantId: user.tenantId, feature: 'bgos_design_edit' },
    });

    const parsed = extractJson(result.content) as {
      design?: MarketingDesign;
      caption?: string;
      alternativeHeadlines?: string[];
    };

    if (!parsed || typeof parsed !== 'object' || !parsed.design || !Array.isArray(parsed.design.layers)) {
      throw new Error('Invalid model output structure');
    }

    const canvasWidth = parsed.design.width || design.width || 1080;
    const canvasHeight = parsed.design.height || design.height || 1350;

    // Sanitize and resolve layers before strict validation
    for (const l of parsed.design.layers) {
      if (!l || typeof l !== 'object') continue;

      // Expand 3-digit hex colors to 6-digit hex
      l.color = normalizeHexColor(l.color, '#ffffff');
      l.background = normalizeHexColor(l.background, 'transparent');

      // Clamp coordinates to prevent "Invalid design layer" edge overflows
      if (Number.isFinite(l.x)) l.x = Math.max(0, Math.min(l.x, canvasWidth - 20));
      if (Number.isFinite(l.y)) l.y = Math.max(0, Math.min(l.y, canvasHeight - 20));
      if (Number.isFinite(l.width)) l.width = Math.max(20, Math.min(l.width, canvasWidth - (l.x || 0)));
      if (Number.isFinite(l.height)) l.height = Math.max(20, Math.min(l.height, canvasHeight - (l.y || 0)));
      if (Number.isFinite(l.fontSize)) l.fontSize = Math.max(8, Math.min(200, l.fontSize));
      if (Number.isFinite(l.opacity)) l.opacity = Math.max(0, Math.min(1, l.opacity));

      if (l.type === 'image') {
        const match = typeof l.src === 'string' && /^asset:(\d+)$/.exec(l.src);
        if (match && sources[Number(match[1])]) {
          l.src = sources[Number(match[1])];
        } else if (typeof l.src === 'string' && sources.includes(l.src)) {
          // Already preserved original source
        } else if (typeof l.src === 'string' && isAllowedHost(l.src)) {
          // Curated approved image host (e.g. Unsplash)
        } else {
          throw new Error('Generated design references an unavailable image');
        }
      }
    }

    const next = validateDesign(parsed.design);
    const caption =
      typeof parsed.caption === 'string' && parsed.caption.trim().length > 0
        ? parsed.caption.slice(0, 5000)
        : typeof body.caption === 'string' && body.caption.trim().length > 0
        ? body.caption
        : 'Transform your workflow with Fieseros AI Assistant.';

    if (body.mode === 'image_only') {
      next.layers = next.layers.filter((l) => l.type === 'image');
    }

    const alts = Array.isArray(parsed.alternativeHeadlines)
      ? parsed.alternativeHeadlines
          .filter((h: unknown): h is string => typeof h === 'string' && h.trim().length > 0)
          .slice(0, 3)
      : [];

    return NextResponse.json({
      design: next,
      caption,
      alternativeHeadlines: alts,
    });
  } catch (error) {
    console.error('[designs/generate]', error instanceof Error ? error.message : 'Generation failed');
    return NextResponse.json(
      { error: 'The design could not be generated. Your current design is unchanged; please retry.' },
      { status: 502 },
    );
  }
}

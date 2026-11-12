import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getBrandContext, getBrandContextRaw } from '@/lib/brand-context';
import { callAI } from '@/lib/ai-client';
import {
  extractTenantGeoAndSeoContext,
  inspectImageWithVision,
} from '@/lib/designs/seo-metadata';
import {
  computeMediaSeoReadiness,
  slugifySeoFilename,
} from '../../../../../shared/image-review';

const VALID_GBP_CATEGORIES = [
  'EXTERIOR',
  'INTERIOR',
  'PRODUCT',
  'AT_WORK',
  'TEAMS',
  'ADDITIONAL',
  'COVER',
  'PROFILE',
] as const;

type GbpMediaCategory = (typeof VALID_GBP_CATEGORIES)[number];

interface AiMediaMetadataBody {
  mediaUrls?: string[];
  imageUrl?: string;
  filenames?: string[];
  mediaType?: 'photo' | 'video';
  intent?: 'showcase' | 'local_seo' | 'offer' | 'behind_the_scenes' | 'team';
  tone?: string;
  customHint?: string;
  aiPrompt?: string;
  categoryHint?: string;
  geoTagged?: boolean;
}

function cleanKeywordTag(raw: string): string {
  return raw
    .replace(/^#+/, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferCategoryFromContext(
  hint?: string,
  intent?: string,
  filenames?: string[],
): GbpMediaCategory {
  const combined = `${hint || ''} ${intent || ''} ${(filenames || []).join(' ')}`.toLowerCase();
  if (/team|staff|crew|owner|founder|employee|people/.test(combined) || intent === 'team') {
    return 'TEAMS';
  }
  if (/work|install|repair|clean|cook|serve|process|behind/.test(combined) || intent === 'behind_the_scenes') {
    return 'AT_WORK';
  }
  if (/outside|exterior|lawn|pool|building|gate|facade|garden|venue|front|parking/.test(combined)) {
    return 'EXTERIOR';
  }
  if (/inside|interior|room|lobby|hall|suite|dining|decor|office/.test(combined)) {
    return 'INTERIOR';
  }
  if (/product|package|menu|dish|item|equipment/.test(combined) || intent === 'offer') {
    return 'PRODUCT';
  }
  return 'ADDITIONAL';
}

function parseJsonSafe<T>(raw: string): T | null {
  try {
    const trimmed = raw
      .trim()
      .replace(/^```(?:json)?\n?/i, '')
      .replace(/\n?```$/i, '')
      .trim();
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as T;
    }
    return JSON.parse(trimmed) as T;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as AiMediaMetadataBody;
    const tenantId = user.tenantId;
    const mediaType = body.mediaType === 'video' ? 'video' : 'photo';
    const previewImageUrl =
      (typeof body.imageUrl === 'string' && body.imageUrl.trim()) ||
      (Array.isArray(body.mediaUrls) && typeof body.mediaUrls[0] === 'string'
        ? body.mediaUrls[0].trim()
        : '');

    const [brandContext, brandRaw, tenant, trackedKeywords, seoCtx] = await Promise.all([
      getBrandContext(tenantId),
      getBrandContextRaw(tenantId),
      db.tenant
        ?.findUnique?.({
          where: { id: tenantId },
          select: { name: true, industry: true, city: true, state: true, description: true, settingsJson: true },
        })
        .catch(() => null) ?? null,
      db.trackedKeyword
        ?.findMany?.({
          where: { tenantId },
          orderBy: { score: 'desc' },
          take: 6,
          select: { keyword: true },
        })
        .catch(() => []) ?? [],
      extractTenantGeoAndSeoContext(tenantId).catch(() => null),
    ]);

    let activeGbpTitle = '';
    if (tenant?.settingsJson) {
      try {
        const s = JSON.parse(tenant.settingsJson);
        activeGbpTitle = (s.activeGbpTitle || s.locationName || s?.blueprint?.businessName || '').trim();
      } catch {}
    }

    const ownerUser =
      typeof (db as any).user?.findFirst === 'function'
        ? await (db as any).user.findFirst({ where: { tenantId }, select: { name: true } }).catch(() => null)
        : null;
    const ownerNameLower = (ownerUser?.name || '').toLowerCase().trim();
    const isPersonalOrGeneric = (candidate?: string | null): boolean => {
      if (!candidate) return true;
      const lower = candidate.toLowerCase().trim();
      return (
        lower === 'our business' ||
        lower === 'your business' ||
        lower === 'my business' ||
        lower.includes('workspace') ||
        (Boolean(ownerNameLower) && (lower === ownerNameLower || lower === `${ownerNameLower}'s business`))
      );
    };

    const businessName =
      (activeGbpTitle && !isPersonalOrGeneric(activeGbpTitle) ? activeGbpTitle : '') ||
      (brandRaw?.businessName && !isPersonalOrGeneric(brandRaw.businessName) ? brandRaw.businessName.trim() : '') ||
      (tenant?.name && !isPersonalOrGeneric(tenant.name) ? tenant.name.trim() : '') ||
      (seoCtx?.businessName && !isPersonalOrGeneric(seoCtx.businessName) ? seoCtx.businessName : '') ||
      activeGbpTitle ||
      brandRaw?.businessName?.trim() ||
      tenant?.name?.trim() ||
      'Our Business';
    const industry =
      brandRaw?.industry?.trim() || tenant?.industry?.trim() || seoCtx?.category || 'Local Service';
    const location =
      brandRaw?.location?.trim() ||
      [tenant?.city || seoCtx?.city, tenant?.state].filter(Boolean).join(', ').trim();

    let servicesList: string[] = [];
    try {
      if (brandRaw?.services) {
        const parsed = JSON.parse(brandRaw.services);
        if (Array.isArray(parsed)) {
          servicesList = parsed.filter((s): s is string => typeof s === 'string').slice(0, 6);
        }
      }
    } catch {}
    if (servicesList.length === 0 && seoCtx?.services?.length) {
      servicesList = seoCtx.services.slice(0, 6);
    }

    const visionSummary =
      previewImageUrl && mediaType !== 'video'
        ? await inspectImageWithVision({
            imageUrl: previewImageUrl,
            businessName,
            category: industry,
          }).catch(() => null)
        : null;

    const googleSearchTerms = (seoCtx?.searchTerms || []).map((t) => t.keyword).filter(Boolean);
    const keywordHints = Array.from(
      new Set([
        ...googleSearchTerms,
        ...trackedKeywords.map((k: { keyword: string }) => k.keyword),
        ...servicesList,
        ...(visionSummary?.visualDetails || []),
      ]),
    ).slice(0, 10);

    const filenames = Array.isArray(body.filenames)
      ? body.filenames.filter((f): f is string => typeof f === 'string').slice(0, 10)
      : [];
    const intent = body.intent || 'local_seo';
    const tone = (body.tone || brandRaw?.tone || 'Professional & welcoming').trim();
    const aiPrompt = typeof body.aiPrompt === 'string' ? body.aiPrompt.trim() : '';
    const customHint = (body.customHint || '').trim();
    const fallbackCategory =
      (visionSummary?.suggestedCategory as GbpMediaCategory | undefined) ||
      inferCategoryFromContext(
        `${body.categoryHint || ''} ${customHint} ${aiPrompt}`,
        intent,
        filenames,
      );

    const systemPrompt = `${brandContext}

You are a Google Business Profile local SEO & visual merchandising strategist for "${businessName}" (${industry}${location ? ` in ${location}` : ''}).
Generate structured metadata for an uploaded ${mediaType} (or batch of ${mediaType}s).

Rules:
1. Respond with STRICT valid JSON only (no markdown fences, no commentary).
2. JSON schema:
{
  "title": "string (4-9 words, clear scannable title naming the business, service/subject, or location naturally)",
  "description": "string (2-3 natural local-SEO sentences for Google Business Profile, max 380 chars; weave 1-2 real Search Terms & city/service terms naturally; NO hashtags inside description)",
  "altText": "string (concise 60-125 char visual + local SEO alt attribute)",
  "tags": ["array of 5-7 concise searchable keyword tags without # symbol"],
  "category": "one of: EXTERIOR | INTERIOR | PRODUCT | AT_WORK | TEAMS | ADDITIONAL",
  "suggestedTitles": ["3 short alternative title variations"],
  "suggestedTags": ["up to 6 bonus local-SEO keyword chips"]
}
3. Prioritize real Google Business Profile Search Terms and what is actually visible in the image when provided. Never keyword-stuff or invent fake prices or discounts.`;

    const userPrompt = [
      `Business: ${businessName}`,
      `Category/Industry: ${industry}`,
      location ? `Location: ${location}` : null,
      servicesList.length ? `Key Services: ${servicesList.join(', ')}` : null,
      googleSearchTerms.length
        ? `Top Real GBP Search Terms: ${googleSearchTerms.slice(0, 6).join(', ')}`
        : null,
      keywordHints.length ? `Target SEO Keywords: ${keywordHints.join(', ')}` : null,
      visionSummary?.subjectSummary ? `Visual Inspection of Photo: ${visionSummary.subjectSummary}` : null,
      aiPrompt ? `Image Generation Scene Brief: ${aiPrompt}` : null,
      filenames.length ? `Uploaded file name(s): ${filenames.join(', ')}` : null,
      `Goal / Intent: ${intent}`,
      `Desired Tone: ${tone}`,
      body.categoryHint ? `Preferred Category: ${body.categoryHint}` : null,
      customHint ? `User Note / Focus: ${customHint}` : null,
      `Generate tailored title, description, altText, tags, and best Google Business Profile photo category now.`,
    ]
      .filter(Boolean)
      .join('\n');

    let parsed: {
      title?: string;
      description?: string;
      altText?: string;
      tags?: string[];
      category?: string;
      suggestedTitles?: string[];
      suggestedTags?: string[];
    } | null = null;

    try {
      const aiRes = await callAI({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.65,
        maxTokens: 600,
        json: true,
        usageContext: { tenantId, feature: 'media_metadata' },
      });
      if (aiRes?.content) {
        parsed = parseJsonSafe(aiRes.content);
      }
    } catch (aiErr) {
      console.warn('[api/social/ai-media-metadata] AI fallback used:', aiErr instanceof Error ? aiErr.message : aiErr);
    }

    const locationSuffix = location ? ` in ${location}` : '';
    const primaryService = googleSearchTerms[0] || servicesList[0] || industry;
    const secondaryService = googleSearchTerms[1] || servicesList[1] || `${industry} service`;
    const subjectFocus = customHint || aiPrompt;

    const fallbackTitle = subjectFocus
      ? `${subjectFocus.slice(0, 48)} – ${businessName}${location ? ` (${location.split(',')[0].trim()})` : ''}`.slice(0, 80)
      : intent === 'offer'
        ? `Featured ${primaryService} Highlight – ${businessName}`
        : intent === 'team'
          ? `Meet Our ${businessName} Team`
          : intent === 'behind_the_scenes'
            ? `${primaryService} in Action at ${businessName}`
            : `${businessName} · ${primaryService}${locationSuffix}`.slice(0, 72);

    const fallbackDescription = subjectFocus
      ? `${subjectFocus.slice(0, 120)}. Discover trusted ${primaryService.toLowerCase()} and ${secondaryService.toLowerCase()} at ${businessName}${locationSuffix}. Contact us today or visit our Google profile for availability and directions.`
      : `Explore authentic ${mediaType} updates from ${businessName}${locationSuffix}. Known for quality ${primaryService.toLowerCase()} and ${secondaryService.toLowerCase()}, we help local customers experience reliable results every visit.`;

    const fallbackTags = Array.from(
      new Set(
        [
          ...googleSearchTerms.slice(0, 4),
          businessName,
          primaryService,
          industry,
          location ? location.split(',')[0].trim() : '',
          ...keywordHints,
          intent === 'offer' ? 'Special Highlight' : 'Local Favorite',
        ]
          .map(cleanKeywordTag)
          .filter((t) => t.length >= 2 && t.length <= 40),
      ),
    ).slice(0, 7);

    const rawCategory = String(parsed?.category || fallbackCategory).toUpperCase().trim();
    const resolvedCategory: GbpMediaCategory = (VALID_GBP_CATEGORIES as readonly string[]).includes(rawCategory)
      ? (rawCategory as GbpMediaCategory)
      : fallbackCategory;

    const tags = Array.from(
      new Set(
        (Array.isArray(parsed?.tags) && parsed.tags.length > 0 ? parsed.tags : fallbackTags)
          .map((t) => cleanKeywordTag(String(t || '')))
          .filter((t) => t.length >= 2 && t.length <= 40),
      ),
    ).slice(0, 10);

    const suggestedTitles = Array.from(
      new Set(
        [
          ...(Array.isArray(parsed?.suggestedTitles) ? parsed.suggestedTitles : []),
          fallbackTitle,
          `${primaryService} Showcase · ${businessName}`,
          `${businessName} Experience${locationSuffix}`,
        ]
          .map((t) => String(t || '').trim())
          .filter((t) => t.length >= 4 && t.length <= 90),
      ),
    ).slice(0, 4);

    const suggestedTags = Array.from(
      new Set(
        [
          ...(Array.isArray(parsed?.suggestedTags) ? parsed.suggestedTags : []),
          ...fallbackTags,
          ...keywordHints.map(cleanKeywordTag),
        ].filter((t) => t.length >= 2 && t.length <= 40 && !tags.includes(t)),
      ),
    ).slice(0, 8);

    const finalTitle = ((typeof parsed?.title === 'string' && parsed.title.trim()) || fallbackTitle).slice(0, 100);
    const finalDescription = (
      (typeof parsed?.description === 'string' && parsed.description.trim()) ||
      fallbackDescription
    ).slice(0, 1500);
    const altText = (
      (typeof parsed?.altText === 'string' && parsed.altText.trim()) ||
      visionSummary?.subjectSummary ||
      `${finalTitle} at ${businessName}${locationSuffix}`
    ).slice(0, 160);

    const usedSearchTerms = googleSearchTerms.slice(0, 8);
    const seoFilename = slugifySeoFilename(
      finalTitle || aiPrompt || primaryService,
      seoCtx?.city || location.split(',')[0] || null,
      'jpg',
    );
    const geoCoordinates =
      seoCtx?.latitude !== null &&
      seoCtx?.latitude !== undefined &&
      seoCtx?.longitude !== null &&
      seoCtx?.longitude !== undefined
        ? { latitude: seoCtx.latitude, longitude: seoCtx.longitude }
        : null;
    const isGeoTagged =
      mediaType === 'photo' &&
      (typeof body.geoTagged === 'boolean' ? body.geoTagged : Boolean(geoCoordinates));

    const seoReadiness = computeMediaSeoReadiness({
      title: finalTitle,
      description: finalDescription,
      tags,
      category: resolvedCategory,
      city: seoCtx?.city || location.split(',')[0]?.trim() || null,
      searchTerms: usedSearchTerms.length > 0 ? usedSearchTerms : keywordHints,
      seoFilename,
      url: previewImageUrl || undefined,
      geoTagged: isGeoTagged,
    });

    return NextResponse.json({
      success: true,
      title: finalTitle,
      description: finalDescription,
      altText,
      tags,
      category: resolvedCategory,
      suggestedTitles,
      suggestedTags,
      tone,
      businessName,
      seoFilename,
      usedSearchTerms,
      geoTagged: isGeoTagged,
      geoCoordinates,
      seoScore: seoReadiness.score,
      seoChecks: seoReadiness.checks,
      visualSummary: visionSummary?.subjectSummary || null,
    });
  } catch (error) {
    console.error('[api/social/ai-media-metadata] Error:', error);
    return NextResponse.json({ error: 'Failed to generate media metadata' }, { status: 500 });
  }
}

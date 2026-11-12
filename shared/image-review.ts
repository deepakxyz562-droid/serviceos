export type ImageProviderChoice = 'cloudflare' | 'siliconflow' | 'nvidia' | 'gemini' | 'openrouter';

export const IMAGE_PROVIDER_CHOICES: readonly ImageProviderChoice[] = [
  'cloudflare',
  'siliconflow',
  'nvidia',
  'gemini',
  'openrouter',
] as const;

export const IMAGE_PROVIDER_LABELS: Record<ImageProviderChoice, string> = {
  cloudflare: 'Cloudflare',
  siliconflow: 'SiliconFlow',
  nvidia: 'NVIDIA FLUX',
  gemini: 'Gemini Vision',
  openrouter: 'Flux Pro',
};

export function isTextOnlyImageProvider(provider?: ImageProviderChoice | null): boolean {
  return provider === 'cloudflare' || provider === 'siliconflow' || provider === 'nvidia';
}

export type ImageGenerationSourceType = 'ai_reference' | 'ai_text' | 'stock_fallback';

export type AiPhotoStylePreset =
  | 'real_photo'
  | 'product_studio'
  | 'team_action'
  | 'before_after'
  | 'lifestyle'
  | 'festive';

export interface AiPhotoStylePresetItem {
  id: AiPhotoStylePreset;
  label: string;
  gbpCategory: 'ADDITIONAL' | 'EXTERIOR' | 'INTERIOR' | 'PRODUCT' | 'AT_WORK' | 'TEAMS';
  promptHint: string;
}

export const AI_PHOTO_STYLE_PRESETS: AiPhotoStylePresetItem[] = [
  {
    id: 'real_photo',
    label: 'Real Photo',
    gbpCategory: 'EXTERIOR',
    promptHint: 'authentic candid commercial photography on natural location, realistic daylight, unedited real-world detail',
  },
  {
    id: 'product_studio',
    label: 'Product Studio',
    gbpCategory: 'PRODUCT',
    promptHint: 'high-key clean commercial product showcase with crisp shadows and tactile studio details',
  },
  {
    id: 'team_action',
    label: 'Team Action',
    gbpCategory: 'TEAMS',
    promptHint: 'authentic local team and specialist in action serving customers in tidy uniform and workspace',
  },
  {
    id: 'before_after',
    label: 'Finished Work',
    gbpCategory: 'AT_WORK',
    promptHint: 'crisp wide-angle showcase highlighting spotless finished work and crafted real-world result',
  },
  {
    id: 'lifestyle',
    label: 'Lifestyle',
    gbpCategory: 'INTERIOR',
    promptHint: 'warm welcoming customer lifestyle moment experiencing the space or service in golden ambiance',
  },
  {
    id: 'festive',
    label: 'Festive',
    gbpCategory: 'ADDITIONAL',
    promptHint: 'tasteful celebratory seasonal hospitality lighting and subtle decor tailored to the business setting',
  },
];

export interface ImageCandidate {
  id: string;
  url: string;
  prompt?: string;
  provider?: ImageProviderChoice;
  aspectRatio?: '1:1' | '4:5' | '9:16' | '16:9';
  createdAt?: number;
  label?: string;
  sourceType?: ImageGenerationSourceType;
  model?: string;
  fallbackReason?: string;
  seoFilename?: string;
  geoTagged?: boolean;
  geoCoordinates?:
    | { latitude: number; longitude: number }
    | { lat: number; lng: number }
    | null;
}

export interface ImageQuickFixOption {
  id: string;
  label: string;
  instruction: string;
}

export const IMAGE_QUICK_FIX_OPTIONS: ImageQuickFixOption[] = [
  {
    id: 'clean_text_faces',
    label: 'Clean up faces & text',
    instruction:
      'Ensure realistic natural human faces and hands, and avoid any distorted, garbled, or misspelled text.',
  },
  {
    id: 'more_realistic',
    label: 'More realistic photo',
    instruction:
      'Shoot as a crisp, authentic DSLR commercial photograph with natural textures rather than synthetic CGI art.',
  },
  {
    id: 'better_lighting',
    label: 'Brighter & warmer light',
    instruction:
      'Use bright, inviting natural golden-hour commercial lighting with clean, soft shadows.',
  },
  {
    id: 'match_space',
    label: 'Match my real space',
    instruction:
      'Preserve the authentic architecture, signage, and setting of the real business without inventing unrelated clutter.',
  },
  {
    id: 'simpler_bg',
    label: 'Cleaner background',
    instruction:
      'Keep the composition uncluttered, balanced, and focused cleanly on the primary subject.',
  },
  {
    id: 'different_angle',
    label: 'Different framing',
    instruction:
      'Try a fresh, well-balanced commercial camera angle and natural composition.',
  },
];

const FIX_INSTRUCTION_PREFIX = '[Quality refinements:';

export function buildRefinedImagePrompt(
  basePrompt: string,
  selectedFixIds: string[],
  customNote?: string,
  fallbackContext = 'Photorealistic commercial business showcase',
): string {
  const rawBase = (basePrompt || '').trim();
  // Strip any previous quality refinement block so repeated retries stay concise.
  const prefixIdx = rawBase.indexOf(FIX_INSTRUCTION_PREFIX);
  const cleanBase = (prefixIdx >= 0 ? rawBase.slice(0, prefixIdx) : rawBase).trim() || fallbackContext;

  const parts: string[] = [];
  for (const id of selectedFixIds) {
    const opt = IMAGE_QUICK_FIX_OPTIONS.find((item) => item.id === id);
    if (opt) parts.push(opt.instruction);
  }
  const trimmedNote = (customNote || '').trim();
  if (trimmedNote) {
    parts.push(trimmedNote);
  }

  if (parts.length === 0) {
    return cleanBase.slice(0, 3800);
  }

  const combined = `${cleanBase}\n${FIX_INSTRUCTION_PREFIX} ${parts.join(' ')}]`;
  return combined.slice(0, 3800);
}

export function appendImageCandidate(
  prev: ImageCandidate[],
  next: Omit<ImageCandidate, 'id' | 'createdAt'> & { id?: string; createdAt?: number },
  maxItems = 6,
): ImageCandidate[] {
  const url = (next.url || '').trim();
  if (!url) return prev;
  const existingIdx = prev.findIndex((item) => item.url === url);
  if (existingIdx >= 0) {
    const updated = [...prev];
    updated[existingIdx] = {
      ...updated[existingIdx],
      ...next,
      url,
      id: updated[existingIdx].id,
      createdAt: updated[existingIdx].createdAt ?? Date.now(),
    };
    return updated;
  }
  const entry: ImageCandidate = {
    id: next.id || `cand-${Date.now()}-${prev.length + 1}`,
    url,
    prompt: next.prompt,
    provider: next.provider,
    aspectRatio: next.aspectRatio,
    label: next.label,
    sourceType: next.sourceType,
    model: next.model,
    fallbackReason: next.fallbackReason,
    seoFilename: next.seoFilename,
    geoTagged: next.geoTagged,
    geoCoordinates: next.geoCoordinates,
    createdAt: next.createdAt ?? Date.now(),
  };
  const nextList = [...prev, entry];
  if (nextList.length > maxItems) {
    return nextList.slice(nextList.length - maxItems);
  }
  return nextList;
}

export function slugifySeoFilename(
  rawText: string,
  city?: string | null,
  ext: 'jpg' | 'webp' | 'png' = 'jpg',
): string {
  const cleanPart = (val: string) =>
    val
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

  const base = cleanPart(rawText || '');
  const citySlug = cleanPart(city || '');
  const tokens = Array.from(
    new Set(
      [...base.split('-'), ...citySlug.split('-')]
        .map((t) => t.trim())
        .filter((t) => t.length > 1),
    ),
  );
  const slug = tokens.join('-').slice(0, 64).replace(/-+$/g, '') || 'local-business-showcase';
  return `${slug}.${ext}`;
}

export interface MediaSeoCheckItem {
  id: string;
  label: string;
  passed: boolean;
  detail?: string;
}

export interface MediaSeoReadinessResult {
  score: number;
  grade: 'Excellent' | 'Good' | 'Needs Work';
  checks: MediaSeoCheckItem[];
}

export function computeMediaSeoReadiness(input: {
  title?: string | null;
  description?: string | null;
  tags?: string[] | null;
  category?: string | null;
  city?: string | null;
  searchTerms?: string[] | null;
  seoFilename?: string | null;
  url?: string | null;
  geoTagged?: boolean;
}): MediaSeoReadinessResult {
  const title = (input.title || '').trim();
  const desc = (input.description || '').trim();
  const tags = Array.isArray(input.tags) ? input.tags.filter(Boolean) : [];
  const city = (input.city || '').trim();
  const searchTerms = Array.isArray(input.searchTerms)
    ? input.searchTerms.map((s) => s.trim().toLowerCase()).filter(Boolean)
    : [];
  const textBlob = `${title} ${desc} ${tags.join(' ')}`.toLowerCase();

  const hasRichTitle =
    title.length >= 10 && !/^(design image|untitled|photo|media|img[-_])/i.test(title);
  const matchedSearchTerm = searchTerms.find((term) => {
    if (textBlob.includes(term)) return true;
    const significantWords = term.split(/\s+/).filter((w) => w.length >= 4);
    return significantWords.length > 0 && significantWords.every((w) => textBlob.includes(w));
  });
  const titleCheck: MediaSeoCheckItem = {
    id: 'title_keyword',
    label: matchedSearchTerm
      ? `Matches Search Term ("${matchedSearchTerm}")`
      : 'Descriptive Local SEO Title',
    passed: hasRichTitle && (searchTerms.length === 0 || Boolean(matchedSearchTerm)),
    detail: !hasRichTitle
      ? 'Use 10+ chars describing your service/product'
      : searchTerms.length > 0 && !matchedSearchTerm
        ? `Include a search term like "${searchTerms[0]}"`
        : undefined,
  };

  const hasCityMention =
    !city ||
    city
      .toLowerCase()
      .split(/[,\s]+/)
      .filter((w) => w.length >= 3)
      .some((w) => textBlob.includes(w));
  const descCheck: MediaSeoCheckItem = {
    id: 'description_local',
    label: city ? `Mentions Local Area (${city.split(',')[0]})` : 'Rich 60+ Char SEO Description',
    passed: desc.length >= 60 && hasCityMention,
    detail:
      desc.length < 60
        ? 'Write at least 60 characters for local relevance'
        : !hasCityMention
          ? `Add your location (${city.split(',')[0]}) naturally`
          : undefined,
  };

  const tagsCheck: MediaSeoCheckItem = {
    id: 'local_tags',
    label: '3+ Local SEO Tags',
    passed: tags.length >= 3,
    detail: tags.length < 3 ? `Add ${3 - tags.length} more local keyword tags` : undefined,
  };

  const cat = (input.category || 'ADDITIONAL').toUpperCase();
  const specificCategory = cat !== 'ADDITIONAL' && cat !== 'GENERAL';
  const categoryCheck: MediaSeoCheckItem = {
    id: 'gbp_category',
    label: specificCategory ? `GBP Photo Type (${cat})` : 'GBP Photo Type Selected',
    passed: Boolean(cat),
    detail: !specificCategory ? 'Pick Exterior, Interior, Product, At Work, or Team when applicable' : undefined,
  };

  const fname = (input.seoFilename || input.url || '').split('/').pop()?.split('?')[0] || '';
  const hasKeywordFilename =
    fname.length > 6 &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(fname) &&
    /[a-z]{3,}-[a-z]{3,}/i.test(fname);
  const technicalCheck: MediaSeoCheckItem = {
    id: 'geo_and_filename',
    label: input.geoTagged ? 'GPS EXIF + SEO Filename Ready' : 'SEO Filename & GPS EXIF',
    passed: Boolean(input.geoTagged && hasKeywordFilename),
    detail: !input.geoTagged
      ? 'Set business location coordinates to embed GPS EXIF'
      : !hasKeywordFilename
        ? 'Save with keyword-rich .jpg filename'
        : undefined,
  };

  const checks = [titleCheck, descCheck, tagsCheck, categoryCheck, technicalCheck];
  let score = 0;
  if (hasRichTitle) score += searchTerms.length === 0 || matchedSearchTerm ? 20 : 12;
  if (desc.length >= 60) score += hasCityMention ? 20 : 12;
  if (tags.length >= 3) score += 20;
  else if (tags.length > 0) score += 10;
  if (specificCategory) score += 20;
  else if (cat) score += 14;
  if (input.geoTagged) score += 10;
  if (hasKeywordFilename) score += 10;

  score = Math.max(0, Math.min(100, score));
  const grade: MediaSeoReadinessResult['grade'] =
    score >= 80 ? 'Excellent' : score >= 55 ? 'Good' : 'Needs Work';

  return { score, grade, checks };
}

export function getAspectRatioNumeric(ratio?: string | null): number {
  switch (ratio) {
    case '1:1':
      return 1;
    case '9:16':
      return 9 / 16;
    case '16:9':
      return 16 / 9;
    case '4:5':
    default:
      return 4 / 5;
  }
}

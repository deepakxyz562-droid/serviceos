/**
 * Core, dependency-free marketing design schema, validator, and base builder.
 *
 * Kept separate from `marketing-design.ts` (which composes template packs) so
 * template composer modules can import `validateDesign` and types without
 * creating circular dependencies in Metro / TypeScript bundlers.
 */

export type DesignLayer = {
  photoFit?: 'contain' | 'cover';
  locked?: boolean;
  hidden?: boolean;
  groupId?: string;
  id: string;
  type: 'text' | 'image' | 'shape';
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  src?: string;
  assetId?: string;
  rotation?: number;
  cropX?: number;
  cropY?: number;
  color: string;
  background: string;
  fontSize: number;
  opacity: number;
  borderRadius?: number;
  borderTopLeftRadius?: number;
  borderTopRightRadius?: number;
  borderBottomLeftRadius?: number;
  borderBottomRightRadius?: number;
  borderWidth?: number;
  borderTopWidth?: number;
  borderBottomWidth?: number;
  borderColor?: string;
  padding?: string;
  alignItems?: 'flex-start' | 'center' | 'flex-end';
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between';
  lineHeight?: number;
  textAlign?: 'left' | 'center' | 'right';
  fontFamily?: 'sans' | 'editorial' | 'display';
  fontWeight?: number | string;
  letterSpacing?: number | string;
};

export type MarketingDesign = {
  version: 1;
  width: number;
  height: number;
  background: string;
  layers: DesignLayer[];
};

export type CommercialTheme =
  | 'royal_gold'
  | 'luxe_dark'
  | 'rose_chic'
  | 'cyber_tech'
  | 'trust_amber'
  | 'emerald'
  | 'sand'
  | 'dark';

export type PosterTemplateLayout =
  | `business_${string}`
  | `professional_${string}`
  | `studio_${number}`
  | `kit_${string}`
  | 'bold_offer'
  | 'split_card'
  | 'tech_modern'
  | 'urgent_callout'
  | 'minimal_luxury';

export interface PosterTemplateMeta {
  id: PosterTemplateLayout;
  name: string;
  badge: string;
  icon: string;
  description: string;
}

export interface CommercialThemeConfig {
  id: CommercialTheme;
  name: string;
  bg: string;
  badgeBg: string;
  badgeText: string;
  subColor: string;
  ctaBg: string;
  ctaText: string;
  scrimBg: string;
  footerBg: string;
  accent: string;
}

export function validateDesign(value: unknown): MarketingDesign {
  if (JSON.stringify(value)?.length > 8_000_000) throw new Error('Design exceeds the 8 MB document limit');
  const d = value as MarketingDesign;
  const color = (s: unknown) => typeof s === 'string' && /^(#[0-9a-f]{6}|transparent)$/i.test(s);
  if (
    !d ||
    d.version !== 1 ||
    ![d.width, d.height].every((n) => Number.isInteger(n) && n >= 320 && n <= 2160) ||
    !color(d.background) ||
    !Array.isArray(d.layers) ||
    d.layers.length > 40
  ) {
    throw new Error('Invalid design document');
  }
  const ids = new Set<string>();
  for (const l of d.layers) {
    if (
      !l ||
      typeof l.id !== 'string' ||
      !l.id ||
      ids.has(l.id) ||
      !['text', 'image', 'shape'].includes(l.type) ||
      !color(l.color) ||
      !color(l.background) ||
      ![l.x, l.y, l.width, l.height, l.fontSize, l.opacity].every(Number.isFinite) ||
      l.x < 0 ||
      l.y < 0 ||
      l.width <= 0 ||
      l.height <= 0 ||
      l.x + l.width > d.width ||
      l.y + l.height > d.height ||
      l.fontSize < 8 ||
      l.fontSize > 200 ||
      l.opacity < 0 ||
      l.opacity > 1
    ) {
      throw new Error('Invalid design layer');
    }
    if (l.type === 'text' && (typeof l.text !== 'string' || l.text.length > 1000)) {
      throw new Error('Invalid design text');
    }
    if (
      l.type === 'image' &&
      (typeof l.src !== 'string' ||
        l.src.length > 6_000_000 ||
        !(
          /^(https:\/\/|data:image\/(png|jpeg|jpg|webp);base64,|data:image\/svg\+xml(;utf8,|;base64,|,))/i.test(l.src) ||
          /^\/images\/bgos\/templates\/[a-z0-9-]+\.webp$/.test(l.src)
        ))
    ) {
      throw new Error('Use an HTTPS image, SVG vector, or upload a PNG, JPEG or WebP');
    }
    if (l.assetId !== undefined && (typeof l.assetId !== 'string' || l.assetId.length > 100)) {
      throw new Error('Invalid asset reference');
    }
    if (l.rotation !== undefined && (!Number.isFinite(l.rotation) || Math.abs(l.rotation) > 180)) {
      throw new Error('Invalid rotation');
    }
    if (l.photoFit !== undefined && !['contain', 'cover'].includes(l.photoFit)) {
      throw new Error('Invalid photo fit');
    }
    for (const crop of [l.cropX, l.cropY]) {
      if (crop !== undefined && (!Number.isFinite(crop) || crop < 0 || crop > 100)) {
        throw new Error('Invalid crop position');
      }
    }
    for (const r of [
      l.borderRadius,
      l.borderTopLeftRadius,
      l.borderTopRightRadius,
      l.borderBottomLeftRadius,
      l.borderBottomRightRadius,
    ]) {
      if (r !== undefined && (!Number.isFinite(r) || r < 0 || r > 500)) {
        throw new Error('Invalid border radius');
      }
    }
    for (const bw of [l.borderWidth, l.borderTopWidth, l.borderBottomWidth]) {
      if (bw !== undefined && (!Number.isFinite(bw) || bw < 0 || bw > 50)) {
        throw new Error('Invalid border width');
      }
    }
    if (l.borderColor !== undefined && (typeof l.borderColor !== 'string' || l.borderColor.length > 50)) {
      throw new Error('Invalid border color');
    }
    if (l.padding !== undefined && (typeof l.padding !== 'string' || l.padding.length > 50)) {
      throw new Error('Invalid padding');
    }
    if (l.alignItems !== undefined && !['flex-start', 'center', 'flex-end'].includes(l.alignItems)) {
      throw new Error('Invalid alignItems');
    }
    if (
      l.justifyContent !== undefined &&
      !['flex-start', 'center', 'flex-end', 'space-between'].includes(l.justifyContent)
    ) {
      throw new Error('Invalid justifyContent');
    }
    if (l.fontFamily !== undefined && !['sans', 'editorial', 'display'].includes(l.fontFamily)) {
      throw new Error('Invalid font family');
    }
    if (l.fontWeight !== undefined && typeof l.fontWeight !== 'number' && typeof l.fontWeight !== 'string') {
      throw new Error('Invalid fontWeight');
    }
    if (l.letterSpacing !== undefined && typeof l.letterSpacing !== 'number' && typeof l.letterSpacing !== 'string') {
      throw new Error('Invalid letterSpacing');
    }
    if (l.lineHeight !== undefined && (!Number.isFinite(l.lineHeight) || l.lineHeight < 0.8 || l.lineHeight > 3)) {
      throw new Error('Invalid line spacing');
    }
    if (l.textAlign !== undefined && !['left', 'center', 'right'].includes(l.textAlign)) {
      throw new Error('Invalid text alignment');
    }
    if (l.locked !== undefined && typeof l.locked !== 'boolean') {
      throw new Error('Invalid lock state');
    }
    if (l.groupId !== undefined && (typeof l.groupId !== 'string' || !l.groupId || l.groupId.length > 100)) {
      throw new Error('Invalid layer group');
    }
    if (l.hidden !== undefined && typeof l.hidden !== 'boolean') {
      throw new Error('Invalid visibility');
    }
    ids.add(l.id);
  }
  return JSON.parse(JSON.stringify(d));
}

export function createDesign(input: {
  brand: string;
  headline: string;
  subtitle: string;
  badge: string;
  cta: string;
  photo: string;
  ratio?: string;
}): MarketingDesign {
  const sizes: Record<string, [number, number]> = {
    '1:1': [1080, 1080],
    '4:5': [1080, 1350],
    '9:16': [1080, 1920],
    '16:9': [1920, 1080],
  };
  const [width, height] = sizes[input.ratio || '1:1'] || sizes['1:1'];
  const layer = (id: string, type: DesignLayer['type'], y: number, h: number): DesignLayer => ({
    id,
    type,
    x: 60,
    y,
    width: width - 120,
    height: h,
    color: '#ffffff',
    background: 'transparent',
    fontSize: 48,
    opacity: 1,
  });
  return {
    version: 1,
    width,
    height,
    background: '#063d35',
    layers: [
      ...(input.photo ? [{ ...layer('photo', 'image', 0, height), x: 0, width, src: input.photo, opacity: 0.3, cropX: 50, cropY: 0 }] : []),
      { ...layer('brand', 'text', 60, 80), text: input.brand, fontSize: 32 },
      { ...layer('headline', 'text', height * 0.28, 220), text: input.headline, fontSize: 72 },
      { ...layer('badge', 'text', height * 0.55, 100), text: input.badge, fontSize: 60, color: '#5eead4' },
      { ...layer('subtitle', 'text', height * 0.68, 130), text: input.subtitle, fontSize: 36 },
      { ...layer('cta', 'text', height - 140, 80), text: input.cta, fontSize: 36 },
    ],
  };
}

import { composeBusinessEdition } from './business-template-design';
import { composeProfessionalPoster } from './professional-posters';
import { composeStudioPoster } from './poster-composition';
import { composeKitPoster } from './layered-templates-kit';
import {
  validateDesign,
  createDesign,
  type DesignLayer,
  type MarketingDesign,
  type CommercialTheme,
  type PosterTemplateLayout,
  type PosterTemplateMeta,
  type CommercialThemeConfig,
} from './marketing-design-core';

export {
  validateDesign,
  createDesign,
  type DesignLayer,
  type MarketingDesign,
  type CommercialTheme,
  type PosterTemplateLayout,
  type PosterTemplateMeta,
  type CommercialThemeConfig,
};

export const POSTER_TEMPLATES: PosterTemplateMeta[] = [
  {
    id: 'bold_offer',
    name: 'Bold Promo',
    badge: 'PROMO',
    icon: 'local-offer',
    description: 'High-contrast commercial offer with bold badge and dark scrim',
  },
  {
    id: 'split_card',
    name: 'Split Card',
    badge: 'POPULAR',
    icon: 'view-agenda',
    description: '50/50 photo on top with high-readability solid card below',
  },
  {
    id: 'tech_modern',
    name: 'Tech Modern',
    badge: 'SAAS',
    icon: 'memory',
    description: 'Sleek dark UI aesthetic with cyan/emerald telemetry accents',
  },
  {
    id: 'urgent_callout',
    name: 'Urgent 24/7',
    badge: 'RAPID',
    icon: 'bolt',
    description: 'Top emergency banner and instant phone callout for services',
  },
  {
    id: 'minimal_luxury',
    name: 'Minimal Luxury',
    badge: 'ELEGANT',
    icon: 'auto-awesome',
    description: 'Clean luxury layout with generous negative space and refined typography',
  },
];

export const COMMERCIAL_THEMES: Record<CommercialTheme, CommercialThemeConfig> = {
  royal_gold: {
    id: 'royal_gold',
    name: 'Royal Gold (Festive & Sweets)',
    bg: '#062419',
    badgeBg: '#B45309',
    badgeText: '#FFFFFF',
    subColor: '#FDE047',
    ctaBg: '#D97706',
    ctaText: '#FFFFFF',
    scrimBg: '#09150E',
    footerBg: '#06100B',
    accent: '#F59E0B',
  },
  luxe_dark: {
    id: 'luxe_dark',
    name: 'Luxe Dark (Jewellery & Luxury)',
    bg: '#090D16',
    badgeBg: '#CA8A04',
    badgeText: '#000000',
    subColor: '#FDE047',
    ctaBg: '#CA8A04',
    ctaText: '#000000',
    scrimBg: '#0A0A0C',
    footerBg: '#050507',
    accent: '#EAB308',
  },
  rose_chic: {
    id: 'rose_chic',
    name: 'Rose Chic (Apparel & Boutique)',
    bg: '#1F0B14',
    badgeBg: '#E11D48',
    badgeText: '#FFFFFF',
    subColor: '#FECDD3',
    ctaBg: '#E11D48',
    ctaText: '#FFFFFF',
    scrimBg: '#190810',
    footerBg: '#0F040A',
    accent: '#F43F5E',
  },
  cyber_tech: {
    id: 'cyber_tech',
    name: 'Cyber Tech (IT & Software)',
    bg: '#0B0F19',
    badgeBg: '#2563EB',
    badgeText: '#FFFFFF',
    subColor: '#38BDF8',
    ctaBg: '#0891B2',
    ctaText: '#FFFFFF',
    scrimBg: '#090E1A',
    footerBg: '#050810',
    accent: '#06B6D4',
  },
  trust_amber: {
    id: 'trust_amber',
    name: 'Trust Amber (Services & Trades)',
    bg: '#1C1917',
    badgeBg: '#EA580C',
    badgeText: '#FFFFFF',
    subColor: '#FED7AA',
    ctaBg: '#EA580C',
    ctaText: '#FFFFFF',
    scrimBg: '#171412',
    footerBg: '#0C0A09',
    accent: '#EA580C',
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Classic',
    bg: '#062419',
    badgeBg: '#009F50',
    badgeText: '#FFFFFF',
    subColor: '#34D399',
    ctaBg: '#009F50',
    ctaText: '#FFFFFF',
    scrimBg: '#071A12',
    footerBg: '#04100B',
    accent: '#10B981',
  },
  sand: {
    id: 'sand',
    name: 'Sand Earth',
    bg: '#1C1917',
    badgeBg: '#B45309',
    badgeText: '#FFFFFF',
    subColor: '#FDE047',
    ctaBg: '#B45309',
    ctaText: '#FFFFFF',
    scrimBg: '#171412',
    footerBg: '#0C0A09',
    accent: '#D97706',
  },
  dark: {
    id: 'dark',
    name: 'Dark Studio',
    bg: '#090D16',
    badgeBg: '#2563EB',
    badgeText: '#FFFFFF',
    subColor: '#60A5FA',
    ctaBg: '#2563EB',
    ctaText: '#FFFFFF',
    scrimBg: '#090D16',
    footerBg: '#05080E',
    accent: '#3B82F6',
  },
};

export const COMMERCIAL_THEME_KEYS: CommercialTheme[] = [
  'royal_gold',
  'luxe_dark',
  'rose_chic',
  'cyber_tech',
  'trust_amber',
];

export function createCommercialPosterDesign(input: {
  brand: string;
  headline: string;
  subtitle?: string;
  badge?: string;
  cta?: string;
  phone?: string;
  website?: string;
  photo?: string;
  ratio?: string;
  theme?: CommercialTheme | string;
  logoUrl?: string;
  tagline?: string;
  layout?: PosterTemplateLayout;
}): MarketingDesign {
  const sizes: Record<string, [number, number]> = {
    '1:1': [1080, 1080],
    '4:5': [1080, 1350],
    '9:16': [1080, 1920],
    '16:9': [1920, 1080],
  };
  const [width, height] = sizes[input.ratio || '4:5'] || sizes['4:5'];

  if (input.layout?.startsWith('business_')) return composeBusinessEdition(input);
  if (input.layout?.startsWith('kit_')) return composeKitPoster(input);
  if (input.layout?.startsWith('professional_')) return composeProfessionalPoster(input);
  if (input.layout?.startsWith('studio_')) return composeStudioPoster(input);
  const layout = input.layout || 'bold_offer';
  const themeColors = (COMMERCIAL_THEMES[input.theme as CommercialTheme] || COMMERCIAL_THEMES.emerald);

  const brandText = (input.brand || 'Professional Business').trim();
  const headlineText = (input.headline || 'Top-Rated Professional Services').trim();
  const badgeText = (input.badge || 'SPECIAL OFFER').trim().toUpperCase();
  const subText = (input.subtitle || 'Premium quality & 100% satisfaction guaranteed.').trim();
  const ctaLabel = (input.cta || (layout === 'urgent_callout' ? 'CALL NOW 📞' : 'VISIT STORE')).trim().toUpperCase();
  const taglineText = input.tagline ? ` • ${input.tagline.trim()}` : '';
  const webText = input.website
    ? input.website.replace(/^https?:\/\//, '').replace(/\/$/, '')
    : 'visit website';
  const isEligibleImage = (src?: string | null): boolean => {
    if (!src || typeof src !== 'string') return false;
    const trimmed = src.trim();
    return trimmed.length > 0 && /^(https:\/\/|data:image\/(png|jpeg|jpg|webp);base64,)/i.test(trimmed);
  };

  const isCustomUserPhoto = isEligibleImage(input.photo);
  const photoSrc = isCustomUserPhoto
    ? input.photo!.trim()
    : 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1080&q=80';
  const logoSrc = isEligibleImage(input.logoUrl) ? input.logoUrl!.trim() : undefined;

  const footerH = 140;

  // ─── LAYOUT VARIATION 1: Split Card (50/50 Photo on Top, Solid Card Below) ───
  if (layout === 'split_card') {
    const splitY = Math.round(height * 0.52);
    return validateDesign({
      version: 1,
      width,
      height,
      background: themeColors.bg,
      layers: [
        { id: 'bg_photo', type: 'image', x: 0, y: 0, width, height: splitY, src: photoSrc, color: '#ffffff', background: 'transparent', fontSize: 16, opacity: 1, cropX: 50, cropY: 0 },
        { id: 'card_bg', type: 'shape', x: 0, y: splitY, width, height: height - splitY, color: 'transparent', background: themeColors.scrimBg, fontSize: 16, opacity: 1, borderTopLeftRadius: 36, borderTopRightRadius: 36, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)' },
        { id: 'badge', type: 'text', x: 50, y: splitY + 28, width: Math.min(320, width - 100), height: 48, text: badgeText, color: themeColors.badgeText, background: themeColors.badgeBg, fontSize: 20, opacity: 1, borderRadius: 24, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center', padding: '0 24px', fontWeight: 900, letterSpacing: 1 },
        { id: 'brand', type: 'text', x: Math.min(400, width - 260), y: splitY + 32, width: Math.max(200, width - 450), height: 40, text: brandText.toUpperCase(), color: '#ffffff', background: 'transparent', fontSize: 22, opacity: 1, fontWeight: 800, letterSpacing: 0.8 },
        ...(logoSrc
          ? [
              {
                id: 'brand_logo',
                type: 'image' as const,
                x: width - 110,
                y: splitY + 28,
                width: 48,
                height: 48,
                src: logoSrc,
                color: '#ffffff',
                background: 'transparent',
                fontSize: 16,
                opacity: 1,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: 'rgba(255,255,255,0.4)',
              },
            ]
          : []),
        { id: 'headline', type: 'text', x: 50, y: splitY + 96, width: width - 100, height: 140, text: headlineText, color: '#ffffff', background: 'transparent', fontSize: width > 1080 ? 68 : 56, opacity: 1, fontWeight: 900, letterSpacing: -0.8 },
        { id: 'subtitle', type: 'text', x: 50, y: splitY + 242, width: width - 100, height: 70, text: subText, color: themeColors.subColor, background: 'transparent', fontSize: 28, opacity: 1, fontWeight: 700 },
        { id: 'footer_bg', type: 'shape', x: 0, y: height - footerH, width, height: footerH, color: 'transparent', background: themeColors.footerBg, fontSize: 16, opacity: 0.98, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
        { id: 'footer_brand', type: 'text', x: 50, y: height - footerH + 32, width: Math.max(200, width - 360), height: 76, text: `${brandText}${taglineText}\n🌐 ${webText}${input.phone ? ` • 📞 ${input.phone.trim()}` : ''}`, color: '#ffffff', background: 'transparent', fontSize: 22, opacity: 1, fontWeight: 600 },
        { id: 'cta', type: 'text', x: width - 290, y: height - footerH + 42, width: 240, height: 56, text: `${ctaLabel} →`, color: themeColors.ctaText, background: themeColors.ctaBg, fontSize: 22, opacity: 1, borderRadius: 28, alignItems: 'center', justifyContent: 'center', padding: '0 28px', fontWeight: 900, letterSpacing: 0.8, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)' },
      ],
    });
  }

  // ─── LAYOUT VARIATION 2: Urgent 24/7 Callout (Emergency Header Banner & Prominent Phone CTA) ───
  if (layout === 'urgent_callout') {
    const bottomContentH = 460;
    const bottomStartY = height - bottomContentH;
    return validateDesign({
      version: 1,
      width,
      height,
      background: '#180404',
      layers: [
        { id: 'bg_photo', type: 'image', x: 0, y: 0, width, height, src: photoSrc, color: '#ffffff', background: 'transparent', fontSize: 16, opacity: 1, cropX: 50, cropY: 0 },
        { id: 'urgent_banner', type: 'shape', x: 0, y: 0, width, height: 90, color: 'transparent', background: '#DC2626', fontSize: 16, opacity: 0.95 },
        { id: 'badge', type: 'text', x: 30, y: 22, width: width - 60, height: 46, text: `🚨 ${badgeText} • 24/7 RAPID RESPONSE`, color: '#FFFFFF', background: 'transparent', fontSize: 24, opacity: 1, alignItems: 'center', justifyContent: 'center', fontWeight: 900, letterSpacing: 1 },
        ...(logoSrc
          ? [
              {
                id: 'brand_logo',
                type: 'image' as const,
                x: width - 90,
                y: 18,
                width: 54,
                height: 54,
                src: logoSrc,
                color: '#ffffff',
                background: 'transparent',
                fontSize: 16,
                opacity: 1,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: 'rgba(255, 255, 255, 0.4)',
              },
            ]
          : []),
        { id: 'bottom_scrim', type: 'shape', x: 0, y: bottomStartY, width, height: bottomContentH, color: 'transparent', background: '#0F0303', fontSize: 16, opacity: 0.85, borderTopLeftRadius: 36, borderTopRightRadius: 36, borderWidth: 1.5, borderColor: 'rgba(239,68,68,0.3)' },
        { id: 'headline', type: 'text', x: 50, y: bottomStartY + 30, width: width - 100, height: 150, text: headlineText, color: '#FFFFFF', background: 'transparent', fontSize: width > 1080 ? 76 : 64, opacity: 1, fontWeight: 900, letterSpacing: -1 },
        { id: 'subtitle', type: 'text', x: 50, y: bottomStartY + 190, width: width - 100, height: 80, text: subText, color: '#FCA5A5', background: 'transparent', fontSize: 32, opacity: 1, fontWeight: 700 },
        { id: 'footer_bg', type: 'shape', x: 0, y: height - footerH, width, height: footerH, color: 'transparent', background: '#050101', fontSize: 16, opacity: 0.98, borderTopWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
        { id: 'footer_brand', type: 'text', x: 50, y: height - footerH + 32, width: Math.max(200, width - 360), height: 76, text: `${brandText}${taglineText}\n🌐 ${webText}${input.phone ? ` • 📞 ${input.phone.trim()}` : ''}`, color: '#ffffff', background: 'transparent', fontSize: 22, opacity: 1, fontWeight: 600 },
        { id: 'cta', type: 'text', x: width - 290, y: height - footerH + 42, width: 240, height: 56, text: `${ctaLabel}`, color: '#FFFFFF', background: '#DC2626', fontSize: 22, opacity: 1, borderRadius: 28, alignItems: 'center', justifyContent: 'center', padding: '0 28px', fontWeight: 900, letterSpacing: 0.8, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)' },
      ],
    });
  }

  // ─── LAYOUT VARIATION 3: Tech Modern (HUD Cyber Framing & Specs Row) ───
  if (layout === 'tech_modern') {
    const bottomContentH = 500;
    const bottomStartY = height - bottomContentH;
    return validateDesign({
      version: 1,
      width,
      height,
      background: '#040914',
      layers: [
        { id: 'bg_photo', type: 'image', x: 0, y: 0, width, height, src: photoSrc, color: '#ffffff', background: 'transparent', fontSize: 16, opacity: 0.9, cropX: 50, cropY: 0 },
        { id: 'hud_top_bar', type: 'shape', x: 40, y: 36, width: width - 80, height: 60, color: 'transparent', background: '#020617', fontSize: 16, opacity: 0.85, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(56, 189, 248, 0.4)' },
        { id: 'badge', type: 'text', x: 55, y: 46, width: 220, height: 40, text: `● ${badgeText}`, color: '#38bdf8', background: '#0e243a', fontSize: 18, opacity: 1, borderRadius: 20, alignItems: 'center', justifyContent: 'center', fontWeight: 900, letterSpacing: 1.2 },
        { id: 'brand', type: 'text', x: 290, y: 48, width: width - 420, height: 36, text: brandText.toUpperCase(), color: '#ffffff', background: 'transparent', fontSize: 20, opacity: 1, fontWeight: 800, letterSpacing: 1 },
        ...(logoSrc ? [{ id: 'brand_logo', type: 'image' as const, x: width - 110, y: 44, width: 44, height: 44, src: logoSrc, color: '#ffffff', background: 'transparent', fontSize: 16, opacity: 1, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.6)' }] : []),
        { id: 'bottom_scrim', type: 'shape', x: 30, y: bottomStartY, width: width - 60, height: bottomContentH - 30, color: 'transparent', background: '#050b1a', fontSize: 16, opacity: 0.92, borderRadius: 32, borderWidth: 1.5, borderColor: 'rgba(56, 189, 248, 0.25)' },
        { id: 'headline', type: 'text', x: 60, y: bottomStartY + 30, width: width - 120, height: 140, text: headlineText, color: '#ffffff', background: 'transparent', fontSize: width > 1080 ? 72 : 60, opacity: 1, fontWeight: 900, letterSpacing: -0.8 },
        { id: 'subtitle', type: 'text', x: 60, y: bottomStartY + 180, width: width - 120, height: 70, text: subText, color: '#94a3b8', background: 'transparent', fontSize: 26, opacity: 1, fontWeight: 700, letterSpacing: 0.2 },
        { id: 'specs_row', type: 'text', x: 60, y: bottomStartY + 260, width: width - 120, height: 44, text: '⚡ FAST SETUP  •  🛡️ ENTERPRISE READY  •  📱 LIVE SYNC', color: '#38bdf8', background: '#0e243a', fontSize: 16, opacity: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center', fontWeight: 800, letterSpacing: 0.8 },
        { id: 'footer_bg', type: 'shape', x: 0, y: height - footerH, width, height: footerH, color: 'transparent', background: '#020617', fontSize: 16, opacity: 0.98, borderTopWidth: 1, borderColor: 'rgba(56, 189, 248, 0.2)' },
        { id: 'footer_brand', type: 'text', x: 50, y: height - footerH + 32, width: Math.max(200, width - 360), height: 76, text: `${brandText}${taglineText}\n🌐 ${webText}${input.phone ? ` • 📞 ${input.phone.trim()}` : ''}`, color: '#e2e8f0', background: 'transparent', fontSize: 22, opacity: 1, fontWeight: 600 },
        { id: 'cta', type: 'text', x: width - 290, y: height - footerH + 42, width: 240, height: 56, text: `${ctaLabel} →`, color: '#020617', background: '#38bdf8', fontSize: 22, opacity: 1, borderRadius: 28, alignItems: 'center', justifyContent: 'center', padding: '0 28px', fontWeight: 900, letterSpacing: 0.8, borderWidth: 1.5, borderColor: '#ffffff' },
      ],
    });
  }

  // ─── LAYOUT VARIATION 4: Minimal Luxury (Refined Centered Layout & Delicate Framing) ───
  if (layout === 'minimal_luxury') {
    const bottomContentH = 500;
    const bottomStartY = height - bottomContentH;
    return validateDesign({
      version: 1,
      width,
      height,
      background: '#090807',
      layers: [
        { id: 'bg_photo', type: 'image', x: 0, y: 0, width, height, src: photoSrc, color: '#ffffff', background: 'transparent', fontSize: 16, opacity: 0.85, cropX: 50, cropY: 0 },
        { id: 'luxury_border', type: 'shape', x: 30, y: 30, width: width - 60, height: height - 60, color: 'transparent', background: 'transparent', fontSize: 16, opacity: 1, borderWidth: 1.5, borderColor: 'rgba(217, 180, 114, 0.45)' },
        { id: 'brand', type: 'text', x: 50, y: 60, width: width - 100, height: 46, text: brandText.toUpperCase(), color: '#d4af37', background: 'transparent', fontSize: 24, opacity: 1, alignItems: 'center', justifyContent: 'center', fontWeight: 800, letterSpacing: 4 },
        ...(logoSrc ? [{ id: 'brand_logo', type: 'image' as const, x: Math.round(width / 2 - 25), y: 115, width: 50, height: 50, src: logoSrc, color: '#ffffff', background: 'transparent', fontSize: 16, opacity: 1, borderRadius: 25, borderWidth: 1.5, borderColor: 'rgba(212, 175, 55, 0.8)' }] : []),
        { id: 'bottom_scrim', type: 'shape', x: 45, y: bottomStartY - 20, width: width - 90, height: bottomContentH - 20, color: 'transparent', background: '#0a0806', fontSize: 16, opacity: 0.88, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(217, 180, 114, 0.3)' },
        { id: 'badge', type: 'text', x: 60, y: bottomStartY, width: width - 120, height: 38, text: `— ${badgeText} —`, color: '#d4af37', background: 'transparent', fontSize: 20, opacity: 1, alignItems: 'center', justifyContent: 'center', fontWeight: 900, letterSpacing: 2 },
        { id: 'headline', type: 'text', x: 60, y: bottomStartY + 50, width: width - 120, height: 140, text: headlineText, color: '#ffffff', background: 'transparent', fontSize: width > 1080 ? 70 : 58, opacity: 1, alignItems: 'center', justifyContent: 'center', fontWeight: 900, letterSpacing: 0.5 },
        { id: 'subtitle', type: 'text', x: 60, y: bottomStartY + 200, width: width - 120, height: 70, text: subText, color: '#e5d6b8', background: 'transparent', fontSize: 26, opacity: 1, alignItems: 'center', justifyContent: 'center', fontWeight: 600, letterSpacing: 0.5 },
        { id: 'cta', type: 'text', x: Math.round(width / 2 - 140), y: bottomStartY + 285, width: 280, height: 56, text: `${ctaLabel}`, color: '#090807', background: '#d4af37', fontSize: 20, opacity: 1, borderRadius: 28, alignItems: 'center', justifyContent: 'center', fontWeight: 900, letterSpacing: 1.5, borderWidth: 1.5, borderColor: 'rgba(255, 255, 255, 0.4)' },
        { id: 'footer_bg', type: 'shape', x: 0, y: height - footerH, width, height: footerH, color: 'transparent', background: '#050403', fontSize: 16, opacity: 0.98, borderTopWidth: 1, borderColor: 'rgba(217, 180, 114, 0.2)' },
        { id: 'footer_brand', type: 'text', x: 50, y: height - footerH + 32, width: width - 100, height: 76, text: `🌐 ${webText}${input.phone ? ` • 📞 ${input.phone.trim()}` : ''}${taglineText}`, color: '#e5d6b8', background: 'transparent', fontSize: 20, opacity: 1, alignItems: 'center', justifyContent: 'center', fontWeight: 600, letterSpacing: 0.8 },
      ],
    });
  }

  // ─── DEFAULT & BOLD OFFER / PROMO ───
  const bottomContentH = 460;
  const bottomStartY = height - bottomContentH;

  const layers: DesignLayer[] = [
    // 1. Background image (full canvas)
    {
      id: 'bg_photo',
      type: 'image',
      x: 0,
      y: 0,
      width,
      height,
      src: photoSrc,
      color: '#ffffff',
      background: 'transparent',
      fontSize: 16,
      opacity: 1,
      cropX: 50,
      cropY: 0,
    },
    // 2. Top Scrim (dark gradient simulation - suppressed when custom user photo is provided)
    {
      id: 'top_scrim',
      type: 'shape',
      x: 0,
      y: 0,
      width,
      height: 140,
      color: 'transparent',
      background: '#000000',
      fontSize: 16,
      opacity: isCustomUserPhoto ? 0 : 0.55,
      hidden: isCustomUserPhoto,
    },
    // 3. Top Offer Badge
    {
      id: 'badge',
      type: 'text',
      x: 50,
      y: 40,
      width: Math.min(320, width - 100),
      height: 48,
      text: badgeText,
      color: themeColors.badgeText,
      background: themeColors.badgeBg,
      fontSize: 22,
      opacity: 1,
      borderRadius: 24,
      borderWidth: 1.5,
      borderColor: 'rgba(255, 255, 255, 0.35)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 24px',
      fontWeight: 900,
      letterSpacing: 1.2,
    },
    // 4. Top Brand
    {
      id: 'brand',
      type: 'text',
      x: Math.min(400, width - 260),
      y: 45,
      width: Math.max(200, width - 450),
      height: 40,
      text: brandText.toUpperCase(),
      color: '#ffffff',
      background: 'transparent',
      fontSize: 22,
      opacity: 1,
      fontWeight: 800,
      letterSpacing: 0.8,
    },
    ...(logoSrc
      ? [
          {
            id: 'brand_logo',
            type: 'image' as const,
            x: width - 110,
            y: 35,
            width: 60,
            height: 60,
            src: logoSrc,
            color: '#ffffff',
            background: 'transparent',
            fontSize: 16,
            opacity: 1,
            borderRadius: 16,
            borderWidth: 2,
            borderColor: 'rgba(255, 255, 255, 0.4)',
          },
        ]
      : []),
    // 5. Bottom Scrim (ensures headline & subtitle are 100% readable while preserving photography)
    {
      id: 'bottom_scrim',
      type: 'shape',
      x: 0,
      y: bottomStartY,
      width,
      height: bottomContentH,
      color: 'transparent',
      background: themeColors.scrimBg,
      fontSize: 16,
      opacity: 0.75,
      borderTopLeftRadius: 36,
      borderTopRightRadius: 36,
      borderWidth: 1.5,
      borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    // 6. Headline (Main marketing hook)
    {
      id: 'headline',
      type: 'text',
      x: 50,
      y: bottomStartY + 30,
      width: width - 100,
      height: 150,
      text: headlineText,
      color: '#ffffff',
      background: 'transparent',
      fontSize: width > 1080 ? 76 : 64,
      opacity: 1,
      fontWeight: 900,
      letterSpacing: -1,
    },
    // 7. Subtitle (Offer details / supporting text)
    {
      id: 'subtitle',
      type: 'text',
      x: 50,
      y: bottomStartY + 190,
      width: width - 100,
      height: 80,
      text: subText,
      color: themeColors.subColor,
      background: 'transparent',
      fontSize: 32,
      opacity: 1,
      fontWeight: 700,
      letterSpacing: 0.2,
    },
    // 8. Auto-Branded Footer Background
    {
      id: 'footer_bg',
      type: 'shape',
      x: 0,
      y: height - footerH,
      width,
      height: footerH,
      color: 'transparent',
      background: themeColors.footerBg,
      fontSize: 16,
      opacity: 0.98,
      borderTopWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    // 9. Footer Business Details (Name + Tagline / Website)
    {
      id: 'footer_brand',
      type: 'text',
      x: 50,
      y: height - footerH + 32,
      width: Math.max(200, width - 360),
      height: 76,
      text: `${brandText}${taglineText}\n🌐 ${webText}${input.phone ? ` • 📞 ${input.phone.trim()}` : ''}`,
      color: '#ffffff',
      background: 'transparent',
      fontSize: 22,
      opacity: 1,
      fontWeight: 600,
    },
    // 10. Call To Action Button
    {
      id: 'cta',
      type: 'text',
      x: width - 290,
      y: height - footerH + 42,
      width: 240,
      height: 56,
      text: `${ctaLabel} →`,
      color: '#ffffff',
      background: themeColors.ctaBg,
      fontSize: 22,
      opacity: 1,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 28px',
      fontWeight: 900,
      letterSpacing: 0.8,
      borderWidth: 1.5,
      borderColor: 'rgba(255, 255, 255, 0.25)',
    },
  ];

  return validateDesign({
    version: 1,
    width,
    height,
    background: themeColors.bg,
    layers,
  });
}
export function createFieserosCampaignDesign(): MarketingDesign {
  const width = 1080;
  const height = 1350;
  return {
    version: 1,
    width,
    height,
    background: '#062419',
    layers: [
      { id: 'brand', type: 'text', x: 60, y: 50, width: 300, height: 50, text: 'FIESEROS', color: '#ffffff', background: 'transparent', fontSize: 32, opacity: 1 },
      { id: 'badge', type: 'text', x: 780, y: 50, width: 240, height: 46, text: 'AI WORKFLOW', color: '#34d399', background: '#093a26', fontSize: 22, opacity: 1 },
      { id: 'headline', type: 'text', x: 60, y: 130, width: 960, height: 110, text: 'Less admin. More jobs.', color: '#ffffff', background: 'transparent', fontSize: 72, opacity: 1 },
      { id: 'subtitle', type: 'text', x: 60, y: 245, width: 960, height: 60, text: 'Meet your Fieseros AI Assistant.', color: '#34d399', background: 'transparent', fontSize: 34, opacity: 1 },
      { id: 'supporting', type: 'text', x: 60, y: 310, width: 960, height: 80, text: 'Customers, jobs, quotes and messages—connected through one conversation.', color: '#94a3b8', background: 'transparent', fontSize: 26, opacity: 1 },
      { id: 'cmd_bg', type: 'shape', x: 60, y: 410, width: 960, height: 210, text: '', color: 'transparent', background: '#093a26', fontSize: 16, opacity: 0.95 },
      { id: 'cmd_label', type: 'text', x: 90, y: 430, width: 400, height: 35, text: 'AI COMMAND', color: '#34d399', background: 'transparent', fontSize: 22, opacity: 1 },
      { id: 'cmd_text', type: 'text', x: 90, y: 475, width: 900, height: 120, text: '“Schedule a boiler repair for Sarah tomorrow, assign Mike, create a £350 quote, and prepare her confirmation.”', color: '#ffffff', background: 'transparent', fontSize: 28, opacity: 1 },
      { id: 'wf_label', type: 'text', x: 60, y: 645, width: 500, height: 35, text: 'PROPOSED WORKFLOW', color: '#94a3b8', background: 'transparent', fontSize: 20, opacity: 1 },
      { id: 'card_step_1', type: 'shape', x: 60, y: 690, width: 225, height: 180, text: '', color: 'transparent', background: '#0a3020', fontSize: 16, opacity: 1 },
      { id: 'text_step_1', type: 'text', x: 75, y: 705, width: 195, height: 150, text: '👤 Customer\nSarah J.\n(New enquiry)', color: '#ffffff', background: 'transparent', fontSize: 24, opacity: 1 },
      { id: 'card_step_2', type: 'shape', x: 305, y: 690, width: 225, height: 180, text: '', color: 'transparent', background: '#0a3020', fontSize: 16, opacity: 1 },
      { id: 'text_step_2', type: 'text', x: 320, y: 705, width: 195, height: 150, text: '🔧 Job\nBoiler Repair\nTomorrow 9am', color: '#ffffff', background: 'transparent', fontSize: 24, opacity: 1 },
      { id: 'card_step_3', type: 'shape', x: 550, y: 690, width: 225, height: 180, text: '', color: 'transparent', background: '#0a3020', fontSize: 16, opacity: 1 },
      { id: 'text_step_3', type: 'text', x: 565, y: 705, width: 195, height: 150, text: '📋 Quote\n£350.00\nDraft ready', color: '#ffffff', background: 'transparent', fontSize: 24, opacity: 1 },
      { id: 'card_step_4', type: 'shape', x: 795, y: 690, width: 225, height: 180, text: '', color: 'transparent', background: '#0a3020', fontSize: 16, opacity: 1 },
      { id: 'text_step_4', type: 'text', x: 810, y: 705, width: 195, height: 150, text: '✉️ Confirm\nMike assigned\nSMS queued', color: '#ffffff', background: 'transparent', fontSize: 24, opacity: 1 },
      { id: 'review_btn_bg', type: 'shape', x: 390, y: 900, width: 300, height: 60, text: '', color: 'transparent', background: '#0f4830', fontSize: 16, opacity: 1 },
      { id: 'review_btn_text', type: 'text', x: 390, y: 915, width: 300, height: 40, text: '✓ Review actions', color: '#34d399', background: 'transparent', fontSize: 24, opacity: 1 },
      { id: 'cta_bg', type: 'shape', x: 60, y: 1020, width: 360, height: 85, text: '', color: 'transparent', background: '#009f50', fontSize: 16, opacity: 1 },
      { id: 'cta', type: 'text', x: 90, y: 1042, width: 300, height: 50, text: 'Explore Fieseros →', color: '#ffffff', background: 'transparent', fontSize: 34, opacity: 1 },
      { id: 'footer', type: 'text', x: 60, y: 1250, width: 400, height: 50, text: 'fieseros.com', color: '#94a3b8', background: 'transparent', fontSize: 28, opacity: 1 },
    ],
  };
}

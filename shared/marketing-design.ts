/** Versioned, portable source document. Coordinates are in canvas pixels. */
export type DesignLayer = {
  id: string; type: 'text' | 'image' | 'shape'; x: number; y: number;
  width: number; height: number; text?: string; src?: string; assetId?: string; rotation?: number; cropX?: number; cropY?: number;
  color: string; background: string; fontSize: number; opacity: number;
};
export type MarketingDesign = { version: 1; width: number; height: number; background: string; layers: DesignLayer[] };
export function validateDesign(value: unknown): MarketingDesign {
  if (JSON.stringify(value)?.length > 8_000_000) throw new Error('Design exceeds the 8 MB document limit');
  const d = value as MarketingDesign;
  const color = (s: unknown) => typeof s === 'string' && /^(#[0-9a-f]{6}|transparent)$/i.test(s);
  if (!d || d.version !== 1 || ![d.width, d.height].every(n => Number.isInteger(n) && n >= 320 && n <= 2160) || !color(d.background) || !Array.isArray(d.layers) || d.layers.length > 40) throw new Error('Invalid design document');
  const ids = new Set<string>();
  for (const l of d.layers) {
    if (!l || typeof l.id !== 'string' || !l.id || ids.has(l.id) || !['text','image','shape'].includes(l.type) || !color(l.color) || !color(l.background) || ![l.x,l.y,l.width,l.height,l.fontSize,l.opacity].every(Number.isFinite) || l.x < 0 || l.y < 0 || l.width <= 0 || l.height <= 0 || l.x + l.width > d.width || l.y + l.height > d.height || l.fontSize < 8 || l.fontSize > 200 || l.opacity < 0 || l.opacity > 1) throw new Error('Invalid design layer');
    if (l.type === 'text' && (typeof l.text !== 'string' || l.text.length > 1000)) throw new Error('Invalid design text');
    if (l.type === 'image' && (typeof l.src !== 'string' || l.src.length > 6_000_000 || !/^(https:\/\/|data:image\/(png|jpeg|webp);base64,)/.test(l.src))) throw new Error('Use an HTTPS image or upload a PNG, JPEG or WebP');
    if(l.assetId !== undefined && (typeof l.assetId !== 'string' || l.assetId.length > 100)) throw new Error('Invalid asset reference');
    if(l.rotation !== undefined && (!Number.isFinite(l.rotation) || Math.abs(l.rotation)>180)) throw new Error('Invalid rotation');
    for(const crop of [l.cropX,l.cropY]) if(crop !== undefined && (!Number.isFinite(crop)||crop<0||crop>100)) throw new Error('Invalid crop position');
    ids.add(l.id);
  }
  return JSON.parse(JSON.stringify(d));
}
export function createDesign(input: { brand: string; headline: string; subtitle: string; badge: string; cta: string; photo: string; ratio?: string }): MarketingDesign {
  const sizes: Record<string, [number, number]> = { '1:1': [1080,1080], '4:5': [1080,1350], '9:16': [1080,1920], '16:9': [1920,1080] };
  const [width,height] = sizes[input.ratio || '1:1'] || sizes['1:1'];
  const layer = (id: string, type: DesignLayer['type'], y: number, h: number): DesignLayer => ({ id,type,x:60,y,width:width-120,height:h,color:'#ffffff',background:'transparent',fontSize:48,opacity:1 });
  return { version:1,width,height,background:'#063d35',layers:[
    ...(input.photo ? [{...layer('photo','image',0,height),x:0,width,src:input.photo,opacity:0.3}] : []),
    {...layer('brand','text',60,80),text:input.brand,fontSize:32},
    {...layer('headline','text',height*.28,220),text:input.headline,fontSize:72},
    {...layer('badge','text',height*.55,100),text:input.badge,fontSize:60,color:'#5eead4'},
    {...layer('subtitle','text',height*.68,130),text:input.subtitle,fontSize:36},
    {...layer('cta','text',height-140,80),text:input.cta,fontSize:36},
  ] };
}

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
  theme?: 'emerald' | 'sand' | 'dark';
}): MarketingDesign {
  const sizes: Record<string, [number, number]> = {
    '1:1': [1080, 1080],
    '4:5': [1080, 1350],
    '9:16': [1080, 1920],
    '16:9': [1920, 1080],
  };
  const [width, height] = sizes[input.ratio || '4:5'] || sizes['4:5'];

  const themeColors = {
    emerald: {
      bg: '#062419',
      badgeBg: '#009f50',
      badgeText: '#ffffff',
      subColor: '#34d399',
      ctaBg: '#009f50',
    },
    sand: {
      bg: '#1c1917',
      badgeBg: '#b45309',
      badgeText: '#ffffff',
      subColor: '#fde047',
      ctaBg: '#b45309',
    },
    dark: {
      bg: '#090d16',
      badgeBg: '#2563eb',
      badgeText: '#ffffff',
      subColor: '#60a5fa',
      ctaBg: '#2563eb',
    },
  }[input.theme || 'emerald'];

  const brandText = (input.brand || 'Professional Service').trim();
  const headlineText = (input.headline || 'Top-Rated Professional Services').trim();
  const badgeText = (input.badge || 'SPECIAL OFFER').trim().toUpperCase();
  const subText = (input.subtitle || 'Fast turnaround & 100% satisfaction guaranteed.').trim();
  const ctaLabel = (input.cta || 'BOOK NOW').trim().toUpperCase();
  const phoneText = input.phone ? ` • ${input.phone.trim()}` : '';
  const webText = input.website ? input.website.replace(/^https?:\/\//, '') : 'fieseros.com';
  const photoSrc = input.photo && input.photo.trim().length > 0
    ? input.photo.trim()
    : 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1080&q=80';

  const footerH = 140;
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
    },
    // 2. Top Scrim (dark gradient simulation)
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
      opacity: 0.55,
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
    },
    // 5. Bottom Dark Scrim (ensures headline & subtitle are 100% readable)
    {
      id: 'bottom_scrim',
      type: 'shape',
      x: 0,
      y: bottomStartY,
      width,
      height: bottomContentH,
      color: 'transparent',
      background: '#090d16',
      fontSize: 16,
      opacity: 0.88,
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
      background: '#05080e',
      fontSize: 16,
      opacity: 0.98,
    },
    // 9. Footer Business Details (Name + Phone)
    {
      id: 'footer_brand',
      type: 'text',
      x: 50,
      y: height - footerH + 35,
      width: Math.max(200, width - 360),
      height: 70,
      text: `${brandText}${phoneText}\n${webText}`,
      color: '#ffffff',
      background: 'transparent',
      fontSize: 24,
      opacity: 1,
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

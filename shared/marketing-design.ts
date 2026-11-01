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

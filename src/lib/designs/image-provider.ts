import { db } from '@/lib/db';
import { decryptKey } from '@/lib/ai-key-crypto';
import dns from 'node:dns/promises';
import fs from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';

export type ImageProvider = 'gemini' | 'openrouter' | 'cloudflare';

export interface GenerateDesignImageOptions {
  referenceImageUrls?: string[];
  autoFromBusiness?: boolean;
  aspectRatio?: '1:1' | '4:5' | '9:16' | '16:9';
}

const MAX_REFERENCE_IMAGES = 3;
const MAX_REFERENCE_IMAGE_BYTES = 8 * 1024 * 1024;

function isPrivateIpAddress(ip: string): boolean {
  const cleaned = ip.trim().toLowerCase();
  if (!cleaned) return true;
  if (cleaned === '::1' || cleaned === '0:0:0:0:0:0:0:1' || cleaned.startsWith('fe80:') || cleaned.startsWith('fc') || cleaned.startsWith('fd')) {
    return true;
  }
  const v4 = cleaned.startsWith('::ffff:') ? cleaned.slice(7) : cleaned;
  const parts = v4.split('.').map((n) => Number(n));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return net.isIP(v4) !== 0;
  }
  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

export function isUnsafeReferenceHostname(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/^\[|\]$/g, '');
  if (!host) return true;
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host === 'metadata.google.internal'
  ) {
    return true;
  }
  if (net.isIP(host) !== 0) {
    return isPrivateIpAddress(host);
  }
  return false;
}

async function assertSafeRemoteUrl(rawUrl: string): Promise<URL> {
  const parsed = new URL(rawUrl);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Unsupported reference image protocol: ${parsed.protocol}`);
  }
  if (parsed.username || parsed.password) {
    throw new Error('Credentials are not allowed in reference image URLs');
  }
  if (isUnsafeReferenceHostname(parsed.hostname)) {
    throw new Error('Blocked private or loopback reference image host');
  }
  try {
    const records = await dns.lookup(parsed.hostname, { all: true });
    if (records.some((r) => isPrivateIpAddress(r.address))) {
      throw new Error('Blocked private network IP for reference image URL');
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Blocked private')) {
      throw err;
    }
    // Non-blocking if DNS lookup isn't resolved locally (e.g., mocked fetch environments)
  }
  return parsed;
}

function detectImageMime(
  headerType: string | null | undefined,
  urlOrPath: string,
  bytes?: Buffer,
): 'image/png' | 'image/jpeg' | 'image/webp' | null {
  const ct = (headerType || '').split(';')[0].trim().toLowerCase();
  if (ct === 'image/png') return 'image/png';
  if (ct === 'image/jpeg' || ct === 'image/jpg') return 'image/jpeg';
  if (ct === 'image/webp') return 'image/webp';
  if (bytes && bytes.length >= 12) {
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
    if (bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  }
  const lower = urlOrPath.split('?')[0].toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  return null;
}

export async function fetchReferenceImages(
  urls: string[],
  signal?: AbortSignal,
): Promise<Array<{ url: string; mimeType: 'image/png' | 'image/jpeg' | 'image/webp'; base64: string }>> {
  const cleaned = Array.from(
    new Set(
      (Array.isArray(urls) ? urls : [])
        .filter((u): u is string => typeof u === 'string')
        .map((u) => u.trim())
        .filter(Boolean),
    ),
  ).slice(0, MAX_REFERENCE_IMAGES);

  const results: Array<{ url: string; mimeType: 'image/png' | 'image/jpeg' | 'image/webp'; base64: string }> = [];
  const publicUploadsRoot = path.resolve(process.cwd(), 'public', 'uploads');

  for (const refUrl of cleaned) {
    if (refUrl.startsWith('/uploads/')) {
      const relativeSubPath = refUrl.replace(/^\/uploads\//, '');
      const resolvedPath = path.resolve(publicUploadsRoot, relativeSubPath);
      if (resolvedPath !== publicUploadsRoot && !resolvedPath.startsWith(publicUploadsRoot + path.sep)) {
        throw new Error('Blocked path traversal in reference image path');
      }
      try {
        const bytes = await fs.readFile(resolvedPath);
        if (bytes.length > 0 && bytes.length <= MAX_REFERENCE_IMAGE_BYTES) {
          const mime = detectImageMime(null, resolvedPath, bytes);
          if (mime) {
            results.push({ url: refUrl, mimeType: mime, base64: bytes.toString('base64') });
          }
        }
      } catch (err) {
        console.warn('[image-provider] Failed reading local reference image:', refUrl, err instanceof Error ? err.message : err);
      }
      continue;
    }

    const safeUrl = await assertSafeRemoteUrl(refUrl);
    try {
      const fetchSignal = signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000);
      const res = await fetch(safeUrl.toString(), { signal: fetchSignal, redirect: 'follow' });
      if (!res.ok) continue;
      if (res.url) {
        await assertSafeRemoteUrl(res.url);
      }
      const cl = Number(res.headers.get('content-length') || 0);
      if (cl > MAX_REFERENCE_IMAGE_BYTES) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length === 0 || buf.length > MAX_REFERENCE_IMAGE_BYTES) continue;
      const mime = detectImageMime(res.headers.get('content-type'), refUrl, buf);
      if (!mime) continue;
      results.push({ url: refUrl, mimeType: mime, base64: buf.toString('base64') });
    } catch (err) {
      if (err instanceof Error && (err.message.includes('Blocked') || err.message.includes('Credentials') || err.message.includes('Unsupported'))) {
        throw err;
      }
      console.warn('[image-provider] Skipping unreachable reference image:', refUrl, err instanceof Error ? err.message : err);
    }
  }

  return results;
}

async function callCloudflareImage(
  text: string,
  signal: AbortSignal
): Promise<{ bytes: Buffer; model: string; cost: number | null }> {
  let accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  let authKey = process.env.CLOUDFLARE_AUTH_KEY || process.env.CLOUDFLARE_API_TOKEN;
  let email = process.env.CLOUDFLARE_AUTH_EMAIL;
  let keyRowId: string | null = null;

  const key = await db.aiProviderKey.findFirst({
    where: { provider: 'cloudflare', isActive: true },
    orderBy: { priority: 'asc' },
  }).catch(() => null);

  if (key) {
    keyRowId = key.id;
    try {
      const decrypted = decryptKey(key.encryptedKey);
      const parsed = JSON.parse(decrypted);
      if (parsed.accountId) accountId = parsed.accountId;
      if (parsed.authKey) authKey = parsed.authKey;
      if (parsed.email) email = parsed.email;
    } catch {
      authKey = decryptKey(key.encryptedKey);
    }
  }

  if (!accountId || !authKey) {
    throw new Error('Configure an active Cloudflare key in Superadmin or CLOUDFLARE_ACCOUNT_ID/AUTH_KEY in .env');
  }

  const model = process.env.CLOUDFLARE_IMAGE_MODEL || '@cf/black-forest-labs/flux-1-schnell';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (email && authKey.startsWith('cfk_')) {
    headers['X-Auth-Key'] = authKey;
    headers['X-Auth-Email'] = email;
  } else {
    headers['Authorization'] = `Bearer ${authKey}`;
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${model}`,
    {
      method: 'POST',
      signal,
      headers,
      body: JSON.stringify({ prompt: text, steps: 8 }),
    }
  );

  if (!response.ok) {
    throw new Error(`Cloudflare image generation failed (${response.status})`);
  }

  const contentType = response.headers.get('content-type') || '';
  let bytes: Buffer;
  if (contentType.includes('application/json')) {
    const data = await response.json();
    if (typeof data.result?.image === 'string') {
      bytes = Buffer.from(data.result.image, 'base64');
    } else {
      throw new Error('Cloudflare did not return a supported image');
    }
  } else {
    bytes = Buffer.from(await response.arrayBuffer());
  }

  if (bytes.length === 0 || bytes.length > 11_000_000) {
    throw new Error('Cloudflare returned an invalid image size');
  }

  if (keyRowId) {
    try {
      await db.aiProviderKey.update({
        where: { id: keyRowId },
        data: { lastUsedAt: new Date(), requestCount: { increment: 1 } },
      });
    } catch {}
  }

  return { bytes, model, cost: 0 };
}

export interface BusinessVisualContext {
  category?: string;
  businessName?: string;
  products?: string[] | string;
  services?: string[] | string;
  website?: string;
  referenceImageUrls?: string[];
  autoFromBusiness?: boolean;
  aspectRatio?: '1:1' | '4:5' | '9:16' | '16:9';
}

function cleanMarketingTopic(raw: string): string {
  return raw
    .replace(/^\[POSTER\]\s*/i, '')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\b(call|order|book|visit|contact)\s+(now|today|us|online)?\b/gi, '')
    .replace(/\b\d{7,}\b/g, '')
    .trim();
}

const hasWord = (text: string, words: string[]): boolean => {
  return words.some((w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text));
};

/**
 * Deterministic Semantic Scene Composer
 * Zero-latency fallback with dynamic archetype weighting (no rigid static domain traps).
 */
export function buildHighQualityImagePrompt(
  rawPrompt: string,
  isPosterOrContext?: boolean | BusinessVisualContext,
  contextArg?: BusinessVisualContext
): string {
  const isPoster = typeof isPosterOrContext === 'boolean' ? isPosterOrContext : undefined;
  const context =
    typeof isPosterOrContext === 'object' && isPosterOrContext !== null
      ? isPosterOrContext
      : contextArg;
  const isPosterMode = isPoster || rawPrompt.startsWith('[POSTER]');
  const cleanPrompt = cleanMarketingTopic(rawPrompt);
  // The editor already supplies explicit composition, occasion and style. A generic
  // business-domain fallback must not replace that art direction when copy AI fails.
  if (cleanPrompt.includes('Art direction:') && cleanPrompt.includes('Canvas ratio:')) {
    return `${cleanPrompt} Preserve the specified occasion, visual subject, art style and canvas composition. Clean high-resolution commercial artwork with clear space for editable overlays. No rendered text, logos or watermarks.`;
  }

  const productsList = Array.isArray(context?.products)
    ? context.products
    : typeof context?.products === 'string'
    ? [context.products]
    : [];
  const servicesList = Array.isArray(context?.services)
    ? context.services
    : typeof context?.services === 'string'
    ? [context.services]
    : [];

  const category = (context?.category || '').trim();
  const businessName = (context?.businessName || '').trim();
  const offerings = [...productsList, ...servicesList].filter(Boolean).join(', ');
  const pLower = cleanPrompt.toLowerCase();

  // Festive & Occasion Detection (High priority signal that overrides generic industry archetypes)
  const isDiwali = hasWord(pLower, ['diwali', 'deepavali', 'diya', 'diyas', 'rangoli', 'festival of lights', 'pataka', 'mithai']);
  const isEid = hasWord(pLower, ['eid', 'ramadan', 'crescent', 'iftar', 'eid mubarak']);
  const isChristmas = hasWord(pLower, ['christmas', 'xmas', 'holiday sale', 'santa', 'winter carnival', 'new year', 'year end']);
  const isRakhi = hasWord(pLower, ['rakhi', 'raksha bandhan', 'sibling']);
  const isHoli = hasWord(pLower, ['holi', 'gulal', 'colors festival', 'festival of colors']);
  const isFestive = isDiwali || isEid || isChristmas || isRakhi || isHoli || hasWord(pLower, ['festival', 'festive', 'celebration']);

  // Compute dynamic domain scores based on category (weight 10), offerings (weight 4), and prompt (weight 2)
  const catLower = category.toLowerCase();
  const offLower = offerings.toLowerCase();

  const scores = { tech: 0, food: 0, fashion: 0, jewellery: 0, trades: 0, hospitality: 0 };

  // Category matching (primary signal)
  if (hasWord(catLower, ['jewel', 'jewelry', 'jewellery', 'jeweller', 'jewellers', 'diamond', 'diamonds', 'gold ornament', 'solitaire', 'gemstone', 'gemstones'])) scores.jewellery += 10;
  if (hasWord(catLower, ['sweet', 'sweets', 'mithai', 'bakery', 'confectionery', 'cake', 'cakes', 'restaurant', 'cafe', 'food', 'dessert', 'desserts'])) scores.food += 10;
  if (hasWord(catLower, ['saree', 'sarees', 'ethnic wear', 'bridal lehenga', 'boutique', 'apparel', 'clothing', 'fashion', 'garment', 'garments', 'textile', 'textiles'])) scores.fashion += 10;
  if (hasWord(catLower, ['software', 'saas', 'tech', 'technology', 'it ', 'cloud', 'app', 'apps', 'telemetry', 'gps', 'developer', 'workforce'])) scores.tech += 10;
  if (hasWord(catLower, ['hvac', 'plumb', 'plumbing', 'electric', 'repair', 'repairs', 'contractor', 'trade', 'clean', 'cleaning', 'heating', 'cooling', 'air conditioning'])) scores.trades += 10;
  if (hasWord(catLower, ['farmhouse', 'farm house', 'resort', 'villa', 'cottage', 'homestay', 'retreat', 'banquet', 'staycation', 'glamping', 'hotel', 'hospitality', 'venue'])) scores.hospitality += 10;

  // Offerings matching (secondary signal)
  if (hasWord(offLower, ['jewel', 'jewelry', 'jewellery', 'diamond', 'diamonds', 'necklace', 'necklaces', 'gold necklace', 'bangles', 'solitaire', 'earrings', 'chokers'])) scores.jewellery += 4;
  if (hasWord(offLower, ['mithai', 'kaju katli', 'gulab jamun', 'ladoo', 'pastry', 'croissant', 'rasgulla', 'sweets'])) scores.food += 4;
  if (hasWord(offLower, ['saree', 'sarees', 'lehenga', 'lehengas', 'dupatta', 'banarasi', 'suit', 'dress'])) scores.fashion += 4;
  if (hasWord(offLower, ['employee tracking', 'tracking app', 'gps', 'telemetry', 'route map', 'punch in', 'attendance', 'mobile app', 'cloud migration', 'software'])) scores.tech += 4;
  if (hasWord(offLower, ['ac repair', 'furnace', 'duct cleaning', 'plumbing', 'technician', 'boiler'])) scores.trades += 4;
  if (hasWord(offLower, ['farmhouse', 'villa', 'swimming pool', 'lawn', 'staycation', 'weekend stay', 'banquet', 'garden venue', 'private pool'])) scores.hospitality += 4;

  // Prompt contextual matching (tertiary signal)
  if (hasWord(pLower, ['gps', 'attendance', 'punch', 'workforce', 'telemetry', 'route map', 'software', 'mobile app', 'saas'])) scores.tech += 2;
  if (hasWord(pLower, ['mithai', 'sweets', 'dessert', 'kaju katli', 'cake', 'pastry'])) scores.food += 2;
  if (hasWord(pLower, ['saree', 'lehenga', 'ethnic wear', 'bridal collection', 'couture'])) scores.fashion += 2;
  if (hasWord(pLower, ['diamond', 'solitaires', 'gold necklace', 'jewellery', 'jewels', 'hallmark'])) scores.jewellery += 2;
  if (hasWord(pLower, ['repair', 'hvac', 'plumbing', 'technician', 'air conditioning'])) scores.trades += 2;
  if (hasWord(pLower, ['farmhouse', 'villa', 'resort', 'pool', 'lawn', 'garden', 'cottage', 'patio', 'retreat'])) scores.hospitality += 3;

  let maxScore = 0;
  let winningArchetype: 'tech' | 'food' | 'fashion' | 'jewellery' | 'trades' | 'hospitality' | 'custom' = 'custom';
  for (const [key, score] of Object.entries(scores) as [keyof typeof scores, number][]) {
    if (score > maxScore) {
      maxScore = score;
      winningArchetype = key;
    }
  }

  let domainSubject = '';
  let styleDescriptor = 'Award-winning commercial promotional advertising photography';
  let settingDescriptor =
    'clean modern commercial setting with generous negative copy space for digital typography overlay';

  // Festive art direction takes precedence over generic category archetypes
  if (isDiwali) {
    styleDescriptor =
      'Award-winning commercial festive advertising photography, warm golden ambient glow, Diwali celebration aesthetic';
    settingDescriptor =
      'warm cinematic festive atmosphere, glowing traditional clay diya oil lamps, delicate marigold flower garlands, golden bokeh sparkles, elegant brass tableware, generous negative space for typography overlay';
    domainSubject =
      'Warm glowing traditional clay diya oil lamps arranged artfully with fresh orange and yellow marigold flower garlands, subtle golden fairy light bokeh, celebratory festive warmth, pristine commercial presentation';
    if (winningArchetype === 'jewellery') {
      domainSubject += ', accompanied by luxurious sparkling gold ornament reflections';
    } else if (winningArchetype === 'food') {
      domainSubject += ', artfully styled with fresh festive Kaju Katli and sweets on royal brass';
    }
  } else if (isEid) {
    styleDescriptor =
      'Award-winning royal festive celebration advertising photography, Eid Mubarak aesthetic, emerald and gold elegance';
    settingDescriptor =
      'royal emerald and gold ornate lanterns, glowing crescent moon motif, opulent ambient celebration lighting, clean negative copy space';
    domainSubject =
      'Ornate golden and brass Moroccan lanterns with soft warm candle glow, delicate date palm and dry fruit arrangement on a silver platter, elegant celebratory Eid atmosphere';
  } else if (isChristmas) {
    styleDescriptor =
      'Award-winning winter holiday commercial advertising photography, Christmas celebration aesthetic';
    settingDescriptor =
      'cozy holiday ambient lighting, pine needles, subtle golden baubles, warm fairy lights, soft snow dust texture, generous negative copy space';
    domainSubject =
      'Festive winter holiday celebration scene with natural pine cones, frosted evergreen branches, warm golden fairy lights, red ribbon accents, welcoming festive glow';
  } else if (winningArchetype === 'tech') {
    styleDescriptor =
      'Award-winning commercial tech product advertising photography, sleek mobile software UI, futuristic GPS map visual, clean contemporary device mockup';
    settingDescriptor =
      'soft dramatic studio ambient rim lighting, minimalist tech pedestal, clean shallow depth of field with generous negative copy space for typography';
    domainSubject =
      'Premium modern sleek smartphone mockup floating elegantly, displaying an intuitive mobile application interface with live GPS map navigation, user tracking location pins, clean route telemetry lines, and minimal workforce status cards, floating in a minimalist high-tech studio environment with soft ambient lighting';
  } else if (winningArchetype === 'food') {
    styleDescriptor =
      'Award-winning commercial gourmet food photography, mouthwatering artisanal confections, rich appetizing textures, pure desi ghee glazes, silver vark flakes, festive brass or marble platters';
    settingDescriptor =
      'warm gourmet food studio lighting, shallow depth of field, artful festive food styling with negative space';
    domainSubject =
      'Artisanal traditional sweets and fresh gourmet confections including rich Kaju Katli with silver vark and pistachio garnishes, beautifully styled on a festive royal brass platter';
  } else if (winningArchetype === 'fashion') {
    styleDescriptor =
      'High-end editorial fashion photography, luxurious designer textiles, elegant showroom mannequins, rich embroidery and fabric drape';
    settingDescriptor =
      'designer boutique studio lighting, soft natural shadows, minimalist aesthetic background with negative copy space';
    domainSubject =
      'Vibrant Banarasi and silk sarees with rich golden zari borders and elegant pleating displayed against minimalist boutique arches in an upscale showroom';
  } else if (winningArchetype === 'jewellery') {
    styleDescriptor =
      'Ultra-luxury commercial high-jewelry advertising photography, sparkling 22K hallmark gold and certified diamond solitaires, macro lens, glittering faceted light refractions';
    settingDescriptor =
      'black velvet pedestal display, dramatic jewelry spotlighting, pristine premium composition with generous negative space';
    domainSubject =
      'Brilliant-cut certified diamond solitaire rings and diamond necklace resting on black velvet, dramatic sparkling refractions and macro lens detail';
  } else if (winningArchetype === 'trades') {
    styleDescriptor =
      'Award-winning commercial trade & home service photography, professional certified technician, clean modern tools, welcoming atmosphere';
    settingDescriptor =
      'bright natural studio lighting, ultra-sharp focus, shallow depth of field with copy space';
    domainSubject =
      'Certified professional service technician in clean modern uniform inspecting equipment with advanced diagnostic tools, friendly trustworthy atmosphere, bright clean setting';
  } else if (winningArchetype === 'hospitality') {
    styleDescriptor =
      'Editorial luxury boutique property and outdoor venue photography, golden-hour warmth, architectural greenery, inviting resort ambiance';
    settingDescriptor =
      'natural sunlit garden courtyard and outdoor property setting with clean depth of field and balanced composition';
    domainSubject = `Authentic scenic showcase of ${businessName || 'the boutique farmhouse or villa retreat'}, manicured green lawns, warm ambient string lighting, relaxing outdoor seating, serene architectural details`;
  } else {
    // 100% Dynamic Custom Domain for ANY industry (Solar, Legal, Dental, Gym, Logistics, Agriculture, etc.)
    const primaryOfferings = offerings || category || 'professional business solutions';
    styleDescriptor = `Award-winning commercial promotional advertising photography representing ${primaryOfferings}`;
    settingDescriptor = `clean modern architectural setting tailored for ${category || 'contemporary business'}, bathed in natural soft studio light with generous negative copy space for text overlays`;
    domainSubject = `Professional commercial showcase for ${businessName || category || 'business'}, highlighting ${primaryOfferings}, modern state-of-the-art facilities, authentic equipment, clean aspirational presentation`;
  }

  // When the user writes an explicit scene prompt, let it lead so custom requests are honored faithfully.
  const hasExplicitScenePrompt = cleanPrompt && cleanPrompt.length > 10 && !domainSubject.toLowerCase().includes(cleanPrompt.toLowerCase().slice(0, 12));
  const finalSubject = hasExplicitScenePrompt
    ? !isFestive && cleanPrompt.length >= 24
      ? `${cleanPrompt} (tailored for ${businessName || category || 'business'}${offerings ? `: ${offerings}` : ''})`
      : `${domainSubject}, themed around ${cleanPrompt}`
    : domainSubject;

  if (isPosterMode) {
    return `${styleDescriptor}, promotional poster graphic (1080x1350 portrait format). Subject: ${finalSubject}. Shot on 35mm f/1.8 lens, natural studio lighting, ultra-sharp focus, shallow depth of field, 8k UHD resolution, hyper-realistic textures. Perfectly composed in ${settingDescriptor}. High-end commercial aesthetic, perfectly exposed, vivid realistic colors. ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS, NO NUMBERS, NO TYPOGRAPHY, NO FONTS, NO WATERMARKS, NO LOGOS, pure visual photography only.`;
  }

  return `${styleDescriptor}. Brief: ${finalSubject}. Shot on 35mm f/1.8 lens, natural studio lighting, ultra-sharp focus, shallow depth of field, 8k UHD resolution, hyper-realistic textures, clean modern background. Authentic, trustworthy, and welcoming atmosphere. Perfectly exposed, vivid realistic colors. ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS, NO NUMBERS, NO TYPOGRAPHY, NO FONTS, NO WATERMARKS, NO LOGOS, pure visual photography only.`;
}

/**
 * Dynamic LLM Visual Art Director
 * Asynchronously generates tailored photorealistic prompts for any business domain via callAI.
 */
export async function synthesizeDynamicVisualPrompt(
  rawPrompt: string,
  isPosterMode: boolean,
  context?: BusinessVisualContext,
  signal?: AbortSignal
): Promise<string> {
  const cleanPrompt = cleanMarketingTopic(rawPrompt);

  try {
    const { callAI } = await import('@/lib/ai-client');
    const systemPrompt = `You are an expert commercial advertising art director and photorealistic visual prompt engineer.
Given a business profile and a marketing brief, write a 60–80 word art-directed commercial visual prompt for an image diffusion generator (Flux.1).
Rules:
- Deeply understand the visual domain of the specific business from its actual category, products, services, and brief.
- Preserve the named occasion and requested style (including illustration, collage or festive artwork). Do not replace a festival brief with generic business imagery. When photography is requested, describe authentic, premium commercial photography: realistic physical subjects, professional studio/ambient lighting, authentic setting, shallow depth of field.
- If it is a digital product, software, or SaaS: describe a sleek floating smartphone or modern device mockup showcasing a clean interface with relevant map pins, route telemetry, or minimal status cards in a minimalist high-tech studio environment.
- If it is a trade or physical service: describe certified professionals with modern diagnostic gear or tools in an authentic, spotless setting.
- If it is a product, retail, food, or luxury business: describe an authentic high-end commercial showcase with rich textures and dramatic studio lighting.
- Composition: Compose with generous clean negative copy space ${isPosterMode ? 'in the center and upper thirds for digital typography overlay' : 'for clean commercial presentation'}.
- CRITICAL: Describe visual physical elements ONLY. ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS, NO NUMBERS, NO TYPOGRAPHY, NO FONTS, NO WATERMARKS, NO LOGOS.
- Output ONLY the raw descriptive prompt string with no commentary or quotes.`;

    const userPayload = JSON.stringify({
      businessName: context?.businessName || '',
      category: context?.category || '',
      products: context?.products || [],
      services: context?.services || [],
      website: context?.website || '',
      campaignBrief: cleanPrompt,
      format: isPosterMode ? 'poster' : 'photo',
    });

    const aiRes = await callAI({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPayload },
      ],
      temperature: 0.3,
    });

    let synthesized = (aiRes.content || '').trim().replace(/^["']|["']$/g, '');
    if (synthesized.length > 30) {
      if (!synthesized.includes('ABSOLUTELY NO TEXT')) {
        synthesized += ' Shot on 35mm f/1.8 lens, natural studio lighting, ultra-sharp focus, shallow depth of field, 8k UHD resolution, hyper-realistic textures. High-end commercial aesthetic, perfectly exposed, vivid realistic colors. ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS, NO NUMBERS, NO TYPOGRAPHY, NO FONTS, NO WATERMARKS, NO LOGOS, pure visual photography only.';
      }
      return synthesized;
    }
  } catch (err) {
    console.warn('[image-provider] Dynamic visual prompt AI synthesis fallback:', err instanceof Error ? err.message : err);
  }

  // Graceful deterministic fallback
  return buildHighQualityImagePrompt(rawPrompt, isPosterMode, context);
}

async function resolveProviderCredential(provider: 'gemini' | 'openrouter'): Promise<{
  secret: string;
  keyRowId: string | null;
} | null> {
  const key = await db.aiProviderKey.findFirst({
    where: { provider, isActive: true },
    orderBy: { priority: 'asc' },
  }).catch(() => null);

  if (key?.encryptedKey) {
    return { secret: decryptKey(key.encryptedKey), keyRowId: key.id };
  }

  const envSecret =
    provider === 'gemini' ? process.env.GEMINI_API_KEY : process.env.OPENROUTER_API_KEY;
  if (envSecret && envSecret.trim()) {
    return { secret: envSecret.trim(), keyRowId: null };
  }
  return null;
}

function parseProviderImageResponse(
  provider: 'gemini' | 'openrouter',
  data: any,
): string | null {
  if (provider === 'gemini') {
    const inline = data.candidates?.[0]?.content?.parts?.find((part: any) => part.inlineData)?.inlineData;
    const inlineMime = typeof inline?.mimeType === 'string' ? inline.mimeType.toLowerCase() : '';
    if (
      ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(inlineMime) &&
      typeof inline?.data === 'string' &&
      inline.data.length <= 11_000_000
    ) {
      return inline.data;
    }
    return null;
  }

  const uri = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  const match =
    typeof uri === 'string'
      ? /^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(uri)
      : null;
  const encoded = match?.[2];
  return typeof encoded === 'string' && encoded.length <= 11_000_000 ? encoded : null;
}

class UnsupportedImagePayloadError extends Error {}

async function callGeminiOrOpenRouterImage(params: {
  provider: 'gemini' | 'openrouter';
  promptText: string;
  referenceImages: Array<{ mimeType: 'image/png' | 'image/jpeg' | 'image/webp'; base64: string }>;
  signal: AbortSignal;
}): Promise<{ bytes: Buffer; model: string; cost: number | null }> {
  const cred = await resolveProviderCredential(params.provider);
  if (!cred) {
    throw new Error(`Configure an active ${params.provider} key in Superadmin`);
  }

  const model =
    params.provider === 'gemini'
      ? process.env.BGOS_GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image'
      : process.env.BGOS_OPENROUTER_IMAGE_MODEL || 'google/gemini-2.5-flash-image';

  const requestBody =
    params.provider === 'gemini'
      ? {
          contents: [
            {
              parts: [
                ...params.referenceImages.map((ref) => ({
                  inlineData: { mimeType: ref.mimeType, data: ref.base64 },
                })),
                { text: params.promptText },
              ],
            },
          ],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
        }
      : {
          model,
          messages: [
            {
              role: 'user',
              content:
                params.referenceImages.length > 0
                  ? [
                      { type: 'text', text: params.promptText },
                      ...params.referenceImages.map((ref) => ({
                        type: 'image_url',
                        image_url: { url: `data:${ref.mimeType};base64,${ref.base64}` },
                      })),
                    ]
                  : params.promptText,
            },
          ],
          modalities: ['image', 'text'],
        };

  const response = await fetch(
    params.provider === 'gemini'
      ? `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`
      : 'https://openrouter.ai/api/v1/chat/completions',
    {
      method: 'POST',
      signal: params.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(params.provider === 'gemini'
          ? { 'x-goog-api-key': cred.secret }
          : { Authorization: `Bearer ${cred.secret}` }),
      },
      body: JSON.stringify(requestBody),
    },
  );

  if (!response.ok) {
    throw new Error(`${params.provider} image generation failed (${response.status})`);
  }

  const data = await response.json();
  const encoded = parseProviderImageResponse(params.provider, data);
  if (!encoded) {
    throw new UnsupportedImagePayloadError('The provider did not return a supported image');
  }

  if (cred.keyRowId) {
    try {
      await db.aiProviderKey.update({
        where: { id: cred.keyRowId },
        data: { lastUsedAt: new Date(), requestCount: { increment: 1 } },
      });
    } catch {}
  }

  return {
    bytes: Buffer.from(encoded, 'base64'),
    model,
    cost: typeof data.usage?.cost === 'number' ? data.usage.cost : null,
  };
}

export async function generateDesignImage(
  prompt: string,
  provider: ImageProvider,
  signal: AbortSignal,
  isPoster?: boolean,
  context?: BusinessVisualContext,
  options?: GenerateDesignImageOptions
) {
  const isPosterMode = isPoster || prompt.startsWith('[POSTER]');
  const text = buildHighQualityImagePrompt(prompt, isPosterMode, context);
  const referenceUrls = options?.referenceImageUrls || context?.referenceImageUrls || [];
  const aspectRatio = options?.aspectRatio || context?.aspectRatio;
  const aspectHint = aspectRatio ? ` Frame for ${aspectRatio} aspect ratio.` : '';

  const loadedRefs =
    referenceUrls.length > 0 ? await fetchReferenceImages(referenceUrls, signal) : [];

  if (loadedRefs.length > 0) {
    const multimodalPrompt =
      `Using the attached real business reference photo(s), preserve the actual property, architecture, product appearance, and authentic character from the reference image(s), while composing this scene: ${text}${aspectHint}`.trim();

    const multimodalOrder: Array<'gemini' | 'openrouter'> =
      provider === 'openrouter' ? ['openrouter', 'gemini'] : ['gemini', 'openrouter'];

    let lastMultimodalError: unknown = null;
    for (const mmProvider of multimodalOrder) {
      try {
        return await callGeminiOrOpenRouterImage({
          provider: mmProvider,
          promptText: multimodalPrompt,
          referenceImages: loadedRefs,
          signal,
        });
      } catch (err) {
        lastMultimodalError = err;
      }
    }

    // Fallback to Cloudflare Flux with descriptive prompt when Gemini & OpenRouter are unavailable
    try {
      return await callCloudflareImage(`${text}${aspectHint}`, signal);
    } catch {
      if (lastMultimodalError instanceof Error) {
        throw lastMultimodalError;
      }
      throw new Error('Multimodal image generation failed across configured providers');
    }
  }

  if (provider === 'cloudflare') {
    return await callCloudflareImage(`${text}${aspectHint}`, signal);
  }

  try {
    return await callGeminiOrOpenRouterImage({
      provider,
      promptText: `${text}${aspectHint}`,
      referenceImages: [],
      signal,
    });
  } catch (primaryErr) {
    if (primaryErr instanceof UnsupportedImagePayloadError) {
      throw primaryErr;
    }
    try {
      return await callCloudflareImage(`${text}${aspectHint}`, signal);
    } catch {
      const secondary: 'gemini' | 'openrouter' =
        provider === 'gemini' ? 'openrouter' : 'gemini';
      try {
        return await callGeminiOrOpenRouterImage({
          provider: secondary,
          promptText: `${text}${aspectHint}`,
          referenceImages: [],
          signal,
        });
      } catch {
        throw primaryErr;
      }
    }
  }
}

export async function resolveCuratedImageFallback(
  prompt: string,
  context?: BusinessVisualContext
): Promise<{ bytes: Buffer; model: string; cost: number | null }> {
  const cleanPrompt = prompt.replace(/^\[POSTER\]\s*/i, '').trim();
  const pLower = cleanPrompt.toLowerCase();
  const category = (context?.category || '').toLowerCase();
  const offerings = [
    ...(context?.products || []),
    ...(context?.services || []),
  ].join(' ').toLowerCase();

  const isDiwali = hasWord(pLower, ['diwali', 'deepavali', 'diya', 'diyas', 'rangoli', 'festival of lights', 'pataka', 'mithai']);
  const isEid = hasWord(pLower, ['eid', 'ramadan', 'crescent', 'iftar', 'eid mubarak']);
  const isChristmas = hasWord(pLower, ['christmas', 'xmas', 'holiday sale', 'santa', 'winter carnival', 'new year', 'year end']);
  const isFood = hasWord(category + ' ' + offerings + ' ' + pLower, ['food', 'restaurant', 'cafe', 'bakery', 'sweet', 'mithai', 'dining', 'culinary', 'coffee']);
  const isJewellery = hasWord(category + ' ' + offerings + ' ' + pLower, ['jewellery', 'jewelry', 'gold', 'diamond', 'silver', 'ornament']);
  const isTech = hasWord(category + ' ' + offerings + ' ' + pLower, ['software', 'tech', 'saas', 'app', 'digital', 'cloud', 'developer', 'it ']);

  let stockUrl = 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1400&q=85';

  if (isDiwali) {
    stockUrl = 'https://images.unsplash.com/photo-1605379399642-870262d3d051?auto=format&fit=crop&w=1400&q=85';
  } else if (isEid) {
    stockUrl = 'https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&w=1400&q=85';
  } else if (isChristmas) {
    stockUrl = 'https://images.unsplash.com/photo-1543258103-a62bdc069871?auto=format&fit=crop&w=1400&q=85';
  } else if (isFood) {
    stockUrl = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1400&q=85';
  } else if (isJewellery) {
    stockUrl = 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1400&q=85';
  } else if (isTech) {
    stockUrl = 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1400&q=85';
  }

  try {
    const res = await fetch(stockUrl, { signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      const arrayBuf = await res.arrayBuffer();
      const bytes = Buffer.from(arrayBuf);
      if (bytes.length > 0) {
        return {
          bytes,
          model: 'curated-occasion-stock',
          cost: 0,
        };
      }
    }
  } catch (err) {
    console.warn('[resolveCuratedImageFallback] fetch failed, falling back to minimal buffer:', err);
  }

  const fallbackPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
  return {
    bytes: fallbackPng,
    model: 'curated-occasion-stock',
    cost: 0,
  };
}

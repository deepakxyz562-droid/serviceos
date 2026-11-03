import { db } from '@/lib/db';
import { decryptKey } from '@/lib/ai-key-crypto';

export type ImageProvider = 'gemini' | 'openrouter' | 'cloudflare';

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
  });

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
}

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
  // Clean raw prompt by stripping [POSTER] tag, URLs, phone numbers, and conversational call-to-actions
  const cleanPrompt = rawPrompt
    .replace(/^\[POSTER\]\s*/i, '')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\b(call|order|book|visit|contact)\s+(now|today|us|online)?\b/gi, '')
    .replace(/\b\d{7,}\b/g, '')
    .trim();

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

  // Combine user prompt with business category, products, and services for domain detection
  const allContext = [
    context?.category,
    context?.businessName,
    ...productsList,
    ...servicesList,
    context?.website,
    cleanPrompt,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  let domainSubject = '';
  let styleDescriptor = 'Award-winning commercial promotional advertising photography';
  let settingDescriptor =
    'clean modern commercial setting with generous negative copy space for digital typography overlay';

  // 1. Sweet Shop / Mithai / Confectionery / Bakery / Cafe / Food
  if (
    allContext.includes('sweet') ||
    allContext.includes('mithai') ||
    allContext.includes('bakery') ||
    allContext.includes('cake') ||
    allContext.includes('dessert') ||
    allContext.includes('ladoo') ||
    allContext.includes('gulab jamun') ||
    allContext.includes('kaju katli') ||
    allContext.includes('barfi') ||
    allContext.includes('pastry') ||
    allContext.includes('food') ||
    allContext.includes('restaurant') ||
    allContext.includes('cafe')
  ) {
    styleDescriptor =
      'Award-winning commercial gourmet food photography, mouthwatering artisanal confections, rich appetizing textures, pure desi ghee glazes, silver vark flakes, festive brass or marble platters';
    settingDescriptor =
      'warm gourmet food studio lighting, shallow depth of field, artful festive food styling with negative space';

    if (allContext.includes('hamper') || allContext.includes('gift') || allContext.includes('box')) {
      domainSubject =
        'Luxurious assorted Indian sweets and dry fruit gift hamper box, ornate festive packaging, artisanal mithai with silver vark and ribbon accents';
    } else if (allContext.includes('kaju') || allContext.includes('katli')) {
      domainSubject =
        'Fresh diamond-cut Kaju Katli with delicate silver vark, garnished with slivered pistachios on a royal brass platter';
    } else if (allContext.includes('cake') || allContext.includes('pastry') || allContext.includes('bakery')) {
      domainSubject =
        'Artisanal handcrafted gourmet bakery pastries, layered celebration cake, and fresh croissants in a warm Parisian cafe setting';
    } else {
      domainSubject =
        'Artisanal traditional Indian sweets including fresh Kaju Katli with silver vark, golden Gulab Jamun, and Motichoor Ladoos garnished with pistachios and saffron, beautifully presented in an ornate festive brass thali';
    }
  }
  // 2. Clothing / Fashion Boutique / Sarees / Bridal / Ethnic / Apparel
  else if (
    allContext.includes('cloth') ||
    allContext.includes('saree') ||
    allContext.includes('fashion') ||
    allContext.includes('boutique') ||
    allContext.includes('apparel') ||
    allContext.includes('dress') ||
    allContext.includes('lehenga') ||
    allContext.includes('bridal') ||
    allContext.includes('suit') ||
    allContext.includes('kurti') ||
    allContext.includes('garment') ||
    allContext.includes('textile') ||
    allContext.includes('tailor')
  ) {
    styleDescriptor =
      'High-end editorial fashion photography, luxurious designer textiles, elegant showroom mannequins, rich embroidery and fabric drape';
    settingDescriptor =
      'designer boutique studio lighting, soft natural shadows, minimalist aesthetic background with negative copy space';

    if (allContext.includes('bridal') || allContext.includes('lehenga') || allContext.includes('wedding')) {
      domainSubject =
        'Royal bridal designer lehenga with intricate golden zardozi embroidery and delicate dupatta drape displayed in a luxury boutique showroom';
    } else if (allContext.includes('saree') || allContext.includes('ethnic')) {
      domainSubject =
        'Vibrant Banarasi and Kanjivaram silk sarees with rich golden zari borders and elegant pleating displayed against minimalist boutique arches';
    } else if (allContext.includes('men') || allContext.includes('suit') || allContext.includes('sherwani')) {
      domainSubject =
        'Bespoke tailored luxury formal suits and designer ethnic sherwani displayed in an upscale modern tailoring studio';
    } else {
      domainSubject =
        'High-end designer fashion collection, luxurious silk textiles and contemporary ethnic apparel gracefully draped in an elegant boutique showroom';
    }
  }
  // 3. Jewellery / Gold / Diamond / Gems / Ornaments
  else if (
    allContext.includes('jewel') ||
    allContext.includes('gold') ||
    allContext.includes('diamond') ||
    allContext.includes('necklace') ||
    allContext.includes('ring') ||
    allContext.includes('ornament') ||
    allContext.includes('gem') ||
    allContext.includes('silver')
  ) {
    styleDescriptor =
      'Ultra-luxury commercial high-jewelry advertising photography, sparkling 22K hallmark gold and certified diamond solitaires, macro lens, glittering faceted light refractions';
    settingDescriptor =
      'black velvet pedestal display, dramatic jewelry spotlighting, pristine premium composition with generous negative space';

    if (allContext.includes('diamond') || allContext.includes('solitaire') || allContext.includes('ring')) {
      domainSubject =
        'Brilliant-cut certified diamond solitaire rings and diamond necklace resting on black velvet, dramatic sparkling refractions and macro lens detail';
    } else {
      domainSubject =
        'Ultra-luxury 22K hallmark gold bridal necklace set with matching earrings and bangles, glistening under dramatic jewelry studio lighting';
    }
  }
  // 4. IT Services / Software Agency / SaaS / Web & Mobile Apps / Digital
  else if (
    allContext.includes('software') ||
    allContext.includes('app') ||
    allContext.includes('tech') ||
    allContext.includes('it ') ||
    allContext.includes('code') ||
    allContext.includes('cloud') ||
    allContext.includes('saas') ||
    allContext.includes('digital') ||
    allContext.includes('developer') ||
    allContext.includes('agency') ||
    allContext.includes('web')
  ) {
    if (
      allContext.includes('employee track') ||
      allContext.includes('user track') ||
      allContext.includes('staff track') ||
      allContext.includes('gps track') ||
      allContext.includes('field track') ||
      allContext.includes('tracking app') ||
      allContext.includes('tracking') ||
      allContext.includes('mobile app') ||
      allContext.includes('attendance app') ||
      allContext.includes('ios app') ||
      allContext.includes('android app')
    ) {
      styleDescriptor =
        'Award-winning commercial tech product advertising photography, sleek mobile software UI, futuristic GPS map visual, clean contemporary device mockup';
      settingDescriptor =
        'soft dramatic studio ambient rim lighting, minimalist tech pedestal, clean shallow depth of field with generous negative copy space for typography';
      domainSubject =
        'Premium modern sleek smartphone mockup floating elegantly, displaying an intuitive mobile application interface with live GPS map navigation, user tracking location pins, clean route telemetry lines, and minimal workforce status cards, floating in a minimalist high-tech studio environment with soft ambient lighting';
    } else {
      styleDescriptor =
        'High-tech modern corporate technology photography, sleek software agency setup, modern code workspace, clean glass office environment';
      settingDescriptor =
        'contemporary ambient lighting, sharp focus, elegant negative copy space';
      domainSubject =
        'High-tech modern software engineering workspace, sleek ultrawide monitors displaying clean code and futuristic analytics dashboards in a glass architectural office with ambient lighting';
    }
  }
  // 5. Home Services / Trades (HVAC, Plumbing, Cleaning, Repairs, Electrical)
  else if (
    allContext.includes('plumb') ||
    allContext.includes('hvac') ||
    allContext.includes('ac ') ||
    allContext.includes('cooling') ||
    allContext.includes('clean') ||
    allContext.includes('repair') ||
    allContext.includes('service') ||
    allContext.includes('trade') ||
    allContext.includes('boiler') ||
    allContext.includes('heating')
  ) {
    styleDescriptor =
      'Award-winning commercial trade & home service photography, professional certified technician, clean modern tools, welcoming atmosphere';
    settingDescriptor =
      'bright natural studio lighting, ultra-sharp focus, shallow depth of field with copy space';

    domainSubject =
      'Certified professional service technician in clean modern uniform inspecting equipment with advanced diagnostic tools, friendly trustworthy atmosphere, bright clean setting';
  }
  // 6. Custom Offerings / General Business
  else if (context?.products?.length || context?.services?.length) {
    const offerings = [...(context.products || []), ...(context.services || [])].slice(0, 3).join(', ');
    domainSubject = `High-end commercial promotional product photography showcasing ${offerings}, premium craftsmanship, clean studio lighting`;
  }
  // 7. General Fallback
  else {
    domainSubject = cleanPrompt || 'Commercial business showcase and professional services';
  }

  // Combine synthesized subject with campaign visual theme
  const finalSubject = cleanPrompt && cleanPrompt.length > 3 && !domainSubject.toLowerCase().includes(cleanPrompt.toLowerCase().slice(0, 12))
    ? `${domainSubject}, themed around ${cleanPrompt}`
    : domainSubject;

  if (isPosterMode) {
    return `${styleDescriptor}. Subject: ${finalSubject}. Shot on 35mm f/1.8 lens, natural studio lighting, ultra-sharp focus, shallow depth of field, 8k UHD resolution, hyper-realistic textures. Perfectly composed in ${settingDescriptor}. High-end commercial aesthetic, perfectly exposed, vivid realistic colors. ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS, NO NUMBERS, NO TYPOGRAPHY, NO FONTS, NO WATERMARKS, NO LOGOS, pure visual photography only.`;
  }

  return `${styleDescriptor}. Brief: ${finalSubject}. Shot on 35mm f/1.8 lens, natural studio lighting, ultra-sharp focus, shallow depth of field, 8k UHD resolution, hyper-realistic textures, clean modern background. Authentic, trustworthy, and welcoming atmosphere. Perfectly exposed, vivid realistic colors. ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS, NO NUMBERS, NO TYPOGRAPHY, NO FONTS, NO WATERMARKS, NO LOGOS, pure visual photography only.`;
}

export async function generateDesignImage(
  prompt: string,
  provider: ImageProvider,
  signal: AbortSignal,
  isPoster?: boolean,
  context?: BusinessVisualContext
) {
  const isPosterMode = isPoster || prompt.startsWith('[POSTER]');
  const text = buildHighQualityImagePrompt(prompt, isPosterMode, context);

  if (provider === 'cloudflare') {
    return await callCloudflareImage(text, signal);
  }

  const key = await db.aiProviderKey.findFirst({
    where: { provider, isActive: true },
    orderBy: { priority: 'asc' },
  });
  if (!key) throw new Error(`Configure an active ${provider} key in Superadmin`);

  const secret = decryptKey(key.encryptedKey);
  const model =
    provider === 'gemini'
      ? process.env.BGOS_GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image'
      : process.env.BGOS_OPENROUTER_IMAGE_MODEL || 'google/gemini-2.5-flash-image';

  let response = await fetch(
    provider === 'gemini'
      ? `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`
      : 'https://openrouter.ai/api/v1/chat/completions',
    {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        ...(provider === 'gemini' ? { 'x-goog-api-key': secret } : { Authorization: `Bearer ${secret}` }),
      },
      body: JSON.stringify(
        provider === 'gemini'
          ? { contents: [{ parts: [{ text }] }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } }
          : { model, messages: [{ role: 'user', content: text }], modalities: ['image', 'text'] }
      ),
    }
  );

  // Auto-failover on rate-limiting (429) or unpaid balance (402)
  if (!response.ok && (response.status === 429 || response.status === 402)) {
    // Attempt Cloudflare Workers AI failover (free 10k daily neurons)
    try {
      return await callCloudflareImage(text, signal);
    } catch {
      // Try secondary OpenRouter key if gemini was requested
      if (provider === 'gemini') {
        const fallbackKey = await db.aiProviderKey.findFirst({
          where: { provider: 'openrouter', isActive: true },
          orderBy: { priority: 'asc' },
        });
        if (fallbackKey) {
          const fallbackSecret = decryptKey(fallbackKey.encryptedKey);
          const fallbackModel = process.env.BGOS_OPENROUTER_IMAGE_MODEL || 'google/gemini-2.5-flash-image';
          const fallbackRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            signal,
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${fallbackSecret}` },
            body: JSON.stringify({
              model: fallbackModel,
              messages: [{ role: 'user', content: text }],
              modalities: ['image', 'text'],
            }),
          });
          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json();
            const fallbackUri = fallbackData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
            const fallbackMatch =
              typeof fallbackUri === 'string'
                ? /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(fallbackUri)
                : null;
            const fallbackEncoded = fallbackMatch?.[2];
            if (typeof fallbackEncoded === 'string' && fallbackEncoded.length <= 11_000_000) {
              await db.aiProviderKey.update({
                where: { id: fallbackKey.id },
                data: { lastUsedAt: new Date(), requestCount: { increment: 1 } },
              });
              return {
                bytes: Buffer.from(fallbackEncoded, 'base64'),
                model: fallbackModel,
                cost: typeof fallbackData.usage?.cost === 'number' ? fallbackData.usage.cost : null,
              };
            }
          }
        }
      }
    }
  }

  if (!response.ok) {
    throw new Error(`${provider} image generation failed (${response.status}). Check model access and credit in Superadmin.`);
  }

  const data = await response.json();
  const inline = data.candidates?.[0]?.content?.parts?.find((part: any) => part.inlineData)?.inlineData;
  const uri = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  const match = typeof uri === 'string' ? /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(uri) : null;
  const encoded =
    provider === 'gemini' && ['image/png', 'image/jpeg', 'image/webp'].includes(inline?.mimeType)
      ? inline.data
      : match?.[2];
  if (typeof encoded !== 'string' || encoded.length > 11_000_000) {
    throw new Error('The provider did not return a supported image');
  }

  try {
    await db.aiProviderKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date(), requestCount: { increment: 1 } } });
  } catch {}

  return {
    bytes: Buffer.from(encoded, 'base64'),
    model,
    cost: typeof data.usage?.cost === 'number' ? data.usage.cost : null,
  };
}

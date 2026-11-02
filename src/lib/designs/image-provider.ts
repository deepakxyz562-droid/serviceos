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

export function buildHighQualityImagePrompt(rawPrompt: string, isPoster?: boolean): string {
  const isPosterMode = isPoster || rawPrompt.startsWith('[POSTER]');
  const cleanPrompt = rawPrompt.replace(/^\[POSTER\]\s*/, '').trim();

  if (isPosterMode) {
    return `Ultra-high quality commercial promotional advertising photography for a professional service business. Subject: ${cleanPrompt}. Shot on 35mm f/1.8 lens, natural studio lighting, ultra-sharp focus, shallow depth of field, 8k UHD resolution, hyper-realistic textures. Perfectly composed with generous negative space for digital typography overlay. High-end editorial photography style, perfectly exposed, vivid realistic colors. Clean modern commercial background. ABSOLUTELY NO TEXT, NO WORDS, NO LETTERS, NO NUMBERS, NO TYPOGRAPHY, NO FONTS, NO WATERMARKS, NO LOGOS, pure visual photography only.`;
  }

  return `Award-winning commercial promotional photography for a professional service business. Shot on 35mm f/1.8 lens, natural studio lighting, ultra-sharp focus, shallow depth of field, 8k UHD resolution, hyper-realistic textures, clean modern background. Authentic, trustworthy, and welcoming atmosphere. Brief: ${cleanPrompt}. High-end editorial photography style, perfectly exposed, vivid realistic colors, no text, no watermarks, no logos, no distorted features, no blurry artifacts.`;
}

export async function generateDesignImage(
  prompt: string,
  provider: ImageProvider,
  signal: AbortSignal,
  isPoster?: boolean
) {
  const isPosterMode = isPoster || prompt.startsWith('[POSTER]');
  const text = buildHighQualityImagePrompt(prompt, isPosterMode);

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

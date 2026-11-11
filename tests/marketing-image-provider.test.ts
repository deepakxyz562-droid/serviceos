// @vitest-environment node
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
const m = vi.hoisted(() => ({ find: vi.fn(), update: vi.fn(), fetch: vi.fn() }));
vi.mock('@/lib/db', () => ({ db: { aiProviderKey: { findFirst: m.find, update: m.update } } }));
vi.mock('@/lib/ai-key-crypto', () => ({
  decryptKey: (val: string) => (val.startsWith('{') ? val : 'private-key'),
}));
import { generateDesignImage, buildHighQualityImagePrompt } from '@/lib/designs/image-provider';

const ENV_BACKUP = {
  CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
  CLOUDFLARE_AUTH_KEY: process.env.CLOUDFLARE_AUTH_KEY,
  CLOUDFLARE_AUTH_EMAIL: process.env.CLOUDFLARE_AUTH_EMAIL,
  CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN,
  CLOUDFLARE_IMAGE_MODEL: process.env.CLOUDFLARE_IMAGE_MODEL,
  SILICONFLOW_API_KEY: process.env.SILICONFLOW_API_KEY,
  BGOS_SILICONFLOW_IMAGE_MODEL: process.env.BGOS_SILICONFLOW_IMAGE_MODEL,
  NVIDIA_API_KEY: process.env.NVIDIA_API_KEY,
  BGOS_NVIDIA_IMAGE_MODEL: process.env.BGOS_NVIDIA_IMAGE_MODEL,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
};

beforeEach(() => {
  vi.resetAllMocks();
  delete process.env.CLOUDFLARE_ACCOUNT_ID;
  delete process.env.CLOUDFLARE_AUTH_KEY;
  delete process.env.CLOUDFLARE_AUTH_EMAIL;
  delete process.env.CLOUDFLARE_API_TOKEN;
  delete process.env.CLOUDFLARE_IMAGE_MODEL;
  delete process.env.SILICONFLOW_API_KEY;
  delete process.env.BGOS_SILICONFLOW_IMAGE_MODEL;
  delete process.env.NVIDIA_API_KEY;
  delete process.env.BGOS_NVIDIA_IMAGE_MODEL;
  delete process.env.GEMINI_API_KEY;
  delete process.env.OPENROUTER_API_KEY;
  m.find.mockResolvedValue({ id: 'key', encryptedKey: 'encrypted' });
  vi.stubGlobal('fetch', m.fetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
  for (const [k, v] of Object.entries(ENV_BACKUP)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

it('uses the superadmin Gemini key and decodes the image', async () => {
  m.fetch.mockResolvedValue(
    new Response(
      JSON.stringify({
        candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: Buffer.from('image').toString('base64') } }] } }],
      }),
    ),
  );
  const result = await generateDesignImage('A forest', 'gemini', new AbortController().signal);
  expect(result.bytes.toString()).toBe('image');
  expect(m.fetch.mock.calls[0][1].headers['x-goog-api-key']).toBe('private-key');
  expect(m.find.mock.calls[0][0].where).toEqual({ provider: 'gemini', isActive: true });
});

it('uses OpenRouter and records reported cost without inventing a price', async () => {
  m.fetch.mockResolvedValue(
    new Response(
      JSON.stringify({
        choices: [{ message: { images: [{ image_url: { url: 'data:image/png;base64,aW1hZ2U=' } }] } }],
        usage: { cost: 0.04 },
      }),
    ),
  );
  expect((await generateDesignImage('A forest', 'openrouter', new AbortController().signal)).cost).toBe(0.04);
});

it('uses Cloudflare Workers AI FLUX.2 klein 9b with multipart FormData by default and decodes the image', async () => {
  m.find.mockResolvedValue({
    id: 'cf-key',
    encryptedKey: JSON.stringify({ accountId: 'acc-123', authKey: 'cfk_test', email: 'user@example.com' }),
  });
  m.fetch.mockResolvedValue(
    new Response(JSON.stringify({ result: { image: Buffer.from('cf-image').toString('base64') } }), {
      headers: { 'content-type': 'application/json' },
    }),
  );
  const result = await generateDesignImage('A dashboard', 'cloudflare', new AbortController().signal, true);
  expect(result.bytes.toString()).toBe('cf-image');
  expect(result.model).toBe('@cf/black-forest-labs/flux-2-klein-9b');
  expect(m.fetch.mock.calls[0][0]).toContain('acc-123/ai/run/@cf/black-forest-labs/flux-2-klein-9b');
  expect(m.fetch.mock.calls[0][1].headers['X-Auth-Key']).toBe('cfk_test');
  expect(m.fetch.mock.calls[0][1].headers['X-Auth-Email']).toBe('user@example.com');
  expect(m.fetch.mock.calls[0][1].headers['Content-Type']).toBeUndefined();
  const sentForm = m.fetch.mock.calls[0][1].body as FormData;
  expect(sentForm).toBeInstanceOf(FormData);
  expect(sentForm.get('width')).toBe('896');
  expect(sentForm.get('height')).toBe('1120');
});

it('falls back within Cloudflare from FLUX.2 klein 9b to Lucid Origin to FLUX.1 schnell', async () => {
  m.find.mockResolvedValue({
    id: 'cf-key',
    encryptedKey: JSON.stringify({ accountId: 'acc-123', authKey: 'cfk_test', email: 'user@example.com' }),
  });
  m.fetch
    .mockResolvedValueOnce(new Response('rate limited', { status: 429 }))
    .mockResolvedValueOnce(new Response('upstream error', { status: 500 }))
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ result: { image: Buffer.from('cf-fallback').toString('base64') } }), {
        headers: { 'content-type': 'application/json' },
      }),
    );

  const result = await generateDesignImage('Minimalist pottery studio', 'cloudflare', new AbortController().signal);
  expect(result.bytes.toString()).toBe('cf-fallback');
  expect(result.model).toBe('@cf/black-forest-labs/flux-1-schnell');
  expect(m.fetch.mock.calls[0][0]).toContain('@cf/black-forest-labs/flux-2-klein-9b');
  expect(m.fetch.mock.calls[1][0]).toContain('@cf/leonardo/lucid-origin');
  const lucidBody = JSON.parse(String(m.fetch.mock.calls[1][1].body));
  expect(lucidBody).toMatchObject({ width: 1024, height: 1024, num_steps: 20, guidance: 4.5 });
  expect(m.fetch.mock.calls[2][0]).toContain('@cf/black-forest-labs/flux-1-schnell');
});

it('generates images with SiliconFlow URL responses and blocks private SSRF image URLs', async () => {
  m.find.mockImplementation(async ({ where }: any) =>
    where?.provider === 'siliconflow' ? { id: 'sf-key', encryptedKey: 'sk-sf-encrypted' } : null,
  );
  m.fetch
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ images: [{ url: 'https://cdn.siliconflow.example/out/render.png' }] }), {
        headers: { 'content-type': 'application/json' },
      }),
    )
    .mockResolvedValueOnce(
      new Response(Buffer.from('sf-png-bytes'), {
        status: 200,
        headers: { 'content-type': 'image/png' },
      }),
    );

  const okRes = await generateDesignImage('Artisan espresso bar', 'siliconflow', new AbortController().signal, true);
  expect(okRes.bytes.toString()).toBe('sf-png-bytes');
  expect(okRes.model).toBe('Tongyi-MAI/Z-Image-Turbo');
  expect(m.fetch.mock.calls[0][0]).toBe('https://api.siliconflow.com/v1/images/generations');
  expect(JSON.parse(String(m.fetch.mock.calls[0][1].body))).toMatchObject({
    model: 'Tongyi-MAI/Z-Image-Turbo',
    image_size: '896x1152',
  });

  // SSRF block: SiliconFlow returning an internal IP URL must be rejected without fetching it
  m.fetch.mockReset();
  m.fetch.mockResolvedValueOnce(
    new Response(JSON.stringify({ images: [{ url: 'http://127.0.0.1/secret.png' }] }), {
      headers: { 'content-type': 'application/json' },
    }),
  );
  await expect(
    generateDesignImage('Artisan espresso bar', 'siliconflow', new AbortController().signal),
  ).rejects.toThrow(/Blocked private or loopback/);
  expect(m.fetch).toHaveBeenCalledTimes(1);
});

it('generates images with NVIDIA NIM FLUX and falls back to Cloudflare on 504', async () => {
  m.find.mockImplementation(async ({ where }: any) => {
    if (where?.provider === 'nvidia') return { id: 'nv-key', encryptedKey: 'nv-secret' };
    if (where?.provider === 'cloudflare') {
      return {
        id: 'cf-key',
        encryptedKey: JSON.stringify({ accountId: 'acc-123', authKey: 'cf-token' }),
      };
    }
    return null;
  });

  m.fetch.mockResolvedValueOnce(
    new Response(JSON.stringify({ artifacts: [{ base64: Buffer.from('nv-img').toString('base64') }] }), {
      headers: { 'content-type': 'application/json' },
    }),
  );
  const nvRes = await generateDesignImage('Luxury salon exterior', 'nvidia', new AbortController().signal, false, undefined, {
    aspectRatio: '4:5',
  });
  expect(nvRes.bytes.toString()).toBe('nv-img');
  expect(nvRes.model).toBe('black-forest-labs/flux.1-dev');
  expect(m.fetch.mock.calls[0][0]).toBe('https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-dev');
  expect(JSON.parse(String(m.fetch.mock.calls[0][1].body))).toMatchObject({
    width: 896,
    height: 1152,
    steps: 25,
    mode: 'base',
  });

  // When NVIDIA fails (504) and SiliconFlow isn't active, automatically fails over to Cloudflare FLUX.2
  m.fetch.mockReset();
  m.fetch
    .mockResolvedValueOnce(new Response('gateway timeout', { status: 504 }))
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ result: { image: Buffer.from('cf-rescue').toString('base64') } }), {
        headers: { 'content-type': 'application/json' },
      }),
    );
  const rescueRes = await generateDesignImage('Luxury salon exterior', 'nvidia', new AbortController().signal);
  expect(rescueRes.bytes.toString()).toBe('cf-rescue');
  expect(rescueRes.model).toBe('@cf/black-forest-labs/flux-2-klein-9b');
});

it('falls back cleanly from SiliconFlow 402 insufficient balance to Cloudflare FLUX.2', async () => {
  m.find.mockImplementation(async ({ where }: any) => {
    if (where?.provider === 'siliconflow') return { id: 'sf-key', encryptedKey: 'sf-secret' };
    if (where?.provider === 'cloudflare') {
      return {
        id: 'cf-key',
        encryptedKey: JSON.stringify({ accountId: 'acc-123', authKey: 'cf-token' }),
      };
    }
    return null;
  });
  m.fetch
    .mockResolvedValueOnce(new Response(JSON.stringify({ code: 30001, message: 'insufficient' }), { status: 402 }))
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ result: { image: Buffer.from('cf-from-402').toString('base64') } }), {
        headers: { 'content-type': 'application/json' },
      }),
    );

  const res = await generateDesignImage('Diwali Jewelry Showcase', 'siliconflow', new AbortController().signal);
  expect(res.bytes.toString()).toBe('cf-from-402');
  expect(res.model).toBe('@cf/black-forest-labs/flux-2-klein-9b');
});
it('does not silently fall back when no active key is configured',async()=>{
 m.find.mockResolvedValue(null);await expect(generateDesignImage('Test','gemini',new AbortController().signal)).rejects.toThrow('Superadmin');expect(m.fetch).not.toHaveBeenCalled();
});
it('rejects text-only responses and does not fetch arbitrary image URLs',async()=>{
 m.fetch.mockResolvedValue(new Response(JSON.stringify({choices:[{message:{images:[{image_url:{url:'https://internal.example/private'}}]}}]})));
 await expect(generateDesignImage('Test','openrouter',new AbortController().signal)).rejects.toThrow('supported image');expect(m.fetch).toHaveBeenCalledTimes(1);
});
it('formats poster generation prompts with high-fidelity creative instructions',async()=>{
 m.fetch.mockResolvedValue(new Response(JSON.stringify({candidates:[{content:{parts:[{inlineData:{mimeType:'image/png',data:Buffer.from('poster').toString('base64')}}]}}]})));
 await generateDesignImage('Fieseros AI Assistant','gemini',new AbortController().signal,true);
 const sentBody=JSON.parse(m.fetch.mock.calls[0][1].body);
 expect(sentBody.contents[0].parts[0].text).toContain('promotional poster graphic (1080x1350 portrait format)');
 expect(sentBody.contents[0].parts[0].text).toContain('Fieseros AI Assistant');
});
it('detects [POSTER] prefix in prompt text automatically',async()=>{
 m.fetch.mockResolvedValue(new Response(JSON.stringify({candidates:[{content:{parts:[{inlineData:{mimeType:'image/png',data:Buffer.from('poster').toString('base64')}}]}}]})));
 await generateDesignImage('[POSTER] Plumbing Seasonal Offer','gemini',new AbortController().signal);
 const sentBody=JSON.parse(m.fetch.mock.calls[0][1].body);
 expect(sentBody.contents[0].parts[0].text).toContain('promotional poster graphic (1080x1350 portrait format)');
 expect(sentBody.contents[0].parts[0].text).toContain('Plumbing Seasonal Offer');
 expect(sentBody.contents[0].parts[0].text).not.toContain('[POSTER]');
});
it('prioritizes festive occasion over business category archetype', async () => {
 m.fetch.mockResolvedValue(new Response(JSON.stringify({candidates:[{content:{parts:[{inlineData:{mimeType:'image/png',data:Buffer.from('diwali-poster').toString('base64')}}]}}]})));
 await generateDesignImage(
   '[POSTER] Diwali Glow Special 20% OFF',
   'gemini',
   new AbortController().signal,
   true,
   { category: 'Software & IT Solutions', businessName: 'CloudTech Systems' }
 );
 const sentBody = JSON.parse(m.fetch.mock.calls[0][1].body);
 const promptText = sentBody.contents[0].parts[0].text;
 expect(promptText).toContain('diya');
 expect(promptText).toContain('marigold');
 expect(promptText).not.toContain('smartphone mockup');
});

it('produces diverse scene subjects and lighting across consecutive calls for the same business', () => {
  const prompts = new Set<string>();
  const context = {
    category: 'Software & IT Solutions',
    businessName: 'CloudTech Systems',
    services: ['Cloud Hosting', 'Cybersecurity'],
  };
  for (let i = 0; i < 20; i++) {
    prompts.add(buildHighQualityImagePrompt('Boost your tech presence', false, context));
  }
  expect(prompts.size).toBeGreaterThanOrEqual(3);
});

it('injects randomized seeds into NVIDIA requests', async () => {
  m.find.mockImplementation(async ({ where }: any) => {
    if (where?.provider === 'nvidia') return { id: 'nv-key', encryptedKey: 'nv-secret' };
    return null;
  });
  m.fetch.mockResolvedValue(
    new Response(JSON.stringify({ artifacts: [{ base64: Buffer.from('nv-img').toString('base64') }] }), {
      headers: { 'content-type': 'application/json' },
    }),
  );
  await generateDesignImage('Luxury villa exterior', 'nvidia', new AbortController().signal);
  const sentBody = JSON.parse(String(m.fetch.mock.calls[0][1].body));
  expect(typeof sentBody.seed).toBe('number');
  expect(sentBody.seed).toBeGreaterThan(0);
});

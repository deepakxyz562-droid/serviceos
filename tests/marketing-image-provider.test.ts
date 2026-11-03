// @vitest-environment node
import { beforeEach,afterEach,it,expect,vi } from 'vitest';
const m=vi.hoisted(()=>({find:vi.fn(),update:vi.fn(),fetch:vi.fn()}));
vi.mock('@/lib/db',()=>({db:{aiProviderKey:{findFirst:m.find,update:m.update}}}));
vi.mock('@/lib/ai-key-crypto',()=>({decryptKey:(val: string)=> val.startsWith('{') ? val : 'private-key'}));
import { generateDesignImage } from '@/lib/designs/image-provider';
beforeEach(()=>{vi.resetAllMocks();m.find.mockResolvedValue({id:'key',encryptedKey:'encrypted'});vi.stubGlobal('fetch',m.fetch);});
afterEach(()=>vi.unstubAllGlobals());
it('uses the superadmin Gemini key and decodes the image',async()=>{
 m.fetch.mockResolvedValue(new Response(JSON.stringify({candidates:[{content:{parts:[{inlineData:{mimeType:'image/png',data:Buffer.from('image').toString('base64')}}]}}]})));
 const result=await generateDesignImage('A forest','gemini',new AbortController().signal);
 expect(result.bytes.toString()).toBe('image');expect(m.fetch.mock.calls[0][1].headers['x-goog-api-key']).toBe('private-key');
 expect(m.find.mock.calls[0][0].where).toEqual({provider:'gemini',isActive:true});
});
it('uses OpenRouter and records reported cost without inventing a price',async()=>{
 m.fetch.mockResolvedValue(new Response(JSON.stringify({choices:[{message:{images:[{image_url:{url:'data:image/png;base64,aW1hZ2U='}}]}}],usage:{cost:0.04}})));
 expect((await generateDesignImage('A forest','openrouter',new AbortController().signal)).cost).toBe(0.04);
});
it('uses Cloudflare Workers AI Flux-1 Schnell and decodes the image', async () => {
  m.find.mockResolvedValue({
    id: 'cf-key',
    encryptedKey: JSON.stringify({ accountId: 'acc-123', authKey: 'cfk_test', email: 'user@example.com' }),
  });
  m.fetch.mockResolvedValue(new Response(JSON.stringify({ result: { image: Buffer.from('cf-image').toString('base64') } }), {
    headers: { 'content-type': 'application/json' },
  }));
  const result = await generateDesignImage('A dashboard', 'cloudflare', new AbortController().signal);
  expect(result.bytes.toString()).toBe('cf-image');
  expect(result.model).toContain('flux-1-schnell');
  expect(m.fetch.mock.calls[0][0]).toContain('acc-123');
  expect(m.fetch.mock.calls[0][1].headers['X-Auth-Key']).toBe('cfk_test');
  expect(m.fetch.mock.calls[0][1].headers['X-Auth-Email']).toBe('user@example.com');
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

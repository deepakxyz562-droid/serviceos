// @vitest-environment node
import { beforeEach,afterEach,it,expect,vi } from 'vitest';
const m=vi.hoisted(()=>({find:vi.fn(),update:vi.fn(),fetch:vi.fn()}));
vi.mock('@/lib/db',()=>({db:{aiProviderKey:{findFirst:m.find,update:m.update}}}));
vi.mock('@/lib/ai-key-crypto',()=>({decryptKey:()=> 'private-key'}));
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
it('does not silently fall back when no active key is configured',async()=>{
 m.find.mockResolvedValue(null);await expect(generateDesignImage('Test','gemini',new AbortController().signal)).rejects.toThrow('Superadmin');expect(m.fetch).not.toHaveBeenCalled();
});
it('rejects text-only responses and does not fetch arbitrary image URLs',async()=>{
 m.fetch.mockResolvedValue(new Response(JSON.stringify({choices:[{message:{images:[{image_url:{url:'https://internal.example/private'}}]}}]})));
 await expect(generateDesignImage('Test','openrouter',new AbortController().signal)).rejects.toThrow('supported image');expect(m.fetch).toHaveBeenCalledTimes(1);
});

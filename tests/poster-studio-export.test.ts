// @vitest-environment node
import { expect, it, vi } from 'vitest';
import { composeStudioPoster } from '../shared/poster-composition';
const captured=vi.hoisted(()=>({buffers:[] as Buffer[]}));
vi.mock('@/lib/db',()=>({db:{imageLibrary:{findFirst:vi.fn(),upsert:vi.fn()}}}));
vi.mock('@/lib/supabase-storage',()=>({uploadFile:vi.fn(async(p:any)=>{captured.buffers.push(p.file);return {url:'https://assets.example/poster.png'};}),isS3Configured:()=>true,isSupabaseStorageConfigured:()=>false}));
import { renderDesign } from '@/lib/designs/render';
it('exports all fifteen composition families with editable typography to PNG',async()=>{
 for(let family=0;family<15;family++){
  const design=composeStudioPoster({brand:'Studio North',headline:'A fresh perspective.\nA new beginning.',subtitle:'Discover what comes next.',cta:'Explore the collection',badge:'NEW SEASON',layout:`studio_${family}`,theme:'emerald'});
  await renderDesign(design,'poster-test-tenant');
 }
 expect(captured.buffers).toHaveLength(15);
 for(const png of captured.buffers)expect(png.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');
},60000);
it('exports JPEG and excludes hidden layers',async()=>{
 const design=composeStudioPoster({brand:'Studio North',headline:'Hello',layout:'studio_0'});
 design.layers=design.layers.map(l=>({...l,hidden:true}));
 const result=await renderDesign(design,'poster-test-tenant',{format:'jpeg'});
 expect(result.format).toBe('jpeg');
 expect(captured.buffers.at(-1)!.subarray(0,2).toString('hex')).toBe('ffd8');
});
it('renders a transparent canvas as real alpha and hidden text as background pixels',async()=>{
 const sharp=(await import('sharp')).default;
 const design=composeStudioPoster({brand:'Studio North',headline:'Hello',layout:'studio_0'});
 design.layers=design.layers.map(l=>({...l,hidden:true}));design.background='#ffffff';
 await renderDesign(design,'poster-test-tenant',{transparent:true});
 const transparent=await sharp(captured.buffers.at(-1)!).ensureAlpha().raw().toBuffer();
 for(let i=3;i<transparent.length;i+=4)expect(transparent[i]).toBe(0);
 await renderDesign(design,'poster-test-tenant');
 const opaque=await sharp(captured.buffers.at(-1)!).ensureAlpha().raw().toBuffer();
 expect(opaque.every(value=>value===255)).toBe(true);
},15000);

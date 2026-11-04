// @vitest-environment node
import {it,expect,vi} from 'vitest';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {PROFESSIONAL_POSTERS} from '../shared/professional-posters';
import {buildTemplateDesignDoc} from '../shared/poster-templates';
const state=vi.hoisted(()=>({buffer:Buffer.alloc(0)}));
vi.mock('@/lib/db',()=>({db:{imageLibrary:{findFirst:vi.fn(),upsert:vi.fn()}}}));
vi.mock('@/lib/supabase-storage',()=>({uploadFile:vi.fn(async(input:any)=>{state.buffer=input.file;return {url:'https://assets.example/render.png'};}),isS3Configured:()=>true,isSupabaseStorageConfigured:()=>false}));
import {renderDesign} from '@/lib/designs/render';
it('exports every professional template using bundled imagery and fonts',async()=>{
 const sharp=(await import('sharp')).default;
 if(process.env.BGOS_RENDER_REVIEW)await mkdir(process.env.BGOS_RENDER_REVIEW,{recursive:true});
 for(const template of PROFESSIONAL_POSTERS){
  const doc=buildTemplateDesignDoc(template,{businessName:template.badge,website:'yourbusiness.com'});
  const result=await renderDesign(doc,'test-workspace');
  expect(result.imageUrl).toBeTruthy();const metadata=await sharp(state.buffer).metadata();
  expect(metadata.width).toBe(1080);expect(metadata.height).toBe(1080);
  expect(state.buffer.length).toBeGreaterThan(30000);
  if(process.env.BGOS_RENDER_REVIEW)await writeFile(`${process.env.BGOS_RENDER_REVIEW}/${template.id}.png`,state.buffer);
  const name=template.photo.split('/').at(-1)!;
  expect(await readFile(`public${template.photo}`)).toEqual(await readFile(`bgosmobile/assets/poster-templates/${name}`));
 }
},60000);

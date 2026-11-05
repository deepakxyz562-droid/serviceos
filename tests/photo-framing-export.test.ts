// @vitest-environment node
import {expect,it,vi} from 'vitest';
import sharp from 'sharp';
import { addedPhotoFrame, framedPhoto } from '../shared/photo-framing';
import type {DesignLayer} from '../shared/marketing-design';
vi.mock('@/lib/db',()=>({db:{imageLibrary:{upsert:vi.fn()}}}));
const {upload}=vi.hoisted(()=>({upload:vi.fn(async (_:{file:Buffer})=>({url:'https://example.test/export.png'}))}));
vi.mock('@/lib/supabase-storage',()=>({uploadFile:upload,isS3Configured:()=>true,isSupabaseStorageConfigured:()=>false}));
import {renderDesign} from '../src/lib/designs/render';

it.each([
 {w:120,h:240,fit:'cover',anchor:0,point:[160,6],expected:[240,20,20]},
 {w:120,h:240,fit:'cover',anchor:100,point:[160,6],expected:[20,40,200]},
 {w:120,h:240,fit:'contain',anchor:50,point:[160,6],expected:[240,20,20]},
 {w:240,h:120,fit:'contain',anchor:50,point:[160,82],expected:[240,20,20]},
] as const)('exports the same visible edge as the frame for $w × $h, $fit, $anchor',async row=>{
 const strip=await sharp({create:{width:row.w,height:12,channels:4,background:'#f01414'}}).png().toBuffer();
 const source=await sharp({create:{width:row.w,height:row.h,channels:4,background:'#1428c8'}}).composite([{input:strip,left:0,top:0}]).png().toBuffer();
 const layer:DesignLayer={id:'bg_photo',type:'image',x:0,y:0,width:320,height:320,src:'data:image/png;base64,'+source.toString('base64'),color:'#ffffff',background:'transparent',fontSize:20,opacity:1,cropY:row.anchor,photoFit:row.fit};
 const frame=framedPhoto(layer,{width:row.w,height:row.h});
 const sourceY=(row.point[1]-frame.top)*row.h/frame.height;
 expect(sourceY<12).toBe(row.expected[0]===240);
 await renderDesign({version:1,width:320,height:320,background:'#ffffff',layers:[layer]},'tenant');
 const pixel=await sharp(upload.mock.calls.at(-1)![0].file).extract({left:row.point[0],top:row.point[1],width:1,height:1}).removeAlpha().raw().toBuffer();
 expect([...pixel]).toEqual(row.expected);
});
it('places new images fully inside the canvas without changing their proportions',()=>{
 for(const [width,height] of [[120,240],[500,125],[100,100]]){
  const f=addedPhotoFrame({width:1080,height:1350},{width,height});
  expect(f.width/f.height).toBeCloseTo(width/height);expect(f.x).toBeGreaterThanOrEqual(0);expect(f.y).toBeGreaterThanOrEqual(0);
 }
});
it('preserves a transparent cutout over the canvas colour',async()=>{
 const pixels=Buffer.alloc(20*40*4);
 for(let y=0;y<40;y++)for(let x=5;x<15;x++){const i=(y*20+x)*4;pixels[i]=255;pixels[i+3]=255;}
 const bytes=await sharp(pixels,{raw:{width:20,height:40,channels:4}}).png().toBuffer();
 await renderDesign({version:1,width:320,height:320,background:'#00ff00',layers:[{id:'cutout',type:'image',src:'data:image/png;base64,'+bytes.toString('base64'),x:0,y:0,width:320,height:320,color:'#ffffff',background:'transparent',opacity:1,fontSize:16}]},'tenant');
 const raster=upload.mock.calls.at(-1)![0].file;
 for(const [x,color] of [[10,[0,255,0]],[90,[0,255,0]],[160,[255,0,0]]] as const){
  expect([...await sharp(raster).extract({left:x,top:5,width:1,height:1}).removeAlpha().raw().toBuffer()]).toEqual(color);
 }
});

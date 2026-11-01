import { db } from '@/lib/db';
import { readFile } from 'fs/promises';
import path from 'path';
import React from 'react';
import { ImageResponse } from 'next/og';
import { createHash, randomUUID } from 'crypto';
import { uploadFile, isS3Configured, isSupabaseStorageConfigured } from '@/lib/supabase-storage';
import { validateDesign } from '../../../shared/marketing-design';

async function imageData(src: string): Promise<string> {
  if (src.startsWith('data:image/')) return src;
  const url = new URL(src);
  const allowed = new Set(['images.unsplash.com']);
  for (const candidate of [process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.AWS_S3_PUBLIC_URL, process.env.DESIGN_ASSET_ORIGIN]) {
    if (candidate) allowed.add(new URL(candidate).hostname);
  }
  if (process.env.AWS_S3_BUCKET) allowed.add(`${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com`);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || !allowed.has(url.hostname)) throw new Error('Upload this image before using it in an export. Its host is not an approved asset source.');
  const response = await fetch(url, { redirect:'error', signal: AbortSignal.timeout(15000) });
  const type = response.headers.get('content-type')?.split(';')[0];
  if (!response.ok || !['image/png','image/jpeg','image/webp'].includes(type || '')) throw new Error('Unable to load the design image');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Empty design image');
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const {done,value} = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 4_000_000) throw new Error('Design images must be smaller than 4 MB');
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  return `data:${type};base64,${Buffer.concat(chunks).toString('base64')}`;
}
export async function renderDesign(value: unknown, tenantId: string) {
  const design = validateDesign(value);
  if (process.env.NODE_ENV === 'production' && !isS3Configured() && !isSupabaseStorageConfigured()) throw new Error('Persistent asset storage must be configured before publishing designs');
  const children: React.ReactElement[] = [];
  for (const l of design.layers) {
    if(l.type==='image'&&l.assetId){
      const asset=await db.imageLibrary.findFirst({where:{id:l.assetId,tenantId,folder:'bgos-design'}});
      if(!asset)throw new Error('Image is unavailable in this workspace');
      l.src=asset.url;
    }
    const style: React.CSSProperties = { position:'absolute' as const, left:l.x, top:l.y, width:l.width, height:l.height, color:l.color, backgroundColor:l.background, fontSize:l.fontSize, opacity:l.opacity, display:'flex', overflow:'hidden', whiteSpace:'pre-wrap', lineHeight:1.15, fontFamily:'BgosDesign',transform:`rotate(${l.rotation||0}deg)` };
    children.push(l.type === 'image'
      ? React.createElement('img', { key:l.id, src:await imageData(l.src!), width:l.width, height:l.height, style:{...style,objectFit:'cover',objectPosition:`${l.cropX??50}% ${l.cropY??50}%`} })
      : React.createElement('div', { key:l.id, style }, l.type === 'text' ? l.text : undefined));
  }
  const response = new ImageResponse(React.createElement('div', { style:{ width:design.width,height:design.height,display:'flex',position:'relative',backgroundColor:design.background } }, ...children), {width:design.width,height:design.height,fonts:[{name:'BgosDesign',data:await readFile(path.join(process.cwd(),'public/fonts/BgosDesign-Regular.ttf')),weight:400,style:'normal'}]});
  const buffer = Buffer.from(await response.arrayBuffer());
  const digest = createHash('sha256').update(JSON.stringify(design)+randomUUID()).digest('hex');
  const uploaded = await uploadFile({bucket:'campaign-assets',companyId:tenantId,folder:'designs',fileName:`${digest}.png`,file:buffer,contentType:'image/png'});
  await db.imageLibrary.upsert({where:{id:`${tenantId}:render:${digest}`},create:{id:`${tenantId}:render:${digest}`,tenantId,name:digest,folder:'bgos-design-export',url:uploaded.url,mediaType:'image/png',size:buffer.length,width:design.width,height:design.height},update:{folder:'bgos-design-export',createdAt:new Date()}});
  return { design, imageUrl:uploaded.url };
}

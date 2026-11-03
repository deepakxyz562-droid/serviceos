import { db } from '@/lib/db';
import { readFile } from 'fs/promises';
import path from 'path';
import React from 'react';
import { ImageResponse } from 'next/og';
import { createHash, randomUUID } from 'crypto';
import { uploadFile, isS3Configured, isSupabaseStorageConfigured } from '@/lib/supabase-storage';
import { validateDesign } from '../../../shared/marketing-design';

async function imageData(src: string): Promise<ArrayBuffer | null> {
  if (!src || !src.trim()) return null;

  if (src.startsWith('data:image/')) {
    const base64Data = src.split(',')[1];
    if (!base64Data) return null;
    const buf = Buffer.from(base64Data, 'base64');
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  }

  // Local filesystem fallback for relative paths (/uploads/..., /images/...)
  if (src.startsWith('/')) {
    try {
      const localFilePath = path.join(process.cwd(), 'public', src.replace(/^\/+/, ''));
      const buf = await readFile(localFilePath);
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
    } catch {
      const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://bgos.fieseros.com';
      src = `${origin.replace(/\/+$/, '')}/${src.replace(/^\/+/, '')}`;
    }
  }

  const url = new URL(src);
  const allowed = new Set(['images.unsplash.com', 'imagedelivery.net', 'bgos.fieseros.com', 'fieseros.com']);
  for (const candidate of [process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.AWS_S3_PUBLIC_URL, process.env.DESIGN_ASSET_ORIGIN, process.env.NEXT_PUBLIC_APP_URL]) {
    if (candidate) {
      try {
        allowed.add(new URL(candidate).hostname);
      } catch {}
    }
  }
  if (process.env.AWS_S3_BUCKET) {
    allowed.add(`${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com`);
    allowed.add(`${process.env.AWS_S3_BUCKET}.s3.amazonaws.com`);
  }
  if (process.env.NODE_ENV === 'development') {
    allowed.add('localhost');
  }

  const isLocalDev = process.env.NODE_ENV === 'development' && url.hostname === 'localhost';
  const isAllowedProto = url.protocol === 'https:' || (isLocalDev && url.protocol === 'http:');
  const isAllowedDomain =
    allowed.has(url.hostname) ||
    url.hostname.endsWith('.amazonaws.com') ||
    url.hostname.endsWith('imagedelivery.net') ||
    url.hostname.endsWith('unsplash.com') ||
    url.hostname.endsWith('fieseros.com') ||
    url.hostname.endsWith('.supabase.co');

  if (!isAllowedProto || url.username || url.password || (url.port && !isLocalDev) || !isAllowedDomain) {
    throw new Error('Upload this image before using it in an export. Its host is not an approved asset source.');
  }

  const response = await fetch(url, { redirect:'error', signal: AbortSignal.timeout(15000) });
  const rawType = response.headers.get('content-type')?.split(';')[0]?.trim()?.toLowerCase() || '';
  const type = rawType === 'image/jpg' ? 'image/jpeg' : rawType;
  if (!response.ok || !['image/png','image/jpeg','image/webp'].includes(type)) throw new Error('Unable to load the design image');

  const ab = await response.arrayBuffer();
  if (ab.byteLength === 0) throw new Error('Empty design image');
  if (ab.byteLength > 8_000_000) throw new Error('Design images must be smaller than 8 MB');

  return ab;
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
    if (l.type === 'image') {
      if (l.src && l.src.trim()) {
        const ab = await imageData(l.src);
        if (ab) {
          children.push(React.createElement('img', { key:l.id, src: ab as unknown as string, width:l.width, height:l.height, style:{...style,objectFit:'cover',objectPosition:`${l.cropX??50}% ${l.cropY??50}%`} }));
        }
      }
    } else {
      children.push(React.createElement('div', { key:l.id, style }, l.type === 'text' ? l.text : undefined));
    }
  }
  const response = new ImageResponse(React.createElement('div', { style:{ width:design.width,height:design.height,display:'flex',position:'relative',backgroundColor:design.background } }, ...children), {width:design.width,height:design.height,fonts:[{name:'BgosDesign',data:await readFile(path.join(process.cwd(),'public/fonts/BgosDesign-Regular.ttf')),weight:400,style:'normal'}]});
  const buffer = Buffer.from(await response.arrayBuffer());
  const digest = createHash('sha256').update(JSON.stringify(design)+randomUUID()).digest('hex');
  const uploaded = await uploadFile({bucket:'campaign-assets',companyId:tenantId,folder:'designs',fileName:`${digest}.png`,file:buffer,contentType:'image/png'});
  await db.imageLibrary.upsert({where:{id:`${tenantId}:render:${digest}`},create:{id:`${tenantId}:render:${digest}`,tenantId,name:digest,folder:'bgos-design-export',url:uploaded.url,mediaType:'image/png',size:buffer.length,width:design.width,height:design.height},update:{folder:'bgos-design-export',createdAt:new Date()}});
  return { design, imageUrl:uploaded.url };
}

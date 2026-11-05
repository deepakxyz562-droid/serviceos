import { framedPhoto } from '../../../shared/photo-framing';
import {designFontFamily} from '../../../shared/design-fonts';
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

  if (src.startsWith('data:image/svg+xml')) {
    const rawContent = src.split(',')[1] || '';
    let svgBytes: Buffer;
    if (src.includes(';base64,')) {
      svgBytes = Buffer.from(rawContent, 'base64');
    } else {
      svgBytes = Buffer.from(decodeURIComponent(rawContent), 'utf8');
    }
    return svgBytes.buffer.slice(svgBytes.byteOffset, svgBytes.byteOffset + svgBytes.byteLength) as ArrayBuffer;
  }

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
    url.hostname.endsWith('.imagedelivery.net') ||
    url.hostname.endsWith('.unsplash.com') ||
    url.hostname.endsWith('.fieseros.com') ||
    url.hostname.endsWith('.supabase.co') ||
    url.hostname === 'lh3.googleusercontent.com' ||
    url.hostname.endsWith('.googleusercontent.com');

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
export async function renderDesign(value: unknown, tenantId: string, options: {format?:'png'|'jpeg';transparent?:boolean} = {}) {
  const design = validateDesign(value);
  if (process.env.NODE_ENV === 'production' && !isS3Configured() && !isSupabaseStorageConfigured()) throw new Error('Persistent asset storage must be configured before publishing designs');
  const children: React.ReactElement[] = [];
  for (const l of design.layers) {
    if(l.hidden)continue;
    if(l.type==='image'&&l.assetId){
      const asset=await db.imageLibrary.findFirst({where:{id:l.assetId,tenantId,folder:'bgos-design'}});
      if(!asset)throw new Error('Image is unavailable in this workspace');
      l.src=asset.url;
    }
    const style: React.CSSProperties = {
      position: 'absolute' as const,
      left: l.x,
      top: l.y,
      width: l.width,
      height: l.height,
      color: l.color,
      backgroundColor: l.background,
      fontSize: l.fontSize,
      opacity: l.opacity,
      display: 'flex',
      overflow: 'hidden',
      whiteSpace: 'pre-wrap',
      lineHeight: l.lineHeight??1.15,
      fontFamily: designFontFamily(l),
      textAlign: l.textAlign || 'left',
      ...(l.type==='text'&&l.textAlign==='center'?{justifyContent:'center'}:{}),
      ...(l.type==='text'&&l.textAlign==='right'?{justifyContent:'flex-end'}:{}),
      transform: `rotate(${l.rotation || 0}deg)`,
      ...(l.borderRadius !== undefined ? { borderRadius: l.borderRadius } : {}),
      ...(l.borderTopLeftRadius !== undefined ? { borderTopLeftRadius: l.borderTopLeftRadius } : {}),
      ...(l.borderTopRightRadius !== undefined ? { borderTopRightRadius: l.borderTopRightRadius } : {}),
      ...(l.borderBottomLeftRadius !== undefined ? { borderBottomLeftRadius: l.borderBottomLeftRadius } : {}),
      ...(l.borderBottomRightRadius !== undefined ? { borderBottomRightRadius: l.borderBottomRightRadius } : {}),
      ...(l.borderWidth !== undefined ? { borderWidth: l.borderWidth, borderStyle: 'solid' } : {}),
      ...(l.borderTopWidth !== undefined ? { borderTopWidth: l.borderTopWidth, borderStyle: 'solid' } : {}),
      ...(l.borderBottomWidth !== undefined ? { borderBottomWidth: l.borderBottomWidth, borderStyle: 'solid' } : {}),
      ...(l.borderColor ? { borderColor: l.borderColor } : {}),
      ...(l.padding ? { padding: l.padding } : {}),
      ...(l.alignItems ? { alignItems: l.alignItems as any } : {}),
      ...(l.justifyContent ? { justifyContent: l.justifyContent as any } : {}),
      ...(l.letterSpacing !== undefined ? { letterSpacing: l.letterSpacing } : {}),
      ...(l.fontWeight ? { fontWeight: l.fontWeight as any } : {}),
    };
    if (l.type === 'image') {
      if (l.src && l.src.trim()) {
        const ab = await imageData(l.src);
        if (!ab) throw new Error('Empty design image');
        if (ab) {
          // Satori cannot decode WebP; normalize all approved image inputs first.
          const sharp=(await import('sharp')).default;
          const normalized = await sharp(Buffer.from(ab), {limitInputPixels:24_000_000})
            .rotate().png().toBuffer({resolveWithObject:true});
          const bytes = normalized.data;
          const frame = framedPhoto(l, normalized.info);
          children.push(React.createElement('div', { key:l.id, style },
            React.createElement('img', {
              src:bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
              width:frame.width, height:frame.height,
              style:{position:'absolute',left:frame.left,top:frame.top,width:frame.width,height:frame.height},
            })));
        }
      }
    } else {
      children.push(React.createElement('div', { key:l.id, style }, l.type === 'text' ? React.createElement('span',{style:{textAlign:l.textAlign||'left'}},l.text) : undefined));
    }
  }

  const [regularFont, boldFont] = await Promise.all([
    readFile(path.join(process.cwd(), 'public/fonts/BgosDesign-Regular.ttf')),
    readFile(path.join(process.cwd(), 'public/fonts/BgosDesign-Bold.ttf')).catch(() => null),
  ]);

  const fontDescriptors: Array<{ name: string; data: Buffer; weight: 400 | 600 | 700 | 800 | 900; style: 'normal' }> = [
    { name: 'BgosDesign', data: regularFont, weight: 400, style: 'normal' },
  ];
  if (boldFont) {
    fontDescriptors.push(
      { name: 'BgosDesign', data: boldFont, weight: 700, style: 'normal' },
      { name: 'BgosDesign', data: boldFont, weight: 800, style: 'normal' },
      { name: 'BgosDesign', data: boldFont, weight: 900, style: 'normal' },
    );
  } else {
    fontDescriptors.push(
      { name: 'BgosDesign', data: regularFont, weight: 700, style: 'normal' },
      { name: 'BgosDesign', data: regularFont, weight: 900, style: 'normal' },
    );
  }

  for(const [name,file] of [['BgosEditorial','BgosEditorial.ttf'],['BgosDisplay','BgosDisplay.ttf']]){if(design.layers.some(l=>designFontFamily(l)===name))fontDescriptors.push({name,data:await readFile(path.join(process.cwd(),'public/fonts',file)),weight:400,style:'normal'});}
  const response = new ImageResponse(React.createElement('div', { style:{ width:design.width,height:design.height,display:'flex',position:'relative',backgroundColor:options.transparent&&options.format!=='jpeg'?'transparent':design.background } }, ...children), {width:design.width,height:design.height,fonts:fontDescriptors});
  let buffer:Buffer = Buffer.from(await response.arrayBuffer());
  const format=options.format || 'png';
  if(format==='jpeg'){const sharp=(await import('sharp')).default;buffer=await sharp(buffer).flatten({background:design.background==='transparent'?'#ffffff':design.background}).jpeg({quality:95}).toBuffer();}
  const contentType=format==='jpeg'?'image/jpeg':'image/png';
  const digest = createHash('sha256').update(JSON.stringify(design)+randomUUID()).digest('hex');
  const uploaded = await uploadFile({bucket:'campaign-assets',companyId:tenantId,folder:'designs',fileName:`${digest}.${format}`,file:buffer,contentType});
  await db.imageLibrary.upsert({where:{id:`${tenantId}:render:${digest}`},create:{id:`${tenantId}:render:${digest}`,tenantId,name:digest,folder:'bgos-design-export',url:uploaded.url,mediaType:contentType,size:buffer.length,width:design.width,height:design.height},update:{folder:'bgos-design-export',createdAt:new Date()}});
  return { design, imageUrl:uploaded.url, format };
}

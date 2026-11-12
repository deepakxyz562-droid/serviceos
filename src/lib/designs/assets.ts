import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { uploadFile, deleteFile, isS3Configured, isSupabaseStorageConfigured } from '@/lib/supabase-storage';
import { validateDesign } from '../../../shared/marketing-design';

import { buildJpegExifData } from './seo-metadata';

export type SaveDesignAssetOptions = {
  format?: 'webp' | 'jpeg';
  seoSlug?: string;
  assetTitle?: string;
  exif?: Parameters<typeof buildJpegExifData>[0];
};

function normalizeSeoSlugBase(seoSlug: string): string {
  return seoSlug
    .trim()
    .toLowerCase()
    .replace(/\.(jpg|jpeg|webp|png)$/i, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function processImageBuffer(
  bytes: Buffer,
  targetFormat: 'webp' | 'jpeg' = 'webp',
  exifInput?: Parameters<typeof buildJpegExifData>[0],
): Promise<{
  data: Buffer;
  width: number;
  height: number;
  format: 'webp' | 'jpeg' | 'png';
  geoTagged: boolean;
}> {
  try {
    const sharpModule = await import('sharp');
    const sharp = sharpModule.default || sharpModule;
    // Instagram & Facebook specs: max width 1080px, max height 1350px (portrait 4:5)
    const pipeline = sharp(bytes, { limitInputPixels: 24_000_000 })
      .rotate()
      .resize({ width: 1080, height: 1350, fit: 'inside', withoutEnlargement: true });
    if (targetFormat === 'jpeg') {
      let jpegPipeline = pipeline.flatten({ background: '#ffffff' });
      let geoTagged = false;
      if (exifInput) {
        const exifData = buildJpegExifData(exifInput);
        const hasExif =
          Object.keys(exifData.IFD0 || {}).length > 0 ||
          Object.keys(exifData.IFD3 || {}).length > 0;
        if (hasExif) {
          jpegPipeline = jpegPipeline.withExif(exifData as any);
          geoTagged = Boolean(
            exifData.IFD3 &&
              Object.keys(exifData.IFD3).length > 0 &&
              exifInput.latitude != null &&
              exifInput.longitude != null,
          );
        }
      }
      const normalized = await jpegPipeline
        .jpeg({ quality: 92 })
        .toBuffer({ resolveWithObject: true });
      return {
        data: normalized.data,
        width: normalized.info.width,
        height: normalized.info.height,
        format: 'jpeg',
        geoTagged,
      };
    }
    const normalized = await pipeline
      .webp({ quality: 85, effort: 4 })
      .toBuffer({ resolveWithObject: true });
    return {
      data: normalized.data,
      width: normalized.info.width,
      height: normalized.info.height,
      format: 'webp',
      geoTagged: false,
    };
  } catch (err) {
    console.warn('[designs/assets] sharp processing unavailable, using raw buffer:', err instanceof Error ? err.message : err);
    return { data: bytes, width: 1080, height: 1080, format: 'png', geoTagged: false };
  }
}

export async function saveDesignAsset(
  bytes: Buffer,
  tenantId: string,
  userId: string,
  options?: SaveDesignAssetOptions,
) {
  if(bytes.length>12_000_000)throw new Error('Images must be smaller than 12 MB');
  if(!isS3Configured()&&!isSupabaseStorageConfigured())throw new Error('Persistent image storage is not configured');
  const normalized = await processImageBuffer(bytes, options?.format ?? 'webp', options?.exif);
  const id=randomUUID();
  const fileExt = normalized.format === 'jpeg' ? 'jpg' : normalized.format === 'webp' ? 'webp' : 'png';
  const contentType = normalized.format === 'jpeg' ? 'image/jpeg' : normalized.format === 'webp' ? 'image/webp' : 'image/png';
  const slugBase = options?.seoSlug ? normalizeSeoSlugBase(options.seoSlug) : '';
  const fileName = slugBase ? `${slugBase}-${id.slice(0, 8)}.${fileExt}` : `${id}.${fileExt}`;
  const assetName =
    typeof options?.assetTitle === 'string' && options.assetTitle.trim()
      ? options.assetTitle.trim().slice(0, 120)
      : 'Design image';
  const stored=await uploadFile({bucket:'campaign-assets',companyId:tenantId,folder:'design-assets',fileName,file:normalized.data,contentType});
  try {
    const asset=await db.imageLibrary.create({data:{id,tenantId,uploadedBy:userId,name:assetName,folder:'bgos-design',url:stored.url,mediaType:contentType,size:normalized.data.length,width:normalized.width,height:normalized.height}});
    return {assetId:asset.id,url:asset.url,seoFilename:fileName,geoTagged:normalized.geoTagged};
  }catch(error){await deleteFile('campaign-assets',`${tenantId}/design-assets/${fileName}`).catch(()=>false);throw error;}
}
export async function persistDesignAssets(value: unknown, tenantId: string, userId: string) {
  const design = validateDesign(value);
  for (const layer of design.layers) {
    if (layer.type !== 'image') continue;

    // 1. SVG Vector Emblems & Motifs (Keep inline as vector graphics)
    if (layer.src?.startsWith('data:image/svg+xml')) {
      continue;
    }

    // 2. Base64 raster data URIs (PNG, JPEG, WebP)
    if (layer.src?.startsWith('data:')) {
      const match = /^data:image\/(?:png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=\s]+)$/i.exec(layer.src);
      if (!match) throw new Error('Invalid uploaded image format. Please upload PNG, JPEG, or WebP.');
      const cleanBase64 = match[1].replace(/\s+/g, '');
      const bytes = Buffer.from(cleanBase64, 'base64');

      // In production or when persistent storage is configured, upload to storage
      if (isS3Configured() || isSupabaseStorageConfigured()) {
        const asset = await saveDesignAsset(bytes, tenantId, userId);
        layer.src = asset.url;
        layer.assetId = asset.assetId;
      }
      // If storage is not configured (e.g. dev mode without S3/Supabase), retain valid data URI
      continue;
    } else if (layer.assetId) {
      const asset = await db.imageLibrary.findFirst({ where: { id: layer.assetId, tenantId, folder: 'bgos-design' } });
      if (!asset) throw new Error('Design image is unavailable in this workspace');
      layer.src = asset.url;
    } else if (layer.src?.includes('/design-assets/')) {
      const asset = await db.imageLibrary.findFirst({ where: { url: layer.src, tenantId, folder: 'bgos-design' } });
      if (!asset) throw new Error('Upload this design image again; it is no longer available');
      layer.assetId = asset.id;
    }
  }
  return design;
}

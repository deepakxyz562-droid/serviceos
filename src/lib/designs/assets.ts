import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { uploadFile, deleteFile, isS3Configured, isSupabaseStorageConfigured } from '@/lib/supabase-storage';
import { validateDesign } from '../../../shared/marketing-design';

async function processImageBuffer(bytes: Buffer): Promise<{ data: Buffer; width: number; height: number }> {
  try {
    const sharpModule = await import('sharp');
    const sharp = sharpModule.default || sharpModule;
    const normalized = await sharp(bytes, { limitInputPixels: 24_000_000 })
      .rotate()
      .resize({ width: 2160, height: 2160, fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer({ resolveWithObject: true });
    return { data: normalized.data, width: normalized.info.width, height: normalized.info.height };
  } catch (err) {
    console.warn('[designs/assets] sharp processing unavailable, using raw buffer:', err instanceof Error ? err.message : err);
    return { data: bytes, width: 1080, height: 1080 };
  }
}

export async function saveDesignAsset(bytes:Buffer,tenantId:string,userId:string) {
  if(bytes.length>8_000_000)throw new Error('Images must be smaller than 8 MB');
  if(!isS3Configured()&&!isSupabaseStorageConfigured())throw new Error('Persistent image storage is not configured');
  const normalized = await processImageBuffer(bytes);
  const id=randomUUID();
  const stored=await uploadFile({bucket:'campaign-assets',companyId:tenantId,folder:'design-assets',fileName:`${id}.png`,file:normalized.data,contentType:'image/png'});
  try {
    const asset=await db.imageLibrary.create({data:{id,tenantId,uploadedBy:userId,name:'Design image',folder:'bgos-design',url:stored.url,mediaType:'image/png',size:normalized.data.length,width:normalized.width,height:normalized.height}});
    return {assetId:asset.id,url:asset.url};
  }catch(error){await deleteFile('campaign-assets',`${tenantId}/design-assets/${id}.png`).catch(()=>false);throw error;}
}
export async function persistDesignAssets(value:unknown,tenantId:string,userId:string){
  const design=validateDesign(value);
  for(const layer of design.layers){
    if(layer.type!=='image')continue;
    if(layer.src?.startsWith('data:')){
      const match=/^data:image\/(?:png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(layer.src);
      if(!match)throw new Error('Invalid uploaded image');
      const asset=await saveDesignAsset(Buffer.from(match[1],'base64'),tenantId,userId);
      layer.src=asset.url;layer.assetId=asset.assetId;
    } else if(layer.assetId){
      const asset=await db.imageLibrary.findFirst({where:{id:layer.assetId,tenantId,folder:'bgos-design'}});
      if(!asset)throw new Error('Design image is unavailable in this workspace');
      layer.src=asset.url;
    } else if(layer.src?.includes('/design-assets/')){
      const asset=await db.imageLibrary.findFirst({where:{url:layer.src,tenantId,folder:'bgos-design'}});
      if(!asset)throw new Error('Upload this design image again; it is no longer available');
      layer.assetId=asset.id;
    }
  }
  return design;
}

import { db } from '@/lib/db';
import { deleteFile } from '@/lib/supabase-storage';
/** Retire first, delete only after a grace period. Retired assets cannot be newly saved. */
export async function cleanupDesignAssets(dryRun=true){
 const cutoff=new Date(Date.now()-30*86400000);
 const assets=await db.imageLibrary.findMany({where:{folder:{in:['bgos-design','bgos-design-retired','bgos-design-export','bgos-design-export-retired']},createdAt:{lt:cutoff}},orderBy:{createdAt:'asc'},take:100});
 const result={scanned:assets.length,retired:0,deleted:0,protected:0};
 for(const asset of assets){
  if(!asset.tenantId)continue;
  // Protect every saved post (including failed/scheduled/draft), plus retained job results.
  const [post,job]=await Promise.all([
   db.socialPost.findFirst({where:{tenantId:asset.tenantId,OR:[{designJson:{contains:asset.id}},{designJson:{contains:asset.url}},{mediaUrls:{contains:asset.url}}]},select:{id:true}}),
   db.designGenerationJob.findFirst({where:{tenantId:asset.tenantId,resultJson:{contains:asset.id},status:{in:['queued','running','completed','uncertain']}},select:{id:true}}),
  ]);
  if(post||job){result.protected++;continue;}
  if(asset.folder==='bgos-design'||asset.folder==='bgos-design-export'){
   if(!dryRun)await db.imageLibrary.updateMany({where:{id:asset.id,folder:asset.folder},data:{folder:`${asset.folder}-retired`,createdAt:new Date()}});
   result.retired++;continue;
  }
  // Only remove paths created by saveDesignAsset, never URLs supplied by users.
  const isExport=asset.folder==='bgos-design-export-retired';
  if(isExport?!/^[a-f0-9]{64}$/.test(asset.name):!/^[a-f0-9-]{36}$/i.test(asset.id))continue;
  if(!dryRun){
   const removed=await deleteFile('campaign-assets',isExport?`${asset.tenantId}/designs/${asset.name}.png`:`${asset.tenantId}/design-assets/${asset.id}.png`);
   if(!removed)continue;
   await db.imageLibrary.deleteMany({where:{id:asset.id,tenantId:asset.tenantId,folder:asset.folder}});
  }
  result.deleted++;
 }
 return result;
}

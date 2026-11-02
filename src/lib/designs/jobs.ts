import { db } from '@/lib/db';
import { generateDesignImage } from './image-provider';
import { saveDesignAsset } from './assets';
/** A single atomic claim prevents concurrent workers from generating twice. */
export async function runDesignJob(id:string){
 const claim=await db.designGenerationJob.updateMany({where:{id,status:'queued',cancelRequested:false},data:{status:'running',startedAt:new Date()}});
 if(claim.count!==1)return;
 const job=await db.designGenerationJob.findUnique({where:{id}});if(!job)return;
 let reserved:string|undefined;let generated=false;
 try{
  const subscription=await db.subscription.findFirst({where:{tenantId:job.tenantId},orderBy:{createdAt:'desc'}});
  if(subscription){
    const taken=await db.subscription.updateMany({where:{id:subscription.id,aiUsageCount:{lt:subscription.aiQuota ?? 100}},data:{aiUsageCount:{increment:1}}});
    if(taken.count) reserved=subscription.id;
  }
  if(reserved) await db.designGenerationJob.update({where:{id},data:{subscriptionId:reserved}});
  const isPoster = job.prompt.startsWith('[POSTER]');
  const result=await generateDesignImage(job.prompt,(job.provider || 'cloudflare') as any,AbortSignal.timeout(150000),isPoster);generated=true;
  const now=new Date();
  await db.usageLedger.create({data:{tenantId:job.tenantId,idempotencyKey:`image-job:${id}`,usageType:'IMAGE_GENERATION',quantitySeconds:0,aiFeature:'bgos_design_image',aiModel:result.model,providerCostUsd:result.cost,costBreakdownJson:JSON.stringify({provider:job.provider,costSource:result.cost===null?'not_reported':'provider'}),periodStart:new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1)),periodEnd:new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()+1,1)),occurredAt:now}});
  const asset=await saveDesignAsset(result.bytes,job.tenantId,job.userId);
  const current=await db.designGenerationJob.findUnique({where:{id}});
  await db.designGenerationJob.updateMany({where:{id,status:'running'},data:{status:current?.cancelRequested?'cancelled':'completed',resultJson:JSON.stringify(asset),finishedAt:new Date()}});
 }catch(error){
  if(reserved&&!generated)await db.subscription.update({where:{id:reserved},data:{aiUsageCount:{decrement:1}}}).catch(()=>{});
  await db.designGenerationJob.updateMany({where:{id,status:'running'},data:{status:'failed',error:generated?'Generation finished but its result could not be stored. Contact support before retrying.':error instanceof Error?error.message:'Generation failed',finishedAt:new Date()}});
 }
}
export async function drainDesignJobs(){
 // Do not retry jobs whose provider call may already have incurred a charge.
 await db.designGenerationJob.updateMany({where:{status:'running',startedAt:{lt:new Date(Date.now()-10*60*1000)}},data:{status:'uncertain',error:'Worker interrupted. Provider billing/result needs reconciliation before retrying.',finishedAt:new Date()}});
 const jobs=await db.designGenerationJob.findMany({where:{status:'queued',cancelRequested:false},orderBy:{createdAt:'asc'},take:2,select:{id:true}});
 await Promise.all(jobs.map(job=>runDesignJob(job.id)));
 return jobs.length;
}

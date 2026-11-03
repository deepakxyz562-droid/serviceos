import { db } from '@/lib/db';
import { generateDesignImage, resolveCuratedImageFallback } from './image-provider';
import { saveDesignAsset } from './assets';
/** A single atomic claim prevents concurrent workers from generating twice. */
export async function runDesignJob(id:string){
 const claim=await db.designGenerationJob.updateMany({where:{id,status:'queued',cancelRequested:false},data:{status:'running',startedAt:new Date()}});
 if(claim.count!==1)return;
 const job=await db.designGenerationJob.findUnique({where:{id}});if(!job)return;
 let reserved:string|undefined;let generated=false;
 try{
  const subscription=await db.subscription.findFirst({where:{tenantId:job.tenantId},orderBy:{createdAt:'desc'}});
  if(!subscription||!['trial','active'].includes(subscription.status)|| (subscription.endDate&&subscription.endDate<=new Date()) || (subscription.status==='trial'&&subscription.trialEndsAt&&subscription.trialEndsAt<=new Date()))throw new Error('An active subscription with image-generation allowance is required.');
  if(subscription){
    const taken=await db.subscription.updateMany({where:{id:subscription.id,status:{in:['trial','active']},aiUsageCount:{lt:subscription.aiQuota ?? 100}},data:{aiUsageCount:{increment:1}}});
    if(taken.count!==1)throw new Error('Your image-generation allowance is exhausted. Upgrade your plan or wait for renewal.');
    reserved=subscription.id;
  }
  if(reserved) await db.designGenerationJob.update({where:{id},data:{subscriptionId:reserved}});

  // Parse business visual context if stored
  let visualContext: any = undefined;
  if (job.costBreakdownJson) {
    try {
      const parsed = JSON.parse(job.costBreakdownJson);
      if (parsed && typeof parsed === 'object' && (parsed.category || parsed.products || parsed.businessName)) {
        visualContext = parsed;
      }
    } catch {}
  }

  const isPoster = job.prompt.startsWith('[POSTER]');
  let result: { bytes: Buffer; model: string; cost: number | null };
  try {
    result = await generateDesignImage(
      job.prompt,
      (job.provider || 'cloudflare') as any,
      AbortSignal.timeout(150000),
      isPoster,
      visualContext
    );
  } catch (err: any) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const isProviderExhausted = /429|402|quota|rate|exhausted|credit|balance|Superadmin|neurons|Bad input|fetch failed/i.test(errMsg);
    if (isProviderExhausted) {
      console.warn(`[runDesignJob] AI image provider quota/error (${errMsg}), resolving curated occasion fallback`);
      result = await resolveCuratedImageFallback(job.prompt, visualContext);
    } else {
      throw err;
    }
  }
  generated=true;
  const now=new Date();
  await db.usageLedger.create({data:{tenantId:job.tenantId,idempotencyKey:`image-job:${id}`,usageType:'IMAGE_GENERATION',quantitySeconds:0,aiFeature:'bgos_design_image',aiModel:result.model,providerCostUsd:result.cost,costBreakdownJson:JSON.stringify({provider:job.provider,costSource:result.cost===null?'not_reported':'provider'}),periodStart:new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1)),periodEnd:new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()+1,1)),occurredAt:now}}).catch(()=>{});
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

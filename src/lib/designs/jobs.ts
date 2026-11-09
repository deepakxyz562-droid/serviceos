import { db } from '@/lib/db';
import { generateDesignImage, resolveCuratedImageFallback } from './image-provider';
import { saveDesignAsset } from './assets';
import { evaluateBgosEntitlement, pickBestSubscriptionRow } from '@/lib/bgos-entitlement';
import { getBgosAiQuotaForPlan, normalizeBgosPlanCode } from '@/lib/bgos-billing';

/** A single atomic claim prevents concurrent workers from generating twice. */
export async function runDesignJob(id:string){
 const claim=await db.designGenerationJob.updateMany({where:{id,status:'queued',cancelRequested:false},data:{status:'running',startedAt:new Date()}});
 if(claim.count!==1)return;
 const job=await db.designGenerationJob.findUnique({where:{id}});if(!job)return;
 let reserved:string|undefined;let generated=false;
 try{
  const subscriptionsRaw =
    typeof (db as any).subscription?.findMany === 'function'
      ? await (db as any).subscription
          .findMany({ where: { tenantId: job.tenantId }, orderBy: { createdAt: 'desc' }, take: 10 })
          .catch(() => [])
      : typeof (db as any).subscription?.findFirst === 'function'
        ? await (db as any).subscription
            .findFirst({ where: { tenantId: job.tenantId }, orderBy: { createdAt: 'desc' } })
            .then((row: any) => (row ? [row] : []))
            .catch(() => [])
        : [];
  let subscription: any = pickBestSubscriptionRow(
    Array.isArray(subscriptionsRaw) ? subscriptionsRaw : [],
  );
  const tenant = await (db as any).tenant?.findUnique?.({ where: { id: job.tenantId } }).catch?.(() => null) ?? null;
  let productSubscription: any = null;
  const bgosWorkspaces = await (db as any).productWorkspace?.findMany?.({
    where: { tenantId: job.tenantId, product: 'bgos' },
    select: { workspaceId: true },
  }).catch?.(() => []) ?? [];
  const wsIds = Array.isArray(bgosWorkspaces) ? bgosWorkspaces.map((w: any) => w.workspaceId).filter(Boolean) : [];
  if (wsIds.length > 0) {
    if (typeof (db as any).productSubscription?.findMany === 'function') {
      const prodSubs = await (db as any).productSubscription
        .findMany({ where: { workspaceId: { in: wsIds } } })
        .catch(() => []);
      productSubscription = pickBestSubscriptionRow(Array.isArray(prodSubs) ? prodSubs : []);
    } else {
      productSubscription = await (db as any).productSubscription?.findFirst?.({
        where: { workspaceId: { in: wsIds } },
      }).catch?.(() => null) ?? null;
    }
  }

  const entitlement = evaluateBgosEntitlement({ tenant, subscription, productSubscription });
  const legacyActiveQuotaSub =
    !entitlement.entitled &&
    !tenant &&
    !productSubscription &&
    Boolean(subscription) &&
    !subscription.plan &&
    String(subscription.status || '').trim().toLowerCase() === 'active' &&
    typeof subscription.aiQuota === 'number' &&
    (subscription.aiQuota > 0 || subscription.aiQuota === -1);

  if (!entitlement.entitled && !legacyActiveQuotaSub) {
    throw new Error('Your 7-day trial has ended or no active subscription is present. Complete payment to generate AI images.');
  }

  const hasExplicitPlan = Boolean(tenant?.plan || productSubscription?.plan || subscription?.plan);
  // Ensure a Subscription quota row exists and matches the active entitlement plan/status/quota.
  const expectedQuota = hasExplicitPlan
    ? getBgosAiQuotaForPlan(entitlement.plan)
    : (typeof subscription?.aiQuota === 'number' && subscription.aiQuota > 0 ? subscription.aiQuota : 200);
  const expectedStatus = entitlement.isPaid || legacyActiveQuotaSub ? 'active' : 'trial';
  if (!subscription && typeof (db as any).subscription?.create === 'function') {
    subscription = await (db as any).subscription.create({
      data: {
        tenantId: job.tenantId,
        plan: entitlement.plan,
        status: expectedStatus,
        amount: 0,
        currency: tenant?.currency || 'USD',
        billingCycle: 'monthly',
        paymentProvider: 'none',
        maxUsers: entitlement.plan === 'business' ? 25 : entitlement.plan === 'growth' ? 10 : 5,
        maxJobs: entitlement.plan === 'business' ? 99999 : 1000,
        maxWorkflows: entitlement.plan === 'business' ? 999 : 50,
        featuresJson: '{}',
        startDate: new Date(),
        endDate: entitlement.currentPeriodEnd ? new Date(entitlement.currentPeriodEnd) : null,
        trialEndsAt: entitlement.trialEndsAt ? new Date(entitlement.trialEndsAt) : null,
        aiQuota: expectedQuota,
        aiUsageCount: 0,
      },
    }).catch((err: unknown) => {
      console.warn('[runDesignJob] subscription create fallback notice:', err);
      return null;
    });
  } else if (subscription) {
    const patch: Record<string, unknown> = {};
    const currentStatus = String(subscription.status || '').trim();
    if (currentStatus.toLowerCase() !== expectedStatus || currentStatus !== expectedStatus) {
      patch.status = expectedStatus;
    }
    if (hasExplicitPlan && entitlement.plan && normalizeBgosPlanCode(subscription.plan) !== entitlement.plan) {
      patch.plan = entitlement.plan;
    }
    const existingQuota = typeof subscription.aiQuota === 'number' ? subscription.aiQuota : null;
    // Preserve -1 (unlimited). Repair null/0 or lower plan quotas (e.g. trial 100 -> business 2000).
    if (
      existingQuota !== -1 &&
      (existingQuota === null || existingQuota === 0 || (hasExplicitPlan && entitlement.plan !== 'free' && existingQuota < expectedQuota))
    ) {
      patch.aiQuota = expectedQuota;
    }
    if (subscription.aiUsageCount === null) {
      patch.aiUsageCount = 0;
    }
    if (Object.keys(patch).length > 0 && typeof (db as any).subscription?.updateMany === 'function') {
      try {
        await (db as any).subscription.updateMany({ where: { id: subscription.id }, data: patch });
        subscription = { ...subscription, ...patch };
      } catch (err) {
        console.warn('[runDesignJob] subscription patch notice:', err);
      }
    }
  }

  if (subscription) {
    const isUnlimited = subscription.aiQuota === -1;
    const effectiveQuota =
      typeof subscription.aiQuota === 'number' && subscription.aiQuota > 0
        ? Math.max(subscription.aiQuota, expectedQuota)
        : expectedQuota;

    if (isUnlimited) {
      await db.subscription.updateMany({
        where: { id: subscription.id },
        data: { aiUsageCount: { increment: 1 } },
      });
    } else {
      const taken = await db.subscription.updateMany({
        where: {
          id: subscription.id,
          status: { in: ['trial', 'active'] },
          aiUsageCount: { lt: effectiveQuota },
        },
        data: { aiUsageCount: { increment: 1 } },
      });
      if (taken.count !== 1) {
        throw new Error('Your image-generation allowance is exhausted. Upgrade your plan or wait for renewal.');
      }
    }
    reserved = subscription.id;
  }
  if(reserved) await db.designGenerationJob.update({where:{id},data:{subscriptionId:reserved}});

  // Parse business visual & multimodal context from __pendingMeta in resultJson (or legacy contextJson/costBreakdownJson)
  let visualContext: any = undefined;
  const parseContextObject = (raw: unknown) => {
    if (typeof raw !== 'string' || !raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const candidate = parsed.__pendingMeta && typeof parsed.__pendingMeta === 'object' ? parsed.__pendingMeta : parsed;
        if (
          candidate.category ||
          candidate.products ||
          candidate.services ||
          candidate.businessName ||
          (Array.isArray(candidate.referenceImageUrls) && candidate.referenceImageUrls.length > 0) ||
          candidate.aspectRatio ||
          candidate.autoFromBusiness
        ) {
          return candidate;
        }
      }
    } catch {}
    return null;
  };

  visualContext =
    parseContextObject(job.resultJson) ||
    parseContextObject((job as any).contextJson) ||
    parseContextObject((job as any).costBreakdownJson) ||
    undefined;

  const isPoster = job.prompt.startsWith('[POSTER]');
  let result: { bytes: Buffer; model: string; cost: number | null };
  try {
    result = await generateDesignImage(
      job.prompt,
      (job.provider || 'cloudflare') as any,
      AbortSignal.timeout(150000),
      isPoster,
      visualContext,
      {
        referenceImageUrls: Array.isArray(visualContext?.referenceImageUrls)
          ? visualContext.referenceImageUrls
          : undefined,
        autoFromBusiness: Boolean(visualContext?.autoFromBusiness),
        aspectRatio: visualContext?.aspectRatio,
      }
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
  await db.designGenerationJob.updateMany({where:{id,status:'running'},data:{status:'failed',resultJson:null,error:generated?'Generation finished but its result could not be stored. Contact support before retrying.':error instanceof Error?error.message:'Generation failed',finishedAt:new Date()}});
 }
}
export async function drainDesignJobs(){
 // Do not retry jobs whose provider call may already have incurred a charge.
 await db.designGenerationJob.updateMany({where:{status:'running',startedAt:{lt:new Date(Date.now()-10*60*1000)}},data:{status:'uncertain',error:'Worker interrupted. Provider billing/result needs reconciliation before retrying.',finishedAt:new Date()}});
 const jobs=await db.designGenerationJob.findMany({where:{status:'queued',cancelRequested:false},orderBy:{createdAt:'asc'},take:2,select:{id:true}});
 await Promise.all(jobs.map(job=>runDesignJob(job.id)));
 return jobs.length;
}

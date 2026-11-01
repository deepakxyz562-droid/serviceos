type Job={jobId:string;status:string;error?:string;result?:{url:string;assetId:string}};
type Request=<T>(path:string,options?:{method?:'GET'|'POST'|'DELETE';body?:unknown;signal?:AbortSignal})=>Promise<T>;
/** Reconnect using the returned job ID. Retries reuse requestId, never silently rebill. */
export async function awaitDesignJob(request:Request,jobId:string,signal:AbortSignal){
 const path=`/api/social/designs/image?id=${encodeURIComponent(jobId)}`;
 while(!signal.aborted){
  const job=await request<Job>(path,{signal});
  if(job.status==='completed'&&job.result)return job.result;
  if(['failed','cancelled','uncertain'].includes(job.status))throw new Error(job.error||`Generation ${job.status}`);
  await new Promise<void>((resolve,reject)=>{
   const cancel=()=>{clearTimeout(timer);reject(new Error('Cancelled'));};
   const timer=setTimeout(()=>{signal.removeEventListener('abort',cancel);resolve();},2000);
   if(signal.aborted)cancel();else signal.addEventListener('abort',cancel,{once:true});
  });
 }
 throw new Error('Cancelled');
}
export async function startDesignJob(request:Request,input:{prompt:string;provider:string;requestId:string},signal:AbortSignal,onQueued:(id:string)=>void){
 const job=await request<Job>('/api/social/designs/image',{method:'POST',body:input,signal});onQueued(job.jobId);
 return awaitDesignJob(request,job.jobId,signal);
}

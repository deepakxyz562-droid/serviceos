// Deploy as a continuously running service, not a serverless request.
// node --env-file=.env scripts/workers/bgos-autopilot.mjs
const origin=process.env.BGOS_WORKER_ORIGIN||'http://127.0.0.1:3000';
const secret=process.env.CRON_SECRET;
if(!secret)throw new Error('CRON_SECRET must be configured');
let stopping=false;
process.on('SIGTERM',()=>{stopping=true;});process.on('SIGINT',()=>{stopping=true;});
while(!stopping){
 try{
  let cursor=null;
  do{
   const url=new URL('/api/cron/social-autopilot',origin);if(cursor)url.searchParams.set('cursor',cursor);
   const response=await fetch(url,{method:'POST',headers:{Authorization:`Bearer ${secret}`},signal:AbortSignal.timeout(600000)});
   if(!response.ok)throw new Error(`Autopilot endpoint returned ${response.status}`);
   const result=await response.json();cursor=result.nextCursor;
   console.log(JSON.stringify({event:'autopilot_tick',processed:result.processedCount,submitted:result.publishedCount}));
  }while(cursor&&!stopping);
  const waRes=await fetch(new URL('/api/cron/whatsapp-followup',origin),{method:'POST',headers:{Authorization:`Bearer ${secret}`},signal:AbortSignal.timeout(60000)}).catch(()=>null);
  if(waRes?.ok){
    const waJson=await waRes.json().catch(()=>({}));
    if(waJson.nudgedCount>0)console.log(JSON.stringify({event:'whatsapp_inactivity_nudged',nudged:waJson.nudgedCount}));
  }
 }catch(error){console.error(error.message);}
 for(let seconds=0;seconds<60&&!stopping;seconds++)await new Promise(resolve=>setTimeout(resolve,1000));
}

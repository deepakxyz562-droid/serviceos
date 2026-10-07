// Read-only verification. Never prints credentials or customer records.
const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());
const checks=[];
const check=(name,ok,detail)=>checks.push({name,ok,detail});
(async()=>{
 const origin=process.env.NEXT_PUBLIC_APP_URL;
 check('HTTPS application URL',!!origin&&new URL(origin).protocol==='https:',origin?new URL(origin).hostname:'missing');
 check('Signed order links',Buffer.byteLength(process.env.PUBLIC_ORDER_TOKEN_SECRET||process.env.JWT_SECRET||'')>=32,'At least 32 bytes required');
 check('Private outbox worker',!!process.env.CRON_SECRET,'Cron secret must be configured');
 const base=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!base||!secret)check('Database configuration',false,'Supabase URL/service-role key missing');
 else {
  const headers={apikey:secret,Authorization:`Bearer ${secret}`};
  for(const [name,path] of [
   ['Order payment columns','GptformCommerceOrder?select=paidAmount,needsReconciliation&limit=1'],
   ['Transactional ledger','NuvoraMoneyEvent?select=id&limit=1'],
   ['Delivery outbox','NuvoraCommerceOutbox?select=id,leaseToken&limit=1'],
   ['Stock retry records','NuvoraStockRequest?select=requestKey&limit=1'],
  ]){
   try{const res=await fetch(`${base}/rest/v1/${path}`,{headers,signal:AbortSignal.timeout(15000)});check(name,res.ok,`HTTP ${res.status}`);await res.body?.cancel();}
   catch{check(name,false,'Backend unreachable');}
  }
  try{
   // This RPC is SELECT-only. A deliberately nonexistent tenant avoids reading customer data.
   const res=await fetch(`${base}/rest/v1/rpc/nuvora_finance_snapshot`,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({p_business_id:'release-preflight-nonexistent',p_start:new Date().toISOString(),p_end:new Date().toISOString()}),signal:AbortSignal.timeout(15000)});
   check('Finance snapshot RPC',res.ok,`HTTP ${res.status}`);await res.body?.cancel();
  }catch{check('Finance snapshot RPC',false,'Backend unreachable');}
 }
 for(const c of checks)console.log(`${c.ok?'PASS':'FAIL'} ${c.name}: ${c.detail}`);
 process.exitCode=checks.some(c=>!c.ok)?1:0;
})().catch(()=>{console.error('Preflight failed without exposing environment details.');process.exitCode=1;});

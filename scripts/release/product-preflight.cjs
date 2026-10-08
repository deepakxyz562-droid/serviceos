// Read-only inventory. Run with node --env-file=.env; never prints secrets or PII.
async function run() {
 const base=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!base||!key) throw new Error('Missing database configuration');
 const headers={apikey:key,Authorization:`Bearer ${key}`};
 for(const [table,select] of [['Workspace','productType'],['AiBusiness','plan'],['ProductWorkspace','product'],['ProductMembership','status'],['ProductSubscription','status']]) {
  const response=await fetch(`${base}/rest/v1/${table}?select=${select}&limit=1000`,{headers,signal:AbortSignal.timeout(10000)});
  if(!response.ok){console.log(`${table}: HTTP ${response.status}`);continue;}
  const rows=await response.json();
  const counts={};for(const row of rows) counts[row[select]??'unset']=(counts[row[select]??'unset']||0)+1;
  console.log(table,JSON.stringify(counts),rows.length===1000?'(first 1000 rows)':'');
 }
 for(const host of ['fieseros.com','www.fieseros.com','bos.fieseros.com','chatbotly.fieseros.com','quoteflow.fieseros.com','marketplace.fieseros.com']) {
  try {const response=await fetch(`https://${host}`,{method:'HEAD',redirect:'manual',signal:AbortSignal.timeout(10000)});
   console.log(host,response.status,response.headers.get('location')||'');
  } catch {console.log(host,'unreachable');}
 }
}
run().catch(()=>{console.error('Preflight failed; check connection/configuration.');process.exitCode=1;});

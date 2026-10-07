// Read-only provider check. Credentials remain in memory; no messages are sent.
require('@next/env').loadEnvConfig(process.cwd());
const parse=v=>{try{return typeof v==='string'?JSON.parse(v):v||{};}catch{return {};}};
(async()=>{
 const base=process.env.NEXT_PUBLIC_SUPABASE_URL,secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
 const read=async(table,query)=>{const r=await fetch(`${base}/rest/v1/${table}?${new URLSearchParams(query)}`,{headers:{apikey:secret,Authorization:`Bearer ${secret}`},signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Provider lookup failed');return r.json();};
 const providers=await read('CommunicationProvider',{type:'eq.whatsapp',isPlatform:'eq.true',select:'id,provider,status,sendingEnabled,isDefault,configJson,credentialId',order:'isDefault.desc,updatedAt.desc'});
 console.log({platformProviders:providers.map(p=>({id:p.id,provider:p.provider,status:p.status,sendingEnabled:p.sendingEnabled,isDefault:p.isDefault,configKeys:Object.keys(parse(p.configJson))}))});
 const provider=providers.find(p=>p.status==='active'&&p.sendingEnabled);
 if(!provider){console.log({activeProvider:false});return;}
 const cfg=parse(provider.configJson);const credential=provider.credentialId?(await read('Credential',{id:`eq.${provider.credentialId}`,select:'encryptedData'}))[0]:null;const cred=parse(credential?.encryptedData);
 const token=cfg.accessToken||cred.accessToken||cred.apiKey,account=cfg.wabaId||cfg.businessAccountId||cred.wabaId||cred.businessAccountId;
 if(!token||!account){console.log({providerConfigured:!!token,wabaIdConfigured:!!account});return;}
 const response=await fetch(`https://graph.facebook.com/v25.0/${encodeURIComponent(account)}/message_templates?fields=name,status,language,category,components&limit=100`,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(15000)});
 if(!response.ok){const failure=await response.json().catch(()=>({}));console.log({providerReachable:true,status:response.status,errorCode:failure.error?.code,errorSubcode:failure.error?.error_subcode,errorType:failure.error?.type});return;}
 const data=await response.json();console.log(JSON.stringify({providerReachable:true,templates:(data.data||[]).map(t=>({name:t.name,status:t.status,language:t.language,category:t.category,components:t.components})),morePages:!!data.paging?.next},null,2));
})().catch(()=>{console.log({providerCheckFailed:true});process.exitCode=1;});

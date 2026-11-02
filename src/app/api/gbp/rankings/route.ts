import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { rankingSummary, scanMaps, type RankScan } from '@/lib/social/ranking-data';
export const dynamic='force-dynamic';
export const maxDuration=300;
function settings(raw:string|null){try{return JSON.parse(raw||'{}');}catch{return {};}}
export async function GET(request:NextRequest){
 const user=await getAuthUser(request);
 if(!user?.tenantId)return NextResponse.json({error:'Authentication required'},{status:401});
 const tenant=await db.tenant.findUnique({where:{id:user.tenantId},select:{settingsJson:true,city:true}});
 if(!tenant)return NextResponse.json({error:'Tenant not found'},{status:404});
 const stored=settings(tenant.settingsJson),summary=rankingSummary(stored.measuredRankScans||[]);
 return NextResponse.json({success:true,...summary,cityName:tenant.city,provider:'dataforseo',configured:!!(process.env.DATAFORSEO_LOGIN&&process.env.DATAFORSEO_PASSWORD),inTop3PackPct:summary.totalKeywords?Math.round(summary.top3Count/summary.totalKeywords*100):null,search:stored.rankSearch||null});
}
export async function POST(request:NextRequest){
 const user=await getAuthUser(request);
 if(!user?.tenantId)return NextResponse.json({error:'Authentication required'},{status:401});
 if(!process.env.DATAFORSEO_LOGIN||!process.env.DATAFORSEO_PASSWORD)return NextResponse.json({error:'DataForSEO credentials must be configured on the server before scanning.'},{status:503});
 const body=await request.json().catch(()=>({}));
 const tenant=await db.tenant.findUnique({where:{id:user.tenantId},select:{settingsJson:true}});
 if(!tenant)return NextResponse.json({error:'Tenant not found'},{status:404});
 const stored=settings(tenant.settingsJson), search=body?.search||stored.rankSearch;
 const coordinates=String(search?.location||'').split(',');
 const latitude=Number(coordinates[0]),longitude=Number(coordinates[1]);
 if(!search || typeof search.placeId!=='string'||!/^ChI[A-Za-z0-9_-]+$/.test(search.placeId)||coordinates.length!==3||!coordinates[0]||!coordinates[1]||!Number.isFinite(latitude)||Math.abs(latitude)>90||!Number.isFinite(longitude)||Math.abs(longitude)>180||!/^([3-9]|1[0-9]|2[01])z$/.test(coordinates[2])||!Array.isArray(search.keywords)||!search.keywords.length||search.keywords.length>5||search.keywords.some((k:unknown)=>typeof k!=='string'||!k.trim()||k.length>150))return NextResponse.json({error:'Provide a Google Place ID, latitude,longitude,zoom (e.g. 28.6139,77.2090,15z), and 1–5 keywords.'},{status:400});
 if(stored.rankScanClaim && Date.now()-Date.parse(stored.rankScanClaim.at)<86400000)return NextResponse.json({error:'One paid scan per workspace per 24 hours is allowed. Failed attempts also count to prevent repeated charges.'},{status:429});
 const id=randomUUID();
 const claim={...stored,rankSearch:search,rankScanClaim:{id,at:new Date().toISOString()}};
 // Optimistic compare-and-swap prevents concurrent paid scans and settings loss.
 const locked=await db.tenant.updateMany({where:{id:user.tenantId,settingsJson:tenant.settingsJson},data:{settingsJson:JSON.stringify(claim)}});
 if(!locked.count)return NextResponse.json({error:'Settings changed. Reload and retry.'},{status:409});
 try{
  const keywords: RankScan["keywords"]=[];let cost=0;
  for(const keyword of [...new Set<string>(search.keywords)]){const result=await scanMaps(keyword.trim(),search.location,search.placeId);cost+=result.cost;keywords.push({keyword:result.keyword,rank:result.rank});}
  const scan:RankScan={id,date:new Date().toISOString(),provider:'dataforseo',placeId:search.placeId,location:search.location,cost,keywords};
  for(let attempt=0;attempt<5;attempt++){
   const current=await db.tenant.findUniqueOrThrow({where:{id:user.tenantId},select:{settingsJson:true}}),fresh=settings(current.settingsJson);
   const saved=await db.tenant.updateMany({where:{id:user.tenantId,settingsJson:current.settingsJson},data:{settingsJson:JSON.stringify({...fresh,measuredRankScans:[...(fresh.measuredRankScans||[]),scan].slice(-366)})}});
   if(saved.count)return NextResponse.json({success:true,message:'Measured Google Maps positions saved',scannedAt:scan.date,cost});
  }
  return NextResponse.json({error:'Scan completed but settings changed repeatedly; history could not be saved.',scan},{status:409});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Ranking scan failed'},{status:502});}
}

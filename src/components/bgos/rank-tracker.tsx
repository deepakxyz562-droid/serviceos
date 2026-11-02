'use client';
import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/client-auth';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
type Search = {placeId:string;location:string;keywords:string[]};
type Result = {configured:boolean;currentAvgRank:number|null;initialAvgRank:number|null;totalImprovement:number|null;lastScannedAt:string|null;search:Search|null;keywords:{keyword:string;currentRank:number|null}[];history:{date:string;avgRank:number|null;location:string;cost:number}[]};
export function RankTracker(){
 const [data,setData]=useState<Result|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [placeId,setPlaceId]=useState(''),[location,setLocation]=useState(''),[keywords,setKeywords]=useState('');
 async function load(){try{const r=await authFetch('/api/gbp/rankings');const j=await r.json();if(!r.ok)throw new Error(j.error);setData(j);if(j.search){setPlaceId(j.search.placeId);setLocation(j.search.location);setKeywords(j.search.keywords.join('\n'));}setError('');}catch(e){setError(e instanceof Error?e.message:'Could not load rankings');}}
 useEffect(()=>{void load();},[]);
 async function scan(){setBusy(true);setError('');try{const r=await authFetch('/api/gbp/rankings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({search:{placeId,location,keywords:keywords.split('\n').map(k=>k.trim()).filter(Boolean)}})});const j=await r.json();if(!r.ok)throw new Error(j.error);toast.success(j.message);await load();}catch(e){setError(e instanceof Error?e.message:'Scan failed');}finally{setBusy(false);}}
 return <section className="space-y-5">
  <div><h2 className="text-xl font-semibold">Google Maps ranking history</h2><p className="text-sm text-muted-foreground">Measured DataForSEO results for a specific search location. Rankings can rise or fall; no position is guaranteed.</p></div>
  {error&&<p role="alert" className="rounded-lg border border-red-200 p-3 text-red-700">{error}</p>}
  {data&&!data.configured&&<p className="rounded-lg border p-3">Configure DataForSEO credentials on the server to enable scans. Existing history remains available.</p>}
  <div className="grid gap-4 sm:grid-cols-3">{[['First measured average',data?.initialAvgRank],['Latest measured average',data?.currentAvgRank],['Position change',data?.totalImprovement]].map(([label,value])=><div key={String(label)} className="rounded-xl border bg-card p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-semibold">{value??'Not measured'}</p></div>)}</div>
  <p className="text-xs text-muted-foreground">Averages include found positions only. Position change requires two comparable scans with every keyword found. Positive change means improvement; negative means decline.</p>
  <div className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2">
   <label className="text-sm">Google Place ID<input className="mt-1 w-full rounded-md border bg-background p-2" value={placeId} onChange={e=>setPlaceId(e.target.value)} placeholder="ChIJ…" /></label>
   <label className="text-sm">Search coordinates and zoom<input className="mt-1 w-full rounded-md border bg-background p-2" value={location} onChange={e=>setLocation(e.target.value)} placeholder="28.6139,77.2090,15z" /></label>
   <label className="text-sm sm:col-span-2">Keywords (one per line, maximum 5)<textarea className="mt-1 w-full rounded-md border bg-background p-2" value={keywords} onChange={e=>setKeywords(e.target.value)} rows={4}/></label>
   <p className="text-xs text-muted-foreground sm:col-span-2">Each keyword uses a paid provider request. Limited to one scan attempt per workspace per 24 hours. Changing the place, coordinates or keyword set starts a separate comparison.</p>
   <Button disabled={busy||!data?.configured} onClick={()=>void scan()}>{busy?'Scanning…':'Run paid ranking scan'}</Button>
  </div>
  <div className="overflow-x-auto rounded-xl border"><table className="w-full text-left text-sm"><thead><tr><th className="p-3">Keyword</th><th className="p-3">Latest position</th></tr></thead><tbody>{data?.keywords.map(k=><tr key={k.keyword} className="border-t"><td className="p-3">{k.keyword}</td><td className="p-3">{k.currentRank===null?'Not found in returned results':`#${k.currentRank}`}</td></tr>)}</tbody></table>{!data?.keywords.length&&<p className="p-4 text-muted-foreground">No measured rankings yet. Run a scan to establish your baseline.</p>}</div>
  <h3 className="font-semibold">Comparable scan history</h3><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-3">Measured at</th><th className="p-3">Average rank</th><th className="p-3">Search location</th><th className="p-3">Provider cost (USD)</th></tr></thead><tbody>{data?.history.map(h=><tr key={h.date} className="border-t"><td className="p-3">{new Date(h.date).toLocaleString()}</td><td className="p-3">{h.avgRank??'Not found'}</td><td className="p-3">{h.location}</td><td className="p-3">{h.cost.toFixed(4)}</td></tr>)}</tbody></table></div>
 </section>;
}

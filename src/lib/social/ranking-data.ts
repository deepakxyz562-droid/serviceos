export interface RankScan {
  id: string; date: string; provider: 'dataforseo'; placeId: string; location: string;
  cost: number; keywords: { keyword: string; rank: number | null }[];
}
export function rankingSummary(scans: RankScan[]) {
  const latest = scans.at(-1);
  // Only compare identical search settings and keyword sets.
  const key = (s: RankScan) => JSON.stringify([s.placeId, s.location, s.keywords.map(k => k.keyword).sort()]);
  const comparable = latest ? scans.filter(s => key(s) === key(latest)) : [];
  const baseline = comparable[0];
  const average = (s?: RankScan) => {
    const ranks = s?.keywords.flatMap(k => k.rank === null ? [] : [k.rank]) || [];
    return ranks.length ? Number((ranks.reduce((a,b)=>a+b,0)/ranks.length).toFixed(1)) : null;
  };
  const currentAvgRank = average(latest), initialAvgRank = average(baseline);
  const allRanked = comparable.length > 1 && latest?.keywords.every(k=>k.rank !== null) && baseline?.keywords.every(k=>k.rank !== null);
  return {
    currentAvgRank, initialAvgRank,
    totalImprovement: allRanked && currentAvgRank !== null && initialAvgRank !== null ? Number((initialAvgRank-currentAvgRank).toFixed(1)) : null,
    totalKeywords: latest?.keywords.length || 0,
    top3Count: latest?.keywords.filter(k=>k.rank !== null && k.rank<=3).length || 0,
    keywords: latest?.keywords.map(k=>({keyword:k.keyword,currentRank:k.rank})) || [],
    history: comparable.map(s=>({date:s.date,avgRank:average(s),top3Count:s.keywords.filter(k=>k.rank !== null && k.rank<=3).length,location:s.location,cost:s.cost})),
    lastScannedAt: latest?.date || null,
  };
}
export async function scanMaps(keyword:string, location:string, placeId:string) {
  const login=process.env.DATAFORSEO_LOGIN, password=process.env.DATAFORSEO_PASSWORD;
  if(!login || !password)throw new Error('Configure DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD on the server');
  const response=await fetch('https://api.dataforseo.com/v3/serp/google/maps/live/advanced',{
    method:'POST',headers:{Authorization:`Basic ${Buffer.from(`${login}:${password}`).toString('base64')}`,'Content-Type':'application/json'},
    body:JSON.stringify([{keyword,location_coordinate:location,language_code:'en',depth:100,search_places:false}]),signal:AbortSignal.timeout(60000),
  });
  if(!response.ok)throw new Error(`Rank provider HTTP ${response.status}`);
  const result=await response.json(),task=result.tasks?.[0];
  if(result.status_code!==20000 || task?.status_code!==20000 || !Array.isArray(task.result))throw new Error('DataForSEO could not complete this scan. Check provider account and task logs.');
  const items=task.result.flatMap((r:{items?:unknown[]})=>r.items || []);
  const match=items.find((item:{place_id?:string})=>item.place_id===placeId);
  return {keyword,rank:Number.isInteger(match?.rank_absolute)&&match.rank_absolute>0?match.rank_absolute:null,cost:Number(task.cost)||0};
}

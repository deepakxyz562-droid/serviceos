import { describe, it, expect, vi, afterEach } from 'vitest';
import { autopilotDue } from '@/lib/social/autopilot-schedule';
import { googleReplyState } from '@/lib/social/review-state';
import { rankingSummary, scanMaps, type RankScan } from '@/lib/social/ranking-data';
const config={enabled:true,startDate:'2026-01-01T00:00:00Z',endDate:'2027-01-01T00:00:00Z',postingTime:'09:00',timeZone:'Asia/Kolkata'};
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
describe('Daily posting schedule',()=>{
 it('honors local time and suppresses a second local-day run',()=>{
  expect(autopilotDue(config,new Date('2026-11-02T03:29:00Z'))).toBe(false);
  expect(autopilotDue(config,new Date('2026-11-02T03:30:00Z'))).toBe(true);
  expect(autopilotDue({...config,lastRunAt:'2026-11-02T03:30:00Z'},new Date('2026-11-02T18:00:00Z'))).toBe(false);
 });
 it('does not run paused or expired subscriptions',()=>{
  expect(autopilotDue({...config,enabled:false},new Date('2026-11-02T12:00:00Z'))).toBe(false);
  expect(autopilotDue(config,new Date('2027-01-01T12:00:00Z'))).toBe(false);
 });
});
it('never treats pending, rejected or unspecified Google moderation as approved',()=>{
 expect(googleReplyState('PENDING')).toEqual({status:'pending',publishedToGoogle:false});
 expect(googleReplyState('REJECTED').publishedToGoogle).toBe(false);
 expect(googleReplyState().publishedToGoogle).toBe(false);
 expect(googleReplyState('APPROVED').publishedToGoogle).toBe(true);
});
const scan=(rank:number|null,location='1,2,15z'):RankScan=>({id:'1',date:'2026-11-02',provider:'dataforseo',placeId:'ChIJtest',location,cost:0.001,keywords:[{keyword:'cleaner',rank}]});
it('does not invent measurements, improvements or comparable history',()=>{
 expect(rankingSummary([]).currentAvgRank).toBeNull();
 expect(rankingSummary([scan(3)]).totalImprovement).toBeNull();
 expect(rankingSummary([scan(3),scan(8)]).totalImprovement).toBe(-5);
 expect(rankingSummary([scan(3),scan(1,'2,3,15z')]).totalImprovement).toBeNull();
 expect(rankingSummary([scan(3),scan(null)]).totalImprovement).toBeNull();
});
it('matches provider results by place ID and retains provider cost',async()=>{
 vi.stubEnv('DATAFORSEO_LOGIN','test');vi.stubEnv('DATAFORSEO_PASSWORD','test');
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({status_code:20000,tasks:[{status_code:20000,cost:0.01,result:[{items:[{place_id:'other',rank_absolute:1},{place_id:'ChIJtest',rank_absolute:7}]}]}]}))));
 expect(await scanMaps('cleaner','1,2,15z','ChIJtest')).toEqual({keyword:'cleaner',rank:7,cost:0.01});
});
it('rejects provider task failures even with HTTP 200',async()=>{
 vi.stubEnv('DATAFORSEO_LOGIN','test');vi.stubEnv('DATAFORSEO_PASSWORD','test');
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({status_code:20000,tasks:[{status_code:40501}]}))));
 await expect(scanMaps('cleaner','1,2,15z','ChIJtest')).rejects.toThrow('could not complete');
});

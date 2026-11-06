// @vitest-environment node
import {describe,it,expect,vi,beforeEach} from 'vitest';
import {NextRequest} from 'next/server';
const mocks=vi.hoisted(()=>({auth:vi.fn(),rpc:vi.fn(),query:vi.fn(),useRest:vi.fn()}));
vi.mock('@/lib/auth',()=>({getAuthUser:mocks.auth}));
vi.mock('@/lib/db',()=>({db:{$queryRaw:mocks.query}}));
vi.mock('@/lib/supabase-db',()=>({shouldUseSupabaseDB:mocks.useRest}));
vi.mock('@/lib/supabase',()=>({getSupabaseAdmin:()=>({rpc:mocks.rpc})}));
import {POST} from '@/app/api/calls/convert/route';
import {POST as create} from '@/app/api/calls/route';
const req=(body:unknown)=>new NextRequest('https://example.com/api/calls',{method:'POST',body:JSON.stringify(body)});
beforeEach(()=>{vi.clearAllMocks();mocks.auth.mockResolvedValue({tenantId:'tenant-1',name:'Owner'});mocks.useRest.mockReturnValue(true);});
describe('Atomic call write API boundary',()=>{
 it('uses server-derived tenant and one RPC for conversion',async()=>{
  mocks.rpc.mockResolvedValue({data:{success:true,status:200},error:null});
  expect((await POST(req({callId:'call-1',tenantId:'evil'}))).status).toBe(200);
  expect(mocks.rpc).toHaveBeenCalledWith('bgos_call_write',expect.objectContaining({p_tenant:'tenant-1',p_action:'convert'}));
 });
 it('fails closed when database function is missing',async()=>{
  mocks.rpc.mockResolvedValue({error:{code:'PGRST202'}});
  expect((await POST(req({callId:'call-1'}))).status).toBe(503);
  expect(mocks.query).not.toHaveBeenCalled();
 });
 it('returns not found for inaccessible calls',async()=>{
  mocks.rpc.mockResolvedValue({data:{status:404,error:'Call record not found'}});
  expect((await POST(req({callId:'other-tenant-call'}))).status).toBe(404);
 });
 it('rejects unauthenticated requests',async()=>{
  mocks.auth.mockResolvedValue(null);
  expect((await POST(req({callId:'c'}))).status).toBe(401);
  expect(mocks.rpc).not.toHaveBeenCalled();
 });
 it.each([{durationSec:-1},{durationSec:'invalid'},{callType:'fake'},{createLead:'false'},{leadValue:-3}])('rejects malformed call fields %j',async(fields)=>{
  expect((await create(req({customerPhone:'+15551234567',...fields}))).status).toBe(400);
  expect(mocks.rpc).not.toHaveBeenCalled();
 });
 it('requires a stable event identity for native ingestion',async()=>{
  expect((await create(req({customerPhone:'+15551234567',captureSource:'android_sim'}))).status).toBe(400);
 });
 it('does not fabricate timestamps for manual calls',async()=>{
  mocks.rpc.mockResolvedValue({data:{success:true,status:200}});
  expect((await create(req({customerPhone:'+15551234567',durationSec:20}))).status).toBe(200);
  expect(mocks.rpc.mock.calls[0][1].p_body).toMatchObject({startedAt:null,endedAt:null,captureSource:'manual'});
 });
});

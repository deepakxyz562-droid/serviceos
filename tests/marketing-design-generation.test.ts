// @vitest-environment node
import { beforeEach,it,expect,vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createDesign } from '../shared/marketing-design';
const m=vi.hoisted(()=>({auth:vi.fn(),ai:vi.fn()}));
vi.mock('@/lib/ai-usage-tracker',()=>({checkAiQuota:async()=>({ok:true})}));
vi.mock('@/lib/auth',()=>({getAuthUser:m.auth}));
vi.mock('@/lib/ai-client',()=>({callAI:m.ai}));
import { POST } from '@/app/api/social/designs/generate/route';
const design=()=>createDesign({brand:'Business',headline:'Hello',subtitle:'',badge:'',cta:'Contact',photo:''});
const run=(body:unknown)=>POST(new NextRequest('http://localhost/api/social/designs/generate',{method:'POST',body:JSON.stringify(body)}));
beforeEach(()=>{vi.resetAllMocks();m.auth.mockResolvedValue({tenantId:'tenant'});});
it('requires authentication before generation',async()=>{m.auth.mockResolvedValue(null);expect((await run({})).status).toBe(401);expect(m.ai).not.toHaveBeenCalled();});
it('preserves editable layers returned by the model',async()=>{const d=design();d.layers[1].text='New headline';m.ai.mockResolvedValue({content:JSON.stringify({design:d,caption:'New copy'})});const res=await run({prompt:'Change headline',design:design()});expect(res.status).toBe(200);expect((await res.json()).design).toEqual(d);});
it('rejects invented image sources',async()=>{const d=design();d.layers.push({...d.layers[0],id:'bad',type:'image',src:'https://internal.example/secret'} as any);m.ai.mockResolvedValue({content:JSON.stringify({design:d,caption:''})});expect((await run({prompt:'New image',design:design()})).status).toBe(502);});
it('does not label invalid model output as success',async()=>{m.ai.mockResolvedValue({content:'not JSON'});expect((await run({prompt:'Edit',design:design()})).status).toBe(502);});

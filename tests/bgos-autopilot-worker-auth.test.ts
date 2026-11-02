import { it, expect, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
vi.mock('@/lib/db',()=>({db:{tenant:{findMany:vi.fn().mockResolvedValue([])}}}));
vi.mock('@/lib/social/autopilot',()=>({getTenantAutopilotConfig:vi.fn(),generateDailyAutopilotPost:vi.fn()}));
import { POST } from '@/app/api/cron/social-autopilot/route';
afterEach(()=>vi.unstubAllEnvs());
it('requires a configured secret even when no Authorization header is supplied',async()=>{
 vi.stubEnv('CRON_SECRET','');
 expect((await POST(new NextRequest('http://localhost/api/cron/social-autopilot',{method:'POST'}))).status).toBe(401);
});
it('rejects query-string secrets and accepts the bearer worker request',async()=>{
 vi.stubEnv('CRON_SECRET','test-secret');
 expect((await POST(new NextRequest('http://localhost/api/cron/social-autopilot?secret=test-secret',{method:'POST'}))).status).toBe(401);
 const result=await POST(new NextRequest('http://localhost/api/cron/social-autopilot',{method:'POST',headers:{Authorization:'Bearer test-secret'}}));
 expect(result.status).toBe(200);expect((await result.json()).nextCursor).toBeNull();
});
it('returns nextCursor when a batch of 25 tenants is retrieved',async()=>{
 vi.stubEnv('CRON_SECRET','test-secret');
 const { db } = await import('@/lib/db');
 const mockTenants = Array.from({length: 25}, (_, i) => ({ id: `tenant-${i+1}`, name: `Tenant ${i+1}` }));
 (db.tenant.findMany as any).mockResolvedValueOnce(mockTenants);
 const res = await POST(new NextRequest('http://localhost/api/cron/social-autopilot',{method:'POST',headers:{Authorization:'Bearer test-secret'}}));
 expect(res.status).toBe(200);
 const json = await res.json();
 expect(json.nextCursor).toBe('tenant-25');
 expect(json.tenantsChecked).toBe(25);
});

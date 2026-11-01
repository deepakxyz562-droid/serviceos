// @vitest-environment node
import {beforeEach,it,expect,vi} from 'vitest';
const m=vi.hoisted(()=>({claim:vi.fn(),get:vi.fn(),update:vi.fn(),list:vi.fn(),subscription:vi.fn(),reserve:vi.fn(),refund:vi.fn(),ledger:vi.fn(),generate:vi.fn(),save:vi.fn()}));
vi.mock('@/lib/db',()=>({db:{designGenerationJob:{updateMany:m.claim,findUnique:m.get,update:m.update,findMany:m.list},subscription:{findFirst:m.subscription,updateMany:m.reserve,update:m.refund},usageLedger:{create:m.ledger}}}));
vi.mock('@/lib/designs/image-provider',()=>({generateDesignImage:m.generate}));
vi.mock('@/lib/designs/assets',()=>({saveDesignAsset:m.save}));
import {runDesignJob,drainDesignJobs} from '@/lib/designs/jobs';
beforeEach(()=>{vi.resetAllMocks();m.claim.mockResolvedValue({count:1});m.get.mockResolvedValue({id:'job',tenantId:'tenant',userId:'user',prompt:'Forest',provider:'gemini'});m.subscription.mockResolvedValue({id:'sub',aiQuota:10});m.reserve.mockResolvedValue({count:1});m.generate.mockResolvedValue({bytes:Buffer.from('image'),model:'image-model',cost:null});m.save.mockResolvedValue({assetId:'asset',url:'https://asset'});});
it('does not call the provider if another worker claimed the job',async()=>{m.claim.mockResolvedValue({count:0});await runDesignJob('job');expect(m.generate).not.toHaveBeenCalled();});
it('records a completed job and stable ledger id',async()=>{await runDesignJob('job');expect(m.ledger.mock.calls[0][0].data.idempotencyKey).toBe('image-job:job');expect(m.claim.mock.calls.at(-1)?.[0].data.status).toBe('completed');});
it('does not generate with exhausted allowance',async()=>{m.reserve.mockResolvedValue({count:0});await runDesignJob('job');expect(m.generate).not.toHaveBeenCalled();expect(m.claim.mock.calls.at(-1)?.[0].data.status).toBe('failed');});
it('does not refund provider work that completed but could not be stored',async()=>{m.save.mockRejectedValue(new Error('storage failed'));await runDesignJob('job');expect(m.refund).not.toHaveBeenCalled();expect(m.claim.mock.calls.at(-1)?.[0].data.error).toContain('Contact support');});
it('marks abandoned workers uncertain without automatically rebilling',async()=>{m.list.mockResolvedValue([]);await drainDesignJobs();expect(m.claim.mock.calls[0][0].data.status).toBe('uncertain');expect(m.generate).not.toHaveBeenCalled();});

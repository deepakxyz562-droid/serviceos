// @vitest-environment node
import {beforeEach,it,expect,vi} from 'vitest';
const m=vi.hoisted(()=>({assets:vi.fn(),post:vi.fn(),job:vi.fn(),retire:vi.fn(),remove:vi.fn(),deleteFile:vi.fn()}));
vi.mock('@/lib/db',()=>({db:{imageLibrary:{findMany:m.assets,updateMany:m.retire,deleteMany:m.remove},socialPost:{findFirst:m.post},designGenerationJob:{findFirst:m.job}}}));
vi.mock('@/lib/supabase-storage',()=>({deleteFile:m.deleteFile}));
import {cleanupDesignAssets} from '@/lib/designs/cleanup';
const asset={id:'12345678-1234-1234-1234-123456789abc',tenantId:'tenant',folder:'bgos-design',url:'https://assets/image.png'};
beforeEach(()=>{vi.resetAllMocks();m.assets.mockResolvedValue([asset]);m.post.mockResolvedValue(null);m.job.mockResolvedValue(null);m.deleteFile.mockResolvedValue(true);});
it('defaults to dry run without mutation',async()=>{await cleanupDesignAssets();expect(m.retire).not.toHaveBeenCalled();expect(m.deleteFile).not.toHaveBeenCalled();});
it('protects assets referenced by a saved post',async()=>{m.post.mockResolvedValue({id:'post'});expect((await cleanupDesignAssets(false)).protected).toBe(1);expect(m.deleteFile).not.toHaveBeenCalled();});
it('protects generated results still available to resume',async()=>{m.job.mockResolvedValue({id:'job'});expect((await cleanupDesignAssets(false)).protected).toBe(1);});
it('retires an unused image without deleting it immediately',async()=>{await cleanupDesignAssets(false);expect(m.retire).toHaveBeenCalledOnce();expect(m.deleteFile).not.toHaveBeenCalled();});
it('deletes only previously retired storage paths',async()=>{m.assets.mockResolvedValue([{...asset,folder:'bgos-design-retired'}]);await cleanupDesignAssets(false);expect(m.deleteFile).toHaveBeenCalledWith('campaign-assets',`tenant/design-assets/${asset.id}.png`);expect(m.remove).toHaveBeenCalledOnce();});
it('keeps metadata when storage deletion fails',async()=>{m.assets.mockResolvedValue([{...asset,folder:'bgos-design-retired'}]);m.deleteFile.mockResolvedValue(false);await cleanupDesignAssets(false);expect(m.remove).not.toHaveBeenCalled();});

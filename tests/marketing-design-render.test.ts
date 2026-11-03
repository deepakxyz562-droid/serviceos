// @vitest-environment node
import { it,expect,vi } from 'vitest';
import { createDesign } from '../shared/marketing-design';
const m=vi.hoisted(()=>({upload:vi.fn(async(_params: any)=>({url:'https://assets.example/render.png'}))}));
vi.mock('@/lib/db',()=>({db:{imageLibrary:{findFirst:vi.fn(),upsert:vi.fn()}}}));
vi.mock('@/lib/supabase-storage',()=>({uploadFile:m.upload,isS3Configured:()=>true,isSupabaseStorageConfigured:()=>false}));
import { renderDesign } from '@/lib/designs/render';
it('renders editable text into a PNG and stores it under the tenant',async()=>{
 const d=createDesign({brand:'Business',headline:'Hello',subtitle:'Contact us',badge:'New',cta:'Learn more',photo:''});
 const result=await renderDesign(d,'tenant-one');
 expect(result.imageUrl).toBe('https://assets.example/render.png');
 const args=m.upload.mock.calls[0][0] as any;
 expect(args.companyId).toBe('tenant-one');
 expect(args.file.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');
});
it('rejects unapproved remote image hosts before fetching them',async()=>{
 const d=createDesign({brand:'Business',headline:'Hello',subtitle:'',badge:'',cta:'',photo:'https://127.0.0.1/private'});
 await expect(renderDesign(d,'tenant-one')).rejects.toThrow('approved asset source');
});

it('renders commercial poster design with pill badges, rounded CTA buttons, and bold weights', async () => {
  const { createCommercialPosterDesign } = await import('../shared/marketing-design');
  const d = createCommercialPosterDesign({
    brand: 'Fieseros',
    headline: 'Automated GPS Attendance & Field Tracking',
    subtitle: 'Eliminate proxy attendance with live route telemetry.',
    badge: 'SPECIAL OFFER',
    cta: 'START FREE TRIAL',
    theme: 'cyber_tech',
  });
  const result = await renderDesign(d, 'tenant-fieseros');
  expect(result.imageUrl).toBe('https://assets.example/render.png');
  const args = m.upload.mock.calls[m.upload.mock.calls.length - 1][0] as any;
  expect(args.file.length).toBeGreaterThan(10_000);
  expect(args.file.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
});

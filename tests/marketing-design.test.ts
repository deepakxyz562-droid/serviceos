import { describe,it,expect } from 'vitest';
import { createDesign,validateDesign,createFieserosCampaignDesign } from '../shared/marketing-design';
const base=()=>createDesign({brand:'A business',headline:'Our services',subtitle:'Contact us',badge:'',cta:'Learn more',photo:'https://images.unsplash.com/example'});
describe('editable marketing source documents',()=>{
  it('validates the Fieseros AI Assistant 4:5 portrait campaign design',()=>{
    const d = createFieserosCampaignDesign();
    expect(d.width).toBe(1080);
    expect(d.height).toBe(1350);
    expect(d.background).toBe('#062419');
    expect(validateDesign(d)).toEqual(d);
    expect(d.layers.some(l => l.text === 'Less admin. More jobs.')).toBe(true);
    expect(d.layers.some(l => l.id === 'cmd_text')).toBe(true);
  });
  it.each(['1:1','4:5','9:16','16:9'])('round trips a %s document without losing layers',ratio=>{
    const d=createDesign({brand:'Business',headline:'Hello',subtitle:'Services',badge:'New',cta:'Contact',photo:'',ratio});
    expect(validateDesign(JSON.parse(JSON.stringify(d)))).toEqual(d);
  });
  it('rejects malformed geometry and duplicate layer IDs',()=>{
    const d=base();d.layers[0].x=-1;expect(()=>validateDesign(d)).toThrow();
    const b=base();b.layers.push(b.layers[0]);expect(()=>validateDesign(b)).toThrow();
  });
  it('rejects executable and internal image URLs',()=>{
    for(const src of ['javascript:alert(1)','file:///etc/passwd','http://127.0.0.1/a']){
      const d=base();d.layers[0].src=src;expect(()=>validateDesign(d)).toThrow();
    }
  });
  it('preserves independent image and text editing',()=>{
    const d=base();const headline=d.layers.find(l=>l.id==='headline')!;headline.text='Changed';
    const parsed=validateDesign(d);expect(parsed.layers[0].src).toBe(d.layers[0].src);expect(parsed.layers.find(l=>l.id==='headline')!.text).toBe('Changed');
    parsed.layers[0].opacity=1;expect(d.layers[0].opacity).toBe(0.3);
  });
  it('rejects unknown document versions',()=>expect(()=>validateDesign({...base(),version:2})).toThrow());
});

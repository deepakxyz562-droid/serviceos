import { checkAiQuota } from '@/lib/ai-usage-tracker';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { callAI } from '@/lib/ai-client';
import { validateDesign } from '../../../../../../shared/marketing-design';
export async function POST(request:NextRequest) {
  const user=await getAuthUser(request);
  if(!user?.tenantId)return NextResponse.json({error:'Authentication required'},{status:401});
  try {
    const body=await request.json();
    const design=validateDesign(body.design);
    if(typeof body.prompt!=='string'||!body.prompt.trim()||body.prompt.length>4000)return NextResponse.json({error:'Provide a prompt of 1–4000 characters'},{status:400});
    const quota=await checkAiQuota(user.tenantId);
    if(!quota.ok)return quota.response!;
    // Images remain independent assets: never ask a text model to invent asset URLs.
    const sources=design.layers.filter(l=>l.type==='image').map(l=>l.src!);
    const compact={...design,layers:design.layers.map(l=>l.type==='image'?{...l,src:`asset:${sources.indexOf(l.src!)}`} : l)};
    const result=await callAI({messages:[
      {role:'system',content:'Edit a marketing design as JSON. Return ONLY {"design": <complete document>, "caption": <string>, "alternativeHeadlines": [<string>, <string>, <string>]}. Preserve version 1 and the layer schema exactly. Canvas dimensions 320..2160; maximum 40 layers. Types: text, image, shape. Coordinates must fit the canvas. All layers require id, type, x, y, width, height, color, background, fontSize (8..200), opacity (0..1). Text layers require text. Image layers require src. Colors must be six-digit hex or transparent. Preserve existing content unless asked to change it. Use only existing asset:N image references; never invent images, offers, contact details or claim that an image was generated. Keep editable text separate from images. Return a useful layout based on the prompt. Provide 3 punchy alternative headline options in alternativeHeadlines.'},
      {role:'user',content:JSON.stringify({prompt:body.prompt,design:compact,caption:typeof body.caption==='string'?body.caption.slice(0,5000):'',mode:body.mode||'graphic'})}
    ],temperature:0.4,usageContext:{tenantId:user.tenantId,feature:'bgos_design_edit'}});
    const parsed=JSON.parse(result.content.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''));
    for(const l of parsed.design?.layers||[])if(l.type==='image'){
      const match=typeof l.src==='string'&&/^asset:(\d+)$/.exec(l.src);
      if(match&&sources[Number(match[1])]){
        l.src=sources[Number(match[1])];
      }else if(typeof l.src==='string'&&sources.includes(l.src)){
        // Already preserved original source
      }else{
        throw new Error('Generated design references an unavailable image');
      }
    }
    const next=validateDesign(parsed.design);
    if(typeof parsed.caption!=='string'||parsed.caption.length>10000)throw new Error('Invalid generated caption');
    if (body.mode === 'image_only') {
      next.layers = next.layers.filter(l => l.type === 'image');
    }
    const alts = Array.isArray(parsed.alternativeHeadlines)
      ? parsed.alternativeHeadlines.filter((h: unknown): h is string => typeof h === 'string' && h.trim().length > 0).slice(0, 3)
      : [];
    return NextResponse.json({design:next,caption:parsed.caption,alternativeHeadlines:alts});
  } catch(error) {
    console.error('[designs/generate]',error instanceof Error?error.message:'Generation failed');
    return NextResponse.json({error:'The design could not be generated. Your current design is unchanged; please retry.'},{status:502});
  }
}

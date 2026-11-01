'use client';
import { startDesignJob, awaitDesignJob } from '../../../shared/design-job-client';
import React, { useState, useRef } from 'react';
import { authFetch } from '@/lib/api';
import { type MarketingDesign, type DesignLayer } from '../../../shared/marketing-design';

export function EditableMarketingDesign({design,onChange}:{design:MarketingDesign;onChange:(d:MarketingDesign)=>void}) {
  const [exportUrl,setExportUrl]=useState('');
  const [exportBusy,setExportBusy]=useState(false);
  const [imagePrompt,setImagePrompt]=useState('');
  const [provider,setProvider]=useState('gemini');
  const [imageBusy,setImageBusy]=useState(false);
  const [imageError,setImageError]=useState('');
  const jobId=useRef<string|null>(null);
  const requestId=useRef<{key:string;id:string}|null>(null);
  async function jobRequest<T>(path:string,options?:{method?:'GET'|'POST'|'DELETE';body?:unknown;signal?:AbortSignal}):Promise<T>{const res=await authFetch(path,{method:options?.method||'GET',headers:{'Content-Type':'application/json'},body:options?.body?JSON.stringify(options.body):undefined,signal:options?.signal});const json=await res.json();if(!res.ok)throw new Error(json.error||'Request failed');return json;}
  const imageAbort=useRef<AbortController|null>(null);
  const drag=useRef<{x:number;y:number;mode:'move'|'resize';layer:DesignLayer}|null>(null);
  const [selected,setSelected] = useState<string>('headline');
  const [past,setPast] = useState<MarketingDesign[]>([]);
  const [future,setFuture] = useState<MarketingDesign[]>([]);
  const layer = design.layers.find(l=>l.id===selected);
  const commit = (next:MarketingDesign) => { setPast(p=>[...p.slice(-49),design]);setFuture([]);onChange(next); };
  const patch = (values:Partial<DesignLayer>) => commit({...design,layers:design.layers.map(l=>l.id===selected?{...l,...values}:l)});
  const add = (type:DesignLayer['type']) => {
    const id=crypto.randomUUID();commit({...design,layers:[...design.layers,{id,type,x:60,y:60,width:Math.min(600,design.width-60),height:160,text:type==='text'?'Your text':undefined,color:'#ffffff',background:type==='shape'?'#009f50':'transparent',fontSize:48,opacity:1}]});setSelected(id);
  };
  function finishGesture(e:React.PointerEvent){
    const start=drag.current;if(!start)return;drag.current=null;
    const canvas=e.currentTarget.closest('[data-design-canvas]');if(!canvas)return;
    const scale=design.width/canvas.getBoundingClientRect().width;
    const dx=(e.clientX-start.x)*scale,dy=(e.clientY-start.y)*scale;
    const snap=(n:number)=>Math.round(n/8)*8;
    let changes:Partial<DesignLayer>;
    if(start.mode==='move'){
      let x=Math.max(0,Math.min(design.width-start.layer.width,snap(start.layer.x+dx)));
      let y=Math.max(0,Math.min(design.height-start.layer.height,snap(start.layer.y+dy)));
      if(Math.abs(x+start.layer.width/2-design.width/2)<16)x=(design.width-start.layer.width)/2;
      if(Math.abs(y+start.layer.height/2-design.height/2)<16)y=(design.height-start.layer.height)/2;
      changes={x,y};
    }else changes={width:Math.max(24,Math.min(design.width-start.layer.x,snap(start.layer.width+dx))),height:Math.max(24,Math.min(design.height-start.layer.y,snap(start.layer.height+dy)))};
    commit({...design,layers:design.layers.map(l=>l.id===start.layer.id?{...l,...changes}:l)});
  }
  async function generateImage(){
    if(imageBusy||!imagePrompt.trim())return;
    const controller=new AbortController();imageAbort.current=controller;setImageBusy(true);setImageError('');
    try{
      const key=JSON.stringify({prompt:imagePrompt,provider});
      if(requestId.current?.key!==key)requestId.current={key,id:crypto.randomUUID()};
      const result=await startDesignJob(jobRequest,{prompt:imagePrompt,provider,requestId:requestId.current.id},controller.signal,id=>{jobId.current=id;});
      requestId.current=null;
      if(controller.signal.aborted)return;
      const existing=design.layers.find(l=>l.id===selected&&l.type==='image')||design.layers.find(l=>l.type==='image');
      const image={id:existing?.id||crypto.randomUUID(),type:'image' as const,x:0,y:0,width:design.width,height:design.height,color:'#ffffff',background:'transparent',fontSize:48,opacity:1,...existing,src:result.url,assetId:result.assetId};
      commit({...design,layers:existing?design.layers.map(l=>l.id===existing.id?image:l):[image,...design.layers]});
    }catch(error){setImageError(controller.signal.aborted?'Generation cancelled. The provider may still charge for work already started.':error instanceof Error?error.message:'Generation failed');}
    finally{setImageBusy(false);imageAbort.current=null;}
  }
  return <div className="space-y-3">
    <style>{`@font-face{font-family:BgosDesign;src:url(/fonts/BgosDesign-Regular.ttf) format('truetype');font-weight:400;font-display:block;}`}</style>
    <div className="space-y-2 rounded-lg border p-3">
      <label className="block">Generate an image<textarea aria-label="Image prompt" className="block w-full rounded border p-2" value={imagePrompt} maxLength={4000} onChange={e=>setImagePrompt(e.target.value)} placeholder="Describe the background or illustration. Text remains editable separately."/></label>
      <select aria-label="Image provider" value={provider} onChange={e=>setProvider(e.target.value)}><option value="gemini">Gemini</option><option value="openrouter">OpenRouter</option></select>
      <button type="button" disabled={imageBusy||!imagePrompt.trim()} onClick={generateImage}>{imageBusy?'Generating…':'Generate image'}</button>
      {imageBusy&&<button type="button" onClick={()=>{imageAbort.current?.abort();if(jobId.current)void jobRequest(`/api/social/designs/image?id=${encodeURIComponent(jobId.current)}`,{method:'DELETE'}).catch(()=>setImageError('Could not confirm cancellation. Check generation status.'));}}>Cancel</button>}
      <button type="button" disabled={imageBusy} onClick={async()=>{setImageBusy(true);const controller=new AbortController();imageAbort.current=controller;try{const latest=await jobRequest<{jobId:string}>('/api/social/designs/image');jobId.current=latest.jobId;const asset=await awaitDesignJob(jobRequest,latest.jobId,controller.signal);const target=design.layers.find(l=>l.type==='image');if(target)commit({...design,layers:design.layers.map(l=>l.id===target.id?{...l,src:asset.url,assetId:asset.assetId}:l)});else setImageError('Add an image layer to apply this result.');}catch(e){setImageError(e instanceof Error?e.message:'Resume failed');}finally{setImageBusy(false);}}}>Resume latest generation</button>
      {imageError&&<p role="alert">{imageError}</p>}
    </div>
    <div className="flex flex-wrap gap-2">
      <button type="button" disabled={exportBusy} onClick={async()=>{setExportBusy(true);setImageError('');try{const res=await authFetch('/api/social/designs/render',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({design})});const result=await res.json();if(!res.ok)throw new Error(result.error);setExportUrl(result.imageUrl);}catch(e){setImageError(e instanceof Error?e.message:'Export failed');}finally{setExportBusy(false);}}}>{exportBusy?'Rendering…':'Render preview / export'}</button>
      {exportUrl&&<a href={exportUrl} target="_blank" rel="noreferrer" download="bgos-design.png">Open rendered PNG</a>}
      <button type="button" className="rounded border px-3 py-2" onClick={()=>add('text')}>Add text</button>
      <button type="button" className="rounded border px-3 py-2" onClick={()=>add('shape')}>Add shape</button>
      <button type="button" disabled={!past.length} onClick={()=>{setFuture(f=>[design,...f]);onChange(past[past.length-1]);setPast(p=>p.slice(0,-1));}}>Undo</button>
      <button type="button" disabled={!future.length} onClick={()=>{setPast(p=>[...p,design]);onChange(future[0]);setFuture(f=>f.slice(1));}}>Redo</button>
      <label>Background <input aria-label="Canvas background" type="color" value={design.background} onChange={e=>commit({...design,background:e.target.value})}/></label>
    </div>
    <div style={{containerType:'inline-size'}}>
      <div data-design-canvas className="relative overflow-hidden rounded-xl border" style={{aspectRatio:`${design.width}/${design.height}`,background:design.background}}>
        {design.layers.map(l=><div key={l.id} onClick={()=>setSelected(l.id)} style={{position:'absolute',left:`${l.x/design.width*100}%`,top:`${l.y/design.height*100}%`,width:`${l.width/design.width*100}%`,height:`${l.height/design.height*100}%`,color:l.color,background:l.background,opacity:l.opacity,fontSize:`${l.fontSize/design.width*100}cqw`,fontFamily:'BgosDesign',transform:`rotate(${l.rotation||0}deg)`,lineHeight:1.15,whiteSpace:'pre-wrap',overflow:'hidden',outline:selected===l.id?'2px solid #00b89c':undefined}}>
          {selected===l.id&&(['move','resize'] as const).map(mode=><button key={mode} type="button" aria-label={`${mode} layer`} onPointerDown={e=>{e.preventDefault();e.stopPropagation();drag.current={x:e.clientX,y:e.clientY,mode,layer:l};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerUp={finishGesture} onPointerCancel={()=>{drag.current=null;}} style={{position:'absolute',zIndex:10,right:0,top:mode==='move'?0:undefined,bottom:mode==='resize'?0:undefined,fontSize:12,background:'#ffffff',color:'#063d35',touchAction:'none',padding:3}}>{mode==='move'?'↔':'↘'}</button>)}
          {l.type==='image'?<img src={l.src} alt="Design layer" draggable={false} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:`${l.cropX??50}% ${l.cropY??50}%`}}/>:l.type==='text'?<div role="textbox" aria-label={`Edit ${l.id}`} contentEditable suppressContentEditableWarning onBlur={e=>{const text=e.currentTarget.textContent||'';if(text!==l.text)commit({...design,layers:design.layers.map(item=>item.id===l.id?{...item,text:text.slice(0,1000)}:item)});}}>{l.text}</div>:null}
        </div>)}
      </div>
    </div>
    <label className="block">Selected layer <select className="rounded border p-2" value={selected} onChange={e=>setSelected(e.target.value)}>{design.layers.map(l=><option key={l.id} value={l.id}>{l.id} ({l.type})</option>)}</select></label>
    {layer&&<div className="grid grid-cols-2 gap-3 rounded-lg border p-3">
      {(['x','y','width','height','fontSize','opacity'] as const).map(key=><label key={key} className="text-sm">{key}<input className="block w-full rounded border p-2" type="number" step={key==='opacity'?0.1:1} value={layer[key]} onChange={e=>{const value=Number(e.target.value);if(!Number.isFinite(value))return;const limit=key==='x'?design.width-layer.width:key==='y'?design.height-layer.height:key==='width'?design.width-layer.x:key==='height'?design.height-layer.y:key==='opacity'?1:200;patch({[key]:Math.max(key==='fontSize'?8:key==='width'||key==='height'?1:0,Math.min(limit,value))});}}/></label>)}
      {(['rotation','cropX','cropY'] as const).map(key=><label key={key}>{key}<input type="range" min={key==='rotation'?-180:0} max={key==='rotation'?180:100} value={layer[key]??(key==='rotation'?0:50)} onChange={e=>patch({[key]:Number(e.target.value)})}/></label>)}
      <label>Text colour <input type="color" value={layer.color} onChange={e=>patch({color:e.target.value})}/></label>
      {layer.type==='image'&&<label className="col-span-2">Replace image<input className="block w-full" type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>4_000_000){alert('Please use an image smaller than 4 MB');return;}const reader=new FileReader();reader.onload=async()=>{try{const res=await authFetch('/api/social/designs/assets',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:String(reader.result)})});const result=await res.json();if(!res.ok)throw new Error(result.error);patch({src:result.url,assetId:result.assetId});}catch(error){setImageError(error instanceof Error?error.message:'Upload failed');}};reader.readAsDataURL(file);}}/></label>}
      <button type="button" onClick={()=>{const rest=design.layers.filter(l=>l.id!==selected);commit({...design,layers:[...rest,layer]});}}>Bring to front</button>
      <button type="button" onClick={()=>commit({...design,layers:design.layers.filter(l=>l.id!==selected)})}>Delete layer</button>
    </div>}
    <p className="text-xs text-muted-foreground">Drag the arrow handles to move or resize; positions snap to an 8 px grid and canvas centre. Click text to edit directly. Select a layer to change its position, size or image. Export uses these saved layers.</p>
  </div>;
}

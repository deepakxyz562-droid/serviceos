'use client';
import { resizeDesign, patchDesignLayer, groupLayers, ungroupLayers, collageImages } from '../../../shared/design-editor';
import { startDesignJob, awaitDesignJob } from '../../../shared/design-job-client';
import React, { useState, useRef, useEffect } from 'react';
import { authFetch } from '@/lib/api';
import { type MarketingDesign, type DesignLayer } from '../../../shared/marketing-design';

export function EditableMarketingDesign({design,onChange}:{design:MarketingDesign;onChange:(d:MarketingDesign)=>void}) {
  const latest=useRef(design);latest.current=design;
  const [canvasSize,setCanvasSize]=useState({width:String(design.width),height:String(design.height)});
  useEffect(()=>{setExportUrl('');setCanvasSize({width:String(design.width),height:String(design.height)});},[design]);
  useEffect(()=>()=>imageAbort.current?.abort(),[]);
  const [exportFormat,setExportFormat]=useState<'png'|'jpeg'>('png');
  const [transparent,setTransparent]=useState(false);
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
  const [multiple,setMultiple]=useState<string[]>([]);
  const [selected,setSelected] = useState<string>('headline');
  const [past,setPast] = useState<MarketingDesign[]>([]);
  const [future,setFuture] = useState<MarketingDesign[]>([]);
  const layer = design.layers.find(l=>l.id===selected);
  const commit = (next:MarketingDesign) => { setPast(p=>[...p.slice(-49),design]);setFuture([]);onChange(next); };
  const patch = (values:Partial<DesignLayer>) => commit(patchDesignLayer(design,selected,values));
  const add = (type:DesignLayer['type']) => {
    const id=crypto.randomUUID();commit({...design,layers:[...design.layers,{id,type,x:60,y:60,width:Math.min(600,design.width-60),height:160,text:type==='text'?'Your text':undefined,color:'#ffffff',background:type==='shape'?'#009f50':'transparent',fontSize:48,opacity:1}]});setSelected(id);
  };
  async function addPhoto(file:File){
    if(file.size>4_000_000){setImageError('Choose an image smaller than 4 MB.');return;}
    try{
      const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Could not read photo.'));reader.readAsDataURL(file);});
      const response=await authFetch('/api/social/designs/assets',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data})});
      const asset=await response.json();if(!response.ok)throw new Error(asset.error||'Photo upload failed.');
      if(latest.current!==design)throw new Error('Design changed during upload. Select the photo again.');
      if(design.layers.length>=40)throw new Error('The canvas supports 40 layers.');
      const id=crypto.randomUUID();commit({...design,layers:[...design.layers,{id,type:'image',x:40,y:40,width:design.width-80,height:design.height*.45,src:asset.url,assetId:asset.assetId,color:'#ffffff',background:'transparent',fontSize:16,opacity:1}]});setSelected(id);
    }catch(e){setImageError(e instanceof Error?e.message:'Photo upload failed.');}
  }
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
    commit(patchDesignLayer(design,start.layer.id,changes));
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
      if(latest.current!==design)throw new Error('Your design changed during generation. Use Resume latest generation to apply the completed image.');
      const existing=design.layers.find(l=>l.id===selected&&l.type==='image')||design.layers.find(l=>l.type==='image');
      const image={id:existing?.id||crypto.randomUUID(),type:'image' as const,x:0,y:0,width:design.width,height:design.height,color:'#ffffff',background:'transparent',fontSize:48,opacity:1,...existing,src:result.url,assetId:result.assetId};
      commit({...design,layers:existing?design.layers.map(l=>l.id===existing.id?image:l):[image,...design.layers]});
    }catch(error){setImageError(controller.signal.aborted?'Generation cancelled. The provider may still charge for work already started.':error instanceof Error?error.message:'Generation failed');}
    finally{setImageBusy(false);imageAbort.current=null;}
  }
  return <div className="space-y-3">
    <style>{`@font-face{font-family:BgosDesign;src:url(/fonts/BgosDesign-Regular.ttf) format('truetype');font-weight:400;font-display:block;}@font-face{font-family:BgosDesign;src:url(/fonts/BgosDesign-Bold.ttf);font-weight:700;}`}</style>
    <div className="space-y-2 rounded-lg border p-3">
      <label className="block">Generate an image<textarea aria-label="Image prompt" className="block w-full rounded border p-2" value={imagePrompt} maxLength={4000} onChange={e=>setImagePrompt(e.target.value)} placeholder="Describe the background or illustration. Text remains editable separately."/></label>
      <select aria-label="Image provider" value={provider} onChange={e=>setProvider(e.target.value)}><option value="gemini">Gemini</option><option value="openrouter">OpenRouter</option></select>
      <button type="button" disabled={imageBusy||!imagePrompt.trim()} onClick={generateImage}>{imageBusy?'Generating…':'Generate image'}</button>
      {imageBusy&&<button type="button" onClick={()=>{imageAbort.current?.abort();if(jobId.current)void jobRequest(`/api/social/designs/image?id=${encodeURIComponent(jobId.current)}`,{method:'DELETE'}).catch(()=>setImageError('Could not confirm cancellation. Check generation status.'));}}>Cancel</button>}
      <button type="button" disabled={imageBusy} onClick={async()=>{setImageBusy(true);const controller=new AbortController();imageAbort.current=controller;try{const queued=await jobRequest<{jobId:string}>('/api/social/designs/image');jobId.current=queued.jobId;const asset=await awaitDesignJob(jobRequest,queued.jobId,controller.signal);if(controller.signal.aborted)return;if(latest.current!==design)throw new Error('Design changed. Resume again to apply the result.');const target=design.layers.find(l=>l.type==='image');if(target)commit({...design,layers:design.layers.map(l=>l.id===target.id?{...l,src:asset.url,assetId:asset.assetId}:l)});else setImageError('Add an image layer to apply this result.');}catch(e){setImageError(e instanceof Error?e.message:'Resume failed');}finally{setImageBusy(false);}}}>Resume latest generation</button>
      {imageError&&<p role="alert">{imageError}</p>}
    </div>
    <div className="flex flex-wrap gap-2">
      <label>Export format<select value={exportFormat} onChange={e=>setExportFormat(e.target.value as 'png'|'jpeg')}><option value="png">PNG</option><option value="jpeg">JPEG</option></select></label>
      <label><input type="checkbox" checked={transparent} disabled={exportFormat==='jpeg'} onChange={e=>setTransparent(e.target.checked)}/>Transparent canvas (PNG)</label>
      <button type="button" disabled={exportBusy} onClick={async()=>{setExportBusy(true);setImageError('');try{const res=await authFetch('/api/social/designs/render',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({design,format:exportFormat,transparent})});const result=await res.json();if(!res.ok)throw new Error(result.error);if(latest.current===design)setExportUrl(result.imageUrl);}catch(e){setImageError(e instanceof Error?e.message:'Export failed');}finally{setExportBusy(false);}}}>{exportBusy?'Rendering…':'Render preview / export'}</button>
      {exportUrl&&<a href={exportUrl} target="_blank" rel="noreferrer" download={`bgos-design.${exportFormat}`}>Open rendered image</a>}
      <label className="rounded border px-3 py-2">Add photo<input type="file" accept="image/png,image/jpeg,image/webp" disabled={design.layers.length>=40} onChange={e=>{const file=e.target.files?.[0];if(file)void addPhoto(file);e.target.value='';}}/></label>
      <button type="button" className="rounded border px-3 py-2" disabled={design.layers.length>=40} onClick={()=>add('text')}>Add text</button>
      <button type="button" className="rounded border px-3 py-2" disabled={design.layers.length>=40} onClick={()=>add('shape')}>Add shape</button>
      <button type="button" disabled={!past.length} onClick={()=>{setFuture(f=>[design,...f]);onChange(past[past.length-1]);setPast(p=>p.slice(0,-1));}}>Undo</button>
      <button type="button" disabled={!future.length} onClick={()=>{setPast(p=>[...p,design]);onChange(future[0]);setFuture(f=>f.slice(1));}}>Redo</button>
      <label>Background <input aria-label="Canvas background" type="color" value={design.background} onChange={e=>commit({...design,background:e.target.value})}/></label>
    </div>
    <details className="rounded-lg border p-3"><summary>Canvas size</summary><div className="flex flex-wrap gap-3 py-2">{(['width','height'] as const).map(key=><label key={key}>{key}<input type="number" min={320} max={2160} value={canvasSize[key]} onChange={e=>setCanvasSize(p=>({...p,[key]:e.target.value}))}/></label>)}<button type="button" onClick={()=>{try{commit(resizeDesign(design,Number(canvasSize.width),Number(canvasSize.height)));}catch{setImageError('Enter whole dimensions between 320 and 2160 pixels.');}}}>Resize canvas</button></div></details>
    <div style={{containerType:'inline-size'}}>
      <div data-design-canvas className="relative overflow-hidden rounded-xl border" style={{aspectRatio:`${design.width}/${design.height}`,background:design.background}}>
        {design.layers.filter(l=>!l.hidden).map(l=><div key={l.id} onClick={()=>setSelected(l.id)} style={{position:'absolute',left:`${l.x/design.width*100}%`,top:`${l.y/design.height*100}%`,width:`${l.width/design.width*100}%`,height:`${l.height/design.height*100}%`,color:l.color,background:l.background,opacity:l.opacity,fontSize:`${l.fontSize/design.width*100}cqw`,fontFamily:'BgosDesign',fontWeight:l.fontWeight as any,textAlign:l.textAlign||'left',borderRadius:l.borderRadius?`${l.borderRadius/design.width*100}cqw`:undefined,transform:`rotate(${l.rotation||0}deg)`,lineHeight:l.lineHeight??1.15,letterSpacing:`${Number(l.letterSpacing||0)/design.width*100}cqw`,whiteSpace:'pre-wrap',overflow:'hidden',outline:selected===l.id?'2px solid #00b89c':undefined}}>
          {selected===l.id&&!l.locked&&(['move','resize'] as const).map(mode=><button key={mode} type="button" aria-label={`${mode} layer`} onPointerDown={e=>{e.preventDefault();e.stopPropagation();drag.current={x:e.clientX,y:e.clientY,mode,layer:l};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerUp={finishGesture} onPointerCancel={()=>{drag.current=null;}} style={{position:'absolute',zIndex:10,right:0,top:mode==='move'?0:undefined,bottom:mode==='resize'?0:undefined,fontSize:12,background:'#ffffff',color:'#063d35',touchAction:'none',padding:3}}>{mode==='move'?'↔':'↘'}</button>)}
          {l.type==='image'?<img src={l.src} alt="Design layer" draggable={false} style={{width:'100%',height:'100%',objectFit:'cover',objectPosition:`${l.cropX??50}% ${l.cropY??50}%`}}/>:l.type==='text'?<div role="textbox" aria-label={`Edit ${l.id}`} contentEditable={!l.locked} suppressContentEditableWarning onBlur={e=>{const text=e.currentTarget.textContent||'';if(text!==l.text)commit({...design,layers:design.layers.map(item=>item.id===l.id?{...item,text:text.slice(0,1000)}:item)});}}>{l.text}</div>:null}
        </div>)}
      </div>
    </div>
    <details className="rounded-lg border p-3"><summary>Groups & photo layouts</summary>
      <p>Select two or more layers to link their movement. Select two to four photos for a collage.</p>
      <div className="flex flex-wrap gap-3">{design.layers.map(l=><label key={l.id}><input type="checkbox" disabled={l.locked} checked={multiple.includes(l.id)} onChange={e=>setMultiple(ids=>e.target.checked?[...ids,l.id]:ids.filter(id=>id!==l.id))}/>{l.id}</label>)}</div>
      <div className="flex flex-wrap gap-3"><button type="button" disabled={multiple.length<2} onClick={()=>{try{commit(groupLayers(design,multiple,crypto.randomUUID()));setMultiple([]);}catch(e){setImageError((e as Error).message);}}}>Group movement</button><button type="button" disabled={!layer?.groupId} onClick={()=>commit(ungroupLayers(design,selected))}>Ungroup</button>{(['columns','grid','feature'] as const).map(layout=><button key={layout} type="button" onClick={()=>{try{commit(collageImages(design,multiple,layout));}catch(e){setImageError((e as Error).message);}}}>Photo {layout}</button>)}</div>
    </details>
    <label className="block">Selected layer <select className="rounded border p-2" value={selected} onChange={e=>setSelected(e.target.value)}>{design.layers.map(l=><option key={l.id} value={l.id}>{l.id} ({l.type})</option>)}</select></label>
    {layer&&<div className="grid grid-cols-2 gap-3 rounded-lg border p-3">
      {(['x','y','width','height','fontSize','opacity'] as const).map(key=><label key={key} className="text-sm">{{x:"Horizontal position",y:"Vertical position",width:"Width",height:"Height",fontSize:"Text size",opacity:"Opacity"}[key]}<input className="block w-full rounded border p-2" type="number" step={key==='opacity'?0.1:1} value={layer[key]} onChange={e=>{const value=Number(e.target.value);if(!Number.isFinite(value))return;const limit=key==='x'?design.width-layer.width:key==='y'?design.height-layer.height:key==='width'?design.width-layer.x:key==='height'?design.height-layer.y:key==='opacity'?1:200;patch({[key]:Math.max(key==='fontSize'?8:key==='width'||key==='height'?1:0,Math.min(limit,value))});}}/></label>)}
      {(['rotation','cropX','cropY'] as const).map(key=><label key={key}>{{rotation:"Rotation",cropX:"Photo horizontal focus",cropY:"Photo vertical focus"}[key]}<input type="range" min={key==='rotation'?-180:0} max={key==='rotation'?180:100} value={layer[key]??(key==='rotation'?0:50)} onChange={e=>patch({[key]:Number(e.target.value)})}/></label>)}
      <label>Line spacing<input type="range" min={.8} max={3} step={.05} value={layer.lineHeight??1.15} onChange={e=>patch({lineHeight:Number(e.target.value)})}/></label>
      <label>Letter spacing<input type="range" min={-5} max={20} step={.5} value={Number(layer.letterSpacing||0)} onChange={e=>patch({letterSpacing:Number(e.target.value)})}/></label>
      {layer.type==='image'&&<button type="button" onClick={()=>patch({borderRadius:layer.borderRadius?0:Math.min(500,layer.width/2,layer.height/2)})}>Toggle rounded frame</button>}
      <label>Alignment<select value={layer.textAlign||'left'} onChange={e=>patch({textAlign:e.target.value as 'left'|'center'|'right'})}><option>left</option><option>center</option><option>right</option></select></label>
      <button onClick={()=>patch({fontWeight:layer.fontWeight===700?400:700})}>Bold</button>
      <button onClick={()=>commit({...design,layers:design.layers.map(l=>l.id===selected?{...l,locked:!l.locked}:l)})}>{layer.locked?'Unlock':'Lock'}</button>
      <button onClick={()=>commit({...design,layers:design.layers.map(l=>l.id===selected?{...l,hidden:!l.hidden}:l)})}>{layer.hidden?'Show':'Hide'}</button>
      <button disabled={design.layers.length>=40} onClick={()=>commit({...design,layers:[...design.layers,{...layer,id:crypto.randomUUID(),locked:false,groupId:undefined}]})}>Duplicate</button>
      <label>Text colour <input type="color" value={layer.color} onChange={e=>patch({color:e.target.value})}/></label>
      {layer.type==='image'&&<label className="col-span-2">Replace image<input className="block w-full" type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>4_000_000){alert('Please use an image smaller than 4 MB');return;}const reader=new FileReader();reader.onload=async()=>{try{const res=await authFetch('/api/social/designs/assets',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({data:String(reader.result)})});const result=await res.json();if(!res.ok)throw new Error(result.error);if(latest.current!==design)throw new Error('Design changed during upload. Select your photo and retry.');patch({src:result.url,assetId:result.assetId});}catch(error){setImageError(error instanceof Error?error.message:'Upload failed');}};reader.readAsDataURL(file);}}/></label>}
      <button type="button" disabled={layer.locked} onClick={()=>{const rest=design.layers.filter(l=>l.id!==selected);commit({...design,layers:[...rest,layer]});}}>Bring to front</button>
      <button type="button" disabled={layer.locked} onClick={()=>commit({...design,layers:design.layers.filter(l=>l.id!==selected)})}>Delete layer</button>
    </div>}
    <p className="text-xs text-muted-foreground">Drag the arrow handles to move or resize; positions snap to an 8 px grid and canvas centre. Click text to edit directly. Select a layer to change its position, size or image. Export uses these saved layers.</p>
  </div>;
}

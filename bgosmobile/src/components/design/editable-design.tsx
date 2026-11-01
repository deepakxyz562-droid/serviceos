import { startDesignJob, awaitDesignJob } from '../../../../shared/design-job-client';
import { GestureLayer } from './gesture-layer';
import { useFonts } from 'expo-font';
import * as ImagePicker from 'expo-image-picker';
import * as Crypto from 'expo-crypto';
import { apiRequest } from '../../lib/api';
import React, { useState, useRef } from 'react';
import { View, Text, TextInput, Image, Pressable, ScrollView, Linking, Dimensions } from 'react-native';
import type { MarketingDesign, DesignLayer } from '../../../../shared/marketing-design';
export function EditableDesign({design,onChange}:{design:MarketingDesign;onChange?:(d:MarketingDesign)=>void}) {
  const [fontLoaded]=useFonts({BgosDesign:require('../../../assets/fonts/BgosDesign-Regular.ttf')});
  const [past,setPast]=useState<MarketingDesign[]>([]);
  const [future,setFuture]=useState<MarketingDesign[]>([]);
  const [prompt,setPrompt]=useState('');
  const [provider,setProvider]=useState<'gemini'|'openrouter'>('gemini');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const jobId=useRef<string|null>(null);
  const generationRequest=useRef<{key:string;id:string}|null>(null);
  const cancellation=useRef<AbortController|null>(null);
  const commit=(next:MarketingDesign)=>{setPast(p=>[...p.slice(-49),design]);setFuture([]);onChange?.(next);};
  const [width,setWidth]=useState(320);
  const [selected,setSelected]=useState('headline');
  const layer=design.layers.find(l=>l.id===selected);
  const maxStageHeight=Math.min(340,Math.round(Dimensions.get('window').height*0.38));
  const scale=Math.min(width/design.width,maxStageHeight/design.height);
  const stageWidth=design.width*scale;
  const stageHeight=design.height*scale;
  const patch=(values:Partial<DesignLayer>)=>commit({...design,layers:design.layers.map(l=>l.id===selected?{...l,...values}:l)});
  function applyImage(asset:{url:string;assetId:string}){
    const existing=design.layers.find(l=>l.id===selected&&l.type==='image')||design.layers.find(l=>l.type==='image');
    const image:DesignLayer={id:existing?.id||Crypto.randomUUID(),type:'image',x:0,y:0,width:design.width,height:design.height,color:'#ffffff',background:'transparent',fontSize:48,opacity:1,...existing,src:asset.url,assetId:asset.assetId};
    commit({...design,layers:existing?design.layers.map(l=>l.id===existing.id?image:l):[image,...design.layers]});
  }
  async function pickImage(){
    try{
      const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],base64:true,quality:0.9});
      if(result.canceled)return;
      const image=result.assets[0];if(!image.base64||image.base64.length>10_000_000)throw new Error('Choose an image smaller than 8 MB');
      applyImage(await apiRequest('/api/social/designs/assets',{method:'POST',body:{data:`data:${image.mimeType||'image/jpeg'};base64,${image.base64}`}}));
    }catch(e){setError(e instanceof Error?e.message:'Upload failed');}
  }
  async function generateImage(){
    if(busy||!prompt.trim())return;
    const controller=new AbortController();cancellation.current=controller;setBusy(true);setError('');
    try{const key=JSON.stringify({prompt,provider});if(generationRequest.current?.key!==key)generationRequest.current={key,id:Crypto.randomUUID()};const image=await startDesignJob(apiRequest,{prompt,provider,requestId:generationRequest.current.id},controller.signal,id=>{jobId.current=id;});generationRequest.current=null;if(!controller.signal.aborted)applyImage(image);}
    catch(e){setError(controller.signal.aborted?'Cancelled. The provider may charge for work already started.':e instanceof Error?e.message:'Generation failed');}
    finally{setBusy(false);cancellation.current=null;}
  }
  if(!fontLoaded)return <Text>Loading design font…</Text>;
  return <View style={{gap:12}}>
    <View onLayout={e=>setWidth(e.nativeEvent.layout.width)} style={{width:stageWidth,height:stageHeight,alignSelf:'center',backgroundColor:design.background,overflow:'hidden',borderRadius:12}}>
      {onChange&&<><View pointerEvents="none" style={{position:'absolute',left:'50%',top:0,bottom:0,borderLeftWidth:1,borderColor:'#00b89c55'}}/><View pointerEvents="none" style={{position:'absolute',top:'50%',left:0,right:0,borderTopWidth:1,borderColor:'#00b89c55'}}/></>}
      {design.layers.map(l=><GestureLayer key={l.id} layer={l} design={design} scale={scale} selected={!!onChange&&selected===l.id} onSelect={()=>setSelected(l.id)} onCommit={onChange?next=>commit({...design,layers:design.layers.map(item=>item.id===next.id?next:item)}):undefined}/>)}
    </View>
    {onChange&&<>
      <TextInput accessibilityLabel="Image generation prompt" placeholder="Describe a background image" value={prompt} onChangeText={setPrompt} maxLength={4000} style={{padding:12,borderWidth:1,borderColor:'#cbd5e1'}}/>
      <View style={{flexDirection:'row',gap:16}}>{(['gemini','openrouter'] as const).map(p=><Pressable key={p} onPress={()=>setProvider(p)}><Text>{provider===p?'● ':''}{p}</Text></Pressable>)}</View>
      <Pressable disabled={busy} onPress={generateImage}><Text>{busy?'Generating…':'Generate image'}</Text></Pressable>
      {busy&&<Pressable onPress={()=>{cancellation.current?.abort();if(jobId.current)void apiRequest(`/api/social/designs/image?id=${encodeURIComponent(jobId.current)}`,{method:'DELETE'}).catch(()=>setError('Cancellation could not be confirmed'));}}><Text>Cancel generation</Text></Pressable>}
      <Pressable onPress={async()=>{try{const result=await apiRequest<{imageUrl:string}>('/api/social/designs/render',{method:'POST',body:{design},timeoutMs:90000});await Linking.openURL(result.imageUrl);}catch(e){setError(e instanceof Error?e.message:'Export failed');}}}><Text>Render preview / open PNG</Text></Pressable>
      <Pressable disabled={busy} onPress={async()=>{setBusy(true);const controller=new AbortController();cancellation.current=controller;try{const latest=await apiRequest<{jobId:string}>('/api/social/designs/image');jobId.current=latest.jobId;applyImage(await awaitDesignJob(apiRequest,latest.jobId,controller.signal));}catch(e){setError(e instanceof Error?e.message:'Resume failed');}finally{setBusy(false);}}}><Text>Resume latest generation</Text></Pressable>
      <Pressable onPress={pickImage}><Text>Upload / replace image</Text></Pressable>
      {!!error&&<Text accessibilityRole="alert">{error}</Text>}
      <View style={{flexDirection:'row',gap:16}}>
        <Pressable disabled={!past.length} onPress={()=>{setFuture(f=>[design,...f]);onChange(past[past.length-1]);setPast(p=>p.slice(0,-1));}}><Text>Undo</Text></Pressable>
        <Pressable disabled={!future.length} onPress={()=>{setPast(p=>[...p,design]);onChange(future[0]);setFuture(f=>f.slice(1));}}><Text>Redo</Text></Pressable>
        {(['text','shape'] as const).map(type=><Pressable key={type} onPress={()=>{const id=Crypto.randomUUID();commit({...design,layers:[...design.layers,{id,type,x:20,y:20,width:Math.min(500,design.width-20),height:150,text:type==='text'?'Your text':undefined,color:'#ffffff',background:type==='shape'?'#009f50':'transparent',fontSize:48,opacity:1}]});setSelected(id);}}><Text>Add {type}</Text></Pressable>)}
      </View>
      <ScrollView horizontal contentContainerStyle={{gap:8}}>{design.layers.map(l=><Pressable key={l.id} onPress={()=>setSelected(l.id)} style={{padding:10,backgroundColor:l.id===selected?'#ccfbf1':'#f1f5f9',borderRadius:8}}><Text>{l.id}</Text></Pressable>)}</ScrollView>
      {layer?.type==='text'&&<TextInput accessibilityLabel="Layer text" multiline value={layer.text} maxLength={1000} onChangeText={text=>patch({text})} style={{borderWidth:1,borderColor:'#cbd5e1',padding:12,borderRadius:8}}/>}
      {layer?.type==='image'&&<TextInput accessibilityLabel="Image URL" value={layer.src?.startsWith('data:')?'':layer.src} placeholder="HTTPS image URL" autoCapitalize="none" onChangeText={src=>patch({src})} style={{borderWidth:1,borderColor:'#cbd5e1',padding:12,borderRadius:8}}/>}
      {layer&&<View style={{gap:8}}>
        <View style={{flexDirection:'row',gap:14}}>
          <Pressable onPress={()=>commit({...design,layers:design.layers.filter(l=>l.id!==selected)})}><Text>Delete layer</Text></Pressable>
          <Pressable onPress={()=>commit({...design,layers:[...design.layers.filter(l=>l.id!==selected),layer]})}><Text>Bring to front</Text></Pressable>
        </View>
        {layer.type==='image'&&(['cropX','cropY'] as const).map(key=><View key={key}><Text>{key} (0–100)</Text><TextInput keyboardType="numeric" value={String(layer[key]??50)} onChangeText={text=>{const value=Number(text);if(Number.isFinite(value))patch({[key]:Math.max(0,Math.min(100,value))});}}/></View>)}
        <Text>Rotation (−180 to 180)</Text>
        <TextInput keyboardType="numeric" value={String(layer.rotation||0)} onChangeText={text=>{const value=Number(text);if(Number.isFinite(value))patch({rotation:Math.max(-180,Math.min(180,value))});}}/>
        <Text>Text colour (#RRGGBB)</Text>
        <TextInput defaultValue={layer.color} key={layer.id+'color'} onEndEditing={e=>{if(/^#[0-9a-f]{6}$/i.test(e.nativeEvent.text))patch({color:e.nativeEvent.text});else setError('Use a six-digit hex colour');}}/>
      </View>}
      {layer&&<View style={{flexDirection:'row',flexWrap:'wrap',gap:12}}>{(['x','y','width','height','fontSize','opacity'] as const).map(key=><View key={key} style={{width:'28%'}}><Text>{key}</Text><TextInput accessibilityLabel={key} keyboardType="numeric" value={String(layer[key])} onChangeText={text=>{const n=Number(text);if(!Number.isFinite(n))return;const max=key==='x'?design.width-layer.width:key==='y'?design.height-layer.height:key==='width'?design.width-layer.x:key==='height'?design.height-layer.y:key==='opacity'?1:200;patch({[key]:Math.max(key==='fontSize'?8:key==='width'||key==='height'?1:0,Math.min(max,n))});}} style={{padding:10,borderWidth:1,borderColor:'#cbd5e1',borderRadius:8}}/></View>)}</View>}
    </>}
  </View>;
}

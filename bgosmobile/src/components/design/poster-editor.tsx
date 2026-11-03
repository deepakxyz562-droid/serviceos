import React, {useEffect,useRef,useState} from 'react';
import {View,Text,Pressable,TextInput,ScrollView,PanResponder,Linking} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {apiRequest} from '../../lib/api';
import * as Crypto from 'expo-crypto';
import {PosterPreview} from './poster-preview';
import {gestureLayer} from '../../../../shared/design-gestures';
import {patchDesignLayer,resizeDesign,groupLayers,ungroupLayers,collageImages} from '../../../../shared/design-editor';
import type {MarketingDesign,DesignLayer} from '../../../../shared/marketing-design';
export function PosterEditor({doc,onChange}:{doc:MarketingDesign;onChange:(doc:MarketingDesign)=>void}){
 const [selected,setSelected]=useState('headline'),[width,setWidth]=useState(1),[panel,setPanel]=useState(false);
 const [dimensions,setDimensions]=useState({width:String(doc.width),height:String(doc.height)});
 const [multiple,setMultiple]=useState<string[]>([]);
 const [error,setError]=useState('');
 const [exporting,setExporting]=useState(false);
 async function exportImage(format:'png'|'jpeg'){setExporting(true);setError('');try{const result=await apiRequest<{imageUrl:string}>('/api/social/designs/render',{method:'POST',body:{design:doc,format}});await Linking.openURL(result.imageUrl);}catch(e){setError(e instanceof Error?e.message:'Export failed. Please retry.');}finally{setExporting(false);}}
 const [preview,setPreview]=useState<MarketingDesign|null>(null);
 useEffect(()=>{setPreview(null);setDimensions({width:String(doc.width),height:String(doc.height)});},[doc]);
 const visibleDoc=preview||doc;
 const current=useRef({doc,onChange,width,selected});current.current={doc,onChange,width,selected};
 const pendingGesture=useRef<Partial<DesignLayer>|null>(null);
 const drag=useRef<{layer:DesignLayer;doc:MarketingDesign;distance:number;angle:number}|null>(null);
 const layer=visibleDoc.layers.find(l=>l.id===selected);
 function patch(values:Partial<DesignLayer>){try{onChange(patchDesignLayer(doc,selected,values));setError('');}catch{setError('This change does not fit the canvas.');}}
 const responder=useRef(PanResponder.create({
 onStartShouldSetPanResponder:()=>true,
 onPanResponderGrant:e=>{pendingGesture.current=null;drag.current=null;const c=current.current,l=c.doc.layers.find(l=>l.id===c.selected);if(!l||l.locked)return;const [a,b]=e.nativeEvent.touches;drag.current={layer:l,doc:c.doc,distance:b?Math.hypot(b.pageX-a.pageX,b.pageY-a.pageY):0,angle:b?Math.atan2(b.pageY-a.pageY,b.pageX-a.pageX):0};},
 onPanResponderMove:(e,g)=>{const start=drag.current;if(!start)return;const c=current.current,scale=c.doc.width/c.width;const touches=e.nativeEvent.touches;let patch:Partial<DesignLayer>=gestureLayer(start.layer,start.doc,g.dx*scale,g.dy*scale,'move');
 if(touches.length>=2&&!start.distance){const [a,b]=touches;start.distance=Math.hypot(b.pageX-a.pageX,b.pageY-a.pageY);start.angle=Math.atan2(b.pageY-a.pageY,b.pageX-a.pageX);}
 if(touches.length>=2&&start.distance){const [a,b]=touches;const factor=Math.hypot(b.pageX-a.pageX,b.pageY-a.pageY)/start.distance;patch={width:start.layer.width*factor,height:start.layer.height*factor,rotation:Math.max(-180,Math.min(180,(start.layer.rotation||0)+(Math.atan2(b.pageY-a.pageY,b.pageX-a.pageX)-start.angle)*180/Math.PI))};}
 pendingGesture.current=patch;setPreview(patchDesignLayer(start.doc,start.layer.id,patch));},
 onPanResponderRelease:()=>{setPreview(null);const start=drag.current;drag.current=null;if(start&&pendingGesture.current)current.current.onChange(patchDesignLayer(start.doc,start.layer.id,pendingGesture.current));pendingGesture.current=null;},
 onPanResponderTerminate:()=>{setPreview(null);drag.current=null;pendingGesture.current=null;},
 })).current;
 async function replacePhoto(add=false){
  const targetId=selected,originalDoc=doc;
  try{
   const picked=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],base64:true,quality:.85});
   if(picked.canceled||!picked.assets[0]?.base64)return;
   const asset=picked.assets[0];
   if((asset.fileSize||0)>4_000_000){setError('Choose an image smaller than 4 MB.');return;}
   const result=await apiRequest<{url:string;assetId:string}>('/api/social/designs/assets',{method:'POST',body:{data:`data:${asset.mimeType||'image/jpeg'};base64,${asset.base64}`}});
   const latest=current.current;
   if(latest.doc!==originalDoc){setError('Design changed during upload. Select the photo and retry.');return;}
   if(add){if(latest.doc.layers.length>=40)throw new Error('The canvas supports 40 layers.');const id=Crypto.randomUUID();latest.onChange({...latest.doc,layers:[...latest.doc.layers,{id,type:'image',x:40,y:40,width:latest.doc.width-80,height:latest.doc.height*.45,src:result.url,assetId:result.assetId,color:'#ffffff',background:'transparent',fontSize:16,opacity:1}]});setSelected(id);setPanel(true);}
   else latest.onChange(patchDesignLayer(latest.doc,targetId,{src:result.url,assetId:result.assetId}));
  }catch(e){setError(e instanceof Error?e.message:'Photo upload failed');}
 }
 const button=(label:string,action:()=>void,disabled=false)=><Pressable key={label} accessibilityRole="button" disabled={disabled} onPress={action} style={{padding:10,borderWidth:1,borderColor:'#dbe4e1',borderRadius:8,opacity:disabled ? .4 : 1}}><Text>{label}</Text></Pressable>;
 return <View style={{gap:10}}>
 <View onLayout={e=>setWidth(e.nativeEvent.layout.width)}><PosterPreview doc={visibleDoc}/>{visibleDoc.layers.filter(l=>!l.hidden&&l.id!==selected).map(l=><Pressable key={l.id} accessibilityRole="button" accessibilityLabel={`Select ${l.id}`} onPress={()=>setSelected(l.id)} style={{position:'absolute',left:l.x/doc.width*width,top:l.y/doc.width*width,width:l.width/doc.width*width,height:l.height/doc.width*width,transform:[{rotate:`${l.rotation||0}deg`}]}}/>)}{layer&&!layer.hidden&&<View {...responder.panHandlers} accessibilityLabel={`Move ${layer.id}`} style={{position:'absolute',left:layer.x/doc.width*width,top:layer.y/doc.width*width,width:layer.width/doc.width*width,height:layer.height/doc.width*width,zIndex:10,borderWidth:2,borderColor:'#00856f',backgroundColor:'transparent',transform:[{rotate:`${layer.rotation||0}deg`}]}}/>}</View>
 <ScrollView horizontal contentContainerStyle={{gap:8}}>{button('Layers & text',()=>setPanel(!panel))}{button('Add photo',()=>void replacePhoto(true),doc.layers.length>=40)}{button('Add text',()=>{const id=Crypto.randomUUID();onChange({...doc,layers:[...doc.layers,{id,type:'text',x:40,y:40,width:doc.width-80,height:120,text:'Your text',color:'#142b25',background:'transparent',fontSize:48,opacity:1}]});setSelected(id);setPanel(true);},doc.layers.length>=40)}{button('Add shape',()=>{const id=Crypto.randomUUID();onChange({...doc,layers:[...doc.layers,{id,type:'shape',x:40,y:40,width:200,height:160,color:'#00856f',background:'#00856f',fontSize:16,opacity:1}]});setSelected(id);setPanel(true);},doc.layers.length>=40)}</ScrollView>
 {panel&&<View style={{gap:10,padding:12,backgroundColor:'#ffffff',borderRadius:12}}>
 <ScrollView horizontal contentContainerStyle={{gap:6}}>{doc.layers.map(l=>button(`${l.locked?'🔒 ':''}${l.hidden?'Hidden: ':''}${l.id}`,()=>setSelected(l.id)))}</ScrollView>
 <Text>Select layers to link movement or arrange photos</Text>
 <ScrollView horizontal contentContainerStyle={{gap:6}}>{doc.layers.map(l=>button(`${multiple.includes(l.id)?'✓ ':''}${l.id}`,()=>setMultiple(ids=>ids.includes(l.id)?ids.filter(id=>id!==l.id):[...ids,l.id]),l.locked))}</ScrollView>
 <ScrollView horizontal contentContainerStyle={{gap:6}}>
 {button('Group movement',()=>{try{onChange(groupLayers(doc,multiple,Crypto.randomUUID()));setMultiple([]);setError('');}catch(e){setError((e as Error).message);}},multiple.length<2)}
 {button('Ungroup',()=>onChange(ungroupLayers(doc,selected)),!layer?.groupId)}
 {(['columns','grid','feature'] as const).map(layout=>button(`Photo ${layout}`,()=>{try{onChange(collageImages(doc,multiple,layout));setError('');}catch(e){setError((e as Error).message);}}))}
 </ScrollView>
 {layer&&<>
 {layer.type==='text'&&<TextInput accessibilityLabel="Selected text" multiline value={layer.text} onChangeText={text=>patch({text:text.slice(0,1000)})} editable={!layer.locked} style={{borderWidth:1,borderColor:'#cbd5e1',padding:12}}/>}
 <View style={{flexDirection:'row',flexWrap:'wrap',gap:6}}>
 {layer.type==='image'&&<>
 {button('Replace photo',()=>void replacePhoto(),layer.locked)}
 {button('Photo left',()=>patch({cropX:Math.max(0,(layer.cropX??50)-10)}),layer.locked)}
 {button('Photo right',()=>patch({cropX:Math.min(100,(layer.cropX??50)+10)}),layer.locked)}
 {button('Photo up',()=>patch({cropY:Math.max(0,(layer.cropY??50)-10)}),layer.locked)}
 {button('Photo down',()=>patch({cropY:Math.min(100,(layer.cropY??50)+10)}),layer.locked)}
 {button('Rounded frame',()=>patch({borderRadius:layer.borderRadius?0:Math.min(500,layer.width/2,layer.height/2)}),layer.locked)}
 </>}
 {['#142b25','#ffffff','#00856f','#b53856','#3159bd','#9a6324'].map(color=>button(color,()=>patch(layer.type==='shape'?{background:color}:{color}),layer.locked))}
 {button('Smaller',()=>patch({fontSize:Math.max(8,layer.fontSize-4)}),layer.locked)}{button('Larger',()=>patch({fontSize:Math.min(200,layer.fontSize+4)}),layer.locked)}
 {button('Tighter lines',()=>patch({lineHeight:Math.max(.8,(layer.lineHeight??1.15)-.1)}),layer.locked)}{button('Looser lines',()=>patch({lineHeight:Math.min(3,(layer.lineHeight??1.15)+.1)}),layer.locked)}
 {button('Tighter letters',()=>patch({letterSpacing:Math.max(-5,Number(layer.letterSpacing||0)-.5)}),layer.locked)}{button('Looser letters',()=>patch({letterSpacing:Math.min(20,Number(layer.letterSpacing||0)+.5)}),layer.locked)}
 {button('Bold',()=>patch({fontWeight:layer.fontWeight===700?400:700}),layer.locked)}
 {(['left','center','right'] as const).map(textAlign=>button(textAlign,()=>patch({textAlign}),layer.locked))}
 {button('Rotate −',()=>patch({rotation:Math.max(-180,(layer.rotation||0)-15)}),layer.locked)}{button('Rotate +',()=>patch({rotation:Math.min(180,(layer.rotation||0)+15)}),layer.locked)}
 {button('Shrink',()=>patch({width:layer.width*.9,height:layer.height*.9}),layer.locked)}{button('Enlarge',()=>patch({width:layer.width*1.1,height:layer.height*1.1}),layer.locked)}
 {button(layer.locked?'Unlock':'Lock',()=>onChange({...doc,layers:doc.layers.map(l=>l.id===selected?{...l,locked:!l.locked}:l)}))}
 {button(layer.hidden?'Show':'Hide',()=>onChange({...doc,layers:doc.layers.map(l=>l.id===selected?{...l,hidden:!l.hidden}:l)}))}
 {button('Duplicate',()=>onChange({...doc,layers:[...doc.layers,{...layer,id:Crypto.randomUUID(),locked:false,groupId:undefined}]}),doc.layers.length>=40)}
 {button('Bring forward',()=>onChange({...doc,layers:[...doc.layers.filter(l=>l.id!==selected),layer]}),layer.locked)}
 {button('Send back',()=>onChange({...doc,layers:[layer,...doc.layers.filter(l=>l.id!==selected)]}),layer.locked)}
 {button('Delete',()=>onChange({...doc,layers:doc.layers.filter(l=>l.id!==selected)}),layer.locked)}
 </View></>}
 <Text>Canvas size (320–2160 pixels)</Text><View style={{flexDirection:'row',gap:10}}>{(['width','height'] as const).map(key=><TextInput key={key} accessibilityLabel={`Canvas ${key}`} keyboardType="number-pad" value={dimensions[key]} onChangeText={text=>setDimensions(p=>({...p,[key]:text}))} style={{borderWidth:1,padding:8,flex:1}}/>)}</View>
 {button('Resize canvas',()=>{try{onChange(resizeDesign(doc,Number(dimensions.width),Number(dimensions.height)));setError('');}catch{setError('Enter whole dimensions between 320 and 2160 pixels.');}})}
 </View>}
 <View style={{flexDirection:'row',gap:8}}>{button(exporting?'Exporting…':'Export PNG',()=>void exportImage('png'),exporting)}{button('Export JPEG',()=>void exportImage('jpeg'),exporting)}</View>
 {!!error&&<Text accessibilityRole="alert">{error}</Text>}
 </View>;
}

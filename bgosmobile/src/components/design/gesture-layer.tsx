import React,{useRef,useState} from 'react';
import {View,Text,Image,PanResponder} from 'react-native';
import {gestureLayer,coverImage} from '../../../../shared/design-gestures';
import type {DesignLayer,MarketingDesign} from '../../../../shared/marketing-design';
export function GestureLayer({layer,design,scale,selected,onSelect,onCommit}:{layer:DesignLayer;design:MarketingDesign;scale:number;selected:boolean;onSelect:()=>void;onCommit?:(layer:DesignLayer)=>void}){
 const latest=useRef({layer,design,scale,onCommit});latest.current={layer,design,scale,onCommit};
 const start=useRef(layer);const [preview,setPreview]=useState<DesignLayer|null>(null);
 const [imageSize,setImageSize]=useState({width:1,height:1});
 const responder=(mode:'move'|'resize')=>PanResponder.create({
  onStartShouldSetPanResponder:()=>!!latest.current.onCommit,
  onMoveShouldSetPanResponder:()=>!!latest.current.onCommit,
  onPanResponderGrant:()=>{start.current=latest.current.layer;onSelect();},
  onPanResponderMove:(_,g)=>{const c=latest.current;setPreview(gestureLayer(start.current,c.design,g.dx/c.scale,g.dy/c.scale,mode));},
  onPanResponderRelease:(_,g)=>{const c=latest.current;c.onCommit?.(gestureLayer(start.current,c.design,g.dx/c.scale,g.dy/c.scale,mode));setPreview(null);},
  onPanResponderTerminate:()=>setPreview(null),onPanResponderTerminationRequest:()=>false,
 });
 const move=useRef(responder('move')).current,resize=useRef(responder('resize')).current;
 const l=preview||layer;
 const crop=coverImage({width:l.width*scale,height:l.height*scale},imageSize,l.cropX??50,l.cropY??50);
 return <View {...move.panHandlers} onTouchStart={onSelect} accessibilityLabel={`Move ${l.id}`} style={{position:'absolute',left:l.x*scale,top:l.y*scale,width:l.width*scale,height:l.height*scale,opacity:l.opacity,transform:[{rotate:`${l.rotation||0}deg`}],backgroundColor:l.background,borderWidth:selected?1:0,borderColor:'#00b89c'}}>
  <View style={{width:'100%',height:'100%',overflow:'hidden'}}>
   {l.type==='image'?<Image source={{uri:l.src}} onLoad={e=>{const {width,height}=e.nativeEvent.source;if(width&&height)setImageSize({width,height});}} style={{position:'absolute',...crop}} resizeMode="stretch"/>:l.type==='text'?<Text style={{fontSize:l.fontSize*scale,lineHeight:l.fontSize*scale*1.15,color:l.color,fontFamily:'BgosDesign'}}>{l.text}</Text>:null}
  </View>
  {selected&&onCommit&&<View {...resize.panHandlers} accessibilityLabel="Resize layer" style={{position:'absolute',right:-10,bottom:-10,width:30,height:30,backgroundColor:'#00b89c',borderRadius:15,alignItems:'center',justifyContent:'center'}}><Text>↘</Text></View>}
 </View>;
}

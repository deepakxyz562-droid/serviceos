import React, { useState } from 'react';
import { Image, PixelRatio, Text, View } from 'react-native';
import { useFonts } from 'expo-font';
import {PROFESSIONAL_ASSETS} from './professional-assets';
import {WEB_URL} from '../../lib/constants';
import {coverImage} from '../../../../shared/design-gestures';
import type { MarketingDesign } from '../../../../shared/marketing-design';
/** One responsive renderer for native gallery and selected-poster previews. */
export function PosterPreview({doc}:{doc:MarketingDesign}){
 const [width,setWidth]=useState(0),[failed,setFailed]=useState<Record<string,boolean>>({});
 const [fonts]=useFonts({BgosDesign:require('../../../assets/fonts/BgosDesign-Regular.ttf'),BgosDesignBold:require('../../../assets/fonts/BgosDesign-Bold.ttf'),BgosEditorial:require('../../../assets/fonts/BgosEditorial.ttf'),BgosDisplay:require('../../../assets/fonts/BgosDisplay.ttf')});
 const [imageSizes,setImageSizes]=useState<Record<string,{width:number;height:number}>>({});
 const scale=width/doc.width;
 return <View onLayout={e=>setWidth(e.nativeEvent.layout.width)} style={{width:'100%',aspectRatio:doc.width/doc.height,backgroundColor:doc.background,overflow:'hidden'}}>
 {width>0&&doc.layers.filter(l=>!l.hidden).map(l=>{
 const style={position:'absolute' as const,left:l.x*scale,top:l.y*scale,width:l.width*scale,height:l.height*scale,backgroundColor:l.background,opacity:l.opacity,borderRadius:(l.borderRadius||0)*scale,borderWidth:(l.borderWidth||0)*scale,borderColor:l.borderColor,overflow:'hidden' as const,transform:[{rotate:`${l.rotation||0}deg`}]};
 if(l.type==='image'){const size=imageSizes[l.src||''];const covered=coverImage(l,size||{width:l.width,height:l.height},l.cropX??50,l.cropY??50);const imageWidth=covered.width*scale,imageHeight=covered.height*scale;return <View key={l.id} style={style}>{failed[l.src||'']?<Text style={{fontSize:Math.max(8,20*scale),color:'#334155',padding:8}}>Image unavailable · replace photo</Text>:<Image source={PROFESSIONAL_ASSETS[l.src||'']||{uri:l.src?.startsWith('/images/bgos/templates/')?`${WEB_URL.replace(/\/$/,'')}${l.src}`:l.src?.startsWith('https://images.unsplash.com/')?l.src.replace(/w=\d+/,`w=${Math.min(2160,Math.max(360,Math.round(width*PixelRatio.get())))}`):l.src}} onError={()=>setFailed(p=>({...p,[l.src||'']:true}))} onLoad={e=>{const source=e.nativeEvent.source;if(source.width&&source.height)setImageSizes(p=>({...p,[l.src||'']:{width:source.width,height:source.height}}));}} style={{position:'absolute',width:imageWidth,height:imageHeight,left:covered.left*scale,top:covered.top*scale}} resizeMode="cover"/>}</View>;}
 return <View key={l.id} style={style}>{l.type==='text'&&fonts&&<Text style={{color:l.color,fontFamily:l.fontFamily==='editorial'?'BgosEditorial':l.fontFamily==='display'?'BgosDisplay':Number(l.fontWeight||400)>=600?'BgosDesignBold':'BgosDesign',fontSize:l.fontSize*scale,lineHeight:l.fontSize*scale*(l.lineHeight??1.15),textAlign:l.textAlign||'left',includeFontPadding:false,letterSpacing:Number(l.letterSpacing||0)*scale}}>{l.text}</Text>}</View>;
 })}
 </View>;
}

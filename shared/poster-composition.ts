import { validateDesign, type MarketingDesign, type DesignLayer } from './marketing-design';

export interface StudioPosterInput {
  brand: string; headline: string; subtitle?: string; badge?: string; cta?: string;
  photo?: string; logoUrl?: string; phone?: string; website?: string; ratio?: string;
  theme?: string; layout?: string;
}
type Rect = [number, number, number, number];
// Fifteen art directions. Coordinates are normalized to the safe content area.
const FRAMES: { image: Rect; copy: Rect; name: string }[] = [
 {name:'Editorial column',image:[.53,.14,.41,.70],copy:[.06,.20,.41,.54]},
 {name:'Gallery cover',image:[.06,.14,.88,.40],copy:[.06,.59,.88,.29]},
 {name:'Cinematic panel',image:[0,.12,1,.76],copy:[.09,.38,.62,.46]},
 {name:'Product window',image:[.55,.22,.39,.52],copy:[.06,.16,.43,.64]},
 {name:'Offset portrait',image:[.06,.27,.42,.55],copy:[.54,.17,.40,.65]},
 {name:'Museum label',image:[.06,.14,.88,.52],copy:[.06,.70,.88,.18]},
 {name:'Type first',image:[.06,.51,.88,.37],copy:[.06,.15,.88,.31]},
 {name:'Floating note',image:[.06,.14,.88,.74],copy:[.12,.41,.68,.41]},
 {name:'Diptych',image:[.06,.14,.41,.74],copy:[.54,.22,.40,.55]},
 {name:'Service sheet',image:[.68,.14,.26,.74],copy:[.06,.17,.55,.64]},
 {name:'Invitation',image:[.22,.14,.56,.37],copy:[.14,.56,.72,.32]},
 {name:'Side caption',image:[.06,.14,.60,.74],copy:[.71,.20,.23,.62]},
 {name:'Colour block',image:[.38,.14,.56,.43],copy:[.06,.62,.88,.26]},
 {name:'Picture rail',image:[.06,.62,.88,.26],copy:[.06,.17,.88,.39]},
 {name:'Feature card',image:[.06,.14,.88,.30],copy:[.13,.50,.74,.38]},
];
export const STUDIO_DIRECTIONS = FRAMES.map(f=>f.name);
const PALETTES: Record<string,[string,string,string]> = {
 emerald:['#eff7f3','#102f29','#087f68'],royal_gold:['#fbf5e7','#292218','#9a6324'],
 rose_chic:['#fff0ec','#412a33','#b53856'],cyber_tech:['#eef3ff','#172b4d','#3159bd'],
 trust_amber:['#fff4e6','#35281e','#9b4c19'],sand:['#f3eee5','#353028','#766044'],
 luxe_dark:['#141d21','#f6f0e7','#e6bf80'],dark:['#162b29','#f6f4e9','#a8d8c1'],
};
function fittedSize(text:string,w:number,h:number,target:number){
 // Conservative word wrapping estimate shared across all renderers.
 let size=target;
 for(;size>14;size-=1){
  const capacity=Math.max(1,Math.floor(w/(size*.62)));
  let lines=0;
  for(const paragraph of text.split('\n')){let used=0;lines++;for(const word of paragraph.split(/\s+/)){if(word.length>capacity){lines+=Math.ceil(word.length/capacity)-1;used=word.length%capacity;}else if(used&&used+word.length+1>capacity){lines++;used=word.length;}else used+=word.length+(used?1:0);}}
  if(lines*size*1.2<=h)return size;
 }
 return size;
}
export function composeStudioPoster(input:StudioPosterInput):MarketingDesign{
 const sizes:Record<string,[number,number]>={'1:1':[1080,1080],'4:5':[1080,1350],'9:16':[1080,1920],'16:9':[1920,1080]};
 const [width,height]=sizes[input.ratio||'4:5']||sizes['4:5'];
 const index=Math.max(0,Number(input.layout?.replace('studio_',''))||0)%60;
 const frame=FRAMES[index%15],variant=Math.floor(index/15);
 const [paper,ink,accent]=PALETTES[input.theme||'emerald']||PALETTES.emerald;
 const layers:DesignLayer[]=[];
 function shape(id:string,r:Rect,color:string,radius=0){layers.push({id,type:'shape',x:r[0]*width,y:r[1]*height,width:r[2]*width,height:r[3]*height,color:'transparent',background:color,fontSize:16,opacity:1,borderRadius:radius});}
 function text(id:string,value:string,r:Rect,size:number,color=ink,weight=400,center=false){if(!value)return;layers.push({id,type:'text',x:r[0]*width,y:r[1]*height,width:r[2]*width,height:r[3]*height,text:value,color,background:'transparent',fontSize:fittedSize(value,r[2]*width,r[3]*height,Math.min(size*width/1080,150)),opacity:1,fontWeight:weight,textAlign:center?'center':'left'});}
 let image:Rect=[...frame.image],copy:Rect=[...frame.copy];
 // Each edition changes placement and framing, not only the palette.
 if(variant===1){image=[1-image[0]-image[2],image[1]+.01,image[2],image[3]-.02];copy=[1-copy[0]-copy[2],copy[1]-.01,copy[2],copy[3]+.02];}
 if(variant===2){image=[image[0]+.015,image[1]+.025,image[2]-.03,image[3]-.05];copy=[copy[0],copy[1]+.015,copy[2],copy[3]-.03];shape('image_mat',frame.image,accent,18);}
 if(variant===3){image=[image[0],image[1]+.035,image[2],image[3]-.07];copy=[copy[0]+.015,copy[1],copy[2]-.03,copy[3]];shape('side_rule',[.025,.14,.008,.74],accent);}
 if(input.photo)layers.push({id:'bg_photo',type:'image',x:image[0]*width,y:image[1]*height,width:image[2]*width,height:image[3]*height,src:input.photo,color:ink,background:paper,fontSize:16,opacity:1,borderRadius:index%15===10?Math.min(width*image[2]/2,300):variant===2?18:0,cropX:50,cropY:50});
 if([2,7].includes(index%15))shape('copy_panel',[copy[0]-.025,copy[1]-.02,copy[2]+.05,copy[3]+.04],paper,variant===2?18:0);
 shape('brand_rule',[.06,.105,.88,.002],accent);
 if(input.logoUrl)layers.push({id:'logo',type:'image',x:width*.06,y:height*.035,width:width*.055,height:height*.048,src:input.logoUrl,color:ink,background:'transparent',fontSize:16,opacity:1});
 text('brand',input.brand,[input.logoUrl? .135:.06,.035,input.logoUrl? .805:.88,.05],28,ink,700);
 const [x,y,w,h]=copy;
 text('badge',input.badge||'',[x,y,w,h*.12],19,accent,700,variant===2);
 text('headline',input.headline,[x,y+h*.16,w,h*.43],index%15===11?44:76,ink,700,variant===2);
 text('subtitle',input.subtitle||'',[x,y+h*.63,w,h*.19],27,ink,400,variant===2);
 shape('cta_rule',[x,y+h*.88,Math.min(w,.14),.003],accent);
 text('cta',input.cta||'Learn more',[x,y+h*.92,w,h*.08],22,accent,700,variant===2);
 text('footer',[input.website?.replace(/^https?:\/\//,''),input.phone].filter(Boolean).join('  •  '),[.06,.925,.88,.04],21,ink);
 return validateDesign({version:1,width,height,background:paper,layers});
}

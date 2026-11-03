import { validateDesign, type MarketingDesign, type DesignLayer } from './marketing-design';
export type DesignHistory={past:MarketingDesign[];present:MarketingDesign;future:MarketingDesign[]};
export function commitDesign(history:DesignHistory,next:MarketingDesign):DesignHistory{
 const valid=validateDesign(next);
 if(JSON.stringify(valid)===JSON.stringify(history.present))return history;
 return {past:[...history.past.slice(-49),history.present],present:valid,future:[]};
}
export function travelDesign(history:DesignHistory,direction:'undo'|'redo'):DesignHistory{
 if(direction==='undo'){const previous=history.past.at(-1);return previous?{past:history.past.slice(0,-1),present:previous,future:[history.present,...history.future]}:history;}
 const next=history.future[0];return next?{past:[...history.past,history.present],present:next,future:history.future.slice(1)}:history;
}
export function patchDesignLayer(doc:MarketingDesign,id:string,patch:Partial<DesignLayer>):MarketingDesign{
 const target=doc.layers.find(l=>l.id===id);
 const members=target?.groupId?doc.layers.filter(l=>l.groupId===target.groupId):[];
 if(target&&members.length>1&&(patch.x!==undefined||patch.y!==undefined)){
  if(members.some(l=>l.locked))return doc;
  const left=Math.min(...members.map(l=>l.x)),top=Math.min(...members.map(l=>l.y));
  const right=Math.max(...members.map(l=>l.x+l.width)),bottom=Math.max(...members.map(l=>l.y+l.height));
  const dx=Math.max(-left,Math.min(doc.width-right,(patch.x??target.x)-target.x));
  const dy=Math.max(-top,Math.min(doc.height-bottom,(patch.y??target.y)-target.y));
  return validateDesign({...doc,layers:doc.layers.map(l=>l.groupId===target.groupId?{...l,x:l.x+dx,y:l.y+dy}:l)});
 }
 return validateDesign({...doc,layers:doc.layers.map(layer=>{
 if(layer.id!==id||layer.locked)return layer;
 const next={...layer,...patch};
 next.width=Math.max(24,Math.min(doc.width,next.width));next.height=Math.max(24,Math.min(doc.height,next.height));
 next.x=Math.max(0,Math.min(doc.width-next.width,next.x));next.y=Math.max(0,Math.min(doc.height-next.height,next.y));
 return next;
 })});
}
export function resizeDesign(doc:MarketingDesign,width:number,height:number):MarketingDesign{
 const sx=width/doc.width,sy=height/doc.height;
 return validateDesign({...doc,width,height,layers:doc.layers.map(l=>({...l,x:l.x*sx,y:l.y*sy,width:l.width*sx,height:l.height*sy,fontSize:Math.max(8,Math.min(200,l.fontSize*Math.min(sx,sy)))}))});
}
export function backgroundBrief(input:{template?:{name:string;bgPrompt:string;occasionId?:string};headline:string;instruction:string;ratio:string}){
 return `Create a replacement background image only. Preserve this campaign subject and occasion.\nTemplate: ${input.template?.name||'Custom'}\nOccasion: ${input.template?.occasionId||'None specified'}\nHeadline context (do not draw text): ${input.headline}\nArt direction: ${input.template?.bgPrompt||'Relevant, carefully composed commercial visual'}\nUser refinement: ${input.instruction||'Create a fresh variation of the selected theme'}\nCanvas ratio: ${input.ratio}. Keep clear space for separately editable text. NO TEXT, NO LOGOS, NO WATERMARKS.`;
}

/** Groups link object movement; typography and crop remain individually editable. */
export function groupLayers(doc:MarketingDesign,ids:string[],groupId:string):MarketingDesign{
 const chosen=doc.layers.filter(l=>ids.includes(l.id));
 if(chosen.length<2||chosen.some(l=>l.locked))throw new Error('Choose at least two unlocked layers.');
 return validateDesign({...doc,layers:doc.layers.map(l=>ids.includes(l.id)?{...l,groupId}:l)});
}
export function ungroupLayers(doc:MarketingDesign,id:string):MarketingDesign{
 const group=doc.layers.find(l=>l.id===id)?.groupId;
 return validateDesign({...doc,layers:doc.layers.map(l=>group&&l.groupId===group?{...l,groupId:undefined}:l)});
}
export function collageImages(doc:MarketingDesign,ids:string[],layout:'columns'|'grid'|'feature'):MarketingDesign{
 const photos=doc.layers.filter(l=>ids.includes(l.id)&&l.type==='image');
 if(photos.length<2||photos.length>4||photos.some(l=>l.locked))throw new Error('Choose two to four unlocked photos.');
 const gap=doc.width*.025,x=gap,y=doc.height*.28,w=doc.width-2*gap,h=doc.height*.6;
 const frames=photos.map((_,index)=>{
  if(layout==='columns')return {x:x+index*(w+gap)/photos.length,y,width:(w-gap*(photos.length-1))/photos.length,height:h};
  if(layout==='feature'&&index===0)return {x,y,width:(w-gap)*.6,height:h};
  if(layout==='feature')return {x:x+(w-gap)*.6+gap,y:y+(index-1)*(h+gap)/(photos.length-1),width:(w-gap)*.4,height:(h-gap*(photos.length-2))/(photos.length-1)};
  const rows=Math.ceil(photos.length/2);return {x:x+(index%2)*(w+gap)/2,y:y+Math.floor(index/2)*(h+gap)/rows,width:(w-gap)/2,height:(h-gap*(rows-1))/rows};
 });
 return validateDesign({...doc,layers:doc.layers.map(l=>{const index=photos.findIndex(p=>p.id===l.id);return index<0?l:{...l,...frames[index],rotation:0,cropX:50,cropY:50,groupId:undefined};})});
}

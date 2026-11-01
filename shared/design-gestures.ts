import type { DesignLayer, MarketingDesign } from './marketing-design';
export function gestureLayer(layer:DesignLayer,canvas:Pick<MarketingDesign,'width'|'height'>,dx:number,dy:number,mode:'move'|'resize') {
 const snap=(n:number)=>Math.round(n/8)*8;
 const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
 if(mode==='resize')return {...layer,width:clamp(snap(layer.width+dx),24,canvas.width-layer.x),height:clamp(snap(layer.height+dy),24,canvas.height-layer.y)};
 let x=clamp(snap(layer.x+dx),0,canvas.width-layer.width),y=clamp(snap(layer.y+dy),0,canvas.height-layer.height);
 if(Math.abs(x+layer.width/2-canvas.width/2)<16)x=(canvas.width-layer.width)/2;
 if(Math.abs(y+layer.height/2-canvas.height/2)<16)y=(canvas.height-layer.height)/2;
 return {...layer,x,y};
}
export function coverImage(frame:{width:number;height:number},image:{width:number;height:number},x=50,y=50){
 const scale=Math.max(frame.width/image.width,frame.height/image.height);
 const width=image.width*scale,height=image.height*scale;
 return {width,height,left:(frame.width-width)*x/100,top:(frame.height-height)*y/100};
}

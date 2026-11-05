import { posterAdvances } from './poster-font-advances';
import { BUSINESS_EDITIONS } from './business-template-collection';
import type { StudioPosterInput } from './poster-composition';
import { validateDesign, type DesignLayer } from './marketing-design';

const editions = new Map(BUSINESS_EDITIONS.map(template => [String(template.layout), template]));
// Paper, text and solid action colour. The action label always sits on the ink colour.
const palettes: Record<string, string[]> = {
  emerald: ['#EAF4ED','#113A30','#ABCFB5'], rose_chic: ['#FCEDF0','#511D32','#EDADBA'],
  trust_amber: ['#FFF1D6','#482B13','#EEBA62'], cyber_tech: ['#EAF0FF','#142B56','#A6C4FA'],
  sand: ['#F7F0E3','#3E3127','#D9B998'], dark: ['#19282C','#F4F3E9','#ABC7BC'],
  royal_gold: ['#2C2732','#FAF2DD','#DABF88'], luxe_dark: ['#262427','#F9EEE5','#DCA58D'],
};
const seasonal:Record<string,string[]> = {
  diwali:['#431443','#FFEDCE','#FFC560'],holi:['#632654','#FFF3DB','#FFB5AC'],eid:['#123E3D','#FFF6D8','#F6D899'],
  christmas:['#123C32','#FFF1DE','#E6AD86'],new_year:['#1E2144','#FFF1CE','#EBC883'],
  independence_day:['#174E39','#FFF2DB','#FFCB8C'],republic_day:['#183665','#FFF2D4','#F9C87F'],
  rakhi:['#681C39','#FFF0E1','#F4B587'],navratri:['#591D21','#FFF0CF','#FFBD73'],valentine:['#6B2644','#FFF0ED','#FFBECF'],
  mothers_day:['#573147','#FFF4EE','#EDBED4'],fathers_day:['#243F51','#F3F8EA','#CFDDB2'],
};

type PosterFont = keyof typeof posterAdvances;

function textHeight(value:string,width:number,size:number,font:PosterFont='sans') {
  const advances=posterAdvances[font];
  const measure=(word:string)=>Array.from(word).reduce((sum,ch)=>{
    const index=ch.charCodeAt(0)-32;
    return sum+(advances[index] ?? 900)*size/1000;
  },0);
  const available=width*.98;
  let rows=0;
  for(const paragraph of value.split('\n')) {
    let used=0;
    rows++;
    for(const word of paragraph.split(/\s+/)) {
      const wordWidth=measure(word);
      const space=used ? measure(' ') : 0;
      if(used && used+space+wordWidth>available){rows++;used=wordWidth;}
      else used+=space+wordWidth;
      while(used>available){rows++;used-=available;}
    }
  }
  return Math.ceil(size*(1.12*rows+.12));
}

export function composeBusinessEdition(input:StudioPosterInput) {
  const template=editions.get(input.layout || '');
  if(!template?.edition) throw new Error('Unknown business template');
  const {purpose,intent,variant}=template.edition;
  const [w,h]=({'1:1':[1080,1080],'4:5':[1080,1350],'9:16':[1080,1920],'16:9':[1920,1080]})[input.ratio as '1:1'] || [1080,1350];
  const [paper,ink,tint]=seasonal[template.occasionId || ''] || palettes[input.theme || template.theme] || palettes.sand;
  const layers:DesignLayer[]=[];
  function base(id:string,type:DesignLayer['type'],x:number,y:number,width:number,height:number):DesignLayer {
    return {id,type,x,y,width,height,color:ink,background:'transparent',opacity:1,fontSize:24};
  }
  function text(id:string,value:string,x:number,y:number,width:number,height:number,size:number,options:Partial<DesignLayer>={}) {
    if(value) layers.push({...base(id,'text',x,y,width,height),text:value,fontSize:size,fontWeight:500,lineHeight:1.12,...options});
  }
  function box(id:string,x:number,y:number,width:number,height:number,color:string,radius=0) {
    layers.push({...base(id,'shape',x,y,width,height),background:color,borderRadius:radius});
  }
  function image(id:string,x:number,y:number,width:number,height:number) {
    if(input.photo) layers.push({...base(id,'image',x,y,width,height),src:input.photo,photoFit:'cover',cropX:50,cropY:50});
  }

  const margin=54;
  const story=h>w*1.55;
  const paired=['Before/after','Client transformation'].includes(intent);
  const split=!paired && !story && (w>h || variant===1);
  const mirror=split && (purpose==='Engagement' || purpose==='Festival');
  const panelWidth=split?Math.round(w*(w>h?.51:.56)):w;
  const left=mirror?w-panelWidth:0;
  const x=left+margin;
  const lineWidth=panelWidth-2*margin;
  const top=story?96:42;
  const brandX=x+(input.logoUrl?70:0);
  const brandWidth=lineWidth-(brandX-x);
  const brandSize=Math.min(input.brand.length>42?28:38,Math.max(18,Math.floor(brandWidth/(Math.max(input.brand.length,1)*.55))));
  const brandHeight=Math.max(52,textHeight(input.brand,brandWidth,brandSize));
  if(input.logoUrl) layers.push({...base('logo','image',x,top,52,52),src:input.logoUrl,photoFit:'contain'});
  text('brand',input.brand,brandX,top,brandWidth,brandHeight,brandSize,{fontWeight:700});
  const headerEnd=top+brandHeight+24;
  const badge=input.badge?.trim() || '';
  const title=input.headline.trim();
  const body=input.subtitle?.trim() || '';
  const cta=input.cta?.trim() || '';
  const contact=[input.website?.replace(/^https?:\/\//,''),input.phone].filter(Boolean).join('  ·  ');
  const footerH=contact?textHeight(contact,lineWidth,30)+16:0;
  const bottom=h-(story?98:44)-footerH;
  const maxCopy=split?bottom-headerEnd-36:Math.floor((bottom-headerEnd)*(paired?.48:story?.44:.56));
  let titleSize=split && w<=h?80:story?108:94;
  let bodySize=story?42:38;
  const headlineFont=purpose==='Festival' || purpose==='Trust-building'?'editorial':'display';
  const measure=()=> {
    const heading=textHeight(title,lineWidth,titleSize,headlineFont);
    const sub=body?textHeight(body,lineWidth,bodySize):0;
    return {heading,sub,total:(badge?52:0)+heading+(sub?14+sub:0)+(cta?26+78:0)};
  };
  let block=measure();
  while(block.total>maxCopy && (titleSize>48 || bodySize>30)) {
    titleSize=Math.max(48,titleSize-2);bodySize=Math.max(30,bodySize-1);block=measure();
  }
  const firstCopy=!paired && !split && !story && variant===2;
  const imageTop=firstCopy?headerEnd+block.total+32:headerEnd;
  const imageBottom=firstCopy?bottom:bottom-block.total-32;
  if(paired) {
    const gap=14, width=(w-margin*2-gap)/2;
    [0,1].forEach(i=>{
      const px=margin+i*(gap+width);
      image(i?'after_photo':'bg_photo',px,imageTop,width,imageBottom-imageTop);
      box(i?'after_plate':'before_plate',px+16,imageBottom-78,155,60,ink,12);
      text(i?'after_label':'before_label',i?'After':'Before',px+32,imageBottom-70,126,49,36,{color:paper,fontWeight:700});
    });
  } else if(split) {
    image('bg_photo',mirror?0:panelWidth,0,w-panelWidth,h);
  } else {
    const inset=purpose==='Festival' || purpose==='Trust-building'?margin:0;
    image('bg_photo',inset,imageTop,w-2*inset,imageBottom-imageTop);
  }
  let y=split?Math.round(headerEnd+(bottom-headerEnd-block.total)*.48):firstCopy?headerEnd:bottom-block.total;
  if(badge) {
    box('badge_rule',x,y+6,8,32,tint);
    text('badge',badge,x+22,y,lineWidth-22,48,32,{fontWeight:700});
    y+=52;
  }
  text('headline',title,x,y,lineWidth,block.heading,titleSize,{fontWeight:800,fontFamily:headlineFont});
  y+=block.heading;
  if(body) {y+=14;text('subtitle',body,x,y,lineWidth,block.sub,bodySize);y+=block.sub;}
  if(cta) {
    y+=26;
    const labelEm=Array.from(cta).reduce((sum,ch)=>sum+(posterAdvances.sans[ch.charCodeAt(0)-32] ?? 900)/1000,0)*1.08;
    const size=Math.min(40,Math.max(20,Math.floor((lineWidth-48)/labelEm)));
    const buttonWidth=Math.min(lineWidth,Math.ceil(labelEm*size)+48);
    box('cta_plate',x,y,buttonWidth,78,ink,20);
    text('cta',cta,x+22,y+13,buttonWidth-44,58,size,{color:paper,fontWeight:700,textAlign:'center'});
  }
  if(contact) text('footer',contact,x,bottom+16,lineWidth,footerH-16,30);
  return validateDesign({version:1,width:w,height:h,background:paper,layers});
}

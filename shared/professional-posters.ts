import type { PosterTemplate } from './poster-templates';
import { validateDesign, type DesignLayer, type MarketingDesign } from './marketing-design-core';
import type { StudioPosterInput } from './poster-composition';

type Direction = { id:string; name:string; industry:string; headline:string; services:string[]; cta:string; ink:string; paper:string; accent:string; font:'sans'|'editorial'|'display'; arrangement:'list'|'strip'|'hero'|'festival'; category:PosterTemplate['category'] };
export const PROFESSIONAL_DIRECTIONS:Direction[] = [
 {id:'plumbing',name:'Plumbing • Ready to help',industry:'Plumbing Services',headline:'Leaky pipe?\nWe’ve got\nyou covered.',services:['Repairs & installation','Drain cleaning','Water heater service','Book a service visit'],cta:'Book a plumber',ink:'#ffffff',paper:'#062842',accent:'#ffdc45',font:'sans',arrangement:'list',category:'service_spotlight'},
 {id:'dental',name:'Dental • Brighter smiles',industry:'Dental Clinic',headline:'Healthy teeth.\nBrighter\nsmiles.',services:['Cleaning','Fillings','Whitening','Consultation'],cta:'Book an appointment',ink:'#25134e',paper:'#f1eef9',accent:'#6932ad',font:'sans',arrangement:'strip',category:'appointment'},
 {id:'restaurant',name:'Restaurant • Weekend special',industry:'Restaurant',headline:'Weekend\nfavourites.',services:['Freshly prepared','Dine in','Takeaway','Order your favourites'],cta:'Explore the menu',ink:'#ffffff',paper:'#28170a',accent:'#ffcf27',font:'editorial',arrangement:'hero',category:'service_spotlight'},
 {id:'fitness',name:'Fitness • Find your strength',industry:'Fitness Studio',headline:'FIND YOUR\nSTRONG.',services:['Personal training','Workout plans','Nutrition guidance','Membership options'],cta:'Start your journey',ink:'#ffffff',paper:'#091514',accent:'#b4ef32',font:'display',arrangement:'list',category:'appointment'},
 {id:'salon',name:'Salon • Time for you',industry:'Salon & Spa',headline:'Hair care.\nSkin care.\nTime for you.',services:['Hair care','Facials','Spa','Makeup'],cta:'Book your appointment',ink:'#5b1633',paper:'#fcebee',accent:'#b92459',font:'editorial',arrangement:'strip',category:'appointment'},
 {id:'property',name:'Property • A place to belong',industry:'Real Estate',headline:'Find your\ndream home.',services:['Apartments','Villas','Plots','Viewings'],cta:'Schedule a site visit',ink:'#ffffff',paper:'#102940',accent:'#f6cc6b',font:'editorial',arrangement:'strip',category:'service_spotlight'},
 {id:'coaching',name:'Coaching • Learn with confidence',industry:'Coaching Institute',headline:'Big goals.\nExpert\nguidance.',services:['Expert guidance','Study material','Mock tests','Doubt support'],cta:'Explore our courses',ink:'#0a2850',paper:'#f2f4f6',accent:'#ffd45d',font:'sans',arrangement:'strip',category:'service_spotlight'},
 {id:'automotive',name:'Auto care • Ready for the road',industry:'Car Service Centre',headline:'Complete\ncar care.\nOne place.',services:['Servicing','Repairs','AC service','Wheel alignment'],cta:'Book a service',ink:'#ffffff',paper:'#111c22',accent:'#ed3543',font:'sans',arrangement:'list',category:'appointment'},
 {id:'fashion',name:'Fashion • Your next favourite',industry:'Fashion Store',headline:'New\narrivals.\nYour style.',services:['Fresh silhouettes','Everyday favourites','Discover the collection'],cta:'Explore the collection',ink:'#5b1734',paper:'#fce8e8',accent:'#a81d48',font:'editorial',arrangement:'hero',category:'new_arrival'},
 {id:'physio',name:'Physio • Move with confidence',industry:'Physiotherapy Clinic',headline:'Relief.\nRecovery.\nBetter mobility.',services:['Injury rehabilitation','Pain management','Post-surgery care','Mobility support'],cta:'Book a consultation',ink:'#113153',paper:'#e9f5f7',accent:'#008a81',font:'sans',arrangement:'list',category:'appointment'},
 {id:'cafe',name:'Café • Make time for good coffee',industry:'Café & Bistro',headline:'Great\ncoffee.\nBetter moments.',services:['Coffee','Breakfast','Bakes','Desserts'],cta:'Visit us today',ink:'#ffffff',paper:'#302014',accent:'#f8d591',font:'editorial',arrangement:'strip',category:'service_spotlight'},
 {id:'diwali',name:'Diwali • A little more light',industry:'Festival Greetings',headline:'Happy\nDiwali',services:['Wishing you light, joy and','beautiful new beginnings.'],cta:'Celebrate with us',ink:'#fff0bd',paper:'#370e36',accent:'#ffd46c',font:'editorial',arrangement:'festival',category:'festival'},
];
export const PROFESSIONAL_POSTERS:PosterTemplate[]=PROFESSIONAL_DIRECTIONS.map(d=>({
 id:`professional-${d.id}`,name:d.name,collection:'creative',category:d.category,layout:`professional_${d.id}`,theme:'emerald',aspect:'1:1',badge:d.industry,headline:d.headline,subtitle:d.services.join('\n'),cta:d.cta,
 photo:`/images/bgos/templates/${d.id}.webp`,
 bgPrompt:`Professional ${d.industry} advertising artwork. ${d.arrangement==='festival'?'Glowing diyas, golden lanterns and marigolds on a deep plum background, clear central copy space.':'Relevant main subject on the right half, calm uncluttered space on the left for editable copy.'} Palette ${d.paper} and ${d.accent}. No text, no logos, no watermark.`,
 industries:d.id==='diwali'?['any']:[d.id,d.industry.toLowerCase(),...(d.id==='automotive'?['garage','car repair']:d.id==='coaching'?['education','tuition']:d.id==='physio'?['physiotherapy']:[])],
 ...(d.id==='diwali'?{occasionId:'diwali'}:{}),
}));

/** Editable, image-led compositions. No text or business identity is baked into artwork. */
export function composeProfessionalPoster(input:StudioPosterInput):MarketingDesign{
 const direction=PROFESSIONAL_DIRECTIONS.find(d=>`professional_${d.id}`===input.layout)||PROFESSIONAL_DIRECTIONS[0];
 const sizes:Record<string,[number,number]>={'1:1':[1080,1080],'4:5':[1080,1350],'9:16':[1080,1920],'16:9':[1920,1080]};
 const [width,height]=sizes[input.ratio||'1:1']||sizes['1:1'];
 const landscape=width>height,festive=direction.arrangement==='festival',strip=direction.arrangement==='strip';
 const unit=Math.min(width,height);const layers:DesignLayer[]=[];
 const base=(id:string,type:DesignLayer['type'],x:number,y:number,w:number,h:number):DesignLayer=>({id,type,x:x*width,y:y*height,width:w*width,height:h*height,color:direction.ink,background:'transparent',fontSize:24,opacity:1});
 function shape(id:string,x:number,y:number,w:number,h:number,color:string,opacity=1,radius=0){layers.push({...base(id,'shape',x,y,w,h),background:color,opacity,borderRadius:radius});}
 function text(id:string,value:string,x:number,y:number,w:number,h:number,size:number,font:DesignLayer['fontFamily']='sans',color=direction.ink,align:DesignLayer['textAlign']='left'){
  if(!value)return;
  const lines=value.split('\n');const longest=Math.max(...lines.map(l=>l.length),1);
  const fitted=Math.max(10,Math.min(size*unit/1080,w*width/(longest*.57),h*height/(lines.length*1.18),180));
  layers.push({...base(id,'text',x,y,w,h),text:value,fontSize:fitted,fontFamily:font,fontWeight:font==='sans'?700:400,lineHeight:1.1,color,textAlign:align});
 }
 layers.push({...base('bg_photo','image',0,0,1,1),src:input.photo||`/images/bgos/templates/${direction.id}.webp`,cropX:50,cropY:50});
 // Independently editable contrast panel; image replacement never removes legibility protection.
 if(!festive){
  shape('copy_scrim',0,0,.34,strip?.67:1,direction.paper,.90);
  for(let i=0;i<12;i++)shape(`copy_fade_${i+1}`,.34+i*.0225,0,.0225,strip?.67:1,direction.paper,.9*(1-i/12));
 }
 else shape('greeting_scrim',.12,.15,.76,.53,direction.paper,.78,32);
 if(input.logoUrl)layers.push({...base('logo','image',.06,.045,.075,.075*width/height),src:input.logoUrl});
 else {shape('brand_mark',.06,.05,.012,.064,direction.accent,1,6);}
 text('brand',input.brand,.06+(input.logoUrl?.095:.035),.045,input.logoUrl?.73:.78,.05,38,'sans');
 text('badge',input.badge??direction.industry,.06+(input.logoUrl?.095:.035),.102,.78,.035,22,'sans');
 text('headline',input.headline,festive?.16:.06,festive?.24:.205,festive?.68:.47,festive?.26:strip?.30:.34,festive?130:direction.font==='display'?110:104,direction.font,direction.ink,festive?'center':'left');
 const services=(input.subtitle??direction.services.join('\n')).split('\n').filter(Boolean).slice(0,4);
 if(strip){
  shape('services_panel',.045,.69,.91,.15,direction.paper,.96,24);
  services.forEach((service,i)=>{const cell=.91/Math.max(services.length,1),x=.045+cell*i;text(`service_${i+1}`,service,x+.012,.75,cell-.024,.065,25,'sans',direction.ink,'center');shape(`service_mark_${i+1}`,x+cell/2-.018,.715,.036,.008,direction.accent,1,4);});
 }else{
  services.forEach((service,i)=>{const y=(festive?.535:.60)+i*(festive?.04:.047);if(!festive)shape(`service_mark_${i+1}`,.06,y+.006,.012,.012*width/height,direction.accent,1,8);text(`service_${i+1}`,service,festive?.18:.09,y,festive?.64:.40,.042,festive?31:31,'sans',direction.ink,festive?'center':'left');});
 }
 if(!festive){const ctaX=strip?.22:.06,ctaW=strip?.56:.47;shape('cta_background',ctaX,.865,ctaW,.068,direction.accent,1,38);text('cta',input.cta??direction.cta,ctaX+.02,.877,ctaW-.04,.044,30,'sans',['#ffdc45','#ffcf27','#b4ef32','#f6cc6b','#ffd45d','#f8d591'].includes(direction.accent)?'#12202a':'#ffffff','center');}
 else text('cta',input.cta??direction.cta,.22,.76,.56,.05,28,'sans',direction.accent,'center');
 const contact=[input.website?.replace(/^https?:\/\//,''),input.phone].filter(Boolean).join('  •  ');
 text('footer',contact,.06,.955,.88,.026,21,'sans',direction.ink,'center');
 return validateDesign({version:1,width,height,background:direction.paper,layers});
}

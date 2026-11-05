import { BUSINESS_EDITIONS } from './business-template-collection';
import { composeStudioPoster, type StudioPosterInput } from './poster-composition';
import { validateDesign, type DesignLayer } from './marketing-design';

const byLayout=new Map(BUSINESS_EDITIONS.map(template=>[template.layout as string,template]));
const details:Record<string,[string,string]> = {
 'Customer review':['Approved customer quote','Customer name'], '5-star review highlight':['Add the verified star rating','Add the matching review'],
 'Testimonial':['Their words','Approved client attribution'], 'Success story':['The challenge','The result'], 'Case study':['The brief','What changed'],
 'Rating celebration':['Verified rating','Number of reviews'], 'Our services':['First service','Second service'], 'Our process':['01 · Enquiry','02 · Next steps'],
 'Years of experience':['Year established','Milestone'], 'Meet the team':['Team member','Role or specialty'], 'Branch opening':['Opening date','New address'],
 'Tips':['What to check','Why it matters'], 'FAQs':['Question','Answer'], 'Quiz':['Choice A','Choice B'], 'Myth vs fact':['Myth','Fact'],
 'Poll post':['Option A','Option B'], 'Did you know':['The detail','Why it matters'], 'Reminder post':['When','What to bring'],
 'Discount offer':['Offer amount','Eligible items'], 'Seasonal sale':['Seasonal selection','Sale dates'], 'Combo offer':['First item','Paired with'],
 'Limited-time deal':['Offer details','Ends on'], 'Launch offer':['Introducing','Launch date'], 'Referral offer':['Referral benefit','How to refer'],
 'First-visit discount':['Welcome offer','First-visit terms'], 'Membership offer':['Member benefit','Plan details'],
};
const festivalMotifs:Record<string,[string,string,string]> = {
 diwali:['#431443','#FFC560','✦'],holi:['#632654','#FFB5AC','●'],eid:['#123E3D','#F6D899','☾'],christmas:['#123C32','#E6AD86','✶'],
 new_year:['#1E2144','#EBC883','✧'],independence_day:['#174E39','#FFCB8C','✳'],republic_day:['#183665','#F9C87F','✳'],
 rakhi:['#681C39','#F4B587','❖'],navratri:['#591D21','#FFBD73','✦'],valentine:['#6B2644','#FFBECF','♥'],
 mothers_day:['#573147','#EDBED4','✿'],fathers_day:['#243F51','#CFDDB2','◆'],
};
export function composeBusinessEdition(input:StudioPosterInput) {
 const template=byLayout.get(input.layout || '');
 if (!template?.edition) throw new Error('Unknown business template');
 const {intent,purpose,direction,variant,slides}=template.edition;
 const doc=composeStudioPoster({...input,layout:`studio_${direction}`});
 const {width:w,height:h}=doc;
 const photo=doc.layers.find(l=>l.id==='bg_photo');
 const foreground=doc.layers.find(l=>l.id==='brand')!.color;
 const accent=doc.layers.find(l=>l.id==='brand_rule')!.background;
 const type=(id:string,text:string,x:number,y:number,width:number,height:number,size:number,color=foreground):DesignLayer=>({
  id,type:'text',text,x:x*w,y:y*h,width:width*w,height:height*h,fontSize:size,color,background:'transparent',opacity:1,fontWeight:700,
 });
 const shape=(id:string,x:number,y:number,width:number,height:number,background:string):DesignLayer=>({
  ...type(id,'',x,y,width,height,24),type:'shape',background,
 });
 if (purpose==='Festival') {
  const [ink,gold]=festivalMotifs[template.occasionId!]!;
  doc.background=ink;
  doc.layers=doc.layers.filter(l=>['logo','brand','footer'].includes(l.id)).map(l=>({...l,color:gold}));
  if (variant && photo) doc.layers.unshift({...photo,x:.55*w,y:.2*h,width:.40*w,height:.56*h,borderRadius:120});
  const space = variant ? .46 : .84;
  doc.layers.push(shape('frame-top',.06,.13,.88,.003,gold),shape('frame-bottom',.06,.85,.88,.003,gold),
   shape('ornament',.08,.27,.12,.009,gold),type('badge',input.badge || intent,.08,.36,space,.06,25,gold),
   {...type('headline',input.headline,.08,.44,space,.20,variant?49:70,'#FFFFFF'),fontFamily:'editorial'},
   type('subtitle',input.subtitle || '',.08,.66,space,.13,27,gold),type('cta',input.cta || '',.08,.86,.82,.05,26,gold));
  // A photographed greeting keeps its replaceable visual independent of the lettering.
  if (!variant && photo) doc.layers.push({...photo,x:.66*w,y:.16*h,width:.25*w,height:.18*h,cropX:50,cropY:50,borderRadius:100});
 } else if (['Before/after','Client transformation'].includes(intent) && photo) {
  doc.layers=doc.layers.filter(l=>['brand','logo','brand_rule','footer'].includes(l.id));
  const vertical=variant===1;
  const frames=vertical?[[.06,.28,.62,.23],[.32,.53,.62,.23]]:[[.06,.34,.43,.38],[.51,.34,.43,.38]];
  doc.layers.push(type('headline',input.headline,.06,.15,.88,.12,54));
  frames.forEach(([x,y,width,height],i)=>doc.layers.push({...photo,id:i?'after_photo':'bg_photo',x:x*w,y:y*h,width:width*w,height:height*h},
   {...type(i?'after_label':'before_label',i?'After':'Before',x,y+.01,width*.55,.055,27,'#FFFFFF'),background:'#172B35'}));
  doc.layers.push(type('subtitle',input.subtitle || '',.06,.79,.88,.07,28),type('cta',input.cta || '',.06,.87,.88,.05,26,accent));
 } else if(details[intent] || slides) {
  // Reserve a separate information rail, so labels never cover the original artwork.
  for(const layer of doc.layers){layer.y*=.78;layer.height*=.78;if(layer.type==='text')layer.fontSize=Math.max(12,Math.floor(layer.fontSize*.78));}
  const pair=details[intent] || ['Field guide','Swipe for the next step'];
  doc.layers.push(shape('rail',.06,.80,.88,.003,accent),
   type('detail_left',pair[0],.06,.83,.42,.11,28),
   type('detail_right',pair[1],.52,.83,.42,.11,28,accent));
 }
 return validateDesign(doc);
}

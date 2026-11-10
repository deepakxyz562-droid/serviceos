import type { PosterAspect, PosterCategoryId, PosterTemplate } from './poster-templates';
import type { CommercialTheme } from './marketing-design-core';

export const BUSINESS_GROUPS = {
  'Health & wellness': 'dental clinic|skin clinic|physiotherapy|gym|yoga|nutritionist|pathology lab|eye clinic',
  'Beauty & personal care': 'salon|spa|nail studio|makeup artist|barber shop|tattoo studio',
  'Food & hospitality': 'restaurant|cafe|bakery|cloud kitchen|hotel|homestay|catering',
  'Education & coaching': 'school|coaching center|tuition|spoken English|computer classes|dance class|music class',
  'Home services': 'plumber|electrician|AC repair|cleaning|carpenter|pest control|painting|appliance repair',
  'Auto & transport': 'car wash|garage|bike repair|towing|driving school|tyre shop',
  'Retail & local shops': 'grocery|clothing store|jewellery|mobile shop|electronics|gift shop|pharmacy',
  'Real estate & property': 'real estate agent|builder|interior designer|architect|rental service',
  'Professional services': 'CA|lawyer|insurance advisor|travel agent|consultant|digital marketing agency',
  'Events & lifestyle': 'event planner|photographer|decorator|wedding planner|party hall',
};
export const TEMPLATE_FORMATS: Record<string, PosterAspect> = {
  'Instagram post':'4:5','Instagram story':'9:16','Instagram reel cover':'9:16','Facebook post':'1:1',
  'WhatsApp status':'9:16','Google Business post':'4:5','Flyer':'4:5','Poster':'4:5','Square ad':'1:1','Vertical ad':'9:16',
};
// Keep subject-specific headlines paired with the business that can actually use them.
const subjectGroups:Record<string,number> = {
 'A cut above':1,'The weekend edit':6,'Good finds for less':6,'Summer shelf reset':6,
 'The lunch pairing':2,'Your first appointment':0,'Inside our studio':9,
 'From brief to result':8,'Two frames, one project':7,'A note from a customer':2,
 'Choose your session':0,'Ready for your order':2,'Choose your favourites':6,
 'Plan a walkthrough':7,'See it in person':7,'Start your membership':0,
};
const purposes = ['Promotion','Trust-building','Business profile','Engagement','Conversion','Festival'] as const;
export type Purpose = typeof purposes[number];
export const TEMPLATE_PURPOSES = [...purposes];
const categories: Record<Purpose,PosterCategoryId> = {Promotion:'sale_offer','Trust-building':'testimonial','Business profile':'service_spotlight',Engagement:'quote',Conversion:'appointment',Festival:'festival'};
const themes: CommercialTheme[] = ['emerald','rose_chic','trust_amber','cyber_tech','sand','dark','royal_gold','luxe_dark'];
// Each row is one brief. Each headline is a separate edition, in publication order.
const briefs: Record<Purpose,string[]> = {
  Promotion:[
    'Discount offer|A cut above|The weekend edit|Good finds for less',
    'Seasonal sale|Summer shelf reset|An autumn refresh|Spring, in store',
    'Combo offer|Better by the pair|Build your own bundle|The lunch pairing',
    'Limited-time deal|Last call for this edit|Catch the weekend window|One more evening',
    'Launch offer|Meet the first edition|Opening week invitation|First look inside',
    'Referral offer|Bring someone along|Pass on a good find|Invite your circle',
    'First-visit discount|Your first appointment|A welcome at the door|Start here, save here',
    'Membership offer|Make it a ritual|Inside the members club|Your regular spot',
  ],
  'Trust-building':[
    'Customer review|In their own words|A note from a customer',
    '5-star review highlight|Behind the five stars|One review in focus',
    'Testimonial|From the client desk|A voice from our community',
    'Before/after|Before meets after|Two frames, one project',
    'Success story|From brief to result|The work behind the win',
    'Client transformation|The starting point|A change in perspective',
    'Case study|Inside the project|The brief and the outcome',
    'Rating celebration|A milestone in reviews|Thank you for the feedback',
  ],
  'Business profile':[
    'About us|Our story starts here|Inside our studio',
    'Meet the team|People behind the work|Meet your next specialist',
    'Why choose us|How we work differently|What to expect here',
    'Our services|The service menu|Explore our specialties',
    'Our process|From enquiry to handover|Your visit, step by step',
    'Our mission|What brings us to work|The promise behind the practice',
    'Branch opening|A new door opens|Find us in the neighbourhood',
    'Years of experience|Our timeline|The years behind our craft',
  ],
  Engagement:[
    'Tips|Three things to check|A small habit to try|A tip from the studio',
    'FAQs|Before your first visit|You asked, we answered|The weekly question',
    'Quiz|Test your instincts|Which would you pick?|A quick knowledge check',
    'Myth vs fact|Myth, meet fact|A closer look at the claim|Common belief, explained',
    'Did you know|One detail to notice|A fact for your feed|Look a little closer',
    'Poll post|Help choose our next feature|This one or that one?|Cast your vote',
    'Reminder post|A date for your diary|Before you head out|Time for a check-in',
    'Educational carousel|Plan your first visit|Compare your options|Prepare your brief',
  ],
  Conversion:[
    'Book now|Reserve your spot|Choose your session',
    'Call now|Talk it through|Speak with our team',
    'WhatsApp us|Start a conversation|Send your question',
    'Schedule visit|See it in person|Plan a walkthrough',
    'Free consultation|Your introductory call|Bring us your questions',
    'Request quote|Tell us your brief|Get a tailored estimate',
    'Order now|Choose your favourites|Ready for your order',
    'Join today|Find your community|Start your membership',
  ],
  Festival:[
    'Diwali|An evening of light|The Diwali gift edit','Holi|A sky full of colour|The Holi palette',
    'Eid|Under the Eid moon|An Eid invitation','Christmas|The Christmas table|Wrapped for Christmas',
    'New Year|A fresh page|Your New Year invitation','Independence Day|Colours of freedom|A community gathering',
    'Republic Day|In celebration of the Republic|The Republic Day edition','Raksha Bandhan|A thread between us|The Rakhi gift guide',
    'Dussehra|Light after dusk|The Dussehra collection',"Valentine’s Day|A note for someone special|The Valentine edit",
    'Mother’s Day|For the ones who nurture|A Mother’s Day invitation','Father’s Day|For the ones who guide|The Father’s Day edit',
  ],
};
const occasionIds=['diwali','holi','eid','christmas','new_year','independence_day','republic_day','rakhi','navratri','valentine','mothers_day','fathers_day'];
const backgrounds=['dental','salon','restaurant','coaching','plumbing','automotive','fashion','property','edition-professional-services','edition-events-lifestyle'];
const groups=Object.keys(BUSINESS_GROUPS) as (keyof typeof BUSINESS_GROUPS)[];
const slug=(value:string)=>value.toLowerCase().replace(/[’']/g,'').replace(/[^a-z0-9]+/g,'-').replace(/-$/,'');
const supporting:Record<Purpose,string[]>={
 Promotion:['Featured offer','Offer details','Valid dates & terms'],
 'Trust-building':['Customer feedback','Discover the experiences behind our work.','Customer or project name'],
 'Business profile':['Business spotlight','Get to know our business.','Meet the team'],
 Engagement:['Field notes','Share your answer or ask us a question','Join the conversation'],
 Conversion:['Get in touch','Tell us what you have in mind','Contact the team'],
 Festival:['Seasonal greetings','With warm wishes from our team','Celebrate with us'],
};
const copyByIntent:Record<string,string> = {
 'Discount offer':'A selection worth a second look. Ask us for today’s offer.',
 'Seasonal sale':'Explore this season’s selection while the edit is here.',
 'Combo offer':'Two favourites, selected to work together.',
 'Limited-time deal':'A short window to discover something new.',
 'Launch offer':'Be among the first to explore the new collection.',
 'Referral offer':'Know someone who would love this? Ask how our referral offer works.',
 'First-visit discount':'Planning your first visit? Ask about the welcome offer.',
 'Membership offer':'Explore the benefits and choose a plan that fits.',
 'About us':'A look at the people and ideas behind our business.',
 'Meet the team':'Meet the person bringing your next project to life.',
 'Why choose us':'Get to know our approach before making your choice.',
 'Our services':'Find the right starting point for what you need.',
 'Our process':'Here is how we get from your first question to the next step.',
 'Our mission':'The work we do starts with a simple purpose.',
 'Branch opening':'Come and meet the team at our new location.',
 'Years of experience':'A look back at the milestones that shaped our work.',
 'Tips':'Keep this note handy for the next time you need it.',
 'FAQs':'Have a question before you begin? Start here.',
 'Quiz':'Choose your answer and tell us your thinking.',
 'Myth vs fact':'Two perspectives. Check the evidence and see the difference.',
 'Did you know':'A small detail can change the way you look at a familiar task.',
 'Poll post':'We would love your input. Tell us which option you prefer.',
 'Reminder post':'Save the details and plan ahead.',
 'Book now':'Choose a time that works for you and we will confirm the details.',
 'Call now':'Have a question? Talk through your options with our team.',
 'WhatsApp us':'Send us a message with a little about what you need.',
 'Schedule visit':'Get a closer look and bring your questions along.',
 'Free consultation':'Ask about available introductory sessions and what is included.',
 'Request quote':'Share your requirements so we can prepare a quote.',
 'Order now':'Send your selection and ask about current availability.',
 'Join today':'Explore the membership options and find your fit.',
};
export interface BusinessEdition {purpose:Purpose; group:string; format:string; intent:string; variant:number; direction:number; slides?:string[]}
export const BUSINESS_EDITIONS: PosterTemplate[] = [];
for (const [purposeIndex,purpose] of purposes.entries()) {
  for (const [briefIndex,row] of briefs[purpose].entries()) {
    const [intent,...headlines]=row.split('|');
    for (const [variant,headline] of headlines.entries()) {
      const index=BUSINESS_EDITIONS.length;
      const groupIndex=subjectGroups[headline] ?? (briefIndex+variant*3+purposeIndex*2)%groups.length;
      const group=groups[groupIndex];
      const format=Object.keys(TEMPLATE_FORMATS)[(index+purposeIndex)%10];
      const [,subtitle,cta]=supporting[purpose];
      const id='business-'+slug(intent)+'-'+slug(headline);
      const edition:BusinessEdition={purpose,intent,group,variant,format,direction:(briefIndex*4+variant*7+purposeIndex)%60};
      if(intent==='Educational carousel') edition.slides=[
        headline,
        ['Write down your questions','List what matters most','Define the outcome'][variant],
        ['Bring your reference material','Compare the trade-offs','Gather your references'][variant],
        ['Agree on the next step','Choose your next step','Share your timeline'][variant],
      ];
      BUSINESS_EDITIONS.push({
        id,name:headline,layout:`business_${id}`,collection:variant%2?'creative':'standard',category:categories[purpose],
        edition,theme:themes[(briefIndex+variant*3+purposeIndex)%themes.length],aspect:TEMPLATE_FORMATS[format],
        headline,badge:intent,subtitle:purpose==='Festival' && variant===0 ? 'Warm wishes from our team to yours.' : (copyByIntent[intent] || subtitle),
        cta:purpose==='Conversion'?intent:purpose==='Promotion'?'Explore the offer':purpose==='Trust-building'?'Read the story':cta,
        photo:`/images/bgos/templates/${purpose==='Festival' ? (briefIndex===0?'diwali':'edition-'+occasionIds[briefIndex].replace(/_/g,'-')) : backgrounds[groupIndex]}.webp`,
        industries:BUSINESS_GROUPS[group].toLowerCase().split('|'),
        bgPrompt:`${intent} for ${group}: ${headline}. Editorial photography, clear focal point, no text or lettering.`,
        ...(purpose==='Festival'?{occasionId:occasionIds[briefIndex]}:{}),
      });
    }
  }
}
export function templateMatches(template:PosterTemplate, query:string) {
  const e=template.edition;
  const normalize=(value:string)=>value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ');
  const haystack=normalize([template.name,template.headline,template.category,template.occasionId,e?.purpose,e?.intent,e?.group,e?.format,...(template.industries||[])].join(' '));
  return normalize(query).trim().split(/\s+/).every(word=>haystack.includes(word));
}

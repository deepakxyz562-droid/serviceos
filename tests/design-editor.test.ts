import {describe,it,expect} from 'vitest';
import {commitDesign,travelDesign,patchDesignLayer,resizeDesign,backgroundBrief} from '../shared/design-editor';
import {createDesign} from '../shared/marketing-design';
const doc=createDesign({brand:'Acme',headline:'Diwali glow',subtitle:'Celebrate together',badge:'Diwali',cta:'Explore',photo:''});
describe('Editor document operations',()=>{
 it('undoes and redoes a change without regeneration',()=>{
  const next=patchDesignLayer(doc,'headline',{text:'A festival of light'});
  const history=commitDesign({past:[],present:doc,future:[]},next);
  expect(travelDesign(history,'undo').present).toEqual(doc);
  expect(travelDesign(travelDesign(history,'undo'),'redo').present).toEqual(next);
 });
 it('clears redo when editing after undo',()=>{
  const h=commitDesign({past:[],present:doc,future:[]},patchDesignLayer(doc,'headline',{text:'First'}));
  expect(commitDesign(travelDesign(h,'undo'),patchDesignLayer(doc,'headline',{text:'Second'})).future).toEqual([]);
 });
 it('does not modify locked objects and clamps gestures to canvas',()=>{
  const locked={...doc,layers:doc.layers.map(l=>({...l,locked:true}))};
  expect(patchDesignLayer(locked,'headline',{x:99999})).toEqual(locked);
  const next=patchDesignLayer(doc,'headline',{x:99999,y:-20});
  const l=next.layers.find(l=>l.id==='headline')!;expect(l.x+l.width).toBe(doc.width);expect(l.y).toBe(0);
 });
 it('resizes layers proportionally and rejects unsupported dimensions',()=>{
  const next=resizeDesign(doc,540,540);expect(next.layers[0].x).toBe(doc.layers[0].x/2);
  expect(()=>resizeDesign(doc,10,10)).toThrow();
 });
 it('keeps occasion and headline explicit alongside user refinements',()=>{
  const prompt=backgroundBrief({template:{name:'Diwali Glow',occasionId:'diwali',bgPrompt:'Diyas and marigolds'},headline:'A festival of light',instruction:'Make it illustrated',ratio:'4:5'});
  for(const value of ['diwali','Diyas and marigolds','A festival of light','illustrated','NO TEXT'])expect(prompt).toContain(value);
 });
});

import {groupLayers,ungroupLayers,collageImages} from '../shared/design-editor';
it('moves a group together while preserving relative offsets and canvas bounds',()=>{
 const grouped=groupLayers(doc,['brand','headline'],'group-1');
 const before=grouped.layers.find(l=>l.id==='headline')!;
 const moved=patchDesignLayer(grouped,'brand',{x:9999,y:9999});
 const brand=moved.layers.find(l=>l.id==='brand')!,headline=moved.layers.find(l=>l.id==='headline')!;
 expect(headline.y-brand.y).toBeCloseTo(before.y-doc.layers.find(l=>l.id==='brand')!.y);
 expect(Math.max(brand.y+brand.height,headline.y+headline.height)).toBeLessThanOrEqual(doc.height);
 expect(ungroupLayers(moved,'brand').layers.every(l=>!l.groupId)).toBe(true);
});
it('blocks group movement if any member is locked',()=>{
 const grouped=groupLayers(doc,['brand','headline'],'group-1');grouped.layers.find(l=>l.id==='headline')!.locked=true;
 expect(patchDesignLayer(grouped,'brand',{x:100})).toEqual(grouped);
});
it('arranges two to four editable photos into valid collage frames',()=>{
 for(const count of [2,3,4])for(const layout of ['columns','grid','feature'] as const){
  const photos=Array.from({length:count},(_,i)=>({...doc.layers[0],id:`photo-${i}`,type:'image' as const,src:'https://images.unsplash.com/example'}));
  const source={...doc,layers:[...doc.layers,...photos]};
  const next=collageImages(source,photos.map(l=>l.id),layout);
  expect(next.layers.filter(l=>l.type==='text')).toEqual(doc.layers);
  expect(new Set(next.layers.filter(l=>l.type==='image').map(l=>`${l.x},${l.y}`)).size).toBe(count);
 }
});

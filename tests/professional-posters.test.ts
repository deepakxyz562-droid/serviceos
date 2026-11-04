import {describe,it,expect} from 'vitest';
import {PROFESSIONAL_POSTERS} from '../shared/professional-posters';
import {buildTemplateDesignDoc,templateToDesignInput} from '../shared/poster-templates';
import {validateDesign} from '../shared/marketing-design';
import {patchDesignLayer} from '../shared/design-editor';
describe('Professional reference collection',()=>{
 it('contains twelve industry-specific designs with separate editable text and image layers',()=>{
  expect(PROFESSIONAL_POSTERS).toHaveLength(12);
  for(const template of PROFESSIONAL_POSTERS)for(const ratio of ['1:1','4:5','9:16','16:9'] as const){
   const doc=buildTemplateDesignDoc(template,{businessName:'Your Local Business',phone:'+91 90000 12345',website:'example.com'},{ratio});
   expect(()=>validateDesign(doc)).not.toThrow();
   expect(doc.layers.find(l=>l.id==='brand')?.text).toBe('Your Local Business');
   expect(doc.layers.find(l=>l.id==='headline')?.text).toBe(template.headline);
   expect(doc.layers.filter(l=>l.id.startsWith('service_')&&l.type==='text').length).toBeGreaterThan(0);
   expect(doc.layers.find(l=>l.id==='bg_photo')?.src).toBe(template.photo);
  }
 });
 it('replaces the image without altering text, service lines or layout',()=>{
  for(const template of PROFESSIONAL_POSTERS){
   const original=buildTemplateDesignDoc(template);const next=patchDesignLayer(original,'bg_photo',{src:'https://example.com/replacement.jpg'});
   expect(next.layers.filter(l=>l.id!=='bg_photo')).toEqual(original.layers.filter(l=>l.id!=='bg_photo'));
  }
 });
 it('allows deliberate empty copy overrides',()=>{
  expect(templateToDesignInput(PROFESSIONAL_POSTERS[0],{},{badge:'',subtitle:''})).toMatchObject({badge:'',subtitle:''});
 });
 it('rejects traversal and untrusted local assets',()=>{
  const doc=buildTemplateDesignDoc(PROFESSIONAL_POSTERS[0]);
  for(const src of ['/images/bgos/templates/../../secret.webp','/uploads/private.webp','file:///private/key']){
   expect(()=>validateDesign({...doc,layers:doc.layers.map(l=>l.type==='image'?{...l,src}:l)})).toThrow();
  }
 });
});

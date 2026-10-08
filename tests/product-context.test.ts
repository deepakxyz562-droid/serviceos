import {describe,it,expect} from 'vitest';
import {isGptFormWorkspace, productForHostname} from '../shared/product-context';
import {resolveTenantBlueprint} from '../shared/blueprint/resolver';
describe('product boundaries',()=>{
 it('never turns a retail CRM owner into a GPTForm workspace',()=>{
  expect(isGptFormWorkspace({user:{role:'owner'},workspace:{productType:'crm'},tenant:{signupMode:'crm_trial',plan:'professional'}})).toBe(false);
 });
 it('respects an explicit CRM workspace even with legacy standalone flags',()=>{
  expect(isGptFormWorkspace({workspace:{productType:'crm'},tenant:{signupMode:'standalone'},user:{role:'standalone_user'}})).toBe(false);
 });
 it('recognizes GPTForm and legacy standalone accounts without inferring from owner role',()=>{
  expect(isGptFormWorkspace({workspace:{productType:'forms'},user:{role:'owner'}})).toBe(true);
  expect(isGptFormWorkspace({tenant:{signupMode:'standalone'},user:{role:'owner'}})).toBe(true);
  expect(isGptFormWorkspace({user:{role:'owner'}})).toBe(false);
  expect(isGptFormWorkspace({workspace:{productType:'forms'},user:{isSuperAdmin:true}})).toBe(false);
 });
 it('uses the registered country for currency defaults',()=>{
  expect(resolveTenantBlueprint({country:'India',industry:'retail'}).country).toBe('IN');
 });
});

it('never uses a URL query to authorize a product workspace', () => {
 window.history.replaceState({}, '', '/?app=bos');
 try {
  expect(isGptFormWorkspace({ workspace: { productType: 'crm' } })).toBe(false);
 } finally { window.history.replaceState({}, '', '/'); }
});

it('only recognizes exact product hostnames', () => {
 expect(productForHostname('bos.fieseros.com')).toBe('bos');
 expect(productForHostname('bos.fieseros.com.attacker.test')).toBe('crm');
 expect(productForHostname('bos.unrelated.test')).toBe('crm');
});
it('does not let legacy flags override an explicit unknown product', () => {
 expect(isGptFormWorkspace({ workspace: { productType: 'future-product' }, tenant: { signupMode: 'standalone' } })).toBe(false);
});

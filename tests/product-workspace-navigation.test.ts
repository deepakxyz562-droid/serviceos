import {beforeEach,describe,it,expect} from 'vitest';
import {useAppStore} from '@/store/app-store';
const crm={isAuthenticated:true,user:{id:'owner',workspaceId:'workspace',role:'owner'},tenant:{id:'tenant',industry:'retail',signupMode:'crm_trial'},workspace:{id:'workspace',productType:'crm'}};
describe('product workspace navigation',()=>{
 beforeEach(()=>useAppStore.getState().clearAuth());
 it('starts a retail CRM account in CRM and preserves navigation during session refresh',()=>{
  useAppStore.getState().setAuth(crm as any);
  expect(useAppStore.getState().currentView).toBe('dashboard');
  useAppStore.getState().setCurrentView('jobs');
  useAppStore.getState().setAuth({...crm} as any);
  expect(useAppStore.getState().currentView).toBe('jobs');
 });
 it('clears the old product view after the workspace assignment is corrected',()=>{
  useAppStore.getState().setAuth(crm as any);
  useAppStore.getState().setCurrentView('jobs');
  useAppStore.getState().setAuth({...crm,workspace:{id:'workspace',productType:'forms'}} as any);
  expect(useAppStore.getState().currentView).toBe('formsDashboard');
  expect(useAppStore.getState().activeView).toBe('formsDashboard');
 });
});

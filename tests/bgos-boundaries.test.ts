import { beforeEach, describe, expect, it } from 'vitest';
import { BGOS_NAVIGATION, bgosView, bgosNavigationView } from '../shared/bgos-navigation';
import { isProduct, normalizeProduct } from '../shared/products';
import { canUseInbox, canAccessConversation } from '@/lib/conversation-access';
import { useAppStore } from '@/store/app-store';
const user = { id: 'owner', email: 'owner@test.com', name: 'Owner', role: 'owner', tenantId: 't', workspaceId: 'w', avatar: null };
describe('BGOS product boundaries', () => {
  beforeEach(() => useAppStore.getState().clearAuth());
  it('recognizes BGOS and migrates legacy aliases consistently', () => {
    expect(isProduct('bgos')).toBe(true);
    for (const product of ['bgos','chatbotly','chatboly','forms','gptform']) expect(normalizeProduct(product)).toBe('bgos');
  });
  it('has one entry per feature and no BOS operations', () => {
    const views = BGOS_NAVIGATION.flatMap(s => s.items.map(i => i.view));
    expect(new Set(views).size).toBe(views.length);
    for (const view of ['commerce','invoices','inventory','pos','jobs','expenses']) {
      expect(views).not.toContain(view);
      expect(bgosView(view)).toBe('dashboard');
    }
    expect(bgosView('chatbotBuilder')).toBe('agentStudio');
    expect(bgosView('canvas')).toBe('canvas');
  });
  it('groups existing child screens under one canonical feature', () => {
    for (const [child, parent] of [['contacts', 'leads'], ['formSubmissions', 'formBuilder'], ['postsList', 'socialMedia'], ['socialAccounts', 'socialMedia'], ['aiCallHistory', 'aiReceptionist'], ['calendar', 'scheduling']]) {
      expect(bgosView(child)).toBe(child);
      expect(bgosNavigationView(child)).toBe(parent);
    }
    expect(bgosView('salesPipeline')).toBe('dashboard');
  });
  it('rejects BOS navigation even when requested outside the sidebar', () => {
    useAppStore.getState().setAuth({ isAuthenticated: true, user, tenant: { id: 't' }, workspace: { id: 'w', productType: 'bgos' } });
    useAppStore.getState().setCurrentView('commerce');
    expect(useAppStore.getState().currentView).toBe('dashboard');
    useAppStore.getState().setCurrentView('contacts');
    expect(useAppStore.getState().currentView).toBe('contacts');
  });
  it('denies inbox access to anonymous, customer and tenantless sessions', () => {
    expect(canUseInbox(null)).toBe(false);
    expect(canUseInbox({ ...user, role: 'customer' })).toBe(false);
    expect(canUseInbox({ ...user, tenantId: null })).toBe(false);
    expect(canUseInbox(user)).toBe(true);
  });
  it('enforces tenant and workspace isolation', () => {
    expect(canAccessConversation(user, { tenantId: 'other', workspaceId: 'w' })).toBe(false);
    expect(canAccessConversation(user, { tenantId: 't', workspaceId: 'other' })).toBe(false);
    expect(canAccessConversation(user, { tenantId: 't', workspaceId: 'w' })).toBe(true);
    expect(canAccessConversation(user, { tenantId: 't', workspaceId: null })).toBe(true);
  });
});

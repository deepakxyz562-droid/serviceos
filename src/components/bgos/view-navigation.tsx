'use client';

import { useAppStore } from '@/store/app-store';
import type { ViewType } from '@/types/workflow';

const groups: { view: ViewType; label: string }[][] = [
  [{ view: 'leads', label: 'Lead pipeline' }, { view: 'contacts', label: 'Contacts & segments' }],
];
export function BgosViewNavigation() {
  const currentView = useAppStore(s => s.currentView);
  const navigate = useAppStore(s => s.setCurrentView);
  const items = groups.find(group => group.some(item => item.view === currentView));
  if (!items) return null;
  return <nav className="bgos-crm-tabs shrink-0" aria-label="Section navigation">{items.map(item => <button key={item.view} aria-current={currentView === item.view ? 'page' : undefined} onClick={() => navigate(item.view)}>{item.label}</button>)}</nav>;
}

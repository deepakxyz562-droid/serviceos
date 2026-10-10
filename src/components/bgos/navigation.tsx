'use client';

import { useState } from 'react';
import { BarChart3, Bot, Calendar, CircleHelp, CreditCard, FileInput, Globe, LayoutDashboard, LogOut, Menu, MessageSquare, Phone, Search, Send, Settings, Share2, Sparkles, Star, Users, Workflow, type LucideIcon } from 'lucide-react';
import { BGOS_NAVIGATION, bgosNavigationView } from '../../../shared/bgos-navigation';
import { useAppStore } from '@/store/app-store';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import type { ViewType } from '@/types/workflow';

const icons: Record<string, LucideIcon> = { BarChart3, Bot, Calendar, CreditCard, FileInput, Globe, LayoutDashboard, MessageSquare, Phone, Search, Send, Settings, Share2, Sparkles, Star, Users, Workflow };

export function BgosNavigation({ onLogout }: { onLogout?: () => void }) {
  const { auth, currentView, setCurrentView, leftSidebarOpen, mobileSidebarOpen, setMobileSidebarOpen } = useAppStore();
  const [search, setSearch] = useState('');
  const businessName = auth.tenant?.name || auth.workspace?.name || 'Your business';
  const userName = auth.user?.name || auth.user?.email || 'Your account';
  const activeView = bgosNavigationView(currentView);
  const navigate = (view: string) => { setCurrentView(view as ViewType); setMobileSidebarOpen(false); };
  const content = <>
    <button className="bgos-brand" onClick={() => navigate('dashboard')} aria-label="BGOS overview"><span className="bgos-brand-mark">b</span><strong>BGOS</strong><small>GROWTH OS</small></button>
    <button className="bgos-business" onClick={() => navigate('creatorProfile')}><span>{businessName.slice(0, 2).toUpperCase()}</span><span><strong>{businessName}</strong><small>Your growth workspace</small></span></button>
    <label className="bgos-nav-search"><Search size={15} /><input aria-label="Find a BGOS feature" value={search} onChange={e => setSearch(e.target.value)} placeholder="Find a feature…" /></label>
    <nav aria-label="BGOS main navigation" className="bgos-nav-links">{BGOS_NAVIGATION.map(section => {
      const items = section.items.filter(item => item.label.toLowerCase().includes(search.toLowerCase()));
      if (!items.length) return null;
      return <section key={section.title}><h2>{section.title}</h2>{items.map(item => { const Icon = icons[item.iconName] || Globe; return <button key={item.view} onClick={() => navigate(item.view)} aria-current={activeView === item.view ? 'page' : undefined}><Icon size={17} /><span>{item.label}</span></button>; })}</section>;
    })}{!BGOS_NAVIGATION.some(section => section.items.some(item => item.label.toLowerCase().includes(search.toLowerCase()))) && <p className="bgos-nav-empty">No matching features.</p>}</nav>
    <footer className="bgos-nav-footer"><button onClick={() => navigate('helpCenter')}><CircleHelp size={17} />Help & support</button><div className="bgos-account"><span className="bgos-avatar">{userName.slice(0, 2).toUpperCase()}</span><div><strong>{userName}</strong><small>{auth.user?.role?.replaceAll('_', ' ') || 'Workspace member'}</small></div>{onLogout && <button onClick={onLogout} aria-label="Sign out"><LogOut size={17} /></button>}</div></footer>
  </>;
  return <>
    {leftSidebarOpen && <aside className="bgos-sidebar hidden lg:flex">{content}</aside>}
    <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}><SheetContent side="left" className="bgos-mobile-sidebar p-0 w-[270px] gap-0"><SheetHeader className="sr-only"><SheetTitle>BGOS navigation</SheetTitle><SheetDescription>Navigate your growth workspace</SheetDescription></SheetHeader>{content}</SheetContent></Sheet>
  </>;
}


/** Uses the same destinations and drawer as desktop; no commerce quick actions. */
export function BgosMobileNavigation() {
  const currentView = useAppStore(s => s.currentView);
  const setView = useAppStore(s => s.setCurrentView);
  const setOpen = useAppStore(s => s.setMobileSidebarOpen);
  const items = [
    { view: 'dashboard', label: 'Overview', Icon: LayoutDashboard },
    { view: 'omnichannel', label: 'Inbox', Icon: MessageSquare },
    { view: 'leads', label: 'Leads & CRM', Icon: Users },
    { view: 'scheduling', label: 'Appointments', Icon: Calendar },
  ] as const;
  return <nav className="bgos-mobile-nav lg:hidden" aria-label="BGOS mobile navigation">{items.map(({ view, label, Icon }) => <button key={view} aria-current={bgosNavigationView(currentView) === view ? 'page' : undefined} onClick={() => setView(view)}><Icon size={19} /><span>{label}</span></button>)}<button onClick={() => setOpen(true)}><Menu size={19} /><span>More</span></button></nav>;
}

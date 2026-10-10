'use client';

import { useState } from 'react';
import {
  BarChart3,
  Bot,
  Calendar,
  CircleHelp,
  CreditCard,
  FileInput,
  Globe,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Phone,
  Search,
  Send,
  Settings,
  Share2,
  Sparkles,
  Star,
  Users,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { BgosBrand } from './brand';
import { BGOS_NAVIGATION, bgosNavigationView } from '../../../shared/bgos-navigation';
import { useAppStore } from '@/store/app-store';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import type { ViewType } from '@/types/workflow';

const icons: Record<string, LucideIcon> = {
  BarChart3,
  Bot,
  Calendar,
  CreditCard,
  FileInput,
  Globe,
  LayoutDashboard,
  MessageSquare,
  Phone,
  Search,
  Send,
  Settings,
  Share2,
  Sparkles,
  Star,
  Users,
  Workflow,
};

export function BgosNavigation({ onLogout }: { onLogout?: () => void }) {
  const { auth, currentView, setCurrentView, leftSidebarOpen, mobileSidebarOpen, setMobileSidebarOpen } = useAppStore();
  const [search, setSearch] = useState('');
  const userName = auth.user?.name || auth.user?.email || 'Your Account';
  const activeView = bgosNavigationView(currentView);

  const navigate = (view: string) => {
    setCurrentView(view as ViewType);
    setMobileSidebarOpen(false);
  };

  const content = (
    <>
      <button className="bgos-brand" onClick={() => navigate('dashboard')} aria-label="BGOS overview">
        <BgosBrand />
      </button>

      <label className="bgos-nav-search">
        <Search size={14} />
        <input
          aria-label="Find a BGOS feature"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter features..."
        />
      </label>

      <nav aria-label="BGOS main navigation" className="bgos-nav-links">
        {BGOS_NAVIGATION.map((section) => {
          const items = section.items.filter((item) =>
            item.label.toLowerCase().includes(search.toLowerCase())
          );
          if (!items.length) return null;

          return (
            <section key={section.title}>
              <h2>{section.title}</h2>
              {items.map((item) => {
                const Icon = icons[item.iconName] || Globe;
                const isActive = activeView === item.view;
                const badge = 'badge' in item ? (item as any).badge : undefined;

                return (
                  <button
                    key={item.view}
                    onClick={() => navigate(item.view)}
                    aria-current={isActive ? 'page' : undefined}
                    className="group"
                  >
                    <Icon size={16} className={isActive ? 'text-teal-700 dark:text-teal-300' : 'text-slate-500'} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {badge && (
                      <span
                        className={`ml-auto rounded-full px-1.5 py-0.2 text-[9px] font-bold leading-tight ${
                          badge === '12'
                            ? 'bg-rose-500 text-white'
                            : badge === 'AI'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                            : 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300'
                        }`}
                      >
                        {badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </section>
          );
        })}
        {!BGOS_NAVIGATION.some((section) =>
          section.items.some((item) => item.label.toLowerCase().includes(search.toLowerCase()))
        ) && <p className="bgos-nav-empty">No matching features.</p>}
      </nav>

      <footer className="bgos-nav-footer">
        <button onClick={() => navigate('helpCenter')}>
          <CircleHelp size={16} /> Help &amp; Support
        </button>
        <div className="bgos-account">
          <span className="bgos-avatar">{userName.slice(0, 2).toUpperCase()}</span>
          <div>
            <strong>{userName}</strong>
            <small>{auth.user?.role?.replaceAll('_', ' ') || 'Workspace Owner'}</small>
          </div>
          {onLogout && (
            <button onClick={onLogout} aria-label="Sign out" className="text-muted-foreground hover:text-foreground">
              <LogOut size={16} />
            </button>
          )}
        </div>
      </footer>
    </>
  );

  return (
    <>
      {leftSidebarOpen && <aside className="bgos-sidebar hidden lg:flex">{content}</aside>}
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="bgos-mobile-sidebar p-0 w-[270px] gap-0">
          <SheetHeader className="sr-only">
            <SheetTitle>BGOS Navigation</SheetTitle>
            <SheetDescription>Navigate your growth workspace</SheetDescription>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    </>
  );
}

/** Uses the same destinations and drawer as desktop; mobile bottom nav. */
export function BgosMobileNavigation() {
  const currentView = useAppStore((s) => s.currentView);
  const setView = useAppStore((s) => s.setCurrentView);
  const setOpen = useAppStore((s) => s.setMobileSidebarOpen);

  const items = [
    { view: 'dashboard', label: 'Overview', Icon: LayoutDashboard },
    { view: 'omnichannel', label: 'Inbox', Icon: MessageSquare },
    { view: 'leads', label: 'Leads & CRM', Icon: Users },
    { view: 'scheduling', label: 'Appointments', Icon: Calendar },
  ] as const;

  return (
    <nav className="bgos-mobile-nav lg:hidden" aria-label="BGOS mobile navigation">
      {items.map(({ view, label, Icon }) => (
        <button
          key={view}
          aria-current={bgosNavigationView(currentView) === view ? 'page' : undefined}
          onClick={() => setView(view)}
        >
          <Icon size={18} />
          <span>{label}</span>
        </button>
      ))}
      <button onClick={() => setOpen(true)}>
        <Menu size={18} />
        <span>More</span>
      </button>
    </nav>
  );
}

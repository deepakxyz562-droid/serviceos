'use client';

import {
  BarChart3,
  Bot,
  Calendar,
  CircleHelp,
  CreditCard,
  FileInput,
  Globe,
  Home,
  LayoutDashboard,
  Mail,
  Megaphone,
  Menu,
  MessageSquare,
  Phone,
  PhoneCall,
  Radio,
  Search,
  Send,
  Settings,
  Share2,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Star,
  Store,
  Ticket,
  Users,
  Workflow,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { BgosBrand } from './brand';
import { BGOS_NAVIGATION, bgosNavigationView } from '../../../shared/bgos-navigation';
import { useAppStore } from '@/store/app-store';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

import type { ViewType } from '@/types/workflow';

const icons: Record<string, LucideIcon> = {
  BarChart3,
  Bot,
  Calendar,
  CircleHelp,
  CreditCard,
  FileInput,
  Globe,
  Home,
  LayoutDashboard,
  Mail,
  Megaphone,
  MessageSquare,
  Phone,
  PhoneCall,
  Radio,
  Search,
  Send,
  Settings,
  Share2,
  Shield,
  Sparkles,
  Star,
  Store,
  Ticket,
  Users,
  Workflow,
};

export function BgosNavigation({ onLogout: _onLogout }: { onLogout?: () => void }) {
  const { currentView, setCurrentView, leftSidebarOpen, toggleLeftSidebar, mobileSidebarOpen, setMobileSidebarOpen } = useAppStore();
  const activeView = bgosNavigationView(currentView);

  const navigate = (view: string) => {
    setCurrentView(view as ViewType);
    setMobileSidebarOpen(false);
  };

  const content = (
    <>
      <div className="bgos-brand-header">
        <button className="bgos-brand" onClick={() => navigate('dashboard')} aria-label="BGOS overview">
          <BgosBrand />
        </button>
        <button
          type="button"
          onClick={toggleLeftSidebar}
          aria-label="Collapse sidebar"
          className="hidden lg:inline-flex items-center justify-center size-8 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <SlidersHorizontal size={15} />
        </button>
      </div>

      <nav aria-label="BGOS main navigation" className="bgos-nav-links">
        {BGOS_NAVIGATION.map((section) => {
          return (
            <section key={section.title}>
              <h2>{section.title}</h2>
              {section.items.map((item) => {
                const Icon = icons[item.iconName] || Globe;
                const isActive = activeView === item.view;
                const badge = 'badge' in item ? (item as { badge?: string }).badge : undefined;

                return (
                  <button
                    key={item.view}
                    onClick={() => navigate(item.view)}
                    aria-current={isActive ? 'page' : undefined}
                    className="group"
                  >
                    <Icon
                      size={17}
                      className={isActive ? 'text-[#009F50] dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}
                    />
                    <span className="flex-1 truncate">{item.label}</span>
                    {badge && (
                      <span
                        aria-hidden="true"
                        className="ml-auto inline-flex items-center justify-center rounded-full bg-[#009F50] px-2 py-0.5 text-[11px] font-bold leading-none text-white min-w-[24px] h-[20px]"
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
      </nav>

      <footer className="bgos-nav-footer">
        <button
          type="button"
          onClick={() => navigate('reviews')}
          className="bgos-get-reviews-card group"
        >
          <div className="size-9 rounded-xl bg-white dark:bg-slate-900 border border-[#ccebd9] dark:border-emerald-800/50 flex items-center justify-center shrink-0 text-[#009F50] shadow-2xs">
            <Star size={18} className="fill-[#009F50]/15 text-[#009F50]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-slate-900 dark:text-slate-100 leading-tight truncate">
              Get More Reviews
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5 truncate">
              Send review requests automatically
            </p>
          </div>
          <ChevronRight size={15} className="text-slate-400 group-hover:text-[#009F50] group-hover:translate-x-0.5 transition-all shrink-0" />
        </button>
      </footer>
    </>
  );

  return (
    <>
      {leftSidebarOpen && <aside className="bgos-sidebar hidden lg:flex">{content}</aside>}
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="bgos-mobile-sidebar p-0 w-[268px] gap-0">
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

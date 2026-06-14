'use client';

import { useAppStore } from '@/store/app-store';
import type { ViewType } from '@/types/workflow';
import {
  LayoutDashboard,
  Briefcase,
  Inbox,
  Users,
  Menu,
  ShieldCheck,
  Target,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileNavItem {
  view: ViewType;
  label: string;
  icon: React.ElementType;
}

const regularNavItems: MobileNavItem[] = [
  { view: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { view: 'jobs', label: 'Jobs', icon: Briefcase },
  { view: 'inbox', label: 'Inbox', icon: Inbox },
  { view: 'contacts', label: 'People', icon: Users },
];

const superadminNavItems: MobileNavItem[] = [
  { view: 'superadmin', label: 'Admin', icon: ShieldCheck },
  { view: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { view: 'leads', label: 'Leads', icon: Target },
  { view: 'settings', label: 'Settings', icon: Settings },
];

export function MobileBottomNav() {
  const { currentView, setCurrentView, toggleMobileSidebar, auth } = useAppStore();

  const isSuperAdmin = !!(auth.user?.isSuperAdmin || auth.user?.role === 'superadmin' || auth.user?.role === 'super_admin' || (auth.user?.role === 'admin' && !auth.user?.tenantId));
  const navItems = isSuperAdmin ? superadminNavItems : regularNavItems;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-background border-t border-border shadow-[0_-1px_3px_rgba(0,0,0,0.05)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.view;

          return (
            <button
              key={item.view}
              onClick={() => setCurrentView(item.view)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors',
                'touch-target min-w-[48px]',
                isActive
                  ? isSuperAdmin
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className={cn('size-5', isActive && 'stroke-[2.5px]')} />
              <span className={cn(
                'text-[10px] font-medium leading-tight',
                isActive && 'font-semibold'
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
        {/* More menu button */}
        <button
          onClick={toggleMobileSidebar}
          className={cn(
            'flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors',
            'touch-target min-w-[48px] text-muted-foreground hover:text-foreground'
          )}
          aria-label="More menu"
        >
          <Menu className="size-5" />
          <span className="text-[10px] font-medium leading-tight">More</span>
        </button>
      </div>
    </nav>
  );
}

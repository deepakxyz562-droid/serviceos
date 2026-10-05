'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/app-store';
import type { ViewType } from '@/types/workflow';
import {
  LayoutDashboard,
  Briefcase,
  RadioTower,
  Users,
  Menu,
  ShieldCheck,
  Target,
  Settings,
  Calendar,
  Sparkles,
  Bot,
  FileInput,
  CalendarCheck,
  ShoppingBag,
  Receipt,
  ShoppingCart,
  UtensilsCrossed,
  ChefHat,
  Store,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { checkMenuAccess } from '@/components/layout/upgrade-modal';
import { resolvePlanTierClient } from '@/lib/plan-features';
import { getMobileNavTabsForBlueprint } from '@/lib/blueprint';

interface MobileNavItem {
  view: ViewType;
  tab?: string;
  label: string;
  icon: React.ElementType;
}

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard,
  ShoppingBag,
  ShoppingCart,
  UtensilsCrossed,
  ChefHat,
  Calendar,
  Users,
  Briefcase,
  Package,
  Store,
  FileText: Receipt,
};

const ownerNavCandidates: MobileNavItem[] = [
  { view: 'dashboard', label: 'Today', icon: LayoutDashboard },
  { view: 'commerce', label: 'Orders', icon: ShoppingBag },
  { view: 'quoteFlow', label: 'Billing', icon: Receipt },
  { view: 'customers', label: 'Customers', icon: Users },
  { view: 'jobs', label: 'Jobs', icon: Briefcase },
  { view: 'omnichannel', label: 'Inbox', icon: RadioTower },
  { view: 'aiAssistant', label: 'AI Copilot', icon: Sparkles },
  { view: 'contacts', label: 'People', icon: Users },
  { view: 'calendar', label: 'Calendar', icon: Calendar },
  { view: 'leads', label: 'Leads', icon: Target },
];

const standaloneNavCandidates: MobileNavItem[] = [
  { view: 'formsDashboard', label: 'Today', icon: LayoutDashboard },
  { view: 'commerce', label: 'Orders', icon: ShoppingBag },
  { view: 'quoteFlow', label: 'Billing', icon: Receipt },
  { view: 'customers', label: 'Customers', icon: Users },
  { view: 'formBuilder', label: 'Forms', icon: FileInput },
  { view: 'agentStudio', label: 'AI Agent', icon: Bot },
  { view: 'booking', label: 'Bookings', icon: CalendarCheck },
  { view: 'omnichannel', label: 'Inbox', icon: RadioTower },
  { view: 'leads', label: 'Leads', icon: Target },
];

const superadminNavItems: MobileNavItem[] = [
  { view: 'superadmin', label: 'Admin', icon: ShieldCheck },
  { view: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { view: 'aiAssistant', label: 'AI Copilot', icon: Sparkles },
  { view: 'leads', label: 'Leads', icon: Target },
  { view: 'settings', label: 'Settings', icon: Settings },
];

export interface MobileBottomNavProps {
  onLogout?: () => void;
}

export function MobileBottomNav({ onLogout }: MobileBottomNavProps = {}) {
  const { currentView, setCurrentView, toggleMobileSidebar, auth, blueprint } = useAppStore();

  // null = "still loading visibility config" — prevents the flash-of-all-menus
  // bug on mobile (mirrors sidebar.tsx). Empty array [] = "loaded, nothing disabled".
  const [disabledMenus, setDisabledMenus] = useState<string[] | null>(null);

  const isSuperAdmin = !!(auth.user?.isSuperAdmin || auth.user?.role === 'superadmin' || auth.user?.role === 'super_admin' || (auth.user?.role === 'admin' && !auth.user?.tenantId));

  // Fetch menu visibility for non-superadmin users (mirrors sidebar.tsx).
  // Superadmin bypasses the fetch entirely.
  useEffect(() => {
    if (isSuperAdmin) return;
    let cancelled = false;
    async function fetchMenuVisibility() {
      try {
        const res = await fetch('/api/menu-visibility?XTransformPort=3000');
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setDisabledMenus(data.disabledMenus || []);
        } else {
          if (!cancelled) setDisabledMenus([]);
        }
      } catch {
        // Silently fail — fall back to "nothing disabled" so the nav remains
        // usable even if the menu-visibility endpoint errors.
        if (!cancelled) setDisabledMenus([]);
      }
    }
    fetchMenuVisibility();
    return () => { cancelled = true; };
  }, [auth.user?.role, auth.user?.tenantId, auth.user?.isSuperAdmin, isSuperAdmin]);

  const planTier = resolvePlanTierClient(
    auth.tenant?.plan || 'starter',
    auth.tenant?.planStatus || 'active'
  );

  const isStandaloneTenant =
    !isSuperAdmin &&
    ((auth.tenant as any)?.signupMode === 'standalone' ||
     (auth.tenant as any)?.plan === 'standalone_starter' ||
     (auth.tenant as any)?.plan === 'standalone_business' ||
     (auth.tenant as any)?.productType === 'forms' ||
     (auth.workspace as any)?.productType === 'forms' ||
     (auth.tenant as any)?.productType === 'gptform' ||
     (auth.workspace as any)?.productType === 'gptform' ||
     String((auth.tenant as any)?.plan || '').startsWith('standalone') ||
     (auth.user as any)?.role === 'standalone_user' ||
     ['formsDashboard', 'formBuilder', 'agentStudio', 'formSubmissions', 'formAppointments', 'creatorProfile', 'creatorOffers', 'commerce'].includes(currentView));

  const dynamicBlueprintTabs = getMobileNavTabsForBlueprint(blueprint);
  const standaloneNavItems: MobileNavItem[] = dynamicBlueprintTabs.map((t) => ({
    view: t.view as ViewType,
    tab: t.tab,
    label: t.label,
    icon: ICON_MAP[t.iconName] || LayoutDashboard,
  }));

  const navItems: MobileNavItem[] = isSuperAdmin
    ? superadminNavItems
    : isStandaloneTenant
      ? standaloneNavItems
      : disabledMenus === null
        ? []  // loading — render no items (just the More button) to prevent flash
        : ownerNavCandidates
            .filter((item) => !disabledMenus.includes(item.view))
            .filter((item) => {
              const access = checkMenuAccess(item.view, planTier, isSuperAdmin, auth.tenant?.planStatus);
              return access.state !== 'hidden' && access.state !== 'locked';
            })
            .slice(0, 4);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-background border-t border-border shadow-[0_-1px_3px_rgba(0,0,0,0.05)]"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.view;

          return (
            <button
              key={`${item.view}-${item.tab || ''}`}
              onClick={() => {
                if (item.tab && typeof window !== 'undefined') {
                  sessionStorage.setItem('nuvora_commerce_tab', item.tab);
                  window.dispatchEvent(new CustomEvent('nuvora_switch_commerce_tab', { detail: item.tab }));
                }
                setCurrentView(item.view);
              }}
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

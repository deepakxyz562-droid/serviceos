'use client';
import { isGptFormWorkspace, isChatbotlyWorkspace } from '../../../shared/product-context';

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
  Plus,
  X,
  PhoneCall,
  LogOut,
  Send,
  FileText,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { checkMenuAccess } from '@/components/layout/upgrade-modal';
import { resolvePlanTierClient } from '@/lib/plan-features';
import { getMobileNavTabsForBlueprint, BUSINESS_TYPE_LABELS } from '@/lib/blueprint';
import { performClientLogout } from '@/lib/client-auth';
import { homeText } from '../../../shared/business-home';

interface MobileNavItem {
  view: ViewType;
  tab?: string;
  label: string;
  icon: React.ElementType;
}

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard,
  RadioTower,
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
  { view: 'invoices', label: 'Invoices', icon: Receipt },
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
  { view: 'invoices', label: 'Invoices', icon: Receipt },
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
  const [actionSheetOpen, setActionSheetOpen] = useState(false);

  const businessType = blueprint?.businessType || 'retail';
  const typeMeta = BUSINESS_TYPE_LABELS[businessType] || BUSINESS_TYPE_LABELS.retail;

  const openCommerceTab = (tab: string) => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('nuvora_commerce_tab', tab);
      window.dispatchEvent(new CustomEvent('nuvora_switch_commerce_tab', { detail: tab }));
    }
    setCurrentView('commerce');
    setActionSheetOpen(false);
  };

  const navigateTo = (view: ViewType) => {
    setCurrentView(view);
    setActionSheetOpen(false);
  };

  const handleWizard = (type: 'form' | 'agent') => {
    useAppStore.getState().openCreateFormWizard(type);
    setActionSheetOpen(false);
  };

  const handleLogout = () => {
    setActionSheetOpen(false);
    if (onLogout) onLogout();
    else void performClientLogout();
  };

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

  const isStandaloneTenant = isGptFormWorkspace(auth);

  const dynamicBlueprintTabs = isChatbotlyWorkspace(auth) ? [
    { view: 'dashboard', label: 'Home', iconName: 'LayoutDashboard', tab: undefined },
    { view: 'omnichannel', label: 'Inbox', iconName: 'RadioTower', tab: undefined },
    { view: 'contacts', label: 'Contacts', iconName: 'Users', tab: undefined },
    { view: 'scheduling', label: 'Bookings', iconName: 'Calendar', tab: undefined },
  ] : getMobileNavTabsForBlueprint(blueprint || undefined);
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
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-background border-t border-border shadow-[0_-1px_3px_rgba(0,0,0,0.05)]"
        aria-label="Mobile navigation"
      >
        <div className="flex items-center justify-around h-16">
          {isStandaloneTenant ? (
            <>
              {standaloneNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.view && (!item.tab || (typeof window !== 'undefined' && sessionStorage.getItem('nuvora_commerce_tab') === item.tab));
                return <button key={`${item.view}-${item.tab || item.label}`} onClick={() => {
                  if (item.tab) {
                    sessionStorage.setItem('nuvora_commerce_tab', item.tab);
                    window.dispatchEvent(new CustomEvent('nuvora_switch_commerce_tab', { detail: item.tab }));
                  }
                  setCurrentView(item.view);
                }} className={cn('flex flex-1 h-full min-w-[48px] flex-col items-center justify-center gap-1', isActive ? 'text-emerald-600' : 'text-muted-foreground')} aria-label={item.label} aria-current={isActive ? 'page' : undefined}>
                  <Icon className="size-5" /><span className="text-[11px] font-medium">{item.label}</span>
                </button>;
              })}

              {/* More menu button */}
              <button
                onClick={toggleMobileSidebar}
                className="flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors touch-target min-w-[48px] text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="More menu"
              >
                <Menu className="size-5" />
                <span className="text-[10px] font-medium leading-tight">{homeText('more', blueprint?.language)}</span>
              </button>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </nav>

      {/* ── PHASE 2: INSTANT GLOBAL ACTION SHEET ── */}
      {actionSheetOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setActionSheetOpen(false)}
          />

          {/* Slide-up Sheet */}
          <div className="relative z-10 w-full max-h-[85vh] rounded-t-3xl bg-background border-t border-border p-5 pb-8 shadow-2xl overflow-y-auto animate-in slide-in-from-bottom duration-200 space-y-4">
            {/* Grabber Handle */}
            <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto" />

            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-foreground">Quick Action</h3>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300 text-[10px] font-black py-0">
                    <span>{typeMeta.icon}</span>
                    <span className="ml-1">{typeMeta.label}</span>
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Instant business shortcuts for today</p>
              </div>
              <button
                type="button"
                onClick={() => setActionSheetOpen(false)}
                className="size-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Vertical Primary Actions Grid */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                ⚡ 1-Tap Shortcuts
              </span>

              <div className="grid grid-cols-2 gap-2.5">
                {businessType === 'restaurant' && (
                  <>
                    <button
                      type="button"
                      onClick={() => openCommerceTab('pos')}
                      className="flex items-center gap-2.5 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 text-foreground text-left transition active:scale-95 cursor-pointer"
                    >
                      <ShoppingCart className="size-5 text-emerald-600 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-emerald-950 dark:text-emerald-300">+ New Order</div>
                        <div className="text-[10px] text-muted-foreground">Counter &amp; POS</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => openCommerceTab('dineIn')}
                      className="flex items-center gap-2.5 p-3 rounded-xl border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20 text-foreground text-left transition active:scale-95 cursor-pointer"
                    >
                      <UtensilsCrossed className="size-5 text-amber-600 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-amber-950 dark:text-amber-300">Open Tables</div>
                        <div className="text-[10px] text-muted-foreground">Floor layout</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => openCommerceTab('kds')}
                      className="flex items-center gap-2.5 p-3 rounded-xl border border-purple-500/20 bg-purple-500/10 hover:bg-purple-500/20 text-foreground text-left transition active:scale-95 cursor-pointer"
                    >
                      <ChefHat className="size-5 text-purple-600 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-purple-950 dark:text-purple-300">Kitchen KDS</div>
                        <div className="text-[10px] text-muted-foreground">Live tickets</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => openCommerceTab('catalog')}
                      className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-left transition active:scale-95 cursor-pointer"
                    >
                      <Store className="size-5 text-stone-600 shrink-0" />
                      <div>
                        <div className="text-xs font-bold">+ Menu Item</div>
                        <div className="text-[10px] text-muted-foreground">Dishes &amp; prices</div>
                      </div>
                    </button>
                  </>
                )}

                {businessType === 'salon' && (
                  <>
                    <button
                      type="button"
                      onClick={() => navigateTo('booking')}
                      className="flex items-center gap-2.5 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 text-foreground text-left transition active:scale-95 cursor-pointer"
                    >
                      <Calendar className="size-5 text-emerald-600 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-emerald-950 dark:text-emerald-300">+ Appointment</div>
                        <div className="text-[10px] text-muted-foreground">Schedule slot</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => openCommerceTab('pos')}
                      className="flex items-center gap-2.5 p-3 rounded-xl border border-purple-500/20 bg-purple-500/10 hover:bg-purple-500/20 text-foreground text-left transition active:scale-95 cursor-pointer"
                    >
                      <ShoppingCart className="size-5 text-purple-600 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-purple-950 dark:text-purple-300">+ Walk-in Sale</div>
                        <div className="text-[10px] text-muted-foreground">Register checkout</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateTo('customers')}
                      className="flex items-center gap-2.5 p-3 rounded-xl border border-blue-500/20 bg-blue-500/10 hover:bg-blue-500/20 text-foreground text-left transition active:scale-95 cursor-pointer"
                    >
                      <Users className="size-5 text-blue-600 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-blue-950 dark:text-blue-300">+ Add Client</div>
                        <div className="text-[10px] text-muted-foreground">Client history</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => openCommerceTab('catalog')}
                      className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-left transition active:scale-95 cursor-pointer"
                    >
                      <Package className="size-5 text-stone-600 shrink-0" />
                      <div>
                        <div className="text-xs font-bold">+ Service/Product</div>
                        <div className="text-[10px] text-muted-foreground">Pricing &amp; stock</div>
                      </div>
                    </button>
                  </>
                )}

                {businessType === 'services' && (
                  <>
                    <button
                      type="button"
                      onClick={() => openCommerceTab('orders')}
                      className="flex items-center gap-2.5 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 text-foreground text-left transition active:scale-95 cursor-pointer"
                    >
                      <Briefcase className="size-5 text-emerald-600 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-emerald-950 dark:text-emerald-300">+ New Job</div>
                        <div className="text-[10px] text-muted-foreground">Dispatch work</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateTo('booking')}
                      className="flex items-center gap-2.5 p-3 rounded-xl border border-purple-500/20 bg-purple-500/10 hover:bg-purple-500/20 text-foreground text-left transition active:scale-95 cursor-pointer"
                    >
                      <Calendar className="size-5 text-purple-600 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-purple-950 dark:text-purple-300">+ Schedule Visit</div>
                        <div className="text-[10px] text-muted-foreground">Calendar event</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => openCommerceTab('billing')}
                      className="flex items-center gap-2.5 p-3 rounded-xl border border-blue-500/20 bg-blue-500/10 hover:bg-blue-500/20 text-foreground text-left transition active:scale-95 cursor-pointer"
                    >
                      <FileText className="size-5 text-blue-600 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-blue-950 dark:text-blue-300">+ Create Quote</div>
                        <div className="text-[10px] text-muted-foreground">Price estimate</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateTo('customers')}
                      className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-left transition active:scale-95 cursor-pointer"
                    >
                      <Users className="size-5 text-stone-600 shrink-0" />
                      <div>
                        <div className="text-xs font-bold">+ Customer</div>
                        <div className="text-[10px] text-muted-foreground">CRM contact</div>
                      </div>
                    </button>
                  </>
                )}

                {businessType === 'online_store' && (
                  <>
                    <button
                      type="button"
                      onClick={() => openCommerceTab('catalog')}
                      className="flex items-center gap-2.5 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 text-foreground text-left transition active:scale-95 cursor-pointer"
                    >
                      <Store className="size-5 text-emerald-600 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-emerald-950 dark:text-emerald-300">+ Add Product</div>
                        <div className="text-[10px] text-muted-foreground">Store catalog</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => openCommerceTab('orders')}
                      className="flex items-center gap-2.5 p-3 rounded-xl border border-blue-500/20 bg-blue-500/10 hover:bg-blue-500/20 text-foreground text-left transition active:scale-95 cursor-pointer"
                    >
                      <ShoppingBag className="size-5 text-blue-600 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-blue-950 dark:text-blue-300">View Orders</div>
                        <div className="text-[10px] text-muted-foreground">Store shipments</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateTo('agentStudio')}
                      className="flex items-center gap-2.5 p-3 rounded-xl border border-purple-500/20 bg-purple-500/10 hover:bg-purple-500/20 text-foreground text-left transition active:scale-95 cursor-pointer"
                    >
                      <Bot className="size-5 text-purple-600 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-purple-950 dark:text-purple-300">AI Web Agent</div>
                        <div className="text-[10px] text-muted-foreground">Conversational bot</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigateTo('formBuilder')}
                      className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-left transition active:scale-95 cursor-pointer"
                    >
                      <FileInput className="size-5 text-stone-600 shrink-0" />
                      <div>
                        <div className="text-xs font-bold">+ Intake Form</div>
                        <div className="text-[10px] text-muted-foreground">Lead capture</div>
                      </div>
                    </button>
                  </>
                )}

                {businessType !== 'restaurant' && businessType !== 'salon' && businessType !== 'services' && businessType !== 'online_store' && (
                  <>
                    <button
                      type="button"
                      onClick={() => openCommerceTab('pos')}
                      className="flex items-center gap-2.5 p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 text-foreground text-left transition active:scale-95 cursor-pointer"
                    >
                      <ShoppingCart className="size-5 text-emerald-600 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-emerald-950 dark:text-emerald-300">+ New Sale (POS)</div>
                        <div className="text-[10px] text-muted-foreground">Counter register</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => openCommerceTab('catalog')}
                      className="flex items-center gap-2.5 p-3 rounded-xl border border-blue-500/20 bg-blue-500/10 hover:bg-blue-500/20 text-foreground text-left transition active:scale-95 cursor-pointer"
                    >
                      <Package className="size-5 text-blue-600 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-blue-950 dark:text-blue-300">+ Add Product</div>
                        <div className="text-[10px] text-muted-foreground">Inventory &amp; SKU</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => openCommerceTab('khata')}
                      className="flex items-center gap-2.5 p-3 rounded-xl border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20 text-foreground text-left transition active:scale-95 cursor-pointer"
                    >
                      <Users className="size-5 text-amber-600 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-amber-950 dark:text-amber-300">Record Khata</div>
                        <div className="text-[10px] text-muted-foreground">Udhaar payment</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => openCommerceTab('billing')}
                      className="flex items-center gap-2.5 p-3 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-left transition active:scale-95 cursor-pointer"
                    >
                      <Receipt className="size-5 text-stone-600 shrink-0" />
                      <div>
                        <div className="text-xs font-bold">+ GST / Invoice</div>
                        <div className="text-[10px] text-muted-foreground">Bill generation</div>
                      </div>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* AI & Automation Builders */}
            <div className="space-y-1.5 pt-2 border-t border-border">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                🤖 AI &amp; Ecosystem Builders
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleWizard('form')}
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/15 text-foreground text-left transition cursor-pointer"
                >
                  <Sparkles className="size-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-bold">AI Form Wizard</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo('agentStudio')}
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/15 text-foreground text-left transition cursor-pointer"
                >
                  <Bot className="size-4 text-blue-600 shrink-0" />
                  <span className="text-xs font-bold">AI Agent Studio</span>
                </button>
              </div>
            </div>

            {/* Logout shortcut */}
            <div className="pt-2 border-t border-border">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl border border-red-200 dark:border-red-900/40 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-bold transition cursor-pointer"
              >
                <LogOut className="size-4" />
                <span>Sign Out from Account</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

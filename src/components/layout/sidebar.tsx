'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '@/store/app-store';
import { useBelowLg } from '@/hooks/use-mobile';
import { prefetchView } from '@/lib/view-prefetch';
import type { ViewType } from '@/types/workflow';
import { BrandMark } from '@/components/brand/brand-mark';
import {
  LayoutDashboard,
  Target,
  Briefcase,
  Radio,
  Users,
  Activity,
  KeyRound,
  FileText,
  BarChart3,
  Variable,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  LogOut,
  Crown,
  Globe,
  UserCircle,
  Megaphone,
  Filter,
  RefreshCw,
  Bot,
  Sparkles,
  PhoneCall,
  GitBranch,
  Kanban,
  RadioTower,
  ShieldCheck,
  ScrollText,
  History,
  UserCog,
  Eye,
  Send,
  LayoutTemplate,
  CalendarCheck,
  Calendar,
  Star,
  BookOpen,
  Receipt,
  Zap,
  Search,
  Shield,
  Plug,
  ShoppingBag,
  FolderTree,
  Tag as TagIcon,
  Upload,
  Download,
  Mail,
  LifeBuoy,
  Ticket,
  Megaphone as MegaphoneIcon,
  TrendingUp,
  Wallet,
  Clock,
  Lock,
  Repeat,
  Store,
  CreditCard,
  Wrench as WrenchIcon,
  PenSquare,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { openUpgradeModal, checkMenuAccess } from '@/components/layout/upgrade-modal';
import { resolvePlanTierClient, PLAN_DISPLAY_NAMES } from '@/lib/plan-features';

// ─── Nav item definition ────────────────────────────────────────────────────

interface NavItem {
  view: ViewType;
  label: string;
  icon: React.ElementType;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
  collapsible?: boolean;      // if true, section can be collapsed by clicking its title
  defaultCollapsed?: boolean; // if true, section starts collapsed (desktop expanded mode only)
}

// ─── Navigation sections — organized by module structure (8 sections) ──────

const ownerNavSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { view: 'calendar', label: 'Calendar', icon: Calendar },
      { view: 'reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  {
    title: 'CRM',
    items: [
      // Pipeline is the primary sales view — a Deal-based drag-and-drop
      // Kanban. Sits above Leads so it's the first CRM destination users
      // reach. (Lead-based inline Kanban was removed from leads-view.tsx —
      // Pipeline is now the single source of truth for the sales board.)
      { view: 'salesPipeline', label: 'Pipeline', icon: Kanban },
      { view: 'leads', label: 'Leads', icon: Target },
      { view: 'customers', label: 'Customers', icon: Users },
      { view: 'reviews', label: 'Reviews', icon: Star },
    ],
  },
  {
    title: 'Operations',
    items: [
      { view: 'jobs', label: 'Jobs', icon: Briefcase },
      { view: 'booking', label: 'Booking', icon: CalendarCheck },
      { view: 'dispatch', label: 'Live Dispatch', icon: Radio },
      { view: 'employees', label: 'Employees', icon: UserCog },
      { view: 'recurringJobs', label: 'Recurring Jobs', icon: Repeat },
      // ── Inventory (Phase 3 audit fix) ──
      // Catalog entry exists in MENU_CATALOG (key='inventory', minPlan='business')
      // and the view is mapped in app-layout.tsx, but the sidebar nav item was
      // missing — making the entire Inventory module unreachable from the UI.
      // Plan gating is auto-applied by checkMenuAccess() (Lock icon for trial,
      // hidden for paid starter/growth). Menu-visibility toggle (superadmin
      // Menu Management) also honours this entry.
      { view: 'inventory', label: 'Inventory', icon: Package },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { view: 'campaigns', label: 'Email Campaigns', icon: Megaphone },
      { view: 'broadcast', label: 'Broadcast', icon: Send },
      { view: 'segments', label: 'Segments', icon: Filter },
      // Template Studio + Retargeting removed from sidebar — merged into Campaigns (Jobber style).
      // To restore: add back { view: 'templateStudio', label: 'Template Studio', icon: LayoutTemplate }
      // and { view: 'retargeting', label: 'Retargeting', icon: RefreshCw }
      { view: 'marketingAnalytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'Inbox & Automation',
    items: [
      { view: 'omnichannel', label: 'Omnichannel Inbox', icon: RadioTower },
      { view: 'aiAssistant', label: 'AI Assistant', icon: Sparkles },
      { view: 'chatbotBuilder', label: 'Chatbot Builder', icon: Bot },
      { view: 'workflowAutomations', label: 'Automations', icon: GitBranch },
      { view: 'triggers', label: 'Triggers', icon: Zap },
      { view: 'variables', label: 'Variables', icon: Variable },
      // Social Publishing moved here from the old 'Content' section so all
      // customer-facing communication lives in one place.
      { view: 'socialAccounts', label: 'Social Accounts', icon: Plug },
      { view: 'postComposer', label: 'Create Post', icon: PenSquare },
      { view: 'postsList', label: 'Posts', icon: FileText },
      { view: 'socialAnalytics', label: 'Social Analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'AI Receptionist',
    items: [
      { view: 'aiReceptionist', label: 'AI Receptionist', icon: PhoneCall, badge: 'Free' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { view: 'quotes', label: 'Quotes', icon: Receipt },
      { view: 'invoices', label: 'Invoices', icon: FileText },
      { view: 'expenses', label: 'Expenses', icon: Wallet },
    ],
  },
  {
    title: 'Marketplace',
    items: [
      { view: 'marketplaceDashboard', label: 'My Listing', icon: Store },
      { view: 'claimBusiness', label: 'Claim Business', icon: ShieldCheck },
    ],
  },
  // The 'Content' section was removed — Social Accounts, Create Post,
  // Posts, and Social Analytics have been moved into 'Inbox & Automation'
  // above so all communication channels live together.
  {
    title: 'Setup & Admin',
    collapsible: true,
    defaultCollapsed: true,
    items: [
      { view: 'settings', label: 'Settings', icon: Settings },
      // Brand Brain moved INTO the Settings page (as a settings section).
      // It was previously hidden inside this collapsed section, making it
      // hard to discover. Now accessible via Settings → Business → Brand Brain.
    ],
  },
];

const employeeNavSections: NavSection[] = [
  {
    title: 'My Work',
    items: [
      { view: 'employeePortal', label: 'My Jobs', icon: Briefcase },
      { view: 'timesheet', label: 'Timesheet', icon: Clock },
      { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Finance',
    items: [
      { view: 'expenses', label: 'Expenses', icon: Wallet },
    ],
  },
  {
    title: 'Account',
    items: [
      { view: 'settings', label: 'Settings', icon: Settings },
    ],
  },
];

// ─── Listing-only Navigation ────────────────────────────────────────────────
// Minimal sidebar for tenants with signupMode='listing_only' (free marketplace
// listing, no CRM). They only see their marketplace page (which now also
// contains the Business details card for editing name/phone/email/category),
// services, and a billing/upgrade CTA. All CRM features (pipeline, leads,
// jobs, dispatch, invoices, omnichannel, AI, marketing) are hidden — they're
// blocked at the API layer too (see src/lib/require-crm-tenant.ts).
// NOTE: the standalone Settings page is intentionally removed for listing-only
// tenants — their editable business details now live inside the "My Listing"
// page (see ListingProviderDashboard → BusinessDetailsCard). city and
// marketplace-opt-in are edited in the My Listing page's PublicHubTab.
const listingOnlyNavSections: NavSection[] = [
  {
    title: 'Marketplace',
    items: [
      { view: 'marketplaceDashboard', label: 'My Listing', icon: Store },
      { view: 'claimBusiness', label: 'Claim Business', icon: ShieldCheck },
      { view: 'serviceCatalog', label: 'Services', icon: WrenchIcon },
    ],
  },
  {
    title: 'Account',
    items: [
      { view: 'billing', label: 'Upgrade to CRM', icon: CreditCard, badge: 'UPGRADE' },
      { view: 'helpCenter', label: 'Help & Support', icon: LifeBuoy },
    ],
  },
];

// ─── Dedicated Superadmin Navigation (mirrors owner structure minus portals) ─
// Superadmin has a platform-focused sidebar: Admin Panel + Platform on top, then
// the same 8 module sections as owner (omitting Customer/Employee Portal which
// are tenant-user features). No collapsible flags — superadmin has fewer items.

const superadminNavSections: NavSection[] = [
  {
    title: 'Admin Panel',
    items: [
      { view: 'superadmin', label: 'Dashboard', icon: ShieldCheck, badge: 'SA' },
    ],
  },
  {
    title: 'Platform',
    items: [
      { view: 'dashboard', label: 'App Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Overview',
    items: [
      { view: 'calendar', label: 'Calendar', icon: Calendar },
      { view: 'reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  {
    title: 'CRM',
    items: [
      { view: 'salesPipeline', label: 'Pipeline', icon: Kanban },
      { view: 'leads', label: 'Leads', icon: Target },
      { view: 'customers', label: 'Customers', icon: Users },
    ],
  },
  {
    title: 'Operations',
    items: [
      { view: 'jobs', label: 'Jobs', icon: Briefcase },
      { view: 'booking', label: 'Booking', icon: CalendarCheck },
      { view: 'employees', label: 'Employees', icon: UserCog },
      { view: 'recurringJobs', label: 'Recurring Jobs', icon: Repeat },
      // ── Inventory (Phase 3 audit fix) ──
      // Mirrors the ownerNavSections entry. Superadmins bypass plan gating
      // so they always see the item unlocked.
      { view: 'inventory', label: 'Inventory', icon: Package },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { view: 'campaigns', label: 'Email Campaigns', icon: Megaphone },
      { view: 'broadcast', label: 'Broadcast', icon: Send },
      { view: 'segments', label: 'Segments', icon: Filter },
      // Template Studio + Retargeting removed from sidebar — merged into Campaigns (Jobber style).
      // To restore: add back { view: 'templateStudio', label: 'Template Studio', icon: LayoutTemplate }
      // and { view: 'retargeting', label: 'Retargeting', icon: RefreshCw }
      { view: 'marketingAnalytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'Inbox & Automation',
    items: [
      { view: 'omnichannel', label: 'Omnichannel Inbox', icon: RadioTower },
      { view: 'aiAssistant', label: 'AI Assistant', icon: Sparkles },
      { view: 'chatbotBuilder', label: 'Chatbot Builder', icon: Bot },
      { view: 'workflowAutomations', label: 'Automations', icon: GitBranch },
      { view: 'triggers', label: 'Triggers', icon: Zap },
      { view: 'variables', label: 'Variables', icon: Variable },
    ],
  },
  {
    title: 'AI Receptionist',
    items: [
      { view: 'aiReceptionist', label: 'AI Receptionist', icon: PhoneCall, badge: 'Free' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { view: 'quotes', label: 'Quotes', icon: Receipt },
      { view: 'invoices', label: 'Invoices', icon: FileText },
      { view: 'expenses', label: 'Expenses', icon: Wallet },
    ],
  },
  {
    title: 'Setup & Admin',
    items: [
      { view: 'settings', label: 'Settings', icon: Settings },
      // Brand Brain moved into the Settings page.
      { view: 'helpAdminTickets', label: 'Support Tickets', icon: Ticket },
      { view: 'helpAdminKB', label: 'Knowledge Base', icon: BookOpen },
      { view: 'helpAdminCategories', label: 'Categories', icon: FolderTree },
      { view: 'helpAdminAnnouncements', label: 'Announcements', icon: MegaphoneIcon },
    ],
  },
];

// ─── HardHat icon (not in lucide) ────────────────────────────────────────
function HardHat(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={props.className}>
      <path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2z"/>
      <path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/>
      <path d="M4 15v-3a8 8 0 0 1 16 0v3"/>
    </svg>
  );
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface AppSidebarProps {
  onLogout?: () => void;
}

// ─── "+ Create" quick-action menu ────────────────────────────────────────────

type CreateEntity = 'lead' | 'customer' | 'job' | 'invoice' | 'campaign';

interface CreateMenuProps {
  isMobile: boolean;
  leftSidebarOpen: boolean;
  onSelect: (view: ViewType, entity: CreateEntity) => void;
}

function CreateMenu({ isMobile, leftSidebarOpen, onSelect }: CreateMenuProps) {
  const isExpanded = isMobile || leftSidebarOpen;
  const items: { view: ViewType; entity: CreateEntity; label: string; icon: React.ElementType }[] = [
    { view: 'leads', entity: 'lead', label: 'New Lead', icon: Target },
    { view: 'customers', entity: 'customer', label: 'New Customer', icon: Users },
    { view: 'jobs', entity: 'job', label: 'New Job', icon: Briefcase },
    { view: 'invoices', entity: 'invoice', label: 'New Invoice', icon: FileText },
    { view: 'campaigns', entity: 'campaign', label: 'New Email Campaign', icon: Megaphone },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Create"
          title="Create"
          className={cn(
            'flex items-center rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors shadow-sm shadow-emerald-900/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400',
            isExpanded ? 'w-full h-9 px-3 gap-2 text-sm' : 'w-full h-9 justify-center'
          )}
        >
          <Plus className="size-4 shrink-0" />
          {isExpanded && <span className="flex-1 text-left">Create</span>}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={isExpanded ? 'bottom' : 'right'}
        align="start"
        sideOffset={6}
        className="w-52"
      >
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <DropdownMenuItem
              key={item.view}
              onClick={() => onSelect(item.view, item.entity)}
              className="cursor-pointer hover:bg-emerald-500/10 hover:text-emerald-700 focus:bg-emerald-500/10 focus:text-emerald-700"
            >
              <Icon className="size-4 mr-2 text-emerald-600" />
              <span>{item.label}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Sidebar Content (shared between desktop and mobile) ────────────────────

function SidebarContent({ onLogout, isMobile = false }: AppSidebarProps & { isMobile?: boolean }) {
  const {
    currentView,
    setCurrentView,
    leftSidebarOpen,
    toggleLeftSidebar,
    setMobileSidebarOpen,
    setPendingCreate,
    auth,
  } = useAppStore();

  const [disabledMenus, setDisabledMenus] = useState<string[]>([]);
  // User-explicit overrides of each section's collapsed state. The effective
  // collapsed state is derived: override wins if present, otherwise the
  // section's `defaultCollapsed` flag applies. This avoids a setState-in-effect
  // for initialization (the override map starts empty and is only mutated by
  // user clicks).
  const [collapsedOverrides, setCollapsedOverrides] = useState<Record<string, boolean>>({});

  // Compute isSuperAdmin early (needed in effects and rendering)
  const isSuperAdmin = !!(auth.user?.isSuperAdmin || auth.user?.role === 'superadmin' || auth.user?.role === 'super_admin' || (auth.user?.role === 'admin' && !auth.user?.tenantId));
  const isEmployee = auth.user?.role === 'employee';
  // Listing-only tenants (signupMode='listing_only' or listingTier='claimed_free')
  // get a minimal sidebar with just Marketplace / Services / Settings / Upgrade.
  const isListingOnly =
    !isSuperAdmin &&
    !isEmployee &&
    ((auth.tenant as any)?.signupMode === 'listing_only' ||
     (auth.tenant as any)?.listingTier === 'claimed_free');

  // Fetch menu visibility for non-superadmin users. Superadmin bypasses the
  // fetch entirely (the filter below ignores `disabledMenus` when isSuperAdmin),
  // so we early-return without touching state — avoids a synchronous setState
  // in the effect body.
  // PERFORMANCE: ?XTransformPort=3000 is required so Caddy routes this to the
  // Next.js dev server (otherwise it 401s and pollutes the dev log).
  useEffect(() => {
    if (isSuperAdmin) return;
    // Listing-only users have a fixed minimal nav — no need to fetch
    // menu-visibility (they don't have CRM menus to toggle).
    if (isListingOnly) return;
    async function fetchMenuVisibility() {
      try {
        const res = await fetch('/api/menu-visibility?XTransformPort=3000');
        if (res.ok) {
          const data = await res.json();
          setDisabledMenus(data.disabledMenus || []);
        }
      } catch {
        // Silently fail - all menus remain visible
      }
    }
    fetchMenuVisibility();
  }, [auth.user?.role, auth.user?.tenantId, auth.user?.isSuperAdmin, isSuperAdmin, isListingOnly]);

  // Effective collapsed state for a section: explicit user override wins,
  // otherwise fall back to the section's `defaultCollapsed` flag. Non-collapsible
  // sections are never collapsed.
  const isSectionCollapsed = (section: NavSection): boolean => {
    if (!section.collapsible) return false;
    if (section.title in collapsedOverrides) return collapsedOverrides[section.title];
    return !!section.defaultCollapsed;
  };

  const toggleSection = (title: string, currentlyCollapsed: boolean) => {
    setCollapsedOverrides((prev) => ({ ...prev, [title]: !currentlyCollapsed }));
  };

  const getUserInitials = () => {
    if (auth.user?.name) {
      return auth.user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
    }
    if (auth.user?.email) return auth.user.email.slice(0, 2).toUpperCase();
    return 'U';
  };

  const getPlanBadge = () => {
    const plan = auth.tenant?.plan || 'starter';
    const colors: Record<string, string> = {
      starter: 'bg-slate-600/40 text-slate-300 border-slate-500/30',
      growth: 'bg-emerald-600/30 text-emerald-300 border-emerald-500/30',
      pro: 'bg-amber-600/30 text-amber-300 border-amber-500/30',
      enterprise: 'bg-purple-600/30 text-purple-300 border-purple-500/30',
    };
    return {
      label: plan.charAt(0).toUpperCase() + plan.slice(1),
      className: colors[plan] || colors.starter,
    };
  };

  const planBadge = getPlanBadge();

  // Filter nav sections based on disabled menus
  const filteredNavSections = useMemo(() => {
    let sections: NavSection[];

    if (isSuperAdmin) {
      sections = superadminNavSections;
    } else if (isListingOnly) {
      // Listing-only tenants get the minimal nav — no CRM features, no
      // menu-visibility filtering (the fixed set is already final).
      return listingOnlyNavSections;
    } else if (isEmployee) {
      sections = employeeNavSections;
    } else {
      sections = ownerNavSections;
    }

    // Filter out disabled menus for non-superadmin users
    if (!isSuperAdmin && disabledMenus.length > 0) {
      const disabledSet = new Set(disabledMenus);
      sections = sections
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => !disabledSet.has(item.view)),
        }))
        .filter((section) => section.items.length > 0);
    }

    return sections;
  }, [isSuperAdmin, isEmployee, isListingOnly, disabledMenus]);

  const handleNavClick = (view: ViewType) => {
    setCurrentView(view);
    if (isMobile) setMobileSidebarOpen(false);
  };

  const handleCreateSelect = (view: ViewType, entity: 'lead' | 'customer' | 'job' | 'invoice' | 'campaign') => {
    // Tell the target view to auto-open its create form/dialog, then navigate.
    // The view's useEffect consumes pendingCreate and clears it.
    setPendingCreate(entity);
    setCurrentView(view);
    if (isMobile) setMobileSidebarOpen(false);
  };

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = currentView === item.view;

    // ── Plan-gated access (trial=LOCK, paid=HIDE) ─────────────────────────
    // Behaviour matrix per spec:
    //   - Superadmin: always visible (bypass).
    //   - Trial users: LOCKED — items above their tier render with a Lock
    //     icon + tooltip showing which plan unlocks them; click → UpgradeModal.
    //   - Paid users below the required tier: HIDDEN — item is not rendered
    //     at all (returns null, like the disabledMenus filter above).
    const planTier = resolvePlanTierClient(
      auth.tenant?.plan || 'starter',
      auth.tenant?.planStatus || 'active'
    );
    const accessCheck = checkMenuAccess(
      item.view,
      planTier,
      isSuperAdmin,
      auth.tenant?.planStatus
    );

    // HIDDEN — paid users don't see items above their tier at all.
    if (accessCheck.state === 'hidden') {
      return null;
    }

    if (accessCheck.state === 'locked') {
      const showLabel = isMobile || leftSidebarOpen;
      const minPlanDisplay = accessCheck.minPlan
        ? PLAN_DISPLAY_NAMES[accessCheck.minPlan] || accessCheck.minPlan
        : '';
      const tooltipText = `🔒 Available on ${minPlanDisplay} plan and above — Click to upgrade`;
      const lockedButton = (
        <button
          key={item.view}
          type="button"
          aria-disabled="true"
          title={tooltipText}
          onClick={(e) => {
            e.preventDefault();
            openUpgradeModal({
              menuKey: item.view,
              label: item.label,
              description: accessCheck.description || `Available on the ${minPlanDisplay} plan and above.`,
              minPlan: accessCheck.minPlan!,
            });
          }}
          className={cn(
            'flex items-center w-full rounded-lg text-sm font-medium transition-colors cursor-pointer group',
            isMobile || leftSidebarOpen ? 'h-9 px-3 gap-3' : 'h-9 justify-center',
            'text-slate-400/60 dark:text-slate-500/60 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 hover:text-slate-500 dark:hover:text-slate-400'
          )}
        >
          <Icon className="shrink-0 size-4 opacity-60 group-hover:opacity-80 transition-opacity" />
          {showLabel && (
            <span className="whitespace-nowrap flex-1 text-left text-[13px]">{item.label}</span>
          )}
          {showLabel && (
            <Lock className="size-3.5 text-slate-400/70 dark:text-slate-500/70 ml-auto shrink-0 group-hover:text-amber-500 transition-colors" />
          )}
        </button>
      );

      // NOTE: collapsed (icon-only) mode Tooltip wrapping is handled at the
      // call site (section.items.map) — it picks between this button's
      // `tooltipText` (locked) vs `item.label` (visible) based on the same
      // access check. We deliberately DON'T wrap here to avoid nesting
      // Tooltip-in-Tooltip (Radix Slot only accepts one child).
      return lockedButton;
    }

    return (
      <button
        key={item.view}
        onClick={() => handleNavClick(item.view)}
        onMouseEnter={() => prefetchView(item.view)}
        onFocus={() => prefetchView(item.view)}
        className={cn(
          // P6: was `transition-all duration-150` — that transitions width,
          // padding, gap, AND colors. When the sidebar collapses/expands,
          // every nav button animates its layout, which the browser paints
          // as a visible shift (the CLS source). Switching to
          // `transition-colors` keeps the hover/active color animation but
          // makes layout changes instant — no layout-paint shift.
          'flex items-center w-full rounded-lg text-sm font-medium transition-colors duration-150',
          isMobile || leftSidebarOpen ? 'h-9 px-3 gap-3' : 'h-9 justify-center',
          isActive
            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 shadow-sm'
            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/70 dark:hover:bg-slate-800/70 hover:text-slate-800 dark:hover:text-slate-200'
        )}
      >
        <Icon className={cn('shrink-0', isActive ? 'size-[18px] text-emerald-600 dark:text-emerald-400' : 'size-4')} />
        {(isMobile || leftSidebarOpen) && (
          <span className="whitespace-nowrap flex-1 text-left text-[13px]">{item.label}</span>
        )}
        {(isMobile || leftSidebarOpen) && item.badge && (
          <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
            {item.badge}
          </Badge>
        )}
        {(isMobile || leftSidebarOpen) && item.view === 'billing' && auth.tenant?.planStatus === 'trial' && (
          <Crown className="size-3 text-amber-500 ml-auto" />
        )}
      </button>
    );
  };

  // Whether the sidebar is in "expanded" mode (mobile drawer OR desktop expanded).
  // Used for label visibility, padding, full-width buttons, etc.
  const isExpandedMode = isMobile || leftSidebarOpen;
  // Collapsing sections only applies in DESKTOP-EXPANDED mode. Mobile drawer
  // and icon-only mode ignore the collapsible flag entirely (spec requirement).
  const isDesktopExpanded = !isMobile && leftSidebarOpen;

  return (
    <div className="flex flex-col h-full">
      {/* Logo / Branding */}
      <div
        className={cn(
          'flex items-center h-14 px-4 border-b border-sidebar-border shrink-0',
          isExpandedMode ? 'justify-start gap-3' : 'justify-center'
        )}
      >
        <BrandMark size={32} className="shadow-sm" />
        {isExpandedMode && (
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg font-bold tracking-tight whitespace-nowrap text-sidebar-foreground">
              {isSuperAdmin ? 'Fieseros' : 'Fieseros'}
            </span>
            <Badge variant="outline" className={cn('text-[9px] h-4 px-1.5 border shrink-0', isSuperAdmin ? 'bg-red-500/10 text-red-600 border-red-500/30' : 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30')}>
              {isSuperAdmin ? 'Admin' : planBadge.label}
            </Badge>
          </div>
        )}
      </div>

      {/* Superadmin tenant indicator */}
      {isSuperAdmin && isExpandedMode && (
        <div className="px-3 py-2 border-b border-sidebar-border shrink-0">
          <div className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-red-600 bg-red-500/5">
            <Shield className="size-4 shrink-0" />
            <span className="text-xs font-medium">Platform Administration</span>
          </div>
        </div>
      )}

      {/* + Create quick-action button (owner/admin only — tenant CRUD actions) */}
      {!isSuperAdmin && !isEmployee && (
        <div className="px-3 pt-3 pb-1 shrink-0">
          <CreateMenu
            isMobile={isMobile}
            leftSidebarOpen={leftSidebarOpen}
            onSelect={handleCreateSelect}
          />
        </div>
      )}

      {/* Navigation Sections */}
      <ScrollArea className="flex-1 py-2 min-h-0">
        <div className="flex flex-col gap-0.5">
          {filteredNavSections.map((section, sectionIdx) => {
            // Collapsing only applies in DESKTOP-EXPANDED mode. Mobile drawer
            // and icon-only mode ignore the collapsible flag (spec requirement):
            //   - mobile: all sections render expanded (plain headers, all items)
            //   - icon-only: no headers at all, just icons + separators
            const sectionCollapsed = isDesktopExpanded && isSectionCollapsed(section);
            const showItems = !isExpandedMode || !sectionCollapsed;

            return (
              <div key={section.title}>
                {/* Expanded-mode section header. Only desktop-expanded
                    collapsible sections get the clickable toggle button;
                    mobile always gets a plain (non-collapsible) header. */}
                {isExpandedMode && (
                  (isDesktopExpanded && section.collapsible) ? (
                    <button
                      type="button"
                      onClick={() => toggleSection(section.title, sectionCollapsed)}
                      className="flex items-center w-full px-4 pt-2.5 pb-1 group/section-header"
                      aria-expanded={!sectionCollapsed}
                      aria-label={`Toggle ${section.title} section`}
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 group-hover/section-header:text-slate-600 dark:group-hover/section-header:text-slate-400 flex-1 text-left">
                        {section.title}
                      </span>
                      {sectionCollapsed ? (
                        <ChevronRight className="size-3 text-slate-400 dark:text-slate-500 group-hover/section-header:text-slate-600 dark:group-hover/section-header:text-slate-400" />
                      ) : (
                        <ChevronDown className="size-3 text-slate-400 dark:text-slate-500 group-hover/section-header:text-slate-600 dark:group-hover/section-header:text-slate-400" />
                      )}
                    </button>
                  ) : (
                    <div className="px-4 pt-2.5 pb-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        {section.title}
                      </span>
                    </div>
                  )
                )}
                {/* Icon-only mode: separator between sections (skip before first) */}
                {!isExpandedMode && sectionIdx > 0 && (
                  <div className="px-3 my-1.5">
                    <Separator className="bg-sidebar-border" />
                  </div>
                )}
                {showItems && (
                  <nav className="flex flex-col gap-0.5 px-2">
                    {section.items.map((item) => {
                      // Plan-gated access check (mirrors renderNavItem's
                      // internal check). Recomputed here so we can:
                      //   (a) skip HIDDEN items entirely — Radix Slot (used by
                      //       TooltipTrigger asChild) requires a single non-null
                      //       child, so we must not pass `null` from
                      //       renderNavItem into the Tooltip wrapper below.
                      //   (b) pick the right Tooltip text in collapsed mode
                      //       (lock info for locked, label for visible).
                      const tier = resolvePlanTierClient(
                        auth.tenant?.plan || 'starter',
                        auth.tenant?.planStatus || 'active'
                      );
                      const access = checkMenuAccess(
                        item.view,
                        tier,
                        isSuperAdmin,
                        auth.tenant?.planStatus
                      );
                      if (access.state === 'hidden') return null;

                      if (isExpandedMode) return renderNavItem(item);

                      const collapsedTooltip =
                        access.state === 'locked' && access.minPlan
                          ? `🔒 Available on ${PLAN_DISPLAY_NAMES[access.minPlan] || access.minPlan} plan and above — Click to upgrade`
                          : item.label;

                      return (
                        <Tooltip key={item.view}>
                          <TooltipTrigger asChild>
                            {renderNavItem(item)}
                          </TooltipTrigger>
                          <TooltipContent side="right" sideOffset={8}>
                            {collapsedTooltip}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </nav>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Collapse Toggle (desktop only) */}
      {!isMobile && (
        <button
          onClick={toggleLeftSidebar}
          className="absolute -right-3 top-20 z-10 flex items-center justify-center w-6 h-6 rounded-full bg-background border border-border text-slate-500 hover:bg-muted hover:text-slate-800 dark:hover:text-white transition-colors shadow-md"
          aria-label={leftSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {leftSidebarOpen ? <ChevronLeft className="size-3" /> : <ChevronRight className="size-3" />}
        </button>
      )}

      <Separator className="bg-sidebar-border" />

      {/* User Section */}
      <div
        className={cn(
          'flex items-center gap-3 p-3 shrink-0',
          isExpandedMode ? '' : 'justify-center'
        )}
      >
        <Avatar className="size-8 shrink-0">
          <AvatarFallback className={cn('text-white text-xs', isSuperAdmin ? 'bg-red-600' : 'bg-emerald-600')}>
            {getUserInitials()}
          </AvatarFallback>
        </Avatar>
        {isExpandedMode && (
          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate"
              title={auth.user?.name || 'Demo User'}
            >
              {auth.user?.name || 'Demo User'}
            </p>
            {/* Email: allow wrapping (break-all) instead of truncating so the
                full address is always visible — previously the long email was
                clipped with an ellipsis, hiding data the user needs to see. */}
            <p
              className="text-xs text-slate-500 dark:text-slate-500 break-all leading-tight"
              title={auth.user?.email || 'demo@fieseros.com'}
            >
              {auth.user?.email || 'demo@fieseros.com'}
            </p>
          </div>
        )}
        {isExpandedMode && onLogout && (
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800/70 h-8 w-8 shrink-0"
            onClick={onLogout}
          >
            <LogOut className="size-4" />
          </Button>
        )}
        {!isMobile && !leftSidebarOpen && onLogout && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200/70 dark:hover:bg-slate-800/70 h-8 w-8 shrink-0 absolute bottom-3 right-1"
                onClick={onLogout}
              >
                <LogOut className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              Log out
            </TooltipContent>
          </Tooltip>
        )}
      </div>

    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────

export function AppSidebar({ onLogout }: AppSidebarProps) {
  const { leftSidebarOpen, mobileSidebarOpen, setMobileSidebarOpen } = useAppStore();
  const isBelowLg = useBelowLg();

  // Render as a Sheet drawer for ALL viewports below lg (1024px) — not just
  // below md (768px). The hamburger (header) and "More" button (bottom nav)
  // are both `lg:hidden`, so they're visible (and need to work) on tablet too.
  // `toggleMobileSidebar` controls `mobileSidebarOpen`, which this Sheet reads.
  if (isBelowLg) {
    return (
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent
          side="left"
          className="w-[280px] p-0 bg-sidebar border-r-sidebar-border"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <SidebarContent onLogout={onLogout} isMobile />
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop (≥ 1024px): render as fixed sidebar
  return (
    <aside
      className={cn(
        'relative flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 ease-in-out shrink-0 h-screen overflow-hidden',
        leftSidebarOpen ? 'w-60' : 'w-16'
      )}
    >
      <SidebarContent onLogout={onLogout} />
    </aside>
  );
}

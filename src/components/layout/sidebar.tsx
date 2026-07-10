'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '@/store/app-store';
import { useIsMobile } from '@/hooks/use-mobile';
import type { ViewType } from '@/types/workflow';
import {
  LayoutDashboard,
  Target,
  Briefcase,
  Radio,
  Users,
  Workflow,
  Activity,
  KeyRound,
  FileText,
  BarChart3,
  Variable,
  Settings,
  Wrench,
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
  ClipboardList,
  GitBranch,
  Kanban,
  RadioTower,
  ShieldCheck,
  ScrollText,
  History,
  UserCog,
  Eye,
  MessageSquare,
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
  CreditCard,
  Plug,
  ShoppingBag,
  Package,
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
      { view: 'leads', label: 'Leads', icon: Target },
      { view: 'customers', label: 'Customers', icon: Users },
    ],
  },
  {
    title: 'Operations',
    items: [
      { view: 'jobs', label: 'Jobs', icon: Briefcase },
      { view: 'employees', label: 'Employees', icon: UserCog },
      { view: 'timesheet', label: 'Timesheet', icon: Clock },
      { view: 'serviceCatalog', label: 'Service Catalog', icon: BookOpen },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { view: 'campaigns', label: 'Campaigns', icon: Megaphone },
      { view: 'broadcast', label: 'Broadcast', icon: Send },
      { view: 'templateStudio', label: 'Template Studio', icon: LayoutTemplate },
      { view: 'retargeting', label: 'Retargeting', icon: RefreshCw },
      { view: 'marketingAnalytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'Inbox & Automation',
    items: [
      { view: 'omnichannel', label: 'Omnichannel Inbox', icon: RadioTower },
      { view: 'aiAssistant', label: 'AI Assistant', icon: Sparkles },
      { view: 'chatbotBuilder', label: 'Chatbot Builder', icon: Bot },
      { view: 'workflows', label: 'Workflows', icon: Workflow },
      { view: 'workflowAutomations', label: 'Automations', icon: GitBranch },
      { view: 'triggers', label: 'Triggers', icon: Zap },
      { view: 'formBuilder', label: 'Form Builder', icon: ClipboardList },
      { view: 'variables', label: 'Variables', icon: Variable },
    ],
  },
  {
    title: 'Finance',
    items: [
      { view: 'quotes', label: 'Quotes', icon: Receipt },
      { view: 'invoices', label: 'Invoices', icon: FileText },
      { view: 'expenses', label: 'Expenses', icon: Wallet },
      { view: 'billing', label: 'Subscription', icon: CreditCard },
    ],
  },
  {
    title: 'Setup & Admin',
    collapsible: true,
    defaultCollapsed: true,
    items: [
      { view: 'settings', label: 'Settings', icon: Settings },
      { view: 'integrations', label: 'Integrations', icon: Plug, badge: 'New' },
      { view: 'channels', label: 'Channels & Credentials', icon: RadioTower },
      { view: 'auditLogs', label: 'Audit Logs', icon: ScrollText },
      { view: 'activityLogs', label: 'Activity Logs', icon: History },
      { view: 'customerPortal', label: 'Customer Portal', icon: Globe },
      { view: 'employeePortal', label: 'Employee Portal', icon: HardHat },
      { view: 'helpCenter', label: 'Help & Support', icon: LifeBuoy },
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
      { view: 'leads', label: 'Leads', icon: Target },
      { view: 'customers', label: 'Customers', icon: Users },
    ],
  },
  {
    title: 'Operations',
    items: [
      { view: 'jobs', label: 'Jobs', icon: Briefcase },
      { view: 'employees', label: 'Employees', icon: UserCog },
      { view: 'timesheet', label: 'Timesheet', icon: Clock },
      { view: 'serviceCatalog', label: 'Service Catalog', icon: BookOpen },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { view: 'campaigns', label: 'Campaigns', icon: Megaphone },
      { view: 'broadcast', label: 'Broadcast', icon: Send },
      { view: 'templateStudio', label: 'Template Studio', icon: LayoutTemplate },
      { view: 'retargeting', label: 'Retargeting', icon: RefreshCw },
      { view: 'marketingAnalytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'Inbox & Automation',
    items: [
      { view: 'omnichannel', label: 'Omnichannel Inbox', icon: RadioTower },
      { view: 'aiAssistant', label: 'AI Assistant', icon: Sparkles },
      { view: 'chatbotBuilder', label: 'Chatbot Builder', icon: Bot },
      { view: 'workflows', label: 'Workflows', icon: Workflow },
      { view: 'workflowAutomations', label: 'Automations', icon: GitBranch },
      { view: 'triggers', label: 'Triggers', icon: Zap },
      { view: 'formBuilder', label: 'Form Builder', icon: ClipboardList },
      { view: 'variables', label: 'Variables', icon: Variable },
    ],
  },
  {
    title: 'Finance',
    items: [
      { view: 'quotes', label: 'Quotes', icon: Receipt },
      { view: 'invoices', label: 'Invoices', icon: FileText },
      { view: 'expenses', label: 'Expenses', icon: Wallet },
      { view: 'billing', label: 'Subscription', icon: CreditCard },
    ],
  },
  {
    title: 'Setup & Admin',
    items: [
      { view: 'settings', label: 'Settings', icon: Settings },
      { view: 'integrations', label: 'Integrations', icon: Plug, badge: 'New' },
      { view: 'channels', label: 'Channels & Credentials', icon: RadioTower },
      { view: 'auditLogs', label: 'Audit Logs', icon: ScrollText },
      { view: 'activityLogs', label: 'Activity Logs', icon: History },
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
    { view: 'campaigns', entity: 'campaign', label: 'New Campaign', icon: Megaphone },
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

  // Fetch menu visibility for non-superadmin users. Superadmin bypasses the
  // fetch entirely (the filter below ignores `disabledMenus` when isSuperAdmin),
  // so we early-return without touching state — avoids a synchronous setState
  // in the effect body.
  useEffect(() => {
    if (isSuperAdmin) return;
    async function fetchMenuVisibility() {
      try {
        const res = await fetch('/api/menu-visibility');
        if (res.ok) {
          const data = await res.json();
          setDisabledMenus(data.disabledMenus || []);
        }
      } catch {
        // Silently fail - all menus remain visible
      }
    }
    fetchMenuVisibility();
  }, [auth.user?.role, auth.user?.tenantId, auth.user?.isSuperAdmin, isSuperAdmin]);

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
  }, [isSuperAdmin, isEmployee, disabledMenus]);

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

    return (
      <button
        key={item.view}
        onClick={() => handleNavClick(item.view)}
        className={cn(
          'flex items-center w-full rounded-lg text-sm font-medium transition-all duration-150',
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
        <div className={cn(
          'flex items-center justify-center w-8 h-8 rounded-lg shrink-0 shadow-sm',
          isSuperAdmin
            ? 'bg-red-600 shadow-red-500/20'
            : 'bg-emerald-600 shadow-emerald-500/20'
        )}>
          {isSuperAdmin ? (
            <ShieldCheck className="size-5 text-white" />
          ) : (
            <Wrench className="size-5 text-white" />
          )}
        </div>
        {isExpandedMode && (
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg font-bold tracking-tight whitespace-nowrap text-sidebar-foreground">
              {isSuperAdmin ? 'ServiceOS' : 'ServiceOS'}
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
                      if (isExpandedMode) return renderNavItem(item);
                      return (
                        <Tooltip key={item.view}>
                          <TooltipTrigger asChild>
                            {renderNavItem(item)}
                          </TooltipTrigger>
                          <TooltipContent side="right" sideOffset={8}>
                            {item.label}
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
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
              {auth.user?.name || 'Demo User'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500 truncate">
              {auth.user?.email || 'demo@serviceos.cc'}
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
  const isMobile = useIsMobile();

  // Mobile: render as Sheet (drawer)
  if (isMobile) {
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

  // Desktop: render as fixed sidebar
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

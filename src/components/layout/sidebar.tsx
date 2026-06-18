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
  CreditCard,
  Variable,
  Settings,
  Wrench,
  ChevronLeft,
  ChevronRight,
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
  UserCog,
  Eye,
  MessageSquare,
  Send,
  CalendarCheck,
  Calendar,
  Star,
  BookOpen,
  Receipt,
  Zap,
  Search,
  Shield,
  CreditCard as CreditCardIcon,
  Plug,
  ShoppingBag,
  Package,
  FolderTree,
  Tag as TagIcon,
  Upload,
  Download,
  Mail,
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
}

// ─── Navigation sections — organized by user's module structure ──────────────

const ownerNavSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'CRM',
    items: [
      { view: 'leads', label: 'Leads', icon: Target },
      { view: 'customers', label: 'Customers', icon: Users },
      { view: 'customer360', label: 'Customer 360', icon: UserCircle, badge: '360' },
      { view: 'salesPipeline', label: 'Pipeline', icon: Kanban },
    ],
  },
  {
    title: 'Audience',
    items: [
      { view: 'contacts', label: 'All Contacts', icon: Users },
      { view: 'groups', label: 'Groups', icon: FolderTree },
      { view: 'tags', label: 'Tags', icon: TagIcon },
      { view: 'segments', label: 'Segments', icon: Filter },
      { view: 'contactImports', label: 'Imports', icon: Upload },
      { view: 'contactExports', label: 'Exports', icon: Download },
      { view: 'audienceAnalytics', label: 'Audience Analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'Communication Providers',
    items: [
      { view: 'emailProviders', label: 'Email Providers', icon: Mail },
      { view: 'emailTemplates', label: 'Email Templates', icon: FileText },
      { view: 'emailCampaigns', label: 'Email Campaigns', icon: Send },
    ],
  },
  {
    title: 'Operations',
    items: [
      { view: 'booking', label: 'Booking', icon: CalendarCheck },
      { view: 'calendar', label: 'Calendar', icon: Calendar },
      { view: 'jobs', label: 'Jobs', icon: Briefcase },
      { view: 'dispatch', label: 'Dispatch', icon: Radio },
      { view: 'employees', label: 'Employees', icon: UserCog },
    ],
  },
  {
    title: 'Communication',
    items: [
      { view: 'omnichannel', label: 'Omnichannel', icon: RadioTower },
      { view: 'broadcast', label: 'Broadcast', icon: Send },
      { view: 'marketingTemplates', label: 'Templates', icon: MessageSquare },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { view: 'campaigns', label: 'Campaigns', icon: Megaphone },
      { view: 'retargeting', label: 'Retargeting', icon: RefreshCw },
      { view: 'marketingAnalytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'Automation',
    items: [
      { view: 'workflows', label: 'Workflow Editor', icon: Workflow },
      { view: 'triggers', label: 'Triggers', icon: Zap },
      { view: 'variables', label: 'Variables', icon: Variable },
      { view: 'executions', label: 'Executions', icon: Activity },
      { view: 'formBuilder', label: 'Form Builder', icon: ClipboardList },
      { view: 'workflowAutomations', label: 'Automations', icon: GitBranch },
    ],
  },
  {
    title: 'Finance',
    items: [
      { view: 'quotes', label: 'Quotes', icon: Receipt },
      { view: 'invoices', label: 'Invoices', icon: FileText },
      { view: 'billing', label: 'Billing', icon: CreditCard },
    ],
  },
  {
    title: 'Administration',
    items: [
      { view: 'credentials', label: 'Credentials', icon: KeyRound },
      { view: 'integrations', label: 'Integrations', icon: Plug, badge: 'New' },
      { view: 'settings', label: 'Settings', icon: Settings },
      { view: 'auditLogs', label: 'Audit Logs', icon: ScrollText },
      { view: 'reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  {
    title: 'Portals',
    items: [
      { view: 'customerPortal', label: 'Customer Portal', icon: Globe },
      { view: 'employeePortal', label: 'Employee Portal', icon: HardHat },
    ],
  },
  {
    title: 'AI & More',
    items: [
      { view: 'aiAssistant', label: 'AI Assistant', icon: Sparkles },
      { view: 'chatbotBuilder', label: 'Chatbot Builder', icon: Bot },
      { view: 'serviceCatalog', label: 'Service Catalog', icon: BookOpen },
      { view: 'communicationProviders', label: 'Providers', icon: KeyRound },
      { view: 'reviews', label: 'Reviews', icon: Star },
    ],
  },
];

const employeeNavSections: NavSection[] = [
  {
    title: 'My Work',
    items: [
      { view: 'employeePortal', label: 'My Jobs', icon: Briefcase },
      { view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Account',
    items: [
      { view: 'settings', label: 'Settings', icon: Settings },
    ],
  },
];

// ─── Dedicated Superadmin Navigation ────────────────────────────────────────
// Superadmin has a completely different sidebar focused on platform management

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
    title: 'CRM',
    items: [
      { view: 'leads', label: 'Leads', icon: Target },
      { view: 'customers', label: 'Customers', icon: Users },
      { view: 'salesPipeline', label: 'Sales Pipeline', icon: Kanban },
    ],
  },
  {
    title: 'Audience',
    items: [
      { view: 'contacts', label: 'All Contacts', icon: Users },
      { view: 'groups', label: 'Groups', icon: FolderTree },
      { view: 'tags', label: 'Tags', icon: TagIcon },
      { view: 'segments', label: 'Segments', icon: Filter },
      { view: 'contactImports', label: 'Imports', icon: Upload },
      { view: 'contactExports', label: 'Exports', icon: Download },
      { view: 'audienceAnalytics', label: 'Audience Analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'Communication Providers',
    items: [
      { view: 'emailProviders', label: 'Email Providers', icon: Mail },
      { view: 'emailTemplates', label: 'Email Templates', icon: FileText },
      { view: 'emailCampaigns', label: 'Email Campaigns', icon: Send },
    ],
  },
  {
    title: 'Operations',
    items: [
      { view: 'booking', label: 'Booking', icon: Calendar },
      { view: 'jobs', label: 'Jobs', icon: Briefcase },
      { view: 'employees', label: 'Employees', icon: UserCog },
    ],
  },
  {
    title: 'Communication',
    items: [
      { view: 'omnichannel', label: 'Omnichannel', icon: Radio },
      { view: 'broadcast', label: 'Broadcast', icon: Radio },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { view: 'campaigns', label: 'Campaigns', icon: Megaphone },
      { view: 'retargeting', label: 'Retargeting', icon: RefreshCw },
      { view: 'marketingAnalytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'Automation',
    items: [
      { view: 'workflows', label: 'Workflows', icon: Workflow },
      { view: 'triggers', label: 'Triggers', icon: Zap },
    ],
  },
  {
    title: 'Finance',
    items: [
      { view: 'invoices', label: 'Invoices', icon: FileText },
      { view: 'quotes', label: 'Quotes', icon: Receipt },
      { view: 'billing', label: 'Billing', icon: CreditCard },
    ],
  },
  {
    title: 'System',
    items: [
      { view: 'settings', label: 'Settings', icon: Settings },
      { view: 'reports', label: 'Reports', icon: BarChart3 },
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

// ─── Sidebar Content (shared between desktop and mobile) ────────────────────

function SidebarContent({ onLogout, isMobile = false }: AppSidebarProps & { isMobile?: boolean }) {
  const {
    currentView,
    setCurrentView,
    leftSidebarOpen,
    toggleLeftSidebar,
    setMobileSidebarOpen,
    auth,
  } = useAppStore();

  const [disabledMenus, setDisabledMenus] = useState<string[]>([]);

  // Compute isSuperAdmin early (needed in effects and rendering)
  const isSuperAdmin = !!(auth.user?.isSuperAdmin || auth.user?.role === 'superadmin' || auth.user?.role === 'super_admin' || (auth.user?.role === 'admin' && !auth.user?.tenantId));
  const isEmployee = auth.user?.role === 'employee';

  // Fetch menu visibility for non-superadmin users
  useEffect(() => {
    if (isSuperAdmin) {
      setDisabledMenus([]);
      return;
    }
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
  }, [auth.user?.role, auth.user?.tenantId, auth.user?.isSuperAdmin]);

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
            ? 'bg-emerald-500/15 text-emerald-400 shadow-sm'
            : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
        )}
      >
        <Icon className={cn('shrink-0', isActive ? 'size-[18px] text-emerald-400' : 'size-4')} />
        {(isMobile || leftSidebarOpen) && (
          <span className="whitespace-nowrap flex-1 text-left text-[13px]">{item.label}</span>
        )}
        {(isMobile || leftSidebarOpen) && item.badge && (
          <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
            {item.badge}
          </Badge>
        )}
        {(isMobile || leftSidebarOpen) && item.view === 'billing' && auth.tenant?.planStatus === 'trial' && (
          <Crown className="size-3 text-amber-400 ml-auto" />
        )}
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo / Branding */}
      <div
        className={cn(
          'flex items-center h-14 px-4 border-b border-slate-800/60 shrink-0',
          isMobile || leftSidebarOpen ? 'justify-start gap-3' : 'justify-center'
        )}
      >
        <div className={cn(
          'flex items-center justify-center w-8 h-8 rounded-lg shrink-0 shadow-lg',
          isSuperAdmin
            ? 'bg-red-600 shadow-red-500/20'
            : 'bg-emerald-500 shadow-emerald-500/20'
        )}>
          {isSuperAdmin ? (
            <ShieldCheck className="size-5 text-white" />
          ) : (
            <Wrench className="size-5 text-white" />
          )}
        </div>
        {(isMobile || leftSidebarOpen) && (
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg font-bold tracking-tight whitespace-nowrap text-white">
              {isSuperAdmin ? 'ServiceOS' : 'ServiceOS'}
            </span>
            <Badge variant="outline" className={cn('text-[9px] h-4 px-1.5 border shrink-0', isSuperAdmin ? 'bg-red-500/10 text-red-400 border-red-500/30' : planBadge.className)}>
              {isSuperAdmin ? 'Admin' : planBadge.label}
            </Badge>
          </div>
        )}
      </div>



      {/* Superadmin tenant indicator */}
      {isSuperAdmin && (isMobile || leftSidebarOpen) && (
        <div className="px-3 py-2 border-b border-slate-800/60 shrink-0">
          <div className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-red-400/80 bg-red-500/5">
            <Shield className="size-4 shrink-0" />
            <span className="text-xs font-medium">Platform Administration</span>
          </div>
        </div>
      )}

      {/* Navigation Sections */}
      <ScrollArea className="flex-1 py-2 min-h-0">
        <div className="flex flex-col gap-0.5">
          {filteredNavSections.map((section, sectionIdx) => (
            <div key={section.title}>
              {(isMobile || leftSidebarOpen) && (
                <div className="px-4 pt-2.5 pb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {section.title}
                  </span>
                </div>
              )}
              {!isMobile && !leftSidebarOpen && sectionIdx > 0 && (
                <div className="px-3 my-1.5">
                  <Separator className="bg-slate-800/60" />
                </div>
              )}
              <nav className="flex flex-col gap-0.5 px-2">
                {section.items.map((item) => {
                  if (isMobile || leftSidebarOpen) return renderNavItem(item);
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
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Collapse Toggle (desktop only) */}
      {!isMobile && (
        <button
          onClick={toggleLeftSidebar}
          className="absolute -right-3 top-20 z-10 flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors shadow-md"
          aria-label={leftSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {leftSidebarOpen ? <ChevronLeft className="size-3" /> : <ChevronRight className="size-3" />}
        </button>
      )}

      <Separator className="bg-slate-800/60" />

      {/* User Section */}
      <div
        className={cn(
          'flex items-center gap-3 p-3 shrink-0',
          isMobile || leftSidebarOpen ? '' : 'justify-center'
        )}
      >
        <Avatar className="size-8 shrink-0">
          <AvatarFallback className={cn('text-white text-xs', isSuperAdmin ? 'bg-red-600' : 'bg-emerald-600')}>
            {getUserInitials()}
          </AvatarFallback>
        </Avatar>
        {(isMobile || leftSidebarOpen) && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">
              {auth.user?.name || 'Demo User'}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {auth.user?.email || 'demo@serviceos.io'}
            </p>
          </div>
        )}
        {(isMobile || leftSidebarOpen) && onLogout && (
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-500 hover:text-white hover:bg-slate-800/70 h-8 w-8 shrink-0"
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
                className="text-slate-500 hover:text-white hover:bg-slate-800/70 h-8 w-8 shrink-0 absolute bottom-3 right-1"
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
          className="w-[280px] p-0 bg-slate-950 border-r-slate-800/60"
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
        'relative flex flex-col bg-slate-950 text-white transition-all duration-300 ease-in-out shrink-0 h-screen overflow-hidden',
        leftSidebarOpen ? 'w-60' : 'w-16'
      )}
    >
      <SidebarContent onLogout={onLogout} />
    </aside>
  );
}

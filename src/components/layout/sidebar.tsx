'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/app-store';
import type { ViewType } from '@/types/workflow';
import {
  LayoutDashboard,
  Target,
  Briefcase,
  Radio,
  Users,
  MessageCircle,
  Workflow,
  Activity,
  KeyRound,
  FileText,
  BarChart3,
  CreditCard,
  Variable,
  LayoutTemplate,
  Settings,
  Wrench,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Building2,
  ChevronDown,
  Check,
  Plus,
  Crown,
  HardHat,
  Globe,
  Inbox,
  UserCircle,
  Megaphone,
  Filter,
  RefreshCw,
  Bot,
  Sparkles,
  Wand2,
  ClipboardList,
  LayoutGrid,
  GitBranch,
  Kanban,
  RadioTower,
  Store,
  Shield,
  Calendar,
  Star,
  Package,
  BookOpen,
  FolderOpen,
  Navigation,
  Contact,
  Search,
  X,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { authFetch } from '@/lib/client-auth';
import { useIsMobile } from '@/hooks/use-mobile';

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

// ─── Navigation sections ────────────────────────────────────────────────────

const superAdminNavSections: NavSection[] = [
  {
    title: 'Platform',
    items: [
      { view: 'superAdmin', label: 'Dashboard', icon: Shield },
      { view: 'dashboard', label: 'Business View', icon: LayoutDashboard },
    ],
  },
];

const ownerNavSections: NavSection[] = [
  {
    title: 'CRM',
    items: [
      { view: 'leads', label: 'Leads', icon: Target },
      { view: 'leadDiscovery', label: 'Lead Discovery', icon: Search },
      { view: 'contacts', label: 'Contacts', icon: Contact },
      { view: 'salesPipeline', label: 'Sales Pipeline', icon: Kanban },
      { view: 'quotes', label: 'Quotes', icon: FileText },
      { view: 'customer360', label: 'Customer 360', icon: UserCircle },
    ],
  },
  {
    title: 'Operations',
    items: [
      { view: 'bookings', label: 'Bookings', icon: Calendar },
      { view: 'jobs', label: 'Jobs', icon: Briefcase },
      { view: 'dispatch', label: 'Dispatch', icon: Radio },
      { view: 'calendar', label: 'Calendar', icon: Calendar },
      { view: 'employees', label: 'Employees', icon: Users },
    ],
  },
  {
    title: 'Experience',
    items: [
      { view: 'reviews', label: 'Reviews', icon: Star },
      { view: 'customerPortal', label: 'Customer Portal', icon: Globe },
    ],
  },
  {
    title: 'Resources',
    items: [
      { view: 'serviceCatalog', label: 'Service Catalog', icon: Package },
      { view: 'knowledgeBase', label: 'Knowledge Base', icon: BookOpen },
      { view: 'documentCenter', label: 'Document Center', icon: FolderOpen },
    ],
  },
  {
    title: 'WhatsApp CRM',
    items: [
      { view: 'inbox', label: 'Inbox', icon: Inbox, badge: 'New' },
      { view: 'campaigns', label: 'Campaigns', icon: Megaphone },
      { view: 'broadcast', label: 'Broadcast', icon: Radio },
      { view: 'segments', label: 'Segments', icon: Filter },
      { view: 'retargeting', label: 'Retargeting', icon: RefreshCw },
      { view: 'chatbotBuilder', label: 'Chatbot Builder', icon: Bot },
      { view: 'formBuilder', label: 'Form Builder', icon: ClipboardList },
      { view: 'journeyAutomation', label: 'Journey Builder', icon: GitBranch },
    ],
  },
  {
    title: 'AI & Automation',
    items: [
      { view: 'aiAssistant', label: 'AI Assistant', icon: Sparkles },
      { view: 'aiCampaignGenerator', label: 'AI Generator', icon: Wand2 },
      { view: 'workflows', label: 'Workflows', icon: Workflow },
      { view: 'executions', label: 'Executions', icon: Activity },
    ],
  },
  {
    title: 'Finance',
    items: [
      { view: 'invoices', label: 'Invoices', icon: FileText },
      { view: 'reports', label: 'Reports', icon: BarChart3 },
      { view: 'billing', label: 'Billing', icon: CreditCard },
    ],
  },
  {
    title: 'Advanced Operations',
    items: [
      { view: 'routeOptimization', label: 'Route Optimization', icon: Navigation },
    ],
  },
  {
    title: 'Channels',
    items: [
      { view: 'omnichannel', label: 'Omnichannel', icon: RadioTower },
      { view: 'webviewEngine', label: 'Webview Engine', icon: LayoutGrid },
    ],
  },
  {
    title: 'Platform',
    items: [
      { view: 'marketplace', label: 'Marketplace', icon: Store },
      { view: 'enterprise', label: 'Enterprise', icon: Shield },
      { view: 'credentials', label: 'Credentials', icon: KeyRound },
      { view: 'variables', label: 'Variables', icon: Variable },
      { view: 'templates', label: 'Templates', icon: LayoutTemplate },
      { view: 'settings', label: 'Settings', icon: Settings },
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

// ─── Workspace interface ────────────────────────────────────────────────────

interface Workspace {
  id: string;
  name: string;
  slug: string;
  industry?: string;
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface AppSidebarProps {
  onLogout?: () => void;
}

// ─── Sidebar Content (shared between desktop and mobile) ────────────────────

function SidebarContent({
  onLogout,
  onNavigate,
}: {
  onLogout?: () => void;
  onNavigate?: () => void;
}) {
  const {
    currentView,
    setCurrentView,
    leftSidebarOpen,
    auth,
    showWorkspace,
    setShowWorkspace,
    currentWorkspaceId,
    setCurrentWorkspaceId,
    currentWorkspaceName,
    setCurrentWorkspaceName,
  } = useAppStore();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [creating, setCreating] = useState(false);

  const isSuperAdmin = auth.user?.isSuperAdmin === true;
  const isEnterprise = auth.tenant?.plan === 'enterprise';
  const isEmployee = auth.user?.role === 'employee' || auth.user?.role === 'technician';

  useEffect(() => {
    async function fetchWorkspaces() {
      try {
        const res = await authFetch('/api/workspaces');
        if (res.ok) {
          const data = await res.json();
          setWorkspaces(data);
          if (data.length > 0 && !currentWorkspaceId) {
            setCurrentWorkspaceId(data[0].id);
            setCurrentWorkspaceName(data[0].name);
          }
          const shouldShow = isSuperAdmin || isEnterprise || data.length > 1;
          setShowWorkspace(shouldShow);
        } else {
          setShowWorkspace(isSuperAdmin || isEnterprise);
        }
      } catch {
        setShowWorkspace(isSuperAdmin || isEnterprise);
      }
    }
    fetchWorkspaces();
  }, [isSuperAdmin, isEnterprise]);

  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;
    setCreating(true);
    try {
      const res = await authFetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newWorkspaceName.trim() }),
      });
      if (res.ok) {
        const workspace = await res.json();
        setWorkspaces((prev) => [...prev, workspace]);
        setCurrentWorkspaceId(workspace.id);
        setCurrentWorkspaceName(workspace.name);
        setCreateDialogOpen(false);
        setNewWorkspaceName('');
        toast.success(`Workspace "${workspace.name}" created!`);
      } else {
        toast.error('Failed to create workspace');
      }
    } catch {
      toast.error('Failed to create workspace');
    } finally {
      setCreating(false);
    }
  };

  const getUserInitials = () => {
    if (auth.user?.name) {
      return auth.user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
    }
    if (auth.user?.email) {
      return auth.user.email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  const getPlanBadge = () => {
    const isSuperAdmin = auth.user?.isSuperAdmin === true;
    if (isSuperAdmin) {
      return { label: 'Super Admin', className: 'bg-red-600/30 text-red-300 border-red-500/30' };
    }
    const isEmployee = auth.user?.role === 'employee' || auth.user?.role === 'technician';
    if (isEmployee) {
      return { label: 'Employee', className: 'bg-teal-600/30 text-teal-300 border-teal-500/30' };
    }
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

  let navSections: NavSection[];
  if (isSuperAdmin) {
    navSections = superAdminNavSections;
  } else if (isEmployee) {
    navSections = employeeNavSections;
  } else {
    navSections = ownerNavSections;
  }

  const handleNavClick = (view: ViewType) => {
    setCurrentView(view);
    onNavigate?.();
  };

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = currentView === item.view;

    return (
      <button
        key={item.view}
        onClick={() => handleNavClick(item.view)}
        className={cn(
          'flex items-center w-full rounded-lg text-sm font-medium transition-all duration-150 interactive',
          leftSidebarOpen ? 'h-9 px-3 gap-3' : 'h-9 justify-center',
          isActive
            ? 'bg-emerald-500/20 text-emerald-400 shadow-sm shadow-emerald-500/10'
            : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
        )}
      >
        <Icon className={cn('shrink-0 transition-all', isActive ? 'size-5 text-emerald-400' : 'size-4')} />
        {leftSidebarOpen && (
          <span className="whitespace-nowrap flex-1 text-left">{item.label}</span>
        )}
        {leftSidebarOpen && item.badge && (
          <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
            {item.badge}
          </Badge>
        )}
        {leftSidebarOpen && item.view === 'billing' && auth.tenant?.planStatus === 'trial' && (
          <Crown className="size-3 text-amber-400 ml-auto" />
        )}
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* ─── Logo / Branding ──────────────────────────────────────────── */}
      <div
        className={cn(
          'flex items-center h-14 px-4 border-b border-slate-800/60 shrink-0',
          leftSidebarOpen ? 'justify-start gap-3' : 'justify-center'
        )}
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 shrink-0 shadow-lg shadow-emerald-500/25">
          <Wrench className="size-5 text-white" />
        </div>
        {leftSidebarOpen && (
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg font-bold tracking-tight whitespace-nowrap">
              ServiceOS
            </span>
            <Badge variant="outline" className={cn('text-[9px] h-4 px-1.5 border shrink-0', planBadge.className)}>
              {planBadge.label}
            </Badge>
          </div>
        )}
      </div>

      {/* ─── Workspace Switcher ────────────────────────────────────────── */}
      {showWorkspace && leftSidebarOpen ? (
        <div className="px-3 py-2 border-b border-slate-800/60">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center w-full gap-2 rounded-lg px-2 py-2 text-sm text-slate-300 hover:bg-slate-800/70 transition-colors">
                <Building2 className="size-4 text-emerald-400 shrink-0" />
                <span className="flex-1 truncate text-left">
                  {auth.tenant?.name || currentWorkspaceName || 'Platform Admin'}
                </span>
                <ChevronDown className="size-3 text-slate-500 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" className="w-56">
              <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {workspaces.map((ws) => (
                <DropdownMenuItem
                  key={ws.id}
                  onClick={() => {
                    setCurrentWorkspaceId(ws.id);
                    setCurrentWorkspaceName(ws.name);
                  }}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Building2 className="size-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{ws.name}</span>
                  {currentWorkspaceId === ws.id && (
                    <Check className="size-4 text-emerald-500" />
                  )}
                </DropdownMenuItem>
              ))}
              {workspaces.length > 0 && <DropdownMenuSeparator />}
              <DropdownMenuItem
                onClick={() => setCreateDialogOpen(true)}
                className="flex items-center gap-2 cursor-pointer text-emerald-600 dark:text-emerald-400"
              >
                <Plus className="size-4" />
                <span>Create Workspace</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : !showWorkspace && leftSidebarOpen ? (
        <div className="px-3 py-2 border-b border-slate-800/60">
          <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-slate-400">
            <Building2 className="size-4 text-slate-500 shrink-0" />
            <span className="truncate text-left text-slate-300">
              {auth.tenant?.name || 'My Company'}
            </span>
          </div>
        </div>
      ) : null}

      {/* ─── Navigation Sections ──────────────────────────────────────── */}
      <ScrollArea className="flex-1 py-3 min-h-0 scrollbar-thin">
        <div className="flex flex-col gap-1">
          {navSections.map((section, sectionIdx) => (
            <div key={section.title}>
              {leftSidebarOpen && (
                <div className="px-4 pt-3 pb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {section.title}
                  </span>
                </div>
              )}

              {!leftSidebarOpen && sectionIdx > 0 && (
                <div className="px-3 my-2">
                  <Separator className="bg-slate-800/60" />
                </div>
              )}

              <nav className="flex flex-col gap-0.5 px-2">
                {section.items.map((item) => renderNavItem(item))}
              </nav>
            </div>
          ))}
        </div>
      </ScrollArea>

      <Separator className="bg-slate-800/60" />

      {/* ─── User Section ─────────────────────────────────────────────── */}
      <div
        className={cn(
          'flex items-center gap-3 p-3 shrink-0',
          leftSidebarOpen ? '' : 'justify-center'
        )}
      >
        <Avatar className="size-8 shrink-0">
          <AvatarFallback className="bg-gradient-to-br from-emerald-600 to-teal-600 text-white text-xs">
            {getUserInitials()}
          </AvatarFallback>
        </Avatar>
        {leftSidebarOpen && (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">
              {auth.user?.name || 'Demo User'}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {auth.user?.email || 'demo@serviceos.io'}
            </p>
          </div>
        )}
        {leftSidebarOpen && onLogout && (
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-500 hover:text-white hover:bg-slate-800/70 h-8 w-8 shrink-0"
            onClick={onLogout}
          >
            <LogOut className="size-4" />
          </Button>
        )}
      </div>

      {/* ─── Create Workspace Dialog ──────────────────────────────────── */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Workspace</DialogTitle>
            <DialogDescription>
              Create a new workspace to organize your workflows and team.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">
              Workspace Name
            </label>
            <Input
              placeholder="e.g., Marketing Team"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateWorkspace();
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateWorkspace}
              disabled={!newWorkspaceName.trim() || creating}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {creating ? 'Creating...' : 'Create Workspace'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────

export function AppSidebar({ onLogout }: AppSidebarProps) {
  const {
    leftSidebarOpen,
    toggleLeftSidebar,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    setCurrentView,
  } = useAppStore();
  const isMobile = useIsMobile();

  // Handle navigation - close mobile drawer
  const handleMobileNavigate = () => {
    if (isMobile) {
      setMobileSidebarOpen(false);
    }
  };

  // ─── Mobile: Sheet/Drawer ────────────────────────────────────────────
  if (isMobile) {
    return (
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="w-72 p-0 bg-slate-950 border-slate-800/60">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
          </SheetHeader>
          <div className="flex items-center justify-between px-4 h-14 border-b border-slate-800/60">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/25">
                <Wrench className="size-5 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight text-white">ServiceOS</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-400 hover:text-white hover:bg-slate-800/70 h-8 w-8"
              onClick={() => setMobileSidebarOpen(false)}
            >
              <X className="size-4" />
            </Button>
          </div>
          {/* Force sidebar open=true for mobile drawer rendering */}
          <MobileSidebarContent onLogout={onLogout} onNavigate={handleMobileNavigate} />
        </SheetContent>
      </Sheet>
    );
  }

  // ─── Desktop: Collapsible sidebar ────────────────────────────────────
  return (
    <>
      <aside
        className={cn(
          'relative flex flex-col bg-slate-950 text-white transition-all duration-300 ease-in-out shrink-0 h-screen overflow-hidden',
          leftSidebarOpen ? 'w-60' : 'w-16'
        )}
      >
        <SidebarContent onLogout={onLogout} />
      </aside>

      {/* Collapse toggle button */}
      <button
        onClick={toggleLeftSidebar}
        className="absolute top-20 z-10 flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors shadow-md"
        style={{ left: leftSidebarOpen ? '228px' : '52px' }}
        aria-label={leftSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {leftSidebarOpen ? (
          <ChevronLeft className="size-3" />
        ) : (
          <ChevronRight className="size-3" />
        )}
      </button>
    </>
  );
}

// ─── Mobile sidebar content (always expanded) ───────────────────────────

function MobileSidebarContent({ onLogout, onNavigate }: { onLogout?: () => void; onNavigate?: () => void }) {
  // Always show expanded sidebar in mobile
  const store = useAppStore();

  return (
    <div className="flex flex-col h-[calc(100%-56px)]">
      <MobileNavContent onLogout={onLogout} onNavigate={onNavigate} />
    </div>
  );
}

function MobileNavContent({ onLogout, onNavigate }: { onLogout?: () => void; onNavigate?: () => void }) {
  const {
    currentView,
    setCurrentView,
    auth,
    showWorkspace,
    setShowWorkspace,
    currentWorkspaceId,
    setCurrentWorkspaceId,
    currentWorkspaceName,
    setCurrentWorkspaceName,
  } = useAppStore();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const isSuperAdmin = auth.user?.isSuperAdmin === true;
  const isEnterprise = auth.tenant?.plan === 'enterprise';
  const isEmployee = auth.user?.role === 'employee' || auth.user?.role === 'technician';

  useEffect(() => {
    async function fetchWorkspaces() {
      try {
        const res = await authFetch('/api/workspaces');
        if (res.ok) {
          const data = await res.json();
          setWorkspaces(data);
          if (data.length > 0 && !currentWorkspaceId) {
            setCurrentWorkspaceId(data[0].id);
            setCurrentWorkspaceName(data[0].name);
          }
          const shouldShow = isSuperAdmin || isEnterprise || data.length > 1;
          setShowWorkspace(shouldShow);
        }
      } catch { /* silent */ }
    }
    fetchWorkspaces();
  }, [isSuperAdmin, isEnterprise]);

  const getUserInitials = () => {
    if (auth.user?.name) {
      return auth.user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
    }
    if (auth.user?.email) return auth.user.email.slice(0, 2).toUpperCase();
    return 'U';
  };

  const getPlanBadge = () => {
    if (auth.user?.isSuperAdmin) return { label: 'Super Admin', className: 'bg-red-600/30 text-red-300 border-red-500/30' };
    if (isEmployee) return { label: 'Employee', className: 'bg-teal-600/30 text-teal-300 border-teal-500/30' };
    const plan = auth.tenant?.plan || 'starter';
    const colors: Record<string, string> = {
      starter: 'bg-slate-600/40 text-slate-300 border-slate-500/30',
      growth: 'bg-emerald-600/30 text-emerald-300 border-emerald-500/30',
      pro: 'bg-amber-600/30 text-amber-300 border-amber-500/30',
      enterprise: 'bg-purple-600/30 text-purple-300 border-purple-500/30',
    };
    return { label: plan.charAt(0).toUpperCase() + plan.slice(1), className: colors[plan] || colors.starter };
  };

  const planBadge = getPlanBadge();
  let navSections: NavSection[];
  if (isSuperAdmin) navSections = superAdminNavSections;
  else if (isEmployee) navSections = employeeNavSections;
  else navSections = ownerNavSections;

  return (
    <>
      {showWorkspace && (
        <div className="px-3 py-2 border-b border-slate-800/60">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center w-full gap-2 rounded-lg px-2 py-2 text-sm text-slate-300 hover:bg-slate-800/70 transition-colors">
                <Building2 className="size-4 text-emerald-400 shrink-0" />
                <span className="flex-1 truncate text-left">
                  {auth.tenant?.name || currentWorkspaceName || 'Platform Admin'}
                </span>
                <ChevronDown className="size-3 text-slate-500 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" className="w-56">
              <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {workspaces.map((ws) => (
                <DropdownMenuItem key={ws.id} onClick={() => { setCurrentWorkspaceId(ws.id); setCurrentWorkspaceName(ws.name); }} className="flex items-center gap-2 cursor-pointer">
                  <Building2 className="size-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{ws.name}</span>
                  {currentWorkspaceId === ws.id && <Check className="size-4 text-emerald-500" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      <ScrollArea className="flex-1 py-3 min-h-0 scrollbar-thin">
        <div className="flex flex-col gap-1">
          {navSections.map((section) => (
            <div key={section.title}>
              <div className="px-4 pt-3 pb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{section.title}</span>
              </div>
              <nav className="flex flex-col gap-0.5 px-2">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.view;
                  return (
                    <button
                      key={item.view}
                      onClick={() => {
                        setCurrentView(item.view);
                        onNavigate?.();
                      }}
                      className={cn(
                        'flex items-center w-full rounded-lg text-sm font-medium transition-all duration-150 interactive h-9 px-3 gap-3',
                        isActive
                          ? 'bg-emerald-500/20 text-emerald-400 shadow-sm shadow-emerald-500/10'
                          : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
                      )}
                    >
                      <Icon className={cn('shrink-0', isActive ? 'size-5 text-emerald-400' : 'size-4')} />
                      <span className="whitespace-nowrap flex-1 text-left">{item.label}</span>
                      {item.badge && (
                        <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">{item.badge}</Badge>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </ScrollArea>

      <Separator className="bg-slate-800/60" />

      <div className="flex items-center gap-3 p-3 shrink-0 safe-bottom">
        <Avatar className="size-8 shrink-0">
          <AvatarFallback className="bg-gradient-to-br from-emerald-600 to-teal-600 text-white text-xs">{getUserInitials()}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-200 truncate">{auth.user?.name || 'Demo User'}</p>
          <p className="text-xs text-slate-500 truncate">{auth.user?.email || 'demo@serviceos.io'}</p>
        </div>
        {onLogout && (
          <Button variant="ghost" size="icon" className="text-slate-500 hover:text-white hover:bg-slate-800/70 h-8 w-8 shrink-0" onClick={onLogout}>
            <LogOut className="size-4" />
          </Button>
        )}
      </div>
    </>
  );
}

'use client';

import { useAppStore } from '@/store/app-store';
import type { ViewType } from '@/types/workflow';
import {
  Search,
  Sun,
  Moon,
  Bell,
  Menu,
  User,
  Key,
  Settings,
  LogOut,
  HelpCircle,
  ChevronRight,
  UserPlus,
  Briefcase,
  FileText,
  Home,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

// ─── View label mapping ─────────────────────────────────────────────────────

const viewLabels: Record<ViewType, string> = {
  dashboard: 'Dashboard',
  workflows: 'Workflows',
  canvas: 'Workflow Editor',
  operations: 'Operations',
  whatsapp: 'WhatsApp',
  leads: 'Leads',
  crm: 'CRM',
  jobs: 'Jobs',
  dispatch: 'Dispatch',
  billing: 'Billing',
  executions: 'Executions',
  credentials: 'Credentials',
  invoices: 'Invoices',
  reports: 'Reports',
  variables: 'Variables',
  templates: 'Templates',
  settings: 'Settings',
  versionHistory: 'Version History',
  saasDashboard: 'SaaS Dashboard',
  superAdmin: 'Platform Admin',
  employeePortal: 'My Portal',
  customerPortal: 'Customer Portal',
  inbox: 'Inbox',
  customer360: 'Customer 360',
  campaigns: 'Campaigns',
  segments: 'Segments',
  retargeting: 'Retargeting',
  chatbotBuilder: 'Chatbot Builder',
  aiAssistant: 'AI Assistant',
  aiCampaignGenerator: 'AI Campaign Generator',
  formBuilder: 'Form Builder',
  webviewEngine: 'Webview Engine',
  adsIntegration: 'Ads Integration',
  journeyAutomation: 'Journey Automation',
  salesPipeline: 'Sales Pipeline',
  omnichannel: 'Omnichannel',
  marketplace: 'Marketplace',
  enterprise: 'Enterprise',
  broadcast: 'Broadcast',
};

// ─── Breadcrumb section mapping ──────────────────────────────────────────────

const viewSections: Record<ViewType, string> = {
  dashboard: 'Home',
  workflows: 'Automation',
  canvas: 'Automation',
  operations: 'Automation',
  whatsapp: 'Messaging',
  leads: 'Sales',
  crm: 'Sales',
  jobs: 'Operations',
  dispatch: 'Operations',
  billing: 'Finance',
  executions: 'Automation',
  credentials: 'Settings',
  invoices: 'Finance',
  reports: 'Analytics',
  variables: 'Settings',
  templates: 'Automation',
  settings: 'Settings',
  versionHistory: 'Settings',
  saasDashboard: 'Home',
  superAdmin: 'Platform',
  employeePortal: 'Portal',
  customerPortal: 'Portal',
  inbox: 'Messaging',
  customer360: 'Sales',
  campaigns: 'Marketing',
  segments: 'Marketing',
  retargeting: 'Marketing',
  chatbotBuilder: 'Marketing',
  aiAssistant: 'Marketing',
  aiCampaignGenerator: 'Marketing',
  formBuilder: 'Marketing',
  webviewEngine: 'Marketing',
  adsIntegration: 'Marketing',
  journeyAutomation: 'Marketing',
  salesPipeline: 'Sales',
  omnichannel: 'Messaging',
  marketplace: 'Home',
  enterprise: 'Settings',
  broadcast: 'Marketing',
};

// ─── Notification icon mapping ───────────────────────────────────────────────

const notificationTypes = [
  { title: 'New lead assigned', desc: 'A new lead has been assigned to you · 2m ago', icon: UserPlus, color: 'text-emerald-600 bg-emerald-50' },
  { title: 'Job completed', desc: 'Job #1234 has been marked as completed · 15m ago', icon: Briefcase, color: 'text-teal-600 bg-teal-50' },
  { title: 'Invoice overdue', desc: 'Invoice INV-003 is now overdue · 1h ago', icon: FileText, color: 'text-amber-600 bg-amber-50' },
];

// ─── Component ──────────────────────────────────────────────────────────────

export function AppHeader() {
  const {
    currentView,
    darkMode,
    toggleDarkMode,
    toggleLeftSidebar,
    searchQuery,
    setSearchQuery,
    auth,
    clearAuth,
  } = useAppStore();

  const isCanvas = currentView === 'canvas';
  const sectionLabel = viewSections[currentView] || 'Home';
  const viewLabel = viewLabels[currentView] || 'Dashboard';

  // Get user initials for avatar
  const getUserInitials = () => {
    if (auth.user?.name) {
      return auth.user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
    }
    if (auth.user?.email) {
      return auth.user.email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  return (
    <header className="flex items-center h-14 px-4 border-b bg-background shrink-0 gap-3">
      {/* ─── Mobile menu toggle ────────────────────────────────────────── */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleLeftSidebar}
        className="shrink-0 lg:hidden min-h-[44px] min-w-[44px]"
        aria-label="Toggle menu"
      >
        <Menu className="size-5" />
      </Button>

      {/* ─── Desktop sidebar toggle ────────────────────────────────────── */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleLeftSidebar}
        className="shrink-0 hidden lg:flex min-h-[44px] min-w-[44px]"
        aria-label="Toggle sidebar"
      >
        <Menu className="size-4" />
      </Button>

      {/* ─── Breadcrumb Navigation ────────────────────────────────────── */}
      <nav className="flex items-center gap-1.5 text-sm" aria-label="Breadcrumb">
        <Home className="size-3.5 text-muted-foreground" />
        <span className="text-muted-foreground hidden sm:inline">{sectionLabel}</span>
        <ChevronRight className="size-3.5 text-muted-foreground/50 hidden sm:inline" />
        <span className="font-semibold whitespace-nowrap">{viewLabel}</span>
      </nav>

      {!isCanvas && (
        <>
          <Separator orientation="vertical" className="h-6" />

          {/* ─── Search input with Ctrl+K hint ──────────────────────────── */}
          <div className="relative max-w-sm flex-1 hidden sm:block">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-sm bg-muted/50 border-muted-foreground/10 focus:bg-background"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none hidden md:inline-flex h-5 select-none items-center gap-1 rounded border border-muted-foreground/20 bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">⌘</span>K
            </kbd>
          </div>
        </>
      )}

      {/* ─── Spacer ────────────────────────────────────────────────────── */}
      <div className="flex-1" />

      {/* ─── Right side actions ────────────────────────────────────────── */}
      <div className="flex items-center gap-1 shrink-0">
        {/* ─── Help button ────────────────────────────────────────────── */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 min-h-[44px] min-w-[44px] hidden sm:flex"
          aria-label="Help"
        >
          <HelpCircle className="size-4" />
        </Button>

        {/* ─── Notifications bell ──────────────────────────────────────── */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 relative min-h-[44px] min-w-[44px]"
              aria-label="Notifications"
            >
              <Bell className="size-4" />
              {/* Notification badge */}
              <span className="absolute top-1.5 right-1.5 flex items-center justify-center size-2 rounded-full bg-emerald-500">
                <span className="sr-only">3 unread notifications</span>
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 rounded-xl">
            <DropdownMenuLabel className="flex items-center justify-between">
              Notifications
              <Badge variant="secondary" className="text-[10px] h-5 px-2">
                3 new
              </Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notificationTypes.map((notif, idx) => {
              const Icon = notif.icon;
              return (
                <DropdownMenuItem key={idx} className="flex items-start gap-3 cursor-pointer py-3 px-3">
                  <div className={cn('size-8 rounded-lg flex items-center justify-center shrink-0', notif.color)}>
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium block">{notif.title}</span>
                    <span className="text-xs text-muted-foreground block mt-0.5">
                      {notif.desc}
                    </span>
                  </div>
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-center cursor-pointer text-emerald-600 dark:text-emerald-400 justify-center py-2.5">
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* ─── Dark mode toggle ────────────────────────────────────────── */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleDarkMode}
          className="h-9 w-9 min-h-[44px] min-w-[44px]"
          aria-label="Toggle dark mode"
        >
          {darkMode ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
        </Button>

        {/* ─── Separator ──────────────────────────────────────────────── */}
        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* ─── User avatar dropdown ────────────────────────────────────── */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full min-h-[44px] min-w-[44px]"
            >
              <Avatar className="size-8">
                <AvatarFallback className="bg-emerald-600 text-white text-xs">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">
                  {auth.user?.name || 'Demo User'}
                </span>
                <span className="text-xs text-muted-foreground font-normal">
                  {auth.user?.email || 'demo@serviceos.io'}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer gap-2">
              <User className="size-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer gap-2">
              <Key className="size-4" />
              API Keys
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer gap-2">
              <Settings className="size-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              className="cursor-pointer gap-2"
              onClick={async () => {
                try {
                  await fetch('/api/auth/logout?XTransformPort=3000', { method: 'POST' });
                } catch {
                  // API logout failed
                }
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('serviceos_auth');
                  localStorage.removeItem('user');
                  localStorage.removeItem('tenant');
                  localStorage.removeItem('serviceos_user');
                  localStorage.removeItem('serviceos_tenant');
                }
                clearAuth();
              }}
            >
              <LogOut className="size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

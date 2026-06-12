'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/app-store';
import { useIsMobile } from '@/hooks/use-mobile';
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
  quotes: 'Quotes',
  workflowAutomations: 'Automations',
  marketingTemplates: 'Marketing Templates',
  marketingAnalytics: 'Marketing Analytics',
  communicationProviders: 'Communication Providers',
  contacts: 'Contacts',
  leadDiscovery: 'Lead Discovery',
  booking: 'Booking',
  calendar: 'Calendar',
  employees: 'Employees',
  reviews: 'Reviews',
  serviceCatalog: 'Service Catalog',
  knowledgeBase: 'Knowledge Base',
  documentCenter: 'Document Center',
  triggers: 'CRM Triggers',
};

// ─── Component ──────────────────────────────────────────────────────────────

export function AppHeader() {
  const {
    currentView,
    darkMode,
    toggleDarkMode,
    toggleLeftSidebar,
    toggleMobileSidebar,
    searchQuery,
    setSearchQuery,
    auth,
  } = useAppStore();

  const isMobile = useIsMobile();
  const isCanvas = currentView === 'canvas';
  const [searchOpen, setSearchOpen] = useState(false);

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
    <header className={cn(
      'flex items-center h-14 px-2 sm:px-4 border-b bg-background shrink-0 gap-2 sm:gap-3',
      // Safe area for iOS notch on standalone mode
      'pt-[env(safe-area-inset-top,0px)]'
    )}>
      {/* ─── Mobile menu toggle ────────────────────────────────────────── */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleMobileSidebar}
        className="shrink-0 lg:hidden h-9 w-9"
        aria-label="Open navigation menu"
      >
        <Menu className="size-5" />
      </Button>

      {/* ─── Desktop sidebar toggle ────────────────────────────────────── */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleLeftSidebar}
        className="shrink-0 hidden lg:flex h-9 w-9"
        aria-label="Toggle sidebar"
      >
        <Menu className="size-4" />
      </Button>

      {/* ─── Current view title ────────────────────────────────────────── */}
      <h1 className="text-sm sm:text-base font-semibold whitespace-nowrap truncate">
        {viewLabels[currentView] || 'Dashboard'}
      </h1>

      {!isCanvas && (
        <>
          <Separator orientation="vertical" className="h-6 hidden sm:block" />

          {/* ─── Search input (desktop) ──────────────────────────────── */}
          <div className="relative max-w-sm flex-1 hidden sm:block">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>

          {/* ─── Search toggle (mobile) ──────────────────────────────── */}
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 sm:hidden h-9 w-9"
            onClick={() => setSearchOpen(!searchOpen)}
            aria-label="Search"
          >
            <Search className="size-4" />
          </Button>
        </>
      )}

      {/* ─── Spacer ────────────────────────────────────────────────────── */}
      <div className="flex-1" />

      {/* ─── Right side actions ────────────────────────────────────────── */}
      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
        {/* ─── Notifications bell ──────────────────────────────────────── */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 relative"
              aria-label="Notifications"
            >
              <Bell className="size-4" />
              {/* Notification badge */}
              <span className="absolute top-1.5 right-1.5 flex items-center justify-center size-2 rounded-full bg-emerald-500">
                <span className="sr-only">3 unread notifications</span>
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel className="flex items-center justify-between">
              Notifications
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                3 new
              </Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex flex-col items-start gap-1 cursor-pointer py-3">
              <span className="text-sm font-medium">New lead assigned</span>
              <span className="text-xs text-muted-foreground">
                A new lead has been assigned to you · 2m ago
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start gap-1 cursor-pointer py-3">
              <span className="text-sm font-medium">Job completed</span>
              <span className="text-xs text-muted-foreground">
                Job #1234 has been marked as completed · 15m ago
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start gap-1 cursor-pointer py-3">
              <span className="text-sm font-medium">Invoice overdue</span>
              <span className="text-xs text-muted-foreground">
                Invoice INV-003 is now overdue · 1h ago
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-center cursor-pointer text-emerald-600 dark:text-emerald-400 justify-center">
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* ─── Dark mode toggle ────────────────────────────────────────── */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleDarkMode}
          className="h-9 w-9"
          aria-label="Toggle dark mode"
        >
          {darkMode ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
        </Button>

        {/* ─── Separator ──────────────────────────────────────────────── */}
        <Separator orientation="vertical" className="h-6 mx-0.5 sm:mx-1" />

        {/* ─── User avatar dropdown ────────────────────────────────────── */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
            >
              <Avatar className="size-7">
                <AvatarFallback className="bg-emerald-600 text-white text-xs">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
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
            <DropdownMenuItem variant="destructive" className="cursor-pointer gap-2">
              <LogOut className="size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

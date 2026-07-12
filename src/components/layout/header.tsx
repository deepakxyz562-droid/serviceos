'use client';

import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  Download,
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
import { toast } from 'sonner';

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
  superadmin: 'Super Admin',
  // Audience
  groups: 'Groups',
  tags: 'Tags',
  contactImports: 'Contact Imports',
  contactExports: 'Contact Exports',
  audienceAnalytics: 'Audience Analytics',
  emailCampaigns: 'Email Campaigns',
  emailProviders: 'Email Providers',
  emailTemplates: 'Email Templates',
  notifications: 'Notifications',
};

// ─── PWA install helpers ────────────────────────────────────────────────────

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: window-controls-overlay)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
}

function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent || '';
  const platform = (window.navigator as unknown as { platform?: string }).platform || '';
  const isIpad =
    /Mac/.test(platform) &&
    'ontouchend' in document &&
    (navigator.maxTouchPoints ?? 0) > 1;
  return /iPad|iPhone|iPod/.test(ua) || isIpad;
}

// ─── Component ──────────────────────────────────────────────────────────────

interface AppHeaderProps {
  onLogout?: () => void;
}

export function AppHeader({ onLogout }: AppHeaderProps) {
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
  const [notifOpen, setNotifOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const setCurrentView = useAppStore((s) => s.setCurrentView);

  // Capture beforeinstallprompt so the avatar "Install app" entry can
  // re-trigger the native install flow. This mirrors install-prompt.tsx but
  // is self-contained — calling prompt() consumes the event, so whichever
  // UI (banner or menu) the user clicks first wins; the other becomes a no-op.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // ─── Live unread count (polled every 30s) ────────────────────────────
  // Falls back to a static "3" for unauthenticated users so the bell still
  // shows something — but once authed, the real count is fetched.
  const { data: unreadData } = useQuery<{ unreadCount: number }>({
    queryKey: ['unread-count'],
    queryFn: async () => {
      const res = await fetch('/api/notifications/unread-count?XTransformPort=3000');
      if (!res.ok) throw new Error('failed');
      return res.json();
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
  });
  const unreadCount = unreadData?.unreadCount ?? 0;

  const goNotifications = useCallback(() => {
    setNotifOpen(false);
    setCurrentView('notifications');
  }, [setCurrentView]);

  const goSettings = useCallback(() => setCurrentView('settings'), [setCurrentView]);
  const goCredentials = useCallback(() => setCurrentView('credentials'), [setCurrentView]);

  const handleInstallClick = useCallback(() => {
    if (isStandaloneDisplay()) {
      toast.info('ServiceOS is already installed');
      return;
    }
    if (isIOS()) {
      toast.info('Add to Home Screen', {
        description: 'In Safari, tap the Share button, then "Add to Home Screen".',
      });
      return;
    }
    if (deferredPrompt) {
      deferredPrompt
        .prompt()
        .catch(() => toast.error('Could not show install prompt'));
      deferredPrompt.userChoice.finally(() => setDeferredPrompt(null));
      return;
    }
    toast.info('Install ServiceOS', {
      description: 'Use your browser menu → "Install app" or "Add to Home Screen".',
    });
  }, [deferredPrompt]);

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
      // Height extends INTO the notch (background fills safe zone) while
      // pt-[env(safe-area-inset-top)] keeps the 64px content row below it.
      // Without the calc() the border-box h-16 would leave only ~17px for
      // content on notched devices (64px - 47px notch = 17px → squished).
      'flex items-center h-[calc(4rem+env(safe-area-inset-top,0px))] px-3 sm:px-5 border-b border-border/70 bg-background shrink-0 gap-2 sm:gap-4',
      // Safe area for iOS notch on standalone mode — pushes content row down
      // so it sits below the notch/status bar.
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
      <h1 className="text-base sm:text-lg font-semibold tracking-tight whitespace-nowrap truncate min-w-0">
        {viewLabels[currentView] || 'Dashboard'}
      </h1>

      {!isCanvas && (
        <>
          <Separator orientation="vertical" className="h-6 hidden sm:block bg-border/70" />

          {/* ─── Search input (desktop) — Jobber-style pill ──────────── */}
          <div className="relative max-w-sm flex-1 hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm rounded-lg bg-muted/50 border-transparent focus-visible:bg-background focus-visible:border-border"
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
        <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 relative"
              aria-label="Notifications"
            >
              <Bell className="size-4" />
              {/* Notification badge — only renders when there's at least 1 unread */}
              {unreadCount > 0 && (
                <span
                  className="absolute top-1 right-1 min-w-3.5 h-3.5 px-1 flex items-center justify-center rounded-full bg-emerald-500 text-white text-[9px] font-bold leading-none"
                  aria-hidden="true"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
              <span className="sr-only">
                {unreadCount === 0
                  ? 'No unread notifications'
                  : `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel className="flex items-center justify-between">
              Notifications
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                {unreadCount} new
              </Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {unreadCount === 0 ? (
              <div className="px-3 py-6 text-center">
                <Bell className="size-6 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">
                  You&apos;re all caught up!
                </p>
              </div>
            ) : (
              <div className="px-3 py-4 text-center">
                <p className="text-sm font-medium">{unreadCount} unread notification{unreadCount === 1 ? '' : 's'}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Open the Notification Center to view and manage them.
                </p>
              </div>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-center cursor-pointer text-emerald-600 dark:text-emerald-400 justify-center"
              onClick={goNotifications}
            >
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* ─── Dark mode toggle (desktop only — mobile uses avatar dropdown) ── */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleDarkMode}
          className="hidden sm:flex h-9 w-9"
          aria-label="Toggle dark mode"
        >
          {darkMode ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
        </Button>

        {/* ─── Separator (desktop only) ───────────────────────────────── */}
        <Separator orientation="vertical" className="h-6 mx-0.5 sm:mx-1 hidden sm:block" />

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
                  {auth.user?.email || 'demo@serviceos.cc'}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer gap-2" onClick={goSettings}>
              <User className="size-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer gap-2" onClick={goCredentials}>
              <Key className="size-4" />
              API Keys
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer gap-2" onClick={goSettings}>
              <Settings className="size-4" />
              Settings
            </DropdownMenuItem>
            {/* Dark mode toggle — mobile only (desktop has the icon button) */}
            <DropdownMenuItem className="cursor-pointer gap-2 sm:hidden" onClick={toggleDarkMode}>
              {darkMode ? <Sun className="size-4" /> : <Moon className="size-4" />}
              {darkMode ? 'Light mode' : 'Dark mode'}
            </DropdownMenuItem>
            {/* Install app — lets users re-trigger install after dismissing banner */}
            <DropdownMenuItem className="cursor-pointer gap-2" onClick={handleInstallClick}>
              <Download className="size-4" />
              Install app
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              className="cursor-pointer gap-2"
              onClick={onLogout}
              disabled={!onLogout}
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

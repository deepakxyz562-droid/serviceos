import { create } from 'zustand';

export type ActiveView =
  | 'dashboard'
  | 'leads'
  | 'jobs'
  | 'dispatch'
  | 'crm'
  | 'whatsapp'
  | 'workflows'
  | 'invoices'
  | 'reports'
  | 'billing'
  | 'settings'
  | 'credentials'
  | 'variables'
  | 'templates'
  | 'executions'
  | 'operations'
  | 'canvas'
  | 'versionHistory'
  | 'saasDashboard'
  | 'superAdmin'
  | 'employeePortal'
  | 'customerPortal'
  // WhatsApp Customer Engagement Platform
  | 'inbox'
  | 'customer360'
  | 'campaigns'
  | 'segments'
  | 'retargeting'
  | 'chatbotBuilder'
  | 'aiAssistant'
  | 'aiCampaignGenerator'
  | 'formBuilder'
  | 'webviewEngine'
  | 'journeyAutomation'
  | 'salesPipeline'
  | 'omnichannel'
  | 'marketplace'
  | 'enterprise'
  | 'broadcast'
  | 'employees'
  // New Modules
  | 'quotes'
  | 'bookings'
  | 'calendar'
  | 'reviews'
  | 'serviceCatalog'
  | 'knowledgeBase'
  | 'documentCenter'
  | 'routeOptimization'
  | 'contacts'
  | 'leadDiscovery';

interface AuthState {
  isAuthenticated: boolean;
  user: any;
  tenant: any;
}

interface AppState {
  // Auth
  auth: AuthState;
  setAuth: (auth: AuthState) => void;
  clearAuth: () => void;

  // Active view (primary naming)
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  // Aliases used by layout components
  currentView: ActiveView;
  setCurrentView: (view: ActiveView) => void;

  // Onboarding
  showOnboarding: boolean;
  setShowOnboarding: (show: boolean) => void;

  // Sidebar - mobile first: closed by default on mobile
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  leftSidebarOpen: boolean;
  toggleLeftSidebar: () => void;
  setLeftSidebarOpen: (open: boolean) => void;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;

  // Dark mode
  darkMode: boolean;
  toggleDarkMode: () => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Workspace
  currentWorkspaceId: string | null;
  setCurrentWorkspaceId: (id: string | null) => void;
  currentWorkspaceName: string;
  setCurrentWorkspaceName: (name: string) => void;

  // Workspace visibility
  showWorkspace: boolean;
  setShowWorkspace: (show: boolean) => void;

  // Workflow (for canvas)
  currentWorkflowId: string | null;
  setCurrentWorkflowId: (id: string | null) => void;

  // PWA install prompt
  installPromptEvent: any;
  setInstallPromptEvent: (event: any) => void;
}

const initialAuthState: AuthState = {
  isAuthenticated: false,
  user: null,
  tenant: null,
};

// Detect initial dark mode preference
const getInitialDarkMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const stored = localStorage.getItem('serviceos_dark_mode');
    if (stored !== null) return stored === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
};

export const useAppStore = create<AppState>((set) => ({
  // Auth
  auth: initialAuthState,
  setAuth: (auth: AuthState) => set({ auth }),
  clearAuth: () => set({ auth: initialAuthState }),

  // Active view — both naming conventions point to the same state
  activeView: 'dashboard',
  setActiveView: (view: ActiveView) => set({ activeView: view, currentView: view }),
  currentView: 'dashboard',
  setCurrentView: (view: ActiveView) => set({ currentView: view, activeView: view }),

  // Onboarding
  showOnboarding: false,
  setShowOnboarding: (show: boolean) => set({ showOnboarding: show }),

  // Sidebar - starts collapsed on mobile (detected via window width)
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  leftSidebarOpen: typeof window !== 'undefined' && window.innerWidth >= 1024,
  toggleLeftSidebar: () => set((state) => {
    const next = !state.leftSidebarOpen;
    return { leftSidebarOpen: next, sidebarCollapsed: !next };
  }),
  setLeftSidebarOpen: (open: boolean) => set({ leftSidebarOpen: open, sidebarCollapsed: !open }),
  mobileSidebarOpen: false,
  setMobileSidebarOpen: (open: boolean) => set({ mobileSidebarOpen: open }),

  // Dark mode - respects system preference
  darkMode: getInitialDarkMode(),
  toggleDarkMode: () => set((state) => {
    const next = !state.darkMode;
    if (typeof window !== 'undefined') {
      localStorage.setItem('serviceos_dark_mode', String(next));
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
    return { darkMode: next };
  }),

  // Search
  searchQuery: '',
  setSearchQuery: (query: string) => set({ searchQuery: query }),

  // Workspace
  currentWorkspaceId: null,
  setCurrentWorkspaceId: (id: string | null) => set({ currentWorkspaceId: id }),
  currentWorkspaceName: '',
  setCurrentWorkspaceName: (name: string) => set({ currentWorkspaceName: name }),
  showWorkspace: false,
  setShowWorkspace: (show: boolean) => set({ showWorkspace: show }),

  // Workflow
  currentWorkflowId: null,
  setCurrentWorkflowId: (id: string | null) => set({ currentWorkflowId: id }),

  // PWA install prompt
  installPromptEvent: null,
  setInstallPromptEvent: (event: any) => set({ installPromptEvent: event }),
}));

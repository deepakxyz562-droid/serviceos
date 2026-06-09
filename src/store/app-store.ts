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
  | 'superAdmin';

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

  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  leftSidebarOpen: boolean;
  toggleLeftSidebar: () => void;

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

  // Workspace visibility — hides switcher for small businesses (90% of customers)
  // Shows only for: Super Admin, Enterprise customers, Agencies managing multiple companies
  showWorkspace: boolean;
  setShowWorkspace: (show: boolean) => void;

  // Workflow (for canvas)
  currentWorkflowId: string | null;
  setCurrentWorkflowId: (id: string | null) => void;
}

const initialAuthState: AuthState = {
  isAuthenticated: false,
  user: null,
  tenant: null,
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

  // Sidebar
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  leftSidebarOpen: true,
  toggleLeftSidebar: () => set((state) => ({ leftSidebarOpen: !state.leftSidebarOpen })),

  // Dark mode
  darkMode: false,
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),

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
}));

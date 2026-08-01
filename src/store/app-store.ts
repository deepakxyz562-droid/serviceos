import { create } from 'zustand';
import type { ViewType } from '@/types/workflow';

// Re-export ViewType as ActiveView for backward compatibility
export type ActiveView = ViewType;

interface AuthState {
  isAuthenticated: boolean;
  user: any;
  tenant: any;
}

interface AppState {
  // Auth
  auth: AuthState;
  /**
   * True once the initial /api/auth/me fetch (fired by MarketplaceHeader on
   * mount) has resolved — either with a session (auth.isAuthenticated=true)
   * or anonymously (auth.isAuthenticated=false). Until this is true, client
   * components cannot reliably know whether the visitor is the owner of a
   * given business. Used by ClaimBusinessBanner to suppress rendering while
   * the auth state is still unknown.
   */
  authHydrated: boolean;
  setAuth: (auth: AuthState) => void;
  setAuthHydrated: (hydrated: boolean) => void;
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
  setLeftSidebarOpen: (open: boolean) => void;

  // Mobile sidebar (Sheet/drawer)
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;
  toggleMobileSidebar: () => void;

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

  // Workflow (for canvas)
  currentWorkflowId: string | null;
  setCurrentWorkflowId: (id: string | null) => void;

  // ── Lead → Job conversion prefill ──────────────────────────────────
  // When the user clicks "Convert" on a lead, we don't immediately call the
  // convert API. Instead we stash the lead's data here and switch to the Jobs
  // view, which opens its New Job form pre-filled from this payload. The job
  // form clears this once consumed so a refresh doesn't re-open it.
  pendingJobPrefill: JobPrefillData | null;
  setPendingJobPrefill: (data: JobPrefillData | null) => void;

  // ── Cross-view "New X" create signal ─────────────────────────────────
  // When the user clicks "New Lead / Customer / Job / Invoice / Campaign"
  // from the sidebar's "+ Create" dropdown or the dashboard's quick actions,
  // we set this to the target entity, switch to the matching view, and the
  // target view consumes it (opens its create form/dialog) then clears it.
  // This avoids the user having to click the in-view "New X" button twice.
  pendingCreate: 'lead' | 'customer' | 'job' | 'invoice' | 'campaign' | null;
  setPendingCreate: (entity: 'lead' | 'customer' | 'job' | 'invoice' | 'campaign' | null) => void;

  // ── Cross-view Reports tab + filter signal (Phase 6) ────────────────
  // When the user clicks the Won / Lost summary box on the Sales Pipeline
  // view, we stash the target tab + sales-outcomes type filter here, switch
  // to the Reports view, and ReportsView consumes it on mount (sets the
  // active tab + salesOutcomesType, then clears it). Mirrors the
  // pendingCreate pattern.
  pendingReportsTab: string | null;
  setPendingReportsTab: (tab: string | null) => void;
  pendingReportsSalesOutcomesType: 'all' | 'won' | 'lost' | null;
  setPendingReportsSalesOutcomesType: (t: 'all' | 'won' | 'lost' | null) => void;

  // ── Cross-view Settings deep-link signal ───────────────────────────
  // When the user clicks "Configure AI Voice" on the AI Receptionist view,
  // we stash the target settings section id (e.g. 'ai') here, switch to the
  // Settings view, and SettingsView consumes it on mount (sets the active
  // section, then clears it). Mirrors the pendingReportsTab pattern.
  pendingSettingsSection: string | null;
  setPendingSettingsSection: (section: string | null) => void;
}

// Shape of the data passed from a Lead into the New Job form.
export interface JobPrefillData {
  leadId: string;
  title?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string | null;
  customerAddress?: string | null;
  serviceType?: string | null;
  serviceId?: string | null;
  priority?: string;
  address?: string | null;
  value?: number;
  description?: string | null;
  lineItemsJson?: string | null;
  source?: string;
}

const initialAuthState: AuthState = {
  isAuthenticated: false,
  user: null,
  tenant: null,
};

export const useAppStore = create<AppState>((set) => ({
  // Auth
  auth: initialAuthState,
  authHydrated: false,
  setAuth: (auth: AuthState) => set({ auth }),
  setAuthHydrated: (hydrated: boolean) => set({ authHydrated: hydrated }),
  clearAuth: () => set({ auth: initialAuthState, authHydrated: true }),

  // Active view — both naming conventions point to the same state
  activeView: 'dashboard',
  setActiveView: (view: ActiveView) => set({ activeView: view, currentView: view, mobileSidebarOpen: false }),
  currentView: 'dashboard',
  setCurrentView: (view: ActiveView) => set({ currentView: view, activeView: view, mobileSidebarOpen: false }),

  // Onboarding
  showOnboarding: false,
  setShowOnboarding: (show: boolean) => set({ showOnboarding: show }),

  // Sidebar
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  leftSidebarOpen: true,
  toggleLeftSidebar: () => set((state) => ({ leftSidebarOpen: !state.leftSidebarOpen })),
  setLeftSidebarOpen: (open: boolean) => set({ leftSidebarOpen: open }),

  // Mobile sidebar
  mobileSidebarOpen: false,
  setMobileSidebarOpen: (open: boolean) => set({ mobileSidebarOpen: open }),
  toggleMobileSidebar: () => set((state) => ({ mobileSidebarOpen: !state.mobileSidebarOpen })),

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

  // Workflow
  currentWorkflowId: null,
  setCurrentWorkflowId: (id: string | null) => set({ currentWorkflowId: id }),

  // Lead → Job prefill
  pendingJobPrefill: null,
  setPendingJobPrefill: (data: JobPrefillData | null) => set({ pendingJobPrefill: data }),

  // Cross-view "New X" create signal
  pendingCreate: null,
  setPendingCreate: (entity) => set({ pendingCreate: entity }),

  // Cross-view Reports tab + filter signal (Phase 6)
  pendingReportsTab: null,
  setPendingReportsTab: (tab) => set({ pendingReportsTab: tab }),
  pendingReportsSalesOutcomesType: null,
  setPendingReportsSalesOutcomesType: (t) => set({ pendingReportsSalesOutcomesType: t }),

  // Cross-view Settings deep-link signal
  pendingSettingsSection: null,
  setPendingSettingsSection: (section) => set({ pendingSettingsSection: section }),
}));

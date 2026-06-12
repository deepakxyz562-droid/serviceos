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
}));

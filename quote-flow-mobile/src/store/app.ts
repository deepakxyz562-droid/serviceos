import { create } from "zustand";

export type Tab = "home" | "quotes" | "invoices" | "customers" | "settings";

interface Business {
  id: string;
  name: string;
  ownerName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  currency: string;
  currencySymbol: string;
  defaultTaxRate: number;
  plan: string;
}

interface User {
  id: string;
  email: string;
  name?: string | null;
}

interface AppState {
  token: string | null;
  user: User | null;
  business: Business | null;
  activeTab: Tab;
  setToken: (t: string | null) => void;
  setUser: (u: User | null) => void;
  setBusiness: (b: Business | null) => void;
  setActiveTab: (t: Tab) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  token: null,
  user: null,
  business: null,
  activeTab: "home",
  setToken: (t) => set({ token: t }),
  setUser: (u) => set({ user: u }),
  setBusiness: (b) => set({ business: b }),
  setActiveTab: (t) => set({ activeTab: t }),
  reset: () => set({ token: null, user: null, business: null, activeTab: "home" }),
}));

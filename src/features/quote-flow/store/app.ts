import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Tab =
  | 'invoices'
  | 'estimates'
  | 'clients'
  | 'items'
  | 'more'
  | 'home'
  | 'quotes'
  | 'customers'
  | 'settings';

export type Modal =
  | { type: 'none' }
  | { type: 'login' }
  | { type: 'register' }
  | { type: 'onboarding' }
  | { type: 'customer-form'; customerId?: string }
  | { type: 'customer-detail'; customerId: string }
  | { type: 'quote-create' }
  | { type: 'quote-detail'; quoteId: string }
  | { type: 'invoice-create' }
  | { type: 'invoice-detail'; invoiceId: string }
  | { type: 'send-quote'; quoteId: string }
  | { type: 'send-invoice'; invoiceId: string }
  | { type: 'pro-upgrade' }
  | { type: 'template-select' };

interface AppState {
  activeTab: Tab;
  setActiveTab: (t: Tab) => void;
  modal: Modal;
  openModal: (m: Modal) => void;
  closeModal: () => void;
  authChecked: boolean;
  setAuthChecked: (v: boolean) => void;
  /** cached business; refreshed by /api/quote-flow/business/onboarding GET */
  business: {
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
  } | null;
  setBusiness: (b: AppState['business']) => void;
  /** light user session mirror */
  user: { id: string; email: string; name?: string | null } | null;
  setUser: (u: AppState['user']) => void;
  signOutClient: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeTab: 'home',
      setActiveTab: (t) => set({ activeTab: t }),
      modal: { type: 'none' },
      openModal: (m) => set({ modal: m }),
      closeModal: () => set({ modal: { type: 'none' } }),
      authChecked: false,
      setAuthChecked: (v) => set({ authChecked: v }),
      business: null,
      setBusiness: (b) => set({ business: b }),
      user: null,
      setUser: (u) => set({ user: u }),
      signOutClient: () =>
        set({ user: null, business: null, activeTab: 'home', modal: { type: 'none' } }),
    }),
    {
      name: 'serviceos-quoteflow-store',
      partialize: (s) => ({
        activeTab: s.activeTab,
        user: s.user,
        business: s.business,
      }),
    }
  )
);

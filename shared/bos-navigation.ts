export type BosNavId =
  | 'dashboard'
  | 'pos'
  | 'inventory'
  | 'orders'
  | 'customers'
  | 'khata'
  | 'invoices'
  | 'appointments'
  | 'onlineStore'
  | 'reports'
  | 'daybook'
  | 'marketing'
  | 'aiAssistant'
  | 'integrations'
  | 'settings';

export type BosNavItem = {
  id: BosNavId;
  label: string;
  description: string;
  shortcut?: string;
};

export const BOS_PRIMARY_NAV_ITEMS: readonly BosNavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Overview of daily sales, orders, customers, appointments, and AI business insights.',
  },
  {
    id: 'pos',
    label: 'Sales / POS',
    description: 'Fast point-of-sale billing counter with barcode scanning, cart, and thermal receipts.',
  },
  {
    id: 'inventory',
    label: 'Products & Inventory',
    description: 'Manage product catalog, categories, stock levels, suppliers, and purchase orders.',
  },
  {
    id: 'orders',
    label: 'Orders',
    description: 'Track POS, online store, and WhatsApp orders with status updates and bill printing.',
  },
  {
    id: 'customers',
    label: 'Customers',
    description: 'Customer directory, purchase history, loyalty points, and segment tags.',
  },
  {
    id: 'khata',
    label: 'Khata / Credit',
    description: 'Customer credit (Udhaar) receivables, supplier payables, and payment reminders.',
  },
  {
    id: 'invoices',
    label: 'Invoices & Payments',
    description: 'Create and manage GST & non-GST tax invoices, credit notes, and UPI payment links.',
  },
  {
    id: 'appointments',
    label: 'Appointments',
    description: 'Manage customer bookings, service calendar, staff schedules, and walk-in queues.',
  },
  {
    id: 'onlineStore',
    label: 'Online Store',
    description: 'Customize your public storefront, QR code, delivery rules, and custom domain.',
  },
  {
    id: 'reports',
    label: 'Reports',
    description: 'Analyze revenue, profit, top-selling products, GST summary, and payment breakdowns.',
  },
  {
    id: 'daybook',
    label: 'Day Book',
    description: 'Daily cash & UPI register ledger, money-in/money-out entries, and day closing.',
  },
  {
    id: 'marketing',
    label: 'Marketing',
    description: 'Run WhatsApp broadcasts, discount coupons, festival offers, and loyalty campaigns.',
  },
  {
    id: 'aiAssistant',
    label: 'AI Assistant',
    description: 'Ask BOS AI about sales trends, low stock restocking, customer dues, and promotions.',
  },
  {
    id: 'integrations',
    label: 'Integrations',
    description: 'Connect WhatsApp Business, UPI/Razorpay, Tally, thermal printers, and delivery partners.',
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'Configure business profile, store preferences, GST & tax, staff roles, and billing.',
  },
] as const;

export const BOS_LEGACY_VIEW_MAP: Record<string, BosNavId> = {
  dashboard: 'dashboard',
  commerce: 'pos',
  pos: 'pos',
  inventory: 'inventory',
  orders: 'orders',
  customers: 'customers',
  crm: 'customers',
  khata: 'khata',
  invoices: 'invoices',
  appointments: 'appointments',
  bookings: 'appointments',
  onlineStore: 'onlineStore',
  storefront: 'onlineStore',
  reports: 'reports',
  daybook: 'daybook',
  expenses: 'daybook',
  marketing: 'marketing',
  campaigns: 'marketing',
  aiAssistant: 'aiAssistant',
  ai: 'aiAssistant',
  integrations: 'integrations',
  settings: 'settings',
};

export function normalizeBosView(view?: string | null): BosNavId {
  if (!view) return 'dashboard';
  return BOS_LEGACY_VIEW_MAP[view] || 'dashboard';
}

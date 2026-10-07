import type { BusinessCapabilities, BusinessType, TenantBlueprint } from './blueprint/types';

export type HomeLanguage = 'en' | 'hi';
export type HomeMetric = 'sales' | 'moneyIn' | 'moneyOut' | 'balance' | 'toCollect' | 'toPay' | 'lowStock' | 'activeOrders' | 'kitchenWaiting' | 'tables' | 'appointments' | 'jobs' | 'quotesDue' | 'invoiceDue' | 'production' | 'materials';
export type HomeAction = 'money_in' | 'money_out' | 'opening' | 'sale' | 'products' | 'stock' | 'khata' | 'expenses' | 'orders' | 'tables' | 'kitchen' | 'bookings' | 'customers' | 'quotes' | 'invoices' | 'jobs' | 'store' | 'production';
export type HomeLabel = HomeMetric | HomeAction | BusinessType | 'home' | 'more' | 'retry' | 'loading' | 'setup' | 'setupRequired' | 'unavailable' | 'error' | 'language' | 'orderScope' | 'invoiceScope' | 'ledgerPending' | 'stockScope' | 'workflowPending';

const labels: Record<HomeLabel, [string, string]> = {
  money_in: ['Money In', 'पैसे आए'], money_out: ['Money Out', 'पैसे दिए'], opening: ['Set opening balance', 'शुरुआती बाकी रकम दर्ज करें'],
  home: ['Home', 'होम'], more: ['More', 'और'], retry: ['Try again', 'फिर कोशिश करें'],
  loading: ['Loading your business…', 'आपका कारोबार लोड हो रहा है…'], setup: ['Business setup', 'कारोबार की सेटिंग'],
  setupRequired: ['Finish your business setup to see your Home.', 'होम देखने के लिए कारोबार की सेटिंग पूरी करें।'],
  unavailable: ['Not available yet', 'अभी उपलब्ध नहीं'], error: ['Could not load your business. Please try again.', 'कारोबार की जानकारी लोड नहीं हुई। फिर कोशिश करें।'],
  language: ['Language', 'भाषा'], orderScope: ['Counter and store orders created today', 'आज के काउंटर और स्टोर के ऑर्डर'],
  invoiceScope: ['Invoices created today, excluding drafts', 'आज बने बिल, ड्राफ़्ट को छोड़कर'],
  ledgerPending: ['A complete payment ledger is needed for this amount.', 'इस रकम के लिए पूरा भुगतान खाता ज़रूरी है।'],
  stockScope: ['Tracked stock only', 'दर्ज किए गए स्टॉक की जानकारी'],
  workflowPending: ['This workflow is being added. Your existing tools are available in More.', 'यह सुविधा जोड़ी जा रही है। मौजूदा सुविधाएँ और में मिलेंगी।'],
  sales: ["Today's Sale", 'आज की बिक्री'], moneyIn: ['Money In today', 'आज आए पैसे'], moneyOut: ['Money Out today', 'आज दिए पैसे'],
  balance: ['Balance', 'बाकी रकम'], toCollect: ['To Collect', 'लेना है'], toPay: ['To Pay', 'देना है'],
  lowStock: ['Products running low', 'कम बचे सामान'], activeOrders: ['Open orders', 'बाकी ऑर्डर'],
  kitchenWaiting: ['Waiting in kitchen', 'रसोई में बाकी ऑर्डर'], tables: ['Tables', 'टेबल'],
  appointments: ["Today's appointments", 'आज की बुकिंग'], jobs: ["Today's jobs", 'आज के काम'],
  quotesDue: ['Quotes awaiting approval', 'मंज़ूरी के लिए बाकी कोटेशन'], invoiceDue: ['Invoices with payment due', 'पैसे लेने वाले बिल'],
  production: ['Production', 'उत्पादन'], materials: ['Materials needed', 'ज़रूरी कच्चा माल'],
  sale: ['New Sale', 'बिक्री करें'], products: ['Add Product', 'सामान जोड़ें'], stock: ['Stock', 'स्टॉक'],
  khata: ['Khata', 'खाता'], expenses: ['Add Expense', 'खर्च जोड़ें'], orders: ['Orders', 'ऑर्डर'],
  kitchen: ['Kitchen', 'रसोई'], bookings: ['Calendar', 'कैलेंडर'], customers: ['Customers', 'ग्राहक'],
  quotes: ['Create Quote', 'कोटेशन बनाएं'], invoices: ['Invoices', 'बिल'], store: ['Store', 'स्टोर'],
  retail: ['Retail shop', 'दुकान'], grocery: ['Kirana / Grocery', 'किराना दुकान'], restaurant: ['Restaurant / Café', 'रेस्टोरेंट / कैफ़े'],
  salon: ['Salon / Beauty', 'सैलून'], services: ['Service business', 'सेवा कारोबार'],
  freelancer: ['Professional services', 'पेशेवर सेवाएँ'], online_store: ['Online store', 'ऑनलाइन स्टोर'],
  wholesale: ['Wholesale', 'थोक कारोबार'], manufacturing: ['Manufacturing', 'निर्माण कारोबार'], other: ['Your business', 'आपका कारोबार'],
};

export function homeText(key: HomeLabel, language: HomeLanguage = 'en'): string {
  return labels[key][language === 'hi' ? 1 : 0];
}

export function homeTabText(action: HomeAction, language: HomeLanguage = 'en'): string {
  const tabs: Partial<Record<HomeAction, [string, string]>> = {
    sale: ['Sell', 'बिक्री'], products: ['Products', 'सामान'], quotes: ['Quotes', 'कोटेशन'], jobs: ['Jobs', 'काम'],
  };
  return tabs[action]?.[language === 'hi' ? 1 : 0] || homeText(action, language);
}

type Capability = keyof BusinessCapabilities;
export interface HomeDestination { view: string; tab?: string; native?: string }
export const HOME_DESTINATIONS: Record<HomeAction, HomeDestination> = {
  money_in: { view: 'formsDashboard', native: '/money?kind=COLLECTION' },
  money_out: { view: 'formsDashboard', native: '/money?kind=EXPENSE' },
  opening: { view: 'formsDashboard', native: '/money?kind=OPENING' },
  sale: { view: 'commerce', tab: 'pos', native: '/pos' },
  products: { view: 'commerce', tab: 'catalog', native: '/catalog?create=1' },
  stock: { view: 'inventory', native: '/stock' },
  khata: { view: 'commerce', tab: 'khata', native: '/khata' },
  expenses: { view: 'commerce', tab: 'daybook', native: '/expenses?create=1' },
  orders: { view: 'commerce', tab: 'orders', native: '/(tabs)/orders' },
  tables: { view: 'commerce', tab: 'dineIn', native: '/dine-in-qr' },
  kitchen: { view: 'commerce', tab: 'kds' },
  bookings: { view: 'booking', native: '/(tabs)/bookings' },
  customers: { view: 'customers', native: '/(tabs)/customers' },
  quotes: { view: 'quoteFlow', native: '/(tabs)/billing' },
  invoices: { view: 'quoteFlow', native: '/(tabs)/billing' },
  jobs: { view: 'jobs' },
  store: { view: 'commerce', tab: 'domain', native: '/custom-domain' },
  production: { view: 'production' },
};

const actionCapabilities: Partial<Record<HomeAction, Capability>> = {
  sale: 'posRegister', products: 'catalog', stock: 'inventory', khata: 'customerCredit', expenses: 'expenses',
  orders: 'orders', tables: 'tables', kitchen: 'kitchenKot', bookings: 'calendarBooking', customers: 'customers',
  quotes: 'quotes', invoices: 'invoicing', jobs: 'jobs', store: 'onlineStore',
};
const metricCapabilities: Partial<Record<HomeMetric, Capability>> = {
  toCollect: 'customerCredit', toPay: 'suppliers', lowStock: 'inventory', activeOrders: 'orders',
  kitchenWaiting: 'kitchenKot', tables: 'tables', appointments: 'calendarBooking', jobs: 'jobs',
  quotesDue: 'quotes', invoiceDue: 'invoicing',
};
interface HomePreset { metrics: HomeMetric[]; actions: HomeAction[]; tabs: HomeAction[] }
const money: HomeMetric[] = ['sales', 'moneyIn', 'moneyOut', 'balance', 'toCollect', 'toPay', 'lowStock'];
export const HOME_PRESETS: Record<BusinessType, HomePreset> = {
  grocery: { metrics: money, actions: ['sale', 'products', 'money_in', 'money_out', 'khata', 'opening'], tabs: ['sale', 'stock', 'khata'] },
  retail: { metrics: money, actions: ['sale', 'products', 'stock', 'money_in', 'money_out', 'opening'], tabs: ['sale', 'stock', 'customers'] },
  restaurant: { metrics: ['sales', 'activeOrders', 'tables', 'kitchenWaiting'], actions: ['orders', 'tables', 'kitchen', 'expenses'], tabs: ['orders', 'tables', 'kitchen'] },
  salon: { metrics: ['appointments', 'sales', 'moneyIn', 'invoiceDue'], actions: ['bookings', 'sale', 'customers', 'invoices'], tabs: ['bookings', 'customers', 'sale'] },
  services: { metrics: ['jobs', 'appointments', 'moneyIn', 'invoiceDue'], actions: ['jobs', 'quotes', 'bookings', 'customers'], tabs: ['jobs', 'bookings', 'customers'] },
  freelancer: { metrics: ['quotesDue', 'invoiceDue', 'moneyIn', 'appointments'], actions: ['quotes', 'invoices', 'customers', 'bookings'], tabs: ['quotes', 'invoices', 'customers'] },
  online_store: { metrics: ['activeOrders', 'sales', 'invoiceDue', 'lowStock'], actions: ['orders', 'products', 'store'], tabs: ['orders', 'products', 'store'] },
  wholesale: { metrics: ['activeOrders', 'sales', 'toCollect', 'toPay', 'lowStock'], actions: ['orders', 'quotes', 'stock', 'khata'], tabs: ['orders', 'stock', 'khata'] },
  manufacturing: { metrics: ['production', 'materials', 'activeOrders', 'lowStock'], actions: ['production', 'stock', 'orders', 'quotes'], tabs: ['production', 'stock', 'orders'] },
  other: { metrics: ['sales', 'moneyIn', 'invoiceDue'], actions: ['sale', 'invoices', 'customers'], tabs: ['sale', 'invoices', 'customers'] },
};

/** One presentation contract for web and native. This never grants API access. */
export function getBusinessHome(blueprint: Pick<TenantBlueprint, 'businessType'> & Partial<TenantBlueprint>) {
  const type = Object.prototype.hasOwnProperty.call(HOME_PRESETS, blueprint.businessType) ? blueprint.businessType : 'other';
  const preset = HOME_PRESETS[type];
  const caps = blueprint.capabilities;
  const allowed = (key?: Capability) => !key || !caps || caps[key] === true;
  const actions = preset.actions.filter((a) => allowed(actionCapabilities[a]));
  const metrics = preset.metrics.filter((m) => allowed(metricCapabilities[m]));
  // Online orders are an addition to the primary experience, not a new workspace.
  if (type !== 'online_store' && blueprint.salesChannels?.some((c) => c === 'online' || c === 'delivery') && allowed('orders') && !metrics.includes('activeOrders')) {
    metrics.push('activeOrders');
  }
  const candidates = [...preset.tabs, 'orders', 'stock', 'customers', 'invoices', 'bookings'] as HomeAction[];
  const tabs = candidates.filter((a, index) => a !== 'production' && candidates.indexOf(a) === index && allowed(actionCapabilities[a])).slice(0, 3);
  return { type, language: blueprint.language === 'hi' ? 'hi' as const : 'en' as const, metrics, actions, tabs };
}

export const MONEY_METRICS: HomeMetric[] = ['sales', 'moneyIn', 'moneyOut', 'balance', 'toCollect', 'toPay'];
export function homeMetricAction(metric: HomeMetric, salesSource: 'orders' | 'invoices' = 'orders'): HomeAction | undefined {
  if (metric === 'sales') return salesSource === 'invoices' ? 'invoices' : 'orders';
  return ({ moneyIn: 'money_in', moneyOut: 'money_out', balance: 'opening', toCollect: 'money_in', toPay: 'money_out', lowStock: 'stock', activeOrders: 'orders', kitchenWaiting: 'kitchen', appointments: 'bookings', jobs: 'jobs', quotesDue: 'quotes', invoiceDue: 'invoices', tables: 'tables' } as Partial<Record<HomeMetric, HomeAction>>)[metric];
}
export interface BusinessHomeSnapshot {
  businessId: string;
  currency: string;
  timezone: string;
  date: string;
  generatedAt: string;
  salesSource: 'orders' | 'invoices';
  metrics: Partial<Record<HomeMetric, number | null>>;
}
export function formatHomeMetric(metric: HomeMetric, value: number | null | undefined, currency: string, language: HomeLanguage) {
  if (value == null || !Number.isFinite(value)) return '—';
  const locale = language === 'hi' ? 'hi-IN' : 'en-IN';
  return new Intl.NumberFormat(locale, MONEY_METRICS.includes(metric)
    ? { style: 'currency', currency, maximumFractionDigits: 2 }
    : { maximumFractionDigits: 0 }).format(value);
}

import { getBusinessHome, HOME_DESTINATIONS, homeTabText, homeText } from '../business-home';
import type { BusinessType, BusinessCapabilities, SalesChannel } from './types';

export const BUSINESS_TYPE_LABELS: Record<BusinessType, { label: string; icon: string; subtitle: string }> = {
  retail: {
    label: 'Retail / Shop',
    icon: '🛍️',
    subtitle: 'Clothing, electronics, general retail, gifts, cosmetics',
  },
  restaurant: {
    label: 'Restaurant / Café',
    icon: '🍽️',
    subtitle: 'Dine-in, takeaway, food truck, cloud kitchen, café, bakery',
  },
  grocery: {
    label: 'Grocery / Supermarket',
    icon: '🏪',
    subtitle: 'Daily essentials, produce, marts, supermarkets, kirana',
  },
  services: {
    label: 'Service Business / Trades',
    icon: '🔧',
    subtitle: 'Plumbing, HVAC, electrical, cleaning, maintenance, roofing',
  },
  salon: {
    label: 'Salon / Beauty / Spa',
    icon: '💇',
    subtitle: 'Hair salons, barbershops, nail studios, aesthetics, massage',
  },
  wholesale: {
    label: 'Wholesale / Distribution',
    icon: '📦',
    subtitle: 'B2B supply, bulk inventory, distributors, traders',
  },
  freelancer: {
    label: 'Freelancer / Professional',
    icon: '🧑‍💻',
    subtitle: 'Consulting, design, legal, marketing, software, photography',
  },
  online_store: {
    label: 'Online Store / Brand',
    icon: '📱',
    subtitle: 'Direct-to-consumer brand, social commerce, catalog sales',
  },
  manufacturing: {
    label: 'Manufacturing / Workshop',
    icon: '🏭',
    subtitle: 'Fabrication, assembly, production workshops, packaging',
  },
  other: {
    label: 'Other Business',
    icon: '🏢',
    subtitle: 'Custom business setup tailored to your exact workflows',
  },
};

export const BASE_CAPABILITIES: BusinessCapabilities = {
  onlineStore: false,
  orders: false,
  posRegister: false,
  catalog: false,
  inventory: false,
  purchases: false,
  suppliers: false,
  dining: false,
  tables: false,
  kitchenKot: false,
  reservations: false,
  leads: false,
  jobs: false,
  dispatch: false,
  calendarBooking: false,
  invoicing: true,
  quotes: false,
  expenses: true,
  customerCredit: true,
  customers: true,
  loyalty: false,
  marketingBlasts: false,
  whatsapp: false,
  aiReceptionist: false,
  aiAgent: false,
  forms: false,
  customDomain: false,
};

export const BUSINESS_TYPE_PRESETS: Record<BusinessType, BusinessCapabilities> = {
  restaurant: {
    ...BASE_CAPABILITIES,
    dining: true,
    tables: true,
    kitchenKot: true,
    reservations: true,
    onlineStore: true,
    orders: true,
    posRegister: true,
    catalog: true,
    inventory: true,
    purchases: true,
    suppliers: true,
    invoicing: true,
    quotes: false,
    expenses: true,
    customerCredit: false,
    customers: true,
    loyalty: true,
    marketingBlasts: true,
  },

  retail: {
    ...BASE_CAPABILITIES,
    onlineStore: true,
    orders: true,
    posRegister: true,
    catalog: true,
    inventory: true,
    purchases: true,
    suppliers: true,
    invoicing: true,
    quotes: true,
    expenses: true,
    customerCredit: true,
    customers: true,
    loyalty: true,
    marketingBlasts: true,
    customDomain: true,
  },

  grocery: {
    ...BASE_CAPABILITIES,
    onlineStore: true,
    orders: true,
    posRegister: true,
    catalog: true,
    inventory: true,
    purchases: true,
    suppliers: true,
    invoicing: true,
    expenses: true,
    customerCredit: true,
    customers: true,
    loyalty: true,
  },

  services: {
    ...BASE_CAPABILITIES,
    leads: true,
    jobs: true,
    dispatch: true,
    calendarBooking: true,
    invoicing: true,
    quotes: true,
    expenses: true,
    customerCredit: true,
    customers: true,
    aiReceptionist: true,
  },

  salon: {
    ...BASE_CAPABILITIES,
    calendarBooking: true,
    posRegister: true,
    catalog: true,
    inventory: true,
    invoicing: true,
    expenses: true,
    customers: true,
    loyalty: true,
    marketingBlasts: true,
    aiReceptionist: true,
  },

  wholesale: {
    ...BASE_CAPABILITIES,
    orders: true,
    catalog: true,
    inventory: true,
    purchases: true,
    suppliers: true,
    invoicing: true,
    quotes: true,
    expenses: true,
    customerCredit: true,
    customers: true,
  },

  freelancer: {
    ...BASE_CAPABILITIES,
    leads: true,
    invoicing: true,
    quotes: true,
    expenses: true,
    customers: true,
    calendarBooking: true,
  },

  online_store: {
    ...BASE_CAPABILITIES,
    onlineStore: true,
    orders: true,
    catalog: true,
    inventory: true,
    invoicing: true,
    customers: true,
    marketingBlasts: true,
    customDomain: true,
  },

  manufacturing: {
    ...BASE_CAPABILITIES,
    orders: true,
    catalog: true,
    inventory: true,
    purchases: true,
    suppliers: true,
    invoicing: true,
    quotes: true,
    expenses: true,
    customers: true,
  },

  other: {
    ...BASE_CAPABILITIES,
    onlineStore: true,
    orders: true,
    posRegister: true,
    catalog: true,
    inventory: true,
    invoicing: true,
    quotes: true,
    expenses: true,
    customers: true,
  },
};

export function getCapabilitiesForBusinessType(type: BusinessType): BusinessCapabilities {
  return { ...BUSINESS_TYPE_PRESETS[type] || BUSINESS_TYPE_PRESETS.other };
}

export const SALES_CHANNEL_INFO: Record<SalesChannel, { label: string; icon: string; description: string }> = {
  in_store: {
    label: 'In-store / Counter',
    icon: '🏪',
    description: 'Walk-in retail, counter billing & physical checkout',
  },
  online: {
    label: 'Online Store / Website',
    icon: '🌐',
    description: 'Direct-to-consumer store, web storefront & digital ordering',
  },
  whatsapp: {
    label: 'WhatsApp / Chat Commerce',
    icon: '💬',
    description: 'WhatsApp catalog sharing, chat orders & digital bills',
  },
  dine_in: {
    label: 'Dine-in / Tables',
    icon: '🍽️',
    description: 'Table management, dine-in ordering & kitchen order tickets',
  },
  delivery: {
    label: 'Delivery & Takeout',
    icon: '🛵',
    description: 'Local delivery, takeaway pickup or courier shipments',
  },
  at_location: {
    label: "At Customer's Location",
    icon: '📍',
    description: 'On-site service visits, installations & mobile appointments',
  },
  b2b: {
    label: 'Wholesale / B2B',
    icon: '📦',
    description: 'B2B supply, bulk quotes, credit accounts & purchase orders',
  },
};

export const DEFAULT_CHANNELS_FOR_BUSINESS_TYPE: Record<BusinessType, SalesChannel[]> = {
  retail: ['in_store', 'whatsapp'],
  restaurant: ['dine_in', 'delivery', 'online'],
  grocery: ['in_store', 'whatsapp', 'delivery'],
  services: ['at_location', 'whatsapp'],
  salon: ['in_store', 'online'],
  wholesale: ['b2b', 'whatsapp'],
  freelancer: ['online', 'at_location'],
  online_store: ['online', 'whatsapp', 'delivery'],
  manufacturing: ['b2b', 'at_location'],
  other: ['in_store', 'online'],
};

/**
 * Resolves the full capability matrix by combining Business Type + Sales Channels.
 * Ensures the business only sees capabilities relevant to how they operate.
 */
export function resolveBlueprintCapabilities(
  type: BusinessType,
  channels?: SalesChannel[],
  overrides?: Partial<BusinessCapabilities>
): BusinessCapabilities {
  const activeChannels = channels && channels.length > 0
    ? channels
    : (DEFAULT_CHANNELS_FOR_BUSINESS_TYPE[type] || ['in_store']);

  const base = getCapabilitiesForBusinessType(type);

  // Dynamic overrides derived from chosen sales channels
  const dynamic: Partial<BusinessCapabilities> = {
    onlineStore: activeChannels.includes('online'),
    customDomain: activeChannels.includes('online'),
    dining: activeChannels.includes('dine_in'),
    tables: activeChannels.includes('dine_in'),
    reservations: activeChannels.includes('dine_in'),
    kitchenKot: type === 'restaurant' || activeChannels.includes('dine_in'),
    whatsapp: activeChannels.includes('whatsapp'),
    aiReceptionist: false, aiAgent: false, forms: false,
    loyalty: false, marketingBlasts: false,
  };

  if (activeChannels.includes('in_store')) {
    dynamic.posRegister = true;
    dynamic.catalog = true;
  }

  if (activeChannels.includes('online')) {
    dynamic.onlineStore = true;
    dynamic.customDomain = true;
    dynamic.orders = true;
  }

  if (activeChannels.includes('whatsapp')) {
    dynamic.whatsapp = true;
  }

  if (activeChannels.includes('dine_in')) {
    dynamic.dining = true;
    dynamic.tables = true;
    dynamic.kitchenKot = true;
    dynamic.reservations = true;
  }

  if (activeChannels.includes('delivery')) {
    dynamic.orders = true;
  }

  if (activeChannels.includes('at_location')) {
    dynamic.jobs = true;
    dynamic.calendarBooking = true;
    dynamic.leads = true;
  }

  if (activeChannels.includes('b2b')) {
    dynamic.quotes = true;
    dynamic.customerCredit = true;
    dynamic.suppliers = true;
    dynamic.purchases = true;
  }

  return {
    ...base,
    ...dynamic,
    ...(overrides || {}),
  };
}

export interface DynamicMobileTab {
  key: string;
  view: string;
  tab?: string;
  label: string;
  iconName: 'LayoutDashboard' | 'ShoppingBag' | 'ShoppingCart' | 'UtensilsCrossed' | 'ChefHat' | 'Calendar' | 'Users' | 'Briefcase' | 'Package' | 'Store' | 'FileText';
}

/**
 * Returns the tailored 4-item bottom navigation for GPTForm mobile app.
 * A 5th "More" item is automatically rendered by MobileBottomNav to access apps & management.
 */
export function getMobileNavTabsForBlueprint(blueprint?: {
  businessType?: BusinessType;
  salesChannels?: SalesChannel[];
  capabilities?: Partial<BusinessCapabilities>;
  language?: 'en' | 'hi';
}): DynamicMobileTab[] {
  const home = getBusinessHome({ ...blueprint, businessType: blueprint?.businessType || 'retail', capabilities: blueprint?.capabilities as BusinessCapabilities | undefined });
  const icons: Record<string, DynamicMobileTab['iconName']> = {
    sale: 'ShoppingCart', orders: 'ShoppingBag', stock: 'Package', customers: 'Users',
    khata: 'FileText', tables: 'UtensilsCrossed', kitchen: 'ChefHat', bookings: 'Calendar',
    products: 'Package', store: 'Store', quotes: 'FileText', invoices: 'FileText', jobs: 'Briefcase',
  };
  return [
    { key: 'home', view: 'formsDashboard', label: homeText('home', home.language), iconName: 'LayoutDashboard' },
    ...home.tabs.map((action) => ({ key: action, ...HOME_DESTINATIONS[action], label: homeTabText(action, home.language), iconName: icons[action] || 'FileText' })),
  ];
}

export interface DynamicNavSection {
  title: string;
  items: {
    view: string;
    label: string;
    iconName: string;
    badge?: string;
    tab?: string;
  }[];
}

/**
 * Returns dynamic web sidebar navigation sections for standalone GPTForm / Nuvora tenants,
 * organized into the 3-layer architecture:
 * Layer 1 (Core Operations), Layer 2 (Vertical Modules & Finance), Layer 3 (Apps & Add-ons), Account.
 */
export function getStandaloneNavSectionsForBlueprint(
  blueprint?: {
    businessType?: BusinessType;
    salesChannels?: SalesChannel[];
    capabilities?: Partial<BusinessCapabilities>;
    country?: import('./types').CountryCode;
  },
  productType?: string
): DynamicNavSection[] {
  // ── Dedicated Chatbotly Navigation ──
  if (productType === 'chatbotly') {
    return [
      {
        title: 'Intake & Forms',
        items: [
          { view: 'formBuilder', label: 'Conversational Forms', iconName: 'FileInput' },
          { view: 'formSubmissions', label: 'Submissions', iconName: 'Users' },
          { view: 'formsAnalytics', label: 'Form Analytics', iconName: 'LayoutDashboard' },
        ],
      },
      {
        title: 'AI Studio',
        items: [
          { view: 'agentStudio', label: 'AI Agents', iconName: 'Bot', badge: 'AI' },
          { view: 'chatbotBuilder', label: 'Website Chatbots', iconName: 'RadioTower' },
          { view: 'aiReceptionist', label: 'Voice Receptionist', iconName: 'PhoneCall', badge: 'VOICE' },
        ],
      },
      {
        title: 'Engagement',
        items: [
          { view: 'omnichannel', label: 'Live Inbox', iconName: 'RadioTower' },
          { view: 'booking', label: 'Appointments & Calendar', iconName: 'Calendar' },
        ],
      },
      {
        title: 'Settings & Integrations',
        items: [
          { view: 'integrations', label: 'Integrations & Webhooks', iconName: 'Share2' },
          { view: 'billing', label: 'Plan & Billing', iconName: 'CreditCard' },
          { view: 'settings', label: 'Settings', iconName: 'Settings' },
        ],
      },
    ];
  }

  // ── Dedicated BOS (Business Operating System) Navigation ──
  const type = blueprint?.businessType || 'retail';
  const capabilities = blueprint?.capabilities || resolveBlueprintCapabilities(type, blueprint?.salesChannels);

  const coreLabel = type === 'restaurant'
    ? 'Orders & POS'
    : type === 'salon'
    ? 'POS & Sales'
    : type === 'services'
    ? 'Jobs'
    : type === 'online_store'
    ? 'Orders & Store'
    : 'POS & Orders';

  const sections: DynamicNavSection[] = [
    {
      title: 'Operations',
      items: [
        { view: 'formsDashboard', label: 'Today', iconName: 'LayoutDashboard' },
        { view: type === 'services' ? 'jobs' : type === 'freelancer' ? 'invoices' : 'commerce', label: type === 'freelancer' ? 'Invoices' : coreLabel, iconName: type === 'services' ? 'Briefcase' : 'ShoppingBag' },
        { view: 'customers', label: 'Customers', iconName: 'Users' },
      ],
    },
  ];

  // Layer 2: Vertical Modules
  if (type === 'restaurant') {
    sections.push({
      title: 'Dining & Kitchen',
      items: [
        ...(capabilities.tables ? [{ view: 'commerce', label: 'Tables', iconName: 'UtensilsCrossed', tab: 'dineIn' }] : []),
        ...(capabilities.kitchenKot ? [{ view: 'commerce', label: 'Kitchen', iconName: 'ChefHat', tab: 'kds' }] : []),
        { view: 'commerce', label: 'Menu & Items', iconName: 'Store', tab: 'catalog' },
      ],
    });
  } else if (type === 'salon' || type === 'services') {
    sections.push({
      title: 'Schedule & Appointments',
      items: [
        { view: 'booking', label: 'Calendar & Bookings', iconName: 'Calendar' },
        ...(type === 'salon' ? [{ view: 'commerce', label: 'Services Catalog', iconName: 'Store', tab: 'catalog' }] : []),
      ],
    });
  } else if (type === 'online_store') {
    sections.push({
      title: 'Storefront',
      items: [
        { view: 'commerce', label: 'Products Catalog', iconName: 'Store', tab: 'catalog' },
        { view: 'commerce', label: 'Online Store Setup', iconName: 'Globe', tab: 'domain' },
      ],
    });
  } else {
    // Retail / Kirana / Wholesale / Other
    sections.push({
      title: 'Catalog & Stock',
      items: [
        { view: 'commerce', label: 'Products & Stock', iconName: 'Store', tab: 'catalog' },
      ],
    });
  }

  // Finance & Ledger
  sections.push({
    title: 'Finance & Ledger',
    items: [
      ...(capabilities.invoicing ? [{ view: 'invoices', label: 'Invoices', iconName: 'Receipt' }] : []),
      ...(capabilities.customerCredit ? [{ view: 'commerce', label: blueprint?.country === 'IN' ? 'Khata' : 'Customer Dues', iconName: 'Users', tab: 'khata' }] : []),
      ...(capabilities.expenses ? [{ view: 'commerce', label: 'Expenses', iconName: 'FileText', tab: 'daybook' }] : []),
    ],
  });

  // Layer 3: Apps & Add-ons
  sections.push({
    title: 'Apps & Add-ons',
    items: [
      ...(capabilities.aiAgent ? [{ view: 'agentStudio', label: 'AI Agent Studio', iconName: 'Bot', badge: 'AI' }] : []),
      ...(capabilities.aiReceptionist ? [{ view: 'aiReceptionist', label: 'AI Voice Receptionist', iconName: 'PhoneCall', badge: 'VOICE' }] : []),
      ...(capabilities.forms ? [{ view: 'formBuilder', label: 'Intake Forms', iconName: 'FileInput' }] : []),
      ...(capabilities.whatsapp ? [{ view: 'omnichannel', label: 'Inbox', iconName: 'RadioTower' }] : []),
      { view: 'integrations', label: 'Integrations & Webhooks', iconName: 'Share2' },
    ],
  });

  // Account
  sections.push({
    title: 'Account',
    items: [
      { view: 'billing', label: 'Plan & Billing', iconName: 'CreditCard' },
      { view: 'settings', label: 'Settings', iconName: 'Settings' },
    ],
  });

  return sections;
}

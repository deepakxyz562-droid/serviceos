'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  Boxes,
  Calendar,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Crown,
  FileText,
  Globe,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Package,
  Plug,
  Plus,
  Printer,
  Receipt,
  Search,
  Settings,
  ShoppingBag,
  Sparkles,
  Store,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  BOS_PRIMARY_NAV_ITEMS,
  type BosNavId,
  normalizeBosView,
} from '../../../shared/bos-navigation';
import { BosBrand } from '@/components/bos/brand';
import { useBosDocumentBrand } from '@/components/bos/document-brand';
import '@/components/bos/workspace.css';
import {
  type BosAppointment,
  type BosCoupon,
  type BosCustomer,
  type BosDaybookEntry,
  type BosKhataTransaction,
  type BosOrder,
  type BosProductItem,
  type BosStoreSettings,
  formatBosCurrency,
  getInitials,
} from '@/components/bos/bos-types';
import { BosDashboardWorkstation } from '@/components/bos/bos-dashboard-workstation';
import { BosPosWorkstation } from '@/components/bos/bos-pos-workstation';
import { BosInventoryWorkstation } from '@/components/bos/bos-inventory-workstation';
import { BosOrdersWorkstation } from '@/components/bos/bos-orders-workstation';
import { BosCustomersKhataWorkstation } from '@/components/bos/bos-customers-khata-workstation';
import { BosInvoicesWorkstation } from '@/components/bos/bos-invoices-workstation';
import { BosAppointmentsWorkstation } from '@/components/bos/bos-appointments-workstation';
import { BosOnlineStoreWorkstation } from '@/components/bos/bos-online-store-workstation';
import { BosReportsDaybookWorkstation } from '@/components/bos/bos-reports-daybook-workstation';
import { BosMarketingAiIntegrationsSettings } from '@/components/bos/bos-marketing-ai-integrations-settings';
import {
  ThermalPrinterModal,
  type ThermalPrinterConfig,
} from '@/components/commerce/thermal-printer-modal';
import {
  DEFAULT_PRINTER_CONFIG,
  loadPrinterConfig,
  printCustomerBill,
  savePrinterConfig,
} from '@/lib/hardware/print-service';

const NAV_ICON_MAP: Record<BosNavId, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  pos: ShoppingBag,
  inventory: Boxes,
  orders: Receipt,
  customers: Users,
  khata: Wallet,
  invoices: FileText,
  appointments: Calendar,
  onlineStore: Store,
  reports: BarChart3,
  daybook: BookOpen,
  marketing: Megaphone,
  aiAssistant: Sparkles,
  integrations: Plug,
  settings: Settings,
};

const DEFAULT_PRODUCTS: BosProductItem[] = [
  {
    id: 'prod-1',
    name: 'Aashirvaad Whole Wheat Atta (5kg)',
    category: 'Groceries',
    price: 245,
    mrp: 265,
    costPrice: 205,
    stockQuantity: 48,
    lowStockThreshold: 10,
    sku: 'SKU-GR-101',
    barcode: '8901725121440',
    unit: '5 kg Pack',
    gstRate: 5,
    hsnCode: '1101',
    onlineVisible: true,
  },
  {
    id: 'prod-2',
    name: 'Tata Tea Gold Leaf (500g)',
    category: 'Beverages',
    price: 260,
    mrp: 285,
    costPrice: 215,
    stockQuantity: 3,
    lowStockThreshold: 10,
    sku: 'SKU-BV-102',
    barcode: '8901052001420',
    unit: '500 g Pack',
    gstRate: 5,
    hsnCode: '0902',
    onlineVisible: true,
  },
  {
    id: 'prod-3',
    name: 'Amul Butter Pasteurised (500g)',
    category: 'Dairy & Bakery',
    price: 275,
    mrp: 285,
    costPrice: 248,
    stockQuantity: 5,
    lowStockThreshold: 12,
    sku: 'SKU-DB-103',
    barcode: '8901262010023',
    unit: '500 g Pack',
    gstRate: 12,
    hsnCode: '0405',
    onlineVisible: true,
  },
  {
    id: 'prod-4',
    name: 'Surf Excel Matic Liquid (1L)',
    category: 'Personal Care',
    price: 220,
    mrp: 240,
    costPrice: 182,
    stockQuantity: 2,
    lowStockThreshold: 8,
    sku: 'SKU-PC-104',
    barcode: '8901030845218',
    unit: '1 L Pouch',
    gstRate: 18,
    hsnCode: '3402',
    onlineVisible: true,
  },
  {
    id: 'prod-5',
    name: 'India Gate Basmati Rice Super (5kg)',
    category: 'Groceries',
    price: 620,
    mrp: 690,
    costPrice: 510,
    stockQuantity: 34,
    lowStockThreshold: 8,
    sku: 'SKU-GR-105',
    barcode: '8901537002016',
    unit: '5 kg Bag',
    gstRate: 5,
    hsnCode: '1006',
    onlineVisible: true,
  },
  {
    id: 'prod-6',
    name: 'Fortune Sunlite Refined Sunflower Oil (1L)',
    category: 'Groceries',
    price: 145,
    mrp: 160,
    costPrice: 124,
    stockQuantity: 62,
    lowStockThreshold: 15,
    sku: 'SKU-GR-106',
    barcode: '8906007280115',
    unit: '1 L Pouch',
    gstRate: 5,
    hsnCode: '1512',
    onlineVisible: true,
  },
  {
    id: 'prod-7',
    name: 'Dettol Original Antiseptic Liquid (550ml)',
    category: 'Personal Care',
    price: 195,
    mrp: 215,
    costPrice: 158,
    stockQuantity: 26,
    lowStockThreshold: 8,
    sku: 'SKU-PC-107',
    barcode: '8901396115205',
    unit: '550 ml Bottle',
    gstRate: 12,
    hsnCode: '3808',
    onlineVisible: true,
  },
  {
    id: 'prod-8',
    name: 'Britannia Good Day Cashew Cookies (600g)',
    category: 'Snacks',
    price: 120,
    mrp: 140,
    costPrice: 96,
    stockQuantity: 40,
    lowStockThreshold: 10,
    sku: 'SKU-SN-108',
    barcode: '8901063142121',
    unit: '600 g Pack',
    gstRate: 18,
    hsnCode: '1905',
    onlineVisible: true,
  },
];

const DEFAULT_ORDERS: BosOrder[] = [
  {
    id: '#ORD-1048',
    customerName: 'Priya Patel',
    customerPhone: '+91 98201 11223',
    customerAddress: 'Flat 402, Green Acres, Andheri West',
    channel: 'pos',
    status: 'completed',
    paymentMode: 'upi',
    paymentStatus: 'paid',
    totalAmount: 1250,
    subtotalAmount: 1250,
    items: [
      { name: 'India Gate Basmati Rice Super (5kg)', qty: 1, price: 620 },
      { name: 'Aashirvaad Whole Wheat Atta (5kg)', qty: 1, price: 245 },
      { name: 'Amul Butter Pasteurised (500g)', qty: 1, price: 275 },
      { name: 'Britannia Good Day Cashew Cookies', qty: 1, price: 110 },
    ],
    createdAt: 'Today, 10:42 AM',
  },
  {
    id: '#ORD-1047',
    customerName: 'Amit Kumar',
    customerPhone: '+91 98765 44321',
    customerAddress: 'B-14, Shanti Niketan Society',
    channel: 'online',
    status: 'new',
    paymentMode: 'khata',
    paymentStatus: 'pending',
    totalAmount: 480,
    subtotalAmount: 480,
    items: [
      { name: 'Tata Tea Gold Leaf (500g)', qty: 1, price: 260 },
      { name: 'Surf Excel Matic Liquid (1L)', qty: 1, price: 220 },
    ],
    createdAt: 'Today, 10:15 AM',
  },
  {
    id: '#ORD-1046',
    customerName: 'Sneha Gupta',
    customerPhone: '+91 99102 33445',
    customerAddress: 'Walk-in Counter #1',
    channel: 'pos',
    status: 'completed',
    paymentMode: 'cash',
    paymentStatus: 'paid',
    totalAmount: 2150,
    subtotalAmount: 2150,
    items: [
      { name: 'India Gate Basmati Rice Super (5kg)', qty: 2, price: 620 },
      { name: 'Fortune Sunlite Refined Sunflower Oil (1L)', qty: 4, price: 145 },
      { name: 'Aashirvaad Whole Wheat Atta (5kg)', qty: 1, price: 330 },
    ],
    createdAt: 'Today, 09:50 AM',
  },
  {
    id: '#ORD-1045',
    customerName: 'Rohan Singh',
    customerPhone: '+91 98111 77889',
    customerAddress: 'Plot 9, MG Road Market',
    channel: 'whatsapp',
    status: 'preparing',
    paymentMode: 'upi',
    paymentStatus: 'paid',
    totalAmount: 890,
    subtotalAmount: 890,
    items: [
      { name: 'Amul Butter Pasteurised (500g)', qty: 2, price: 275 },
      { name: 'Dettol Original Antiseptic Liquid', qty: 1, price: 195 },
      { name: 'Fortune Sunlite Refined Sunflower Oil', qty: 1, price: 145 },
    ],
    createdAt: 'Today, 09:20 AM',
  },
];

const DEFAULT_CUSTOMERS: BosCustomer[] = [
  {
    id: 'cust-1',
    name: 'Rajesh Verma',
    phone: '+91 98765 43210',
    address: 'Sector 14, Vashi, Navi Mumbai',
    gstin: '27AABCV1234F1Z2',
    segment: 'VIP',
    ordersCount: 42,
    totalSpent: 48650,
    khataBalance: 4200,
    loyaltyPoints: 1240,
    lastVisit: 'Today, 11:20 AM',
  },
  {
    id: 'cust-2',
    name: 'Priya Patel',
    phone: '+91 98201 11223',
    address: 'Flat 402, Green Acres, Andheri West',
    segment: 'VIP',
    ordersCount: 28,
    totalSpent: 32400,
    khataBalance: 0,
    loyaltyPoints: 860,
    lastVisit: 'Today, 10:42 AM',
  },
  {
    id: 'cust-3',
    name: 'Amit Kumar',
    phone: '+91 98765 44321',
    address: 'B-14, Shanti Niketan Society',
    segment: 'Regular',
    ordersCount: 16,
    totalSpent: 14800,
    khataBalance: 2450,
    loyaltyPoints: 410,
    lastVisit: 'Today, 10:15 AM',
  },
  {
    id: 'cust-4',
    name: 'Mehta General Traders',
    phone: '+91 98201 44510',
    address: 'Shop 12, APMC Market, Vashi',
    gstin: '27AADCM4821B1Z2',
    segment: 'Wholesale',
    ordersCount: 54,
    totalSpent: 184200,
    khataBalance: 10172,
    loyaltyPoints: 2450,
    lastVisit: 'Yesterday',
  },
  {
    id: 'cust-5',
    name: 'Sneha Gupta',
    phone: '+91 99102 33445',
    address: 'Palm Beach Residency, Nerul',
    segment: 'Regular',
    ordersCount: 19,
    totalSpent: 19200,
    khataBalance: -800,
    loyaltyPoints: 520,
    lastVisit: 'Today, 09:50 AM',
  },
];

const DEFAULT_KHATA_TX: BosKhataTransaction[] = [
  {
    id: 'ktx-1',
    partyId: 'cust-1',
    partyName: 'Rajesh Verma',
    partyType: 'customer',
    type: 'gave',
    amount: 1850,
    mode: 'credit',
    note: 'Credit Bill #ORD-1042 (12 items)',
    createdAt: 'Today, 11:20 AM',
  },
  {
    id: 'ktx-2',
    partyId: 'cust-1',
    partyName: 'Rajesh Verma',
    partyType: 'customer',
    type: 'got',
    amount: 2000,
    mode: 'upi',
    note: 'Part Payment Received (UPI / GPay)',
    createdAt: '20 Apr 2026',
  },
  {
    id: 'ktx-3',
    partyId: 'cust-1',
    partyName: 'Rajesh Verma',
    partyType: 'customer',
    type: 'gave',
    amount: 4350,
    mode: 'credit',
    note: 'Monthly Grocery Order #ORD-0998',
    createdAt: '14 Apr 2026',
  },
];

const DEFAULT_APPOINTMENTS: BosAppointment[] = [
  {
    id: 'appt-1',
    bookingCode: '#APT-2084',
    customerName: 'Amit Kumar',
    customerPhone: '+91 98765 44321',
    serviceName: 'Haircut & Styling',
    staffName: 'Neha',
    scheduledAt: '11:30 AM',
    durationMinutes: 45,
    amount: 650,
    paymentStatus: 'paid',
    status: 'confirmed',
  },
  {
    id: 'appt-2',
    bookingCode: '#APT-2085',
    customerName: 'Vikram Joshi',
    customerPhone: '+91 98220 55110',
    serviceName: 'Beard Trim',
    staffName: 'Rohan',
    scheduledAt: '01:00 PM',
    durationMinutes: 30,
    amount: 350,
    paymentStatus: 'pending',
    status: 'confirmed',
  },
  {
    id: 'appt-3',
    bookingCode: '#APT-2086',
    customerName: 'Ananya Roy',
    customerPhone: '+91 98190 66778',
    serviceName: 'Facial Treatment',
    staffName: 'Pooja',
    scheduledAt: '03:15 PM',
    durationMinutes: 60,
    amount: 1400,
    paymentStatus: 'pending',
    status: 'pending',
  },
  {
    id: 'appt-4',
    bookingCode: '#APT-2087',
    customerName: 'Karan Mehra',
    customerPhone: '+91 99204 88990',
    serviceName: 'Hair Spa',
    staffName: 'Neha',
    scheduledAt: '05:00 PM',
    durationMinutes: 60,
    amount: 1800,
    paymentStatus: 'pending',
    status: 'confirmed',
  },
];

const DEFAULT_DAYBOOK: BosDaybookEntry[] = [
  {
    id: 'db-1',
    time: '02:42 PM',
    partyName: 'POS Retail Sale — Rajesh Verma',
    subtitle: '12 items • Counter #1',
    category: 'POS Sale',
    refNumber: '#ORD-1048',
    paymentMode: 'upi',
    moneyIn: 1480,
    moneyOut: 0,
    createdAt: 'Today',
  },
  {
    id: 'db-2',
    time: '01:55 PM',
    partyName: 'Khata Payment Received — Anita Desai',
    subtitle: 'Cleared previous month due',
    category: 'Khata In',
    refNumber: 'KHT-892',
    paymentMode: 'cash',
    moneyIn: 2500,
    moneyOut: 0,
    createdAt: 'Today',
  },
  {
    id: 'db-3',
    time: '01:15 PM',
    partyName: 'Metro Cash & Carry Wholesale',
    subtitle: 'Beverages & Snacks Restock PO',
    category: 'Supplier',
    refNumber: 'PO-2026-089',
    paymentMode: 'bank',
    moneyIn: 0,
    moneyOut: 4500,
    createdAt: 'Today',
  },
  {
    id: 'db-4',
    time: '12:30 PM',
    partyName: 'Store Electricity & Diesel Generator',
    subtitle: 'Paid to MSEB / Local Vendor',
    category: 'Expense',
    refNumber: 'EXP-402',
    paymentMode: 'cash',
    moneyIn: 0,
    moneyOut: 1200,
    createdAt: 'Today',
  },
  {
    id: 'db-5',
    time: '11:48 AM',
    partyName: 'B2B GST Invoice — Mehta General Traders',
    subtitle: 'Part payment against INV-2026-0842',
    category: 'Invoice',
    refNumber: 'INV-0842',
    paymentMode: 'upi',
    moneyIn: 5000,
    moneyOut: 0,
    createdAt: 'Today',
  },
];

const DEFAULT_COUPONS: BosCoupon[] = [
  {
    id: 'cp-1',
    code: 'WEEKEND15',
    type: 'percentage',
    value: 15,
    minOrder: 499,
    active: true,
    usageCount: 142,
  },
  {
    id: 'cp-2',
    code: 'WELCOME100',
    type: 'flat',
    value: 100,
    minOrder: 599,
    active: true,
    usageCount: 98,
  },
  {
    id: 'cp-3',
    code: 'FREEDEL',
    type: 'flat',
    value: 40,
    minOrder: 299,
    active: true,
    usageCount: 78,
  },
];

export function BosWebApp({
  initialView = 'dashboard',
}: {
  initialView?: BosNavId | string;
}) {
  const [activeView, setActiveView] = useState<BosNavId>(() => normalizeBosView(initialView));
  const [navContext, setNavContext] = useState<{
    action?: string;
    prompt?: string;
    itemId?: string;
  } | null>(null);

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [userName, setUserName] = useState('Rahul Sharma');
  const [userRole, setUserRole] = useState('Owner');
  const [userEmail, setUserEmail] = useState('rahul@sharmastore.in');

  const [storeSettings, setStoreSettings] = useState<BosStoreSettings>({
    businessName: 'Sharma General Store',
    businessSlug: 'sharma-general-store',
    businessType: 'Retail Supermarket & Kirana',
    tagline: 'Fresh Groceries & Daily Essentials Delivered in 30 Mins',
    phone: '+91 98765 43210',
    whatsappNumber: '+91 98765 43210',
    email: 'contact@sharmageneralstore.in',
    address: 'Shop No. 14, Ground Floor, Green Valley Market, MG Road, Pune - 411001',
    city: 'Pune',
    state: '27 - Maharashtra',
    pincode: '411001',
    gstin: '27AABCS1429B1Z5',
    pan: 'AABCS1429B',
    upiId: 'sharmastore@okhdfcbank',
    bankName: 'HDFC Bank',
    accountNumber: '50200048291042',
    ifscCode: 'HDFC0001204',
    currencySymbol: '₹',
    storeLive: true,
    minOrderAmount: 199,
    deliveryCharge: 30,
    freeDeliveryAbove: 499,
    deliveryRadiusKm: 5,
    enableLocalDelivery: true,
    enableStorePickup: true,
    themeColor: '#0A6847',
    announcementBanner: 'Free Home Delivery on Orders Above ₹499! Use code WELCOME50',
  });

  const [branches] = useState([
    { id: 'br-1', name: 'Sharma General Store', location: 'MG Road Main Branch' },
    { id: 'br-2', name: 'Sharma Express Mart', location: 'Kothrud Branch' },
  ]);
  const [storeMenuOpen, setStoreMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [printerModalOpen, setPrinterModalOpen] = useState(false);
  const [printerConfig, setPrinterConfig] = useState<ThermalPrinterConfig>(() =>
    loadPrinterConfig(),
  );

  const [globalSearch, setGlobalSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const globalSearchInputRef = useRef<HTMLInputElement | null>(null);

  const [products, setProducts] = useState<BosProductItem[]>(DEFAULT_PRODUCTS);
  const [orders, setOrders] = useState<BosOrder[]>(DEFAULT_ORDERS);
  const [customers, setCustomers] = useState<BosCustomer[]>(DEFAULT_CUSTOMERS);
  const [khataTransactions, setKhataTransactions] =
    useState<BosKhataTransaction[]>(DEFAULT_KHATA_TX);
  const [appointments, setAppointments] = useState<BosAppointment[]>(DEFAULT_APPOINTMENTS);
  const [daybookEntries, setDaybookEntries] = useState<BosDaybookEntry[]>(DEFAULT_DAYBOOK);
  const [coupons, setCoupons] = useState<BosCoupon[]>(DEFAULT_COUPONS);

  const activeNavMeta = useMemo(
    () => BOS_PRIMARY_NAV_ITEMS.find((i) => i.id === activeView) || BOS_PRIMARY_NAV_ITEMS[0],
    [activeView],
  );

  useBosDocumentBrand({
    active: true,
    sectionLabel: activeNavMeta.label,
  });

  // Keyboard shortcut Cmd+K / Ctrl+K for Global Search / Ask BOS AI
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        globalSearchInputRef.current?.focus();
        setSearchFocused(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Load initial database state from shared API endpoints
  useEffect(() => {
    let cancelled = false;

    async function hydrateFromDatabase() {
      try {
        const [meRes, commRes, khataRes, custRes, bookRes] = await Promise.allSettled([
          fetch('/api/auth/me', { credentials: 'include' }),
          fetch('/api/commerce', { credentials: 'include' }),
          fetch('/api/commerce/khata', { credentials: 'include' }),
          fetch('/api/customers', { credentials: 'include' }),
          fetch('/api/bookings', { credentials: 'include' }),
        ]);

        if (cancelled) return;

        if (meRes.status === 'fulfilled' && meRes.value.ok) {
          const meData = await meRes.value.json().catch(() => null);
          const u = meData?.user || meData?.data?.user;
          if (u?.name && String(u.name).trim()) {
            setUserName(String(u.name).trim());
          }
          if (u?.email) {
            setUserEmail(String(u.email));
          }
          const orgName =
            meData?.organization?.name ||
            meData?.tenant?.name ||
            u?.businessName;
          if (orgName && String(orgName).trim() && !/default|workspace|demo/i.test(String(orgName))) {
            setStoreSettings((prev) => ({
              ...prev,
              businessName: String(orgName).trim(),
            }));
          }
        }

        if (commRes.status === 'fulfilled' && commRes.value.ok) {
          const commData = await commRes.value.json().catch(() => null);
          const apiCatalog = commData?.catalog || commData?.data?.catalog;
          if (Array.isArray(apiCatalog) && apiCatalog.length > 0) {
            const mappedProducts: BosProductItem[] = apiCatalog.map(
              (item: Record<string, unknown>, idx: number) => ({
                id: String(item.id || `prod-api-${idx}`),
                name: String(item.name || 'Product Item'),
                category: String(item.category || 'General'),
                price: Number(item.price) || 100,
                mrp: Number(item.mrp || item.price) || 110,
                costPrice: Number(item.costPrice) || Math.round((Number(item.price) || 100) * 0.8),
                stockQuantity:
                  typeof item.stockQuantity === 'number' ? item.stockQuantity : 25,
                lowStockThreshold: Number(item.lowStockThreshold) || 5,
                sku: String(item.sku || `SKU-${100 + idx}`),
                barcode: String(item.barcode || `89010308452${idx}`),
                unit: String(item.unit || '1 Unit'),
                gstRate: Number(item.gstRate ?? 5),
                hsnCode: String(item.hsnCode || '1006'),
                onlineVisible: item.onlineVisible !== false,
              }),
            );
            setProducts(mappedProducts);
          }

          const apiOrders = commData?.orders || commData?.data?.orders;
          if (Array.isArray(apiOrders) && apiOrders.length > 0) {
            const mappedOrders: BosOrder[] = apiOrders.map(
              (o: Record<string, unknown>, idx: number) => ({
                id: String(o.id || `#ORD-${1050 + idx}`),
                customerName: String(o.customerName || 'Walk-in Customer'),
                customerPhone: String(o.customerPhone || '+91 98765 43210'),
                channel:
                  o.channel === 'online' || o.channel === 'whatsapp' ? o.channel : 'pos',
                status:
                  o.status === 'completed' ||
                  o.status === 'cancelled' ||
                  o.status === 'preparing' ||
                  o.status === 'accepted'
                    ? o.status
                    : 'new',
                paymentMode:
                  o.paymentMode === 'cash' ||
                  o.paymentMode === 'card' ||
                  o.paymentMode === 'khata'
                    ? o.paymentMode
                    : 'upi',
                paymentStatus: o.paymentStatus === 'pending' ? 'pending' : 'paid',
                totalAmount: Number(o.totalAmount) || 0,
                items: Array.isArray(o.items)
                  ? (o.items as Array<Record<string, unknown>>).map((it) => ({
                      name: String(it.name || 'Item'),
                      qty: Number(it.qty) || 1,
                      price: Number(it.price) || 0,
                    }))
                  : [{ name: 'Store Item', qty: 1, price: Number(o.totalAmount) || 0 }],
                createdAt: o.createdAt
                  ? new Date(String(o.createdAt)).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Today',
              }),
            );
            setOrders(mappedOrders);
          }
        }

        if (khataRes.status === 'fulfilled' && khataRes.value.ok) {
          const khataData = await khataRes.value.json().catch(() => null);
          const khataCustomers = khataData?.customers || khataData?.data?.customers;
          if (Array.isArray(khataCustomers) && khataCustomers.length > 0) {
            setCustomers((prev) => {
              const merged = [...prev];
              for (const kc of khataCustomers as Array<Record<string, unknown>>) {
                const name = String(kc.name || '').trim();
                if (!name) continue;
                const existingIdx = merged.findIndex(
                  (c) => c.name.toLowerCase() === name.toLowerCase(),
                );
                if (existingIdx >= 0) {
                  merged[existingIdx] = {
                    ...merged[existingIdx],
                    khataBalance: Number(kc.creditBalance ?? merged[existingIdx].khataBalance),
                  };
                } else {
                  merged.push({
                    id: String(kc.id || `cust-${Date.now()}`),
                    name,
                    phone: String(kc.phone || '+91 98765 00000'),
                    address: 'Local Customer',
                    segment: 'Regular',
                    ordersCount: 5,
                    totalSpent: Number(kc.totalCredit) || 4500,
                    khataBalance: Number(kc.creditBalance) || 0,
                    loyaltyPoints: 120,
                    lastVisit: 'Recently',
                  });
                }
              }
              return merged;
            });
          }
        }

        if (custRes.status === 'fulfilled' && custRes.value.ok) {
          const custData = await custRes.value.json().catch(() => null);
          const list = custData?.customers || custData?.data;
          if (Array.isArray(list) && list.length > 0) {
            setCustomers((prev) => {
              const byName = new Set(prev.map((c) => c.name.toLowerCase()));
              const extras: BosCustomer[] = [];
              for (const raw of list.slice(0, 10) as Array<Record<string, unknown>>) {
                const name = String(raw.name || '').trim();
                if (!name || byName.has(name.toLowerCase())) continue;
                byName.add(name.toLowerCase());
                extras.push({
                  id: String(raw.id || `db-cust-${extras.length}`),
                  name,
                  phone: String(raw.phone || '+91 98765 12345'),
                  email: raw.email ? String(raw.email) : undefined,
                  address: String(raw.address || 'Local Area'),
                  segment: 'Regular',
                  ordersCount: 3,
                  totalSpent: 3200,
                  khataBalance: 0,
                  loyaltyPoints: 95,
                  lastVisit: 'This Week',
                });
              }
              return [...prev, ...extras];
            });
          }
        }

        if (bookRes.status === 'fulfilled' && bookRes.value.ok) {
          const bookData = await bookRes.value.json().catch(() => null);
          const list = bookData?.bookings || bookData?.data;
          if (Array.isArray(list) && list.length > 0) {
            const mappedAppts: BosAppointment[] = (
              list.slice(0, 8) as Array<Record<string, unknown>>
            ).map((b, idx) => ({
              id: String(b.id || `appt-db-${idx}`),
              bookingCode: `#APT-${2084 + idx}`,
              customerName: String(b.customerName || b.clientName || 'Customer'),
              customerPhone: String(b.customerPhone || '+91 98765 43210'),
              serviceName: String(b.serviceType || b.serviceName || 'Store Appointment'),
              staffName: String(b.assignedPro || b.staffName || 'Neha'),
              scheduledAt: String(b.timeSlot || '11:30 AM'),
              durationMinutes: 45,
              amount: Number(b.amount) || 650,
              paymentStatus: 'pending',
              status: b.status === 'completed' ? 'completed' : 'confirmed',
            }));
            setAppointments(mappedAppts);
          }
        }
      } catch {
        // Fallback to pre-populated BOS state seamlessly
      }
    }

    void hydrateFromDatabase();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleNavigate = useCallback(
    (
      view: BosNavId,
      context?: { action?: string; prompt?: string; itemId?: string },
    ) => {
      setActiveView(view);
      setNavContext(context || null);
      setMobileSidebarOpen(false);
    },
    [],
  );

  // Handlers connected to APIs + local state
  const handleCompleteSale = async (payload: {
    customerName: string;
    customerPhone: string;
    paymentMode: 'cash' | 'upi' | 'card' | 'khata';
    items: Array<{ id: string; name: string; qty: number; price: number; gstRate?: number; sku?: string }>;
    subtotalAmount: number;
    discountAmount: number;
    taxAmount: number;
    totalAmount: number;
    notes?: string;
    printReceipt?: boolean;
  }) => {
    const newOrderId = `#ORD-${1049 + orders.length}`;
    const newOrder: BosOrder = {
      id: newOrderId,
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      channel: 'pos',
      status: 'completed',
      paymentMode: payload.paymentMode,
      paymentStatus: payload.paymentMode === 'khata' ? 'pending' : 'paid',
      totalAmount: payload.totalAmount,
      subtotalAmount: payload.subtotalAmount,
      discountAmount: payload.discountAmount,
      taxAmount: payload.taxAmount,
      items: payload.items,
      notes: payload.notes,
      createdAt: 'Just now',
    };

    setOrders((prev) => [newOrder, ...prev]);

    // Decrement stock
    setProducts((prev) =>
      prev.map((prod) => {
        const sold = payload.items.find((i) => i.id === prod.id);
        if (!sold) return prod;
        return {
          ...prod,
          stockQuantity: Math.max(0, prod.stockQuantity - sold.qty),
        };
      }),
    );

    // Add to Day Book if paid
    if (payload.paymentMode !== 'khata') {
      const dbMode: BosDaybookEntry['paymentMode'] =
        payload.paymentMode === 'card'
          ? 'card'
          : payload.paymentMode === 'cash'
            ? 'cash'
            : 'upi';
      setDaybookEntries((prev) => [
        {
          id: `db-${Date.now()}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          partyName: `POS Sale — ${payload.customerName}`,
          subtitle: `${payload.items.length} items • Counter #1`,
          category: 'POS Sale',
          refNumber: newOrderId,
          paymentMode: dbMode,
          moneyIn: payload.totalAmount,
          moneyOut: 0,
          createdAt: 'Today',
        },
        ...prev,
      ]);
    } else {
      // Update Khata balance
      setCustomers((prev) =>
        prev.map((c) =>
          c.name.toLowerCase() === payload.customerName.toLowerCase()
            ? { ...c, khataBalance: c.khataBalance + payload.totalAmount }
            : c,
        ),
      );
    }

    if (payload.printReceipt) {
      void printCustomerBill(
        {
          orderNumber: newOrderId,
          orderType: 'TAKEOUT',
          customerName: payload.customerName,
          customerPhone: payload.customerPhone,
          createdAt: new Date().toISOString(),
          items: payload.items.map((it) => ({
            name: it.name,
            qty: it.qty,
            price: it.price,
          })),
          subtotal: payload.subtotalAmount,
          discount: payload.discountAmount,
          taxAmount: payload.taxAmount,
          total: payload.totalAmount,
          paymentMethod: payload.paymentMode.toUpperCase(),
        },
        {
          name: storeSettings.businessName,
          phone: storeSettings.phone,
          address: storeSettings.address,
          gstin: storeSettings.gstin,
        },
        printerConfig,
      );
    }

    // Persist to /api/commerce
    fetch('/api/commerce', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: payload.customerName,
        customerPhone: payload.customerPhone,
        channel: 'pos',
        items: payload.items,
        totalAmount: payload.totalAmount,
      }),
    }).catch(() => {});
  };

  const handleSaveProduct = async (product: BosProductItem, isNew: boolean) => {
    const nextProducts = isNew
      ? [product, ...products]
      : products.map((p) => (p.id === product.id ? product : p));
    setProducts(nextProducts);

    fetch('/api/commerce', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ catalog: nextProducts }),
    }).catch(() => {});
  };

  const handleDeleteProduct = async (productId: string) => {
    const nextProducts = products.filter((p) => p.id !== productId);
    setProducts(nextProducts);
    fetch('/api/commerce', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ catalog: nextProducts }),
    }).catch(() => {});
  };

  const handleAdjustStock = async (productId: string, delta: number) => {
    const nextProducts = products.map((p) =>
      p.id === productId
        ? { ...p, stockQuantity: Math.max(0, p.stockQuantity + delta) }
        : p,
    );
    setProducts(nextProducts);
    fetch('/api/commerce', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ catalog: nextProducts }),
    }).catch(() => {});
  };

  const handleUpdateOrderStatus = async (orderId: string, status: BosOrder['status']) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status,
              paymentStatus: status === 'completed' ? 'paid' : o.paymentStatus,
            }
          : o,
      ),
    );
    fetch('/api/commerce', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: orderId, status }),
    }).catch(() => {});
  };

  const handlePrintOrderBill = (order: BosOrder) => {
    void printCustomerBill(
      {
        orderNumber: order.id,
        orderType: order.channel.toUpperCase(),
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        createdAt: new Date().toISOString(),
        items: order.items,
        total: order.totalAmount,
        paymentMethod: order.paymentMode.toUpperCase(),
      },
      {
        name: storeSettings.businessName,
        phone: storeSettings.phone,
        address: storeSettings.address,
        gstin: storeSettings.gstin,
      },
      printerConfig,
    );
  };

  const handleAddCustomer = async (customer: Omit<BosCustomer, 'id'>) => {
    const created: BosCustomer = {
      ...customer,
      id: `cust-${Date.now()}`,
    };
    setCustomers((prev) => [created, ...prev]);

    fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: created.name,
        phone: created.phone,
        email: created.email,
        address: created.address,
      }),
    }).catch(() => {});
  };

  const handleRecordKhataEntry = async (entry: {
    customerId: string;
    customerName: string;
    type: 'gave' | 'got';
    amount: number;
    mode: 'cash' | 'upi' | 'credit';
    note: string;
  }) => {
    const tx: BosKhataTransaction = {
      id: `ktx-${Date.now()}`,
      partyId: entry.customerId,
      partyName: entry.customerName,
      partyType: 'customer',
      type: entry.type,
      amount: entry.amount,
      mode: entry.mode,
      note: entry.note,
      createdAt: 'Just now',
    };
    setKhataTransactions((prev) => [tx, ...prev]);

    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id !== entry.customerId) return c;
        const delta = entry.type === 'gave' ? entry.amount : -entry.amount;
        return {
          ...c,
          khataBalance: c.khataBalance + delta,
          lastVisit: 'Just now',
        };
      }),
    );

    if (entry.type === 'got') {
      setDaybookEntries((prev) => [
        {
          id: `db-${Date.now()}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          partyName: `Khata Payment — ${entry.customerName}`,
          subtitle: entry.note,
          category: 'Khata In',
          refNumber: `KHT-${Date.now().toString().slice(-3)}`,
          paymentMode: entry.mode === 'cash' ? 'cash' : 'upi',
          moneyIn: entry.amount,
          moneyOut: 0,
          createdAt: 'Today',
        },
        ...prev,
      ]);
    }

    fetch('/api/commerce/khata', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityType: 'customer',
        id: entry.customerId,
        action: entry.type === 'got' ? 'payment' : 'credit',
        amount: entry.amount,
        mode: entry.mode,
        notes: entry.note,
      }),
    }).catch(() => {});
  };

  const handleCreateAppointment = async (
    appt: Omit<BosAppointment, 'id' | 'bookingCode'>,
  ) => {
    const created: BosAppointment = {
      ...appt,
      id: `appt-${Date.now()}`,
      bookingCode: `#APT-${2084 + appointments.length}`,
    };
    setAppointments((prev) => [created, ...prev]);

    fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: created.customerName,
        customerPhone: created.customerPhone,
        serviceType: created.serviceName,
        timeSlot: created.scheduledAt,
        amount: created.amount,
      }),
    }).catch(() => {});
  };

  const handleUpdateAppointmentStatus = async (
    id: string,
    status: BosAppointment['status'],
  ) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status } : a)),
    );
  };

  const handleAddDaybookEntry = async (
    entry: Omit<BosDaybookEntry, 'id' | 'time' | 'createdAt'>,
  ) => {
    const created: BosDaybookEntry = {
      ...entry,
      id: `db-${Date.now()}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: 'Today',
    };
    setDaybookEntries((prev) => [created, ...prev]);

    fetch('/api/commerce/daybook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: new Date().toISOString().slice(0, 10),
        openingBalance: 12500,
        notes: `${entry.partyName}: ${entry.subtitle}`,
      }),
    }).catch(() => {});
  };

  const handleUpdateStoreSettings = async (patch: Partial<BosStoreSettings>) => {
    setStoreSettings((prev) => ({ ...prev, ...patch }));
  };

  const searchResults = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();
    if (!q) return null;
    const matchedNav = BOS_PRIMARY_NAV_ITEMS.filter(
      (n) =>
        n.label.toLowerCase().includes(q) || n.description.toLowerCase().includes(q),
    ).slice(0, 3);
    const matchedProducts = products
      .filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
      .slice(0, 3);
    const matchedCustomers = customers
      .filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q))
      .slice(0, 3);
    const matchedOrders = orders
      .filter(
        (o) =>
          o.id.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q),
      )
      .slice(0, 3);

    return {
      matchedNav,
      matchedProducts,
      matchedCustomers,
      matchedOrders,
    };
  }, [globalSearch, products, customers, orders]);

  return (
    <div className="bos-app-shell flex h-screen w-full overflow-hidden">
      {/* Mobile Sidebar Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Left Deep Forest Emerald Sidebar (Matches BOS Screenshot) */}
      <aside
        className={`bos-sidebar fixed inset-y-0 left-0 z-50 flex w-[248px] shrink-0 flex-col justify-between transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top BOS Logo Lockup */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/10">
          <button
            type="button"
            onClick={() => handleNavigate('dashboard')}
            className="text-left focus:outline-hidden"
          >
            <BosBrand variant="sidebar" />
          </button>

          <button
            type="button"
            onClick={() => setMobileSidebarOpen(false)}
            className="rounded-lg p-1 text-white/70 hover:bg-white/10 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Menu Items */}
        <nav
          aria-label="BOS Primary Navigation"
          className="bos-sidebar-scroll flex-1 space-y-0.5 overflow-y-auto px-3 py-3"
        >
          {BOS_PRIMARY_NAV_ITEMS.map((item) => {
            const Icon = NAV_ICON_MAP[item.id] || LayoutDashboard;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                className={`bos-nav-item ${isActive ? 'bos-nav-item-active' : ''}`}
              >
                <Icon
                  className={`h-[18px] w-[18px] shrink-0 ${
                    isActive ? 'text-[#2DD4BF]' : 'text-[#8CC4B0]'
                  }`}
                />
                <span className="truncate">{item.label}</span>
                {item.id === 'aiAssistant' && (
                  <span className="ml-auto rounded-full bg-[#00B894]/25 px-1.5 py-0.5 text-[9.5px] font-bold text-[#6EE7B7]">
                    AI
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Upgrade to Pro Card (Exact match to Screenshot) */}
        <div className="p-3">
          <div className="bos-upgrade-card p-3.5 text-white">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-400/20 text-amber-300">
                <Crown className="h-3.5 w-3.5" />
              </span>
              <span className="text-[13px] font-bold tracking-tight">Upgrade to Pro</span>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-[#B8DCD0]">
              Get advanced features, team members and more.
            </p>
            <button
              type="button"
              onClick={() => setUpgradeModalOpen(true)}
              className="bos-btn-mint mt-3 w-full rounded-lg py-2 text-[12px] font-bold shadow-xs"
            >
              Upgrade Now
            </button>
          </div>
        </div>
      </aside>

      {/* Right Main Column: Top White Header + Scrollable Mint-Gray Canvas */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Top White Header (64px) */}
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-[#E4EFEA] bg-white px-4 lg:px-6">
          {/* Left: Mobile Menu Trigger + Store Switcher Pill */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="rounded-xl border border-[#E4EFEA] p-2 text-[#1E293B] hover:bg-[#F4F8F6] lg:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setStoreMenuOpen((prev) => !prev)}
                className="inline-flex items-center gap-2.5 rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] px-3 py-1.5 text-left hover:bg-[#EBF5F0] transition"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0A6847] text-white">
                  <Store className="h-4 w-4" />
                </span>
                <span className="text-[13.5px] font-bold text-[#111827] max-w-[180px] truncate">
                  {storeSettings.businessName}
                </span>
                <ChevronDown className="h-4 w-4 text-[#64748B]" />
              </button>

              {storeMenuOpen && (
                <div className="absolute left-0 z-40 mt-1.5 w-64 rounded-2xl border border-[#E4EFEA] bg-white p-2 shadow-xl">
                  <p className="px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider text-[#64748B]">
                    Switch Store / Branch
                  </p>
                  {branches.map((br) => (
                    <button
                      key={br.id}
                      type="button"
                      onClick={() => {
                        setStoreSettings((s) => ({ ...s, businessName: br.name }));
                        setStoreMenuOpen(false);
                      }}
                      className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-[12.5px] hover:bg-[#F4F8F6]"
                    >
                      <div>
                        <p className="font-bold text-[#111827]">{br.name}</p>
                        <p className="text-[11px] text-[#64748B]">{br.location}</p>
                      </div>
                      {storeSettings.businessName === br.name && (
                        <span className="h-2 w-2 rounded-full bg-[#0A6847]" />
                      )}
                    </button>
                  ))}
                  <div className="mt-1 border-t border-[#EDF4F0] pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setStoreMenuOpen(false);
                        handleNavigate('settings');
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-[12px] font-semibold text-[#0A6847] hover:bg-[#E6F6F0]/50"
                    >
                      <Settings className="h-3.5 w-3.5" />
                      <span>Store & GST Settings</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Center: Global Search & Ask BOS AI Bar */}
          <div className="relative flex-1 max-w-xl hidden md:block">
            <div className="relative flex items-center">
              <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-[#64748B]" />
              <input
                ref={globalSearchInputRef}
                type="text"
                value={globalSearch}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
                onChange={(e) => setGlobalSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && globalSearch.trim()) {
                    handleNavigate('aiAssistant', { prompt: globalSearch.trim() });
                    setGlobalSearch('');
                    setSearchFocused(false);
                  }
                }}
                placeholder="Search products, customers, orders, or ask BOS AI..."
                className="w-full rounded-xl border border-[#DCE9E3] bg-[#F4F8F6] py-2 pl-10 pr-14 text-[13px] text-[#111827] placeholder:text-[#64748B] focus:border-[#0A6847] focus:bg-white focus:outline-hidden transition"
              />
              <kbd className="pointer-events-none absolute right-3 rounded-md border border-[#DCE9E3] bg-white px-1.5 py-0.5 font-sans text-[11px] font-semibold text-[#64748B]">
                ⌘K
              </kbd>
            </div>

            {/* Live Search Dropdown */}
            {searchFocused && searchResults && (
              <div className="absolute inset-x-0 z-50 mt-1.5 rounded-2xl border border-[#DCE9E3] bg-white p-3 shadow-xl space-y-2.5 text-[12.5px]">
                <button
                  type="button"
                  onMouseDown={() => {
                    handleNavigate('aiAssistant', { prompt: globalSearch });
                    setGlobalSearch('');
                  }}
                  className="flex w-full items-center justify-between rounded-xl bg-[#E6F6F0] px-3 py-2 font-bold text-[#0A6847]"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Ask BOS AI: &ldquo;{globalSearch}&rdquo;
                  </span>
                  <span className="text-[11px]">Press Enter ↵</span>
                </button>

                {searchResults.matchedNav.length > 0 && (
                  <div>
                    <p className="px-2 text-[10.5px] font-bold uppercase text-[#64748B]">
                      BOS Modules
                    </p>
                    {searchResults.matchedNav.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onMouseDown={() => {
                          handleNavigate(n.id);
                          setGlobalSearch('');
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 hover:bg-[#F4F8F6]"
                      >
                        <span className="font-semibold text-[#111827]">{n.label}</span>
                        <span className="text-[11px] text-[#64748B]">Open →</span>
                      </button>
                    ))}
                  </div>
                )}

                {searchResults.matchedProducts.length > 0 && (
                  <div>
                    <p className="px-2 text-[10.5px] font-bold uppercase text-[#64748B]">
                      Products
                    </p>
                    {searchResults.matchedProducts.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onMouseDown={() => {
                          handleNavigate('inventory', { itemId: p.id });
                          setGlobalSearch('');
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 hover:bg-[#F4F8F6]"
                      >
                        <span className="font-semibold text-[#111827]">{p.name}</span>
                        <span className="font-bold text-[#0A6847]">
                          {formatBosCurrency(p.price, storeSettings.currencySymbol)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {searchResults.matchedCustomers.length > 0 && (
                  <div>
                    <p className="px-2 text-[10.5px] font-bold uppercase text-[#64748B]">
                      Customers
                    </p>
                    {searchResults.matchedCustomers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onMouseDown={() => {
                          handleNavigate('customers', { itemId: c.id });
                          setGlobalSearch('');
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 hover:bg-[#F4F8F6]"
                      >
                        <span className="font-semibold text-[#111827]">{c.name}</span>
                        <span className="text-[11px] text-[#64748B]">{c.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Help (?), Notifications Bell, and User Profile */}
          <div className="flex items-center gap-2.5">
            {/* Help Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setHelpOpen((prev) => !prev);
                  setNotificationsOpen(false);
                  setProfileMenuOpen(false);
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E4EFEA] bg-[#F8FCFA] text-[#475569] hover:bg-[#E6F6F0] hover:text-[#0A6847] transition"
                aria-label="Help & Shortcuts"
              >
                <HelpCircle className="h-4 w-4" />
              </button>

              {helpOpen && (
                <div className="absolute right-0 z-40 mt-2 w-72 rounded-2xl border border-[#E4EFEA] bg-white p-4 shadow-xl text-[12.5px] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-[#111827]">BOS Quick Help & Support</h4>
                    <button
                      type="button"
                      onClick={() => setHelpOpen(false)}
                      className="text-xs text-[#64748B]"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-[11.5px] text-[#64748B]">
                    Need help with POS billing, barcode scanners, or GST filing?
                  </p>
                  <div className="space-y-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setHelpOpen(false);
                        setPrinterModalOpen(true);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl bg-[#F8FCFA] px-3 py-2 font-semibold text-[#111827] hover:bg-[#E6F6F0]"
                    >
                      <Printer className="h-4 w-4 text-[#0A6847]" />
                      <span>Setup Thermal Receipt Printer</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setHelpOpen(false);
                        handleNavigate('aiAssistant');
                      }}
                      className="flex w-full items-center gap-2 rounded-xl bg-[#F8FCFA] px-3 py-2 font-semibold text-[#111827] hover:bg-[#E6F6F0]"
                    >
                      <Sparkles className="h-4 w-4 text-[#0A6847]" />
                      <span>Ask BOS AI Copilot</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setNotificationsOpen((prev) => !prev);
                  setHelpOpen(false);
                  setProfileMenuOpen(false);
                }}
                className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[#E4EFEA] bg-[#F8FCFA] text-[#475569] hover:bg-[#E6F6F0] hover:text-[#0A6847] transition"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#EF4444] px-1 text-[9.5px] font-bold text-white">
                  3
                </span>
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 z-40 mt-2 w-80 rounded-2xl border border-[#E4EFEA] bg-white p-3.5 shadow-xl space-y-2.5 text-[12px]">
                  <div className="flex items-center justify-between border-b border-[#EDF4F0] pb-2">
                    <h4 className="font-bold text-[#111827]">Store Alerts (3)</h4>
                    <span className="text-[11px] font-semibold text-[#0A6847]">Live</span>
                  </div>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        setNotificationsOpen(false);
                        handleNavigate('orders');
                      }}
                      className="w-full rounded-xl bg-[#F8FCFA] p-2.5 text-left hover:bg-[#E6F6F0]/50"
                    >
                      <p className="font-bold text-[#111827]">🛍️ New Online Order #ORD-1047</p>
                      <p className="text-[11px] text-[#64748B]">
                        Amit Kumar ordered 2 items (₹480)
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNotificationsOpen(false);
                        handleNavigate('inventory');
                      }}
                      className="w-full rounded-xl bg-red-50/50 p-2.5 text-left hover:bg-red-50"
                    >
                      <p className="font-bold text-red-700">⚠️ 3 Low Stock Items</p>
                      <p className="text-[11px] text-[#64748B]">
                        Tata Tea Gold, Amul Butter & Surf Excel need reorder
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNotificationsOpen(false);
                        handleNavigate('khata');
                      }}
                      className="w-full rounded-xl bg-[#F8FCFA] p-2.5 text-left hover:bg-[#E6F6F0]/50"
                    >
                      <p className="font-bold text-[#0A6847]">💰 Khata UPI Payment Received</p>
                      <p className="text-[11px] text-[#64748B]">
                        Anita Desai paid ₹2,500 via UPI QR
                      </p>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Pill */}
            <div className="relative pl-1 border-l border-[#E4EFEA]">
              <button
                type="button"
                onClick={() => {
                  setProfileMenuOpen((prev) => !prev);
                  setNotificationsOpen(false);
                  setHelpOpen(false);
                }}
                className="flex items-center gap-2.5 rounded-xl px-2 py-1 text-left hover:bg-[#F4F8F6] transition"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0A6847] text-[12.5px] font-bold text-white shadow-2xs">
                  {getInitials(userName)}
                </div>
                <div className="hidden sm:block leading-tight">
                  <p className="text-[13px] font-bold text-[#111827]">{userName}</p>
                  <p className="text-[11px] font-medium text-[#64748B]">{userRole}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-[#64748B] hidden sm:block" />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 z-40 mt-2 w-56 rounded-2xl border border-[#E4EFEA] bg-white p-2 shadow-xl text-[12.5px]">
                  <div className="border-b border-[#EDF4F0] px-3 py-2">
                    <p className="font-bold text-[#111827]">{userName}</p>
                    <p className="text-[11px] text-[#64748B] truncate">{userEmail}</p>
                  </div>
                  <div className="py-1 space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        handleNavigate('settings');
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[#334155] hover:bg-[#F4F8F6]"
                    >
                      <Settings className="h-4 w-4 text-[#0A6847]" />
                      <span>Business Settings</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        setPrinterModalOpen(true);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-[#334155] hover:bg-[#F4F8F6]"
                    >
                      <Printer className="h-4 w-4 text-[#0A6847]" />
                      <span>Thermal Printer Setup</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
                        window.location.href = '/login';
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Scrollable Canvas (#F4F8F6) */}
        <main className="flex-1 overflow-y-auto px-4 py-5 lg:px-6">
          <div className="mx-auto max-w-[1440px]">
            {activeView === 'dashboard' && (
              <BosDashboardWorkstation
                userName={userName}
                currencySymbol={storeSettings.currencySymbol}
                products={products}
                orders={orders}
                customers={customers}
                appointments={appointments}
                onNavigate={handleNavigate}
                onQuickReorderProduct={(productId) => {
                  void handleAdjustStock(productId, 25);
                }}
                onOpenAiPrompt={(prompt) => {
                  handleNavigate('aiAssistant', { prompt });
                }}
              />
            )}

            {activeView === 'pos' && (
              <BosPosWorkstation
                businessName={storeSettings.businessName}
                currencySymbol={storeSettings.currencySymbol}
                products={products}
                customers={customers}
                orders={orders}
                coupons={coupons}
                onCompleteSale={handleCompleteSale}
                onOpenPrinterModal={() => setPrinterModalOpen(true)}
              />
            )}

            {activeView === 'inventory' && (
              <BosInventoryWorkstation
                currencySymbol={storeSettings.currencySymbol}
                products={products}
                initialOpenAddModal={navContext?.action === 'add-product'}
                onSaveProduct={handleSaveProduct}
                onDeleteProduct={handleDeleteProduct}
                onAdjustStock={handleAdjustStock}
              />
            )}

            {activeView === 'orders' && (
              <BosOrdersWorkstation
                businessName={storeSettings.businessName}
                currencySymbol={storeSettings.currencySymbol}
                orders={orders}
                initialSelectedOrderId={navContext?.itemId}
                onUpdateOrderStatus={handleUpdateOrderStatus}
                onPrintOrderBill={handlePrintOrderBill}
                onNavigateToPos={() => handleNavigate('pos')}
              />
            )}

            {(activeView === 'customers' || activeView === 'khata') && (
              <BosCustomersKhataWorkstation
                mode={activeView}
                businessName={storeSettings.businessName}
                currencySymbol={storeSettings.currencySymbol}
                customers={customers}
                khataTransactions={khataTransactions}
                initialOpenAddCustomer={navContext?.action === 'add-customer'}
                onAddCustomer={handleAddCustomer}
                onRecordKhataEntry={handleRecordKhataEntry}
              />
            )}

            {activeView === 'invoices' && (
              <BosInvoicesWorkstation
                storeSettings={storeSettings}
                customers={customers}
                products={products}
              />
            )}

            {activeView === 'appointments' && (
              <BosAppointmentsWorkstation
                businessName={storeSettings.businessName}
                businessSlug={storeSettings.businessSlug}
                currencySymbol={storeSettings.currencySymbol}
                appointments={appointments}
                initialOpenNewModal={navContext?.action === 'new-booking'}
                onCreateAppointment={handleCreateAppointment}
                onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
                onConvertToPosBill={() => handleNavigate('pos')}
              />
            )}

            {activeView === 'onlineStore' && (
              <BosOnlineStoreWorkstation
                storeSettings={storeSettings}
                products={products}
                orders={orders}
                onUpdateStoreSettings={handleUpdateStoreSettings}
                onToggleProductOnline={(productId, visible) => {
                  setProducts((prev) =>
                    prev.map((p) =>
                      p.id === productId ? { ...p, onlineVisible: visible } : p,
                    ),
                  );
                }}
              />
            )}

            {(activeView === 'reports' || activeView === 'daybook') && (
              <BosReportsDaybookWorkstation
                mode={activeView}
                currencySymbol={storeSettings.currencySymbol}
                orders={orders}
                products={products}
                daybookEntries={daybookEntries}
                onAddDaybookEntry={handleAddDaybookEntry}
              />
            )}

            {(activeView === 'marketing' ||
              activeView === 'aiAssistant' ||
              activeView === 'integrations' ||
              activeView === 'settings') && (
              <BosMarketingAiIntegrationsSettings
                mode={activeView}
                storeSettings={storeSettings}
                products={products}
                orders={orders}
                customers={customers}
                coupons={coupons}
                initialAiPrompt={navContext?.prompt}
                onUpdateStoreSettings={handleUpdateStoreSettings}
                onAddCoupon={async (cp) => {
                  setCoupons((prev) => [{ ...cp, id: `cp-${Date.now()}` }, ...prev]);
                }}
                onToggleCoupon={(id) => {
                  setCoupons((prev) =>
                    prev.map((c) => (c.id === id ? { ...c, active: !c.active } : c)),
                  );
                }}
                onOpenPrinterModal={() => setPrinterModalOpen(true)}
                onOpenUpgradeModal={() => setUpgradeModalOpen(true)}
              />
            )}
          </div>
        </main>
      </div>

      {/* Thermal Printer Configuration Modal */}
      <ThermalPrinterModal
        open={printerModalOpen}
        onOpenChange={setPrinterModalOpen}
        config={printerConfig}
        onConfigChange={(next) => {
          setPrinterConfig(next);
          savePrinterConfig(next);
        }}
      />

      {/* BOS Upgrade to Pro Modal */}
      {upgradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#EDF4F0] pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0A6847] text-white">
                  <Crown className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-[16px] font-extrabold text-[#111827]">
                    BOS Pro — Business Operating System
                  </h3>
                  <p className="text-[11.5px] text-[#64748B]">
                    Unlock multi-branch POS, unlimited staff, WhatsApp API & E-Invoicing
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUpgradeModalOpen(false)}
                className="rounded-lg p-1 text-[#64748B]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2.5 text-[13px] text-[#334155]">
              {[
                'Unlimited POS Billing Registers & Barcode Label Printing',
                'Official WhatsApp Business API for Automated Bills & Khata Reminders',
                '1-Click GST E-Invoice (IRN), E-Way Bill & Tally Prime Sync',
                'Custom Domain Online Storefront with Zero Commission',
                'Unlimited BOS AI Business Copilot Queries & Demand Forecasting',
              ].map((feat) => (
                <div key={feat} className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#0A6847]" />
                  <span className="font-medium">{feat}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-xl border border-[#BCE3D4] bg-[#F3FAF7] p-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase text-[#0A6847]">
                  Annual Pro Plan
                </p>
                <p className="text-[22px] font-extrabold text-[#111827]">
                  {storeSettings.currencySymbol}4,999
                  <span className="text-[12px] font-normal text-[#64748B]"> / year (GST incl.)</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setUpgradeModalOpen(false);
                  handleNavigate('settings');
                }}
                className="bos-btn-primary rounded-xl px-5 py-2.5 text-[13px]"
              >
                Activate BOS Pro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/store/app-store';
import {
  ThermalPrinterModal,
  type ThermalPrinterConfig,
} from '@/components/commerce/thermal-printer-modal';
import {
  printKOT,
  printCustomerBill,
  handleAutoPrintNewOrder,
  loadPrinterConfig,
  savePrinterConfig,
  DEFAULT_PRINTER_CONFIG,
} from '@/lib/hardware/print-service';
import {
  activeBluetoothPrinter,
  activeUsbPrinter,
  type PrintOrderData,
  type BusinessPrintInfo,
} from '@/lib/hardware/escpos-printer';
import {
  Package,
  TrendingUp,
  ShoppingCart,
  IndianRupee,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  MessageCircle,
  Phone,
  MapPin,
  Calendar,
  FileText,
  Loader2,
  QrCode,
  Store,
  Plus,
  Trash2,
  ExternalLink,
  Printer,
  CreditCard,
  Search,
  Sparkles,
  ArrowRight,
  Filter,
  Check,
  RefreshCw,
  UtensilsCrossed,
  Upload,
  Cloud,
  Edit3,
  Image as ImageIcon,
  Tag,
  Globe,
  Receipt,
  DollarSign,
  Percent,
  Coffee,
  Download,
  Share2,
  Layers,
  ChefHat,
  Flame,
  Volume2,
  BellRing,
  BookOpen,
  Copy,
  Send,
  Smartphone,
  Link2,
  Building2,
  Scan,
  Camera,
  Barcode,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { authFetch } from '@/lib/client-auth';
import {
  generateGstInvoiceHtml,
  numberToWords,
  type GstStoreInfo,
} from '@/lib/billing/gst-invoice-helper';

export function CommerceView() {
  const [activeTab, setActiveTab] = useState<
    | 'orders'
    | 'catalog'
    | 'pos'
    | 'dineIn'
    | 'templates'
    | 'promotions'
    | 'domain'
    | 'khata'
    | 'daybook'
    | 'kds'
    | 'closing'
    | 'billing'
    | 'settings'
  >(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('nuvora_commerce_tab');
      if (saved && ['orders', 'catalog', 'pos', 'dineIn', 'templates', 'promotions', 'domain', 'khata', 'daybook', 'kds', 'closing', 'billing', 'settings'].includes(saved)) {
        return saved as any;
      }
    }
    return 'orders';
  });

  useEffect(() => {
    const handleTabSwitch = (e: any) => {
      if (e.detail && typeof e.detail === 'string') {
        setActiveTab(e.detail as any);
      }
    };
    window.addEventListener('nuvora_switch_commerce_tab', handleTabSwitch);
    return () => window.removeEventListener('nuvora_switch_commerce_tab', handleTabSwitch);
  }, []);
  const { auth, blueprint, countryPack } = useAppStore();

  // Industry Templates State
  const [templatesList, setTemplatesList] = useState<any[]>([]);
  const [applyingTemplateId, setApplyingTemplateId] = useState<string | null>(null);

  // Promotions & Coupons State
  const [couponsList, setCouponsList] = useState<any[]>([]);
  const [announcementBanner, setAnnouncementBanner] = useState<{ text: string; enabled: boolean; code?: string }>({
    text: '',
    enabled: false,
    code: '',
  });
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponType, setNewCouponType] = useState<'PERCENT' | 'FLAT'>('PERCENT');
  const [newCouponValue, setNewCouponValue] = useState('10');
  const [newCouponMinOrder, setNewCouponMinOrder] = useState('0');
  const [savingCoupon, setSavingCoupon] = useState(false);
  const [savingBanner, setSavingBanner] = useState(false);

  // Custom Domain State
  const [customDomainInput, setCustomDomainInput] = useState('');
  const [domainRecord, setDomainRecord] = useState<any>(null);
  const [savingDomain, setSavingDomain] = useState(false);
  const [verifyingDomain, setVerifyingDomain] = useState(false);

  // Khata (Udhaar) State
  const [khataList, setKhataList] = useState<any[]>([]);
  const [khataReceivable, setKhataReceivable] = useState(0);
  const [khataSuppliers, setKhataSuppliers] = useState<any[]>([]);
  const [khataPayable, setKhataPayable] = useState(0);
  const [khataLoading, setKhataLoading] = useState(false);
  // Khata CRUD modals
  const [khataPaymentModal, setKhataPaymentModal] = useState<{ entry: any } | null>(null);
  const [khataUdhaarModal, setKhataUdhaarModal] = useState(false);
  const [khataSupplierPayModal, setKhataSupplierPayModal] = useState<{ entry: any } | null>(null);
  // Khata form state
  const [khataPayAmount, setKhataPayAmount] = useState('');
  const [khataPayMethod, setKhataPayMethod] = useState<'CASH' | 'UPI'>('CASH');
  const [khataPayNote, setKhataPayNote] = useState('');
  const [khataPaySubmitting, setKhataPaySubmitting] = useState(false);
  const [khataUdhaarPhone, setKhataUdhaarPhone] = useState('');
  const [khataUdhaarName, setKhataUdhaarName] = useState('');
  const [khataUdhaarAmount, setKhataUdhaarAmount] = useState('');
  const [khataUdhaarNote, setKhataUdhaarNote] = useState('');
  const [khataUdhaarSubmitting, setKhataUdhaarSubmitting] = useState(false);
  const [khataSupplierPayAmount, setKhataSupplierPayAmount] = useState('');
  const [khataSupplierPayMethod, setKhataSupplierPayMethod] = useState<'CASH' | 'UPI'>('CASH');
  const [khataSupplierPaySubmitting, setKhataSupplierPaySubmitting] = useState(false);

  // Day Book State
  const [dayBookData, setDayBookData] = useState<any>({
    totalSales: 0,
    totalInflow: 0,
    totalOutflow: 0,
    cashInHand: 0,
    transactions: [],
  });
  const [newExpenseAmt, setNewExpenseAmt] = useState('');
  const [newExpenseCat, setNewExpenseCat] = useState('Raw Materials');
  const [newExpenseNote, setNewExpenseNote] = useState('');
  const [savingExpense, setSavingExpense] = useState(false);

  // KDS filter state
  const [kdsTypeFilter, setKdsTypeFilter] = useState<'ALL' | 'DINE_IN' | 'TAKEOUT' | 'DELIVERY'>('ALL');

  // Commerce Data State
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ totalOrders: 0, pendingOrders: 0, revenue: 0, confirmedOrders: 0 });
  const [config, setConfig] = useState<any>(null);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [fields, setFields] = useState<any[]>([]);
  const [upiId, setUpiId] = useState('');
  const [deliveryAreas, setDeliveryAreas] = useState('');
  const [greetingMessage, setGreetingMessage] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  const currencySymbol = countryPack?.currency?.symbol || config?.currencySymbol || '$';
  const businessSlug = auth?.tenant?.slug || auth?.user?.id || 'demo';
  const publicStoreUrl = typeof window !== 'undefined' ? `${window.location.origin}/store/${businessSlug}` : `/store/${businessSlug}`;

  // Selected Order Modal State
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [orderModalLoading, setOrderModalLoading] = useState(false);
  const [updatingOrder, setUpdatingOrder] = useState(false);
  const [showConversation, setShowConversation] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // POS State
  const [posCart, setPosCart] = useState<Array<{ id: string; name: string; price: number; qty: number }>>([]);
  const [posCustomerName, setPosCustomerName] = useState('');
  const [posCustomerPhone, setPosCustomerPhone] = useState('');
  const [posPaymentMethod, setPosPaymentMethod] = useState<'CASH' | 'CARD' | 'UPI'>('CASH');
  const [posTableNumber, setPosTableNumber] = useState('');
  const [posOrderType, setPosOrderType] = useState<'DINE_IN' | 'TAKEOUT' | 'DELIVERY'>('DINE_IN');
  const [posSubmitting, setPosSubmitting] = useState(false);
  const [posSearch, setPosSearch] = useState('');
  const [posCategory, setPosCategory] = useState('ALL');
  const [posScannerModalOpen, setPosScannerModalOpen] = useState(false);
  const [posManualBarcode, setPosManualBarcode] = useState('');
  const [posCameraActive, setPosCameraActive] = useState(false);
  const [posCameraError, setPosCameraError] = useState<string | null>(null);
  const [posMobileCheckoutOpen, setPosMobileCheckoutOpen] = useState(false);
  const posVideoRef = useRef<HTMLVideoElement | null>(null);
  const posMediaStreamRef = useRef<MediaStream | null>(null);

  // Dynamic Dine-In Table Management State (Take.app Parity)
  const [tables, setTables] = useState<Array<{ id: string; name: string; capacity?: number; section?: string; status?: string }>>([
    { id: 'tbl_1', name: 'Table 1', capacity: 4, section: 'Main Floor' },
    { id: 'tbl_2', name: 'Table 2', capacity: 4, section: 'Main Floor' },
    { id: 'tbl_3', name: 'Table 3', capacity: 2, section: 'Main Floor' },
    { id: 'tbl_4', name: 'Table 4', capacity: 6, section: 'Outdoor Patio' },
    { id: 'tbl_5', name: 'Table 5', capacity: 4, section: 'Outdoor Patio' },
  ]);
  const [selectedTableForQr, setSelectedTableForQr] = useState<string>('Table 1');
  const [tableModalOpen, setTableModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<any | null>(null);
  const [tableNameInput, setTableNameInput] = useState('');
  const [tableCapacityInput, setTableCapacityInput] = useState('4');
  const [tableSectionInput, setTableSectionInput] = useState('Main Floor');
  const [batchPrintModalOpen, setBatchPrintModalOpen] = useState(false);

  // Billing, Tax & Invoicing State (Take.app POS Parity)
  const [taxRate, setTaxRate] = useState<number>(5);
  const [taxType, setTaxType] = useState<'exclusive' | 'inclusive'>('exclusive');
  const [taxName, setTaxName] = useState<string>('GST');
  const [serviceChargeRate, setServiceChargeRate] = useState<number>(0);
  const [gstin, setGstin] = useState<string>('');
  const [billFooterText, setBillFooterText] = useState<string>('Thank you for dining with us! Please visit again.');
  const [discounts, setDiscounts] = useState<Array<{ code: string; type: 'percentage' | 'fixed'; value: number; minOrder?: number; label?: string }>>([
    { code: 'WELCOME10', type: 'percentage', value: 10, minOrder: 200, label: '10% Off' },
    { code: 'FLAT50', type: 'fixed', value: 50, minOrder: 500, label: '50 Flat Off' },
  ]);

  // Billing & GST Invoices State (mobile billing.tsx port — Task P2B-BILLING)
  const [billingSubTab, setBillingSubTab] = useState<'INVOICES' | 'QUOTES'>('INVOICES');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [invoiceOverview, setInvoiceOverview] = useState<{ paid: number; unpaid: number; overdue: number }>({ paid: 0, unpaid: 0, overdue: 0 });
  const [quoteOverview, setQuoteOverview] = useState<{ accepted: number; pending: number; draft: number }>({ accepted: 0, pending: 0, draft: 0 });
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [billingSearch, setBillingSearch] = useState('');

  // Billing Create-Form Modal State
  const [billingModalOpen, setBillingModalOpen] = useState(false);
  const [billingFormType, setBillingFormType] = useState<'INVOICE' | 'QUOTE'>('INVOICE');
  const [billingCustomerName, setBillingCustomerName] = useState('');
  const [billingCustomerPhone, setBillingCustomerPhone] = useState('');
  const [billingItems, setBillingItems] = useState<Array<{ description: string; qty: number; unitPrice: number; hsnCode?: string }>>([
    { description: '', qty: 1, unitPrice: 0, hsnCode: '' },
  ]);
  const [billingTaxRate, setBillingTaxRate] = useState<number>(18);
  const [billingDiscount, setBillingDiscount] = useState<string>('0');
  const [billingNotes, setBillingNotes] = useState('');
  const [billingSubmitting, setBillingSubmitting] = useState(false);
  // Per-row loading flags for Mark-Paid + Delete actions on billing cards.
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
  const [deletingBillingId, setDeletingBillingId] = useState<string | null>(null);

  // Vyapar-Grade Billing State (Detail Preview, Edit, Payment Mode, Brand Settings)
  const [selectedBillingInvoice, setSelectedBillingInvoice] = useState<any | null>(null);
  const [editingBillingInvoice, setEditingBillingInvoice] = useState<any | null>(null);
  const [billingPaymentModalInvoice, setBillingPaymentModalInvoice] = useState<any | null>(null);
  const [billingPaymentMode, setBillingPaymentMode] = useState<string>('CASH');
  const [billingPaymentSubmitting, setBillingPaymentSubmitting] = useState(false);
  const [billingBrandModalOpen, setBillingBrandModalOpen] = useState(false);
  const [webStoreInfo, setWebStoreInfo] = useState<GstStoreInfo>({
    businessName: 'Business Store',
    logoUrl: '',
    signatureUrl: '',
    gstin: '',
    address: '',
    phone: '',
    email: '',
    upiId: '',
    billFooter: '1. Goods once sold will not be taken back.\n2. Interest @18% p.a. charged on overdue payments.',
  });

  // Customer Receipt & Kitchen Order Ticket (KOT) Modal State
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptType, setReceiptType] = useState<'CUSTOMER_BILL' | 'KOT'>('CUSTOMER_BILL');
  const [receiptOrder, setReceiptOrder] = useState<any | null>(null);

  // Thermal Printer Hardware State
  const [printerModalOpen, setPrinterModalOpen] = useState(false);
  const [printerConfig, setPrinterConfig] = useState<ThermalPrinterConfig>(DEFAULT_PRINTER_CONFIG);
  const seenOrderIdsRef = useRef<Set<string>>(new Set());
  const isInitialOrderFetchRef = useRef<boolean>(true);

  // Initialize printer config on client
  useEffect(() => {
    const saved = loadPrinterConfig();
    setPrinterConfig(saved);
  }, []);

  const handleUpdatePrinterConfig = (newCfg: ThermalPrinterConfig) => {
    setPrinterConfig(newCfg);
    savePrinterConfig(newCfg);
  };

  // Products Filter & Management State
  const [productSearch, setProductSearch] = useState('');
  const [productCategory, setProductCategory] = useState('ALL');
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodCategory, setProdCategory] = useState('Main');
  const [prodDesc, setProdDesc] = useState('');
  const [prodImageUrl, setProdImageUrl] = useState('');
  const [prodSku, setProdSku] = useState('');
  const [prodIsActive, setProdIsActive] = useState(true);

  // Store Sync & Import Modal State
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [syncProvider, setSyncProvider] = useState<'shopify' | 'woocommerce' | 'csv'>('shopify');
  const [syncDomain, setSyncDomain] = useState('');
  const [syncToken, setSyncToken] = useState('');
  const [syncKey, setSyncKey] = useState('');
  const [syncSecret, setSyncSecret] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);

  // Load Data
  const loadCommerceData = async () => {
    try {
      setLoading(true);
      const [dashRes, configRes, ordersRes] = await Promise.all([
        authFetch('/api/commerce/dashboard').then((r) => r.json()).catch(() => ({})),
        authFetch('/api/commerce/config').then((r) => r.json()).catch(() => ({})),
        // Fetch the FULL orders list (the dashboard only returns the 10 most
        // recent). This fixes the "orders tab only shows top 10" bug.
        authFetch('/api/commerce/orders').then((r) => r.json()).catch(() => ({})),
      ]);

      if (dashRes.overview) {
        setStats(dashRes.overview);

        // Use the full orders list from /api/commerce/orders (not just
        // dashRes.recentOrders which is capped at 10).
        const incomingOrders: any[] = ordersRes.orders || dashRes.recentOrders || [];
        setOrders(incomingOrders);

        // Auto-print check for newly arrived orders
        if (!isInitialOrderFetchRef.current) {
          const newOrders = incomingOrders.filter((o) => !seenOrderIdsRef.current.has(o.id));
          if (newOrders.length > 0) {
            newOrders.forEach((newOrder) => {
              seenOrderIdsRef.current.add(newOrder.id);
              toast.info(`🛎️ New Order #${newOrder.id.slice(-6).toUpperCase()} received!`);

              const bInfo: BusinessPrintInfo = {
                name: auth?.tenant?.name || 'Local Store',
                address: auth?.tenant?.address || undefined,
                phone: auth?.tenant?.phone || undefined,
                gstin: gstin || undefined,
                billFooter: billFooterText || undefined,
              };
              const pData: PrintOrderData = {
                orderNumber: newOrder.id.slice(-6).toUpperCase(),
                orderType: newOrder.deliveryType || 'TAKEOUT',
                tableNumber: newOrder.deliveryAddress?.includes('Table')
                  ? newOrder.deliveryAddress.replace(/[^0-9]/g, '')
                  : undefined,
                customerName: newOrder.customerName,
                customerPhone: newOrder.customerPhone,
                createdAt: newOrder.createdAt,
                items: (newOrder.items || []).map((it: any) => ({
                  name: it.name,
                  qty: it.qty,
                  price: it.price,
                  amount: it.amount || it.price * it.qty,
                })),
                total: Number(newOrder.total || 0),
                paymentMethod: newOrder.paymentMethod,
                paymentStatus: newOrder.paymentStatus,
                notes: newOrder.notes,
              };

              handleAutoPrintNewOrder(pData, bInfo, printerConfig);
            });
          }
        } else {
          incomingOrders.forEach((o) => seenOrderIdsRef.current.add(o.id));
          isInitialOrderFetchRef.current = false;
        }
      }
      if (configRes.config) {
        const c = configRes.config;
        setConfig(c);
        try {
          setCatalog(JSON.parse(c.catalogJson || '[]'));
        } catch {
          setCatalog([]);
        }
        try {
          setFields(JSON.parse(c.fieldsJson || '[]'));
        } catch {
          setFields([]);
        }
        setUpiId(c.upiId || '');
        try {
          setDeliveryAreas(JSON.parse(c.deliveryAreasJson || '[]').join(', '));
        } catch {
          setDeliveryAreas('');
        }
        setGreetingMessage(c.greetingMessage || '');
        if (c.tables && Array.isArray(c.tables) && c.tables.length > 0) {
          setTables(c.tables);
          setSelectedTableForQr((prev) => (c.tables.some((t: any) => t.name === prev) ? prev : c.tables[0].name));
        }
        if (c.billing) {
          setTaxRate(c.billing.taxRate ?? 5);
          setTaxType(c.billing.taxType || 'exclusive');
          setTaxName(c.billing.taxName || 'GST');
          setServiceChargeRate(c.billing.serviceChargeRate ?? 0);
          setGstin(c.billing.gstin || '');
          setBillFooterText(c.billing.billFooterText || 'Thank you for dining with us! Please visit again.');
        }
        if (c.discounts && Array.isArray(c.discounts)) {
          setDiscounts(c.discounts);
        }
        setWebStoreInfo((prev) => ({
          ...prev,
          businessName: c.storeName || auth?.tenant?.name || prev.businessName,
          gstin: c.billing?.gstin || c.gstin || prev.gstin,
          upiId: c.upiId || prev.upiId,
          phone: c.phone || auth?.tenant?.phone || prev.phone,
          email: c.email || prev.email,
          address: c.address || auth?.tenant?.address || prev.address,
          logoUrl: c.logoUrl || prev.logoUrl,
          signatureUrl: c.signatureUrl || prev.signatureUrl,
        }));
      }
    } catch (err: any) {
      console.error('Failed to load commerce data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCommerceData();
  }, []);

  // Data Loaders for Merchant OS Modules
  const loadTemplates = async () => {
    try {
      const res = await authFetch('/api/commerce/templates').then((r) => r.json());
      if (res.templates) setTemplatesList(res.templates);
    } catch {
      toast.error('Failed to load industry templates');
    }
  };

  const loadPromotions = async () => {
    try {
      const res = await authFetch('/api/commerce/promotions').then((r) => r.json());
      if (res.coupons) setCouponsList(res.coupons);
      if (res.banner) setAnnouncementBanner(res.banner);
    } catch {
      toast.error('Failed to load promotions');
    }
  };

  const loadDomain = async () => {
    try {
      const res = await authFetch('/api/commerce/domain').then((r) => r.json());
      setDomainRecord(res);
      if (res.domain) setCustomDomainInput(res.domain);
    } catch {
      toast.error('Failed to load custom domain');
    }
  };

  const loadKhata = async () => {
    setKhataLoading(true);
    try {
      const res = await authFetch('/api/commerce/khata').then((r) => r.json());
      // API returns { summary, customers, suppliers } — NOT { records, summary.totalReceivable }
      if (Array.isArray(res.customers)) setKhataList(res.customers);
      if (Array.isArray(res.suppliers)) setKhataSuppliers(res.suppliers);
      if (res.summary) {
        setKhataReceivable(res.summary.totalAapkoMilega || 0);
        setKhataPayable(res.summary.totalAapkoDenaHai || 0);
      }
    } catch {
      toast.error('Failed to load customer khata');
    } finally {
      setKhataLoading(false);
    }
  };

  const loadDayBook = async () => {
    try {
      const res = await authFetch('/api/commerce/daybook').then((r) => r.json());
      if (res.dayBook) setDayBookData(res.dayBook);
    } catch {
      toast.error('Failed to load day book');
    }
  };

  // Billing & GST Invoices loader (uses authFetch for 401-refresh)
  const loadBilling = async () => {
    setBillingLoading(true);
    setBillingError(null);
    try {
      const [invRes, quoteRes] = await Promise.all([
        authFetch('/api/quote-flow/invoices')
          .then((r) => r.json())
          .catch(() => ({ invoices: [], overview: { paid: 0, unpaid: 0, overdue: 0 } })),
        authFetch('/api/quote-flow/quotes')
          .then((r) => r.json())
          .catch(() => ({ quotes: [], overview: { accepted: 0, pending: 0, draft: 0 } })),
      ]);
      setInvoices(invRes.invoices || []);
      if (invRes.overview) setInvoiceOverview(invRes.overview);
      setQuotes(quoteRes.quotes || []);
      if (quoteRes.overview) setQuoteOverview(quoteRes.overview);
    } catch (err: any) {
      setBillingError(err?.message || 'Unable to load billing data.');
    } finally {
      setBillingLoading(false);
    }
  };

  // Business Blueprint Adaptive Capabilities
  const businessType = blueprint?.businessType || 'retail';
  const caps = blueprint?.capabilities;

  const showDineIn = businessType === 'restaurant' || !!caps?.dining || !!caps?.tables;
  const showKds = businessType === 'restaurant' || !!caps?.kitchenKot;
  const showPos = caps ? !!caps.posRegister : true;
  const showClosing = showPos || showDineIn;
  const showKhata = caps ? !!caps.customerCredit : true;
  const showDaybook = caps ? !!caps.expenses : true;
  const showBilling = caps ? !!caps.invoicing : true;
  const showPromotions = caps ? (!!caps.onlineStore || !!caps.orders || !!caps.loyalty) : true;
  const showDomain = caps ? !!caps.customDomain : true;

  // Auto-redirect if active tab is not supported by current business blueprint
  useEffect(() => {
    if (activeTab === 'dineIn' && !showDineIn) setActiveTab('orders');
    else if (activeTab === 'kds' && !showKds) setActiveTab('orders');
    else if (activeTab === 'pos' && !showPos) setActiveTab('orders');
    else if (activeTab === 'closing' && !showClosing) setActiveTab('orders');
    else if (activeTab === 'khata' && !showKhata) setActiveTab('orders');
    else if (activeTab === 'daybook' && !showDaybook) setActiveTab('orders');
    else if (activeTab === 'billing' && !showBilling) setActiveTab('orders');
  }, [activeTab, showDineIn, showKds, showPos, showClosing, showKhata, showDaybook, showBilling]);

  useEffect(() => {
    if (activeTab === 'templates') loadTemplates();
    if (activeTab === 'promotions') loadPromotions();
    if (activeTab === 'domain') loadDomain();
    if (activeTab === 'khata') loadKhata();
    if (activeTab === 'daybook') loadDayBook();
    if (activeTab === 'billing') loadBilling();
  }, [activeTab]);

  // Actions for Merchant OS Modules
  const handleApplyTemplate = async (templateId: string) => {
    if (!confirm('Apply this industry template? This will seed your store with prebuilt products, categories, and prices.')) return;
    setApplyingTemplateId(templateId);
    try {
      const res = await authFetch('/api/commerce/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, replaceExisting: false }),
      }).then((r) => r.json());
      if (res.ok) {
        toast.success(res.message || 'Template applied successfully!');
        loadCommerceData();
        setActiveTab('catalog');
      } else {
        toast.error(res.error || 'Failed to apply template');
      }
    } catch {
      toast.error('Failed to apply template');
    } finally {
      setApplyingTemplateId(null);
    }
  };

  const handleSaveCoupon = async () => {
    if (!newCouponCode.trim() || !newCouponValue) {
      toast.error('Coupon code and discount value are required');
      return;
    }
    setSavingCoupon(true);
    try {
      const res = await authFetch('/api/commerce/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_COUPON',
          coupon: {
            code: newCouponCode.trim().toUpperCase(),
            type: newCouponType,
            value: parseFloat(newCouponValue) || 0,
            minOrder: parseFloat(newCouponMinOrder) || 0,
          },
        }),
      }).then((r) => r.json());
      if (res.ok) {
        toast.success('Coupon created!');
        setNewCouponCode('');
        loadPromotions();
      } else {
        toast.error(res.error || 'Failed to create coupon');
      }
    } catch {
      toast.error('Error creating coupon');
    } finally {
      setSavingCoupon(false);
    }
  };

  const handleDeleteCoupon = async (code: string) => {
    if (!confirm(`Delete coupon ${code}?`)) return;
    try {
      const res = await authFetch('/api/commerce/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DELETE_COUPON', code }),
      }).then((r) => r.json());
      if (res.ok) {
        toast.success('Coupon removed');
        loadPromotions();
      }
    } catch {
      toast.error('Failed to remove coupon');
    }
  };

  const handleSaveBanner = async () => {
    setSavingBanner(true);
    try {
      const res = await authFetch('/api/commerce/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'UPDATE_BANNER', banner: announcementBanner }),
      }).then((r) => r.json());
      if (res.ok) {
        toast.success('Storefront announcement banner updated!');
        loadPromotions();
      } else {
        toast.error(res.error || 'Failed to save banner');
      }
    } catch {
      toast.error('Error saving banner');
    } finally {
      setSavingBanner(false);
    }
  };

  const handleSaveDomain = async () => {
    if (!customDomainInput.trim()) {
      toast.error('Please enter a domain name');
      return;
    }
    setSavingDomain(true);
    try {
      const res = await authFetch('/api/commerce/domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customDomain: customDomainInput.trim() }),
      }).then((r) => r.json());
      if (res.ok) {
        toast.success('Domain configured! Please update your DNS records.');
        loadDomain();
      } else {
        toast.error(res.error || 'Failed to save domain');
      }
    } catch {
      toast.error('Error saving domain');
    } finally {
      setSavingDomain(false);
    }
  };

  const handleVerifyDomain = async () => {
    setVerifyingDomain(true);
    try {
      const res = await authFetch('/api/commerce/domain/verify', { method: 'POST' }).then((r) => r.json());
      if (res.verified) {
        toast.success('Domain verified and connected successfully!');
      } else {
        toast.info(res.message || 'DNS verification in progress. Please allow up to 24-48 hours for propagation.');
      }
      loadDomain();
    } catch {
      toast.error('Verification request failed');
    } finally {
      setVerifyingDomain(false);
    }
  };

  const handleSendKhataWhatsApp = (entry: any) => {
    // The API pre-builds a whatsappReminderUrl with the full reminder text + UPI link.
    // Use it directly if present; otherwise build from entry.phone + entry.name.
    if (entry.whatsappReminderUrl) {
      window.open(entry.whatsappReminderUrl, '_blank');
      return;
    }
    const phone = (entry.phone || '').replace(/\D/g, '');
    const amount = Number(entry.balance || 0).toFixed(2);
    const storeName = auth?.tenant?.name || 'Store';
    const upiLink = upiId
      ? `upi://pay?pa=${upiId}&pn=${encodeURIComponent(storeName)}&am=${amount}`
      : '';
    const text = `Namaste ${entry.name || 'Customer'},\nThis is a polite reminder from *${storeName}*.\nYour outstanding balance is *₹${amount}*.\n${upiLink ? `\nTap to pay instantly via UPI: ${upiLink}\n` : ''}\nThank you!`;
    const waUrl = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  // ── Khata CRUD: Record Payment (GOT_PAYMENT) ─────────────────────────
  const handleOpenKhataPayment = (entry: any) => {
    setKhataPaymentModal({ entry });
    setKhataPayAmount(String(entry.balance || ''));
    setKhataPayMethod('CASH');
    setKhataPayNote('');
  };

  const handleRecordKhataPayment = async () => {
    if (!khataPaymentModal) return;
    const amt = parseFloat(khataPayAmount);
    if (!amt || amt <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }
    setKhataPaySubmitting(true);
    try {
      const res = await authFetch('/api/commerce/khata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'GOT_PAYMENT',
          customerPhone: khataPaymentModal.entry.phone,
          amount: amt,
          paymentMethod: khataPayMethod,
          note: khataPayNote,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to record payment');
      toast.success(`Payment of ₹${amt.toFixed(2)} recorded ✓`);
      setKhataPaymentModal(null);
      loadKhata();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to record payment');
    } finally {
      setKhataPaySubmitting(false);
    }
  };

  // ── Khata CRUD: Give Udhaar (GAVE_UDHAAR) ───────────────────────────
  const handleGiveUdhaar = async () => {
    const phone = khataUdhaarPhone.replace(/\D/g, '');
    const amt = parseFloat(khataUdhaarAmount);
    if (!phone || !amt || amt <= 0) {
      toast.error('Please enter customer phone and a valid amount');
      return;
    }
    setKhataUdhaarSubmitting(true);
    try {
      const res = await authFetch('/api/commerce/khata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'GAVE_UDHAAR',
          customerPhone: phone,
          customerName: khataUdhaarName || 'Udhaar Customer',
          amount: amt,
          note: khataUdhaarNote,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to record udhaar');
      toast.success(`Udhaar of ₹${amt.toFixed(2)} recorded ✓`);
      setKhataUdhaarModal(false);
      setKhataUdhaarPhone('');
      setKhataUdhaarName('');
      setKhataUdhaarAmount('');
      setKhataUdhaarNote('');
      loadKhata();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to record udhaar');
    } finally {
      setKhataUdhaarSubmitting(false);
    }
  };

  // ── Khata CRUD: Pay Supplier (PAID_SUPPLIER) ────────────────────────
  const handleOpenSupplierPay = (entry: any) => {
    setKhataSupplierPayModal({ entry });
    setKhataSupplierPayAmount(String(entry.balance || ''));
    setKhataSupplierPayMethod('CASH');
  };

  const handlePaySupplier = async () => {
    if (!khataSupplierPayModal) return;
    const amt = parseFloat(khataSupplierPayAmount);
    if (!amt || amt <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }
    setKhataSupplierPaySubmitting(true);
    try {
      const res = await authFetch('/api/commerce/khata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'PAID_SUPPLIER',
          supplierId: khataSupplierPayModal.entry.supplierId,
          amount: amt,
          paymentMethod: khataSupplierPayMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to record supplier payment');
      toast.success(`Supplier payment of ₹${amt.toFixed(2)} recorded ✓`);
      setKhataSupplierPayModal(null);
      loadKhata();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to record supplier payment');
    } finally {
      setKhataSupplierPaySubmitting(false);
    }
  };

  const handleAddExpense = async () => {
    const amt = parseFloat(newExpenseAmt);
    if (!amt || amt <= 0) {
      toast.error('Please enter a valid expense amount');
      return;
    }
    setSavingExpense(true);
    try {
      const res = await authFetch('/api/commerce/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amt,
          category: newExpenseCat,
          description: newExpenseNote.trim() || newExpenseCat,
          paymentMethod: 'CASH',
        }),
      }).then((r) => r.json());
      if (res.ok || res.expense) {
        toast.success(`Expense of ₹${amt} recorded!`);
        setNewExpenseAmt('');
        setNewExpenseNote('');
        loadDayBook();
      } else {
        toast.error(res.error || 'Failed to record expense');
      }
    } catch {
      toast.error('Error recording expense');
    } finally {
      setSavingExpense(false);
    }
  };

  // ============ Billing & GST Invoices Actions (mobile billing.tsx port) ============

  const openBillingForm = (type: 'INVOICE' | 'QUOTE') => {
    setEditingBillingInvoice(null);
    setBillingFormType(type);
    setBillingCustomerName('');
    setBillingCustomerPhone('');
    setBillingItems([{ description: '', qty: 1, unitPrice: 0, hsnCode: '' }]);
    setBillingTaxRate(18);
    setBillingDiscount('0');
    setBillingNotes('');
    setBillingModalOpen(true);
  };

  const handleOpenEditBillingInvoice = (inv: any) => {
    setEditingBillingInvoice(inv);
    setBillingFormType('INVOICE');
    setBillingCustomerName(inv.customer?.name || '');
    setBillingCustomerPhone(inv.customer?.phone || '');
    setBillingItems(
      inv.items && inv.items.length > 0
        ? inv.items.map((i: any) => ({
            description: i.description,
            qty: Number(i.qty) || 1,
            unitPrice: Number(i.unitPrice) || 0,
            hsnCode: i.hsnCode || '',
          }))
        : [{ description: '', qty: 1, unitPrice: 0, hsnCode: '' }]
    );
    const sub = inv.subtotal || inv.total - (inv.tax || 0);
    const rate = sub > 0 && inv.tax ? Math.round((inv.tax / sub) * 100) : 18;
    setBillingTaxRate(rate);
    setBillingDiscount(String(inv.discount || 0));
    setBillingNotes(inv.notes || '');
    setBillingModalOpen(true);
  };

  const addBillingItemRow = () => {
    setBillingItems([...billingItems, { description: '', qty: 1, unitPrice: 0, hsnCode: '' }]);
  };

  const removeBillingItemRow = (idx: number) => {
    if (billingItems.length <= 1) return;
    setBillingItems(billingItems.filter((_, i) => i !== idx));
  };

  const updateBillingItem = (idx: number, field: 'description' | 'qty' | 'unitPrice' | 'hsnCode', val: any) => {
    const updated = [...billingItems];
    updated[idx] = { ...updated[idx], [field]: val };
    setBillingItems(updated);
  };

  const handleSubmitBilling = async () => {
    const validItems = billingItems.filter((i) => i.description.trim() && Number(i.unitPrice) > 0);
    if (validItems.length === 0) {
      toast.error('Please add at least one item with description and price.');
      return;
    }
    setBillingSubmitting(true);
    try {
      const lineItems = validItems.map((i) => ({
        description: i.description.trim(),
        qty: Number(i.qty) || 1,
        unitPrice: Number(i.unitPrice) || 0,
        hsnCode: i.hsnCode?.trim() || undefined,
      }));

      if (editingBillingInvoice) {
        // Edit existing invoice
        const res = await authFetch(`/api/quote-flow/invoices/${editingBillingInvoice.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            taxRate: billingTaxRate,
            discountValue: parseFloat(billingDiscount) || 0,
            discountType: 'AMOUNT',
            notes: billingNotes.trim(),
            items: lineItems,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || 'Failed to update invoice');
        }
        toast.success(`Invoice #${editingBillingInvoice.number} updated ✓`);
        if (selectedBillingInvoice?.id === editingBillingInvoice.id && data?.invoice) {
          setSelectedBillingInvoice(data.invoice);
        }
        setEditingBillingInvoice(null);
      } else {
        const payload: any = {
          customerName: billingCustomerName.trim() || 'Client',
          customerPhone: billingCustomerPhone.trim(),
          taxRate: billingTaxRate,
          discountValue: parseFloat(billingDiscount) || 0,
          discountType: 'AMOUNT',
          notes: billingNotes.trim(),
          items: lineItems,
          status: billingFormType === 'INVOICE' ? 'UNPAID' : 'SENT',
        };
        const url = billingFormType === 'INVOICE'
          ? '/api/quote-flow/invoices'
          : '/api/quote-flow/quotes';
        const res = await authFetch(url, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || `Failed to create ${billingFormType === 'INVOICE' ? 'invoice' : 'estimate'}`);
        }
        toast.success(billingFormType === 'INVOICE' ? 'GST Invoice created ✓' : 'Estimate created ✓');
      }

      setBillingModalOpen(false);
      loadBilling();
    } catch (err: any) {
      toast.error(err?.message || 'Could not save document.');
    } finally {
      setBillingSubmitting(false);
    }
  };

  const handlePrintWebInvoice = (inv: any) => {
    try {
      const html = generateGstInvoiceHtml(inv, webStoreInfo, currencySymbol);
      const printWin = window.open('', '_blank');
      if (printWin) {
        printWin.document.open();
        printWin.document.write(html);
        printWin.document.close();
        printWin.focus();
        setTimeout(() => {
          printWin.print();
        }, 300);
      } else {
        toast.error('Please allow popups to print/export invoice.');
      }
    } catch (e: any) {
      toast.error('Print error: ' + (e?.message || 'Failed'));
    }
  };

  const handleToggleWebPayment = (inv: any) => {
    const isPaid = Number(inv.balance || 0) <= 0 || inv.status === 'PAID';
    if (isPaid) {
      if (!confirm(`Revert invoice #${inv.number} status to UNPAID?`)) return;
      authFetch(`/api/quote-flow/invoices/${inv.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'UNPAID' }),
      })
        .then((r) => r.json())
        .then(() => {
          toast.success(`Invoice #${inv.number} marked as UNPAID`);
          if (selectedBillingInvoice?.id === inv.id) {
            setSelectedBillingInvoice({
              ...selectedBillingInvoice,
              status: 'UNPAID',
              balance: selectedBillingInvoice.total,
              paidAmount: 0,
            });
          }
          loadBilling();
        })
        .catch(() => toast.error('Failed to update status'));
    } else {
      setBillingPaymentModalInvoice(inv);
      setBillingPaymentMode('CASH');
    }
  };

  const handleConfirmWebPayment = async () => {
    if (!billingPaymentModalInvoice) return;
    setBillingPaymentSubmitting(true);
    try {
      const res = await authFetch(`/api/quote-flow/invoices/${billingPaymentModalInvoice.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'PAID',
          paymentMethod: billingPaymentMode,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to record payment');
      toast.success(
        `Invoice #${billingPaymentModalInvoice.number} marked as PAID via ${billingPaymentMode} ✓`
      );
      if (selectedBillingInvoice?.id === billingPaymentModalInvoice.id) {
        setSelectedBillingInvoice({
          ...selectedBillingInvoice,
          status: 'PAID',
          balance: 0,
          paidAmount: selectedBillingInvoice.total,
          paymentMethod: billingPaymentMode,
        });
      }
      setBillingPaymentModalInvoice(null);
      loadBilling();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to record payment');
    } finally {
      setBillingPaymentSubmitting(false);
    }
  };

  // 1-tap convert Quote -> Invoice: POST invoice with fromQuoteId, then PATCH quote to ACCEPTED
  const handleConvertQuoteToInvoice = async (quote: any) => {
    if (!confirm(`Convert Estimate ${quote.number} into an official GST Invoice?`)) return;
    try {
      const derivedTaxRate = quote.subtotal ? (Number(quote.tax || 0) / quote.subtotal) * 100 : 0;
      const createRes = await authFetch('/api/quote-flow/invoices', {
        method: 'POST',
        body: JSON.stringify({
          customerId: quote.customer?.id,
          fromQuoteId: quote.id,
          taxRate: Math.round(derivedTaxRate * 100) / 100,
          discountValue: Number(quote.discount || 0),
          items: (quote.items || []).map((i: any) => ({
            description: i.description,
            qty: i.qty,
            unitPrice: i.unitPrice,
            hsnCode: i.hsnCode,
          })),
          status: 'UNPAID',
        }),
      });
      if (!createRes.ok) {
        const e = await createRes.json().catch(() => ({}));
        throw new Error(e?.error || 'Failed to create invoice from quote');
      }
      // Mark source quote as ACCEPTED (non-fatal if this fails — invoice was already created)
      const patchRes = await authFetch(`/api/quote-flow/quotes/${quote.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'ACCEPTED' }),
      });
      if (!patchRes.ok) {
        console.warn('[billing] quote PATCH to ACCEPTED failed', await patchRes.text().catch(() => ''));
      }
      toast.success('Converted to GST Invoice ✓');
      setBillingSubTab('INVOICES');
      loadBilling();
    } catch (err: any) {
      toast.error(err?.message || 'Conversion failed');
    }
  };

  // Share invoice / quote via WhatsApp (opens wa.me link in new tab)
  const handleShareBillingWhatsApp = (item: any, isInvoice: boolean) => {
    const docName = isInvoice ? 'GST Invoice' : 'Quotation Estimate';
    const clientName = item.customer?.name || 'Customer';
    const total = Number(item.total || 0).toFixed(2);
    const text = `Hello ${clientName},\n\nPlease find your ${docName} #${item.number} for the amount of ₹${total}.\n\nThank you for your business!`;
    const cleanPhone = (item.customer?.phone || '').replace(/\D/g, '');
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  // Mark an invoice as fully paid — POSTs a single AiPayment equal to the
  // outstanding balance. The pay endpoint handles status transition (PAID /
  // PARTIALLY_PAID) automatically, so the frontend just needs to refresh.
  const handleMarkInvoicePaid = async (inv: any) => {
    if (!inv?.id) return;
    const balance = Math.max(0, Number(inv.balance ?? inv.total ?? 0));
    if (balance <= 0) {
      toast.info('This invoice already has no outstanding balance.');
      return;
    }
    if (!confirm(`Mark invoice ${inv.number} as PAID (₹${balance.toFixed(2)})?`)) return;
    setMarkingPaidId(inv.id);
    try {
      const res = await authFetch(`/api/quote-flow/invoices/${inv.id}/pay`, {
        method: 'POST',
        body: JSON.stringify({ amount: balance, method: 'MANUAL' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to record payment');
      }
      toast.success(`Marked PAID ✓ (${inv.number})`);
      loadBilling();
    } catch (err: any) {
      toast.error(err?.message || 'Could not mark invoice as paid.');
    } finally {
      setMarkingPaidId(null);
    }
  };

  // Delete an invoice or quote (with cascade — items + payments removed by
  // the database via onDelete: Cascade). Confirm before sending DELETE.
  const handleDeleteBilling = async (
    item: any,
    type: 'INVOICE' | 'QUOTE'
  ) => {
    if (!item?.id) return;
    const label = type === 'INVOICE' ? 'invoice' : 'estimate';
    const upperLabel = type === 'INVOICE' ? 'Invoice' : 'Estimate';
    if (!confirm(`Are you sure you want to delete ${label} ${item.number}? This cannot be undone.`)) return;
    setDeletingBillingId(item.id);
    try {
      const url =
        type === 'INVOICE'
          ? `/api/quote-flow/invoices/${item.id}`
          : `/api/quote-flow/quotes/${item.id}`;
      const res = await authFetch(url, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Failed to delete ${label}`);
      }
      toast.success(`${upperLabel} ${item.number} deleted`);
      loadBilling();
    } catch (err: any) {
      toast.error(err?.message || `Could not delete ${label}.`);
    } finally {
      setDeletingBillingId(null);
    }
  };

  const openOrderDetail = async (orderId: string) => {
    setOrderModalLoading(true);
    setSelectedOrder(null);
    setSelectedConversation(null);
    setShowConversation(false);
    try {
      const res = await authFetch(`/api/commerce/orders/${orderId}`).then((r) => r.json());
      if (res.order) {
        setSelectedOrder(res.order);
        setSelectedConversation(res.conversation);
      }
    } catch {
      toast.error('Failed to load order details');
    } finally {
      setOrderModalLoading(false);
    }
  };

  // Background polling for real-time kitchen orders & auto-print
  useEffect(() => {
    const timer = setInterval(() => {
      Promise.all([
        authFetch('/api/commerce/dashboard').then((r) => r.json()).catch(() => ({})),
        authFetch('/api/commerce/orders').then((r) => r.json()).catch(() => ({})),
      ])
        .then(([dashRes, ordersRes]) => {
          // Use the full orders list from /api/commerce/orders (not just
          // dashRes.recentOrders which is capped at 10).
          const incoming: any[] = ordersRes.orders || dashRes.recentOrders || [];
          if (Array.isArray(incoming) && incoming.length > 0) {
            setOrders(incoming);
          }
          if (dashRes.overview) setStats(dashRes.overview);

          if (!isInitialOrderFetchRef.current) {
            const newOrders = incoming.filter((o: any) => !seenOrderIdsRef.current.has(o.id));
            if (newOrders.length > 0) {
              newOrders.forEach((newOrder: any) => {
                seenOrderIdsRef.current.add(newOrder.id);
                toast.info(`🛎️ New Order #${newOrder.id.slice(-6).toUpperCase()} received!`);

                const bInfo: BusinessPrintInfo = {
                  name: auth?.tenant?.name || 'Local Store',
                  address: auth?.tenant?.address || undefined,
                  phone: auth?.tenant?.phone || undefined,
                  gstin: gstin || undefined,
                  billFooter: billFooterText || undefined,
                };
                const pData: PrintOrderData = {
                  orderNumber: newOrder.id.slice(-6).toUpperCase(),
                  orderType: newOrder.deliveryType || 'TAKEOUT',
                  tableNumber: newOrder.deliveryAddress?.includes('Table')
                    ? newOrder.deliveryAddress.replace(/[^0-9]/g, '')
                    : undefined,
                  customerName: newOrder.customerName,
                  customerPhone: newOrder.customerPhone,
                  createdAt: newOrder.createdAt,
                  items: (newOrder.items || []).map((it: any) => ({
                    name: it.name,
                    qty: it.qty,
                    price: it.price,
                    amount: it.amount || it.price * it.qty,
                  })),
                  total: Number(newOrder.total || 0),
                  paymentMethod: newOrder.paymentMethod,
                  paymentStatus: newOrder.paymentStatus,
                  notes: newOrder.notes,
                };

                handleAutoPrintNewOrder(pData, bInfo, printerConfig);
              });
            }
          } else {
            incoming.forEach((o: any) => seenOrderIdsRef.current.add(o.id));
            isInitialOrderFetchRef.current = false;
          }
        })
        .catch(() => {});
    }, 7000);

    return () => clearInterval(timer);
  }, [auth, gstin, billFooterText, printerConfig]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingOrder(true);
    try {
      const res = await authFetch(`/api/commerce/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      }).then((r) => r.json());

      if (res.order) {
        setSelectedOrder(res.order);
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
        toast.success(`Order marked as ${newStatus}`);
      }
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdatingOrder(false);
    }
  };

  const markReadyAndAlertCustomer = async (order: any) => {
    await updateOrderStatus(order.id, 'READY');
    if (order.customerPhone) {
      const cleanPhone = String(order.customerPhone).replace(/\D/g, '');
      const orderNum = order.id.slice(-6).toUpperCase();
      const locationText = String(order.deliveryType || '').toUpperCase() === 'DINE_IN'
        ? (order.deliveryAddress || 'your table')
        : 'Counter 1';
      const storeName = auth?.tenant?.name || 'Kitchen';
      const msg = `🍜 *Order #${orderNum} is READY!*\nStore: ${storeName}\nYour order has been freshly prepared. Please collect it from *${locationText}*.\n\nEnjoy your meal!`;
      const waUrl = cleanPhone
        ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
        : `https://wa.me/?text=${encodeURIComponent(msg)}`;
      window.open(waUrl, '_blank');
    }
  };

  const markOrderPaid = async (orderId: string) => {
    setUpdatingOrder(true);
    try {
      const res = await authFetch(`/api/commerce/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: 'PAID' }),
      }).then((r) => r.json());

      if (res.order) {
        setSelectedOrder(res.order);
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, paymentStatus: 'PAID' } : o)));
        toast.success('Order marked as paid');
      }
    } catch {
      toast.error('Failed to update payment status');
    } finally {
      setUpdatingOrder(false);
    }
  };

  const saveSettings = async (
    customCatalog?: any[],
    customTables?: any[],
    customBilling?: any,
    customDiscounts?: any[]
  ) => {
    setSavingSettings(true);
    try {
      const catToSave = customCatalog || catalog;
      const tablesToSave = customTables || tables;
      const billingToSave = customBilling || {
        taxRate,
        taxType,
        taxName,
        serviceChargeRate,
        gstin,
        billFooterText,
      };
      const discountsToSave = customDiscounts || discounts;

      // Capture the current state for optimistic rollback if the save fails.
      const prevCatalog = catalog;
      const prevTables = tables;

      const response = await authFetch('/api/commerce/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          catalogJson: catToSave,
          tables: tablesToSave,
          billing: billingToSave,
          discounts: discountsToSave,
          upiId: upiId || null,
          deliveryAreasJson: deliveryAreas.split(',').map((s) => s.trim()).filter(Boolean),
          greetingMessage: greetingMessage || null,
        }),
      });

      const res = await response.json();
      if (!response.ok) {
        // Rollback optimistic state changes.
        setCatalog(prevCatalog);
        setTables(prevTables);
        throw new Error(res?.error || `Failed to save settings (${response.status})`);
      }

      toast.success('Configuration saved!');
      loadCommerceData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  // Dynamic Table Management Handlers (Take.app Dine-in Parity)
  const handleOpenAddTable = () => {
    setEditingTable(null);
    setTableNameInput(`Table ${tables.length + 1}`);
    setTableCapacityInput('4');
    setTableSectionInput('Main Floor');
    setTableModalOpen(true);
  };

  const handleOpenEditTable = (tbl: any) => {
    setEditingTable(tbl);
    setTableNameInput(tbl.name);
    setTableCapacityInput(String(tbl.capacity || 4));
    setTableSectionInput(tbl.section || 'Main Floor');
    setTableModalOpen(true);
  };

  const handleSaveTable = () => {
    if (!tableNameInput.trim()) {
      toast.error('Table name is required');
      return;
    }
    let updated: any[];
    if (editingTable) {
      updated = tables.map((t) =>
        t.id === editingTable.id
          ? {
              ...t,
              name: tableNameInput.trim(),
              capacity: parseInt(tableCapacityInput, 10) || 4,
              section: tableSectionInput.trim() || 'Main Floor',
            }
          : t
      );
      toast.success(`Updated ${tableNameInput}`);
    } else {
      const newTbl = {
        id: `tbl_${Date.now()}`,
        name: tableNameInput.trim(),
        capacity: parseInt(tableCapacityInput, 10) || 4,
        section: tableSectionInput.trim() || 'Main Floor',
        status: 'vacant',
      };
      updated = [...tables, newTbl];
      toast.success(`Added ${tableNameInput}`);
    }
    setTables(updated);
    setTableModalOpen(false);
    saveSettings(undefined, updated);
  };

  const handleDeleteTable = (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove ${name}?`)) {
      const updated = tables.filter((t) => t.id !== id);
      setTables(updated);
      saveSettings(undefined, updated);
      toast.success(`Removed ${name}`);
    }
  };

  // Customer Receipt & KOT Calculation Helper (Take.app POS Parity)
  const openReceiptModal = (order: any, type: 'CUSTOMER_BILL' | 'KOT') => {
    setReceiptOrder(order);
    setReceiptType(type);
    setReceiptModalOpen(true);
  };

  const computeBillBreakdown = (order: any) => {
    if (!order) return { subtotal: 0, tax: 0, serviceCharge: 0, discount: 0, total: 0 };
    const items = order.items || [];
    const subtotal = items.reduce((acc: number, it: any) => acc + (it.amount || it.price * it.qty || 0), 0);
    const discount = order.discountAmount || 0;
    const taxableAmount = Math.max(0, subtotal - discount);
    const tax = taxType === 'inclusive' ? 0 : (taxableAmount * (taxRate || 0)) / 100;
    const serviceCharge = (taxableAmount * (serviceChargeRate || 0)) / 100;
    const total = taxType === 'inclusive' ? taxableAmount : taxableAmount + tax + serviceCharge;
    return { subtotal, discount, tax, serviceCharge, total: order.total || total };
  };

  const sendWhatsAppReceipt = (order: any) => {
    if (!order?.customerPhone || order.customerPhone === 'Walk-in') {
      toast.error('No customer phone number available');
      return;
    }
    const phone = order.customerPhone.replace(/\D/g, '');
    const bill = computeBillBreakdown(order);
    const itemsText = (order.items || [])
      .map((it: any) => `• ${it.name} x${it.qty} = ${currencySymbol}${(it.amount || it.price * it.qty || 0).toFixed(2)}`)
      .join('\n');

    const message = `🧾 *RECEIPT: ${auth?.tenant?.name || 'STORE'}*\nOrder #${order.id.slice(-6).toUpperCase()}\nDate: ${new Date().toLocaleDateString()}\n${order.deliveryAddress ? `Table/Delivery: ${order.deliveryAddress}\n` : ''}------------------------\n${itemsText}\n------------------------\nSubtotal: ${currencySymbol}${bill.subtotal.toFixed(2)}${bill.tax > 0 ? `\n${taxName} (${taxRate}%): ${currencySymbol}${bill.tax.toFixed(2)}` : ''}\n*TOTAL: ${currencySymbol}${Number(order.total || bill.total).toFixed(2)}*\nStatus: ${order.paymentStatus === 'PAID' ? 'PAID ✅' : 'PENDING ⏳'}${upiId && order.paymentStatus !== 'PAID' ? `\n\nPay via UPI: upi://pay?pa=${upiId}&pn=${encodeURIComponent(auth?.tenant?.name || 'Store')}&am=${Number(order.total).toFixed(2)}` : ''}\n\n${billFooterText}`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  // Direct Thermal Printer Execution Handlers (ESC/POS)
  const handlePrintOrderKOT = async (order: any) => {
    if (!order) return;
    const businessInfo: BusinessPrintInfo = {
      name: auth?.tenant?.name || 'Local Kitchen',
      address: auth?.tenant?.address || undefined,
      phone: auth?.tenant?.phone || undefined,
      gstin: gstin || undefined,
      billFooter: billFooterText || undefined,
    };
    const printData: PrintOrderData = {
      orderNumber: order.id.slice(-6).toUpperCase(),
      orderType: order.deliveryType || 'TAKEOUT',
      tableNumber: order.deliveryAddress?.includes('Table')
        ? order.deliveryAddress.replace(/[^0-9]/g, '')
        : undefined,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      createdAt: order.createdAt,
      items: (order.items || []).map((it: any) => ({
        name: it.name,
        qty: it.qty,
        price: it.price,
        amount: it.amount || it.price * it.qty,
      })),
      total: Number(order.total || 0),
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      notes: order.notes,
    };
    const res = await printKOT(printData, businessInfo, printerConfig);
    if (res.method === 'bluetooth' || res.method === 'usb') {
      toast.success(`🖨️ KOT printed directly to thermal printer (${res.method.toUpperCase()})!`);
    } else {
      toast.info('Printed KOT via browser dialog');
    }
  };

  const handlePrintOrderBill = async (order: any) => {
    if (!order) return;
    const bill = computeBillBreakdown(order);
    const businessInfo: BusinessPrintInfo = {
      name: auth?.tenant?.name || 'Store Receipt',
      address: auth?.tenant?.address || undefined,
      phone: auth?.tenant?.phone || undefined,
      gstin: gstin || undefined,
      billFooter: billFooterText || undefined,
    };
    const printData: PrintOrderData = {
      orderNumber: order.id.slice(-6).toUpperCase(),
      orderType: order.deliveryType || 'TAKEOUT',
      tableNumber: order.deliveryAddress?.includes('Table')
        ? order.deliveryAddress.replace(/[^0-9]/g, '')
        : undefined,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      createdAt: order.createdAt,
      items: (order.items || []).map((it: any) => ({
        name: it.name,
        qty: it.qty,
        price: it.price,
        amount: it.amount || it.price * it.qty,
      })),
      subtotal: bill.subtotal,
      discount: bill.discount,
      taxAmount: bill.tax,
      taxName: taxName,
      serviceCharge: bill.serviceCharge,
      total: Number(order.total || bill.total),
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      notes: order.notes,
    };
    const res = await printCustomerBill(printData, businessInfo, printerConfig);
    if (res.method === 'bluetooth' || res.method === 'usb') {
      toast.success(`🖨️ Bill printed directly to thermal printer (${res.method.toUpperCase()})!`);
    } else {
      toast.info('Printed Bill via browser dialog');
    }
  };

  // Product Add / Edit Handlers
  const openAddProductModal = () => {
    setEditingItem(null);
    setProdName('');
    setProdPrice('');
    setProdCategory('Main');
    setProdDesc('');
    setProdImageUrl('');
    setProdSku('');
    setProdIsActive(true);
    setProductModalOpen(true);
  };

  const openEditProductModal = (item: any) => {
    setEditingItem(item);
    setProdName(item.name || '');
    setProdPrice(String(item.price ?? ''));
    setProdCategory(item.category || 'General');
    setProdDesc(item.description || '');
    setProdImageUrl(item.imageUrl || '');
    setProdSku(item.sku || '');
    setProdIsActive(item.isActive !== false);
    setProductModalOpen(true);
  };

  const handleSaveProductModal = () => {
    if (!prodName.trim() || !prodPrice.trim()) {
      toast.error('Item name and price are required');
      return;
    }

    const price = parseFloat(prodPrice) || 0;
    let updatedCatalog: any[];

    if (editingItem) {
      updatedCatalog = catalog.map((it) =>
        it.id === editingItem.id
          ? {
              ...it,
              name: prodName.trim(),
              price,
              category: prodCategory.trim() || 'General',
              description: prodDesc.trim(),
              imageUrl: prodImageUrl.trim(),
              sku: prodSku.trim(),
              isActive: prodIsActive,
            }
          : it
      );
      toast.success('Product updated');
    } else {
      const newItem = {
        id: Date.now().toString(),
        name: prodName.trim(),
        price,
        category: prodCategory.trim() || 'General',
        description: prodDesc.trim(),
        imageUrl: prodImageUrl.trim(),
        sku: prodSku.trim(),
        isActive: prodIsActive,
        source: 'manual',
      };
      updatedCatalog = [...catalog, newItem];
      toast.success('Product created');
    }

    setCatalog(updatedCatalog);
    setProductModalOpen(false);
    saveSettings(updatedCatalog);
  };

  const toggleProductStock = (id: string) => {
    const updated = catalog.map((item) =>
      item.id === id ? { ...item, isActive: !item.isActive } : item
    );
    setCatalog(updated);
    saveSettings(updated);
    toast.success('Stock status updated');
  };

  const removeProduct = (id: string, name: string) => {
    if (confirm(`Are you sure you want to remove "${name}" from your catalog?`)) {
      const updated = catalog.filter((p) => p.id !== id);
      setCatalog(updated);
      saveSettings(updated);
      toast.success('Product removed');
    }
  };

  // Store Sync Handlers
  const handleExecuteStoreSync = async () => {
    if (!syncDomain.trim()) {
      toast.error('Store URL or domain is required');
      return;
    }

    setIsSyncing(true);
    try {
      if (syncProvider === 'shopify') {
        const res = await authFetch('/api/ecommerce/shopify/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ storeUrl: syncDomain.trim(), accessToken: syncToken.trim() }),
        });
        const data = await res.json();
        if (res.ok) {
          toast.success(data.message || `Synced ${data.count} Shopify products!`);
          setSyncModalOpen(false);
          loadCommerceData();
        } else {
          toast.error(data.error || 'Failed to sync Shopify products');
        }
      } else if (syncProvider === 'woocommerce') {
        const res = await authFetch('/api/ecommerce/woocommerce/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            siteUrl: syncDomain.trim(),
            consumerKey: syncKey.trim(),
            consumerSecret: syncSecret.trim(),
          }),
        });
        const data = await res.json();
        if (res.ok) {
          toast.success(data.message || `Synced ${data.count} WooCommerce products!`);
          setSyncModalOpen(false);
          loadCommerceData();
        } else {
          toast.error(data.error || 'Failed to sync WooCommerce products');
        }
      }
    } catch (err: any) {
      toast.error(err?.message || 'Network error during sync');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleImportCSVFile = async () => {
    if (!csvFile) {
      toast.error('Please select a CSV file to import');
      return;
    }

    setIsSyncing(true);
    try {
      const formData = new FormData();
      formData.append('file', csvFile);

      const res = await authFetch('/api/commerce/products/import', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || `Successfully imported ${data.imported} products!`);
        setSyncModalOpen(false);
        setCsvFile(null);
        loadCommerceData();
      } else {
        toast.error(data.error || 'Failed to import CSV');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error uploading CSV');
    } finally {
      setIsSyncing(false);
    }
  };

  // POS Handlers
  const addToPosCart = (item: any) => {
    setPosCart((prev) => {
      const existing = prev.find((p) => p.id === item.id);
      if (existing) {
        return prev.map((p) => (p.id === item.id ? { ...p, qty: p.qty + 1 } : p));
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: 1 }];
    });
  };

  const removeFromPosCart = (id: string) => {
    setPosCart((prev) => prev.filter((p) => p.id !== id));
  };

  const updatePosQty = (id: string, delta: number) => {
    setPosCart((prev) =>
      prev
        .map((p) => (p.id === id ? { ...p, qty: Math.max(1, p.qty + delta) } : p))
        .filter((p) => p.qty > 0)
    );
  };

  // Barcode Lookup & Cart Addition
  const handleBarcodeLookupAndAdd = (barcodeRaw: string) => {
    const code = barcodeRaw.trim();
    if (!code) return;

    const matched = catalog.find((item: any) =>
      item.id?.toLowerCase() === code.toLowerCase() ||
      (item.sku && item.sku.toLowerCase() === code.toLowerCase()) ||
      (item.barcode && item.barcode.toLowerCase() === code.toLowerCase()) ||
      item.name?.toLowerCase() === code.toLowerCase()
    );

    if (matched) {
      addToPosCart(matched);
      // Audio beep feedback
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.value = 1200;
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.12);
      } catch {}
      toast.success(`✓ Scanned & Added: ${matched.name} (${currencySymbol}${matched.price})`);
    } else {
      toast.error(`✕ No catalog item matches barcode: "${code}"`);
    }
  };

  // Hardware USB/Bluetooth Barcode Wedge Listener (Hardware Retail Scanners)
  useEffect(() => {
    if (activeTab !== 'pos') return;

    let buffer = '';
    let lastKeyTime = 0;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      const activeType = (document.activeElement as HTMLInputElement)?.type;
      const isInput = activeTag === 'INPUT' && activeType !== 'button' && activeType !== 'submit';
      const isTextarea = activeTag === 'TEXTAREA';

      const now = Date.now();
      const timeDiff = now - lastKeyTime;
      lastKeyTime = now;

      if (e.key === 'Enter') {
        if (buffer.length >= 2) {
          handleBarcodeLookupAndAdd(buffer);
          buffer = '';
          if (!isInput && !isTextarea) e.preventDefault();
        }
        buffer = '';
        return;
      }

      if (e.key.length === 1) {
        if (timeDiff > 65 && buffer.length > 0) {
          buffer = '';
        }
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [activeTab, catalog, currencySymbol]);

  // Web Camera Barcode Scanner Controls
  const startCameraScanner = async () => {
    setPosScannerModalOpen(true);
    setPosCameraError(null);
    setPosCameraActive(false);

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Camera API is not supported on this browser or origin.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      posMediaStreamRef.current = stream;
      if (posVideoRef.current) {
        posVideoRef.current.srcObject = stream;
        await posVideoRef.current.play();
        setPosCameraActive(true);
      }
    } catch (err: any) {
      setPosCameraError(err?.message || 'Camera access denied or device not found.');
    }
  };

  const stopCameraScanner = () => {
    if (posMediaStreamRef.current) {
      posMediaStreamRef.current.getTracks().forEach((t) => t.stop());
      posMediaStreamRef.current = null;
    }
    setPosCameraActive(false);
    setPosScannerModalOpen(false);
  };

  // Continuous Camera Frame Scanner using BarcodeDetector
  useEffect(() => {
    if (!posCameraActive || !posVideoRef.current) return;

    let active = true;
    let detector: any = null;

    if ('BarcodeDetector' in window) {
      try {
        detector = new (window as any).BarcodeDetector({
          formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e'],
        });
      } catch {}
    }

    let lastDetected = '';
    let cooldownUntil = 0;

    const interval = setInterval(async () => {
      if (!active || !posVideoRef.current || posVideoRef.current.readyState < 2) return;
      const now = Date.now();
      if (now < cooldownUntil) return;

      if (detector) {
        try {
          const barcodes = await detector.detect(posVideoRef.current);
          if (barcodes.length > 0) {
            const raw = barcodes[0].rawValue;
            if (raw && raw !== lastDetected) {
              lastDetected = raw;
              cooldownUntil = now + 1600;
              handleBarcodeLookupAndAdd(raw);
            }
          }
        } catch {}
      }
    }, 250);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [posCameraActive, catalog]);

  // 1-Click GST & Tax Summary Report Export (CSV)
  const exportGstTaxReportCsv = () => {
    if (invoices.length === 0) {
      toast.error('No invoices found to export');
      return;
    }

    const headers = [
      'Invoice Number',
      'Invoice Date',
      'Customer Name',
      'Customer Phone',
      'Status',
      'Taxable Value',
      'GST Rate (%)',
      'CGST',
      'SGST',
      'Total Tax',
      'Total Invoice Value',
      'Items Count',
    ];

    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalTax = 0;
    let totalAmount = 0;

    const rows = invoices.map((inv) => {
      const taxable = Number(inv.subtotal || inv.total - (inv.tax || 0)) || 0;
      const tax = Number(inv.tax || 0);
      const rate = taxable > 0 ? Math.round((tax / taxable) * 100) : 18;
      const cgst = tax / 2;
      const sgst = tax / 2;
      const total = Number(inv.total || 0);

      totalTaxable += taxable;
      totalCgst += cgst;
      totalSgst += sgst;
      totalTax += tax;
      totalAmount += total;

      return [
        `"${inv.number}"`,
        `"${new Date(inv.createdAt).toLocaleDateString()}"`,
        `"${(inv.customer?.name || 'Walk-in Client').replace(/"/g, '""')}"`,
        `"${inv.customer?.phone || ''}"`,
        `"${inv.status}"`,
        taxable.toFixed(2),
        `"${rate}%"`,
        cgst.toFixed(2),
        sgst.toFixed(2),
        tax.toFixed(2),
        total.toFixed(2),
        inv.items?.length || 0,
      ].join(',');
    });

    const summaryRow = [
      '"TOTAL"',
      '""',
      '""',
      '""',
      '""',
      totalTaxable.toFixed(2),
      '""',
      totalCgst.toFixed(2),
      totalSgst.toFixed(2),
      totalTax.toFixed(2),
      totalAmount.toFixed(2),
      '""',
    ].join(',');

    const csvContent = [headers.join(','), ...rows, summaryRow].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `GSTR1_Tax_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${invoices.length} invoices to GSTR-1 CSV report!`);
  };

  const submitPosOrder = async () => {
    if (posCart.length === 0) {
      toast.error('Please add items to cart');
      return;
    }
    const finalPhone = posCustomerPhone.trim() || '9999999999';
    setPosSubmitting(true);
    try {
      // Apply tax + service charge from Settings (was ignoring them — POS total
      // was just the raw subtotal, mismatching the receipt math).
      const subtotal = posCart.reduce((sum, it) => sum + it.price * it.qty, 0);
      const taxAmount = taxRate > 0 ? (subtotal * Number(taxRate)) / 100 : 0;
      const serviceChargeAmount = serviceChargeRate > 0 ? (subtotal * Number(serviceChargeRate)) / 100 : 0;
      const total = subtotal + taxAmount + serviceChargeAmount;
      const response = await authFetch('/api/commerce/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: posCustomerName.trim() || 'Walk-in Guest',
          customerPhone: finalPhone,
          paymentMethod: posPaymentMethod,
          deliveryType: posOrderType.toLowerCase(),
          deliveryAddress: posTableNumber ? `Table #${posTableNumber}` : null,
          notes: posTableNumber ? `Dine-In Table #${posTableNumber}` : 'In-store Walk-in POS',
          items: posCart.map((i) => ({ name: i.name, qty: i.qty, price: i.price, amount: i.price * i.qty })),
          total,
        }),
      });

      const res = await response.json();
      if (!response.ok) {
        throw new Error(res?.error || `Failed to create order (${response.status})`);
      }

      if (res.order) {
        toast.success(`POS Order Created ✓ (${currencySymbol}${total.toFixed(2)})`);
        setPosCart([]);
        setPosCustomerName('');
        setPosCustomerPhone('');
        setPosTableNumber('');
        setPosMobileCheckoutOpen(false);
        loadCommerceData();
        setActiveTab('orders');
      } else {
        throw new Error('Server returned no order in the response');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to submit POS order');
    } finally {
      setPosSubmitting(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === 'ALL') return true;
    return o.status === statusFilter;
  });

  const productCategories = [
    'ALL',
    ...Array.from(new Set(catalog.map((p) => (p.category || 'General').trim()).filter(Boolean))),
  ];

  const filteredCatalog = catalog.filter((item) => {
    const query = productSearch.toLowerCase().trim();
    const matchesSearch =
      !query ||
      (item.name && item.name.toLowerCase().includes(query)) ||
      (item.sku && item.sku.toLowerCase().includes(query)) ||
      (item.description && item.description.toLowerCase().includes(query));

    const matchesCategory =
      productCategory === 'ALL' ||
      (item.category || 'General').toLowerCase() === productCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  // Adaptive Tab Labels based on Business Model & Country Pack
  const catalogLabel = businessType === 'restaurant'
    ? 'Menu & Items'
    : businessType === 'services' || businessType === 'salon'
    ? 'Services Catalog'
    : 'Products & Menu';

  const khataLabel = countryPack?.vocabulary?.customerCredit || 'Khata (Udhaar)';
  const billingLabel = countryPack?.vocabulary?.invoice
    ? `${countryPack.vocabulary.invoice} & Billing`
    : (countryPack?.code === 'IN' ? 'Billing & GST' : 'Billing & Invoices');

  // Billing live-computed totals (mirrors mobile billing.tsx modal math)
  const billingSubtotal = billingItems.reduce(
    (s, i) => s + (Number(i.qty) || 0) * (Number(i.unitPrice) || 0),
    0
  );
  const billingDiscountAmt = parseFloat(billingDiscount) || 0;
  const billingTaxable = Math.max(0, billingSubtotal - billingDiscountAmt);
  const billingTaxAmt = (billingTaxable * billingTaxRate) / 100;
  const billingGrandTotal = billingTaxable + billingTaxAmt;

  const filteredInvoices = invoices.filter((inv) => {
    if (!billingSearch) return true;
    const q = billingSearch.toLowerCase();
    return (
      inv.number?.toLowerCase().includes(q) ||
      inv.customer?.name?.toLowerCase().includes(q) ||
      (inv.items || []).some((it: any) => it.description?.toLowerCase().includes(q))
    );
  });

  const filteredQuotes = quotes.filter((qq) => {
    if (!billingSearch) return true;
    const s = billingSearch.toLowerCase();
    return (
      qq.number?.toLowerCase().includes(s) ||
      qq.customer?.name?.toLowerCase().includes(s) ||
      (qq.items || []).some((it: any) => it.description?.toLowerCase().includes(s))
    );
  });

  return (
    <div className="flex h-full flex-col bg-stone-50 overflow-hidden">
      {/* Top Header Bar */}
      <div className="border-b border-stone-200 bg-white px-6 py-3 flex items-center justify-between gap-4 shrink-0 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-stone-900">Commerce &amp; Store Hub</h1>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                Take.app &amp; Vyapar Suite
              </Badge>
            </div>
            <p className="text-xs text-stone-500">
              {businessType === 'restaurant'
                ? 'Online Menu • Dine-in QR • POS & Kitchen KDS • Billing & Ledger'
                : businessType === 'services' || businessType === 'salon'
                ? 'Services Catalog • Appointments & Bookings • Invoicing & Ledger'
                : 'Storefront • Product Catalog • POS Register • Invoicing & Ledger'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Thermal Printer Hardware & Auto-Print Status */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPrinterModalOpen(true)}
            className={`h-8 gap-1.5 text-xs font-bold transition shadow-2xs cursor-pointer ${
              printerConfig.autoPrintEnabled
                ? 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
                : (activeBluetoothPrinter.isConnected || activeUsbPrinter.isConnected)
                ? 'border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                : 'border-stone-300 text-stone-700 hover:bg-stone-50'
            }`}
          >
            <Printer className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {activeBluetoothPrinter.isConnected || activeUsbPrinter.isConnected
                ? `${printerConfig.deviceName || 'Thermal'} (${printerConfig.paperWidth}mm)`
                : 'Thermal Printer'}
            </span>
            {printerConfig.autoPrintEnabled && (
              <Badge className="bg-amber-600 text-white text-[9px] px-1 py-0 font-bold">
                Auto-Print
              </Badge>
            )}
          </Button>

          <a
            href={publicStoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Public Store Link</span>
          </a>
          <Button
            size="sm"
            variant="outline"
            onClick={loadCommerceData}
            disabled={loading}
            className="h-8 gap-1 text-xs cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* 100% Full-Width Tab Navigation Bar */}
      <div className="w-full border-b border-stone-200 bg-stone-50/80 px-6 py-2.5 shrink-0 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 w-full min-w-max bg-stone-100/90 p-1.5 rounded-xl border border-stone-200 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition whitespace-nowrap ${
              activeTab === 'orders' ? 'bg-white text-stone-900 shadow-xs font-bold' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Package className="h-3.5 w-3.5 text-blue-600" />
            Live Orders
            {orders.length > 0 && (
              <span className="ml-1 rounded-full bg-blue-100 text-blue-700 px-1.5 py-0.2 text-[10px] font-bold">
                {orders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition whitespace-nowrap ${
              activeTab === 'catalog' ? 'bg-white text-stone-900 shadow-xs font-bold' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <ShoppingCart className="h-3.5 w-3.5 text-emerald-600" />
            {catalogLabel} ({catalog.length})
          </button>

          {showPos && (
            <button
              onClick={() => setActiveTab('pos')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition whitespace-nowrap ${
                activeTab === 'pos' ? 'bg-white text-stone-900 shadow-xs font-bold' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <CreditCard className="h-3.5 w-3.5 text-purple-600" />
              POS Register
            </button>
          )}

          {showDineIn && (
            <button
              onClick={() => setActiveTab('dineIn')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition whitespace-nowrap ${
                activeTab === 'dineIn' ? 'bg-white text-stone-900 shadow-xs font-bold' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <QrCode className="h-3.5 w-3.5 text-amber-600" />
              Dine-In QR ({tables.length})
            </button>
          )}

          {showKds && (
            <button
              onClick={() => setActiveTab('kds')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition whitespace-nowrap ${
                activeTab === 'kds' ? 'bg-white text-stone-900 shadow-xs font-bold' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <ChefHat className="h-3.5 w-3.5 text-orange-600" />
              Kitchen KDS
              {orders.filter((o) => o.status === 'PENDING' || o.status === 'CONFIRMED' || o.status === 'PREPARING').length > 0 && (
                <span className="ml-1 rounded-full bg-orange-100 text-orange-700 px-1.5 py-0.2 text-[10px] font-bold">
                  {orders.filter((o) => o.status === 'PENDING' || o.status === 'CONFIRMED' || o.status === 'PREPARING').length}
                </span>
              )}
            </button>
          )}

          {showClosing && (
            <button
              onClick={() => setActiveTab('closing')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition whitespace-nowrap ${
                activeTab === 'closing' ? 'bg-white text-stone-900 shadow-xs font-bold' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Receipt className="h-3.5 w-3.5 text-blue-600" />
              Closing
            </button>
          )}

          {showKhata && (
            <button
              onClick={() => setActiveTab('khata')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition whitespace-nowrap ${
                activeTab === 'khata' ? 'bg-white text-stone-900 shadow-xs font-bold' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5 text-amber-700" />
              {khataLabel}
            </button>
          )}

          {showDaybook && (
            <button
              onClick={() => setActiveTab('daybook')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition whitespace-nowrap ${
                activeTab === 'daybook' ? 'bg-white text-stone-900 shadow-xs font-bold' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <DollarSign className="h-3.5 w-3.5 text-emerald-700" />
              Day Book
            </button>
          )}

          {showBilling && (
            <button
              onClick={() => setActiveTab('billing')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition whitespace-nowrap ${
                activeTab === 'billing' ? 'bg-white text-stone-900 shadow-xs font-bold' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <FileText className="h-3.5 w-3.5 text-indigo-600" />
              {billingLabel}
            </button>
          )}

          {showPromotions && (
            <button
              onClick={() => setActiveTab('promotions')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition whitespace-nowrap ${
                activeTab === 'promotions' ? 'bg-white text-stone-900 shadow-xs font-bold' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Tag className="h-3.5 w-3.5 text-amber-600" />
              Promotions
            </button>
          )}

          <button
            onClick={() => setActiveTab('templates')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition whitespace-nowrap ${
              activeTab === 'templates' ? 'bg-white text-stone-900 shadow-xs font-bold' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            Templates
          </button>

          {showDomain && (
            <button
              onClick={() => setActiveTab('domain')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition whitespace-nowrap ${
                activeTab === 'domain' ? 'bg-white text-stone-900 shadow-xs font-bold' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Globe className="h-3.5 w-3.5 text-purple-600" />
              Custom Domain
            </button>
          )}

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition whitespace-nowrap ${
              activeTab === 'settings' ? 'bg-white text-stone-900 shadow-xs font-bold' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Store className="h-3.5 w-3.5 text-stone-600" />
            Settings
          </button>
        </div>
      </div>

      {/* Main View Body */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* ======================= TAB 1: LIVE ORDERS ======================= */}
        {activeTab === 'orders' && (
          <div className="space-y-6 w-full">
            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 shadow-2xs">
                <div className="flex items-center justify-between text-blue-700 text-xs font-bold uppercase">
                  <span>Total Orders</span>
                  <Package className="h-4 w-4" />
                </div>
                <div className="text-2xl font-black text-stone-900 mt-2">{stats.totalOrders || 0}</div>
                <div className="text-[11px] text-blue-600 mt-0.5">WhatsApp & Web Storefront</div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 shadow-2xs">
                <div className="flex items-center justify-between text-amber-700 text-xs font-bold uppercase">
                  <span>Pending Action</span>
                  <Clock className="h-4 w-4" />
                </div>
                <div className="text-2xl font-black text-stone-900 mt-2">{stats.pendingPayment || stats.pendingOrders || 0}</div>
                <div className="text-[11px] text-amber-600 mt-0.5">Awaiting confirmation</div>
              </div>
              <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-4 shadow-2xs">
                <div className="flex items-center justify-between text-purple-700 text-xs font-bold uppercase">
                  <span>New Orders</span>
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div className="text-2xl font-black text-stone-900 mt-2">{stats.newOrders || stats.confirmedOrders || 0}</div>
                <div className="text-[11px] text-purple-600 mt-0.5">Pending status</div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-2xs">
                <div className="flex items-center justify-between text-emerald-700 text-xs font-bold uppercase">
                  <span>Total Revenue</span>
                  {countryPack?.currency?.code === 'INR' ? (
                    <IndianRupee className="h-4 w-4" />
                  ) : (
                    <DollarSign className="h-4 w-4" />
                  )}
                </div>
                <div className="text-2xl font-black text-stone-900 mt-2">
                  {currencySymbol}
                  {(stats.totalRevenue || stats.revenue || 0).toLocaleString()}
                </div>
                <div className="text-[11px] text-emerald-600 mt-0.5">Completed & Paid</div>
              </div>
            </div>

            {/* Filter Bar & Table Header */}
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-base font-bold text-stone-900">Order Management Board</h2>
                  <p className="text-xs text-stone-500">Live stream of incoming customer orders</p>
                </div>

                {/* Status Filter Chips */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {['ALL', 'PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                        statusFilter === st
                          ? 'bg-stone-900 text-white shadow-xs'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Orders Table */}
              {loading ? (
                <div className="py-16 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-stone-400 mx-auto mb-2" />
                  <p className="text-xs text-stone-500">Loading orders...</p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-stone-200 rounded-xl bg-stone-50/50">
                  <Package className="h-10 w-10 text-stone-300 mx-auto mb-3" />
                  <h3 className="text-sm font-bold text-stone-700">No orders in this status</h3>
                  <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
                    When customers place orders via WhatsApp, the Storefront, or Dine-in QR, they will appear here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-stone-100">
                  <table className="w-full text-left text-xs text-stone-700">
                    <thead className="bg-stone-50 text-[11px] font-bold uppercase text-stone-500 border-b border-stone-200">
                      <tr>
                        <th className="py-3 px-4">Order ID</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Items</th>
                        <th className="py-3 px-4">Delivery / Table</th>
                        <th className="py-3 px-4">Total</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Payment</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {filteredOrders.map((o) => {
                        const items = Array.isArray(o.items) ? o.items : [];
                        return (
                          <tr key={o.id} className="hover:bg-stone-50/80 transition cursor-pointer" onClick={() => openOrderDetail(o.id)}>
                            <td className="py-3.5 px-4 font-mono font-bold text-stone-900">
                              #{o.id.slice(-6).toUpperCase()}
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-stone-900">{o.customerName || 'Customer'}</div>
                              <div className="text-[11px] text-stone-500 flex items-center gap-1">
                                <Phone className="h-3 w-3 text-stone-400" />
                                {o.customerPhone}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 max-w-xs">
                              <div className="truncate text-stone-800 font-medium">
                                {items.map((i: any) => `${i.name} × ${i.qty}`).join(', ') || 'Item'}
                              </div>
                              <div className="text-[10px] text-stone-400">{items.length} item(s)</div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-stone-800">
                                {o.deliveryAddress || (o.deliveryType === 'dine_in' ? 'Dine-In' : 'Takeout')}
                              </div>
                              {o.deliveryDate && <div className="text-[10px] text-stone-400">{o.deliveryDate}</div>}
                            </td>
                            <td className="py-3.5 px-4 font-black text-stone-900">
                              {currencySymbol}{Number(o.total || 0).toFixed(2)}
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                  o.status === 'CONFIRMED'
                                    ? 'bg-blue-100 text-blue-700'
                                    : o.status === 'PREPARING'
                                    ? 'bg-purple-100 text-purple-700'
                                    : o.status === 'READY'
                                    ? 'bg-cyan-100 text-cyan-700'
                                    : o.status === 'DELIVERED'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : o.status === 'CANCELLED'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}
                              >
                                {o.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`text-[11px] font-bold flex items-center gap-1 ${
                                  o.paymentStatus === 'PAID' ? 'text-emerald-600' : 'text-amber-600'
                                }`}
                              >
                                {o.paymentStatus === 'PAID' ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                                {o.paymentStatus}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-[11px] font-bold gap-1 text-stone-700 hover:text-stone-900 border-stone-200"
                                  onClick={() => handlePrintOrderKOT(o)}
                                  title="Print Kitchen Ticket (Thermal)"
                                >
                                  <Printer className="h-3 w-3 text-stone-500" />
                                  KOT
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-[11px] font-bold gap-1 text-emerald-800 hover:text-emerald-950 border-emerald-200 bg-emerald-50/50"
                                  onClick={() => handlePrintOrderBill(o)}
                                  title="Print Customer Bill (Thermal)"
                                >
                                  <Receipt className="h-3 w-3 text-emerald-600" />
                                  Bill
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs font-bold"
                                  onClick={() => openOrderDetail(o.id)}
                                >
                                  View
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================= TAB 2: PRODUCTS & MENU ======================= */}
        {activeTab === 'catalog' && (
          <div className="space-y-6 w-full">
            {/* Header & Actions Bar */}
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-stone-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-stone-900">Products & Catalog</h2>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-bold">
                      {catalog.length} Products
                    </Badge>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Sync with Shopify/WooCommerce or manage items for AI Agent, WhatsApp, and POS storefront
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSyncProvider('shopify');
                      setSyncModalOpen(true);
                    }}
                    className="border-stone-200 hover:bg-stone-50 text-stone-700 font-bold h-9 text-xs gap-1.5 shadow-2xs"
                  >
                    <Cloud className="h-3.5 w-3.5 text-blue-600" />
                    Sync Store / Import
                  </Button>

                  <Button
                    size="sm"
                    onClick={openAddProductModal}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-9 text-xs gap-1.5 shadow-2xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Product
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => saveSettings()}
                    disabled={savingSettings}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 text-xs gap-1.5 shadow-2xs"
                  >
                    {savingSettings ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save Catalog'}
                  </Button>
                </div>
              </div>

              {/* Tidio Lyro Style: 4 Product Data Sources Cards */}
              <div className="pt-4 border-t border-stone-100">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                    Product Listing &amp; Auto-Sync (Tidio &amp; Take.app Parity)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* WooCommerce Sync */}
                  <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-3.5 flex flex-col justify-between hover:border-purple-300 transition">
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-purple-900">
                          <ShoppingCart className="h-4 w-4 text-purple-600" />
                          WooCommerce
                        </div>
                        <Badge variant="outline" className="text-[9px] bg-purple-100 text-purple-700 border-purple-200 font-bold">
                          Auto-Sync
                        </Badge>
                      </div>
                      <p className="text-[11px] text-purple-700 mt-1.5 leading-snug">
                        Sync WooCommerce product database so your AI Agent answers stock &amp; pricing questions.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSyncProvider('woocommerce');
                        setSyncModalOpen(true);
                      }}
                      className="mt-3 w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-7 gap-1"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Connect WooCommerce
                    </Button>
                  </div>

                  {/* Shopify Sync */}
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 flex flex-col justify-between hover:border-emerald-300 transition">
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-900">
                          <Store className="h-4 w-4 text-emerald-600" />
                          Shopify
                        </div>
                        <Badge variant="outline" className="text-[9px] bg-emerald-100 text-emerald-700 border-emerald-200 font-bold">
                          Auto-Sync
                        </Badge>
                      </div>
                      <p className="text-[11px] text-emerald-700 mt-1.5 leading-snug">
                        Import Shopify product catalog, images, variants &amp; stock into AI chat and storefront.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSyncProvider('shopify');
                        setSyncModalOpen(true);
                      }}
                      className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-7 gap-1"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Connect Shopify
                    </Button>
                  </div>

                  {/* CSV Feed Upload */}
                  <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3.5 flex flex-col justify-between hover:border-blue-300 transition">
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-blue-900">
                          <Upload className="h-4 w-4 text-blue-600" />
                          Product Feed (CSV)
                        </div>
                        <Badge variant="outline" className="text-[9px] bg-blue-100 text-blue-700 border-blue-200 font-bold">
                          Bulk Upload
                        </Badge>
                      </div>
                      <p className="text-[11px] text-blue-700 mt-1.5 leading-snug">
                        Import entire catalog at once via CSV or Google Merchant Center feed for large inventories.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setSyncProvider('csv');
                        setSyncModalOpen(true);
                      }}
                      className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-7 gap-1"
                    >
                      <Upload className="h-3 w-3" />
                      Import CSV File
                    </Button>
                  </div>

                  {/* Add Manually */}
                  <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-3.5 flex flex-col justify-between hover:border-stone-300 transition">
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-stone-900">
                          <Plus className="h-4 w-4 text-stone-700" />
                          Add Manually
                        </div>
                        <Badge variant="outline" className="text-[9px] bg-stone-100 text-stone-600 border-stone-200 font-bold">
                          Custom
                        </Badge>
                      </div>
                      <p className="text-[11px] text-stone-600 mt-1.5 leading-snug">
                        Add items 1-by-1 with custom pictures, prices, categories, and stock availability.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={openAddProductModal}
                      variant="outline"
                      className="mt-3 w-full border-stone-300 hover:bg-white text-stone-800 font-bold text-xs h-7 gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Add Product Listing
                    </Button>
                  </div>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                  <Input
                    placeholder="Search by product name, SKU or description..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-9 h-9 text-xs bg-stone-50/60 border-stone-200"
                  />
                  {productSearch && (
                    <button
                      type="button"
                      onClick={() => setProductSearch('')}
                      className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Category Pills */}
                {productCategories.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                    {productCategories.map((cat) => {
                      const isActive = productCategory.toLowerCase() === cat.toLowerCase();
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setProductCategory(cat)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
                            isActive
                              ? 'bg-stone-900 text-white shadow-2xs'
                              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Products List / Table */}
              <div className="mt-5">
                {catalog.length === 0 ? (
                  <div className="py-16 text-center border-2 border-dashed border-stone-200 rounded-2xl bg-stone-50/50">
                    <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                      <ShoppingCart className="h-6 w-6" />
                    </div>
                    <h3 className="text-base font-bold text-stone-800">No products in your catalog</h3>
                    <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-5">
                      Add products individually, import a CSV list, or connect Shopify / WooCommerce to auto-sync.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <Button
                        size="sm"
                        onClick={openAddProductModal}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add First Product
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSyncProvider('shopify');
                          setSyncModalOpen(true);
                        }}
                        className="font-bold text-xs gap-1.5"
                      >
                        <Cloud className="h-3.5 w-3.5 text-blue-600" />
                        Connect Store
                      </Button>
                    </div>
                  </div>
                ) : filteredCatalog.length === 0 ? (
                  <div className="py-12 text-center border border-dashed border-stone-200 rounded-xl bg-stone-50">
                    <Search className="h-6 w-6 text-stone-300 mx-auto mb-2" />
                    <h4 className="text-xs font-bold text-stone-600">No matching products found</h4>
                    <p className="text-[11px] text-stone-400 mt-1">Try clearing your search query or filters.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-stone-100 rounded-xl border border-stone-200 overflow-hidden bg-white shadow-2xs">
                    {filteredCatalog.map((product) => {
                      const inStock = product.isActive !== false;
                      return (
                        <div
                          key={product.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 hover:bg-stone-50/70 transition"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Product Thumbnail */}
                            <div className="h-14 w-14 rounded-xl border border-stone-200 bg-stone-100 shrink-0 overflow-hidden relative flex items-center justify-center">
                              {product.imageUrl ? (
                                <img
                                  src={product.imageUrl}
                                  alt={product.name}
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <Package className="h-6 w-6 text-stone-400" />
                              )}
                              {product.source && product.source !== 'manual' && (
                                <span className="absolute bottom-0 inset-x-0 bg-stone-900/80 text-[8px] font-black text-white text-center py-0.5 uppercase tracking-wider">
                                  {product.source === 'shopify'
                                    ? 'Shopify'
                                    : product.source === 'woocommerce'
                                    ? 'Woo'
                                    : 'CSV'}
                                </span>
                              )}
                            </div>

                            {/* Details */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-stone-900 truncate">
                                  {product.name}
                                </h4>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] font-bold bg-stone-100 text-stone-700 shrink-0"
                                >
                                  {product.category || 'General'}
                                </Badge>
                              </div>

                              <div className="flex items-center gap-3 mt-1 text-xs text-stone-500">
                                <span className="font-extrabold text-emerald-700">
                                  {currencySymbol}
                                  {Number(product.price || 0).toFixed(2)}
                                </span>
                                {product.sku && (
                                  <span className="font-mono text-[10px] text-stone-400">
                                    SKU: {product.sku}
                                  </span>
                                )}
                              </div>

                              {product.description && (
                                <p className="text-[11px] text-stone-500 line-clamp-1 mt-1">
                                  {product.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Right Controls */}
                          <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                            {/* Stock Toggle */}
                            <button
                              type="button"
                              onClick={() => toggleProductStock(product.id)}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition border ${
                                inStock
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  inStock ? 'bg-emerald-500' : 'bg-rose-500'
                                }`}
                              />
                              {inStock ? 'In Stock' : 'Out of Stock'}
                            </button>

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => openEditProductModal(product)}
                              className="p-2 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
                              title="Edit product"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => removeProduct(product.id, product.name)}
                              className="p-2 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition"
                              title="Delete product"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================= TAB 3: POS CASHIER REGISTER ======================= */}
        {activeTab === 'pos' && (
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Product Picker Grid */}
            <div className="lg:col-span-7 space-y-4">
              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-base font-bold text-stone-900">Walk-In Menu Items</h3>
                    <p className="text-[11px] text-stone-500">Tap items or scan barcode to add to cart</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 text-[10px] font-bold">
                      ⚡ Hardware Wedge Scanner Ready
                    </Badge>
                  </div>
                </div>

                {/* Search Bar + Camera Scanner Trigger */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="relative flex-1">
                    <Search className="h-4 w-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      value={posSearch}
                      onChange={(e) => setPosSearch(e.target.value)}
                      placeholder="Search items by name, SKU, or barcode..."
                      className="pl-9 text-xs h-9"
                    />
                    {posSearch && (
                      <button
                        type="button"
                        onClick={() => setPosSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={startCameraScanner}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 gap-1.5 shrink-0"
                  >
                    <Camera className="h-4 w-4" />
                    Scan Barcode
                  </Button>
                </div>

                {/* Category Filter Pills */}
                {Array.from(new Set(catalog.map((c: any) => c.category || 'General'))).length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-3 no-scrollbar">
                    {['ALL', ...Array.from(new Set(catalog.map((c: any) => c.category || 'General')))].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setPosCategory(cat)}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition whitespace-nowrap ${
                          posCategory === cat
                            ? 'bg-stone-900 text-white shadow-2xs'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}

                {/* Items Grid */}
                {catalog.filter((item: any) => {
                  const matchCat = posCategory === 'ALL' || (item.category || 'General') === posCategory;
                  const q = posSearch.toLowerCase();
                  const matchSearch =
                    !posSearch ||
                    item.name?.toLowerCase().includes(q) ||
                    (item.sku && item.sku.toLowerCase().includes(q)) ||
                    (item.barcode && item.barcode.toLowerCase().includes(q)) ||
                    item.id?.toLowerCase().includes(q);
                  return matchCat && matchSearch;
                }).length === 0 ? (
                  <div className="py-12 text-center text-xs text-stone-400 border border-dashed border-stone-200 rounded-xl">
                    <Search className="h-8 w-8 text-stone-300 mx-auto mb-2" />
                    <p className="font-bold text-stone-600">No matching items found</p>
                    <p className="mt-0.5 text-stone-400">Try a different search term or scan item barcode</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {catalog
                      .filter((item: any) => {
                        const matchCat = posCategory === 'ALL' || (item.category || 'General') === posCategory;
                        const q = posSearch.toLowerCase();
                        const matchSearch =
                          !posSearch ||
                          item.name?.toLowerCase().includes(q) ||
                          (item.sku && item.sku.toLowerCase().includes(q)) ||
                          (item.barcode && item.barcode.toLowerCase().includes(q)) ||
                          item.id?.toLowerCase().includes(q);
                        return matchCat && matchSearch;
                      })
                      .map((item) => {
                        const inCart = posCart.find((c) => c.id === item.id);
                        const qty = inCart ? inCart.qty : 0;
                        return (
                          <div
                            key={item.id}
                            className={`flex flex-col justify-between p-3 rounded-xl border transition text-left relative ${
                              qty > 0
                                ? 'border-emerald-500 bg-emerald-50/50 shadow-2xs'
                                : 'border-stone-200 bg-stone-50 hover:bg-emerald-50/30 hover:border-emerald-300'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => addToPosCart(item)}
                              className="w-full text-left cursor-pointer"
                            >
                              <div className="flex items-start justify-between gap-1">
                                <span className="text-xs font-bold text-stone-900 line-clamp-1">
                                  {item.name}
                                </span>
                                {qty > 0 && (
                                  <Badge className="bg-emerald-600 text-white font-black text-[9px] px-1.5 py-0 shrink-0">
                                    {qty}
                                  </Badge>
                                )}
                              </div>
                              <span className="text-[10px] text-stone-400 mt-0.5 block">{item.category || 'General'}</span>
                              <span className="mt-1.5 text-sm font-black text-stone-900 block">
                                {currencySymbol}{item.price}
                              </span>
                            </button>

                            {qty > 0 && (
                              <div className="flex items-center justify-between w-full mt-2 pt-1.5 border-t border-emerald-200">
                                <button
                                  type="button"
                                  onClick={() => updatePosQty(item.id, -1)}
                                  className="w-6 h-6 rounded-md bg-white border border-stone-200 text-stone-700 font-black flex items-center justify-center hover:bg-stone-100 active:scale-90 text-xs shadow-2xs cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="text-xs font-black text-emerald-800">{qty}</span>
                                <button
                                  type="button"
                                  onClick={() => addToPosCart(item)}
                                  className="w-6 h-6 rounded-md bg-emerald-600 text-white font-black flex items-center justify-center hover:bg-emerald-700 active:scale-90 text-xs shadow-2xs cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Cashier Register & Checkout */}
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs flex flex-col h-full">
                <h3 className="text-base font-bold text-stone-900 mb-3 flex items-center justify-between">
                  <span>Current Register Bill</span>
                  <span className="text-xs font-semibold text-stone-500">{posCart.length} items</span>
                </h3>

                {/* Cart Items List */}
                <div className="flex-1 max-h-60 overflow-y-auto space-y-2 border-y border-stone-100 py-3 mb-3">
                  {posCart.length === 0 ? (
                    <div className="py-8 text-center text-xs text-stone-400">Cart is empty. Tap items on the left to add.</div>
                  ) : (
                    posCart.map((it) => (
                      <div key={it.id} className="flex items-center justify-between text-xs py-1">
                        <div className="flex-1 pr-2">
                          <div className="font-bold text-stone-800">{it.name}</div>
                          <div className="text-[10px] text-stone-400">{currencySymbol}{it.price} each</div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => updatePosQty(it.id, -1)}
                            className="w-5 h-5 rounded bg-stone-100 text-stone-600 font-bold flex items-center justify-center hover:bg-stone-200"
                          >
                            -
                          </button>
                          <span className="font-bold px-1">{it.qty}</span>
                          <button
                            type="button"
                            onClick={() => updatePosQty(it.id, 1)}
                            className="w-5 h-5 rounded bg-stone-100 text-stone-600 font-bold flex items-center justify-center hover:bg-stone-200"
                          >
                            +
                          </button>
                        </div>
                        <div className="w-16 text-right font-black text-stone-900">
                          {currencySymbol}{(it.price * it.qty).toFixed(2)}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Walk-in Customer Fields */}
                <div className="space-y-2.5 text-xs mb-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-stone-500 uppercase">Order Type</label>
                      <select
                        value={posOrderType}
                        onChange={(e) => setPosOrderType(e.target.value as any)}
                        className="w-full mt-1 rounded-lg border border-stone-200 p-1.5 text-xs font-bold"
                      >
                        <option value="DINE_IN">🪑 Dine-In</option>
                        <option value="TAKEOUT">🛍️ Takeout</option>
                        <option value="DELIVERY">🚚 Delivery</option>
                      </select>
                    </div>
                    {posOrderType === 'DINE_IN' && (
                      <div>
                        <label className="text-[10px] font-bold text-stone-500 uppercase">Table #</label>
                        <Input
                          placeholder="e.g. 4"
                          value={posTableNumber}
                          onChange={(e) => setPosTableNumber(e.target.value)}
                          className="h-8 text-xs font-bold mt-1"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Customer Name (Optional)"
                      value={posCustomerName}
                      onChange={(e) => setPosCustomerName(e.target.value)}
                      className="h-8 text-xs"
                    />
                    <Input
                      placeholder="Phone (Optional)"
                      value={posCustomerPhone}
                      onChange={(e) => setPosCustomerPhone(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>

                  {/* Payment Method Selector */}
                  <div>
                    <label className="text-[10px] font-bold text-stone-500 uppercase">Payment Method</label>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {(['CASH', 'CARD', 'UPI'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setPosPaymentMethod(m)}
                          className={`py-1.5 rounded-lg text-xs font-bold transition border ${
                            posPaymentMethod === m
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Total & Checkout Button */}
                <div className="pt-2 border-t border-stone-200">
                  {(() => {
                    const posSubtotal = posCart.reduce((sum, it) => sum + it.price * it.qty, 0);
                    const posTax = taxRate > 0 ? (posSubtotal * Number(taxRate)) / 100 : 0;
                    const posServiceCharge = serviceChargeRate > 0 ? (posSubtotal * Number(serviceChargeRate)) / 100 : 0;
                    const posGrandTotal = posSubtotal + posTax + posServiceCharge;
                    return (
                      <div className="space-y-1 mb-3">
                        {taxRate > 0 && (
                          <div className="flex justify-between text-[11px] text-stone-500">
                            <span>Subtotal</span>
                            <span>{currencySymbol}{posSubtotal.toFixed(2)}</span>
                          </div>
                        )}
                        {taxRate > 0 && (
                          <div className="flex justify-between text-[11px] text-stone-500">
                            <span>{taxName || 'Tax'} ({taxRate}%)</span>
                            <span>+{currencySymbol}{posTax.toFixed(2)}</span>
                          </div>
                        )}
                        {serviceChargeRate > 0 && (
                          <div className="flex justify-between text-[11px] text-stone-500">
                            <span>Service Charge ({serviceChargeRate}%)</span>
                            <span>+{currencySymbol}{posServiceCharge.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center pt-1 border-t border-stone-100">
                          <span className="text-sm font-bold text-stone-700">Total Payable</span>
                          <span className="text-xl font-black text-stone-900">
                            {currencySymbol}{posGrandTotal.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                  <Button
                    onClick={submitPosOrder}
                    disabled={posSubmitting || posCart.length === 0}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 gap-2"
                  >
                    {posSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Complete & Print Receipt
                  </Button>
                </div>
              </div>
            </div>

            {/* ── MOBILE STICKY CHECKOUT BAR (One-Handed POS) ── */}
            {posCart.length > 0 && (
              <div className="fixed bottom-16 left-0 right-0 z-30 lg:hidden px-4 py-3 bg-stone-900/95 backdrop-blur-md text-white border-t border-stone-800 shadow-2xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom duration-200">
                <div className="min-w-0">
                  <div className="text-[11px] text-stone-400 font-medium">
                    {posCart.reduce((sum, it) => sum + it.qty, 0)} items in cart
                  </div>
                  <div className="text-base font-black text-white truncate">
                    {currencySymbol}
                    {(() => {
                      const sub = posCart.reduce((s, it) => s + it.price * it.qty, 0);
                      const tx = taxRate > 0 ? (sub * Number(taxRate)) / 100 : 0;
                      const sc = serviceChargeRate > 0 ? (sub * Number(serviceChargeRate)) / 100 : 0;
                      return (sub + tx + sc).toFixed(2);
                    })()}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => setPosMobileCheckoutOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs h-9 px-4 rounded-xl shadow-md gap-1.5 cursor-pointer"
                  >
                    <span>Checkout</span>
                    <ArrowRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── MOBILE CHECKOUT SLIDE-UP DRAWER ── */}
            {posMobileCheckoutOpen && (
              <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
                <div
                  className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
                  onClick={() => setPosMobileCheckoutOpen(false)}
                />
                <div className="relative z-10 w-full max-h-[90vh] rounded-t-3xl bg-white p-5 pb-8 shadow-2xl overflow-y-auto animate-in slide-in-from-bottom duration-200 space-y-4">
                  <div className="w-12 h-1.5 bg-stone-300 rounded-full mx-auto" />

                  <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                    <div>
                      <h3 className="text-base font-black text-stone-900">Current Register Bill</h3>
                      <p className="text-[11px] text-stone-500">
                        {posCart.reduce((s, it) => s + it.qty, 0)} items • 1-Handed Quick Pay
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPosMobileCheckoutOpen(false)}
                      className="size-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:text-stone-900 cursor-pointer"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  {/* Cart Items List */}
                  <div className="max-h-48 overflow-y-auto space-y-2 py-1 border-b border-stone-100">
                    {posCart.map((it) => (
                      <div key={it.id} className="flex items-center justify-between text-xs py-1">
                        <div className="flex-1 pr-2">
                          <div className="font-bold text-stone-800">{it.name}</div>
                          <div className="text-[10px] text-stone-400">{currencySymbol}{it.price} each</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updatePosQty(it.id, -1)}
                            className="w-6 h-6 rounded-md bg-stone-100 text-stone-700 font-black flex items-center justify-center hover:bg-stone-200 cursor-pointer text-xs"
                          >
                            -
                          </button>
                          <span className="font-bold px-1 text-xs">{it.qty}</span>
                          <button
                            type="button"
                            onClick={() => updatePosQty(it.id, 1)}
                            className="w-6 h-6 rounded-md bg-emerald-600 text-white font-black flex items-center justify-center hover:bg-emerald-700 cursor-pointer text-xs"
                          >
                            +
                          </button>
                          <span className="w-14 text-right font-black text-stone-900 text-xs">
                            {currencySymbol}{(it.price * it.qty).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Order Type & Details */}
                  <div className="space-y-2.5 text-xs">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-stone-500 uppercase">Order Type</label>
                        <select
                          value={posOrderType}
                          onChange={(e) => setPosOrderType(e.target.value as any)}
                          className="w-full mt-1 rounded-lg border border-stone-200 p-2 text-xs font-bold bg-stone-50"
                        >
                          <option value="DINE_IN">🪑 Dine-In</option>
                          <option value="TAKEOUT">🛍️ Takeout</option>
                          <option value="DELIVERY">🚚 Delivery</option>
                        </select>
                      </div>
                      {posOrderType === 'DINE_IN' && (
                        <div>
                          <label className="text-[10px] font-bold text-stone-500 uppercase">Table #</label>
                          <Input
                            placeholder="e.g. 4"
                            value={posTableNumber}
                            onChange={(e) => setPosTableNumber(e.target.value)}
                            className="h-9 text-xs font-bold mt-1 bg-stone-50"
                          />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Guest Name (Optional)"
                        value={posCustomerName}
                        onChange={(e) => setPosCustomerName(e.target.value)}
                        className="h-9 text-xs bg-stone-50"
                      />
                      <Input
                        placeholder="Phone (Optional)"
                        value={posCustomerPhone}
                        onChange={(e) => setPosCustomerPhone(e.target.value)}
                        className="h-9 text-xs bg-stone-50"
                      />
                    </div>

                    {/* Payment Method Selector */}
                    <div>
                      <label className="text-[10px] font-bold text-stone-500 uppercase">Payment Method</label>
                      <div className="grid grid-cols-3 gap-2 mt-1">
                        {(['CASH', 'UPI', 'CARD'] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setPosPaymentMethod(m)}
                            className={`py-2 rounded-xl text-xs font-black transition border cursor-pointer ${
                              posPaymentMethod === m
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                            }`}
                          >
                            {m === 'CASH' && '💵 Cash'}
                            {m === 'UPI' && '⚡ UPI / QR'}
                            {m === 'CARD' && '💳 Card'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Total & Complete Button */}
                  <div className="pt-2 border-t border-stone-200 space-y-3">
                    {(() => {
                      const posSubtotal = posCart.reduce((sum, it) => sum + it.price * it.qty, 0);
                      const posTax = taxRate > 0 ? (posSubtotal * Number(taxRate)) / 100 : 0;
                      const posServiceCharge = serviceChargeRate > 0 ? (posSubtotal * Number(serviceChargeRate)) / 100 : 0;
                      const posGrandTotal = posSubtotal + posTax + posServiceCharge;
                      return (
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-xs text-stone-500 font-semibold block">Total Payable</span>
                            <span className="text-[10px] text-stone-400">Includes taxes &amp; fees</span>
                          </div>
                          <span className="text-2xl font-black text-stone-900">
                            {currencySymbol}{posGrandTotal.toFixed(2)}
                          </span>
                        </div>
                      );
                    })()}

                    <Button
                      onClick={submitPosOrder}
                      disabled={posSubmitting || posCart.length === 0}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black h-12 rounded-xl text-sm gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer"
                    >
                      {posSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
                      <span>Complete &amp; Print Bill</span>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================= TAB 4: DINE-IN TABLE MANAGEMENT & QR ======================= */}
        {activeTab === 'dineIn' && (
          <div className="w-full space-y-6">
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-stone-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-stone-900">Dine-In Table QR Stands</h2>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs font-bold">
                      {tables.length} Tables Active
                    </Badge>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Generate printable QR tent cards for your restaurant tables (Take.app format)
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setBatchPrintModalOpen(true)}
                    className="border-stone-200 hover:bg-stone-50 text-stone-700 font-bold h-9 text-xs gap-1.5 shadow-2xs"
                  >
                    <Printer className="h-3.5 w-3.5 text-blue-600" />
                    Print All Stand Cards (Batch)
                  </Button>

                  <Button
                    size="sm"
                    onClick={handleOpenAddTable}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold h-9 text-xs gap-1.5 shadow-2xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Table
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-3 my-4 p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-800">
                <UtensilsCrossed className="h-5 w-5 text-amber-600 shrink-0" />
                <span>
                  <strong>How it works:</strong> Guests scan the QR stand at their table → your digital menu opens with the table number tagged → orders flow directly to your kitchen KOT and live orders board!
                </span>
              </div>

              {/* Tables Grid & Active Selection */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
                {/* Left: Table Cards Grid */}
                <div className="lg:col-span-7 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase text-stone-400 tracking-wider">
                      Tables &amp; Dining Areas ({tables.length})
                    </h3>
                    <span className="text-[11px] text-stone-500">Tap table to preview stand</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {tables.map((tbl) => {
                      const isSelected = selectedTableForQr === tbl.name;
                      const tableUrl = `${publicStoreUrl}?table=${encodeURIComponent(tbl.name)}`;
                      return (
                        <div
                          key={tbl.id}
                          onClick={() => setSelectedTableForQr(tbl.name)}
                          className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'border-stone-900 bg-stone-900 text-white shadow-md'
                              : 'border-stone-200 bg-white hover:border-stone-400 hover:bg-stone-50/70 text-stone-900'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-sm">{tbl.name}</span>
                                <span
                                  className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
                                    isSelected
                                      ? 'bg-white/20 text-white'
                                      : 'bg-stone-100 text-stone-600'
                                  }`}
                                >
                                  {tbl.section || 'Main'}
                                </span>
                              </div>
                              <span
                                className={`text-[11px] mt-0.5 block ${
                                  isSelected ? 'text-stone-300' : 'text-stone-500'
                                }`}
                              >
                                {tbl.capacity || 4} Seats · Ready for Orders
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditTable(tbl);
                                }}
                                className={`p-1.5 rounded-lg transition ${
                                  isSelected
                                    ? 'hover:bg-white/20 text-white'
                                    : 'hover:bg-stone-100 text-stone-400 hover:text-stone-700'
                                }`}
                                title="Edit Table"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteTable(tbl.id, tbl.name);
                                }}
                                className={`p-1.5 rounded-lg transition ${
                                  isSelected
                                    ? 'hover:bg-white/20 text-red-300'
                                    : 'hover:bg-red-50 text-stone-400 hover:text-red-600'
                                }`}
                                title="Remove Table"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                            <span className={isSelected ? 'text-stone-300 font-mono' : 'text-stone-400 font-mono'}>
                              ?table={encodeURIComponent(tbl.name)}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(tableUrl);
                                toast.success(`Copied link for ${tbl.name}!`);
                              }}
                              className={`flex items-center gap-1 font-bold ${
                                isSelected ? 'text-emerald-300 hover:underline' : 'text-emerald-600 hover:underline'
                              }`}
                            >
                              <Share2 className="h-3 w-3" />
                              Copy Link
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right: Live Stand Card Preview */}
                <div className="lg:col-span-5 flex flex-col items-center">
                  <div className="w-full max-w-xs bg-white rounded-3xl p-6 shadow-xl border-2 border-stone-800 text-center flex flex-col items-center">
                    <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">
                      Scan to Order
                    </div>
                    <h3 className="text-base font-black text-stone-900 line-clamp-1">
                      {auth?.tenant?.name || 'Restaurant Table'}
                    </h3>
                    <div className="inline-flex items-center gap-1.5 bg-stone-900 text-white rounded-full px-3 py-1 text-xs font-bold my-2 shadow-xs">
                      <UtensilsCrossed className="h-3 w-3" />
                      {selectedTableForQr}
                    </div>

                    {/* QR Code Container */}
                    <div className="w-48 h-48 my-3 bg-white p-2 border-2 border-stone-200 rounded-2xl flex items-center justify-center shadow-inner">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                          `${publicStoreUrl}?table=${encodeURIComponent(selectedTableForQr)}`
                        )}`}
                        alt={`${selectedTableForQr} QR`}
                        className="w-full h-full object-contain rounded-lg"
                      />
                    </div>

                    <p className="text-xs text-stone-600 font-semibold px-2">
                      Point phone camera to browse digital menu &amp; order
                    </p>
                    <div className="mt-2 text-[10px] font-mono text-stone-400 truncate max-w-full">
                      {publicStoreUrl}?table={encodeURIComponent(selectedTableForQr)}
                    </div>

                    <div className="mt-4 flex items-center gap-2 w-full">
                      <Button
                        size="sm"
                        onClick={() => window.print()}
                        className="flex-1 bg-stone-900 hover:bg-black text-white text-xs font-bold gap-1.5 h-8"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        Print Stand
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const url = `${publicStoreUrl}?table=${encodeURIComponent(selectedTableForQr)}`;
                          navigator.clipboard.writeText(url);
                          toast.success('Table link copied!');
                        }}
                        className="text-xs font-bold h-8"
                      >
                        <Share2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================= TAB: KITCHEN DISPLAY SYSTEM (KDS KANBAN) ======================= */}
        {activeTab === 'kds' && (
          <div className="space-y-6 w-full">
            {/* KDS Header & Quick Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center">
                    <ChefHat className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-stone-900">
                      Kitchen Display System (KDS Kanban)
                    </h2>
                    <p className="text-xs text-stone-500">
                      Live touch Kanban for kitchen cooks, roadside cart chefs &amp; counter staff. Tap to advance orders.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Type Filter */}
                <div className="flex items-center bg-stone-100 p-0.5 rounded-lg border border-stone-200 text-xs font-bold">
                  {(['ALL', 'DINE_IN', 'TAKEOUT', 'DELIVERY'] as const).map((filterVal) => (
                    <button
                      key={filterVal}
                      type="button"
                      onClick={() => setKdsTypeFilter(filterVal)}
                      className={`px-2.5 py-1 rounded-md transition ${
                        kdsTypeFilter === filterVal
                          ? 'bg-white text-stone-900 shadow-2xs'
                          : 'text-stone-500 hover:text-stone-900'
                      }`}
                    >
                      {filterVal === 'ALL' && 'All Types'}
                      {filterVal === 'DINE_IN' && '🪑 Dine-In'}
                      {filterVal === 'TAKEOUT' && '🛍️ Takeout / Cart'}
                      {filterVal === 'DELIVERY' && '🚚 Delivery'}
                    </button>
                  ))}
                </div>

                {/* Sound Chime Test */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    try {
                      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
                      if (!AudioCtx) return;
                      const ctx = new AudioCtx();
                      const osc = ctx.createOscillator();
                      const gain = ctx.createGain();
                      osc.type = 'sine';
                      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
                      gain.gain.setValueAtTime(0.3, ctx.currentTime);
                      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
                      osc.connect(gain);
                      gain.connect(ctx.destination);
                      osc.start(ctx.currentTime);
                      osc.stop(ctx.currentTime + 0.4);
                      toast.success('Kitchen alert chime played!');
                    } catch {}
                  }}
                  className="text-xs font-bold gap-1.5 h-8 border-stone-200"
                >
                  <Volume2 className="h-3.5 w-3.5 text-stone-600" />
                  Test Bell
                </Button>
              </div>
            </div>

            {/* KDS 3-Column Kanban Board */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
              {/* Column 1: NEW / QUEUED */}
              {(() => {
                const queuedOrders = orders
                  .filter((o) => o.status === 'PENDING' || o.status === 'CONFIRMED')
                  .filter((o) => {
                    if (kdsTypeFilter === 'ALL') return true;
                    if (kdsTypeFilter === 'DINE_IN') return o.deliveryType === 'dine_in' || o.deliveryAddress?.includes('Table #');
                    if (kdsTypeFilter === 'TAKEOUT') return o.deliveryType === 'takeout';
                    if (kdsTypeFilter === 'DELIVERY') return o.deliveryType === 'delivery';
                    return true;
                  });

                return (
                  <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/40 p-4 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-amber-200">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
                        <h3 className="text-xs font-black uppercase tracking-wider text-amber-950">
                          1. New &amp; Queued
                        </h3>
                      </div>
                      <Badge className="bg-amber-500 text-white font-bold text-xs">
                        {queuedOrders.length}
                      </Badge>
                    </div>

                    {queuedOrders.length === 0 ? (
                      <div className="py-12 text-center text-xs text-amber-800/60 font-semibold">
                        No orders waiting in queue.
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-1">
                        {queuedOrders.map((o) => {
                          const orderItems = Array.isArray(o.items) ? o.items : [];
                          const elapsedMins = Math.max(1, Math.round((Date.now() - new Date(o.createdAt).getTime()) / 60000));
                          const isTable = o.deliveryType === 'dine_in' || o.deliveryAddress?.includes('Table #');

                          return (
                            <div
                              key={o.id}
                              className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs space-y-3"
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <span className="text-base font-black text-stone-900 font-mono">
                                    #{o.id.slice(-6).toUpperCase()}
                                  </span>
                                  <div className="text-[11px] text-stone-500 mt-0.5">
                                    {o.customerName || 'Guest'} {o.customerPhone ? `(${o.customerPhone})` : ''}
                                  </div>
                                </div>
                                <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> {elapsedMins}m ago
                                </span>
                              </div>

                              {/* Order Type & Timing Badge */}
                              <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
                                {isTable ? (
                                  <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md flex items-center gap-1">
                                    <UtensilsCrossed className="h-3 w-3" />
                                    {o.deliveryAddress || 'Dine-In Table'}
                                  </span>
                                ) : o.deliveryType === 'takeout' ? (
                                  <span className="bg-blue-100 text-blue-900 px-2 py-0.5 rounded-md">
                                    🛍️ Stall Takeout
                                  </span>
                                ) : (
                                  <span className="bg-purple-100 text-purple-900 px-2 py-0.5 rounded-md">
                                    🚚 Delivery
                                  </span>
                                )}

                                {o.deliveryDate && o.deliveryDate !== 'Immediate (Now)' && (
                                  <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-md flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {o.deliveryDate}
                                  </span>
                                )}
                              </div>

                              {/* Items List */}
                              <div className="py-2 border-y border-dashed border-stone-200 space-y-1.5">
                                {orderItems.map((it: any, idx: number) => (
                                  <div key={idx} className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-stone-900">
                                      <span className="text-amber-700 mr-1.5 font-black">{it.qty}×</span>
                                      {it.name}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              {o.notes && (
                                <div className="text-[10px] bg-stone-50 p-2 rounded-lg text-stone-600 border border-stone-200/60">
                                  <span className="font-bold text-stone-700 block">Notes:</span>
                                  {o.notes}
                                </div>
                              )}

                              {/* Action Buttons */}
                              <div className="flex items-center gap-2 pt-1">
                                <Button
                                  size="sm"
                                  onClick={() => updateOrderStatus(o.id, 'PREPARING')}
                                  disabled={updatingOrder}
                                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-8 gap-1.5"
                                >
                                  <Flame className="h-3.5 w-3.5" />
                                  Start Cooking
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openReceiptModal(o, 'KOT')}
                                  className="text-xs font-bold h-8 px-2 border-stone-200"
                                >
                                  KOT
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Column 2: COOKING / PREPARING */}
              {(() => {
                const preparingOrders = orders
                  .filter((o) => o.status === 'PREPARING')
                  .filter((o) => {
                    if (kdsTypeFilter === 'ALL') return true;
                    if (kdsTypeFilter === 'DINE_IN') return o.deliveryType === 'dine_in' || o.deliveryAddress?.includes('Table #');
                    if (kdsTypeFilter === 'TAKEOUT') return o.deliveryType === 'takeout';
                    if (kdsTypeFilter === 'DELIVERY') return o.deliveryType === 'delivery';
                    return true;
                  });

                return (
                  <div className="rounded-2xl border-2 border-blue-300 bg-blue-50/40 p-4 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-blue-200">
                      <div className="flex items-center gap-1.5">
                        <Flame className="h-4 w-4 text-blue-600 animate-bounce" />
                        <h3 className="text-xs font-black uppercase tracking-wider text-blue-950">
                          2. Cooking / Preparing
                        </h3>
                      </div>
                      <Badge className="bg-blue-600 text-white font-bold text-xs">
                        {preparingOrders.length}
                      </Badge>
                    </div>

                    {preparingOrders.length === 0 ? (
                      <div className="py-12 text-center text-xs text-blue-800/60 font-semibold">
                        No orders currently cooking on the grill/station.
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-1">
                        {preparingOrders.map((o) => {
                          const orderItems = Array.isArray(o.items) ? o.items : [];
                          const elapsedMins = Math.max(1, Math.round((Date.now() - new Date(o.createdAt).getTime()) / 60000));
                          const isTable = o.deliveryType === 'dine_in' || o.deliveryAddress?.includes('Table #');

                          return (
                            <div
                              key={o.id}
                              className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs space-y-3"
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <span className="text-base font-black text-stone-900 font-mono">
                                    #{o.id.slice(-6).toUpperCase()}
                                  </span>
                                  <div className="text-[11px] text-stone-500 mt-0.5">
                                    {o.customerName || 'Guest'} {o.customerPhone ? `(${o.customerPhone})` : ''}
                                  </div>
                                </div>
                                <span className="text-[11px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <Flame className="h-3 w-3 text-orange-600" /> Prep {elapsedMins}m
                                </span>
                              </div>

                              <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
                                {isTable ? (
                                  <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md flex items-center gap-1">
                                    <UtensilsCrossed className="h-3 w-3" />
                                    {o.deliveryAddress || 'Dine-In Table'}
                                  </span>
                                ) : (
                                  <span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md">
                                    {o.deliveryType === 'takeout' ? '🛍️ Stall Takeout' : '🚚 Delivery'}
                                  </span>
                                )}
                              </div>

                              <div className="py-2 border-y border-dashed border-stone-200 space-y-1.5">
                                {orderItems.map((it: any, idx: number) => (
                                  <div key={idx} className="flex justify-between items-center text-xs">
                                    <span className="font-bold text-stone-900">
                                      <span className="text-blue-700 mr-1.5 font-black">{it.qty}×</span>
                                      {it.name}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              {o.notes && (
                                <div className="text-[10px] bg-stone-50 p-2 rounded-lg text-stone-600 border border-stone-200/60">
                                  <span className="font-bold text-stone-700 block">Notes:</span>
                                  {o.notes}
                                </div>
                              )}

                              <div className="flex items-center gap-2 pt-1">
                                <Button
                                  size="sm"
                                  onClick={() => markReadyAndAlertCustomer(o)}
                                  disabled={updatingOrder}
                                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs h-8 gap-1.5 shadow-sm active:scale-95 transition"
                                >
                                  <BellRing className="h-3.5 w-3.5" />
                                  Mark Ready &amp; Alert Customer
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openReceiptModal(o, 'KOT')}
                                  className="text-xs font-bold h-8 px-2 border-stone-200"
                                >
                                  KOT
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Column 3: READY FOR PICKUP */}
              {(() => {
                const readyOrders = orders
                  .filter((o) => o.status === 'READY')
                  .filter((o) => {
                    if (kdsTypeFilter === 'ALL') return true;
                    if (kdsTypeFilter === 'DINE_IN') return o.deliveryType === 'dine_in' || o.deliveryAddress?.includes('Table #');
                    if (kdsTypeFilter === 'TAKEOUT') return o.deliveryType === 'takeout';
                    if (kdsTypeFilter === 'DELIVERY') return o.deliveryType === 'delivery';
                    return true;
                  });

                return (
                  <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50/40 p-4 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <h3 className="text-xs font-black uppercase tracking-wider text-emerald-950">
                          3. Ready for Pickup / Serving
                        </h3>
                      </div>
                      <Badge className="bg-emerald-600 text-white font-bold text-xs">
                        {readyOrders.length}
                      </Badge>
                    </div>

                    {readyOrders.length === 0 ? (
                      <div className="py-12 text-center text-xs text-emerald-800/60 font-semibold">
                        No orders waiting at pickup counter.
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-1">
                        {readyOrders.map((o) => {
                          const orderItems = Array.isArray(o.items) ? o.items : [];
                          const isTable = o.deliveryType === 'dine_in' || o.deliveryAddress?.includes('Table #');

                          return (
                            <div
                              key={o.id}
                              className="rounded-xl border-2 border-emerald-200 bg-white p-4 shadow-sm space-y-3"
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <span className="text-base font-black text-stone-900 font-mono">
                                    #{o.id.slice(-6).toUpperCase()}
                                  </span>
                                  <div className="text-[11px] text-stone-500 mt-0.5">
                                    {o.customerName || 'Guest'} {o.customerPhone ? `(${o.customerPhone})` : ''}
                                  </div>
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                                  <Sparkles className="h-3 w-3" /> Ready
                                </span>
                              </div>

                              <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-black text-emerald-900 flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5 text-emerald-700" />
                                <span>
                                  Collect from: {isTable ? (o.deliveryAddress || 'Table') : 'Counter 1'}
                                </span>
                              </div>

                              <div className="py-2 border-y border-dashed border-stone-200 space-y-1">
                                {orderItems.map((it: any, idx: number) => (
                                  <div key={idx} className="flex justify-between items-center text-xs">
                                    <span className="font-semibold text-stone-800">
                                      <span className="text-emerald-700 mr-1.5 font-black">{it.qty}×</span>
                                      {it.name}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              <div className="flex items-center gap-2 pt-1">
                                <Button
                                  size="sm"
                                  onClick={() => updateOrderStatus(o.id, 'DELIVERED')}
                                  disabled={updatingOrder}
                                  className="flex-1 bg-stone-900 hover:bg-black text-white font-bold text-xs h-8 gap-1"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  Handed Over / Complete
                                </Button>
                                {o.customerPhone && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => markReadyAndAlertCustomer(o)}
                                    className="text-xs font-bold h-8 px-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                    title="Re-send WhatsApp ready alert"
                                  >
                                    <MessageCircle className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ======================= TAB 5: BILLING & DAILY CLOSING (Z-REPORT) ======================= */}
        {activeTab === 'closing' && (
          <div className="w-full space-y-6">
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-stone-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-stone-900">Billing &amp; Daily Closing (Z-Report)</h2>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-bold">
                      Take.app POS Parity
                    </Badge>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">
                    End-of-day revenue reconciliation, tax audit (GST/VAT), payment methods breakdown &amp; receipts
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => window.print()}
                    className="bg-stone-900 hover:bg-black text-white font-bold h-9 text-xs gap-1.5 shadow-2xs"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Print Daily Closing (Z-Report)
                  </Button>
                </div>
              </div>

              {/* Today's Closing Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/60">
                  <div className="text-[11px] font-bold uppercase text-stone-400">Total Settled Sales</div>
                  <div className="text-2xl font-black text-emerald-700 mt-1">
                    {currencySymbol}
                    {orders
                      .filter((o) => o.paymentStatus === 'PAID')
                      .reduce((sum, o) => sum + Number(o.total || 0), 0)
                      .toFixed(2)}
                  </div>
                  <div className="text-[10px] text-stone-400 mt-1">
                    {orders.filter((o) => o.paymentStatus === 'PAID').length} paid orders today
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/60">
                  <div className="text-[11px] font-bold uppercase text-stone-400">Taxes ({taxName} {taxRate}%)</div>
                  <div className="text-2xl font-black text-stone-900 mt-1">
                    {currencySymbol}
                    {(
                      (orders
                        .filter((o) => o.paymentStatus === 'PAID')
                        .reduce((sum, o) => sum + Number(o.total || 0), 0) *
                        (taxRate || 0)) /
                      100
                    ).toFixed(2)}
                  </div>
                  <div className="text-[10px] text-stone-400 mt-1">
                    GSTIN: {gstin || 'Not configured'}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/60">
                  <div className="text-[11px] font-bold uppercase text-stone-400">UPI / Digital Sales</div>
                  <div className="text-2xl font-black text-blue-600 mt-1">
                    {currencySymbol}
                    {orders
                      .filter((o) => o.paymentMethod === 'UPI' && o.paymentStatus === 'PAID')
                      .reduce((sum, o) => sum + Number(o.total || 0), 0)
                      .toFixed(2)}
                  </div>
                  <div className="text-[10px] text-stone-400 mt-1">Direct to {upiId || 'UPI'}</div>
                </div>

                <div className="p-4 rounded-xl border border-stone-200 bg-stone-50/60">
                  <div className="text-[11px] font-bold uppercase text-stone-400">Cash in Register</div>
                  <div className="text-2xl font-black text-purple-700 mt-1">
                    {currencySymbol}
                    {orders
                      .filter((o) => o.paymentMethod === 'CASH' && o.paymentStatus === 'PAID')
                      .reduce((sum, o) => sum + Number(o.total || 0), 0)
                      .toFixed(2)}
                  </div>
                  <div className="text-[10px] text-stone-400 mt-1">Physical drawer cash</div>
                </div>
              </div>

              {/* Settled Orders Table with 1-click Receipt & KOT Printing */}
              <div className="mt-8">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-stone-900">Recent Customer Bills &amp; Receipts</h3>
                  <span className="text-xs text-stone-500">Tap to reprint customer receipt or kitchen ticket</span>
                </div>

                <div className="rounded-xl border border-stone-200 overflow-hidden bg-white shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 text-[10px] font-bold uppercase text-stone-400 border-b border-stone-200">
                      <tr>
                        <th className="py-2.5 px-4">Order #</th>
                        <th className="py-2.5 px-4">Time</th>
                        <th className="py-2.5 px-4">Customer / Table</th>
                        <th className="py-2.5 px-4">Items</th>
                        <th className="py-2.5 px-4">Total</th>
                        <th className="py-2.5 px-4">Payment</th>
                        <th className="py-2.5 px-4 text-right">Receipt Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {orders.slice(0, 10).map((o) => (
                        <tr key={o.id} className="hover:bg-stone-50/60 transition">
                          <td className="py-3 px-4 font-mono font-bold text-stone-900">
                            #{o.id.slice(-6).toUpperCase()}
                          </td>
                          <td className="py-3 px-4 text-stone-500">
                            {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-stone-900 block">{o.customerName || 'Walk-in'}</span>
                            <span className="text-[10px] text-stone-400">{o.deliveryAddress || 'Dine-In'}</span>
                          </td>
                          <td className="py-3 px-4 text-stone-600">
                            {(o.items || []).map((it: any) => `${it.name} (x${it.qty})`).join(', ') || 'Items'}
                          </td>
                          <td className="py-3 px-4 font-black text-stone-900">
                            {currencySymbol}{Number(o.total || 0).toFixed(2)}
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold ${
                                o.paymentStatus === 'PAID'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {o.paymentMethod || 'CASH'} · {o.paymentStatus || 'UNPAID'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openReceiptModal(o, 'CUSTOMER_BILL')}
                                className="h-7 text-[11px] font-bold gap-1 px-2"
                                title="Print Customer Thermal Receipt"
                              >
                                <Receipt className="h-3 w-3 text-blue-600" />
                                Bill
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openReceiptModal(o, 'KOT')}
                                className="h-7 text-[11px] font-bold gap-1 px-2"
                                title="Print Kitchen Order Ticket"
                              >
                                <UtensilsCrossed className="h-3 w-3 text-amber-600" />
                                KOT
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => sendWhatsAppReceipt(o)}
                                className="h-7 text-[11px] font-bold gap-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                                title="Send WhatsApp Receipt"
                              >
                                <MessageCircle className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================= TAB 5: STORE SETTINGS & PRESETS ======================= */}
        {activeTab === 'settings' && (
          <div className="w-full space-y-6">
            {/* Quick Templates Banner */}
            <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-5 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold text-blue-900 uppercase tracking-wide">
                  1-Click Industry Templates (Take.app & Tidio Presets)
                </h3>
              </div>
              <p className="text-xs text-blue-700 mb-4">
                Instantly populate your store catalog, WhatsApp checkout fields, and greeting message:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    name: '🍰 Bakery & Cake Shop',
                    desc: 'Cakes, pastries, delivery date, custom message on cake, address',
                    catalog: [
                      { id: '1', name: 'Chocolate Truffle Cake (1kg)', price: 750, category: 'Cakes', isActive: true },
                      { id: '2', name: 'Red Velvet Pastry', price: 120, category: 'Pastries', isActive: true },
                      { id: '3', name: 'Artisan Sourdough Loaf', price: 180, category: 'Breads', isActive: true },
                    ],
                    greeting: 'Hi! Welcome to our bakery. What would you like to order today?',
                  },
                  {
                    name: '🍕 Restaurant & Cloud Kitchen',
                    desc: 'Starters, mains, beverages, spice level, dine-in table or address',
                    catalog: [
                      { id: '1', name: 'Margherita Pizza 12"', price: 420, category: 'Pizza', isActive: true },
                      { id: '2', name: 'Farmhouse Burger', price: 210, category: 'Burgers', isActive: true },
                      { id: '3', name: 'Cold Brew Coffee', price: 150, category: 'Beverages', isActive: true },
                    ],
                    greeting: 'Welcome! Check out our menu or let us know what you feel like having.',
                  },
                  {
                    name: '🛍️ Retail & Grocery Store',
                    desc: 'Packaged goods, daily essentials, quantity, delivery time slot',
                    catalog: [
                      { id: '1', name: 'Organic Almond Milk 1L', price: 280, category: 'Dairy', isActive: true },
                      { id: '2', name: 'Specialty Espresso Beans 250g', price: 450, category: 'Coffee', isActive: true },
                    ],
                    greeting: 'Hello! What can we deliver to your doorstep today?',
                  },
                  {
                    name: '✂️ Salon & Wellness Spa',
                    desc: 'Haircut, facial, preferred stylist, appointment date & time',
                    catalog: [
                      { id: '1', name: 'Signature Haircut & Styling', price: 500, category: 'Hair', isActive: true },
                      { id: '2', name: 'Hydra Glow Facial', price: 1500, category: 'Skin', isActive: true },
                    ],
                    greeting: 'Hi there! Which service would you like to book an appointment for?',
                  },
                ].map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (confirm(`Load the "${tmpl.name}" preset? This will update your catalog items.`)) {
                        setCatalog(tmpl.catalog);
                        setGreetingMessage(tmpl.greeting);
                        saveSettings(tmpl.catalog);
                      }
                    }}
                    className="p-3.5 rounded-xl border border-blue-200 bg-white hover:border-blue-400 hover:bg-blue-50/50 transition text-left flex justify-between items-center group shadow-2xs"
                  >
                    <div>
                      <div className="text-xs font-bold text-stone-900 group-hover:text-blue-700">{tmpl.name}</div>
                      <div className="text-[11px] text-stone-500 mt-0.5 line-clamp-1">{tmpl.desc}</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-blue-500 shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>

            {/* General Settings */}
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-stone-900 mb-2">WhatsApp & Store Configuration</h3>

              <div>
                <label className="text-xs font-bold text-stone-700">UPI ID for Direct Payments</label>
                <Input
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. businessname@okhdfcbank"
                  className="mt-1 text-xs"
                />
                <p className="text-[11px] text-stone-400 mt-1">
                  The bot sends this UPI link (`upi://pay?pa=...`) for 1-click customer payment.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700">Supported Delivery Areas</label>
                <Input
                  value={deliveryAreas}
                  onChange={(e) => setDeliveryAreas(e.target.value)}
                  placeholder="e.g. Bandra, Andheri, Juhu (comma-separated)"
                  className="mt-1 text-xs"
                />
                <p className="text-[11px] text-stone-400 mt-1">Leave blank to accept orders anywhere.</p>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700">AI Bot Greeting Message</label>
                <textarea
                  value={greetingMessage}
                  onChange={(e) => setGreetingMessage(e.target.value)}
                  rows={2}
                  className="w-full mt-1 rounded-lg border border-stone-200 p-2 text-xs text-stone-800"
                  placeholder="Hi! Welcome to our store. What would you like to order today?"
                />
              </div>

              <div className="pt-2">
                <Button
                  onClick={() => saveSettings()}
                  disabled={savingSettings}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                >
                  {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Store Settings'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ======================= TAB: INDUSTRY TEMPLATES ======================= */}
        {activeTab === 'templates' && (
          <div className="space-y-6 w-full">
            <div>
              <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-600" />
                Industry Catalog Templates
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Select your business vertical to seed your store catalog in 1-click with prebuilt items, categories, units, and market prices.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(templatesList.length > 0
                ? templatesList
                : [
                    {
                      id: 'kirana-grocery',
                      name: 'Kirana & Grocery Store',
                      category: 'Grocery & Essentials',
                      icon: '🏪',
                      desc: 'Essential daily groceries, packaged foods, spices, grains & FMCG products.',
                      categories: ['Grains & Flours', 'Oils & Ghee', 'Dairy & Eggs', 'Spices & Masalas', 'Snacks & Beverages'],
                      itemCount: 15,
                    },
                    {
                      id: 'salon-spa',
                      name: 'Salon & Spa Studio',
                      category: 'Personal Care & Beauty',
                      icon: '💇',
                      desc: 'Hair styling, beauty treatments, facials, spa sessions & grooming packages.',
                      categories: ['Hair Care', 'Skin & Facial', 'Grooming', 'Hands & Feet', 'Spa & Wellness'],
                      itemCount: 15,
                    },
                    {
                      id: 'restaurant-cafe',
                      name: 'Restaurant, Cafe & Fast Food',
                      category: 'Food & Beverage',
                      icon: '🍕',
                      desc: 'Breakfast, quick bites, hot & cold beverages, meals, and desserts.',
                      categories: ['Quick Bites', 'Main Course', 'Beverages', 'Desserts', 'Combos'],
                      itemCount: 15,
                    },
                    {
                      id: 'fashion-boutique',
                      name: 'Fashion & Clothing Boutique',
                      category: 'Apparel & Accessories',
                      icon: '👗',
                      desc: 'Traditional wear, casual apparel, western outfits, and daily fashion accessories.',
                      categories: ['Ethnic Wear', 'Casual Wear', 'Western Wear', 'Winter & Seasonal', 'Accessories'],
                      itemCount: 14,
                    },
                    {
                      id: 'bakery-sweets',
                      name: 'Bakery, Cakes & Sweets',
                      category: 'Bakery & Confectionery',
                      icon: '🧁',
                      desc: 'Artisanal cakes, pastries, fresh breads, traditional sweets, and bakery savories.',
                      categories: ['Cakes & Pastries', 'Fresh Breads', 'Cookies & Biscuits', 'Traditional Sweets', 'Savories'],
                      itemCount: 15,
                    },
                  ]
              ).map((tmpl: any) => (
                <div
                  key={tmpl.id}
                  className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs flex flex-col justify-between hover:border-emerald-400 hover:shadow-md transition"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-3xl">{tmpl.icon || '🛍️'}</span>
                      <Badge variant="outline" className="bg-stone-50 text-stone-600 text-[10px] font-bold">
                        {tmpl.itemCount || 15} Products
                      </Badge>
                    </div>

                    <h3 className="text-base font-black text-stone-900 mt-3">{tmpl.name}</h3>
                    <p className="text-xs text-stone-500 mt-1 line-clamp-2">{tmpl.desc}</p>

                    <div className="mt-4">
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                        Included Categories
                      </span>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {(tmpl.categories || []).map((cat: string, ci: number) => (
                          <span
                            key={ci}
                            className="rounded-md bg-stone-100 text-stone-700 px-2 py-0.5 text-[10px] font-medium"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-stone-100">
                    <Button
                      onClick={() => handleApplyTemplate(tmpl.id)}
                      disabled={applyingTemplateId === tmpl.id}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 h-9"
                    >
                      {applyingTemplateId === tmpl.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5" />
                          Apply to Catalog
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================= TAB: PROMOTIONS & COUPONS ======================= */}
        {activeTab === 'promotions' && (
          <div className="space-y-6 w-full">
            <div>
              <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
                <Tag className="h-5 w-5 text-amber-600" />
                Promotions, Coupons & Banners
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Boost sales with storefront announcement banners, discount codes, and 1-tap WhatsApp broadcast messages.
              </p>
            </div>

            {/* Storefront Announcement Banner Card */}
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-stone-900">Storefront Announcement Banner</h3>
                  <p className="text-xs text-stone-500">
                    Displayed prominently at the top of your public store link.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-stone-700">
                    {announcementBanner.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setAnnouncementBanner((prev) => ({ ...prev, enabled: !prev.enabled }))
                    }
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      announcementBanner.enabled ? 'bg-amber-600' : 'bg-stone-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        announcementBanner.enabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700">Banner Message</label>
                <Input
                  value={announcementBanner.text}
                  onChange={(e) =>
                    setAnnouncementBanner((prev) => ({ ...prev, text: e.target.value }))
                  }
                  placeholder="e.g. 🎉 Weekend Dhamaka: Flat 20% OFF on all orders above ₹499! Use coupon WEEKEND20"
                  className="mt-1 text-xs"
                />
              </div>

              {/* Live Preview */}
              {announcementBanner.text && (
                <div className="rounded-xl bg-amber-500 text-white p-3 text-xs font-bold text-center shadow-xs">
                  {announcementBanner.text}
                </div>
              )}

              <Button
                onClick={handleSaveBanner}
                disabled={savingBanner}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-9"
              >
                {savingBanner ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Announcement Banner'}
              </Button>
            </div>

            {/* Coupons Management Card */}
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-6">
              <div>
                <h3 className="text-base font-bold text-stone-900">Discount Coupons</h3>
                <p className="text-xs text-stone-500">
                  Customers enter these codes at checkout for instant discounts.
                </p>
              </div>

              {/* Add Coupon Form */}
              <div className="rounded-xl bg-stone-50 p-4 border border-stone-200 space-y-3">
                <div className="text-xs font-bold text-stone-800 uppercase tracking-wide">
                  + Create New Coupon Code
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-stone-600">Coupon Code *</label>
                    <Input
                      value={newCouponCode}
                      onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                      placeholder="e.g. SAVE20"
                      className="mt-1 text-xs font-mono font-bold uppercase"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-stone-600">Discount Type</label>
                    <select
                      value={newCouponType}
                      onChange={(e) => setNewCouponType(e.target.value as any)}
                      className="mt-1 w-full rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-bold h-9"
                    >
                      <option value="PERCENT">Percentage (%)</option>
                      <option value="FLAT">Flat Amount (₹)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-stone-600">Discount Value *</label>
                    <Input
                      type="number"
                      value={newCouponValue}
                      onChange={(e) => setNewCouponValue(e.target.value)}
                      placeholder="10"
                      className="mt-1 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-stone-600">Min Order (₹)</label>
                    <Input
                      type="number"
                      value={newCouponMinOrder}
                      onChange={(e) => setNewCouponMinOrder(e.target.value)}
                      placeholder="0"
                      className="mt-1 text-xs"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    onClick={handleSaveCoupon}
                    disabled={savingCoupon}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8"
                  >
                    {savingCoupon ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save Coupon'}
                  </Button>
                </div>
              </div>

              {/* Coupons List */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-stone-500 uppercase">
                  Active Coupons ({couponsList.length})
                </div>

                {couponsList.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-xs text-stone-400">
                    No custom discount coupons created yet. Create one above!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {couponsList.map((c: any) => (
                      <div
                        key={c.code || c.id}
                        className="rounded-xl border border-stone-200 bg-white p-4 flex items-center justify-between shadow-2xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-stone-900 text-sm">{c.code}</span>
                            <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold border-emerald-200">
                              {c.type === 'PERCENT' ? `${c.value}% OFF` : `₹${c.value} OFF`}
                            </Badge>
                          </div>
                          <div className="text-[11px] text-stone-500 mt-1">
                            {c.minOrder > 0 ? `Min order ₹${c.minOrder}` : 'No minimum order required'}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const storeName = auth?.tenant?.name || 'our store';
                              const msg = `🎉 Special Offer from *${storeName}*!\nUse coupon code *${c.code}* to get *${c.type === 'PERCENT' ? `${c.value}% OFF` : `₹${c.value} OFF`}* on your next order.\nOrder now: ${publicStoreUrl}`;
                              navigator.clipboard.writeText(msg);
                              toast.success('Promotional WhatsApp text copied to clipboard!');
                            }}
                            className="h-8 text-xs text-stone-600 gap-1"
                          >
                            <Copy className="h-3 w-3" />
                            Share
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteCoupon(c.code)}
                            className="h-8 text-xs text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================= TAB: CUSTOM DOMAIN ======================= */}
        {activeTab === 'domain' && (
          <div className="space-y-6 w-full">
            <div>
              <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
                <Globe className="h-5 w-5 text-purple-600" />
                White-Label Custom Domain
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Connect your brand's own custom domain (e.g. <span className="font-mono text-stone-700">order.yourbrand.com</span>) with free automatic SSL.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-6">
              <div>
                <label className="text-xs font-bold text-stone-700">Enter Your Custom Domain</label>
                <div className="mt-1.5 flex items-center gap-3">
                  <Input
                    value={customDomainInput}
                    onChange={(e) => setCustomDomainInput(e.target.value)}
                    placeholder="shop.yourbrand.com"
                    className="text-xs font-mono flex-1"
                  />
                  <Button
                    onClick={handleSaveDomain}
                    disabled={savingDomain}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-9"
                  >
                    {savingDomain ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Connect Domain'}
                  </Button>
                </div>
              </div>

              {/* Status & DNS Record Configuration */}
              <div className="rounded-xl bg-purple-50/60 border border-purple-200 p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-purple-900 uppercase tracking-wide">
                    DNS Configuration Instructions
                  </span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-bold ${
                      domainRecord?.status === 'ACTIVE'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}
                  >
                    {domainRecord?.status === 'ACTIVE' ? 'Active & SSL Ready ✓' : 'Pending DNS Propagation ⏳'}
                  </Badge>
                </div>

                <p className="text-xs text-purple-800">
                  Add the following DNS record in your domain registrar (GoDaddy, Cloudflare, Namecheap, Hostinger):
                </p>

                <div className="rounded-lg bg-white border border-purple-200 overflow-hidden text-xs">
                  <div className="grid grid-cols-4 bg-purple-100/70 p-2.5 font-bold text-purple-900 border-b border-purple-200 text-[11px]">
                    <span>Type</span>
                    <span>Host / Name</span>
                    <span>Points to / Target</span>
                    <span>TTL</span>
                  </div>
                  <div className="grid grid-cols-4 p-2.5 font-mono text-[11px] text-stone-800 items-center">
                    <span className="font-bold text-purple-700">CNAME</span>
                    <span>{customDomainInput.split('.')[0] || 'shop'}</span>
                    <span className="truncate">cname.fieseros.com</span>
                    <span>Automatic / 300</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <Button
                    onClick={handleVerifyDomain}
                    disabled={verifyingDomain}
                    variant="outline"
                    className="bg-white border-purple-300 text-purple-800 hover:bg-purple-100 text-xs font-bold h-8 gap-1.5"
                  >
                    {verifyingDomain ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    Verify DNS Record
                  </Button>

                  {customDomainInput && (
                    <a
                      href={`https://${customDomainInput}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-purple-700 font-bold hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Test URL
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================= TAB: KHATA (UDHAAR) ======================= */}
        {activeTab === 'khata' && (
          <div className="space-y-6 w-full">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-amber-700" />
                  Customer Khata (Udhaar Book)
                </h2>
                <p className="text-xs text-stone-500 mt-1">
                  Track customer credit balances, record repayments, and send 1-tap WhatsApp payment reminders with dynamic UPI links.
                </p>
              </div>

              {/* Total Aapko Milega + Aapko Dena Hai Badges */}
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-amber-300 bg-amber-50 px-5 py-3 text-right shadow-2xs">
                  <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Aapko Milega (Receivable)</div>
                  <div className="text-2xl font-black text-amber-900 mt-0.5">{currencySymbol}{khataReceivable.toFixed(2)}</div>
                </div>
                <div className="rounded-xl border border-red-300 bg-red-50 px-5 py-3 text-right shadow-2xs">
                  <div className="text-[10px] font-bold text-red-700 uppercase tracking-wider">Aapko Dena Hai (Payable)</div>
                  <div className="text-2xl font-black text-red-900 mt-0.5">{currencySymbol}{khataPayable.toFixed(2)}</div>
                </div>
              </div>
            </div>

            {/* Customers Khata Ledger */}
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-stone-900">Credit Ledger</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-400 font-medium">
                    {khataList.length} Customer{khataList.length === 1 ? '' : 's'} with Credit
                  </span>
                  <Button
                    size="sm"
                    onClick={() => setKhataUdhaarModal(true)}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-8 gap-1.5"
                  >
                    <Plus className="h-3 w-3" />
                    Give Udhaar
                  </Button>
                </div>
              </div>

              {khataLoading ? (
                <div className="p-12 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-amber-600 mx-auto" />
                  <span className="text-xs text-stone-400 mt-2 block">Loading Khata entries...</span>
                </div>
              ) : khataList.length === 0 ? (
                <div className="rounded-xl border border-dashed border-stone-300 p-12 text-center text-xs text-stone-400">
                  No pending Udhaar entries. All customer accounts are fully paid! ✓
                </div>
              ) : (
                <div className="divide-y divide-stone-100 rounded-xl border border-stone-200 overflow-hidden text-xs">
                  {khataList.map((entry: any, i: number) => (
                    <div key={i} className="p-4 flex flex-wrap items-center justify-between gap-3 bg-white hover:bg-stone-50 transition">
                      <div>
                        <div className="font-bold text-stone-900 text-sm">{entry.name || 'Customer'}</div>
                        <div className="text-stone-500 font-mono text-[11px] mt-0.5">{entry.phone}</div>
                        {entry.oldestPendingDate && (
                          <div className="text-[10px] text-stone-400 mt-1">
                            Oldest pending: {new Date(entry.oldestPendingDate).toLocaleDateString()}
                            {entry.daysPending > 0 && ` · ${entry.daysPending} day${entry.daysPending === 1 ? '' : 's'} overdue`}
                          </div>
                        )}
                        {entry.unpaidOrdersCount > 0 && (
                          <div className="text-[10px] text-amber-600 mt-0.5">
                            {entry.unpaidOrdersCount} unpaid order{entry.unpaidOrdersCount === 1 ? '' : 's'}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-[10px] uppercase font-bold text-red-600">Pending Due</div>
                          <div className="text-base font-black text-red-700">{currencySymbol}{Number(entry.balance || 0).toFixed(2)}</div>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenKhataPayment(entry)}
                          disabled={khataPaySubmitting}
                          className="font-bold text-xs h-8 gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Record Payment
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => handleSendKhataWhatsApp(entry)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 gap-1.5"
                        >
                          <Send className="h-3 w-3" />
                          WhatsApp
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Suppliers Khata Ledger (Aapko Dena Hai) */}
            {khataSuppliers.length > 0 && (
              <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-stone-900">Supplier Dues (Aapko Dena Hai)</h3>
                  <span className="text-xs text-stone-400 font-medium">
                    {khataSuppliers.length} Supplier{khataSuppliers.length === 1 ? '' : 's'} with Dues
                  </span>
                </div>

                <div className="divide-y divide-stone-100 rounded-xl border border-stone-200 overflow-hidden text-xs">
                  {khataSuppliers.map((entry: any, i: number) => (
                    <div key={i} className="p-4 flex flex-wrap items-center justify-between gap-3 bg-white hover:bg-stone-50 transition">
                      <div>
                        <div className="font-bold text-stone-900 text-sm">{entry.supplierName || 'Supplier'}</div>
                        {entry.supplierPhone && (
                          <div className="text-stone-500 font-mono text-[11px] mt-0.5">{entry.supplierPhone}</div>
                        )}
                        {entry.oldestPendingDate && (
                          <div className="text-[10px] text-stone-400 mt-1">
                            Oldest PO: {new Date(entry.oldestPendingDate).toLocaleDateString()}
                            {entry.daysPending > 0 && ` · ${entry.daysPending} day${entry.daysPending === 1 ? '' : 's'} pending`}
                          </div>
                        )}
                        {entry.outstandingOrdersCount > 0 && (
                          <div className="text-[10px] text-red-600 mt-0.5">
                            {entry.outstandingOrdersCount} outstanding PO{entry.outstandingOrdersCount === 1 ? '' : 's'}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-[10px] uppercase font-bold text-red-600">Payable</div>
                          <div className="text-base font-black text-red-700">{currencySymbol}{Number(entry.balance || 0).toFixed(2)}</div>
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenSupplierPay(entry)}
                          disabled={khataSupplierPaySubmitting}
                          className="font-bold text-xs h-8 gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-50"
                        >
                          <DollarSign className="h-3 w-3" />
                          Pay Supplier
                        </Button>

                        {entry.whatsappReminderUrl && (
                          <Button
                            size="sm"
                            onClick={() => window.open(entry.whatsappReminderUrl, '_blank')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 gap-1.5"
                          >
                            <Send className="h-3 w-3" />
                            WhatsApp
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Khata: Record Payment Modal ── */}
            {khataPaymentModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-stone-900">Record Payment</h3>
                    <button onClick={() => setKhataPaymentModal(null)} className="text-stone-400 hover:text-stone-600">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="space-y-1 text-sm text-stone-600">
                    <span className="font-semibold text-stone-900">{khataPaymentModal.entry.name}</span>
                    <span className="text-stone-400 mx-2">·</span>
                    <span className="font-mono text-xs">{khataPaymentModal.entry.phone}</span>
                    <span className="text-stone-400 mx-2">·</span>
                    <span className="text-red-600 font-bold">Due: {currencySymbol}{Number(khataPaymentModal.entry.balance || 0).toFixed(2)}</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-stone-500 uppercase">Amount Received ({currencySymbol})</label>
                      <Input
                        type="number"
                        value={khataPayAmount}
                        onChange={(e) => setKhataPayAmount(e.target.value)}
                        placeholder="0.00"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-stone-500 uppercase">Payment Method</label>
                      <div className="flex gap-2 mt-1">
                        <button
                          onClick={() => setKhataPayMethod('CASH')}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold border ${khataPayMethod === 'CASH' ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'border-stone-200 text-stone-500'}`}
                        >
                          💵 Cash
                        </button>
                        <button
                          onClick={() => setKhataPayMethod('UPI')}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold border ${khataPayMethod === 'UPI' ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'border-stone-200 text-stone-500'}`}
                        >
                          ⚡ UPI
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-stone-500 uppercase">Note (optional)</label>
                      <Input
                        value={khataPayNote}
                        onChange={(e) => setKhataPayNote(e.target.value)}
                        placeholder="e.g. Partial payment, full settlement..."
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" onClick={() => setKhataPaymentModal(null)} disabled={khataPaySubmitting} className="flex-1">
                      Cancel
                    </Button>
                    <Button
                      onClick={handleRecordKhataPayment}
                      disabled={khataPaySubmitting}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {khataPaySubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Record Payment'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Khata: Give Udhaar Modal ── */}
            {khataUdhaarModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-stone-900">Give Udhaar (Credit Sale)</h3>
                    <button onClick={() => setKhataUdhaarModal(false)} className="text-stone-400 hover:text-stone-600">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-stone-500 uppercase">Customer Phone *</label>
                      <Input
                        value={khataUdhaarPhone}
                        onChange={(e) => setKhataUdhaarPhone(e.target.value)}
                        placeholder="+91 9876543210"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-stone-500 uppercase">Customer Name</label>
                      <Input
                        value={khataUdhaarName}
                        onChange={(e) => setKhataUdhaarName(e.target.value)}
                        placeholder="e.g. Ramesh Kumar"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-stone-500 uppercase">Amount ({currencySymbol}) *</label>
                      <Input
                        type="number"
                        value={khataUdhaarAmount}
                        onChange={(e) => setKhataUdhaarAmount(e.target.value)}
                        placeholder="0.00"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-stone-500 uppercase">Note (optional)</label>
                      <Input
                        value={khataUdhaarNote}
                        onChange={(e) => setKhataUdhaarNote(e.target.value)}
                        placeholder="e.g. 2kg rice, 1L oil..."
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" onClick={() => setKhataUdhaarModal(false)} disabled={khataUdhaarSubmitting} className="flex-1">
                      Cancel
                    </Button>
                    <Button
                      onClick={handleGiveUdhaar}
                      disabled={khataUdhaarSubmitting}
                      className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      {khataUdhaarSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Record Udhaar'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Khata: Pay Supplier Modal ── */}
            {khataSupplierPayModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-stone-900">Pay Supplier</h3>
                    <button onClick={() => setKhataSupplierPayModal(null)} className="text-stone-400 hover:text-stone-600">
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="space-y-1 text-sm text-stone-600">
                    <span className="font-semibold text-stone-900">{khataSupplierPayModal.entry.supplierName}</span>
                    <span className="text-stone-400 mx-2">·</span>
                    <span className="text-red-600 font-bold">Payable: {currencySymbol}{Number(khataSupplierPayModal.entry.balance || 0).toFixed(2)}</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-bold text-stone-500 uppercase">Amount to Pay ({currencySymbol})</label>
                      <Input
                        type="number"
                        value={khataSupplierPayAmount}
                        onChange={(e) => setKhataSupplierPayAmount(e.target.value)}
                        placeholder="0.00"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-stone-500 uppercase">Payment Method</label>
                      <div className="flex gap-2 mt-1">
                        <button
                          onClick={() => setKhataSupplierPayMethod('CASH')}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold border ${khataSupplierPayMethod === 'CASH' ? 'bg-blue-50 border-blue-400 text-blue-700' : 'border-stone-200 text-stone-500'}`}
                        >
                          💵 Cash
                        </button>
                        <button
                          onClick={() => setKhataSupplierPayMethod('UPI')}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold border ${khataSupplierPayMethod === 'UPI' ? 'bg-blue-50 border-blue-400 text-blue-700' : 'border-stone-200 text-stone-500'}`}
                        >
                          ⚡ UPI/Bank
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" onClick={() => setKhataSupplierPayModal(null)} disabled={khataSupplierPaySubmitting} className="flex-1">
                      Cancel
                    </Button>
                    <Button
                      onClick={handlePaySupplier}
                      disabled={khataSupplierPaySubmitting}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {khataSupplierPaySubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Record Payment'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================= TAB: DAY BOOK & EXPENSES ======================= */}
        {activeTab === 'daybook' && (
          <div className="space-y-6 w-full">
            <div>
              <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-700" />
                Day Book & Cash Drawer
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Monitor physical cash in hand, daily sales inflows, and store expenses in real-time.
              </p>
            </div>

            {/* Cash Drawer Summary KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 shadow-2xs">
                <div className="text-xs font-bold text-blue-700 uppercase">Today's Sales</div>
                <div className="text-2xl font-black text-stone-900 mt-2">
                  {currencySymbol}{Number(dayBookData.totalSales || stats.totalRevenue || stats.revenue || 0).toFixed(2)}
                </div>
                <div className="text-[11px] text-blue-600 mt-0.5">Orders + POS</div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-2xs">
                <div className="text-xs font-bold text-emerald-700 uppercase">Total Cash Inflow</div>
                <div className="text-2xl font-black text-emerald-900 mt-2">
                  {currencySymbol}{Number(dayBookData.totalInflow || stats.totalRevenue || stats.revenue || 0).toFixed(2)}
                </div>
                <div className="text-[11px] text-emerald-600 mt-0.5">Cash collected</div>
              </div>

              <div className="rounded-xl border border-red-200 bg-red-50/70 p-4 shadow-2xs">
                <div className="text-xs font-bold text-red-700 uppercase">Total Outflows</div>
                <div className="text-2xl font-black text-red-900 mt-2">
                  {currencySymbol}{Number(dayBookData.totalOutflow || 0).toFixed(2)}
                </div>
                <div className="text-[11px] text-red-600 mt-0.5">Daily expenses</div>
              </div>

              <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 shadow-2xs">
                <div className="text-xs font-black text-amber-800 uppercase tracking-wide">Cash in Hand</div>
                <div className="text-2xl font-black text-amber-900 mt-2">
                  {currencySymbol}{Number(dayBookData.cashInHand || (stats.totalRevenue || stats.revenue || 0)).toFixed(2)}
                </div>
                <div className="text-[11px] text-amber-700 mt-0.5">Physical Cash Drawer</div>
              </div>
            </div>

            {/* Quick Record Expense Form */}
            <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-stone-900">+ Record Daily Store Expense</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-stone-600">Expense Amount ({currencySymbol}) *</label>
                  <Input
                    type="number"
                    value={newExpenseAmt}
                    onChange={(e) => setNewExpenseAmt(e.target.value)}
                    placeholder="e.g. 500"
                    className="mt-1 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-stone-600">Category</label>
                  <select
                    value={newExpenseCat}
                    onChange={(e) => setNewExpenseCat(e.target.value)}
                    className="mt-1 w-full rounded-md border border-stone-300 bg-white px-2.5 py-1.5 text-xs font-bold h-9"
                  >
                    <option value="Raw Materials">Raw Materials / Stock</option>
                    <option value="Staff Wages">Staff Wages / Daily Pay</option>
                    <option value="Utilities">Utilities & Fuel</option>
                    <option value="Rent">Rent & Maintenance</option>
                    <option value="Packaging">Packaging & Supplies</option>
                    <option value="Other">Other Miscellaneous</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-stone-600">Description / Notes</label>
                  <Input
                    value={newExpenseNote}
                    onChange={(e) => setNewExpenseNote(e.target.value)}
                    placeholder="e.g. Milk & bread morning delivery"
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  onClick={handleAddExpense}
                  disabled={savingExpense}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs h-8"
                >
                  {savingExpense ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Record Expense'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ======================= TAB: BILLING & GST INVOICES (mobile billing.tsx port) ======================= */}
        {activeTab === 'billing' && (
          <div className="space-y-6 w-full">
            {/* Header + actions */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-indigo-600" />
                  Billing & GST Invoices
                </h2>
                <p className="text-xs text-stone-500 mt-1">
                  Create GST invoices &amp; estimates, share on WhatsApp, and convert approved quotes to invoices in 1 click.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={exportGstTaxReportCsv}
                  className="h-8 gap-1.5 text-xs font-bold border-stone-200 text-stone-700 hover:bg-stone-50"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-600" />
                  Export GSTR-1 CSV
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={loadBilling}
                  disabled={billingLoading}
                  className="h-8 gap-1.5 text-xs font-bold"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${billingLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button
                  size="sm"
                  onClick={() => openBillingForm(billingSubTab === 'INVOICES' ? 'INVOICE' : 'QUOTE')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-8 gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {billingSubTab === 'INVOICES' ? 'Create GST Invoice' : 'Create Estimate'}
                </Button>
              </div>
            </div>

            {/* Segmented control: GST Invoices | Estimates */}
            <div className="inline-flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs font-semibold">
              <button
                onClick={() => setBillingSubTab('INVOICES')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  billingSubTab === 'INVOICES' ? 'bg-white text-stone-900 shadow-xs font-bold' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Receipt className="h-3.5 w-3.5 text-emerald-600" />
                GST Invoices ({invoices.length})
              </button>
              <button
                onClick={() => setBillingSubTab('QUOTES')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
                  billingSubTab === 'QUOTES' ? 'bg-white text-stone-900 shadow-xs font-bold' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <FileText className="h-3.5 w-3.5 text-blue-600" />
                Estimates / Quotes ({quotes.length})
              </button>
            </div>

            {/* KPI Strip — switches based on sub-tab */}
            {billingSubTab === 'INVOICES' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-2xs border-l-4 border-l-emerald-500">
                    <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">Collected (Paid)</div>
                    <div className="text-xl font-black text-emerald-900 mt-1">{currencySymbol}{Number(invoiceOverview.paid || 0).toFixed(2)}</div>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 shadow-2xs border-l-4 border-l-amber-500">
                    <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Pending Balance</div>
                    <div className="text-xl font-black text-amber-900 mt-1">{currencySymbol}{Number(invoiceOverview.unpaid || 0).toFixed(2)}</div>
                  </div>
                  <div className="rounded-xl border border-red-200 bg-red-50/70 p-4 shadow-2xs border-l-4 border-l-red-500">
                    <div className="text-[10px] font-bold text-red-700 uppercase tracking-wide">Overdue Bills</div>
                    <div className="text-xl font-black text-red-900 mt-1">{currencySymbol}{Number(invoiceOverview.overdue || 0).toFixed(2)}</div>
                  </div>
                </div>

                {/* GSTR-1 Tax Compliance & Turnover Summary Card */}
                {invoices.length > 0 && (
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black">
                        <Receipt className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-indigo-950 flex items-center gap-2">
                          GSTR-1 Compliance &amp; Tax Turnover Summary
                          <Badge className="bg-indigo-200 text-indigo-900 border-indigo-300 text-[10px] font-bold">
                            {invoices.length} Bills
                          </Badge>
                        </div>
                        <div className="text-[11px] text-indigo-700 mt-0.5">
                          Taxable Turnover: {currencySymbol}{invoices.reduce((s, i) => s + (Number(i.subtotal || i.total - (i.tax || 0)) || 0), 0).toFixed(2)} • Total Tax: {currencySymbol}{invoices.reduce((s, i) => s + (Number(i.tax) || 0), 0).toFixed(2)} (CGST {currencySymbol}{(invoices.reduce((s, i) => s + (Number(i.tax) || 0), 0) / 2).toFixed(2)} + SGST {currencySymbol}{(invoices.reduce((s, i) => s + (Number(i.tax) || 0), 0) / 2).toFixed(2)})
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setBillingBrandModalOpen(true)}
                        className="text-xs font-bold h-8 gap-1.5 border-indigo-200 text-indigo-900 hover:bg-indigo-100"
                      >
                        <Building2 className="h-3.5 w-3.5" />
                        Store Branding
                      </Button>
                      <Button
                        size="sm"
                        onClick={exportGstTaxReportCsv}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold h-8 gap-1.5"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Export GSTR-1 CSV
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-2xs border-l-4 border-l-emerald-500">
                  <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide">Accepted Quotes</div>
                  <div className="text-xl font-black text-emerald-900 mt-1">{currencySymbol}{Number(quoteOverview.accepted || 0).toFixed(2)}</div>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 shadow-2xs border-l-4 border-l-amber-500">
                  <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Pending Approval</div>
                  <div className="text-xl font-black text-amber-900 mt-1">{currencySymbol}{Number(quoteOverview.pending || 0).toFixed(2)}</div>
                </div>
                <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 shadow-2xs border-l-4 border-l-blue-500">
                  <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wide">Draft Quotes</div>
                  <div className="text-xl font-black text-blue-900 mt-1">{currencySymbol}{Number(quoteOverview.draft || 0).toFixed(2)}</div>
                </div>
              </div>
            )}

            {/* Search */}
            <div className="relative max-w-md">
              <Search className="h-4 w-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={billingSearch}
                onChange={(e) => setBillingSearch(e.target.value)}
                placeholder="Search by invoice #, client name, or item..."
                className="pl-9 text-xs font-medium h-9"
              />
            </div>

            {/* Content: Loading / Error / Empty / List */}
            {billingLoading ? (
              <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600 mx-auto" />
                <p className="text-xs text-stone-400 mt-2">Loading billing records...</p>
              </div>
            ) : billingError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-12 text-center">
                <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
                <p className="text-sm font-bold text-red-700 mt-2">{billingError}</p>
                <Button size="sm" variant="outline" onClick={loadBilling} className="mt-4 text-xs font-bold">
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
                </Button>
              </div>
            ) : billingSubTab === 'INVOICES' ? (
              filteredInvoices.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center">
                  <Receipt className="h-10 w-10 text-stone-300 mx-auto" />
                  <h3 className="text-base font-bold text-stone-700 mt-2">No GST Invoices Yet</h3>
                  <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
                    Create your first professional invoice with 1 tap. GST tax rates and totals compute automatically.
                  </p>
                  <Button size="sm" onClick={() => openBillingForm('INVOICE')} className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 gap-1.5">
                    <Plus className="h-3.5 w-3.5" /> Create First Invoice
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredInvoices.map((inv: any) => {
                    const isPaid = Number(inv.balance || 0) <= 0 || inv.status === 'PAID';
                    return (
                      <div
                        key={inv.id}
                        className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs hover:border-indigo-300 transition flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-black text-stone-900 font-mono">{inv.number}</span>
                                <button
                                  type="button"
                                  onClick={() => handleToggleWebPayment(inv)}
                                  className="cursor-pointer"
                                  title="Click to toggle Paid/Unpaid"
                                >
                                  <Badge className={
                                    isPaid
                                      ? 'bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] font-bold hover:bg-emerald-200'
                                      : 'bg-amber-100 text-amber-700 border-amber-200 text-[10px] font-bold hover:bg-amber-200'
                                  }>
                                    {isPaid ? 'PAID ✓' : 'UNPAID • TAP TO PAY'}
                                  </Badge>
                                </button>
                                {inv.fromQuoteId && (
                                  <Badge variant="outline" className="text-[9px] font-bold bg-blue-50 text-blue-700 border-blue-200">
                                    From Quote
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-stone-600 mt-1 font-semibold">
                                {inv.customer?.name || 'Walk-in Client'}
                                {inv.customer?.gstin ? ` • GSTIN: ${inv.customer.gstin}` : ''}
                              </div>
                              {inv.customer?.phone && (
                                <div className="text-[10px] text-stone-400 font-mono mt-0.5">{inv.customer.phone}</div>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-base font-black text-stone-900">{currencySymbol}{Number(inv.total || 0).toFixed(2)}</div>
                              <div className="text-[10px] text-stone-400 mt-0.5">
                                {new Date(inv.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div
                            onClick={() => setSelectedBillingInvoice(inv)}
                            className="mt-3 rounded-lg bg-stone-50 p-2.5 text-[11px] text-stone-600 truncate cursor-pointer hover:bg-stone-100"
                            title="Click to preview A4 GST Tax Invoice"
                          >
                            {(inv.items || []).map((i: any) => `${i.description} × ${i.qty}`).join(' • ')}
                          </div>
                        </div>

                        {/* Vyapar Quick Action Bar */}
                        <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-1.5 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedBillingInvoice(inv)}
                              className="text-xs font-bold gap-1 h-7 border-stone-200 hover:bg-stone-50"
                            >
                              <Eye className="h-3.5 w-3.5 text-indigo-600" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePrintWebInvoice(inv)}
                              className="text-xs font-bold gap-1 h-7 border-stone-200 hover:bg-stone-50 text-stone-700"
                            >
                              <Printer className="h-3.5 w-3.5 text-blue-600" />
                              Print / PDF
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenEditBillingInvoice(inv)}
                              className="text-xs font-bold gap-1 h-7 border-stone-200 hover:bg-stone-50 text-amber-700"
                            >
                              <Edit3 className="h-3.5 w-3.5 text-amber-600" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleShareBillingWhatsApp(inv, true)}
                              className="text-xs font-bold gap-1 h-7 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                            >
                              <Send className="h-3.5 w-3.5" />
                              WhatsApp
                            </Button>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteBilling(inv, 'INVOICE')}
                              disabled={deletingBillingId === inv.id}
                              className="text-xs font-bold gap-1 h-7 text-red-600 border-red-200 hover:bg-red-50 p-2"
                              title="Delete Invoice"
                            >
                              {deletingBillingId === inv.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : filteredQuotes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center">
                <FileText className="h-10 w-10 text-stone-300 mx-auto" />
                <h3 className="text-base font-bold text-stone-700 mt-2">No Quotations / Estimates</h3>
                <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
                  Send price estimates to clients on WhatsApp. Convert them into GST invoices in 1 click once approved.
                </p>
                <Button size="sm" onClick={() => openBillingForm('QUOTE')} className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Create First Estimate
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredQuotes.map((q: any) => {
                  const isAccepted = q.status === 'ACCEPTED';
                  return (
                    <div key={q.id} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-black text-stone-900 font-mono">{q.number}</span>
                            <Badge className={
                              isAccepted
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] font-bold'
                                : q.status === 'DRAFT'
                                ? 'bg-stone-100 text-stone-700 border-stone-200 text-[10px] font-bold'
                                : 'bg-blue-100 text-blue-700 border-blue-200 text-[10px] font-bold'
                            }>
                              {q.status}
                            </Badge>
                          </div>
                          <div className="text-xs text-stone-600 mt-1">{q.customer?.name || 'Potential Client'}</div>
                          {q.customer?.phone && (
                            <div className="text-[10px] text-stone-400 font-mono mt-0.5">{q.customer.phone}</div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-base font-black text-stone-900">{currencySymbol}{Number(q.total || 0).toFixed(2)}</div>
                          <div className="text-[10px] text-stone-400 mt-0.5">
                            {new Date(q.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 rounded-lg bg-stone-50 p-2.5 text-[11px] text-stone-600 truncate">
                        {(q.items || []).map((i: any) => `${i.description} × ${i.qty}`).join(' • ')}
                      </div>
                      <div className="mt-3 flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleShareBillingWhatsApp(q, false)}
                          className="text-xs font-bold gap-1.5 h-8 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                        >
                          <Send className="h-3.5 w-3.5" />
                          WhatsApp Estimate
                        </Button>
                        {!isAccepted && (
                          <Button
                            size="sm"
                            onClick={() => handleConvertQuoteToInvoice(q)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold h-8 gap-1.5"
                          >
                            <ArrowRight className="h-3.5 w-3.5" />
                            Convert to Invoice
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteBilling(q, 'QUOTE')}
                          disabled={deletingBillingId === q.id}
                          className="text-xs font-bold gap-1.5 h-8 text-red-600 border-red-300 hover:bg-red-50"
                        >
                          {deletingBillingId === q.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                          Delete
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected Order Slide-Over / Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-stone-400">Order Details</span>
                <h3 className="text-lg font-black text-stone-900">
                  #{selectedOrder.id.slice(-6).toUpperCase()}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Customer & Delivery Info */}
            <div className="rounded-xl bg-stone-50 p-3.5 space-y-2 text-xs border border-stone-100 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-stone-500 font-medium">Customer:</span>
                <span className="font-bold text-stone-900">{selectedOrder.customerName || 'Guest'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500 font-medium">Phone / WhatsApp:</span>
                <a
                  href={`https://wa.me/${selectedOrder.customerPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-emerald-600 hover:underline flex items-center gap-1"
                >
                  <MessageCircle className="h-3 w-3" />
                  {selectedOrder.customerPhone}
                </a>
              </div>
              {selectedOrder.deliveryAddress && (
                <div className="flex justify-between items-center">
                  <span className="text-stone-500 font-medium">Address / Table:</span>
                  <span className="font-bold text-stone-900">{selectedOrder.deliveryAddress}</span>
                </div>
              )}
            </div>

            {/* Items Breakdown */}
            <div className="mb-4">
              <h4 className="text-xs font-bold text-stone-500 uppercase mb-2">Order Items</h4>
              <div className="rounded-xl border border-stone-200 overflow-hidden text-xs">
                {(selectedOrder.items || []).map((it: any, i: number) => (
                  <div key={i} className="flex justify-between items-center p-2.5 border-b border-stone-100">
                    <div>
                      <span className="font-bold text-stone-900">{it.name}</span>
                      <span className="text-stone-500 ml-1.5">× {it.qty}</span>
                    </div>
                    <span className="font-black text-stone-900">
                      {currencySymbol}{(it.amount || it.price * it.qty || 0).toFixed(2)}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between items-center p-3 bg-stone-50 font-black text-sm">
                  <span>Total</span>
                  <span>{currencySymbol}{Number(selectedOrder.total || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Status & Actions */}
            <div className="space-y-3 pt-2 border-t border-stone-100">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-stone-700">Status:</span>
                  <select
                    value={selectedOrder.status}
                    disabled={updatingOrder}
                    onChange={(e) => updateOrderStatus(selectedOrder.id, e.target.value)}
                    className="rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-bold"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="CONFIRMED">CONFIRMED</option>
                    <option value="PREPARING">PREPARING</option>
                    <option value="READY">READY</option>
                    <option value="DELIVERED">DELIVERED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>

                {selectedOrder.paymentStatus !== 'PAID' ? (
                  <Button
                    size="sm"
                    onClick={() => markOrderPaid(selectedOrder.id)}
                    disabled={updatingOrder}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-7 gap-1"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Mark as Paid
                  </Button>
                ) : (
                  <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-100 rounded-full px-2.5 py-0.5 text-xs font-bold">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Paid
                  </span>
                )}
              </div>

              {/* Take.app Parity: 1-Click Receipts & KOT */}
              <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openReceiptModal(selectedOrder, 'CUSTOMER_BILL')}
                  className="flex-1 text-xs font-bold gap-1.5 h-8 border-stone-200 hover:bg-stone-50"
                >
                  <Receipt className="h-3.5 w-3.5 text-blue-600" />
                  Print Bill
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openReceiptModal(selectedOrder, 'KOT')}
                  className="flex-1 text-xs font-bold gap-1.5 h-8 border-stone-200 hover:bg-stone-50"
                >
                  <UtensilsCrossed className="h-3.5 w-3.5 text-amber-600" />
                  Kitchen KOT
                </Button>
                <Button
                  size="sm"
                  onClick={() => sendWhatsAppReceipt(selectedOrder)}
                  className="flex-1 text-xs font-bold gap-1.5 h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  WhatsApp Bill
                </Button>
              </div>

              {/* Chat Transcript View */}
              {selectedConversation?.messages?.length > 0 && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowConversation(!showConversation)}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    {showConversation ? 'Hide WhatsApp Transcript' : `View WhatsApp Transcript (${selectedConversation.messages.length} messages) ↓`}
                  </button>

                  {showConversation && (
                    <div className="mt-2 max-h-44 overflow-y-auto rounded-xl bg-stone-100 p-3 space-y-2 text-xs">
                      {selectedConversation.messages.map((m: any, i: number) => (
                        <div
                          key={i}
                          className={`flex flex-col ${
                            m.direction === 'inbound' ? 'items-start' : 'items-end'
                          }`}
                        >
                          <div
                            className={`rounded-xl px-3 py-1.5 max-w-[85%] ${
                              m.direction === 'inbound'
                                ? 'bg-white text-stone-900 border border-stone-200'
                                : 'bg-emerald-600 text-white'
                            }`}
                          >
                            {m.text}
                          </div>
                          <span className="text-[9px] text-stone-400 mt-0.5 px-1">
                            {m.direction === 'inbound' ? 'Customer' : 'Bot'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================= ADD / EDIT PRODUCT MODAL ======================= */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-stone-400">
                  {editingItem ? 'Edit Listing' : 'New Listing'}
                </span>
                <h3 className="text-lg font-black text-stone-900">
                  {editingItem ? 'Edit Product' : 'Add New Product'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setProductModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-stone-700">Product Name *</label>
                <Input
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="e.g. Sourdough Loaf 500g"
                  className="mt-1 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700">Price ({currencySymbol}) *</label>
                  <Input
                    type="number"
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                    placeholder="180"
                    className="mt-1 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700">Category</label>
                  <Input
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    placeholder="e.g. Breads"
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700">SKU Code</label>
                  <Input
                    value={prodSku}
                    onChange={(e) => setProdSku(e.target.value)}
                    placeholder="e.g. BRD-001"
                    className="mt-1 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700">Stock Availability</label>
                  <div className="mt-1 flex items-center justify-between rounded-lg border border-stone-200 bg-stone-50 px-3 h-9">
                    <span className="text-xs font-semibold text-stone-700">
                      {prodIsActive ? 'In Stock' : 'Out of Stock'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setProdIsActive(!prodIsActive)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        prodIsActive ? 'bg-emerald-600' : 'bg-stone-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          prodIsActive ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700">Image URL</label>
                <div className="mt-1 flex items-center gap-3">
                  <Input
                    value={prodImageUrl}
                    onChange={(e) => setProdImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="text-xs flex-1"
                  />
                  <div className="h-9 w-9 rounded-lg border border-stone-200 bg-stone-50 flex items-center justify-center shrink-0 overflow-hidden">
                    {prodImageUrl ? (
                      <img
                        src={prodImageUrl}
                        alt="Preview"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <ImageIcon className="h-4 w-4 text-stone-400" />
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700">Description / Details</label>
                <textarea
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                  placeholder="Ingredients, dietary info, package weight..."
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-stone-200 p-2.5 text-xs text-stone-900 focus:border-stone-900 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setProductModalOpen(false)}
                  className="text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveProductModal}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                >
                  {editingItem ? 'Save Changes' : 'Create Product'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================= STORE SYNC & CSV MODAL ======================= */}
      {syncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-stone-400">
                  Data Integration
                </span>
                <h3 className="text-lg font-black text-stone-900">Sync Catalog & Import</h3>
              </div>
              <button
                type="button"
                onClick={() => setSyncModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Provider Tabs */}
            <div className="grid grid-cols-3 gap-2 p-1 rounded-xl bg-stone-100 mb-5">
              <button
                type="button"
                onClick={() => setSyncProvider('shopify')}
                className={`py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  syncProvider === 'shopify'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Store className="h-3.5 w-3.5 text-emerald-600" />
                Shopify
              </button>
              <button
                type="button"
                onClick={() => setSyncProvider('woocommerce')}
                className={`py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  syncProvider === 'woocommerce'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <ShoppingCart className="h-3.5 w-3.5 text-purple-600" />
                WooCommerce
              </button>
              <button
                type="button"
                onClick={() => setSyncProvider('csv')}
                className={`py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  syncProvider === 'csv'
                    ? 'bg-white text-stone-900 shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Upload className="h-3.5 w-3.5 text-blue-600" />
                CSV Import
              </button>
            </div>

            {/* Tab Contents */}
            {syncProvider === 'shopify' && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-stone-700">Shopify Store Domain *</label>
                  <Input
                    value={syncDomain}
                    onChange={(e) => setSyncDomain(e.target.value)}
                    placeholder="e.g. yourstore.myshopify.com"
                    className="mt-1 text-xs"
                  />
                  <p className="text-[11px] text-stone-400 mt-1">
                    Enter your myshopify.com domain or custom storefront domain.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700">
                    Admin API Access Token (Optional)
                  </label>
                  <Input
                    type="password"
                    value={syncToken}
                    onChange={(e) => setSyncToken(e.target.value)}
                    placeholder="shpat_xxxxxxxxxxxxxxxxxxxxx"
                    className="mt-1 text-xs font-mono"
                  />
                  <p className="text-[11px] text-stone-400 mt-1">
                    If omitted, public storefront catalog will be fetched automatically.
                  </p>
                </div>

                <div className="pt-2">
                  <Button
                    onClick={handleExecuteStoreSync}
                    disabled={isSyncing}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 gap-2"
                  >
                    {isSyncing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Cloud className="h-4 w-4" />
                    )}
                    {isSyncing ? 'Syncing Products...' : 'Start Shopify Catalog Sync'}
                  </Button>
                </div>
              </div>
            )}

            {syncProvider === 'woocommerce' && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-stone-700">WooCommerce Site URL *</label>
                  <Input
                    value={syncDomain}
                    onChange={(e) => setSyncDomain(e.target.value)}
                    placeholder="https://yourstore.com"
                    className="mt-1 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-stone-700">Consumer Key *</label>
                    <Input
                      value={syncKey}
                      onChange={(e) => setSyncKey(e.target.value)}
                      placeholder="ck_xxxxxxxxxxxx"
                      className="mt-1 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-stone-700">Consumer Secret *</label>
                    <Input
                      type="password"
                      value={syncSecret}
                      onChange={(e) => setSyncSecret(e.target.value)}
                      placeholder="cs_xxxxxxxxxxxx"
                      className="mt-1 text-xs font-mono"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-stone-400">
                  Generate keys in WooCommerce → Settings → Advanced → REST API.
                </p>

                <div className="pt-2">
                  <Button
                    onClick={handleExecuteStoreSync}
                    disabled={isSyncing}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs h-10 gap-2"
                  >
                    {isSyncing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Cloud className="h-4 w-4" />
                    )}
                    {isSyncing ? 'Syncing Products...' : 'Start WooCommerce Catalog Sync'}
                  </Button>
                </div>
              </div>
            )}

            {syncProvider === 'csv' && (
              <div className="space-y-4">
                <div className="rounded-xl border-2 border-dashed border-stone-200 p-6 text-center bg-stone-50/50">
                  <Upload className="h-8 w-8 text-stone-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-stone-700">
                    {csvFile ? csvFile.name : 'Choose a CSV file to upload'}
                  </p>
                  <p className="text-[11px] text-stone-400 mt-1 mb-4">
                    Columns supported: name, price, category, description, imageUrl, sku, stock
                  </p>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        setCsvFile(e.target.files[0]);
                      }
                    }}
                    className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>

                <div className="pt-2">
                  <Button
                    onClick={handleImportCSVFile}
                    disabled={isSyncing || !csvFile}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-10 gap-2"
                  >
                    {isSyncing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    {isSyncing ? 'Importing Products...' : 'Upload & Import Catalog'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================= ADD / EDIT TABLE MODAL (Take.app Dine-In Parity) ======================= */}
      {tableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-stone-400">Dine-In Management</span>
                <h3 className="text-lg font-black text-stone-900">
                  {editingTable ? 'Edit Dining Table' : 'Add Dining Table'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setTableModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-stone-700">Table Name / Number *</label>
                <Input
                  value={tableNameInput}
                  onChange={(e) => setTableNameInput(e.target.value)}
                  placeholder="e.g. Table 12, Patio 4, Bar 2, VIP Lounge"
                  className="mt-1 text-xs"
                />
                <p className="text-[11px] text-stone-400 mt-1">This name appears on the QR stand, customer cart, and kitchen KOT.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700">Seating Capacity</label>
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    value={tableCapacityInput}
                    onChange={(e) => setTableCapacityInput(e.target.value)}
                    placeholder="4"
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700">Floor / Section</label>
                  <Input
                    value={tableSectionInput}
                    onChange={(e) => setTableSectionInput(e.target.value)}
                    placeholder="Main Floor"
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setTableModalOpen(false)}
                  className="text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveTable}
                  className="bg-stone-900 hover:bg-black text-white font-bold text-xs"
                >
                  {editingTable ? 'Save Changes' : 'Create Table'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================= BATCH PRINT STAND CARDS MODAL ======================= */}
      {batchPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl border border-stone-200 my-8">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4 mb-6">
              <div>
                <h3 className="text-lg font-black text-stone-900">
                  Print All Dine-In Table QR Stand Cards ({tables.length} Tables)
                </h3>
                <p className="text-xs text-stone-500">
                  Foldable tent cards formatted for standard cardstock printing (A4 / Letter)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => window.print()}
                  className="bg-stone-900 hover:bg-black text-white font-bold text-xs gap-1.5 h-9"
                >
                  <Printer className="h-4 w-4" />
                  Print Now
                </Button>
                <button
                  type="button"
                  onClick={() => setBatchPrintModalOpen(false)}
                  className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Printable Grid of Tent Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 p-2 bg-stone-50 rounded-xl max-h-[70vh] overflow-y-auto">
              {tables.map((tbl) => {
                const tableUrl = `${publicStoreUrl}?table=${encodeURIComponent(tbl.name)}`;
                const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(tableUrl)}`;
                return (
                  <div
                    key={tbl.id}
                    className="rounded-2xl border-2 border-stone-300 bg-white p-5 text-center shadow-xs flex flex-col items-center justify-between min-h-[360px]"
                  >
                    <div>
                      <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-stone-400">
                        {auth?.tenant?.name || 'WELCOME'}
                      </div>
                      <h4 className="text-xl font-black text-stone-900 mt-1">{tbl.name}</h4>
                      <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 mt-1">
                        {tbl.section || 'Main Floor'} · Seats {tbl.capacity || 4}
                      </span>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-stone-200 shadow-2xs my-3">
                      <img
                        src={qrSrc}
                        alt={`${tbl.name} QR Code`}
                        className="h-36 w-36 object-contain"
                      />
                    </div>

                    <div>
                      <p className="text-xs font-bold text-stone-800">
                        Scan to Browse Menu &amp; Order
                      </p>
                      <p className="text-[10px] text-stone-500 mt-0.5">
                        Order directly from your phone — no app download required!
                      </p>
                      <div className="mt-2 text-[9px] font-mono text-stone-400 truncate max-w-[200px]">
                        {tableUrl}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ======================= THERMAL 80MM CUSTOMER BILL & KOT MODAL (Take.app POS Parity) ======================= */}
      {receiptModalOpen && receiptOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-stone-200">
            {/* Header Switcher */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
              <div className="flex items-center bg-stone-100 p-0.5 rounded-lg border border-stone-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setReceiptType('CUSTOMER_BILL')}
                  className={`px-3 py-1 rounded-md transition ${
                    receiptType === 'CUSTOMER_BILL'
                      ? 'bg-white text-stone-900 shadow-2xs'
                      : 'text-stone-500 hover:text-stone-900'
                  }`}
                >
                  Customer Bill
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptType('KOT')}
                  className={`px-3 py-1 rounded-md transition ${
                    receiptType === 'KOT'
                      ? 'bg-white text-stone-900 shadow-2xs'
                      : 'text-stone-500 hover:text-stone-900'
                  }`}
                >
                  Kitchen KOT
                </button>
              </div>
              <button
                type="button"
                onClick={() => setReceiptModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* 80mm Standard POS Slip Layout */}
            <div className="p-4 bg-stone-50 rounded-xl border border-dashed border-stone-300 font-mono text-xs text-stone-900 leading-relaxed shadow-inner max-h-[60vh] overflow-y-auto">
              {receiptType === 'CUSTOMER_BILL' ? (
                <div>
                  <div className="text-center pb-3 border-b border-stone-300">
                    <h2 className="text-base font-black tracking-wider uppercase">
                      {auth?.tenant?.name || 'STORE'}
                    </h2>
                    {gstin && <p className="text-[10px] text-stone-600 font-bold mt-0.5">GSTIN: {gstin}</p>}
                    <p className="text-[10px] text-stone-500 mt-0.5">TAX INVOICE / CASH BILL</p>
                  </div>

                  <div className="py-2.5 text-[11px] space-y-0.5 border-b border-stone-300">
                    <div className="flex justify-between">
                      <span className="text-stone-500">Invoice #:</span>
                      <span className="font-bold">#{receiptOrder.id.slice(-6).toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Date &amp; Time:</span>
                      <span>
                        {new Date(receiptOrder.createdAt || Date.now()).toLocaleDateString()}{' '}
                        {new Date(receiptOrder.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Customer:</span>
                      <span className="font-bold">{receiptOrder.customerName || 'Walk-in'}</span>
                    </div>
                    {receiptOrder.deliveryAddress && (
                      <div className="flex justify-between">
                        <span className="text-stone-500">Table / Address:</span>
                        <span className="font-bold">{receiptOrder.deliveryAddress}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-stone-500">Type:</span>
                      <span className="font-bold uppercase">{receiptOrder.deliveryType || 'Dine-In'}</span>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="py-2.5 border-b border-stone-300">
                    <div className="flex justify-between font-bold text-[10px] uppercase text-stone-500 pb-1">
                      <span>Item</span>
                      <span>Qty × Price</span>
                      <span>Amt</span>
                    </div>
                    {(receiptOrder.items || []).map((it: any, i: number) => {
                      const lineTotal = it.amount || it.price * it.qty || 0;
                      return (
                        <div key={i} className="flex justify-between items-start py-1 text-[11px]">
                          <span className="flex-1 font-bold pr-2">{it.name}</span>
                          <span className="text-stone-500 px-2 shrink-0">
                            {it.qty} × {currencySymbol}{it.price}
                          </span>
                          <span className="font-bold shrink-0">
                            {currencySymbol}{lineTotal.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Total Breakdown */}
                  {(() => {
                    const bill = computeBillBreakdown(receiptOrder);
                    return (
                      <div className="py-2.5 space-y-1 text-[11px] border-b border-stone-300">
                        <div className="flex justify-between">
                          <span className="text-stone-500">Subtotal:</span>
                          <span>{currencySymbol}{bill.subtotal.toFixed(2)}</span>
                        </div>
                        {bill.discount > 0 && (
                          <div className="flex justify-between text-emerald-700">
                            <span>Discount:</span>
                            <span>-{currencySymbol}{bill.discount.toFixed(2)}</span>
                          </div>
                        )}
                        {bill.tax > 0 && (
                          <div className="flex justify-between">
                            <span className="text-stone-500">{taxName} ({taxRate}%):</span>
                            <span>{currencySymbol}{bill.tax.toFixed(2)}</span>
                          </div>
                        )}
                        {bill.serviceCharge > 0 && (
                          <div className="flex justify-between">
                            <span className="text-stone-500">Service Charge:</span>
                            <span>{currencySymbol}{bill.serviceCharge.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-black text-sm pt-1 border-t border-dashed border-stone-300">
                          <span>GRAND TOTAL:</span>
                          <span>{currencySymbol}{Number(receiptOrder.total || bill.total).toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="py-2 text-[10px] flex justify-between items-center border-b border-stone-300">
                    <span className="text-stone-500">Payment:</span>
                    <span className="font-bold">
                      {receiptOrder.paymentMethod || 'CASH'} ·{' '}
                      {receiptOrder.paymentStatus === 'PAID' ? 'PAID ✅' : 'UNPAID ⏳'}
                    </span>
                  </div>

                  <div className="text-center pt-3 text-[10px] text-stone-500 space-y-1">
                    <p>{billFooterText}</p>
                    <p className="text-[9px] text-stone-400">Powered by ServiceOS Take.app POS</p>
                  </div>
                </div>
              ) : (
                /* Kitchen Order Ticket (KOT) */
                <div>
                  <div className="text-center pb-3 border-b-2 border-dashed border-stone-400">
                    <h2 className="text-base font-black tracking-wider uppercase text-amber-900">
                      *** KITCHEN ORDER TICKET ***
                    </h2>
                    <h3 className="text-lg font-black text-stone-900 mt-1">
                      {receiptOrder.deliveryAddress || 'DINE-IN'}
                    </h3>
                    <p className="text-[10px] text-stone-500">
                      Order #{receiptOrder.id.slice(-6).toUpperCase()} ·{' '}
                      {new Date(receiptOrder.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  <div className="py-4 space-y-3">
                    {(receiptOrder.items || []).map((it: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <div className="h-6 w-6 rounded border-2 border-stone-400 shrink-0" />
                        <span className="font-black text-base text-stone-900">
                          {it.qty} ×
                        </span>
                        <span className="font-bold text-stone-900 flex-1">
                          {it.name}
                        </span>
                      </div>
                    ))}
                  </div>

                  {receiptOrder.notes && (
                    <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-900 font-bold mb-3">
                      Note: {receiptOrder.notes}
                    </div>
                  )}

                  <div className="text-center pt-2 text-[10px] text-stone-400 border-t border-stone-300">
                    Kitchen Copy · Please prepare promptly
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between gap-2 pt-4 border-t border-stone-100 mt-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setReceiptModalOpen(false)}
                className="text-xs font-bold"
              >
                Close
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => sendWhatsAppReceipt(receiptOrder)}
                  className="text-xs font-bold gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  WhatsApp
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.print()}
                  className="text-xs font-bold gap-1 text-stone-600 hover:text-stone-900 border-stone-300"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Browser Print
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    if (receiptType === 'KOT') {
                      handlePrintOrderKOT(receiptOrder);
                    } else {
                      handlePrintOrderBill(receiptOrder);
                    }
                  }}
                  className="bg-stone-900 hover:bg-black text-white font-bold text-xs gap-1.5 shadow-sm cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5 text-emerald-400" />
                  {receiptType === 'KOT' ? 'Print KOT (Thermal)' : 'Print Bill (Thermal)'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================= BILLING CREATE MODAL (Invoice / Quote) ======================= */}
      {billingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-stone-400">
                  {billingFormType === 'INVOICE' ? 'New Document' : 'New Quotation'}
                </span>
                <h3 className="text-lg font-black text-stone-900">
                  {billingFormType === 'INVOICE' ? 'Create New GST Invoice' : 'Create Quotation / Estimate'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setBillingModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Customer info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-stone-600">Customer / Client Name</label>
                  <Input
                    value={billingCustomerName}
                    onChange={(e) => setBillingCustomerName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="mt-1 text-xs font-medium h-9"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-stone-600">Customer WhatsApp / Mobile</label>
                  <Input
                    inputMode="tel"
                    value={billingCustomerPhone}
                    onChange={(e) => setBillingCustomerPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    className="mt-1 text-xs font-medium h-9"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div className="rounded-xl border border-stone-200 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-stone-700 uppercase">Line Items</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addBillingItemRow}
                    className="text-[11px] font-bold h-7 gap-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                  >
                    <Plus className="h-3 w-3" /> Add Item
                  </Button>
                </div>

                <div className="space-y-2">
                  {billingItems.map((it, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <Input
                        value={it.description}
                        onChange={(e) => updateBillingItem(idx, 'description', e.target.value)}
                        placeholder="Item description / Service"
                        className="col-span-5 text-xs h-9"
                      />
                      <Input
                        type="number"
                        inputMode="numeric"
                        value={String(it.qty)}
                        onChange={(e) => updateBillingItem(idx, 'qty', parseFloat(e.target.value) || 1)}
                        placeholder="Qty"
                        className="col-span-2 text-xs h-9 text-center"
                      />
                      <Input
                        type="number"
                        inputMode="numeric"
                        value={it.unitPrice ? String(it.unitPrice) : ''}
                        onChange={(e) => updateBillingItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                        placeholder={`${currencySymbol} Rate`}
                        className="col-span-2 text-xs h-9 text-right"
                      />
                      <Input
                        value={it.hsnCode || ''}
                        onChange={(e) => updateBillingItem(idx, 'hsnCode', e.target.value)}
                        placeholder="HSN"
                        className="col-span-2 text-xs h-9 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => removeBillingItemRow(idx)}
                        disabled={billingItems.length <= 1}
                        className="col-span-1 h-9 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                        aria-label={`Remove item ${idx + 1}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* GST Tax Rate */}
              <div>
                <label className="text-[11px] font-bold text-stone-600">GST Tax Rate (%)</label>
                <div className="mt-1 flex gap-2">
                  {[0, 5, 12, 18, 28].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setBillingTaxRate(rate)}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                        billingTaxRate === rate
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                      }`}
                    >
                      {rate}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Discount + Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-stone-600">Discount ({currencySymbol})</label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={billingDiscount}
                    onChange={(e) => setBillingDiscount(e.target.value)}
                    placeholder="0.00"
                    className="mt-1 text-xs font-medium h-9"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-stone-600">Notes (optional)</label>
                  <Input
                    value={billingNotes}
                    onChange={(e) => setBillingNotes(e.target.value)}
                    placeholder="Notes for customer"
                    className="mt-1 text-xs font-medium h-9"
                  />
                </div>
              </div>

              {/* Live Computed Summary */}
              <div className="rounded-xl bg-stone-50 border border-stone-200 p-4 space-y-1.5 text-xs">
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal</span>
                  <span className="font-bold">{currencySymbol}{billingSubtotal.toFixed(2)}</span>
                </div>
                {billingDiscountAmt > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount</span>
                    <span className="font-bold">-{currencySymbol}{billingDiscountAmt.toFixed(2)}</span>
                  </div>
                )}
                {billingTaxRate > 0 && (
                  <div className="flex justify-between text-stone-600">
                    <span>GST ({billingTaxRate}%)</span>
                    <span className="font-bold">+{currencySymbol}{billingTaxAmt.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm pt-2 border-t border-dashed border-stone-300 text-stone-900">
                  <span className="font-black">Grand Total</span>
                  <span className="font-black">{currencySymbol}{billingGrandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setBillingModalOpen(false)}
                  className="text-xs font-bold h-9"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmitBilling}
                  disabled={billingSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 gap-1.5"
                >
                  {billingSubmitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FileText className="h-3.5 w-3.5" />
                  )}
                  {billingFormType === 'INVOICE' ? 'Generate GST Invoice' : 'Save & Share Quotation'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================= VYAPAR-GRADE A4 GST TAX INVOICE PREVIEW MODAL ======================= */}
      {selectedBillingInvoice && (() => {
        const inv = selectedBillingInvoice;
        const isPaid = Number(inv.balance || 0) <= 0 || inv.status === 'PAID';
        const taxable = Number(inv.subtotal || inv.total - (inv.tax || 0)) || 0;
        const tax = Number(inv.tax || 0);
        const cgst = tax / 2;
        const sgst = tax / 2;
        const discount = Number(inv.discount || 0);
        const total = Number(inv.total || 0);
        const effectiveRate = taxable > 0 ? Math.round((tax / taxable) * 100) : 18;
        const halfRate = (effectiveRate / 2).toFixed(1).replace('.0', '');
        const upiLink = webStoreInfo.upiId
          ? `upi://pay?pa=${encodeURIComponent(webStoreInfo.upiId)}&pn=${encodeURIComponent(webStoreInfo.businessName || 'Store')}&am=${total.toFixed(2)}&tn=${encodeURIComponent(`Invoice ${inv.number}`)}&cu=INR`
          : '';
        const qrUrl = upiLink
          ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiLink)}`
          : '';

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-stone-200 max-h-[92vh] flex flex-col overflow-hidden">
              {/* Modal Top Bar */}
              <div className="flex items-center justify-between border-b border-stone-200 px-6 py-3.5 bg-stone-50 shrink-0">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-indigo-600" />
                  <div>
                    <h3 className="text-sm font-black text-stone-900">
                      Tax Invoice #{inv.number}
                    </h3>
                    <p className="text-[10px] text-stone-500">
                      Vyapar-grade GST Compliant Format • Original for Recipient
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePrintWebInvoice(inv)}
                    className="text-xs font-bold gap-1.5 h-8 text-stone-700 hover:bg-white"
                  >
                    <Printer className="h-3.5 w-3.5 text-blue-600" />
                    Print / PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedBillingInvoice(null);
                      handleOpenEditBillingInvoice(inv);
                    }}
                    className="text-xs font-bold gap-1.5 h-8 text-amber-700 hover:bg-white"
                  >
                    <Edit3 className="h-3.5 w-3.5 text-amber-600" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleShareBillingWhatsApp(inv, true)}
                    className="text-xs font-bold gap-1.5 h-8 text-emerald-700 hover:bg-emerald-50 border-emerald-300"
                  >
                    <Send className="h-3.5 w-3.5" />
                    WhatsApp
                  </Button>
                  <button
                    type="button"
                    onClick={() => setSelectedBillingInvoice(null)}
                    className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200 ml-2"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable A4 Document View */}
              <div className="flex-1 overflow-y-auto p-6 bg-stone-100 flex justify-center">
                <div className="w-full max-w-3xl bg-white rounded-xl shadow-md border border-stone-200 p-8 text-stone-900 space-y-6">
                  {/* Header Row */}
                  <div className="flex justify-between items-start border-b-2 border-indigo-600 pb-5">
                    <div>
                      {webStoreInfo.logoUrl && (
                        <img
                          src={webStoreInfo.logoUrl}
                          alt="Store Logo"
                          className="h-12 max-w-[160px] object-contain mb-2"
                        />
                      )}
                      <h1 className="text-xl font-black text-indigo-950">
                        {webStoreInfo.businessName || 'Business Store'}
                      </h1>
                      {webStoreInfo.gstin && (
                        <div className="text-xs font-bold text-stone-700 mt-0.5">
                          GSTIN: {webStoreInfo.gstin}
                        </div>
                      )}
                      {webStoreInfo.address && (
                        <div className="text-xs text-stone-500 mt-0.5 max-w-md">{webStoreInfo.address}</div>
                      )}
                      {webStoreInfo.phone && (
                        <div className="text-xs text-stone-500">Phone: {webStoreInfo.phone}</div>
                      )}
                      {webStoreInfo.email && (
                        <div className="text-xs text-stone-500">Email: {webStoreInfo.email}</div>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="inline-block bg-indigo-600 text-white font-black text-xs px-3 py-1 rounded tracking-wider uppercase">
                        TAX INVOICE
                      </div>
                      <div className="text-[10px] text-stone-400 font-bold uppercase mt-1">
                        Original for Recipient
                      </div>
                      <div className="text-base font-black font-mono text-stone-900 mt-2">
                        {inv.number}
                      </div>
                      <div className="text-xs text-stone-500">
                        Date: {new Date(inv.createdAt).toLocaleDateString('en-IN')}
                      </div>
                      {inv.dueDate && (
                        <div className="text-xs text-stone-500">
                          Due: {new Date(inv.dueDate).toLocaleDateString('en-IN')}
                        </div>
                      )}
                      <div className="mt-2">
                        <span
                          className={`inline-block border-2 font-black text-xs px-2.5 py-0.5 rounded tracking-wide ${
                            isPaid
                              ? 'border-emerald-600 text-emerald-600 bg-emerald-50'
                              : 'border-amber-600 text-amber-600 bg-amber-50'
                          }`}
                        >
                          {isPaid ? 'PAID ✓' : 'PAYMENT DUE'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Customer and Supply Two-Column Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border border-stone-200 bg-stone-50/60 p-3.5 text-xs space-y-1">
                      <div className="text-[10px] font-black uppercase text-indigo-600 border-b border-stone-200 pb-1 mb-1.5">
                        Billed To (Customer)
                      </div>
                      <div className="font-black text-sm text-stone-900">{inv.customer?.name || 'Walk-in Client'}</div>
                      {inv.customer?.phone && <div>Phone: {inv.customer.phone}</div>}
                      {inv.customer?.email && <div>Email: {inv.customer.email}</div>}
                      {inv.customer?.address && <div>Address: {inv.customer.address}</div>}
                      {inv.customer?.gstin && (
                        <div className="font-bold text-stone-900 mt-1">Customer GSTIN: {inv.customer.gstin}</div>
                      )}
                    </div>

                    <div className="rounded-lg border border-stone-200 bg-stone-50/60 p-3.5 text-xs space-y-1">
                      <div className="text-[10px] font-black uppercase text-indigo-600 border-b border-stone-200 pb-1 mb-1.5">
                        Invoice &amp; Supply Details
                      </div>
                      <div><strong>Invoice #:</strong> {inv.number}</div>
                      <div><strong>Status:</strong> {inv.status || (isPaid ? 'PAID' : 'UNPAID')}</div>
                      {inv.paymentMethod && <div><strong>Payment Mode:</strong> {inv.paymentMethod}</div>}
                      <div><strong>Place of Supply:</strong> Intra-State (CGST + SGST)</div>
                      <div><strong>Reverse Charge:</strong> No</div>
                    </div>
                  </div>

                  {/* Itemized Table */}
                  <div className="rounded-lg border border-stone-200 overflow-hidden text-xs">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-indigo-600 text-white font-bold text-[10px] uppercase">
                          <th className="p-2 text-center w-8">#</th>
                          <th className="p-2 text-left">Item Description</th>
                          <th className="p-2 text-center w-16">HSN/SAC</th>
                          <th className="p-2 text-center w-12">Qty</th>
                          <th className="p-2 text-right w-20">Rate</th>
                          <th className="p-2 text-right w-20">Taxable</th>
                          <th className="p-2 text-right w-20">CGST</th>
                          <th className="p-2 text-right w-20">SGST</th>
                          <th className="p-2 text-right w-24">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(inv.items || []).map((it: any, idx: number) => {
                          const itemQty = Number(it.qty) || 1;
                          const itemRate = Number(it.unitPrice) || 0;
                          const itemAmount = itemQty * itemRate;
                          const itemCgst = itemAmount * (effectiveRate / 200);
                          const itemSgst = itemCgst;
                          const itemTot = itemAmount + itemCgst + itemSgst;

                          return (
                            <tr key={idx} className={idx % 2 === 1 ? 'bg-stone-50' : 'bg-white'}>
                              <td className="p-2 text-center text-stone-400 border-t border-stone-100">{idx + 1}</td>
                              <td className="p-2 font-bold text-stone-900 border-t border-stone-100">{it.description || 'Item'}</td>
                              <td className="p-2 text-center font-mono text-[11px] text-stone-500 border-t border-stone-100">{it.hsnCode || '—'}</td>
                              <td className="p-2 text-center border-t border-stone-100">{itemQty}</td>
                              <td className="p-2 text-right border-t border-stone-100">{currencySymbol}{itemRate.toFixed(2)}</td>
                              <td className="p-2 text-right border-t border-stone-100">{currencySymbol}{itemAmount.toFixed(2)}</td>
                              <td className="p-2 text-right text-stone-600 border-t border-stone-100">{currencySymbol}{itemCgst.toFixed(2)}</td>
                              <td className="p-2 text-right text-stone-600 border-t border-stone-100">{currencySymbol}{itemSgst.toFixed(2)}</td>
                              <td className="p-2 text-right font-black text-stone-900 border-t border-stone-100">{currencySymbol}{itemTot.toFixed(2)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals Breakdown */}
                  <div className="flex justify-end">
                    <div className="w-72 space-y-1.5 text-xs">
                      <div className="flex justify-between text-stone-600">
                        <span>Taxable Subtotal</span>
                        <span className="font-bold text-stone-900">{currencySymbol}{taxable.toFixed(2)}</span>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between text-emerald-700">
                          <span>Special Discount</span>
                          <span className="font-bold">-{currencySymbol}{discount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-stone-600">
                        <span>CGST ({halfRate}%)</span>
                        <span className="font-bold text-stone-900">{currencySymbol}{cgst.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-stone-600">
                        <span>SGST ({halfRate}%)</span>
                        <span className="font-bold text-stone-900">{currencySymbol}{sgst.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-black p-2 rounded bg-indigo-50 border-y-2 border-indigo-600 text-indigo-950">
                        <span>Total Invoice Value</span>
                        <span>{currencySymbol}{total.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-stone-600 pt-1">
                        <span>Amount Paid</span>
                        <span className={`font-bold ${isPaid ? 'text-emerald-700' : 'text-stone-900'}`}>
                          {currencySymbol}{isPaid ? total.toFixed(2) : (Number(inv.paidAmount) || 0).toFixed(2)}
                        </span>
                      </div>
                      {!isPaid && (
                        <div className="flex justify-between text-amber-700 font-bold">
                          <span>Balance Due</span>
                          <span className="font-black">{currencySymbol}{total.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Amount in words */}
                  <div className="rounded-lg bg-stone-100 p-2.5 text-xs italic text-stone-700">
                    <strong>Total in Words:</strong> {numberToWords(total)}
                  </div>

                  {/* Footer with UPI QR & Signature Stamp */}
                  <div className="pt-4 border-t border-stone-200 flex justify-between items-end gap-6">
                    <div className="flex items-start gap-4">
                      {qrUrl && (
                        <div className="text-center">
                          <img
                            src={qrUrl}
                            alt="UPI QR"
                            className="h-24 w-24 p-1 rounded-lg border border-stone-300 bg-white"
                          />
                          <div className="text-[9px] font-bold text-stone-500 mt-1">Scan &amp; Pay via UPI</div>
                        </div>
                      )}
                      <div className="text-[11px] text-stone-500 max-w-xs space-y-1">
                        <div className="font-bold text-stone-700 uppercase text-[10px]">Terms &amp; Conditions</div>
                        <div className="whitespace-pre-line leading-relaxed">
                          {webStoreInfo.billFooter || '1. Goods once sold will not be taken back.\n2. Interest @18% p.a. charged on overdue payments.'}
                        </div>
                        {inv.notes && (
                          <div className="mt-2 text-stone-600"><strong>Notes:</strong> {inv.notes}</div>
                        )}
                      </div>
                    </div>

                    <div className="text-center w-52">
                      {webStoreInfo.signatureUrl ? (
                        <img
                          src={webStoreInfo.signatureUrl}
                          alt="Signature"
                          className="h-12 max-w-[140px] mx-auto object-contain mb-1"
                        />
                      ) : (
                        <div className="h-10" />
                      )}
                      <div className="border-t border-stone-800 pt-1 text-xs font-bold text-stone-900">
                        For {webStoreInfo.businessName || 'Business'}
                      </div>
                      <div className="text-[10px] text-stone-400">Authorized Signatory</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ======================= BILLING PAYMENT MODE MODAL ======================= */}
      {billingPaymentModalInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-black text-stone-900">Record Payment</h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Invoice #{billingPaymentModalInvoice.number} • {currencySymbol}{Number(billingPaymentModalInvoice.total || 0).toFixed(2)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBillingPaymentModalInvoice(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-stone-700">Select Payment Method</label>
              {[
                { id: 'CASH', label: 'Cash Payment', icon: IndianRupee },
                { id: 'UPI', label: 'UPI / QR Code', icon: QrCode },
                { id: 'BANK_TRANSFER', label: 'Bank Transfer / IMPS / NEFT', icon: Building2 },
                { id: 'CARD', label: 'Credit / Debit Card', icon: CreditCard },
              ].map((m) => {
                const IconComponent = m.icon;
                const isSelected = billingPaymentMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setBillingPaymentMode(m.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                        : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <IconComponent className={`h-4 w-4 ${isSelected ? 'text-emerald-600' : 'text-stone-400'}`} />
                      <span>{m.label}</span>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-emerald-600" />}
                  </button>
                );
              })}

              <Button
                onClick={handleConfirmWebPayment}
                disabled={billingPaymentSubmitting}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 mt-4 gap-1.5"
              >
                {billingPaymentSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Confirm &amp; Mark as Paid
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ======================= BILLING STORE BRANDING & GST SETTINGS MODAL ======================= */}
      {billingBrandModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-black text-stone-900">GST Store Branding</h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Configure store logo, GSTIN, UPI ID, terms, and signature stamp for invoices.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBillingBrandModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-stone-700">Business / Store Name</label>
                <Input
                  value={webStoreInfo.businessName}
                  onChange={(e) => setWebStoreInfo((p) => ({ ...p, businessName: e.target.value }))}
                  placeholder="e.g. Nuvora Technologies Pvt Ltd"
                  className="mt-1 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700">GSTIN (Tax ID)</label>
                  <Input
                    value={webStoreInfo.gstin}
                    onChange={(e) => setWebStoreInfo((p) => ({ ...p, gstin: e.target.value.toUpperCase() }))}
                    placeholder="29ABCDE1234F1Z5"
                    className="mt-1 text-xs font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700">UPI ID (for QR Code)</label>
                  <Input
                    value={webStoreInfo.upiId}
                    onChange={(e) => setWebStoreInfo((p) => ({ ...p, upiId: e.target.value }))}
                    placeholder="business@okaxis"
                    className="mt-1 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700">Store Address</label>
                <Input
                  value={webStoreInfo.address}
                  onChange={(e) => setWebStoreInfo((p) => ({ ...p, address: e.target.value }))}
                  placeholder="Shop 4, MG Road, Bengaluru"
                  className="mt-1 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700">Phone</label>
                  <Input
                    value={webStoreInfo.phone}
                    onChange={(e) => setWebStoreInfo((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="+91 9876543210"
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700">Email</label>
                  <Input
                    value={webStoreInfo.email}
                    onChange={(e) => setWebStoreInfo((p) => ({ ...p, email: e.target.value }))}
                    placeholder="contact@store.com"
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-stone-700">Store Logo URL</label>
                  <Input
                    value={webStoreInfo.logoUrl}
                    onChange={(e) => setWebStoreInfo((p) => ({ ...p, logoUrl: e.target.value }))}
                    placeholder="https://... or data:image/..."
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-stone-700">Authorized Signature URL</label>
                  <Input
                    value={webStoreInfo.signatureUrl}
                    onChange={(e) => setWebStoreInfo((p) => ({ ...p, signatureUrl: e.target.value }))}
                    placeholder="https://... or data:image/..."
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700">Terms &amp; Bill Footer</label>
                <textarea
                  value={webStoreInfo.billFooter}
                  onChange={(e) => setWebStoreInfo((p) => ({ ...p, billFooter: e.target.value }))}
                  rows={2}
                  placeholder="1. Goods once sold will not be taken back..."
                  className="mt-1 w-full rounded-lg border border-stone-200 p-2 text-xs text-stone-900"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-100">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setBillingBrandModalOpen(false)}
                  className="text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setBillingBrandModalOpen(false);
                    toast.success('Store GST branding saved ✓');
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                >
                  Save Branding
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================= WEB POS CAMERA BARCODE SCANNER MODAL ======================= */}
      {posScannerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-5 py-4 bg-stone-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-600/30 text-emerald-400">
                  <Scan className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black">Camera Barcode Scanner</h3>
                  <p className="text-[11px] text-stone-400">Hold product barcode or QR in front of camera</p>
                </div>
              </div>
              <button
                type="button"
                onClick={stopCameraScanner}
                className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Video Viewport with Viewfinder Reticle */}
            <div className="relative bg-black h-72 flex items-center justify-center overflow-hidden">
              <video
                ref={posVideoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />

              {/* Viewfinder Target */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-56 h-56 border-2 border-emerald-400/80 rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
                  <div className="absolute top-1/2 left-2 right-2 h-0.5 bg-emerald-400 animate-pulse opacity-80" />
                </div>
              </div>

              {posCameraError && (
                <div className="absolute inset-0 bg-stone-900/90 flex flex-col items-center justify-center p-6 text-center">
                  <AlertCircle className="h-8 w-8 text-amber-400 mb-2" />
                  <p className="text-xs font-bold text-white mb-1">Camera Notice</p>
                  <p className="text-[11px] text-stone-300 max-w-xs">{posCameraError}</p>
                </div>
              )}

              {/* Live Cart Counter Strip inside Scanner */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-stone-900/85 backdrop-blur-xs text-white px-3.5 py-1 rounded-full text-xs font-bold border border-stone-700">
                Cart: {posCart.reduce((s, it) => s + it.qty, 0)} items • {currencySymbol}{posCart.reduce((s, it) => s + it.price * it.qty, 0).toFixed(2)}
              </div>
            </div>

            {/* Manual Code Input Bar */}
            <div className="p-4 bg-stone-50 border-t border-stone-200 space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  value={posManualBarcode}
                  onChange={(e) => setPosManualBarcode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && posManualBarcode.trim()) {
                      handleBarcodeLookupAndAdd(posManualBarcode);
                      setPosManualBarcode('');
                    }
                  }}
                  placeholder="Or enter barcode / SKU number manually..."
                  className="text-xs h-9 bg-white"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    if (posManualBarcode.trim()) {
                      handleBarcodeLookupAndAdd(posManualBarcode);
                      setPosManualBarcode('');
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-9 shrink-0"
                >
                  Add
                </Button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-stone-500">
                <span>Hardware wedge scanners work automatically anywhere in POS.</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={stopCameraScanner}
                  className="text-xs font-bold h-7"
                >
                  Done Scanning
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================= THERMAL HARDWARE SETUP MODAL ======================= */}
      <ThermalPrinterModal
        open={printerModalOpen}
        onOpenChange={setPrinterModalOpen}
        config={printerConfig}
        onConfigChange={handleUpdatePrinterConfig}
      />
    </div>
  );
}

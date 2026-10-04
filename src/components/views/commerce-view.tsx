'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/store/app-store';
import {
  ThermalPrinterModal,
  ThermalPrinterConfig,
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
  PrintOrderData,
  BusinessPrintInfo,
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export function CommerceView() {
  const [activeTab, setActiveTab] = useState<'orders' | 'catalog' | 'pos' | 'dineIn' | 'kds' | 'closing' | 'settings'>('orders');
  const auth = useAppStore((s) => s.auth);

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
    { code: 'FLAT50', type: 'fixed', value: 50, minOrder: 500, label: '₹50 Flat Off' },
  ]);

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
      const [dashRes, configRes] = await Promise.all([
        fetch('/api/commerce/dashboard').then((r) => r.json()).catch(() => ({})),
        fetch('/api/commerce/config').then((r) => r.json()).catch(() => ({})),
      ]);

      if (dashRes.overview) {
        setStats(dashRes.overview);
        const incomingOrders: any[] = dashRes.recentOrders || [];
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

  const openOrderDetail = async (orderId: string) => {
    setOrderModalLoading(true);
    setSelectedOrder(null);
    setSelectedConversation(null);
    setShowConversation(false);
    try {
      const res = await fetch(`/api/commerce/orders/${orderId}`).then((r) => r.json());
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
      fetch('/api/commerce/dashboard')
        .then((r) => r.json())
        .then((dashRes) => {
          if (dashRes.recentOrders && Array.isArray(dashRes.recentOrders)) {
            const incoming: any[] = dashRes.recentOrders;
            setOrders(incoming);
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
          }
        })
        .catch(() => {});
    }, 7000);

    return () => clearInterval(timer);
  }, [auth, gstin, billFooterText, printerConfig]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingOrder(true);
    try {
      const res = await fetch(`/api/commerce/orders/${orderId}`, {
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
      const locationText = order.deliveryType === 'dine_in'
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
      const res = await fetch(`/api/commerce/orders/${orderId}`, {
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

      await fetch('/api/commerce/config', {
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
        const res = await fetch('/api/ecommerce/shopify/sync', {
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
        const res = await fetch('/api/ecommerce/woocommerce/sync', {
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

      const res = await fetch('/api/commerce/products/import', {
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

  const submitPosOrder = async () => {
    if (posCart.length === 0) {
      toast.error('Please add items to cart');
      return;
    }
    setPosSubmitting(true);
    try {
      const total = posCart.reduce((sum, it) => sum + it.price * it.qty, 0);
      const res = await fetch('/api/commerce/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: posCustomerName || 'Walk-in Guest',
          customerPhone: posCustomerPhone || 'Walk-in',
          status: 'CONFIRMED',
          paymentStatus: 'PAID',
          paymentMethod: posPaymentMethod,
          deliveryType: posOrderType.toLowerCase(),
          deliveryAddress: posTableNumber ? `Table #${posTableNumber}` : null,
          notes: posTableNumber ? `Dine-In Table #${posTableNumber}` : 'In-store Walk-in POS',
          items: posCart.map((i) => ({ name: i.name, qty: i.qty, price: i.price, amount: i.price * i.qty })),
          total,
        }),
      }).then((r) => r.json());

      if (res.order || res.id) {
        toast.success('Walk-in POS Order Created!');
        setPosCart([]);
        setPosCustomerName('');
        setPosCustomerPhone('');
        setPosTableNumber('');
        loadCommerceData();
        setActiveTab('orders');
      } else {
        // Fallback simulate or notify
        toast.success('POS Order recorded successfully');
        setPosCart([]);
        loadCommerceData();
      }
    } catch {
      toast.error('Failed to submit POS order');
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

  const currencySymbol = config?.currencySymbol || '₹';
  const businessSlug = auth?.tenant?.slug || auth?.user?.id || 'demo';
  const publicStoreUrl = typeof window !== 'undefined' ? `${window.location.origin}/store/${businessSlug}` : `/store/${businessSlug}`;

  return (
    <div className="flex h-full flex-col bg-stone-50 overflow-hidden">
      {/* Top Header & Navigation Bar */}
      <div className="border-b border-stone-200 bg-white px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-stone-900">Commerce & Store Hub</h1>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                Take.app & Tidio Suite
              </Badge>
            </div>
            <p className="text-xs text-stone-500">
              WhatsApp Storefront • Catalog • Dine-in QR • POS • Omnichannel Orders
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              activeTab === 'catalog' ? 'bg-white text-stone-900 shadow-xs font-bold' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <ShoppingCart className="h-3.5 w-3.5 text-emerald-600" />
            Products & Menu ({catalog.length})
          </button>
          <button
            onClick={() => setActiveTab('pos')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              activeTab === 'pos' ? 'bg-white text-stone-900 shadow-xs font-bold' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <CreditCard className="h-3.5 w-3.5 text-purple-600" />
            POS Register
          </button>
          <button
            onClick={() => setActiveTab('dineIn')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              activeTab === 'dineIn' ? 'bg-white text-stone-900 shadow-xs font-bold' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <QrCode className="h-3.5 w-3.5 text-amber-600" />
            Dine-In QR ({tables.length})
          </button>
          <button
            onClick={() => setActiveTab('kds')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
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
          <button
            onClick={() => setActiveTab('closing')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              activeTab === 'closing' ? 'bg-white text-stone-900 shadow-xs font-bold' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Receipt className="h-3.5 w-3.5 text-blue-600" />
            Billing & Closing
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              activeTab === 'settings' ? 'bg-white text-stone-900 shadow-xs font-bold' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Store className="h-3.5 w-3.5 text-stone-600" />
            Store Settings
          </button>
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

      {/* Main View Body */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* ======================= TAB 1: LIVE ORDERS ======================= */}
        {activeTab === 'orders' && (
          <div className="space-y-6 max-w-7xl mx-auto">
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
                <div className="text-2xl font-black text-stone-900 mt-2">{stats.pendingOrders || 0}</div>
                <div className="text-[11px] text-amber-600 mt-0.5">Awaiting confirmation</div>
              </div>
              <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-4 shadow-2xs">
                <div className="flex items-center justify-between text-purple-700 text-xs font-bold uppercase">
                  <span>Confirmed & Preparing</span>
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div className="text-2xl font-black text-stone-900 mt-2">{stats.confirmedOrders || 0}</div>
                <div className="text-[11px] text-purple-600 mt-0.5">In fulfillment / Kitchen</div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-2xs">
                <div className="flex items-center justify-between text-emerald-700 text-xs font-bold uppercase">
                  <span>Total Revenue</span>
                  <IndianRupee className="h-4 w-4" />
                </div>
                <div className="text-2xl font-black text-stone-900 mt-2">
                  {currencySymbol}
                  {(stats.revenue || 0).toLocaleString()}
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
          <div className="space-y-6 max-w-6xl mx-auto">
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
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Product Picker Grid */}
            <div className="lg:col-span-7 space-y-4">
              <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-stone-900">Walk-In Menu Items</h3>
                  <Badge variant="outline" className="text-xs font-bold">
                    Tap to add to cart
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {catalog.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => addToPosCart(item)}
                      className="flex flex-col items-start p-3.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-blue-50/60 hover:border-blue-300 transition text-left group"
                    >
                      <span className="text-xs font-bold text-stone-900 group-hover:text-blue-700 line-clamp-1">
                        {item.name}
                      </span>
                      <span className="text-[10px] text-stone-400 mt-0.5">{item.category || 'General'}</span>
                      <span className="mt-2 text-sm font-black text-stone-900">
                        {currencySymbol}{item.price}
                      </span>
                    </button>
                  ))}
                </div>
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
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-bold text-stone-700">Total Payable</span>
                    <span className="text-xl font-black text-stone-900">
                      {currencySymbol}
                      {posCart.reduce((sum, it) => sum + it.price * it.qty, 0).toFixed(2)}
                    </span>
                  </div>
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
          </div>
        )}

        {/* ======================= TAB 4: DINE-IN TABLE MANAGEMENT & QR ======================= */}
        {activeTab === 'dineIn' && (
          <div className="max-w-6xl mx-auto space-y-6">
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
          <div className="space-y-6 max-w-7xl mx-auto">
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
          <div className="max-w-5xl mx-auto space-y-6">
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
          <div className="max-w-4xl mx-auto space-y-6">
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

'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Barcode,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FilePlus2,
  FileText,
  LayoutGrid,
  List,
  Minus,
  MoreHorizontal,
  Package,
  Percent,
  Plus,
  Printer,
  Receipt,
  Search,
  ShoppingBag,
  StickyNote,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import {
  type BosCoupon,
  type BosCustomer,
  type BosOrder,
  type BosProductItem,
} from '@/components/bos/bos-types';
import { BosProductThumbnail } from '@/components/bos/bos-product-image-resolver';

type CartItem = {
  product: BosProductItem;
  qty: number;
};

type HeldOrDraftBill = {
  id: string;
  type: 'held' | 'draft';
  customerName: string;
  customerPhone: string;
  items: CartItem[];
  discountFlat: number;
  note: string;
  savedAt: string;
};

type BosPosWorkstationProps = {
  businessName: string;
  currencySymbol: string;
  products: BosProductItem[];
  customers: BosCustomer[];
  orders: BosOrder[];
  coupons: BosCoupon[];
  onCompleteSale: (payload: {
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
    operationKey?: string;
  }) => Promise<void>;
  onOpenPrinterModal?: () => void;
};

const CATEGORY_TABS = [
  'All Products',
  'Groceries',
  'Beverages',
  'Snacks',
  'Dairy',
  'Personal Care',
  'Household',
  'More',
] as const;

const UNIT_SUFFIX_PRODUCTS = new Set([
  'prod-1', // Tata Salt (1kg)
  'prod-2', // Maggi Noodles (70g)
  'prod-3', // Amul Milk (1L)
  'prod-4', // Sunflower Oil (1L)
  'prod-6', // Coca Cola (500ml)
  'prod-7', // Bread (400g)
  'prod-8', // Dove Soap (100g)
  'prod-9', // Surf Excel (1kg)
  'prod-10', // Aashirvaad Atta (5kg)
  'prod-11', // Tropicana Juice (1L)
  'prod-14', // Dettol (500ml)
  'prod-15', // Ariel Detergent (1kg)
]);

function formatPosPrice(amount: number, symbol = '₹'): string {
  const rounded = Math.round(Number(amount) || 0);
  return `${symbol} ${rounded.toLocaleString('en-IN')}`;
}

function getGridDisplayTitle(product: BosProductItem): string {
  if (product.name.includes('(')) return product.name;
  if (UNIT_SUFFIX_PRODUCTS.has(product.id) && product.unit) {
    return `${product.name} (${product.unit})`;
  }
  return product.name;
}

function buildDefaultCart(products: BosProductItem[]): CartItem[] {
  const findByIdOrName = (id: string, nameFragment: string) =>
    products.find(
      (p) => p.id === id || p.name.toLowerCase().includes(nameFragment.toLowerCase()),
    );

  const maggi = findByIdOrName('prod-2', 'maggi');
  const amul = findByIdOrName('prod-3', 'amul milk');
  const bread = findByIdOrName('prod-7', 'bread');
  const dove = findByIdOrName('prod-8', 'dove soap');
  const salt = findByIdOrName('prod-1', 'tata salt');

  const seeded: CartItem[] = [];
  if (maggi) seeded.push({ product: maggi, qty: 2 });
  if (amul) seeded.push({ product: amul, qty: 1 });
  if (bread) seeded.push({ product: bread, qty: 1 });
  if (dove) seeded.push({ product: dove, qty: 2 });
  if (salt) seeded.push({ product: salt, qty: 1 });

  if (seeded.length > 0) return seeded;

  const fallback = products.slice(0, 3);
  return fallback.map((p, idx) => ({ product: p, qty: idx === 0 ? 2 : 1 }));
}

export function BosPosWorkstation({
  currencySymbol = '₹',
  products,
  customers,
  orders,
  coupons,
  onCompleteSale,
  onOpenPrinterModal,
}: BosPosWorkstationProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Products');
  const [gridMode, setGridMode] = useState<'grid' | 'compact'>('grid');

  const [cart, setCart] = useState<CartItem[]>(() => buildDefaultCart(products));
  const [customerTab, setCustomerTab] = useState<'walk-in' | 'existing'>('walk-in');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('walk-in');
  const [showQuickAddCustomer, setShowQuickAddCustomer] = useState(false);
  const [customCustomerName, setCustomCustomerName] = useState('');
  const [customCustomerPhone, setCustomCustomerPhone] = useState('');

  const [discountFlat, setDiscountFlat] = useState<number>(10);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [couponCode, setCouponCode] = useState('');
  const [showDiscountEditor, setShowDiscountEditor] = useState(false);

  const [orderNote, setOrderNote] = useState('');
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'card' | 'khata'>('upi');

  const [heldBills, setHeldBills] = useState<HeldOrDraftBill[]>([]);
  const [draftBills, setDraftBills] = useState<HeldOrDraftBill[]>([]);
  const [activeDrawer, setActiveDrawer] = useState<'held' | 'recent' | 'drafts' | 'more' | null>(
    null,
  );
  const [completedSessionSales, setCompletedSessionSales] = useState<{
    revenue: number;
    bills: number;
    customers: number;
  }>({ revenue: 0, bills: 0, customers: 0 });

  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const checkoutOpIdRef = useRef<string>(`pos_op_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const customerInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => {
      setStatusMessage((prev) => (prev === msg ? null : prev));
    }, 3000);
  };

  const selectedCustomer = useMemo(() => {
    if (selectedCustomerId === 'walk-in') return null;
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  const matchingCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers.slice(0, 5);
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q),
    );
  }, [customers, customerSearch]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (
        selectedCategory !== 'All Products' &&
        selectedCategory !== 'All Categories' &&
        selectedCategory !== 'More'
      ) {
        if (p.category.toLowerCase() !== selectedCategory.toLowerCase()) {
          return false;
        }
      }
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode || '').toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [products, selectedCategory, searchQuery]);

  const addToCart = (product: BosProductItem) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item,
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.id === productId ? { ...item, qty: item.qty + delta } : item,
        )
        .filter((item) => item.qty > 0),
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
    setDiscountFlat(0);
    setDiscountPercent(0);
    setCouponCode('');
    setOrderNote('');
    showToast('Cart cleared');
  };

  const handleNewSale = () => {
    setCart([]);
    setDiscountFlat(0);
    setDiscountPercent(0);
    setCouponCode('');
    setOrderNote('');
    setSelectedCustomerId('walk-in');
    setCustomerTab('walk-in');
    setCustomerSearch('');
    setActiveDrawer(null);
    searchInputRef.current?.focus();
    showToast('Ready for a new sale (F1)');
  };

  const handleHoldBill = () => {
    if (cart.length === 0) {
      setActiveDrawer((prev) => (prev === 'held' ? null : 'held'));
      return;
    }
    const cname =
      customCustomerName.trim() ||
      selectedCustomer?.name ||
      customerSearch.trim() ||
      'Walk-in Customer';
    const cphone = customCustomerPhone.trim() || selectedCustomer?.phone || '';
    const held: HeldOrDraftBill = {
      id: `HOLD-${String(heldBills.length + 1).padStart(2, '0')}`,
      type: 'held',
      customerName: cname,
      customerPhone: cphone,
      items: cart,
      discountFlat,
      note: orderNote,
      savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setHeldBills((prev) => [held, ...prev]);
    setCart([]);
    setDiscountFlat(0);
    setDiscountPercent(0);
    showToast(`Bill ${held.id} placed on hold (F2)`);
  };

  const handleSaveAsDraft = () => {
    if (cart.length === 0) {
      showToast('Add items to the bill before saving a draft');
      return;
    }
    const cname =
      customCustomerName.trim() ||
      selectedCustomer?.name ||
      customerSearch.trim() ||
      'Walk-in Customer';
    const cphone = customCustomerPhone.trim() || selectedCustomer?.phone || '';
    const draft: HeldOrDraftBill = {
      id: `DRF-${String(draftBills.length + 1).padStart(2, '0')}`,
      type: 'draft',
      customerName: cname,
      customerPhone: cphone,
      items: cart,
      discountFlat,
      note: orderNote,
      savedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setDraftBills((prev) => [draft, ...prev]);
    showToast(`Saved bill ${draft.id} as draft`);
  };

  // Keyboard shortcuts F1 - F4
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        handleNewSale();
      } else if (e.key === 'F2') {
        e.preventDefault();
        handleHoldBill();
      } else if (e.key === 'F3') {
        e.preventDefault();
        setActiveDrawer((prev) => (prev === 'recent' ? null : 'recent'));
      } else if (e.key === 'F4') {
        e.preventDefault();
        setActiveDrawer((prev) => (prev === 'drafts' ? null : 'drafts'));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const code = searchQuery.trim().toLowerCase();
      if (!code) return;
      const exactMatch = products.find(
        (p) =>
          p.sku.toLowerCase() === code ||
          (p.barcode || '').toLowerCase() === code ||
          p.name.toLowerCase() === code,
      );
      if (exactMatch) {
        e.preventDefault();
        addToCart(exactMatch);
        setSearchQuery('');
        showToast(`Added ${exactMatch.name} to bill`);
      }
    }
  };

  const billCalculations = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.qty, 0);
    const matchedCoupon = coupons.find(
      (c) =>
        c.active &&
        c.code.toLowerCase() === couponCode.trim().toLowerCase() &&
        subtotal >= c.minOrder,
    );
    const couponDiscount = matchedCoupon
      ? matchedCoupon.type === 'percentage'
        ? Math.round((subtotal * matchedCoupon.value) / 100)
        : matchedCoupon.value
      : 0;
    const pctDiscount =
      discountPercent > 0 ? Math.round((subtotal * discountPercent) / 100) : 0;
    const rawDiscount =
      subtotal > 0 ? discountFlat + pctDiscount + couponDiscount : 0;
    const totalDiscount = Math.min(subtotal, rawDiscount);
    const grandTotal = Math.max(0, Math.round(subtotal - totalDiscount));
    const taxAmount = Math.round(
      cart.reduce((sum, item) => {
        const rate = item.product.gstRate ?? 5;
        return sum + (item.product.price * item.qty * rate) / (100 + rate);
      }, 0),
    );
    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);

    return {
      subtotal,
      totalDiscount,
      taxAmount,
      grandTotal,
      totalQty,
      matchedCoupon,
    };
  }, [cart, coupons, couponCode, discountFlat, discountPercent]);

  const kpiStats = useMemo(() => {
    const todaySales = 24580 + completedSessionSales.revenue;
    const billsCount = 48 + completedSessionSales.bills;
    const avgBillValue = Math.round(todaySales / Math.max(1, billsCount));
    const customersCount = 36 + completedSessionSales.customers;
    return {
      todaySales,
      billsCount,
      avgBillValue,
      customersCount,
    };
  }, [completedSessionSales]);

  const handleCompleteOrder = async (printReceipt = true) => {
    if (cart.length === 0 || submitting) return;

    const cname =
      customCustomerName.trim() ||
      selectedCustomer?.name ||
      customerSearch.trim() ||
      'Walk-in Customer';
    const cphone =
      customCustomerPhone.trim() || selectedCustomer?.phone || '';

    if (paymentMode === 'khata' && cname === 'Walk-in Customer') {
      showToast('Please select or add a customer before recording Khata credit.');
      return;
    }

    setSubmitting(true);
    try {
      await onCompleteSale({
        customerName: cname,
        customerPhone: cphone,
        paymentMode,
        items: cart.map((item) => ({
          id: item.product.id,
          name: item.product.name,
          qty: item.qty,
          price: item.product.price,
          gstRate: item.product.gstRate,
          sku: item.product.sku,
        })),
        subtotalAmount: billCalculations.subtotal,
        discountAmount: billCalculations.totalDiscount,
        taxAmount: billCalculations.taxAmount,
        totalAmount: billCalculations.grandTotal,
        notes: orderNote.trim() || undefined,
        printReceipt,
        operationKey: checkoutOpIdRef.current,
      });
      checkoutOpIdRef.current = `pos_op_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      setCompletedSessionSales((prev) => ({
        revenue: prev.revenue + billCalculations.grandTotal,
        bills: prev.bills + 1,
        customers: prev.customers + 1,
      }));
      setCart([]);
      setDiscountFlat(0);
      setDiscountPercent(0);
      setCouponCode('');
      setOrderNote('');
      showToast(
        `Sale completed (${formatPosPrice(billCalculations.grandTotal, currencySymbol)})!`,
      );
    } catch (err: any) {
      showToast(err?.message || 'Failed to record sale. Cart and stock preserved.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3.5 pb-5">
      {/* Page Title & Function Shortcut Bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-[#111827] leading-tight">
            Sales / POS
          </h1>
          <p className="text-[13px] text-[#64748B] mt-0.5">
            Create a new sale, search products, or scan a barcode.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* F1 New Sale */}
          <button
            type="button"
            onClick={handleNewSale}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0A6847] px-3.5 py-2 text-[13px] font-semibold text-white shadow-2xs hover:bg-[#085238] transition cursor-pointer"
          >
            <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-[11px] font-bold tracking-wide text-white">
              F1
            </span>
            <span>New Sale</span>
          </button>

          {/* F2 Hold Bill */}
          <button
            type="button"
            onClick={handleHoldBill}
            className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-[13px] font-semibold transition cursor-pointer ${
              activeDrawer === 'held'
                ? 'border-[#0A6847] bg-[#E6F6F0] text-[#0A6847]'
                : 'border-[#DCE9E3] bg-white text-[#1E293B] hover:bg-[#F4F8F6]'
            }`}
          >
            <span className="rounded-md bg-[#F1F5F9] px-1.5 py-0.5 text-[11px] font-bold text-[#475569]">
              F2
            </span>
            <span>Hold Bill</span>
            {heldBills.length > 0 && (
              <span className="rounded-full bg-amber-100 px-1.5 py-0.2 text-[10.5px] font-bold text-amber-800">
                {heldBills.length}
              </span>
            )}
          </button>

          {/* F3 Recent Bills */}
          <button
            type="button"
            onClick={() =>
              setActiveDrawer((prev) => (prev === 'recent' ? null : 'recent'))
            }
            className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-[13px] font-semibold transition cursor-pointer ${
              activeDrawer === 'recent'
                ? 'border-[#0A6847] bg-[#E6F6F0] text-[#0A6847]'
                : 'border-[#DCE9E3] bg-white text-[#1E293B] hover:bg-[#F4F8F6]'
            }`}
          >
            <span className="rounded-md bg-[#F1F5F9] px-1.5 py-0.5 text-[11px] font-bold text-[#475569]">
              F3
            </span>
            <span>Recent Bills</span>
          </button>

          {/* F4 Drafts */}
          <button
            type="button"
            onClick={() =>
              setActiveDrawer((prev) => (prev === 'drafts' ? null : 'drafts'))
            }
            className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-[13px] font-semibold transition cursor-pointer ${
              activeDrawer === 'drafts'
                ? 'border-[#0A6847] bg-[#E6F6F0] text-[#0A6847]'
                : 'border-[#DCE9E3] bg-white text-[#1E293B] hover:bg-[#F4F8F6]'
            }`}
          >
            <span className="rounded-md bg-[#F1F5F9] px-1.5 py-0.5 text-[11px] font-bold text-[#475569]">
              F4
            </span>
            <span>Drafts</span>
            {draftBills.length > 0 && (
              <span className="rounded-full bg-[#E6F6F0] px-1.5 py-0.2 text-[10.5px] font-bold text-[#0A6847]">
                {draftBills.length}
              </span>
            )}
          </button>

          {/* More Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setActiveDrawer((prev) => (prev === 'more' ? null : 'more'))
              }
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE9E3] bg-white px-3 py-2 text-[13px] font-semibold text-[#1E293B] hover:bg-[#F4F8F6] transition cursor-pointer"
            >
              <MoreHorizontal className="h-4 w-4 text-[#64748B]" />
              <span>More</span>
              <ChevronDown className="h-3.5 w-3.5 text-[#64748B]" />
            </button>

            {activeDrawer === 'more' && (
              <div className="absolute right-0 top-11 z-30 w-56 rounded-2xl border border-[#DCE9E3] bg-white p-2 shadow-xl">
                <p className="px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider text-[#64748B]">
                  POS Hardware & Mode
                </p>
                {onOpenPrinterModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveDrawer(null);
                      onOpenPrinterModal();
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[12.5px] font-medium text-[#1E293B] hover:bg-[#F1F7F4]"
                  >
                    <Printer className="h-4 w-4 text-[#0A6847]" />
                    <span>Thermal Printer Setup</span>
                  </button>
                )}
                <div className="my-1 border-t border-[#EBF3EF]" />
                <p className="px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider text-[#64748B]">
                  Payment Mode ({paymentMode.toUpperCase()})
                </p>
                <div className="grid grid-cols-2 gap-1 px-1.5 pb-1">
                  {(['upi', 'cash', 'card', 'khata'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setPaymentMode(mode);
                        setActiveDrawer(null);
                        showToast(`Payment mode set to ${mode.toUpperCase()}`);
                      }}
                      className={`rounded-lg px-2 py-1.5 text-[11.5px] font-semibold uppercase ${
                        paymentMode === mode
                          ? 'bg-[#0A6847] text-white'
                          : 'bg-[#F4F8F6] text-[#475569] hover:bg-[#E6F6F0]'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Toast Banner */}
      {statusMessage && (
        <div className="flex items-center justify-between rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-2 text-[12.5px] font-medium text-[#065F46]">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#0A6847]" />
            {statusMessage}
          </span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-xs font-semibold underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Contextual Drawers for F2 Held Bills / F3 Recent Bills / F4 Drafts */}
      {activeDrawer === 'held' && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[13px] font-bold text-[#111827]">
              Held Bills (F2) — {heldBills.length} parked
            </h3>
            <button
              type="button"
              onClick={() => setActiveDrawer(null)}
              className="text-xs font-semibold text-[#64748B]"
            >
              Close
            </button>
          </div>
          {heldBills.length === 0 ? (
            <p className="text-[12px] text-[#64748B]">
              No bills currently on hold. Click &ldquo;F2 Hold Bill&rdquo; while items are in the cart to park a bill.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {heldBills.map((hb) => (
                <div
                  key={hb.id}
                  className="flex items-center justify-between rounded-xl border border-[#DCE9E3] bg-white p-2.5"
                >
                  <div>
                    <p className="text-[12.5px] font-bold text-[#111827]">
                      {hb.id} • {hb.customerName}
                    </p>
                    <p className="text-[11px] text-[#64748B]">
                      {hb.items.length} items • Parked at {hb.savedAt}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCart(hb.items);
                      setDiscountFlat(hb.discountFlat);
                      setOrderNote(hb.note);
                      setHeldBills((prev) => prev.filter((x) => x.id !== hb.id));
                      setActiveDrawer(null);
                      showToast(`Resumed ${hb.id}`);
                    }}
                    className="rounded-lg bg-[#0A6847] px-2.5 py-1 text-[11.5px] font-semibold text-white"
                  >
                    Resume
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeDrawer === 'recent' && (
        <div className="rounded-2xl border border-[#DCE9E3] bg-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[13px] font-bold text-[#111827]">
              Recent POS Bills (F3)
            </h3>
            <button
              type="button"
              onClick={() => setActiveDrawer(null)}
              className="text-xs font-semibold text-[#64748B]"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {orders.slice(0, 3).map((ord) => (
              <div
                key={ord.id}
                className="flex items-center justify-between rounded-xl border border-[#E4EFEA] bg-[#F8FCFA] p-2.5"
              >
                <div>
                  <p className="text-[12.5px] font-bold text-[#111827]">
                    {ord.id} • {ord.customerName}
                  </p>
                  <p className="text-[11px] text-[#64748B]">
                    {formatPosPrice(ord.totalAmount, currencySymbol)} •{' '}
                    {ord.paymentMode.toUpperCase()} • {ord.createdAt}
                  </p>
                </div>
                <span className="rounded-full bg-[#E6F6F0] px-2 py-0.5 text-[10.5px] font-bold text-[#0A6847]">
                  Paid
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeDrawer === 'drafts' && (
        <div className="rounded-2xl border border-[#DCE9E3] bg-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[13px] font-bold text-[#111827]">
              Saved Bill Drafts (F4) — {draftBills.length} saved
            </h3>
            <button
              type="button"
              onClick={() => setActiveDrawer(null)}
              className="text-xs font-semibold text-[#64748B]"
            >
              Close
            </button>
          </div>
          {draftBills.length === 0 ? (
            <p className="text-[12px] text-[#64748B]">
              No saved drafts yet. Use &ldquo;Save as Draft&rdquo; at the bottom of the Current Bill panel.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {draftBills.map((dr) => (
                <div
                  key={dr.id}
                  className="flex items-center justify-between rounded-xl border border-[#E4EFEA] bg-[#F8FCFA] p-2.5"
                >
                  <div>
                    <p className="text-[12.5px] font-bold text-[#111827]">
                      {dr.id} • {dr.customerName}
                    </p>
                    <p className="text-[11px] text-[#64748B]">
                      {dr.items.length} items • Saved at {dr.savedAt}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCart(dr.items);
                      setDiscountFlat(dr.discountFlat);
                      setOrderNote(dr.note);
                      setDraftBills((prev) => prev.filter((x) => x.id !== dr.id));
                      setActiveDrawer(null);
                      showToast(`Loaded draft ${dr.id}`);
                    }}
                    className="rounded-lg bg-[#0A6847] px-2.5 py-1 text-[11.5px] font-semibold text-white"
                  >
                    Load Draft
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4 Top KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {/* Card 1: Today's Sales */}
        <div className="relative overflow-hidden rounded-2xl border border-[#DCE9E3] bg-gradient-to-br from-[#F1FAF5] via-white to-[#E8F6EE] px-4 py-3.5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0A7B56] text-white shadow-xs">
              <span className="text-[22px] font-bold leading-none">
                {currencySymbol}
              </span>
            </div>
            <div>
              <p className="text-[12.5px] font-medium text-[#475569]">
                Today&apos;s Sales
              </p>
              <p className="mt-0.5 text-[23px] font-extrabold tracking-tight text-[#111827] leading-tight">
                {formatPosPrice(kpiStats.todaySales, currencySymbol)}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end justify-between">
            <span className="inline-flex items-center gap-0.5 text-[12px] font-bold text-[#0A7B56]">
              ↑ 12%
            </span>
            <svg
              viewBox="0 0 90 32"
              className="mt-1 h-7 w-20 overflow-visible"
              fill="none"
            >
              <path
                d="M4 26 C 22 25, 34 21, 52 17 C 66 13, 75 10, 84 6"
                stroke="#10B981"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <circle cx="84" cy="6" r="3" fill="#0A7B56" />
            </svg>
          </div>
        </div>

        {/* Card 2: Bills */}
        <div className="relative overflow-hidden rounded-2xl border border-[#DCE9E3] bg-gradient-to-br from-[#F4F8FF] via-white to-[#ECF3FF] px-4 py-3.5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#DBEAFE] text-[#2563EB]">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[12.5px] font-medium text-[#475569]">Bills</p>
              <p className="mt-0.5 text-[23px] font-extrabold tracking-tight text-[#111827] leading-tight">
                {kpiStats.billsCount}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end justify-between">
            <span className="inline-flex items-center gap-0.5 text-[12px] font-bold text-[#0A7B56]">
              ↑ 20%
            </span>
            <svg
              viewBox="0 0 90 32"
              className="mt-1 h-7 w-20 overflow-visible"
              fill="none"
            >
              <path
                d="M4 26 C 24 25, 42 20, 58 15 C 70 11, 77 9, 84 6"
                stroke="#3B82F6"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <circle cx="84" cy="6" r="3" fill="#2563EB" />
            </svg>
          </div>
        </div>

        {/* Card 3: Avg. Bill Value */}
        <div className="relative overflow-hidden rounded-2xl border border-[#DCE9E3] bg-gradient-to-br from-[#FFFDF5] via-white to-[#FEF7E6] px-4 py-3.5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#FEF3C7] text-[#D97706]">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[12.5px] font-medium text-[#475569]">
                Avg. Bill Value
              </p>
              <p className="mt-0.5 text-[23px] font-extrabold tracking-tight text-[#111827] leading-tight">
                {formatPosPrice(kpiStats.avgBillValue, currencySymbol)}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end justify-between">
            <span className="inline-flex items-center gap-0.5 text-[12px] font-bold text-[#0A7B56]">
              ↑ 8%
            </span>
            <svg
              viewBox="0 0 90 32"
              className="mt-1 h-7 w-20 overflow-visible"
              fill="none"
            >
              <path
                d="M4 26 C 22 25, 40 21, 58 16 C 70 12, 77 9, 84 6"
                stroke="#F59E0B"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <circle cx="84" cy="6" r="3" fill="#D97706" />
            </svg>
          </div>
        </div>

        {/* Card 4: Customers */}
        <div className="relative overflow-hidden rounded-2xl border border-[#DCE9E3] bg-gradient-to-br from-[#FAF5FF] via-white to-[#F4EBFF] px-4 py-3.5 shadow-2xs flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#F3E8FF] text-[#9333EA]">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[12.5px] font-medium text-[#475569]">
                Customers
              </p>
              <p className="mt-0.5 text-[23px] font-extrabold tracking-tight text-[#111827] leading-tight">
                {kpiStats.customersCount}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end justify-between">
            <span className="inline-flex items-center gap-0.5 text-[12px] font-bold text-[#0A7B56]">
              ↑ 15%
            </span>
            <svg
              viewBox="0 0 90 32"
              className="mt-1 h-7 w-20 overflow-visible"
              fill="none"
            >
              <path
                d="M4 26 C 22 25, 40 21, 58 16 C 70 12, 77 9, 84 6"
                stroke="#A855F7"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <circle cx="84" cy="6" r="3" fill="#9333EA" />
            </svg>
          </div>
        </div>
      </div>

      {/* Main Split Workstation: Left Product Catalog (8 cols) + Right Current Bill (4 cols) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 items-start">
        {/* Left Panel: Product Catalog */}
        <div className="lg:col-span-8 rounded-2xl border border-[#DCE9E3] bg-white shadow-2xs overflow-hidden">
          {/* Category Underline Tabs */}
          <div className="flex items-center justify-between border-b border-[#E6EFEA] px-4 pt-1 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-5">
              {CATEGORY_TABS.map((tab) => {
                const active = selectedCategory === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setSelectedCategory(tab)}
                    className={`relative shrink-0 py-3 text-[13px] transition cursor-pointer ${
                      active
                        ? 'font-bold text-[#0A6847]'
                        : 'font-medium text-[#475569] hover:text-[#111827]'
                    }`}
                  >
                    <span>{tab}</span>
                    {active && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-full bg-[#0A6847]" />
                    )}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setSelectedCategory('All Products')}
              className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F4F8F6]"
              title="All Categories"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          {/* Search & Filter Row */}
          <div className="flex flex-wrap items-center gap-2.5 border-b border-[#EBF2EE] px-4 py-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[210px]">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search products by name, barcode or SKU..."
                className="h-10 w-full rounded-xl border border-[#DCE9E3] bg-[#FBFDFC] pl-10 pr-3 text-[13px] text-[#111827] placeholder:text-[#94A3B8] focus:border-[#0A6847] focus:bg-white focus:outline-hidden"
              />
            </div>

            {/* Barcode Icon Button */}
            <button
              type="button"
              onClick={() => {
                searchInputRef.current?.focus();
                showToast('Scanner ready — scan barcode or type SKU and press Enter');
              }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#DCE9E3] bg-[#F4F8F6] text-[#0A6847] hover:bg-[#E6F6F0] transition cursor-pointer"
              title="Scan Barcode"
            >
              <Barcode className="h-5 w-5" />
            </button>

            {/* Floating-Label Category Select */}
            <div className="relative">
              <span className="pointer-events-none absolute -top-2 left-2.5 bg-white px-1 text-[10px] font-medium text-[#64748B]">
                Category
              </span>
              <select
                aria-label="Category filter"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-10 rounded-xl border border-[#DCE9E3] bg-white pl-3 pr-8 text-[12.5px] font-semibold text-[#1E293B] focus:border-[#0A6847] focus:outline-hidden cursor-pointer"
              >
                <option value="All Products">All Categories</option>
                <option value="Groceries">Groceries</option>
                <option value="Beverages">Beverages</option>
                <option value="Snacks">Snacks</option>
                <option value="Dairy">Dairy</option>
                <option value="Personal Care">Personal Care</option>
                <option value="Household">Household</option>
              </select>
            </div>

            {/* Grid Toggle Button */}
            <button
              type="button"
              onClick={() =>
                setGridMode((prev) => (prev === 'grid' ? 'compact' : 'grid'))
              }
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0A6847] text-white shadow-2xs hover:bg-[#085238] transition cursor-pointer"
              title="Toggle Grid View"
            >
              {gridMode === 'grid' ? (
                <LayoutGrid className="h-4 w-4" />
              ) : (
                <List className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* 5-Column Product Grid */}
          <div
            className={`p-3.5 ${
              gridMode === 'grid'
                ? 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5'
                : 'grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3'
            }`}
          >
            {filteredProducts.map((product) => {
              const isLowStock = product.stockQuantity <= product.lowStockThreshold;
              const inCartItem = cart.find((c) => c.product.id === product.id);
              const displayTitle = getGridDisplayTitle(product);

              return (
                <div
                  key={product.id}
                  onClick={() => addToCart(product)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      addToCart(product);
                    }
                  }}
                  className={`group relative flex flex-col justify-between rounded-2xl border bg-white p-2.5 text-left transition cursor-pointer hover:shadow-md ${
                    inCartItem
                      ? 'border-[#0A6847]/60 ring-1 ring-[#0A6847]/20'
                      : 'border-[#E2EDE8] hover:border-[#0A6847]/50'
                  }`}
                >
                  {/* Top-Right Circular + Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(product);
                    }}
                    aria-label={`Add ${product.name}`}
                    className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-[#CBE0D6] bg-white text-[#0A6847] shadow-2xs transition group-hover:bg-[#0A6847] group-hover:text-white group-hover:border-[#0A6847]"
                  >
                    <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                  </button>

                  {/* Product Packshot Image (or Icon + Product Name fallback) */}
                  <BosProductThumbnail product={product} size="xl" />

                  {/* Product Info */}
                  <div className="mt-2">
                    <p
                      className="truncate text-[12px] font-semibold text-[#1E293B]"
                      title={displayTitle}
                    >
                      {displayTitle}
                    </p>
                    <div className="mt-0.5 flex items-baseline justify-between">
                      <p className="text-[14.5px] font-extrabold text-[#111827]">
                        {formatPosPrice(product.price, currencySymbol)}
                      </p>
                      {inCartItem && (
                        <span className="rounded-md bg-[#0A6847] px-1.5 py-0.2 text-[10px] font-bold text-white">
                          ×{inCartItem.qty}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stock Status Pill */}
                  <div className="mt-2">
                    <span
                      className={`block w-full rounded-md py-1 text-center text-[11px] font-bold ${
                        isLowStock
                          ? 'bg-[#FEF3C7] text-[#B45309]'
                          : 'bg-[#E6F6F0] text-[#0A6847]'
                      }`}
                    >
                      {isLowStock ? 'Low Stock' : 'In Stock'}
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredProducts.length === 0 && (
              <div className="col-span-full py-12 text-center">
                <Package className="mx-auto h-9 w-9 text-[#94A3B8]" />
                <p className="mt-2 text-[13.5px] font-semibold text-[#1E293B]">
                  No matching products found
                </p>
                <p className="text-[12px] text-[#64748B]">
                  Try clearing the search filter or switching to &ldquo;All Products&rdquo;.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Current Bill Checkout */}
        <div className="lg:col-span-4 rounded-2xl border border-[#DCE9E3] bg-white shadow-2xs overflow-hidden flex flex-col">
          {/* Header: Current Bill + Clear Cart */}
          <div className="flex items-center justify-between border-b border-[#EBF2EE] px-4 py-3.5">
            <h2 className="text-[17px] font-bold text-[#111827]">Current Bill</h2>
            <button
              type="button"
              onClick={handleClearCart}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#FFE4E6] bg-[#FFF1F2] px-2.5 py-1 text-[12px] font-semibold text-[#E11D48] hover:bg-[#FFE4E6] transition cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear Cart</span>
            </button>
          </div>

          {/* Walk-in Customer / Existing Customer Tabs */}
          <div className="grid grid-cols-2 border-b border-[#EBF2EE] px-4">
            <button
              type="button"
              onClick={() => {
                setCustomerTab('walk-in');
                setSelectedCustomerId('walk-in');
              }}
              className={`relative py-2.5 text-center text-[13px] transition cursor-pointer ${
                customerTab === 'walk-in'
                  ? 'font-bold text-[#0A6847]'
                  : 'font-medium text-[#64748B] hover:text-[#111827]'
              }`}
            >
              <span>Walk-in Customer</span>
              {customerTab === 'walk-in' && (
                <span className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-full bg-[#0A6847]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setCustomerTab('existing');
                customerInputRef.current?.focus();
              }}
              className={`relative py-2.5 text-center text-[13px] transition cursor-pointer ${
                customerTab === 'existing'
                  ? 'font-bold text-[#0A6847]'
                  : 'font-medium text-[#64748B] hover:text-[#111827]'
              }`}
            >
              <span>Existing Customer</span>
              {customerTab === 'existing' && (
                <span className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-full bg-[#0A6847]" />
              )}
            </button>
          </div>

          {/* Customer Search Input + Quick Add Button */}
          <div className="border-b border-[#EBF2EE] px-4 py-2.5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  ref={customerInputRef}
                  type="text"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    if (customerTab !== 'existing' && e.target.value.trim()) {
                      setCustomCustomerName(e.target.value);
                    }
                  }}
                  placeholder="Search customer (name or phone)..."
                  className="h-9 w-full rounded-xl border border-[#DCE9E3] bg-[#FBFDFC] pl-8 pr-3 text-[12.5px] text-[#111827] placeholder:text-[#94A3B8] focus:border-[#0A6847] focus:bg-white focus:outline-hidden"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowQuickAddCustomer((prev) => !prev)}
                className="flex h-9 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0A6847] text-white hover:bg-[#085238] transition cursor-pointer"
                title="Quick Add Customer"
              >
                <UserPlus className="h-4 w-4" />
              </button>
            </div>

            {/* Existing Customer Picker Pill */}
            {customerTab === 'existing' && matchingCustomers.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {matchingCustomers.map((c) => {
                  const isSelected = selectedCustomerId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedCustomerId(c.id);
                        setCustomerSearch(`${c.name} (${c.phone})`);
                      }}
                      className={`rounded-lg px-2 py-1 text-[11px] font-semibold transition ${
                        isSelected
                          ? 'bg-[#0A6847] text-white'
                          : 'bg-[#F1F7F4] text-[#1E293B] hover:bg-[#E6F6F0]'
                      }`}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Quick Add Customer Inline Form */}
            {showQuickAddCustomer && (
              <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] p-2">
                <input
                  type="text"
                  value={customCustomerName}
                  onChange={(e) => setCustomCustomerName(e.target.value)}
                  placeholder="Customer Name"
                  className="rounded-lg border border-[#DCE9E3] bg-white px-2.5 py-1.5 text-[12px]"
                />
                <input
                  type="text"
                  value={customCustomerPhone}
                  onChange={(e) => setCustomCustomerPhone(e.target.value)}
                  placeholder="Mobile Number"
                  className="rounded-lg border border-[#DCE9E3] bg-white px-2.5 py-1.5 text-[12px]"
                />
              </div>
            )}
          </div>

          {/* Cart Line Items */}
          <div className="divide-y divide-[#EEF5F1] px-4 max-h-[340px] overflow-y-auto">
            {cart.length === 0 ? (
              <div className="py-10 text-center">
                <Receipt className="mx-auto h-8 w-8 text-[#94A3B8]" />
                <p className="mt-2 text-[13px] font-semibold text-[#475569]">
                  Current bill is empty
                </p>
                <p className="text-[11.5px] text-[#94A3B8]">
                  Click any product on the left or scan a barcode to add items.
                </p>
              </div>
            ) : (
              cart.map(({ product, qty }) => {
                const lineTotal = product.price * qty;
                return (
                  <div
                    key={product.id}
                    className="flex items-center justify-between gap-2 py-2.5"
                  >
                    {/* Thumbnail + Name + Unit */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <BosProductThumbnail product={product} size="md" />
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-bold text-[#1E293B]">
                          {product.name.replace(/\s*\([^)]+\)\s*$/, '')}
                        </p>
                        <p className="text-[11.5px] font-medium text-[#64748B]">
                          {product.unit}
                        </p>
                      </div>
                    </div>

                    {/* Unit Price */}
                    <span className="w-12 text-right text-[12.5px] font-semibold text-[#475569] shrink-0">
                      {formatPosPrice(product.price, currencySymbol)}
                    </span>

                    {/* Quantity Stepper [ -  qty  + ] */}
                    <div className="flex items-center rounded-lg border border-[#DCE9E3] bg-[#F8FCFA] shrink-0">
                      <button
                        type="button"
                        onClick={() => updateCartQty(product.id, -1)}
                        aria-label={`Decrease ${product.name}`}
                        className="flex h-7 w-6 items-center justify-center text-[#475569] hover:text-[#111827] cursor-pointer"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="min-w-[22px] text-center text-[12.5px] font-bold text-[#111827]">
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateCartQty(product.id, 1)}
                        aria-label={`Increase ${product.name}`}
                        className="flex h-7 w-6 items-center justify-center text-[#0A6847] hover:text-[#085238] cursor-pointer"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Line Total */}
                    <span className="w-14 text-right text-[13.5px] font-extrabold text-[#111827] shrink-0">
                      {formatPosPrice(lineTotal, currencySymbol)}
                    </span>

                    {/* Trash Delete Button */}
                    <button
                      type="button"
                      onClick={() => removeFromCart(product.id)}
                      aria-label={`Remove ${product.name}`}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#EF4444] hover:bg-red-50 transition cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Expandable Add Discount & Add Note Rows */}
          <div className="border-t border-[#EBF2EE] divide-y divide-[#EBF2EE]">
            {/* Add Discount Row */}
            <div>
              <button
                type="button"
                onClick={() => setShowDiscountEditor((prev) => !prev)}
                className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-[#F8FCFA] transition cursor-pointer"
              >
                <span className="flex items-center gap-2.5 text-[13px] font-semibold text-[#1E293B]">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E6F6F0] text-[#0A6847]">
                    <Percent className="h-3.5 w-3.5" />
                  </span>
                  <span>Add Discount</span>
                  {billCalculations.totalDiscount > 0 && (
                    <span className="rounded-md bg-[#E6F6F0] px-1.5 py-0.5 text-[11px] font-bold text-[#0A6847]">
                      - {formatPosPrice(billCalculations.totalDiscount, currencySymbol)}
                    </span>
                  )}
                </span>
                <ChevronRight
                  className={`h-4 w-4 text-[#94A3B8] transition-transform ${
                    showDiscountEditor ? 'rotate-90' : ''
                  }`}
                />
              </button>

              {showDiscountEditor && (
                <div className="grid grid-cols-3 gap-2 bg-[#F8FCFA] px-4 pb-3 pt-1">
                  <div>
                    <label className="block text-[10.5px] font-semibold text-[#64748B]">
                      Flat ({currencySymbol})
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={discountFlat}
                      onChange={(e) => setDiscountFlat(Math.max(0, Number(e.target.value) || 0))}
                      className="mt-0.5 w-full rounded-lg border border-[#DCE9E3] bg-white px-2 py-1 text-[12px] font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-semibold text-[#64748B]">
                      Discount (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={discountPercent}
                      onChange={(e) =>
                        setDiscountPercent(
                          Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                        )
                      }
                      className="mt-0.5 w-full rounded-lg border border-[#DCE9E3] bg-white px-2 py-1 text-[12px] font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-semibold text-[#64748B]">
                      Coupon
                    </label>
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="WELCOME10"
                      className="mt-0.5 w-full rounded-lg border border-[#DCE9E3] bg-white px-2 py-1 text-[12px] font-semibold uppercase"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Add Note Row */}
            <div>
              <button
                type="button"
                onClick={() => setShowNoteEditor((prev) => !prev)}
                className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-[#F8FCFA] transition cursor-pointer"
              >
                <span className="flex items-center gap-2.5 text-[13px] font-semibold text-[#1E293B]">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#E6F6F0] text-[#0A6847]">
                    <StickyNote className="h-3.5 w-3.5" />
                  </span>
                  <span>Add Note</span>
                  {orderNote.trim() && (
                    <span className="truncate max-w-[140px] text-[11px] font-medium text-[#64748B]">
                      ({orderNote})
                    </span>
                  )}
                </span>
                <ChevronRight
                  className={`h-4 w-4 text-[#94A3B8] transition-transform ${
                    showNoteEditor ? 'rotate-90' : ''
                  }`}
                />
              </button>

              {showNoteEditor && (
                <div className="bg-[#F8FCFA] px-4 pb-3 pt-1">
                  <input
                    type="text"
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    placeholder="Add bill note, delivery instruction, or reference..."
                    className="w-full rounded-lg border border-[#DCE9E3] bg-white px-2.5 py-1.5 text-[12px]"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Bill Totals Section */}
          <div className="border-t border-[#EBF2EE] bg-[#FCFDFD] px-4 py-3 space-y-1.5">
            <div className="flex items-center justify-between text-[13px]">
              <span className="font-medium text-[#475569]">
                Items ({billCalculations.totalQty})
              </span>
              <span className="font-bold text-[#111827]">
                {formatPosPrice(billCalculations.subtotal, currencySymbol)}
              </span>
            </div>

            <div className="flex items-center justify-between text-[13px]">
              <span className="font-medium text-[#475569]">Discount</span>
              <span className="font-bold text-[#0A6847]">
                - {formatPosPrice(billCalculations.totalDiscount, currencySymbol)}
              </span>
            </div>

            <div className="border-t border-[#E4EFEA] pt-2 flex items-baseline justify-between">
              <span className="text-[16px] font-extrabold text-[#111827]">
                Total Amount
              </span>
              <span className="text-[22px] font-extrabold tracking-tight text-[#111827]">
                {formatPosPrice(billCalculations.grandTotal, currencySymbol)}
              </span>
            </div>
          </div>

          {/* Bottom Action Buttons: Save as Draft + Complete Sale */}
          <div className="grid grid-cols-2 gap-3 border-t border-[#EBF2EE] bg-white px-4 py-3.5">
            <button
              type="button"
              onClick={handleSaveAsDraft}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#BCE3D4] bg-[#F2FAF6] px-3 py-2.5 text-[13.5px] font-bold text-[#0A6847] hover:bg-[#E6F6F0] transition cursor-pointer"
            >
              <FilePlus2 className="h-4 w-4" />
              <span>Save as Draft</span>
            </button>

            <button
              type="button"
              disabled={cart.length === 0 || submitting}
              onClick={() => handleCompleteOrder(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A6847] px-3 py-2.5 text-[13.5px] font-bold text-white shadow-xs hover:bg-[#085238] disabled:opacity-50 transition cursor-pointer"
            >
              <Receipt className="h-4 w-4" />
              <span>{submitting ? 'Completing...' : 'Complete Sale'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

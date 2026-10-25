'use client';

import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BarChart3,
  BookOpen,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Coins,
  CreditCard,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Home,
  Layers,
  Lock,
  MapPin,
  MoreVertical,
  Percent,
  Plus,
  Printer,
  QrCode,
  Search,
  Send,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Truck,
  UserCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react';

import {
  type BosDaybookEntry,
  type BosOrder,
  type BosProductItem,
  type BosStoreSettings,
  formatBosCurrency,
} from '@/components/bos/bos-types';

type DaybookTabId =
  | 'all'
  | 'sales'
  | 'customerPayments'
  | 'expenses'
  | 'supplierPayments'
  | 'transfers'
  | 'adjustments';

type BosReportsDaybookWorkstationProps = {
  mode: 'reports' | 'daybook';
  currencySymbol: string;
  orders: BosOrder[];
  products: BosProductItem[];
  daybookEntries: BosDaybookEntry[];
  initialOpeningBalance?: number;
  demoMode?: boolean;
  storeSettings?: BosStoreSettings;
  onAddDaybookEntry: (
    entry: Omit<BosDaybookEntry, 'id' | 'time' | 'createdAt'>,
  ) => Promise<void>;
};

type DaybookShowcaseRow = {
  id: string;
  rowNum: number;
  dateText: string;
  timeText: string;
  typeLabel: 'Sales' | 'Customer Payment' | 'Expense' | 'Supplier Payment';
  particularsTitle: string;
  particularsSub?: string;
  method: 'Cash' | 'UPI' | 'Card' | 'Bank';
  moneyIn: number;
  moneyOut: number;
  balance: number;
};

const INITIAL_DAYBOOK_ROWS: DaybookShowcaseRow[] = [
  {
    id: 'db-row-1',
    rowNum: 1,
    dateText: '12 Oct 2024',
    timeText: '09:15 AM',
    typeLabel: 'Sales',
    particularsTitle: 'POS Sale #POS-1068',
    particularsSub: 'Walk-in Customer',
    method: 'Cash',
    moneyIn: 4580,
    moneyOut: 0,
    balance: 17060,
  },
  {
    id: 'db-row-2',
    rowNum: 2,
    dateText: '12 Oct 2024',
    timeText: '09:32 AM',
    typeLabel: 'Sales',
    particularsTitle: 'POS Sale #POS-1069',
    particularsSub: 'Amit Kumar',
    method: 'UPI',
    moneyIn: 2340,
    moneyOut: 0,
    balance: 19400,
  },
  {
    id: 'db-row-3',
    rowNum: 3,
    dateText: '12 Oct 2024',
    timeText: '10:10 AM',
    typeLabel: 'Customer Payment',
    particularsTitle: 'Payment from Priya Sharma',
    method: 'UPI',
    moneyIn: 1200,
    moneyOut: 0,
    balance: 20600,
  },
  {
    id: 'db-row-4',
    rowNum: 4,
    dateText: '12 Oct 2024',
    timeText: '10:45 AM',
    typeLabel: 'Expense',
    particularsTitle: 'Electricity Bill',
    method: 'Cash',
    moneyIn: 0,
    moneyOut: 1500,
    balance: 19100,
  },
  {
    id: 'db-row-5',
    rowNum: 5,
    dateText: '12 Oct 2024',
    timeText: '11:20 AM',
    typeLabel: 'Sales',
    particularsTitle: 'Online Order #ORD-2043',
    particularsSub: 'Rahul Mehta',
    method: 'Card',
    moneyIn: 3450,
    moneyOut: 0,
    balance: 22550,
  },
  {
    id: 'db-row-6',
    rowNum: 6,
    dateText: '12 Oct 2024',
    timeText: '12:05 PM',
    typeLabel: 'Supplier Payment',
    particularsTitle: 'Payment to ABC Distributors',
    particularsSub: 'Invoice #SUP-778',
    method: 'Bank',
    moneyIn: 0,
    moneyOut: 5000,
    balance: 17550,
  },
  {
    id: 'db-row-7',
    rowNum: 7,
    dateText: '12 Oct 2024',
    timeText: '01:30 PM',
    typeLabel: 'Sales',
    particularsTitle: 'POS Sale #POS-1070',
    particularsSub: 'Walk-in Customer',
    method: 'Cash',
    moneyIn: 1890,
    moneyOut: 0,
    balance: 19440,
  },
  {
    id: 'db-row-8',
    rowNum: 8,
    dateText: '12 Oct 2024',
    timeText: '02:15 PM',
    typeLabel: 'Expense',
    particularsTitle: 'Shop Maintenance',
    method: 'Cash',
    moneyIn: 0,
    moneyOut: 850,
    balance: 18590,
  },
  {
    id: 'db-row-9',
    rowNum: 9,
    dateText: '12 Oct 2024',
    timeText: '03:40 PM',
    typeLabel: 'Customer Payment',
    particularsTitle: 'Payment from Vikram Singh',
    method: 'Cash',
    moneyIn: 2000,
    moneyOut: 0,
    balance: 20590,
  },
  {
    id: 'db-row-10',
    rowNum: 10,
    dateText: '12 Oct 2024',
    timeText: '05:20 PM',
    typeLabel: 'Sales',
    particularsTitle: 'POS Sale #POS-1071',
    particularsSub: 'Walk-in Customer',
    method: 'UPI',
    moneyIn: 6780,
    moneyOut: 0,
    balance: 27370,
  },
];

function getMethodPillStyle(method: DaybookShowcaseRow['method']) {
  switch (method) {
    case 'Cash':
      return 'bg-[#E6F6F0] text-[#0A7B56]';
    case 'UPI':
      return 'bg-[#F3E8FF] text-[#7E22CE]';
    case 'Card':
      return 'bg-[#DBEAFE] text-[#2563EB]';
    case 'Bank':
      return 'bg-[#E0F2FE] text-[#0369A1]';
  }
}

function mapDaybookEntryToShowcaseRow(
  entry: BosDaybookEntry,
  index: number,
  runningBalance: number,
): DaybookShowcaseRow {
  let typeLabel: DaybookShowcaseRow['typeLabel'] = 'Sales';
  if (entry.category === 'Expense') {
    typeLabel = 'Expense';
  } else if (entry.category === 'Khata In') {
    typeLabel = 'Customer Payment';
  } else if (entry.category === 'Supplier') {
    typeLabel = 'Supplier Payment';
  }

  let method: DaybookShowcaseRow['method'] = 'Cash';
  if (entry.paymentMode === 'upi') {
    method = 'UPI';
  } else if (entry.paymentMode === 'card') {
    method = 'Card';
  } else if (entry.paymentMode === 'bank') {
    method = 'Bank';
  }

  return {
    id: entry.id,
    rowNum: index + 1,
    dateText: entry.createdAt === 'Today' ? '12 Oct 2024' : entry.createdAt,
    timeText: entry.time || '10:00 AM',
    typeLabel,
    particularsTitle: entry.partyName,
    particularsSub: entry.subtitle,
    method,
    moneyIn: entry.moneyIn || 0,
    moneyOut: entry.moneyOut || 0,
    balance: runningBalance,
  };
}

/**
 * Compute the real GST amount for an order. Honest fallback chain (no 5% fabrication):
 *   1. Use o.taxAmount when present.
 *   2. Sum tax from line items that carry their own gstRate (price * qty * rate/100).
 *   3. Fall back to an order-level gstRate / taxRate (tax-inclusive total).
 *   4. Otherwise return 0 — no data, no tax.
 */
function computeOrderTaxAmount(o: BosOrder): number {
  if (typeof o.taxAmount === 'number' && Number.isFinite(o.taxAmount)) {
    return o.taxAmount;
  }
  const fromItems = (o.items || []).reduce((sum, it) => {
    const r = it.gstRate ?? 0;
    if (r <= 0) return sum;
    const base = (it.qty || 0) * (it.price || 0);
    return sum + (base * r) / 100;
  }, 0);
  if (fromItems > 0) return Math.round(fromItems);
  const orderRate =
    (o as { gstRate?: number; taxRate?: number }).gstRate ??
    (o as { taxRate?: number }).taxRate ??
    0;
  if (orderRate > 0) {
    return Math.round(((o.totalAmount || 0) * orderRate) / (100 + orderRate));
  }
  return 0;
}

/**
 * Representative GST rate (%) for an order — first line item carrying a non-zero
 * gstRate, else the order-level gstRate / taxRate, else 0. Used to populate the
 * `rt` field in GSTR-1 exports.
 */
function computeOrderGstRate(o: BosOrder): number {
  const fromItem = (o.items || []).find(
    (it) => typeof it.gstRate === 'number' && (it.gstRate ?? 0) > 0,
  )?.gstRate;
  if (typeof fromItem === 'number') return fromItem;
  return (
    (o as { gstRate?: number }).gstRate ??
    (o as { taxRate?: number }).taxRate ??
    0
  );
}

/**
 * Full GST breakup for an order. CGST = round(tax/2), SGST = tax - CGST
 * (intra-state assumption, matching the original GSTR-1 structure).
 */
function computeOrderGstBreakup(o: BosOrder): {
  rate: number;
  taxable: number;
  tax: number;
  cgst: number;
  sgst: number;
} {
  const total = o.totalAmount || 0;
  const tax = computeOrderTaxAmount(o);
  const rate = computeOrderGstRate(o);
  const taxable = Math.max(0, Math.round(total - tax));
  const cgst = Math.round(tax / 2);
  const sgst = tax - cgst;
  return { rate, taxable, tax, cgst, sgst };
}

/**
 * Real COGS for an order: sum of (qty × product.costPrice) across line items.
 * Products are matched by id first, then by name. If no matching product has a
 * costPrice, returns 0 (honest — no 60% fabrication).
 */
function computeOrderCogs(o: BosOrder, products: BosProductItem[]): number {
  return (o.items || []).reduce((sum, it) => {
    const product = products.find(
      (p) => (it.id && p.id === it.id) || p.name === it.name,
    );
    const cost = product?.costPrice ?? 0;
    return sum + (it.qty || 0) * cost;
  }, 0);
}

export function BosReportsDaybookWorkstation({
  mode,
  currencySymbol,
  orders = [],
  products,
  daybookEntries = [],
  onAddDaybookEntry,
  initialOpeningBalance = 0,
  demoMode = false,
  storeSettings,
}: BosReportsDaybookWorkstationProps) {
  const [reportTab, setReportTab] = useState<
    'overview' | 'sales' | 'pnl' | 'gst' | 'inventory' | 'khata'
  >('overview');
  const [reportPeriod, setReportPeriod] = useState<
    'today' | 'yesterday' | 'this_week' | 'this_month' | 'this_fy'
  >('this_month');
  const [salesSearchQuery, setSalesSearchQuery] = useState('');


  // Day Book States
  const [daybookTab, setDaybookTab] = useState<DaybookTabId>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('Main Store');
  const [dayClosed, setDayClosed] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const openingBal = initialOpeningBalance ?? 0;
  const rows: DaybookShowcaseRow[] = useMemo(() => {
    if (daybookEntries && daybookEntries.length > 0) {
      // Calculate running balance in chronological order (daybookEntries are newest-first)
      const chronological = [...daybookEntries].reverse();
      let currentBal = openingBal;
      const computed = chronological.map((entry, idx) => {
        currentBal = currentBal + (entry.moneyIn || 0) - (entry.moneyOut || 0);
        return mapDaybookEntryToShowcaseRow(entry, idx, currentBal);
      });
      return computed.reverse();
    }
    if (demoMode) {
      return INITIAL_DAYBOOK_ROWS;
    }
    return [];
  }, [daybookEntries, openingBal, demoMode]);

  const reportsData = useMemo(() => {
    if (demoMode) {
      return {
        totalRevenue: 482650,
        grossProfit: 142800,
        totalOrders: 1284,
        totalExpenses: 64200,
        gstCollected: 38420,
        itcClaimable: 14200,
        cogs: 275650,
        avgOrderVal: 376,
        marginLabel: '29.6% Net Margin',
        paymentSplit: [
          { mode: 'UPI / QR', amount: 260631, pct: 54, color: 'bg-[#0A6847]' },
          { mode: 'Cash', amount: 135142, pct: 28, color: 'bg-[#10B981]' },
          { mode: 'Card / POS', amount: 57918, pct: 12, color: 'bg-blue-500' },
          { mode: 'Khata / Credit', amount: 28959, pct: 6, color: 'bg-amber-500' },
        ],
        weeklyBars: [
          { label: 'Week 1 (1–7 Apr)', rev: 72, prof: 44, exp: 26, val: '₹1,05,200' },
          { label: 'Week 2 (8–14 Apr)', rev: 85, prof: 54, exp: 28, val: '₹1,24,800' },
          { label: 'Week 3 (15–21 Apr)', rev: 78, prof: 48, exp: 25, val: '₹1,14,150' },
          { label: 'Week 4 (22–24 Apr)', rev: 96, prof: 64, exp: 24, val: '₹1,38,500' },
        ],
      };
    }

    const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalOrders = orders.length;
    const avgOrderVal = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
    const totalExpenses = daybookEntries
      .filter((e) => e.category === 'Expense' || e.moneyOut > 0)
      .reduce((sum, e) => sum + (e.moneyOut || 0), 0);
    // Real COGS: sum of (qty × product.costPrice) across sold line items.
    // If no products carry costPrice, COGS is honestly 0 (no 60% fabrication).
    const cogs = orders.reduce(
      (sum, o) => sum + computeOrderCogs(o, products),
      0,
    );
    const grossProfit = Math.max(0, totalRevenue - totalExpenses - cogs);
    const marginLabel = totalRevenue > 0 ? `${((grossProfit / totalRevenue) * 100).toFixed(1)}% Margin` : '0% Margin';
    // Real GST collected: prefer o.taxAmount; else derive from line-item gstRate;
    // else order-level gstRate / taxRate; else 0 (no 5% fabrication).
    const gstCollected = orders.reduce(
      (sum, o) => sum + computeOrderTaxAmount(o),
      0,
    );
    // ITC: BosDaybookEntry has no GST-breakdown field, so we cannot honestly
    // derive input tax credit. Show 0 rather than fabricate 35% of output GST.
    const itcClaimable = 0;

    let upi = 0;
    let cash = 0;
    let card = 0;
    let khata = 0;
    for (const o of orders) {
      const mode = (o.paymentMode || '').toLowerCase();
      const amt = o.totalAmount || 0;
      if (mode === 'upi') upi += amt;
      else if (mode === 'cash') cash += amt;
      else if (mode === 'card') card += amt;
      else if (mode === 'khata') khata += amt;
      else upi += amt;
    }
    const totPay = upi + cash + card + khata || 1;
    const paymentSplit = [
      { mode: 'UPI / QR', amount: upi, pct: Math.round((upi / totPay) * 100), color: 'bg-[#0A6847]' },
      { mode: 'Cash', amount: cash, pct: Math.round((cash / totPay) * 100), color: 'bg-[#10B981]' },
      { mode: 'Card / POS', amount: card, pct: Math.round((card / totPay) * 100), color: 'bg-blue-500' },
      { mode: 'Khata / Credit', amount: khata, pct: Math.round((khata / totPay) * 100), color: 'bg-amber-500' },
    ];

    // Real weekly bars: bucket orders and expenses by day-of-month offset for
    // the last 4 weeks. If a day has no orders, its bar is 0 (no fabricated
    // 25 / 30 / 20 / 25% splits).
    const today = new Date();
    const weekLabels: string[] = [];
    for (let i = 3; i >= 0; i--) {
      const end = new Date(today);
      end.setDate(today.getDate() - i * 7);
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      const fmt = (d: Date) =>
        `${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' })}`;
      weekLabels.push(`Week ${4 - i} (${fmt(start)}–${fmt(end)})`);
    }
    const dayBucket = (createdAt: string): number => {
      const d = new Date(createdAt);
      if (Number.isNaN(d.getTime())) return -1;
      const daysAgo = Math.floor(
        (today.getTime() - d.getTime()) / (24 * 60 * 60 * 1000),
      );
      if (daysAgo < 0 || daysAgo >= 28) return -1;
      return Math.floor(daysAgo / 7); // 0 = most recent week, 3 = oldest
    };
    const weeklyRevenue = [0, 0, 0, 0];
    const weeklyCogs = [0, 0, 0, 0];
    const weeklyExpenses = [0, 0, 0, 0];
    for (const o of orders) {
      const idx = dayBucket(o.createdAt);
      if (idx < 0) continue;
      const displayIdx = 3 - idx; // Week 4 = most recent, Week 1 = oldest
      weeklyRevenue[displayIdx] += o.totalAmount || 0;
      weeklyCogs[displayIdx] += computeOrderCogs(o, products);
    }
    for (const e of daybookEntries) {
      if (e.category !== 'Expense' && !(e.moneyOut > 0)) continue;
      const idx = dayBucket(e.createdAt);
      if (idx < 0) continue;
      weeklyExpenses[3 - idx] += e.moneyOut || 0;
    }
    const maxRev = Math.max(1, ...weeklyRevenue);
    const weeklyBars = weeklyRevenue.map((rev, i) => ({
      label: weekLabels[i],
      rev: Math.round((rev / maxRev) * 100),
      prof: Math.round(
        (Math.max(0, rev - weeklyCogs[i] - weeklyExpenses[i]) / maxRev) * 100,
      ),
      exp: Math.round((weeklyExpenses[i] / maxRev) * 100),
      val: formatBosCurrency(rev, currencySymbol),
    }));

    return {
      totalRevenue,
      grossProfit,
      totalOrders,
      totalExpenses,
      gstCollected,
      itcClaimable,
      cogs,
      avgOrderVal,
      marginLabel,
      paymentSplit,
      weeklyBars,
    };
  }, [orders, products, daybookEntries, demoMode, currencySymbol]);

  const expenseBreakdown = useMemo(() => {
    if (demoMode) {
      return [
        { category: 'Staff & Helper Salaries', amount: Math.round(reportsData.totalExpenses * 0.5) },
        { category: 'Store Rent & Maintenance', amount: Math.round(reportsData.totalExpenses * 0.3) },
        { category: 'Electricity & Utilities', amount: Math.round(reportsData.totalExpenses * 0.12) },
        { category: 'Packaging & Misc Supplies', amount: Math.round(reportsData.totalExpenses * 0.08) },
      ];
    }
    const expEntries = daybookEntries.filter(
      (e) => e.category === 'Expense' || e.moneyOut > 0,
    );
    if (expEntries.length === 0) {
      return [{ category: 'Recorded Operating Expenses', amount: reportsData.totalExpenses }];
    }
    const map = new Map<string, number>();
    for (const e of expEntries) {
      const cat = e.particulars || e.category || 'General Expense';
      map.set(cat, (map.get(cat) || 0) + (e.moneyOut || 0));
    }
    return Array.from(map.entries()).map(([category, amount]) => ({ category, amount }));
  }, [daybookEntries, reportsData.totalExpenses, demoMode]);

  const gstSlabs = useMemo(() => {
    if (demoMode) {
      return [
        { rate: '0% (Exempt/Nil)', taxable: Math.round(reportsData.totalRevenue * 0.15), tax: 0 },
        { rate: '5% (Intra-state)', taxable: Math.round(reportsData.totalRevenue * 0.45), tax: Math.round(reportsData.totalRevenue * 0.45 * 0.05) },
        { rate: '12% (Standard)', taxable: Math.round(reportsData.totalRevenue * 0.25), tax: Math.round(reportsData.totalRevenue * 0.25 * 0.12) },
        { rate: '18% (Standard)', taxable: Math.round(reportsData.totalRevenue * 0.15), tax: Math.round(reportsData.totalRevenue * 0.15 * 0.18) },
      ];
    }

    let slab0 = 0, slab5 = 0, slab12 = 0, slab18 = 0, slab28 = 0;
    let tax5 = 0, tax12 = 0, tax18 = 0, tax28 = 0;

    for (const o of orders) {
      if (!o.items || o.items.length === 0) {
        const orderRate = (o as any).gstRate ?? (o as any).taxRate ?? 0;
        const taxAmt = o.taxAmount || 0;
        const taxable = Math.max(0, (o.totalAmount || 0) - taxAmt);
        if (orderRate === 5) { slab5 += taxable; tax5 += taxAmt; }
        else if (orderRate === 12) { slab12 += taxable; tax12 += taxAmt; }
        else if (orderRate === 18) { slab18 += taxable; tax18 += taxAmt; }
        else if (orderRate === 28) { slab28 += taxable; tax28 += taxAmt; }
        else { slab0 += taxable; }
        continue;
      }

      for (const it of o.items) {
        const rate = it.gstRate ?? 0;
        const lineTotal = (it.qty || 1) * (it.price || 0);
        if (rate === 5) { slab5 += lineTotal; tax5 += Math.round(lineTotal * 0.05); }
        else if (rate === 12) { slab12 += lineTotal; tax12 += Math.round(lineTotal * 0.12); }
        else if (rate === 18) { slab18 += lineTotal; tax18 += Math.round(lineTotal * 0.18); }
        else if (rate === 28) { slab28 += lineTotal; tax28 += Math.round(lineTotal * 0.28); }
        else { slab0 += lineTotal; }
      }
    }

    return [
      { rate: '0% (Exempt/Nil)', taxable: slab0, tax: 0 },
      { rate: '5% (Intra-state)', taxable: slab5, tax: tax5 },
      { rate: '12% (Standard)', taxable: slab12, tax: tax12 },
      { rate: '18% (Standard)', taxable: slab18, tax: tax18 },
      ...(slab28 > 0 ? [{ rate: '28% (Luxury)', taxable: slab28, tax: tax28 }] : []),
    ];
  }, [orders, reportsData.totalRevenue, demoMode]);

  const khataData = useMemo(() => {
    if (demoMode) {
      return {
        totalReceivables: 18450,
        totalPayables: 9200,
        netDues: 9250,
        aging0to15: 12000,
        aging16to30: 4500,
        aging30plus: 1950,
        customers: [
          { name: 'Vikram Singh', phone: '+91 98234 11223', totalCredit: 12500, pending: 4500, status: 'Due Soon', statusColor: 'bg-amber-100 text-amber-800' },
          { name: 'Amit Sharma', phone: '+91 98765 43210', totalCredit: 8200, pending: 1950, status: 'Overdue (32d)', statusColor: 'bg-red-100 text-red-800' },
          { name: 'Rahul Patel', phone: '+91 91234 56789', totalCredit: 15400, pending: 3200, status: 'Current (7d)', statusColor: 'bg-emerald-100 text-emerald-800' },
          { name: 'Pooja Verma', phone: '+91 94567 89012', totalCredit: 6700, pending: 2800, status: 'Current (4d)', statusColor: 'bg-emerald-100 text-emerald-800' },
        ],
      };
    }

    const unpaidOrders = orders.filter(
      (o) => (o.paymentMode === 'khata' || o.paymentStatus === 'pending' || o.paymentStatus === 'unpaid') && o.totalAmount > 0,
    );
    const totalReceivables = unpaidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalPayables = 0;
    const netDues = totalReceivables - totalPayables;

    const custMap = new Map<string, { name: string; phone: string; totalCredit: number; pending: number; latestDate: Date }>();
    for (const o of orders) {
      if (o.paymentMode === 'khata' || o.paymentStatus === 'pending' || o.paymentStatus === 'unpaid') {
        const key = o.customerPhone || o.customerName || 'Walk-in';
        const existing = custMap.get(key) || {
          name: o.customerName || 'Walk-in Customer',
          phone: o.customerPhone || '—',
          totalCredit: 0,
          pending: 0,
          latestDate: new Date(o.createdAt || Date.now()),
        };
        existing.totalCredit += o.totalAmount || 0;
        existing.pending += o.totalAmount || 0;
        custMap.set(key, existing);
      }
    }

    const now = Date.now();
    let aging0to15 = 0;
    let aging16to30 = 0;
    let aging30plus = 0;

    for (const o of unpaidOrders) {
      const orderDate = new Date(o.createdAt || Date.now()).getTime();
      const ageDays = Math.max(0, Math.floor((now - orderDate) / (1000 * 60 * 60 * 24)));
      if (ageDays <= 15) aging0to15 += o.totalAmount || 0;
      else if (ageDays <= 30) aging16to30 += o.totalAmount || 0;
      else aging30plus += o.totalAmount || 0;
    }

    const customerList = Array.from(custMap.values()).map((c) => {
      const ageDays = Math.max(0, Math.floor((now - c.latestDate.getTime()) / (1000 * 60 * 60 * 24)));
      let status = 'Current';
      let statusColor = 'bg-emerald-100 text-emerald-800';
      if (ageDays > 30) {
        status = `Overdue (${ageDays}d)`;
        statusColor = 'bg-red-100 text-red-800';
      } else if (ageDays > 15) {
        status = `Due Soon (${ageDays}d)`;
        statusColor = 'bg-amber-100 text-amber-800';
      }
      return {
        name: c.name,
        phone: c.phone,
        totalCredit: c.totalCredit,
        pending: c.pending,
        status,
        statusColor,
      };
    });

    return {
      totalReceivables,
      totalPayables,
      netDues,
      aging0to15,
      aging16to30,
      aging30plus,
      customers: customerList,
    };
  }, [orders, demoMode]);

  const openingBalance = openingBal;
  const totalMoneyIn = useMemo(
    () => rows.reduce((acc, r) => acc + (r.moneyIn || 0), 0),
    [rows],
  );
  const totalMoneyOut = useMemo(
    () => rows.reduce((acc, r) => acc + (r.moneyOut || 0), 0),
    [rows],
  );
  const closingBalance = openingBalance + totalMoneyIn - totalMoneyOut;
  const expectedBalance = closingBalance;

  // Add Entry Modal State
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [entryForm, setEntryForm] = useState({
    typeLabel: 'Expense' as DaybookShowcaseRow['typeLabel'],
    direction: 'out' as 'in' | 'out',
    particularsTitle: '',
    particularsSub: '',
    method: 'Cash' as DaybookShowcaseRow['method'],
    amount: 500,
  });

  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows.filter((r) => {
      if (daybookTab === 'sales' && r.typeLabel !== 'Sales') return false;
      if (
        daybookTab === 'customerPayments' &&
        r.typeLabel !== 'Customer Payment'
      ) {
        return false;
      }
      if (daybookTab === 'expenses' && r.typeLabel !== 'Expense') return false;
      if (
        daybookTab === 'supplierPayments' &&
        r.typeLabel !== 'Supplier Payment'
      ) {
        return false;
      }
      if (!q) return true;
      return (
        r.particularsTitle.toLowerCase().includes(q) ||
        (r.particularsSub || '').toLowerCase().includes(q) ||
        r.typeLabel.toLowerCase().includes(q) ||
        r.method.toLowerCase().includes(q)
      );
    });
  }, [rows, daybookTab, searchQuery]);

  const pagedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const paymentMethodStats = useMemo(() => {
    let cashTotal = 0;
    let upiTotal = 0;
    let cardTotal = 0;
    let bankTotal = 0;
    for (const r of rows) {
      const amt = r.moneyIn || r.moneyOut || 0;
      if (r.method === 'Cash') cashTotal += amt;
      else if (r.method === 'UPI') upiTotal += amt;
      else if (r.method === 'Card') cardTotal += amt;
      else if (r.method === 'Bank') bankTotal += amt;
    }
    const grand = cashTotal + upiTotal + cardTotal + bankTotal || 1;
    return [
      {
        label: 'Cash',
        amount: cashTotal.toLocaleString('en-IN'),
        pct: `${Math.round((cashTotal / grand) * 100)}%`,
        iconBg: 'bg-[#E6F6F0] text-[#0A7B56]',
        Icon: Wallet,
      },
      {
        label: 'UPI',
        amount: upiTotal.toLocaleString('en-IN'),
        pct: `${Math.round((upiTotal / grand) * 100)}%`,
        iconBg: 'bg-[#F3E8FF] text-[#7E22CE]',
        Icon: QrCode,
      },
      {
        label: 'Card',
        amount: cardTotal.toLocaleString('en-IN'),
        pct: `${Math.round((cardTotal / grand) * 100)}%`,
        iconBg: 'bg-[#DBEAFE] text-[#2563EB]',
        Icon: CreditCard,
      },
      {
        label: 'Bank Transfer',
        amount: bankTotal.toLocaleString('en-IN'),
        pct: `${Math.round((bankTotal / grand) * 100)}%`,
        iconBg: 'bg-[#E0F2FE] text-[#0369A1]',
        Icon: Building2,
      },
    ];
  }, [rows]);

  const openQuickEntryModal = (
    typeLabel: DaybookShowcaseRow['typeLabel'],
    direction: 'in' | 'out',
    defaultTitle = '',
  ) => {
    setEntryForm({
      typeLabel,
      direction,
      particularsTitle: defaultTitle,
      particularsSub: '',
      method: 'Cash',
      amount: 500,
    });
    setShowEntryModal(true);
  };

  const handleAddEntrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Math.max(1, Number(entryForm.amount) || 0);
    const title =
      entryForm.particularsTitle.trim() ||
      (entryForm.direction === 'in' ? 'Manual Receipt' : 'Store Expense');

    setShowEntryModal(false);

    try {
      await onAddDaybookEntry({
        partyName: title,
        subtitle: entryForm.particularsSub.trim() || 'Day Book Entry',
        category:
          entryForm.typeLabel === 'Sales'
            ? 'POS Sale'
            : entryForm.typeLabel === 'Customer Payment'
              ? 'Khata In'
              : entryForm.typeLabel === 'Supplier Payment'
                ? 'Supplier'
                : 'Expense',
        refNumber: `DB-${1071 + rows.length}`,
        paymentMode: entryForm.method.toLowerCase() as BosDaybookEntry['paymentMode'],
        moneyIn: entryForm.direction === 'in' ? amt : 0,
        moneyOut: entryForm.direction === 'out' ? amt : 0,
      });

      showToast(`Recorded "${title}" (${currencySymbol} ${amt.toLocaleString('en-IN')})`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to record entry';
      showToast(`Error: ${msg}`);
    }
  };

  const handleExportGstr1Json = () => {
    const today = new Date().toISOString().slice(0, 10);
    // Per-order GST breakup computed from real rates (o.taxAmount → line-item
    // gstRate → order-level gstRate/taxRate → 0). No hardcoded 5%.
    const orderBreakups = (orders || []).map((o) => ({
      order: o,
      breakup: computeOrderGstBreakup(o),
    }));
    const b2csInvoices = orderBreakups.map(({ order, breakup: b }) => ({
      flag: 'N',
      chksum: `chk-${order.id}`,
      inum: order.id,
      idt: today,
      val: order.totalAmount,
      pos: '09',
      rchrg: 'N',
      inv_typ: 'R',
      itms: [
        {
          num: 1,
          itm_det: {
            txval: b.taxable,
            rt: b.rate,
            iamt: 0,
            camt: b.cgst,
            samt: b.sgst,
            csamt: 0,
          },
        },
      ],
    }));

    // HSN summary: each product's GST comes from p.gstRate (or p.taxRate), not
    // a hardcoded 5%. If rate is 0%, both camt and samt are 0.
    const hsnSummary = (products || []).slice(0, 20).map((p, idx) => {
      const qty = p.stockQuantity || 10;
      const gross = p.price * qty;
      const rate = p.gstRate ?? (p as { taxRate?: number }).taxRate ?? 0;
      const tax = Math.round((gross * rate) / (100 + rate));
      const taxable = Math.max(0, Math.round(gross - tax));
      const cgst = Math.round(tax / 2);
      const sgst = tax - cgst;
      return {
        num: idx + 1,
        hsn_sc: p.hsnCode || '1006',
        desc: p.name,
        uqc: 'OTH',
        qty,
        val: gross,
        txval: taxable,
        iamt: 0,
        camt: cgst,
        samt: sgst,
        csamt: 0,
      };
    });

    let totalGross = (orders || []).reduce(
      (acc, o) => acc + (o.totalAmount || 0),
      0,
    );
    let totalTxval = orderBreakups.reduce(
      (acc, { breakup: b }) => acc + b.taxable,
      0,
    );
    let totalTax = orderBreakups.reduce(
      (acc, { breakup: b }) => acc + b.tax,
      0,
    );
    // Preserve the demo fallback so the export still produces a sample return
    // when no real orders exist (matches prior demoMode behaviour).
    if (totalGross === 0 && demoMode) {
      totalGross = 482650;
      totalTxval = Math.round(482650 / 1.05);
      totalTax = totalGross - totalTxval;
    }
    const totalCgst = Math.round(totalTax / 2);
    const totalSgst = totalTax - totalCgst;
    // Representative rate for the aggregated B2CS summary line — first order
    // carrying a non-zero rate, else 0.
    const summaryRate =
      orderBreakups.find(({ breakup: b }) => b.rate > 0)?.breakup.rate ?? 0;

    const gstrPayload = {
      gstin: storeSettings?.gstin || (demoMode ? '09ABCDE1234F1Z5' : ''),
      fp: `${new Date().getMonth() + 1 < 10 ? '0' : ''}${new Date().getMonth() + 1}${new Date().getFullYear()}`,
      gt: totalGross,
      cur_gt: totalGross,
      b2cs: [
        {
          sply_ty: 'INTRA',
          pos: '09',
          typ: 'OE',
          rt: summaryRate,
          txval: totalTxval,
          iamt: 0,
          camt: totalCgst,
          samt: totalSgst,
          csamt: 0,
        },
      ],
      b2b: b2csInvoices.slice(0, 5),
      hsn: {
        data: hsnSummary,
      },
      doc_issue: {
        doc_det: [
          {
            doc_num: 1,
            doc_typ: 'Invoices for outward supply',
            from: orders?.[0]?.id || (demoMode ? 'ORD-1001' : 'None'),
            to: orders?.[orders.length - 1]?.id || (demoMode ? `ORD-${1000 + (orders?.length || 10)}` : 'None'),
            totnum: orders?.length || (demoMode ? 10 : 0),
            canc: 0,
            net_issue: orders?.length || (demoMode ? 10 : 0),
          },
        ],
      },
    };

    const blob = new Blob([JSON.stringify(gstrPayload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GSTR1_return_${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded official GSTR-1 JSON return (${today})`);
  };

  const handleExportGstrSummaryCsv = () => {
    const today = new Date().toISOString().slice(0, 10);
    const header = [
      'Invoice Number',
      'Invoice Date',
      'Customer Name',
      'Supply Type',
      'Rate (%)',
      'Taxable Value',
      'Central Tax (CGST)',
      'State Tax (SGST)',
      'Integrated Tax (IGST)',
      'Total Invoice Value',
    ];

    const rows = (orders || []).map((o) => {
      const b = computeOrderGstBreakup(o);
      return [
        o.id,
        today,
        `"${o.customerName.replace(/"/g, '""')}"`,
        'INTRA-STATE',
        `${b.rate}%`,
        b.taxable,
        b.cgst,
        b.sgst,
        0,
        o.totalAmount,
      ];
    });

    const csvContent = [header.join(','), ...rows.map((r) => r.join(','))].join(
      '\n',
    );
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GSTR1_3B_summary_${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported GSTR-1 & 3B CSV return summary (${today})`);
  };

  const handleExportSalesReportCsv = () => {
    const today = new Date().toISOString().slice(0, 10);
    const header = [
      'Order/Invoice ID',
      'Date & Time',
      'Customer Name',
      'Customer Phone',
      'Channel',
      'Payment Mode',
      'Payment Status',
      'Tax Amount',
      'Total Amount',
    ];

    const rows = (orders || []).map((o) => [
      o.id,
      o.createdAt || today,
      `"${(o.customerName || 'Walk-in Customer').replace(/"/g, '""')}"`,
      o.customerPhone || '',
      o.channel || 'POS',
      o.paymentMode || 'Cash',
      o.paymentStatus || 'paid',
      o.taxAmount || 0,
      o.totalAmount || 0,
    ]);

    const csvContent = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sales_Report_${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported Sales Report CSV (${today})`);
  };

  const handleExportInventoryCsv = () => {
    const today = new Date().toISOString().slice(0, 10);
    const header = [
      'Product Name',
      'Category',
      'SKU',
      'Stock Quantity',
      'Purchase Cost',
      'Selling Price',
      'Total Cost Valuation',
      'Total Retail Valuation',
    ];

    const rows = (products || []).map((p) => {
      const cost = p.costPrice || Math.round(p.price * 0.65);
      return [
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.category || 'General'}"`,
        p.sku || '',
        p.stockQuantity || 0,
        cost,
        p.price,
        cost * (p.stockQuantity || 0),
        p.price * (p.stockQuantity || 0),
      ];
    });

    const csvContent = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Stock_Valuation_${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported Stock Valuation CSV (${today})`);
  };

  /* REPORTS VIEW */
  if (mode === 'reports') {
    const totalInventoryUnits = (products || []).reduce((acc, p) => acc + (p.stockQuantity || 0), 0);
    const totalInventoryCostValue = (products || []).reduce(
      (acc, p) => acc + (p.costPrice || Math.round(p.price * 0.65)) * (p.stockQuantity || 0),
      0
    );
    const totalInventoryRetailValue = (products || []).reduce(
      (acc, p) => acc + p.price * (p.stockQuantity || 0),
      0
    );
    const potentialStockProfit = Math.max(0, totalInventoryRetailValue - totalInventoryCostValue);

    const filteredSalesOrders = (orders || []).filter((o) => {
      if (!salesSearchQuery.trim()) return true;
      const q = salesSearchQuery.trim().toLowerCase();
      return (
        o.id.toLowerCase().includes(q) ||
        (o.customerName || '').toLowerCase().includes(q) ||
        (o.customerPhone || '').includes(q) ||
        (o.paymentMode || '').toLowerCase().includes(q)
      );
    });

    return (
      <div className="w-full max-w-none space-y-4 pb-6">
        {/* Top Header: Sub-Tabs & Date Filter Bar */}
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[#E4EFEA] bg-white p-1.5">
            {(
              [
                { id: 'overview', label: 'Overview' },
                { id: 'sales', label: 'Sales & Revenue' },
                { id: 'pnl', label: 'Profit & Loss' },
                { id: 'gst', label: 'GST & Tax Reports' },
                { id: 'inventory', label: 'Inventory Valuation' },
                { id: 'khata', label: 'Customer & Khata' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setReportTab(t.id)}
                className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition cursor-pointer ${
                  reportTab === t.id
                    ? 'bg-[#0A6847] text-white shadow-2xs'
                    : 'text-[#475569] hover:bg-[#F4F8F6]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Period selector pills */}
            <div className="flex items-center gap-1 rounded-xl border border-[#E4EFEA] bg-white p-1">
              {(
                [
                  { id: 'today', label: 'Today' },
                  { id: 'yesterday', label: 'Yesterday' },
                  { id: 'this_week', label: 'This Week' },
                  { id: 'this_month', label: 'This Month' },
                  { id: 'this_fy', label: 'This FY' },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setReportPeriod(p.id)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                    reportPeriod === p.id
                      ? 'bg-[#0A6847] text-white'
                      : 'text-[#64748B] hover:bg-[#F4F8F6]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {reportTab === 'gst' ? (
              <button
                type="button"
                onClick={handleExportGstrSummaryCsv}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE9E3] bg-white px-3.5 py-2 text-[12px] font-semibold text-[#1E293B] hover:bg-[#F4F8F6] cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4 text-[#0A6847]" />
                <span>GSTR-1 CSV</span>
              </button>
            ) : reportTab === 'sales' ? (
              <button
                type="button"
                onClick={handleExportSalesReportCsv}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE9E3] bg-white px-3.5 py-2 text-[12px] font-semibold text-[#1E293B] hover:bg-[#F4F8F6] cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4 text-[#0A6847]" />
                <span>Sales CSV</span>
              </button>
            ) : reportTab === 'inventory' ? (
              <button
                type="button"
                onClick={handleExportInventoryCsv}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE9E3] bg-white px-3.5 py-2 text-[12px] font-semibold text-[#1E293B] hover:bg-[#F4F8F6] cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4 text-[#0A6847]" />
                <span>Stock CSV</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleExportGstrSummaryCsv}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE9E3] bg-white px-3.5 py-2 text-[12px] font-semibold text-[#1E293B] hover:bg-[#F4F8F6] cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4 text-[#0A6847]" />
                <span>Export Report</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => window.print()}
              className="bos-btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px]"
            >
              <Download className="h-4 w-4" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>

        {toast && (
          <div className="flex items-center justify-between rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-2.5 text-[13px] font-medium text-[#065F46]">
            <span>{toast}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-xs underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 1. OVERVIEW TAB */}
        {reportTab === 'overview' && (
          <div className="space-y-4">
            {/* 5 KPI Cards */}
            <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-5">
              <div className="bos-card p-3.5">
                <p className="text-[11.5px] font-medium text-[#64748B]">Total Revenue</p>
                <p className="mt-1 text-[21px] font-extrabold text-[#111827]">
                  {formatBosCurrency(reportsData.totalRevenue, currencySymbol)}
                </p>
                <p className="text-[11px] font-semibold text-[#0A6847]">
                  {reportsData.totalRevenue > 0 ? '+18.4% vs last period' : 'No recorded sales yet'}
                </p>
              </div>

              <div className="bos-card p-3.5">
                <p className="text-[11.5px] font-medium text-[#64748B]">Gross Profit</p>
                <p className="mt-1 text-[21px] font-extrabold text-[#0A6847]">
                  {formatBosCurrency(reportsData.grossProfit, currencySymbol)}
                </p>
                <p className="text-[11px] text-[#0A6847]">{reportsData.marginLabel} Net Margin</p>
              </div>

              <div className="bos-card p-3.5">
                <p className="text-[11.5px] font-medium text-[#64748B]">Total Orders</p>
                <p className="mt-1 text-[21px] font-extrabold text-[#111827]">
                  {reportsData.totalOrders.toLocaleString('en-IN')}
                </p>
                <p className="text-[11px] text-[#64748B]">
                  Avg Value: {formatBosCurrency(reportsData.avgOrderVal, currencySymbol)}
                </p>
              </div>

              <div className="bos-card p-3.5">
                <p className="text-[11.5px] font-medium text-[#64748B]">Total Expenses</p>
                <p className="mt-1 text-[21px] font-extrabold text-amber-600">
                  {formatBosCurrency(reportsData.totalExpenses, currencySymbol)}
                </p>
                <p className="text-[11px] text-[#64748B]">Rent, Staff, Utilities</p>
              </div>

              <div className="bos-card p-3.5 col-span-2 lg:col-span-1">
                <p className="text-[11.5px] font-medium text-[#64748B]">GST Collected (Net)</p>
                <p className="mt-1 text-[21px] font-extrabold text-purple-700">
                  {formatBosCurrency(reportsData.gstCollected, currencySymbol)}
                </p>
                <p className="text-[11px] text-[#64748B]">
                  ITC Claimable: {formatBosCurrency(reportsData.itcClaimable, currencySymbol)}
                </p>
              </div>
            </div>

            {/* Middle Row: Revenue vs Profit Chart (8 cols) + Sales by Payment Mode (4 cols) */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <div className="bos-card p-5 lg:col-span-8 flex flex-col justify-between">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-[15px] font-bold text-[#111827]">
                      Revenue vs Profit &amp; Expenses
                    </h3>
                    <p className="text-[12px] text-[#64748B]">
                      Performance breakdown across POS, Online Store, and B2B Invoices
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-[11.5px] font-semibold">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#0A6847]" /> Revenue
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" /> Net Profit
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#F59E0B]" /> Expenses
                    </span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-4 gap-4 items-end h-48 border-b border-[#E4EFEA] pb-2">
                  {reportsData.weeklyBars.map((w) => (
                    <div key={w.label} className="flex flex-col items-center justify-end h-full">
                      <span className="mb-1 text-[11px] font-bold text-[#0A6847]">{w.val}</span>
                      <div className="flex items-end gap-1.5 h-36 w-full justify-center">
                        <div
                          className="w-4 sm:w-5 rounded-t-md bg-[#0A6847]"
                          style={{ height: `${w.rev}%` }}
                        />
                        <div
                          className="w-4 sm:w-5 rounded-t-md bg-[#10B981]"
                          style={{ height: `${w.prof}%` }}
                        />
                        <div
                          className="w-4 sm:w-5 rounded-t-md bg-[#F59E0B]"
                          style={{ height: `${w.exp}%` }}
                        />
                      </div>
                      <span className="mt-2 text-[11px] font-medium text-[#64748B] text-center">
                        {w.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bos-card p-5 lg:col-span-4 space-y-4">
                <div>
                  <h3 className="text-[15px] font-bold text-[#111827]">Sales by Payment Mode</h3>
                  <p className="text-[12px] text-[#64748B]">Collection split across channels</p>
                </div>

                <div className="space-y-3 text-[12.5px]">
                  {reportsData.paymentSplit.map((row) => (
                    <div key={row.mode} className="space-y-1">
                      <div className="flex justify-between">
                        <span className="font-semibold text-[#334155]">{row.mode}</span>
                        <span className="font-bold text-[#111827]">
                          {formatBosCurrency(row.amount, currencySymbol)} ({row.pct}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-[#F1F6F3] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${row.color}`}
                          style={{ width: `${row.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom 3 Summary Cards */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="bos-card p-4 space-y-3">
                <h3 className="text-[14.5px] font-bold text-[#111827]">Top Selling Products</h3>
                {products.length === 0 ? (
                  <p className="py-6 text-center text-xs text-[#94A3B8]">No products recorded yet.</p>
                ) : (
                  <div className="divide-y divide-[#F1F6F3] text-[12.5px]">
                    {products.slice(0, 5).map((p, idx) => {
                      const unitsSold = demoMode
                        ? 38 - idx * 5
                        : (orders || []).reduce(
                            (acc, o) =>
                              acc +
                              (o.items
                                ?.filter((it) => it.id === p.id || it.name === p.name)
                                .reduce((s, it) => s + (it.qty || 0), 0) || 0),
                            0
                          );
                      const revenue = p.price * unitsSold;
                      return (
                        <div key={p.id} className="flex items-center justify-between py-2.5">
                          <div>
                            <p className="font-bold text-[#111827]">
                              {idx + 1}. {p.name}
                            </p>
                            <p className="text-[11px] text-[#64748B]">{p.category}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-extrabold text-[#0A6847]">
                              {formatBosCurrency(revenue, currencySymbol)}
                            </p>
                            <p className="text-[10.5px] text-[#64748B]">{unitsSold} units sold</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bos-card p-4 space-y-3 text-[12.5px]">
                <div className="flex items-center justify-between">
                  <h3 className="text-[14.5px] font-bold text-[#111827]">Profit &amp; Loss Summary</h3>
                  <span className="rounded-full bg-[#E6F6F0] px-2.5 py-0.5 text-[11px] font-bold text-[#0A6847]">
                    {reportsData.grossProfit >= 0 ? 'Healthy' : 'Deficit'}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between py-1 border-b border-[#F1F6F3]">
                    <span className="text-[#475569]">Gross Sales Revenue</span>
                    <strong className="text-[#111827]">
                      {formatBosCurrency(reportsData.totalRevenue, currencySymbol)}
                    </strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#F1F6F3]">
                    <span className="text-[#475569]">Cost of Goods Sold (COGS)</span>
                    <strong className="text-red-600">
                      -{formatBosCurrency(reportsData.cogs, currencySymbol)}
                    </strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#F1F6F3]">
                    <span className="text-[#475569]">Operating Expenses</span>
                    <strong className="text-red-600">
                      -{formatBosCurrency(reportsData.totalExpenses, currencySymbol)}
                    </strong>
                  </div>
                  <div className="flex justify-between rounded-xl bg-[#E6F6F0] p-3 text-[#0A6847]">
                    <span className="font-bold">Net Profit (Take Home)</span>
                    <span className="text-[16px] font-extrabold">
                      {formatBosCurrency(reportsData.grossProfit, currencySymbol)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bos-card p-4 space-y-3 text-[12.5px]">
                <div className="flex items-center justify-between">
                  <h3 className="text-[14.5px] font-bold text-[#111827]">
                    GST Tax Summary (GSTR-1 &amp; 3B)
                  </h3>
                  <span className="rounded-md bg-[#F1F6F3] px-2 py-0.5 text-[10.5px] font-bold text-[#334155]">
                    {new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-xl border border-[#E4EFEA] bg-[#F8FCFA] p-2.5">
                    <p className="text-[10.5px] text-[#64748B]">Output GST (Sales)</p>
                    <p className="text-[15px] font-extrabold text-[#111827]">
                      {formatBosCurrency(reportsData.gstCollected, currencySymbol)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#E4EFEA] bg-[#F8FCFA] p-2.5">
                    <p className="text-[10.5px] text-[#64748B]">Input Tax Credit (ITC)</p>
                    <p className="text-[15px] font-extrabold text-[#0A6847]">
                      {formatBosCurrency(reportsData.itcClaimable, currencySymbol)}
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-[#BCE3D4] bg-[#F3FAF7] p-3 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-[#0A6847]">Net GST Payable</p>
                    <p className="text-[16px] font-extrabold text-[#111827]">
                      {formatBosCurrency(
                        Math.max(0, reportsData.gstCollected - reportsData.itcClaimable),
                        currencySymbol
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportGstr1Json}
                    className="bos-btn-primary rounded-lg px-3 py-1.5 text-[11.5px] cursor-pointer"
                  >
                    Download GSTR-1
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. SALES & REVENUE TAB */}
        {reportTab === 'sales' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
              <div className="bos-card p-4">
                <p className="text-[12px] font-semibold text-[#64748B]">Total Sales Turnover</p>
                <p className="mt-1 text-[22px] font-extrabold text-[#0A6847]">
                  {formatBosCurrency(reportsData.totalRevenue, currencySymbol)}
                </p>
                <p className="text-[11px] text-[#64748B]">From all POS &amp; invoices</p>
              </div>
              <div className="bos-card p-4">
                <p className="text-[12px] font-semibold text-[#64748B]">Tax Collected (GST)</p>
                <p className="mt-1 text-[22px] font-extrabold text-purple-700">
                  {formatBosCurrency(reportsData.gstCollected, currencySymbol)}
                </p>
                <p className="text-[11px] text-[#64748B]">CGST + SGST + IGST</p>
              </div>
              <div className="bos-card p-4">
                <p className="text-[12px] font-semibold text-[#64748B]">Total Invoices / Bills</p>
                <p className="mt-1 text-[22px] font-extrabold text-[#111827]">
                  {(orders || []).length}
                </p>
                <p className="text-[11px] text-[#0A6847]">100% verified transactions</p>
              </div>
              <div className="bos-card p-4">
                <p className="text-[12px] font-semibold text-[#64748B]">Average Ticket Size</p>
                <p className="mt-1 text-[22px] font-extrabold text-[#111827]">
                  {formatBosCurrency(reportsData.avgOrderVal, currencySymbol)}
                </p>
                <p className="text-[11px] text-[#64748B]">Per bill average</p>
              </div>
            </div>

            {/* Search bar and table */}
            <div className="bos-card p-4 space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#94A3B8]" />
                  <input
                    type="text"
                    value={salesSearchQuery}
                    onChange={(e) => setSalesSearchQuery(e.target.value)}
                    placeholder="Search by invoice # or customer..."
                    className="w-full rounded-xl border border-[#DCE9E3] bg-[#FAFDFB] pl-9 pr-3 py-2 text-[12.5px] text-[#1E293B] focus:border-[#0A6847] focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[#64748B]">
                  <span>Showing {filteredSalesOrders.length} transactions</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#EBF2EE] bg-[#FAFDFB] text-[11px] font-semibold text-[#64748B]">
                      <th className="py-2.5 px-3">Bill / Invoice #</th>
                      <th className="py-2.5 px-3">Date &amp; Time</th>
                      <th className="py-2.5 px-3">Customer</th>
                      <th className="py-2.5 px-3">Channel</th>
                      <th className="py-2.5 px-3">Payment Mode</th>
                      <th className="py-2.5 px-3 text-right">Tax ({currencySymbol})</th>
                      <th className="py-2.5 px-3 text-right">Total ({currencySymbol})</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF5F1] text-[12.5px]">
                    {filteredSalesOrders.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-xs text-[#94A3B8]">
                          No sales records found for this period.
                        </td>
                      </tr>
                    ) : (
                      filteredSalesOrders.map((o) => (
                        <tr key={o.id} className="hover:bg-[#F9FCFA]">
                          <td className="py-2.5 px-3 font-bold text-[#0A6847]">{o.id}</td>
                          <td className="py-2.5 px-3 text-[#64748B] text-xs">
                            {o.createdAt || 'Today'}
                          </td>
                          <td className="py-2.5 px-3">
                            <p className="font-semibold text-[#111827]">
                              {o.customerName || 'Walk-in Customer'}
                            </p>
                            {o.customerPhone && (
                              <p className="text-[10.5px] text-[#64748B]">{o.customerPhone}</p>
                            )}
                          </td>
                          <td className="py-2.5 px-3 uppercase text-[10.5px] font-bold text-[#475569]">
                            {o.channel || 'POS'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="rounded-md bg-[#E6F6F0] px-2 py-0.5 text-[11px] font-bold text-[#0A7B56]">
                              {o.paymentMode || 'Cash'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-xs text-[#64748B]">
                            {formatBosCurrency(o.taxAmount || 0, currencySymbol)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-extrabold text-[#111827]">
                            {formatBosCurrency(o.totalAmount || 0, currencySymbol)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10.5px] font-bold text-emerald-800">
                              {o.paymentStatus || 'Paid'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 3. PROFIT & LOSS TAB */}
        {reportTab === 'pnl' && (
          <div className="bos-card p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E4EFEA] pb-4 gap-2">
              <div>
                <h3 className="text-[17px] font-extrabold text-[#111827]">
                  Trading &amp; Profit &amp; Loss Statement
                </h3>
                <p className="text-[12px] text-[#64748B]">
                  Standard commercial financial statement for {reportPeriod.replace('_', ' ')}
                </p>
              </div>
              <span className="rounded-full bg-[#E6F6F0] px-3 py-1 text-[12px] font-bold text-[#0A6847]">
                Financial Health: {reportsData.grossProfit >= 0 ? 'Profitable' : 'Deficit'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Part 1: Trading Account */}
              <div className="rounded-2xl border border-[#E4EFEA] bg-[#FAFDFB] p-4 space-y-3">
                <h4 className="text-[13.5px] font-bold text-[#0A6847] uppercase tracking-wide">
                  1. Trading Account (Gross Profit)
                </h4>
                <div className="space-y-2 text-[12.5px]">
                  <div className="flex justify-between py-1.5 border-b border-[#EBF2EE]">
                    <span className="text-[#334155] font-medium">Gross Sales Revenue</span>
                    <strong className="text-[#111827]">
                      {formatBosCurrency(reportsData.totalRevenue, currencySymbol)}
                    </strong>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#EBF2EE]">
                    <span className="text-[#334155] font-medium">Cost of Goods Sold (COGS)</span>
                    <strong className="text-red-600">
                      -{formatBosCurrency(reportsData.cogs, currencySymbol)}
                    </strong>
                  </div>
                  <div className="flex justify-between rounded-xl bg-white p-3 border border-[#DCE9E3] text-[#0A6847]">
                    <span className="font-extrabold">Gross Profit</span>
                    <span className="text-[15px] font-extrabold">
                      {formatBosCurrency(reportsData.grossProfit, currencySymbol)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Part 2: Operating Expenses */}
              <div className="rounded-2xl border border-[#E4EFEA] bg-[#FAFDFB] p-4 space-y-3">
                <h4 className="text-[13.5px] font-bold text-amber-700 uppercase tracking-wide">
                  2. Operating Expenses
                </h4>
                <div className="space-y-2 text-[12.5px]">
                  {expenseBreakdown.map((exp) => (
                    <div key={exp.category} className="flex justify-between py-1 border-b border-[#EBF2EE]">
                      <span className="text-[#334155]">{exp.category}</span>
                      <span className="font-semibold text-[#111827]">
                        {formatBosCurrency(exp.amount, currencySymbol)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between rounded-xl bg-white p-3 border border-[#DCE9E3] text-amber-700">
                    <span className="font-extrabold">Total Operating Expenses</span>
                    <span className="text-[15px] font-extrabold">
                      -{formatBosCurrency(reportsData.totalExpenses, currencySymbol)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Net Profit Summary Box */}
            <div className="rounded-2xl border-2 border-[#A7F3D0] bg-[#ECFDF5] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-[#065F46] uppercase tracking-wider">
                  Net Commercial Profit (Take Home)
                </p>
                <p className="text-[26px] font-black text-[#047857] mt-0.5">
                  {formatBosCurrency(
                    Math.max(0, reportsData.grossProfit - reportsData.totalExpenses),
                    currencySymbol
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#065F46]">Net Operating Margin</p>
                <p className="text-[18px] font-extrabold text-[#064E3B]">{reportsData.marginLabel}</p>
              </div>
            </div>
          </div>
        )}

        {/* 4. GST & TAX REPORTS TAB */}
        {reportTab === 'gst' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
              <div className="bos-card p-4">
                <p className="text-[12px] font-semibold text-[#64748B]">Output Tax (Sales)</p>
                <p className="mt-1 text-[22px] font-extrabold text-purple-700">
                  {formatBosCurrency(reportsData.gstCollected, currencySymbol)}
                </p>
                <p className="text-[11px] text-[#64748B]">CGST + SGST collected</p>
              </div>
              <div className="bos-card p-4">
                <p className="text-[12px] font-semibold text-[#64748B]">Input Tax Credit (ITC)</p>
                <p className="mt-1 text-[22px] font-extrabold text-[#0A6847]">
                  {formatBosCurrency(reportsData.itcClaimable, currencySymbol)}
                </p>
                <p className="text-[11px] text-[#64748B]">Eligible purchase credits</p>
              </div>
              <div className="bos-card p-4 bg-[#F3FAF7] border-[#BCE3D4]">
                <p className="text-[12px] font-bold text-[#0A6847]">Net GST Payable</p>
                <p className="mt-1 text-[22px] font-extrabold text-[#111827]">
                  {formatBosCurrency(
                    Math.max(0, reportsData.gstCollected - reportsData.itcClaimable),
                    currencySymbol
                  )}
                </p>
                <p className="text-[11px] text-[#0A6847] font-semibold">After ITC adjustment</p>
              </div>
            </div>

            {/* Rate-wise GST Table */}
            <div className="bos-card p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-[15px] font-bold text-[#111827]">
                    Rate-wise Tax Liability Summary (GSTR-1 Table 12)
                  </h3>
                  <p className="text-[12px] text-[#64748B]">
                    Breakdown of taxable sales and taxes categorized by official Indian GST slabs
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleExportGstr1Json}
                  className="bos-btn-primary rounded-xl px-3.5 py-1.5 text-xs font-semibold cursor-pointer"
                >
                  Download GSTR-1 JSON
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#EBF2EE] bg-[#FAFDFB] text-[11px] font-semibold text-[#64748B]">
                      <th className="py-2.5 px-3">Tax Slab</th>
                      <th className="py-2.5 px-3 text-right">Taxable Turnover ({currencySymbol})</th>
                      <th className="py-2.5 px-3 text-right">CGST ({currencySymbol})</th>
                      <th className="py-2.5 px-3 text-right">SGST ({currencySymbol})</th>
                      <th className="py-2.5 px-3 text-right">IGST ({currencySymbol})</th>
                      <th className="py-2.5 px-3 text-right">Total Tax ({currencySymbol})</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF5F1] text-[12.5px]">
                    {gstSlabs.map((row) => (
                      <tr key={row.rate} className="hover:bg-[#F9FCFA]">
                        <td className="py-2.5 px-3 font-bold text-[#1E293B]">{row.rate}</td>
                        <td className="py-2.5 px-3 text-right font-medium text-[#334155]">
                          {formatBosCurrency(row.taxable, currencySymbol)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-[#64748B]">
                          {formatBosCurrency(Math.round(row.tax / 2), currencySymbol)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-[#64748B]">
                          {formatBosCurrency(Math.round(row.tax / 2), currencySymbol)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-[#64748B]">0</td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-[#0A6847]">
                          {formatBosCurrency(row.tax, currencySymbol)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 5. INVENTORY VALUATION TAB */}
        {reportTab === 'inventory' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
              <div className="bos-card p-4">
                <p className="text-[12px] font-semibold text-[#64748B]">Active Catalog Items</p>
                <p className="mt-1 text-[22px] font-extrabold text-[#111827]">
                  {(products || []).length} SKUs
                </p>
                <p className="text-[11px] text-[#0A6847]">Product directory</p>
              </div>
              <div className="bos-card p-4">
                <p className="text-[12px] font-semibold text-[#64748B]">Total Stock in Hand</p>
                <p className="mt-1 text-[22px] font-extrabold text-[#111827]">
                  {totalInventoryUnits} Units
                </p>
                <p className="text-[11px] text-[#64748B]">Physical on shelf</p>
              </div>
              <div className="bos-card p-4">
                <p className="text-[12px] font-semibold text-[#64748B]">Stock Value (Cost)</p>
                <p className="mt-1 text-[22px] font-extrabold text-amber-600">
                  {formatBosCurrency(totalInventoryCostValue, currencySymbol)}
                </p>
                <p className="text-[11px] text-[#64748B]">At purchase rate</p>
              </div>
              <div className="bos-card p-4">
                <p className="text-[12px] font-semibold text-[#64748B]">Stock Value (Retail)</p>
                <p className="mt-1 text-[22px] font-extrabold text-[#0A6847]">
                  {formatBosCurrency(totalInventoryRetailValue, currencySymbol)}
                </p>
                <p className="text-[11px] text-[#0A6847]">
                  Potential profit: {formatBosCurrency(potentialStockProfit, currencySymbol)}
                </p>
              </div>
            </div>

            <div className="bos-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[15px] font-bold text-[#111827]">Item-wise Stock Valuation</h3>
                  <p className="text-[12px] text-[#64748B]">
                    Current quantity, purchase price, retail value and margin per item
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#EBF2EE] bg-[#FAFDFB] text-[11px] font-semibold text-[#64748B]">
                      <th className="py-2.5 px-3">Product Name</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3 text-right">In Stock</th>
                      <th className="py-2.5 px-3 text-right">Cost Price ({currencySymbol})</th>
                      <th className="py-2.5 px-3 text-right">Sale Price ({currencySymbol})</th>
                      <th className="py-2.5 px-3 text-right">Total Cost Value</th>
                      <th className="py-2.5 px-3 text-right">Total Retail Value</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF5F1] text-[12.5px]">
                    {(products || []).map((p) => {
                      const cost = p.costPrice || Math.round(p.price * 0.65);
                      const isLowStock = p.stockQuantity <= (p.lowStockThreshold || 5);
                      return (
                        <tr key={p.id} className="hover:bg-[#F9FCFA]">
                          <td className="py-2.5 px-3 font-bold text-[#111827]">{p.name}</td>
                          <td className="py-2.5 px-3 text-xs text-[#64748B]">{p.category}</td>
                          <td className="py-2.5 px-3 text-right font-extrabold text-[#1E293B]">
                            {p.stockQuantity}
                          </td>
                          <td className="py-2.5 px-3 text-right text-[#64748B]">
                            {formatBosCurrency(cost, currencySymbol)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-[#111827]">
                            {formatBosCurrency(p.price, currencySymbol)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-amber-600">
                            {formatBosCurrency(cost * p.stockQuantity, currencySymbol)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-extrabold text-[#0A6847]">
                            {formatBosCurrency(p.price * p.stockQuantity, currencySymbol)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {isLowStock ? (
                              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10.5px] font-bold text-red-700">
                                Low Stock
                              </span>
                            ) : (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700">
                                In Stock
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 6. CUSTOMER & KHATA DUES TAB */}
        {reportTab === 'khata' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
              <div className="bos-card p-4">
                <p className="text-[12px] font-semibold text-[#64748B]">Customer Udhaar (Receivables)</p>
                <p className="mt-1 text-[22px] font-extrabold text-red-600">
                  {formatBosCurrency(khataData.totalReceivables, currencySymbol)}
                </p>
                <p className="text-[11px] text-[#64748B]">To collect from customers</p>
              </div>
              <div className="bos-card p-4">
                <p className="text-[12px] font-semibold text-[#64748B]">Supplier Payables</p>
                <p className="mt-1 text-[22px] font-extrabold text-amber-600">
                  {formatBosCurrency(khataData.totalPayables, currencySymbol)}
                </p>
                <p className="text-[11px] text-[#64748B]">To pay to distributors</p>
              </div>
              <div className="bos-card p-4 bg-[#F3FAF7] border-[#BCE3D4]">
                <p className="text-[12px] font-bold text-[#0A6847]">Net Pending Dues</p>
                <p className="mt-1 text-[22px] font-extrabold text-[#0A6847]">
                  {khataData.netDues >= 0 ? '+' : ''}{formatBosCurrency(khataData.netDues, currencySymbol)}
                </p>
                <p className="text-[11px] text-[#0A6847] font-semibold">
                  {khataData.netDues >= 0 ? 'Net positive cashflow' : 'Net payable position'}
                </p>
              </div>
            </div>

            {/* Aging Analysis Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5">
                <p className="text-[11px] font-bold text-emerald-800">0 - 15 Days (Current)</p>
                <p className="text-[18px] font-extrabold text-emerald-900 mt-1">
                  {formatBosCurrency(khataData.aging0to15, currencySymbol)}
                </p>
                <p className="text-[10.5px] text-emerald-700">
                  {khataData.totalReceivables > 0 ? `${Math.round((khataData.aging0to15 / khataData.totalReceivables) * 100)}% of total dues` : 'No current dues'}
                </p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5">
                <p className="text-[11px] font-bold text-amber-800">16 - 30 Days (Due Soon)</p>
                <p className="text-[18px] font-extrabold text-amber-900 mt-1">
                  {formatBosCurrency(khataData.aging16to30, currencySymbol)}
                </p>
                <p className="text-[10.5px] text-amber-700">
                  {khataData.totalReceivables > 0 ? `${Math.round((khataData.aging16to30 / khataData.totalReceivables) * 100)}% of total dues` : 'No dues in window'}
                </p>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50/50 p-3.5">
                <p className="text-[11px] font-bold text-red-800">30+ Days (Overdue)</p>
                <p className="text-[18px] font-extrabold text-red-900 mt-1">
                  {formatBosCurrency(khataData.aging30plus, currencySymbol)}
                </p>
                <p className="text-[10.5px] text-red-700">
                  {khataData.aging30plus > 0 ? 'Needs WhatsApp reminder' : 'No overdue accounts'}
                </p>
              </div>
            </div>

            {/* Party Udhaar Table */}
            <div className="bos-card p-5 space-y-4">
              <h3 className="text-[15px] font-bold text-[#111827]">
                Customer Outstanding Balances (Khata Register)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#EBF2EE] bg-[#FAFDFB] text-[11px] font-semibold text-[#64748B]">
                      <th className="py-2.5 px-3">Customer Name</th>
                      <th className="py-2.5 px-3">Phone</th>
                      <th className="py-2.5 px-3 text-right">Total Credit Taken</th>
                      <th className="py-2.5 px-3 text-right">Pending Udhaar</th>
                      <th className="py-2.5 px-3 text-center">Aging Status</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF5F1] text-[12.5px]">
                    {khataData.customers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-[#64748B]">
                          No outstanding customer dues recorded
                        </td>
                      </tr>
                    ) : (
                      khataData.customers.map((c) => (
                        <tr key={c.phone || c.name} className="hover:bg-[#F9FCFA]">
                          <td className="py-2.5 px-3 font-bold text-[#111827]">{c.name}</td>
                          <td className="py-2.5 px-3 text-xs text-[#64748B]">{c.phone}</td>
                          <td className="py-2.5 px-3 text-right text-[#64748B]">
                            {formatBosCurrency(c.totalCredit, currencySymbol)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-extrabold text-red-600">
                            {formatBosCurrency(c.pending, currencySymbol)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ${c.statusColor}`}>
                              {c.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                const text = encodeURIComponent(
                                  `Dear ${c.name}, gentle reminder that your pending balance at our store is ${formatBosCurrency(c.pending, currencySymbol)}. Kindly pay via UPI or visit us. Thank you!`
                                );
                                window.open(`https://wa.me/${c.phone.replace(/[^0-9]/g, '')}?text=${text}`, '_blank');
                              }}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#E6F6F0] px-2.5 py-1 text-[11px] font-bold text-[#0A7B56] hover:bg-[#D1EFE4] cursor-pointer"
                            >
                              <Send className="h-3 w-3" />
                              <span>WhatsApp</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }


  /* REDESIGNED DAY BOOK VIEW MATCHING SCREENSHOT 1:1 */
  return (
    <div className="w-full max-w-none space-y-4 pb-6">
      {/* Toast Banner */}
      {toast && (
        <div className="flex items-center justify-between rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-2.5 text-[13px] font-medium text-[#065F46]">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#0A6847]" />
            {toast}
          </span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="text-xs font-semibold underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Page Header: Title + Subtitle on Left, Date Picker + Store Selector on Right */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[24px] font-extrabold tracking-tight text-[#111827] leading-tight">
            Day Book
          </h1>
          <p className="mt-0.5 text-[13px] text-[#64748B]">
            Track all money in and money out for the day. Manage cash, UPI, card, expenses, supplier payments and closing balance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Date Picker Pill: 12 Oct 2024 < > */}
          <div className="inline-flex h-9 items-center rounded-xl border border-[#DCE9E3] bg-white shadow-2xs text-[12.5px] font-semibold text-[#1E293B]">
            <div className="flex items-center gap-2 px-3">
              <Calendar className="h-3.5 w-3.5 text-[#475569]" />
              <span>12 Oct 2024</span>
            </div>
            <button
              type="button"
              aria-label="Previous day"
              className="flex h-full items-center border-l border-[#EBF2EE] px-2 text-[#64748B] hover:bg-[#F8FAFC]"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label="Next day"
              className="flex h-full items-center border-l border-[#EBF2EE] px-2 text-[#64748B] hover:bg-[#F8FAFC] rounded-r-xl"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Store Selector Pill: Main Store */}
          <div className="inline-flex h-9 items-center gap-2 rounded-xl border border-[#DCE9E3] bg-white px-3 shadow-2xs text-[12.5px] font-semibold text-[#1E293B]">
            <MapPin className="h-3.5 w-3.5 text-[#475569]" />
            <select
              aria-label="Select Store Branch"
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-transparent font-semibold text-[#1E293B] focus:outline-hidden"
            >
              <option value="Main Store">Main Store</option>
              <option value="Branch 2">Branch 2</option>
            </select>
          </div>
        </div>
      </div>

      {/* 5 Top KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {/* 1. Opening Balance */}
        <div className="flex items-center gap-3.5 rounded-2xl border border-[#DCE9E3] bg-white p-3.5 shadow-2xs">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E6F6F0] text-[#0A7B56]">
            <Wallet className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11.5px] font-medium text-[#64748B] truncate">
              Opening Balance
            </p>
            <p className="text-[21px] font-extrabold text-[#111827] leading-tight">
              {currencySymbol} {openingBalance.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* 2. Total Money In */}
        <div className="flex items-center gap-3.5 rounded-2xl border border-[#DCE9E3] bg-white p-3.5 shadow-2xs">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E6F6F0] text-[#0A7B56]">
            <ArrowUp className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11.5px] font-medium text-[#64748B] truncate">
              Total Money In
            </p>
            <p className="text-[21px] font-extrabold text-[#111827] leading-tight">
              {currencySymbol} {totalMoneyIn.toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] font-bold text-[#0A7B56]">↑ 12%</p>
          </div>
        </div>

        {/* 3. Total Money Out */}
        <div className="flex items-center gap-3.5 rounded-2xl border border-[#DCE9E3] bg-white p-3.5 shadow-2xs">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFF1F2] text-[#E11D48]">
            <ArrowDown className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11.5px] font-medium text-[#64748B] truncate">
              Total Money Out
            </p>
            <p className="text-[21px] font-extrabold text-[#111827] leading-tight">
              {currencySymbol} {totalMoneyOut.toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] font-bold text-[#E11D48]">↓ 8%</p>
          </div>
        </div>

        {/* 4. Closing Balance */}
        <div className="flex items-center gap-3.5 rounded-2xl border border-[#DCE9E3] bg-white p-3.5 shadow-2xs">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E6F6F0] text-[#0A7B56]">
            <Wallet className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11.5px] font-medium text-[#64748B] truncate">
              Closing Balance
            </p>
            <p className="text-[21px] font-extrabold text-[#111827] leading-tight">
              {currencySymbol} {closingBalance.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* 5. Expected Balance */}
        <div className="col-span-2 lg:col-span-1 flex items-center justify-between gap-2 rounded-2xl border border-[#DCE9E3] bg-white p-3.5 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F1F5F9] text-[#475569]">
              <Coins className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11.5px] font-medium text-[#64748B] truncate">
                Expected Balance
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-[20px] font-extrabold text-[#111827] leading-tight">
                  {currencySymbol} {expectedBalance.toLocaleString('en-IN')}
                </p>
                <span className="inline-flex rounded-md bg-[#E6F6F0] px-2 py-0.5 text-[10.5px] font-bold text-[#0A7B56]">
                  Matched
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main 12-Column Split Grid: Left Transactions Table (9 cols) + Right Sidebar (3 cols) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 items-start">
        {/* LEFT COLUMN: TRANSACTIONS TABLE (9 cols) */}
        <div className="lg:col-span-8 xl:col-span-9 rounded-2xl border border-[#DCE9E3] bg-white shadow-2xs overflow-hidden">
          {/* 7 Underline Sub-Tabs + Filter Button */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EBF2EE] px-4 pt-3 pb-2">
            <div className="flex items-center gap-5 overflow-x-auto">
              {(
                [
                  { id: 'all', label: 'All Transactions' },
                  { id: 'sales', label: 'Sales' },
                  { id: 'customerPayments', label: 'Customer Payments' },
                  { id: 'expenses', label: 'Expenses' },
                  { id: 'supplierPayments', label: 'Supplier Payments' },
                  { id: 'transfers', label: 'Transfers' },
                  { id: 'adjustments', label: 'Adjustments' },
                ] as const
              ).map((tab) => {
                const active = daybookTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDaybookTab(tab.id)}
                    className={`relative pb-2 text-[12.5px] whitespace-nowrap transition cursor-pointer ${
                      active
                        ? 'font-extrabold text-[#111827]'
                        : 'font-medium text-[#64748B] hover:text-[#111827]'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {active && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-full bg-[#0A6847]" />
                    )}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setDaybookTab('all')}
              className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-[#DCE9E3] bg-white px-3 text-[12px] font-semibold text-[#1E293B] hover:bg-[#F4F8F6] cursor-pointer"
            >
              <Filter className="h-3.5 w-3.5 text-[#64748B]" />
              <span>Filter</span>
            </button>
          </div>

          {/* 9-Column Transactions Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#EBF2EE] bg-[#FAFDFB] text-[11px] font-semibold text-[#64748B]">
                  <th className="py-2.5 pl-4 pr-2 w-8">#</th>
                  <th className="py-2.5 px-2.5">Date &amp; Time</th>
                  <th className="py-2.5 px-2.5">Type</th>
                  <th className="py-2.5 px-2.5">Particulars</th>
                  <th className="py-2.5 px-2.5">Method</th>
                  <th className="py-2.5 px-2.5 text-right">
                    In ({currencySymbol})
                  </th>
                  <th className="py-2.5 px-2.5 text-right">
                    Out ({currencySymbol})
                  </th>
                  <th className="py-2.5 px-2.5 text-right">
                    Balance ({currencySymbol})
                  </th>
                  <th className="py-2.5 pl-2 pr-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF5F1] text-[12.5px]">
                {pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-[#64748B]">
                        <BookOpen className="h-8 w-8 text-[#94A3B8] mb-2" />
                        <p className="text-[14px] font-semibold text-[#1E293B]">No Day Book transactions yet</p>
                        <p className="text-[12px] text-[#64748B] mt-0.5 max-w-sm">
                          Completed POS sales, invoices, customer payments, and logged expenses will appear here.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((row) => (
                    <tr key={row.id} className="hover:bg-[#F9FCFA]">
                    <td className="py-2.5 pl-4 pr-2 font-medium text-[#475569]">
                      {row.rowNum}
                    </td>

                    {/* Date & Time */}
                    <td className="py-2.5 px-2.5 leading-snug">
                      <p className="text-[11.5px] font-medium text-[#334155]">
                        {row.dateText}
                      </p>
                      <p className="text-[11px] text-[#64748B]">
                        {row.timeText}
                      </p>
                    </td>

                    {/* Type with Colored Icon */}
                    <td className="py-2.5 px-2.5">
                      <div className="flex items-center gap-2">
                        {row.typeLabel === 'Sales' && (
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#E6F6F0] text-[#0A7B56]">
                            <ShoppingCart className="h-3.5 w-3.5" />
                          </span>
                        )}
                        {row.typeLabel === 'Customer Payment' && (
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#DBEAFE] text-[#2563EB]">
                            <UserCheck className="h-3.5 w-3.5" />
                          </span>
                        )}
                        {row.typeLabel === 'Expense' && (
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#FFE4E6] text-[#E11D48]">
                            <Home className="h-3.5 w-3.5" />
                          </span>
                        )}
                        {row.typeLabel === 'Supplier Payment' && (
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#FEF3C7] text-[#D97706]">
                            <Truck className="h-3.5 w-3.5" />
                          </span>
                        )}
                        <span className="text-[12px] font-medium text-[#334155] leading-tight">
                          {row.typeLabel}
                        </span>
                      </div>
                    </td>

                    {/* Particulars */}
                    <td className="py-2.5 px-2.5 leading-snug">
                      <p className="font-bold text-[#111827]">
                        {row.particularsTitle}
                      </p>
                      {row.particularsSub && (
                        <p className="text-[11px] text-[#64748B]">
                          {row.particularsSub}
                        </p>
                      )}
                    </td>

                    {/* Method Pill */}
                    <td className="py-2.5 px-2.5">
                      <span
                        className={`inline-flex rounded-md px-2.5 py-0.5 text-[11px] font-bold ${getMethodPillStyle(
                          row.method,
                        )}`}
                      >
                        {row.method}
                      </span>
                    </td>

                    {/* In (₹) */}
                    <td className="py-2.5 px-2.5 text-right font-bold">
                      {row.moneyIn > 0 ? (
                        <span className="text-[#0A7B56]">
                          {row.moneyIn.toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="text-[#94A3B8]">-</span>
                      )}
                    </td>

                    {/* Out (₹) */}
                    <td className="py-2.5 px-2.5 text-right font-bold">
                      {row.moneyOut > 0 ? (
                        <span className="text-[#E11D48]">
                          {row.moneyOut.toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="text-[#94A3B8]">-</span>
                      )}
                    </td>

                    {/* Balance (₹) */}
                    <td className="py-2.5 px-2.5 text-right font-bold text-[#111827]">
                      {row.balance.toLocaleString('en-IN')}
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 pl-2 pr-4 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          showToast(`Viewing entry ${row.particularsTitle}`)
                        }
                        aria-label={`Actions for ${row.particularsTitle}`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#EBF2EE] hover:text-[#111827] cursor-pointer"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col gap-2.5 border-t border-[#EBF2EE] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[12px] font-medium text-[#64748B]">
              Showing {filteredRows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredRows.length)} of {filteredRows.length} transactions
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#DCE9E3] bg-white text-[#64748B] hover:bg-[#F4F8F6]"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                {Array.from(
                  {
                    length: Math.min(
                      3,
                      Math.max(1, Math.ceil(filteredRows.length / pageSize)),
                    ),
                  },
                  (_, i) => i + 1,
                ).map((pg) => (
                  <button
                    key={pg}
                    type="button"
                    onClick={() => setCurrentPage(pg)}
                    className={`flex h-7 w-7 items-center justify-center rounded-lg text-[12px] font-bold transition ${
                      currentPage === pg
                        ? 'bg-[#0A6847] text-white'
                        : 'border border-[#DCE9E3] bg-white text-[#334155] hover:bg-[#F4F8F6]'
                    }`}
                  >
                    {pg}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((p) =>
                      Math.min(
                        Math.max(1, Math.ceil(filteredRows.length / pageSize)),
                        p + 1,
                      ),
                    )
                  }
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#DCE9E3] bg-white text-[#64748B] hover:bg-[#F4F8F6]"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <select
                aria-label="Transactions per page"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="h-7 rounded-lg border border-[#DCE9E3] bg-white px-2 text-[12px] font-medium text-[#334155]"
              >
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
              </select>
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR (3 cols): Search + Add Entry, Close Day, Payment Method Summary, Quick Actions */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-3.5">
          {/* Top Search + + Add Entry Row */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search transactions..."
                className="h-9 w-full rounded-xl border border-[#DCE9E3] bg-white pl-8 pr-3 text-[12px] text-[#111827] placeholder:text-[#94A3B8] focus:border-[#0A6847] focus:outline-hidden shadow-2xs"
              />
            </div>

            <button
              type="button"
              onClick={() => openQuickEntryModal('Sales', 'in', '')}
              className="inline-flex h-9 items-center gap-1 rounded-xl bg-[#0A6847] px-3 text-[12px] font-bold text-white shadow-2xs hover:bg-[#085238] shrink-0 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Entry</span>
              <ChevronDown className="h-3.5 w-3.5 ml-0.5 opacity-90" />
            </button>
          </div>

          {/* CARD 1: Close Day */}
          <div className="rounded-2xl border border-[#DCE9E3] bg-white p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[15.5px] font-extrabold text-[#111827]">
                Close Day
              </h2>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E6F6F0] px-2.5 py-0.5 text-[11px] font-bold text-[#0A7B56]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0A7B56]" />
                <span>{dayClosed ? 'Day Closed' : 'Day is Open'}</span>
              </span>
            </div>

            <div className="space-y-1.5 text-[12.5px]">
              <div className="flex justify-between text-[#475569]">
                <span>Opening Balance</span>
                <span className="font-bold text-[#111827]">
                  {currencySymbol} {openingBalance.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-[#475569]">
                <span>Total Money In</span>
                <span className="font-bold text-[#111827]">
                  {currencySymbol} {totalMoneyIn.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between text-[#475569]">
                <span>Total Money Out</span>
                <span className="font-bold text-[#111827]">
                  {currencySymbol} {totalMoneyOut.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-[#E6F6F0] px-3 py-2.5">
              <span className="text-[12px] font-extrabold text-[#0A6847]">
                Calculated Closing Balance
              </span>
              <span className="text-[15px] font-extrabold text-[#0A6847]">
                {currencySymbol} {closingBalance.toLocaleString('en-IN')}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setDayClosed((prev) => !prev);
                showToast(
                  dayClosed
                    ? 'Reopened Day Book for 12 Oct 2024'
                    : `Closed Day Book & verified closing balance ${currencySymbol} ${closingBalance.toLocaleString('en-IN')}`,
                );
              }}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#0A6847] text-[13px] font-bold text-white shadow-2xs hover:bg-[#085238] transition cursor-pointer"
            >
              <Lock className="h-4 w-4" />
              <span>{dayClosed ? 'Reopen Day' : 'Close Day'}</span>
            </button>
          </div>

          {/* CARD 2: Payment Method Summary */}
          <div className="rounded-2xl border border-[#DCE9E3] bg-white p-4 shadow-2xs space-y-3">
            <h2 className="text-[14.5px] font-extrabold text-[#111827]">
              Payment Method Summary
            </h2>

            <div className="space-y-2.5 text-[12.5px]">
              {paymentMethodStats.map((m) => (
                <div
                  key={m.label}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-md ${m.iconBg}`}
                    >
                      <m.Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="font-medium text-[#334155]">
                      {m.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-bold text-[#111827]">
                      {currencySymbol} {m.amount}
                    </span>
                    <span className="w-8 text-right text-[11.5px] text-[#64748B]">
                      {m.pct}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CARD 3: Quick Actions */}
          <div className="rounded-2xl border border-[#DCE9E3] bg-white p-4 shadow-2xs space-y-3">
            <h2 className="text-[14.5px] font-extrabold text-[#111827]">
              Quick Actions
            </h2>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() =>
                  openQuickEntryModal('Expense', 'out', 'Store Petty Expense')
                }
                className="flex items-center gap-2 rounded-xl border border-[#FFE4E6] bg-[#FFF1F2] p-3 text-left text-[12px] font-bold text-[#E11D48] hover:bg-[#FFE4E6] transition cursor-pointer"
              >
                <Wallet className="h-4 w-4 shrink-0" />
                <span>Add Expense</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  openQuickEntryModal(
                    'Supplier Payment',
                    'out',
                    'Payment to Supplier',
                  )
                }
                className="flex items-center gap-2 rounded-xl border border-[#FDE68A] bg-[#FEF3C7]/70 p-2.5 text-left text-[11.5px] font-bold text-[#B45309] hover:bg-[#FEF3C7] transition cursor-pointer leading-tight"
              >
                <Truck className="h-4 w-4 shrink-0" />
                <span>Record Supplier Payment</span>
              </button>

              <button
                type="button"
                onClick={() => openQuickEntryModal('Sales', 'in', '')}
                className="flex items-center gap-2 rounded-xl border border-[#BCE3D4] bg-[#E6F6F0]/70 p-3 text-left text-[11.5px] font-bold text-[#0A6847] hover:bg-[#E6F6F0] transition cursor-pointer leading-tight"
              >
                <ArrowUpDown className="h-4 w-4 shrink-0" />
                <span>Add Money In/Out</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-2 rounded-xl border border-[#DCE9E3] bg-[#F8FAFC] p-3 text-left text-[11.5px] font-bold text-[#1E293B] hover:bg-[#F1F5F9] transition cursor-pointer leading-tight"
              >
                <Printer className="h-4 w-4 shrink-0 text-[#475569]" />
                <span>Print Day Book</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Day Book Entry Modal */}
      {showEntryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#DCE9E3] bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#EBF2EE] pb-3">
              <h3 className="text-[15.5px] font-bold text-[#111827]">
                Add Day Book Entry
              </h3>
              <button
                type="button"
                onClick={() => setShowEntryModal(false)}
                className="rounded-lg p-1 text-[#64748B] hover:bg-[#F4F8F6]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={handleAddEntrySubmit}
              className="mt-4 space-y-3 text-[12.5px]"
            >
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#F1F5F3] p-1 font-bold">
                <button
                  type="button"
                  onClick={() =>
                    setEntryForm((s) => ({
                      ...s,
                      direction: 'in',
                      typeLabel: 'Sales',
                    }))
                  }
                  className={`rounded-lg py-1.5 ${
                    entryForm.direction === 'in'
                      ? 'bg-[#0A6847] text-white'
                      : 'text-[#475569]'
                  }`}
                >
                  Money In
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setEntryForm((s) => ({
                      ...s,
                      direction: 'out',
                      typeLabel: 'Expense',
                    }))
                  }
                  className={`rounded-lg py-1.5 ${
                    entryForm.direction === 'out'
                      ? 'bg-[#E11D48] text-white'
                      : 'text-[#475569]'
                  }`}
                >
                  Money Out
                </button>
              </div>

              <div>
                <label className="block text-[11.5px] font-semibold text-[#334155] mb-1">
                  Particulars *
                </label>
                <input
                  type="text"
                  required
                  value={entryForm.particularsTitle}
                  onChange={(e) =>
                    setEntryForm((s) => ({
                      ...s,
                      particularsTitle: e.target.value,
                    }))
                  }
                  placeholder="e.g. Electricity Bill / POS Sale"
                  className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11.5px] font-semibold text-[#334155] mb-1">
                    Payment Method
                  </label>
                  <select
                    value={entryForm.method}
                    onChange={(e) =>
                      setEntryForm((s) => ({
                        ...s,
                        method: e.target.value as DaybookShowcaseRow['method'],
                      }))
                    }
                    className="w-full rounded-xl border border-[#DCE9E3] bg-white px-3 py-2"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Card">Card</option>
                    <option value="Bank">Bank</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11.5px] font-semibold text-[#334155] mb-1">
                    Amount ({currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    required
                    value={entryForm.amount}
                    onChange={(e) =>
                      setEntryForm((s) => ({
                        ...s,
                        amount: Number(e.target.value),
                      }))
                    }
                    className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2 font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#EBF2EE]">
                <button
                  type="button"
                  onClick={() => setShowEntryModal(false)}
                  className="rounded-xl border border-[#DCE9E3] px-4 py-2 text-[12px] font-semibold text-[#475569]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#0A6847] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#085238]"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

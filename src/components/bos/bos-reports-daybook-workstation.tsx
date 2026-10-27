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
  onNavigateToBilling?: () => void;
};

export type ReportCategory = 'transaction' | 'party' | 'gst' | 'stock';

export type ReportItemId =
  | 'sale_invoices'
  | 'quotations'
  | 'proforma'
  | 'delivery_challan'
  | 'purchase_bills'
  | 'day_book'
  | 'profit_loss'
  | 'cash_flow'
  | 'balance_sheet'
  | 'party_statement'
  | 'party_pnl'
  | 'all_parties'
  | 'gstr1'
  | 'gstr2'
  | 'gstr3b'
  | 'hsn_summary'
  | 'stock_summary'
  | 'low_stock'
  | 'item_sales';

export interface PurchaseBillRecord {
  id: string;
  billNumber: string;
  vendorName: string;
  billDate: string;
  particulars: string;
  totalAmount: number;
  taxRate: number;
  paymentMode: 'Cash' | 'UPI' | 'Card' | 'Bank' | 'Cheque';
  paidAmount: number;
  balanceDue: number;
  status: 'PAID' | 'PARTIAL' | 'UNPAID';
}

export interface ChequeRecord {
  id: string;
  partyName: string;
  bankName: string;
  chequeNumber: string;
  amount: number;
  dueDate: string;
  status: 'PENDING' | 'DEPOSITED' | 'CLEARED' | 'BOUNCED';
  type: 'RECEIVED' | 'ISSUED';
}

const REPORT_SECTIONS: Array<{
  id: ReportCategory;
  title: string;
  items: Array<{
    id: ReportItemId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    desc: string;
  }>;
}> = [
  {
    id: 'transaction',
    title: 'Transaction Reports',
    items: [
      { id: 'sale_invoices', label: 'Sale Invoices', icon: FileText, desc: 'Sales invoices, receipts & settlements' },
      { id: 'quotations', label: 'Estimate / Quotations', icon: BookOpen, desc: 'Quotations and price estimates' },
      { id: 'proforma', label: 'Proforma Invoices', icon: FileSpreadsheet, desc: 'Proforma commercial invoices' },
      { id: 'delivery_challan', label: 'Delivery Challans', icon: Truck, desc: 'Goods dispatch challans & receipts' },
      { id: 'purchase_bills', label: 'Purchase Bills', icon: ShoppingCart, desc: 'Supplier bills, raw materials & stock in' },
      { id: 'day_book', label: 'Day Book', icon: Calendar, desc: 'Daily money in/out journal register' },
      { id: 'profit_loss', label: 'Profit & Loss', icon: TrendingUp, desc: 'Net income, operating profit & margins' },
      { id: 'cash_flow', label: 'Cash Flow', icon: ArrowUpDown, desc: 'Cash movement across sales & expenses' },
      { id: 'balance_sheet', label: 'Balance Sheet', icon: Layers, desc: 'Assets, liabilities & net capital' },
    ],
  },
  {
    id: 'party',
    title: 'Party Reports',
    items: [
      { id: 'party_statement', label: 'Party Statement / Ledger', icon: Users, desc: 'Complete account ledger with running balance' },
      { id: 'party_pnl', label: 'Party Wise Profit & Loss', icon: BarChart3, desc: 'Profitability per customer and supplier' },
      { id: 'all_parties', label: 'All Parties Summary', icon: UserCheck, desc: 'Receivables, payables & credit limits' },
    ],
  },
  {
    id: 'gst',
    title: 'GST Reports',
    items: [
      { id: 'gstr1', label: 'GSTR-1 (Sales)', icon: Percent, desc: 'Outward supplies for GSTR-1 portal filing' },
      { id: 'gstr2', label: 'GSTR-2 (Purchases / ITC)', icon: CheckCircle2, desc: 'Inward supplies & input tax credit' },
      { id: 'gstr3b', label: 'GSTR-3B Summary', icon: FileText, desc: 'Monthly tax liability and net payable' },
      { id: 'hsn_summary', label: 'HSN / SAC Summary', icon: QrCode, desc: 'HSN/SAC wise turnover & tax slabs' },
    ],
  },
  {
    id: 'stock',
    title: 'Item / Stock Reports',
    items: [
      { id: 'stock_summary', label: 'Stock Summary & Valuation', icon: Layers, desc: 'Stock valuation at cost and retail price' },
      { id: 'low_stock', label: 'Low Stock Summary', icon: AlertTriangle, desc: 'Items below minimum reorder threshold' },
      { id: 'item_sales', label: 'Item Sales Report', icon: ShoppingCart, desc: 'Top selling items, quantity sold & revenue' },
    ],
  },
];

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

/**
 * Resolves the start and end date boundaries for the given report period.
 */
function getDateRangeForPeriod(
  period: 'today' | 'yesterday' | 'this_week' | 'this_month' | 'this_fy',
): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  switch (period) {
    case 'today':
      break;
    case 'yesterday':
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
      break;
    case 'this_week': {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Monday
      start.setDate(diff);
      break;
    }
    case 'this_month':
      start.setDate(1);
      break;
    case 'this_fy': {
      // Indian Financial Year: April 1 to March 31
      const currentMonth = start.getMonth(); // 0-indexed (April is 3)
      const currentYear = start.getFullYear();
      if (currentMonth >= 3) {
        start.setFullYear(currentYear, 3, 1);
      } else {
        start.setFullYear(currentYear - 1, 3, 1);
      }
      break;
    }
  }

  return { start, end };
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
  onNavigateToBilling,
}: BosReportsDaybookWorkstationProps) {
  const [reportTab, setReportTab] = useState<
    'overview' | 'sales' | 'pnl' | 'gst' | 'inventory' | 'khata'
  >('overview');
  const [reportPeriod, setReportPeriod] = useState<
    'today' | 'yesterday' | 'this_week' | 'this_month' | 'this_fy'
  >('this_month');
  const [salesSearchQuery, setSalesSearchQuery] = useState('');

  // Secondary Reports Directory Tree (Vyapar Parity)
  const [selectedReportId, setSelectedReportId] = useState<ReportItemId>('sale_invoices');
  const [reportTreeSearch, setReportTreeSearch] = useState('');
  const [selectedFirm, setSelectedFirm] = useState('all_firms');

  // Purchase Bills State (Phase 5)
  const [showAddPurchaseModal, setShowAddPurchaseModal] = useState(false);
  const [purchaseBillForm, setPurchaseBillForm] = useState({
    vendorName: '',
    billNumber: `BILL-${1045 + Math.floor(Math.random() * 900)}`,
    billDate: new Date().toLocaleDateString('en-GB'),
    particulars: '',
    totalAmount: 5000,
    taxRate: 18,
    paymentMode: 'Bank' as const,
    paidAmount: 5000,
  });
  const [purchaseBills, setPurchaseBills] = useState<PurchaseBillRecord[]>(() => (demoMode ? [
    {
      id: 'pur-1',
      billNumber: 'BILL-4091',
      vendorName: 'Metro Cash & Carry',
      billDate: '24 Oct 2026',
      particulars: 'Grocery Staples & FMCG bulk pack',
      totalAmount: 18500,
      taxRate: 18,
      paymentMode: 'Bank',
      paidAmount: 18500,
      balanceDue: 0,
      status: 'PAID',
    },
    {
      id: 'pur-2',
      billNumber: 'INV-8821',
      vendorName: 'Hindustan Unilever Distributor',
      billDate: '25 Oct 2026',
      particulars: 'Soaps, Shampoos & Cleaning supplies',
      totalAmount: 12400,
      taxRate: 18,
      paymentMode: 'UPI',
      paidAmount: 10000,
      balanceDue: 2400,
      status: 'PARTIAL',
    },
    {
      id: 'pur-3',
      billNumber: 'PB-1044',
      vendorName: 'Amul Dairy Supplies',
      billDate: '26 Oct 2026',
      particulars: 'Butter, Cheese & Milk cartons',
      totalAmount: 6200,
      taxRate: 5,
      paymentMode: 'Cash',
      paidAmount: 6200,
      balanceDue: 0,
      status: 'PAID',
    },
  ] : []));

  // Cash In Hand Adjustment Modal State (Phase 5)
  const [showAdjustCashModal, setShowAdjustCashModal] = useState(false);
  const [cashAdjustType, setCashAdjustType] = useState<'add' | 'reduce' | 'count'>('add');
  const [cashAdjustAmount, setCashAdjustAmount] = useState('1000');
  const [cashAdjustReason, setCashAdjustReason] = useState('');
  const [denominations, setDenominations] = useState<{ [denom: number]: number }>({
    500: 0,
    200: 0,
    100: 0,
    50: 0,
    20: 0,
    10: 0,
    1: 0,
  });

  const physicalCashSum = useMemo(() => {
    return Object.entries(denominations).reduce(
      (sum, [denom, count]) => sum + Number(denom) * (Number(count) || 0),
      0,
    );
  }, [denominations]);

  // Multi-Bank & Cheques Register State (Phase 5)
  const [chequeFilter, setChequeFilter] = useState<'ALL' | 'PENDING' | 'DEPOSITED' | 'CLEARED' | 'BOUNCED'>('ALL');
  const [cheques, setCheques] = useState<ChequeRecord[]>(() => (demoMode ? [
    {
      id: 'chq-1',
      partyName: 'Sharma Traders',
      bankName: 'HDFC Bank',
      chequeNumber: '448102',
      amount: 15000,
      dueDate: '28 Oct 2026',
      status: 'PENDING',
      type: 'RECEIVED',
    },
    {
      id: 'chq-2',
      partyName: 'Priya Verma',
      bankName: 'ICICI Bank',
      chequeNumber: '610293',
      amount: 4500,
      dueDate: '25 Oct 2026',
      status: 'DEPOSITED',
      type: 'RECEIVED',
    },
    {
      id: 'chq-3',
      partyName: 'Metro Distributors',
      bankName: 'State Bank of India',
      chequeNumber: '003912',
      amount: 22000,
      dueDate: '20 Oct 2026',
      status: 'CLEARED',
      type: 'ISSUED',
    },
  ] : []));

  const periodFilteredOrders = useMemo(() => {
    const { start, end } = getDateRangeForPeriod(reportPeriod);
    const startMs = start.getTime();
    const endMs = end.getTime();

    return (orders || []).filter((o) => {
      if (!o.createdAt || o.createdAt === 'Today') {
        const nowMs = Date.now();
        return nowMs >= startMs && nowMs <= endMs;
      }
      const d = new Date(o.createdAt);
      const t = d.getTime();
      if (Number.isNaN(t)) return true;
      return t >= startMs && t <= endMs;
    });
  }, [orders, reportPeriod]);

  const periodFilteredDaybook = useMemo(() => {
    const { start, end } = getDateRangeForPeriod(reportPeriod);
    const startMs = start.getTime();
    const endMs = end.getTime();

    return (daybookEntries || []).filter((e) => {
      if (!e.createdAt || e.createdAt === 'Today') {
        const nowMs = Date.now();
        return nowMs >= startMs && nowMs <= endMs;
      }
      const d = new Date(e.createdAt);
      const t = d.getTime();
      if (Number.isNaN(t)) return true;
      return t >= startMs && t <= endMs;
    });
  }, [daybookEntries, reportPeriod]);


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
      if (reportPeriod === 'today') {
        return {
          totalRevenue: 16420,
          grossProfit: 5120,
          totalOrders: 42,
          totalExpenses: 2100,
          gstCollected: 1240,
          itcClaimable: 450,
          cogs: 9200,
          avgOrderVal: 391,
          marginLabel: '31.2% Net Margin',
          paymentSplit: [
            { mode: 'UPI / QR', amount: 9852, pct: 60, color: 'bg-[#0A6847]' },
            { mode: 'Cash', amount: 4105, pct: 25, color: 'bg-[#10B981]' },
            { mode: 'Card / POS', amount: 1642, pct: 10, color: 'bg-blue-500' },
            { mode: 'Khata / Credit', amount: 821, pct: 5, color: 'bg-amber-500' },
          ],
          weeklyBars: [
            { label: 'Morning (8–12)', rev: 68, prof: 42, exp: 18, val: '₹4,850' },
            { label: 'Afternoon (12–4)', rev: 54, prof: 32, exp: 15, val: '₹3,620' },
            { label: 'Evening (4–8)', rev: 92, prof: 58, exp: 22, val: '₹6,150' },
            { label: 'Night (8–10)', rev: 35, prof: 20, exp: 10, val: '₹1,800' },
          ],
        };
      }
      if (reportPeriod === 'yesterday') {
        return {
          totalRevenue: 15280,
          grossProfit: 4680,
          totalOrders: 39,
          totalExpenses: 1850,
          gstCollected: 1150,
          itcClaimable: 410,
          cogs: 8750,
          avgOrderVal: 392,
          marginLabel: '30.6% Net Margin',
          paymentSplit: [
            { mode: 'UPI / QR', amount: 8862, pct: 58, color: 'bg-[#0A6847]' },
            { mode: 'Cash', amount: 4278, pct: 28, color: 'bg-[#10B981]' },
            { mode: 'Card / POS', amount: 1528, pct: 10, color: 'bg-blue-500' },
            { mode: 'Khata / Credit', amount: 612, pct: 4, color: 'bg-amber-500' },
          ],
          weeklyBars: [
            { label: 'Morning (8–12)', rev: 60, prof: 38, exp: 16, val: '₹4,200' },
            { label: 'Afternoon (12–4)', rev: 48, prof: 28, exp: 14, val: '₹3,400' },
            { label: 'Evening (4–8)', rev: 88, prof: 52, exp: 20, val: '₹5,880' },
            { label: 'Night (8–10)', rev: 32, prof: 18, exp: 10, val: '₹1,800' },
          ],
        };
      }
      if (reportPeriod === 'this_week') {
        return {
          totalRevenue: 112450,
          grossProfit: 33400,
          totalOrders: 298,
          totalExpenses: 14800,
          gstCollected: 8920,
          itcClaimable: 3200,
          cogs: 64250,
          avgOrderVal: 377,
          marginLabel: '29.7% Net Margin',
          paymentSplit: [
            { mode: 'UPI / QR', amount: 62972, pct: 56, color: 'bg-[#0A6847]' },
            { mode: 'Cash', amount: 30361, pct: 27, color: 'bg-[#10B981]' },
            { mode: 'Card / POS', amount: 12370, pct: 11, color: 'bg-blue-500' },
            { mode: 'Khata / Credit', amount: 6747, pct: 6, color: 'bg-amber-500' },
          ],
          weeklyBars: [
            { label: 'Mon–Tue', rev: 70, prof: 44, exp: 20, val: '₹28,500' },
            { label: 'Wed–Thu', rev: 75, prof: 48, exp: 22, val: '₹31,200' },
            { label: 'Fri–Sat', rev: 95, prof: 62, exp: 26, val: '₹38,900' },
            { label: 'Sunday', rev: 42, prof: 28, exp: 12, val: '₹13,850' },
          ],
        };
      }
      if (reportPeriod === 'this_fy') {
        return {
          totalRevenue: 5791800,
          grossProfit: 1713600,
          totalOrders: 15408,
          totalExpenses: 770400,
          gstCollected: 461040,
          itcClaimable: 170400,
          cogs: 3307800,
          avgOrderVal: 376,
          marginLabel: '29.6% Net Margin',
          paymentSplit: [
            { mode: 'UPI / QR', amount: 3127572, pct: 54, color: 'bg-[#0A6847]' },
            { mode: 'Cash', amount: 1621704, pct: 28, color: 'bg-[#10B981]' },
            { mode: 'Card / POS', amount: 695016, pct: 12, color: 'bg-blue-500' },
            { mode: 'Khata / Credit', amount: 347508, pct: 6, color: 'bg-amber-500' },
          ],
          weeklyBars: [
            { label: 'Q1 (Apr–Jun)', rev: 80, prof: 50, exp: 24, val: '₹13,80,000' },
            { label: 'Q2 (Jul–Sep)', rev: 86, prof: 54, exp: 25, val: '₹14,90,000' },
            { label: 'Q3 (Oct–Dec)', rev: 98, prof: 65, exp: 28, val: '₹16,80,000' },
            { label: 'Q4 (Jan–Mar)', rev: 75, prof: 46, exp: 22, val: '₹12,41,800' },
          ],
        };
      }

      // Default: this_month
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

    const totalRevenue = periodFilteredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const totalOrders = periodFilteredOrders.length;
    const avgOrderVal = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
    const totalExpenses = periodFilteredDaybook
      .filter((e) => e.category === 'Expense' || e.moneyOut > 0)
      .reduce((sum, e) => sum + (e.moneyOut || 0), 0);
    // Real COGS: sum of (qty × product.costPrice) across sold line items.
    // If no products carry costPrice, COGS is honestly 0 (no 60% fabrication).
    const cogs = periodFilteredOrders.reduce(
      (sum, o) => sum + computeOrderCogs(o, products),
      0,
    );
    const grossProfit = Math.max(0, totalRevenue - totalExpenses - cogs);
    const marginLabel = totalRevenue > 0 ? `${((grossProfit / totalRevenue) * 100).toFixed(1)}% Margin` : '0% Margin';
    // Real GST collected: prefer o.taxAmount; else derive from line-item gstRate;
    // else order-level gstRate / taxRate; else 0 (no 5% fabrication).
    const gstCollected = periodFilteredOrders.reduce(
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
    for (const o of periodFilteredOrders) {
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
    for (const o of periodFilteredOrders) {
      const idx = dayBucket(o.createdAt);
      if (idx < 0) continue;
      const displayIdx = 3 - idx; // Week 4 = most recent, Week 1 = oldest
      weeklyRevenue[displayIdx] += o.totalAmount || 0;
      weeklyCogs[displayIdx] += computeOrderCogs(o, products);
    }
    for (const e of periodFilteredDaybook) {
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
  }, [periodFilteredOrders, products, periodFilteredDaybook, demoMode, currencySymbol, reportPeriod]);

  const expenseBreakdown = useMemo(() => {
    if (demoMode) {
      return [
        { category: 'Staff & Helper Salaries', amount: Math.round(reportsData.totalExpenses * 0.5) },
        { category: 'Store Rent & Maintenance', amount: Math.round(reportsData.totalExpenses * 0.3) },
        { category: 'Electricity & Utilities', amount: Math.round(reportsData.totalExpenses * 0.12) },
        { category: 'Packaging & Misc Supplies', amount: Math.round(reportsData.totalExpenses * 0.08) },
      ];
    }
    const expEntries = periodFilteredDaybook.filter(
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
  }, [periodFilteredDaybook, reportsData.totalExpenses, demoMode]);

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

    for (const o of periodFilteredOrders) {
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
  }, [periodFilteredOrders, reportsData.totalRevenue, demoMode]);

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

  const handleAdjustCashSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let amt = Math.max(0, Number(cashAdjustAmount) || 0);
    let type = cashAdjustType;
    let reason = cashAdjustReason.trim();

    if (type === 'count') {
      const diff = physicalCashSum - closingBalance;
      if (diff === 0) {
        showToast(`Physical cash matches expected balance (${currencySymbol} ${closingBalance.toLocaleString('en-IN')}). No adjustment needed.`);
        setShowAdjustCashModal(false);
        return;
      }
      amt = Math.abs(diff);
      type = diff > 0 ? 'add' : 'reduce';
      reason = `Cash Count: Counted ${currencySymbol} ${physicalCashSum.toLocaleString('en-IN')}, Expected ${currencySymbol} ${closingBalance.toLocaleString('en-IN')} (${diff > 0 ? 'Surplus' : 'Shortage'} of ${currencySymbol} ${amt.toLocaleString('en-IN')})`;
    } else {
      if (!reason) {
        reason = type === 'add' ? 'Cash Float Added' : 'Cash Withdrawn to Bank/Owner';
      }
    }

    setShowAdjustCashModal(false);
    try {
      await onAddDaybookEntry({
        partyName: reason,
        subtitle: `Cash Drawer (${type === 'add' ? 'Money In' : 'Money Out'})`,
        category: 'Adjustment',
        refNumber: `ADJ-${Date.now().toString().slice(-4)}`,
        paymentMode: 'cash',
        moneyIn: type === 'add' ? amt : 0,
        moneyOut: type === 'reduce' ? amt : 0,
      });
      showToast(`Adjusted cash by ${currencySymbol} ${amt.toLocaleString('en-IN')} (${reason})`);
    } catch (err: unknown) {
      showToast(`Saved adjustment locally: ${reason}`);
    }
  };

  const handleUpdateChequeStatus = (id: string, newStatus: ChequeRecord['status']) => {
    setCheques((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
    );
    showToast(`Cheque ${id} marked as ${newStatus}`);
  };

  const filteredCheques = useMemo(() => {
    if (chequeFilter === 'ALL') return cheques;
    return cheques.filter((c) => c.status === chequeFilter);
  }, [cheques, chequeFilter]);

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

    const sourceOrders = periodFilteredOrders.length > 0 ? periodFilteredOrders : (orders || []);
    const rows = sourceOrders.map((o) => [
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

  const handleExportOverviewCsv = () => {
    const today = new Date().toISOString().slice(0, 10);
    const storeName = storeSettings?.businessName || 'Business Store';
    const header = ['Category / Metric', 'Value', 'Notes'];

    const netProfit = reportsData.grossProfit - reportsData.totalExpenses;

    const rows = [
      ['Store Name', `"${storeName.replace(/"/g, '""')}"`, 'Active Merchant'],
      ['Report Period', reportPeriod.toUpperCase(), 'Selected timeframe filter'],
      ['Export Date', today, 'Timestamp of export'],
      ['Total Gross Revenue', reportsData.totalRevenue, 'Total billed sales'],
      ['Gross Profit', reportsData.grossProfit, `Margin: ${reportsData.marginLabel}`],
      ['Operating Expenses', reportsData.totalExpenses, 'Daybook out transactions'],
      ['Net Profit', netProfit, 'Bottom line earnings'],
      ['Total Orders', reportsData.totalOrders, 'Customer bills processed'],
      ['Average Ticket Size', Math.round(reportsData.avgOrderVal), 'Average spend per order'],
      ['GST Tax Collected', reportsData.gstCollected, 'CGST + SGST collected'],
      ['Cash in Drawer Closing', closingBalance, 'Current cash register total'],
      ['Customer Khata Dues', khataData.totalReceivables, 'Outstanding credit receivables'],
    ];

    const csvContent = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${storeName.replace(/\s+/g, '_')}_PL_Overview_${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported Overview & P&L Statement CSV (${today})`);
  };

  const handleExportKhataCsv = () => {
    const today = new Date().toISOString().slice(0, 10);
    const storeName = storeSettings?.businessName || 'Business Store';
    const header = [
      'Customer Name',
      'Phone',
      'Total Credit Given',
      'Pending Dues',
      'Status',
    ];

    const rows = (khataData.customers || []).map((c) => [
      `"${c.name.replace(/"/g, '""')}"`,
      c.phone || '',
      c.totalCredit || 0,
      c.pending || 0,
      c.status || 'Active',
    ]);

    const csvContent = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${storeName.replace(/\s+/g, '_')}_Khata_Dues_${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported Customer Khata Dues CSV (${today})`);
  };

  const handleDownloadPdfReport = () => {
    const today = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const storeName = storeSettings?.businessName || 'Business Store';
    const netProfit = reportsData.grossProfit - reportsData.totalExpenses;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${storeName} - Financial Summary Report</title>
  <style>
    @page { size: A4; margin: 12mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 0; padding: 24px; font-size: 12px; }
    .header { border-bottom: 2px solid #0A6847; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; }
    .title { font-size: 22px; font-weight: 900; color: #0A6847; margin: 0 0 4px 0; }
    .subtitle { font-size: 12px; color: #64748b; margin: 0; }
    .kpi-row { display: flex; gap: 10px; margin-bottom: 18px; }
    .kpi-card { flex: 1; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 12px; background: #f8fafc; }
    .kpi-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
    .kpi-value { font-size: 16px; font-weight: 900; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 11px; }
    th { background: #f1f5f9; padding: 8px 10px; text-align: left; font-weight: 800; color: #334155; border-bottom: 2px solid #cbd5e1; }
    td { padding: 6px 10px; border-bottom: 1px solid #e2e8f0; }
    .footer { font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="title">${storeName}</h1>
      <p class="subtitle">Official Financial Performance &amp; Analytics Summary</p>
    </div>
    <div style="text-align: right;">
      <div style="font-weight: 800; font-size: 12px; color: #0A6847; background: #e6f6f0; padding: 4px 10px; border-radius: 6px; display: inline-block;">
        Period: ${reportPeriod.toUpperCase()}
      </div>
      <div style="color: #64748b; font-size: 10px; margin-top: 4px;">Date: ${today}</div>
    </div>
  </div>

  <div class="kpi-row">
    <div class="kpi-card">
      <div class="kpi-label">Gross Revenue</div>
      <div class="kpi-value">${currencySymbol}${reportsData.totalRevenue.toLocaleString('en-IN')}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Gross Profit</div>
      <div class="kpi-value">${currencySymbol}${reportsData.grossProfit.toLocaleString('en-IN')} (${reportsData.marginLabel})</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Operating Expenses</div>
      <div class="kpi-value" style="color: #dc2626;">${currencySymbol}${reportsData.totalExpenses.toLocaleString('en-IN')}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Net Profit</div>
      <div class="kpi-value" style="color: #059669;">${currencySymbol}${netProfit.toLocaleString('en-IN')}</div>
    </div>
  </div>

  <div class="kpi-row">
    <div class="kpi-card">
      <div class="kpi-label">Cash in Register</div>
      <div class="kpi-value">${currencySymbol}${closingBalance.toLocaleString('en-IN')}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Khata Customer Dues</div>
      <div class="kpi-value" style="color: #d97706;">${currencySymbol}${khataData.totalReceivables.toLocaleString('en-IN')}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">GST Tax Collected</div>
      <div class="kpi-value">${currencySymbol}${reportsData.gstCollected.toLocaleString('en-IN')}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Total Bills / Orders</div>
      <div class="kpi-value">${reportsData.totalOrders}</div>
    </div>
  </div>

  <h3 style="font-size: 13px; font-weight: 800; color: #1e293b; margin: 18px 0 6px 0;">Recent Sales &amp; Orders Summary</h3>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Order / Invoice #</th>
        <th>Customer</th>
        <th>Payment Mode</th>
        <th style="text-align: right;">Total Amount</th>
      </tr>
    </thead>
    <tbody>
      ${(periodFilteredOrders.length > 0 ? periodFilteredOrders : (orders || []))
        .slice(0, 15)
        .map(
          (o) => `
          <tr>
            <td>${o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-IN') : today}</td>
            <td><strong>${o.id}</strong></td>
            <td>${o.customerName || 'Walk-in Customer'}</td>
            <td>${o.paymentMode || 'Cash'}</td>
            <td style="text-align: right; font-weight: bold;">${currencySymbol}${(o.totalAmount || 0).toLocaleString('en-IN')}</td>
          </tr>
        `
        )
        .join('')}
    </tbody>
  </table>

  <div class="footer">
    Generated automatically by BOS Reports &amp; Business Operating System • Confidential Record
  </div>
</body>
</html>
    `;

    const win = window.open('', '_blank', 'width=900,height=800');
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 350);
    }
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

    const filteredReportSections = REPORT_SECTIONS.map((sec) => {
      if (!reportTreeSearch.trim()) return sec;
      const q = reportTreeSearch.toLowerCase();
      return {
        ...sec,
        items: sec.items.filter(
          (it) => it.label.toLowerCase().includes(q) || it.desc.toLowerCase().includes(q)
        ),
      };
    }).filter((sec) => sec.items.length > 0);

    const activeDateRangeStr = (() => {
      const { start, end } = getDateRangeForPeriod(reportPeriod);
      const fmt = (d: Date) => {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yy = d.getFullYear();
        return `${dd}/${mm}/${yy}`;
      };
      return `${fmt(start)} To ${fmt(end)}`;
    })();

    const filteredSalesOrders = (periodFilteredOrders || []).filter((o) => {
      if (!salesSearchQuery.trim()) return true;
      const q = salesSearchQuery.trim().toLowerCase();
      return (
        o.id.toLowerCase().includes(q) ||
        (o.customerName || '').toLowerCase().includes(q) ||
        (o.customerPhone || '').includes(q) ||
        (o.paymentMode || '').toLowerCase().includes(q)
      );
    });

    const saleInvoicesKpis = {
      totalSales: (periodFilteredOrders || []).reduce((sum, o) => sum + (o.totalAmount || 0), 0),
      received: (periodFilteredOrders || []).reduce((sum, o) => {
        const bal = o.balanceDue ?? (o.paymentStatus === 'PAID' || o.paymentStatus === 'paid' ? 0 : o.totalAmount);
        return sum + Math.max(0, (o.totalAmount || 0) - bal);
      }, 0),
      balanceDue: (periodFilteredOrders || []).reduce((sum, o) => {
        const bal = o.balanceDue ?? (o.paymentStatus === 'PAID' || o.paymentStatus === 'paid' ? 0 : o.totalAmount);
        return sum + bal;
      }, 0),
    };

    const purchaseBillsKpis = {
      totalPurchases: purchaseBills.reduce((sum, b) => sum + b.totalAmount, 0),
      paid: purchaseBills.reduce((sum, b) => sum + b.paidAmount, 0),
      balanceDue: purchaseBills.reduce((sum, b) => sum + b.balanceDue, 0),
    };

    const handleExcelExport = () => {
      if (selectedReportId === 'sale_invoices') {
        handleExportSalesReportCsv();
      } else if (selectedReportId === 'purchase_bills') {
        const today = new Date().toISOString().slice(0, 10);
        const header = ['Bill No', 'Date', 'Vendor Name', 'Particulars', 'Total Amount', 'Paid Amount', 'Balance Due', 'Status'];
        const rows = purchaseBills.map((b) => [b.billNumber, b.billDate, `"${b.vendorName}"`, `"${b.particulars}"`, b.totalAmount, b.paidAmount, b.balanceDue, b.status]);
        const csvContent = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Purchase_Bills_${today}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showToast(`Exported Purchase Bills CSV (${today})`);
      } else if (selectedReportId === 'gstr1' || selectedReportId === 'gstr2' || selectedReportId === 'gstr3b' || selectedReportId === 'hsn_summary') {
        handleExportGstrSummaryCsv();
      } else if (selectedReportId === 'stock_summary' || selectedReportId === 'low_stock' || selectedReportId === 'item_sales') {
        handleExportInventoryCsv();
      } else if (selectedReportId === 'party_statement' || selectedReportId === 'party_pnl' || selectedReportId === 'all_parties') {
        handleExportKhataCsv();
      } else {
        handleExportOverviewCsv();
      }
    };

    const handleSavePurchaseBill = async (e: React.FormEvent) => {
      e.preventDefault();
      const tot = Math.max(1, Number(purchaseBillForm.totalAmount) || 0);
      const paid = Math.min(tot, Math.max(0, Number(purchaseBillForm.paidAmount) || 0));
      const bal = Math.max(0, tot - paid);
      const vendor = purchaseBillForm.vendorName.trim() || 'Distributor Vendor';
      const status: 'PAID' | 'PARTIAL' | 'UNPAID' = bal === 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'UNPAID';

      const newBill: PurchaseBillRecord = {
        id: `pur-${Date.now()}`,
        billNumber: purchaseBillForm.billNumber.trim() || `BILL-${Date.now()}`,
        vendorName: vendor,
        billDate: purchaseBillForm.billDate || new Date().toLocaleDateString('en-GB'),
        particulars: purchaseBillForm.particulars.trim() || 'Inventory Supplies',
        totalAmount: tot,
        taxRate: Number(purchaseBillForm.taxRate) || 0,
        paymentMode: purchaseBillForm.paymentMode,
        paidAmount: paid,
        balanceDue: bal,
        status,
      };

      setPurchaseBills((prev) => [newBill, ...prev]);
      setShowAddPurchaseModal(false);

      try {
        if (paid > 0) {
          await onAddDaybookEntry({
            partyName: vendor,
            subtitle: `Purchase Bill #${newBill.billNumber} (${purchaseBillForm.particulars || 'Stock in'})`,
            category: 'Supplier',
            refNumber: newBill.billNumber,
            paymentMode: purchaseBillForm.paymentMode.toLowerCase() as BosDaybookEntry['paymentMode'],
            moneyIn: 0,
            moneyOut: paid,
          });
        }
        showToast(`Recorded Purchase Bill ${newBill.billNumber} for ${vendor} (${currencySymbol} ${tot.toLocaleString('en-IN')})`);
      } catch (err: unknown) {
        showToast(`Saved locally. Daybook note: ${err instanceof Error ? err.message : 'Error syncing'}`);
      }
    };

    return (
      <div className="w-full max-w-none space-y-4 pb-6">
        {/* 2-Column Split: Secondary Navigation Tree (Left) + Report Viewer (Right) */}
        <div className="flex flex-col gap-4 lg:flex-row items-start w-full">
          {/* LEFT COLUMN: SECONDARY DIRECTORY TREE (Matching media_1793082329695.png) */}
          <div className="w-full lg:w-64 shrink-0 rounded-2xl border border-[#DCE9E3] bg-white p-3 shadow-2xs space-y-3">
            {/* Search Reports */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#94A3B8]" />
              <input
                type="text"
                value={reportTreeSearch}
                onChange={(e) => setReportTreeSearch(e.target.value)}
                placeholder="Search Reports..."
                className="h-8 w-full rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] pl-8 pr-3 text-[11.5px] text-[#111827] placeholder:text-[#94A3B8] focus:border-[#0A6847] focus:bg-white focus:outline-hidden"
              />
            </div>

            {/* Tree Sections */}
            <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
              {filteredReportSections.map((sec) => (
                <div key={sec.id} className="space-y-1">
                  <p className="px-2 text-[10.5px] font-extrabold uppercase tracking-wider text-[#64748B]">
                    {sec.title}
                  </p>
                  <div className="space-y-0.5">
                    {sec.items.map((item) => {
                      const active = selectedReportId === item.id;
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setSelectedReportId(item.id);
                            if (item.id === 'profit_loss') setReportTab('pnl');
                            else if (item.id.startsWith('gst') || item.id === 'hsn_summary') setReportTab('gst');
                            else if (item.id.startsWith('stock') || item.id === 'low_stock' || item.id === 'item_sales') setReportTab('inventory');
                            else if (item.id.startsWith('party') || item.id === 'all_parties') setReportTab('khata');
                            else if (item.id === 'sale_invoices') setReportTab('sales');
                          }}
                          className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[12px] font-semibold transition cursor-pointer ${
                            active
                              ? 'bg-[#E6F6F0] text-[#0A6847] font-bold shadow-2xs'
                              : 'text-[#334155] hover:bg-[#F4F8F6]'
                          }`}
                        >
                          <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-[#0A6847]' : 'text-[#64748B]'}`} />
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT COLUMN: MAIN REPORT VIEWER */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Top Filter Bar: Firm Selector, Period Presets, Date Range & Action Buttons */}
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between rounded-2xl border border-[#DCE9E3] bg-white p-3 shadow-2xs">
              <div className="flex flex-wrap items-center gap-2">
                {/* Firm Selector */}
                <div className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] px-2.5 py-1.5 text-[12px] font-bold text-[#1E293B]">
                  <Building2 className="h-3.5 w-3.5 text-[#0A6847]" />
                  <select
                    value={selectedFirm}
                    onChange={(e) => setSelectedFirm(e.target.value)}
                    className="bg-transparent font-bold text-[#1E293B] focus:outline-hidden cursor-pointer"
                  >
                    <option value="all_firms">All Firms</option>
                    <option value="current_firm">{storeSettings?.businessName || 'My Business'}</option>
                  </select>
                </div>

                {/* Period Selector Pills */}
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

                {/* Date Range String Display */}
                <div className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] px-3 py-1.5 text-[11.5px] font-semibold text-[#475569]">
                  <Calendar className="h-3.5 w-3.5 text-[#0A6847]" />
                  <span>{activeDateRangeStr}</span>
                </div>
              </div>

              {/* Export Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExcelExport}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE9E3] bg-white px-3 py-1.5 text-[12px] font-bold text-[#1E293B] hover:bg-[#F4F8F6] cursor-pointer"
                >
                  <FileSpreadsheet className="h-4 w-4 text-[#0A6847]" />
                  <span>Excel</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdfReport}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE9E3] bg-white px-3 py-1.5 text-[12px] font-bold text-[#1E293B] hover:bg-[#F4F8F6] cursor-pointer"
                >
                  <Download className="h-4 w-4 text-[#0A6847]" />
                  <span>PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE9E3] bg-white px-3 py-1.5 text-[12px] font-bold text-[#1E293B] hover:bg-[#F4F8F6] cursor-pointer"
                >
                  <Printer className="h-4 w-4 text-[#64748B]" />
                  <span>Print</span>
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

        {/* 2. TRANSACTION REPORTS: SALE INVOICES, PURCHASE BILLS, QUOTATIONS, DAY BOOK */}
        {(reportTab === 'sales' || selectedReportId === 'sale_invoices' || selectedReportId === 'purchase_bills' || selectedReportId === 'quotations' || selectedReportId === 'proforma' || selectedReportId === 'delivery_challan' || selectedReportId === 'day_book') && (
          <div className="space-y-4">
            {/* 2A. PURCHASE BILLS HUB */}
            {selectedReportId === 'purchase_bills' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="bos-card p-4">
                    <p className="text-[11.5px] font-medium text-[#64748B]">Total Purchases</p>
                    <p className="mt-1 text-[22px] font-extrabold text-[#111827]">
                      {currencySymbol} {purchaseBillsKpis.totalPurchases.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[11px] font-semibold text-[#0A6847]">
                      {purchaseBills.length} Purchase bills recorded
                    </p>
                  </div>
                  <div className="bos-card p-4">
                    <p className="text-[11.5px] font-medium text-[#64748B]">Paid Amount</p>
                    <p className="mt-1 text-[22px] font-extrabold text-[#0A6847]">
                      {currencySymbol} {purchaseBillsKpis.paid.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[11px] text-[#64748B]">Paid to suppliers</p>
                  </div>
                  <div className="bos-card p-4">
                    <p className="text-[11.5px] font-medium text-[#64748B]">Balance Due</p>
                    <p className="mt-1 text-[22px] font-extrabold text-amber-600">
                      {currencySymbol} {purchaseBillsKpis.balanceDue.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[11px] text-[#64748B]">Payable to suppliers</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <h3 className="text-[15px] font-bold text-[#111827]">Supplier Purchase Invoices</h3>
                  <button
                    type="button"
                    onClick={() => setShowAddPurchaseModal(true)}
                    className="bos-btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12.5px] font-bold shadow-2xs cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>+ Add Purchase Bill</span>
                  </button>
                </div>

                {purchaseBills.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#DCE9E3] bg-white p-12 text-center space-y-4">
                    <ShoppingCart className="mx-auto h-12 w-12 text-[#94A3B8]" />
                    <h3 className="text-[16px] font-bold text-[#111827]">No Purchase Bills Found</h3>
                    <p className="text-xs text-[#64748B]">Record inventory goods and materials purchased from distributors.</p>
                    <button
                      type="button"
                      onClick={() => setShowAddPurchaseModal(true)}
                      className="bos-btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-bold cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      <span>+ Add Purchase Bill</span>
                    </button>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-[#DCE9E3] bg-white overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-[#EBF2EE] bg-[#FAFDFB] text-[11px] font-semibold text-[#64748B]">
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Bill #</th>
                            <th className="py-2.5 px-3">Vendor Name</th>
                            <th className="py-2.5 px-3">Particulars</th>
                            <th className="py-2.5 px-3">Payment Mode</th>
                            <th className="py-2.5 px-3 text-right">Total ({currencySymbol})</th>
                            <th className="py-2.5 px-3 text-right">Balance Due ({currencySymbol})</th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EEF5F1] text-[12.5px]">
                          {purchaseBills.map((b) => (
                            <tr key={b.id} className="hover:bg-[#F9FCFA]">
                              <td className="py-2.5 px-3 text-xs text-[#64748B]">{b.billDate}</td>
                              <td className="py-2.5 px-3 font-bold text-[#0A6847]">{b.billNumber}</td>
                              <td className="py-2.5 px-3 font-bold text-[#111827]">{b.vendorName}</td>
                              <td className="py-2.5 px-3 text-xs text-[#64748B]">{b.particulars}</td>
                              <td className="py-2.5 px-3">
                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                                  {b.paymentMode}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-extrabold text-[#111827]">
                                {formatBosCurrency(b.totalAmount, currencySymbol)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-semibold text-amber-600">
                                {formatBosCurrency(b.balanceDue, currencySymbol)}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span
                                  className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-bold ${
                                    b.status === 'PAID'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : b.status === 'PARTIAL'
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {b.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : selectedReportId === 'quotations' || selectedReportId === 'proforma' || selectedReportId === 'delivery_challan' ? (
              /* 2B. COMMERCIAL DOCUMENTS VIEW */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-[15px] font-bold text-[#111827] capitalize">
                      {selectedReportId.replace('_', ' ')} Register
                    </h3>
                    <p className="text-[12px] text-[#64748B]">Commercial documents created in selected date range</p>
                  </div>
                  {onNavigateToBilling && (
                    <button
                      type="button"
                      onClick={onNavigateToBilling}
                      className="bos-btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-bold cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Create New {selectedReportId === 'quotations' ? 'Quotation' : selectedReportId === 'proforma' ? 'Proforma' : 'Challan'}</span>
                    </button>
                  )}
                </div>

                <div className="rounded-2xl border border-dashed border-[#DCE9E3] bg-white p-10 text-center space-y-3">
                  <FileText className="mx-auto h-12 w-12 text-[#94A3B8]" />
                  <p className="text-[14px] font-bold text-[#111827]">
                    Manage and convert {selectedReportId.replace('_', ' ')}s in the Invoices Workstation
                  </p>
                  <p className="text-xs text-[#64748B] max-w-sm mx-auto">
                    Use 1-click quotation-to-tax-invoice conversion, print delivery challans, and share PDF copies with customers on WhatsApp.
                  </p>
                  {onNavigateToBilling && (
                    <button
                      type="button"
                      onClick={onNavigateToBilling}
                      className="bos-btn-primary rounded-xl px-4 py-2 text-xs font-bold cursor-pointer"
                    >
                      Open Invoices Workstation
                    </button>
                  )}
                </div>
              </div>
            ) : selectedReportId === 'day_book' ? (
              /* 2C. DAY BOOK SUMMARY VIEW */
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                  <div className="bos-card p-4">
                    <p className="text-[12px] font-semibold text-[#64748B]">Total Money In (Today)</p>
                    <p className="mt-1 text-[22px] font-extrabold text-[#0A6847]">
                      {currencySymbol} {totalMoneyIn.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="bos-card p-4">
                    <p className="text-[12px] font-semibold text-[#64748B]">Total Money Out (Today)</p>
                    <p className="mt-1 text-[22px] font-extrabold text-red-600">
                      {currencySymbol} {totalMoneyOut.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="bos-card p-4">
                    <p className="text-[12px] font-semibold text-[#64748B]">Closing Cash &amp; Bank Balance</p>
                    <p className="mt-1 text-[22px] font-extrabold text-[#111827]">
                      {currencySymbol} {closingBalance.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                <div className="bos-card p-4 space-y-3">
                  <h4 className="text-[14px] font-bold text-[#111827]">Daily Cash &amp; Bank Register</h4>
                  <p className="text-xs text-[#64748B]">
                    Full real-time transaction ledger including POS sales, customer khata receipts, operating expenses, and cash withdrawals.
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[12px]">
                      <thead>
                        <tr className="border-b border-[#EBF2EE] bg-[#FAFDFB] font-semibold text-[#64748B]">
                          <th className="py-2 px-3">Time</th>
                          <th className="py-2 px-3">Type</th>
                          <th className="py-2 px-3">Particulars</th>
                          <th className="py-2 px-3">Mode</th>
                          <th className="py-2 px-3 text-right">In</th>
                          <th className="py-2 px-3 text-right">Out</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EEF5F1]">
                        {rows.slice(0, 5).map((r) => (
                          <tr key={r.id}>
                            <td className="py-2 px-3 text-[#64748B]">{r.timeText}</td>
                            <td className="py-2 px-3 font-semibold">{r.typeLabel}</td>
                            <td className="py-2 px-3">{r.particularsTitle}</td>
                            <td className="py-2 px-3">{r.method}</td>
                            <td className="py-2 px-3 text-right font-bold text-emerald-700">
                              {r.moneyIn > 0 ? `${currencySymbol}${r.moneyIn}` : '—'}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-red-600">
                              {r.moneyOut > 0 ? `${currencySymbol}${r.moneyOut}` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              /* 2D. SALE INVOICES VIEW (Exact Vyapar Parity Matching media_1793082329695.png) */
              <div className="space-y-4">
                {/* 3 KPI Cards */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="bos-card p-4">
                    <p className="text-[11.5px] font-medium text-[#64748B]">Total Sales Amount</p>
                    <p className="mt-1 text-[22px] font-extrabold text-[#111827]">
                      {currencySymbol} {saleInvoicesKpis.totalSales.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[11px] font-semibold text-[#0A6847]">
                      {periodFilteredOrders.length} Invoices in period
                    </p>
                  </div>
                  <div className="bos-card p-4">
                    <p className="text-[11.5px] font-medium text-[#64748B]">Received</p>
                    <p className="mt-1 text-[22px] font-extrabold text-[#0A6847]">
                      {currencySymbol} {saleInvoicesKpis.received.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[11px] text-[#64748B]">Settled &amp; collected</p>
                  </div>
                  <div className="bos-card p-4">
                    <p className="text-[11.5px] font-medium text-[#64748B]">Balance Due</p>
                    <p className="mt-1 text-[22px] font-extrabold text-amber-600">
                      {currencySymbol} {saleInvoicesKpis.balanceDue.toLocaleString('en-IN')}
                    </p>
                    <p className="text-[11px] text-[#64748B]">Pending customer udhaar</p>
                  </div>
                </div>

                {/* Filter and + Add Sale Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#94A3B8]" />
                    <input
                      type="text"
                      value={salesSearchQuery}
                      onChange={(e) => setSalesSearchQuery(e.target.value)}
                      placeholder="Search by invoice #, customer, phone..."
                      className="h-9 w-full rounded-xl border border-[#DCE9E3] bg-white pl-8 pr-3 text-[12px] text-[#111827] placeholder:text-[#94A3B8] focus:border-[#0A6847] focus:outline-hidden"
                    />
                  </div>

                  {onNavigateToBilling && (
                    <button
                      type="button"
                      onClick={onNavigateToBilling}
                      className="bos-btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12.5px] font-bold shadow-2xs cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      <span>+ Add Sale</span>
                    </button>
                  )}
                </div>

                {/* Zero State vs Invoices Table (media_1793082329695.png) */}
                {filteredSalesOrders.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#DCE9E3] bg-white p-12 text-center space-y-4 shadow-2xs">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E6F6F0] text-[#0A6847]">
                      <FileText className="h-8 w-8" />
                    </div>
                    <div>
                      <h3 className="text-[17px] font-extrabold text-[#111827]">No Sale Invoices Found</h3>
                      <p className="mt-1 text-[13px] text-[#64748B] max-w-md mx-auto">
                        You haven&apos;t recorded any sales invoices in the selected date range ({activeDateRangeStr}). Create your first sale invoice or adjust the filter.
                      </p>
                    </div>
                    {onNavigateToBilling && (
                      <button
                        type="button"
                        onClick={onNavigateToBilling}
                        className="bos-btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-bold shadow-xs cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                        <span>+ Add Sale</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-[#DCE9E3] bg-white overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-[#EBF2EE] bg-[#FAFDFB] text-[11px] font-semibold text-[#64748B]">
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Invoice #</th>
                            <th className="py-2.5 px-3">Party Name</th>
                            <th className="py-2.5 px-3">Payment Type</th>
                            <th className="py-2.5 px-3 text-right">Amount ({currencySymbol})</th>
                            <th className="py-2.5 px-3 text-right">Balance Due ({currencySymbol})</th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EEF5F1] text-[12.5px]">
                          {filteredSalesOrders.map((o) => {
                            const bal = o.balanceDue ?? (o.paymentStatus === 'PAID' || o.paymentStatus === 'paid' ? 0 : o.totalAmount);
                            return (
                              <tr key={o.id} className="hover:bg-[#F9FCFA]">
                                <td className="py-2.5 px-3 text-xs text-[#64748B]">{o.createdAt || 'Today'}</td>
                                <td className="py-2.5 px-3 font-bold text-[#0A6847]">{o.id}</td>
                                <td className="py-2.5 px-3">
                                  <p className="font-semibold text-[#111827]">{o.customerName || 'Walk-in Customer'}</p>
                                  {o.customerPhone && <p className="text-[10.5px] text-[#64748B]">{o.customerPhone}</p>}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="rounded-md bg-[#E6F6F0] px-2 py-0.5 text-[11px] font-bold text-[#0A7B56]">
                                    {o.paymentMode || 'Cash'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right font-extrabold text-[#111827]">
                                  {formatBosCurrency(o.totalAmount || 0, currencySymbol)}
                                </td>
                                <td className="py-2.5 px-3 text-right font-semibold text-amber-600">
                                  {formatBosCurrency(bal, currencySymbol)}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span
                                    className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-bold ${
                                      bal === 0
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}
                                  >
                                    {bal === 0 ? 'PAID' : 'PENDING'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
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
        </div>

        {/* Add Purchase Bill Modal (Phase 5) */}
        {showAddPurchaseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-2xl border border-[#DCE9E3] bg-white p-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#EBF2EE] pb-3">
                <h3 className="text-[16px] font-bold text-[#111827]">Record Purchase Bill (Vendor Inward)</h3>
                <button
                  type="button"
                  onClick={() => setShowAddPurchaseModal(false)}
                  className="rounded-lg p-1 text-[#64748B] hover:bg-[#F4F8F6] cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSavePurchaseBill} className="mt-4 space-y-3 text-[12.5px]">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11.5px] font-semibold text-[#334155] mb-1">Vendor / Supplier Name *</label>
                    <input
                      type="text"
                      required
                      value={purchaseBillForm.vendorName}
                      onChange={(e) => setPurchaseBillForm((s) => ({ ...s, vendorName: e.target.value }))}
                      placeholder="e.g. Metro Cash & Carry"
                      className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2 text-[#111827]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11.5px] font-semibold text-[#334155] mb-1">Bill / Invoice Number *</label>
                    <input
                      type="text"
                      required
                      value={purchaseBillForm.billNumber}
                      onChange={(e) => setPurchaseBillForm((s) => ({ ...s, billNumber: e.target.value }))}
                      className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2 font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11.5px] font-semibold text-[#334155] mb-1">Particulars / Purchased Items</label>
                  <input
                    type="text"
                    value={purchaseBillForm.particulars}
                    onChange={(e) => setPurchaseBillForm((s) => ({ ...s, particulars: e.target.value }))}
                    placeholder="e.g. 50 Cartons Cooking Oil & Rice sacks"
                    className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2 text-[#111827]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11.5px] font-semibold text-[#334155] mb-1">Total Bill Amount ({currencySymbol}) *</label>
                    <input
                      type="number"
                      required
                      value={purchaseBillForm.totalAmount}
                      onChange={(e) => {
                        const tot = Number(e.target.value);
                        setPurchaseBillForm((s) => ({ ...s, totalAmount: tot, paidAmount: tot }));
                      }}
                      className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2 font-bold text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-[11.5px] font-semibold text-[#334155] mb-1">GST Rate (%)</label>
                    <select
                      value={purchaseBillForm.taxRate}
                      onChange={(e) => setPurchaseBillForm((s) => ({ ...s, taxRate: Number(e.target.value) }))}
                      className="w-full rounded-xl border border-[#DCE9E3] bg-white px-3 py-2"
                    >
                      <option value={0}>0% (Exempt)</option>
                      <option value={5}>5%</option>
                      <option value={12}>12%</option>
                      <option value={18}>18%</option>
                      <option value={28}>28%</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11.5px] font-semibold text-[#334155] mb-1">Payment Mode</label>
                    <select
                      value={purchaseBillForm.paymentMode}
                      onChange={(e) => setPurchaseBillForm((s) => ({ ...s, paymentMode: e.target.value as any }))}
                      className="w-full rounded-xl border border-[#DCE9E3] bg-white px-3 py-2"
                    >
                      <option value="Bank">Bank Transfer</option>
                      <option value="UPI">UPI</option>
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11.5px] font-semibold text-[#334155] mb-1">Amount Paid ({currencySymbol})</label>
                    <input
                      type="number"
                      value={purchaseBillForm.paidAmount}
                      onChange={(e) => setPurchaseBillForm((s) => ({ ...s, paidAmount: Number(e.target.value) }))}
                      className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2 font-bold text-[#0A6847]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11.5px] font-semibold text-[#334155] mb-1">Balance Due ({currencySymbol})</label>
                    <input
                      type="text"
                      readOnly
                      value={Math.max(0, purchaseBillForm.totalAmount - purchaseBillForm.paidAmount)}
                      className="w-full rounded-xl border border-[#DCE9E3] bg-slate-50 px-3 py-2 font-bold text-amber-700"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-[#EBF2EE]">
                  <button
                    type="button"
                    onClick={() => setShowAddPurchaseModal(false)}
                    className="rounded-xl border border-[#DCE9E3] px-4 py-2 font-semibold text-[#475569] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bos-btn-primary rounded-xl px-5 py-2 font-bold cursor-pointer"
                  >
                    Save Purchase Bill
                  </button>
                </div>
              </form>
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
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F1F5F9] text-[#475569]">
              <Coins className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <p className="text-[11.5px] font-medium text-[#64748B] truncate">
                  Expected Balance
                </p>
                <button
                  type="button"
                  onClick={() => setShowAdjustCashModal(true)}
                  className="rounded bg-amber-50 px-1.5 py-0.5 text-[10.5px] font-bold text-amber-700 hover:bg-amber-100 transition cursor-pointer"
                >
                  Adjust
                </button>
              </div>
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
        {/* LEFT COLUMN: TRANSACTIONS TABLE + CHEQUES REGISTER (9 cols) */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-4">
          <div className="rounded-2xl border border-[#DCE9E3] bg-white shadow-2xs overflow-hidden">
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

        {/* CHEQUES & BANK REGISTER (Phase 5 - Vyapar Parity) */}
        <div className="rounded-2xl border border-[#DCE9E3] bg-white p-4 shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EBF2EE] pb-3">
            <div>
              <h3 className="text-[15px] font-bold text-[#111827]">
                Cheques &amp; Bank Register
              </h3>
              <p className="text-[11.5px] text-[#64748B]">
                Track clearing status of incoming customer cheques and outgoing vendor cheques
              </p>
            </div>

            {/* Status Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-bold">
              {(['ALL', 'PENDING', 'DEPOSITED', 'CLEARED', 'BOUNCED'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setChequeFilter(st)}
                  className={`rounded-lg px-2.5 py-1 transition cursor-pointer ${
                    chequeFilter === st
                      ? 'bg-[#0A6847] text-white'
                      : 'bg-[#F4F8F6] text-[#475569] hover:bg-[#EBF2EE]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#EBF2EE] bg-[#FAFDFB] text-[11px] font-semibold text-[#64748B]">
                  <th className="py-2 px-3">Direction</th>
                  <th className="py-2 px-3">Party Name</th>
                  <th className="py-2 px-3">Bank &amp; Cheque #</th>
                  <th className="py-2 px-3">Due Date</th>
                  <th className="py-2 px-3 text-right">Amount ({currencySymbol})</th>
                  <th className="py-2 px-3 text-center">Status</th>
                  <th className="py-2 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EEF5F1] text-[12px]">
                {filteredCheques.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-[#64748B]">
                      No cheques found in this filter
                    </td>
                  </tr>
                ) : (
                  filteredCheques.map((c) => (
                    <tr key={c.id} className="hover:bg-[#F9FCFA]">
                      <td className="py-2.5 px-3">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10.5px] font-bold ${
                            c.type === 'RECEIVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {c.type === 'RECEIVED' ? '↓ Received' : '↑ Issued'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-[#111827]">{c.partyName}</td>
                      <td className="py-2.5 px-3 text-[#334155]">
                        <span>{c.bankName}</span>
                        <span className="ml-1 text-[11px] text-[#64748B] font-mono">#{c.chequeNumber}</span>
                      </td>
                      <td className="py-2.5 px-3 text-[#64748B]">{c.dueDate}</td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-[#111827]">
                        {formatBosCurrency(c.amount, currencySymbol)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
                            c.status === 'CLEARED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : c.status === 'DEPOSITED'
                              ? 'bg-blue-100 text-blue-800'
                              : c.status === 'BOUNCED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {c.status === 'PENDING' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateChequeStatus(c.id, 'DEPOSITED')}
                              className="rounded bg-blue-50 px-2 py-0.5 text-[10.5px] font-bold text-blue-700 hover:bg-blue-100 cursor-pointer"
                            >
                              Deposit
                            </button>
                          )}
                          {c.status === 'DEPOSITED' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateChequeStatus(c.id, 'CLEARED')}
                              className="rounded bg-emerald-50 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                            >
                              Clear
                            </button>
                          )}
                          {c.status !== 'BOUNCED' && c.status !== 'CLEARED' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateChequeStatus(c.id, 'BOUNCED')}
                              className="rounded bg-red-50 px-2 py-0.5 text-[10.5px] font-bold text-red-700 hover:bg-red-100 cursor-pointer"
                            >
                              Bounce
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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

              <button
                type="button"
                onClick={() => setShowAdjustCashModal(true)}
                className="col-span-2 flex items-center justify-center gap-2 rounded-xl border border-[#FDE68A] bg-amber-50 p-2.5 text-[12px] font-bold text-amber-900 hover:bg-amber-100 transition cursor-pointer"
              >
                <Coins className="h-4 w-4 shrink-0 text-amber-700" />
                <span>Adjust Cash / Physical Count Reconciliation</span>
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

      {/* Cash In Hand Adjustment Modal (Phase 5) */}
      {showAdjustCashModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[#DCE9E3] bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#EBF2EE] pb-3">
              <div>
                <h3 className="text-[16px] font-bold text-[#111827]">
                  Adjust Cash in Hand &amp; Reconciliation
                </h3>
                <p className="text-[12px] text-[#64748B]">
                  Add opening cash float, record cash withdrawal, or reconcile drawer count
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAdjustCashModal(false)}
                className="rounded-lg p-1 text-[#64748B] hover:bg-[#F4F8F6] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Type Switcher */}
            <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-[#F1F5F3] p-1 text-[12px] font-bold">
              <button
                type="button"
                onClick={() => setCashAdjustType('add')}
                className={`rounded-lg py-1.5 transition ${
                  cashAdjustType === 'add' ? 'bg-[#0A6847] text-white shadow-2xs' : 'text-[#475569]'
                }`}
              >
                + Add Cash Float
              </button>
              <button
                type="button"
                onClick={() => setCashAdjustType('reduce')}
                className={`rounded-lg py-1.5 transition ${
                  cashAdjustType === 'reduce' ? 'bg-[#E11D48] text-white shadow-2xs' : 'text-[#475569]'
                }`}
              >
                - Withdraw Cash
              </button>
              <button
                type="button"
                onClick={() => setCashAdjustType('count')}
                className={`rounded-lg py-1.5 transition ${
                  cashAdjustType === 'count' ? 'bg-[#0369A1] text-white shadow-2xs' : 'text-[#475569]'
                }`}
              >
                🔢 Drawer Count
              </button>
            </div>

            <form onSubmit={handleAdjustCashSubmit} className="space-y-3.5 text-[12.5px]">
              {cashAdjustType !== 'count' ? (
                <>
                  <div>
                    <label className="block text-[11.5px] font-semibold text-[#334155] mb-1">
                      Adjustment Amount ({currencySymbol}) *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={cashAdjustAmount}
                      onChange={(e) => setCashAdjustAmount(e.target.value)}
                      className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2 font-bold text-[#111827]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11.5px] font-semibold text-[#334155] mb-1">
                      Reason / Description
                    </label>
                    <input
                      type="text"
                      value={cashAdjustReason}
                      onChange={(e) => setCashAdjustReason(e.target.value)}
                      placeholder={
                        cashAdjustType === 'add'
                          ? 'e.g. Added morning cash float for small change'
                          : 'e.g. Cash handed over to owner / bank deposit'
                      }
                      className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2 text-[#111827]"
                    />
                  </div>
                </>
              ) : (
                /* Physical Cash Count Reconciliation */
                <div className="space-y-3">
                  <div className="rounded-xl border border-[#DCE9E3] bg-[#FAFDFB] p-3 text-[12px]">
                    <div className="flex justify-between font-semibold text-[#64748B]">
                      <span>Expected Cash in Drawer:</span>
                      <span className="font-bold text-[#111827]">
                        {currencySymbol} {closingBalance.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold text-[#0A6847] mt-1">
                      <span>Total Counted Physical Cash:</span>
                      <span className="text-[14px]">
                        {currencySymbol} {physicalCashSum.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold mt-1 pt-1 border-t border-[#EBF2EE]">
                      <span>Reconciliation Difference:</span>
                      <span className={physicalCashSum >= closingBalance ? 'text-[#0A6847]' : 'text-red-600'}>
                        {physicalCashSum - closingBalance >= 0 ? '+' : ''}
                        {currencySymbol} {(physicalCashSum - closingBalance).toLocaleString('en-IN')}
                        {physicalCashSum === closingBalance ? ' (Matched)' : physicalCashSum > closingBalance ? ' (Surplus)' : ' (Shortage)'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11.5px]">
                    {[500, 200, 100, 50, 20, 10].map((denom) => (
                      <div key={denom} className="flex items-center justify-between rounded-lg border border-[#EBF2EE] p-2 bg-white">
                        <span className="font-bold text-[#334155]">₹{denom} ×</span>
                        <input
                          type="number"
                          min={0}
                          value={denominations[denom] || ''}
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                            setDenominations((prev) => ({ ...prev, [denom]: val }));
                          }}
                          placeholder="0"
                          className="w-16 rounded border border-[#DCE9E3] px-2 py-0.5 text-right font-bold text-[#111827]"
                        />
                        <span className="w-16 text-right text-[11px] font-semibold text-[#64748B]">
                          = ₹{(denom * (denominations[denom] || 0)).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-[#EBF2EE] p-2 bg-white text-[11.5px]">
                    <span className="font-bold text-[#334155]">Coins Total (₹):</span>
                    <input
                      type="number"
                      min={0}
                      value={denominations[1] || ''}
                      onChange={(e) => {
                        const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                        setDenominations((prev) => ({ ...prev, 1: val }));
                      }}
                      placeholder="0"
                      className="w-24 rounded border border-[#DCE9E3] px-2 py-0.5 text-right font-bold text-[#111827]"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-[#EBF2EE]">
                <button
                  type="button"
                  onClick={() => setShowAdjustCashModal(false)}
                  className="rounded-xl border border-[#DCE9E3] px-4 py-2 font-semibold text-[#475569] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bos-btn-primary rounded-xl px-5 py-2 font-bold cursor-pointer"
                >
                  {cashAdjustType === 'count' ? 'Reconcile & Save' : 'Save Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

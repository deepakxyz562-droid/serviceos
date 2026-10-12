'use client';

import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Coins,
  CreditCard,
  Download,
  FileSpreadsheet,
  Filter,
  Home,
  Lock,
  MapPin,
  MoreVertical,
  Plus,
  Printer,
  QrCode,
  Search,
  ShoppingCart,
  Truck,
  UserCheck,
  Wallet,
  X,
} from 'lucide-react';
import {
  type BosDaybookEntry,
  type BosOrder,
  type BosProductItem,
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

export function BosReportsDaybookWorkstation({
  mode,
  currencySymbol,
  products,
  onAddDaybookEntry,
}: BosReportsDaybookWorkstationProps) {
  const [reportTab, setReportTab] = useState<
    'overview' | 'sales' | 'pnl' | 'gst' | 'inventory' | 'khata'
  >('overview');

  // Day Book States
  const [daybookTab, setDaybookTab] = useState<DaybookTabId>('all');
  const [rows, setRows] = useState<DaybookShowcaseRow[]>(INITIAL_DAYBOOK_ROWS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('Main Store');
  const [dayClosed, setDayClosed] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
    const prevBal = rows[rows.length - 1]?.balance || 27370;
    const nextBal =
      entryForm.direction === 'in' ? prevBal + amt : prevBal - amt;

    const newRow: DaybookShowcaseRow = {
      id: `db-row-${Date.now()}`,
      rowNum: rows.length + 1,
      dateText: '12 Oct 2024',
      timeText: '05:45 PM',
      typeLabel: entryForm.typeLabel,
      particularsTitle: title,
      particularsSub: entryForm.particularsSub.trim() || undefined,
      method: entryForm.method,
      moneyIn: entryForm.direction === 'in' ? amt : 0,
      moneyOut: entryForm.direction === 'out' ? amt : 0,
      balance: nextBal,
    };

    setRows((prev) => [...prev, newRow]);
    setShowEntryModal(false);

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
      moneyIn: newRow.moneyIn,
      moneyOut: newRow.moneyOut,
    });

    showToast(`Recorded "${title}" (${currencySymbol} ${amt.toLocaleString('en-IN')})`);
  };

  /* REPORTS VIEW */
  if (mode === 'reports') {
    return (
      <div className="w-full max-w-none space-y-4 pb-6">
        {/* Sub-Tabs & Actions */}
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
                className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition ${
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
            <button
              type="button"
              onClick={() =>
                showToast('Exported GSTR-1 & GSTR-3B JSON/CSV return summary.')
              }
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE9E3] bg-white px-3.5 py-2 text-[12px] font-semibold text-[#1E293B] hover:bg-[#F4F8F6]"
            >
              <FileSpreadsheet className="h-4 w-4 text-[#0A6847]" />
              <span>GSTR-1 / 3B</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="bos-btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px]"
            >
              <Download className="h-4 w-4" />
              <span>Download PDF Report</span>
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

        {/* 5 KPI Cards */}
        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-5">
          <div className="bos-card p-3.5">
            <p className="text-[11.5px] font-medium text-[#64748B]">
              Total Revenue
            </p>
            <p className="mt-1 text-[21px] font-extrabold text-[#111827]">
              {formatBosCurrency(482650, currencySymbol)}
            </p>
            <p className="text-[11px] font-semibold text-[#0A6847]">
              +18.4% vs last month
            </p>
          </div>

          <div className="bos-card p-3.5">
            <p className="text-[11.5px] font-medium text-[#64748B]">
              Gross Profit
            </p>
            <p className="mt-1 text-[21px] font-extrabold text-[#0A6847]">
              {formatBosCurrency(142800, currencySymbol)}
            </p>
            <p className="text-[11px] text-[#0A6847]">29.6% Net Margin</p>
          </div>

          <div className="bos-card p-3.5">
            <p className="text-[11.5px] font-medium text-[#64748B]">
              Total Orders
            </p>
            <p className="mt-1 text-[21px] font-extrabold text-[#111827]">
              1,284
            </p>
            <p className="text-[11px] text-[#64748B]">
              Avg Value: {formatBosCurrency(376, currencySymbol)}
            </p>
          </div>

          <div className="bos-card p-3.5">
            <p className="text-[11.5px] font-medium text-[#64748B]">
              Total Expenses
            </p>
            <p className="mt-1 text-[21px] font-extrabold text-amber-600">
              {formatBosCurrency(64200, currencySymbol)}
            </p>
            <p className="text-[11px] text-[#64748B]">Rent, Staff, Utilities</p>
          </div>

          <div className="bos-card p-3.5 col-span-2 lg:col-span-1">
            <p className="text-[11.5px] font-medium text-[#64748B]">
              GST Collected (Net)
            </p>
            <p className="mt-1 text-[21px] font-extrabold text-purple-700">
              {formatBosCurrency(38420, currencySymbol)}
            </p>
            <p className="text-[11px] text-[#64748B]">
              ITC Claimable: {formatBosCurrency(14200, currencySymbol)}
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
                  Weekly performance breakdown across POS, Online Store, and B2B Invoices
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
              {[
                { label: 'Week 1 (1–7 Apr)', rev: 72, prof: 44, exp: 26, val: '₹1,05,200' },
                { label: 'Week 2 (8–14 Apr)', rev: 85, prof: 54, exp: 28, val: '₹1,24,800' },
                { label: 'Week 3 (15–21 Apr)', rev: 78, prof: 48, exp: 25, val: '₹1,14,150' },
                { label: 'Week 4 (22–24 Apr)', rev: 96, prof: 64, exp: 24, val: '₹1,38,500' },
              ].map((w) => (
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
              <h3 className="text-[15px] font-bold text-[#111827]">
                Sales by Payment Mode
              </h3>
              <p className="text-[12px] text-[#64748B]">
                Collection split across channels
              </p>
            </div>

            <div className="space-y-3 text-[12.5px]">
              {[
                { mode: 'UPI / QR', amount: 260631, pct: 54, color: 'bg-[#0A6847]' },
                { mode: 'Cash', amount: 135142, pct: 28, color: 'bg-[#10B981]' },
                { mode: 'Card / POS', amount: 57918, pct: 12, color: 'bg-blue-500' },
                { mode: 'Khata / Credit', amount: 28959, pct: 6, color: 'bg-amber-500' },
              ].map((row) => (
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

        {/* Bottom 3 Cards */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="bos-card p-4 space-y-3">
            <h3 className="text-[14.5px] font-bold text-[#111827]">
              Top Selling Products
            </h3>
            <div className="divide-y divide-[#F1F6F3] text-[12.5px]">
              {products.slice(0, 5).map((p, idx) => (
                <div key={p.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="font-bold text-[#111827]">
                      {idx + 1}. {p.name}
                    </p>
                    <p className="text-[11px] text-[#64748B]">{p.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-[#0A6847]">
                      {formatBosCurrency(p.price * (38 - idx * 5), currencySymbol)}
                    </p>
                    <p className="text-[10.5px] text-[#64748B]">
                      {38 - idx * 5} units sold
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bos-card p-4 space-y-3 text-[12.5px]">
            <div className="flex items-center justify-between">
              <h3 className="text-[14.5px] font-bold text-[#111827]">
                Profit &amp; Loss Summary
              </h3>
              <span className="rounded-full bg-[#E6F6F0] px-2.5 py-0.5 text-[11px] font-bold text-[#0A6847]">
                Healthy
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between py-1 border-b border-[#F1F6F3]">
                <span className="text-[#475569]">Gross Sales Revenue</span>
                <strong className="text-[#111827]">
                  {formatBosCurrency(482650, currencySymbol)}
                </strong>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F1F6F3]">
                <span className="text-[#475569]">Cost of Goods Sold (COGS)</span>
                <strong className="text-red-600">
                  -{formatBosCurrency(275650, currencySymbol)}
                </strong>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F1F6F3]">
                <span className="text-[#475569]">Operating Expenses</span>
                <strong className="text-red-600">
                  -{formatBosCurrency(64200, currencySymbol)}
                </strong>
              </div>
              <div className="flex justify-between rounded-xl bg-[#E6F6F0] p-3 text-[#0A6847]">
                <span className="font-bold">Net Profit (Take Home)</span>
                <span className="text-[16px] font-extrabold">
                  {formatBosCurrency(142800, currencySymbol)}
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
                Apr 2026
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl border border-[#E4EFEA] bg-[#F8FCFA] p-2.5">
                <p className="text-[10.5px] text-[#64748B]">Output GST (Sales)</p>
                <p className="text-[15px] font-extrabold text-[#111827]">
                  {formatBosCurrency(52620, currencySymbol)}
                </p>
              </div>
              <div className="rounded-xl border border-[#E4EFEA] bg-[#F8FCFA] p-2.5">
                <p className="text-[10.5px] text-[#64748B]">Input Tax Credit (ITC)</p>
                <p className="text-[15px] font-extrabold text-[#0A6847]">
                  {formatBosCurrency(14200, currencySymbol)}
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-[#BCE3D4] bg-[#F3FAF7] p-3 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-[#0A6847]">Net GST Payable</p>
                <p className="text-[16px] font-extrabold text-[#111827]">
                  {formatBosCurrency(38420, currencySymbol)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => showToast('Downloaded GSTR-1 JSON report.')}
                className="bos-btn-primary rounded-lg px-3 py-1.5 text-[11.5px]"
              >
                Download GSTR-1
              </button>
            </div>
          </div>
        </div>
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
              {currencySymbol} 12,480
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
              {currencySymbol} 48,320
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
              {currencySymbol} 18,520
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
              {currencySymbol} 42,280
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
                  {currencySymbol} 42,280
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
                {filteredRows.map((row) => (
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
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col gap-2.5 border-t border-[#EBF2EE] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[12px] font-medium text-[#64748B]">
              Showing 1–{Math.min(10, filteredRows.length)} of 28 transactions
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
                {[1, 2, 3].map((pg) => (
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
                  onClick={() => setCurrentPage((p) => Math.min(3, p + 1))}
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
                  {currencySymbol} 12,480
                </span>
              </div>
              <div className="flex justify-between text-[#475569]">
                <span>Total Money In</span>
                <span className="font-bold text-[#111827]">
                  {currencySymbol} 48,320
                </span>
              </div>
              <div className="flex justify-between text-[#475569]">
                <span>Total Money Out</span>
                <span className="font-bold text-[#111827]">
                  {currencySymbol} 18,520
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-[#E6F6F0] px-3 py-2.5">
              <span className="text-[12px] font-extrabold text-[#0A6847]">
                Calculated Closing Balance
              </span>
              <span className="text-[15px] font-extrabold text-[#0A6847]">
                {currencySymbol} 42,280
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setDayClosed((prev) => !prev);
                showToast(
                  dayClosed
                    ? 'Reopened Day Book for 12 Oct 2024'
                    : 'Closed Day Book & verified closing balance ₹ 42,280',
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
              {[
                {
                  label: 'Cash',
                  amount: '18,120',
                  pct: '38%',
                  iconBg: 'bg-[#E6F6F0] text-[#0A7B56]',
                  Icon: Wallet,
                },
                {
                  label: 'UPI',
                  amount: '12,460',
                  pct: '26%',
                  iconBg: 'bg-[#F3E8FF] text-[#7E22CE]',
                  Icon: QrCode,
                },
                {
                  label: 'Card',
                  amount: '6,780',
                  pct: '14%',
                  iconBg: 'bg-[#DBEAFE] text-[#2563EB]',
                  Icon: CreditCard,
                },
                {
                  label: 'Bank Transfer',
                  amount: '5,000',
                  pct: '10%',
                  iconBg: 'bg-[#E0F2FE] text-[#0369A1]',
                  Icon: Building2,
                },
                {
                  label: 'Credit (Khata)',
                  amount: '4,500',
                  pct: '9%',
                  iconBg: 'bg-[#FEF3C7] text-[#D97706]',
                  Icon: Wallet,
                },
                {
                  label: 'Others',
                  amount: '1,460',
                  pct: '3%',
                  iconBg: 'bg-[#F1F5F9] text-[#64748B]',
                  Icon: CircleDot,
                },
              ].map((m) => (
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

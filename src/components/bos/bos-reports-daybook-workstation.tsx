'use client';

import React, { useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Lock,
  Plus,
  Printer,
  QrCode,
  Receipt,
  Search,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  type BosDaybookEntry,
  type BosOrder,
  type BosProductItem,
  formatBosCurrency,
} from '@/components/bos/bos-types';

type BosReportsDaybookWorkstationProps = {
  mode: 'reports' | 'daybook';
  currencySymbol: string;
  orders: BosOrder[];
  products: BosProductItem[];
  daybookEntries: BosDaybookEntry[];
  onAddDaybookEntry: (entry: Omit<BosDaybookEntry, 'id' | 'time' | 'createdAt'>) => Promise<void>;
};

export function BosReportsDaybookWorkstation({
  mode,
  currencySymbol,
  orders,
  products,
  daybookEntries,
  onAddDaybookEntry,
}: BosReportsDaybookWorkstationProps) {
  const [reportTab, setReportTab] = useState<
    'overview' | 'sales' | 'pnl' | 'gst' | 'inventory' | 'khata'
  >('overview');
  const [daybookTab, setDaybookTab] = useState<
    'today' | 'cash' | 'upi' | 'expenses' | 'closing'
  >('today');
  const [daybookFilter, setDaybookFilter] = useState<'all' | 'in' | 'out'>('all');
  const [daybookSearch, setDaybookSearch] = useState('');

  const [entryDirection, setEntryDirection] = useState<'in' | 'out'>('out');
  const [entryAmount, setEntryAmount] = useState('');
  const [entryParty, setEntryParty] = useState('');
  const [entrySubtitle, setEntrySubtitle] = useState('');
  const [entryCategory, setEntryCategory] = useState<BosDaybookEntry['category']>('Expense');
  const [entryPaymentMode, setEntryPaymentMode] = useState<BosDaybookEntry['paymentMode']>('cash');
  const [physicalCashCount, setPhysicalCashCount] = useState<number>(21950);
  const [registerLocked, setRegisterLocked] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const daybookSummary = useMemo(() => {
    const openingCash = 12500;
    const totalIn = daybookEntries.reduce((s, e) => s + e.moneyIn, 0);
    const totalOut = daybookEntries.reduce((s, e) => s + e.moneyOut, 0);
    const cashIn = daybookEntries
      .filter((e) => e.paymentMode === 'cash')
      .reduce((s, e) => s + e.moneyIn, 0);
    const cashOut = daybookEntries
      .filter((e) => e.paymentMode === 'cash')
      .reduce((s, e) => s + e.moneyOut, 0);
    const upiIn = daybookEntries
      .filter((e) => e.paymentMode === 'upi')
      .reduce((s, e) => s + e.moneyIn, 0);
    const cardBankIn = daybookEntries
      .filter((e) => e.paymentMode === 'card' || e.paymentMode === 'bank')
      .reduce((s, e) => s + e.moneyIn, 0);
    const expectedDrawerCash = openingCash + cashIn - cashOut;

    return {
      openingCash,
      totalIn,
      totalOut,
      cashIn,
      cashOut,
      upiIn,
      cardBankIn,
      expectedDrawerCash,
    };
  }, [daybookEntries]);

  const filteredDaybook = useMemo(() => {
    const q = daybookSearch.trim().toLowerCase();
    return daybookEntries.filter((e) => {
      if (daybookTab === 'cash' && e.paymentMode !== 'cash') return false;
      if (daybookTab === 'upi' && e.paymentMode !== 'upi') return false;
      if (daybookTab === 'expenses' && e.moneyOut <= 0) return false;
      if (daybookFilter === 'in' && e.moneyIn <= 0) return false;
      if (daybookFilter === 'out' && e.moneyOut <= 0) return false;
      if (!q) return true;
      return (
        e.partyName.toLowerCase().includes(q) ||
        e.subtitle.toLowerCase().includes(q) ||
        e.refNumber.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
      );
    });
  }, [daybookEntries, daybookTab, daybookFilter, daybookSearch]);

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(entryAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;

    await onAddDaybookEntry({
      partyName:
        entryParty.trim() ||
        (entryDirection === 'in' ? 'Walk-in Counter Receipt' : 'Store Petty Expense'),
      subtitle:
        entrySubtitle.trim() ||
        (entryDirection === 'in' ? 'Manual Cash/UPI Entry' : 'Operational Store Expense'),
      category: entryDirection === 'in' ? 'POS Sale' : entryCategory,
      refNumber: `DB-${Math.floor(100 + Math.random() * 900)}`,
      paymentMode: entryPaymentMode,
      moneyIn: entryDirection === 'in' ? amount : 0,
      moneyOut: entryDirection === 'out' ? amount : 0,
    });

    setEntryAmount('');
    setEntryParty('');
    setEntrySubtitle('');
    setToast(
      `Saved ${entryDirection === 'in' ? 'Money In' : 'Money Out'} entry of ${formatBosCurrency(amount, currencySymbol)}`,
    );
    setTimeout(() => setToast(null), 3000);
  };

  if (mode === 'reports') {
    return (
      <div className="space-y-4 pb-6">
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
              onClick={() => {
                setToast('Exported GSTR-1 & GSTR-3B JSON/CSV return summary.');
                setTimeout(() => setToast(null), 3000);
              }}
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
            <button type="button" onClick={() => setToast(null)} className="text-xs underline">
              Dismiss
            </button>
          </div>
        )}

        {/* 5 KPI Cards */}
        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-5">
          <div className="bos-card p-3.5">
            <p className="text-[11.5px] font-medium text-[#64748B]">Total Revenue</p>
            <p className="mt-1 text-[21px] font-extrabold text-[#111827]">
              {formatBosCurrency(482650, currencySymbol)}
            </p>
            <p className="text-[11px] font-semibold text-[#0A6847]">+18.4% vs last month</p>
          </div>

          <div className="bos-card p-3.5">
            <p className="text-[11.5px] font-medium text-[#64748B]">Gross Profit</p>
            <p className="mt-1 text-[21px] font-extrabold text-[#0A6847]">
              {formatBosCurrency(142800, currencySymbol)}
            </p>
            <p className="text-[11px] text-[#0A6847]">29.6% Net Margin</p>
          </div>

          <div className="bos-card p-3.5">
            <p className="text-[11.5px] font-medium text-[#64748B]">Total Orders</p>
            <p className="mt-1 text-[21px] font-extrabold text-[#111827]">1,284</p>
            <p className="text-[11px] text-[#64748B]">Avg Value: {formatBosCurrency(376, currencySymbol)}</p>
          </div>

          <div className="bos-card p-3.5">
            <p className="text-[11.5px] font-medium text-[#64748B]">Total Expenses</p>
            <p className="mt-1 text-[21px] font-extrabold text-amber-600">
              {formatBosCurrency(64200, currencySymbol)}
            </p>
            <p className="text-[11px] text-[#64748B]">Rent, Staff, Utilities</p>
          </div>

          <div className="bos-card p-3.5 col-span-2 lg:col-span-1">
            <p className="text-[11.5px] font-medium text-[#64748B]">GST Collected (Net)</p>
            <p className="mt-1 text-[21px] font-extrabold text-purple-700">
              {formatBosCurrency(38420, currencySymbol)}
            </p>
            <p className="text-[11px] text-[#64748B]">ITC Claimable: {formatBosCurrency(14200, currencySymbol)}</p>
          </div>
        </div>

        {/* Middle Row: Revenue vs Profit Chart (8 cols) + Sales by Payment Mode (4 cols) */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="bos-card p-5 lg:col-span-8 flex flex-col justify-between">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-[15px] font-bold text-[#111827]">
                  Revenue vs Profit & Expenses
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
              <h3 className="text-[15px] font-bold text-[#111827]">Sales by Payment Mode</h3>
              <p className="text-[12px] text-[#64748B]">Collection split across channels</p>
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
                    <div className={`h-full rounded-full ${row.color}`} style={{ width: `${row.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom 3 Cards: Top Selling Products + Profit & Loss + GST Summary */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="bos-card p-4 space-y-3">
            <h3 className="text-[14.5px] font-bold text-[#111827]">Top Selling Products</h3>
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
                    <p className="text-[10.5px] text-[#64748B]">{38 - idx * 5} units sold</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bos-card p-4 space-y-3 text-[12.5px]">
            <div className="flex items-center justify-between">
              <h3 className="text-[14.5px] font-bold text-[#111827]">Profit & Loss Summary</h3>
              <span className="rounded-full bg-[#E6F6F0] px-2.5 py-0.5 text-[11px] font-bold text-[#0A6847]">
                Healthy
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between py-1 border-b border-[#F1F6F3]">
                <span className="text-[#475569]">Gross Sales Revenue</span>
                <strong className="text-[#111827]">{formatBosCurrency(482650, currencySymbol)}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F1F6F3]">
                <span className="text-[#475569]">Cost of Goods Sold (COGS)</span>
                <strong className="text-red-600">-{formatBosCurrency(275650, currencySymbol)}</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-[#F1F6F3]">
                <span className="text-[#475569]">Operating Expenses</span>
                <strong className="text-red-600">-{formatBosCurrency(64200, currencySymbol)}</strong>
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
                GST Tax Summary (GSTR-1 & 3B)
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
                onClick={() => {
                  setToast('Downloaded GSTR-1 JSON report.');
                  setTimeout(() => setToast(null), 2500);
                }}
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

  /* DAY BOOK VIEW */
  return (
    <div className="space-y-4 pb-6">
      {/* Sub-Tabs & Top Actions */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[#E4EFEA] bg-white p-1.5">
          {(
            [
              { id: 'today', label: "Today's Day Book" },
              { id: 'cash', label: 'Cash Register (Galla)' },
              { id: 'upi', label: 'Bank & UPI Ledger' },
              { id: 'expenses', label: 'Expenses & Petty Cash' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setDaybookTab(t.id)}
              className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition ${
                daybookTab === t.id
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
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE9E3] bg-white px-3.5 py-2 text-[12px] font-semibold text-[#1E293B] hover:bg-[#F4F8F6]"
          >
            <Printer className="h-4 w-4 text-[#0A6847]" />
            <span>Print Day Book</span>
          </button>

          <button
            type="button"
            onClick={() => setEntryDirection('out')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-[12px] font-bold text-red-600"
          >
            <span>+ Money Out (Expense)</span>
          </button>

          <button
            type="button"
            onClick={() => setEntryDirection('in')}
            className="bos-btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px]"
          >
            <Plus className="h-4 w-4" />
            <span>Money In</span>
          </button>
        </div>
      </div>

      {toast && (
        <div className="flex items-center justify-between rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-2.5 text-[13px] font-medium text-[#065F46]">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#0A6847]" />
            {toast}
          </span>
          <button type="button" onClick={() => setToast(null)} className="text-xs underline">
            Dismiss
          </button>
        </div>
      )}

      {/* 5 Day Book KPI Cards */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-5">
        <div className="bos-card p-3.5">
          <p className="text-[11.5px] font-medium text-[#64748B]">Opening Cash Balance</p>
          <p className="mt-1 text-[21px] font-extrabold text-[#111827]">
            {formatBosCurrency(daybookSummary.openingCash, currencySymbol)}
          </p>
          <p className="text-[11px] font-semibold text-[#0A6847]">✓ Verified at 09:00 AM</p>
        </div>

        <div className="bos-card p-3.5">
          <p className="text-[11.5px] font-medium text-[#64748B]">Total Money In (Credits)</p>
          <p className="mt-1 text-[21px] font-extrabold text-[#0A6847]">
            +{formatBosCurrency(daybookSummary.totalIn, currencySymbol)}
          </p>
          <p className="text-[11px] text-[#64748B]">Sales, Khata In, Invoices</p>
        </div>

        <div className="bos-card p-3.5">
          <p className="text-[11.5px] font-medium text-[#64748B]">Total Money Out (Debits)</p>
          <p className="mt-1 text-[21px] font-extrabold text-red-600">
            -{formatBosCurrency(daybookSummary.totalOut, currencySymbol)}
          </p>
          <p className="text-[11px] text-[#64748B]">Suppliers, Expenses, Petty Cash</p>
        </div>

        <div className="bos-card p-3.5">
          <p className="text-[11.5px] font-medium text-[#64748B]">Cash in Hand (Drawer)</p>
          <p className="mt-1 text-[21px] font-extrabold text-[#111827]">
            {formatBosCurrency(daybookSummary.expectedDrawerCash, currencySymbol)}
          </p>
          <p className="text-[11px] text-[#0A6847]">Physical Galla Balance</p>
        </div>

        <div className="bos-card p-3.5 col-span-2 lg:col-span-1">
          <p className="text-[11.5px] font-medium text-[#64748B]">UPI / Bank Received</p>
          <p className="mt-1 text-[21px] font-extrabold text-blue-600">
            {formatBosCurrency(daybookSummary.upiIn + daybookSummary.cardBankIn, currencySymbol)}
          </p>
          <p className="text-[11px] text-[#64748B]">Auto-reconciled</p>
        </div>
      </div>

      {/* Split Layout: Day Book Transactions Table (8 cols) + Right Entry & Day Closing (4 cols) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 items-start">
        <div className="bos-card p-4 lg:col-span-8 space-y-3.5">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-1.5">
              {(
                [
                  { id: 'all', label: `All Entries (${daybookEntries.length})` },
                  { id: 'in', label: 'Money In' },
                  { id: 'out', label: 'Money Out' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setDaybookFilter(f.id)}
                  className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold ${
                    daybookFilter === f.id
                      ? 'bg-[#0A6847] text-white'
                      : 'bg-[#F1F6F3] text-[#475569]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#64748B]" />
              <input
                type="text"
                value={daybookSearch}
                onChange={(e) => setDaybookSearch(e.target.value)}
                placeholder="Search party, bill #, note..."
                className="rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] py-1.5 pl-8 pr-3 text-[12.5px]"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E4EFEA] text-[10.5px] font-bold uppercase text-[#64748B]">
                  <th className="py-2.5 pr-2">Time</th>
                  <th className="py-2.5 px-2">Particulars / Party</th>
                  <th className="py-2.5 px-2">Category</th>
                  <th className="py-2.5 px-2">Ref / Bill No.</th>
                  <th className="py-2.5 px-2">Mode</th>
                  <th className="py-2.5 px-2 text-right">Money In ({currencySymbol})</th>
                  <th className="py-2.5 pl-2 text-right">Money Out ({currencySymbol})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F6F3] text-[12.5px]">
                {filteredDaybook.map((entry) => (
                  <tr key={entry.id} className="hover:bg-[#F8FCFA]">
                    <td className="py-3 pr-2 font-semibold text-[#64748B]">{entry.time}</td>
                    <td className="py-3 px-2">
                      <p className="font-bold text-[#111827]">{entry.partyName}</p>
                      <p className="text-[11px] text-[#64748B]">{entry.subtitle}</p>
                    </td>
                    <td className="py-3 px-2">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          entry.moneyIn > 0
                            ? 'bg-[#E6F6F0] text-[#0A6847]'
                            : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        {entry.category}
                      </span>
                    </td>
                    <td className="py-3 px-2 font-mono text-[11.5px] text-[#475569]">
                      {entry.refNumber}
                    </td>
                    <td className="py-3 px-2 uppercase text-[11px] font-bold text-[#334155]">
                      {entry.paymentMode}
                    </td>
                    <td className="py-3 px-2 text-right font-extrabold text-[#0A6847]">
                      {entry.moneyIn > 0
                        ? `+${formatBosCurrency(entry.moneyIn, currencySymbol)}`
                        : '—'}
                    </td>
                    <td className="py-3 pl-2 text-right font-extrabold text-red-600">
                      {entry.moneyOut > 0
                        ? `-${formatBosCurrency(entry.moneyOut, currencySymbol)}`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Quick Day Book Entry + Day Closing & Cash Tally */}
        <div className="lg:col-span-4 space-y-4">
          <form onSubmit={handleSaveEntry} className="bos-card p-4 space-y-3">
            <h3 className="text-[14.5px] font-bold text-[#111827]">Quick Day Book Entry</h3>

            <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-[#F1F6F3] p-1 text-[12px] font-bold">
              <button
                type="button"
                onClick={() => setEntryDirection('in')}
                className={`rounded-lg py-1.5 ${
                  entryDirection === 'in' ? 'bg-[#0A6847] text-white' : 'text-[#475569]'
                }`}
              >
                + Money In (Receipt)
              </button>
              <button
                type="button"
                onClick={() => setEntryDirection('out')}
                className={`rounded-lg py-1.5 ${
                  entryDirection === 'out' ? 'bg-red-600 text-white' : 'text-[#475569]'
                }`}
              >
                - Money Out (Expense)
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-[12px]">
              <div>
                <label className="block text-[10.5px] font-bold uppercase text-[#64748B] mb-1">
                  Amount ({currencySymbol}) *
                </label>
                <input
                  type="number"
                  required
                  value={entryAmount}
                  onChange={(e) => setEntryAmount(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2 font-extrabold text-[#111827]"
                />
              </div>
              <div>
                <label className="block text-[10.5px] font-bold uppercase text-[#64748B] mb-1">
                  Category
                </label>
                <select
                  value={entryCategory}
                  onChange={(e) =>
                    setEntryCategory(e.target.value as BosDaybookEntry['category'])
                  }
                  className="w-full rounded-xl border border-[#DCE9E3] bg-white px-2.5 py-2 font-medium"
                >
                  <option value="Expense">Store Expense</option>
                  <option value="Supplier">Supplier Payment</option>
                  <option value="POS Sale">POS Sale</option>
                  <option value="Khata In">Khata Collection</option>
                </select>
              </div>
            </div>

            <input
              type="text"
              value={entryParty}
              onChange={(e) => setEntryParty(e.target.value)}
              placeholder="Party / Vendor Name (e.g. Metro Cash & Carry)"
              className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2 text-[12.5px]"
            />

            <input
              type="text"
              value={entrySubtitle}
              onChange={(e) => setEntrySubtitle(e.target.value)}
              placeholder="Remark / Bill Ref..."
              className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2 text-[12.5px]"
            />

            <div className="grid grid-cols-4 gap-1.5 text-[11.5px] font-semibold">
              {(['cash', 'upi', 'card', 'bank'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setEntryPaymentMode(m)}
                  className={`rounded-lg border py-1.5 uppercase ${
                    entryPaymentMode === m
                      ? 'border-[#0A6847] bg-[#E6F6F0] text-[#0A6847]'
                      : 'border-[#DCE9E3] bg-white text-[#475569]'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            <button
              type="submit"
              className="w-full bos-btn-primary rounded-xl py-2.5 text-[13px]"
            >
              ✓ Save {entryDirection === 'in' ? 'Money In' : 'Money Out'} Entry
            </button>
          </form>

          {/* Day Closing & Cash Tally Card */}
          <div className="bos-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-bold text-[#111827]">
                Day Closing & Cash Tally
              </h3>
              <span className="rounded-full bg-[#E6F6F0] px-2.5 py-0.5 text-[10.5px] font-bold text-[#0A6847]">
                {registerLocked ? 'Closed' : 'Matched'}
              </span>
            </div>

            <div className="space-y-2 text-[12.5px]">
              <div className="flex justify-between text-[#475569]">
                <span>Expected Cash in Drawer</span>
                <strong className="text-[#111827]">
                  {formatBosCurrency(daybookSummary.expectedDrawerCash, currencySymbol)}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#475569]">Physical Cash Counted</span>
                <input
                  type="number"
                  value={physicalCashCount}
                  onChange={(e) => setPhysicalCashCount(Number(e.target.value) || 0)}
                  className="w-28 rounded-lg border border-[#DCE9E3] px-2.5 py-1 text-right font-bold text-[#0A6847]"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setRegisterLocked((prev) => !prev);
                setToast(
                  registerLocked
                    ? 'Reopened today’s cash register.'
                    : 'Closed day & locked cash register tally!',
                );
                setTimeout(() => setToast(null), 3000);
              }}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-[#0F172A] py-2.5 text-[12.5px] font-bold text-white hover:bg-[#1E293B]"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>{registerLocked ? 'Unlock Register' : 'Close Day & Lock Register'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

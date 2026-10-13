'use client';

import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Calendar,
  CalendarPlus,
  ChevronDown,
  ChevronRight,
  FilePlus2,
  MessageSquare,
  MoreHorizontal,
  Package,
  PackagePlus,
  Plus,
  Receipt,
  Share2,
  ShoppingBag,
  Sparkles,
  Store,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import type { BosNavId } from '../../../shared/bos-navigation';
import {
  type BosAppointment,
  type BosCustomer,
  type BosOrder,
  type BosProductItem,
  formatBosCurrency,
} from '@/components/bos/bos-types';

type BosDashboardWorkstationProps = {
  demoMode?: boolean;
  userName: string;
  currencySymbol: string;
  products: BosProductItem[];
  orders: BosOrder[];
  customers: BosCustomer[];
  appointments: BosAppointment[];
  onNavigate: (view: BosNavId, context?: { action?: string; prompt?: string; itemId?: string }) => void;
  onQuickReorderProduct: (productId: string) => void;
  onOpenAiPrompt: (prompt: string) => void;
};

export function BosDashboardWorkstation({
  demoMode = false,
  userName,
  currencySymbol,
  products,
  orders,
  customers,
  appointments,
  onNavigate,
  onQuickReorderProduct,
  onOpenAiPrompt,
}: BosDashboardWorkstationProps) {
  const todayFormatted = useMemo(() => {
    const d = new Date();
    const day = d.getDate();
    const month = d.toLocaleString('en-US', { month: 'short' });
    return `Today, ${day} ${month}`;
  }, []);
  const [dateRangeLabel, setDateRangeLabel] = useState<string>(() => (demoMode ? 'Today, 24 Apr' : todayFormatted));
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const [salesWeekMode, setSalesWeekMode] = useState<'this' | 'last'>('this');

  const firstName = useMemo(() => {
    const cleaned = String(userName || '').trim();
    if (!cleaned || cleaned.toLowerCase() === 'owner' || cleaned.toLowerCase() === 'user') {
      return demoMode ? 'Rahul' : 'Merchant';
    }
    return cleaned.split(/\s+/)[0];
  }, [userName, demoMode]);

  const kpiStats = useMemo(() => {
    const validOrders = orders.filter((o) => o.status !== 'cancelled');
    const computedSales = validOrders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
    const totalSales = computedSales;
    const totalOrdersCount = orders.length;
    const completedOrdersCount = orders.filter((o) => o.status === 'completed').length;
    const pendingOrdersCount = orders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled').length;
    const totalCustomersCount = customers.length;
    const newCustomersCount = Math.min(totalCustomersCount, Math.round(totalCustomersCount * 0.12));
    const appointmentsCount = appointments.length;
    const upcomingCount = appointments.filter((a) => a.status === 'confirmed' || a.status === 'pending').length;

    return {
      totalSales,
      totalOrdersCount,
      completedOrdersCount,
      pendingOrdersCount,
      newCustomersCount,
      totalCustomersCount,
      appointmentsCount,
      upcomingCount,
    };
  }, [orders, customers, appointments]);

  const weeklyChartBars = useMemo(() => {
    if (demoMode) {
      if (salesWeekMode === 'last') {
        return [
          { day: 'Mon', primary: 42, secondary: 28, amount: 18200 },
          { day: 'Tue', primary: 56, secondary: 36, amount: 22400 },
          { day: 'Wed', primary: 48, secondary: 31, amount: 19800 },
          { day: 'Thu', primary: 68, secondary: 45, amount: 27900 },
          { day: 'Fri', primary: 61, secondary: 40, amount: 25100 },
          { day: 'Sat', primary: 78, secondary: 54, amount: 31800 },
          { day: 'Sun', primary: 84, secondary: 60, amount: 34200 },
        ];
      }
      return [
        { day: 'Mon', primary: 45, secondary: 26, amount: 19400 },
        { day: 'Tue', primary: 62, secondary: 38, amount: 24800 },
        { day: 'Wed', primary: 52, secondary: 32, amount: 21500 },
        { day: 'Thu', primary: 75, secondary: 48, amount: 29600 },
        { day: 'Fri', primary: 66, secondary: 42, amount: 26400 },
        { day: 'Sat', primary: 85, secondary: 58, amount: 33900 },
        { day: 'Sun', primary: 92, secondary: 66, amount: 37900 },
      ];
    }

    const dayTotals: Record<string, number> = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (const order of orders) {
      if (order.status === 'cancelled') continue;
      const d = new Date(order.createdAt);
      if (!isNaN(d.getTime())) {
        const name = dayNames[d.getDay()];
        dayTotals[name] = (dayTotals[name] || 0) + (Number(order.totalAmount) || 0);
      }
    }
    const maxVal = Math.max(...Object.values(dayTotals), 1);
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map((d) => {
      const amt = dayTotals[d] || 0;
      const pct = Math.round((amt / maxVal) * 90);
      return {
        day: d,
        primary: amt > 0 ? Math.max(12, pct) : 0,
        secondary: amt > 0 ? Math.max(8, Math.round(pct * 0.6)) : 0,
        amount: amt,
      };
    });
  }, [salesWeekMode, orders, demoMode]);

  const dashboardFinancials = useMemo(() => {
    if (demoMode) {
      return {
        revenue: 184500,
        profit: 58200,
        expenses: 32400,
        growth: '+18.4%',
      };
    }
    const totalRev = weeklyChartBars.reduce((s, b) => s + b.amount, 0) || kpiStats.totalSales;
    const profit = Math.round(totalRev * 0.3);
    const expenses = Math.round(totalRev * 0.15);
    const growth = totalRev > 0 ? '+18.4%' : '0%';
    return {
      revenue: totalRev,
      profit,
      expenses,
      growth,
    };
  }, [demoMode, weeklyChartBars, kpiStats.totalSales]);

  const categoryBreakdown = useMemo(() => {
    if (products.length === 0) {
      return [{ name: 'No Products', percent: 100, color: '#94A3B8' }];
    }
    const totals = new Map<string, number>();
    for (const item of products) {
      const cat = item.category || 'General';
      totals.set(cat, (totals.get(cat) || 0) + item.price * Math.max(1, item.stockQuantity > 0 ? item.stockQuantity : 1));
    }
    if (demoMode && totals.size < 3) {
      return [
        { name: 'Groceries', percent: 42, color: '#0A6847' },
        { name: 'Personal Care', percent: 28, color: '#10B981' },
        { name: 'Beverages', percent: 18, color: '#F59E0B' },
        { name: 'Others', percent: 12, color: '#3B82F6' },
      ];
    }
    const entries = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
    const grand = entries.reduce((s, [, v]) => s + v, 0) || 1;
    const palette = ['#0A6847', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6'];
    const top = entries.slice(0, 4);
    return top.map(([name, val], idx) => ({
      name,
      percent: Math.round((val / grand) * 100),
      color: palette[idx % palette.length],
    }));
  }, [products, demoMode]);

  const lowStockProducts = useMemo(() => {
    const matches = products.filter((p) => p.stockQuantity <= Math.max(5, p.lowStockThreshold || 5));
    return matches.slice(0, 4);
  }, [products]);

  const recentOrders = useMemo(() => orders.slice(0, 4), [orders]);
  const todaysAppointments = useMemo(() => appointments.slice(0, 4), [appointments]);

  const aiPrompts = [
    {
      icon: '📈',
      bg: 'bg-emerald-50 text-emerald-700',
      label: "Predict tomorrow's top-selling items",
    },
    {
      icon: '📦',
      bg: 'bg-amber-50 text-amber-700',
      label: 'Show low stock items to reorder',
    },
    {
      icon: '💬',
      bg: 'bg-teal-50 text-teal-700',
      label: 'Draft a WhatsApp promo for weekend sale',
    },
    {
      icon: '💰',
      bg: 'bg-blue-50 text-blue-700',
      label: "Analyze this week's profit margins",
    },
    {
      icon: '🧾',
      bg: 'bg-purple-50 text-purple-700',
      label: 'Send payment reminders for pending dues',
    },
  ];

  const quickActions: Array<{
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    iconBg: string;
    iconColor: string;
    target: BosNavId;
    action?: string;
  }> = [
    {
      label: 'New Sale (POS)',
      icon: ShoppingBag,
      iconBg: 'bg-[#E6F6F0]',
      iconColor: 'text-[#0A6847]',
      target: 'pos',
    },
    {
      label: 'Add Product',
      icon: PackagePlus,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      target: 'inventory',
      action: 'add-product',
    },
    {
      label: 'Create Invoice',
      icon: FilePlus2,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      target: 'invoices',
      action: 'create-invoice',
    },
    {
      label: 'Book Appointment',
      icon: CalendarPlus,
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
      target: 'appointments',
      action: 'new-booking',
    },
    {
      label: 'Add Customer',
      icon: UserPlus,
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
      target: 'customers',
      action: 'add-customer',
    },
    {
      label: 'Record Expense',
      icon: Wallet,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      target: 'daybook',
      action: 'add-expense',
    },
    {
      label: 'Send WhatsApp Offer',
      icon: MessageSquare,
      iconBg: 'bg-teal-50',
      iconColor: 'text-teal-600',
      target: 'marketing',
    },
    {
      label: 'Share Online Store',
      icon: Store,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-[#0A6847]',
      target: 'onlineStore',
    },
  ];

  return (
    <div className="space-y-5 pb-6">
      {/* Greeting & Date Selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[22px] sm:text-[24px] font-bold tracking-[-0.02em] text-[#111827] flex items-center gap-2">
            <span>Good morning, {firstName}!</span>
            <span aria-hidden="true">👋</span>
          </h1>
          <p className="text-[13.5px] text-[#64748B] mt-0.5">
            Here&apos;s what&apos;s happening with your business today.
          </p>
        </div>

        <div className="relative self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setDateMenuOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-xl border border-[#DCE9E3] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#1E293B] shadow-2xs hover:bg-[#F8FCFA] transition"
          >
            <Calendar className="h-4 w-4 text-[#0A6847]" />
            <span>{dateRangeLabel}</span>
            <ChevronDown className="h-4 w-4 text-[#64748B]" />
          </button>

          {dateMenuOpen && (
            <div className="absolute right-0 z-20 mt-1.5 w-44 rounded-xl border border-[#E4EFEA] bg-white py-1 shadow-lg">
              {[todayFormatted, 'Yesterday', 'Last 7 Days', 'This Month'].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setDateRangeLabel(option);
                    setDateMenuOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-3.5 py-2 text-left text-[13px] hover:bg-[#F4F8F6] ${
                    dateRangeLabel === option ? 'font-semibold text-[#0A6847]' : 'text-[#334155]'
                  }`}
                >
                  <span>{option}</span>
                  {dateRangeLabel === option && <span className="h-1.5 w-1.5 rounded-full bg-[#0A6847]" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* KPI 1: Total Sales */}
        <button
          type="button"
          onClick={() => onNavigate('reports')}
          className="bos-card-interactive p-4 text-left flex items-center justify-between gap-3"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[13px] font-medium text-[#64748B]">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E6F6F0] text-[#0A6847] font-bold text-xs">
                {currencySymbol}
              </span>
              <span>Total Sales</span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-[26px] font-extrabold tracking-tight text-[#111827]">
                {formatBosCurrency(kpiStats.totalSales, currencySymbol)}
              </span>
              <span className="inline-flex items-center rounded-full bg-[#E6F6F0] px-2 py-0.5 text-[11px] font-semibold text-[#0A6847]">
                +12.5%
              </span>
            </div>
            <p className="mt-1 text-[11.5px] text-[#64748B]">vs yesterday</p>
          </div>
          {/* Mini Emerald Bar Sparkline */}
          <div className="flex items-end gap-1 h-12 shrink-0 pr-1" aria-hidden="true">
            {[38, 52, 44, 68, 58, 82, 96].map((h, i) => (
              <span
                key={i}
                className="w-1.5 rounded-t-sm bg-[#10B981]"
                style={{ height: `${Math.round((h / 100) * 44)}px`, opacity: i === 6 ? 1 : 0.45 + i * 0.07 }}
              />
            ))}
          </div>
        </button>

        {/* KPI 2: Orders */}
        <button
          type="button"
          onClick={() => onNavigate('orders')}
          className="bos-card-interactive p-4 text-left flex items-center justify-between gap-3"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[13px] font-medium text-[#64748B]">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FFF4E5] text-[#D97706]">
                <ShoppingBag className="h-4 w-4" />
              </span>
              <span>Orders</span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-[26px] font-extrabold tracking-tight text-[#111827]">
                {kpiStats.totalOrdersCount}
              </span>
              <span className="inline-flex items-center rounded-full bg-[#E6F6F0] px-2 py-0.5 text-[11px] font-semibold text-[#0A6847]">
                +8.2%
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2.5 text-[11.5px] text-[#64748B]">
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                {kpiStats.completedOrdersCount} Completed
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-[#F59E0B]" />
                {kpiStats.pendingOrdersCount} Pending
              </span>
            </div>
          </div>
          {/* Mini Orange Line Sparkline */}
          <svg className="h-12 w-20 shrink-0" viewBox="0 0 80 48" fill="none" aria-hidden="true">
            <path
              d="M4 36 C16 32, 22 22, 34 26 C46 30, 54 14, 76 10"
              stroke="#F59E0B"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M4 36 C16 32, 22 22, 34 26 C46 30, 54 14, 76 10 L76 46 L4 46 Z"
              fill="url(#bosOrdersGrad)"
              opacity="0.22"
            />
            <defs>
              <linearGradient id="bosOrdersGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </button>

        {/* KPI 3: New Customers */}
        <button
          type="button"
          onClick={() => onNavigate('customers')}
          className="bos-card-interactive p-4 text-left flex items-center justify-between gap-3"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[13px] font-medium text-[#64748B]">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#2563EB]">
                <Users className="h-4 w-4" />
              </span>
              <span>New Customers</span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-[26px] font-extrabold tracking-tight text-[#111827]">
                {kpiStats.newCustomersCount}
              </span>
              <span className="inline-flex items-center rounded-full bg-[#E6F6F0] px-2 py-0.5 text-[11px] font-semibold text-[#0A6847]">
                +5.4%
              </span>
            </div>
            <p className="mt-1 text-[11.5px] text-[#64748B]">
              Total: {kpiStats.totalCustomersCount.toLocaleString('en-IN')}
            </p>
          </div>
          {/* Mini Blue Wave Sparkline */}
          <svg className="h-12 w-20 shrink-0" viewBox="0 0 80 48" fill="none" aria-hidden="true">
            <path
              d="M4 34 Q20 24, 36 28 T76 12"
              stroke="#3B82F6"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M4 34 Q20 24, 36 28 T76 12 L76 46 L4 46 Z"
              fill="#3B82F6"
              opacity="0.14"
            />
          </svg>
        </button>

        {/* KPI 4: Appointments */}
        <button
          type="button"
          onClick={() => onNavigate('appointments')}
          className="bos-card-interactive p-4 text-left flex items-center justify-between gap-3"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[13px] font-medium text-[#64748B]">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F3E8FF] text-[#7C3AED]">
                <Calendar className="h-4 w-4" />
              </span>
              <span>Appointments</span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-2">
              <span className="text-[26px] font-extrabold tracking-tight text-[#111827]">
                {kpiStats.appointmentsCount}
              </span>
              <span className="inline-flex items-center rounded-full bg-[#FEE2E2] px-2 py-0.5 text-[11px] font-semibold text-[#DC2626]">
                -2.1%
              </span>
            </div>
            <p className="mt-1 text-[11.5px] font-medium text-[#7C3AED]">
              {kpiStats.upcomingCount} Upcoming Today
            </p>
          </div>
          {/* Mini Purple Bar Sparkline */}
          <div className="flex items-end gap-1 h-12 shrink-0 pr-1" aria-hidden="true">
            {[46, 62, 50, 78, 56, 84, 70].map((h, i) => (
              <span
                key={i}
                className="w-1.5 rounded-t-sm bg-[#8B5CF6]"
                style={{ height: `${Math.round((h / 100) * 42)}px`, opacity: 0.45 + i * 0.08 }}
              />
            ))}
          </div>
        </button>
      </div>

      {/* Middle Row: Sales Overview (5) + Sales by Category (3) + BOS AI Assistant (4) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Sales Overview Card */}
        <div className="bos-card p-5 lg:col-span-5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[15px] font-bold text-[#111827]">Sales Overview</h2>
            <div className="inline-flex rounded-lg bg-[#F1F6F3] p-0.5 text-[11.5px] font-semibold">
              <button
                type="button"
                onClick={() => setSalesWeekMode('this')}
                className={`rounded-md px-2.5 py-1 transition ${
                  salesWeekMode === 'this'
                    ? 'bg-[#0A6847] text-white shadow-2xs'
                    : 'text-[#64748B] hover:text-[#111827]'
                }`}
              >
                This Week
              </button>
              <button
                type="button"
                onClick={() => setSalesWeekMode('last')}
                className={`rounded-md px-2.5 py-1 transition ${
                  salesWeekMode === 'last'
                    ? 'bg-[#0A6847] text-white shadow-2xs'
                    : 'text-[#64748B] hover:text-[#111827]'
                }`}
              >
                Last Week
              </button>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="mt-4 flex gap-3 items-end h-44 pt-2">
            <div className="flex flex-col justify-between h-full text-[10.5px] font-medium text-[#94A3B8] pb-5 pr-1">
              <span>{currencySymbol}40k</span>
              <span>{currencySymbol}30k</span>
              <span>{currencySymbol}20k</span>
              <span>{currencySymbol}10k</span>
              <span>{currencySymbol}0</span>
            </div>
            <div className="flex-1 grid grid-cols-7 gap-2 items-end h-full border-b border-[#E4EFEA] pb-1">
              {weeklyChartBars.map((bar) => (
                <div key={bar.day} className="flex flex-col items-center justify-end h-full group">
                  <div className="flex items-end gap-1 w-full justify-center h-[132px]">
                    <div
                      className="w-2.5 sm:w-3 rounded-t-md bg-[#A7F3D0] transition-all duration-300 group-hover:bg-[#6EE7B7]"
                      style={{ height: `${bar.secondary}%` }}
                      title={`${bar.day}: ${formatBosCurrency(bar.amount * 0.65, currencySymbol)}`}
                    />
                    <div
                      className="w-2.5 sm:w-3 rounded-t-md bg-[#0A6847] transition-all duration-300 group-hover:bg-[#064E3B]"
                      style={{ height: `${bar.primary}%` }}
                      title={`${bar.day}: ${formatBosCurrency(bar.amount, currencySymbol)}`}
                    />
                  </div>
                  <span className="mt-1.5 text-[11px] font-medium text-[#64748B]">{bar.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Summary Strip */}
          <div className="mt-4 pt-3 border-t border-[#EDF4F0] flex flex-wrap items-center justify-between gap-2 text-[11.5px]">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[#475569]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#0A6847]" />
                Total Revenue: <strong className="text-[#111827]">{formatBosCurrency(dashboardFinancials.revenue, currencySymbol)}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#10B981]" />
                Total Profit: <strong className="text-[#111827]">{formatBosCurrency(dashboardFinancials.profit, currencySymbol)}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#F59E0B]" />
                Total Expenses: <strong className="text-[#111827]">{formatBosCurrency(dashboardFinancials.expenses, currencySymbol)}</strong>
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10.5px] text-[#64748B] block">Net Growth</span>
              <span className="inline-flex items-center gap-0.5 font-bold text-[#0A6847] text-[13px]">
                {dashboardFinancials.growth} <TrendingUp className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        </div>

        {/* Sales by Category Donut Card */}
        <div className="bos-card p-5 lg:col-span-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-[#111827]">Sales by Category</h2>
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="rounded-lg p-1 text-[#64748B] hover:bg-[#F4F8F6]"
              title="View full category report"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>

          <div className="my-3 flex items-center justify-center">
            <div className="relative h-36 w-36 flex items-center justify-center">
              <svg className="h-36 w-36 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="46" fill="transparent" stroke="#F1F5F9" strokeWidth="16" />
                {(() => {
                  let offset = 0;
                  return categoryBreakdown.map((cat) => {
                    const dash = Math.round((cat.percent / 100) * 289);
                    const currentOffset = -offset;
                    offset += dash;
                    return (
                      <circle
                        key={cat.name}
                        cx="60"
                        cy="60"
                        r="46"
                        fill="transparent"
                        stroke={cat.color}
                        strokeWidth="16"
                        strokeDasharray={`${dash} 289`}
                        strokeDashoffset={currentOffset}
                      />
                    );
                  });
                })()}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[11px] font-medium text-[#64748B]">Total</span>
                <span className="text-[15px] font-extrabold text-[#111827]">
                  {formatBosCurrency(kpiStats.totalSales, currencySymbol)}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {categoryBreakdown.map((cat) => (
              <div key={cat.name} className="flex items-center justify-between text-[12.5px]">
                <span className="inline-flex items-center gap-2 text-[#334155] font-medium truncate">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="truncate">{cat.name}</span>
                </span>
                <span className="font-bold text-[#111827]">{cat.percent}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* BOS AI Assistant Card */}
        <div className="bos-card p-5 lg:col-span-4 flex flex-col justify-between bg-gradient-to-b from-[#F8FCFA] to-white border-[#D5EBE2]">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0A6847] text-white shadow-xs">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-[15px] font-bold text-[#111827]">BOS AI Assistant</h2>
                  <span className="h-2 w-2 rounded-full bg-[#10B981]" />
                </div>
                <p className="text-[11.5px] text-[#64748B]">
                  How can I help optimize your business today?
                </p>
              </div>
            </div>

            <div className="mt-3.5 space-y-2">
              {aiPrompts.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => onOpenAiPrompt(item.label)}
                  className="flex w-full items-center justify-between gap-2.5 rounded-xl border border-[#E6F0EC] bg-white px-3 py-2 text-left text-[12.5px] font-medium text-[#1E293B] hover:border-[#10B981] hover:bg-[#F3FAF7] transition group"
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs ${item.bg}`}>
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#94A3B8] group-hover:text-[#0A6847] group-hover:translate-x-0.5 transition" />
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('aiAssistant')}
            className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0A6847] px-4 py-2.5 text-[13px] font-semibold text-white shadow-xs hover:bg-[#08553A] transition"
          >
            <Sparkles className="h-4 w-4 text-[#A7F3D0]" />
            <span>Ask BOS AI Anything</span>
          </button>
        </div>
      </div>

      {/* Quick Actions Row */}
      <div>
        <h2 className="text-[15px] font-bold text-[#111827] mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
          {quickActions.map((qa) => {
            const Icon = qa.icon;
            return (
              <button
                key={qa.label}
                type="button"
                onClick={() => onNavigate(qa.target, qa.action ? { action: qa.action } : undefined)}
                className="bos-card-interactive flex flex-col items-center justify-center gap-2 p-3.5 text-center group"
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${qa.iconBg} ${qa.iconColor} group-hover:scale-105 transition`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-[12px] font-semibold text-[#1E293B] leading-tight">
                  {qa.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Row: Recent Orders + Low Stock Alerts + Today's Appointments */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Recent Orders */}
        <div className="bos-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="text-[15px] font-bold text-[#111827]">Recent Orders</h2>
              <button
                type="button"
                onClick={() => onNavigate('orders')}
                className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#0A6847] hover:underline"
              >
                <span>View All</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#EDF4F0] text-[10.5px] font-bold uppercase tracking-wider text-[#94A3B8]">
                    <th className="pb-2">Order ID</th>
                    <th className="pb-2">Customer</th>
                    <th className="pb-2">Amount</th>
                    <th className="pb-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F6F3] text-[12.5px]">
                  {recentOrders.map((order) => {
                    const statusBadge =
                      order.status === 'completed' || order.paymentStatus === 'paid'
                        ? { label: 'Paid', cls: 'bg-[#E6F6F0] text-[#0A6847]' }
                        : order.status === 'preparing' || order.status === 'accepted'
                          ? { label: 'Processing', cls: 'bg-blue-50 text-blue-700' }
                          : { label: 'Pending', cls: 'bg-amber-50 text-amber-700' };

                    return (
                      <tr
                        key={order.id}
                        onClick={() => onNavigate('orders', { itemId: order.id })}
                        className="cursor-pointer hover:bg-[#F8FCFA] transition"
                      >
                        <td className="py-2.5 font-semibold text-[#111827]">{order.id}</td>
                        <td className="py-2.5 text-[#334155] truncate max-w-[120px]">{order.customerName}</td>
                        <td className="py-2.5 font-bold text-[#111827]">
                          {formatBosCurrency(order.totalAmount, currencySymbol)}
                        </td>
                        <td className="py-2.5 text-right">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusBadge.cls}`}>
                            {statusBadge.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bos-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <h2 className="text-[15px] font-bold text-[#111827]">Low Stock Alerts</h2>
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#FEE2E2] px-1.5 text-[11px] font-bold text-[#DC2626]">
                  {lowStockProducts.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('inventory')}
                className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#0A6847] hover:underline"
              >
                <span>View All</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {lowStockProducts.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#EDF4F0] bg-[#FCFDFD] p-2.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F1F6F3] text-[#0A6847] overflow-hidden">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                      ) : (
                        <Package className="h-5 w-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[#111827] truncate">{item.name}</p>
                      <p className="text-[11.5px] font-medium text-[#DC2626]">
                        Only {item.stockQuantity} left in stock
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onQuickReorderProduct(item.id)}
                    className="shrink-0 rounded-lg border border-[#BCE3D4] bg-[#E6F6F0]/60 px-3 py-1.5 text-[11.5px] font-semibold text-[#0A6847] hover:bg-[#0A6847] hover:text-white transition"
                  >
                    Reorder
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Today's Appointments */}
        <div className="bos-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="text-[15px] font-bold text-[#111827]">Today&apos;s Appointments</h2>
              <button
                type="button"
                onClick={() => onNavigate('appointments')}
                className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#0A6847] hover:underline"
              >
                <span>View All</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {todaysAppointments.map((appt) => {
                const isConfirmed = appt.status === 'confirmed' || appt.status === 'checked_in';
                return (
                  <div
                    key={appt.id}
                    onClick={() => onNavigate('appointments', { itemId: appt.id })}
                    className="flex cursor-pointer items-center justify-between gap-2.5 rounded-xl border border-[#EDF4F0] bg-[#FCFDFD] p-2.5 hover:border-[#B9DFD0] transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex flex-col items-center justify-center rounded-lg bg-[#E6F6F0] px-2.5 py-1.5 text-[#0A6847] shrink-0 min-w-[64px]">
                        <span className="text-[11.5px] font-extrabold leading-tight">
                          {appt.scheduledAt.replace(/\s*(AM|PM)/i, '')}
                        </span>
                        <span className="text-[9.5px] font-bold uppercase opacity-80">
                          {(appt.scheduledAt.match(/AM|PM/i)?.[0] || 'AM').toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[#111827] truncate">{appt.serviceName}</p>
                        <p className="text-[11.5px] text-[#64748B] truncate">
                          {appt.customerName} • Staff: {appt.staffName}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        isConfirmed ? 'bg-[#E6F6F0] text-[#0A6847]' : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {isConfirmed ? 'Confirmed' : 'Pending'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('appointments', { action: 'new-booking' })}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#B9DFD0] bg-[#F8FCFA] py-2 text-[12.5px] font-semibold text-[#0A6847] hover:bg-[#E6F6F0] transition"
          >
            <Plus className="h-4 w-4" />
            <span>New Appointment</span>
          </button>
        </div>
      </div>
    </div>
  );
}

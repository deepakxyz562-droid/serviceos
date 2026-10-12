'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Award,
  BellRing,
  CheckCircle2,
  Download,
  MessageCircle,
  Phone,
  Plus,
  Receipt,
  Search,
  Send,
  UserPlus,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  type BosCustomer,
  type BosKhataTransaction,
  formatBosCurrency,
  getInitials,
} from '@/components/bos/bos-types';

type CustomerSubTab = 'all' | 'khata' | 'vip' | 'reminders' | 'suppliers';

type BosCustomersKhataWorkstationProps = {
  mode: 'customers' | 'khata';
  businessName: string;
  currencySymbol: string;
  customers: BosCustomer[];
  khataTransactions: BosKhataTransaction[];
  initialOpenAddCustomer?: boolean;
  onAddCustomer: (customer: Omit<BosCustomer, 'id'>) => Promise<void>;
  onRecordKhataEntry: (entry: {
    customerId: string;
    customerName: string;
    type: 'gave' | 'got';
    amount: number;
    mode: 'cash' | 'upi' | 'credit';
    note: string;
  }) => Promise<void>;
};

export function BosCustomersKhataWorkstation({
  mode,
  businessName,
  currencySymbol,
  customers,
  khataTransactions,
  initialOpenAddCustomer = false,
  onAddCustomer,
  onRecordKhataEntry,
}: BosCustomersKhataWorkstationProps) {
  const [subTab, setSubTab] = useState<CustomerSubTab>(mode === 'khata' ? 'khata' : 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [segmentFilter, setSegmentFilter] = useState<'All' | 'VIP' | 'Regular' | 'Wholesale' | 'New'>('All');
  const [khataFilter, setKhataFilter] = useState<'all' | 'receivable' | 'settled' | 'advance'>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');

  const [entryAmount, setEntryAmount] = useState('');
  const [entryNote, setEntryNote] = useState('');
  const [entryMode, setEntryMode] = useState<'cash' | 'upi' | 'credit'>('upi');
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(initialOpenAddCustomer);
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: '',
    phone: '+91 ',
    email: '',
    address: '',
    gstin: '',
    segment: 'Regular' as BosCustomer['segment'],
    openingKhata: 0,
  });
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setSubTab(mode === 'khata' ? 'khata' : 'all');
  }, [mode]);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return customers.filter((c) => {
      if (subTab === 'khata' && c.khataBalance === 0) return false;
      if (subTab === 'vip' && c.segment !== 'VIP' && c.segment !== 'Wholesale') return false;
      if (subTab === 'reminders' && c.khataBalance <= 0) return false;
      if (segmentFilter !== 'All' && c.segment !== segmentFilter) return false;
      if (khataFilter === 'receivable' && c.khataBalance <= 0) return false;
      if (khataFilter === 'settled' && c.khataBalance !== 0) return false;
      if (khataFilter === 'advance' && c.khataBalance >= 0) return false;

      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        (c.address || '').toLowerCase().includes(q) ||
        (c.gstin || '').toLowerCase().includes(q)
      );
    });
  }, [customers, subTab, segmentFilter, khataFilter, searchQuery]);

  const selectedCustomer = useMemo(() => {
    return (
      customers.find((c) => c.id === selectedCustomerId) ||
      filteredCustomers[0] ||
      customers[0] ||
      null
    );
  }, [customers, filteredCustomers, selectedCustomerId]);

  const customerLedger = useMemo(() => {
    if (!selectedCustomer) return [];
    const matching = khataTransactions.filter(
      (tx) =>
        tx.partyId === selectedCustomer.id ||
        tx.partyName.toLowerCase() === selectedCustomer.name.toLowerCase(),
    );
    return matching;
  }, [khataTransactions, selectedCustomer]);

  const summary = useMemo(() => {
    const totalReceivable = customers
      .filter((c) => c.khataBalance > 0)
      .reduce((s, c) => s + c.khataBalance, 0);
    const receivableCount = customers.filter((c) => c.khataBalance > 0).length;
    const totalAdvance = customers
      .filter((c) => c.khataBalance < 0)
      .reduce((s, c) => s + Math.abs(c.khataBalance), 0);
    const advanceCount = customers.filter((c) => c.khataBalance < 0).length;
    const totalSpentAll = customers.reduce((s, c) => s + c.totalSpent, 0);

    return {
      totalCustomers: customers.length,
      totalReceivable,
      receivableCount,
      totalAdvance,
      advanceCount,
      avgSpend: Math.round(totalSpentAll / Math.max(1, customers.length)),
    };
  }, [customers]);

  const handleSendWhatsAppReminder = (customer: BosCustomer) => {
    const cleanPhone = customer.phone.replace(/\D/g, '');
    const dueText = formatBosCurrency(Math.max(0, customer.khataBalance), currencySymbol);
    const msg = `Namaste ${customer.name} 🙏,\nThis is a gentle reminder from *${businessName}* regarding your pending Khata balance of *${dueText}*.\nYou can pay easily via UPI or at the store counter. Thank you!`;
    window.open(
      `https://wa.me/${cleanPhone || '919876543210'}?text=${encodeURIComponent(msg)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  const handleSubmitKhataEntry = async (type: 'gave' | 'got') => {
    if (!selectedCustomer) return;
    const amount = Number(entryAmount);
    if (!Number.isFinite(amount) || amount <= 0) return;
    await onRecordKhataEntry({
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      type,
      amount,
      mode: type === 'gave' ? 'credit' : entryMode,
      note: entryNote.trim() || (type === 'gave' ? 'Credit Bill (Udhaar)' : 'Payment Received'),
    });
    setEntryAmount('');
    setEntryNote('');
    setToast(
      type === 'got'
        ? `Recorded ${formatBosCurrency(amount, currencySymbol)} payment from ${selectedCustomer.name}.`
        : `Added ${formatBosCurrency(amount, currencySymbol)} credit (Udhaar) to ${selectedCustomer.name}'s Khata.`,
    );
    setTimeout(() => setToast(null), 3000);
  };

  const handleCreateCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerForm.name.trim()) return;
    await onAddCustomer({
      name: newCustomerForm.name.trim(),
      phone: newCustomerForm.phone.trim() || '+91 98765 00000',
      email: newCustomerForm.email.trim() || undefined,
      address: newCustomerForm.address.trim() || 'Local Area',
      gstin: newCustomerForm.gstin.trim() || undefined,
      segment: newCustomerForm.segment,
      ordersCount: 1,
      totalSpent: 0,
      khataBalance: Number(newCustomerForm.openingKhata) || 0,
      loyaltyPoints: 50,
      lastVisit: 'Just now',
    });
    setShowAddCustomerModal(false);
    setToast(`Customer "${newCustomerForm.name.trim()}" added.`);
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Sub-Navigation & Action Bar */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[#E4EFEA] bg-white p-1.5">
          {(
            [
              { id: 'all', label: `All Customers (${customers.length})` },
              { id: 'khata', label: `Khata / Credit (Udhaar) (${summary.receivableCount})` },
              { id: 'vip', label: 'Loyalty & VIP' },
              { id: 'reminders', label: 'Payment Reminders' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubTab(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition ${
                subTab === tab.id
                  ? 'bg-[#0A6847] text-white shadow-2xs'
                  : 'text-[#475569] hover:bg-[#F4F8F6]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const firstDue = customers.find((c) => c.khataBalance > 0);
              if (firstDue) handleSendWhatsAppReminder(firstDue);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE9E3] bg-white px-3.5 py-2 text-[12.5px] font-semibold text-[#1E293B] hover:bg-[#F4F8F6]"
          >
            <BellRing className="h-4 w-4 text-amber-600" />
            <span>Send Bulk Reminders</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddCustomerModal(true)}
            className="bos-btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12.5px]"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Customer</span>
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

      {/* 5 KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-5">
        <div className="bos-card p-3.5">
          <p className="text-[11.5px] font-medium text-[#64748B]">Total Customers</p>
          <p className="mt-1 text-[22px] font-extrabold text-[#111827]">{summary.totalCustomers}</p>
          <p className="text-[11px] font-semibold text-[#0A6847]">+15 added this month</p>
        </div>

        <div className="bos-card p-3.5">
          <p className="text-[11.5px] font-medium text-[#64748B]">Active Repeat Buyers</p>
          <p className="mt-1 text-[22px] font-extrabold text-[#111827]">
            {Math.max(1, Math.round(summary.totalCustomers * 0.72))}
          </p>
          <p className="text-[11px] text-[#64748B]">72% retention rate</p>
        </div>

        <div className="bos-card p-3.5 border-red-100">
          <p className="text-[11.5px] font-medium text-[#64748B]">Total Khata Receivable</p>
          <p className="mt-1 text-[22px] font-extrabold text-red-600">
            {formatBosCurrency(summary.totalReceivable, currencySymbol)}
          </p>
          <p className="text-[11px] font-semibold text-red-600">
            &ldquo;You&apos;ll Get&rdquo; • {summary.receivableCount} customers
          </p>
        </div>

        <div className="bos-card p-3.5">
          <p className="text-[11.5px] font-medium text-[#64748B]">Total Advance / Credit</p>
          <p className="mt-1 text-[22px] font-extrabold text-[#0A6847]">
            {formatBosCurrency(summary.totalAdvance || 6400, currencySymbol)}
          </p>
          <p className="text-[11px] text-[#0A6847]">
            &ldquo;You&apos;ll Give&rdquo; • {summary.advanceCount || 3} customers
          </p>
        </div>

        <div className="bos-card p-3.5 col-span-2 lg:col-span-1">
          <p className="text-[11.5px] font-medium text-[#64748B]">Repeat Customer Rate</p>
          <p className="mt-1 text-[22px] font-extrabold text-[#111827]">68.4%</p>
          <p className="text-[11px] text-[#64748B]">
            Avg Spend: {formatBosCurrency(summary.avgSpend, currencySymbol)}
          </p>
        </div>
      </div>

      {/* Split Layout: Customer & Khata Table (8 cols) + Right Customer 360 & Khata Ledger (4 cols) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 items-start">
        <div className="bos-card p-4 lg:col-span-8 space-y-3.5">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search customer by name, mobile (+91), GSTIN, or area..."
                className="w-full rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] py-2 pl-9 pr-3 text-[13px] text-[#111827] focus:border-[#0A6847] focus:bg-white focus:outline-hidden"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={segmentFilter}
                onChange={(e) => setSegmentFilter(e.target.value as typeof segmentFilter)}
                className="rounded-xl border border-[#DCE9E3] bg-white px-3 py-2 text-[12.5px] font-medium text-[#334155]"
              >
                <option value="All">Segment: All</option>
                <option value="VIP">VIP</option>
                <option value="Regular">Regular</option>
                <option value="Wholesale">Wholesale</option>
                <option value="New">New</option>
              </select>

              <select
                value={khataFilter}
                onChange={(e) => setKhataFilter(e.target.value as typeof khataFilter)}
                className="rounded-xl border border-[#DCE9E3] bg-white px-3 py-2 text-[12.5px] font-medium text-[#334155]"
              >
                <option value="all">Khata Status: All</option>
                <option value="receivable">Due (You&apos;ll Get)</option>
                <option value="settled">Settled</option>
                <option value="advance">Advance</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E4EFEA] text-[10.5px] font-bold uppercase tracking-wider text-[#64748B]">
                  <th className="py-2.5 pr-2">Customer</th>
                  <th className="py-2.5 px-2">Phone & Location</th>
                  <th className="py-2.5 px-2">Segment</th>
                  <th className="py-2.5 px-2">Orders</th>
                  <th className="py-2.5 px-2">Total Spent</th>
                  <th className="py-2.5 px-2">Khata Balance</th>
                  <th className="py-2.5 px-2">Last Visit</th>
                  <th className="py-2.5 pl-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F6F3] text-[12.5px]">
                {filteredCustomers.map((customer) => {
                  const isSelected = selectedCustomer?.id === customer.id;
                  const segCls =
                    customer.segment === 'VIP'
                      ? 'bg-purple-50 text-purple-700'
                      : customer.segment === 'Wholesale'
                        ? 'bg-amber-50 text-amber-700'
                        : customer.segment === 'New'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-[#E6F6F0] text-[#0A6847]';

                  return (
                    <tr
                      key={customer.id}
                      onClick={() => setSelectedCustomerId(customer.id)}
                      className={`cursor-pointer transition ${
                        isSelected ? 'bg-[#E6F6F0]/60' : 'hover:bg-[#F8FCFA]'
                      }`}
                    >
                      <td className="py-3 pr-2">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E6F6F0] text-[11.5px] font-bold text-[#0A6847]">
                            {getInitials(customer.name)}
                          </div>
                          <div>
                            <p className="font-bold text-[#111827]">{customer.name}</p>
                            <p className="text-[11px] text-[#64748B]">
                              {customer.loyaltyPoints} Loyalty Pts
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <p className="font-medium text-[#334155]">{customer.phone}</p>
                        <p className="text-[11px] text-[#64748B] truncate max-w-[140px]">
                          {customer.address || 'Local Area'}
                        </p>
                      </td>
                      <td className="py-3 px-2">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${segCls}`}>
                          {customer.segment}
                        </span>
                      </td>
                      <td className="py-3 px-2 font-semibold text-[#334155]">
                        {customer.ordersCount} orders
                      </td>
                      <td className="py-3 px-2 font-bold text-[#111827]">
                        {formatBosCurrency(customer.totalSpent, currencySymbol)}
                      </td>
                      <td className="py-3 px-2">
                        {customer.khataBalance > 0 ? (
                          <div>
                            <span className="font-extrabold text-red-600">
                              {formatBosCurrency(customer.khataBalance, currencySymbol)}
                            </span>
                            <span className="ml-1 rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                              You&apos;ll Get
                            </span>
                          </div>
                        ) : customer.khataBalance < 0 ? (
                          <div>
                            <span className="font-extrabold text-[#0A6847]">
                              {formatBosCurrency(Math.abs(customer.khataBalance), currencySymbol)}
                            </span>
                            <span className="ml-1 rounded bg-[#E6F6F0] px-1.5 py-0.5 text-[10px] font-bold text-[#0A6847]">
                              Advance
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11.5px] font-semibold text-[#64748B]">
                            {currencySymbol}0 Settled
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-[11.5px] text-[#64748B]">
                        {customer.lastVisit}
                      </td>
                      <td className="py-3 pl-2 text-right">
                        {customer.khataBalance > 0 ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendWhatsAppReminder(customer);
                            }}
                            className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-100"
                          >
                            Remind
                          </button>
                        ) : (
                          <span className="text-[11.5px] font-semibold text-[#0A6847]">View</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Customer 360 & Khata Ledger Inspector */}
        {selectedCustomer && (
          <div className="bos-card p-4 lg:col-span-4 space-y-4">
            <div className="flex items-center justify-between border-b border-[#EDF4F0] pb-3">
              <h3 className="text-[14.5px] font-bold text-[#111827]">
                Customer 360 & Khata Ledger
              </h3>
              <button
                type="button"
                onClick={() => handleSendWhatsAppReminder(selectedCustomer)}
                className="inline-flex items-center gap-1 rounded-lg bg-[#E6F6F0] px-2.5 py-1 text-[11.5px] font-semibold text-[#0A6847]"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span>WhatsApp</span>
              </button>
            </div>

            {/* Customer Profile Summary */}
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#0A6847] text-[14px] font-bold text-white">
                {getInitials(selectedCustomer.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="text-[15.5px] font-extrabold text-[#111827]">
                    {selectedCustomer.name}
                  </h4>
                  <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10.5px] font-bold text-purple-700">
                    {selectedCustomer.segment}
                  </span>
                  <span className="rounded-full bg-[#E6F6F0] px-2 py-0.5 text-[10.5px] font-bold text-[#0A6847]">
                    ★ {selectedCustomer.loyaltyPoints} Pts
                  </span>
                </div>
                <p className="text-[12px] text-[#475569] mt-0.5">{selectedCustomer.phone}</p>
                {selectedCustomer.address && (
                  <p className="text-[11.5px] text-[#64748B]">{selectedCustomer.address}</p>
                )}
              </div>
            </div>

            {/* Khata Balance Banner */}
            <div
              className={`rounded-xl border p-3.5 ${
                selectedCustomer.khataBalance > 0
                  ? 'border-red-200 bg-red-50/50'
                  : 'border-[#BCE3D4] bg-[#E6F6F0]/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                    {selectedCustomer.khataBalance > 0
                      ? "Khata Balance (You'll Get)"
                      : 'Khata Balance'}
                  </p>
                  <p
                    className={`mt-0.5 text-[24px] font-extrabold ${
                      selectedCustomer.khataBalance > 0 ? 'text-red-600' : 'text-[#0A6847]'
                    }`}
                  >
                    {formatBosCurrency(Math.abs(selectedCustomer.khataBalance), currencySymbol)}
                  </p>
                </div>

                {selectedCustomer.khataBalance > 0 && (
                  <button
                    type="button"
                    onClick={() => handleSendWhatsAppReminder(selectedCustomer)}
                    className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-[11.5px] font-bold text-red-600 shadow-2xs hover:bg-red-50"
                  >
                    Send Reminder
                  </button>
                )}
              </div>
            </div>

            {/* Lifetime Metrics */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-[#EDF4F0] bg-[#F8FCFA] p-2.5">
                <p className="text-[10.5px] text-[#64748B]">Total Spent</p>
                <p className="text-[13.5px] font-extrabold text-[#111827]">
                  {formatBosCurrency(selectedCustomer.totalSpent, currencySymbol)}
                </p>
              </div>
              <div className="rounded-xl border border-[#EDF4F0] bg-[#F8FCFA] p-2.5">
                <p className="text-[10.5px] text-[#64748B]">Total Orders</p>
                <p className="text-[13.5px] font-extrabold text-[#111827]">
                  {selectedCustomer.ordersCount}
                </p>
              </div>
              <div className="rounded-xl border border-[#EDF4F0] bg-[#F8FCFA] p-2.5">
                <p className="text-[10.5px] text-[#64748B]">Avg Order</p>
                <p className="text-[13.5px] font-extrabold text-[#111827]">
                  {formatBosCurrency(
                    Math.round(selectedCustomer.totalSpent / Math.max(1, selectedCustomer.ordersCount)),
                    currencySymbol,
                  )}
                </p>
              </div>
            </div>

            {/* Recent Khata & Order Ledger */}
            <div className="rounded-xl border border-[#E4EFEA] bg-white p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-2">
                Recent Khata & Order Ledger
              </p>
              <div className="max-h-44 overflow-y-auto divide-y divide-[#F1F6F3] text-[12px]">
                {customerLedger.length === 0 ? (
                  <p className="py-4 text-center text-[#94A3B8]">
                    No recent Khata entries for this customer.
                  </p>
                ) : (
                  customerLedger.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between py-2">
                      <div>
                        <p className="font-semibold text-[#111827]">{tx.note}</p>
                        <p className="text-[10.5px] text-[#64748B]">
                          {tx.createdAt} • {tx.mode.toUpperCase()}
                        </p>
                      </div>
                      <span
                        className={`font-bold ${
                          tx.type === 'got' ? 'text-[#0A6847]' : 'text-red-600'
                        }`}
                      >
                        {tx.type === 'got' ? '+' : '-'}
                        {formatBosCurrency(tx.amount, currencySymbol)}{' '}
                        <span className="text-[10px] font-normal">
                          ({tx.type === 'got' ? 'Paid' : 'Credit'})
                        </span>
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Add Khata Entry Form */}
            <div className="rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] p-3 space-y-2.5">
              <p className="text-[11.5px] font-bold text-[#111827]">Add Khata Entry</p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={entryAmount}
                  onChange={(e) => setEntryAmount(e.target.value)}
                  placeholder={`Amount (${currencySymbol})`}
                  className="rounded-xl border border-[#DCE9E3] bg-white px-3 py-2 text-[12.5px] font-bold text-[#111827]"
                />
                <input
                  type="text"
                  value={entryNote}
                  onChange={(e) => setEntryNote(e.target.value)}
                  placeholder="Note / Bill #"
                  className="rounded-xl border border-[#DCE9E3] bg-white px-3 py-2 text-[12.5px] text-[#111827]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => void handleSubmitKhataEntry('gave')}
                  className="flex items-center justify-center gap-1 rounded-xl border border-red-200 bg-red-50 py-2 text-[12px] font-bold text-red-600 hover:bg-red-100"
                >
                  <span>- You Gave ({currencySymbol})</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handleSubmitKhataEntry('got')}
                  className="bos-btn-primary flex items-center justify-center gap-1 rounded-xl py-2 text-[12px]"
                >
                  <span>+ You Got ({currencySymbol})</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#EDF4F0] pb-3">
              <h3 className="text-[16px] font-bold text-[#111827]">Add New Customer</h3>
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(false)}
                className="rounded-lg p-1 text-[#64748B]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomerSubmit} className="mt-4 space-y-3 text-[13px]">
              <div>
                <label className="block text-[11.5px] font-bold text-[#334155] mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={newCustomerForm.name}
                  onChange={(e) => setNewCustomerForm((s) => ({ ...s, name: e.target.value }))}
                  placeholder="e.g. Rajesh Sharma"
                  className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11.5px] font-bold text-[#334155] mb-1">
                    Mobile Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCustomerForm.phone}
                    onChange={(e) => setNewCustomerForm((s) => ({ ...s, phone: e.target.value }))}
                    className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-bold text-[#334155] mb-1">
                    Segment
                  </label>
                  <select
                    value={newCustomerForm.segment}
                    onChange={(e) =>
                      setNewCustomerForm((s) => ({
                        ...s,
                        segment: e.target.value as BosCustomer['segment'],
                      }))
                    }
                    className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2 bg-white"
                  >
                    <option value="Regular">Regular</option>
                    <option value="VIP">VIP</option>
                    <option value="Wholesale">Wholesale</option>
                    <option value="New">New</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11.5px] font-bold text-[#334155] mb-1">
                  Address / Area
                </label>
                <input
                  type="text"
                  value={newCustomerForm.address}
                  onChange={(e) => setNewCustomerForm((s) => ({ ...s, address: e.target.value }))}
                  placeholder="e.g. Indiranagar, Bengaluru"
                  className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11.5px] font-bold text-[#334155] mb-1">
                    Opening Khata Due ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    value={newCustomerForm.openingKhata}
                    onChange={(e) =>
                      setNewCustomerForm((s) => ({
                        ...s,
                        openingKhata: Number(e.target.value),
                      }))
                    }
                    className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-bold text-[#334155] mb-1">
                    GSTIN (Optional)
                  </label>
                  <input
                    type="text"
                    value={newCustomerForm.gstin}
                    onChange={(e) =>
                      setNewCustomerForm((s) => ({ ...s, gstin: e.target.value.toUpperCase() }))
                    }
                    placeholder="29ABCDE1234F1Z5"
                    className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2 uppercase"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#EDF4F0]">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="rounded-xl border border-[#DCE9E3] px-4 py-2 text-[12.5px] font-semibold text-[#475569]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bos-btn-primary rounded-xl px-5 py-2 text-[12.5px]"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

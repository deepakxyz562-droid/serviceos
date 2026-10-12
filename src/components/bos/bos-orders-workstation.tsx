'use client';

import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Download,
  Globe,
  MessageCircle,
  Package,
  Phone,
  Plus,
  Printer,
  RotateCcw,
  Search,
  ShoppingBag,
  Store,
  Truck,
} from 'lucide-react';
import {
  type BosOrder,
  formatBosCurrency,
  getInitials,
} from '@/components/bos/bos-types';

type OrdersFilterTab =
  | 'all'
  | 'pos'
  | 'online'
  | 'whatsapp'
  | 'pending'
  | 'processing'
  | 'completed'
  | 'cancelled';

type BosOrdersWorkstationProps = {
  businessName: string;
  currencySymbol: string;
  orders: BosOrder[];
  initialSelectedOrderId?: string;
  onUpdateOrderStatus: (orderId: string, status: BosOrder['status']) => Promise<void>;
  onPrintOrderBill: (order: BosOrder) => void;
  onNavigateToPos: () => void;
};

export function BosOrdersWorkstation({
  businessName,
  currencySymbol,
  orders,
  initialSelectedOrderId,
  onUpdateOrderStatus,
  onPrintOrderBill,
  onNavigateToPos,
}: BosOrdersWorkstationProps) {
  const [activeTab, setActiveTab] = useState<OrdersFilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string>(
    initialSelectedOrderId || orders[0]?.id || '',
  );

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orders.filter((o) => {
      if (activeTab === 'pos' && o.channel !== 'pos') return false;
      if (activeTab === 'online' && o.channel !== 'online') return false;
      if (activeTab === 'whatsapp' && o.channel !== 'whatsapp') return false;
      if (activeTab === 'pending' && o.status !== 'new') return false;
      if (
        activeTab === 'processing' &&
        o.status !== 'accepted' &&
        o.status !== 'preparing' &&
        o.status !== 'ready'
      )
        return false;
      if (activeTab === 'completed' && o.status !== 'completed') return false;
      if (activeTab === 'cancelled' && o.status !== 'cancelled') return false;
      if (paymentFilter !== 'all' && o.paymentStatus !== paymentFilter) return false;

      if (!q) return true;
      return (
        o.id.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerPhone.toLowerCase().includes(q) ||
        o.items.some((i) => i.name.toLowerCase().includes(q))
      );
    });
  }, [orders, activeTab, paymentFilter, searchQuery]);

  const selectedOrder = useMemo(() => {
    return (
      orders.find((o) => o.id === selectedOrderId) ||
      filteredOrders[0] ||
      orders[0] ||
      null
    );
  }, [orders, filteredOrders, selectedOrderId]);

  const stats = useMemo(() => {
    const total = orders.length;
    const revenue = orders
      .filter((o) => o.status !== 'cancelled')
      .reduce((s, o) => s + o.totalAmount, 0);
    const completed = orders.filter((o) => o.status === 'completed').length;
    const pendingProcessing = orders.filter(
      (o) => o.status !== 'completed' && o.status !== 'cancelled',
    ).length;
    const onlineWhatsapp = orders.filter(
      (o) => o.channel === 'online' || o.channel === 'whatsapp',
    ).length;
    const cancelled = orders.filter((o) => o.status === 'cancelled').length;

    return {
      total,
      revenue,
      completed,
      pendingProcessing,
      onlineWhatsapp,
      cancelled,
    };
  }, [orders]);

  const handleShareWhatsAppInvoice = (order: BosOrder) => {
    const cleanPhone = order.customerPhone.replace(/\D/g, '');
    const itemsText = order.items
      .map((i) => `• ${i.name} × ${i.qty} = ${formatBosCurrency(i.price * i.qty, currencySymbol)}`)
      .join('\n');
    const message = `Hello ${order.customerName},\nThank you for shopping at *${businessName}*!\n\n*Order:* ${order.id}\n${itemsText}\n\n*Total:* ${formatBosCurrency(order.totalAmount, currencySymbol)}\n*Status:* ${order.status.toUpperCase()}`;
    window.open(
      `https://wa.me/${cleanPhone || '919876543210'}?text=${encodeURIComponent(message)}`,
      '_blank',
      'noopener,noreferrer',
    );
  };

  return (
    <div className="space-y-4 pb-6">
      {/* Top Tabs & Action Bar */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[#E4EFEA] bg-white p-1.5">
          {(
            [
              { id: 'all', label: `All Orders (${orders.length})` },
              { id: 'pos', label: 'POS Orders' },
              { id: 'online', label: 'Online Store' },
              { id: 'whatsapp', label: 'WhatsApp Orders' },
              { id: 'pending', label: 'Pending' },
              { id: 'processing', label: 'Processing' },
              { id: 'completed', label: 'Completed' },
              { id: 'cancelled', label: 'Cancelled' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition ${
                activeTab === t.id
                  ? 'bg-[#0A6847] text-white shadow-2xs'
                  : 'text-[#475569] hover:bg-[#F4F8F6]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onNavigateToPos}
            className="bos-btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12.5px]"
          >
            <Plus className="h-4 w-4" />
            <span>New POS Order</span>
          </button>
        </div>
      </div>

      {/* 6 KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <div className="bos-card p-3.5">
          <p className="text-[11.5px] font-medium text-[#64748B]">Total Orders</p>
          <p className="mt-1 text-[21px] font-extrabold text-[#111827]">{stats.total}</p>
          <p className="text-[11px] font-semibold text-[#0A6847]">+14.2% vs last week</p>
        </div>

        <div className="bos-card p-3.5">
          <p className="text-[11.5px] font-medium text-[#64748B]">Order Revenue</p>
          <p className="mt-1 text-[21px] font-extrabold text-[#111827]">
            {formatBosCurrency(stats.revenue, currencySymbol)}
          </p>
          <p className="text-[11px] text-[#64748B]">
            Avg: {formatBosCurrency(Math.round(stats.revenue / Math.max(1, stats.total)), currencySymbol)}
          </p>
        </div>

        <div className="bos-card p-3.5">
          <p className="text-[11.5px] font-medium text-[#64748B]">Completed</p>
          <p className="mt-1 text-[21px] font-extrabold text-[#0A6847]">{stats.completed}</p>
          <p className="text-[11px] text-[#64748B]">
            {Math.round((stats.completed / Math.max(1, stats.total)) * 100)}% completion rate
          </p>
        </div>

        <div className="bos-card p-3.5">
          <p className="text-[11.5px] font-medium text-[#64748B]">Pending / Processing</p>
          <p className="mt-1 text-[21px] font-extrabold text-amber-600">{stats.pendingProcessing}</p>
          <p className="text-[11px] text-amber-700">Needs dispatch</p>
        </div>

        <div className="bos-card p-3.5">
          <p className="text-[11.5px] font-medium text-[#64748B]">Online & WhatsApp</p>
          <p className="mt-1 text-[21px] font-extrabold text-blue-600">{stats.onlineWhatsapp}</p>
          <p className="text-[11px] text-blue-700">Digital channels</p>
        </div>

        <div className="bos-card p-3.5">
          <p className="text-[11.5px] font-medium text-[#64748B]">Cancelled / Returns</p>
          <p className="mt-1 text-[21px] font-extrabold text-red-600">{stats.cancelled}</p>
          <p className="text-[11px] text-[#64748B]">Low return rate</p>
        </div>
      </div>

      {/* Split Layout: Orders Table (8 cols) + Right Order Details Inspector (4 cols) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 items-start">
        <div className="bos-card p-4 lg:col-span-8 space-y-3.5">
          {/* Search & Filter Row */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Order ID (#ORD-1048), customer name, phone, or item..."
                className="w-full rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] py-2 pl-9 pr-3 text-[13px] text-[#111827] focus:border-[#0A6847] focus:bg-white focus:outline-hidden"
              />
            </div>

            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as typeof paymentFilter)}
              className="rounded-xl border border-[#DCE9E3] bg-white px-3 py-2 text-[12.5px] font-medium text-[#334155]"
            >
              <option value="all">Payment: All</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending / COD</option>
            </select>
          </div>

          {/* Orders Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E4EFEA] text-[10.5px] font-bold uppercase tracking-wider text-[#64748B]">
                  <th className="py-2.5 pr-2">Order ID</th>
                  <th className="py-2.5 px-2">Date & Time</th>
                  <th className="py-2.5 px-2">Customer</th>
                  <th className="py-2.5 px-2">Channel</th>
                  <th className="py-2.5 px-2">Items</th>
                  <th className="py-2.5 px-2">Amount</th>
                  <th className="py-2.5 px-2">Payment</th>
                  <th className="py-2.5 pl-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F6F3] text-[12.5px]">
                {filteredOrders.map((order) => {
                  const isSelected = selectedOrder?.id === order.id;
                  const channelBadge =
                    order.channel === 'online'
                      ? { label: 'Online Store', cls: 'bg-blue-50 text-blue-700' }
                      : order.channel === 'whatsapp'
                        ? { label: 'WhatsApp', cls: 'bg-emerald-50 text-emerald-700' }
                        : { label: 'POS Counter', cls: 'bg-[#F1F6F3] text-[#334155]' };

                  const statusBadge =
                    order.status === 'completed'
                      ? { label: 'Completed', cls: 'bg-[#E6F6F0] text-[#0A6847]' }
                      : order.status === 'cancelled'
                        ? { label: 'Cancelled', cls: 'bg-red-50 text-red-600' }
                        : order.status === 'new'
                          ? { label: 'New Order', cls: 'bg-amber-50 text-amber-700' }
                          : { label: 'Processing', cls: 'bg-blue-50 text-blue-700' };

                  return (
                    <tr
                      key={order.id}
                      onClick={() => setSelectedOrderId(order.id)}
                      className={`cursor-pointer transition ${
                        isSelected ? 'bg-[#E6F6F0]/60' : 'hover:bg-[#F8FCFA]'
                      }`}
                    >
                      <td className="py-3 pr-2 font-extrabold text-[#111827]">{order.id}</td>
                      <td className="py-3 px-2 text-[11.5px] text-[#64748B]">{order.createdAt}</td>
                      <td className="py-3 px-2">
                        <p className="font-bold text-[#111827]">{order.customerName}</p>
                        <p className="text-[11px] text-[#64748B]">{order.customerPhone}</p>
                      </td>
                      <td className="py-3 px-2">
                        <span className={`inline-flex rounded-lg px-2 py-0.5 text-[11px] font-semibold ${channelBadge.cls}`}>
                          {channelBadge.label}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-[#475569]">
                        {order.items.reduce((s, i) => s + i.qty, 0)} items
                      </td>
                      <td className="py-3 px-2 font-extrabold text-[#111827]">
                        {formatBosCurrency(order.totalAmount, currencySymbol)}
                      </td>
                      <td className="py-3 px-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase ${
                            order.paymentStatus === 'paid'
                              ? 'bg-[#E6F6F0] text-[#0A6847]'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {order.paymentMode.toUpperCase()} • {order.paymentStatus}
                        </span>
                      </td>
                      <td className="py-3 pl-2 text-right">
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

        {/* Right: Order Details Inspector */}
        {selectedOrder && (
          <div className="bos-card p-4 lg:col-span-4 space-y-4">
            <div className="flex items-center justify-between border-b border-[#EDF4F0] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-[15.5px] font-extrabold text-[#111827]">
                    Order {selectedOrder.id}
                  </h3>
                  <span className="rounded-md bg-[#E6F6F0] px-2 py-0.5 text-[10.5px] font-bold text-[#0A6847] uppercase">
                    {selectedOrder.channel}
                  </span>
                </div>
                <p className="text-[11.5px] text-[#64748B]">{selectedOrder.createdAt}</p>
              </div>
              <button
                type="button"
                onClick={() => onPrintOrderBill(selectedOrder)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE9E3] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#1E293B] hover:bg-[#F4F8F6]"
              >
                <Printer className="h-3.5 w-3.5 text-[#0A6847]" />
                <span>Print Bill</span>
              </button>
            </div>

            {/* Order Progress Stepper */}
            <div className="rounded-xl border border-[#E4EFEA] bg-[#F8FCFA] p-3">
              <div className="flex items-center justify-between text-[11px] font-bold uppercase text-[#64748B] mb-2">
                <span>Order Progress</span>
                <span className="text-[#0A6847]">{selectedOrder.status.toUpperCase()}</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 text-center text-[10.5px] font-semibold">
                {(
                  [
                    { id: 'new', label: 'Placed' },
                    { id: 'accepted', label: 'Accepted' },
                    { id: 'ready', label: 'Packed' },
                    { id: 'completed', label: 'Completed' },
                  ] as const
                ).map((step, idx) => {
                  const statusOrder = ['new', 'accepted', 'preparing', 'ready', 'completed'];
                  const currentIndex = statusOrder.indexOf(selectedOrder.status);
                  const stepIndex = statusOrder.indexOf(step.id);
                  const reached = currentIndex >= stepIndex && selectedOrder.status !== 'cancelled';

                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => void onUpdateOrderStatus(selectedOrder.id, step.id)}
                      className={`rounded-lg py-1.5 px-1 transition ${
                        reached
                          ? 'bg-[#0A6847] text-white'
                          : 'bg-white border border-[#DCE9E3] text-[#64748B]'
                      }`}
                    >
                      {idx + 1}. {step.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Customer Card */}
            <div className="rounded-xl border border-[#E4EFEA] bg-white p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E6F6F0] text-[12px] font-bold text-[#0A6847]">
                    {getInitials(selectedOrder.customerName)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-[#111827] truncate">
                      {selectedOrder.customerName}
                    </p>
                    <p className="text-[11.5px] text-[#64748B]">{selectedOrder.customerPhone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <a
                    href={`tel:${selectedOrder.customerPhone}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-[#DCE9E3] px-2.5 py-1 text-[11px] font-semibold text-[#334155] hover:bg-[#F4F8F6]"
                  >
                    <Phone className="h-3 w-3 text-[#0A6847]" />
                    <span>Call</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => handleShareWhatsAppInvoice(selectedOrder)}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#E6F6F0] px-2.5 py-1 text-[11px] font-semibold text-[#0A6847]"
                  >
                    <MessageCircle className="h-3 w-3" />
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>
              {selectedOrder.customerAddress && (
                <p className="text-[11.5px] text-[#64748B] border-t border-[#EDF4F0] pt-2">
                  📍 {selectedOrder.customerAddress}
                </p>
              )}
            </div>

            {/* Items Ordered */}
            <div className="rounded-xl border border-[#E4EFEA] bg-white p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-2">
                Items Ordered ({selectedOrder.items.length})
              </p>
              <div className="divide-y divide-[#F1F6F3] text-[12.5px]">
                {selectedOrder.items.map((item, idx) => (
                  <div key={`${item.name}-${idx}`} className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-semibold text-[#111827]">{item.name}</p>
                      <p className="text-[11px] text-[#64748B]">
                        {formatBosCurrency(item.price, currencySymbol)} × {item.qty}
                      </p>
                    </div>
                    <span className="font-bold text-[#111827]">
                      {formatBosCurrency(item.price * item.qty, currencySymbol)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Summary */}
            <div className="rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] p-3 space-y-1.5 text-[12.5px]">
              <div className="flex justify-between text-[#475569]">
                <span>Item Total</span>
                <span className="font-semibold text-[#111827]">
                  {formatBosCurrency(selectedOrder.subtotalAmount || selectedOrder.totalAmount, currencySymbol)}
                </span>
              </div>
              {selectedOrder.discountAmount ? (
                <div className="flex justify-between text-[#0A6847]">
                  <span>Discount</span>
                  <span>-{formatBosCurrency(selectedOrder.discountAmount, currencySymbol)}</span>
                </div>
              ) : null}
              <div className="border-t border-[#DCE9E3] pt-2 flex items-baseline justify-between">
                <span className="font-bold text-[#111827]">Total Amount</span>
                <span className="text-[18px] font-extrabold text-[#0A6847]">
                  {formatBosCurrency(selectedOrder.totalAmount, currencySymbol)}
                </span>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleShareWhatsAppInvoice(selectedOrder)}
                className="rounded-xl border border-[#DCE9E3] bg-white py-2.5 px-3 text-[12px] font-semibold text-[#0A6847] hover:bg-[#E6F6F0]/50"
              >
                Send on WhatsApp
              </button>
              <button
                type="button"
                onClick={() =>
                  void onUpdateOrderStatus(
                    selectedOrder.id,
                    selectedOrder.status === 'completed' ? 'accepted' : 'completed',
                  )
                }
                className="bos-btn-primary rounded-xl py-2.5 px-3 text-[12.5px]"
              >
                {selectedOrder.status === 'completed' ? 'Reopen Order' : 'Mark as Completed'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

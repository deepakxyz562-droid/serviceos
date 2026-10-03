'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/features/quote-flow/store/app';
import { api, apiPatch } from '@/features/quote-flow/lib/api';
import {
  ArrowLeft,
  Package,
  TrendingUp,
  Users,
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
} from 'lucide-react';
import { formatCurrency } from '@/lib/quote-flow-calc';

export default function CommerceDashboard() {
  const closeModal = useAppStore((s) => s.closeModal);
  const openModal = useAppStore((s) => s.openModal);
  const business = useAppStore((s) => s.business);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Selected order modal state
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null);
  const [orderModalLoading, setOrderModalLoading] = useState(false);
  const [updatingOrder, setUpdatingOrder] = useState(false);
  const [showConversation, setShowConversation] = useState(false);

  useEffect(() => {
    api<{ overview: any; recentOrders: any[] }>('/api/commerce/dashboard')
      .then((r) => setData(r))
      .catch(() => {})
      .finally(() => setLoading(false));

    const handler = () => {
      api<{ overview: any; recentOrders: any[] }>('/api/commerce/dashboard')
        .then((r) => setData(r));
    };
    window.addEventListener('commerce-order-changed', handler);
    return () => window.removeEventListener('commerce-order-changed', handler);
  }, []);

  async function openOrderDetail(orderId: string) {
    setOrderModalLoading(true);
    setSelectedOrder(null);
    setSelectedConversation(null);
    setShowConversation(false);
    try {
      const r = await api<{ order: any; conversation: any }>(`/api/commerce/orders/${orderId}`);
      setSelectedOrder(r.order);
      setSelectedConversation(r.conversation);
    } catch (e: any) {
      alert(e.message || "Failed to load order details");
    } finally {
      setOrderModalLoading(false);
    }
  }

  async function updateOrderStatus(orderId: string, status: string) {
    setUpdatingOrder(true);
    try {
      await apiPatch(`/api/commerce/orders/${orderId}`, { status });
      setSelectedOrder((prev: any) => prev ? { ...prev, status } : prev);
      const r = await api<{ overview: any; recentOrders: any[] }>('/api/commerce/dashboard');
      setData(r);
    } catch (e: any) {
      alert(e.message || "Failed to update order status");
    } finally {
      setUpdatingOrder(false);
    }
  }

  async function markOrderPaid(orderId: string) {
    setUpdatingOrder(true);
    try {
      await apiPatch(`/api/commerce/orders/${orderId}`, { paymentStatus: 'PAID' });
      setSelectedOrder((prev: any) => prev ? { ...prev, paymentStatus: 'PAID' } : prev);
      const r = await api<{ overview: any; recentOrders: any[] }>('/api/commerce/dashboard');
      setData(r);
    } catch (e: any) {
      alert(e.message || "Failed to mark order as paid");
    } finally {
      setUpdatingOrder(false);
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-stone-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-stone-300 border-t-blue-600" />
      </div>
    );
  }

  const { overview, recentOrders } = data || { overview: {}, recentOrders: [] };
  const currency = business?.currency;
  const symbol = business?.currencySymbol;

  return (
    <div className="fixed inset-0 z-40 bg-stone-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-stone-200 bg-white/95 px-4 py-3 backdrop-blur">
        <button onClick={closeModal} className="text-stone-600 hover:text-stone-900">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-base font-semibold text-stone-900">Commerce Dashboard</h2>
        <button
          onClick={() => {
            window.location.href = '/gptform/commerce/settings';
          }}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
        >
          Settings
        </button>
      </div>

      <div className="mx-auto max-w-md px-5 py-4 pb-24 space-y-4">
        {/* Overview cards */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<ShoppingCart className="size-4" />}
            label="Today's Orders"
            value={overview.todaysOrders || 0}
            color="blue"
          />
          <StatCard
            icon={<IndianRupee className="size-4" />}
            label="Today's Revenue"
            value={formatCurrency(overview.todaysRevenue || 0, currency, symbol)}
            color="emerald"
          />
          <StatCard
            icon={<Clock className="size-4" />}
            label="Pending Payment"
            value={overview.pendingPayment || 0}
            color="amber"
          />
          <StatCard
            icon={<Users className="size-4" />}
            label="Total Customers"
            value={overview.totalCustomers || 0}
            color="purple"
          />
        </div>

        {/* Recent Orders */}
        <div>
          <h3 className="mb-2 text-xs font-bold uppercase text-stone-400">Recent Orders</h3>
          {recentOrders.length === 0 ? (
            <div className="flex flex-col items-center py-12">
              <Package className="size-12 text-stone-300 mb-3" />
              <p className="text-sm text-stone-500">No orders yet. Your WhatsApp orders will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentOrders.map((order: any) => (
                <div
                  key={order.id}
                  onClick={() => openOrderDetail(order.id)}
                  className="cursor-pointer rounded-xl bg-white p-3 shadow-2xs border border-stone-200/80 hover:border-blue-300 transition"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-stone-900">
                          #{order.id.slice(-6).toUpperCase()}
                        </span>
                        <StatusBadge status={order.status} />
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {order.customerName || order.customerPhone}
                        {' · '}
                        {(order.items || []).map((i: any) => `${i.name} ×${i.qty}`).join(', ')}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-stone-900">
                        {formatCurrency(order.total, currency, symbol)}
                      </div>
                      <PaymentBadge status={order.paymentStatus} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Order Detail Modal */}
      {(selectedOrder || orderModalLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
            {orderModalLoading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : selectedOrder ? (
              <div className="p-6">
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-stone-900">
                      Order #{selectedOrder.id.slice(-6).toUpperCase()}
                    </h3>
                    <p className="text-xs text-stone-500">
                      {new Date(selectedOrder.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={selectedOrder.status} />
                    <button
                      onClick={() => setSelectedOrder(null)}
                      className="rounded-full p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Customer Details */}
                <div className="mt-4 rounded-xl bg-stone-50 p-3.5 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-stone-700">Customer:</span>
                    <span className="font-bold text-stone-900">
                      {selectedOrder.customerName || "Customer"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-stone-700">WhatsApp Phone:</span>
                    <a
                      href={`https://wa.me/${selectedOrder.customerPhone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:underline"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      +{selectedOrder.customerPhone}
                    </a>
                  </div>
                  {selectedOrder.deliveryAddress && (
                    <div className="flex items-start justify-between pt-1 border-t border-stone-200/60">
                      <span className="font-semibold text-stone-700 flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-stone-400" /> Delivery:
                      </span>
                      <span className="text-right text-stone-900 max-w-[220px]">
                        {selectedOrder.deliveryAddress}
                      </span>
                    </div>
                  )}
                  {selectedOrder.deliveryDate && (
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-stone-700 flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-stone-400" /> Slot/Date:
                      </span>
                      <span className="text-stone-900">{selectedOrder.deliveryDate}</span>
                    </div>
                  )}
                  {selectedOrder.notes && (
                    <div className="flex items-start justify-between">
                      <span className="font-semibold text-stone-700 flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5 text-stone-400" /> Notes:
                      </span>
                      <span className="text-stone-900 text-right">{selectedOrder.notes}</span>
                    </div>
                  )}
                </div>

                {/* Items Breakdown */}
                <div className="mt-4">
                  <h4 className="mb-2 text-xs font-bold uppercase text-stone-500">Ordered Items</h4>
                  <div className="rounded-xl border border-stone-200 overflow-hidden text-xs">
                    <div className="bg-stone-100 px-3 py-2 font-bold text-stone-700 flex justify-between">
                      <span>Item</span>
                      <span>Amount</span>
                    </div>
                    {(selectedOrder.items || []).map((it: any, i: number) => (
                      <div key={i} className="flex items-center justify-between border-b border-stone-100 px-3 py-2">
                        <div>
                          <span className="font-semibold text-stone-900">{it.name}</span>
                          <span className="text-stone-500 ml-1.5">× {it.qty}</span>
                        </div>
                        <span className="font-bold text-stone-900">
                          {formatCurrency(it.amount || (it.price * it.qty), currency, symbol)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between bg-stone-50 px-3 py-2.5 font-black text-stone-900 text-sm">
                      <span>Total</span>
                      <span>{formatCurrency(selectedOrder.total, currency, symbol)}</span>
                    </div>
                  </div>
                </div>

                {/* Status & Actions */}
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-stone-700">Status:</span>
                      <select
                        value={selectedOrder.status}
                        disabled={updatingOrder}
                        onChange={(e) => updateOrderStatus(selectedOrder.id, e.target.value)}
                        className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="CONFIRMED">CONFIRMED</option>
                        <option value="PREPARING">PREPARING</option>
                        <option value="READY">READY</option>
                        <option value="DELIVERED">DELIVERED</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </div>

                    {selectedOrder.paymentStatus !== "PAID" ? (
                      <button
                        onClick={() => markOrderPaid(selectedOrder.id)}
                        disabled={updatingOrder}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        ✓ Mark as Paid
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Paid
                      </span>
                    )}
                  </div>

                  {/* Toggle Conversation Transcript */}
                  {selectedConversation?.messages?.length > 0 && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setShowConversation(!showConversation)}
                        className="w-full text-center text-xs font-semibold text-blue-600 hover:text-blue-800 py-1"
                      >
                        {showConversation ? "Hide WhatsApp Chat" : `View WhatsApp Chat (${selectedConversation.messages.length} messages) ↓`}
                      </button>

                      {showConversation && (
                        <div className="mt-2 max-h-48 overflow-y-auto rounded-xl bg-stone-100 p-3 space-y-2 text-xs">
                          {selectedConversation.messages.map((m: any, i: number) => (
                            <div
                              key={i}
                              className={`flex flex-col ${
                                m.direction === "inbound" ? "items-start" : "items-end"
                              }`}
                            >
                              <div
                                className={`rounded-xl px-3 py-1.5 max-w-[85%] ${
                                  m.direction === "inbound"
                                    ? "bg-white text-stone-900 border border-stone-200"
                                    : "bg-emerald-600 text-white"
                                }`}
                              >
                                {m.text}
                              </div>
                              <span className="text-[9px] text-stone-400 mt-0.5 px-1">
                                {m.direction === "inbound" ? "Customer" : "Bot"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: any; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
  };
  return (
    <div className={`rounded-xl border p-3 ${colors[color]}`}>
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[10px] font-bold uppercase">{label}</span>
      </div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700',
    CONFIRMED: 'bg-blue-100 text-blue-700',
    PAID: 'bg-emerald-100 text-emerald-700',
    PREPARING: 'bg-purple-100 text-purple-700',
    READY: 'bg-cyan-100 text-cyan-700',
    DELIVERED: 'bg-stone-100 text-stone-600',
    CANCELLED: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold capitalize ${colors[status] || 'bg-stone-100 text-stone-600'}`}>
      {status.toLowerCase()}
    </span>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    UNPAID: 'text-amber-600',
    PAID: 'text-emerald-600',
    PARTIAL: 'text-amber-600',
    REFUNDED: 'text-red-600',
  };
  return (
    <span className={`text-[10px] font-semibold ${colors[status] || 'text-stone-400'}`}>
      {status.toLowerCase()}
    </span>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/features/quote-flow/store/app';
import { api } from '@/features/quote-flow/lib/api';
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
} from 'lucide-react';
import { formatCurrency } from '@/lib/quote-flow-calc';

export default function CommerceDashboard() {
  const closeModal = useAppStore((s) => s.closeModal);
  const openModal = useAppStore((s) => s.openModal);
  const business = useAppStore((s) => s.business);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
            // Navigate to commerce settings (catalog editor)
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
                  onClick={() => openModal({ type: 'commerce-order-detail' as any, orderId: order.id } as any)}
                  className="cursor-pointer rounded-xl bg-white p-3 shadow-2xs border border-stone-200/80"
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

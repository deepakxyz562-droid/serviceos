'use client';

import React, { useEffect, useState } from 'react';
import {
  Bot,
  Building2,
  Check,
  CheckCircle2,
  CreditCard,
  Crown,
  ExternalLink,
  FileText,
  Gift,
  Globe,
  Megaphone,
  MessageCircle,
  Package,
  Percent,
  Plug,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Store,
  Tag,
  Truck,
  Users,
  Wallet,
} from 'lucide-react';
import {
  type BosCoupon,
  type BosCustomer,
  type BosOrder,
  type BosProductItem,
  type BosStoreSettings,
  formatBosCurrency,
} from '@/components/bos/bos-types';

type BosMarketingAiIntegrationsSettingsProps = {
  mode: 'marketing' | 'aiAssistant' | 'integrations' | 'settings';
  storeSettings: BosStoreSettings;
  products: BosProductItem[];
  orders: BosOrder[];
  customers: BosCustomer[];
  coupons: BosCoupon[];
  initialAiPrompt?: string;
  onUpdateStoreSettings: (patch: Partial<BosStoreSettings>) => Promise<void>;
  onAddCoupon: (coupon: Omit<BosCoupon, 'id'>) => Promise<void>;
  onToggleCoupon: (id: string) => void;
  onOpenPrinterModal?: () => void;
  onOpenUpgradeModal?: () => void;
};

export function BosMarketingAiIntegrationsSettings({
  mode,
  storeSettings,
  products,
  orders,
  customers,
  coupons,
  initialAiPrompt,
  onUpdateStoreSettings,
  onAddCoupon,
  onToggleCoupon,
  onOpenPrinterModal,
  onOpenUpgradeModal,
}: BosMarketingAiIntegrationsSettingsProps) {
  const currencySymbol = storeSettings.currencySymbol || '₹';
  const [toast, setToast] = useState<string | null>(null);

  /* Marketing state */
  const [marketingTab, setMarketingTab] = useState<
    'overview' | 'whatsapp' | 'coupons' | 'loyalty' | 'templates'
  >('overview');
  const [campaignTitle, setCampaignTitle] = useState('Weekend Super Saver — Flat 15% OFF');
  const [campaignAudience, setCampaignAudience] = useState('All Active Customers (684)');
  const [campaignCoupon, setCampaignCoupon] = useState('WEEKEND15 (15% OFF)');
  const [campaignText, setCampaignText] = useState(
    `Hi {{customer_name}}! 🎉 Weekend Super Saver is LIVE at ${storeSettings.businessName}. Get Flat 15% OFF on Groceries & Personal Care. Use code: WEEKEND15.`,
  );
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponValue, setNewCouponValue] = useState(15);
  const [newCouponMinOrder, setNewCouponMinOrder] = useState(499);

  /* AI Assistant state */
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessages, setAiMessages] = useState<
    Array<{ id: string; role: 'assistant' | 'user'; text: string; time: string }>
  >([
    {
      id: 'ai-welcome',
      role: 'assistant',
      text: `Namaste! I'm your **BOS AI Business Copilot** for **${storeSettings.businessName}**.\n\nHere is a quick snapshot of your store right now:\n• **Catalog:** ${products.length} products (${products.filter((p) => p.stockQuantity <= 5).length} low stock alerts)\n• **Recent Orders:** ${orders.length} active orders\n• **Khata Receivables:** ${formatBosCurrency(customers.filter((c) => c.khataBalance > 0).reduce((s, c) => s + c.khataBalance, 0), currencySymbol)} across ${customers.filter((c) => c.khataBalance > 0).length} customers\n\nAsk me anything or click a quick business action below!`,
      time: 'Just now',
    },
  ]);

  /* Integrations state */
  const [integrationCategory, setIntegrationCategory] = useState('All Integrations');
  const [selectedIntegrationId, setSelectedIntegrationId] = useState('razorpay');
  const [connectedIds, setConnectedIds] = useState<Record<string, boolean>>({
    razorpay: true,
    whatsapp: true,
    tally: true,
    printer: true,
    phonepe: false,
    porter: false,
    ondc: false,
    zoho: false,
  });

  /* Settings state */
  const [settingsSection, setSettingsSection] = useState<
    'profile' | 'pos' | 'gst' | 'payments' | 'staff' | 'plan'
  >('profile');

  const generateSmartAiReply = (prompt: string): string => {
    const lower = prompt.toLowerCase();
    const lowStock = products.filter((p) => p.stockQuantity <= (p.lowStockThreshold || 5));
    const dueCustomers = customers.filter((c) => c.khataBalance > 0);
    const totalReceivable = dueCustomers.reduce((s, c) => s + c.khataBalance, 0);

    if (lower.includes('low stock') || lower.includes('reorder')) {
      const list = lowStock
        .map((p) => `• **${p.name}** (${p.sku}): Only **${p.stockQuantity}** left — Reorder 30 units`)
        .join('\n');
      return `📦 **Low Stock Reorder Analysis:**\nYou currently have **${lowStock.length} items** below safety threshold:\n${list || '• All items are adequately stocked.'}\n\n💡 *Recommendation:* Place a consolidated Purchase Order with Metro Cash & Carry before 5 PM today to avoid weekend stockouts.`;
    }
    if (lower.includes('whatsapp') || lower.includes('promo') || lower.includes('weekend')) {
      return `💬 **Ready-to-Send Weekend WhatsApp Promo:**\n\n"Namaste! 🛍️ **${storeSettings.businessName}** Weekend Mega Sale is LIVE! Get **Flat 15% OFF** on Basmati Rice, Cooking Oil & Daily Essentials on orders above ${currencySymbol}499. Use code **WEEKEND15** or order online at https://bos.store/${storeSettings.businessSlug} — Free home delivery in 30 mins!"`;
    }
    if (lower.includes('dues') || lower.includes('khata') || lower.includes('reminder')) {
      const topDues = dueCustomers
        .slice(0, 4)
        .map((c) => `• **${c.name}** (${c.phone}): **${formatBosCurrency(c.khataBalance, currencySymbol)}**`)
        .join('\n');
      return `🧾 **Khata Receivables Summary:**\nTotal pending receivable ("You'll Get") is **${formatBosCurrency(totalReceivable, currencySymbol)}** across **${dueCustomers.length} customers**:\n${topDues}\n\nYou can send 1-click polite UPI payment links from the **Khata / Credit** tab.`;
    }
    if (lower.includes('profit') || lower.includes('margin')) {
      return `💰 **Weekly Profit & Margin Breakdown:**\n• **Weekly Revenue:** ${currencySymbol}1,84,500 (+18.4% vs last week)\n• **Gross Margin:** 29.6% (${currencySymbol}58,200 Net Profit)\n• **Highest Margin Category:** Personal Care & Organic Groceries (34% margin)\n• **Tip:** Bundling Tata Tea Gold with Biscuits at POS can lift average basket value from ${currencySymbol}376 to ${currencySymbol}440.`;
    }
    return `📈 **Tomorrow's Demand Forecast & Store Insights:**\nBased on your recent POS & Online Store velocity:\n1. **Aashirvaad Whole Wheat Atta 5kg** — Projected demand: **18 packs** (Stock: ${products[0]?.stockQuantity ?? 42})\n2. **Amul Taaza Toned Milk 1L** — Projected demand: **32 cartons**\n3. **Tata Tea Gold 500g** — Projected demand: **14 packs**\n\nPeak billing hours tomorrow are expected between **10:30 AM – 1:00 PM** and **6:30 PM – 9:00 PM**.`;
  };

  const handleSendAiMessage = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || aiLoading) return;
    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user' as const,
      text: trimmed,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setAiMessages((prev) => [...prev, userMsg]);
    setAiInput('');
    setAiLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          context: {
            businessName: storeSettings.businessName,
            productsCount: products.length,
            ordersCount: orders.length,
          },
        }),
      });
      const json = await res.json().catch(() => null);
      const reply =
        (json && (json.reply || json.message || json.content)) ||
        generateSmartAiReply(trimmed);

      setAiMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          text: String(reply),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch {
      setAiMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          text: generateSmartAiReply(trimmed),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    if (mode === 'aiAssistant' && initialAiPrompt) {
      void handleSendAiMessage(initialAiPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, initialAiPrompt]);

  /* 1. MARKETING MODE */
  if (mode === 'marketing') {
    return (
      <div className="space-y-4 pb-6">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[#E4EFEA] bg-white p-1.5">
            {(
              [
                { id: 'overview', label: 'Overview' },
                { id: 'whatsapp', label: 'WhatsApp Campaigns' },
                { id: 'coupons', label: `Coupons & Offers (${coupons.length})` },
                { id: 'loyalty', label: 'Loyalty & Cashback' },
                { id: 'templates', label: 'Festival Templates' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setMarketingTab(t.id)}
                className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition ${
                  marketingTab === t.id
                    ? 'bg-[#0A6847] text-white shadow-2xs'
                    : 'text-[#475569] hover:bg-[#F4F8F6]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              setToast(`Launched WhatsApp Campaign "${campaignTitle}" to ${campaignAudience}!`);
              setTimeout(() => setToast(null), 3500);
            }}
            className="bos-btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12.5px]"
          >
            <Send className="h-4 w-4" />
            <span>Launch WhatsApp Broadcast</span>
          </button>
        </div>

        {toast && (
          <div className="flex items-center justify-between rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-2.5 text-[13px] font-medium text-[#065F46]">
            <span>{toast}</span>
            <button type="button" onClick={() => setToast(null)} className="text-xs underline">
              Dismiss
            </button>
          </div>
        )}

        {/* 5 Marketing KPI Cards */}
        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-5">
          <div className="bos-card p-3.5">
            <p className="text-[11.5px] font-medium text-[#64748B]">Campaign Revenue</p>
            <p className="mt-1 text-[21px] font-extrabold text-[#111827]">
              {formatBosCurrency(84600, currencySymbol)}
            </p>
            <p className="text-[11px] font-semibold text-[#0A6847]">+28.4% ROI: 14.2x</p>
          </div>

          <div className="bos-card p-3.5">
            <p className="text-[11.5px] font-medium text-[#64748B]">Messages Sent</p>
            <p className="mt-1 text-[21px] font-extrabold text-[#111827]">4,820</p>
            <p className="text-[11px] text-[#0A6847]">82.4% Read Rate on WhatsApp</p>
          </div>

          <div className="bos-card p-3.5">
            <p className="text-[11.5px] font-medium text-[#64748B]">Coupon Redemptions</p>
            <p className="mt-1 text-[21px] font-extrabold text-[#111827]">318</p>
            <p className="text-[11px] text-[#64748B]">{coupons.length} Active Promo Codes</p>
          </div>

          <div className="bos-card p-3.5">
            <p className="text-[11.5px] font-medium text-[#64748B]">Customer Retention</p>
            <p className="mt-1 text-[21px] font-extrabold text-[#0A6847]">68.5%</p>
            <p className="text-[11px] text-[#64748B]">412 Loyalty Members</p>
          </div>

          <div className="bos-card p-3.5 col-span-2 lg:col-span-1">
            <p className="text-[11.5px] font-medium text-[#64748B]">WhatsApp Credits</p>
            <p className="mt-1 text-[21px] font-extrabold text-purple-700">2,450</p>
            <p className="text-[11px] text-[#0A6847] font-semibold">Official WABA Verified</p>
          </div>
        </div>

        {/* Main Split Layout: Active Campaigns & Coupons (8 cols) + Quick WhatsApp Builder (4 cols) */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 items-start">
          <div className="lg:col-span-8 space-y-4">
            {/* Active Campaigns Table */}
            <div className="bos-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[14.5px] font-bold text-[#111827]">
                  Active Campaigns & Promotions
                </h3>
                <span className="rounded-full bg-[#E6F6F0] px-2.5 py-0.5 text-[11px] font-bold text-[#0A6847]">
                  4 Active
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[12.5px]">
                  <thead>
                    <tr className="border-b border-[#E4EFEA] text-[10.5px] font-bold uppercase text-[#64748B]">
                      <th className="py-2">Campaign Name</th>
                      <th className="py-2">Channel</th>
                      <th className="py-2">Audience</th>
                      <th className="py-2">Reach / Open</th>
                      <th className="py-2">Orders</th>
                      <th className="py-2">Revenue</th>
                      <th className="py-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F6F3]">
                    {[
                      {
                        name: 'Weekend Grocery Mega Sale (15% OFF)',
                        channel: 'WhatsApp',
                        audience: 'All Active (684)',
                        reach: '91% Read',
                        orders: 64,
                        revenue: 34800,
                        status: 'Active',
                      },
                      {
                        name: 'Win-Back Inactive Buyers (₹100 Cashback)',
                        channel: 'WhatsApp + SMS',
                        audience: 'Inactive 30d (180)',
                        reach: '78% Read',
                        orders: 28,
                        revenue: 16400,
                        status: 'Active',
                      },
                      {
                        name: 'VIP Loyalty Double Points Week',
                        channel: 'VIP Club',
                        audience: 'VIP Tier (128)',
                        reach: '86% Read',
                        orders: 42,
                        revenue: 24900,
                        status: 'Active',
                      },
                    ].map((c) => (
                      <tr key={c.name} className="hover:bg-[#F8FCFA]">
                        <td className="py-3 font-bold text-[#111827]">{c.name}</td>
                        <td className="py-3">
                          <span className="rounded-md bg-[#E6F6F0] px-2 py-0.5 text-[11px] font-semibold text-[#0A6847]">
                            {c.channel}
                          </span>
                        </td>
                        <td className="py-3 text-[#475569]">{c.audience}</td>
                        <td className="py-3 font-semibold text-[#0A6847]">{c.reach}</td>
                        <td className="py-3 font-bold">{c.orders}</td>
                        <td className="py-3 font-extrabold text-[#0A6847]">
                          {formatBosCurrency(c.revenue, currencySymbol)}
                        </td>
                        <td className="py-3 text-right">
                          <span className="rounded-full bg-[#E6F6F0] px-2.5 py-0.5 text-[11px] font-bold text-[#0A6847]">
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Active Discount Coupons */}
            <div className="bos-card p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-[14.5px] font-bold text-[#111827]">
                    Active Discount Coupons (POS & Online Store)
                  </h3>
                  <p className="text-[11.5px] text-[#64748B]">
                    Coupons work automatically at your POS billing counter and Online Storefront.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {coupons.map((cp) => (
                  <div
                    key={cp.id}
                    className="rounded-xl border border-dashed border-[#0A6847]/40 bg-[#F8FCFA] p-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="rounded-lg bg-[#0A6847] px-2.5 py-0.5 font-mono text-[12px] font-extrabold text-white">
                          {cp.code}
                        </span>
                        <input
                          type="checkbox"
                          checked={cp.active}
                          onChange={() => onToggleCoupon(cp.id)}
                          className="h-4 w-4 accent-[#0A6847]"
                        />
                      </div>
                      <p className="mt-2 text-[13.5px] font-extrabold text-[#111827]">
                        {cp.type === 'percentage'
                          ? `${cp.value}% OFF`
                          : `${formatBosCurrency(cp.value, currencySymbol)} Flat OFF`}
                      </p>
                      <p className="text-[11px] text-[#64748B]">
                        Min Order: {formatBosCurrency(cp.minOrder, currencySymbol)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Create Coupon Bar */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#EDF4F0] text-[12px]">
                <input
                  type="text"
                  value={newCouponCode}
                  onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                  placeholder="NEWCODE (e.g. SAVE20)"
                  className="rounded-xl border border-[#DCE9E3] px-3 py-1.5 font-mono font-bold uppercase"
                />
                <input
                  type="number"
                  value={newCouponValue}
                  onChange={(e) => setNewCouponValue(Number(e.target.value) || 10)}
                  placeholder="Discount %"
                  className="w-24 rounded-xl border border-[#DCE9E3] px-3 py-1.5 font-bold"
                />
                <input
                  type="number"
                  value={newCouponMinOrder}
                  onChange={(e) => setNewCouponMinOrder(Number(e.target.value) || 299)}
                  placeholder="Min Order"
                  className="w-28 rounded-xl border border-[#DCE9E3] px-3 py-1.5"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newCouponCode.trim()) return;
                    void onAddCoupon({
                      code: newCouponCode.trim(),
                      type: 'percentage',
                      value: newCouponValue,
                      minOrder: newCouponMinOrder,
                      active: true,
                    });
                    setNewCouponCode('');
                  }}
                  className="bos-btn-primary rounded-xl px-3.5 py-1.5 font-semibold"
                >
                  + Add Coupon
                </button>
              </div>
            </div>
          </div>

          {/* Right: Quick WhatsApp Campaign Builder with Live Preview */}
          <div className="bos-card p-4 lg:col-span-4 space-y-3.5">
            <div className="flex items-center justify-between border-b border-[#EDF4F0] pb-2.5">
              <h3 className="text-[14.5px] font-bold text-[#111827]">
                Quick WhatsApp Campaign
              </h3>
              <span className="rounded-md bg-[#E6F6F0] px-2 py-0.5 text-[10.5px] font-bold text-[#0A6847]">
                ✨ AI Assisted
              </span>
            </div>

            <div className="space-y-2.5 text-[12px]">
              <div>
                <label className="block text-[10.5px] font-bold uppercase text-[#64748B] mb-1">
                  Campaign Title
                </label>
                <input
                  type="text"
                  value={campaignTitle}
                  onChange={(e) => setCampaignTitle(e.target.value)}
                  className="w-full rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] px-3 py-1.5 font-semibold text-[#111827]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10.5px] font-bold uppercase text-[#64748B] mb-1">
                    Target Audience
                  </label>
                  <select
                    value={campaignAudience}
                    onChange={(e) => setCampaignAudience(e.target.value)}
                    className="w-full rounded-xl border border-[#DCE9E3] bg-white px-2.5 py-1.5 font-medium"
                  >
                    <option>All Active Customers (684)</option>
                    <option>VIP Customers (128)</option>
                    <option>Inactive 30 Days (180)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold uppercase text-[#64748B] mb-1">
                    Attach Coupon
                  </label>
                  <select
                    value={campaignCoupon}
                    onChange={(e) => setCampaignCoupon(e.target.value)}
                    className="w-full rounded-xl border border-[#DCE9E3] bg-white px-2.5 py-1.5 font-medium"
                  >
                    <option>WEEKEND15 (15% OFF)</option>
                    <option>WELCOME100 (₹100 OFF)</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10.5px] font-bold uppercase text-[#64748B]">
                    Message Content
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setCampaignText(
                        `Namaste {{customer_name}}! 🌟 Special Weekend Offer at ${storeSettings.businessName}: Get Flat 15% OFF + Free Home Delivery in 30 mins! Use code WEEKEND15 at checkout.`,
                      )
                    }
                    className="text-[11px] font-bold text-[#0A6847] hover:underline"
                  >
                    ✨ Rewrite with BOS AI
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={campaignText}
                  onChange={(e) => setCampaignText(e.target.value)}
                  className="w-full rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] p-2.5 text-[12px] text-[#111827]"
                />
              </div>
            </div>

            {/* Live WhatsApp Bubble Preview */}
            <div className="rounded-xl bg-[#ECE5DD] p-3">
              <p className="text-[10px] font-bold uppercase text-[#54656F] mb-1.5">
                Live WhatsApp Preview
              </p>
              <div className="rounded-xl bg-[#DCF8C6] p-3 text-[12px] text-[#111B21] shadow-2xs space-y-2">
                <p className="leading-relaxed">{campaignText}</p>
                <div className="border-t border-black/10 pt-1.5 text-center font-bold text-[#00A884]">
                  🛍️ Order Now on Online Store
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setToast(`Sent WhatsApp campaign "${campaignTitle}" to ${campaignAudience}!`);
                setTimeout(() => setToast(null), 3500);
              }}
              className="w-full bos-btn-primary rounded-xl py-2.5 text-[13px]"
            >
              Launch Campaign →
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* 2. AI ASSISTANT MODE */
  if (mode === 'aiAssistant') {
    const quickChips = [
      "Predict tomorrow's top-selling items",
      'Show low stock items to reorder',
      'Draft a WhatsApp promo for weekend sale',
      "Analyze this week's profit margins",
      'Send payment reminders for pending dues',
    ];

    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 pb-6">
        <div className="bos-card p-5 lg:col-span-8 flex flex-col justify-between min-h-[580px]">
          <div className="flex items-center justify-between border-b border-[#EDF4F0] pb-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0A6847] text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[16px] font-bold text-[#111827]">
                    BOS AI Business Copilot
                  </h2>
                  <span className="rounded-full bg-[#E6F6F0] px-2.5 py-0.5 text-[10.5px] font-bold text-[#0A6847]">
                    Live Store Context
                  </span>
                </div>
                <p className="text-[12px] text-[#64748B]">
                  Connected to your POS sales, inventory, Khata ledger, and GST reports.
                </p>
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="my-4 flex-1 space-y-3 overflow-y-auto max-h-[420px] pr-1">
            {aiMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13px] whitespace-pre-line leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#0A6847] text-white'
                      : 'border border-[#E4EFEA] bg-[#F8FCFA] text-[#1E293B]'
                  }`}
                >
                  <div>{msg.text}</div>
                  <div
                    className={`mt-1 text-[10px] ${
                      msg.role === 'user' ? 'text-white/75' : 'text-[#94A3B8]'
                    }`}
                  >
                    {msg.time}
                  </div>
                </div>
              </div>
            ))}
            {aiLoading && (
              <div className="text-[12.5px] text-[#0A6847] font-semibold animate-pulse">
                ✨ BOS AI is analyzing your store data...
              </div>
            )}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSendAiMessage(aiInput);
            }}
            className="flex gap-2 pt-3 border-t border-[#EDF4F0]"
          >
            <input
              type="text"
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder="Ask BOS AI about sales, low stock, Khata dues, GST, or marketing..."
              className="flex-1 rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] px-4 py-2.5 text-[13px] text-[#111827] focus:border-[#0A6847] focus:bg-white focus:outline-hidden"
            />
            <button
              type="submit"
              disabled={aiLoading}
              className="bos-btn-primary inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-[13px]"
            >
              <Send className="h-4 w-4" />
              <span>Ask AI</span>
            </button>
          </form>
        </div>

        {/* Right: Quick AI Prompts & Store Context */}
        <div className="bos-card p-5 lg:col-span-4 space-y-4">
          <h3 className="text-[14.5px] font-bold text-[#111827]">
            One-Click Business Prompts
          </h3>
          <div className="space-y-2">
            {quickChips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => void handleSendAiMessage(chip)}
                className="w-full rounded-xl border border-[#E4EFEA] bg-[#F8FCFA] p-3 text-left text-[12.5px] font-semibold text-[#1E293B] hover:border-[#0A6847] hover:bg-[#E6F6F0]/50 transition"
              >
                ✨ {chip}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* 3. INTEGRATIONS MODE */
  if (mode === 'integrations') {
    const integrationsList = [
      {
        id: 'razorpay',
        name: 'Razorpay & Dynamic UPI QR',
        category: 'Payments & UPI',
        desc: 'Auto-generate dynamic bill QR codes on POS screen & thermal receipts with instant voice confirmation.',
        meta: 'UPI ID: sharmastore@okhdfcbank',
      },
      {
        id: 'whatsapp',
        name: 'WhatsApp Business API',
        category: 'WhatsApp & Marketing',
        desc: 'Automatically send digital GST bills, Khata payment links, and promotional broadcasts on WhatsApp.',
        meta: `Connected: ${storeSettings.whatsappNumber}`,
      },
      {
        id: 'tally',
        name: 'Tally Prime / GST Sync',
        category: 'Accounting & GST',
        desc: '1-click export of sales vouchers, purchase bills, HSN summary, and GSTR-1 / GSTR-3B JSON.',
        meta: 'Auto-sync daily at 11:00 PM',
      },
      {
        id: 'printer',
        name: 'Thermal Printer & Barcode',
        category: 'Hardware & POS',
        desc: 'Plug & play 58mm / 80mm USB & Bluetooth receipt printers, barcode label printers, and cash drawers.',
        meta: 'Epson TM-T82 (80mm USB) Ready',
      },
      {
        id: 'phonepe',
        name: 'PhonePe PG & SmartSpeaker',
        category: 'Payments & UPI',
        desc: 'Instant audio payment alerts and zero-MDR UPI checkout.',
        meta: 'Available to connect',
      },
      {
        id: 'porter',
        name: 'Dunzo / Porter Hyperlocal',
        category: 'Delivery & Logistics',
        desc: 'Book instant 2-wheeler local delivery riders for your Online Store orders.',
        meta: 'Available to connect',
      },
    ];

    const selectedIntegration =
      integrationsList.find((i) => i.id === selectedIntegrationId) || integrationsList[0];

    return (
      <div className="space-y-4 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[#E4EFEA] bg-white p-1.5">
            {[
              'All Integrations',
              'Payments & UPI',
              'WhatsApp & Marketing',
              'Accounting & GST',
              'Hardware & POS',
            ].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setIntegrationCategory(cat)}
                className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition ${
                  integrationCategory === cat
                    ? 'bg-[#0A6847] text-white'
                    : 'text-[#475569] hover:bg-[#F4F8F6]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {onOpenPrinterModal && (
            <button
              type="button"
              onClick={onOpenPrinterModal}
              className="bos-btn-primary inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12.5px]"
            >
              <Printer className="h-4 w-4" />
              <span>Configure Thermal Printer</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 items-start">
          <div className="lg:col-span-8 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {integrationsList
              .filter(
                (i) =>
                  integrationCategory === 'All Integrations' ||
                  i.category === integrationCategory,
              )
              .map((item) => {
                const isConnected = !!connectedIds[item.id];
                const isSelected = selectedIntegration.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedIntegrationId(item.id)}
                    className={`cursor-pointer rounded-xl border p-4 transition flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#0A6847] bg-[#F3FAF7]'
                        : 'border-[#E4EFEA] bg-white hover:border-[#10B981]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="rounded-md bg-[#F1F6F3] px-2 py-0.5 text-[10.5px] font-bold text-[#475569]">
                          {item.category}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10.5px] font-bold ${
                            isConnected
                              ? 'bg-[#E6F6F0] text-[#0A6847]'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isConnected ? '● Connected' : 'Not Connected'}
                        </span>
                      </div>
                      <h4 className="mt-2 text-[14.5px] font-bold text-[#111827]">{item.name}</h4>
                      <p className="mt-1 text-[12px] text-[#64748B] leading-relaxed">{item.desc}</p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-[#EDF4F0] flex items-center justify-between text-[11.5px]">
                      <span className="font-medium text-[#475569] truncate">{item.meta}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.id === 'printer' && onOpenPrinterModal) {
                            onOpenPrinterModal();
                            return;
                          }
                          setConnectedIds((prev) => ({
                            ...prev,
                            [item.id]: !prev[item.id],
                          }));
                        }}
                        className={`rounded-lg px-3 py-1 font-bold ${
                          isConnected
                            ? 'border border-[#DCE9E3] bg-white text-[#334155]'
                            : 'bg-[#0A6847] text-white'
                        }`}
                      >
                        {isConnected ? 'Configure' : '+ Connect'}
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="bos-card p-4 lg:col-span-4 space-y-3.5">
            <div className="border-b border-[#EDF4F0] pb-3">
              <span className="rounded-full bg-[#E6F6F0] px-2.5 py-0.5 text-[10.5px] font-bold text-[#0A6847]">
                Integration Settings
              </span>
              <h3 className="mt-1.5 text-[15px] font-bold text-[#111827]">
                {selectedIntegration.name}
              </h3>
              <p className="text-[12px] text-[#64748B]">{selectedIntegration.desc}</p>
            </div>

            <div className="space-y-2.5 text-[12.5px]">
              <label className="flex items-center justify-between rounded-xl border border-[#E4EFEA] bg-[#F8FCFA] p-3">
                <span className="font-semibold text-[#111827]">Auto-sync with POS Counter</span>
                <input type="checkbox" defaultChecked className="h-4 w-4 accent-[#0A6847]" />
              </label>
              <label className="flex items-center justify-between rounded-xl border border-[#E4EFEA] bg-[#F8FCFA] p-3">
                <span className="font-semibold text-[#111827]">
                  Include on GST Tax Invoices
                </span>
                <input type="checkbox" defaultChecked className="h-4 w-4 accent-[#0A6847]" />
              </label>
            </div>

            <button
              type="button"
              onClick={() => {
                setToast(`Saved ${selectedIntegration.name} configuration!`);
                setTimeout(() => setToast(null), 2500);
              }}
              className="w-full bos-btn-primary rounded-xl py-2.5 text-[13px]"
            >
              Save Integration Settings
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* 4. SETTINGS MODE */
  return (
    <div className="space-y-4 pb-6">
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 items-start">
        {/* Left Settings Sub-Menu */}
        <div className="bos-card p-3 lg:col-span-3 space-y-1">
          {(
            [
              { id: 'profile', label: 'Business Profile', sub: 'Store name, address, logo' },
              { id: 'pos', label: 'Store & POS Preferences', sub: 'Billing, barcode, rounding' },
              { id: 'gst', label: 'GST & Tax Configuration', sub: 'GSTIN, HSN/SAC, E-Invoicing' },
              { id: 'payments', label: 'Payments & Bank Details', sub: 'UPI QR, bank account' },
              { id: 'staff', label: 'Users, Staff & Roles', sub: 'Cashiers, managers, permissions' },
              { id: 'plan', label: 'Subscription & Plan', sub: 'BOS Pro Plan & billing' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSettingsSection(item.id)}
              className={`w-full rounded-xl p-3 text-left transition ${
                settingsSection === item.id
                  ? 'bg-[#0A6847] text-white shadow-2xs'
                  : 'hover:bg-[#F4F8F6] text-[#1E293B]'
              }`}
            >
              <p className="text-[13px] font-bold">{item.label}</p>
              <p
                className={`text-[11px] ${
                  settingsSection === item.id ? 'text-white/80' : 'text-[#64748B]'
                }`}
              >
                {item.sub}
              </p>
            </button>
          ))}
        </div>

        {/* Right Settings Workspace */}
        <div className="lg:col-span-9 space-y-4">
          <div className="bos-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#EDF4F0] pb-3">
              <div>
                <h2 className="text-[16px] font-bold text-[#111827]">
                  Business Profile & Store Identity
                </h2>
                <p className="text-[12px] text-[#64748B]">
                  Appears on your GST Invoices, 80mm Thermal Receipts, Online Store, and WhatsApp
                  messages.
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await onUpdateStoreSettings(storeSettings);
                  setToast('Saved Business Settings & GST configuration!');
                  setTimeout(() => setToast(null), 3000);
                }}
                className="bos-btn-primary rounded-xl px-4 py-2 text-[12.5px]"
              >
                Save All Changes
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 text-[13px]">
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#64748B] mb-1">
                  Business / Trade Name *
                </label>
                <input
                  type="text"
                  value={storeSettings.businessName}
                  onChange={(e) => void onUpdateStoreSettings({ businessName: e.target.value })}
                  className="w-full rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] px-3 py-2 font-bold text-[#111827]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#64748B] mb-1">
                  Business Category
                </label>
                <input
                  type="text"
                  value={storeSettings.businessType}
                  onChange={(e) => void onUpdateStoreSettings({ businessType: e.target.value })}
                  className="w-full rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] px-3 py-2 font-semibold text-[#111827]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#64748B] mb-1">
                  Primary Phone / WhatsApp
                </label>
                <input
                  type="text"
                  value={storeSettings.phone}
                  onChange={(e) =>
                    void onUpdateStoreSettings({
                      phone: e.target.value,
                      whatsappNumber: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] px-3 py-2 font-semibold text-[#111827]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#64748B] mb-1">
                  Business Email
                </label>
                <input
                  type="email"
                  value={storeSettings.email}
                  onChange={(e) => void onUpdateStoreSettings({ email: e.target.value })}
                  className="w-full rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] px-3 py-2 text-[#111827]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold uppercase text-[#64748B] mb-1">
                  Registered Store Address
                </label>
                <input
                  type="text"
                  value={storeSettings.address}
                  onChange={(e) => void onUpdateStoreSettings({ address: e.target.value })}
                  className="w-full rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] px-3 py-2 text-[#111827]"
                />
              </div>
            </div>
          </div>

          {/* GST & Bank Card */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="bos-card p-5 space-y-3 text-[13px]">
              <div className="flex items-center justify-between">
                <h3 className="text-[14.5px] font-bold text-[#111827]">
                  GST & Tax Configuration
                </h3>
                <span className="rounded-full bg-[#E6F6F0] px-2.5 py-0.5 text-[10.5px] font-bold text-[#0A6847]">
                  ✓ GST Active
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#64748B] mb-1">
                  GSTIN Number (15-Digit)
                </label>
                <input
                  type="text"
                  value={storeSettings.gstin}
                  onChange={(e) =>
                    void onUpdateStoreSettings({ gstin: e.target.value.toUpperCase() })
                  }
                  className="w-full rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] px-3 py-2 font-mono font-bold text-[#0A6847]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#64748B] mb-1">
                  Business PAN
                </label>
                <input
                  type="text"
                  value={storeSettings.pan}
                  onChange={(e) =>
                    void onUpdateStoreSettings({ pan: e.target.value.toUpperCase() })
                  }
                  className="w-full rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] px-3 py-2 font-mono"
                />
              </div>
            </div>

            <div className="bos-card p-5 space-y-3 text-[13px]">
              <h3 className="text-[14.5px] font-bold text-[#111827]">
                UPI QR & Settlement Bank Account
              </h3>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#64748B] mb-1">
                  Merchant UPI ID (For Dynamic QR)
                </label>
                <input
                  type="text"
                  value={storeSettings.upiId}
                  onChange={(e) => void onUpdateStoreSettings({ upiId: e.target.value })}
                  className="w-full rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] px-3 py-2 font-bold text-[#0A6847]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#64748B] mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={storeSettings.bankName}
                    onChange={(e) => void onUpdateStoreSettings({ bankName: e.target.value })}
                    className="w-full rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#64748B] mb-1">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    value={storeSettings.ifscCode}
                    onChange={(e) => void onUpdateStoreSettings({ ifscCode: e.target.value })}
                    className="w-full rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] px-3 py-2 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Subscription & Plan Card */}
          <div className="bos-card p-5 bg-gradient-to-r from-[#06392A] to-[#0A6847] text-white flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-[#A7F3D0]">
                <Crown className="h-6 w-6" />
              </div>
              <div>
                <span className="rounded-full bg-[#00B894] px-2.5 py-0.5 text-[10.5px] font-bold uppercase">
                  BOS Pro Plan
                </span>
                <h3 className="mt-1 text-[16px] font-extrabold">
                  Unlimited POS Registers, Multi-Store, WhatsApp API & AI Copilot
                </h3>
                <p className="text-[12px] text-white/80">
                  Manage multiple branches, staff roles, and automated GST filings.
                </p>
              </div>
            </div>

            {onOpenUpgradeModal && (
              <button
                type="button"
                onClick={onOpenUpgradeModal}
                className="shrink-0 rounded-xl bg-[#00B894] px-4 py-2.5 text-[12.5px] font-bold text-white shadow-sm hover:bg-[#00A181]"
              >
                Manage Pro Plan
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

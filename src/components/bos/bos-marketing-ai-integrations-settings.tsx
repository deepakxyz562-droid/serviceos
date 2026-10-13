'use client';

import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Bot,
  Briefcase,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  CreditCard,
  Crown,
  ExternalLink,
  FileText,
  Gift,
  Globe,
  HelpCircle,
  Image as ImageIcon,
  IndianRupee,
  Mail,
  MapPin,
  Megaphone,
  MessageCircle,
  Mic,
  MoreHorizontal,
  MoreVertical,
  Package,
  Palette,
  Paperclip,
  Percent,
  Phone,
  Play,
  Plug,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Send,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Smile,
  Sparkles,
  Store,
  Tag,
  Ticket,
  Truck,
  Upload,
  UserPlus,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  type BosCoupon,
  type BosCustomer,
  type BosOrder,
  type BosProductItem,
  type BosStoreSettings,
  formatBosCurrency,
} from '@/components/bos/bos-types';
import {
  BUSINESS_TYPE_LABELS,
  DEFAULT_CHANNELS_FOR_BUSINESS_TYPE,
  resolveBlueprintCapabilities,
} from '../../../shared/blueprint/presets';
import {
  COUNTRY_PACKS,
  getCountryPack,
} from '../../../shared/blueprint/country-packs';
import type {
  BusinessType,
  CountryCode,
  SalesChannel,
} from '../../../shared/blueprint/types';
import { authFetch } from '@/lib/client-auth';

type BosMarketingAiIntegrationsSettingsProps = {
  mode: 'marketing' | 'aiAssistant' | 'integrations' | 'settings';
  demoMode?: boolean;
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
  demoMode = false,
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

  /* Marketing state (Matches Marketing & Promotions screenshot 1:1) */
  const [previewChannel, setPreviewChannel] = useState<'WhatsApp' | 'SMS' | 'Email'>('WhatsApp');
  const [createCampaignModalOpen, setCreateCampaignModalOpen] = useState(false);
  const [createCouponModalOpen, setCreateCouponModalOpen] = useState(false);
  const [campaignTitle, setCampaignTitle] = useState('Weekend Fresh Deals');
  const [campaignDiscountText, setCampaignDiscountText] = useState('Up to 30% OFF');
  const [campaignValidTill, setCampaignValidTill] = useState('15 Oct 2024');
  const [campaignAudience, setCampaignAudience] = useState('All Customers');
  const [campaignType, setCampaignType] = useState<'WhatsApp' | 'Discount' | 'Loyalty' | 'Coupon'>(
    'WhatsApp',
  );
  const [campaignText, setCampaignText] = useState(
    'Fresh fruits, vegetables and daily essentials at special prices this weekend!',
  );
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponValue, setNewCouponValue] = useState(20);
  const [newCouponMinOrder, setNewCouponMinOrder] = useState(499);
  const [recentCampaigns, setRecentCampaigns] = useState<
    Array<{
      id: number;
      name: string;
      bannerTheme: 'fresh' | 'diwali' | 'arrivals' | 'loyalty' | 'clearance';
      type: 'WhatsApp' | 'Discount' | 'Loyalty' | 'Coupon';
      audience: string;
      sent: string;
      orders: number;
      revenue: number;
      status: string;
      discountHeadline: string;
      messageBody: string;
      validTill: string;
    }>
  >(() => (demoMode ? [
    {
      id: 1,
      name: 'Weekend Fresh Deals',
      bannerTheme: 'fresh',
      type: 'WhatsApp',
      audience: 'All Customers',
      sent: '1,250',
      orders: 186,
      revenue: 12480,
      status: 'Completed',
      discountHeadline: 'Up to 30% OFF',
      messageBody: 'Fresh fruits, vegetables and daily essentials at special prices this weekend!',
      validTill: '15 Oct 2024',
    },
    {
      id: 2,
      name: 'Diwali Special Offer',
      bannerTheme: 'diwali' as const,
      type: 'Discount' as const,
      audience: 'All Customers',
      sent: '980',
      orders: 142,
      revenue: 10560,
      status: 'Completed',
      discountHeadline: 'Flat 25% Festive OFF',
      messageBody: 'Celebrate Diwali with special festive gift packs, dry fruits & sweets!',
      validTill: '02 Nov 2024',
    },
    {
      id: 3,
      name: 'New Arrivals Alert',
      bannerTheme: 'arrivals' as const,
      type: 'WhatsApp' as const,
      audience: 'VIP Customers',
      sent: '320',
      orders: 68,
      revenue: 5780,
      status: 'Completed',
      discountHeadline: 'New Organic Range',
      messageBody: 'Explore newly arrived organic staples, snacks & imported beverages in store!',
      validTill: '20 Oct 2024',
    },
    {
      id: 4,
      name: 'Loyalty Points Reminder',
      bannerTheme: 'loyalty' as const,
      type: 'Loyalty' as const,
      audience: 'Loyalty Members',
      sent: '450',
      orders: 56,
      revenue: 3960,
      status: 'Completed',
      discountHeadline: '2X Reward Points',
      messageBody: 'Redeem your BOS Loyalty Points on your next shopping bill before month end!',
      validTill: '31 Oct 2024',
    },
    {
      id: 5,
      name: 'Clearance Sale',
      bannerTheme: 'clearance' as const,
      type: 'Coupon' as const,
      audience: 'Selected Customers',
      sent: '280',
      orders: 34,
      revenue: 1500,
      status: 'Completed',
      discountHeadline: 'Up to 50% OFF',
      messageBody: 'Mega month-end clearance on snacks, personal care & home essentials!',
      validTill: '28 Oct 2024',
    },
  ] : []));
  const [selectedCampaignId, setSelectedCampaignId] = useState<number>(demoMode ? 1 : 0);

  /* AI Assistant state (Matches BOS AI Assistant screenshot 1:1) */
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [activeAiThreadId, setActiveAiThreadId] = useState<string>('todays-sales');
  const [aiInsightsPeriod, setAiInsightsPeriod] = useState<'This Week' | 'This Month'>(
    'This Week',
  );
  const [aiMessages, setAiMessages] = useState<
    Array<{ id: string; role: 'assistant' | 'user'; text: string; time: string }>
  >([]);

  /* Integrations state */
  const [integrationCategory, setIntegrationCategory] = useState('All Integrations');
  const [selectedIntegrationId, setSelectedIntegrationId] = useState('razorpay');
  const [connectedIds, setConnectedIds] = useState<Record<string, boolean>>(() => {
    if (demoMode) {
      return {
        razorpay: true,
        whatsapp: true,
        tally: true,
        printer: true,
        phonepe: false,
        porter: false,
        ondc: false,
        zoho: false,
      };
    }
    return {
      razorpay: Boolean(storeSettings.upiId),
      whatsapp: Boolean(storeSettings.whatsappNumber),
      tally: false,
      printer: false,
      phonepe: false,
      porter: false,
      ondc: false,
      zoho: false,
    };
  });
  const [integrationCreds, setIntegrationCreds] = useState<
    Record<string, { keyId?: string; secret?: string; metaField?: string }>
  >(() => {
    if (demoMode) {
      return {
        razorpay: {
          keyId: 'rzp_live_8F92ka019',
          secret: '••••••••••••••••',
          metaField: storeSettings.upiId || 'sharmastore@okhdfcbank',
        },
        whatsapp: {
          keyId: '1048291049281',
          secret: 'EAABwzL1••••••••',
          metaField: storeSettings.whatsappNumber || '+91 98765 43210',
        },
        tally: {
          keyId: 'localhost',
          secret: '9000',
          metaField: `${storeSettings.businessName || 'SHARMA GENERAL STORE'} (2026)`,
        },
        printer: {
          keyId: 'USB001',
          secret: '',
          metaField: 'Epson TM-T82 (80mm)',
        },
        phonepe: {
          keyId: '',
          secret: '',
          metaField: '',
        },
        porter: {
          keyId: '',
          secret: '',
          metaField: storeSettings.address || '',
        },
      };
    }
    return {
      razorpay: {
        keyId: '',
        secret: '',
        metaField: storeSettings.upiId || '',
      },
      whatsapp: {
        keyId: '',
        secret: '',
        metaField: storeSettings.whatsappNumber || '',
      },
      tally: {
        keyId: '',
        secret: '',
        metaField: storeSettings.businessName ? `${storeSettings.businessName} (2026)` : '',
      },
      printer: {
        keyId: '',
        secret: '',
        metaField: '',
      },
      phonepe: {
        keyId: '',
        secret: '',
        metaField: '',
      },
      porter: {
        keyId: '',
        secret: '',
        metaField: storeSettings.address || '',
      },
    };
  });

  /* Settings state (Matches Settings & Business Configuration screenshot) */
  const [settingsSection, setSettingsSection] = useState<
    | 'businessInfo'
    | 'businessHours'
    | 'locations'
    | 'contact'
    | 'logoBranding'
    | 'businessType'
    | 'documents'
  >('businessInfo');
  const [settingsBusinessName, setSettingsBusinessName] = useState(() =>
    demoMode ? (storeSettings.businessName || 'Ravi Store') : (storeSettings.businessName || '')
  );
  const [settingsBusinessType, setSettingsBusinessType] = useState(() =>
    demoMode ? (storeSettings.businessType || 'Grocery Store') : (storeSettings.businessType || 'Retail Store')
  );
  const [settingsOwnerName, setSettingsOwnerName] = useState(() =>
    demoMode ? 'Ravi Kumar' : ''
  );
  const [settingsPhoneNumber, setSettingsPhoneNumber] = useState(() =>
    demoMode ? (storeSettings.phone?.replace(/^\+91\s*/, '') || '98765 43210') : (storeSettings.phone?.replace(/^\+91\s*/, '') || '')
  );
  const [settingsEmailAddress, setSettingsEmailAddress] = useState(() =>
    demoMode ? (storeSettings.email || 'ravi.store@gmail.com') : (storeSettings.email || '')
  );
  const [settingsWebsite, setSettingsWebsite] = useState(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://bos.fieseros.com';
    return storeSettings.businessSlug ? `${origin}/store/${storeSettings.businessSlug}` : (demoMode ? `${origin}/store/ravi-store` : '');
  });
  const [settingsAddress, setSettingsAddress] = useState(() =>
    demoMode ? (storeSettings.address || '123 Main Road, Sector 15, Noida, Uttar Pradesh, 201301') : (storeSettings.address || '')
  );
  const [settingsCity, setSettingsCity] = useState(() =>
    demoMode ? (storeSettings.city || 'Noida') : (storeSettings.city || '')
  );
  const [settingsState, setSettingsState] = useState(() =>
    demoMode ? (storeSettings.state || 'Uttar Pradesh') : (storeSettings.state || '')
  );
  const [settingsPinCode, setSettingsPinCode] = useState(() =>
    demoMode ? (storeSettings.pincode || '201301') : (storeSettings.pincode || '')
  );
  const [settingsDescription, setSettingsDescription] = useState(() =>
    demoMode ? (storeSettings.tagline || 'Daily essentials, fresh groceries, snacks, beverages and home care products at best prices.') : (storeSettings.tagline || '')
  );
  const [settingsGstin, setSettingsGstin] = useState(() =>
    demoMode ? (storeSettings.gstin || '09ABCDE1234F1Z5') : (storeSettings.gstin || '')
  );
  const [settingsRegType, setSettingsRegType] = useState('Regular');
  const [settingsEInvoiceEnabled, setSettingsEInvoiceEnabled] = useState(true);
  const [editingHours, setEditingHours] = useState(false);
  const [defaultDayHours, setDefaultDayHours] = useState('9:00 AM - 10:00 PM');
  const [gstModalOpen, setGstModalOpen] = useState(false);
  const [inviteStaffModalOpen, setInviteStaffModalOpen] = useState(false);
  const [inviteStaffName, setInviteStaffName] = useState('');
  const [inviteStaffRole, setInviteStaffRole] = useState('Staff');
  const [activeUsersCount, setActiveUsersCount] = useState(demoMode ? 5 : 1);

  /* Real subscription plan info fetched from /api/subscriptions. In demo
     mode we never fire the request — demoMode is for anonymous browsing with
     static demo data, not for hitting authenticated endpoints (matching the
     convention enforced elsewhere in the BOS shell). The fallback when the
     fetch fails or the response is malformed is an honest "manage your plan
     in Settings > Billing" message rather than a fabricated "Pro Plan ₹4,999"
     card. */
  const [subscriptionPlan, setSubscriptionPlan] = useState<{
    plan: string;
    billingCycle: string;
    status: string;
    renewalDate: string | null;
    isTrialExpired: boolean;
    trialEndsAt: string | null;
    maxUsers: number | null;
    currency: string;
    price: number;
  } | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);

  useEffect(() => {
    if (demoMode) return;
    let cancelled = false;
    setSubscriptionLoading(true);
    (async () => {
      try {
        const res = await authFetch('/api/subscriptions');
        if (!res.ok) {
          if (!cancelled) setSubscriptionPlan(null);
          return;
        }
        const data = await res.json().catch(() => null);
        if (cancelled || !data) return;
        const renewalIso =
          data.renewalDate ?? data.endDate ?? data.subscription?.endDate ?? null;
        const trialIso =
          data.trialEndsAt ?? data.subscription?.trialEndsAt ?? null;
        setSubscriptionPlan({
          plan: String(data.plan ?? data.subscription?.plan ?? ''),
          billingCycle: String(data.billingCycle ?? data.subscription?.billingCycle ?? 'monthly'),
          status: String(data.status ?? data.subscription?.status ?? ''),
          renewalDate: renewalIso ? String(renewalIso) : null,
          isTrialExpired: Boolean(data.isTrialExpired),
          trialEndsAt: trialIso ? String(trialIso) : null,
          maxUsers:
            typeof data.usage?.users?.limit === 'number'
              ? data.usage.users.limit
              : typeof data.maxUsers === 'number'
                ? data.maxUsers
                : null,
          currency: String(data.currency ?? 'INR'),
          price: typeof data.price === 'number' ? data.price : 0,
        });
      } catch {
        if (!cancelled) setSubscriptionPlan(null);
      } finally {
        if (!cancelled) setSubscriptionLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [demoMode]);

  useEffect(() => {
    if (!demoMode) {
      if (storeSettings.businessName) setSettingsBusinessName(storeSettings.businessName);
      if (storeSettings.businessType) setSettingsBusinessType(storeSettings.businessType);
      if (storeSettings.phone) setSettingsPhoneNumber(storeSettings.phone.replace(/^\+91\s*/, ''));
      if (storeSettings.email) setSettingsEmailAddress(storeSettings.email);
      if (storeSettings.address) setSettingsAddress(storeSettings.address);
      if (storeSettings.city) setSettingsCity(storeSettings.city);
      if (storeSettings.state) setSettingsState(storeSettings.state);
      if (storeSettings.pincode) setSettingsPinCode(storeSettings.pincode);
      if (storeSettings.gstin) setSettingsGstin(storeSettings.gstin);
    }
  }, [storeSettings, demoMode]);

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
      const messagesPayload = [
        ...aiMessages.map((m) => ({
          role: m.role,
          content: m.text,
        })),
        { role: 'user', content: trimmed },
      ];

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messagesPayload,
        }),
      });
      const json = await res.json().catch(() => null);

      if (res.ok && json && (json.reply || json.message || json.content)) {
        const reply = json.reply || json.message || json.content;
        setAiMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: 'assistant',
            text: String(reply),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } else {
        const errMsg =
          (json && json.error) ||
          (res ? `AI service responded with HTTP ${res.status}` : 'AI service unavailable');
        setAiMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: 'assistant',
            text: `⚠️ **AI Service Notice:** ${errMsg}. Please ensure the backend AI service is online and configured.`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Network error';
      setAiMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          text: `⚠️ **AI Service Error:** ${errMsg}. Unable to connect to the backend AI assistant service.`,
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

  /* 1. MARKETING MODE — 1:1 Match with Marketing & Promotions Screenshot */
  if (mode === 'marketing') {
    const defaultEmptyCampaign = {
      id: 0,
      name: campaignTitle || 'Special Offer',
      bannerTheme: 'fresh' as const,
      type: campaignType,
      audience: campaignAudience,
      sent: '0',
      orders: 0,
      revenue: 0,
      status: 'Draft',
      discountHeadline: campaignDiscountText || 'Exclusive Deal',
      messageBody: campaignText || 'Check out our latest products and deals!',
      validTill: campaignValidTill || 'End of Month',
    };
    const activePreviewCampaign =
      recentCampaigns.find((c) => c.id === selectedCampaignId) || recentCampaigns[0] || defaultEmptyCampaign;

    const renderCampaignBannerBadge = (
      theme: 'fresh' | 'diwali' | 'arrivals' | 'loyalty' | 'clearance',
    ) => {
      switch (theme) {
        case 'fresh':
          return (
            <div className="relative flex h-9 w-9 shrink-0 flex-col items-center justify-center overflow-hidden rounded-lg border border-amber-300 bg-gradient-to-br from-[#FEF08A] via-[#FACC15] to-[#16A34A] shadow-2xs">
              <span className="text-[12px] leading-none">🧺</span>
              <span className="mt-0.5 rounded-xs bg-white/95 px-1 text-[6px] font-black uppercase text-[#15803D]">
                30% OFF
              </span>
            </div>
          );
        case 'diwali':
          return (
            <div className="relative flex h-9 w-9 shrink-0 flex-col items-center justify-center overflow-hidden rounded-lg border border-red-800 bg-gradient-to-br from-[#450A0A] via-[#991B1B] to-[#D97706] shadow-2xs">
              <span className="text-[11px] leading-none">🪔</span>
              <span className="mt-0.5 text-[6.5px] font-extrabold tracking-tight text-[#FEF08A]">
                Diwali
              </span>
            </div>
          );
        case 'arrivals':
          return (
            <div className="relative flex h-9 w-9 shrink-0 flex-col items-center justify-center overflow-hidden rounded-lg border border-amber-400 bg-gradient-to-b from-[#FDE047] to-[#EA580C] shadow-2xs">
              <span className="text-[11px] leading-none">🛍️</span>
              <span className="mt-0.5 rounded-xs bg-[#991B1B] px-1 text-[6px] font-black uppercase text-white">
                NEW
              </span>
            </div>
          );
        case 'loyalty':
          return (
            <div className="relative flex h-9 w-9 shrink-0 flex-col items-center justify-center overflow-hidden rounded-lg border border-emerald-700 bg-gradient-to-br from-[#064E3B] via-[#047857] to-[#10B981] shadow-2xs">
              <span className="text-[10px] leading-none">🎁</span>
              <span className="mt-0.5 text-[6px] font-extrabold uppercase text-[#A7F3D0]">
                LOYALTY
              </span>
            </div>
          );
        case 'clearance':
          return (
            <div className="relative flex h-9 w-9 shrink-0 flex-col items-center justify-center overflow-hidden rounded-lg border border-red-600 bg-gradient-to-br from-[#DC2626] via-[#EA580C] to-[#FACC15] shadow-2xs">
              <span className="rounded-xs bg-[#FEF08A] px-1 text-[6px] font-black uppercase text-[#991B1B]">
                CLEARANCE
              </span>
              <span className="mt-0.5 text-[6.5px] font-black uppercase text-white">
                50% OFF
              </span>
            </div>
          );
      }
    };

    const renderCampaignTypeBadge = (type: 'WhatsApp' | 'Discount' | 'Loyalty' | 'Coupon') => {
      switch (type) {
        case 'WhatsApp':
          return (
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#1E293B]">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#16A34A] text-white">
                <MessageCircle className="h-3 w-3" />
              </span>
              <span>WhatsApp</span>
            </span>
          );
        case 'Discount':
          return (
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#1E293B]">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#FEE2E2] text-[#EF4444]">
                <Percent className="h-3 w-3" />
              </span>
              <span>Discount</span>
            </span>
          );
        case 'Loyalty':
          return (
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#1E293B]">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#FEF3C7] text-[#D97706]">
                <Gift className="h-3 w-3" />
              </span>
              <span>Loyalty</span>
            </span>
          );
        case 'Coupon':
          return (
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#1E293B]">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#F3E8FF] text-[#9333EA]">
                <Ticket className="h-3 w-3" />
              </span>
              <span>Coupon</span>
            </span>
          );
      }
    };

    return (
      <div className="w-full max-w-none space-y-4 pb-6">
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

        {/* Top Page Title & + Create Campaign Button */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-extrabold tracking-tight text-[#111827]">
              Marketing &amp; Promotions
            </h1>
            <p className="mt-0.5 text-[13px] text-[#64748B]">
              Grow your business with offers, customer campaigns, WhatsApp promotions and loyalty programs.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setCreateCampaignModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0A6847] px-4 py-2.5 text-[13px] font-bold text-white shadow-2xs hover:bg-[#085238] transition"
          >
            <Plus className="h-4 w-4" />
            <span>Create Campaign</span>
          </button>
        </div>

        {/* 4 Top KPI Summary Cards with Sparklines */}
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: 'Campaigns Sent',
              value: demoMode ? String(13 + recentCampaigns.length) : String(recentCampaigns.length),
              trend: recentCampaigns.length > 0 ? '↑ 28%' : '0%',
              icon: Megaphone,
              points: '0,28 18,22 36,24 54,14 72,16 90,4',
            },
            {
              label: 'Customers Reached',
              value: demoMode
                ? '2,450'
                : recentCampaigns
                    .reduce((acc, c) => acc + (parseInt(c.sent.replace(/,/g, '')) || 0), 0)
                    .toLocaleString('en-IN'),
              trend: recentCampaigns.length > 0 ? '↑ 32%' : '0%',
              icon: Users,
              points: '0,28 18,24 36,18 54,20 72,11 90,3',
            },
            {
              label: 'Orders from Campaigns',
              value: demoMode
                ? '486'
                : recentCampaigns.reduce((acc, c) => acc + (c.orders || 0), 0).toLocaleString('en-IN'),
              trend: recentCampaigns.length > 0 ? '↑ 45%' : '0%',
              icon: ShoppingCart,
              points: '0,29 18,23 36,21 54,13 72,14 90,4',
            },
            {
              label: 'Campaign Revenue',
              value: demoMode
                ? `${currencySymbol} 34,280`
                : `${currencySymbol} ${recentCampaigns.reduce((acc, c) => acc + (c.revenue || 0), 0).toLocaleString('en-IN')}`,
              trend: recentCampaigns.length > 0 ? '↑ 38%' : '0%',
              icon: IndianRupee,
              points: '0,28 18,24 36,19 54,15 72,12 90,3',
            },
          ].map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div
                key={kpi.label}
                className="bos-card p-4 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#E6F6F0] text-[#0A6847]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[12px] font-medium text-[#64748B]">{kpi.label}</p>
                    <p className="mt-0.5 text-[22px] font-extrabold leading-tight text-[#111827]">
                      {kpi.value}
                    </p>
                    <p className="mt-1 text-[11.5px] font-bold text-[#10B981]">{kpi.trend}</p>
                  </div>
                </div>

                {/* Mini Rising Green Sparkline */}
                <svg className="h-9 w-20 shrink-0 overflow-visible" viewBox="0 0 92 32">
                  <polyline
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={kpi.points}
                  />
                </svg>
              </div>
            );
          })}
        </div>

        {/* Main 2-Column Content Grid: Left 9 cols (Quick Actions + Recent Campaigns + 4 Bottom Cards) + Right 3 cols (Campaign Preview) */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 items-start">
          {/* Left Column (9 cols) */}
          <div className="lg:col-span-9 space-y-4">
            {/* Section A: Quick Actions */}
            <div className="bos-card p-4 space-y-3">
              <h2 className="text-[15px] font-extrabold text-[#111827]">Quick Actions</h2>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
                {[
                  {
                    label: 'Send WhatsApp Offer Message',
                    icon: MessageCircle,
                    iconBg: 'bg-[#E6F6F0] text-[#16A34A]',
                    action: () => {
                      setCampaignType('WhatsApp');
                      setCreateCampaignModalOpen(true);
                    },
                  },
                  {
                    label: 'Create Discount or Offer',
                    icon: Percent,
                    iconBg: 'bg-[#FEE2E2] text-[#EF4444]',
                    action: () => {
                      setCampaignType('Discount');
                      setCreateCampaignModalOpen(true);
                    },
                  },
                  {
                    label: 'Create Coupon Code',
                    icon: Ticket,
                    iconBg: 'bg-[#F3E8FF] text-[#9333EA]',
                    action: () => setCreateCouponModalOpen(true),
                  },
                  {
                    label: 'Start Loyalty Program',
                    icon: Users,
                    iconBg: 'bg-[#FEF3C7] text-[#D97706]',
                    action: () => {
                      setToast('Loyalty Program is coming soon.');
                      setTimeout(() => setToast(null), 2500);
                    },
                  },
                  {
                    label: 'Send SMS / Email Campaign',
                    icon: Mail,
                    iconBg: 'bg-[#DBEAFE] text-[#2563EB]',
                    action: () => {
                      setPreviewChannel('SMS');
                      setCreateCampaignModalOpen(true);
                    },
                  },
                ].map((qa) => {
                  const Icon = qa.icon;
                  return (
                    <button
                      key={qa.label}
                      type="button"
                      onClick={qa.action}
                      className="flex items-center justify-between gap-2.5 rounded-xl border border-[#E4EFEA] bg-white p-3 text-left hover:border-[#0A6847] hover:bg-[#F8FCFA] transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${qa.iconBg}`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="text-[12px] font-bold leading-snug text-[#111827] line-clamp-2">
                          {qa.label}
                        </span>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-[#94A3B8]" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section B: Recent Campaigns Table */}
            <div className="bos-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-extrabold text-[#111827]">Recent Campaigns</h2>
                <button
                  type="button"
                  onClick={() => {
                    setToast(`Showing all ${recentCampaigns.length} marketing campaigns.`);
                    setTimeout(() => setToast(null), 2500);
                  }}
                  className="text-[12.5px] font-bold text-[#0A6847] hover:underline"
                >
                  View All
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[12.5px]">
                  <thead>
                    <tr className="border-b border-[#E4EFEA] bg-[#F8FCFA] text-[11px] font-semibold text-[#64748B]">
                      <th className="py-2.5 pl-3 pr-2">#</th>
                      <th className="py-2.5 px-2">Campaign Name</th>
                      <th className="py-2.5 px-2">Type</th>
                      <th className="py-2.5 px-2">Audience</th>
                      <th className="py-2.5 px-2">Sent</th>
                      <th className="py-2.5 px-2">Orders</th>
                      <th className="py-2.5 px-2">Revenue</th>
                      <th className="py-2.5 px-2">Status</th>
                      <th className="py-2.5 pl-2 pr-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EDF4F0]">
                    {recentCampaigns.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-xs text-[#94A3B8]">
                          No campaigns yet. Create your first campaign to get started.
                        </td>
                      </tr>
                    ) : (
                      recentCampaigns.map((camp, idx) => {
                      const isSelected = camp.id === selectedCampaignId;
                      return (
                        <tr
                          key={camp.id}
                          onClick={() => setSelectedCampaignId(camp.id)}
                          className={`cursor-pointer transition ${
                            isSelected ? 'bg-[#F3FAF7]' : 'hover:bg-[#F8FCFA]'
                          }`}
                        >
                          <td className="py-3 pl-3 pr-2 font-semibold text-[#475569]">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2.5">
                              {renderCampaignBannerBadge(camp.bannerTheme)}
                              <span className="font-bold text-[#111827]">{camp.name}</span>
                            </div>
                          </td>
                          <td className="py-3 px-2">{renderCampaignTypeBadge(camp.type)}</td>
                          <td className="py-3 px-2 text-[#475569] font-medium">{camp.audience}</td>
                          <td className="py-3 px-2 font-bold text-[#111827]">{camp.sent}</td>
                          <td className="py-3 px-2 font-bold text-[#111827]">{camp.orders}</td>
                          <td className="py-3 px-2 font-extrabold text-[#111827]">
                            {currencySymbol} {camp.revenue.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-2">
                            <span className="inline-flex items-center rounded-md bg-[#E6F6F0] px-2.5 py-0.5 text-[11px] font-bold text-[#0A6847]">
                              {camp.status}
                            </span>
                          </td>
                          <td className="py-3 pl-2 pr-3 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCampaignId(camp.id);
                                setToast(`Previewing "${camp.name}" on ${previewChannel}`);
                                setTimeout(() => setToast(null), 2500);
                              }}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#64748B] hover:bg-[#E6F6F0] hover:text-[#0A6847]"
                              aria-label={`Actions for ${camp.name}`}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    }))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section C: Bottom 4 Feature Cards */}
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
              {/* 1. Offers & Discounts */}
              <div className="bos-card p-4 flex flex-col justify-between space-y-3.5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FEE2E2] text-[#EF4444]">
                    <Percent className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-extrabold text-[#111827]">
                      Offers &amp; Discounts
                    </h3>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-[#64748B]">
                      Create product discounts, combo offers and category promotions.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCampaignType('Discount');
                    setCreateCampaignModalOpen(true);
                  }}
                  className="w-full rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] py-2 text-[12.5px] font-bold text-[#0A6847] hover:border-[#0A6847] hover:bg-[#E6F6F0]/50 transition"
                >
                  Create Offer
                </button>
              </div>

              {/* 2. Coupons */}
              <div className="bos-card p-4 flex flex-col justify-between space-y-3.5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F3E8FF] text-[#9333EA]">
                    <Ticket className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-extrabold text-[#111827]">Coupons</h3>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-[#64748B]">
                      Generate coupon codes for online and in-store orders.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateCouponModalOpen(true)}
                  className="w-full rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] py-2 text-[12.5px] font-bold text-[#0A6847] hover:border-[#0A6847] hover:bg-[#E6F6F0]/50 transition"
                >
                  Create Coupon
                </button>
              </div>

              {/* 3. Loyalty Program */}
              <div className="bos-card p-4 flex flex-col justify-between space-y-3.5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FEF3C7] text-[#D97706]">
                    <Gift className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-extrabold text-[#111827]">Loyalty Program</h3>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-[#64748B]">
                      Reward your customers with points, cashback or special offers.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setToast('Loyalty Program is coming soon.');
                    setTimeout(() => setToast(null), 2500);
                  }}
                  className="w-full rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] py-2 text-[12.5px] font-bold text-[#0A6847] hover:border-[#0A6847] hover:bg-[#E6F6F0]/50 transition"
                >
                  Setup Loyalty
                </button>
              </div>

              {/* 4. Customer Segments */}
              <div className="bos-card p-4 flex flex-col justify-between space-y-3.5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E6F6F0] text-[#0A6847]">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-extrabold text-[#111827]">
                      Customer Segments
                    </h3>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-[#64748B]">
                      Target specific customers based on purchase history, location and more.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setToast(`Customer Segments: All (${customers.length}) • VIP (${customers.filter((c) => c.segment === 'VIP').length}) • Regular (${customers.filter((c) => c.segment === 'Regular').length}). Segmentation tools are coming soon.`);
                    setTimeout(() => setToast(null), 3500);
                  }}
                  className="w-full rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] py-2 text-[12.5px] font-bold text-[#0A6847] hover:border-[#0A6847] hover:bg-[#E6F6F0]/50 transition"
                >
                  Manage Segments
                </button>
              </div>
            </div>
          </div>

          {/* Right Column (3 cols) — Campaign Preview Card with Smartphone Frame */}
          <div className="bos-card p-4 lg:col-span-3 space-y-3.5">
            <h2 className="text-[15px] font-extrabold text-[#111827]">Campaign Preview</h2>

            {/* 3 Channel Toggle Tabs: WhatsApp | SMS | Email */}
            <div className="grid grid-cols-3 rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] p-1 text-[12px] font-bold">
              {(['WhatsApp', 'SMS', 'Email'] as const).map((ch) => {
                const isActive = previewChannel === ch;
                return (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setPreviewChannel(ch)}
                    className={`rounded-lg py-1.5 transition ${
                      isActive
                        ? 'bg-[#0A6847] text-white shadow-2xs'
                        : 'text-[#475569] hover:text-[#111827]'
                    }`}
                  >
                    {ch}
                  </button>
                );
              })}
            </div>

            {/* Realistic Smartphone Mockup Frame */}
            <div className="mx-auto max-w-[290px] rounded-[34px] border-[7px] border-[#1E293B] bg-[#ECE5DD] shadow-xl overflow-hidden">
              {/* Top Phone Status Bar & Notch */}
              <div className="relative flex items-center justify-between bg-[#075E54] px-4 pt-2 pb-1 text-[10px] font-bold text-white">
                <span>9:41</span>
                <div className="h-3 w-20 rounded-full bg-black/80" />
                <span>5G 100%</span>
              </div>

              {/* WhatsApp Store Header Bar */}
              <div className="flex items-center justify-between bg-[#075E54] px-3 py-2.5 text-white">
                <div className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4 text-white/90" />
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#10B981] text-white">
                    <Store className="h-4 w-4" />
                  </div>
                  <div className="leading-tight">
                    <p className="text-[12.5px] font-extrabold">{storeSettings.businessName || 'My Store'}</p>
                    <p className="text-[10px] text-white/80">Online</p>
                  </div>
                </div>
                <MessageCircle className="h-4 w-4 text-white/90" />
              </div>

              {/* Chat Wallpaper & Message Card */}
              <div className="p-2.5 space-y-2 bg-[#ECE5DD]">
                <div className="rounded-2xl bg-white p-2 shadow-xs space-y-2">
                  {/* Promotional Graphic Banner (Matches Screenshot 1:1) */}
                  <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#FDE047] via-[#FACC15] to-[#F59E0B] p-2.5">
                    <div className="flex items-center justify-between gap-1.5">
                      {/* Left Fresh Produce Basket Visual */}
                      <div className="flex h-14 w-16 shrink-0 items-center justify-center rounded-xl bg-white/85 text-[24px] shadow-2xs">
                        🥦🍎🥕
                      </div>

                      {/* Center Green Circular Badge: FRESH & HEALTHY */}
                      <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-full border-2 border-white bg-[#15803D] text-center text-[7px] font-black leading-tight uppercase text-white shadow-xs">
                        <span>FRESH &amp;</span>
                        <span>HEALTHY</span>
                      </div>

                      {/* Right Tag: FRESH & GROCERY */}
                      <div className="rounded-md bg-white/95 px-1.5 py-1 text-center text-[7px] font-extrabold leading-tight uppercase text-[#92400E] shadow-2xs">
                        <div>FRESH &amp;</div>
                        <div>GROCERY</div>
                      </div>
                    </div>

                    {/* White Overlay Headline Card */}
                    <div className="mt-2 rounded-xl bg-white/95 px-3 py-1.5 text-center shadow-sm">
                      <p className="text-[11.5px] font-extrabold text-[#111827]">
                        {activePreviewCampaign.name}
                      </p>
                      <p className="text-[15px] font-black text-[#111827]">
                        {activePreviewCampaign.discountHeadline}
                      </p>
                    </div>
                  </div>

                  {/* Message Copy */}
                  <div className="px-1.5 pb-1 space-y-2 text-[11.5px] leading-relaxed text-[#1E293B]">
                    <p className="font-semibold">Hi {'{{name}}'} 👋</p>
                    <p>{activePreviewCampaign.messageBody}</p>
                    <div className="space-y-0.5 font-semibold text-[#111827]">
                      <p>🛒 {activePreviewCampaign.discountHeadline}</p>
                      <p>⏰ Valid till {activePreviewCampaign.validTill}</p>
                    </div>
                    <div>
                      <p className="font-medium">Order now from our store 👇</p>
                      <p className="text-[#2563EB] underline break-all">
                        {`${typeof window !== 'undefined' ? window.location.origin : 'https://bos.fieseros.com'}/store/${storeSettings.businessSlug || 'store'}`}
                      </p>
                    </div>
                    <div className="flex items-center justify-end gap-1 text-[10px] text-[#64748B]">
                      <span>10:30 AM</span>
                      <span className="font-bold text-[#0EA5E9]">✓✓</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom WhatsApp Input Bar */}
              <div className="flex items-center gap-2 bg-[#F0F2F5] px-2.5 py-2">
                <div className="flex flex-1 items-center justify-between rounded-full bg-white px-3 py-1.5 text-[#64748B]">
                  <Smile className="h-4 w-4" />
                  <span className="text-[11px] text-[#94A3B8]">Message</span>
                  <Paperclip className="h-4 w-4" />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setToast('Preview only. Connect the WhatsApp Business API in the Integrations page to send real broadcasts.');
                    setTimeout(() => setToast(null), 3500);
                  }}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0A6847] text-white shadow-2xs hover:bg-[#085238]"
                  aria-label="Send campaign test"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal 1: + Create Campaign Modal */}
        {createCampaignModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#EDF4F0] pb-3">
                <h3 className="text-[15px] font-extrabold text-[#111827]">
                  Create Marketing Campaign
                </h3>
                <button
                  type="button"
                  onClick={() => setCreateCampaignModalOpen(false)}
                  className="rounded-lg p-1 text-[#64748B]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3 text-[12.5px]">
                <div>
                  <label className="mb-1 block font-semibold text-[#334155]">Campaign Name</label>
                  <input
                    type="text"
                    value={campaignTitle}
                    onChange={(e) => setCampaignTitle(e.target.value)}
                    className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2 font-semibold"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="mb-1 block font-semibold text-[#334155]">Channel / Type</label>
                    <select
                      value={campaignType}
                      onChange={(e) =>
                        setCampaignType(
                          e.target.value as 'WhatsApp' | 'Discount' | 'Loyalty' | 'Coupon',
                        )
                      }
                      className="w-full rounded-xl border border-[#DCE9E3] bg-white px-3 py-2 font-semibold"
                    >
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Discount">Discount</option>
                      <option value="Loyalty">Loyalty</option>
                      <option value="Coupon">Coupon</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-[#334155]">Audience</label>
                    <select
                      value={campaignAudience}
                      onChange={(e) => setCampaignAudience(e.target.value)}
                      className="w-full rounded-xl border border-[#DCE9E3] bg-white px-3 py-2 font-semibold"
                    >
                      <option value="All Customers">All Customers</option>
                      <option value="VIP Customers">VIP Customers</option>
                      <option value="Loyalty Members">Loyalty Members</option>
                      <option value="Selected Customers">Selected Customers</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="mb-1 block font-semibold text-[#334155]">Offer Headline</label>
                    <input
                      type="text"
                      value={campaignDiscountText}
                      onChange={(e) => setCampaignDiscountText(e.target.value)}
                      className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-[#334155]">Valid Till</label>
                    <input
                      type="text"
                      value={campaignValidTill}
                      onChange={(e) => setCampaignValidTill(e.target.value)}
                      className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2 font-semibold"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-[#334155]">Message Text</label>
                  <textarea
                    rows={3}
                    value={campaignText}
                    onChange={(e) => setCampaignText(e.target.value)}
                    className="w-full rounded-xl border border-[#DCE9E3] p-2.5"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateCampaignModalOpen(false)}
                  className="rounded-xl border border-[#DCE9E3] px-4 py-2 text-[12.5px] font-semibold text-[#475569]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const targetAudienceCount =
                      campaignAudience === 'All Customers'
                        ? Math.max(1, customers.length)
                        : Math.max(1, Math.min(customers.length, 25));

                    const channelMap: Record<string, string> = {
                      WhatsApp: 'whatsapp',
                      Discount: 'sms',
                      Loyalty: 'sms',
                      Coupon: 'email',
                    };
                    const channel = channelMap[campaignType] || 'whatsapp';

                    let launchSuccess = false;
                    let failureReason = '';
                    try {
                      const res = await fetch('/api/campaigns', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          name: campaignTitle || 'Special Store Promotion',
                          type: 'promotional',
                          status: 'active',
                          channel,
                          messageContent: campaignText,
                          totalRecipients: targetAudienceCount,
                        }),
                      });
                      if (res.ok) {
                        launchSuccess = true;
                        setToast(
                          `Launched "${campaignTitle}" to ${targetAudienceCount} recipients (${campaignAudience}) via ${campaignType}!`,
                        );
                      } else {
                        const err = await res.json().catch(() => null);
                        failureReason = err?.error || `HTTP ${res.status}`;
                        setToast(`⚠️ Server error: Campaign saved as Draft (${failureReason})`);
                      }
                    } catch (netErr: any) {
                      failureReason = netErr?.message || 'Network unreachable';
                      setToast(`⚠️ Network error: Campaign saved as Draft. Could not dispatch to recipients.`);
                    }

                    const nextId = recentCampaigns.length + 1;
                    setRecentCampaigns((prev) => [
                      {
                        id: nextId,
                        name: campaignTitle || 'Special Store Promotion',
                        bannerTheme: 'fresh',
                        type: campaignType,
                        audience: campaignAudience,
                        sent: launchSuccess ? String(targetAudienceCount) : '0',
                        orders: 0,
                        revenue: 0,
                        status: launchSuccess ? 'Active' : 'Draft',
                        discountHeadline: campaignDiscountText,
                        messageBody: campaignText,
                        validTill: campaignValidTill,
                      },
                      ...prev,
                    ]);
                    setSelectedCampaignId(nextId);
                    setCreateCampaignModalOpen(false);
                    setTimeout(() => setToast(null), 3000);
                  }}
                  className="rounded-xl bg-[#0A6847] px-4 py-2 text-[12.5px] font-bold text-white cursor-pointer"
                >
                  Launch Campaign
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal 2: Create Coupon Modal */}
        {createCouponModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#EDF4F0] pb-3">
                <h3 className="text-[15px] font-extrabold text-[#111827]">Create Coupon Code</h3>
                <button
                  type="button"
                  onClick={() => setCreateCouponModalOpen(false)}
                  className="rounded-lg p-1 text-[#64748B]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3 text-[12.5px]">
                <div>
                  <label className="mb-1 block font-semibold text-[#334155]">Coupon Code</label>
                  <input
                    type="text"
                    value={newCouponCode}
                    onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                    placeholder="e.g. FRESH30"
                    className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2 font-mono font-bold uppercase"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="mb-1 block font-semibold text-[#334155]">Discount (%)</label>
                    <input
                      type="number"
                      value={newCouponValue}
                      onChange={(e) => setNewCouponValue(Number(e.target.value) || 10)}
                      className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2 font-bold"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-[#334155]">
                      Min Order ({currencySymbol})
                    </label>
                    <input
                      type="number"
                      value={newCouponMinOrder}
                      onChange={(e) => setNewCouponMinOrder(Number(e.target.value) || 299)}
                      className="w-full rounded-xl border border-[#DCE9E3] px-3 py-2 font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateCouponModalOpen(false)}
                  className="rounded-xl border border-[#DCE9E3] px-4 py-2 text-[12.5px] font-semibold text-[#475569]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const code = newCouponCode.trim() || 'FRESH20';
                    void onAddCoupon({
                      code,
                      type: 'percentage',
                      value: newCouponValue,
                      minOrder: newCouponMinOrder,
                      active: true,
                    });
                    setNewCouponCode('');
                    setCreateCouponModalOpen(false);
                    setToast(`Created coupon "${code}" (${newCouponValue}% OFF)!`);
                    setTimeout(() => setToast(null), 3000);
                  }}
                  className="rounded-xl bg-[#0A6847] px-4 py-2 text-[12.5px] font-bold text-white"
                >
                  Save Coupon
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* 2. AI ASSISTANT MODE — 1:1 Match with BOS AI Assistant Screenshot */
  if (mode === 'aiAssistant') {
    // Recent chats are server-side conversation history. We do not seed any
    // demo chats here — in production the list starts empty and grows as the
    // operator sends real prompts. Suggestion prompts are still surfaced via
    // the "Quick Actions" grid and the suggestion pills in the conversation
    // column, so the operator always has somewhere to start.
    const recentChatsList: Array<{
      id: string;
      title: string;
      sub: string;
      prompt: string;
      icon: typeof RefreshCw;
    }> = [];

    // Weekly bar chart: real revenue per day for the last 7 days. Honest:
    // when there are no orders in the window, every bar is 0-height.
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (6 - i));
      return d;
    });
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyRevenueBuckets = last7Days.map((day) => {
      const next = new Date(day);
      next.setDate(day.getDate() + 1);
      return orders
        .filter((o) => {
          const created = new Date(o.createdAt);
          return created >= day && created < next;
        })
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    });
    const maxWeeklyRevenue = Math.max(1, ...weeklyRevenueBuckets);
    const todayIdx = new Date().getDay();
    const weeklyBars = weeklyRevenueBuckets.map((rev, i) => ({
      day: dayLabels[last7Days[i].getDay()],
      height: Math.round((rev / maxWeeklyRevenue) * 64) + (rev > 0 ? 8 : 0),
      active: last7Days[i].getDay() === todayIdx,
    }));

    // Real business-insight aggregates. When orders/customers/products are
    // empty (production zero-state), every figure is honestly 0.
    const periodOrders = orders.filter((o) => {
      const created = new Date(o.createdAt);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - (aiInsightsPeriod === 'This Week' ? 7 : 30));
      return created >= cutoff;
    });
    const periodRevenue = periodOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const periodNewCustomers = customers.filter((c) => {
      const lastVisit = new Date(c.lastVisit);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - (aiInsightsPeriod === 'This Week' ? 7 : 30));
      return lastVisit >= cutoff;
    }).length;

    // Smart Suggestions: real counts derived from live data, not invented.
    const lowStockCount = products.filter(
      (p) => p.stockQuantity <= (p.lowStockThreshold || 5),
    ).length;
    const dormantCustomers = customers.filter((c) => {
      const lastVisit = new Date(c.lastVisit);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 45);
      return lastVisit < cutoff;
    }).length;
    const customersWithDues = customers.filter((c) => c.khataBalance > 0).length;

    return (
      <div className="w-full max-w-none space-y-4 pb-6">
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

        {/* Top Page Header & How to use AI Assistant Button */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[22px] font-extrabold tracking-tight text-[#111827]">
                BOS AI Assistant
              </h1>
              <Sparkles className="h-5 w-5 text-[#10B981] fill-[#10B981]" />
            </div>
            <p className="mt-0.5 text-[13px] text-[#64748B]">
              Your business copilot. Ask questions, get insights and take actions — in simple language.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setToast(
                'Tip: Ask BOS AI in plain English or Hindi to check sales, restock items, create GST bills, or draft WhatsApp offers!',
              );
              setTimeout(() => setToast(null), 3500);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-[#DCE9E3] bg-white px-4 py-2 text-[12.5px] font-bold text-[#1E293B] shadow-2xs hover:border-[#0A6847] hover:bg-[#F8FCFA] transition"
          >
            <Play className="h-3.5 w-3.5 text-[#0A6847]" />
            <span>How to use AI Assistant</span>
          </button>
        </div>

        {/* Main 3-Column Workspace: Left Recent Chats (3 cols) + Center AI Copilot Chat (6 cols) + Right Insights & Actions (3 cols) */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 items-start">
          {/* Left Column (3 cols) — Recent Chats Sidebar Card */}
          <div className="bos-card p-3.5 lg:col-span-3 space-y-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setAiMessages([]);
                  setActiveAiThreadId('todays-sales');
                  setToast('Started a new BOS AI Assistant conversation.');
                  setTimeout(() => setToast(null), 2000);
                }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#0A6847] py-2.5 text-[13px] font-bold text-white shadow-2xs hover:bg-[#085238] transition"
              >
                <Plus className="h-4 w-4" />
                <span>New Chat</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setToast('Chat history sync is coming soon.');
                  setTimeout(() => setToast(null), 2500);
                }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] text-[#475569] hover:border-[#0A6847] hover:text-[#0A6847]"
                aria-label="Chat history archive"
              >
                <MessageCircle className="h-4 w-4" />
              </button>
            </div>

            <p className="px-1 text-[11.5px] font-semibold text-[#64748B]">Recent Chats</p>

            <div className="space-y-1">
              {recentChatsList.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#DCE9E3] bg-[#F8FCFA] px-3 py-6 text-center">
                  <Bot className="mx-auto h-6 w-6 text-[#94A3B8]" />
                  <p className="mt-2 text-[12px] font-semibold text-[#475569]">
                    No recent AI chats.
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#64748B]">
                    Start a conversation with your AI Assistant.
                  </p>
                </div>
              ) : (
                recentChatsList.map((chat) => {
                const Icon = chat.icon;
                const isActive = activeAiThreadId === chat.id;
                return (
                  <button
                    key={chat.id}
                    type="button"
                    onClick={() => {
                      setActiveAiThreadId(chat.id);
                      if (chat.id !== 'todays-sales') {
                        void handleSendAiMessage(chat.prompt);
                      }
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition ${
                      isActive
                        ? 'bg-[#E6F6F0] text-[#0A6847]'
                        : 'text-[#1E293B] hover:bg-[#F4F8F6]'
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        isActive
                          ? 'bg-[#0A6847]/15 text-[#0A6847]'
                          : 'bg-[#F1F6F3] text-[#475569]'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-[12.5px] font-bold truncate ${
                          isActive ? 'text-[#064E3B]' : 'text-[#111827]'
                        }`}
                      >
                        {chat.title}
                      </p>
                      <p className="text-[11px] text-[#64748B] truncate">{chat.sub}</p>
                    </div>
                  </button>
                );
              }))}
            </div>
          </div>

          {/* Center Column (6 cols) — Interactive AI Conversation & Rich Summary Card */}
          <div className="bos-card p-4 lg:col-span-6 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              {/* Message 1: Static Assistant Greeting & Quick Prompt Pills */}
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0A6847] text-white shadow-2xs">
                  <Bot className="h-5 w-5" />
                </div>

                <div className="flex-1 space-y-2.5">
                  <div className="rounded-2xl rounded-tl-xs border border-[#EDF4F0] bg-[#F8FCFA] px-4 py-3 text-[13px] leading-relaxed text-[#1E293B]">
                    <p className="font-semibold text-[#111827]">
                      Hi{storeSettings.businessName ? `, ${storeSettings.businessName}` : ''}! 👋
                    </p>
                    <p className="mt-0.5">
                      I&apos;m BOS AI Assistant. I can help you with sales, inventory, customers,
                      invoices, appointments, marketing and much more.
                    </p>
                    <p className="mt-1.5 font-medium text-[#111827]">
                      What would you like to do today?
                    </p>
                  </div>

                  {/* 4 Quick Suggestion Pills */}
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      "Show today's sales",
                      'Check low stock',
                      'Create invoice',
                      'Next appointments',
                    ].map((pill) => (
                      <button
                        key={pill}
                        type="button"
                        onClick={() => void handleSendAiMessage(pill)}
                        className="rounded-xl border border-[#DCE9E3] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#1E293B] hover:border-[#0A6847] hover:bg-[#E6F6F0]/50 transition"
                      >
                        {pill}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Empty state when there are no AI messages yet. The greeting
                  bubble above is a static introduction — the operator sends a
                  real prompt via the suggestion pills or the composer below
                  to populate this column with the assistant's actual replies. */}
              {aiMessages.length === 0 && !aiLoading && (
                <div className="rounded-xl border border-dashed border-[#DCE9E3] bg-[#F8FCFA] px-4 py-8 text-center">
                  <Sparkles className="mx-auto h-6 w-6 text-[#94A3B8]" />
                  <p className="mt-2 text-[12.5px] font-semibold text-[#475569]">
                    No AI insights yet.
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-[#64748B]">
                    Use the AI Assistant to generate insights — try a suggestion pill above or type a question below.
                  </p>
                </div>
              )}

              {/* Additional Interactive Messages Appended During Session */}
              {aiMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0A6847] text-white">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[12.5px] whitespace-pre-line leading-relaxed ${
                      msg.role === 'user'
                        ? 'rounded-tr-xs bg-[#E6F6F0] font-semibold text-[#064E3B]'
                        : 'rounded-tl-xs border border-[#E4EFEA] bg-[#F8FCFA] text-[#1E293B]'
                    }`}
                  >
                    <div>{msg.text}</div>
                    <div className="mt-1 text-[10px] text-[#94A3B8]">{msg.time}</div>
                  </div>
                </div>
              ))}

              {aiLoading && (
                <div className="text-[12.5px] font-semibold text-[#0A6847] animate-pulse">
                  ✨ BOS AI Assistant is analyzing your store data...
                </div>
              )}
            </div>

            {/* Bottom Composer & 6 Quick Action Chips */}
            <div className="pt-3 border-t border-[#EDF4F0] space-y-2.5">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSendAiMessage(aiInput);
                }}
                className="flex items-center gap-2 rounded-2xl border border-[#DCE9E3] bg-[#F8FCFA] px-3.5 py-2 focus-within:border-[#0A6847] focus-within:bg-white transition"
              >
                <Paperclip className="h-4 w-4 shrink-0 text-[#64748B]" />
                <input
                  type="text"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  placeholder="Ask anything about your business..."
                  className="flex-1 bg-transparent text-[13px] text-[#111827] placeholder:text-[#64748B] focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => {
                    setToast('Voice input is coming soon.');
                    setTimeout(() => setToast(null), 2500);
                  }}
                  className="rounded-lg p-1 text-[#64748B] hover:text-[#0A6847]"
                  aria-label="Voice input"
                >
                  <Mic className="h-4 w-4" />
                </button>
                <button
                  type="submit"
                  disabled={aiLoading}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0A6847] text-white shadow-2xs hover:bg-[#085238] transition"
                  aria-label="Send message"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>

              {/* 6 Bottom Quick Chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  {
                    label: 'Create Invoice',
                    icon: FileText,
                    color: 'text-[#0A6847]',
                    prompt: 'Create invoice for Sneha Patel',
                  },
                  {
                    label: 'Check Stock',
                    icon: Percent,
                    color: 'text-[#EF4444]',
                    prompt: 'Show low stock items to reorder',
                  },
                  {
                    label: 'Add Customer',
                    icon: UserPlus,
                    color: 'text-[#2563EB]',
                    prompt: 'Show customer outstanding dues',
                  },
                  {
                    label: 'Book Appointment',
                    icon: Calendar,
                    color: 'text-[#9333EA]',
                    prompt: 'Show next 7 days appointments',
                  },
                  {
                    label: 'Create Offer',
                    icon: Gift,
                    color: 'text-[#D97706]',
                    prompt: 'Draft a WhatsApp promo for weekend sale',
                  },
                ].map((chip) => {
                  const Icon = chip.icon;
                  return (
                    <button
                      key={chip.label}
                      type="button"
                      onClick={() => void handleSendAiMessage(chip.prompt)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4EFEA] bg-[#F8FCFA] px-2.5 py-1 text-[11.5px] font-semibold text-[#1E293B] hover:border-[#0A6847] hover:bg-[#E6F6F0]/50 transition"
                    >
                      <Icon className={`h-3.5 w-3.5 ${chip.color}`} />
                      <span>{chip.label}</span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => void handleSendAiMessage("Analyze this week's profit margins")}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#E4EFEA] bg-[#F8FCFA] px-2.5 py-1 text-[11.5px] font-semibold text-[#475569] hover:border-[#0A6847]"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                  <span>More</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column (3 cols) — Quick Actions + Business Insights + Smart Suggestions */}
          <div className="lg:col-span-3 space-y-4">
            {/* Card 1: Quick Actions (2x4 Grid) */}
            <div className="bos-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[14.5px] font-extrabold text-[#111827]">Quick Actions</h2>
                <button
                  type="button"
                  onClick={() => {
                    setToast('All AI Quick Actions are listed above. More are coming soon.');
                    setTimeout(() => setToast(null), 2500);
                  }}
                  className="text-[11.5px] font-bold text-[#0A6847] hover:underline"
                >
                  See All
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    label: 'Create Invoice',
                    icon: FileText,
                    bg: 'bg-[#E6F6F0] text-[#0A6847]',
                    prompt: 'Create invoice for Sneha Patel',
                  },
                  {
                    label: 'Add Customer',
                    icon: UserPlus,
                    bg: 'bg-[#DBEAFE] text-[#2563EB]',
                    prompt: 'Show customer outstanding dues',
                  },
                  {
                    label: 'Check Stock',
                    icon: Package,
                    bg: 'bg-[#FEF3C7] text-[#D97706]',
                    prompt: 'Show low stock items to reorder',
                  },
                  {
                    label: 'Book Appointment',
                    icon: Calendar,
                    bg: 'bg-[#F3E8FF] text-[#9333EA]',
                    prompt: 'Check my salon appointments',
                  },
                  {
                    label: 'Send WhatsApp',
                    icon: MessageCircle,
                    bg: 'bg-[#E6F6F0] text-[#16A34A]',
                    prompt: 'Draft a WhatsApp promo for weekend sale',
                  },
                  {
                    label: 'Create Offer',
                    icon: Percent,
                    bg: 'bg-[#FEE2E2] text-[#EF4444]',
                    prompt: 'Create WhatsApp offer for Diwali',
                  },
                  {
                    label: 'View Reports',
                    icon: BarChart3,
                    bg: 'bg-[#DBEAFE] text-[#2563EB]',
                    prompt: "Analyze this week's profit margins",
                  },
                  {
                    label: 'Add Expense',
                    icon: Wallet,
                    bg: 'bg-[#FEE2E2] text-[#EF4444]',
                    prompt: 'Show profit and loss for September',
                  },
                ].map((act) => {
                  const Icon = act.icon;
                  return (
                    <button
                      key={act.label}
                      type="button"
                      onClick={() => void handleSendAiMessage(act.prompt)}
                      className="flex items-center gap-2 rounded-xl border border-[#E4EFEA] bg-[#F8FCFA] p-2.5 text-left hover:border-[#0A6847] hover:bg-white transition"
                    >
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${act.bg}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-[11.5px] font-bold text-[#111827] truncate">
                        {act.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Card 2: Business Insights */}
            <div className="bos-card p-4 space-y-3.5">
              <div className="flex items-center justify-between">
                <h2 className="text-[14.5px] font-extrabold text-[#111827]">Business Insights</h2>
                <button
                  type="button"
                  onClick={() =>
                    setAiInsightsPeriod((prev) =>
                      prev === 'This Week' ? 'This Month' : 'This Week',
                    )
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-[#DCE9E3] bg-[#F8FCFA] px-2.5 py-1 text-[11px] font-bold text-[#334155]"
                >
                  <span>{aiInsightsPeriod}</span>
                  <ChevronDown className="h-3 w-3 text-[#64748B]" />
                </button>
              </div>

              <div>
                <p className="text-[11.5px] font-medium text-[#64748B]">Sales</p>
                <div className="mt-0.5 flex items-baseline gap-2">
                  <span className="text-[20px] font-extrabold text-[#111827]">
                    {currencySymbol} {periodRevenue.toLocaleString('en-IN')}
                  </span>
                  <span className="text-[11.5px] font-medium text-[#64748B]">
                    {aiInsightsPeriod.toLowerCase()}
                  </span>
                </div>
              </div>

              {/* 7-Day Bar Chart — real revenue per day (last 7 days) */}
              <div className="flex items-end justify-between gap-2 pt-2 h-24">
                {weeklyBars.map((bar) => (
                  <div key={bar.day} className="flex flex-1 flex-col items-center gap-1.5">
                    <div
                      style={{ height: `${bar.height}px` }}
                      className={`w-full max-w-[22px] rounded-t-md transition-all ${
                        bar.active ? 'bg-[#0A6847]' : 'bg-[#6EE7B7]'
                      }`}
                    />
                    <span className="text-[10px] font-medium text-[#64748B]">{bar.day}</span>
                  </div>
                ))}
              </div>

              {/* Bottom 2 Mini Cards: Orders | New Customers — real counts */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div className="rounded-xl border border-[#EDF4F0] bg-[#F8FCFA] p-2.5 flex items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E6F6F0] text-[#0A6847]">
                    <ShoppingCart className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[10.5px] font-medium text-[#64748B]">Orders</p>
                    <p className="text-[14.5px] font-extrabold text-[#111827]">{periodOrders.length}</p>
                    <p className="text-[10px] font-medium text-[#64748B]">{aiInsightsPeriod.toLowerCase()}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-[#EDF4F0] bg-[#F8FCFA] p-2.5 flex items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#DBEAFE] text-[#2563EB]">
                    <Users className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-[10.5px] font-medium text-[#64748B] truncate">
                      New Customers
                    </p>
                    <p className="text-[14.5px] font-extrabold text-[#111827]">{periodNewCustomers}</p>
                    <p className="text-[10px] font-medium text-[#64748B]">{aiInsightsPeriod.toLowerCase()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Smart Suggestions */}
            <div className="bos-card p-4 space-y-3">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-[#F59E0B] fill-[#F59E0B]" />
                <h2 className="text-[14.5px] font-extrabold text-[#111827]">Smart Suggestions</h2>
              </div>

              <div className="space-y-2">
                {[
                  {
                    title: `${lowStockCount} product${lowStockCount === 1 ? '' : 's'} ${lowStockCount === 0 ? 'below safety threshold' : 'low in stock'}`,
                    sub: lowStockCount > 0 ? 'Restock to avoid stockout.' : 'Inventory is healthy.',
                    icon: AlertTriangle,
                    bg: 'bg-[#FEE2E2] text-[#EF4444]',
                    prompt: 'Show low stock items to reorder',
                  },
                  {
                    title: `${dormantCustomers} customer${dormantCustomers === 1 ? '' : 's'} haven't purchased in 45+ days`,
                    sub: dormantCustomers > 0 ? 'Send a WhatsApp offer.' : 'No dormant customers yet.',
                    icon: Package,
                    bg: 'bg-[#FEF3C7] text-[#D97706]',
                    prompt: 'Draft a WhatsApp promo for weekend sale',
                  },
                  {
                    title: `${customersWithDues} customer${customersWithDues === 1 ? '' : 's'} with outstanding dues`,
                    sub: customersWithDues > 0 ? 'Send a polite payment reminder.' : 'No outstanding dues.',
                    icon: IndianRupee,
                    bg: 'bg-[#DBEAFE] text-[#2563EB]',
                    prompt: 'Show customer due amount',
                  },
                  {
                    title: 'Create a festive offer for your top customers',
                    sub: 'I can create a ready-to-send message.',
                    icon: Bot,
                    bg: 'bg-[#E6F6F0] text-[#0A6847]',
                    prompt: 'Create WhatsApp offer for upcoming festival',
                  },
                ].map((sug) => {
                  const Icon = sug.icon;
                  return (
                    <button
                      key={sug.title}
                      type="button"
                      onClick={() => void handleSendAiMessage(sug.prompt)}
                      className="flex w-full items-center justify-between gap-2.5 rounded-xl border border-[#EDF4F0] bg-[#F8FCFA] p-2.5 text-left hover:border-[#0A6847] hover:bg-white transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${sug.bg}`}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[12px] font-bold text-[#111827] truncate">
                            {sug.title}
                          </p>
                          <p className="text-[11px] text-[#64748B] truncate">{sug.sub}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-[#94A3B8]" />
                    </button>
                  );
                })}
              </div>
            </div>
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
                        onClick={async (e) => {
                          e.stopPropagation();
                          setSelectedIntegrationId(item.id);
                          if (item.id === 'printer' && onOpenPrinterModal) {
                            onOpenPrinterModal();
                            return;
                          }
                          if (isConnected) {
                            setConnectedIds((prev) => ({
                              ...prev,
                              [item.id]: false,
                            }));
                            await onUpdateStoreSettings({
                              capabilities: {
                                ...storeSettings.capabilities,
                                [item.id]: false,
                              },
                            });
                            setToast(`Disconnected ${item.name}.`);
                            setTimeout(() => setToast(null), 2500);
                          } else {
                            // No real OAuth / credential verification happens
                            // here — this BOS view only persists a local
                            // capability flag. To avoid giving the operator
                            // the false impression that we have actually
                            // verified their integration (e.g. Razorpay
                            // key/secret, WhatsApp Business API token), we
                            // honestly redirect them to the full
                            // Integrations page in the dashboard where the
                            // real OAuth flow lives.
                            setToast('Connect via the Integrations page in your dashboard.');
                            setTimeout(() => setToast(null), 3000);
                          }
                        }}
                        className={`rounded-lg px-3 py-1 font-bold cursor-pointer ${
                          isConnected
                            ? 'border border-[#DCE9E3] bg-white text-[#334155]'
                            : 'bg-[#0A6847] text-white'
                        }`}
                      >
                        {isConnected ? 'Disconnect' : '+ Connect'}
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

            <div className="space-y-3 text-[12.5px]">
              <div>
                <label className="mb-1 block font-semibold text-[#334155]">
                  {selectedIntegration.id === 'whatsapp'
                    ? 'Meta Phone Number ID'
                    : selectedIntegration.id === 'tally'
                      ? 'Tally Server Host / IP'
                      : selectedIntegration.id === 'printer'
                        ? 'Connection Mode'
                        : 'Merchant / Key ID'}
                </label>
                <input
                  type="text"
                  value={
                    integrationCreds[selectedIntegration.id]?.keyId || ''
                  }
                  onChange={(e) =>
                    setIntegrationCreds((prev) => ({
                      ...prev,
                      [selectedIntegration.id]: {
                        ...prev[selectedIntegration.id],
                        keyId: e.target.value,
                      },
                    }))
                  }
                  placeholder={
                    selectedIntegration.id === 'whatsapp'
                      ? 'e.g. 1048291049281'
                      : selectedIntegration.id === 'tally'
                        ? 'e.g. localhost or 192.168.1.100'
                        : selectedIntegration.id === 'printer'
                          ? 'e.g. USB001 or Bluetooth'
                          : 'e.g. rzp_live_xxxxxxxx'
                  }
                  className="w-full rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] px-3 py-2 font-mono text-[12px] text-[#111827] focus:bg-white focus:outline-hidden"
                />
              </div>

              {selectedIntegration.id !== 'printer' && (
                <div>
                  <label className="mb-1 block font-semibold text-[#334155]">
                    {selectedIntegration.id === 'whatsapp'
                      ? 'System User Access Token'
                      : selectedIntegration.id === 'tally'
                        ? 'Tally Port'
                        : 'API Secret / Auth Token'}
                  </label>
                  <input
                    type="password"
                    value={
                      integrationCreds[selectedIntegration.id]?.secret || ''
                    }
                    onChange={(e) =>
                      setIntegrationCreds((prev) => ({
                        ...prev,
                        [selectedIntegration.id]: {
                          ...prev[selectedIntegration.id],
                          secret: e.target.value,
                        },
                      }))
                    }
                    placeholder="••••••••••••••••"
                    className="w-full rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] px-3 py-2 font-mono text-[12px] text-[#111827] focus:bg-white focus:outline-hidden"
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block font-semibold text-[#334155]">
                  {selectedIntegration.id === 'razorpay' ||
                  selectedIntegration.id === 'phonepe'
                    ? 'Merchant UPI VPA (QR Target)'
                    : selectedIntegration.id === 'whatsapp'
                      ? 'WhatsApp Sender Phone'
                      : selectedIntegration.id === 'tally'
                        ? 'Company Name in Tally'
                        : selectedIntegration.id === 'printer'
                          ? 'Printer Model'
                          : 'Pickup Hub Address'}
                </label>
                <input
                  type="text"
                  value={
                    integrationCreds[selectedIntegration.id]?.metaField || ''
                  }
                  onChange={(e) =>
                    setIntegrationCreds((prev) => ({
                      ...prev,
                      [selectedIntegration.id]: {
                        ...prev[selectedIntegration.id],
                        metaField: e.target.value,
                      },
                    }))
                  }
                  className="w-full rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] px-3 py-2 text-[12px] text-[#111827] focus:bg-white focus:outline-hidden"
                />
              </div>

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
              onClick={async () => {
                const creds = integrationCreds[selectedIntegration.id];
                const hasCreds = Boolean(
                  selectedIntegration.id === 'printer' ||
                  (creds && (creds.keyId || creds.secret || creds.metaField)) ||
                  (selectedIntegration.id === 'razorpay' && storeSettings.upiId),
                );

                if (!hasCreds) {
                  setToast(`Please enter API credentials or keys before saving ${selectedIntegration.name}.`);
                  setTimeout(() => setToast(null), 3000);
                  return;
                }

                // Persist the configuration values (e.g. UPI VPA for
                // Razorpay) to the store settings. We do NOT mark the
                // integration as "Connected" or claim verification — actual
                // OAuth verification happens via the real Integrations page
                // in the dashboard. The local credentials are saved here so
                // the operator can later complete the OAuth flow with the
                // same values.
                await onUpdateStoreSettings({
                  upiId:
                    selectedIntegration.id === 'razorpay'
                      ? integrationCreds.razorpay?.metaField || storeSettings.upiId
                      : storeSettings.upiId,
                });
                setToast(`Saved ${selectedIntegration.name} configuration. Connect via the Integrations page to verify.`);
                setTimeout(() => setToast(null), 3000);
              }}
              className="w-full bos-btn-primary rounded-xl py-2.5 text-[13px] cursor-pointer"
            >
              Save Integration Settings
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* 4. SETTINGS MODE — 1:1 Match with Settings & Business Configuration Screenshot */
  const leftNavItems = [
    {
      id: 'businessInfo' as const,
      title: 'Business Information',
      sub: 'Basic details about your business',
      icon: Building2,
    },
    {
      id: 'businessHours' as const,
      title: 'Business Hours',
      sub: 'Opening hours and holidays',
      icon: Clock,
    },
    {
      id: 'locations' as const,
      title: 'Locations / Branches',
      sub: 'Manage multiple outlets',
      icon: MapPin,
    },
    {
      id: 'contact' as const,
      title: 'Contact & Communication',
      sub: 'Phone, email and website',
      icon: Phone,
    },
    {
      id: 'logoBranding' as const,
      title: 'Logo & Branding',
      sub: 'Logo, colors and default settings',
      icon: Palette,
    },
    {
      id: 'businessType' as const,
      title: 'Business Type',
      sub: 'Industry and feature settings',
      icon: Briefcase,
    },
    {
      id: 'documents' as const,
      title: 'Documents',
      sub: 'PAN, GST, licenses and more',
      icon: FileText,
    },
  ];

  const daysOfWeek = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];

  return (
    <div className="w-full max-w-none space-y-4 pb-6">
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

      {/* Top Page Title & Subtitle */}
      <div>
        <h1 className="text-[22px] font-extrabold tracking-tight text-[#111827]">
          Settings &amp; Business Configuration
        </h1>
        <p className="mt-0.5 text-[13px] text-[#64748B]">
          Manage your business profile, store settings, staff, invoices, taxes, notifications and more.
        </p>
      </div>

      {/* Middle 3-Column Grid: Left Menu (3 cols) + Center Business Information Form (6 cols) + Right Preview Cards (3 cols) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 items-start">
        {/* Left Vertical Navigation Menu Card (3 cols) — only `businessInfo`
            (default) and `businessType` switch content; the other items are
            shown as navigation but surface an honest "coming soon" toast
            instead of silently doing nothing. */}
        <div className="bos-card p-2.5 lg:col-span-3 space-y-1">
          {leftNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = settingsSection === item.id;
            const isWired = item.id === 'businessInfo' || item.id === 'businessType';
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (isWired) {
                    setSettingsSection(item.id);
                  } else {
                    setToast(`${item.title} settings are coming soon.`);
                    setTimeout(() => setToast(null), 2500);
                  }
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                  isActive
                    ? 'border-l-[3.5px] border-l-[#0A6847] bg-[#E6F6F0]/80 text-[#0A6847]'
                    : 'text-[#1E293B] hover:bg-[#F4F8F6]'
                }`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    isActive
                      ? 'bg-[#0A6847]/15 text-[#0A6847]'
                      : 'bg-[#F1F6F3] text-[#0A6847]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-[13px] font-bold truncate ${
                      isActive ? 'text-[#064E3B]' : 'text-[#111827]'
                    }`}
                  >
                    {item.title}
                  </p>
                  <p className="text-[11px] text-[#64748B] truncate">{item.sub}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Center Main Form Card: Business Information (6 cols) */}
        <div className="bos-card p-5 lg:col-span-6 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#EDF4F0] pb-3.5">
            <div className="max-w-lg">
              <h2 className="text-[16px] font-extrabold text-[#111827]">
                Business Information
              </h2>
              <p className="mt-0.5 text-[12px] text-[#64748B] leading-relaxed">
                Update your business details. This information will be used in invoices, receipts and customer communications.
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                const labelToBlueprint: Record<string, BusinessType> = {
                  'Grocery Store': 'grocery',
                  'Supermarket & Kirana': 'grocery',
                  'Pharmacy & Medical': 'retail',
                  'Electronics & Mobile': 'retail',
                  'Salon & Spa': 'salon',
                  'Restaurant & Cafe': 'restaurant',
                  'Service Business': 'services',
                  'Wholesale & Distribution': 'wholesale',
                };
                const bpType =
                  labelToBlueprint[settingsBusinessType] ||
                  storeSettings.blueprintType ||
                  'grocery';
                const channels =
                  storeSettings.salesChannels ||
                  DEFAULT_CHANNELS_FOR_BUSINESS_TYPE[bpType];
                const resolvedCaps = resolveBlueprintCapabilities(bpType, channels);

                await onUpdateStoreSettings({
                  businessName: settingsBusinessName,
                  businessType: settingsBusinessType,
                  blueprintType: bpType,
                  salesChannels: channels,
                  capabilities: resolvedCaps as unknown as Record<string, boolean>,
                  phone: `+91 ${settingsPhoneNumber}`,
                  whatsappNumber: `+91 ${settingsPhoneNumber}`,
                  email: settingsEmailAddress,
                  address: settingsAddress,
                  gstin: settingsGstin,
                });
                setToast('Business Information & Store Configuration saved successfully!');
                setTimeout(() => setToast(null), 3000);
              }}
              className="shrink-0 rounded-xl bg-[#0A6847] px-4 py-2 text-[12.5px] font-bold text-white shadow-2xs hover:bg-[#085238] transition"
            >
              Save Changes
            </button>
          </div>

          {/* Form Fields Grid */}
          <div className="space-y-3.5 text-[12.5px]">
            {/* Row 1: Business Name * | Business Type * */}
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-[#334155]">
                  Business Name <span className="text-[#EF4444]">*</span>
                </label>
                <input
                  type="text"
                  value={settingsBusinessName}
                  onChange={(e) => setSettingsBusinessName(e.target.value)}
                  className="w-full rounded-xl border border-[#DCE9E3] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#111827] focus:border-[#0A6847] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="mb-1 block text-[12px] font-semibold text-[#334155]">
                  Business Type <span className="text-[#EF4444]">*</span>
                </label>
                <div className="relative flex items-center">
                  <Store className="pointer-events-none absolute left-3 h-4 w-4 text-[#0A6847]" />
                  <select
                    value={settingsBusinessType}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSettingsBusinessType(val);
                      const labelToBlueprint: Record<string, BusinessType> = {
                        'Grocery Store': 'grocery',
                        'Supermarket & Kirana': 'grocery',
                        'Pharmacy & Medical': 'retail',
                        'Electronics & Mobile': 'retail',
                        'Salon & Spa': 'salon',
                        'Restaurant & Cafe': 'restaurant',
                        'Service Business': 'services',
                        'Wholesale & Distribution': 'wholesale',
                      };
                      const bpType = labelToBlueprint[val] || 'grocery';
                      const channels = DEFAULT_CHANNELS_FOR_BUSINESS_TYPE[bpType];
                      const resolvedCaps = resolveBlueprintCapabilities(bpType, channels);
                      void onUpdateStoreSettings({
                        businessType: val,
                        blueprintType: bpType,
                        salesChannels: channels,
                        capabilities: resolvedCaps as unknown as Record<string, boolean>,
                      });
                    }}
                    className="w-full appearance-none rounded-xl border border-[#DCE9E3] bg-white py-2 pl-9 pr-8 text-[13px] font-semibold text-[#111827] focus:border-[#0A6847] focus:outline-hidden"
                  >
                    <option value="Grocery Store">Grocery Store</option>
                    <option value="Supermarket & Kirana">Supermarket &amp; Kirana</option>
                    <option value="Pharmacy & Medical">Pharmacy &amp; Medical</option>
                    <option value="Electronics & Mobile">Electronics &amp; Mobile</option>
                    <option value="Salon & Spa">Salon &amp; Spa</option>
                    <option value="Restaurant & Cafe">Restaurant &amp; Cafe</option>
                    <option value="Service Business">Service Business</option>
                    <option value="Wholesale & Distribution">Wholesale &amp; Distribution</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-[#64748B]" />
                </div>
              </div>
            </div>

            {/* Row 2: Owner Name | Phone Number * */}
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-[#334155]">
                  Owner Name
                </label>
                <input
                  type="text"
                  value={settingsOwnerName}
                  onChange={(e) => setSettingsOwnerName(e.target.value)}
                  className="w-full rounded-xl border border-[#DCE9E3] bg-white px-3.5 py-2 text-[13px] font-medium text-[#111827] focus:border-[#0A6847] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="mb-1 block text-[12px] font-semibold text-[#334155]">
                  Phone Number <span className="text-[#EF4444]">*</span>
                </label>
                <div className="flex items-center overflow-hidden rounded-xl border border-[#DCE9E3] bg-white focus-within:border-[#0A6847]">
                  <div className="flex items-center gap-1 border-r border-[#DCE9E3] bg-[#F8FCFA] px-2.5 py-2 text-[12.5px] font-semibold text-[#334155]">
                    <span>🇮🇳</span>
                    <span>+91</span>
                    <ChevronDown className="h-3.5 w-3.5 text-[#64748B]" />
                  </div>
                  <input
                    type="text"
                    value={settingsPhoneNumber}
                    onChange={(e) => setSettingsPhoneNumber(e.target.value)}
                    className="w-full bg-white px-3 py-2 text-[13px] font-semibold text-[#111827] focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Row 3: Email Address | Website (Optional) */}
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-[#334155]">
                  Email Address
                </label>
                <input
                  type="email"
                  value={settingsEmailAddress}
                  onChange={(e) => setSettingsEmailAddress(e.target.value)}
                  className="w-full rounded-xl border border-[#DCE9E3] bg-white px-3.5 py-2 text-[13px] font-medium text-[#111827] focus:border-[#0A6847] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="mb-1 block text-[12px] font-semibold text-[#334155]">
                  Website <span className="font-normal text-[#64748B]">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={settingsWebsite}
                  onChange={(e) => setSettingsWebsite(e.target.value)}
                  className="w-full rounded-xl border border-[#DCE9E3] bg-white px-3.5 py-2 text-[13px] font-medium text-[#111827] focus:border-[#0A6847] focus:outline-hidden"
                />
              </div>
            </div>

            {/* Row 4: Full-Width Business Address * */}
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-[#334155]">
                Business Address <span className="text-[#EF4444]">*</span>
              </label>
              <input
                type="text"
                value={settingsAddress}
                onChange={(e) => setSettingsAddress(e.target.value)}
                className="w-full rounded-xl border border-[#DCE9E3] bg-white px-3.5 py-2 text-[13px] font-medium text-[#111827] focus:border-[#0A6847] focus:outline-hidden"
              />
            </div>

            {/* Row 5: City | State | PIN Code */}
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-[12px] font-semibold text-[#334155]">
                  City
                </label>
                <input
                  type="text"
                  value={settingsCity}
                  onChange={(e) => setSettingsCity(e.target.value)}
                  className="w-full rounded-xl border border-[#DCE9E3] bg-white px-3.5 py-2 text-[13px] font-medium text-[#111827] focus:border-[#0A6847] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="mb-1 block text-[12px] font-semibold text-[#334155]">
                  State
                </label>
                <div className="relative flex items-center">
                  <select
                    value={settingsState}
                    onChange={(e) => setSettingsState(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-[#DCE9E3] bg-white py-2 pl-3.5 pr-8 text-[13px] font-medium text-[#111827] focus:border-[#0A6847] focus:outline-hidden"
                  >
                    <option value="Uttar Pradesh">Uttar Pradesh</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Gujarat">Gujarat</option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                    <option value="Haryana">Haryana</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-[#64748B]" />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[12px] font-semibold text-[#334155]">
                  PIN Code
                </label>
                <input
                  type="text"
                  value={settingsPinCode}
                  onChange={(e) => setSettingsPinCode(e.target.value)}
                  className="w-full rounded-xl border border-[#DCE9E3] bg-white px-3.5 py-2 text-[13px] font-medium text-[#111827] focus:border-[#0A6847] focus:outline-hidden"
                />
              </div>
            </div>

            {/* Row 6: Business Logo (left) | Business Description (Optional) (right) */}
            <div className="grid grid-cols-1 gap-4 pt-2 border-t border-[#EDF4F0] sm:grid-cols-12">
              {/* Business Logo (5 cols) */}
              <div className="sm:col-span-5 space-y-2">
                <label className="block text-[12px] font-semibold text-[#334155]">
                  Business Logo
                </label>
                <div className="flex items-center gap-3">
                  {/* Storefront Logo Thumbnail */}
                  <div className="relative flex h-16 w-16 shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl border border-[#DCE9E3] bg-gradient-to-b from-[#E6F6F0] to-[#FEF3C7] shadow-2xs">
                    <div className="w-full bg-[#D97706] py-0.5 text-center text-[7px] font-extrabold uppercase tracking-wider text-white">
                      {settingsBusinessName}
                    </div>
                    <Store className="mt-1 h-7 w-7 text-[#0A6847]" />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setToast('Logo upload is coming soon.');
                        setTimeout(() => setToast(null), 2500);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCE9E3] bg-[#F8FCFA] px-3 py-1.5 text-[12px] font-bold text-[#1E293B] hover:bg-[#E6F6F0] hover:text-[#0A6847] transition"
                    >
                      <Upload className="h-3.5 w-3.5 text-[#0A6847]" />
                      <span>Upload Logo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setToast('Logo removal is coming soon.');
                        setTimeout(() => setToast(null), 2500);
                      }}
                      className="rounded-lg border border-[#DCE9E3] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#64748B] hover:bg-slate-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-[#64748B]">
                  Recommended size: 512 x 512 px (JPG, PNG)
                </p>
              </div>

              {/* Business Description (Optional) (7 cols) */}
              <div className="sm:col-span-7 flex flex-col">
                <label className="mb-1 block text-[12px] font-semibold text-[#334155]">
                  Business Description <span className="font-normal text-[#64748B]">(Optional)</span>
                </label>
                <div className="relative flex-1">
                  <textarea
                    rows={3}
                    maxLength={300}
                    value={settingsDescription}
                    onChange={(e) => setSettingsDescription(e.target.value)}
                    className="w-full rounded-xl border border-[#DCE9E3] bg-white p-3 pb-6 text-[12.5px] leading-relaxed text-[#111827] focus:border-[#0A6847] focus:outline-hidden"
                  />
                  <span className="pointer-events-none absolute right-3 bottom-2 text-[11px] font-medium text-[#94A3B8]">
                    {settingsDescription.length}/300
                  </span>
                </div>
              </div>
            </div>

            {settingsSection === 'businessType' && (
              <div className="mt-4 space-y-4 rounded-2xl border border-[#DCE9E3] bg-[#F8FCFA] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-[14px] font-extrabold text-[#111827]">
                      Business Blueprint, Channels &amp; Country Pack
                    </h3>
                    <p className="text-[11.5px] text-[#64748B]">
                      Adapt POS, Dining, Appointments, Tax Rules &amp; Refund Policies to your industry and market.
                    </p>
                  </div>
                  <span className="rounded-full bg-[#E6F6F0] px-2.5 py-0.5 text-[11px] font-bold text-[#0A6847]">
                    {COUNTRY_PACKS[storeSettings.countryCode || 'IN']?.flag}{' '}
                    {COUNTRY_PACKS[storeSettings.countryCode || 'IN']?.name} •{' '}
                    {COUNTRY_PACKS[storeSettings.countryCode || 'IN']?.tax.label}
                  </span>
                </div>

                {/* Blueprint Industry Presets */}
                <div>
                  <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wider text-[#64748B]">
                    Industry Blueprint Preset
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {(
                      ['grocery', 'retail', 'restaurant', 'salon', 'services', 'wholesale'] as BusinessType[]
                    ).map((bp) => {
                      const meta = BUSINESS_TYPE_LABELS[bp];
                      const active = (storeSettings.blueprintType || 'grocery') === bp;
                      return (
                        <button
                          key={bp}
                          type="button"
                          onClick={() => {
                            const channels = DEFAULT_CHANNELS_FOR_BUSINESS_TYPE[bp];
                            const resolved = resolveBlueprintCapabilities(bp, channels);
                            setSettingsBusinessType(meta.label);
                            void onUpdateStoreSettings({
                              businessType: meta.label,
                              blueprintType: bp,
                              salesChannels: channels,
                              capabilities: resolved as unknown as Record<string, boolean>,
                            });
                            setToast(`Applied ${meta.label} Blueprint & Capabilities`);
                            setTimeout(() => setToast(null), 2500);
                          }}
                          className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-[12px] transition ${
                            active
                              ? 'border-[#0A6847] bg-[#E6F6F0] font-bold text-[#064E3B]'
                              : 'border-[#DCE9E3] bg-white font-semibold text-[#334155] hover:border-[#0A6847]'
                          }`}
                        >
                          <span className="text-[15px]">{meta.icon}</span>
                          <span className="truncate">{meta.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Country & Tax Pack Selector */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[11.5px] font-bold uppercase tracking-wider text-[#64748B]">
                      Country &amp; Tax Pack
                    </label>
                    <select
                      value={storeSettings.countryCode || 'IN'}
                      onChange={(e) => {
                        const code = e.target.value as CountryCode;
                        const pack = getCountryPack(code);
                        void onUpdateStoreSettings({
                          countryCode: code,
                          currencySymbol: pack.currency.symbol,
                        });
                        setToast(
                          `Switched to ${pack.flag} ${pack.name} (${pack.currency.code} • ${pack.tax.label} ${pack.tax.defaultRate}%)`,
                        );
                        setTimeout(() => setToast(null), 2500);
                      }}
                      className="w-full rounded-xl border border-[#DCE9E3] bg-white px-3 py-2 text-[12.5px] font-semibold text-[#111827]"
                    >
                      {(['IN', 'US', 'CA', 'AU', 'GB', 'GLOBAL'] as CountryCode[]).map((c) => {
                        const pk = COUNTRY_PACKS[c];
                        return (
                          <option key={c} value={c}>
                            {pk.flag} {pk.name} ({pk.currency.symbol} {pk.currency.code} • {pk.tax.label})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-[11.5px] font-bold uppercase tracking-wider text-[#64748B]">
                      Cancellation &amp; Refund Policy
                    </label>
                    <select
                      value={storeSettings.cancellationPolicy || 'before_preparation'}
                      onChange={(e) => {
                        const policy = e.target.value as NonNullable<
                          BosStoreSettings['cancellationPolicy']
                        >;
                        void onUpdateStoreSettings({ cancellationPolicy: policy });
                        setToast(`Updated order cancellation policy`);
                        setTimeout(() => setToast(null), 2500);
                      }}
                      className="w-full rounded-xl border border-[#DCE9E3] bg-white px-3 py-2 text-[12.5px] font-semibold text-[#111827]"
                    >
                      <option value="before_confirmation">Allow cancel before order accepted</option>
                      <option value="before_preparation">Allow cancel before preparing / packed</option>
                      <option value="30m_before_appointment">Allow cancel 30m before appointment</option>
                      <option value="24h_before_appointment">Allow cancel 24h before appointment</option>
                    </select>
                  </div>
                </div>

                {/* Active Sales Channels Toggles */}
                <div>
                  <label className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-wider text-[#64748B]">
                    Active Sales Channels
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { id: 'counter_pos', label: 'Counter POS' },
                        { id: 'online_store', label: 'Online Store' },
                        { id: 'whatsapp', label: 'WhatsApp Orders' },
                        { id: 'delivery', label: 'Local Delivery' },
                        { id: 'pickup', label: 'Click & Collect' },
                        { id: 'dine_in', label: 'Dine-In / Tables' },
                        { id: 'appointments', label: 'Appointments' },
                      ] as Array<{ id: SalesChannel; label: string }>
                    ).map((ch) => {
                      const currentChannels =
                        storeSettings.salesChannels ||
                        DEFAULT_CHANNELS_FOR_BUSINESS_TYPE[
                          storeSettings.blueprintType || 'grocery'
                        ];
                      const isEnabled = currentChannels.includes(ch.id);
                      return (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => {
                            const nextChannels = isEnabled
                              ? currentChannels.filter((x) => x !== ch.id)
                              : [...currentChannels, ch.id];
                            const bp = storeSettings.blueprintType || 'grocery';
                            const resolved = resolveBlueprintCapabilities(bp, nextChannels);
                            void onUpdateStoreSettings({
                              salesChannels: nextChannels,
                              capabilities: resolved as unknown as Record<string, boolean>,
                            });
                          }}
                          className={`rounded-lg border px-2.5 py-1 text-[11.5px] font-semibold transition ${
                            isEnabled
                              ? 'border-[#0A6847] bg-[#0A6847] text-white'
                              : 'border-[#DCE9E3] bg-white text-[#475569]'
                          }`}
                        >
                          {isEnabled ? '✓ ' : '+ '}
                          {ch.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Stacked Preview Cards (3 cols): Store Preview + Business Hours */}
        <div className="lg:col-span-3 space-y-4">
          {/* Card 1: Store Preview */}
          <div className="bos-card p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-[14.5px] font-extrabold text-[#111827]">Store Preview</h3>
              <button
                type="button"
                onClick={() => {
                  if (typeof window === 'undefined') return;
                  const slug = storeSettings.businessSlug;
                  if (slug) {
                    window.open(`/store/${slug}`, '_blank', 'noopener,noreferrer');
                  } else {
                    setToast('Set a Store Slug in your business profile to enable the live store preview.');
                    setTimeout(() => setToast(null), 3000);
                  }
                }}
                className="rounded-lg bg-[#E6F6F0] px-2.5 py-1 text-[11.5px] font-bold text-[#0A6847] hover:bg-[#D1FAE5] transition"
              >
                View Store
              </button>
            </div>

            <div className="flex items-start gap-3">
              {/* Circular Store Thumbnail */}
              <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center overflow-hidden rounded-full border-2 border-[#A7F3D0] bg-gradient-to-b from-[#E6F6F0] to-[#FEF3C7] shadow-2xs">
                <Store className="h-6 w-6 text-[#0A6847]" />
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <h4 className="text-[14.5px] font-extrabold text-[#111827] truncate">
                  {settingsBusinessName}
                </h4>
                <p className="text-[11.5px] text-[#64748B] line-clamp-2 leading-snug">
                  Daily essentials, fresh groceries and more.
                </p>
                <div className="pt-1 space-y-1 text-[11.5px] text-[#334155]">
                  <p className="flex items-center gap-1.5 font-medium">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-[#0A6847]" />
                    <span>+91 {settingsPhoneNumber}</span>
                  </p>
                  <p className="flex items-center gap-1.5 font-medium">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-[#0A6847]" />
                    <span className="truncate">
                      {settingsCity}, {settingsState}
                    </span>
                  </p>
                </div>
                <div className="pt-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E6F6F0] px-2.5 py-0.5 text-[11px] font-bold text-[#0A6847]">
                    <span className="h-2 w-2 rounded-full bg-[#10B981]" />
                    Store is Live
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setToast('Logo & Branding settings are coming soon.');
                setTimeout(() => setToast(null), 2500);
              }}
              className="w-full rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] py-2 text-[12.5px] font-bold text-[#1E293B] hover:border-[#0A6847] hover:bg-[#E6F6F0]/40 transition"
            >
              Edit Store Appearance
            </button>
          </div>

          {/* Card 2: Business Hours */}
          <div className="bos-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[14.5px] font-extrabold text-[#111827]">Business Hours</h3>
              <button
                type="button"
                onClick={() => setEditingHours((prev) => !prev)}
                className="rounded-lg bg-[#E6F6F0] px-2.5 py-1 text-[11.5px] font-bold text-[#0A6847] hover:bg-[#D1FAE5] transition"
              >
                {editingHours ? 'Done' : 'Edit'}
              </button>
            </div>

            {editingHours && (
              <div className="rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] p-2.5">
                <label className="block text-[10.5px] font-bold uppercase text-[#64748B] mb-1">
                  Standard Daily Hours
                </label>
                <input
                  type="text"
                  value={defaultDayHours}
                  onChange={(e) => setDefaultDayHours(e.target.value)}
                  className="w-full rounded-lg border border-[#DCE9E3] bg-white px-2.5 py-1 text-[12px] font-semibold text-[#111827]"
                />
              </div>
            )}

            <div className="space-y-2 text-[12px]">
              {daysOfWeek.map((day) => (
                <div key={day} className="flex items-center justify-between">
                  <span className="font-medium text-[#475569]">{day}</span>
                  <span className="font-semibold text-[#111827]">{defaultDayHours}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 border-t border-[#EDF4F0] pt-2.5 text-[11.5px]">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#10B981]" />
              <span className="font-bold text-[#0A6847]">Open Now</span>
              <span className="text-[#CBD5E1]">|</span>
              <span className="font-medium text-[#64748B]">Closes at 10:00 PM</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom 4 Summary Cards Row: GST Information | Subscription Plan | Users & Staff | Security */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {/* 1. GST Information Card */}
        <div className="bos-card p-4 flex flex-col justify-between space-y-3.5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[14.5px] font-extrabold text-[#111827]">GST Information</h3>
              <button
                type="button"
                onClick={() => setGstModalOpen((prev) => !prev)}
                className="rounded-lg bg-[#E6F6F0] px-2.5 py-1 text-[11.5px] font-bold text-[#0A6847] hover:bg-[#D1FAE5] transition"
              >
                Configure
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E6F6F0] text-[10px] font-extrabold text-[#0A6847]">
                GST
              </div>
              <div>
                <p className="text-[11px] font-medium text-[#64748B]">GSTIN</p>
                <p className="font-mono text-[14px] font-extrabold text-[#111827]">
                  {settingsGstin}
                </p>
              </div>
            </div>

            {gstModalOpen && (
              <div className="rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] p-2.5 space-y-2">
                <input
                  type="text"
                  value={settingsGstin}
                  onChange={(e) => setSettingsGstin(e.target.value.toUpperCase())}
                  placeholder="Enter 15-digit GSTIN"
                  className="w-full rounded-lg border border-[#DCE9E3] bg-white px-2.5 py-1 font-mono text-[12px] font-bold text-[#111827]"
                />
                <div className="flex items-center justify-between text-[11.5px]">
                  <span className="font-semibold text-[#475569]">e-Invoice Active</span>
                  <input
                    type="checkbox"
                    checked={settingsEInvoiceEnabled}
                    onChange={(e) => setSettingsEInvoiceEnabled(e.target.checked)}
                    className="h-4 w-4 accent-[#0A6847]"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-[#EDF4F0] pt-3 text-[12px]">
            <div>
              <p className="text-[11px] text-[#64748B]">Registration Type</p>
              <p className="mt-0.5 font-extrabold text-[#111827]">{settingsRegType}</p>
            </div>
            <div>
              <p className="text-[11px] text-[#64748B]">e-Invoice Status</p>
              <p className="mt-0.5 inline-flex items-center gap-1.5 font-extrabold text-[#0A6847]">
                <span className="h-2 w-2 rounded-full bg-[#10B981]" />
                {settingsEInvoiceEnabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
          </div>
        </div>

        {/* 2. Subscription Plan Card */}
        <div className="bos-card p-4 flex flex-col justify-between space-y-3.5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[14.5px] font-extrabold text-[#111827]">Subscription Plan</h3>
              <button
                type="button"
                onClick={() => {
                  if (onOpenUpgradeModal) {
                    onOpenUpgradeModal();
                  } else {
                    setToast('Manage your plan in Settings > Billing.');
                    setTimeout(() => setToast(null), 3000);
                  }
                }}
                className="rounded-lg bg-[#E6F6F0] px-2.5 py-1 text-[11.5px] font-bold text-[#0A6847] hover:bg-[#D1FAE5] transition"
              >
                Manage
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FEF3C7] text-[#D97706]">
                <Crown className="h-5 w-5" />
              </div>
              <div>
                {demoMode ? (
                  <>
                    <p className="text-[14.5px] font-extrabold text-[#111827]">Pro Plan</p>
                    <p className="text-[11.5px] text-[#64748B]">Demo mode</p>
                  </>
                ) : subscriptionLoading ? (
                  <>
                    <p className="text-[14.5px] font-extrabold text-[#111827]">Loading…</p>
                    <p className="text-[11.5px] text-[#64748B]">Fetching your plan</p>
                  </>
                ) : subscriptionPlan && subscriptionPlan.plan ? (
                  <>
                    <p className="text-[14.5px] font-extrabold text-[#111827] capitalize">
                      {subscriptionPlan.plan} Plan
                    </p>
                    <p className="text-[11.5px] text-[#64748B]">
                      {subscriptionPlan.renewalDate
                        ? `Renews ${new Date(subscriptionPlan.renewalDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
                        : subscriptionPlan.status
                          ? subscriptionPlan.status.charAt(0).toUpperCase() + subscriptionPlan.status.slice(1)
                          : 'Active'}
                      {subscriptionPlan.billingCycle ? ` • ${subscriptionPlan.billingCycle}` : ''}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-[14.5px] font-extrabold text-[#111827]">No active plan</p>
                    <p className="text-[11.5px] text-[#64748B]">Manage your plan in Settings &gt; Billing</p>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1.5 border-t border-[#EDF4F0] pt-2.5 text-[12px]">
            {(demoMode
              ? [
                  'All Features',
                  'Up to 5 Staff Members',
                  'Online Store',
                  'Priority Support',
                ]
              : subscriptionPlan && subscriptionPlan.maxUsers
                ? [
                    `${subscriptionPlan.plan ? subscriptionPlan.plan.charAt(0).toUpperCase() + subscriptionPlan.plan.slice(1) : 'Current'} plan`,
                    `Up to ${subscriptionPlan.maxUsers} staff members`,
                    'Online Store',
                    'Priority Support',
                  ]
                : [
                    'Manage your plan',
                    'in Settings > Billing',
                    'to see your',
                    'active features',
                  ]
            ).map((feat) => (
              <div key={feat} className="flex items-center gap-2 text-[#334155]">
                <Check className="h-3.5 w-3.5 shrink-0 text-[#0A6847] stroke-[2.5]" />
                <span className="font-medium">{feat}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Users & Staff Card */}
        <div className="bos-card p-4 flex flex-col justify-between space-y-3.5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[14.5px] font-extrabold text-[#111827]">Users &amp; Staff</h3>
              <button
                type="button"
                onClick={() => {
                  setToast('Manage staff in Settings > Users & Staff.');
                  setTimeout(() => setToast(null), 3000);
                }}
                className="rounded-lg bg-[#E6F6F0] px-2.5 py-1 text-[11.5px] font-bold text-[#0A6847] hover:bg-[#D1FAE5] transition"
              >
                Manage
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E6F6F0] text-[#0A6847]">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[14.5px] font-extrabold text-[#111827]">
                  {activeUsersCount} Active User{activeUsersCount === 1 ? '' : 's'}
                </p>
                <p className="text-[11.5px] text-[#64748B]">
                  {demoMode ? '2 Admin • 3 Staff' : 'Owner account'}
                </p>
              </div>
            </div>

            {/* Avatar Stack */}
            <div className="flex items-center -space-x-2 pt-0.5">
              {[
                { initials: 'RK', bg: 'bg-[#0A6847]' },
                { initials: 'AS', bg: 'bg-[#0D9488]' },
                { initials: 'PK', bg: 'bg-[#2563EB]' },
                { initials: 'VR', bg: 'bg-[#D97706]' },
              ].map((av) => (
                <div
                  key={av.initials}
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[10.5px] font-bold text-white ${av.bg}`}
                >
                  {av.initials}
                </div>
              ))}
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#E6F6F0] text-[10.5px] font-extrabold text-[#0A6847]">
                +2
              </div>
            </div>

            {inviteStaffModalOpen && (
              <div className="rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] p-2.5 space-y-2">
                <input
                  type="text"
                  value={inviteStaffName}
                  onChange={(e) => setInviteStaffName(e.target.value)}
                  placeholder="Staff Name or Mobile"
                  className="w-full rounded-lg border border-[#DCE9E3] bg-white px-2.5 py-1 text-[12px] font-medium"
                />
                <div className="flex gap-1.5">
                  <select
                    value={inviteStaffRole}
                    onChange={(e) => setInviteStaffRole(e.target.value)}
                    className="rounded-lg border border-[#DCE9E3] bg-white px-2 py-1 text-[11.5px]"
                  >
                    <option value="Staff">Staff</option>
                    <option value="Admin">Admin</option>
                    <option value="Cashier">Cashier</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (!inviteStaffName.trim()) return;
                      // Honest: there is no team-invite API wired up here,
                      // so we do NOT increment the active-users counter or
                      // claim success. The operator is redirected to the
                      // real Users & Staff admin page in the dashboard.
                      setToast(`Team invitations are coming soon. Use Settings > Users & Staff to invite ${inviteStaffName.trim()}.`);
                      setInviteStaffName('');
                      setInviteStaffModalOpen(false);
                      setTimeout(() => setToast(null), 3500);
                    }}
                    className="flex-1 rounded-lg bg-[#0A6847] py-1 text-[11.5px] font-bold text-white"
                  >
                    Send Invite
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setInviteStaffModalOpen((prev) => !prev)}
            className="w-full rounded-xl border border-[#DCE9E3] bg-[#F8FCFA] py-2 text-[12.5px] font-bold text-[#0A6847] hover:border-[#0A6847] hover:bg-[#E6F6F0]/40 transition"
          >
            + Invite Team Member
          </button>
        </div>

        {/* 4. Security Card */}
        <div className="bos-card p-4 flex flex-col justify-between space-y-3.5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[14.5px] font-extrabold text-[#111827]">Security</h3>
              <button
                type="button"
                onClick={() => {
                  setToast('Manage security in Settings > Security.');
                  setTimeout(() => setToast(null), 3000);
                }}
                className="rounded-lg bg-[#E6F6F0] px-2.5 py-1 text-[11.5px] font-bold text-[#0A6847] hover:bg-[#D1FAE5] transition"
              >
                Manage
              </button>
            </div>

            <div className="space-y-2.5 pt-1 text-[12px]">
              {[
                { label: 'Two-Factor Authentication', status: 'Enabled' },
                { label: 'Login Activity Monitoring', status: 'Enabled' },
                { label: 'Data Backup', status: 'Daily' },
                { label: 'Account Security', status: 'Protected' },
              ].map((sec) => (
                <div key={sec.label} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-[#0A6847]" />
                    <span className="text-[#334155] font-medium truncate">{sec.label}</span>
                  </div>
                  <span className="shrink-0 font-extrabold text-[#0A6847]">{sec.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

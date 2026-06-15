'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAppStore } from '@/store/app-store';
import {
  Plug,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Zap,
  Globe,
  KeyRound,
  RefreshCw,
  Settings2,
  Unplug,
  Plus,
  Search,
  ShoppingBag,
  Package,
  ArrowRight,
  ShoppingCart,
  Store,
  Webhook,
  Workflow,
  ChevronRight,
  LayoutGrid,
  List,
  ExternalLink,
  Copy,
  AlertCircle,
  Activity,
  TrendingUp,
  DollarSign,
  Users,
  Box,
  ArrowLeftRight,
  Send,
  MessageSquare,
  CalendarDays,
  Tag,
  Star,
  UserPlus,
  Timer,
  CreditCard,
  Eye,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface IntegrationConnection {
  id: string;
  provider: string;
  name: string;
  status: string;
  storeUrl: string | null;
  accessToken: string | null;
  apiSecret: string | null;
  scopes: string[];
  config: Record<string, unknown>;
  syncSettings: Record<string, unknown>;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastError: string | null;
  totalSyncedOrders: number;
  totalSyncedProducts: number;
  totalSyncedCustomers: number;
  webhookUrl: string | null;
  webhookVerified: boolean;
  tenantId: string | null;
  workspaceId: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { orders: number; products: number; syncLogs: number };
  syncLogs?: SyncLogEntry[];
}

interface SyncLogEntry {
  id: string;
  syncType: string;
  entity: string;
  status: string;
  recordsTotal: number;
  recordsSynced: number;
  recordsFailed: number;
  errorsJson: string;
  durationMs: number;
  createdAt: string;
  integrationId: string;
}

interface EcommerceOrder {
  id: string;
  externalOrderId: string;
  orderNumber: string | null;
  status: string;
  financialStatus: string | null;
  fulfillmentStatus: string | null;
  customerEmail: string | null;
  customerName: string | null;
  customerPhone: string | null;
  subtotal: number;
  total: number;
  currency: string;
  discountTotal: number;
  taxTotal: number;
  itemsJson: string;
  items: Array<Record<string, unknown>>;
  tagsJson: string;
  tags: string[];
  shippingAddress: Record<string, unknown> | null;
  billingAddress: Record<string, unknown> | null;
  orderedAt: string;
  integration: { id: string; provider: string; name: string };
}

interface EcommerceProduct {
  id: string;
  externalProductId: string;
  title: string;
  description: string | null;
  status: string;
  productType: string | null;
  vendor: string | null;
  sku: string | null;
  price: number;
  compareAtPrice: number | null;
  inventory: number;
  imagesJson: string;
  images: string[];
  tagsJson: string;
  tags: string[];
  variantsJson: string;
  variants: Array<Record<string, unknown>>;
  integration: { id: string; provider: string; name: string };
  createdAt: string;
  updatedAt: string;
}

interface EcommerceStats {
  ordersToday: number;
  revenueToday: number;
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  abandonedCarts: number;
  conversionRate: number;
  pendingOrders: number;
  totalProducts: number;
  activeProducts: number;
  totalCustomers: number;
  ordersLast30Days: number;
  ordersByStatus: Record<string, number>;
  topProducts: Array<{ id: string; name: string; totalQty: number; revenue: number }>;
  storeRevenueByProvider: Array<{
    provider: string;
    name: string;
    integrationId: string;
    revenue: number;
    totalOrders: number;
    totalProducts: number;
  }>;
  integrations: Array<{
    id: string;
    provider: string;
    name: string;
    status: string;
    lastSyncAt: string | null;
    lastSyncStatus: string | null;
    totalSyncedOrders: number;
    totalSyncedProducts: number;
    totalSyncedCustomers: number;
  }>;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  steps: Array<{ label: string; icon: React.ElementType; color: string }>;
  category: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SHOPIFY_COLOR = '#96bf48';
const WOOCOMMERCE_COLOR = '#7f54b3';

const STATUS_BADGE_MAP: Record<string, { label: string; className: string }> = {
  connected: { label: 'Connected', className: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  disconnected: { label: 'Disconnected', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  syncing: { label: 'Syncing', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  error: { label: 'Error', className: 'bg-red-100 text-red-800 border-red-200' },
};

const ORDER_STATUS_BADGE: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  processing: 'bg-indigo-100 text-indigo-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-slate-100 text-slate-600',
};

const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'order-confirmation',
    name: 'Order Confirmation',
    description: 'Automatically send WhatsApp confirmation and create customer records when a new order is placed.',
    icon: ShoppingCart,
    category: 'Orders',
    steps: [
      { label: 'Order Created', icon: ShoppingBag, color: 'bg-emerald-100 text-emerald-700' },
      { label: 'Send WhatsApp', icon: MessageSquare, color: 'bg-green-100 text-green-700' },
      { label: 'Create Customer', icon: UserPlus, color: 'bg-blue-100 text-blue-700' },
      { label: 'Add Timeline', icon: Clock, color: 'bg-slate-100 text-slate-700' },
    ],
  },
  {
    id: 'abandoned-cart-recovery',
    name: 'Abandoned Cart Recovery',
    description: 'Recover lost sales by sending timed WhatsApp reminders to customers who abandoned their cart.',
    icon: ShoppingCart,
    category: 'Marketing',
    steps: [
      { label: 'Cart Abandoned', icon: AlertCircle, color: 'bg-red-100 text-red-700' },
      { label: 'Wait 1 Hour', icon: Timer, color: 'bg-yellow-100 text-yellow-700' },
      { label: 'WhatsApp Reminder', icon: MessageSquare, color: 'bg-green-100 text-green-700' },
      { label: 'Wait 24 Hours', icon: Timer, color: 'bg-yellow-100 text-yellow-700' },
      { label: 'Coupon Message', icon: Tag, color: 'bg-purple-100 text-purple-700' },
    ],
  },
  {
    id: 'order-to-booking',
    name: 'Order to Booking',
    description: 'Convert product purchases into service bookings with automatic employee assignment.',
    icon: CalendarDays,
    category: 'Operations',
    steps: [
      { label: 'Product Purchased', icon: ShoppingBag, color: 'bg-emerald-100 text-emerald-700' },
      { label: 'Create Booking', icon: CalendarDays, color: 'bg-blue-100 text-blue-700' },
      { label: 'Assign Employee', icon: Users, color: 'bg-indigo-100 text-indigo-700' },
      { label: 'Send WhatsApp', icon: MessageSquare, color: 'bg-green-100 text-green-700' },
    ],
  },
  {
    id: 'review-request',
    name: 'Review Request',
    description: 'Automatically request reviews from customers a few days after order delivery.',
    icon: Star,
    category: 'Marketing',
    steps: [
      { label: 'Order Delivered', icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-700' },
      { label: 'Wait 3 Days', icon: Timer, color: 'bg-yellow-100 text-yellow-700' },
      { label: 'Request Review', icon: Star, color: 'bg-amber-100 text-amber-700' },
    ],
  },
  {
    id: 'upsell-campaign',
    name: 'Upsell Campaign',
    description: 'Send targeted upsell messages based on customer segment after purchase.',
    icon: TrendingUp,
    category: 'Marketing',
    steps: [
      { label: 'Order Delivered', icon: CheckCircle2, color: 'bg-emerald-100 text-emerald-700' },
      { label: 'Check Segment', icon: Users, color: 'bg-blue-100 text-blue-700' },
      { label: 'Send Upsell', icon: Send, color: 'bg-purple-100 text-purple-700' },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTimeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Never';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return date.toLocaleDateString();
  } catch {
    return 'Unknown';
  }
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

function getProviderColor(provider: string): string {
  if (provider === 'shopify') return SHOPIFY_COLOR;
  if (provider === 'woocommerce') return WOOCOMMERCE_COLOR;
  return '#64748b';
}

function getProviderLabel(provider: string): string {
  const map: Record<string, string> = { shopify: 'Shopify', woocommerce: 'WooCommerce', magento: 'Magento', bigcommerce: 'BigCommerce' };
  return map[provider] || provider;
}

function getProviderIcon(provider: string) {
  if (provider === 'shopify') return ShoppingBag;
  if (provider === 'woocommerce') return Store;
  return Globe;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function IntegrationsView() {
  const { setActiveView } = useAppStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [integrations, setIntegrations] = useState<IntegrationConnection[]>([]);
  const [stats, setStats] = useState<EcommerceStats | null>(null);
  const [orders, setOrders] = useState<EcommerceOrder[]>([]);
  const [products, setProducts] = useState<EcommerceProduct[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [shopifyDialogOpen, setShopifyDialogOpen] = useState(false);
  const [wooDialogOpen, setWooDialogOpen] = useState(false);
  const [orderDetailDialog, setOrderDetailDialog] = useState<EcommerceOrder | null>(null);
  const [productViewMode, setProductViewMode] = useState<'grid' | 'list'>('grid');

  // Filters
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [orderProviderFilter, setOrderProviderFilter] = useState('all');
  const [productSearch, setProductSearch] = useState('');
  const [productStatusFilter, setProductStatusFilter] = useState('all');
  const [productProviderFilter, setProductProviderFilter] = useState('all');

  // Shopify setup state
  const [shopifyStep, setShopifyStep] = useState(0);
  const [shopifyStoreUrl, setShopifyStoreUrl] = useState('');
  const [shopifyAccessToken, setShopifyAccessToken] = useState('');
  const [shopifySyncSettings, setShopifySyncSettings] = useState({
    customers: true, orders: true, products: true, carts: false,
  });
  const [shopifyConnecting, setShopifyConnecting] = useState(false);

  // WooCommerce setup state
  const [wooStep, setWooStep] = useState(0);
  const [wooStoreUrl, setWooStoreUrl] = useState('');
  const [wooConsumerKey, setWooConsumerKey] = useState('');
  const [wooConsumerSecret, setWooConsumerSecret] = useState('');
  const [wooSyncSettings, setWooSyncSettings] = useState({
    customers: true, orders: true, products: true, coupons: false, subscriptions: false,
  });
  const [wooConnecting, setWooConnecting] = useState(false);

  // Syncing state
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

  // ─── Data Fetching ───────────────────────────────────────────────────────

  const fetchIntegrations = useCallback(async () => {
    setLoading((p) => ({ ...p, integrations: true }));
    try {
      const res = await fetch('/api/integrations');
      if (!res.ok) throw new Error('Failed to fetch integrations');
      const data = await res.json();
      setIntegrations(data.integrations || []);
    } catch (err) {
      toast.error('Failed to load integrations');
    } finally {
      setLoading((p) => ({ ...p, integrations: false }));
    }
  }, []);

  const fetchStats = useCallback(async () => {
    setLoading((p) => ({ ...p, stats: true }));
    try {
      const res = await fetch('/api/ecommerce/stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      toast.error('Failed to load stats');
    } finally {
      setLoading((p) => ({ ...p, stats: false }));
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading((p) => ({ ...p, orders: true }));
    try {
      const params = new URLSearchParams();
      if (orderSearch) params.set('search', orderSearch);
      if (orderStatusFilter !== 'all') params.set('status', orderStatusFilter);
      if (orderProviderFilter !== 'all') params.set('provider', orderProviderFilter);
      params.set('limit', '50');
      const res = await fetch(`/api/ecommerce/orders?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err) {
      toast.error('Failed to load orders');
    } finally {
      setLoading((p) => ({ ...p, orders: false }));
    }
  }, [orderSearch, orderStatusFilter, orderProviderFilter]);

  const fetchProducts = useCallback(async () => {
    setLoading((p) => ({ ...p, products: true }));
    try {
      const params = new URLSearchParams();
      if (productSearch) params.set('search', productSearch);
      if (productStatusFilter !== 'all') params.set('status', productStatusFilter);
      if (productProviderFilter !== 'all') params.set('provider', productProviderFilter);
      params.set('limit', '50');
      const res = await fetch(`/api/ecommerce/products?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch products');
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading((p) => ({ ...p, products: false }));
    }
  }, [productSearch, productStatusFilter, productProviderFilter]);

  // Initial load
  useEffect(() => {
    fetchIntegrations();
    fetchStats();
  }, [fetchIntegrations, fetchStats]);

  // Load orders when on orders tab
  useEffect(() => {
    if (activeTab === 'orders') fetchOrders();
  }, [activeTab, fetchOrders]);

  // Load products when on products tab
  useEffect(() => {
    if (activeTab === 'products') fetchProducts();
  }, [activeTab, fetchProducts]);

  // ─── Derived State ───────────────────────────────────────────────────────

  const shopifyIntegration = useMemo(
    () => integrations.find((i) => i.provider === 'shopify'),
    [integrations]
  );
  const wooIntegration = useMemo(
    () => integrations.find((i) => i.provider === 'woocommerce'),
    [integrations]
  );
  const connectedIntegrations = useMemo(
    () => integrations.filter((i) => i.status === 'connected'),
    [integrations]
  );

  // ─── Actions ─────────────────────────────────────────────────────────────

  const handleSyncNow = async (integrationId: string) => {
    setSyncingId(integrationId);
    try {
      const res = await fetch(`/api/integrations/${integrationId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncType: 'full', entities: ['orders', 'products', 'customers'] }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Sync failed');
      }
      toast.success('Sync completed successfully');
      fetchIntegrations();
      fetchStats();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncingId(null);
    }
  };

  const handleDisconnect = async (integrationId: string) => {
    setDisconnectingId(integrationId);
    try {
      const res = await fetch(`/api/integrations/${integrationId}/disconnect`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Disconnect failed');
      }
      toast.success('Integration disconnected');
      fetchIntegrations();
      fetchStats();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Disconnect failed');
    } finally {
      setDisconnectingId(null);
    }
  };

  const handleShopifyConnect = async () => {
    setShopifyConnecting(true);
    try {
      // Create integration if not exists
      let intId = shopifyIntegration?.id;
      if (!intId) {
        const createRes = await fetch('/api/integrations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: 'shopify',
            name: shopifyStoreUrl.replace('.myshopify.com', ''),
            storeUrl: shopifyStoreUrl,
            accessToken: shopifyAccessToken,
            syncSettings: shopifySyncSettings,
          }),
        });
        if (!createRes.ok) throw new Error('Failed to create integration');
        const createData = await createRes.json();
        intId = createData.integration.id;
      }

      // Connect
      const connectRes = await fetch(`/api/integrations/${intId}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeUrl: shopifyStoreUrl,
          accessToken: shopifyAccessToken,
          scopes: ['read_orders', 'read_products', 'read_customers'],
        }),
      });
      if (!connectRes.ok) {
        const data = await connectRes.json().catch(() => ({}));
        throw new Error(data.error || 'Connection failed');
      }

      // Update sync settings
      await fetch(`/api/integrations/${intId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncSettings: shopifySyncSettings }),
      });

      toast.success('Shopify store connected successfully!');
      setShopifyDialogOpen(false);
      resetShopifyForm();
      fetchIntegrations();
      fetchStats();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to connect Shopify');
    } finally {
      setShopifyConnecting(false);
    }
  };

  const handleWooConnect = async () => {
    setWooConnecting(true);
    try {
      let intId = wooIntegration?.id;
      if (!intId) {
        const createRes = await fetch('/api/integrations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: 'woocommerce',
            name: new URL(wooStoreUrl).hostname.replace('www.', ''),
            storeUrl: wooStoreUrl,
            accessToken: wooConsumerKey,
            apiSecret: wooConsumerSecret,
            syncSettings: wooSyncSettings,
          }),
        });
        if (!createRes.ok) throw new Error('Failed to create integration');
        const createData = await createRes.json();
        intId = createData.integration.id;
      }

      const connectRes = await fetch(`/api/integrations/${intId}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeUrl: wooStoreUrl,
          accessToken: wooConsumerKey,
          apiSecret: wooConsumerSecret,
          scopes: ['read', 'write'],
        }),
      });
      if (!connectRes.ok) {
        const data = await connectRes.json().catch(() => ({}));
        throw new Error(data.error || 'Connection failed');
      }

      await fetch(`/api/integrations/${intId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ syncSettings: wooSyncSettings }),
      });

      toast.success('WooCommerce store connected successfully!');
      setWooDialogOpen(false);
      resetWooForm();
      fetchIntegrations();
      fetchStats();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to connect WooCommerce');
    } finally {
      setWooConnecting(false);
    }
  };

  const resetShopifyForm = () => {
    setShopifyStep(0);
    setShopifyStoreUrl('');
    setShopifyAccessToken('');
    setShopifySyncSettings({ customers: true, orders: true, products: true, carts: false });
  };

  const resetWooForm = () => {
    setWooStep(0);
    setWooStoreUrl('');
    setWooConsumerKey('');
    setWooConsumerSecret('');
    setWooSyncSettings({ customers: true, orders: true, products: true, coupons: false, subscriptions: false });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success('Copied to clipboard'));
  };

  // ─── Render: Overview Tab ────────────────────────────────────────────────

  const renderOverview = () => {
    const statCards = [
      { title: 'Connected Stores', value: connectedIntegrations.length, icon: Store, color: 'text-emerald-600', bg: 'bg-emerald-50' },
      { title: 'Total Orders', value: stats?.totalOrders ?? 0, icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50' },
      { title: 'Total Revenue', value: formatCurrency(stats?.totalRevenue ?? 0), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
      { title: 'Total Products', value: stats?.totalProducts ?? 0, icon: Package, color: 'text-purple-600', bg: 'bg-purple-50' },
    ];

    return (
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <Card key={card.title} className="border-slate-200">
              <CardContent className="p-4">
                {loading.stats ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-32" />
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className={cn('p-2 rounded-lg', card.bg)}>
                      <card.icon className={cn('h-5 w-5', card.color)} />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">{card.title}</p>
                      <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Metrics */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Revenue Today</p>
                    <p className="text-xl font-bold text-slate-900">{formatCurrency(stats.revenueToday)}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-50">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Avg. Order Value</p>
                    <p className="text-xl font-bold text-slate-900">{formatCurrency(stats.avgOrderValue)}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-blue-50">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Abandoned Carts</p>
                    <p className="text-xl font-bold text-slate-900">{stats.abandonedCarts}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-red-50">
                    <ShoppingCart className="h-5 w-5 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Connected Integrations */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Connected Integrations</h3>
          <Button
            onClick={() => {
              setActiveTab('shopify');
            }}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Integration
          </Button>
        </div>

        {loading.integrations ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-slate-200">
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-40" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : integrations.length === 0 ? (
          <Card className="border-dashed border-slate-300">
            <CardContent className="p-8 text-center">
              <Plug className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <h4 className="text-lg font-medium text-slate-700 mb-1">No Integrations Yet</h4>
              <p className="text-sm text-slate-500 mb-4">
                Connect your e-commerce stores to start syncing orders, products, and customers.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('shopify')}
                  className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                >
                  <ShoppingBag className="h-4 w-4 mr-2" style={{ color: SHOPIFY_COLOR }} />
                  Connect Shopify
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('woocommerce')}
                  className="border-purple-300 text-purple-700 hover:bg-purple-50"
                >
                  <Store className="h-4 w-4 mr-2" style={{ color: WOOCOMMERCE_COLOR }} />
                  Connect WooCommerce
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrations.map((intg) => {
              const ProviderIcon = getProviderIcon(intg.provider);
              const statusInfo = STATUS_BADGE_MAP[intg.status] || STATUS_BADGE_MAP.disconnected;
              return (
                <Card key={intg.id} className="border-slate-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: `${getProviderColor(intg.provider)}15` }}
                        >
                          <ProviderIcon
                            className="h-5 w-5"
                            style={{ color: getProviderColor(intg.provider) }}
                          />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{intg.name}</p>
                          <p className="text-xs text-slate-500">{getProviderLabel(intg.provider)}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={cn('text-xs', statusInfo.className)}>
                        {statusInfo.label}
                      </Badge>
                    </div>

                    {intg.storeUrl && (
                      <p className="text-sm text-slate-500 mb-2 truncate" title={intg.storeUrl}>
                        {intg.storeUrl}
                      </p>
                    )}

                    <Separator className="my-3" />

                    <div className="grid grid-cols-3 gap-2 text-center mb-3">
                      <div>
                        <p className="text-lg font-bold text-slate-900">{intg.totalSyncedOrders}</p>
                        <p className="text-xs text-slate-500">Orders</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-slate-900">{intg.totalSyncedProducts}</p>
                        <p className="text-xs text-slate-500">Products</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-slate-900">{intg.totalSyncedCustomers}</p>
                        <p className="text-xs text-slate-500">Customers</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Last sync: {formatTimeAgo(intg.lastSyncAt)}</span>
                      {intg.status === 'connected' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-emerald-600 hover:text-emerald-700"
                          onClick={() => handleSyncNow(intg.id)}
                          disabled={syncingId === intg.id}
                        >
                          {syncingId === intg.id ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3 mr-1" />
                          )}
                          Sync
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Top Products */}
        {stats?.topProducts && stats.topProducts.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Top Products (Last 30 Days)</h3>
            <Card className="border-slate-200">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty Sold</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.topProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium text-slate-900">{product.name}</TableCell>
                        <TableCell className="text-right">{product.totalQty}</TableCell>
                        <TableCell className="text-right">{formatCurrency(product.revenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  };

  // ─── Render: Shopify Setup Dialog ────────────────────────────────────────

  const renderShopifyDialog = () => {
    const steps = ['Store URL', 'Access Token', 'Sync Settings', 'Connect'];

    return (
      <Dialog open={shopifyDialogOpen} onOpenChange={(open) => { setShopifyDialogOpen(open); if (!open) resetShopifyForm(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" style={{ color: SHOPIFY_COLOR }} />
              Connect Shopify Store
            </DialogTitle>
            <DialogDescription>Set up your Shopify integration in a few steps.</DialogDescription>
          </DialogHeader>

          {/* Progress */}
          <div className="flex items-center gap-2 mb-4">
            {steps.map((step, idx) => (
              <div key={step} className="flex items-center gap-2 flex-1">
                <div
                  className={cn(
                    'h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium',
                    idx < shopifyStep
                      ? 'bg-emerald-600 text-white'
                      : idx === shopifyStep
                        ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-600'
                        : 'bg-slate-100 text-slate-400'
                  )}
                >
                  {idx < shopifyStep ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                </div>
                <span className={cn('text-xs hidden sm:inline', idx <= shopifyStep ? 'text-slate-900 font-medium' : 'text-slate-400')}>
                  {step}
                </span>
                {idx < steps.length - 1 && <div className={cn('flex-1 h-0.5', idx < shopifyStep ? 'bg-emerald-600' : 'bg-slate-200')} />}
              </div>
            ))}
          </div>

          {/* Step Content */}
          {shopifyStep === 0 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="shopify-url">Store URL</Label>
                <Input
                  id="shopify-url"
                  placeholder="mystore.myshopify.com"
                  value={shopifyStoreUrl}
                  onChange={(e) => setShopifyStoreUrl(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-slate-500 mt-1">Enter your Shopify store URL (e.g., mystore.myshopify.com)</p>
              </div>
            </div>
          )}

          {shopifyStep === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="shopify-token">Access Token</Label>
                <Input
                  id="shopify-token"
                  type="password"
                  placeholder="shpat_..."
                  value={shopifyAccessToken}
                  onChange={(e) => setShopifyAccessToken(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Find this in your Shopify Admin → Apps → Develop apps → Your App → API credentials
                </p>
              </div>
            </div>
          )}

          {shopifyStep === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">Choose what data to sync from your Shopify store:</p>
              <div className="space-y-3">
                {[
                  { key: 'customers' as const, label: 'Customers', desc: 'Sync customer data from Shopify' },
                  { key: 'orders' as const, label: 'Orders', desc: 'Sync all orders and fulfillments' },
                  { key: 'products' as const, label: 'Products', desc: 'Sync product catalog and inventory' },
                  { key: 'carts' as const, label: 'Abandoned Carts', desc: 'Track abandoned checkouts' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-3 rounded-lg border border-slate-200">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{item.label}</p>
                      <p className="text-xs text-slate-500">{item.desc}</p>
                    </div>
                    <Switch
                      checked={shopifySyncSettings[item.key]}
                      onCheckedChange={(checked) =>
                        setShopifySyncSettings((prev) => ({ ...prev, [item.key]: checked }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {shopifyStep === 3 && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-slate-500" />
                  <span className="text-sm text-slate-600">Store:</span>
                  <span className="text-sm font-medium text-slate-900">{shopifyStoreUrl || '—'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-slate-500" />
                  <span className="text-sm text-slate-600">Token:</span>
                  <span className="text-sm font-medium text-slate-900">
                    {shopifyAccessToken ? `${shopifyAccessToken.slice(0, 6)}${'•'.repeat(10)}` : '—'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-slate-500" />
                  <span className="text-sm text-slate-600">Sync:</span>
                  <span className="text-sm font-medium text-slate-900">
                    {Object.entries(shopifySyncSettings)
                      .filter(([, v]) => v)
                      .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1))
                      .join(', ')}
                  </span>
                </div>
              </div>
              <p className="text-sm text-slate-500">Click &quot;Connect&quot; to test the connection and complete setup.</p>
            </div>
          )}

          <DialogFooter>
            {shopifyStep > 0 && (
              <Button variant="outline" onClick={() => setShopifyStep((s) => s - 1)} disabled={shopifyConnecting}>
                Back
              </Button>
            )}
            {shopifyStep < 3 ? (
              <Button
                onClick={() => setShopifyStep((s) => s + 1)}
                disabled={
                  (shopifyStep === 0 && !shopifyStoreUrl) ||
                  (shopifyStep === 1 && !shopifyAccessToken)
                }
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleShopifyConnect}
                disabled={shopifyConnecting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {shopifyConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Connect
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // ─── Render: WooCommerce Setup Dialog ────────────────────────────────────

  const renderWooDialog = () => {
    const steps = ['Store URL', 'API Keys', 'Sync Settings', 'Connect'];

    return (
      <Dialog open={wooDialogOpen} onOpenChange={(open) => { setWooDialogOpen(open); if (!open) resetWooForm(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" style={{ color: WOOCOMMERCE_COLOR }} />
              Connect WooCommerce Store
            </DialogTitle>
            <DialogDescription>Set up your WooCommerce integration in a few steps.</DialogDescription>
          </DialogHeader>

          {/* Progress */}
          <div className="flex items-center gap-2 mb-4">
            {steps.map((step, idx) => (
              <div key={step} className="flex items-center gap-2 flex-1">
                <div
                  className={cn(
                    'h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium',
                    idx < wooStep
                      ? 'bg-purple-600 text-white'
                      : idx === wooStep
                        ? 'bg-purple-100 text-purple-700 border-2 border-purple-600'
                        : 'bg-slate-100 text-slate-400'
                  )}
                >
                  {idx < wooStep ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                </div>
                <span className={cn('text-xs hidden sm:inline', idx <= wooStep ? 'text-slate-900 font-medium' : 'text-slate-400')}>
                  {step}
                </span>
                {idx < steps.length - 1 && <div className={cn('flex-1 h-0.5', idx < wooStep ? 'bg-purple-600' : 'bg-slate-200')} />}
              </div>
            ))}
          </div>

          {wooStep === 0 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="woo-url">Store URL</Label>
                <Input
                  id="woo-url"
                  placeholder="https://mystore.com"
                  value={wooStoreUrl}
                  onChange={(e) => setWooStoreUrl(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-slate-500 mt-1">Enter your WooCommerce store URL</p>
              </div>
            </div>
          )}

          {wooStep === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="woo-key">Consumer Key</Label>
                <Input
                  id="woo-key"
                  placeholder="ck_..."
                  value={wooConsumerKey}
                  onChange={(e) => setWooConsumerKey(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="woo-secret">Consumer Secret</Label>
                <Input
                  id="woo-secret"
                  type="password"
                  placeholder="cs_..."
                  value={wooConsumerSecret}
                  onChange={(e) => setWooConsumerSecret(e.target.value)}
                  className="mt-1"
                />
              </div>
              <p className="text-xs text-slate-500">
                Generate API keys in WooCommerce → Settings → Advanced → REST API → Add Key
              </p>
            </div>
          )}

          {wooStep === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">Choose what data to sync from your WooCommerce store:</p>
              <div className="space-y-3">
                {[
                  { key: 'customers' as const, label: 'Customers', desc: 'Sync customer data' },
                  { key: 'orders' as const, label: 'Orders', desc: 'Sync all orders and fulfillments' },
                  { key: 'products' as const, label: 'Products', desc: 'Sync product catalog and inventory' },
                  { key: 'coupons' as const, label: 'Coupons', desc: 'Sync discount coupons' },
                  { key: 'subscriptions' as const, label: 'Subscriptions', desc: 'Sync WooCommerce Subscriptions' },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-3 rounded-lg border border-slate-200">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{item.label}</p>
                      <p className="text-xs text-slate-500">{item.desc}</p>
                    </div>
                    <Switch
                      checked={wooSyncSettings[item.key]}
                      onCheckedChange={(checked) =>
                        setWooSyncSettings((prev) => ({ ...prev, [item.key]: checked }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {wooStep === 3 && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-slate-500" />
                  <span className="text-sm text-slate-600">Store:</span>
                  <span className="text-sm font-medium text-slate-900">{wooStoreUrl || '—'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-slate-500" />
                  <span className="text-sm text-slate-600">Key:</span>
                  <span className="text-sm font-medium text-slate-900">
                    {wooConsumerKey ? `${wooConsumerKey.slice(0, 6)}${'•'.repeat(10)}` : '—'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-slate-500" />
                  <span className="text-sm text-slate-600">Sync:</span>
                  <span className="text-sm font-medium text-slate-900">
                    {Object.entries(wooSyncSettings)
                      .filter(([, v]) => v)
                      .map(([k]) => k.charAt(0).toUpperCase() + k.slice(1))
                      .join(', ')}
                  </span>
                </div>
              </div>
              <p className="text-sm text-slate-500">Click &quot;Connect&quot; to test the connection and complete setup.</p>
            </div>
          )}

          <DialogFooter>
            {wooStep > 0 && (
              <Button variant="outline" onClick={() => setWooStep((s) => s - 1)} disabled={wooConnecting}>
                Back
              </Button>
            )}
            {wooStep < 3 ? (
              <Button
                onClick={() => setWooStep((s) => s + 1)}
                disabled={
                  (wooStep === 0 && !wooStoreUrl) ||
                  (wooStep === 1 && (!wooConsumerKey || !wooConsumerSecret))
                }
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleWooConnect}
                disabled={wooConnecting}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {wooConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Connect
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // ─── Render: Shopify Tab ─────────────────────────────────────────────────

  const renderShopifyTab = () => {
    if (!shopifyIntegration) {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: `${SHOPIFY_COLOR}15` }}>
                <ShoppingBag className="h-6 w-6" style={{ color: SHOPIFY_COLOR }} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Shopify</h3>
                <p className="text-sm text-slate-500">Connect your Shopify store to sync data</p>
              </div>
            </div>
          </div>

          <Card className="border-dashed border-slate-300">
            <CardContent className="p-8 text-center">
              <ShoppingBag className="h-16 w-16 mx-auto mb-4" style={{ color: SHOPIFY_COLOR, opacity: 0.3 }} />
              <h4 className="text-lg font-medium text-slate-700 mb-2">No Shopify Store Connected</h4>
              <p className="text-sm text-slate-500 mb-4 max-w-md mx-auto">
                Connect your Shopify store to sync orders, products, customers, and automate workflows.
              </p>
              <Button
                onClick={() => setShopifyDialogOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Connect Shopify Store
              </Button>
            </CardContent>
          </Card>

          {renderShopifyDialog()}
        </div>
      );
    }

    // Connected state
    const intg = shopifyIntegration;
    const statusInfo = STATUS_BADGE_MAP[intg.status] || STATUS_BADGE_MAP.disconnected;
    const syncSettings = (intg.syncSettings || {}) as Record<string, boolean>;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: `${SHOPIFY_COLOR}15` }}>
              <ShoppingBag className="h-6 w-6" style={{ color: SHOPIFY_COLOR }} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Shopify — {intg.name}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className={cn('text-xs', statusInfo.className)}>
                  {statusInfo.label}
                </Badge>
                {intg.lastSyncAt && (
                  <span className="text-xs text-slate-500">Last synced {formatTimeAgo(intg.lastSyncAt)}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSyncNow(intg.id)}
              disabled={syncingId === intg.id || intg.status === 'disconnected'}
            >
              {syncingId === intg.id ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sync Now
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              onClick={() => handleDisconnect(intg.id)}
              disabled={disconnectingId === intg.id || intg.status === 'syncing'}
            >
              {disconnectingId === intg.id ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Unplug className="h-4 w-4 mr-2" />
              )}
              Disconnect
            </Button>
          </div>
        </div>

        {/* Store Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-500">Store Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Store Name</span>
                <span className="text-sm font-medium text-slate-900">{intg.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Store URL</span>
                <a
                  href={intg.storeUrl ? `https://${intg.storeUrl}` : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-emerald-600 hover:underline flex items-center gap-1"
                >
                  {intg.storeUrl || '—'}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Status</span>
                <Badge variant="outline" className={cn('text-xs', statusInfo.className)}>
                  {statusInfo.label}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Connected</span>
                <span className="text-sm font-medium text-slate-900">{formatDate(intg.createdAt)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-500">Sync Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Total Orders Synced</span>
                <span className="text-sm font-bold text-slate-900">{intg.totalSyncedOrders}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Total Products Synced</span>
                <span className="text-sm font-bold text-slate-900">{intg.totalSyncedProducts}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Total Customers Synced</span>
                <span className="text-sm font-bold text-slate-900">{intg.totalSyncedCustomers}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Last Sync Status</span>
                <Badge variant="outline" className={cn('text-xs', intg.lastSyncStatus === 'success' ? 'bg-emerald-100 text-emerald-800' : intg.lastSyncStatus === 'partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-100 text-slate-600')}>
                  {intg.lastSyncStatus || 'Never'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sync Settings */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-500">Sync Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {['customers', 'orders', 'products', 'carts'].map((key) => (
                <div key={key} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50">
                  <span className="text-sm font-medium text-slate-700 capitalize">{key === 'carts' ? 'Abandoned Carts' : key}</span>
                  <Switch
                    checked={!!syncSettings[key]}
                    onCheckedChange={async (checked) => {
                      const newSettings = { ...syncSettings, [key]: checked };
                      try {
                        await fetch(`/api/integrations/${intg.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ syncSettings: newSettings }),
                        });
                        toast.success(`${key === 'carts' ? 'Abandoned Carts' : key.charAt(0).toUpperCase() + key.slice(1)} sync ${checked ? 'enabled' : 'disabled'}`);
                        fetchIntegrations();
                      } catch {
                        toast.error('Failed to update sync settings');
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sync Log */}
        {intg.syncLogs && intg.syncLogs.length > 0 && (
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-500">Sync Log</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-64">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Synced</TableHead>
                      <TableHead className="text-right">Failed</TableHead>
                      <TableHead className="text-right">Duration</TableHead>
                      <TableHead className="text-right">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {intg.syncLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="capitalize text-xs">{log.syncType}</TableCell>
                        <TableCell className="capitalize text-xs">{log.entity}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('text-xs', log.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800')}>
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs">{log.recordsSynced}</TableCell>
                        <TableCell className="text-right text-xs">{log.recordsFailed}</TableCell>
                        <TableCell className="text-right text-xs">{(log.durationMs / 1000).toFixed(1)}s</TableCell>
                        <TableCell className="text-right text-xs text-slate-500">{formatDateTime(log.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {renderShopifyDialog()}
      </div>
    );
  };

  // ─── Render: WooCommerce Tab ─────────────────────────────────────────────

  const renderWooTab = () => {
    if (!wooIntegration) {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: `${WOOCOMMERCE_COLOR}15` }}>
                <Store className="h-6 w-6" style={{ color: WOOCOMMERCE_COLOR }} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">WooCommerce</h3>
                <p className="text-sm text-slate-500">Connect your WooCommerce store to sync data</p>
              </div>
            </div>
          </div>

          <Card className="border-dashed border-slate-300">
            <CardContent className="p-8 text-center">
              <Store className="h-16 w-16 mx-auto mb-4" style={{ color: WOOCOMMERCE_COLOR, opacity: 0.3 }} />
              <h4 className="text-lg font-medium text-slate-700 mb-2">No WooCommerce Store Connected</h4>
              <p className="text-sm text-slate-500 mb-4 max-w-md mx-auto">
                Connect your WooCommerce store to sync orders, products, customers, and automate workflows.
              </p>
              <Button
                onClick={() => setWooDialogOpen(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Connect WooCommerce Store
              </Button>
            </CardContent>
          </Card>

          {renderWooDialog()}
        </div>
      );
    }

    const intg = wooIntegration;
    const statusInfo = STATUS_BADGE_MAP[intg.status] || STATUS_BADGE_MAP.disconnected;
    const syncSettings = (intg.syncSettings || {}) as Record<string, boolean>;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: `${WOOCOMMERCE_COLOR}15` }}>
              <Store className="h-6 w-6" style={{ color: WOOCOMMERCE_COLOR }} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">WooCommerce — {intg.name}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className={cn('text-xs', statusInfo.className)}>
                  {statusInfo.label}
                </Badge>
                {intg.lastSyncAt && (
                  <span className="text-xs text-slate-500">Last synced {formatTimeAgo(intg.lastSyncAt)}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSyncNow(intg.id)}
              disabled={syncingId === intg.id || intg.status === 'disconnected'}
            >
              {syncingId === intg.id ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Sync Now
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              onClick={() => handleDisconnect(intg.id)}
              disabled={disconnectingId === intg.id || intg.status === 'syncing'}
            >
              {disconnectingId === intg.id ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Unplug className="h-4 w-4 mr-2" />
              )}
              Disconnect
            </Button>
          </div>
        </div>

        {/* Store Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-500">Store Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Store Name</span>
                <span className="text-sm font-medium text-slate-900">{intg.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Store URL</span>
                <a
                  href={intg.storeUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-purple-600 hover:underline flex items-center gap-1"
                >
                  {intg.storeUrl || '—'}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Status</span>
                <Badge variant="outline" className={cn('text-xs', statusInfo.className)}>
                  {statusInfo.label}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Connected</span>
                <span className="text-sm font-medium text-slate-900">{formatDate(intg.createdAt)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-500">Sync Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Total Orders Synced</span>
                <span className="text-sm font-bold text-slate-900">{intg.totalSyncedOrders}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Total Products Synced</span>
                <span className="text-sm font-bold text-slate-900">{intg.totalSyncedProducts}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Total Customers Synced</span>
                <span className="text-sm font-bold text-slate-900">{intg.totalSyncedCustomers}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Last Sync Status</span>
                <Badge variant="outline" className={cn('text-xs', intg.lastSyncStatus === 'success' ? 'bg-emerald-100 text-emerald-800' : intg.lastSyncStatus === 'partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-100 text-slate-600')}>
                  {intg.lastSyncStatus || 'Never'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sync Settings */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-500">Sync Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {['customers', 'orders', 'products', 'coupons', 'subscriptions'].map((key) => (
                <div key={key} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50">
                  <span className="text-sm font-medium text-slate-700 capitalize">{key}</span>
                  <Switch
                    checked={!!syncSettings[key]}
                    onCheckedChange={async (checked) => {
                      const newSettings = { ...syncSettings, [key]: checked };
                      try {
                        await fetch(`/api/integrations/${intg.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ syncSettings: newSettings }),
                        });
                        toast.success(`${key.charAt(0).toUpperCase() + key.slice(1)} sync ${checked ? 'enabled' : 'disabled'}`);
                        fetchIntegrations();
                      } catch {
                        toast.error('Failed to update sync settings');
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sync Log */}
        {intg.syncLogs && intg.syncLogs.length > 0 && (
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-500">Sync Log</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-64">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Synced</TableHead>
                      <TableHead className="text-right">Failed</TableHead>
                      <TableHead className="text-right">Duration</TableHead>
                      <TableHead className="text-right">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {intg.syncLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="capitalize text-xs">{log.syncType}</TableCell>
                        <TableCell className="capitalize text-xs">{log.entity}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('text-xs', log.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800')}>
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-xs">{log.recordsSynced}</TableCell>
                        <TableCell className="text-right text-xs">{log.recordsFailed}</TableCell>
                        <TableCell className="text-right text-xs">{(log.durationMs / 1000).toFixed(1)}s</TableCell>
                        <TableCell className="text-right text-xs text-slate-500">{formatDateTime(log.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {renderWooDialog()}
      </div>
    );
  };

  // ─── Render: Orders Tab ──────────────────────────────────────────────────

  const renderOrdersTab = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search orders..."
            value={orderSearch}
            onChange={(e) => setOrderSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={orderProviderFilter} onValueChange={setOrderProviderFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Providers</SelectItem>
            <SelectItem value="shopify">Shopify</SelectItem>
            <SelectItem value="woocommerce">WooCommerce</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading.orders ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="border-slate-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <Card className="border-dashed border-slate-300">
          <CardContent className="p-8 text-center">
            <ShoppingBag className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-lg font-medium text-slate-700 mb-1">No Orders Found</h4>
            <p className="text-sm text-slate-500">
              {orderSearch || orderStatusFilter !== 'all' || orderProviderFilter !== 'all'
                ? 'Try adjusting your filters.'
                : 'Orders will appear here once you sync from your connected stores.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-slate-200">
          <CardContent className="p-0">
            <ScrollArea className="max-h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Financial</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow
                      key={order.id}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => setOrderDetailDialog(order)}
                    >
                      <TableCell className="font-medium text-slate-900">
                        {order.orderNumber || order.externalOrderId}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm text-slate-900">{order.customerName || '—'}</p>
                          <p className="text-xs text-slate-500">{order.customerEmail || ''}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-xs', ORDER_STATUS_BADGE[order.status] || 'bg-slate-100 text-slate-600')}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-slate-600">{order.financialStatus || '—'}</span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(order.total, order.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs" style={{ borderColor: getProviderColor(order.integration?.provider), color: getProviderColor(order.integration?.provider) }}>
                          {getProviderLabel(order.integration?.provider)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {formatDate(order.orderedAt)}
                      </TableCell>
                      <TableCell>
                        <Eye className="h-4 w-4 text-slate-400" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Order Detail Dialog */}
      <Dialog open={!!orderDetailDialog} onOpenChange={(open) => { if (!open) setOrderDetailDialog(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {orderDetailDialog && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  Order {orderDetailDialog.orderNumber || orderDetailDialog.externalOrderId}
                  <Badge variant="outline" className={cn('text-xs', ORDER_STATUS_BADGE[orderDetailDialog.status] || '')}>
                    {orderDetailDialog.status}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  From {getProviderLabel(orderDetailDialog.integration?.provider)} • {formatDateTime(orderDetailDialog.orderedAt)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Customer Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-slate-700">Customer</h4>
                    <div className="text-sm space-y-1">
                      <p><span className="text-slate-500">Name:</span> {orderDetailDialog.customerName || '—'}</p>
                      <p><span className="text-slate-500">Email:</span> {orderDetailDialog.customerEmail || '—'}</p>
                      <p><span className="text-slate-500">Phone:</span> {orderDetailDialog.customerPhone || '—'}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-slate-700">Payment</h4>
                    <div className="text-sm space-y-1">
                      <p><span className="text-slate-500">Financial Status:</span> {orderDetailDialog.financialStatus || '—'}</p>
                      <p><span className="text-slate-500">Fulfillment:</span> {orderDetailDialog.fulfillmentStatus || '—'}</p>
                      <p><span className="text-slate-500">Currency:</span> {orderDetailDialog.currency}</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Order Totals */}
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-slate-700">Order Totals</h4>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{formatCurrency(orderDetailDialog.subtotal, orderDetailDialog.currency)}</span></div>
                    {orderDetailDialog.discountTotal > 0 && (
                      <div className="flex justify-between"><span className="text-slate-500">Discount</span><span className="text-red-600">-{formatCurrency(orderDetailDialog.discountTotal, orderDetailDialog.currency)}</span></div>
                    )}
                    <div className="flex justify-between"><span className="text-slate-500">Tax</span><span>{formatCurrency(orderDetailDialog.taxTotal, orderDetailDialog.currency)}</span></div>
                    <Separator />
                    <div className="flex justify-between font-bold"><span>Total</span><span>{formatCurrency(orderDetailDialog.total, orderDetailDialog.currency)}</span></div>
                  </div>
                </div>

                {/* Items */}
                {orderDetailDialog.items && orderDetailDialog.items.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-slate-700">Items</h4>
                      <div className="space-y-2">
                        {orderDetailDialog.items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 rounded bg-slate-50 text-sm">
                            <span className="text-slate-900">{(item as Record<string, unknown>).name as string || (item as Record<string, unknown>).title as string || 'Item'}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-slate-500">×{(item as Record<string, unknown>).qty as number || (item as Record<string, unknown>).quantity as number || 1}</span>
                              <span className="font-medium">{formatCurrency((item as Record<string, unknown>).price as number || 0, orderDetailDialog.currency)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Tags */}
                {orderDetailDialog.tags && orderDetailDialog.tags.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-slate-500">Tags:</span>
                    {orderDetailDialog.tags.map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );

  // ─── Render: Products Tab ────────────────────────────────────────────────

  const renderProductsTab = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search products..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={productStatusFilter} onValueChange={setProductStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={productProviderFilter} onValueChange={setProductProviderFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Providers</SelectItem>
            <SelectItem value="shopify">Shopify</SelectItem>
            <SelectItem value="woocommerce">WooCommerce</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
          <Button
            variant="ghost"
            size="sm"
            className={cn('rounded-none', productViewMode === 'grid' ? 'bg-slate-100' : '')}
            onClick={() => setProductViewMode('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn('rounded-none', productViewMode === 'list' ? 'bg-slate-100' : '')}
            onClick={() => setProductViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading.products ? (
        <div className={cn('grid gap-4', productViewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1')}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="border-slate-200">
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-32 w-full rounded" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : products.length === 0 ? (
        <Card className="border-dashed border-slate-300">
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-lg font-medium text-slate-700 mb-1">No Products Found</h4>
            <p className="text-sm text-slate-500">
              {productSearch || productStatusFilter !== 'all' || productProviderFilter !== 'all'
                ? 'Try adjusting your filters.'
                : 'Products will appear here once you sync from your connected stores.'}
            </p>
          </CardContent>
        </Card>
      ) : productViewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((product) => (
            <Card key={product.id} className="border-slate-200 hover:shadow-md transition-shadow overflow-hidden">
              {/* Product Image Placeholder */}
              <div className="h-36 bg-slate-100 flex items-center justify-center">
                {product.images && product.images.length > 0 && typeof product.images[0] === 'string' && product.images[0].startsWith('http') ? (
                  <img src={product.images[0]} alt={product.title} className="h-full w-full object-cover" />
                ) : (
                  <Package className="h-12 w-12 text-slate-300" />
                )}
              </div>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="text-sm font-medium text-slate-900 line-clamp-2">{product.title}</h4>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs shrink-0',
                      product.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                      product.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-slate-100 text-slate-600'
                    )}
                  >
                    {product.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-bold text-slate-900">{formatCurrency(product.price)}</span>
                  {product.compareAtPrice && product.compareAtPrice > product.price && (
                    <span className="text-xs text-slate-400 line-through">{formatCurrency(product.compareAtPrice)}</span>
                  )}
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                  <span>SKU: {product.sku || '—'}</span>
                  <span className={cn(product.inventory <= 0 ? 'text-red-600 font-medium' : product.inventory < 10 ? 'text-yellow-600' : 'text-emerald-600')}>
                    Stock: {product.inventory}
                  </span>
                </div>
                <div className="mt-2">
                  <Badge variant="outline" className="text-xs" style={{ borderColor: getProviderColor(product.integration?.provider), color: getProviderColor(product.integration?.provider) }}>
                    {getProviderLabel(product.integration?.provider)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-slate-200">
          <CardContent className="p-0">
            <ScrollArea className="max-h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead className="text-right">Inventory</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Provider</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded bg-slate-100 flex items-center justify-center shrink-0">
                            <Package className="h-5 w-5 text-slate-300" />
                          </div>
                          <span className="font-medium text-slate-900 text-sm">{product.title}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{product.sku || '—'}</TableCell>
                      <TableCell className="text-sm font-medium">{formatCurrency(product.price)}</TableCell>
                      <TableCell className="text-right">
                        <span className={cn('text-sm', product.inventory <= 0 ? 'text-red-600 font-medium' : product.inventory < 10 ? 'text-yellow-600' : 'text-emerald-600')}>
                          {product.inventory}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-xs', product.status === 'active' ? 'bg-emerald-100 text-emerald-800' : product.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-100 text-slate-600')}>
                          {product.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs" style={{ borderColor: getProviderColor(product.integration?.provider), color: getProviderColor(product.integration?.provider) }}>
                          {getProviderLabel(product.integration?.provider)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );

  // ─── Render: Webhooks & Events Tab ───────────────────────────────────────

  const renderWebhooksTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Webhooks & Events</h3>
          <p className="text-sm text-slate-500">Manage webhook endpoints and view sync events</p>
        </div>
      </div>

      {/* Webhook URLs */}
      {connectedIntegrations.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-slate-700">Webhook Endpoints</h4>
          <div className="space-y-3">
            {connectedIntegrations.map((intg) => {
              const ProviderIcon = getProviderIcon(intg.provider);
              const webhookUrl = intg.webhookUrl || `https://your-domain.com/api/webhooks/ecommerce/${intg.provider}/${intg.id}`;
              return (
                <Card key={intg.id} className="border-slate-200">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div
                        className="p-2 rounded-lg shrink-0"
                        style={{ backgroundColor: `${getProviderColor(intg.provider)}15` }}
                      >
                        <ProviderIcon className="h-5 w-5" style={{ color: getProviderColor(intg.provider) }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-slate-900">{intg.name}</p>
                          <Badge variant="outline" className="text-xs" style={{ borderColor: getProviderColor(intg.provider), color: getProviderColor(intg.provider) }}>
                            {getProviderLabel(intg.provider)}
                          </Badge>
                          {intg.webhookVerified && (
                            <Badge variant="outline" className="text-xs bg-emerald-100 text-emerald-800 border-emerald-200">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono truncate block max-w-full">
                            {webhookUrl}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 shrink-0"
                            onClick={() => copyToClipboard(webhookUrl)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Last event: {formatTimeAgo(intg.lastSyncAt)} • Total events: {intg._count?.syncLogs ?? 0}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {connectedIntegrations.length === 0 && (
        <Card className="border-dashed border-slate-300">
          <CardContent className="p-8 text-center">
            <Webhook className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-lg font-medium text-slate-700 mb-1">No Connected Stores</h4>
            <p className="text-sm text-slate-500">Webhook URLs will appear here once you connect a store.</p>
          </CardContent>
        </Card>
      )}

      {/* Recent Events / Sync Log */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-slate-700">Recent Sync Events</h4>
        {integrations.length > 0 ? (
          <Card className="border-slate-200">
            <CardContent className="p-0">
              <ScrollArea className="max-h-96">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Integration</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Synced</TableHead>
                      <TableHead className="text-right">Failed</TableHead>
                      <TableHead className="text-right">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {integrations.flatMap((intg) =>
                      (intg.syncLogs || []).map((log) => ({
                        ...log,
                        integrationName: intg.name,
                        integrationProvider: intg.provider,
                      }))
                    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .slice(0, 20)
                      .map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: getProviderColor(log.integrationProvider) }}
                              />
                              <span className="text-sm text-slate-900">{log.integrationName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="capitalize text-xs">{log.syncType}</TableCell>
                          <TableCell className="capitalize text-xs">{log.entity}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn('text-xs', log.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800')}>
                              {log.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-xs">{log.recordsSynced}</TableCell>
                          <TableCell className="text-right text-xs">{log.recordsFailed}</TableCell>
                          <TableCell className="text-right text-xs text-slate-500">{formatDateTime(log.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    {integrations.every((intg) => !intg.syncLogs || intg.syncLogs.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-sm text-slate-500 py-8">
                          No sync events yet. Trigger a sync to see events here.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed border-slate-300">
            <CardContent className="p-6 text-center">
              <Activity className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Connect an integration to see sync events</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );

  // ─── Render: Workflow Templates Tab ──────────────────────────────────────

  const renderWorkflowTemplates = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Workflow Templates</h3>
        <p className="text-sm text-slate-500">Pre-built automation workflows for your e-commerce integrations</p>
      </div>

      <div className="space-y-4">
        {WORKFLOW_TEMPLATES.map((template) => (
          <Card key={template.id} className="border-slate-200 hover:shadow-md transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                {/* Icon & Info */}
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2.5 rounded-lg bg-emerald-50 shrink-0">
                    <template.icon className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-slate-900">{template.name}</h4>
                      <Badge variant="outline" className="text-xs bg-slate-50">{template.category}</Badge>
                    </div>
                    <p className="text-sm text-slate-500 mb-4">{template.description}</p>

                    {/* Flow Diagram */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {template.steps.map((step, idx) => (
                        <div key={idx} className="flex items-center gap-1.5">
                          <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium', step.color)}>
                            <step.icon className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">{step.label}</span>
                            <span className="sm:hidden">{step.label.split(' ').slice(0, 2).join(' ')}</span>
                          </div>
                          {idx < template.steps.length - 1 && (
                            <ArrowRight className="h-4 w-4 text-slate-300 shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Action */}
                <Button
                  onClick={() => {
                    setActiveView('workflows');
                    toast.success(`Opening workflow editor with "${template.name}" template`);
                  }}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                >
                  <Workflow className="h-4 w-4 mr-1.5" />
                  Use Template
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Custom Workflow CTA */}
      <Card className="border-dashed border-emerald-300 bg-emerald-50/50">
        <CardContent className="p-6 text-center">
          <Workflow className="h-10 w-10 text-emerald-400 mx-auto mb-2" />
          <h4 className="text-lg font-medium text-emerald-800 mb-1">Need a Custom Workflow?</h4>
          <p className="text-sm text-emerald-600 mb-4 max-w-md mx-auto">
            Build your own automation from scratch with our visual workflow builder.
          </p>
          <Button
            onClick={() => setActiveView('workflows')}
            variant="outline"
            className="border-emerald-300 text-emerald-700 hover:bg-emerald-100"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Create Custom Workflow
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  // ─── Main Render ─────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto">
        <div className="p-4 sm:p-6 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Plug className="h-6 w-6 text-emerald-600" />
                E-commerce Integration Hub
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Connect stores, sync data, and automate workflows
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  fetchIntegrations();
                  fetchStats();
                }}
                className="text-slate-600"
              >
                <RefreshCw className="h-4 w-4 mr-1.5" />
                Refresh
              </Button>
              <Button
                size="sm"
                onClick={() => setActiveTab('shopify')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add Integration
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-slate-100 p-1 h-auto flex-wrap">
              <TabsTrigger value="overview" className="text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-emerald-700">
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="shopify"
                className="text-xs sm:text-sm data-[state=active]:bg-white"
                style={activeTab === 'shopify' ? { color: SHOPIFY_COLOR } : undefined}
              >
                <ShoppingBag className="h-3.5 w-3.5 mr-1" />
                Shopify
                {shopifyIntegration?.status === 'connected' && (
                  <span className="ml-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                )}
              </TabsTrigger>
              <TabsTrigger
                value="woocommerce"
                className="text-xs sm:text-sm data-[state=active]:bg-white"
                style={activeTab === 'woocommerce' ? { color: WOOCOMMERCE_COLOR } : undefined}
              >
                <Store className="h-3.5 w-3.5 mr-1" />
                WooCommerce
                {wooIntegration?.status === 'connected' && (
                  <span className="ml-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                )}
              </TabsTrigger>
              <TabsTrigger value="orders" className="text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-emerald-700">
                <ShoppingBag className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
                Orders
              </TabsTrigger>
              <TabsTrigger value="products" className="text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-emerald-700">
                <Package className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
                Products
              </TabsTrigger>
              <TabsTrigger value="webhooks" className="text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-emerald-700">
                <Webhook className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
                Webhooks
              </TabsTrigger>
              <TabsTrigger value="templates" className="text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:text-emerald-700">
                <Workflow className="h-3.5 w-3.5 mr-1 hidden sm:inline" />
                Templates
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">{renderOverview()}</TabsContent>
            <TabsContent value="shopify">{renderShopifyTab()}</TabsContent>
            <TabsContent value="woocommerce">{renderWooTab()}</TabsContent>
            <TabsContent value="orders">{renderOrdersTab()}</TabsContent>
            <TabsContent value="products">{renderProductsTab()}</TabsContent>
            <TabsContent value="webhooks">{renderWebhooksTab()}</TabsContent>
            <TabsContent value="templates">{renderWorkflowTemplates()}</TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

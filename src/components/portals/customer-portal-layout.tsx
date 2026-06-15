'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  CalendarCheck,
  Receipt,
  CreditCard,
  MessageSquare,
  Star,
  UserCircle,
  Zap,
  LogOut,
  Menu,
  Bell,
  Moon,
  Sun,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  Package,
  Truck,
  IndianRupee,
  Plus,
  Download,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowUpRight,
  TrendingUp,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Home,
  Edit,
  Search,
  Filter,
  MoreVertical,
  Paperclip,
  Smile,
  ThumbsUp,
  Shield,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/app-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from 'next-themes';

// ─── Types ──────────────────────────────────────────────────────────────────

type CustomerView = 'dashboard' | 'bookings' | 'orders' | 'invoices' | 'payments' | 'messages' | 'reviews' | 'profile';

interface CustomerPortalLayoutProps {
  onLogout?: () => void;
}

// ─── Sidebar Menu Items ─────────────────────────────────────────────────────

const SIDEBAR_ITEMS: { key: CustomerView; label: string; icon: React.ElementType }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'bookings', label: 'Bookings', icon: CalendarCheck },
  { key: 'orders', label: 'My Orders', icon: ShoppingBag },
  { key: 'invoices', label: 'Invoices', icon: Receipt },
  { key: 'payments', label: 'Payments', icon: CreditCard },
  { key: 'messages', label: 'Messages', icon: MessageSquare },
  { key: 'reviews', label: 'Reviews', icon: Star },
  { key: 'profile', label: 'Profile', icon: UserCircle },
];

// ─── Placeholder Data ───────────────────────────────────────────────────────

const PLACEHOLDER_BOOKINGS = [
  { id: 'BK-1001', service: 'AC Maintenance', date: 'Mar 15, 2026', time: '10:00 AM', address: '123 Oak Street, Apt 4B', status: 'upcoming' as const, assignee: 'Mike Johnson' },
  { id: 'BK-1002', service: 'Plumbing Repair', date: 'Mar 12, 2026', time: '2:30 PM', address: '123 Oak Street, Apt 4B', status: 'in_progress' as const, assignee: 'Sarah Chen' },
  { id: 'BK-1003', service: 'Electrical Inspection', date: 'Mar 8, 2026', time: '9:00 AM', address: '456 Elm Avenue', status: 'completed' as const, assignee: 'David Park' },
  { id: 'BK-1004', service: 'Deep Cleaning', date: 'Mar 5, 2026', time: '11:00 AM', address: '123 Oak Street, Apt 4B', status: 'completed' as const, assignee: 'Lisa Wong' },
  { id: 'BK-1005', service: 'Painting Touch-up', date: 'Feb 28, 2026', time: '3:00 PM', address: '123 Oak Street, Apt 4B', status: 'cancelled' as const, assignee: '--' },
];

const PLACEHOLDER_INVOICES = [
  { id: 'INV-2026-001', date: 'Mar 12, 2026', amount: 350.00, status: 'paid' as const },
  { id: 'INV-2026-002', date: 'Mar 8, 2026', amount: 175.50, status: 'paid' as const },
  { id: 'INV-2026-003', date: 'Mar 5, 2026', amount: 420.00, status: 'pending' as const },
  { id: 'INV-2026-004', date: 'Feb 20, 2026', amount: 89.99, status: 'overdue' as const },
  { id: 'INV-2026-005', date: 'Feb 15, 2026', amount: 225.00, status: 'paid' as const },
  { id: 'INV-2026-006', date: 'Feb 1, 2026', amount: 560.00, status: 'paid' as const },
];

const PLACEHOLDER_PAYMENTS = [
  { id: 'PAY-001', date: 'Mar 12, 2026', method: 'Visa •••• 4242', amount: 350.00, status: 'completed' as const, invoiceId: 'INV-2026-001' },
  { id: 'PAY-002', date: 'Mar 8, 2026', method: 'Visa •••• 4242', amount: 175.50, status: 'completed' as const, invoiceId: 'INV-2026-002' },
  { id: 'PAY-003', date: 'Feb 15, 2026', method: 'Bank Transfer', amount: 225.00, status: 'completed' as const, invoiceId: 'INV-2026-005' },
  { id: 'PAY-004', date: 'Feb 1, 2026', method: 'Visa •••• 4242', amount: 560.00, status: 'completed' as const, invoiceId: 'INV-2026-006' },
];

const PLACEHOLDER_MESSAGES = [
  { id: 1, from: 'business' as const, text: 'Hi Rajesh! Your AC maintenance appointment is confirmed for March 15 at 10:00 AM.', time: '10:30 AM' },
  { id: 2, from: 'customer' as const, text: 'Great, thanks! Do I need to do anything to prepare?', time: '10:32 AM' },
  { id: 3, from: 'business' as const, text: 'Just make sure the AC unit is accessible. Our technician Mike will bring all the necessary tools and equipment.', time: '10:35 AM' },
  { id: 4, from: 'customer' as const, text: 'Sounds good. Will he call before arriving?', time: '10:36 AM' },
  { id: 5, from: 'business' as const, text: 'Yes, Mike will give you a call about 30 minutes before arrival. You can also track his location in real-time through the portal.', time: '10:38 AM' },
  { id: 6, from: 'business' as const, text: 'Is there anything else I can help you with?', time: '10:38 AM' },
];

const PLACEHOLDER_REVIEWS = [
  { id: 1, service: 'Electrical Inspection', date: 'Mar 8, 2026', rating: 5, text: 'David was excellent! Very thorough inspection and took the time to explain everything. Highly recommend.', assignee: 'David Park' },
  { id: 2, service: 'Deep Cleaning', date: 'Mar 5, 2026', rating: 4, text: 'Good cleaning service overall. The team was professional and on time. A few spots were missed but they came back to fix it.', assignee: 'Lisa Wong' },
  { id: 3, service: 'Plumbing Repair', date: 'Feb 20, 2026', rating: 5, text: 'Fixed the leaky faucet quickly and at a fair price. Will definitely use again for any plumbing needs.', assignee: 'Sarah Chen' },
];

const RECENT_ACTIVITY = [
  { id: 1, icon: CheckCircle2, text: 'Payment of $350.00 confirmed for INV-2026-001', time: '2 hours ago', color: 'text-emerald-500' },
  { id: 2, icon: CalendarCheck, text: 'Booking BK-1002 status updated to In Progress', time: '5 hours ago', color: 'text-teal-500' },
  { id: 3, icon: Receipt, text: 'New invoice INV-2026-003 generated', time: '1 day ago', color: 'text-amber-500' },
  { id: 4, icon: Star, text: 'You reviewed Electrical Inspection service', time: '2 days ago', color: 'text-amber-500' },
  { id: 5, icon: AlertCircle, text: 'Invoice INV-2026-004 is now overdue', time: '3 days ago', color: 'text-red-500' },
];

// ─── Helper Functions ───────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function getBookingStatusBadge(status: string) {
  const config: Record<string, { label: string; className: string }> = {
    upcoming: { label: 'Upcoming', className: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-800' },
    in_progress: { label: 'In Progress', className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800' },
    completed: { label: 'Completed', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800' },
    cancelled: { label: 'Cancelled', className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800' },
  };
  const c = config[status] || { label: status, className: 'bg-gray-50 text-gray-700 border-gray-200' };
  return <Badge variant="outline" className={cn('text-xs font-medium', c.className)}>{c.label}</Badge>;
}

function getInvoiceStatusBadge(status: string) {
  const config: Record<string, { label: string; className: string }> = {
    paid: { label: 'Paid', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800' },
    pending: { label: 'Pending', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800' },
    overdue: { label: 'Overdue', className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800' },
  };
  const c = config[status] || { label: status, className: 'bg-gray-50 text-gray-700 border-gray-200' };
  return <Badge variant="outline" className={cn('text-xs font-medium', c.className)}>{c.label}</Badge>;
}

function StarRating({ value, onChange, size = 'md' }: { value: number; onChange?: (val: number) => void; size?: 'sm' | 'md' | 'lg' }) {
  const [hovered, setHovered] = useState(0);
  const sizeClasses = { sm: 'size-3.5', md: 'size-5', lg: 'size-7' };
  const sizeClass = sizeClasses[size];
  const readonly = !onChange;

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          className={cn('transition-transform', readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110')}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          onClick={() => onChange?.(star)}
        >
          <Star
            className={cn(
              sizeClass,
              'transition-colors',
              star <= (hovered || value)
                ? 'text-amber-400 fill-amber-400'
                : 'text-gray-200 fill-gray-200 dark:text-gray-600 dark:fill-gray-600'
            )}
          />
        </button>
      ))}
    </div>
  );
}

// ─── Sidebar Component ──────────────────────────────────────────────────────

function CustomerSidebar({
  activeView,
  onViewChange,
  onLogout,
  customerName,
  customerPhone,
}: {
  activeView: CustomerView;
  onViewChange: (view: CustomerView) => void;
  onLogout?: () => void;
  customerName: string;
  customerPhone: string;
}) {
  return (
    <div className="flex h-full flex-col bg-card border-r border-border">
      {/* Logo & Customer Info */}
      <div className="p-5 pb-4">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex items-center justify-center size-9 rounded-lg bg-teal-600">
            <Zap className="size-5 text-white" />
          </div>
          <span className="text-lg font-bold text-foreground tracking-tight">ServiceOS</span>
        </div>
        <Separator className="mb-3" />
        <div className="flex items-center gap-3">
          <Avatar className="size-10 border border-border">
            <AvatarFallback className="bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300 text-sm font-semibold">
              {customerName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{customerName}</p>
            <p className="text-xs text-muted-foreground truncate">{customerPhone}</p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
        {SIDEBAR_ITEMS.map((item) => {
          const isActive = activeView === item.key;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => onViewChange(item.key)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                'border-l-[3px]',
                isActive
                  ? 'bg-teal-50 text-teal-700 border-l-teal-600 dark:bg-teal-950/30 dark:text-teal-400 dark:border-l-teal-500'
                  : 'text-muted-foreground border-l-transparent hover:bg-muted/60 hover:text-foreground'
              )}
            >
              <Icon className={cn('size-[18px]', isActive ? 'text-teal-600 dark:text-teal-400' : 'text-muted-foreground')} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <Separator />

      {/* Logout */}
      <div className="p-3">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors border-l-[3px] border-l-transparent"
        >
          <LogOut className="size-[18px]" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}

// ─── Header Component ───────────────────────────────────────────────────────

function CustomerHeader({
  activeView,
  onMobileMenuToggle,
}: {
  activeView: CustomerView;
  onMobileMenuToggle: () => void;
}) {
  const { theme, setTheme } = useTheme();
  const auth = useAppStore((s) => s.auth);
  const userName = auth.user?.name || auth.user?.email || 'Customer';

  const viewTitle: Record<CustomerView, string> = {
    dashboard: 'Dashboard',
    bookings: 'Bookings',
    invoices: 'Invoices',
    payments: 'Payments',
    messages: 'Messages',
    reviews: 'Reviews',
    profile: 'Profile',
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-card border-b border-border">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMobileMenuToggle}
        >
          <Menu className="size-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
        <h1 className="text-lg sm:text-xl font-semibold text-foreground">{viewTitle[activeView]}</h1>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        {/* Dark Mode Toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="size-9"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="size-9 relative">
          <Bell className="size-4" />
          <span className="absolute top-1.5 right-1.5 size-2 bg-teal-500 rounded-full" />
          <span className="sr-only">Notifications</span>
        </Button>

        {/* Avatar Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2 h-9">
              <Avatar className="size-7 border border-border">
                <AvatarFallback className="bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300 text-xs font-semibold">
                  {userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <ChevronDown className="size-3.5 text-muted-foreground hidden sm:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem className="cursor-pointer">
              <UserCircle className="size-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-red-600 dark:text-red-400">
              <LogOut className="size-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

// ─── Sub-Views ──────────────────────────────────────────────────────────────

function DashboardView() {
  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <Card className="border-teal-200 dark:border-teal-800 bg-gradient-to-br from-teal-50 to-white dark:from-teal-950/40 dark:to-card">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">Welcome back, Rajesh! 👋</h2>
              <p className="text-muted-foreground mt-1">Here&apos;s what&apos;s happening with your services today.</p>
            </div>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white self-start">
              <CalendarCheck className="size-4 mr-2" />
              New Booking
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Active Bookings</p>
                <p className="text-3xl font-bold text-foreground mt-1">2</p>
                <p className="text-xs text-teal-600 dark:text-teal-400 font-medium mt-1 flex items-center gap-1">
                  <ArrowUpRight className="size-3" /> 1 upcoming
                </p>
              </div>
              <div className="size-12 rounded-xl bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center">
                <CalendarCheck className="size-6 text-teal-600 dark:text-teal-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Pending Invoices</p>
                <p className="text-3xl font-bold text-foreground mt-1">$509.99</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1 flex items-center gap-1">
                  <AlertCircle className="size-3" /> 1 overdue
                </p>
              </div>
              <div className="size-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
                <Receipt className="size-6 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Total Spent</p>
                <p className="text-3xl font-bold text-foreground mt-1">$1,820</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1 flex items-center gap-1">
                  <TrendingUp className="size-3" /> This year
                </p>
              </div>
              <div className="size-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                <CreditCard className="size-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-4">
            {RECENT_ACTIVITY.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.id} className="flex items-start gap-3">
                  <div className={cn('mt-0.5', item.color)}>
                    <Icon className="size-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{item.text}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BookingsView() {
  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-sm">Manage your service bookings and appointments</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Search bookings..." className="pl-9 w-48" />
          </div>
          <Button className="bg-teal-600 hover:bg-teal-700 text-white">
            <Plus className="size-4 mr-2" />
            New Booking
          </Button>
        </div>
      </div>

      {/* Booking Cards */}
      <div className="space-y-3">
        {PLACEHOLDER_BOOKINGS.map((booking) => (
          <Card key={booking.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <h3 className="font-semibold text-foreground">{booking.service}</h3>
                    {getBookingStatusBadge(booking.status)}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="size-3.5" />
                      {booking.date} at {booking.time}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3.5" />
                      {booking.address}
                    </span>
                    {booking.assignee !== '--' && (
                      <span className="flex items-center gap-1">
                        <UserCircle className="size-3.5" />
                        {booking.assignee}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-mono">{booking.id}</span>
                  <Button variant="ghost" size="icon" className="size-8">
                    <MoreVertical className="size-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Orders View ────────────────────────────────────────────────────────────

interface EcommerceOrderItem {
  name?: string;
  title?: string;
  qty?: number;
  quantity?: number;
  price?: number;
  sku?: string;
}

interface EcommerceOrder {
  id: string;
  orderNumber: string | null;
  status: string;
  financialStatus: string | null;
  fulfillmentStatus: string | null;
  customerEmail: string | null;
  customerName: string | null;
  subtotal: number;
  total: number;
  currency: string;
  discountTotal: number;
  taxTotal: number;
  shippingTotal: number;
  items: EcommerceOrderItem[];
  shippingAddress: Record<string, unknown> | null;
  tags: string[];
  orderedAt: string | null;
  integration: { id: string; provider: string; name: string } | null;
}

function getOrderStatusBadge(status: string) {
  const config: Record<string, { label: string; className: string }> = {
    delivered: { label: 'Delivered', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800' },
    shipped: { label: 'Shipped', className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800' },
    processing: { label: 'Processing', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800' },
    confirmed: { label: 'Confirmed', className: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-800' },
    pending: { label: 'Pending', className: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/40 dark:text-gray-400 dark:border-gray-800' },
    cancelled: { label: 'Cancelled', className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800' },
    refunded: { label: 'Refunded', className: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800' },
  };
  const c = config[status] || { label: status, className: 'bg-gray-50 text-gray-700 border-gray-200' };
  return <Badge variant="outline" className={cn('text-xs font-medium', c.className)}>{c.label}</Badge>;
}

function getFinancialStatusBadge(status: string | null) {
  if (!status) return null;
  const config: Record<string, { label: string; className: string }> = {
    paid: { label: 'Paid', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800' },
    unpaid: { label: 'Unpaid', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800' },
    refunded: { label: 'Refunded', className: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800' },
    partially_refunded: { label: 'Partially Refunded', className: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800' },
  };
  const c = config[status] || { label: status, className: 'bg-gray-50 text-gray-700 border-gray-200' };
  return <Badge variant="outline" className={cn('text-xs font-medium', c.className)}>{c.label}</Badge>;
}

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function OrdersView({ customerEmail }: { customerEmail: string }) {
  const [orders, setOrders] = useState<EcommerceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ecommerce/orders?search=${encodeURIComponent(customerEmail)}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [customerEmail]);

  useEffect(() => {
    if (customerEmail) {
      fetchOrders();
    }
  }, [customerEmail, fetchOrders]);

  const toggleExpand = (orderId: string) => {
    setExpandedOrderId(prev => prev === orderId ? null : orderId);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">My Orders</h2>
          <p className="text-muted-foreground text-sm">Track and manage your e-commerce orders</p>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">My Orders</h2>
          <p className="text-muted-foreground text-sm">Track and manage your e-commerce orders</p>
        </div>
        <Card className="border-dashed">
          <CardContent className="p-12 flex flex-col items-center justify-center text-center">
            <div className="size-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <ShoppingBag className="size-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No orders yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">Your e-commerce orders will appear here once you place an order through our connected stores.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground">My Orders</h2>
        <p className="text-muted-foreground text-sm">Track and manage your e-commerce orders</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
              <ShoppingBag className="size-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Orders</p>
              <p className="text-lg font-bold text-foreground">{orders.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center">
              <Package className="size-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Delivered</p>
              <p className="text-lg font-bold text-foreground">{orders.filter(o => o.status === 'delivered').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
              <Truck className="size-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">In Transit</p>
              <p className="text-lg font-bold text-foreground">{orders.filter(o => o.status === 'shipped' || o.status === 'processing').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
              <IndianRupee className="size-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Spent</p>
              <p className="text-lg font-bold text-foreground">{formatINR(orders.reduce((sum, o) => sum + o.total, 0))}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Cards */}
      <div className="space-y-3">
        {orders.map((order) => {
          const isExpanded = expandedOrderId === order.id;
          const items = order.items || [];
          const orderDate = order.orderedAt ? new Date(order.orderedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
          const shippingAddr = order.shippingAddress as Record<string, string> | null;

          return (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-5">
                {/* Order Header - Clickable */}
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => toggleExpand(order.id)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h3 className="font-semibold text-foreground">#{order.orderNumber || order.id.slice(-6)}</h3>
                        {getOrderStatusBadge(order.status)}
                        {getFinancialStatusBadge(order.financialStatus)}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Package className="size-3.5" />
                          {items.length} {items.length === 1 ? 'item' : 'items'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="size-3.5" />
                          {orderDate}
                        </span>
                        {order.integration && (
                          <span className="text-xs capitalize">{order.integration.provider}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-foreground">{formatINR(order.total)}</span>
                      {isExpanded ? (
                        <ChevronUp className="size-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="size-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-border space-y-4">
                    {/* Line Items */}
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2">Items</h4>
                      <div className="space-y-2">
                        {items.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-2">
                              <Package className="size-4 text-muted-foreground" />
                              <span className="text-sm text-foreground">{item.name || item.title || 'Item'}</span>
                              {item.sku && <span className="text-xs text-muted-foreground font-mono">({item.sku})</span>}
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-muted-foreground">×{item.qty || item.quantity || 1}</span>
                              <span className="font-medium text-foreground">{formatINR((item.price || 0) * (item.qty || item.quantity || 1))}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Shipping Address */}
                    {shippingAddr && (
                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-2">Shipping Address</h4>
                        <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <MapPin className="size-4 mt-0.5 shrink-0" />
                            <div>
                              {shippingAddr.name && <p className="font-medium text-foreground">{shippingAddr.name}</p>}
                              <p>{[shippingAddr.address1, shippingAddr.address2, shippingAddr.city, shippingAddr.province, shippingAddr.zip].filter(Boolean).join(', ')}</p>
                              {shippingAddr.country && <p>{shippingAddr.country}</p>}
                              {shippingAddr.phone && <p className="flex items-center gap-1 mt-1"><Phone className="size-3" />{shippingAddr.phone}</p>}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Order Totals Breakdown */}
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2">Order Summary</h4>
                      <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="text-foreground">{formatINR(order.subtotal)}</span>
                        </div>
                        {order.taxTotal > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Tax</span>
                            <span className="text-foreground">{formatINR(order.taxTotal)}</span>
                          </div>
                        )}
                        {order.shippingTotal > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Shipping</span>
                            <span className="text-foreground">{formatINR(order.shippingTotal)}</span>
                          </div>
                        )}
                        {order.discountTotal > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Discount</span>
                            <span className="text-emerald-600 dark:text-emerald-400">-{formatINR(order.discountTotal)}</span>
                          </div>
                        )}
                        <Separator />
                        <div className="flex justify-between text-sm font-bold">
                          <span className="text-foreground">Total</span>
                          <span className="text-foreground">{formatINR(order.total)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Tags */}
                    {order.tags && order.tags.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {order.tags.map((tag, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">{tag}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function InvoicesView() {
  const totalPending = PLACEHOLDER_INVOICES.filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0);
  const totalOverdue = PLACEHOLDER_INVOICES.filter(i => i.status === 'overdue').reduce((s, i) => s + i.amount, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
              <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Paid</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(PLACEHOLDER_INVOICES.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0))}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
              <Clock className="size-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(totalPending)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-red-50 dark:bg-red-950/40 flex items-center justify-center">
              <AlertCircle className="size-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Overdue</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(totalOverdue)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base">Invoice History</CardTitle>
            <div className="flex items-center gap-2">
              <Select defaultValue="all">
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Invoice #</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs text-right">Amount</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PLACEHOLDER_INVOICES.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono text-xs font-medium">{invoice.id}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{invoice.date}</TableCell>
                    <TableCell className="text-xs text-right font-medium">{formatCurrency(invoice.amount)}</TableCell>
                    <TableCell>{getInvoiceStatusBadge(invoice.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="size-7">
                        <Download className="size-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PaymentsView() {
  return (
    <div className="space-y-6">
      {/* Saved Payment Methods */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-foreground">Saved Payment Methods</h3>
          <Button variant="outline" size="sm" className="text-teal-600 border-teal-200 hover:bg-teal-50 dark:text-teal-400 dark:border-teal-800 dark:hover:bg-teal-950/30">
            <Plus className="size-4 mr-1.5" />
            Add Method
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="border-teal-200 dark:border-teal-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center">
                    <CreditCard className="size-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-foreground">Visa</span>
                </div>
                <Badge variant="outline" className="text-[10px] bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-800">Default</Badge>
              </div>
              <p className="text-sm font-mono text-muted-foreground mb-1">•••• •••• •••• 4242</p>
              <p className="text-xs text-muted-foreground">Expires 12/2027</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                    <CreditCard className="size-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-foreground">Mastercard</span>
                </div>
              </div>
              <p className="text-sm font-mono text-muted-foreground mb-1">•••• •••• •••• 8888</p>
              <p className="text-xs text-muted-foreground">Expires 06/2026</p>
            </CardContent>
          </Card>

          <Card className="border-dashed border-2 flex items-center justify-center min-h-[120px] hover:border-teal-300 dark:hover:border-teal-700 transition-colors cursor-pointer">
            <CardContent className="p-4 flex flex-col items-center gap-2">
              <Plus className="size-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Add Payment Method</span>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />

      {/* Payment History */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base">Payment History</CardTitle>
            <Select defaultValue="all">
              <SelectTrigger className="w-36 h-8 text-xs">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
                <SelectItem value="1y">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Payment ID</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Method</TableHead>
                  <TableHead className="text-xs">Invoice</TableHead>
                  <TableHead className="text-xs text-right">Amount</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PLACEHOLDER_PAYMENTS.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono text-xs font-medium">{payment.id}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{payment.date}</TableCell>
                    <TableCell className="text-xs">{payment.method}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{payment.invoiceId}</TableCell>
                    <TableCell className="text-xs text-right font-medium">{formatCurrency(payment.amount)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">Completed</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MessagesView() {
  const [newMessage, setNewMessage] = useState('');

  return (
    <div className="space-y-0">
      <Card className="overflow-hidden">
        {/* Chat Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-teal-100 dark:bg-teal-950 flex items-center justify-center">
              <Zap className="size-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">ServiceOS Support</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />
                Online
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="size-8">
            <MoreVertical className="size-4" />
          </Button>
        </div>

        {/* Messages Area */}
        <ScrollArea className="h-[450px] p-4">
          <div className="space-y-4">
            {PLACEHOLDER_MESSAGES.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex',
                  msg.from === 'customer' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[80%] sm:max-w-[65%] rounded-2xl px-4 py-2.5',
                    msg.from === 'customer'
                      ? 'bg-teal-600 text-white rounded-br-md'
                      : 'bg-muted text-foreground rounded-bl-md'
                  )}
                >
                  <p className="text-sm leading-relaxed">{msg.text}</p>
                  <p className={cn(
                    'text-[10px] mt-1',
                    msg.from === 'customer' ? 'text-teal-100' : 'text-muted-foreground'
                  )}>
                    {msg.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-3 border-t border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="size-9 shrink-0 text-muted-foreground hover:text-foreground">
              <Paperclip className="size-4" />
            </Button>
            <div className="flex-1 relative">
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="pr-10 h-10 rounded-full bg-background border-border"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newMessage.trim()) {
                    setNewMessage('');
                  }
                }}
              />
              <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 size-7 text-muted-foreground hover:text-foreground">
                <Smile className="size-4" />
              </Button>
            </div>
            <Button
              size="icon"
              className="size-10 rounded-full bg-teal-600 hover:bg-teal-700 text-white shrink-0"
              disabled={!newMessage.trim()}
            >
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function ReviewsView() {
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [newRating, setNewRating] = useState(0);
  const [newReviewText, setNewReviewText] = useState('');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-muted-foreground text-sm">Share your experience and help others</p>
        </div>
        <Button
          className="bg-teal-600 hover:bg-teal-700 text-white"
          onClick={() => setShowWriteReview(!showWriteReview)}
        >
          <Star className="size-4 mr-2" />
          Write a Review
        </Button>
      </div>

      {/* Write Review Form */}
      {showWriteReview && (
        <Card className="border-teal-200 dark:border-teal-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Write a Review</CardTitle>
            <CardDescription>Your feedback helps us improve our services</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm mb-2 block">Select Service</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a completed service" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ac">AC Maintenance</SelectItem>
                  <SelectItem value="plumbing">Plumbing Repair</SelectItem>
                  <SelectItem value="electrical">Electrical Inspection</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm mb-2 block">Rating</Label>
              <StarRating value={newRating} onChange={setNewRating} size="lg" />
            </div>
            <div>
              <Label className="text-sm mb-2 block">Your Review</Label>
              <Textarea
                placeholder="Tell us about your experience..."
                value={newReviewText}
                onChange={(e) => setNewReviewText(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button className="bg-teal-600 hover:bg-teal-700 text-white">Submit Review</Button>
              <Button variant="outline" onClick={() => setShowWriteReview(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Reviews */}
      <div className="space-y-4">
        {PLACEHOLDER_REVIEWS.map((review) => (
          <Card key={review.id}>
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-3">
                <div>
                  <h3 className="font-semibold text-foreground">{review.service}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Technician: {review.assignee} &middot; {review.date}</p>
                </div>
                <StarRating value={review.rating} size="sm" />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{review.text}</p>
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7">
                  <ThumbsUp className="size-3.5 mr-1" />
                  Helpful
                </Button>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7">
                  <Edit className="size-3.5 mr-1" />
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ProfileView() {
  const auth = useAppStore((s) => s.auth);
  const customerName = auth.user?.name || 'Rajesh Kumar';
  const customerEmail = auth.user?.email || 'rajesh.kumar@email.com';
  const customerPhone = auth.user?.phone || '+91 98765 43210';

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <Avatar className="size-20 border-2 border-teal-200 dark:border-teal-800">
              <AvatarFallback className="bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300 text-2xl font-bold">
                {customerName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-foreground">{customerName}</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Customer since January 2025</p>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <Badge variant="outline" className="text-xs bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-800">
                  <Shield className="size-3 mr-1" />
                  Verified
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Star className="size-3 mr-1 text-amber-400 fill-amber-400" />
                  4.8 Rating
                </Badge>
              </div>
            </div>
            <Button variant="outline" className="text-teal-600 border-teal-200 hover:bg-teal-50 dark:text-teal-400 dark:border-teal-800 dark:hover:bg-teal-950/30">
              <Edit className="size-4 mr-2" />
              Edit Profile
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Profile Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal Information</CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Full Name</Label>
              <div className="relative">
                <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input id="profile-name" defaultValue={customerName} className="pl-9" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input id="profile-email" type="email" defaultValue={customerEmail} className="pl-9" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input id="profile-phone" type="tel" defaultValue={customerPhone} className="pl-9" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-company">Company (Optional)</Label>
              <div className="relative">
                <Home className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input id="profile-company" placeholder="Your company name" className="pl-9" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-address">Address</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Textarea
                id="profile-address"
                defaultValue="123 Oak Street, Apt 4B, Mumbai, Maharashtra 400001"
                className="pl-9 min-h-[80px]"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button className="bg-teal-600 hover:bg-teal-700 text-white">Save Changes</Button>
            <Button variant="outline">Cancel</Button>
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preferences</CardTitle>
          <CardDescription>Manage your notification and account preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-foreground">Email Notifications</p>
              <p className="text-xs text-muted-foreground">Receive booking updates via email</p>
            </div>
            <Button variant="outline" size="sm">Enabled</Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-foreground">SMS Notifications</p>
              <p className="text-xs text-muted-foreground">Get text messages for important updates</p>
            </div>
            <Button variant="outline" size="sm">Enabled</Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-foreground">WhatsApp Alerts</p>
              <p className="text-xs text-muted-foreground">Receive WhatsApp messages for bookings</p>
            </div>
            <Button variant="outline" size="sm">Enabled</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Layout Component ──────────────────────────────────────────────────

export function CustomerPortalLayout({ onLogout }: CustomerPortalLayoutProps) {
  const [activeView, setActiveView] = useState<CustomerView>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const auth = useAppStore((s) => s.auth);

  const customerName = auth.user?.name || 'Rajesh Kumar';
  const customerEmail = auth.user?.email || 'rajesh.kumar@email.com';
  const customerPhone = auth.user?.phone || '+91 98765 43210';

  const handleViewChange = (view: CustomerView) => {
    setActiveView(view);
    setMobileSidebarOpen(false);
  };

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />;
      case 'bookings':
        return <BookingsView />;
      case 'orders':
        return <OrdersView customerEmail={customerEmail} />;
      case 'invoices':
        return <InvoicesView />;
      case 'payments':
        return <PaymentsView />;
      case 'messages':
        return <MessagesView />;
      case 'reviews':
        return <ReviewsView />;
      case 'profile':
        return <ProfileView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen bg-muted/30 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col border-r border-border">
        <CustomerSidebar
          activeView={activeView}
          onViewChange={handleViewChange}
          onLogout={onLogout}
          customerName={customerName}
          customerPhone={customerPhone}
        />
      </aside>

      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
          </SheetHeader>
          <CustomerSidebar
            activeView={activeView}
            onViewChange={handleViewChange}
            onLogout={onLogout}
            customerName={customerName}
            customerPhone={customerPhone}
          />
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <CustomerHeader
          activeView={activeView}
          onMobileMenuToggle={() => setMobileSidebarOpen(true)}
        />

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default CustomerPortalLayout;

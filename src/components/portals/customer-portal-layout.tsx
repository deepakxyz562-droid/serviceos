'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
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
import { authFetch } from '@/lib/client-auth';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { toast } from 'sonner';
import { lazy, Suspense } from 'react';

// Lazy-load dialogs to keep the initial bundle small
const NewBookingDialog = lazy(() => import('./new-booking-dialog').then(m => ({ default: m.NewBookingDialog })));
const AddPaymentMethodDialog = lazy(() => import('./add-payment-method-dialog').then(m => ({ default: m.AddPaymentMethodDialog })));

// ─── Types ──────────────────────────────────────────────────────────────────

type CustomerView = 'dashboard' | 'bookings' | 'orders' | 'invoices' | 'payments' | 'messages' | 'reviews' | 'profile' | 'quotes';

interface CustomerPortalLayoutProps {
  onLogout?: () => void;
}

// ─── Sidebar Menu Items ─────────────────────────────────────────────────────

const SIDEBAR_ITEMS: { key: CustomerView; label: string; icon: React.ElementType }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'bookings', label: 'Bookings', icon: CalendarCheck },
  { key: 'orders', label: 'My Orders', icon: ShoppingBag },
  { key: 'invoices', label: 'Invoices', icon: Receipt },
  { key: 'quotes', label: 'Quotes', icon: FileText },
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
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function apiUrl(path: string) {
  // Append XTransformPort=3000 correctly, handling existing query params
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}XTransformPort=3000`;
}

function formatBookingDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatBookingTime(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatExpiry(month: number | null, year: number | null): string {
  if (!month || !year) return '';
  return `${String(month).padStart(2, '0')}/${String(year).slice(-2)}`;
}

function getPaymentBrandVisual(brand: string | null, type: string): { gradient: string; label: string } {
  if (type === 'upi') return { gradient: 'from-purple-600 to-purple-800', label: 'UPI' };
  if (type === 'bank') return { gradient: 'from-slate-600 to-slate-800', label: brand || 'Bank' };
  switch (brand) {
    case 'Visa': return { gradient: 'from-blue-600 to-blue-800', label: 'Visa' };
    case 'Mastercard': return { gradient: 'from-orange-500 to-red-600', label: 'Mastercard' };
    case 'Amex': return { gradient: 'from-teal-500 to-teal-700', label: 'Amex' };
    case 'Discover': return { gradient: 'from-amber-500 to-orange-600', label: 'Discover' };
    case 'RuPay': return { gradient: 'from-emerald-600 to-green-700', label: 'RuPay' };
    default: return { gradient: 'from-slate-500 to-slate-700', label: brand || 'Card' };
  }
}

function getBookingStatusBadge(status: string) {
  const config: Record<string, { label: string; className: string }> = {
    pending: { label: 'Pending', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800' },
    confirmed: { label: 'Confirmed', className: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-800' },
    upcoming: { label: 'Upcoming', className: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-800' },
    in_progress: { label: 'In Progress', className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800' },
    completed: { label: 'Completed', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800' },
    cancelled: { label: 'Cancelled', className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800' },
    no_show: { label: 'No Show', className: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/40 dark:text-gray-400 dark:border-gray-800' },
  };
  const c = config[status] || { label: status, className: 'bg-gray-50 text-gray-700 border-gray-200' };
  return <Badge variant="outline" className={cn('text-xs font-medium', c.className)}>{c.label}</Badge>;
}

function getInvoiceStatusBadge(status: string) {
  const config: Record<string, { label: string; className: string }> = {
    paid: { label: 'Paid', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800' },
    pending: { label: 'Pending', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800' },
    overdue: { label: 'Overdue', className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800' },
    draft: { label: 'Draft', className: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/40 dark:text-gray-400 dark:border-gray-800' },
    sent: { label: 'Sent', className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800' },
    pending_approval: { label: 'Pending Approval', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800' },
    cancelled: { label: 'Cancelled', className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800' },
  };
  const c = config[status] || { label: status, className: 'bg-gray-50 text-gray-700 border-gray-200' };
  return <Badge variant="outline" className={cn('text-xs font-medium', c.className)}>{c.label}</Badge>;
}

/**
 * Extract the real Customer ID from the auth user.
 * - Magic-link auth sets `user.id` to the real customer.id directly.
 * - Company-login (password) sets `user.id` to `cust_<customer.id>`.
 * This helper normalises both so we can filter invoices by customer.
 */
function getRealCustomerId(authUser: any): string | null {
  const raw = authUser?.id;
  if (!raw) return null;
  if (typeof raw === 'string' && raw.startsWith('cust_')) {
    return raw.slice(5);
  }
  return raw;
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
  tenant,
}: {
  activeView: CustomerView;
  onViewChange: (view: CustomerView) => void;
  onLogout?: () => void;
  customerName: string;
  customerPhone: string;
  tenant?: { name?: string | null; logo?: string | null; slug?: string | null; industry?: string | null } | null;
}) {
  const companyName = tenant?.name || 'Customer Portal';
  const companyLogo = tenant?.logo || null;
  // Build initials for the logo fallback from the company name
  const companyInitials = companyName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() || '')
    .join('');

  return (
    <div className="flex h-full flex-col bg-card border-r border-border">
      {/* Company Logo & Name — shows the registered company (tenant) the customer belongs to */}
      <div className="p-5 pb-4">
        <div className="flex items-center gap-2.5 mb-4">
          {companyLogo ? (
            <img
              src={companyLogo}
              alt={companyName}
              className="size-9 rounded-lg object-cover border border-border"
            />
          ) : (
            <div className="flex items-center justify-center size-9 rounded-lg bg-teal-600 shrink-0">
              <span className="text-white text-sm font-bold">{companyInitials || <Zap className="size-5 text-white" />}</span>
            </div>
          )}
          <div className="min-w-0">
            <span className="text-base font-bold text-foreground tracking-tight truncate block">{companyName}</span>
            {tenant?.industry ? (
              <span className="text-[11px] text-muted-foreground truncate block capitalize">{tenant.industry}</span>
            ) : null}
          </div>
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
  const companyName = auth.tenant?.name || 'Customer Portal';

  const viewTitle: Record<CustomerView, string> = {
    dashboard: 'Dashboard',
    bookings: 'Bookings',
    orders: 'Orders',
    invoices: 'Invoices',
    quotes: 'Quotes',
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
        {/* Show company name on mobile (sidebar hidden) for context */}
        <span className="hidden sm:block text-xs text-muted-foreground font-normal ml-1 truncate max-w-[140px] lg:hidden">
          · {companyName}
        </span>
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

// ─── Types for real data ────────────────────────────────────────────────────

interface InvoiceItem {
  id: string;
  number: string;
  amount: number;
  tax: number;
  discount: number;
  total: number;
  currency: string;
  status: string; // draft, sent, paid, pending_approval, cancelled
  dueDate?: string | null;
  sentAt?: string | null;
  paidAt?: string | null;
  createdAt: string;
  customer?: { id: string; name: string; email: string | null; phone: string | null } | null;
  job?: { id: string; title: string } | null;
}

interface BookingItem {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  source: string;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  serviceId?: string | null;
  address?: string | null;
  scheduledAt?: string | null;
  scheduledEndTime?: string | null;
  duration: number;
  notes?: string | null;
  employee?: { id: string; name: string; phone: string; avatar?: string | null } | null;
  createdAt: string;
}

interface PaymentMethodItem {
  id: string;
  type: string;
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
  holderName: string | null;
  upiId: string | null;
  bankName: string | null;
  isDefault: boolean;
  createdAt: string;
}

// ─── Sub-Views ──────────────────────────────────────────────────────────────

function DashboardView({ onNewBooking, customerName, bookings, bookingsLoading }: {
  onNewBooking: () => void;
  customerName: string;
  bookings: BookingItem[];
  bookingsLoading: boolean;
}) {
  const activeBookings = bookings.filter(b => ['pending', 'confirmed', 'in_progress'].includes(b.status));
  const upcomingBookings = bookings
    .filter(b => ['pending', 'confirmed'].includes(b.status) && b.scheduledAt && new Date(b.scheduledAt) > new Date())
    .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <Card className="border-teal-200 dark:border-teal-800 bg-gradient-to-br from-teal-50 to-white dark:from-teal-950/40 dark:to-card">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-foreground">Welcome back, {customerName.split(' ')[0]}! 👋</h2>
              <p className="text-muted-foreground mt-1">Here&apos;s what&apos;s happening with your services today.</p>
            </div>
            <Button onClick={onNewBooking} className="bg-teal-600 hover:bg-teal-700 text-white self-start">
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
                {bookingsLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-3xl font-bold text-foreground mt-1">{activeBookings.length}</p>
                )}
                <p className="text-xs text-teal-600 dark:text-teal-400 font-medium mt-1 flex items-center gap-1">
                  <ArrowUpRight className="size-3" /> {upcomingBookings.length} upcoming
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
                <p className="text-sm text-muted-foreground font-medium">Completed Services</p>
                {bookingsLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-3xl font-bold text-foreground mt-1">{bookings.filter(b => b.status === 'completed').length}</p>
                )}
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1 flex items-center gap-1">
                  <CheckCircle2 className="size-3" /> All time
                </p>
              </div>
              <div className="size-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                <CheckCircle2 className="size-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Payment Methods</p>
                <p className="text-3xl font-bold text-foreground mt-1">—</p>
                <p className="text-xs text-muted-foreground font-medium mt-1 flex items-center gap-1">
                  <CreditCard className="size-3" /> See Payments
                </p>
              </div>
              <div className="size-12 rounded-xl bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center">
                <CreditCard className="size-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Bookings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Upcoming Bookings</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {bookingsLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-lg" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : upcomingBookings.length === 0 ? (
            <div className="text-center py-8">
              <CalendarCheck className="size-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No upcoming bookings</p>
              <Button onClick={onNewBooking} variant="outline" size="sm" className="mt-3 text-teal-600 border-teal-200 hover:bg-teal-50">
                <Plus className="size-4 mr-1.5" />
                Book a Service
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingBookings.map(booking => (
                <div key={booking.id} className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                  <div className="size-10 rounded-lg bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center shrink-0">
                    <CalendarCheck className="size-5 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{booking.title}</p>
                      {getBookingStatusBadge(booking.status)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Calendar className="size-3" />
                      {formatBookingDate(booking.scheduledAt)} at {formatBookingTime(booking.scheduledAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BookingsView({ bookings, loading, error, onNewBooking, onRetry, initialBookingId }: {
  bookings: BookingItem[];
  loading: boolean;
  error: string | null;
  onNewBooking: () => void;
  onRetry: () => void;
  initialBookingId?: string | null;
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Auto-expand the deep-linked booking when the magic-link redirect target
  // arrives (it's set asynchronously by the parent after mount). Uses the
  // React-recommended "adjust state when a prop changes" pattern instead of
  // a useEffect to avoid cascading renders.
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [prevInitialBookingId, setPrevInitialBookingId] = useState<string | null | undefined>(initialBookingId);
  if (initialBookingId !== prevInitialBookingId) {
    setPrevInitialBookingId(initialBookingId);
    if (initialBookingId) {
      setExpandedId(initialBookingId);
    }
  }

  const filtered = bookings.filter(b => {
    const matchesSearch = !search ||
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      (b.description?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeStatuses = ['pending', 'confirmed', 'in_progress'];
  const active = filtered.filter(b => activeStatuses.includes(b.status));
  const past = filtered.filter(b => !activeStatuses.includes(b.status));

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
            <Input
              placeholder="Search bookings..."
              className="pl-9 w-48"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Button onClick={onNewBooking} className="bg-teal-600 hover:bg-teal-700 text-white">
            <Plus className="size-4 mr-2" />
            New Booking
          </Button>
        </div>
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2">
        {['all', 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium transition-colors',
              statusFilter === s
                ? 'bg-teal-600 text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="p-6 text-center">
            <AlertCircle className="size-10 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={onRetry}>Retry</Button>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && filtered.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <CalendarCheck className="size-12 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-foreground mb-1">No bookings yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Book a service to get started.</p>
            <Button onClick={onNewBooking} className="bg-teal-600 hover:bg-teal-700 text-white">
              <Plus className="size-4 mr-2" />
              Book a Service
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Active bookings */}
      {!loading && !error && active.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Active</h3>
          {active.map(booking => (
            <Card key={booking.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-5">
                <button
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full text-left"
                  onClick={() => setExpandedId(expandedId === booking.id ? null : booking.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="font-semibold text-foreground">{booking.title}</h3>
                      {getBookingStatusBadge(booking.status)}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3.5" />
                        {formatBookingDate(booking.scheduledAt)} at {formatBookingTime(booking.scheduledAt)}
                      </span>
                      {booking.address && (
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3.5" />
                          <span className="truncate max-w-[200px]">{booking.address}</span>
                        </span>
                      )}
                      {booking.employee && (
                        <span className="flex items-center gap-1">
                          <UserCircle className="size-3.5" />
                          {booking.employee.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-mono">{booking.id.slice(-8)}</span>
                    {expandedId === booking.id ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                  </div>
                </button>
                {expandedId === booking.id && (booking.description || booking.notes) && (
                  <div className="mt-3 pt-3 border-t border-border space-y-2 text-sm">
                    {booking.description && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase">Description</p>
                        <p className="text-foreground">{booking.description}</p>
                      </div>
                    )}
                    {booking.notes && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase">Notes</p>
                        <p className="text-foreground">{booking.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Past bookings */}
      {!loading && !error && past.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Past</h3>
          {past.map(booking => (
            <Card key={booking.id} className="opacity-75 hover:opacity-100 transition-opacity">
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="font-semibold text-foreground">{booking.title}</h3>
                      {getBookingStatusBadge(booking.status)}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3.5" />
                        {formatBookingDate(booking.scheduledAt)} at {formatBookingTime(booking.scheduledAt)}
                      </span>
                      {booking.employee && (
                        <span className="flex items-center gap-1">
                          <UserCircle className="size-3.5" />
                          {booking.employee.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">{booking.id.slice(-8)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
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
      const res = await fetch(apiUrl(`/api/ecommerce/orders?search=${encodeURIComponent(customerEmail)}`));
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

function InvoicesView({ initialInvoiceId }: { initialInvoiceId?: string | null }) {
  const auth = useAppStore((s) => s.auth);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const customerId = getRealCustomerId(auth.user);
      // Build query — filter by customerId so the customer only sees their own invoices
      const params = new URLSearchParams({ limit: '200' });
      if (customerId) params.set('customerId', customerId);
      const res = await fetch(apiUrl(`/api/invoices?${params.toString()}`), {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to load invoices');
      const data = await res.json();
      setInvoices(data.invoices || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [auth.user]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Auto-expand the deep-linked invoice on first render (magic-link redirect)
  useEffect(() => {
    if (initialInvoiceId && invoices.length > 0) {
      const exists = invoices.some(i => i.id === initialInvoiceId || i.number === initialInvoiceId);
      if (exists) setExpandedId(initialInvoiceId);
    }
  }, [initialInvoiceId, invoices]);

  // Compute summary totals from real data
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.total || i.amount), 0);
  const totalPending = invoices
    .filter(i => ['sent', 'pending', 'pending_approval'].includes(i.status))
    .reduce((s, i) => s + (i.total || i.amount), 0);
  const totalOverdue = invoices
    .filter(i => i.status !== 'paid' && i.status !== 'cancelled' && i.dueDate && new Date(i.dueDate) < new Date())
    .reduce((s, i) => s + (i.total || i.amount), 0);

  // Apply status filter
  const filteredInvoices = statusFilter === 'all'
    ? invoices
    : invoices.filter(i => {
        if (statusFilter === 'overdue') {
          return i.status !== 'paid' && i.status !== 'cancelled' && i.dueDate && new Date(i.dueDate) < new Date();
        }
        return i.status === statusFilter;
      });

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Invoices</h2>
          <p className="text-muted-foreground text-sm">View and manage your invoices</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-12 w-full" /></CardContent></Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-4 space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Invoices</h2>
          <p className="text-muted-foreground text-sm">View and manage your invoices</p>
        </div>
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="p-6 text-center">
            <AlertCircle className="size-10 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchInvoices}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
              <p className="text-lg font-bold text-foreground">{formatCurrency(totalPaid)}</p>
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
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 h-8 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="pending_approval">Pending Approval</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="size-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No invoices found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Invoice #</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Due Date</TableHead>
                    <TableHead className="text-xs text-right">Amount</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => {
                    const isExpanded = expandedId === invoice.id || expandedId === invoice.number;
                    const isOverdue = invoice.status !== 'paid' && invoice.status !== 'cancelled' && invoice.dueDate && new Date(invoice.dueDate) < new Date();
                    return (
                      <Fragment key={invoice.id}>
                        <TableRow
                          className="cursor-pointer hover:bg-muted/30"
                          onClick={() => setExpandedId(isExpanded ? null : invoice.id)}
                        >
                          <TableCell className="font-mono text-xs font-medium">{invoice.number}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatBookingDate(invoice.createdAt)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {invoice.dueDate ? formatBookingDate(invoice.dueDate) : '—'}
                            {isOverdue ? <span className="ml-1 text-red-600 dark:text-red-400 font-medium">(overdue)</span> : null}
                          </TableCell>
                          <TableCell className="text-xs text-right font-medium">{formatCurrency(invoice.total || invoice.amount)}</TableCell>
                          <TableCell>{getInvoiceStatusBadge(invoice.status)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" className="size-7" onClick={(e) => e.stopPropagation()}>
                              <Download className="size-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                        {isExpanded ? (
                          <TableRow className="bg-muted/20">
                            <TableCell colSpan={6} className="p-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                <div>
                                  <p className="text-muted-foreground mb-1">Invoice Number</p>
                                  <p className="font-mono font-medium text-foreground">{invoice.number}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground mb-1">Status</p>
                                  <div>{getInvoiceStatusBadge(invoice.status)}</div>
                                </div>
                                <div>
                                  <p className="text-muted-foreground mb-1">Subtotal</p>
                                  <p className="font-medium text-foreground">{formatCurrency(invoice.amount)}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground mb-1">Tax</p>
                                  <p className="font-medium text-foreground">{formatCurrency(invoice.tax)}</p>
                                </div>
                                {invoice.discount > 0 ? (
                                  <div>
                                    <p className="text-muted-foreground mb-1">Discount</p>
                                    <p className="font-medium text-foreground">-{formatCurrency(invoice.discount)}</p>
                                  </div>
                                ) : null}
                                <div>
                                  <p className="text-muted-foreground mb-1">Total</p>
                                  <p className="font-bold text-foreground">{formatCurrency(invoice.total)}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground mb-1">Sent</p>
                                  <p className="font-medium text-foreground">{invoice.sentAt ? formatBookingDate(invoice.sentAt) : 'Not sent'}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground mb-1">Paid</p>
                                  <p className="font-medium text-foreground">{invoice.paidAt ? formatBookingDate(invoice.paidAt) : '—'}</p>
                                </div>
                                {invoice.job ? (
                                  <div className="sm:col-span-2">
                                    <p className="text-muted-foreground mb-1">Related Job</p>
                                    <p className="font-medium text-foreground">{invoice.job.title}</p>
                                  </div>
                                ) : null}
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PaymentsView({ paymentMethods, loading, error, onAddMethod, onRetry, onDataChange }: {
  paymentMethods: PaymentMethodItem[];
  loading: boolean;
  error: string | null;
  onAddMethod: () => void;
  onRetry: () => void;
  onDataChange: () => void;
}) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const handleSetDefault = async (id: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/customer/payment-methods/${id}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isDefault: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to set default');
      }
      toast.success('Default payment method updated.');
      onDataChange();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setActionLoading(true);
    try {
      const res = await fetch(apiUrl(`/api/customer/payment-methods/${deleteId}`), {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete');
      }
      toast.success('Payment method removed.');
      setDeleteId(null);
      onDataChange();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Saved Payment Methods */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-foreground">Saved Payment Methods</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={onAddMethod}
            className="text-teal-600 border-teal-200 hover:bg-teal-50 dark:text-teal-400 dark:border-teal-800 dark:hover:bg-teal-950/30"
          >
            <Plus className="size-4 mr-1.5" />
            Add Method
          </Button>
        </div>

        {/* Error state */}
        {error && (
          <Card className="border-red-200 dark:border-red-800">
            <CardContent className="p-6 text-center">
              <AlertCircle className="size-10 text-red-500 mx-auto mb-2" />
              <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
              <Button variant="outline" size="sm" onClick={onRetry}>Retry</Button>
            </CardContent>
          </Card>
        )}

        {/* Loading state */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2].map(i => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Skeleton className="size-8 rounded" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && paymentMethods.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <CreditCard className="size-12 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-foreground mb-1">No payment methods</h3>
              <p className="text-sm text-muted-foreground mb-4">Add a card or UPI ID for faster checkout.</p>
              <Button onClick={onAddMethod} className="bg-teal-600 hover:bg-teal-700 text-white">
                <Plus className="size-4 mr-2" />
                Add Payment Method
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Payment method cards */}
        {!loading && !error && paymentMethods.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paymentMethods.map(pm => {
              const visual = getPaymentBrandVisual(pm.brand, pm.type);
              return (
                <Card key={pm.id} className={cn(pm.isDefault && 'border-teal-200 dark:border-teal-800')}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={cn('size-8 rounded bg-gradient-to-br flex items-center justify-center', visual.gradient)}>
                          <CreditCard className="size-4 text-white" />
                        </div>
                        <span className="text-sm font-medium text-foreground">{visual.label}</span>
                      </div>
                      {pm.isDefault && (
                        <Badge variant="outline" className="text-[10px] bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-800">Default</Badge>
                      )}
                    </div>
                    {pm.type === 'upi' ? (
                      <p className="text-sm font-mono text-muted-foreground mb-1">{pm.upiId}</p>
                    ) : (
                      <>
                        <p className="text-sm font-mono text-muted-foreground mb-1">•••• •••• •••• {pm.last4}</p>
                        {pm.expMonth && pm.expYear && (
                          <p className="text-xs text-muted-foreground">Expires {formatExpiry(pm.expMonth, pm.expYear)}</p>
                        )}
                      </>
                    )}
                    <div className="flex items-center gap-2 mt-3">
                      {!pm.isDefault && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-teal-600 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-950/30"
                          onClick={() => handleSetDefault(pm.id)}
                          disabled={actionLoading}
                        >
                          Set Default
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                        onClick={() => setDeleteId(pm.id)}
                        disabled={actionLoading}
                      >
                        Remove
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Add new tile */}
            <Card
              className="border-dashed border-2 flex items-center justify-center min-h-[160px] hover:border-teal-300 dark:hover:border-teal-700 transition-colors cursor-pointer"
              onClick={onAddMethod}
            >
              <CardContent className="p-4 flex flex-col items-center gap-2">
                <Plus className="size-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Add Payment Method</span>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove payment method?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The payment method will be permanently removed from your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {actionLoading ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Quotes View ────────────────────────────────────────────────────────────

interface QuoteLineItem {
  name?: string;
  title?: string;
  description?: string;
  price?: number;
  quantity?: number;
}

interface QuoteItem {
  id: string;
  title: string;
  description?: string | null;
  customerName?: string | null;
  customerId?: string;
  customerPhone?: string | null;
  services: QuoteLineItem[];
  addOns: QuoteLineItem[];
  subtotal: number;
  discountType: string;
  discountValue: number;
  discount: number;
  taxRate: number;
  tax: number;
  total: number;
  currency: string;
  status: string;
  validUntil: string | null;
  whatsappSent: boolean | null;
  createdAt: string;
}

function getQuoteStatusBadge(status: string) {
  const config: Record<string, { label: string; className: string }> = {
    draft: { label: 'Draft', className: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950/40 dark:text-gray-400 dark:border-gray-800' },
    sent: { label: 'Sent', className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800' },
    accepted: { label: 'Accepted', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800' },
    declined: { label: 'Declined', className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800' },
    expired: { label: 'Expired', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800' },
  };
  const c = config[status] || { label: status, className: 'bg-gray-50 text-gray-700 border-gray-200' };
  return <Badge variant="outline" className={cn('text-xs font-medium', c.className)}>{c.label}</Badge>;
}

function formatQuoteDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function QuotesView({ initialQuoteId }: { initialQuoteId?: string | null }) {
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/quotes?limit=100&XTransformPort=3000', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to load quotes');
      const data = await res.json();
      setQuotes(Array.isArray(data) ? data : (data.quotes || []));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load quotes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  // Auto-open the deep-linked quote on first render (magic-link redirect).
  useEffect(() => {
    if (initialQuoteId) {
      setSelectedQuoteId(initialQuoteId);
    }
  }, [initialQuoteId]);

  const selectedQuote = quotes.find(q => q.id === selectedQuoteId);

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Quotes</h2>
          <p className="text-muted-foreground text-sm">Review quotes we&apos;ve sent you</p>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
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

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Quotes</h2>
          <p className="text-muted-foreground text-sm">Review quotes we&apos;ve sent you</p>
        </div>
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="p-6 text-center">
            <AlertCircle className="size-10 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchQuotes}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Empty state
  if (quotes.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Quotes</h2>
          <p className="text-muted-foreground text-sm">Review quotes we&apos;ve sent you</p>
        </div>
        <Card className="border-dashed">
          <CardContent className="p-12 flex flex-col items-center justify-center text-center">
            <div className="size-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <FileText className="size-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No quotes yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Quotes we send you will appear here. You can review line items and totals, then accept or decline.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground">Quotes</h2>
        <p className="text-muted-foreground text-sm">Review quotes we&apos;ve sent you</p>
      </div>

      {/* Quote Cards */}
      <div className="space-y-3">
        {quotes.map((quote) => {
          const lineItemsCount = (quote.services?.length || 0) + (quote.addOns?.length || 0);
          return (
            <Card key={quote.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedQuoteId(quote.id)}>
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="font-semibold text-foreground truncate">{quote.title}</h3>
                      {getQuoteStatusBadge(quote.status)}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <FileText className="size-3.5" />
                        {lineItemsCount} {lineItemsCount === 1 ? 'item' : 'items'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3.5" />
                        Created {formatQuoteDate(quote.createdAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3.5" />
                        Valid until {formatQuoteDate(quote.validUntil)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-foreground">{formatCurrency(quote.total)}</span>
                    <ChevronDown className="size-4 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quote detail Sheet */}
      <Sheet open={!!selectedQuote} onOpenChange={(open) => !open && setSelectedQuoteId(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-left">{selectedQuote?.title || 'Quote'}</SheetTitle>
          </SheetHeader>
          {selectedQuote && (
            <div className="px-4 pb-6 space-y-5">
              {/* Meta */}
              <div className="flex flex-wrap items-center gap-2">
                {getQuoteStatusBadge(selectedQuote.status)}
                <Badge variant="outline" className="text-xs font-mono">#{selectedQuote.id.slice(-8)}</Badge>
                {selectedQuote.whatsappSent && (
                  <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                    WhatsApp sent
                  </Badge>
                )}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-foreground font-medium">{formatQuoteDate(selectedQuote.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valid until</p>
                  <p className="text-foreground font-medium">{formatQuoteDate(selectedQuote.validUntil)}</p>
                </div>
              </div>

              {/* Description */}
              {selectedQuote.description && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Description</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{selectedQuote.description}</p>
                </div>
              )}

              {/* Line items */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">Line Items</h4>
                <div className="space-y-2">
                  {(selectedQuote.services || []).map((item, idx) => (
                    <div key={`svc-${idx}`} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="size-4 text-muted-foreground shrink-0" />
                        <span className="text-sm text-foreground truncate">{item.name || item.title || 'Service'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm shrink-0">
                        <span className="text-muted-foreground">×{item.quantity || 1}</span>
                        <span className="font-medium text-foreground">{formatCurrency((item.price || 0) * (item.quantity || 1))}</span>
                      </div>
                    </div>
                  ))}
                  {(selectedQuote.addOns || []).map((item, idx) => (
                    <div key={`add-${idx}`} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2 min-w-0">
                        <Plus className="size-4 text-muted-foreground shrink-0" />
                        <span className="text-sm text-foreground truncate">{item.name || item.title || 'Add-on'}</span>
                      </div>
                      <span className="text-sm font-medium text-foreground shrink-0">{formatCurrency(item.price || 0)}</span>
                    </div>
                  ))}
                  {(selectedQuote.services || []).length === 0 && (selectedQuote.addOns || []).length === 0 && (
                    <p className="text-sm text-muted-foreground italic">No line items.</p>
                  )}
                </div>
              </div>

              {/* Totals */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">Summary</h4>
                <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-foreground">{formatCurrency(selectedQuote.subtotal)}</span>
                  </div>
                  {selectedQuote.discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Discount{selectedQuote.discountType === 'percentage' ? ` (${selectedQuote.discountValue || 0}%)` : ''}
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-400">-{formatCurrency(selectedQuote.discount)}</span>
                    </div>
                  )}
                  {selectedQuote.tax > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax ({selectedQuote.taxRate || 0}%)</span>
                      <span className="text-foreground">{formatCurrency(selectedQuote.tax)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-foreground">Total</span>
                    <span className="text-foreground">{formatCurrency(selectedQuote.total)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function MessagesView() {
  const [newMessage, setNewMessage] = useState('');
  const auth = useAppStore((s) => s.auth);
  const companyName = auth.tenant?.name || 'Support';

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
              <p className="text-sm font-semibold text-foreground">{companyName} Support</p>
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

interface ReviewItem {
  id: string;
  rating: number;
  comment: string | null;
  status: string; // published, pending, flagged
  source: string | null;
  customerName?: string | null;
  employeeName?: string | null;
  serviceName?: string | null;
  createdAt: string;
}

function ReviewsView() {
  const auth = useAppStore((s) => s.auth);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [newRating, setNewRating] = useState(0);
  const [newReviewText, setNewReviewText] = useState('');

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const customerId = getRealCustomerId(auth.user);
      const params = new URLSearchParams({ limit: '100' });
      if (customerId) params.set('customerId', customerId);
      const res = await fetch(apiUrl(`/api/reviews?${params.toString()}`), {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to load reviews');
      const data = await res.json();
      setReviews(data.reviews || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [auth.user]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : '—';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Reviews</h2>
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
              <Button className="bg-teal-600 hover:bg-teal-700 text-white" disabled={newRating === 0 || !newReviewText.trim()}>
                Submit Review
              </Button>
              <Button variant="outline" onClick={() => { setShowWriteReview(false); setNewRating(0); setNewReviewText(''); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {loading ? (
        <Card>
          <CardContent className="p-4 space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="p-6 text-center">
            <AlertCircle className="size-10 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchReviews}>Retry</Button>
          </CardContent>
        </Card>
      ) : reviews.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 flex flex-col items-center justify-center text-center">
            <div className="size-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <Star className="size-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No reviews yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Reviews you submit will appear here. Share your experience to help others.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Average rating card */}
          <Card className="bg-gradient-to-br from-teal-50 to-white dark:from-teal-950/40 dark:to-card border-teal-200 dark:border-teal-800">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="text-center">
                <p className="text-4xl font-bold text-teal-700 dark:text-teal-400">{avgRating}</p>
                <StarRating value={Math.round(Number(avgRating))} readonly size="sm" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}</p>
                <p className="text-xs text-muted-foreground">Based on your submitted reviews</p>
              </div>
            </CardContent>
          </Card>

          {/* Existing Reviews */}
          <div className="space-y-4">
            {reviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="font-semibold text-foreground">{review.serviceName || 'Service Review'}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {review.employeeName ? `Technician: ${review.employeeName} · ` : ''}
                        {formatBookingDate(review.createdAt)}
                        {review.status === 'pending' ? ' · Pending' : ''}
                      </p>
                    </div>
                    <StarRating value={review.rating} size="sm" />
                  </div>
                  {review.comment ? (
                    <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No written comment provided.</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ProfileView() {
  const auth = useAppStore((s) => s.auth);
  const customerName = auth.user?.name || 'Customer';
  const customerEmail = auth.user?.email || '';
  const customerPhone = auth.user?.phone || '';
  const companyName = auth.tenant?.name || '';

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
              <p className="text-sm text-muted-foreground mt-0.5">Customer{companyName ? ` · ${companyName}` : ''}</p>
              <div className="flex flex-wrap items-center gap-3 mt-2">
                <Badge variant="outline" className="text-xs bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-800">
                  <Shield className="size-3 mr-1" />
                  Verified
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
                <Input id="profile-company" placeholder="Your company name" defaultValue={companyName} className="pl-9" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-address">Address</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Textarea
                id="profile-address"
                placeholder="Enter your address"
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

  // Deep-link targets — set once on mount when a customer magic-link redirect
  // is present in sessionStorage (consumed & cleared below). Each sub-view
  // receives its target as an `initialXxxId` prop and auto-opens the detail.
  const [deepLinkBookingId, setDeepLinkBookingId] = useState<string | null>(null);
  const [deepLinkInvoiceId, setDeepLinkInvoiceId] = useState<string | null>(null);
  const [deepLinkQuoteId, setDeepLinkQuoteId] = useState<string | null>(null);

  // Dialog state
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);

  // Data state
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingsError, setBookingsError] = useState<string | null>(null);

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodItem[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);

  // dataNonce forces a re-fetch when incremented (after creating new data)
  const [dataNonce, setDataNonce] = useState(0);

  const customerName = auth.user?.name || 'Customer';
  const customerEmail = auth.user?.email || '';
  const customerPhone = auth.user?.phone || '';

  // Fetch bookings
  const fetchBookings = useCallback(async () => {
    setBookingsLoading(true);
    setBookingsError(null);
    try {
      const res = await fetch(apiUrl('/api/bookings'), { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load bookings');
      const data = await res.json();
      setBookings(data.bookings || data || []);
    } catch (e) {
      setBookingsError(e instanceof Error ? e.message : 'Failed to load bookings');
    } finally {
      setBookingsLoading(false);
    }
  }, []);

  // Fetch payment methods
  const fetchPaymentMethods = useCallback(async () => {
    setPaymentsLoading(true);
    setPaymentsError(null);
    try {
      const res = await fetch(apiUrl('/api/customer/payment-methods'), { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load payment methods');
      const data = await res.json();
      setPaymentMethods(data.paymentMethods || []);
    } catch (e) {
      setPaymentsError(e instanceof Error ? e.message : 'Failed to load payment methods');
    } finally {
      setPaymentsLoading(false);
    }
  }, []);

  // Fetch bookings on mount + when dataNonce changes
  useEffect(() => {
    fetchBookings();
  }, [fetchBookings, dataNonce]);

  // ── Consume magic-link redirect target on first mount ──────────────────
  // page.tsx stashes `mgl_redirect` in sessionStorage after a successful
  // magic-link exchange. Parse it, deep-link into the relevant portal view,
  // then clear it so a refresh doesn't re-trigger the deep-link.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let redirect: string | null = null;
    try {
      redirect = sessionStorage.getItem('mgl_redirect');
    } catch {
      // sessionStorage unavailable — nothing to deep-link to
      return;
    }
    if (!redirect) return;
    // Always clear so it only fires once
    try { sessionStorage.removeItem('mgl_redirect'); } catch {}

    if (redirect === '/' || !redirect.startsWith('/')) {
      setActiveView('dashboard');
      return;
    }

    const parts = redirect.replace(/^\//, '').split('/');
    const resource = parts[0];
    const id = parts[1];

    if (resource === 'invoices' && id) {
      setActiveView('invoices');
      setDeepLinkInvoiceId(id);
    } else if ((resource === 'jobs' || resource === 'bookings') && id) {
      setActiveView('bookings');
      setDeepLinkBookingId(id);
    } else if (resource === 'quotes' && id) {
      setActiveView('quotes');
      setDeepLinkQuoteId(id);
    } else {
      setActiveView('dashboard');
    }
  }, []);

  // Fetch payment methods when payments view is opened + when dataNonce changes
  useEffect(() => {
    if (activeView === 'payments') {
      fetchPaymentMethods();
    }
  }, [activeView, fetchPaymentMethods, dataNonce]);

  const handleViewChange = (view: CustomerView) => {
    setActiveView(view);
    setMobileSidebarOpen(false);
  };

  const handleNewBooking = () => setBookingDialogOpen(true);
  const handleAddPayment = () => setPaymentDialogOpen(true);

  const handleBookingSuccess = () => {
    setDataNonce(n => n + 1);
    setActiveView('bookings');
  };

  const handlePaymentSuccess = () => {
    setDataNonce(n => n + 1);
    setActiveView('payments');
  };

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <DashboardView
            onNewBooking={handleNewBooking}
            customerName={customerName}
            bookings={bookings}
            bookingsLoading={bookingsLoading}
          />
        );
      case 'bookings':
        return (
          <BookingsView
            bookings={bookings}
            loading={bookingsLoading}
            error={bookingsError}
            onNewBooking={handleNewBooking}
            onRetry={fetchBookings}
            initialBookingId={deepLinkBookingId}
          />
        );
      case 'orders':
        return <OrdersView customerEmail={customerEmail} />;
      case 'invoices':
        return <InvoicesView initialInvoiceId={deepLinkInvoiceId} />;
      case 'quotes':
        return <QuotesView initialQuoteId={deepLinkQuoteId} />;
      case 'payments':
        return (
          <PaymentsView
            paymentMethods={paymentMethods}
            loading={paymentsLoading}
            error={paymentsError}
            onAddMethod={handleAddPayment}
            onRetry={fetchPaymentMethods}
            onDataChange={fetchPaymentMethods}
          />
        );
      case 'messages':
        return <MessagesView />;
      case 'reviews':
        return <ReviewsView />;
      case 'profile':
        return <ProfileView />;
      default:
        return (
          <DashboardView
            onNewBooking={handleNewBooking}
            customerName={customerName}
            bookings={bookings}
            bookingsLoading={bookingsLoading}
          />
        );
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
          tenant={auth.tenant}
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
            tenant={auth.tenant}
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

      {/* Lazy-loaded Dialogs */}
      <Suspense fallback={null}>
        <NewBookingDialog
          open={bookingDialogOpen}
          onOpenChange={setBookingDialogOpen}
          onSuccess={handleBookingSuccess}
        />
      </Suspense>
      <Suspense fallback={null}>
        <AddPaymentMethodDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          onSuccess={handlePaymentSuccess}
        />
      </Suspense>
    </div>
  );
}

export default CustomerPortalLayout;

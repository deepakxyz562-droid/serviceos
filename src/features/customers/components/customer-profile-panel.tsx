'use client';

/**
 * CustomerProfilePanel — left sidebar of the Customer 360° view.
 *
 * Extracted from src/components/views/customer-360-view.tsx (Phase 6B2).
 *
 * Renders the customer's avatar, name, contact info, tags, health-score
 * gauge, quick-action buttons (WhatsApp, Message, Call, Booking, Invoice),
 * and a 2×2 mini-stats grid + outstanding-balance banner.
 *
 * Pure presentational component. The parent owns:
 *   • `customer`, `customerTags`, `customer360Loading`, `lastActiveTime`,
 *     `healthScore`, `stats`, `format` — derived from the customer 360°
 *     query.
 *   • `onOpenComposer`, `onOpenBookingDialog`, `onOpenInvoiceDialog` —
 *     callbacks that open the corresponding dialogs in the parent.
 */

import {
  Clock, Mail, Phone, MapPin, MessageSquare, Calendar, Send,
  PhoneCall, Receipt, Tag, AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { StarRating } from '@/components/shared/star-rating';
import {
  formatDate,
  getInitials,
  healthScoreColor,
  healthScoreLabel,
  tagColors,
} from '../utils/customer-helpers';
import { HealthScoreGauge } from './health-score-gauge';
import type { CustomerStats, CurrencyFormatFn } from '../types';

interface CustomerProfilePanelProps {
  customer: any;
  customerTags: string[];
  customer360Loading: boolean;
  lastActiveTime: string;
  healthScore: number;
  stats: CustomerStats;
  format: CurrencyFormatFn;
  onOpenComposer: () => void;
  onOpenBookingDialog: () => void;
  onOpenInvoiceDialog: () => void;
}

export function CustomerProfilePanel({
  customer,
  customerTags,
  customer360Loading,
  lastActiveTime,
  healthScore,
  stats,
  format,
  onOpenComposer,
  onOpenBookingDialog,
  onOpenInvoiceDialog,
}: CustomerProfilePanelProps) {
  return (
    <div className="w-full lg:w-80 xl:w-96 border-b lg:border-b-0 lg:border-r border-border shrink-0">
      <ScrollArea className="h-full max-h-[calc(100vh-8rem)]">
        {customer360Loading ? (
          <ProfilePanelSkeleton />
        ) : customer ? (
          <div className="space-y-0">
            {/* Profile Header with gradient */}
            <div className="relative bg-gradient-to-br from-emerald-600/15 via-emerald-600/5 to-transparent p-5">
              <div className="flex items-start gap-4">
                <Avatar className="size-16 border-2 border-emerald-600/30 shadow-md">
                  <AvatarFallback className="bg-emerald-600/20 text-emerald-400 text-xl font-bold">
                    {getInitials(customer.name || '?')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-foreground truncate">{customer.name}</h2>
                    {lastActiveTime && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-card border-border text-muted-foreground shrink-0">
                        <Clock className="size-2.5 mr-0.5" />
                        {lastActiveTime}
                      </Badge>
                    )}
                  </div>
                  {customer.email && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 truncate mt-0.5">
                      <Mail className="size-3 shrink-0" /> {customer.email}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                    <Phone className="size-3 shrink-0" /> {customer.phone}
                  </p>
                </div>
              </div>

              {/* Tags */}
              {customerTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {customerTags.map((tag: string) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded-md',
                        tagColors[tag] || 'bg-muted text-muted-foreground border-border'
                      )}
                    >
                      <Tag className="size-2.5 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="p-5 space-y-6">
              {/* Health Score */}
              <div className="flex items-center justify-between">
                <HealthScoreGauge score={healthScore} />
                <div className="text-right">
                  <p className="text-xs font-medium text-muted-foreground">Customer Health</p>
                  <p className={cn('text-sm font-bold', healthScoreColor(healthScore))}>
                    {healthScoreLabel(healthScore)}
                  </p>
                </div>
              </div>

              {/* Contact Details */}
              <div className="space-y-2.5">
                {customer.whatsappId && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <MessageSquare className="size-4 text-emerald-500 shrink-0" />
                    <span className="text-muted-foreground truncate">{customer.whatsappId}</span>
                  </div>
                )}
                {customer.address && (
                  <div className="flex items-start gap-2.5 text-sm">
                    <MapPin className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{customer.address}</span>
                  </div>
                )}
                <div className="flex items-center gap-2.5 text-sm">
                  <Calendar className="size-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">
                    Customer since{' '}
                    <span className="text-foreground font-medium">{formatDate(customer.createdAt)}</span>
                  </span>
                </div>
              </div>

              <Separator className="bg-border" />

              {/* Quick Actions — icon row with prominent WhatsApp */}
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Quick Actions
                </p>
                <div className="flex items-center gap-2">
                  {/* WhatsApp — prominent */}
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-foreground gap-2 flex-1 transition-all duration-200 shadow-sm"
                    onClick={() => {
                      if (customer.phone) {
                        const phone = customer.phone.replace(/[^0-9]/g, '');
                        window.open(`https://wa.me/${phone}`, '_blank');
                      } else {
                        toast.warning('No phone number available');
                      }
                    }}
                  >
                    <MessageSquare className="size-3.5" /> WhatsApp
                  </Button>
                  {/* Multi-channel Message composer */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 flex-1 border-emerald-600/40 text-emerald-700 hover:bg-emerald-500/10 transition-all duration-200"
                    onClick={onOpenComposer}
                    title="Compose multi-channel message"
                  >
                    <Send className="size-3.5" /> Message
                  </Button>
                  {/* Icon-only round buttons */}
                  <Button
                    size="icon"
                    variant="outline"
                    className="size-9 rounded-full border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-200"
                    onClick={() => {
                      if (customer.phone) {
                        window.location.href = `tel:${customer.phone}`;
                      } else {
                        toast.warning('No phone number available');
                      }
                    }}
                    title="Call customer"
                  >
                    <PhoneCall className="size-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="size-9 rounded-full border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-200"
                    onClick={onOpenBookingDialog}
                    title="Create Booking"
                  >
                    <Calendar className="size-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="size-9 rounded-full border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-200"
                    onClick={onOpenInvoiceDialog}
                    title="Create Invoice"
                  >
                    <Receipt className="size-3.5" />
                  </Button>
                </div>
              </div>

              <Separator className="bg-border" />

              {/* Mini Stats — card containers with colored top borders */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-card rounded-xl p-3 text-center border-t-2 border-t-emerald-500 shadow-sm">
                  <p className="text-lg font-extrabold text-emerald-500">
                    {format(stats.totalRevenue)}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium">Revenue</p>
                </div>
                <div className="bg-card rounded-xl p-3 text-center border-t-2 border-t-sky-500 shadow-sm">
                  <p className="text-lg font-extrabold text-foreground">{stats.totalJobs}</p>
                  <p className="text-[10px] text-muted-foreground font-medium">Total Jobs</p>
                </div>
                <div className="bg-card rounded-xl p-3 text-center border-t-2 border-t-amber-500 shadow-sm">
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-lg font-extrabold text-amber-500">
                      {stats.avgRating > 0 ? stats.avgRating : '\u2014'}
                    </span>
                    {stats.avgRating > 0 && <StarRating value={stats.avgRating} size="xs" />}
                  </div>
                  <p className="text-[10px] text-muted-foreground font-medium">Avg Rating</p>
                </div>
                <div className="bg-card rounded-xl p-3 text-center border-t-2 border-t-red-500 shadow-sm">
                  <p className="text-lg font-extrabold text-foreground">{stats.completedJobs}</p>
                  <p className="text-[10px] text-muted-foreground font-medium">Completed</p>
                </div>
              </div>

              {/* Outstanding Balance — enhanced with pulsing dot */}
              {stats.outstandingBalance > 0 && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-3.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="relative flex size-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                        <span className="relative inline-flex rounded-full size-2.5 bg-red-500" />
                      </span>
                      <span className="text-xs text-destructive font-semibold">Outstanding Balance</span>
                    </div>
                    <span className="text-sm font-extrabold text-destructive">
                      {format(stats.outstandingBalance)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6 text-center">
            <AlertCircle className="size-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Could not load customer details</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ─── Local skeleton (3-section profile panel) ────────────────────────────────

/**
 * ProfilePanelSkeleton — multi-row skeleton for the profile panel.
 *
 * Kept local rather than using the shared `ProfileSkeleton` because the
 * 360° panel renders 3 distinct sections (header w/ avatar + tags, contact
 * details + quick actions, 2×2 stats grid) — the shared skeleton is a
 * single avatar+name row and would not represent the loading state well.
 */
function ProfilePanelSkeleton() {
  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center gap-4">
        <Skeleton className="size-16 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-4 w-52" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-28" />
      </div>
    </div>
  );
}

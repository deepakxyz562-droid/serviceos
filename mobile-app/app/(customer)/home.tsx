/**
 * Customer Dashboard (home tab)
 *
 * PWA-matching dashboard with:
 *   - Greeting with user's name + current date
 *   - Quick stats: Active Bookings, Outstanding Invoices total, Upcoming appointments
 *   - Active Jobs section (confirmed / assigned / en_route / in_progress) → tap to view/tracking
 *   - Quick action grid: Marketplace, Invoices, Track Job, Messages, Reviews, Payments
 *   - Upcoming bookings list (next 3 scheduled)
 *   - Loading skeletons, friendly empty state, error retry
 */
import React, { useMemo } from 'react';
import { View, Text, Pressable, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { format, parseISO, isAfter } from 'date-fns';
import {
  ShoppingBag,
  FileText,
  Navigation,
  MessageSquare,
  Star,
  CreditCard,
  AlertCircle,
  Calendar,
  ChevronRight,
  Truck,
  DollarSign,
  CalendarClock,
} from 'lucide-react-native';
import { useBookings } from '@/hooks/use-bookings';
import { useInvoices } from '@/hooks/use-invoices';
import { useAuthStore } from '@/stores/auth-store';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { Skeleton, SkeletonList } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { COLORS } from '@/lib/constants';
import { cn } from '@/lib/cn';
import type { Booking, Invoice } from '@/types';

// ── Helpers ──────────────────────────────────────────────────────────

const ACTIVE_STATUSES = new Set(['confirmed', 'assigned', 'en_route', 'in_progress']);

function formatMoney(amount: number | null | undefined): string {
  if (amount == null) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return 'Not scheduled';
  try {
    return format(parseISO(iso), "EEE, MMM d · h:mm a");
  } catch {
    return iso;
  }
}

function safeParse(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  try {
    const d = parseISO(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
}

function isActive(b: Booking): boolean {
  return ACTIVE_STATUSES.has(b.status);
}

// ── Quick Action tile ────────────────────────────────────────────────

interface QuickActionProps {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  badge?: number;
}

function QuickAction({ label, icon, onPress, badge }: QuickActionProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="active:opacity-70"
    >
      <Card className="items-center" padded>
        <View className="relative">
          {icon}
          {badge != null && badge > 0 ? (
            <View className="absolute -right-2 -top-2 h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1">
              <Text className="text-[10px] font-bold text-white">{badge}</Text>
            </View>
          ) : null}
        </View>
        <Text className="mt-2 text-center text-xs font-semibold text-foreground">{label}</Text>
      </Card>
    </Pressable>
  );
}

// ── Stat card ────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  tint: string;
}

function StatCard({ label, value, icon, tint }: StatCardProps) {
  return (
    <Card className="flex-1" padded>
      <View className="flex-row items-center">
        <View
          className="h-9 w-9 items-center justify-center rounded-lg"
          style={{ backgroundColor: tint + '1A' }}
        >
          {icon}
        </View>
      </View>
      <Text className="mt-2 text-lg font-bold text-foreground">{value}</Text>
      <Text className="text-xs text-muted-foreground">{label}</Text>
    </Card>
  );
}

// ── Active Job card ──────────────────────────────────────────────────

function ActiveJobCard({ booking }: { booking: Booking }) {
  const trackingEnabled =
    booking.status === 'assigned' ||
    booking.status === 'en_route' ||
    booking.status === 'in_progress';
  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: '/(customer)/bookings/[id]',
          params: { id: booking.id },
        })
      }
      accessibilityRole="button"
      accessibilityLabel={`View booking ${booking.id}`}
      className="active:opacity-70"
    >
      <Card className="mb-3">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-base font-bold text-foreground">
              {booking.provider?.name ?? 'Provider'}
            </Text>
            <Text className="mt-0.5 text-sm text-muted-foreground">
              {booking.service?.name ?? 'Custom Service'}
            </Text>
          </View>
          <StatusBadge status={booking.status} />
        </View>

        <View className="mt-2 flex-row items-center">
          <Calendar size={14} color={COLORS.mutedForeground} />
          <Text className="ml-1.5 text-xs text-muted-foreground">
            {formatDateTime(booking.scheduledAt)}
          </Text>
        </View>

        {trackingEnabled ? (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              router.push({
                pathname: '/(customer)/tracking/[id]',
                params: { id: booking.id },
              });
            }}
            className="mt-3 flex-row items-center justify-center rounded-lg bg-primary-50 py-2"
            hitSlop={6}
          >
            <Navigation size={14} color={COLORS.primary} />
            <Text className="ml-1.5 text-sm font-semibold text-primary-700">Track live</Text>
          </Pressable>
        ) : null}
      </Card>
    </Pressable>
  );
}

// ── Upcoming booking row ─────────────────────────────────────────────

function UpcomingRow({ booking }: { booking: Booking }) {
  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: '/(customer)/bookings/[id]',
          params: { id: booking.id },
        })
      }
      accessibilityRole="button"
      accessibilityLabel={`View booking ${booking.id}`}
      className="active:opacity-70"
    >
      <View className="flex-row items-center py-3">
        <View className="h-10 w-10 items-center justify-center rounded-lg bg-primary-50">
          <CalendarClock size={18} color={COLORS.primary} />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
            {booking.service?.name ?? booking.provider?.name ?? 'Booking'}
          </Text>
          <Text className="text-xs text-muted-foreground">
            {formatDateTime(booking.scheduledAt)}
          </Text>
        </View>
        <ChevronRight size={18} color={COLORS.mutedForeground} />
      </View>
    </Pressable>
  );
}

// ── Main screen ──────────────────────────────────────────────────────

export default function CustomerDashboardScreen() {
  const user = useAuthStore((s) => s.user);
  const bookingsQuery = useBookings();
  const invoicesQuery = useInvoices();

  const refreshing =
    bookingsQuery.isRefetching || invoicesQuery.isRefetching;

  const onRefresh = () => {
    bookingsQuery.refetch();
    invoicesQuery.refetch();
  };

  // Active jobs (confirmed / assigned / en_route / in_progress)
  const activeJobs = useMemo(() => {
    const list = bookingsQuery.data ?? [];
    return list.filter(isActive);
  }, [bookingsQuery.data]);

  // Upcoming = scheduled in the future (sorted asc, first 3)
  const upcoming = useMemo(() => {
    const list = bookingsQuery.data ?? [];
    const now = new Date();
    return list
      .filter((b) => {
        const d = safeParse(b.scheduledAt);
        return d ? isAfter(d, now) : false;
      })
      .sort((a, b) => {
        const da = safeParse(a.scheduledAt)?.getTime() ?? 0;
        const db = safeParse(b.scheduledAt)?.getTime() ?? 0;
        return da - db;
      })
      .slice(0, 3);
  }, [bookingsQuery.data]);

  // Outstanding = sum of all non-paid invoices
  const outstandingTotal = useMemo(() => {
    const list = invoicesQuery.data ?? [];
    return list
      .filter((i: Invoice) => i.status !== 'paid' && i.status !== 'cancelled')
      .reduce((sum, i) => sum + (i.total ?? 0), 0);
  }, [invoicesQuery.data]);

  const unpaidCount = useMemo(() => {
    const list = invoicesQuery.data ?? [];
    return list.filter((i) => i.status !== 'paid' && i.status !== 'cancelled').length;
  }, [invoicesQuery.data]);

  const firstName = (user?.name ?? 'there').split(' ')[0];
  const todayStr = format(new Date(), "EEEE, MMM d");

  // ── Loading state ────────────────────────────────────────────────
  const isLoading = bookingsQuery.isLoading || invoicesQuery.isLoading;
  const hasError = (bookingsQuery.isError || invoicesQuery.isError) && !bookingsQuery.data && !invoicesQuery.data;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Greeting */}
        <View className="mb-4 mt-2">
          <Text className="text-2xl font-bold text-foreground">
            Hello, {firstName} 👋
          </Text>
          <Text className="mt-1 text-sm text-muted-foreground">{todayStr}</Text>
        </View>

        {hasError ? (
          <Card className="mb-4">
            <View className="flex-row items-center">
              <AlertCircle size={20} color={COLORS.destructive} />
              <Text className="ml-2 flex-1 text-sm text-foreground">
                Couldn't load your dashboard. Pull to refresh.
              </Text>
            </View>
          </Card>
        ) : null}

        {/* Quick stats */}
        {isLoading ? (
          <View className="mb-4 flex-row gap-3">
            <View className="flex-1">
              <Skeleton className="h-24" />
            </View>
            <View className="flex-1">
              <Skeleton className="h-24" />
            </View>
            <View className="flex-1">
              <Skeleton className="h-24" />
            </View>
          </View>
        ) : (
          <View className="mb-4 flex-row gap-3">
            <StatCard
              label="Active Jobs"
              value={String(activeJobs.length)}
              icon={<Truck size={18} color={COLORS.primary} />}
              tint={COLORS.primary}
            />
            <StatCard
              label="Outstanding"
              value={formatMoney(outstandingTotal)}
              icon={<DollarSign size={18} color={COLORS.accent} />}
              tint={COLORS.accent}
            />
            <StatCard
              label="Upcoming"
              value={String(upcoming.length)}
              icon={<CalendarClock size={18} color={COLORS.info} />}
              tint={COLORS.info}
            />
          </View>
        )}

        {/* Outstanding banner (actionable) */}
        {unpaidCount > 0 ? (
          <Pressable
            onPress={() => router.push('/(customer)/invoices')}
            className="mb-4 active:opacity-70"
          >
            <Card
              className="flex-row items-center justify-between"
              style={{ backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }}
            >
              <View className="flex-row items-center">
                <FileText size={20} color={COLORS.accent} />
                <View className="ml-3">
                  <Text className="text-sm font-semibold text-amber-700">
                    {unpaidCount} unpaid invoice{unpaidCount === 1 ? '' : 's'}
                  </Text>
                  <Text className="text-xs text-amber-700">
                    {formatMoney(outstandingTotal)} outstanding
                  </Text>
                </View>
              </View>
              <ChevronRight size={18} color={COLORS.accent} />
            </Card>
          </Pressable>
        ) : null}

        {/* Quick actions grid */}
        <Text className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Quick Actions
        </Text>
        <View className="mb-5 flex-row flex-wrap gap-3">
          <View style={{ width: '31%' }}>
            <QuickAction
              label="Marketplace"
              icon={<ShoppingBag size={22} color={COLORS.primary} />}
              onPress={() => router.push('/(customer)/marketplace')}
            />
          </View>
          <View style={{ width: '31%' }}>
            <QuickAction
              label="Invoices"
              icon={<FileText size={22} color={COLORS.accent} />}
              badge={unpaidCount}
              onPress={() => router.push('/(customer)/invoices')}
            />
          </View>
          <View style={{ width: '31%' }}>
            <QuickAction
              label="Track Job"
              icon={<Navigation size={22} color={COLORS.info} />}
              onPress={() => router.push('/(customer)/bookings')}
            />
          </View>
          <View style={{ width: '31%' }}>
            <QuickAction
              label="Messages"
              icon={<MessageSquare size={22} color={COLORS.customerAccent} />}
              onPress={() => router.push('/(customer)/messages')}
            />
          </View>
          <View style={{ width: '31%' }}>
            <QuickAction
              label="Reviews"
              icon={<Star size={22} color={COLORS.accent} />}
              onPress={() => router.push('/(customer)/reviews')}
            />
          </View>
          <View style={{ width: '31%' }}>
            <QuickAction
              label="Payments"
              icon={<CreditCard size={22} color={COLORS.primary} />}
              onPress={() => router.push('/(customer)/payments')}
            />
          </View>
        </View>

        {/* Active Jobs section */}
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-base font-bold text-foreground">Active Jobs</Text>
          <Pressable
            onPress={() => router.push('/(customer)/bookings')}
            hitSlop={8}
          >
            <Text className="text-sm font-semibold text-primary-700">View all</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <SkeletonList count={2} />
        ) : activeJobs.length === 0 ? (
          <Card>
            <Text className="text-center text-sm text-muted-foreground">
              No active jobs right now.
            </Text>
            <Pressable
              onPress={() => router.push('/(customer)/marketplace')}
              className="mt-3 items-center"
            >
              <Text className="text-sm font-semibold text-primary-700">
                Browse Marketplace →
              </Text>
            </Pressable>
          </Card>
        ) : (
          <View>
            {activeJobs.map((b) => (
              <ActiveJobCard key={b.id} booking={b} />
            ))}
          </View>
        )}

        {/* Upcoming bookings section */}
        {upcoming.length > 0 ? (
          <>
            <Text className="mb-1 mt-4 text-base font-bold text-foreground">
              Upcoming Bookings
            </Text>
            <Card padded={false}>
              {upcoming.map((b, i) => (
                <View
                  key={b.id}
                  className={cn(i < upcoming.length - 1 && 'border-b border-border')}
                  style={{ paddingHorizontal: 12 }}
                >
                  <UpcomingRow booking={b} />
                </View>
              ))}
            </Card>
          </>
        ) : null}

        {bookingsQuery.data && bookingsQuery.data.length === 0 && !isLoading ? (
          <View className="mt-6">
            <EmptyState
              icon={<Calendar size={48} color={COLORS.mutedForeground} />}
              title="No bookings yet"
              description="Find a trusted service provider in the marketplace and book your first appointment."
              actionLabel="Browse Marketplace"
              onAction={() => router.push('/(customer)/marketplace')}
            />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

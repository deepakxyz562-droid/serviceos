/**
 * My Bookings List Screen
 *
 * PWA-matching customer bookings list:
 *   - Status filter chips (All / Pending / Confirmed / Active / Completed / Cancelled)
 *   - Booking cards: provider, service, scheduled date, status badge, price
 *   - Tap → /(customer)/bookings/[id]
 *   - If booking is active (confirmed/assigned/en_route/in_progress) → "Track" button
 *   - Pull-to-refresh, SkeletonList loading, EmptyState empty + error
 */
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { format, parseISO } from 'date-fns';
import {
  Calendar,
  ChevronRight,
  AlertCircle,
  CalendarCheck,
  Navigation,
  DollarSign,
} from 'lucide-react-native';
import { useBookings } from '@/hooks/use-bookings';
import { Card } from '@/components/ui/Card';
import { SkeletonList } from '@/components/ui/Skeleton';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { COLORS } from '@/lib/constants';
import { cn } from '@/lib/cn';
import type { Booking } from '@/types';

type FilterKey = 'all' | 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';

const FILTERS: { key: FilterKey; label: string; apiValue?: string; predicate?: (b: Booking) => boolean }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending', apiValue: 'pending' },
  { key: 'confirmed', label: 'Confirmed', apiValue: 'confirmed' },
  {
    key: 'active',
    label: 'Active',
    predicate: (b) =>
      b.status === 'confirmed' ||
      b.status === 'assigned' ||
      b.status === 'en_route' ||
      b.status === 'in_progress',
  },
  { key: 'completed', label: 'Completed', apiValue: 'completed' },
  { key: 'cancelled', label: 'Cancelled', apiValue: 'cancelled' },
];

const ACTIVE_SET = new Set(['confirmed', 'assigned', 'en_route', 'in_progress']);
const TRACKABLE_SET = new Set(['assigned', 'en_route', 'in_progress']);

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return 'Not scheduled';
  try {
    return format(parseISO(iso), "EEE, MMM d · h:mm a");
  } catch {
    return iso;
  }
}

function formatPrice(price: number | null | undefined): string {
  if (price == null) return '';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
}

export default function MyBookingsScreen() {
  const [filter, setFilter] = useState<FilterKey>('all');
  const filterDef = FILTERS.find((f) => f.key === filter);
  const apiStatus = filterDef?.apiValue;
  const { data, isLoading, isRefetching, refetch, isError, error } = useBookings(apiStatus);

  const bookings = useMemo(() => {
    const list = data ?? [];
    if (filterDef?.predicate) return list.filter(filterDef.predicate);
    return list;
  }, [data, filterDef]);

  const renderItem = ({ item }: { item: Booking }) => {
    const isActive = ACTIVE_SET.has(item.status);
    const canTrack = TRACKABLE_SET.has(item.status);
    return (
      <Pressable
        onPress={() =>
          router.push({
            pathname: '/(customer)/bookings/[id]',
            params: { id: item.id },
          })
        }
        accessibilityRole="button"
        accessibilityLabel={`View booking ${item.id}`}
        className="active:opacity-70"
      >
        <Card className={cn('mb-3', !isActive && 'opacity-75')}>
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-base font-bold text-foreground">
                {item.provider?.name ?? 'Provider'}
              </Text>
              <Text className="mt-0.5 text-sm text-muted-foreground">
                {item.service?.name ?? 'Custom Service'}
              </Text>
            </View>
            <StatusBadge status={item.status} />
          </View>

          <View className="mt-3 flex-row items-center">
            <Calendar size={14} color={COLORS.mutedForeground} />
            <Text className="ml-1.5 text-xs text-muted-foreground">
              {formatDateTime(item.scheduledAt)}
            </Text>
          </View>

          <View className="mt-3 flex-row items-center justify-between">
            {item.totalPrice != null ? (
              <View className="flex-row items-center">
                <DollarSign size={14} color={COLORS.primary} />
                <Text className="ml-0.5 text-sm font-bold text-foreground">
                  {formatPrice(item.totalPrice)}
                </Text>
              </View>
            ) : (
              <View />
            )}
            {canTrack ? (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  router.push({
                    pathname: '/(customer)/tracking/[id]',
                    params: { id: item.id },
                  });
                }}
                className="flex-row items-center rounded-lg bg-primary-50 px-3 py-1.5"
                hitSlop={6}
              >
                <Navigation size={12} color={COLORS.primary} />
                <Text className="ml-1 text-xs font-semibold text-primary-700">Track</Text>
              </Pressable>
            ) : (
              <View className="flex-row items-center">
                <Text className="mr-1 text-xs font-semibold text-primary-600">Details</Text>
                <ChevronRight size={16} color={COLORS.primary} />
              </View>
            )}
          </View>
        </Card>
      </Pressable>
    );
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
        ListHeaderComponent={
          <View>
            <Text className="mb-2 mt-2 text-xl font-bold text-foreground">My Bookings</Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={FILTERS}
              keyExtractor={(f) => f.key}
              contentContainerStyle={{ paddingVertical: 8, paddingRight: 16 }}
              renderItem={({ item: f }) => {
                const selected = filter === f.key;
                return (
                  <Pressable
                    onPress={() => setFilter(f.key)}
                    className={cn(
                      'mr-2 rounded-full border px-3 py-1.5',
                      selected ? 'border-primary-500 bg-primary-500' : 'border-border bg-white'
                    )}
                  >
                    <Text
                      className={cn(
                        'text-xs font-semibold',
                        selected ? 'text-white' : 'text-muted-foreground'
                      )}
                    >
                      {f.label}
                    </Text>
                  </Pressable>
                );
              }}
            />
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View className="mt-4">
              <SkeletonList count={4} />
            </View>
          ) : isError ? (
            <EmptyState
              icon={<AlertCircle size={48} color={COLORS.destructive} />}
              title="Couldn't load bookings"
              description={
                error instanceof Error ? error.message : 'Please try again later.'
              }
              actionLabel="Retry"
              onAction={() => refetch()}
            />
          ) : (
            <EmptyState
              icon={<CalendarCheck size={48} color={COLORS.mutedForeground} />}
              title="No bookings yet"
              description={
                filter === 'all'
                  ? 'Find a service provider in the marketplace to book your first service.'
                  : `No ${filterDef?.label.toLowerCase()} bookings.`
              }
              actionLabel="Browse Marketplace"
              onAction={() => router.replace('/(customer)/marketplace')}
            />
          )
        }
      />
    </SafeAreaView>
  );
}

/**
 * Inventory List (Employee) — push screen reached from the Today dashboard.
 *
 * Mirrors the PWA employee portal's inventory browser:
 *  - Search bar (debounced 500ms).
 *  - Status filter: All / In Stock / Low Stock / Out of Stock.
 *  - Cards: name, SKU, quantity (with status color), reorder level, unit price, location.
 *  - Low/out items highlighted with warning border + badge.
 *  - Tap → inventory/[id] detail. "Adjust Stock" quick action also navigates to detail.
 *  - Pull-to-refresh + skeleton loading + empty state.
 */
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  Search,
  X,
  Package,
  TriangleAlert,
  MapPin,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useInventoryItems, useLowStockAlerts } from '@/hooks/use-inventory';
import { COLORS } from '@/lib/constants';
import { cn } from '@/lib/cn';
import {
  formatCurrency as formatCurrencyAmount,
} from '@/lib/currency';
import { useAuthStore } from '@/stores/auth-store';
import type { InventoryItem } from '@/types';

type StatusFilter = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'in_stock', label: 'In Stock' },
  { key: 'low_stock', label: 'Low Stock' },
  { key: 'out_of_stock', label: 'Out of Stock' },
];

const getStockStatus = (item: InventoryItem): StatusFilter => {
  if (item.quantity <= 0) return 'out_of_stock';
  if (item.quantity <= item.reorderLevel) return 'low_stock';
  return 'in_stock';
};

const formatCurrency = (
  n: number | null | undefined,
  currency?: string | null
): string => {
  if (n === null || n === undefined) return '—';
  return formatCurrencyAmount(n, currency);
};

export default function InventoryListScreen() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const tenantCurrency = useAuthStore((s) => s.tenant?.currency ?? null);

  // Debounce search → 500ms
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 500);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading, isRefetching, refetch, error } = useInventoryItems({
    search: search || undefined,
    status,
  });

  const { data: lowStockItems } = useLowStockAlerts();

  const items = useMemo<InventoryItem[]>(() => data ?? [], [data]);
  const lowStockCount = (lowStockItems ?? []).length;

  const refreshAll = useCallback(async () => {
    refetch();
  }, [refetch]);

  const renderItem = ({ item }: { item: InventoryItem }) => {
    const itemStatus = getStockStatus(item);
    const isLow = itemStatus === 'low_stock';
    const isOut = itemStatus === 'out_of_stock';
    return (
      <Pressable
        onPress={() =>
          router.push({
            pathname: '/(employee)/inventory/[id]',
            params: { id: item.id },
          })
        }
        accessibilityRole="button"
        accessibilityLabel={`Open ${item.name}`}
        className="active:opacity-70"
      >
        <Card
          className={cn(
            'mb-2.5',
            isOut && 'border-destructive/40',
            isLow && !isOut && 'border-warning/40'
          )}
        >
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <View className="flex-row items-center">
                <Text className="text-base font-bold text-foreground">
                  {item.name}
                </Text>
                {isLow || isOut ? (
                  <View className="ml-2">
                    <Badge variant={isOut ? 'destructive' : 'warning'}>
                      <View className="flex-row items-center">
                        <TriangleAlert size={10} color={isOut ? '#DC2626' : '#B45309'} />
                        <Text className="ml-1 text-[10px] font-semibold">
                          {isOut ? 'Out' : 'Low'}
                        </Text>
                      </View>
                    </Badge>
                  </View>
                ) : null}
              </View>
              <Text className="mt-0.5 text-xs text-muted-foreground">
                SKU: {item.sku}
              </Text>
              {item.supplier?.name ? (
                <Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={1}>
                  Supplier: {item.supplier.name}
                </Text>
              ) : null}
            </View>
            <StatusBadge status={itemStatus} />
          </View>

          <View className="mt-3 flex-row items-center justify-between">
            <View className="flex-row items-center gap-4">
              <View>
                <Text className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Quantity
                </Text>
                <Text
                  className={cn(
                    'text-lg font-bold',
                    isOut
                      ? 'text-destructive'
                      : isLow
                        ? 'text-warning'
                        : 'text-foreground'
                  )}
                >
                  {item.quantity}
                </Text>
              </View>
              <View>
                <Text className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Reorder
                </Text>
                <Text className="text-sm font-semibold text-foreground">
                  {item.reorderLevel}
                </Text>
              </View>
              {item.unitPrice !== null && item.unitPrice !== undefined ? (
                <View>
                  <Text className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Unit Price
                  </Text>
                  <Text className="text-sm font-semibold text-foreground">
                    {formatCurrency(item.unitPrice, tenantCurrency)}
                  </Text>
                </View>
              ) : null}
            </View>
            <ChevronRight size={16} color={COLORS.mutedForeground} />
          </View>

          <View className="mt-2 flex-row items-center justify-between">
            {item.location ? (
              <View className="flex-row flex-1 items-center">
                <MapPin size={12} color={COLORS.mutedForeground} />
                <Text
                  className="ml-1 flex-1 text-xs text-muted-foreground"
                  numberOfLines={1}
                >
                  {item.location}
                </Text>
              </View>
            ) : (
              <View className="flex-1" />
            )}
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/(employee)/inventory/[id]',
                  params: { id: item.id },
                })
              }
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={`Adjust stock for ${item.name}`}
              className="flex-row items-center rounded-lg bg-primary-50 px-3 py-1.5"
            >
              <SlidersHorizontal size={12} color={COLORS.primary} />
              <Text className="ml-1 text-xs font-semibold text-primary-700">
                Adjust Stock
              </Text>
            </Pressable>
          </View>
        </Card>
      </Pressable>
    );
  };

  const renderHeader = () => (
    <View className="mb-3">
      {/* Low stock alerts banner */}
      {lowStockCount > 0 ? (
        <Pressable
          onPress={() => setStatus('low_stock')}
          className="mb-3 flex-row items-center rounded-xl border border-warning/30 bg-amber-50 p-3"
          accessibilityRole="button"
          accessibilityLabel={`${lowStockCount} items low on stock`}
        >
          <TriangleAlert size={20} color={COLORS.warning} />
          <View className="ml-3 flex-1">
            <Text className="text-sm font-semibold text-amber-900">
              {lowStockCount} item{lowStockCount === 1 ? '' : 's'} need restocking
            </Text>
            <Text className="mt-0.5 text-xs text-amber-700">
              Tap to view items below the reorder threshold.
            </Text>
          </View>
          <ChevronRight size={16} color={COLORS.warning} />
        </Pressable>
      ) : null}

      {/* Search bar */}
      <View className="flex-row items-center rounded-xl border border-border bg-white px-3 py-2">
        <Search size={18} color={COLORS.mutedForeground} />
        <TextInput
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Search by name or SKU…"
          placeholderTextColor="#9CA3AF"
          className="ml-2 flex-1 text-base text-foreground"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchInput.length > 0 ? (
          <Pressable onPress={() => setSearchInput('')} hitSlop={8}>
            <X size={18} color={COLORS.mutedForeground} />
          </Pressable>
        ) : null}
      </View>

      {/* Status filter chips */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={FILTERS}
        keyExtractor={(f) => f.key}
        contentContainerStyle={{ paddingVertical: 10 }}
        renderItem={({ item: f }) => {
          const selected = status === f.key;
          return (
            <Pressable
              onPress={() => setStatus(f.key)}
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
  );

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <View className="px-4 pt-2">
          <Text className="mb-3 text-xl font-bold text-foreground">Inventory</Text>
          <SkeletonList count={4} />
        </View>
      </SafeAreaView>
    );
  }

  if (error && items.length === 0) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background px-4">
        <EmptyState
          icon={<Package size={48} color={COLORS.mutedForeground} />}
          title="Couldn't load inventory"
          description={
            error instanceof Error ? error.message : 'Something went wrong.'
          }
          actionLabel="Retry"
          onAction={() => refetch()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <EmptyState
            icon={<Package size={48} color={COLORS.mutedForeground} />}
            title="No inventory items"
            description={
              search || status !== 'all'
                ? 'No items match your filters.'
                : 'Inventory items will appear here when they are added.'
            }
            actionLabel={
              search || status !== 'all' ? 'Clear filters' : undefined
            }
            onAction={
              search || status !== 'all'
                ? () => {
                    setSearchInput('');
                    setStatus('all');
                  }
                : undefined
            }
          />
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refreshAll}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      />
    </SafeAreaView>
  );
}

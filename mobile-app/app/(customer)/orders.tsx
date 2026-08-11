/**
 * Orders Screen (NEW)
 *
 * PWA-matching "My Orders" e-commerce history:
 *   - Fetch GET /api/ecommerce/orders?search=<customerEmail> → Order[]
 *   - Summary stats: Total / Delivered / In Transit / Total Spent
 *   - Cards: order number, date, status, total, items count
 *   - Tap → expand items list in a Modal (line items, totals)
 */
import React, { useMemo } from 'react';
import { View, Text, Pressable, FlatList, RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, ChevronRight, Truck, CheckCircle2, DollarSign, ShoppingBag, AlertCircle, Package } from 'lucide-react-native';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Card } from '@/components/ui/Card';
import { SkeletonList } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { COLORS } from '@/lib/constants';
import { cn } from '@/lib/cn';
import type { Order } from '@/types';

// ── Helpers ──────────────────────────────────────────────────────────

function normalizeOrders(
  r: Order[] | { data: Order[] } | { orders: Order[] } | undefined
): Order[] {
  if (!r) return [];
  if (Array.isArray(r)) return r;
  if (Array.isArray((r as { data?: Order[] }).data)) return (r as { data?: Order[] }).data ?? [];
  if (Array.isArray((r as { orders?: Order[] }).orders))
    return (r as { orders?: Order[] }).orders ?? [];
  return [];
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), 'MMM d, yyyy');
  } catch {
    return iso;
  }
}

function formatMoney(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function isDelivered(status: string): boolean {
  const s = status.toLowerCase();
  return s === 'delivered' || s === 'completed' || s === 'fulfilled';
}

function isInTransit(status: string): boolean {
  const s = status.toLowerCase();
  return s === 'shipped' || s === 'processing' || s === 'in_transit' || s === 'out_for_delivery';
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
      <View
        className="h-9 w-9 items-center justify-center rounded-lg"
        style={{ backgroundColor: tint + '1A' }}
      >
        {icon}
      </View>
      <Text className="mt-2 text-lg font-bold text-foreground">{value}</Text>
      <Text className="text-xs text-muted-foreground">{label}</Text>
    </Card>
  );
}

// ── Screen ───────────────────────────────────────────────────────────

export default function OrdersScreen() {
  const user = useAuthStore((s) => s.user);
  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null);

  // ── Query ────────────────────────────────────────────────────────
  const { data, isLoading, isRefetching, refetch, isError, error } = useQuery({
    queryKey: ['orders', 'list', user?.email],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (user?.email) params.search = user.email;
      const r = await api.get<Order[] | { data: Order[] } | { orders: Order[] }>(
        '/api/ecommerce/orders',
        params
      );
      return normalizeOrders(r);
    },
    enabled: !!user,
  });

  const orders = useMemo(() => data ?? [], [data]);

  // Stats
  const stats = useMemo(() => {
    const total = orders.length;
    const delivered = orders.filter((o) => isDelivered(o.status)).length;
    const transit = orders.filter((o) => isInTransit(o.status)).length;
    const spent = orders.reduce((sum, o) => sum + (o.total ?? 0), 0);
    return { total, delivered, transit, spent };
  }, [orders]);

  const renderItem = ({ item }: { item: Order }) => {
    const itemsCount = item.items?.length ?? 0;
    return (
      <Pressable
        onPress={() => setSelectedOrder(item)}
        accessibilityRole="button"
        accessibilityLabel={`View order ${item.number}`}
        className="active:opacity-70"
      >
        <Card className="mb-3">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-base font-bold text-foreground">{item.number}</Text>
              {item.provider?.name ? (
                <Text className="mt-0.5 text-xs text-muted-foreground">
                  {item.provider.name}
                </Text>
              ) : null}
              <Text className="mt-1 text-xs text-muted-foreground">
                {formatDate(item.createdAt)}
              </Text>
            </View>
            <StatusBadge status={item.status} />
          </View>

          <View className="mt-3 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Package size={14} color={COLORS.mutedForeground} />
              <Text className="ml-1.5 text-xs text-muted-foreground">
                {itemsCount} item{itemsCount === 1 ? '' : 's'}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Text className="mr-1 text-sm font-bold text-foreground">
                {formatMoney(item.total)}
              </Text>
              <ChevronRight size={16} color={COLORS.primary} />
            </View>
          </View>
        </Card>
      </Pressable>
    );
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      {/* Top bar */}
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft size={24} color={COLORS.foreground} />
        </Pressable>
        <Text className="ml-3 flex-1 text-base font-bold text-foreground" numberOfLines={1}>
          My Orders
        </Text>
      </View>

      <FlatList
        data={orders}
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
            {/* Stats */}
            {isLoading ? (
              <View className="mb-4 flex-row gap-3">
                <View className="flex-1 h-20 bg-muted rounded-xl" />
                <View className="flex-1 h-20 bg-muted rounded-xl" />
                <View className="flex-1 h-20 bg-muted rounded-xl" />
              </View>
            ) : (
              <View className="mb-3 mt-2 flex-row gap-3">
                <StatCard
                  label="Total"
                  value={String(stats.total)}
                  icon={<ShoppingBag size={18} color={COLORS.primary} />}
                  tint={COLORS.primary}
                />
                <StatCard
                  label="Delivered"
                  value={String(stats.delivered)}
                  icon={<CheckCircle2 size={18} color={COLORS.success} />}
                  tint={COLORS.success}
                />
                <StatCard
                  label="In Transit"
                  value={String(stats.transit)}
                  icon={<Truck size={18} color={COLORS.info} />}
                  tint={COLORS.info}
                />
              </View>
            )}
            {!isLoading && stats.total > 0 ? (
              <Card className="mb-3 flex-row items-center justify-between">
                <Text className="text-sm font-semibold text-muted-foreground">Total Spent</Text>
                <View className="flex-row items-center">
                  <DollarSign size={14} color={COLORS.primary} />
                  <Text className="ml-0.5 text-lg font-bold text-primary-700">
                    {formatMoney(stats.spent)}
                  </Text>
                </View>
              </Card>
            ) : null}

            <Text className="mb-2 mt-2 text-base font-bold text-foreground">All Orders</Text>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <SkeletonList count={4} />
          ) : isError ? (
            <EmptyState
              icon={<AlertCircle size={48} color={COLORS.destructive} />}
              title="Couldn't load orders"
              description={error instanceof Error ? error.message : 'Please try again later.'}
              actionLabel="Retry"
              onAction={() => refetch()}
            />
          ) : (
            <EmptyState
              icon={<Package size={48} color={COLORS.mutedForeground} />}
              title="No orders yet"
              description="When you place orders with marketplace providers, they'll appear here."
              actionLabel="Browse Marketplace"
              onAction={() => router.replace('/(customer)/marketplace')}
            />
          )
        }
      />

      {/* Order detail modal */}
      <Modal
        visible={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        position="center"
        showHandle={false}
      >
        {selectedOrder ? (
          <ScrollView style={{ maxHeight: 600 }}>
            <View className="px-5 pb-6 pt-5">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-lg font-bold text-foreground">
                    {selectedOrder.number}
                  </Text>
                  <Text className="mt-0.5 text-sm text-muted-foreground">
                    {formatDate(selectedOrder.createdAt)}
                  </Text>
                </View>
                <StatusBadge status={selectedOrder.status} />
              </View>

              {/* Line items */}
              {selectedOrder.items && selectedOrder.items.length > 0 ? (
                <View className="mt-4">
                  <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Items ({selectedOrder.items.length})
                  </Text>
                  <View className="rounded-lg border border-border">
                    {selectedOrder.items.map((item, idx) => (
                      <View
                        key={item.id ?? idx}
                        className={cn(
                          'flex-row px-3 py-2',
                          idx < selectedOrder.items.length - 1
                            ? 'border-b border-border'
                            : ''
                        )}
                      >
                        <View className="flex-1 pr-2">
                          <Text className="text-sm text-foreground">{item.name}</Text>
                          <Text className="text-xs text-muted-foreground">
                            {item.quantity} × {formatMoney(item.unitPrice)}
                          </Text>
                        </View>
                        <Text className="text-sm font-semibold text-foreground">
                          {formatMoney(item.total)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {/* Total */}
              <View className="mt-4 rounded-lg bg-muted p-3">
                <View className="flex-row justify-between">
                  <Text className="text-base font-bold text-foreground">Order Total</Text>
                  <Text className="text-base font-bold text-primary-700">
                    {formatMoney(selectedOrder.total)}
                  </Text>
                </View>
              </View>

              <View className="mt-3">
                <Pressable
                  onPress={() => setSelectedOrder(null)}
                  className="items-center py-2"
                >
                  <Text className="text-sm font-semibold text-primary-600">Close</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        ) : null}
      </Modal>
    </SafeAreaView>
  );
}

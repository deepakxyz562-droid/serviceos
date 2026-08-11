/**
 * Inventory Item Detail (Employee)
 *
 * Mirrors the PWA employee portal's inventory detail view:
 *  - Full item info (name, SKU, description, quantity, reorder level, unit price,
 *    location, supplier, status).
 *  - Stock adjustment modal: "Stock In" / "Stock Out" with quantity + reason.
 *  - Transaction history (last 20): type, qty, reason, user, date.
 *
 * APIs:
 *   GET   /api/inventory/items/[id]
 *   PATCH /api/inventory/items/[id]/adjust { quantity, reason, type: 'in'|'out' }
 *   GET   /api/inventory/transactions?itemId=
 */
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import {
  ArrowLeft,
  MapPin,
  Tag,
  DollarSign,
  Package,
  Plus,
  Minus,
  ArrowBigUp,
  ArrowBigDown,
  SlidersHorizontal,
  History,
  Truck,
  X,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import {
  useInventoryItemDetail,
  useAdjustStock,
  useInventoryTransactions,
} from '@/hooks/use-inventory';
import { COLORS } from '@/lib/constants';
import { cn } from '@/lib/cn';
import {
  formatCurrency as formatCurrencyAmount,
} from '@/lib/currency';
import { useAuthStore } from '@/stores/auth-store';
import type { InventoryTransaction } from '@/types';

const getStockStatus = (quantity: number, reorderLevel: number): string => {
  if (quantity <= 0) return 'out_of_stock';
  if (quantity <= reorderLevel) return 'low_stock';
  return 'in_stock';
};

const formatCurrency = (
  n: number | null | undefined,
  currency?: string | null
): string => {
  if (n === null || n === undefined) return '—';
  return formatCurrencyAmount(n, currency);
};

const formatTxDate = (iso: string): string => {
  try {
    return format(parseISO(iso), 'MMM d, yyyy · h:mm a');
  } catch {
    return '—';
  }
};

const formatTxRelative = (iso: string): string => {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return '';
  }
};

const TRANSACTION_LABEL: Record<
  string,
  { label: string; variant: 'success' | 'destructive' | 'warning' }
> = {
  in: { label: 'Stock In', variant: 'success' },
  out: { label: 'Stock Out', variant: 'destructive' },
  adjust: { label: 'Adjusted', variant: 'warning' },
  adjustment: { label: 'Adjusted', variant: 'warning' },
};

export default function InventoryItemDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id =
    typeof params.id === 'string'
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : '';
  const tenantCurrency = useAuthStore((s) => s.tenant?.currency ?? null);

  const { data: item, isLoading, error, refetch, isRefetching } =
    useInventoryItemDetail(id);
  const { data: transactions } = useInventoryTransactions(id || undefined);
  const adjustStock = useAdjustStock();
  const toast = useToast();

  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustType, setAdjustType] = useState<'in' | 'out'>('in');
  const [adjustQty, setAdjustQty] = useState('1');
  const [adjustReason, setAdjustReason] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (id) {
        refetch();
      }
    }, [id, refetch])
  );

  const openAdjust = (type: 'in' | 'out') => {
    setAdjustType(type);
    setAdjustQty('1');
    setAdjustReason('');
    setAdjustOpen(true);
  };

  const handleSubmitAdjust = async () => {
    if (!item) return;
    const parsedQty = parseInt(adjustQty, 10);
    if (!Number.isFinite(parsedQty) || parsedQty <= 0) {
      toast.show('Please enter a positive whole number.', 'error');
      return;
    }
    try {
      await adjustStock.mutateAsync({
        id: item.id,
        quantity: parsedQty,
        type: adjustType,
        reason: adjustReason.trim() || undefined,
      });
      toast.show(
        `${adjustType === 'in' ? 'Added' : 'Removed'} ${parsedQty} unit${parsedQty === 1 ? '' : 's'}.`,
        'success'
      );
      setAdjustOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Please try again.';
      toast.show(`Adjustment failed: ${msg}`, 'error');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <Header onBack={() => router.back()} title="Item Details" />
        <Spinner />
      </SafeAreaView>
    );
  }

  if (error || !item) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <Header onBack={() => router.back()} title="Item Details" />
        <EmptyState
          icon={<Package size={48} color={COLORS.mutedForeground} />}
          title="Item not found"
          description={
            error instanceof Error ? error.message : 'Please go back and try again.'
          }
          actionLabel="Go Back"
          onAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  const status = getStockStatus(item.quantity, item.reorderLevel);
  const txList: InventoryTransaction[] = transactions ?? [];

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <Header onBack={() => router.back()} title="Item Details" />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Header card */}
        <Card className="mb-3 mt-2">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-xl font-bold text-foreground">{item.name}</Text>
              <View className="mt-1 flex-row items-center">
                <Tag size={12} color={COLORS.mutedForeground} />
                <Text className="ml-1 text-xs text-muted-foreground">{item.sku}</Text>
              </View>
            </View>
            <StatusBadge status={status} />
          </View>

          {item.description ? (
            <Text className="mt-3 text-sm text-foreground">{item.description}</Text>
          ) : null}

          {/* Quantity highlight */}
          <View className="mt-4 flex-row items-end justify-between">
            <View>
              <Text className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Current Quantity
              </Text>
              <Text
                className={cn(
                  'text-3xl font-bold',
                  status === 'out_of_stock'
                    ? 'text-destructive'
                    : status === 'low_stock'
                      ? 'text-warning'
                      : 'text-foreground'
                )}
              >
                {item.quantity}
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Reorder Level
              </Text>
              <Text className="text-base font-bold text-foreground">
                {item.reorderLevel}
              </Text>
            </View>
          </View>
        </Card>

        {/* Details grid */}
        <Card className="mb-3">
          {item.unitPrice !== null && item.unitPrice !== undefined ? (
            <DetailRow
              icon={<DollarSign size={16} color={COLORS.mutedForeground} />}
              label="Unit Price"
              value={formatCurrency(item.unitPrice, tenantCurrency)}
            />
          ) : null}
          {item.location ? (
            <View style={{ marginTop: item.unitPrice !== null ? 12 : 0 }}>
              <DetailRow
                icon={<MapPin size={16} color={COLORS.mutedForeground} />}
                label="Location"
                value={item.location}
              />
            </View>
          ) : null}
          {item.supplier?.name ? (
            <View
              style={{
                marginTop: item.unitPrice !== null || item.location ? 12 : 0,
              }}
            >
              <DetailRow
                icon={<Truck size={16} color={COLORS.mutedForeground} />}
                label="Supplier"
                value={item.supplier.name}
              />
            </View>
          ) : null}
        </Card>

        {/* Stock adjustment buttons */}
        <Card className="mb-3">
          <View className="flex-row items-center">
            <SlidersHorizontal size={16} color={COLORS.primary} />
            <Text className="ml-2 text-base font-bold text-foreground">
              Adjust Stock
            </Text>
          </View>
          <View className="mt-3 flex-row gap-2">
            <View className="flex-1">
              <Button
                variant="outline"
                onPress={() => openAdjust('out')}
                loading={adjustStock.isPending}
              >
                <View className="flex-row items-center justify-center">
                  <ArrowBigDown size={16} color={COLORS.destructive} />
                  <Text className="ml-2 font-semibold text-destructive">
                    Stock Out
                  </Text>
                </View>
              </Button>
            </View>
            <View className="flex-1">
              <Button onPress={() => openAdjust('in')} loading={adjustStock.isPending}>
                <View className="flex-row items-center justify-center">
                  <ArrowBigUp size={16} color="#fff" />
                  <Text className="ml-2 font-semibold text-white">Stock In</Text>
                </View>
              </Button>
            </View>
          </View>
        </Card>

        {/* Recent transactions */}
        <View className="mb-2 mt-1 flex-row items-center">
          <History size={18} color={COLORS.foreground} />
          <Text className="ml-2 text-base font-bold text-foreground">
            Transaction History
          </Text>
        </View>

        {txList.length === 0 ? (
          <Card>
            <Text className="text-center text-sm text-muted-foreground">
              No transactions yet.
            </Text>
          </Card>
        ) : (
          <View>
            {txList.slice(0, 20).map((t) => {
              const key = (t.type || '').toLowerCase();
              const meta = TRANSACTION_LABEL[key] ?? {
                label: t.type || 'Adjustment',
                variant: 'default' as const,
              };
              const isIn = key === 'in';
              const isOut = key === 'out';
              return (
                <Card key={t.id} className="mb-2">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1 pr-3">
                      <View className="flex-row items-center">
                        {isIn ? (
                          <ArrowBigUp size={16} color={COLORS.success} />
                        ) : isOut ? (
                          <ArrowBigDown size={16} color={COLORS.destructive} />
                        ) : (
                          <SlidersHorizontal size={16} color={COLORS.warning} />
                        )}
                        <Text className="ml-1.5 text-sm font-semibold text-foreground">
                          {meta.label}
                        </Text>
                      </View>
                      {t.reason ? (
                        <Text
                          className="mt-1 text-xs text-muted-foreground"
                          numberOfLines={2}
                        >
                          {t.reason}
                        </Text>
                      ) : null}
                      <View className="mt-1 flex-row items-center">
                        <Text className="text-[11px] text-muted-foreground">
                          {formatTxDate(t.createdAt)}
                        </Text>
                        <Text className="ml-2 text-[11px] text-muted-foreground">
                          · {formatTxRelative(t.createdAt)}
                        </Text>
                      </View>
                      {t.user?.name ? (
                        <Text className="mt-0.5 text-[11px] font-medium text-muted-foreground">
                          by {t.user.name}
                        </Text>
                      ) : null}
                    </View>
                    <Text
                      className={cn(
                        'text-base font-bold',
                        isIn
                          ? 'text-success'
                          : isOut
                            ? 'text-destructive'
                            : 'text-warning'
                      )}
                    >
                      {isIn ? '+' : isOut ? '−' : '±'}
                      {Math.abs(t.quantity)}
                    </Text>
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Adjustment modal */}
      <Modal visible={adjustOpen} onClose={() => setAdjustOpen(false)}>
        <View className="px-5 pb-2 pt-2">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-foreground">
              {adjustType === 'in' ? 'Stock In' : 'Stock Out'}
            </Text>
            <Pressable
              onPress={() => setAdjustOpen(false)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <X size={20} color={COLORS.mutedForeground} />
            </Pressable>
          </View>

          <Text className="mb-3 text-sm text-muted-foreground">
            Adjusting stock for{' '}
            <Text className="font-semibold text-foreground">{item.name}</Text>
          </Text>

          {/* Quantity stepper */}
          <View className="mb-2">
            <Text className="mb-1.5 text-sm font-medium text-foreground">
              Quantity
            </Text>
            <View className="flex-row items-center">
              <Pressable
                onPress={() => {
                  const q = parseInt(adjustQty, 10) || 0;
                  setAdjustQty(String(Math.max(1, q - 1)));
                }}
                className="h-11 w-11 items-center justify-center rounded-lg border border-border bg-white"
                accessibilityRole="button"
                accessibilityLabel="Decrease quantity"
                hitSlop={8}
              >
                <Minus size={18} color={COLORS.foreground} />
              </Pressable>
              <TextInput
                value={adjustQty}
                onChangeText={(v) => setAdjustQty(v.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
                className="mx-2 h-11 flex-1 rounded-lg border border-border bg-white px-3 text-center text-base font-bold text-foreground"
                accessibilityLabel="Quantity to adjust"
                maxLength={6}
              />
              <Pressable
                onPress={() => {
                  const q = parseInt(adjustQty, 10) || 0;
                  setAdjustQty(String(q + 1));
                }}
                className="h-11 w-11 items-center justify-center rounded-lg border border-border bg-white"
                accessibilityRole="button"
                accessibilityLabel="Increase quantity"
                hitSlop={8}
              >
                <Plus size={18} color={COLORS.foreground} />
              </Pressable>
            </View>
          </View>

          <Input
            label="Reason (optional)"
            value={adjustReason}
            onChangeText={setAdjustReason}
            placeholder="e.g. damaged, received, used on job"
            maxLength={200}
          />

          <View className="mt-1 flex-row gap-2">
            <View className="flex-1">
              <Button
                variant="outline"
                onPress={() => setAdjustOpen(false)}
                disabled={adjustStock.isPending}
              >
                Cancel
              </Button>
            </View>
            <View className="flex-1">
              <Button
                variant={adjustType === 'in' ? 'primary' : 'destructive'}
                onPress={handleSubmitAdjust}
                loading={adjustStock.isPending}
              >
                {adjustType === 'in' ? 'Add Stock' : 'Remove Stock'}
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center">
      <View className="mr-2">{icon}</View>
      <View className="flex-1">
        <Text className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </Text>
        <Text className="mt-0.5 text-sm text-foreground">{value}</Text>
      </View>
    </View>
  );
}

function Header({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <View className="flex-row items-center border-b border-border bg-white px-4 py-3">
      <Pressable
        onPress={onBack}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <ArrowLeft size={22} color={COLORS.foreground} />
      </Pressable>
      <Text className="ml-3 text-lg font-bold text-foreground">{title}</Text>
    </View>
  );
}

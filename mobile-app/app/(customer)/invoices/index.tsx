/**
 * My Invoices List Screen
 *
 * PWA-matching invoices list:
 *   - Outstanding summary card at top (total of unpaid invoices)
 *   - Status filter chips: All / Outstanding / Paid / Overdue
 *   - Invoice cards: number, provider, total, due date, status badge
 *   - Tap → /(customer)/invoices/[id]
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
import { format, parseISO, isPast } from 'date-fns';
import {
  FileText,
  ChevronRight,
  AlertCircle,
  Calendar,
  DollarSign,
} from 'lucide-react-native';
import { useInvoices } from '@/hooks/use-invoices';
import { Card } from '@/components/ui/Card';
import { SkeletonList } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { COLORS } from '@/lib/constants';
import { cn } from '@/lib/cn';
import type { Invoice } from '@/types';

type FilterKey = 'all' | 'outstanding' | 'paid' | 'overdue';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'outstanding', label: 'Outstanding' },
  { key: 'paid', label: 'Paid' },
  { key: 'overdue', label: 'Overdue' },
];

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), 'MMM d, yyyy');
  } catch {
    return iso;
  }
}

function formatMoney(amount: number | null | undefined): string {
  if (amount == null) return '$0.00';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function isInvoiceOverdue(invoice: Invoice): boolean {
  if (invoice.status === 'paid' || invoice.status === 'cancelled' || !invoice.dueDate) return false;
  try {
    return isPast(parseISO(invoice.dueDate));
  } catch {
    return false;
  }
}

function isUnpaid(invoice: Invoice): boolean {
  return invoice.status !== 'paid' && invoice.status !== 'cancelled';
}

export default function MyInvoicesScreen() {
  const [filter, setFilter] = useState<FilterKey>('all');
  const { data, isLoading, isRefetching, refetch, isError, error } = useInvoices();

  const allInvoices = useMemo(() => data ?? [], [data]);

  const outstandingTotal = useMemo(() => {
    return allInvoices
      .filter(isUnpaid)
      .reduce((sum, i) => sum + (i.total ?? 0), 0);
  }, [allInvoices]);

  const unpaidCount = useMemo(
    () => allInvoices.filter(isUnpaid).length,
    [allInvoices]
  );

  const filtered = useMemo(() => {
    switch (filter) {
      case 'outstanding':
        return allInvoices.filter(isUnpaid);
      case 'paid':
        return allInvoices.filter((i) => i.status === 'paid');
      case 'overdue':
        return allInvoices.filter(isInvoiceOverdue);
      case 'all':
      default:
        return allInvoices;
    }
  }, [allInvoices, filter]);

  const renderItem = ({ item }: { item: Invoice }) => {
    const overdue = isInvoiceOverdue(item);
    const displayStatus = overdue && isUnpaid(item) ? 'overdue' : item.status;
    return (
      <Pressable
        onPress={() =>
          router.push({
            pathname: '/(customer)/invoices/[id]',
            params: { id: item.id },
          })
        }
        accessibilityRole="button"
        accessibilityLabel={`View invoice ${item.number}`}
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
              <View className="mt-1 flex-row items-center">
                <Calendar size={12} color={COLORS.mutedForeground} />
                <Text
                  className={cn(
                    'ml-1 text-xs',
                    overdue && isUnpaid(item)
                      ? 'font-semibold text-destructive'
                      : 'text-muted-foreground'
                  )}
                >
                  Due {formatDate(item.dueDate)}
                </Text>
              </View>
            </View>
            <StatusBadge status={displayStatus} />
          </View>

          <View className="mt-3 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <DollarSign size={14} color={COLORS.primary} />
              <Text className="ml-0.5 text-lg font-bold text-foreground">
                {formatMoney(item.total)}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Text className="mr-1 text-xs font-semibold text-primary-600">
                {isUnpaid(item) ? 'Pay / View' : 'View'}
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
      <FlatList
        data={filtered}
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
            <Text className="mb-2 mt-2 text-xl font-bold text-foreground">Invoices</Text>

            {/* Outstanding summary */}
            <Card
              className="mb-3"
              style={{
                backgroundColor: unpaidCount > 0 ? '#FFFBEB' : '#ECFDF5',
                borderColor: unpaidCount > 0 ? '#FDE68A' : '#A7F3D0',
              }}
            >
              <Text
                className={cn(
                  'text-xs font-semibold uppercase tracking-wide',
                  unpaidCount > 0 ? 'text-amber-700' : 'text-primary-700'
                )}
              >
                {unpaidCount > 0 ? 'Total outstanding' : 'All caught up'}
              </Text>
              <Text
                className={cn(
                  'mt-1 text-2xl font-bold',
                  unpaidCount > 0 ? 'text-amber-700' : 'text-primary-700'
                )}
              >
                {formatMoney(outstandingTotal)}
              </Text>
              <Text className="mt-1 text-xs text-muted-foreground">
                {unpaidCount} unpaid invoice{unpaidCount === 1 ? '' : 's'}
              </Text>
            </Card>

            {/* Filter chips */}
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
              title="Couldn't load invoices"
              description={error instanceof Error ? error.message : 'Please try again later.'}
              actionLabel="Retry"
              onAction={() => refetch()}
            />
          ) : (
            <EmptyState
              icon={<FileText size={48} color={COLORS.mutedForeground} />}
              title={
                filter === 'all'
                  ? 'No invoices'
                  : filter === 'paid'
                    ? 'No paid invoices'
                    : filter === 'overdue'
                      ? 'No overdue invoices'
                      : 'No outstanding invoices'
              }
              description="You're all caught up! Invoices will appear here when they're issued."
            />
          )
        }
      />
    </SafeAreaView>
  );
}

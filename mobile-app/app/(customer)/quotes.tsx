/**
 * Quotes Screen (NEW)
 *
 * PWA-matching quotes list:
 *   - Fetch GET /api/quotes → Quote[]
 *   - Status filter chips: All / Pending / Accepted / Declined / Expired
 *   - Cards: number, provider, total, issue/expiry date, status badge
 *   - Tap a quote → Modal with line items, totals, notes
 *   - Accept/Decline buttons: PATCH /api/quotes/[id] { status: 'accepted'|'declined' }
 */
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, FlatList, RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, isPast } from 'date-fns';
import {
  FileText,
  ChevronRight,
  AlertTriangle,
  Check,
  X,
  AlertCircle,
  Calendar,
  DollarSign,
  Plus,
} from 'lucide-react-native';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SkeletonList } from '@/components/ui/Skeleton';
import { StatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { useToast } from '@/components/ui/Toast';
import { COLORS } from '@/lib/constants';
import { cn } from '@/lib/cn';
import type { Quote } from '@/types';

// ── Helpers ──────────────────────────────────────────────────────────

type FilterKey = 'all' | 'pending' | 'accepted' | 'declined' | 'expired';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'declined', label: 'Declined' },
  { key: 'expired', label: 'Expired' },
];

function normalizeQuotes(
  r: Quote[] | { data: Quote[] } | { quotes: Quote[] } | undefined
): Quote[] {
  if (!r) return [];
  if (Array.isArray(r)) return r;
  if (Array.isArray((r as { data?: Quote[] }).data)) return (r as { data: Quote[] }).data;
  if (Array.isArray((r as { quotes?: Quote[] }).quotes))
    return (r as { quotes: Quote[] }).quotes;
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

function isQuoteExpired(q: Quote): boolean {
  if (q.status === 'accepted' || q.status === 'declined') return false;
  if (!q.expiryDate) return false;
  try {
    return isPast(parseISO(q.expiryDate));
  } catch {
    return false;
  }
}

function displayStatus(q: Quote): string {
  if (isQuoteExpired(q)) return 'expired';
  return q.status;
}

// ── Screen ───────────────────────────────────────────────────────────

export default function QuotesScreen() {
  const toast = useToast();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<FilterKey>('all');
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);

  // ── Query ────────────────────────────────────────────────────────
  const { data, isLoading, isRefetching, refetch, isError, error } = useQuery({
    queryKey: ['quotes', 'list'],
    queryFn: async () => {
      const r = await api.get<Quote[] | { data: Quote[] }>('/api/quotes');
      return normalizeQuotes(r);
    },
  });

  const allQuotes = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(() => {
    if (filter === 'all') return allQuotes;
    if (filter === 'expired') {
      return allQuotes.filter((q) => isQuoteExpired(q));
    }
    return allQuotes.filter((q) => q.status === filter && !isQuoteExpired(q));
  }, [allQuotes, filter]);

  // ── Mutations ────────────────────────────────────────────────────
  const updateQuote = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'accepted' | 'declined' }) =>
      api.patch<Quote>(`/api/quotes/${id}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotes'] });
    },
  });

  const handleRespond = async (
    quote: Quote,
    status: 'accepted' | 'declined'
  ) => {
    try {
      await updateQuote.mutateAsync({ id: quote.id, status });
      toast.show(
        status === 'accepted' ? 'Quote accepted!' : 'Quote declined.',
        'success'
      );
      setSelectedQuote(null);
    } catch (err) {
      toast.show(
        err instanceof Error ? err.message : `Failed to ${status} quote.`,
        'error'
      );
    }
  };

  const renderItem = ({ item }: { item: Quote }) => {
    const status = displayStatus(item);
    const isPending = status === 'sent' || status === 'draft';
    return (
      <Pressable
        onPress={() => setSelectedQuote(item)}
        accessibilityRole="button"
        accessibilityLabel={`View quote ${item.number}`}
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
                <Text className="ml-1 text-xs text-muted-foreground">
                  Issued {formatDate(item.issueDate)}
                </Text>
              </View>
              <View className="mt-1 flex-row items-center">
                <Calendar size={12} color={COLORS.mutedForeground} />
                <Text
                  className={cn(
                    'ml-1 text-xs',
                    isQuoteExpired(item)
                      ? 'font-semibold text-destructive'
                      : 'text-muted-foreground'
                  )}
                >
                  Expires {formatDate(item.expiryDate)}
                </Text>
              </View>
            </View>
            <StatusBadge status={status} />
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
                {isPending ? 'Review' : 'Details'}
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
            <View className="flex-row items-center justify-between">
              <Text className="mb-2 mt-2 text-xl font-bold text-foreground">Quotes</Text>
              <Pressable
                onPress={() => router.push('/(customer)/marketplace')}
                hitSlop={8}
                className="mb-2 flex-row items-center"
              >
                <Plus size={14} color={COLORS.primary} />
                <Text className="ml-1 text-xs font-semibold text-primary-700">New</Text>
              </Pressable>
            </View>
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
              title="Couldn't load quotes"
              description={error instanceof Error ? error.message : 'Please try again later.'}
              actionLabel="Retry"
              onAction={() => refetch()}
            />
          ) : (
            <EmptyState
              icon={<FileText size={48} color={COLORS.mutedForeground} />}
              title="No quotes yet"
              description="Request a quote from any marketplace provider to see it here."
              actionLabel="Browse Marketplace"
              onAction={() => router.replace('/(customer)/marketplace')}
            />
          )
        }
      />

      {/* Quote detail modal */}
      <Modal
        visible={!!selectedQuote}
        onClose={() => setSelectedQuote(null)}
        position="center"
        showHandle={false}
      >
        {selectedQuote ? (
          <ScrollView style={{ maxHeight: 600 }}>
            <View className="px-5 pb-6 pt-5">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-lg font-bold text-foreground">
                    {selectedQuote.number}
                  </Text>
                  {selectedQuote.provider?.name ? (
                    <Text className="mt-0.5 text-sm text-muted-foreground">
                      {selectedQuote.provider.name}
                    </Text>
                  ) : null}
                </View>
                <StatusBadge status={displayStatus(selectedQuote)} />
              </View>

              <View className="mt-3 flex-row">
                <View className="flex-1">
                  <Text className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Issued
                  </Text>
                  <Text className="mt-1 text-sm text-foreground">
                    {formatDate(selectedQuote.issueDate)}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Expires
                  </Text>
                  <Text
                    className={cn(
                      'mt-1 text-sm',
                      isQuoteExpired(selectedQuote)
                        ? 'font-semibold text-destructive'
                        : 'text-foreground'
                    )}
                  >
                    {formatDate(selectedQuote.expiryDate)}
                  </Text>
                </View>
              </View>

              {/* Line items */}
              {selectedQuote.items && selectedQuote.items.length > 0 ? (
                <View className="mt-4">
                  <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Line Items
                  </Text>
                  <View className="rounded-lg border border-border">
                    {selectedQuote.items.map((item, idx) => (
                      <View
                        key={item.id ?? idx}
                        className={cn(
                          'flex-row px-3 py-2',
                          idx < selectedQuote.items.length - 1
                            ? 'border-b border-border'
                            : ''
                        )}
                      >
                        <View className="flex-1 pr-2">
                          <Text className="text-sm text-foreground">{item.description}</Text>
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

              {/* Totals */}
              <View className="mt-4 rounded-lg bg-muted p-3">
                <View className="flex-row justify-between py-0.5">
                  <Text className="text-sm text-muted-foreground">Subtotal</Text>
                  <Text className="text-sm text-foreground">
                    {formatMoney(selectedQuote.subtotal)}
                  </Text>
                </View>
                <View className="flex-row justify-between py-0.5">
                  <Text className="text-sm text-muted-foreground">Tax</Text>
                  <Text className="text-sm text-foreground">{formatMoney(selectedQuote.tax)}</Text>
                </View>
                <View className="mt-1 h-px bg-border" />
                <View className="mt-1 flex-row justify-between">
                  <Text className="text-base font-bold text-foreground">Total</Text>
                  <Text className="text-base font-bold text-primary-700">
                    {formatMoney(selectedQuote.total)}
                  </Text>
                </View>
              </View>

              {/* Notes */}
              {selectedQuote.notes ? (
                <View className="mt-3">
                  <Text className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Notes
                  </Text>
                  <Text className="mt-1 text-sm text-foreground">{selectedQuote.notes}</Text>
                </View>
              ) : null}

              {/* Actions */}
              {selectedQuote.status === 'sent' || selectedQuote.status === 'draft' ? (
                isQuoteExpired(selectedQuote) ? (
                  <View className="mt-5 flex-row items-center justify-center rounded-lg bg-amber-50 py-3">
                    <AlertTriangle size={16} color={COLORS.accent} />
                    <Text className="ml-2 text-sm font-semibold text-amber-700">
                      This quote has expired.
                    </Text>
                  </View>
                ) : (
                  <View className="mt-5 flex-row gap-2">
                    <Button
                      variant="outline"
                      onPress={() => handleRespond(selectedQuote, 'declined')}
                      loading={updateQuote.isPending}
                      className="flex-1"
                    >
                      <View className="flex-row items-center">
                        <X size={14} color={COLORS.destructive} />
                        <Text className="ml-1.5 text-sm font-semibold text-destructive">
                          Decline
                        </Text>
                      </View>
                    </Button>
                    <Button
                      onPress={() => handleRespond(selectedQuote, 'accepted')}
                      loading={updateQuote.isPending}
                      className="flex-1"
                    >
                      <View className="flex-row items-center">
                        <Check size={14} color="#fff" />
                        <Text className="ml-1.5 text-sm font-semibold text-white">
                          Accept
                        </Text>
                      </View>
                    </Button>
                  </View>
                )
              ) : null}

              <View className="mt-3">
                <Button variant="ghost" onPress={() => setSelectedQuote(null)} fullWidth>
                  Close
                </Button>
              </View>
            </View>
          </ScrollView>
        ) : null}
      </Modal>

      <LoadingOverlay visible={updateQuote.isPending} message="Updating quote…" />
    </SafeAreaView>
  );
}

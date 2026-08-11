/**
 * Payments Screen (NEW)
 *
 * PWA-matching payments screen:
 *   - Saved cards list (PaymentMethod[]): brand, last4, expiry, default badge
 *   - "Set as default" + "Remove" (DELETE) actions
 *   - "Add payment method" button → opens PWA billing page via Linking
 *   - Transaction history section: paid invoices used as proxy when no
 *     payments endpoint is available
 */
import React, { useMemo } from 'react';
import { View, Text, Pressable, ScrollView, RefreshControl, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import {
  CreditCard,
  Plus,
  Trash2,
  Star,
  AlertCircle,
  Check,
  DollarSign,
  ArrowLeft,
  Wallet,
} from 'lucide-react-native';
import { api, assetUrl } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SkeletonList } from '@/components/ui/Skeleton';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { useToast } from '@/components/ui/Toast';
import { COLORS, API_BASE_URL } from '@/lib/constants';
import { cn } from '@/lib/cn';
import type { PaymentMethod, Invoice } from '@/types';

// ── Helpers ──────────────────────────────────────────────────────────

function normalizeMethods(
  r: PaymentMethod[] | { data: PaymentMethod[] } | { methods: PaymentMethod[] } | undefined
): PaymentMethod[] {
  if (!r) return [];
  if (Array.isArray(r)) return r;
  if (Array.isArray((r as { data?: PaymentMethod[] }).data)) return (r as { data: PaymentMethod[] }).data;
  if (Array.isArray((r as { methods?: PaymentMethod[] }).methods))
    return (r as { methods?: PaymentMethod[] }).methods ?? [];
  return [];
}

function normalizeInvoices(
  r: Invoice[] | { data: Invoice[] } | undefined
): Invoice[] {
  if (!r) return [];
  if (Array.isArray(r)) return r;
  if (Array.isArray((r as { data?: Invoice[] }).data)) return (r as { data?: Invoice[] }).data ?? [];
  return [];
}

function formatMoney(amount: number | null | undefined): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), 'MMM d, yyyy');
  } catch {
    return iso;
  }
}

function formatExpiry(month: number | null | undefined, year: number | null | undefined): string {
  if (month == null || year == null) return '';
  const m = String(month).padStart(2, '0');
  const y = String(year).slice(-2);
  return `${m}/${y}`;
}

function brandGradient(brand: string | null | undefined): string {
  const b = (brand ?? '').toLowerCase();
  if (b.includes('visa')) return '#1e3a8a';
  if (b.includes('master')) return '#c2410c';
  if (b.includes('amex')) return '#0f766e';
  if (b.includes('discover')) return '#b45309';
  if (b.includes('rupay')) return '#047857';
  return '#374151';
}

function brandInitial(brand: string | null | undefined, type: string): string {
  const b = (brand ?? '').trim();
  if (b) return b.slice(0, 4).toUpperCase();
  if (type === 'bank') return 'BANK';
  if (type === 'wallet') return 'WAL';
  return 'CARD';
}

// ── Payment method card ──────────────────────────────────────────────

interface MethodCardProps {
  method: PaymentMethod;
  onSetDefault: () => void;
  onRemove: () => void;
  isUpdating: boolean;
}

function PaymentMethodCard({ method, onSetDefault, onRemove, isUpdating }: MethodCardProps) {
  const gradient = brandGradient(method.brand);
  const initials = brandInitial(method.brand, method.type);

  return (
    <Card padded={false} className="overflow-hidden">
      {/* Visual top section */}
      <View style={{ backgroundColor: gradient }} className="px-4 py-4">
        <View className="flex-row items-start justify-between">
          <Text className="text-xs font-bold uppercase tracking-wider text-white/80">
            {method.type === 'card' ? 'Card' : method.type === 'bank' ? 'Bank Account' : 'Wallet'}
          </Text>
          {method.isDefault ? (
            <View className="flex-row items-center rounded-full bg-white/25 px-2 py-0.5">
              <Star size={10} color="#fff" fill="#fff" />
              <Text className="ml-1 text-[10px] font-bold text-white">DEFAULT</Text>
            </View>
          ) : null}
        </View>
        <View className="mt-3 flex-row items-center justify-between">
          <Text className="text-base font-bold text-white">{initials}</Text>
          {method.last4 ? (
            <Text className="font-mono text-sm text-white">
              •••• {method.last4}
            </Text>
          ) : null}
        </View>
        {method.expiryMonth != null && method.expiryYear != null ? (
          <Text className="mt-1 text-xs text-white/80">
            Expires {formatExpiry(method.expiryMonth, method.expiryYear)}
          </Text>
        ) : null}
      </View>

      {/* Actions */}
      <View className="flex-row px-4 py-3">
        {!method.isDefault ? (
          <Pressable
            onPress={onSetDefault}
            disabled={isUpdating}
            className={cn(
              'mr-2 flex-row items-center rounded-lg bg-primary-50 px-3 py-1.5',
              isUpdating && 'opacity-50'
            )}
            hitSlop={6}
          >
            <Check size={12} color={COLORS.primary} />
            <Text className="ml-1 text-xs font-semibold text-primary-700">Set Default</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={onRemove}
          disabled={isUpdating}
          className={cn(
            'flex-row items-center rounded-lg bg-red-50 px-3 py-1.5',
            isUpdating && 'opacity-50'
          )}
          hitSlop={6}
        >
          <Trash2 size={12} color={COLORS.destructive} />
          <Text className="ml-1 text-xs font-semibold text-destructive">Remove</Text>
        </Pressable>
      </View>
    </Card>
  );
}

// ── Screen ───────────────────────────────────────────────────────────

export default function PaymentsScreen() {
  const toast = useToast();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  // ── Queries ──────────────────────────────────────────────────────
  const methodsQuery = useQuery({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const r = await api.get<PaymentMethod[] | { data: PaymentMethod[] }>(
        '/api/customer/payment-methods'
      );
      return normalizeMethods(r);
    },
  });

  const transactionsQuery = useQuery({
    queryKey: ['invoices', 'transactions'],
    queryFn: async () => {
      const r = await api.get<Invoice[] | { data: Invoice[] }>('/api/invoices', {
        status: 'paid',
      });
      return normalizeInvoices(r);
    },
  });

  const refreshing = methodsQuery.isRefetching || transactionsQuery.isRefetching;
  const onRefresh = () => {
    methodsQuery.refetch();
    transactionsQuery.refetch();
  };

  // ── Mutations ────────────────────────────────────────────────────
  const setDefault = useMutation({
    mutationFn: (id: string) =>
      api.patch<PaymentMethod>(`/api/customer/payment-methods/${id}`, {
        isDefault: true,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payment-methods'] });
    },
  });

  const removeMethod = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/customer/payment-methods/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payment-methods'] });
    },
  });

  const handleSetDefault = async (id: string) => {
    try {
      await setDefault.mutateAsync(id);
      toast.show('Default payment method updated.', 'success');
    } catch (err) {
      toast.show(
        err instanceof Error ? err.message : 'Failed to update default.',
        'error'
      );
    }
  };

  const handleRemove = (id: string) => {
    Alert.alert(
      'Remove payment method?',
      'This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeMethod.mutateAsync(id);
              toast.show('Payment method removed.', 'success');
            } catch (err) {
              toast.show(
                err instanceof Error ? err.message : 'Failed to remove.',
                'error'
              );
            }
          },
        },
      ]
    );
  };

  const handleAdd = async () => {
    const url = `${API_BASE_URL}/billing?email=${encodeURIComponent(user?.email ?? '')}`;
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      toast.show('Unable to open the billing page.', 'error');
      return;
    }
    await Linking.openURL(url);
    toast.show('Opening secure billing page…', 'info');
  };

  const methods = useMemo(() => methodsQuery.data ?? [], [methodsQuery.data]);
  const transactions = useMemo(
    () => transactionsQuery.data ?? [],
    [transactionsQuery.data]
  );

  const isLoading = methodsQuery.isLoading;
  const isError = methodsQuery.isError && methods.length === 0;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      {/* Top bar */}
      <View className="flex-row items-center px-4 py-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <ArrowLeft size={24} color={COLORS.foreground} />
        </Pressable>
        <Text className="ml-3 flex-1 text-base font-bold text-foreground" numberOfLines={1}>
          Payments
        </Text>
        <Pressable
          onPress={() => methodsQuery.refetch()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Refresh"
        >
          <Wallet size={20} color={COLORS.primary} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
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
        {/* Saved payment methods */}
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-base font-bold text-foreground">Saved Methods</Text>
          <Pressable
            onPress={handleAdd}
            className="flex-row items-center rounded-lg bg-primary-50 px-3 py-1.5"
            hitSlop={6}
          >
            <Plus size={12} color={COLORS.primary} />
            <Text className="ml-1 text-xs font-semibold text-primary-700">Add</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <SkeletonList count={2} />
        ) : isError ? (
          <Card>
            <EmptyState
              icon={<AlertCircle size={36} color={COLORS.destructive} />}
              title="Couldn't load payment methods"
              description={
                methodsQuery.error instanceof Error
                  ? methodsQuery.error.message
                  : 'Please try again.'
              }
              actionLabel="Retry"
              onAction={() => methodsQuery.refetch()}
            />
          </Card>
        ) : methods.length === 0 ? (
          <Card className="items-center py-8">
            <CreditCard size={36} color={COLORS.mutedForeground} />
            <Text className="mt-3 text-base font-semibold text-foreground">
              No saved payment methods
            </Text>
            <Text className="mt-1 text-center text-sm text-muted-foreground">
              Add a card or wallet to pay invoices faster.
            </Text>
            <View className="mt-4 w-full">
              <Button onPress={handleAdd} fullWidth>
                <View className="flex-row items-center">
                  <Plus size={16} color="#fff" />
                  <Text className="ml-2 text-sm font-semibold text-white">
                    Add Payment Method
                  </Text>
                </View>
              </Button>
            </View>
          </Card>
        ) : (
          <View>
            {methods.map((m) => (
              <View key={m.id} className="mb-3">
                <PaymentMethodCard
                  method={m}
                  onSetDefault={() => handleSetDefault(m.id)}
                  onRemove={() => handleRemove(m.id)}
                  isUpdating={setDefault.isPending || removeMethod.isPending}
                />
              </View>
            ))}
          </View>
        )}

        {/* Add method CTA (also at bottom of methods list for visibility) */}
        {methods.length > 0 ? (
          <Button variant="outline" onPress={handleAdd} fullWidth>
            <View className="flex-row items-center">
              <Plus size={16} color={COLORS.primary} />
              <Text className="ml-2 text-sm font-semibold text-primary-600">
                Add Payment Method
              </Text>
            </View>
          </Button>
        ) : null}

        {/* Transaction history */}
        <View className="mb-2 mt-6">
          <Text className="text-base font-bold text-foreground">Transaction History</Text>
          <Text className="text-xs text-muted-foreground">Recent paid invoices</Text>
        </View>

        {transactionsQuery.isLoading ? (
          <SkeletonList count={3} />
        ) : transactionsQuery.isError ? (
          <Card>
            <Text className="text-center text-sm text-muted-foreground">
              Couldn't load transactions. Pull to refresh.
            </Text>
          </Card>
        ) : transactions.length === 0 ? (
          <Card className="items-center py-6">
            <DollarSign size={28} color={COLORS.mutedForeground} />
            <Text className="mt-2 text-sm text-muted-foreground">
              No transactions yet.
            </Text>
          </Card>
        ) : (
          <View>
            {transactions.slice(0, 10).map((tx) => (
              <Pressable
                key={tx.id}
                onPress={() =>
                  router.push({
                    pathname: '/(customer)/invoices/[id]',
                    params: { id: tx.id },
                  })
                }
                className="active:opacity-70"
              >
                <Card className="mb-2 flex-row items-center">
                  <View className="h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                    <DollarSign size={18} color={COLORS.success} />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-sm font-semibold text-foreground">{tx.number}</Text>
                    <Text className="text-xs text-muted-foreground">
                      {formatDate(tx.paidAt ?? tx.dueDate)}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-sm font-bold text-foreground">
                      {formatMoney(tx.total)}
                    </Text>
                    <StatusBadge status="paid" />
                  </View>
                </Card>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <LoadingOverlay
        visible={setDefault.isPending || removeMethod.isPending}
        message="Updating payment method…"
      />
    </SafeAreaView>
  );
}

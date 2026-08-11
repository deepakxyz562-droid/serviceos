/**
 * Job Expenses (Employee) — rewrite.
 *
 * PWA-parity features:
 *   - Fetches GET /api/jobs/[id]/expenses → JobExpense[].
 *   - Add expense modal: description, amount, category, optional receipt photo.
 *   - POST /api/jobs/[id]/expenses (FormData if receipt attached, else JSON).
 *   - List with description, amount, category badge, status badge, expense
 *     number, submitter name, expense date, notes (truncated), receipt chip.
 *   - Total expenses summary card (tenant-currency formatted).
 *   - Delete expense (DELETE /api/jobs/[id]/expenses/[expenseId]).
 *   - PDF receipt support: opens externally via Linking.openURL (react-native
 *     Image cannot render PDFs). Image receipts still open in the in-app
 *     modal viewer.
 *   - Currency: uses the tenant-configured currency (Tenant.currency via the
 *     auth-store) instead of hardcoding USD. Falls back to USD if the tenant
 *     has no currency set.
 *   - Loading + empty + error states.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  Alert,
  RefreshControl,
  TextInput,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft,
  Plus,
  Receipt,
  Trash2,
  ImagePlus,
  X,
  DollarSign,
} from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import {
  useJob,
  useJobExpenses,
  useAddJobExpense,
  useDeleteJobExpense,
} from '@/hooks/use-jobs';
import { assetUrl } from '@/lib/api';
import { COLORS } from '@/lib/constants';
import { formatCurrency, currencyCode } from '@/lib/currency';
import { useAuthStore } from '@/stores/auth-store';
import type { JobExpense } from '@/types';

const EXPENSE_CATEGORIES = [
  { value: 'materials', label: 'Materials' },
  { value: 'fuel', label: 'Fuel' },
  { value: 'labor', label: 'Labor' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'other', label: 'Other' },
];

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

const CATEGORY_VARIANT: Record<
  string,
  'default' | 'primary' | 'success' | 'warning' | 'destructive' | 'info'
> = {
  materials: 'primary',
  fuel: 'warning',
  labor: 'info',
  equipment: 'destructive',
  other: 'default',
};

/**
 * Map expense status (returned by /api/jobs/[id]/expenses) to Badge variants.
 * Mirrors the PWA JobExpensesSection color mapping:
 *   pending=amber, approved=emerald, rejected=rose, reimbursed=blue.
 */
const STATUS_VARIANT: Record<
  string,
  'default' | 'primary' | 'success' | 'warning' | 'destructive' | 'info'
> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'destructive',
  reimbursed: 'info',
  paid: 'info',
  submitted: 'primary',
};

export default function JobExpensesScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id =
    typeof params.id === 'string'
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : '';
  const { show } = useToast();
  const tenantCurrency = useAuthStore((s) => s.tenant?.currency ?? null);

  const jobQuery = useJob(id);
  const expensesQuery = useJobExpenses(id);
  const { refetch: refetchExpenses } = expensesQuery;
  const addExpense = useAddJobExpense();
  const deleteExpense = useDeleteJobExpense();

  const [showAddModal, setShowAddModal] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('materials');
  const [receiptAsset, setReceiptAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      refetchExpenses();
    }, [refetchExpenses])
  );

  const expenses: JobExpense[] = expensesQuery.data ?? jobQuery.data?.expenses ?? [];

  const total = useMemo(
    () => expenses.reduce((sum, e) => sum + (typeof e.amount === 'number' ? e.amount : 0), 0),
    [expenses]
  );

  const pickReceipt = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Permission required',
          'Please grant photo library access to attach a receipt.'
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });
      if (result.canceled || !result.assets?.length) return;
      setReceiptAsset(result.assets[0]);
    } catch (err) {
      show(
        err instanceof Error ? err.message : 'Failed to pick receipt.',
        'error'
      );
    }
  }, [show]);

  const pickReceiptFromCamera = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Camera permission required',
          'Please grant camera access to capture a receipt.'
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });
      if (result.canceled || !result.assets?.length) return;
      setReceiptAsset(result.assets[0]);
    } catch (err) {
      show(
        err instanceof Error ? err.message : 'Failed to capture receipt.',
        'error'
      );
    }
  }, [show]);

  const resetForm = useCallback(() => {
    setDescription('');
    setAmount('');
    setCategory('materials');
    setReceiptAsset(null);
  }, []);

  const handleAdd = useCallback(async () => {
    if (!description.trim()) {
      show('Please enter a description.', 'warning');
      return;
    }
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      show('Please enter a valid amount.', 'warning');
      return;
    }
    try {
      let receiptFormData: FormData | null = null;
      if (receiptAsset) {
        receiptFormData = new FormData();
        const fileName = receiptAsset.fileName || `receipt_${Date.now()}.jpg`;
        const mimeType = receiptAsset.mimeType || 'image/jpeg';
        if (Platform.OS === 'web') {
          const webAsset = receiptAsset as ImagePicker.ImagePickerAsset & {
            file?: File;
          };
          if (webAsset.file instanceof File) {
            receiptFormData.append('file', webAsset.file, fileName);
          } else {
            const res = await fetch(receiptAsset.uri);
            const blob = await res.blob();
            receiptFormData.append('file', blob, fileName);
          }
        } else {
          receiptFormData.append('file', {
            uri: receiptAsset.uri,
            name: fileName,
            type: mimeType,
          } as unknown as Blob);
        }
      }
      await addExpense.mutateAsync({
        jobId: id,
        description: description.trim(),
        amount: amt,
        category,
        receiptFormData,
      });
      show('Expense added.', 'success');
      resetForm();
      setShowAddModal(false);
    } catch (err) {
      show(
        err instanceof Error ? err.message : 'Failed to add expense.',
        'error'
      );
    }
  }, [
    description,
    amount,
    category,
    receiptAsset,
    id,
    addExpense,
    show,
    resetForm,
  ]);

  const handleDelete = useCallback(
    (expense: JobExpense) => {
      Alert.alert(
        'Delete expense?',
        `"${expense.description}" will be removed.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteExpense.mutateAsync({ jobId: id, expenseId: expense.id });
                show('Expense deleted.', 'success');
              } catch (err) {
                show(
                  err instanceof Error ? err.message : 'Delete failed.',
                  'error'
                );
              }
            },
          },
        ]
      );
    },
    [id, deleteExpense, show]
  );

  if (jobQuery.isLoading && !jobQuery.data && !expensesQuery.data) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <Header onBack={() => router.back()} title="Expenses" />
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <Card className="h-24"><View /></Card>
          <View style={{ height: 12 }} />
          <Card className="h-20"><View /></Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (jobQuery.error || (!jobQuery.data && !expensesQuery.data)) {
    return (
      <SafeAreaView edges={['top']} className="flex-1 bg-background">
        <Header onBack={() => router.back()} title="Expenses" />
        <EmptyState
          icon={<Receipt size={48} color={COLORS.mutedForeground} />}
          title="Job not found"
          description={
            jobQuery.error instanceof Error
              ? jobQuery.error.message
              : 'Please go back and try again.'
          }
          actionLabel="Go Back"
          onAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <Header onBack={() => router.back()} title="Expenses" />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={!!expensesQuery.isRefetching}
            onRefresh={() => expensesQuery.refetch()}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Total summary */}
        <Card className="mb-3 mt-2">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Total Expenses
              </Text>
              <Text className="mt-0.5 text-2xl font-bold text-foreground">
                {formatCurrency(total, tenantCurrency)}
              </Text>
              <Text className="mt-0.5 text-xs text-muted-foreground">
                {expenses.length} {expenses.length === 1 ? 'entry' : 'entries'}
              </Text>
            </View>
            <View className="h-12 w-12 items-center justify-center rounded-full bg-primary-100">
              <DollarSign size={22} color={COLORS.primary} />
            </View>
          </View>
        </Card>

        <Button onPress={() => setShowAddModal(true)} fullWidth>
          <View className="flex-row items-center justify-center">
            <Plus size={16} color="#fff" />
            <Text className="ml-2 font-semibold text-white">Add Expense</Text>
          </View>
        </Button>

        {/* List */}
        <View className="mt-3" />
        {expensesQuery.isLoading && expenses.length === 0 ? (
          <Card>
            <Text className="text-sm text-muted-foreground">Loading…</Text>
          </Card>
        ) : expenses.length === 0 ? (
          <EmptyState
            icon={<Receipt size={48} color={COLORS.mutedForeground} />}
            title="No expenses recorded"
            description="Add materials, fuel, labor or other expenses for this job."
          />
        ) : (
          expenses.map((e) => {
            const receiptUrl = e.receiptUrl ? assetUrl(e.receiptUrl) : null;
            const isPdfReceipt = !!receiptUrl && /\.pdf(\?|$)/i.test(receiptUrl);
            const expenseDateIso = e.expenseDate || e.createdAt;
            const submitterName =
              e.employeeName ?? e.createdBy?.name ?? null;
            const status = (e.status || '').toLowerCase();
            return (
              <Card key={e.id} className="mb-2.5">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <View className="flex-row items-center flex-wrap gap-1.5">
                      <Text className="text-sm font-bold text-foreground flex-1">
                        {e.description}
                      </Text>
                      {status ? (
                        <Badge variant={STATUS_VARIANT[status] ?? 'default'}>
                          {status.replace(/_/g, ' ')}
                        </Badge>
                      ) : null}
                    </View>
                    {e.number ? (
                      <Text className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {e.number}
                      </Text>
                    ) : null}
                    <Text className="mt-0.5 text-xs text-muted-foreground">
                      {formatDate(expenseDateIso)}
                    </Text>
                    {submitterName ? (
                      <Text className="mt-0.5 text-[11px] text-muted-foreground">
                        Submitted by {submitterName}
                      </Text>
                    ) : null}
                    {e.notes ? (
                      <Text
                        className="mt-1 text-xs text-foreground"
                        numberOfLines={2}
                      >
                        {e.notes}
                      </Text>
                    ) : null}
                    <View className="mt-2 flex-row items-center gap-2">
                      {e.category ? (
                        <Badge variant={CATEGORY_VARIANT[e.category] ?? 'default'}>
                          {e.category}
                        </Badge>
                      ) : null}
                      {receiptUrl ? (
                        <Pressable
                          onPress={() => {
                            if (isPdfReceipt) {
                              // react-native Image cannot render PDFs — open
                              // externally so the user can view it in the
                              // system PDF viewer / browser.
                              Linking.openURL(receiptUrl).catch(() => {
                                show('Unable to open receipt.', 'error');
                              });
                            } else {
                              setViewerUrl(receiptUrl);
                            }
                          }}
                          className="flex-row items-center rounded-md bg-primary-50 px-2 py-1"
                        >
                          <ImagePlus size={11} color={COLORS.primary} />
                          <Text className="ml-1 text-[10px] font-semibold text-primary-700">
                            {isPdfReceipt ? 'PDF' : 'Receipt'}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="text-base font-bold text-foreground">
                      {formatCurrency(e.amount, tenantCurrency)}
                    </Text>
                    <Pressable
                      onPress={() => handleDelete(e)}
                      className="mt-2 flex-row items-center rounded-md bg-red-50 px-2 py-1"
                    >
                      <Trash2 size={11} color={COLORS.destructive} />
                      <Text className="ml-1 text-[10px] font-semibold text-destructive">
                        Delete
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Add Expense Modal */}
      <Modal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        position="bottom"
      >
        <View className="p-4">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-foreground">Add Expense</Text>
            <Pressable onPress={() => setShowAddModal(false)} hitSlop={12}>
              <X size={20} color={COLORS.mutedForeground} />
            </Pressable>
          </View>

          <Input
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="e.g. Copper pipe 1/2 in"
            maxLength={200}
          />

          <Input
            label={`Amount (${currencyCode(tenantCurrency)})`}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
          />

          <Text className="mb-2 text-sm font-medium text-foreground">Category</Text>
          <View className="mb-4 flex-row flex-wrap">
            {EXPENSE_CATEGORIES.map((c) => {
              const selected = category === c.value;
              return (
                <Pressable
                  key={c.value}
                  onPress={() => setCategory(c.value)}
                  className={`mr-2 mb-2 rounded-full border px-3 py-1.5 ${
                    selected ? 'border-primary-500 bg-primary-500' : 'border-border bg-white'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      selected ? 'text-white' : 'text-muted-foreground'
                    }`}
                  >
                    {c.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Receipt attachment */}
          <Text className="mb-2 text-sm font-medium text-foreground">
            Receipt (optional)
          </Text>
          {receiptAsset ? (
            <View className="relative mb-3 overflow-hidden rounded-xl border border-border">
              <Image
                source={{ uri: receiptAsset.uri }}
                accessibilityLabel="Receipt preview"
                alt="Receipt preview"
                className="h-40 w-full"
                resizeMode="cover"
              />
              <Pressable
                onPress={() => setReceiptAsset(null)}
                className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-full bg-black/60"
              >
                <X size={16} color="#fff" />
              </Pressable>
            </View>
          ) : (
            <View className="mb-4 flex-row gap-2">
              <View className="flex-1">
                <Button variant="outline" size="sm" onPress={pickReceiptFromCamera}>
                  <View className="flex-row items-center justify-center">
                    <ImagePlus size={14} color={COLORS.primary} />
                    <Text className="ml-1.5 text-xs font-semibold text-primary-700">
                      Camera
                    </Text>
                  </View>
                </Button>
              </View>
              <View className="flex-1">
                <Button variant="secondary" size="sm" onPress={pickReceipt}>
                  <View className="flex-row items-center justify-center">
                    <ImagePlus size={14} color={COLORS.foreground} />
                    <Text className="ml-1.5 text-xs font-semibold text-foreground">
                      Gallery
                    </Text>
                  </View>
                </Button>
              </View>
            </View>
          )}

          <Button onPress={handleAdd} loading={addExpense.isPending} fullWidth>
            Save Expense
          </Button>
        </View>
      </Modal>

      {/* Receipt viewer */}
      <Modal
        visible={!!viewerUrl}
        onClose={() => setViewerUrl(null)}
        position="center"
        showHandle={false}
      >
        {viewerUrl ? (
          <View className="p-2">
            <Image
              source={{ uri: viewerUrl }}
              accessibilityLabel="Receipt image"
              alt="Receipt image"
              className="h-80 w-full"
              resizeMode="contain"
            />
            <View className="mt-2 items-center">
              <Pressable
                onPress={() => setViewerUrl(null)}
                className="rounded-full bg-muted px-4 py-2"
              >
                <Text className="text-sm font-semibold text-foreground">Close</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </Modal>

      <LoadingOverlay
        visible={addExpense.isPending || deleteExpense.isPending}
        message={addExpense.isPending ? 'Adding expense…' : 'Deleting…'}
      />
    </SafeAreaView>
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

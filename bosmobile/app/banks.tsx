import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { hapticFeedback } from '@/lib/haptics';
import { apiRequest } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types (mirror of GET /api/commerce/banks)
// ---------------------------------------------------------------------------

type AccountType = 'BANK' | 'CASH' | 'UPI' | 'WALLET';

interface BankAccount {
  id: string;
  name: string;
  type: AccountType;
  accountNumberMasked: string | null;
  ifsc: string | null;
  upiId: string | null;
  openingBalance: number;
  currentBalance: number;
  currency: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

interface BanksSummary {
  cashInHand: number;
  bankTotal: number;
  totalBalance: number;
  accountCount: number;
}

interface BanksResponse {
  accounts: BankAccount[];
  summary: BanksSummary;
}

const BANKS_PATH = '/api/commerce/banks';

const ACCOUNT_TYPE_OPTIONS: Array<{ value: AccountType; label: string }> = [
  { value: 'BANK', label: 'Bank' },
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'WALLET', label: 'Wallet' },
];

const ACCOUNT_TYPE_META: Record<
  AccountType,
  { icon: keyof typeof MaterialIcons.glyphMap; label: string; color: string; bg: string }
> = {
  BANK: { icon: 'account-balance', label: 'Bank', color: '#1d4ed8', bg: '#dbeafe' },
  CASH: { icon: 'payments', label: 'Cash', color: '#047857', bg: '#d1fae5' },
  UPI: { icon: 'qr-code', label: 'UPI', color: '#6d28d9', bg: '#ede9fe' },
  WALLET: { icon: 'account-balance-wallet', label: 'Wallet', color: '#b45309', bg: '#fef3c7' },
};

/** en-IN grouped rupee format: '₹ 1,23,456.78' (negatives render as '-₹ 1,234.00'). */
function formatMoney(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const sign = safe < 0 ? '-' : '';
  const grouped = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(safe));
  return `${sign}₹ ${grouped}`;
}

export default function BanksScreen() {
  const router = useRouter();

  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [summary, setSummary] = useState<BanksSummary>({
    cashInHand: 0,
    bankTotal: 0,
    totalBalance: 0,
    accountCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add-account modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('BANK');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [upiId, setUpiId] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0');

  const fetchAccounts = useCallback(async () => {
    try {
      const data = await apiRequest<BanksResponse>(BANKS_PATH);
      setAccounts(data.accounts || []);
      if (data.summary) setSummary(data.summary);
      setError(null);
    } catch (err: any) {
      // ApiError.message carries the server's error text (401/403/503 included).
      setError(err?.message || 'Unable to load bank accounts.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchAccounts();
  }, [fetchAccounts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await hapticFeedback.light();
    await fetchAccounts();
  }, [fetchAccounts]);

  const openAddModal = () => {
    setName('');
    setType('BANK');
    setAccountNumber('');
    setIfsc('');
    setUpiId('');
    setOpeningBalance('0');
    setModalOpen(true);
  };

  const closeModal = () => {
    if (!submitting) setModalOpen(false);
  };

  const handleAddAccount = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Missing details', 'Please enter an account name.');
      return;
    }
    const parsedBalance = Number(openingBalance.trim());
    const balance =
      openingBalance.trim() === '' || !Number.isFinite(parsedBalance) ? 0 : parsedBalance;
    if (balance < 0) {
      Alert.alert('Invalid amount', 'Opening balance cannot be negative.');
      return;
    }

    setSubmitting(true);
    await hapticFeedback.medium();
    try {
      await apiRequest(BANKS_PATH, {
        method: 'POST',
        body: {
          name: trimmedName,
          type,
          accountNumber: type === 'BANK' ? accountNumber.trim() : '',
          ifsc: type === 'BANK' ? ifsc.trim().toUpperCase() : '',
          upiId: type === 'UPI' || type === 'WALLET' ? upiId.trim() : '',
          openingBalance: balance,
        },
      });
      await hapticFeedback.success();
      setModalOpen(false);
      setName('');
      setType('BANK');
      setAccountNumber('');
      setIfsc('');
      setUpiId('');
      setOpeningBalance('0');
      Alert.alert('Account added', `${trimmedName} is now part of Cash & Bank.`);
      void fetchAccounts();
    } catch (err: any) {
      await hapticFeedback.error();
      Alert.alert('Unable to save', err?.message || 'Could not add the account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderRow = ({ item }: { item: BankAccount }) => {
    const meta = ACCOUNT_TYPE_META[item.type] || ACCOUNT_TYPE_META.BANK;
    const identifier = item.accountNumberMasked || item.upiId || null;
    const negative = item.currentBalance < 0;
    return (
      <View style={styles.accountCard}>
        <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
          <MaterialIcons name={meta.icon} size={18} color={meta.color} />
        </View>
        <View style={styles.rowMain}>
          <View style={styles.nameRow}>
            <Text style={styles.accountName} numberOfLines={1}>
              {item.name}
            </Text>
            {item.isDefault ? (
              <View style={styles.defaultBadge}>
                <Text style={styles.defaultBadgeText}>Default</Text>
              </View>
            ) : null}
            {!item.isActive ? (
              <View style={styles.inactiveBadge}>
                <Text style={styles.inactiveBadgeText}>Inactive</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.accountSub} numberOfLines={1}>
            {identifier || '—'}
          </Text>
          {item.ifsc ? <Text style={styles.accountIfsc}>IFSC {item.ifsc}</Text> : null}
        </View>
        <View style={styles.rowRight}>
          <Text
            style={[styles.balanceText, negative && styles.balanceNegative]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {formatMoney(item.currentBalance)}
          </Text>
          <Text style={styles.typeLabel}>{meta.label}</Text>
        </View>
      </View>
    );
  };

  const listHeader = (
    <View>
      {/* Summary KPI strip */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiTile}>
          <View style={styles.kpiLabelRow}>
            <MaterialIcons name="payments" size={12} color="#047857" />
            <Text style={styles.kpiLabel}>Cash in Hand</Text>
          </View>
          <Text
            style={styles.kpiValue}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {loading || error ? '—' : formatMoney(summary.cashInHand)}
          </Text>
        </View>
        <View style={styles.kpiTile}>
          <View style={styles.kpiLabelRow}>
            <MaterialIcons name="account-balance" size={12} color="#1d4ed8" />
            <Text style={styles.kpiLabel}>Bank Accounts</Text>
          </View>
          <Text
            style={styles.kpiValue}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {loading || error ? '—' : formatMoney(summary.bankTotal)}
          </Text>
        </View>
        <View style={styles.kpiTile}>
          <View style={styles.kpiLabelRow}>
            <MaterialIcons name="savings" size={12} color="#b45309" />
            <Text style={styles.kpiLabel}>Total Balance</Text>
          </View>
          <Text
            style={styles.kpiValue}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {loading || error ? '—' : formatMoney(summary.totalBalance)}
          </Text>
        </View>
      </View>

      {/* Feature cards (static, Vyapar-style) */}
      <View style={styles.featureRow}>
        <View style={styles.featureCard}>
          <View style={styles.featureIconWrap}>
            <MaterialIcons name="print" size={16} color="#0f172a" />
          </View>
          <Text style={styles.featureTitle}>Print bank details on invoices</Text>
          <Text style={styles.featureSub}>Get paid directly via NEFT / RTGS / IMPS transfers.</Text>
        </View>
        <View style={styles.featureCard}>
          <View style={styles.featureIconWrap}>
            <MaterialIcons name="qr-code" size={16} color="#0f172a" />
          </View>
          <Text style={styles.featureTitle}>Print UPI QR on invoices</Text>
          <Text style={styles.featureSub}>Customers scan the QR & pay you instantly.</Text>
        </View>
      </View>
    </View>
  );

  const errorBlock = (
    <View style={styles.stateBox}>
      <MaterialIcons name="error-outline" size={44} color="#f87171" />
      <Text style={[styles.stateTitle, { color: '#f87171' }]}>{error}</Text>
      <Text style={styles.stateSub}>Please check your connection and try again.</Text>
      <TouchableOpacity
        style={styles.retryBtn}
        onPress={onRefresh}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Retry"
      >
        <Text style={styles.retryBtnText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  const emptyBlock = (
    <View style={styles.stateBox}>
      <View style={styles.emptyIconWrap}>
        <MaterialIcons name="account-balance" size={28} color="#94a3b8" />
      </View>
      <Text style={styles.stateTitle}>No accounts yet</Text>
      <Text style={styles.stateSub}>
        Add your bank, cash, UPI or wallet account to track all balances in one place.
      </Text>
      <TouchableOpacity
        style={styles.emptyCta}
        onPress={openAddModal}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Add account"
      >
        <MaterialIcons name="add" size={18} color="#ffffff" />
        <Text style={styles.emptyCtaText}>Add Account</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.iconBtn}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <MaterialIcons name="arrow-back" size={20} color="#0f172a" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Cash & Bank</Text>
            <Text style={styles.subtitle}>Track cash, bank, UPI & wallet balances</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={onRefresh}
          style={styles.iconBtn}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Refresh"
        >
          <MaterialIcons name="refresh" size={18} color="#0f172a" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Loading accounts...</Text>
        </View>
      ) : (
        <FlatList
          data={accounts}
          keyExtractor={(item) => item.id}
          renderItem={renderRow}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={error ? errorBlock : emptyBlock}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#059669']}
              tintColor="#059669"
            />
          }
        />
      )}

      {/* Floating primary CTA */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.fab}
          onPress={openAddModal}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Add account"
        >
          <MaterialIcons name="add" size={18} color="#ffffff" />
          <Text style={styles.fabText}>Add Account</Text>
        </TouchableOpacity>
      </View>

      {/* Add Account modal (bottom sheet) */}
      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={closeModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Account</Text>
              <TouchableOpacity
                onPress={closeModal}
                style={styles.modalCloseBtn}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <MaterialIcons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 32 }}
            >
              <Text style={styles.inputLabel}>Account Name *</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                style={styles.modalInput}
                placeholder="e.g. HDFC Current Account"
                placeholderTextColor="#94a3b8"
                maxLength={120}
                editable={!submitting}
              />

              <Text style={styles.inputLabel}>Account Type</Text>
              <View style={styles.segmentRow}>
                {ACCOUNT_TYPE_OPTIONS.map((opt) => {
                  const active = type === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => setType(opt.value)}
                      style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                      disabled={submitting}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {type === 'BANK' ? (
                <>
                  <Text style={styles.inputLabel}>Account Number</Text>
                  <TextInput
                    value={accountNumber}
                    onChangeText={(v) => setAccountNumber(v.replace(/\s+/g, ''))}
                    style={styles.modalInput}
                    placeholder="Account number"
                    placeholderTextColor="#94a3b8"
                    keyboardType="number-pad"
                    editable={!submitting}
                  />
                  <Text style={styles.inputLabel}>IFSC Code</Text>
                  <TextInput
                    value={ifsc}
                    onChangeText={(v) => setIfsc(v.toUpperCase().replace(/\s+/g, ''))}
                    style={styles.modalInput}
                    placeholder="e.g. HDFC0001234"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="characters"
                    maxLength={11}
                    editable={!submitting}
                  />
                </>
              ) : null}

              {type === 'UPI' || type === 'WALLET' ? (
                <>
                  <Text style={styles.inputLabel}>UPI ID</Text>
                  <TextInput
                    value={upiId}
                    onChangeText={setUpiId}
                    style={styles.modalInput}
                    placeholder="e.g. business@upi"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    editable={!submitting}
                  />
                </>
              ) : null}

              <Text style={styles.inputLabel}>Opening Balance</Text>
              <TextInput
                value={openingBalance}
                onChangeText={setOpeningBalance}
                style={styles.modalInput}
                placeholder="0.00"
                placeholderTextColor="#94a3b8"
                keyboardType="decimal-pad"
                editable={!submitting}
              />

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleAddAccount}
                disabled={submitting}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Save account"
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalSubmitText}>Save Account</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    gap: 10,
    flexGrow: 1,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  kpiTile: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    minWidth: 0,
  },
  kpiLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    flexShrink: 1,
  },
  kpiValue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 4,
  },
  featureRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  featureCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    gap: 4,
  },
  featureIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  featureTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  featureSub: {
    fontSize: 10.5,
    color: '#64748b',
    lineHeight: 15,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accountName: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
    flexShrink: 1,
  },
  defaultBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  defaultBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#047857',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  inactiveBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  inactiveBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  accountSub: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  accountIfsc: {
    fontSize: 10,
    color: '#94a3b8',
    fontFamily: 'monospace',
    marginTop: 1,
  },
  rowRight: {
    alignItems: 'flex-end',
    maxWidth: 130,
  },
  balanceText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
  balanceNegative: {
    color: '#dc2626',
  },
  typeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    marginTop: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  stateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 12,
    textAlign: 'center',
  },
  stateSub: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  retryBtn: {
    marginTop: 14,
    paddingHorizontal: 20,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 12,
  },
  emptyCta: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingHorizontal: 20,
    minHeight: 44,
  },
  emptyCtaText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  fabText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  modalCloseBtn: {
    width: 44,
    height: 44,
    marginRight: -10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginTop: 14,
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
    minHeight: 44,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  segmentBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  segmentBtnActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#059669',
  },
  segmentText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  segmentTextActive: {
    color: '#059669',
  },
  modalSubmitBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    minHeight: 48,
  },
  modalSubmitText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
});

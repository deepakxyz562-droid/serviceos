import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { hapticFeedback } from '@/lib/haptics';
import { apiRequest } from '@/lib/api';
import { API_PATHS } from '@/lib/constants';

interface DaybookTransaction {
  id: string;
  type: 'INFLOW' | 'OUTFLOW';
  source: 'ORDER' | 'EXPENSE';
  title: string;
  subtitle: string;
  amount: number;
  paymentStatus: string;
  paymentMethod: string;
  time: string;
}

interface DaybookSummary {
  totalSales: number;
  ordersCount: number;
  cashSales: number;
  upiSales: number;
  pendingSales: number;
  totalExpenses: number;
  cashExpenses: number;
  upiExpenses: number;
  netCashInHand: number;
  netUpiInBank: number;
  netProfitToday: number;
}

interface DaybookResponse {
  date: string;
  summary: DaybookSummary;
  transactions: DaybookTransaction[];
}

const EXPENSE_CATEGORIES = [
  'Raw Materials',
  'Tea & Snacks',
  'Shop Rent',
  'Staff Wages',
  'Fuel & Transport',
  'Electricity & Bills',
  'Packaging',
  'Repairs & Maintenance',
  'General',
];

export default function ExpensesScreen() {
  const router = useRouter();
  const [data, setData] = useState<DaybookResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | 'INFLOW' | 'OUTFLOW'>('ALL');
  const [error, setError] = useState<string | null>(null);

  // Add Expense Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI'>('CASH');
  const [submitting, setSubmitting] = useState(false);

  const fetchDaybook = useCallback(async () => {
    try {
      const res = await apiRequest<DaybookResponse>(API_PATHS.commerceDaybook);
      setData(res);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Unable to load Day Book.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDaybook();
  }, [fetchDaybook]);

  const onRefresh = async () => {
    setRefreshing(true);
    await hapticFeedback.light();
    await fetchDaybook();
  };

  const handleRecordExpense = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid expense amount.');
      return;
    }

    setSubmitting(true);
    await hapticFeedback.medium();
    try {
      await apiRequest(API_PATHS.commerceExpenses, {
        method: 'POST',
        body: {
          amount: amt,
          category,
          description: description.trim() || category,
          paymentMode,
        },
      });

      setModalOpen(false);
      setAmount('');
      setDescription('');
      Alert.alert('Expense Recorded ✓', `₹${amt.toFixed(2)} recorded under ${category}.`);
      fetchDaybook();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not record expense.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTransactions = data?.transactions.filter((tx) => {
    if (filterType === 'ALL') return true;
    return tx.type === filterType;
  }) || [];

  const summary = data?.summary || {
    totalSales: 0,
    ordersCount: 0,
    cashSales: 0,
    upiSales: 0,
    pendingSales: 0,
    totalExpenses: 0,
    cashExpenses: 0,
    upiExpenses: 0,
    netCashInHand: 0,
    netUpiInBank: 0,
    netProfitToday: 0,
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={20} color="#0f172a" />
          </TouchableOpacity>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.title}>Day Book & Expenses</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Cash Drawer</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>Daily cash drawer & operating expenses</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={onRefresh}
          style={styles.refreshBtn}
          activeOpacity={0.7}
        >
          <MaterialIcons name="refresh" size={18} color="#0f172a" />
        </TouchableOpacity>
      </View>

      {/* Main KPI Bar: Cash in Drawer & Daily Profit */}
      <View style={styles.kpiContainer}>
        {/* Cash in Hand (Drawer) */}
        <View style={styles.drawerCard}>
          <View style={styles.drawerHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={styles.drawerIconWrap}>
                <MaterialIcons name="account-balance-wallet" size={16} color="#059669" />
              </View>
              <Text style={styles.drawerLabel}>Cash in Drawer</Text>
            </View>
            <Text style={styles.profitBadge}>
              Profit: ₹{summary.netProfitToday.toFixed(2)}
            </Text>
          </View>
          <Text style={styles.drawerValue}>₹{summary.netCashInHand.toFixed(2)}</Text>
          <Text style={styles.drawerSub}>
            Cash In ₹{summary.cashSales.toFixed(2)} • Cash Out ₹{summary.cashExpenses.toFixed(2)}
          </Text>
        </View>

        {/* Inflows vs Outflows Mini Cards */}
        <View style={styles.miniCardRow}>
          <View style={styles.miniCardGreen}>
            <Text style={styles.miniCardLabelGreen}>Inflows (Sales)</Text>
            <Text style={styles.miniCardValueGreen}>+₹{summary.totalSales.toFixed(2)}</Text>
            <Text style={styles.miniCardSubGreen}>{summary.ordersCount} orders</Text>
          </View>
          <View style={styles.miniCardRed}>
            <Text style={styles.miniCardLabelRed}>Outflows (Expenses)</Text>
            <Text style={styles.miniCardValueRed}>-₹{summary.totalExpenses.toFixed(2)}</Text>
            <Text style={styles.miniCardSubRed}>Operating costs</Text>
          </View>
          <View style={styles.miniCardBlue}>
            <Text style={styles.miniCardLabelBlue}>Bank UPI</Text>
            <Text style={styles.miniCardValueBlue}>₹{summary.netUpiInBank.toFixed(2)}</Text>
            <Text style={styles.miniCardSubBlue}>Digital ledger</Text>
          </View>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          onPress={() => {
            hapticFeedback.light();
            setFilterType('ALL');
          }}
          style={[styles.tabBtn, filterType === 'ALL' && styles.tabBtnActive]}
        >
          <Text style={[styles.tabText, filterType === 'ALL' && styles.tabTextActive]}>
            All ({data?.transactions.length || 0})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            hapticFeedback.light();
            setFilterType('INFLOW');
          }}
          style={[styles.tabBtn, filterType === 'INFLOW' && styles.tabBtnActive]}
        >
          <Text style={[styles.tabText, filterType === 'INFLOW' && styles.tabTextActive]}>
            Inflows (+Sales)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            hapticFeedback.light();
            setFilterType('OUTFLOW');
          }}
          style={[styles.tabBtn, filterType === 'OUTFLOW' && styles.tabBtnActive]}
        >
          <Text style={[styles.tabText, filterType === 'OUTFLOW' && styles.tabTextActive]}>
            Outflows (-Costs)
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Calculating daily drawer balance...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#059669']} />
          }
        >
          {error ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="error-outline" size={44} color="#f87171" />
              <Text style={[styles.emptyTitle, { color: '#f87171' }]}>{error}</Text>
              <TouchableOpacity onPress={onRefresh} style={styles.retryBtn}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : filteredTransactions.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="receipt-long" size={48} color="#94a3b8" />
              <Text style={styles.emptyTitle}>No Transactions Today</Text>
              <Text style={styles.emptySub}>
                Orders and recorded expenses will appear here sequentially in real time.
              </Text>
            </View>
          ) : (
            filteredTransactions.map((tx) => {
              const isInflow = tx.type === 'INFLOW';
              const formattedTime = new Date(tx.time).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <View key={tx.id} style={styles.transactionCard}>
                  <View style={styles.txLeft}>
                    <View
                      style={[
                        styles.txIconWrap,
                        isInflow ? styles.txIconWrapGreen : styles.txIconWrapRed,
                      ]}
                    >
                      <MaterialIcons
                        name={isInflow ? 'arrow-downward' : 'arrow-upward'}
                        size={18}
                        color={isInflow ? '#059669' : '#dc2626'}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txTitle} numberOfLines={1}>
                        {tx.title}
                      </Text>
                      <Text style={styles.txSubtitle} numberOfLines={1}>
                        {tx.subtitle} • {tx.paymentMethod}
                      </Text>
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text
                      style={[
                        styles.txAmount,
                        isInflow ? styles.txAmountGreen : styles.txAmountRed,
                      ]}
                    >
                      {isInflow ? '+' : '-'}₹{tx.amount.toFixed(2)}
                    </Text>
                    <Text style={styles.txTime}>{formattedTime}</Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Floating Bottom Button: Add Expense */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          onPress={() => setModalOpen(true)}
          style={styles.addExpenseFab}
          activeOpacity={0.85}
        >
          <MaterialIcons name="add-circle-outline" size={20} color="#ffffff" />
          <Text style={styles.addExpenseFabText}>+ Record New Expense</Text>
        </TouchableOpacity>
      </View>

      {/* Record Expense Modal */}
      <Modal
        visible={modalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Operating Expense</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <MaterialIcons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Amount (₹) *</Text>
              <TextInput
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                style={styles.modalInput}
                placeholder="₹ 0.00"
              />

              <Text style={[styles.inputLabel, { marginTop: 12 }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setCategory(cat)}
                    style={[
                      styles.categoryChip,
                      category === cat && styles.categoryChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        category === cat && styles.categoryChipTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.inputLabel, { marginTop: 12 }]}>Payment Mode</Text>
              <View style={styles.paymentModeRow}>
                <TouchableOpacity
                  onPress={() => setPaymentMode('CASH')}
                  style={[
                    styles.paymentModeBtn,
                    paymentMode === 'CASH' && styles.paymentModeBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.paymentModeText,
                      paymentMode === 'CASH' && styles.paymentModeTextActive,
                    ]}
                  >
                    💵 Cash in Drawer
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setPaymentMode('UPI')}
                  style={[
                    styles.paymentModeBtn,
                    paymentMode === 'UPI' && styles.paymentModeBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.paymentModeText,
                      paymentMode === 'UPI' && styles.paymentModeTextActive,
                    ]}
                  >
                    ⚡ Bank / UPI
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.inputLabel, { marginTop: 12 }]}>Note / Details</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                style={styles.modalInput}
                placeholder="e.g. Milk 10 packets, Vegetables, Sugar"
              />

              <TouchableOpacity
                onPress={handleRecordExpense}
                disabled={submitting}
                style={styles.modalSubmitBtn}
                activeOpacity={0.8}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalSubmitText}>Save Expense to Day Book</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
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
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
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
  badge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  kpiContainer: {
    padding: 16,
    backgroundColor: '#f8fafc',
    gap: 10,
  },
  drawerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  drawerIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  profitBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284c7',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  drawerValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 4,
  },
  drawerSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  miniCardRow: {
    flexDirection: 'row',
    gap: 8,
  },
  miniCardGreen: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  miniCardLabelGreen: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803d',
    textTransform: 'uppercase',
  },
  miniCardValueGreen: {
    fontSize: 13,
    fontWeight: '800',
    color: '#15803d',
    marginTop: 2,
  },
  miniCardSubGreen: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 1,
  },
  miniCardRed: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  miniCardLabelRed: {
    fontSize: 9,
    fontWeight: '800',
    color: '#b91c1c',
    textTransform: 'uppercase',
  },
  miniCardValueRed: {
    fontSize: 13,
    fontWeight: '800',
    color: '#b91c1c',
    marginTop: 2,
  },
  miniCardSubRed: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 1,
  },
  miniCardBlue: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  miniCardLabelBlue: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0369a1',
    textTransform: 'uppercase',
  },
  miniCardValueBlue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0369a1',
    marginTop: 2,
  },
  miniCardSubBlue: {
    fontSize: 9,
    color: '#64748b',
    marginTop: 1,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 8,
  },
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  tabBtnActive: {
    backgroundColor: '#0f172a',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 10,
    paddingBottom: 90,
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
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  retryBtn: {
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#059669',
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 10,
  },
  txIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txIconWrapGreen: {
    backgroundColor: '#ecfdf5',
  },
  txIconWrapRed: {
    backgroundColor: '#fee2e2',
  },
  txTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  txSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '900',
  },
  txAmountGreen: {
    color: '#059669',
  },
  txAmountRed: {
    color: '#dc2626',
  },
  txTime: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  addExpenseFab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#dc2626',
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  addExpenseFabText: {
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
    maxHeight: '85%',
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
  modalBody: {
    paddingTop: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
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
  },
  chipRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 4,
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    marginRight: 6,
  },
  categoryChipActive: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  categoryChipTextActive: {
    color: '#dc2626',
  },
  paymentModeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  paymentModeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
  },
  paymentModeBtnActive: {
    backgroundColor: '#fee2e2',
    borderColor: '#dc2626',
  },
  paymentModeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  paymentModeTextActive: {
    color: '#dc2626',
  },
  modalSubmitBtn: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  modalSubmitText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
});

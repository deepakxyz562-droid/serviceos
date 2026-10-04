import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Linking,
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

interface UnpaidOrder {
  id: string;
  number: string;
  total: number;
  date: string;
}

interface CustomerUdhaar {
  phone: string;
  name: string;
  balance: number;
  oldestPendingDate: string;
  daysPending: number;
  unpaidOrdersCount: number;
  unpaidOrders: UnpaidOrder[];
  whatsappReminderText: string;
  whatsappReminderUrl: string;
}

interface KhataResponse {
  summary: {
    totalAapkoMilega: number;
    customersWithDuesCount: number;
    totalAapkoDenaHai: number;
  };
  customers: CustomerUdhaar[];
}

export default function KhataScreen() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerUdhaar[]>([]);
  const [summary, setSummary] = useState({
    totalAapkoMilega: 0,
    customersWithDuesCount: 0,
    totalAapkoDenaHai: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [paymentModalCustomer, setPaymentModalCustomer] = useState<CustomerUdhaar | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI'>('CASH');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const [udhaarModalOpen, setUdhaarModalOpen] = useState(false);
  const [udhaarName, setUdhaarName] = useState('');
  const [udhaarPhone, setUdhaarPhone] = useState('');
  const [udhaarAmount, setUdhaarAmount] = useState('');
  const [udhaarNote, setUdhaarNote] = useState('');
  const [submittingUdhaar, setSubmittingUdhaar] = useState(false);

  const fetchKhata = useCallback(async () => {
    try {
      const url = `${API_PATHS.commerceKhata}${
        searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : ''
      }`;
      const data = await apiRequest<KhataResponse>(url);
      setCustomers(data.customers || []);
      if (data.summary) setSummary(data.summary);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Unable to load Khata records.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchKhata();
  }, [fetchKhata]);

  const onRefresh = async () => {
    setRefreshing(true);
    await hapticFeedback.light();
    await fetchKhata();
  };

  const handleSendReminder = (customer: CustomerUdhaar) => {
    hapticFeedback.light();
    if (customer.whatsappReminderUrl) {
      Linking.openURL(customer.whatsappReminderUrl);
    } else {
      const clean = customer.phone.replace(/\D/g, '');
      const text = `Hi ${customer.name}, friendly reminder regarding your pending balance of ₹${customer.balance.toFixed(2)}. Please pay via UPI at your earliest. Thank you!`;
      Linking.openURL(`https://wa.me/${clean}?text=${encodeURIComponent(text)}`);
    }
  };

  const handleCall = (phone: string) => {
    hapticFeedback.light();
    Linking.openURL(`tel:${phone}`);
  };

  const handleRecordPayment = async () => {
    if (!paymentModalCustomer || !paymentAmount.trim()) return;
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid amount.');
      return;
    }

    setSubmittingPayment(true);
    await hapticFeedback.success();
    try {
      await apiRequest(API_PATHS.commerceKhata, {
        method: 'POST',
        body: {
          customerPhone: paymentModalCustomer.phone,
          customerName: paymentModalCustomer.name,
          type: 'GOT_PAYMENT',
          amount: amt,
          paymentMethod,
        },
      });

      setPaymentModalCustomer(null);
      setPaymentAmount('');
      Alert.alert('Payment Recorded ✓', `₹${amt.toFixed(2)} credited to ${paymentModalCustomer.name}'s balance.`);
      fetchKhata();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not record payment.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleGiveUdhaar = async () => {
    if (!udhaarPhone.trim() || !udhaarAmount.trim()) {
      Alert.alert('Missing details', 'Please enter phone number and amount.');
      return;
    }
    const amt = parseFloat(udhaarAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid amount.');
      return;
    }

    setSubmittingUdhaar(true);
    await hapticFeedback.medium();
    try {
      await apiRequest(API_PATHS.commerceKhata, {
        method: 'POST',
        body: {
          customerPhone: udhaarPhone.trim(),
          customerName: udhaarName.trim() || 'Customer',
          type: 'GAVE_UDHAAR',
          amount: amt,
          note: udhaarNote.trim(),
        },
      });

      setUdhaarModalOpen(false);
      setUdhaarName('');
      setUdhaarPhone('');
      setUdhaarAmount('');
      setUdhaarNote('');
      Alert.alert('Udhaar Recorded', `₹${amt.toFixed(2)} added to ${udhaarName || udhaarPhone}.`);
      fetchKhata();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not record Udhaar.');
    } finally {
      setSubmittingUdhaar(false);
    }
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
              <Text style={styles.title}>Customer Khata</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Udhaar Book</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>Track dues & send WhatsApp payment links</Text>
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

      {/* Main KPI Bar: Aapko Milega */}
      <View style={styles.kpiContainer}>
        <View style={styles.kpiCardMilega}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={styles.kpiIconWrapGreen}>
              <MaterialIcons name="call-received" size={16} color="#059669" />
            </View>
            <Text style={styles.kpiLabelGreen}>Aapko Milega (To Collect)</Text>
          </View>
          <Text style={styles.kpiValueGreen}>₹{summary.totalAapkoMilega.toFixed(2)}</Text>
          <Text style={styles.kpiSubGreen}>{summary.customersWithDuesCount} customers have pending balance</Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchBox}>
        <MaterialIcons name="search" size={18} color="#94a3b8" />
        <TextInput
          placeholder="Search customer by name or phone..."
          placeholderTextColor="#94a3b8"
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <MaterialIcons name="close" size={16} color="#94a3b8" />
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Loading Khata records...</Text>
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
          ) : customers.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="check-circle-outline" size={52} color="#10b981" />
              <Text style={styles.emptyTitle}>All Clear! No Pending Udhaar</Text>
              <Text style={styles.emptySub}>
                Every customer has cleared their bills. New credit or unpaid orders will appear here automatically.
              </Text>
            </View>
          ) : (
            customers.map((c) => {
              const avatarLetter = (c.name || 'C').charAt(0).toUpperCase();

              return (
                <View key={c.phone} style={styles.khataCard}>
                  {/* Card Header */}
                  <View style={styles.cardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{avatarLetter}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.customerName} numberOfLines={1}>
                          {c.name}
                        </Text>
                        <Text style={styles.customerPhone}>+91 {c.phone}</Text>
                      </View>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.balanceText}>₹{c.balance.toFixed(2)}</Text>
                      <Text style={styles.daysOverdueText}>
                        {c.daysPending === 0
                          ? 'Today'
                          : `${c.daysPending}d pending`}
                      </Text>
                    </View>
                  </View>

                  {/* Orders pill */}
                  <View style={styles.ordersPillRow}>
                    <Text style={styles.ordersPillText}>
                      {c.unpaidOrdersCount} pending {c.unpaidOrdersCount === 1 ? 'order' : 'orders'}:{' '}
                      {c.unpaidOrders.map((o) => `#${o.number}`).join(', ')}
                    </Text>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      onPress={() => handleSendReminder(c)}
                      style={styles.reminderBtn}
                      activeOpacity={0.8}
                    >
                      <MaterialIcons name="send" size={14} color="#059669" />
                      <Text style={styles.reminderBtnText}>Send WhatsApp Reminder</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        setPaymentModalCustomer(c);
                        setPaymentAmount(c.balance.toString());
                      }}
                      style={styles.receiveBtn}
                      activeOpacity={0.8}
                    >
                      <MaterialIcons name="add" size={14} color="#ffffff" />
                      <Text style={styles.receiveBtnText}>Got Payment</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleCall(c.phone)}
                      style={styles.callIconBtn}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons name="phone" size={16} color="#0f172a" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Floating Bottom Button: Give Udhaar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          onPress={() => setUdhaarModalOpen(true)}
          style={styles.giveUdhaarFab}
          activeOpacity={0.85}
        >
          <MaterialIcons name="receipt-long" size={18} color="#ffffff" />
          <Text style={styles.giveUdhaarFabText}>+ Record New Udhaar Sale</Text>
        </TouchableOpacity>
      </View>

      {/* Record Payment Received Modal */}
      <Modal
        visible={!!paymentModalCustomer}
        transparent
        animationType="fade"
        onRequestClose={() => setPaymentModalCustomer(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Payment Received</Text>
              <TouchableOpacity onPress={() => setPaymentModalCustomer(null)}>
                <MaterialIcons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {paymentModalCustomer && (
              <View style={styles.modalBody}>
                <Text style={styles.modalCustomerName}>{paymentModalCustomer.name}</Text>
                <Text style={styles.modalCustomerSub}>
                  Total Pending: ₹{paymentModalCustomer.balance.toFixed(2)}
                </Text>

                <View style={{ marginTop: 14 }}>
                  <Text style={styles.inputLabel}>Amount Received (₹):</Text>
                  <TextInput
                    keyboardType="numeric"
                    value={paymentAmount}
                    onChangeText={setPaymentAmount}
                    style={styles.modalInput}
                    placeholder="Enter amount"
                  />
                </View>

                {/* Payment Mode Selector */}
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.inputLabel}>Payment Mode:</Text>
                  <View style={styles.paymentModeRow}>
                    <TouchableOpacity
                      onPress={() => setPaymentMethod('CASH')}
                      style={[
                        styles.paymentModeBtn,
                        paymentMethod === 'CASH' && styles.paymentModeBtnActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.paymentModeText,
                          paymentMethod === 'CASH' && styles.paymentModeTextActive,
                        ]}
                      >
                        💵 Cash in Hand
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setPaymentMethod('UPI')}
                      style={[
                        styles.paymentModeBtn,
                        paymentMethod === 'UPI' && styles.paymentModeBtnActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.paymentModeText,
                          paymentMethod === 'UPI' && styles.paymentModeTextActive,
                        ]}
                      >
                        ⚡ Direct UPI
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleRecordPayment}
                  disabled={submittingPayment}
                  style={styles.modalSubmitBtn}
                  activeOpacity={0.8}
                >
                  {submittingPayment ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.modalSubmitText}>Confirm & Credit Balance</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Give Udhaar Modal */}
      <Modal
        visible={udhaarModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setUdhaarModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record New Udhaar (Credit)</Text>
              <TouchableOpacity onPress={() => setUdhaarModalOpen(false)}>
                <MaterialIcons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Customer Phone Number *</Text>
              <TextInput
                keyboardType="phone-pad"
                value={udhaarPhone}
                onChangeText={setUdhaarPhone}
                style={styles.modalInput}
                placeholder="10-digit mobile number"
              />

              <Text style={[styles.inputLabel, { marginTop: 10 }]}>Customer Name</Text>
              <TextInput
                value={udhaarName}
                onChangeText={setUdhaarName}
                style={styles.modalInput}
                placeholder="e.g. Ramesh Kumar"
              />

              <Text style={[styles.inputLabel, { marginTop: 10 }]}>Udhaar Amount (₹) *</Text>
              <TextInput
                keyboardType="numeric"
                value={udhaarAmount}
                onChangeText={setUdhaarAmount}
                style={styles.modalInput}
                placeholder="₹ 0.00"
              />

              <Text style={[styles.inputLabel, { marginTop: 10 }]}>Note / Item description</Text>
              <TextInput
                value={udhaarNote}
                onChangeText={setUdhaarNote}
                style={styles.modalInput}
                placeholder="e.g. 5kg Basmati Rice, 2 Tea packets"
              />

              <TouchableOpacity
                onPress={handleGiveUdhaar}
                disabled={submittingUdhaar}
                style={[styles.modalSubmitBtn, { backgroundColor: '#d97706', marginTop: 16 }]}
                activeOpacity={0.8}
              >
                {submittingUdhaar ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalSubmitText}>Save to Khata</Text>
                )}
              </TouchableOpacity>
            </View>
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
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#b45309',
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
  },
  kpiCardMilega: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
  },
  kpiIconWrapGreen: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiLabelGreen: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  kpiValueGreen: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 4,
  },
  kpiSubGreen: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#0f172a',
    padding: 0,
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 90,
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
  khataCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#b45309',
  },
  customerName: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
  customerPhone: {
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'monospace',
    marginTop: 1,
  },
  balanceText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#dc2626',
  },
  daysOverdueText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#b45309',
    marginTop: 1,
  },
  ordersPillRow: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  ordersPillText: {
    fontSize: 11,
    color: '#64748b',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  reminderBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 10,
    paddingVertical: 8,
  },
  reminderBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  receiveBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingVertical: 8,
  },
  receiveBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  callIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  giveUdhaarFab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0f172a',
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  giveUdhaarFabText: {
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
  modalCustomerName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0f172a',
  },
  modalCustomerSub: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '700',
    marginTop: 2,
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
    backgroundColor: '#ecfdf5',
    borderColor: '#059669',
  },
  paymentModeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  paymentModeTextActive: {
    color: '#059669',
  },
  modalSubmitBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  modalSubmitText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
});

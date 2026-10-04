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
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { hapticFeedback } from '@/lib/haptics';
import { apiRequest } from '@/lib/api';
import { API_PATHS } from '@/lib/constants';

interface ItemEntry {
  description: string;
  qty: number;
  unitPrice: number;
  hsnCode?: string;
}

interface InvoiceCustomer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
}

interface InvoiceRecord {
  id: string;
  number: string;
  status: string;
  total: number;
  subtotal: number;
  tax: number;
  discount: number;
  paidAmount: number;
  balance: number;
  dueDate?: string;
  createdAt: string;
  customer?: InvoiceCustomer;
  items: ItemEntry[];
  fromQuoteId?: string;
}

interface QuoteRecord {
  id: string;
  number: string;
  status: string;
  total: number;
  subtotal: number;
  tax: number;
  discount: number;
  expiresAt?: string;
  createdAt: string;
  customer?: InvoiceCustomer;
  items: ItemEntry[];
}

export default function BillingScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<'INVOICES' | 'QUOTES'>('INVOICES');
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
  const [invoiceOverview, setInvoiceOverview] = useState({ paid: 0, unpaid: 0, overdue: 0 });
  const [quoteOverview, setQuoteOverview] = useState({ accepted: 0, pending: 0, draft: 0 });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Form Modal (for both Invoice and Quote)
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formType, setFormType] = useState<'INVOICE' | 'QUOTE'>('INVOICE');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [items, setItems] = useState<ItemEntry[]>([
    { description: '', qty: 1, unitPrice: 0, hsnCode: '' },
  ]);
  const [taxRate, setTaxRate] = useState<number>(18);
  const [discountValue, setDiscountValue] = useState<string>('0');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchBillingData = useCallback(async () => {
    try {
      const [invRes, quoteRes] = await Promise.all([
        apiRequest<{ invoices: InvoiceRecord[]; overview: any }>(API_PATHS.commerceInvoices),
        apiRequest<{ quotes: QuoteRecord[]; overview: any }>(API_PATHS.commerceQuotes),
      ]);

      setInvoices(invRes.invoices || []);
      if (invRes.overview) setInvoiceOverview(invRes.overview);

      setQuotes(quoteRes.quotes || []);
      if (quoteRes.overview) setQuoteOverview(quoteRes.overview);

      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Unable to load billing data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await hapticFeedback.light();
    await fetchBillingData();
  };

  const handleOpenCreateModal = (type: 'INVOICE' | 'QUOTE') => {
    hapticFeedback.light();
    setFormType(type);
    setCustomerName('');
    setCustomerPhone('');
    setItems([{ description: '', qty: 1, unitPrice: 0, hsnCode: '' }]);
    setTaxRate(18);
    setDiscountValue('0');
    setNotes('');
    setFormModalOpen(true);
  };

  const addItemRow = () => {
    hapticFeedback.light();
    setItems([...items, { description: '', qty: 1, unitPrice: 0, hsnCode: '' }]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    hapticFeedback.light();
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof ItemEntry, val: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: val };
    setItems(updated);
  };

  // Compute live preview total in modal
  const formSubtotal = items.reduce(
    (sum, i) => sum + (Number(i.qty) || 0) * (Number(i.unitPrice) || 0),
    0
  );
  const discountAmt = parseFloat(discountValue) || 0;
  const taxable = Math.max(0, formSubtotal - discountAmt);
  const taxAmt = (taxable * taxRate) / 100;
  const formGrandTotal = taxable + taxAmt;

  const handleSubmitForm = async () => {
    if (!items.some((i) => i.description.trim() && i.unitPrice > 0)) {
      Alert.alert('Incomplete Items', 'Please add at least one item with description and price.');
      return;
    }

    setSubmitting(true);
    await hapticFeedback.success();
    try {
      const payload = {
        customerName: customerName.trim() || 'Client',
        customerPhone: customerPhone.trim(),
        taxRate,
        discountValue: discountAmt,
        discountType: 'AMOUNT',
        notes: notes.trim(),
        items: items
          .filter((i) => i.description.trim())
          .map((i) => ({
            description: i.description.trim(),
            qty: Number(i.qty) || 1,
            unitPrice: Number(i.unitPrice) || 0,
            hsnCode: i.hsnCode?.trim() || undefined,
          })),
      };

      if (formType === 'INVOICE') {
        await apiRequest(API_PATHS.commerceInvoices, {
          method: 'POST',
          body: {
            ...payload,
            status: 'UNPAID',
          },
        });
        Alert.alert('Invoice Created ✓', `Invoice generated successfully.`);
      } else {
        await apiRequest(API_PATHS.commerceQuotes, {
          method: 'POST',
          body: {
            ...payload,
            status: 'SENT',
          },
        });
        Alert.alert('Estimate Created ✓', `Estimate / Quotation generated successfully.`);
      }

      setFormModalOpen(false);
      fetchBillingData();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not save document.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvertToInvoice = async (quote: QuoteRecord) => {
    Alert.alert(
      'Convert to Invoice',
      `Convert Estimate ${quote.number} into an official GST Invoice?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Convert Now',
          onPress: async () => {
            await hapticFeedback.medium();
            try {
              await apiRequest(API_PATHS.commerceInvoices, {
                method: 'POST',
                body: {
                  customerId: quote.customer?.id,
                  fromQuoteId: quote.id,
                  taxRate: quote.tax ? (quote.tax / (quote.subtotal || 1)) * 100 : 0,
                  discountValue: quote.discount || 0,
                  items: quote.items.map((i) => ({
                    description: i.description,
                    qty: i.qty,
                    unitPrice: i.unitPrice,
                    hsnCode: i.hsnCode,
                  })),
                  status: 'UNPAID',
                },
              });

              // Update quote to accepted
              await apiRequest(`${API_PATHS.commerceQuotes}/${quote.id}`, {
                method: 'PATCH',
                body: { status: 'ACCEPTED' },
              });

              Alert.alert('Converted! ✓', 'Invoice created from this estimate.');
              setTab('INVOICES');
              fetchBillingData();
            } catch (err: any) {
              Alert.alert('Conversion Failed', err?.message || 'Could not convert to invoice.');
            }
          },
        },
      ]
    );
  };

  const handleShareWhatsApp = (item: InvoiceRecord | QuoteRecord, isInvoice: boolean) => {
    hapticFeedback.light();
    const docName = isInvoice ? 'GST Invoice' : 'Quotation Estimate';
    const clientName = item.customer?.name || 'Customer';
    const text = `Hello ${clientName},\n\nPlease find your ${docName} #${item.number} for the amount of ₹${item.total.toFixed(2)}.\n\nThank you for your business!`;
    const cleanPhone = item.customer?.phone?.replace(/\D/g, '') || '';
    if (cleanPhone) {
      Linking.openURL(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`);
    } else {
      Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`);
    }
  };

  const filteredInvoices = invoices.filter((i) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      i.number.toLowerCase().includes(q) ||
      i.customer?.name?.toLowerCase().includes(q) ||
      i.items.some((it) => it.description.toLowerCase().includes(q))
    );
  });

  const filteredQuotes = quotes.filter((q) => {
    if (!searchQuery) return true;
    const s = searchQuery.toLowerCase();
    return (
      q.number.toLowerCase().includes(s) ||
      q.customer?.name?.toLowerCase().includes(s) ||
      q.items.some((it) => it.description.toLowerCase().includes(s))
    );
  });

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
              <Text style={styles.title}>Billing & GST Invoices</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Tax Ready</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>Fast GST bills, quotes & WhatsApp PDF sharing</Text>
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

      {/* Mode Segmented Tab: GST Invoices vs Estimates */}
      <View style={styles.segmentedControl}>
        <TouchableOpacity
          onPress={() => {
            hapticFeedback.light();
            setTab('INVOICES');
          }}
          style={[styles.segmentBtn, tab === 'INVOICES' && styles.segmentBtnActive]}
        >
          <MaterialIcons
            name="receipt"
            size={16}
            color={tab === 'INVOICES' ? '#0f172a' : '#64748b'}
          />
          <Text
            style={[styles.segmentText, tab === 'INVOICES' && styles.segmentTextActive]}
          >
            GST Invoices ({invoices.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            hapticFeedback.light();
            setTab('QUOTES');
          }}
          style={[styles.segmentBtn, tab === 'QUOTES' && styles.segmentBtnActive]}
        >
          <MaterialIcons
            name="request-quote"
            size={16}
            color={tab === 'QUOTES' ? '#0f172a' : '#64748b'}
          />
          <Text
            style={[styles.segmentText, tab === 'QUOTES' && styles.segmentTextActive]}
          >
            Estimates / Quotes ({quotes.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Summary KPI Strip */}
      <View style={styles.kpiContainer}>
        {tab === 'INVOICES' ? (
          <View style={styles.kpiRow}>
            <View style={styles.kpiCardGreen}>
              <Text style={styles.kpiLabelGreen}>Collected (Paid)</Text>
              <Text style={styles.kpiValueGreen}>₹{invoiceOverview.paid.toFixed(2)}</Text>
            </View>
            <View style={styles.kpiCardAmber}>
              <Text style={styles.kpiLabelAmber}>Pending Balance</Text>
              <Text style={styles.kpiValueAmber}>₹{invoiceOverview.unpaid.toFixed(2)}</Text>
            </View>
            <View style={styles.kpiCardRed}>
              <Text style={styles.kpiLabelRed}>Overdue Bills</Text>
              <Text style={styles.kpiValueRed}>₹{invoiceOverview.overdue.toFixed(2)}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.kpiRow}>
            <View style={styles.kpiCardGreen}>
              <Text style={styles.kpiLabelGreen}>Accepted Quotes</Text>
              <Text style={styles.kpiValueGreen}>₹{quoteOverview.accepted.toFixed(2)}</Text>
            </View>
            <View style={styles.kpiCardAmber}>
              <Text style={styles.kpiLabelAmber}>Pending Approval</Text>
              <Text style={styles.kpiValueAmber}>₹{quoteOverview.pending.toFixed(2)}</Text>
            </View>
            <View style={styles.kpiCardBlue}>
              <Text style={styles.kpiLabelBlue}>Draft Quotes</Text>
              <Text style={styles.kpiValueBlue}>₹{quoteOverview.draft.toFixed(2)}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Search Input */}
      <View style={styles.searchBox}>
        <MaterialIcons name="search" size={18} color="#94a3b8" />
        <TextInput
          placeholder="Search by invoice #, client name, or item..."
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

      {/* Content List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Loading billing records...</Text>
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
          ) : tab === 'INVOICES' ? (
            filteredInvoices.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="receipt" size={48} color="#94a3b8" />
                <Text style={styles.emptyTitle}>No GST Invoices Yet</Text>
                <Text style={styles.emptySub}>
                  Create your first professional invoice with 1 tap. GST tax rates and totals compute automatically.
                </Text>
              </View>
            ) : (
              filteredInvoices.map((inv) => {
                const isPaid = inv.balance <= 0 || inv.status === 'PAID';

                return (
                  <View key={inv.id} style={styles.docCard}>
                    <View style={styles.docHeader}>
                      <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.docNumber}>{inv.number}</Text>
                          <View
                            style={[
                              styles.statusBadge,
                              isPaid ? styles.statusBadgePaid : styles.statusBadgeUnpaid,
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusBadgeText,
                                isPaid ? styles.statusBadgeTextPaid : styles.statusBadgeTextUnpaid,
                              ]}
                            >
                              {isPaid ? 'PAID ✓' : 'UNPAID'}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.docCustomer}>
                          {inv.customer?.name || 'Walk-in Client'}
                        </Text>
                      </View>

                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.docTotal}>₹{inv.total.toFixed(2)}</Text>
                        <Text style={styles.docDate}>
                          {new Date(inv.createdAt).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>

                    {/* Items snippet */}
                    <View style={styles.itemsSummary}>
                      <Text style={styles.itemsSummaryText} numberOfLines={1}>
                        {inv.items.map((i) => `${i.description} × ${i.qty}`).join(' • ')}
                      </Text>
                    </View>

                    {/* Actions */}
                    <View style={styles.docActionRow}>
                      <TouchableOpacity
                        onPress={() => handleShareWhatsApp(inv, true)}
                        style={styles.shareWaBtn}
                        activeOpacity={0.8}
                      >
                        <MaterialIcons name="send" size={14} color="#059669" />
                        <Text style={styles.shareWaBtnText}>Share on WhatsApp</Text>
                      </TouchableOpacity>

                      {inv.fromQuoteId && (
                        <View style={styles.fromQuoteBadge}>
                          <Text style={styles.fromQuoteBadgeText}>Converted from Quote</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })
            )
          ) : filteredQuotes.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="request-quote" size={48} color="#94a3b8" />
              <Text style={styles.emptyTitle}>No Quotations / Estimates</Text>
              <Text style={styles.emptySub}>
                Send price estimates to clients on WhatsApp. Convert them into GST invoices in 1 click once approved.
              </Text>
            </View>
          ) : (
            filteredQuotes.map((q) => {
              const isAccepted = q.status === 'ACCEPTED';

              return (
                <View key={q.id} style={styles.docCard}>
                  <View style={styles.docHeader}>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.docNumber}>{q.number}</Text>
                        <View
                          style={[
                            styles.statusBadge,
                            isAccepted ? styles.statusBadgePaid : styles.statusBadgeDraft,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              isAccepted ? styles.statusBadgeTextPaid : styles.statusBadgeTextDraft,
                            ]}
                          >
                            {q.status}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.docCustomer}>
                        {q.customer?.name || 'Potential Client'}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.docTotal}>₹{q.total.toFixed(2)}</Text>
                      <Text style={styles.docDate}>
                        {new Date(q.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.itemsSummary}>
                    <Text style={styles.itemsSummaryText} numberOfLines={1}>
                      {q.items.map((i) => `${i.description} × ${i.qty}`).join(' • ')}
                    </Text>
                  </View>

                  {/* Actions */}
                  <View style={styles.docActionRow}>
                    <TouchableOpacity
                      onPress={() => handleShareWhatsApp(q, false)}
                      style={styles.shareWaBtn}
                      activeOpacity={0.8}
                    >
                      <MaterialIcons name="send" size={14} color="#059669" />
                      <Text style={styles.shareWaBtnText}>WhatsApp Estimate</Text>
                    </TouchableOpacity>

                    {!isAccepted && (
                      <TouchableOpacity
                        onPress={() => handleConvertToInvoice(q)}
                        style={styles.convertBtn}
                        activeOpacity={0.8}
                      >
                        <MaterialIcons name="transform" size={14} color="#ffffff" />
                        <Text style={styles.convertBtnText}>Convert to Invoice</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Floating Action Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          onPress={() => handleOpenCreateModal(tab === 'INVOICES' ? 'INVOICE' : 'QUOTE')}
          style={styles.createFab}
          activeOpacity={0.85}
        >
          <MaterialIcons name="add" size={20} color="#ffffff" />
          <Text style={styles.createFabText}>
            {tab === 'INVOICES' ? '+ Create GST Invoice' : '+ Create New Estimate'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Create Modal */}
      <Modal
        visible={formModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setFormModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {formType === 'INVOICE' ? 'Create New GST Invoice' : 'Create Quotation / Estimate'}
              </Text>
              <TouchableOpacity onPress={() => setFormModalOpen(false)}>
                <MaterialIcons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Customer info */}
              <Text style={styles.inputLabel}>Customer / Client Name</Text>
              <TextInput
                value={customerName}
                onChangeText={setCustomerName}
                style={styles.modalInput}
                placeholder="e.g. Rahul Sharma"
              />

              <Text style={[styles.inputLabel, { marginTop: 10 }]}>Customer WhatsApp / Mobile</Text>
              <TextInput
                keyboardType="phone-pad"
                value={customerPhone}
                onChangeText={setCustomerPhone}
                style={styles.modalInput}
                placeholder="10-digit mobile number"
              />

              {/* Items List */}
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderTitle}>Line Items</Text>
                <TouchableOpacity onPress={addItemRow} style={styles.addMiniRowBtn}>
                  <MaterialIcons name="add" size={14} color="#059669" />
                  <Text style={styles.addMiniRowText}>Add Item</Text>
                </TouchableOpacity>
              </View>

              {items.map((it, idx) => (
                <View key={idx} style={styles.itemRowCard}>
                  <View style={{ flexDirection: 'row', gap: 6, flex: 1 }}>
                    <TextInput
                      value={it.description}
                      onChangeText={(val) => updateItem(idx, 'description', val)}
                      placeholder="Item description / Service"
                      placeholderTextColor="#94a3b8"
                      style={[styles.modalInput, { flex: 2 }]}
                    />
                    <TextInput
                      keyboardType="numeric"
                      value={it.qty.toString()}
                      onChangeText={(val) => updateItem(idx, 'qty', parseFloat(val) || 1)}
                      placeholder="Qty"
                      style={[styles.modalInput, { width: 50, textAlign: 'center' }]}
                    />
                    <TextInput
                      keyboardType="numeric"
                      value={it.unitPrice ? it.unitPrice.toString() : ''}
                      onChangeText={(val) => updateItem(idx, 'unitPrice', parseFloat(val) || 0)}
                      placeholder="₹ Rate"
                      style={[styles.modalInput, { width: 80, textAlign: 'right' }]}
                    />
                  </View>
                  {items.length > 1 && (
                    <TouchableOpacity
                      onPress={() => removeItemRow(idx)}
                      style={{ padding: 4 }}
                    >
                      <MaterialIcons name="delete-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {/* Tax Rate & Discount */}
              <Text style={[styles.inputLabel, { marginTop: 12 }]}>GST Tax Rate (%)</Text>
              <View style={styles.taxRateRow}>
                {[0, 5, 12, 18, 28].map((rate) => (
                  <TouchableOpacity
                    key={rate}
                    onPress={() => setTaxRate(rate)}
                    style={[
                      styles.taxBtn,
                      taxRate === rate && styles.taxBtnActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.taxBtnText,
                        taxRate === rate && styles.taxBtnTextActive,
                      ]}
                    >
                      {rate}%
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { marginTop: 10 }]}>Discount (₹)</Text>
              <TextInput
                keyboardType="numeric"
                value={discountValue}
                onChangeText={setDiscountValue}
                style={styles.modalInput}
                placeholder="₹ 0.00"
              />

              {/* Live Computed Summary */}
              <View style={styles.liveCalculationBox}>
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>Subtotal</Text>
                  <Text style={styles.calcVal}>₹{formSubtotal.toFixed(2)}</Text>
                </View>
                {discountAmt > 0 && (
                  <View style={styles.calcRow}>
                    <Text style={styles.calcLabel}>Discount</Text>
                    <Text style={[styles.calcVal, { color: '#059669' }]}>
                      -₹{discountAmt.toFixed(2)}
                    </Text>
                  </View>
                )}
                {taxRate > 0 && (
                  <View style={styles.calcRow}>
                    <Text style={styles.calcLabel}>GST ({taxRate}%)</Text>
                    <Text style={styles.calcVal}>+₹{taxAmt.toFixed(2)}</Text>
                  </View>
                )}
                <View style={[styles.calcRow, styles.calcRowTotal]}>
                  <Text style={styles.calcTotalLabel}>Grand Total</Text>
                  <Text style={styles.calcTotalVal}>₹{formGrandTotal.toFixed(2)}</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleSubmitForm}
                disabled={submitting}
                style={styles.modalSubmitBtn}
                activeOpacity={0.8}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalSubmitText}>
                    {formType === 'INVOICE' ? 'Generate GST Invoice' : 'Save & Share Quotation'}
                  </Text>
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
  segmentedControl: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
  },
  segmentBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  segmentTextActive: {
    color: '#0f172a',
    fontWeight: '800',
  },
  kpiContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
  },
  kpiCardGreen: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#dcfce7',
    borderLeftWidth: 3,
    borderLeftColor: '#10b981',
  },
  kpiLabelGreen: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803d',
    textTransform: 'uppercase',
  },
  kpiValueGreen: {
    fontSize: 14,
    fontWeight: '900',
    color: '#15803d',
    marginTop: 2,
  },
  kpiCardAmber: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#fef3c7',
    borderLeftWidth: 3,
    borderLeftColor: '#f59e0b',
  },
  kpiLabelAmber: {
    fontSize: 9,
    fontWeight: '800',
    color: '#b45309',
    textTransform: 'uppercase',
  },
  kpiValueAmber: {
    fontSize: 14,
    fontWeight: '900',
    color: '#b45309',
    marginTop: 2,
  },
  kpiCardRed: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#fee2e2',
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
  },
  kpiLabelRed: {
    fontSize: 9,
    fontWeight: '800',
    color: '#b91c1c',
    textTransform: 'uppercase',
  },
  kpiValueRed: {
    fontSize: 14,
    fontWeight: '900',
    color: '#b91c1c',
    marginTop: 2,
  },
  kpiCardBlue: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e0f2fe',
    borderLeftWidth: 3,
    borderLeftColor: '#0284c7',
  },
  kpiLabelBlue: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0369a1',
    textTransform: 'uppercase',
  },
  kpiValueBlue: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0369a1',
    marginTop: 2,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 10,
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
    gap: 10,
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
  docCard: {
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
    gap: 8,
  },
  docHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  docNumber: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
    fontFamily: 'monospace',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 5,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  statusBadgePaid: {
    backgroundColor: '#dcfce7',
  },
  statusBadgeTextPaid: {
    color: '#15803d',
    fontSize: 9,
    fontWeight: '800',
  },
  statusBadgeUnpaid: {
    backgroundColor: '#fee2e2',
  },
  statusBadgeTextUnpaid: {
    color: '#b91c1c',
    fontSize: 9,
    fontWeight: '800',
  },
  statusBadgeDraft: {
    backgroundColor: '#f1f5f9',
  },
  statusBadgeTextDraft: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '800',
  },
  docCustomer: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
    marginTop: 2,
  },
  docTotal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  docDate: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  itemsSummary: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  itemsSummaryText: {
    fontSize: 11,
    color: '#64748b',
  },
  docActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  shareWaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 10,
    paddingVertical: 8,
  },
  shareWaBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  convertBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingVertical: 8,
  },
  convertBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  fromQuoteBadge: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  fromQuoteBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0284c7',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  createFab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  createFabText: {
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
    paddingVertical: 9,
    fontSize: 12,
    color: '#0f172a',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 6,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  addMiniRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  addMiniRowText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  itemRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  taxRateRow: {
    flexDirection: 'row',
    gap: 6,
  },
  taxBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
  },
  taxBtnActive: {
    backgroundColor: '#ecfdf5',
    borderColor: '#059669',
  },
  taxBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  taxBtnTextActive: {
    color: '#059669',
  },
  liveCalculationBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    gap: 6,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calcLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  calcVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
  },
  calcRowTotal: {
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    marginTop: 2,
  },
  calcTotalLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
  },
  calcTotalVal: {
    fontSize: 15,
    fontWeight: '900',
    color: '#059669',
  },
  modalSubmitBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  modalSubmitText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
});

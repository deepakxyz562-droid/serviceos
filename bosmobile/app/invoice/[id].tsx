import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Share,
  RefreshControl,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { apiRequest } from '@/lib/api';
import { API_PATHS } from '@/lib/constants';
import { hapticFeedback } from '@/lib/haptics';
import { storageGetItem } from '@/lib/storage';
import { generateGstInvoiceHtml, resolveAbsoluteLogoUrl, type GstStoreInfo } from '@/lib/gst-invoice-helper';
import { formatInr, formatDateShort, buildInvoiceUrl, extractGstStateCode } from '@/lib/money';
import { KpiRow } from '@/components/money/kpi-tile';
import { PaymentSheet } from '@/components/money/payment-sheet';

interface PaymentRow {
  id: string;
  amount: number;
  method: string;
  reference: string | null;
  notes: string | null;
  paidAt: string;
}

interface InvoiceDetail {
  id: string;
  number: string;
  status: string;
  createdAt: string;
  dueDate?: string | null;
  notes?: string | null;
  taxRate?: number;
  placeOfSupply?: string | null;
  customer?: { id: string; name: string; phone?: string | null; email?: string | null; address?: string | null; gstin?: string | null };
  items: { id: string; description: string; qty: number; unitPrice: number; hsnCode?: string | null; gstRate?: number | null }[];
  payments?: PaymentRow[];
  total: number;
  subtotal: number;
  discount?: number;
  tax: number;
  paidAmount: number;
  balance: number;
}

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  DRAFT: { bg: '#f1f5f9', fg: '#475569' },
  SENT: { bg: '#e0f2fe', fg: '#0369a1' },
  PARTIALLY_PAID: { bg: '#fef3c7', fg: '#b45309' },
  PAID: { bg: '#dcfce7', fg: '#15803d' },
  OVERDUE: { bg: '#fee2e2', fg: '#b91c1c' },
  UNPAID: { bg: '#ffedd5', fg: '#c2410c' },
};

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [summary, setSummary] = useState<{ total: number; paid: number; balance: number; status: string } | null>(null);
  const [storeInfo, setStoreInfo] = useState<GstStoreInfo>({ businessName: 'Business Store' });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payOpen, setPayOpen] = useState(false);

  const load = useCallback(
    async (showSpinner = true) => {
      if (!id) return;
      if (showSpinner) setLoading(true);
      setError(null);
      try {
        const [detail, pay] = await Promise.all([
          apiRequest<{ invoice: InvoiceDetail }>(`/api/commerce/invoices/${id}`),
          apiRequest<{ payments: PaymentRow[]; summary: { total: number; paid: number; balance: number; status: string } }>(
            `/api/commerce/invoices/${id}/payments`
          ).catch(() => null),
        ]);
        setInvoice(detail.invoice);
        if (pay) {
          setPayments(pay.payments);
          setSummary(pay.summary);
        } else {
          const paid = Number(detail.invoice.paidAmount) || 0;
          setPayments(detail.invoice.payments || []);
          setSummary({ total: detail.invoice.total, paid, balance: detail.invoice.balance, status: detail.invoice.status });
        }
      } catch (e: any) {
        setError(e?.message || 'Could not load this invoice.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id]
  );

  useFocusEffect(
    useCallback(() => {
      void load(true);
      // Immediately load cached branding for instant offline render
      void storageGetItem('bos_store_branding')
        .then((cached) => {
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              if (parsed && typeof parsed === 'object') {
                setStoreInfo((prev) => ({
                  ...prev,
                  ...parsed,
                  logoUrl: resolveAbsoluteLogoUrl(parsed.logoUrl) || prev.logoUrl,
                }));
              }
            } catch {}
          }
        })
        .catch(() => {});

      // Store branding from server
      apiRequest<{ config?: any; business?: any }>(API_PATHS.commerceConfig)
        .then((res) => {
          const c = res.config || {};
          const b = res.business || {};
          const serverLogo = b.logoUrl || c.logoUrl || '';
          const resolvedLogo = resolveAbsoluteLogoUrl(serverLogo);
          setStoreInfo((prev) => ({
            ...prev,
            businessName: b.name || c.storeName || c.businessName || prev.businessName,
            gstin: c.gstin || c.billing?.gstin || b.gstin || prev.gstin,
            phone: b.phone || c.phone || prev.phone,
            email: b.email || c.email || prev.email,
            address: b.address || c.address || prev.address,
            upiId: c.upiId || b.upiId || prev.upiId,
            logoUrl: resolvedLogo || prev.logoUrl,
            signatureUrl: b.signatureUrl || c.signatureUrl || prev.signatureUrl,
            billFooter: b.billFooter || c.billFooter || prev.billFooter,
          }));
        })
        .catch(() => {});
    }, [load])
  );

  const markSent = async () => {
    if (!invoice) return;
    await hapticFeedback.light();
    try {
      await apiRequest(`/api/commerce/invoices/${invoice.id}`, {
        method: 'PATCH',
        body: { status: 'SENT' },
      });
      await load(false);
      Alert.alert('Marked as Sent ✓', `Invoice #${invoice.number} is now in the SENT pipeline.`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not update invoice status.');
    }
  };

  const sharePdf = async () => {
    if (!invoice) return;
    try {
      await hapticFeedback.medium();
      const html = generateGstInvoiceHtml({ ...invoice, placeOfSupply: invoice.placeOfSupply || invoice.customer?.gstin }, storeInfo, '₹');
      const { uri } = await Print.printToFileAsync({ html });
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Tax Invoice ${invoice.number}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        await Share.share({ url: uri, title: `Tax Invoice ${invoice.number}` });
      }
    } catch (e: any) {
      Alert.alert('PDF Export Error', e?.message || 'Unable to export PDF.');
    }
  };

  const shareWhatsApp = async () => {
    if (!invoice) return;
    await hapticFeedback.light();
    const phone = (invoice.customer?.phone || '').replace(/\D/g, '');
    const url = buildInvoiceUrl(invoice.id);
    const message = `Tax Invoice #${invoice.number} from ${storeInfo.businessName}: ${formatInr(invoice.total)}${
      summary && summary.balance > 0 ? ` (Balance due ${formatInr(summary.balance)})` : ' (Paid)'
    }\n${url}`;
    if (phone.length >= 10) {
      try {
        await Linking.openURL(`https://wa.me/${phone.slice(-10)}?text=${encodeURIComponent(message)}`);
        return;
      } catch {
        // fall through to generic share
      }
    }
    await Share.share({ title: `Tax Invoice ${invoice.number}`, message });
  };

  const print = async () => {
    if (!invoice) return;
    try {
      await hapticFeedback.medium();
      const html = generateGstInvoiceHtml({ ...invoice, placeOfSupply: invoice.placeOfSupply || invoice.customer?.gstin }, storeInfo, '₹');
      await Print.printAsync({ html });
    } catch (e: any) {
      Alert.alert('Print Error', e?.message || 'Unable to print invoice.');
    }
  };

  const insets = useSafeAreaInsets();
  const status = summary?.status || invoice?.status || 'DRAFT';
  const chip = STATUS_COLORS[status] || STATUS_COLORS.DRAFT;
  const storeState = extractGstStateCode(storeInfo.gstin);
  const clientState = extractGstStateCode(invoice?.placeOfSupply || invoice?.customer?.gstin);
  const interstate = Boolean(clientState) && Boolean(storeState) && storeState !== clientState;

  return (
    <View style={styles.safe}>
      {/* Header with notch & status bar padding */}
      <View
        style={[
          styles.header,
          {
            paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 20 : 12),
          },
        ]}
      >
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Invoice #{invoice?.number || '…'}
          </Text>
          <Text style={styles.headerSub}>{invoice ? formatDateShort(invoice.createdAt) : ''}</Text>
        </View>
        {invoice ? (
          <View style={[styles.statusChip, { backgroundColor: chip.bg }]}>
            <Text style={[styles.statusChipText, { color: chip.fg }]}>{status.replace(/_/g, ' ')}</Text>
          </View>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#059669" />
        </View>
      ) : error || !invoice ? (
        <View style={styles.center}>
          <MaterialIcons name="error-outline" size={44} color="#f87171" />
          <Text style={styles.errorText}>{error || 'Invoice not found.'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => void load(true)}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: 24 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(false); }} colors={['#059669']} />}
          showsVerticalScrollIndicator={false}
        >
          {/* KPI strip — Vyapar Total / Received / Balance */}
          <KpiRow
            tiles={[
              { label: 'Total', value: formatInr(summary?.total ?? invoice.total) },
              { label: 'Received', value: formatInr(summary?.paid ?? invoice.paidAmount), tone: 'positive' },
              {
                label: 'Balance',
                value: formatInr(summary?.balance ?? invoice.balance),
                tone: (summary?.balance ?? invoice.balance) > 0 ? 'warning' : 'positive',
              },
            ]}
          />

          {/* Party card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Billed To</Text>
            <Text style={styles.partyName}>{invoice.customer?.name || 'Walk-in Client'}</Text>
            {invoice.customer?.phone ? <Text style={styles.line}>Phone: {invoice.customer.phone}</Text> : null}
            {invoice.customer?.address ? <Text style={styles.line}>Address: {invoice.customer.address}</Text> : null}
            {invoice.customer?.gstin ? <Text style={styles.line}>GSTIN: {invoice.customer.gstin}</Text> : null}
            {invoice.dueDate ? <Text style={styles.line}>Due: {formatDateShort(invoice.dueDate)}</Text> : null}
            <Text style={styles.line}>Supply: {interstate ? 'Inter-State (IGST)' : 'Intra-State (CGST + SGST)'}</Text>
          </View>

          {/* Line items */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Items ({invoice.items.length})</Text>
            {invoice.items.map((item) => {
              const lineRate = Number(item.gstRate ?? invoice.taxRate ?? 0);
              const lineTotal = (Number(item.qty) || 0) * (Number(item.unitPrice) || 0) * (1 + lineRate / 100);
              return (
                <View key={item.id} style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName} numberOfLines={2}>
                      {item.description}
                    </Text>
                    <Text style={styles.itemSub}>
                      {item.qty} × {formatInr(item.unitPrice)}
                      {item.hsnCode ? ` · HSN ${item.hsnCode}` : ''} · GST {lineRate}%
                    </Text>
                  </View>
                  <Text style={styles.itemAmount}>{formatInr(lineTotal)}</Text>
                </View>
              );
            })}
            <View style={styles.totalsBox}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Taxable</Text>
                <Text style={styles.totalValue}>{formatInr(invoice.subtotal ?? invoice.total - invoice.tax)}</Text>
              </View>
              {invoice.discount ? (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Discount</Text>
                  <Text style={[styles.totalValue, { color: '#059669' }]}>-{formatInr(invoice.discount)}</Text>
                </View>
              ) : null}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>{interstate ? 'IGST' : 'CGST + SGST'}</Text>
                <Text style={styles.totalValue}>{formatInr(invoice.tax)}</Text>
              </View>
              <View style={[styles.totalRow, styles.grandRow]}>
                <Text style={styles.grandLabel}>Total</Text>
                <Text style={styles.grandValue}>{formatInr(invoice.total)}</Text>
              </View>
            </View>
            {invoice.notes ? <Text style={styles.notes}>Notes: {invoice.notes}</Text> : null}
          </View>

          {/* Payment history */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Payment History ({payments.length})</Text>
            {payments.length === 0 ? (
              <Text style={styles.emptyHistory}>No payments recorded yet.</Text>
            ) : (
              payments.map((p) => (
                <View key={p.id} style={styles.paymentRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.paymentMain}>
                      {formatInr(p.amount)} · {p.method.replace(/_/g, ' ')}
                    </Text>
                    <Text style={styles.paymentSub}>
                      {formatDateShort(p.paidAt)}
                      {p.reference ? ` · Ref ${p.reference}` : ''}
                      {p.notes ? ` · ${p.notes}` : ''}
                    </Text>
                  </View>
                  <MaterialIcons name="check-circle" size={18} color="#059669" />
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}

      {/* Docked Sticky Bottom Action Bar */}
      {invoice && !loading && (
        <View
          style={[
            styles.dockedBottomBar,
            {
              paddingBottom: Math.max(insets.bottom, 14),
            },
          ]}
        >
          {/* Primary Action: WhatsApp */}
          <TouchableOpacity
            accessibilityRole="button"
            style={styles.whatsAppPrimaryBtn}
            onPress={() => void shareWhatsApp()}
            activeOpacity={0.85}
          >
            <Ionicons name="logo-whatsapp" size={20} color="#ffffff" />
            <Text style={styles.whatsAppPrimaryText}>Share on WhatsApp</Text>
          </TouchableOpacity>

          {/* Secondary Actions Row */}
          <View style={styles.secondaryActionsRow}>
            {(summary?.balance ?? invoice.balance) > 0.01 ? (
              <TouchableOpacity
                accessibilityRole="button"
                style={[styles.secondaryActionBtn, styles.secondaryActionBtnPay]}
                onPress={async () => {
                  await hapticFeedback.light();
                  setPayOpen(true);
                }}
                activeOpacity={0.8}
              >
                <MaterialIcons name="currency-rupee" size={17} color="#059669" />
                <Text style={[styles.secondaryActionText, { color: '#059669', fontWeight: '800' }]}>
                  Record Pay
                </Text>
              </TouchableOpacity>
            ) : invoice.status === 'DRAFT' ? (
              <TouchableOpacity
                accessibilityRole="button"
                style={styles.secondaryActionBtn}
                onPress={() => void markSent()}
                activeOpacity={0.8}
              >
                <MaterialIcons name="send" size={17} color="#0369a1" />
                <Text style={styles.secondaryActionText}>Mark Sent</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              accessibilityRole="button"
              style={styles.secondaryActionBtn}
              onPress={() => void sharePdf()}
              activeOpacity={0.8}
            >
              <MaterialIcons name="picture-as-pdf" size={17} color="#dc2626" />
              <Text style={styles.secondaryActionText}>Export PDF</Text>
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              style={styles.secondaryActionBtn}
              onPress={() => void print()}
              activeOpacity={0.8}
            >
              <MaterialIcons name="print" size={17} color="#475569" />
              <Text style={styles.secondaryActionText}>Print</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <PaymentSheet
        visible={payOpen}
        onClose={() => setPayOpen(false)}
        invoice={
          invoice
            ? { id: invoice.id, number: invoice.number, balance: summary?.balance ?? invoice.balance, currencySymbol: '₹' }
            : null
        }
        onRecorded={(s) => {
          setSummary((prev) => (prev ? { ...prev, ...s } : { total: invoice?.total || 0, ...s }));
          void load(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -8 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
  headerSub: { fontSize: 12, color: '#64748b', marginTop: 1 },
  statusChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  statusChipText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  errorText: { color: '#b91c1c', textAlign: 'center' },
  retryBtn: { minHeight: 44, paddingHorizontal: 20, borderRadius: 12, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' },
  retryText: { color: '#ffffff', fontWeight: '700' },
  content: { padding: 16, gap: 14 },
  card: { backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', padding: 14, gap: 8 },
  cardTitle: { fontSize: 12, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  partyName: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  line: { fontSize: 13, color: '#475569' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  itemName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  itemSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  itemAmount: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  totalsBox: { marginTop: 6, gap: 4 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  totalLabel: { fontSize: 13, color: '#64748b' },
  totalValue: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  grandRow: { borderTopWidth: 1, borderTopColor: '#e2e8f0', marginTop: 4, paddingTop: 8 },
  grandLabel: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  grandValue: { fontSize: 15, fontWeight: '900', color: '#059669' },
  notes: { fontSize: 12, color: '#64748b', fontStyle: 'italic' },
  paymentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  paymentMain: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  paymentSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  emptyHistory: { fontSize: 13, color: '#94a3b8', paddingVertical: 8 },
  dockedBottomBar: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 8,
  },
  whatsAppPrimaryBtn: {
    backgroundColor: '#25D366',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  whatsAppPrimaryText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  secondaryActionBtnPay: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  secondaryActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
});

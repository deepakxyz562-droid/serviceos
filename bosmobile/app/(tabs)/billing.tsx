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
  Share,
  Platform,
  Image,
} from 'react-native';
import { Paths, File as ExpoFile } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons, Feather, Ionicons } from '@expo/vector-icons';
import { hapticFeedback } from '@/lib/haptics';
import { apiRequest } from '@/lib/api';
import { API_PATHS } from '@/lib/constants';
import {
  numberToWords,
  generateGstInvoiceHtml,
  GstStoreInfo,
} from '@/lib/gst-invoice-helper';

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
  address?: string;
  gstin?: string;
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
  notes?: string;
  paymentMethod?: string;
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

  // Vyapar-Grade Features State
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceRecord | null>(null);
  const [paymentModalInvoice, setPaymentModalInvoice] = useState<InvoiceRecord | null>(null);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string>('CASH');
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [storeInfo, setStoreInfo] = useState<GstStoreInfo>({
    businessName: 'My Store',
    logoUrl: '',
    signatureUrl: '',
    gstin: '',
    address: '',
    phone: '',
    email: '',
    upiId: '',
    billFooter: '1. Goods once sold will not be taken back.\n2. Interest @18% p.a. charged on overdue payments.',
  });

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
    // Load store config for GST branding
    (async () => {
      try {
        const res = await apiRequest<{ config?: any }>(API_PATHS.commerceConfig);
        if (res?.config) {
          const c = res.config;
          setStoreInfo((prev) => ({
            ...prev,
            businessName: c.storeName || c.businessName || prev.businessName,
            gstin: c.gstin || prev.gstin,
            phone: c.phone || prev.phone,
            email: c.email || prev.email,
            address: c.address || prev.address,
            upiId: c.upiId || prev.upiId,
            logoUrl: c.logoUrl || prev.logoUrl,
          }));
        }
      } catch (e) {
        // Fallback to default
      }
    })();
  }, [fetchBillingData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await hapticFeedback.light();
    await fetchBillingData();
  };

  const handleOpenCreateModal = (type: 'INVOICE' | 'QUOTE') => {
    hapticFeedback.light();
    setEditingInvoice(null);
    setFormType(type);
    setCustomerName('');
    setCustomerPhone('');
    setItems([{ description: '', qty: 1, unitPrice: 0, hsnCode: '' }]);
    setTaxRate(18);
    setDiscountValue('0');
    setNotes('');
    setFormModalOpen(true);
  };

  const handleOpenEditInvoice = (inv: InvoiceRecord) => {
    hapticFeedback.light();
    setEditingInvoice(inv);
    setFormType('INVOICE');
    setCustomerName(inv.customer?.name || '');
    setCustomerPhone(inv.customer?.phone || '');
    setItems(
      inv.items && inv.items.length > 0
        ? inv.items.map((i) => ({
            description: i.description,
            qty: Number(i.qty) || 1,
            unitPrice: Number(i.unitPrice) || 0,
            hsnCode: i.hsnCode || '',
          }))
        : [{ description: '', qty: 1, unitPrice: 0, hsnCode: '' }]
    );
    const sub = inv.subtotal || inv.total - (inv.tax || 0);
    const rate = sub > 0 && inv.tax ? Math.round((inv.tax / sub) * 100) : 18;
    setTaxRate(rate);
    setDiscountValue(String(inv.discount || 0));
    setNotes(inv.notes || '');
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
      const lineItems = items
        .filter((i) => i.description.trim())
        .map((i) => ({
          description: i.description.trim(),
          qty: Number(i.qty) || 1,
          unitPrice: Number(i.unitPrice) || 0,
          hsnCode: i.hsnCode?.trim() || undefined,
        }));

      if (editingInvoice) {
        // Edit existing invoice
        const res = await apiRequest<{ invoice: InvoiceRecord }>(
          `${API_PATHS.commerceInvoices}/${editingInvoice.id}`,
          {
            method: 'PATCH',
            body: {
              taxRate,
              discountValue: discountAmt,
              discountType: 'AMOUNT',
              notes: notes.trim(),
              items: lineItems,
            },
          }
        );
        Alert.alert('Invoice Updated ✓', `Invoice #${editingInvoice.number} has been updated.`);
        if (selectedInvoice?.id === editingInvoice.id && res?.invoice) {
          setSelectedInvoice(res.invoice);
        }
        setEditingInvoice(null);
      } else if (formType === 'INVOICE') {
        await apiRequest(API_PATHS.commerceInvoices, {
          method: 'POST',
          body: {
            customerName: customerName.trim() || 'Client',
            customerPhone: customerPhone.trim(),
            taxRate,
            discountValue: discountAmt,
            discountType: 'AMOUNT',
            notes: notes.trim(),
            items: lineItems,
            status: 'UNPAID',
          },
        });
        Alert.alert('Invoice Created ✓', `GST Tax Invoice generated successfully.`);
      } else {
        await apiRequest(API_PATHS.commerceQuotes, {
          method: 'POST',
          body: {
            customerName: customerName.trim() || 'Client',
            customerPhone: customerPhone.trim(),
            taxRate,
            discountValue: discountAmt,
            discountType: 'AMOUNT',
            notes: notes.trim(),
            items: lineItems,
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

  const handlePrintInvoice = async (inv: InvoiceRecord) => {
    try {
      await hapticFeedback.medium();
      const html = generateGstInvoiceHtml(inv, storeInfo, '₹');
      await Print.printAsync({ html });
    } catch (err: any) {
      Alert.alert('Print Error', err?.message || 'Unable to print invoice.');
    }
  };

  const handleSharePdfInvoice = async (inv: InvoiceRecord) => {
    try {
      await hapticFeedback.medium();
      const html = generateGstInvoiceHtml(inv, storeInfo, '₹');
      const { uri } = await Print.printToFileAsync({ html });
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Tax Invoice ${inv.number}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        await Share.share({
          url: uri,
          title: `Tax Invoice ${inv.number}`,
          message: `Tax Invoice #${inv.number} for ${inv.customer?.name || 'Customer'}: ₹${inv.total.toFixed(2)}`,
        });
      }
    } catch (err: any) {
      Alert.alert('PDF Export Error', err?.message || 'Unable to export PDF.');
    }
  };

  const handleTogglePaymentStatus = (inv: InvoiceRecord) => {
    const isPaid = inv.balance <= 0 || inv.status === 'PAID';
    if (isPaid) {
      Alert.alert(
        'Mark as Unpaid?',
        `Revert Invoice #${inv.number} status to UNPAID?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Mark Unpaid',
            style: 'destructive',
            onPress: async () => {
              try {
                await hapticFeedback.medium();
                await apiRequest(`${API_PATHS.commerceInvoices}/${inv.id}`, {
                  method: 'PATCH',
                  body: { status: 'UNPAID' },
                });
                Alert.alert('Status Updated', `Invoice #${inv.number} marked as UNPAID.`);
                if (selectedInvoice?.id === inv.id) {
                  setSelectedInvoice({
                    ...selectedInvoice,
                    status: 'UNPAID',
                    balance: selectedInvoice.total,
                    paidAmount: 0,
                  });
                }
                fetchBillingData();
              } catch (e: any) {
                Alert.alert('Error', e?.message || 'Could not update status.');
              }
            },
          },
        ]
      );
    } else {
      setPaymentModalInvoice(inv);
      setSelectedPaymentMode('CASH');
    }
  };

  const handleConfirmPayment = async () => {
    if (!paymentModalInvoice) return;
    try {
      setUpdatingPayment(true);
      await hapticFeedback.success();
      await apiRequest(`${API_PATHS.commerceInvoices}/${paymentModalInvoice.id}`, {
        method: 'PATCH',
        body: {
          status: 'PAID',
          paymentMethod: selectedPaymentMode,
        },
      });
      Alert.alert('Payment Recorded ✓', `Invoice #${paymentModalInvoice.number} marked as PAID via ${selectedPaymentMode}.`);
      if (selectedInvoice?.id === paymentModalInvoice.id) {
        setSelectedInvoice({
          ...selectedInvoice,
          status: 'PAID',
          balance: 0,
          paidAmount: selectedInvoice.total,
          paymentMethod: selectedPaymentMode,
        });
      }
      setPaymentModalInvoice(null);
      fetchBillingData();
    } catch (e: any) {
      Alert.alert('Payment Record Failed', e?.message || 'Could not record payment.');
    } finally {
      setUpdatingPayment(false);
    }
  };

  const handleDeleteInvoice = (inv: InvoiceRecord) => {
    Alert.alert(
      'Delete Invoice',
      `Are you sure you want to permanently delete Invoice #${inv.number}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await hapticFeedback.heavy();
              await apiRequest(`${API_PATHS.commerceInvoices}/${inv.id}`, {
                method: 'DELETE',
              });
              Alert.alert('Deleted ✓', `Invoice #${inv.number} was removed.`);
              if (selectedInvoice?.id === inv.id) {
                setSelectedInvoice(null);
              }
              fetchBillingData();
            } catch (err: any) {
              Alert.alert('Delete Failed', err?.message || 'Could not delete invoice.');
            }
          },
        },
      ]
    );
  };

  const handlePickLogo = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [2, 1],
        quality: 0.7,
        base64: true,
      });
      if (!res.canceled && res.assets && res.assets[0]) {
        const base64Uri = `data:image/jpeg;base64,${res.assets[0].base64}`;
        setStoreInfo((prev) => ({ ...prev, logoUrl: base64Uri }));
        Alert.alert('Logo Selected ✓', 'Store logo updated.');
      }
    } catch (e: any) {
      Alert.alert('Image Pick Error', e?.message || 'Could not pick logo.');
    }
  };

  const handlePickSignature = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [2, 1],
        quality: 0.7,
        base64: true,
      });
      if (!res.canceled && res.assets && res.assets[0]) {
        const base64Uri = `data:image/jpeg;base64,${res.assets[0].base64}`;
        setStoreInfo((prev) => ({ ...prev, signatureUrl: base64Uri }));
        Alert.alert('Signature Selected ✓', 'Authorized signature updated.');
      }
    } catch (e: any) {
      Alert.alert('Image Pick Error', e?.message || 'Could not pick signature.');
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

  const handleExportGstReport = async () => {
    if (invoices.length === 0) {
      Alert.alert('No Invoices', 'There are no GST invoices to export yet.');
      return;
    }
    await hapticFeedback.medium();

    const headers = [
      'Invoice Number',
      'Invoice Date',
      'Customer Name',
      'Customer Phone',
      'Status',
      'Taxable Value (₹)',
      'GST Rate (%)',
      'CGST (₹)',
      'SGST (₹)',
      'Total Tax (₹)',
      'Total Invoice Value (₹)',
      'Items Count',
    ];

    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalTax = 0;
    let totalAmount = 0;

    const rows = invoices.map((inv) => {
      const taxable = Number(inv.subtotal || inv.total - (inv.tax || 0)) || 0;
      const tax = Number(inv.tax || 0);
      const rate = taxable > 0 ? Math.round((tax / taxable) * 100) : 18;
      const cgst = tax / 2;
      const sgst = tax / 2;
      const total = Number(inv.total || 0);

      totalTaxable += taxable;
      totalCgst += cgst;
      totalSgst += sgst;
      totalTax += tax;
      totalAmount += total;

      return [
        `"${inv.number}"`,
        `"${new Date(inv.createdAt).toLocaleDateString('en-IN')}"`,
        `"${(inv.customer?.name || 'Walk-in Client').replace(/"/g, '""')}"`,
        `"${inv.customer?.phone || ''}"`,
        `"${inv.status}"`,
        taxable.toFixed(2),
        `"${rate}%"`,
        cgst.toFixed(2),
        sgst.toFixed(2),
        tax.toFixed(2),
        total.toFixed(2),
        inv.items?.length || 0,
      ].join(',');
    });

    const summaryRow = [
      '"TOTAL"',
      '""',
      '""',
      '""',
      '""',
      totalTaxable.toFixed(2),
      '""',
      totalCgst.toFixed(2),
      totalSgst.toFixed(2),
      totalTax.toFixed(2),
      totalAmount.toFixed(2),
      '""',
    ].join(',');

    const csvContent = [headers.join(','), ...rows, summaryRow].join('\n');

    if (Platform.OS === 'web') {
      try {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `GSTR1_Tax_Report_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        Alert.alert('Report Exported ✓', 'GSTR-1 tax report downloaded as CSV.');
      } catch (err: any) {
        Alert.alert('Export Error', err?.message || 'Failed to download CSV.');
      }
      return;
    }

    try {
      const filename = `GSTR1_Tax_Report_${Date.now()}.csv`;
      const file = new ExpoFile(Paths.cache, filename);
      file.create();
      file.write(csvContent);

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export GSTR-1 Tax Report',
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        await Share.share({
          message: csvContent,
          title: 'GSTR-1 Tax Report',
        });
      }
    } catch (err: any) {
      try {
        await Share.share({
          message: csvContent,
          title: 'GSTR-1 Tax Report',
        });
      } catch (shareErr: any) {
        Alert.alert('Export Error', err?.message || 'Could not export GST report.');
      }
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {router.canGoBack() && (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-back" size={20} color="#0f172a" />
            </TouchableOpacity>
          )}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.title}>Billing & Khata</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Tax Ready</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>GST bills, quotations & customer khata</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            onPress={() => setBrandModalOpen(true)}
            style={[styles.refreshBtn, { backgroundColor: '#f1f5f9' }]}
            activeOpacity={0.7}
            accessibilityLabel="Store Branding Settings"
          >
            <MaterialIcons name="storefront" size={18} color="#0f172a" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleExportGstReport}
            style={[styles.refreshBtn, { backgroundColor: '#e0e7ff' }]}
            activeOpacity={0.7}
            accessibilityLabel="Export GSTR-1 Tax Report"
          >
            <MaterialIcons name="download" size={18} color="#4338ca" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/khata' as any)}
            style={[styles.refreshBtn, { backgroundColor: '#fef3c7' }]}
            activeOpacity={0.7}
          >
            <MaterialIcons name="menu-book" size={18} color="#b45309" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/expenses' as any)}
            style={[styles.refreshBtn, { backgroundColor: '#ecfdf5' }]}
            activeOpacity={0.7}
          >
            <MaterialIcons name="account-balance-wallet" size={18} color="#059669" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onRefresh}
            style={styles.refreshBtn}
            activeOpacity={0.7}
          >
            <MaterialIcons name="refresh" size={18} color="#0f172a" />
          </TouchableOpacity>
        </View>
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

      {/* GSTR-1 Tax Summary & 1-Click Export Banner */}
      {tab === 'INVOICES' && (
        <View style={styles.taxSummaryBanner}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MaterialIcons name="fact-check" size={16} color="#4338ca" />
              <Text style={styles.taxBannerTitle}>GSTR-1 Tax Summary</Text>
              <View style={styles.taxCountBadge}>
                <Text style={styles.taxCountBadgeText}>{invoices.length} Bills</Text>
              </View>
            </View>
            <Text style={styles.taxBannerSub}>
              Tax Collected: ₹{invoices.reduce((s, i) => s + (Number(i.tax) || 0), 0).toFixed(2)} (CGST ₹{(invoices.reduce((s, i) => s + (Number(i.tax) || 0), 0) / 2).toFixed(2)} + SGST ₹{(invoices.reduce((s, i) => s + (Number(i.tax) || 0), 0) / 2).toFixed(2)})
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleExportGstReport}
            style={styles.exportCsvBtn}
            activeOpacity={0.8}
          >
            <MaterialIcons name="file-download" size={16} color="#ffffff" />
            <Text style={styles.exportCsvBtnText}>Export CSV</Text>
          </TouchableOpacity>
        </View>
      )}

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
                  <TouchableOpacity
                    key={inv.id}
                    style={styles.docCard}
                    activeOpacity={0.9}
                    onPress={() => setSelectedInvoice(inv)}
                  >
                    <View style={styles.docHeader}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.docNumber}>{inv.number}</Text>
                          <TouchableOpacity
                            onPress={() => handleTogglePaymentStatus(inv)}
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
                              {isPaid ? 'PAID ✓' : 'UNPAID • TAP TO PAY'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.docCustomer}>
                          {inv.customer?.name || 'Walk-in Client'}
                          {inv.customer?.gstin ? ` • GSTIN: ${inv.customer.gstin}` : ''}
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

                    {/* Vyapar Quick Action Toolbar */}
                    <View style={styles.invoiceActionBar}>
                      <TouchableOpacity
                        onPress={() => setSelectedInvoice(inv)}
                        style={styles.actionIconBtn}
                        accessibilityLabel="Preview Invoice"
                      >
                        <MaterialIcons name="visibility" size={15} color="#0f172a" />
                        <Text style={styles.actionIconText}>View</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleSharePdfInvoice(inv)}
                        style={styles.actionIconBtn}
                        accessibilityLabel="PDF Invoice"
                      >
                        <MaterialIcons name="picture-as-pdf" size={15} color="#dc2626" />
                        <Text style={styles.actionIconText}>PDF</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handlePrintInvoice(inv)}
                        style={styles.actionIconBtn}
                        accessibilityLabel="Print Invoice"
                      >
                        <MaterialIcons name="print" size={15} color="#4338ca" />
                        <Text style={styles.actionIconText}>Print</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleOpenEditInvoice(inv)}
                        style={styles.actionIconBtn}
                        accessibilityLabel="Edit Invoice"
                      >
                        <MaterialIcons name="edit" size={15} color="#d97706" />
                        <Text style={styles.actionIconText}>Edit</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleShareWhatsApp(inv, true)}
                        style={[styles.actionIconBtn, { backgroundColor: '#ecfdf5' }]}
                        accessibilityLabel="Share on WhatsApp"
                      >
                        <MaterialIcons name="send" size={15} color="#059669" />
                        <Text style={[styles.actionIconText, { color: '#059669' }]}>Share</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleDeleteInvoice(inv)}
                        style={styles.actionIconBtnDanger}
                        accessibilityLabel="Delete Invoice"
                      >
                        <MaterialIcons name="delete-outline" size={15} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
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

      {/* 1. Vyapar-Grade Full A4 GST Invoice Preview Modal */}
      <Modal
        visible={!!selectedInvoice}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setSelectedInvoice(null)}
      >
        {selectedInvoice && (() => {
          const inv = selectedInvoice;
          const isPaid = inv.balance <= 0 || inv.status === 'PAID';
          const taxable = Number(inv.subtotal || inv.total - (inv.tax || 0)) || 0;
          const tax = Number(inv.tax || 0);
          const cgst = tax / 2;
          const sgst = tax / 2;
          const discount = Number(inv.discount || 0);
          const total = Number(inv.total || 0);
          const effectiveRate = taxable > 0 ? Math.round((tax / taxable) * 100) : 18;
          const halfRate = (effectiveRate / 2).toFixed(1).replace('.0', '');
          const upiLink = storeInfo.upiId
            ? `upi://pay?pa=${encodeURIComponent(storeInfo.upiId)}&pn=${encodeURIComponent(
                storeInfo.businessName || 'Store'
              )}&am=${total.toFixed(2)}&tn=${encodeURIComponent(
                `Invoice ${inv.number}`
              )}&cu=INR`
            : '';
          const qrUrl = upiLink
            ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                upiLink
              )}`
            : '';

          return (
            <SafeAreaView style={styles.previewModalSafe}>
              {/* Modal Top Bar */}
              <View style={styles.previewTopBar}>
                <TouchableOpacity
                  onPress={() => setSelectedInvoice(null)}
                  style={styles.previewBackBtn}
                >
                  <MaterialIcons name="close" size={22} color="#0f172a" />
                </TouchableOpacity>

                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.previewBarTitle}>Tax Invoice #{inv.number}</Text>
                  <Text style={styles.previewBarSub}>Vyapar-grade GST format</Text>
                </View>

                {/* Quick actions in top bar */}
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    onPress={() => handleSharePdfInvoice(inv)}
                    style={styles.previewActionBtn}
                  >
                    <MaterialIcons name="picture-as-pdf" size={18} color="#dc2626" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handlePrintInvoice(inv)}
                    style={styles.previewActionBtn}
                  >
                    <MaterialIcons name="print" size={18} color="#4338ca" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedInvoice(null);
                      handleOpenEditInvoice(inv);
                    }}
                    style={styles.previewActionBtn}
                  >
                    <MaterialIcons name="edit" size={18} color="#d97706" />
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView
                style={styles.previewScroll}
                contentContainerStyle={styles.previewScrollContent}
              >
                {/* A4 Sheet Container */}
                <View style={styles.a4Sheet}>
                  {/* Header Row: Store Details & Tax Invoice Badge */}
                  <View style={styles.a4HeaderRow}>
                    <View style={{ flex: 1 }}>
                      {storeInfo.logoUrl ? (
                        <Image
                          source={{ uri: storeInfo.logoUrl }}
                          style={styles.storeLogo}
                          resizeMode="contain"
                        />
                      ) : null}
                      <Text style={styles.a4StoreName}>
                        {storeInfo.businessName || 'Business Store'}
                      </Text>
                      {storeInfo.gstin ? (
                        <Text style={styles.a4GstinText}>GSTIN: {storeInfo.gstin}</Text>
                      ) : null}
                      {storeInfo.address ? (
                        <Text style={styles.a4StoreSub}>{storeInfo.address}</Text>
                      ) : null}
                      {storeInfo.phone ? (
                        <Text style={styles.a4StoreSub}>Phone: {storeInfo.phone}</Text>
                      ) : null}
                      {storeInfo.email ? (
                        <Text style={styles.a4StoreSub}>Email: {storeInfo.email}</Text>
                      ) : null}
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <View style={styles.taxInvoicePill}>
                        <Text style={styles.taxInvoicePillText}>TAX INVOICE</Text>
                      </View>
                      <Text style={styles.a4SubBadge}>Original for Recipient</Text>
                      <Text style={styles.a4InvNum}>{inv.number}</Text>
                      <Text style={styles.a4DateText}>
                        Date: {new Date(inv.createdAt).toLocaleDateString('en-IN')}
                      </Text>
                      {inv.dueDate ? (
                        <Text style={styles.a4DateText}>
                          Due: {new Date(inv.dueDate).toLocaleDateString('en-IN')}
                        </Text>
                      ) : null}

                      <TouchableOpacity
                        onPress={() => handleTogglePaymentStatus(inv)}
                        style={[
                          styles.a4StatusStamp,
                          isPaid ? styles.a4StatusPaid : styles.a4StatusUnpaid,
                        ]}
                      >
                        <Text
                          style={[
                            styles.a4StatusStampText,
                            isPaid ? styles.a4StatusPaidText : styles.a4StatusUnpaidText,
                          ]}
                        >
                          {isPaid ? 'PAID ✓' : 'PAYMENT DUE'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.a4Divider} />

                  {/* Customer and Supply Details Cards */}
                  <View style={styles.a4TwoCol}>
                    <View style={[styles.a4Box, { flex: 1, marginRight: 6 }]}>
                      <Text style={styles.a4BoxTitle}>Billed To (Customer)</Text>
                      <Text style={styles.a4CustName}>
                        {inv.customer?.name || 'Walk-in Client'}
                      </Text>
                      {inv.customer?.phone ? (
                        <Text style={styles.a4CustSub}>Phone: {inv.customer.phone}</Text>
                      ) : null}
                      {inv.customer?.email ? (
                        <Text style={styles.a4CustSub}>Email: {inv.customer.email}</Text>
                      ) : null}
                      {inv.customer?.address ? (
                        <Text style={styles.a4CustSub}>Address: {inv.customer.address}</Text>
                      ) : null}
                      {inv.customer?.gstin ? (
                        <Text style={[styles.a4CustSub, { fontWeight: '700', color: '#1e293b' }]}>
                          Customer GSTIN: {inv.customer.gstin}
                        </Text>
                      ) : null}
                    </View>

                    <View style={[styles.a4Box, { flex: 1, marginLeft: 6 }]}>
                      <Text style={styles.a4BoxTitle}>Supply & Terms</Text>
                      <Text style={styles.a4CustSub}>Invoice #: {inv.number}</Text>
                      <Text style={styles.a4CustSub}>
                        Status: {inv.status || (isPaid ? 'PAID' : 'UNPAID')}
                      </Text>
                      {inv.paymentMethod ? (
                        <Text style={styles.a4CustSub}>
                          Payment Mode: {inv.paymentMethod}
                        </Text>
                      ) : null}
                      <Text style={styles.a4CustSub}>Place of Supply: Intra-State</Text>
                      <Text style={styles.a4CustSub}>Reverse Charge: No</Text>
                    </View>
                  </View>

                  {/* Itemized Table */}
                  <View style={styles.tableCard}>
                    <View style={styles.tableHeaderRow}>
                      <Text style={[styles.thCell, { width: 24, textAlign: 'center' }]}>#</Text>
                      <Text style={[styles.thCell, { flex: 2 }]}>Item Description</Text>
                      <Text style={[styles.thCell, { width: 45, textAlign: 'center' }]}>HSN</Text>
                      <Text style={[styles.thCell, { width: 35, textAlign: 'center' }]}>Qty</Text>
                      <Text style={[styles.thCell, { width: 60, textAlign: 'right' }]}>Rate</Text>
                      <Text style={[styles.thCell, { width: 70, textAlign: 'right' }]}>Total</Text>
                    </View>

                    {inv.items.map((item, idx) => {
                      const itemQty = Number(item.qty) || 1;
                      const itemRate = Number(item.unitPrice) || 0;
                      const itemTot = itemQty * itemRate;

                      return (
                        <View
                          key={idx}
                          style={[styles.tableBodyRow, idx % 2 === 1 && styles.tableRowAlt]}
                        >
                          <Text
                            style={[
                              styles.tdCell,
                              { width: 24, textAlign: 'center', color: '#94a3b8' },
                            ]}
                          >
                            {idx + 1}
                          </Text>
                          <View style={{ flex: 2 }}>
                            <Text style={styles.tdCellDesc}>{item.description || 'Item'}</Text>
                          </View>
                          <Text
                            style={[
                              styles.tdCell,
                              { width: 45, textAlign: 'center', fontSize: 10 },
                            ]}
                          >
                            {item.hsnCode || '—'}
                          </Text>
                          <Text style={[styles.tdCell, { width: 35, textAlign: 'center' }]}>
                            {itemQty}
                          </Text>
                          <Text style={[styles.tdCell, { width: 60, textAlign: 'right' }]}>
                            ₹{itemRate.toFixed(2)}
                          </Text>
                          <Text
                            style={[
                              styles.tdCell,
                              { width: 70, textAlign: 'right', fontWeight: '800' },
                            ]}
                          >
                            ₹{itemTot.toFixed(2)}
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  {/* Totals Breakdown */}
                  <View style={styles.totalsSection}>
                    <View style={styles.totalsTable}>
                      <View style={styles.totalsRow}>
                        <Text style={styles.totalsLabel}>Taxable Subtotal</Text>
                        <Text style={styles.totalsVal}>₹{taxable.toFixed(2)}</Text>
                      </View>
                      {discount > 0 && (
                        <View style={styles.totalsRow}>
                          <Text style={styles.totalsLabel}>Special Discount</Text>
                          <Text style={[styles.totalsVal, { color: '#059669' }]}>
                            -₹{discount.toFixed(2)}
                          </Text>
                        </View>
                      )}
                      <View style={styles.totalsRow}>
                        <Text style={styles.totalsLabel}>CGST ({halfRate}%)</Text>
                        <Text style={styles.totalsVal}>₹{cgst.toFixed(2)}</Text>
                      </View>
                      <View style={styles.totalsRow}>
                        <Text style={styles.totalsLabel}>SGST ({halfRate}%)</Text>
                        <Text style={styles.totalsVal}>₹{sgst.toFixed(2)}</Text>
                      </View>
                      <View style={[styles.totalsRow, styles.grandTotalRow]}>
                        <Text style={styles.grandTotalLabel}>Total Invoice Value</Text>
                        <Text style={styles.grandTotalVal}>₹{total.toFixed(2)}</Text>
                      </View>
                      <View style={styles.totalsRow}>
                        <Text style={styles.totalsLabel}>Amount Paid</Text>
                        <Text
                          style={[
                            styles.totalsVal,
                            { color: isPaid ? '#059669' : '#0f172a' },
                          ]}
                        >
                          ₹
                          {isPaid
                            ? total.toFixed(2)
                            : (Number(inv.paidAmount) || 0).toFixed(2)}
                        </Text>
                      </View>
                      {!isPaid && (
                        <View style={styles.totalsRow}>
                          <Text
                            style={[
                              styles.totalsLabel,
                              { color: '#b91c1c', fontWeight: '800' },
                            ]}
                          >
                            Balance Due
                          </Text>
                          <Text
                            style={[
                              styles.totalsVal,
                              { color: '#b91c1c', fontWeight: '900' },
                            ]}
                          >
                            ₹{total.toFixed(2)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Amount in words */}
                  <View style={styles.wordsContainer}>
                    <Text style={styles.wordsLabel}>Total in Words:</Text>
                    <Text style={styles.wordsValue}>{numberToWords(total)}</Text>
                  </View>

                  {/* Footer with UPI QR & Signature Stamp */}
                  <View style={styles.a4Footer}>
                    <View style={{ flex: 1 }}>
                      {qrUrl ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <Image
                            source={{ uri: qrUrl }}
                            style={styles.qrImage}
                            resizeMode="contain"
                          />
                          <View>
                            <Text style={styles.qrTitle}>Scan & Pay via UPI</Text>
                            <Text style={styles.qrSub}>{storeInfo.upiId}</Text>
                          </View>
                        </View>
                      ) : null}

                      <Text style={styles.termsTitle}>Terms & Conditions:</Text>
                      <Text style={styles.termsText}>
                        {storeInfo.billFooter ||
                          '1. Goods once sold will not be taken back.\n2. Interest @18% p.a. charged on overdue payments.'}
                      </Text>
                      {inv.notes ? (
                        <Text style={[styles.termsText, { marginTop: 4 }]}>
                          Notes: {inv.notes}
                        </Text>
                      ) : null}
                    </View>

                    <View style={styles.signatureCol}>
                      {storeInfo.signatureUrl ? (
                        <Image
                          source={{ uri: storeInfo.signatureUrl }}
                          style={styles.sigImage}
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={styles.sigPlaceholder} />
                      )}
                      <View style={styles.signatureLine}>
                        <Text style={styles.sigCompanyText}>
                          For {storeInfo.businessName || 'Business'}
                        </Text>
                        <Text style={styles.sigRoleText}>Authorized Signatory</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Bottom Action Sheet */}
                <View style={styles.previewBottomActions}>
                  <TouchableOpacity
                    onPress={() => handleShareWhatsApp(inv, true)}
                    style={[styles.bottomActionBtn, { backgroundColor: '#25D366' }]}
                  >
                    <MaterialIcons name="send" size={16} color="#ffffff" />
                    <Text style={styles.bottomActionBtnText}>Share on WhatsApp</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handleSharePdfInvoice(inv)}
                    style={[styles.bottomActionBtn, { backgroundColor: '#dc2626' }]}
                  >
                    <MaterialIcons name="picture-as-pdf" size={16} color="#ffffff" />
                    <Text style={styles.bottomActionBtnText}>Export PDF</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handlePrintInvoice(inv)}
                    style={[styles.bottomActionBtn, { backgroundColor: '#4338ca' }]}
                  >
                    <MaterialIcons name="print" size={16} color="#ffffff" />
                    <Text style={styles.bottomActionBtnText}>Print</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </SafeAreaView>
          );
        })()}
      </Modal>

      {/* 2. Payment Mode Selection Modal */}
      <Modal
        visible={!!paymentModalInvoice}
        transparent
        animationType="fade"
        onRequestClose={() => setPaymentModalInvoice(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: 380 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Payment</Text>
              <TouchableOpacity onPress={() => setPaymentModalInvoice(null)}>
                <MaterialIcons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={{ paddingVertical: 14 }}>
              <Text style={styles.inputLabel}>
                Invoice #{paymentModalInvoice?.number} • ₹
                {paymentModalInvoice ? paymentModalInvoice.total.toFixed(2) : '0.00'}
              </Text>
              <Text style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                Select payment method received from customer:
              </Text>

              <View style={{ gap: 8 }}>
                {[
                  { id: 'CASH', label: 'Cash Payment', icon: 'payments' },
                  { id: 'UPI', label: 'UPI / QR Code', icon: 'qr-code-scanner' },
                  {
                    id: 'BANK_TRANSFER',
                    label: 'Bank Transfer / IMPS / NEFT',
                    icon: 'account-balance',
                  },
                  { id: 'CARD', label: 'Credit / Debit Card', icon: 'credit-card' },
                ].map((mode) => (
                  <TouchableOpacity
                    key={mode.id}
                    onPress={() => setSelectedPaymentMode(mode.id)}
                    style={[
                      styles.paymentModeChoice,
                      selectedPaymentMode === mode.id && styles.paymentModeChoiceActive,
                    ]}
                  >
                    <MaterialIcons
                      name={mode.icon as any}
                      size={20}
                      color={selectedPaymentMode === mode.id ? '#059669' : '#64748b'}
                    />
                    <Text
                      style={[
                        styles.paymentModeChoiceText,
                        selectedPaymentMode === mode.id && styles.paymentModeChoiceTextActive,
                      ]}
                    >
                      {mode.label}
                    </Text>
                    {selectedPaymentMode === mode.id && (
                      <MaterialIcons name="check" size={18} color="#059669" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                onPress={handleConfirmPayment}
                disabled={updatingPayment}
                style={[styles.modalSubmitBtn, { marginTop: 16 }]}
              >
                {updatingPayment ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalSubmitText}>Confirm & Mark as Paid</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 3. Store Branding & GST Settings Modal */}
      <Modal
        visible={brandModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setBrandModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>GST Store Branding</Text>
              <TouchableOpacity onPress={() => setBrandModalOpen(false)}>
                <MaterialIcons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ paddingVertical: 12 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Business / Store Name</Text>
              <TextInput
                value={storeInfo.businessName}
                onChangeText={(v) => setStoreInfo((p) => ({ ...p, businessName: v }))}
                style={styles.modalInput}
                placeholder="e.g. Nuvora Technologies Pvt Ltd"
              />

              <Text style={[styles.inputLabel, { marginTop: 10 }]}>GSTIN (Tax ID)</Text>
              <TextInput
                value={storeInfo.gstin}
                onChangeText={(v) => setStoreInfo((p) => ({ ...p, gstin: v.toUpperCase() }))}
                style={styles.modalInput}
                placeholder="e.g. 29ABCDE1234F1Z5"
                autoCapitalize="characters"
              />

              <Text style={[styles.inputLabel, { marginTop: 10 }]}>UPI ID for Invoice QR Code</Text>
              <TextInput
                value={storeInfo.upiId}
                onChangeText={(v) => setStoreInfo((p) => ({ ...p, upiId: v }))}
                style={styles.modalInput}
                placeholder="e.g. business@okaxis"
                autoCapitalize="none"
              />

              <Text style={[styles.inputLabel, { marginTop: 10 }]}>Store Address</Text>
              <TextInput
                value={storeInfo.address}
                onChangeText={(v) => setStoreInfo((p) => ({ ...p, address: v }))}
                style={styles.modalInput}
                placeholder="Shop 4, MG Road, Bengaluru"
              />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Phone</Text>
                  <TextInput
                    value={storeInfo.phone}
                    onChangeText={(v) => setStoreInfo((p) => ({ ...p, phone: v }))}
                    style={styles.modalInput}
                    placeholder="Mobile / Phone"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput
                    value={storeInfo.email}
                    onChangeText={(v) => setStoreInfo((p) => ({ ...p, email: v }))}
                    style={styles.modalInput}
                    placeholder="Email"
                  />
                </View>
              </View>

              {/* Logo & Signature Picker */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Store Logo</Text>
                  <TouchableOpacity onPress={handlePickLogo} style={styles.brandPickBtn}>
                    {storeInfo.logoUrl ? (
                      <Image source={{ uri: storeInfo.logoUrl }} style={styles.pickedThumb} />
                    ) : (
                      <>
                        <MaterialIcons name="add-photo-alternate" size={24} color="#059669" />
                        <Text style={styles.brandPickBtnText}>Upload Logo</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Authorized Signature</Text>
                  <TouchableOpacity onPress={handlePickSignature} style={styles.brandPickBtn}>
                    {storeInfo.signatureUrl ? (
                      <Image source={{ uri: storeInfo.signatureUrl }} style={styles.pickedThumb} />
                    ) : (
                      <>
                        <MaterialIcons name="draw" size={24} color="#4338ca" />
                        <Text style={styles.brandPickBtnText}>Upload Signature</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={[styles.inputLabel, { marginTop: 12 }]}>Terms & Bill Footer</Text>
              <TextInput
                value={storeInfo.billFooter}
                onChangeText={(v) => setStoreInfo((p) => ({ ...p, billFooter: v }))}
                style={[styles.modalInput, { height: 60 }]}
                multiline
                placeholder="1. Goods once sold will not be taken back..."
              />

              <TouchableOpacity
                onPress={() => {
                  setBrandModalOpen(false);
                  Alert.alert('Saved ✓', 'Store GST branding details saved.');
                }}
                style={[styles.modalSubmitBtn, { marginTop: 18 }]}
              >
                <Text style={styles.modalSubmitText}>Save Brand Settings</Text>
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
  taxSummaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#eef2ff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c7d2fe',
    gap: 10,
  },
  taxBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#312e81',
  },
  taxCountBadge: {
    backgroundColor: '#c7d2fe',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  taxCountBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#3730a3',
  },
  taxBannerSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4338ca',
    marginTop: 2,
  },
  exportCsvBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#4338ca',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    shadowColor: '#4338ca',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  exportCsvBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
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
  // Invoice Action Toolbar
  invoiceActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginTop: 4,
  },
  actionIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  actionIconText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0f172a',
  },
  actionIconBtnDanger: {
    paddingHorizontal: 7,
    paddingVertical: 5,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    marginLeft: 'auto',
  },
  // Preview Modal
  previewModalSafe: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  previewTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  previewBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  previewBarTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
  previewBarSub: {
    fontSize: 11,
    color: '#64748b',
  },
  previewActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  previewScroll: {
    flex: 1,
  },
  previewScrollContent: {
    padding: 12,
    paddingBottom: 40,
  },
  // A4 Sheet Visual Container
  a4Sheet: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  a4HeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  storeLogo: {
    height: 44,
    width: 110,
    marginBottom: 4,
  },
  a4StoreName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0f172a',
  },
  a4GstinText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    marginTop: 1,
  },
  a4StoreSub: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  taxInvoicePill: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  taxInvoicePillText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0.8,
  },
  a4SubBadge: {
    fontSize: 8,
    color: '#94a3b8',
    textTransform: 'uppercase',
    fontWeight: '700',
    marginTop: 2,
  },
  a4InvNum: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 4,
    fontFamily: 'monospace',
  },
  a4DateText: {
    fontSize: 10,
    color: '#64748b',
  },
  a4StatusStamp: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  a4StatusStampText: {
    fontWeight: '900',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  a4StatusPaid: {
    borderColor: '#059669',
    backgroundColor: '#ecfdf5',
  },
  a4StatusPaidText: {
    color: '#059669',
    fontWeight: '900',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  a4StatusUnpaid: {
    borderColor: '#d97706',
    backgroundColor: '#fffbeb',
  },
  a4StatusUnpaidText: {
    color: '#d97706',
    fontWeight: '900',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  a4Divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 12,
  },
  a4TwoCol: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  a4Box: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  a4BoxTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#4f46e5',
    textTransform: 'uppercase',
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 2,
  },
  a4CustName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  a4CustSub: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  tableCard: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  thCell: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    paddingHorizontal: 2,
  },
  tableBodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  tableRowAlt: {
    backgroundColor: '#f8fafc',
  },
  tdCell: {
    fontSize: 10,
    color: '#334155',
    paddingHorizontal: 2,
  },
  tdCellDesc: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0f172a',
  },
  totalsSection: {
    alignItems: 'flex-end',
    marginTop: 6,
  },
  totalsTable: {
    width: '65%',
    gap: 3,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  totalsLabel: {
    fontSize: 10,
    color: '#64748b',
  },
  totalsVal: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0f172a',
  },
  grandTotalRow: {
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: '#4f46e5',
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
    marginVertical: 3,
  },
  grandTotalLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#312e81',
  },
  grandTotalVal: {
    fontSize: 12,
    fontWeight: '900',
    color: '#312e81',
  },
  wordsContainer: {
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    padding: 8,
    marginTop: 10,
  },
  wordsLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  wordsValue: {
    fontSize: 10,
    fontStyle: 'italic',
    color: '#1e293b',
    marginTop: 1,
  },
  a4Footer: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'flex-end',
    gap: 12,
  },
  qrImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  qrTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0f172a',
  },
  qrSub: {
    fontSize: 8,
    color: '#64748b',
    marginTop: 1,
  },
  termsTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
    marginTop: 8,
    textTransform: 'uppercase',
  },
  termsText: {
    fontSize: 8,
    color: '#64748b',
    lineHeight: 12,
  },
  signatureCol: {
    width: 120,
    alignItems: 'center',
  },
  sigImage: {
    height: 36,
    width: 100,
    marginBottom: 4,
  },
  sigPlaceholder: {
    height: 32,
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: '#475569',
    width: '100%',
    alignItems: 'center',
    paddingTop: 2,
  },
  sigCompanyText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0f172a',
  },
  sigRoleText: {
    fontSize: 8,
    color: '#64748b',
  },
  previewBottomActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  bottomActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  bottomActionBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  // Payment Choice Modal
  paymentModeChoice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  paymentModeChoiceActive: {
    borderColor: '#059669',
    backgroundColor: '#ecfdf5',
  },
  paymentModeChoiceText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  paymentModeChoiceTextActive: {
    color: '#059669',
    fontWeight: '800',
  },
  // Brand Settings
  brandPickBtn: {
    height: 80,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    overflow: 'hidden',
  },
  brandPickBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 4,
  },
  pickedThumb: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
});

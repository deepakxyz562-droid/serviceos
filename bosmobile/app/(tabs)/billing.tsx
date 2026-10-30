import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
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
  KeyboardAvoidingView,
} from 'react-native';
import { Paths, File as ExpoFile } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons, Feather, Ionicons } from '@expo/vector-icons';
import { hapticFeedback } from '@/lib/haptics';
import { apiRequest } from '@/lib/api';
import { API_PATHS } from '@/lib/constants';
import { useBlueprintStore } from '@/stores/blueprint-store';
import { storageGetItem, storageSetItem } from '@/lib/storage';
import {
  numberToWords,
  generateGstInvoiceHtml,
  resolveAbsoluteLogoUrl,
  GstStoreInfo,
} from '@/lib/gst-invoice-helper';
import { SignaturePadModal, SignaturePreview } from '@/components/SignaturePadModal';
import { QrCode } from '@/components/qr-code';
import { KpiRow } from '@/components/money/kpi-tile';
import { DateRangeSheet, presetRange, type DateRange } from '@/components/money/date-range-sheet';
import { PaymentSheet, type PaymentSheetInvoice } from '@/components/money/payment-sheet';
import { formatInr, buildInvoiceUrl } from '@/lib/money';

interface ItemEntry {
  description: string;
  qty: number;
  unitPrice: number;
  unit?: string;
  hsnCode?: string;
  gstRate?: number;
}

const STANDARD_UNITS = ['Pcs', 'Kg', 'Box', 'Ltr', 'Mtr', 'Bags', 'Nos'];

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

/**
 * One invoice card — extracted so the big invoices list can live in a FlatList
 * (rows render in isolated batches instead of one giant blocking map()).
 */
interface InvoiceRowProps {
  inv: InvoiceRecord;
  onPress: (inv: InvoiceRecord) => void;
  onOpen: (inv: InvoiceRecord) => void;
  onToggleStatus: (inv: InvoiceRecord) => void;
  onSharePdf: (inv: InvoiceRecord) => void;
  onPrint: (inv: InvoiceRecord) => void;
  onEdit: (inv: InvoiceRecord) => void;
  onShareWhatsApp: (inv: InvoiceRecord) => void;
  onDelete: (inv: InvoiceRecord) => void;
}

function InvoiceRow({
  inv,
  onPress,
  onOpen,
  onToggleStatus,
  onSharePdf,
  onPrint,
  onEdit,
  onShareWhatsApp,
  onDelete,
}: InvoiceRowProps) {
  const isPaid = inv.balance <= 0 || inv.status === 'PAID';

  return (
    <TouchableOpacity style={styles.docCard} activeOpacity={0.9} onPress={() => onPress(inv)}>
      <View style={styles.docHeader}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.docNumber}>{inv.number}</Text>
            <TouchableOpacity
              onPress={() => onToggleStatus(inv)}
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
          onPress={() => onOpen(inv)}
          style={styles.actionIconBtn}
          accessibilityLabel="Preview Invoice"
        >
          <MaterialIcons name="visibility" size={15} color="#0f172a" />
          <Text style={styles.actionIconText}>View</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onSharePdf(inv)}
          style={styles.actionIconBtn}
          accessibilityLabel="PDF Invoice"
        >
          <MaterialIcons name="picture-as-pdf" size={15} color="#dc2626" />
          <Text style={styles.actionIconText}>PDF</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onPrint(inv)}
          style={styles.actionIconBtn}
          accessibilityLabel="Print Invoice"
        >
          <MaterialIcons name="print" size={15} color="#4338ca" />
          <Text style={styles.actionIconText}>Print</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onEdit(inv)}
          style={styles.actionIconBtn}
          accessibilityLabel="Edit Invoice"
        >
          <MaterialIcons name="edit" size={15} color="#d97706" />
          <Text style={styles.actionIconText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onShareWhatsApp(inv)}
          style={[styles.actionIconBtn, { backgroundColor: '#25D366' }]}
          accessibilityLabel="Share on WhatsApp"
        >
          <Ionicons name="logo-whatsapp" size={14} color="#ffffff" />
          <Text style={[styles.actionIconText, { color: '#ffffff', fontWeight: '800' }]}>WhatsApp</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => onDelete(inv)}
          style={styles.actionIconBtnDanger}
          accessibilityLabel="Delete Invoice"
        >
          <MaterialIcons name="delete-outline" size={15} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function BillingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { blueprint, countryPack } = useBlueprintStore();
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
  // Real partial-payment sheet (amount + method + UTR) — same flow as /invoice/[id].
  const [paySheetOpen, setPaySheetOpen] = useState(false);
  const [paySheetInvoice, setPaySheetInvoice] = useState<PaymentSheetInvoice | null>(null);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string>('CASH');
  const params = useLocalSearchParams<{ openBrand?: string }>();
  const [brandModalOpen, setBrandModalOpen] = useState(false);

  useEffect(() => {
    if (params?.openBrand === '1') {
      setBrandModalOpen(true);
    }
  }, [params?.openBrand]);
  const [savingBrand, setSavingBrand] = useState(false);
  const [showSigPad, setShowSigPad] = useState(false);
  const [storeInfo, setStoreInfo] = useState<GstStoreInfo>(() => ({
    businessName: blueprint?.businessName || 'Business Store',
    logoUrl: '',
    signatureUrl: '',
    gstin: '',
    address: '',
    phone: '',
    email: '',
    upiId: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    accountHolderName: '',
    invoicePaymentDisplay: 'both',
    billFooter: '1. Goods once sold will not be taken back.\n2. Interest @18% p.a. charged on overdue payments.',
  }));

  // Form Modal (for both Invoice and Quote)
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formType, setFormType] = useState<'INVOICE' | 'QUOTE'>('INVOICE');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [items, setItems] = useState<ItemEntry[]>([
    { description: '', qty: 1, unitPrice: 0, unit: 'Pcs', hsnCode: '' },
  ]);
  const [taxRate, setTaxRate] = useState<number>(18);
  const [discountValue, setDiscountValue] = useState<string>('0');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Vyapar-Grade Customer & Catalog Pickers & Terms State
  const [customersList, setCustomersList] = useState<any[]>([]);
  const [catalogList, setCatalogList] = useState<any[]>([]);
  const [selectedParty, setSelectedParty] = useState<any | null>(null);
  const [showCustomerPickerModal, setShowCustomerPickerModal] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCatalogPickerModal, setShowCatalogPickerModal] = useState(false);
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');
  const [catalogTargetIdx, setCatalogTargetIdx] = useState<number | null>(null);
  const [customerGstin, setCustomerGstin] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'PAID' | 'UNPAID' | 'PARTIAL'>('UNPAID');
  const [amountPaidInput, setAmountPaidInput] = useState('');
  const [dueDateDays, setDueDateDays] = useState<number>(15);
  const [taxType, setTaxType] = useState<'INTRA' | 'INTER'>('INTRA');
  const [periodKey, setPeriodKey] = useState<'all' | 'today' | 'this_month' | 'custom'>('all');
  const [customRange, setCustomRange] = useState<DateRange | null>(null);
  const [rangeSheetOpen, setRangeSheetOpen] = useState(false);

  const fetchBillingData = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) {
        // Hydrate invoices & quotes from cache immediately so screen never blocks or shows error
        const cached = await storageGetItem('bos_invoices_cache');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed.invoices)) setInvoices(parsed.invoices);
            if (parsed.invOverview) setInvoiceOverview(parsed.invOverview);
            if (Array.isArray(parsed.quotes)) setQuotes(parsed.quotes);
            if (parsed.quoteOverview) setQuoteOverview(parsed.quoteOverview);
            setLoading(false);
          } catch {}
        }
      }

      const [invRes, quoteRes] = await Promise.all([
        apiRequest<{ invoices: InvoiceRecord[]; overview: any }>(API_PATHS.commerceInvoices),
        apiRequest<{ quotes: QuoteRecord[]; overview: any }>(API_PATHS.commerceQuotes),
      ]);

      setInvoices(invRes.invoices || []);
      if (invRes.overview) setInvoiceOverview(invRes.overview);

      setQuotes(quoteRes.quotes || []);
      if (quoteRes.overview) setQuoteOverview(quoteRes.overview);

      setError(null);
      void storageSetItem('bos_invoices_cache', JSON.stringify({
        invoices: invRes.invoices || [],
        invOverview: invRes.overview,
        quotes: quoteRes.quotes || [],
        quoteOverview: quoteRes.overview,
      })).catch(() => {});
    } catch (err: any) {
      setInvoices(prev => {
        if (prev.length === 0) {
          setError(err?.message || 'Unable to load billing data.');
        }
        return prev;
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBillingData(true);
    // Load store config for GST branding & catalog (offline-first, deduplicated)
    (async () => {
      try {
        const cached = await storageGetItem('bos_store_branding');
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

        const [res, cRes] = await Promise.all([
          apiRequest<{ config?: any; business?: any }>(API_PATHS.commerceConfig).catch(() => null),
          apiRequest<{ customers?: any[] }>(API_PATHS.commerceCustomers).catch(() => ({ customers: [] })),
        ]);

        if (res) {
          const c = res.config || {};
          const b = res.business || {};
          const serverLogo = b.logoUrl || c.logoUrl || '';
          const resolvedLogo = resolveAbsoluteLogoUrl(serverLogo);
          setStoreInfo((prev) => {
            const nextInfo = {
              ...prev,
              businessName:
                b.name ||
                c.storeName ||
                c.businessName ||
                prev.businessName ||
                blueprint?.businessName ||
                'Business Store',
              gstin: c.gstin || c.billing?.gstin || b.gstin || prev.gstin,
              phone: b.phone || c.phone || prev.phone,
              email: b.email || c.email || prev.email,
              address: b.address || c.address || prev.address,
              upiId: c.upiId || b.upiId || prev.upiId,
              bankName: c.bankName || b.bankName || prev.bankName || '',
              accountNumber: c.accountNumber || b.accountNumber || prev.accountNumber || '',
              ifscCode: c.ifscCode || b.ifscCode || prev.ifscCode || '',
              accountHolderName: c.accountHolderName || b.accountHolderName || prev.accountHolderName || '',
              invoicePaymentDisplay: (c.invoicePaymentDisplay || b.invoicePaymentDisplay || prev.invoicePaymentDisplay || 'both') as 'both' | 'upi_qr' | 'bank_details' | 'none',
              logoUrl: resolvedLogo || prev.logoUrl,
              signatureUrl: b.signatureUrl || c.signatureUrl || prev.signatureUrl,
              billFooter: b.billFooter || c.billFooter || prev.billFooter,
            };
            void storageSetItem('bos_store_branding', JSON.stringify(nextInfo)).catch(() => {});
            return nextInfo;
          });

          if (c?.catalogJson) {
            try {
              const parsed = JSON.parse(c.catalogJson);
              if (Array.isArray(parsed)) setCatalogList(parsed);
            } catch {}
          }
        }

        if (Array.isArray(cRes?.customers)) {
          setCustomersList(cRes.customers);
        }
      } catch (e) {
        // Fallback to local cache / blueprint
      }
    })();
  }, [fetchBillingData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await hapticFeedback.light();
    await fetchBillingData(false);
  };

  const handleSelectParty = (c: any) => {
    hapticFeedback.light();
    setSelectedParty(c);
    setCustomerName(c.name || '');
    setCustomerPhone(c.phone || '');
    setCustomerAddress(c.address || '');
    setCustomerGstin(c.gstin || '');
    setShowCustomerPickerModal(false);
  };

  const handleClearParty = () => {
    hapticFeedback.light();
    setSelectedParty(null);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setCustomerGstin('');
  };

  const handleOpenCatalogPicker = (targetIdx: number | null = null) => {
    hapticFeedback.light();
    setCatalogTargetIdx(targetIdx);
    setCatalogSearchQuery('');
    setShowCatalogPickerModal(true);
  };

  const handleSelectCatalogItem = (prod: any) => {
    hapticFeedback.light();
    const newItem: ItemEntry = {
      description: prod.name || 'Product',
      qty: 1,
      unitPrice: Number(prod.price) || 0,
      unit: prod.unit || 'Pcs',
      hsnCode: prod.sku || prod.hsn || '',
      gstRate: Number(prod.taxRate) > 0 ? Number(prod.taxRate) : taxRate,
    };
    if (catalogTargetIdx !== null && catalogTargetIdx >= 0 && catalogTargetIdx < items.length) {
      const updated = [...items];
      updated[catalogTargetIdx] = {
        ...updated[catalogTargetIdx],
        description: newItem.description,
        unitPrice: newItem.unitPrice,
        unit: newItem.unit,
        hsnCode: newItem.hsnCode,
      };
      setItems(updated);
    } else {
      setItems((prev) => [...prev, newItem]);
    }
    setShowCatalogPickerModal(false);
  };

  // Single honest share-link construction: canonical /invoice/{id} on the
  // configured host. Without a real invoice id there is no honest link, so we
  // send a link-free plain-text summary instead of a URL that would 404.
  const sendInvoiceWhatsApp = (inv: InvoiceRecord, cleanPhone: string) => {
    const businessName = storeInfo?.businessName || 'Our Store';
    const shareUrl = inv.id ? buildInvoiceUrl(inv.id) : '';
    const body = shareUrl
      ? {
          phone: cleanPhone,
          templateType: 'bos_tax_invoice',
          templateData: {
            customerName: inv.customer?.name || 'Valued Customer',
            invoiceNumber: inv.number,
            businessName,
            total: inv.total,
            currency: 'INR',
            paymentStatus: inv.status || 'PAID',
            paymentMethod: 'Cash / Online',
            invoiceUrl: shareUrl,
          },
        }
      : {
          phone: cleanPhone,
          message:
            `🧾 *Tax Invoice* ${inv.number}\n` +
            `Dear ${inv.customer?.name || 'Customer'}, thank you for your business with *${businessName}*.\n\n` +
            `💰 Invoice Total: ${formatInr(inv.total)}\n` +
            `Status: ${inv.status === 'PAID' ? 'PAID' : 'PENDING / DUE'}`,
        };
    return apiRequest(API_PATHS.commerceWhatsAppSend, { method: 'POST', body }).catch(() => {});
  };

  const handleShareWhatsAppPdf = async (inv: InvoiceRecord) => {
    try {
      await hapticFeedback.medium();
      const cleanPhone = (inv.customer?.phone || '').replace(/\D/g, '');
      if (cleanPhone) {
        sendInvoiceWhatsApp(inv, cleanPhone);
      }

      const html = generateGstInvoiceHtml(inv, storeInfo, '₹');
      const { uri } = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Tax Invoice ${inv.number}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        handleShareWhatsApp(inv, true);
      }
    } catch (err: any) {
      handleShareWhatsApp(inv, true);
    }
  };

  const handleOpenCreateModal = (type: 'INVOICE' | 'QUOTE') => {
    hapticFeedback.light();
    setEditingInvoice(null);
    setFormType(type);
    setSelectedParty(null);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerAddress('');
    setCustomerGstin('');
    setItems([{ description: '', qty: 1, unitPrice: 0, unit: 'Pcs', hsnCode: '' }]);
    setTaxRate(18);
    setTaxType('INTRA');
    setDiscountValue('0');
    setPaymentStatus('UNPAID');
    setAmountPaidInput('');
    setDueDateDays(15);
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
    setItems([...items, { description: '', qty: 1, unitPrice: 0, unit: 'Pcs', hsnCode: '', gstRate: taxRate }]);
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
  // Mirrors computeInvoiceTotals (quote-flow-calc): discount before tax,
  // per-line GST on the pro-rata discounted base. Falls back to the
  // invoice-level rate only when NO line carries a gstRate.
  const hasLineRates = items.some((i) => Number(i.gstRate) > 0);
  const discountFactor = formSubtotal > 0 ? taxable / formSubtotal : 0;
  const taxAmt = hasLineRates
    ? items.reduce((sum, i) => {
        const lineRate = Number(i.gstRate) || 0;
        if (lineRate <= 0) return sum;
        return (
          sum +
          (Number(i.qty) || 0) * (Number(i.unitPrice) || 0) * discountFactor * (lineRate / 100)
        );
      }, 0)
    : (taxable * taxRate) / 100;
  const formGrandTotal = Math.round((taxable + taxAmt) * 100) / 100;
  const computedPaid = paymentStatus === 'PAID' ? formGrandTotal : paymentStatus === 'PARTIAL' ? Math.min(formGrandTotal, parseFloat(amountPaidInput) || 0) : 0;
  const computedBalance = Math.max(0, formGrandTotal - computedPaid);

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
          unit: i.unit || 'Pcs',
          hsnCode: i.hsnCode?.trim() || undefined,
          gstRate: Number(i.gstRate) > 0 ? Number(i.gstRate) : undefined,
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
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (dueDateDays || 0));

        const invRes = await apiRequest<{ invoice: InvoiceRecord }>(API_PATHS.commerceInvoices, {
          method: 'POST',
          body: {
            customerId: selectedParty?.id,
            customerName: customerName.trim() || 'Client',
            customerPhone: customerPhone.trim(),
            customerAddress: customerAddress.trim() || undefined,
            customerGstin: customerGstin.trim() || undefined,
            placeOfSupply: taxType === 'INTER' ? customerGstin.trim() || selectedParty?.gstin || undefined : undefined,
            taxRate,
            discountValue: discountAmt,
            discountType: 'AMOUNT',
            notes: notes.trim(),
            items: lineItems,
            status: computedBalance <= 0 ? 'PAID' : computedPaid > 0 ? 'PARTIALLY_PAID' : 'UNPAID',
            paidAmount: computedPaid,
            balance: computedBalance,
            dueDate: dueDate.toISOString(),
            paymentMethod: selectedPaymentMode,
          },
        });

        // Auto-dispatch WhatsApp Tax Invoice to customer if valid mobile number exists
        const rawPhone = customerPhone.trim() || selectedParty?.phone || invRes?.invoice?.customer?.phone;
        const cleanPhone = rawPhone ? rawPhone.replace(/\D/g, '') : '';
        if (cleanPhone && cleanPhone.length >= 10) {
          const invNum = invRes?.invoice?.number || 'INV';
          const invId = invRes?.invoice?.id || '';
          const businessTitle = storeInfo.businessName || 'Store';
          const targetCustomerName = customerName.trim() || selectedParty?.name || 'Customer';
          const shareUrl = invId ? buildInvoiceUrl(invId) : '';

          void apiRequest(API_PATHS.commerceWhatsAppSend, {
            method: 'POST',
            body: shareUrl
              ? {
                  phone: cleanPhone,
                  templateType: 'bos_tax_invoice',
                  templateData: {
                    customerName: targetCustomerName,
                    invoiceNumber: invNum,
                    businessName: businessTitle,
                    total: String(invRes?.invoice?.total || formGrandTotal),
                    currency: 'INR',
                    paymentStatus: invRes?.invoice?.status || 'PENDING',
                    paymentMethod: invRes?.invoice?.paymentMethod || 'Cash / Online',
                    invoiceUrl: shareUrl,
                  },
                }
              : {
                  // No server invoice id → no honest /invoice/{id} link exists yet.
                  phone: cleanPhone,
                  message:
                    `🧾 *Tax Invoice* ${invNum}\n` +
                    `Dear ${targetCustomerName}, thank you for your business with *${businessTitle}*.\n\n` +
                    `💰 Invoice Total: ₹${(Number(invRes?.invoice?.total) || formGrandTotal).toFixed(2)}`,
                },
          }).catch((err) => {
            console.warn('Auto WhatsApp invoice send non-fatal error:', err);
          });
          Alert.alert('Invoice Created ✓', `BOS GST Tax Invoice generated and sent to customer on WhatsApp.`);
        } else {
          Alert.alert('Invoice Created ✓', `BOS GST Tax Invoice generated successfully.`);
        }
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

  // Open the real partial-payment sheet for an invoice with a balance due.
  const openPaymentSheet = (inv: InvoiceRecord) => {
    setPaySheetInvoice({
      id: inv.id,
      number: inv.number,
      balance: Number(inv.balance) || 0,
      currencySymbol: '₹',
    });
    setPaySheetOpen(true);
  };

  const handleTogglePaymentStatus = (inv: InvoiceRecord) => {
    const isPaid = inv.balance <= 0 || inv.status === 'PAID';
    if (isPaid) {
      if ((Number(inv.paidAmount) || 0) > 0) {
        // Payments exist — the backend refuses to flip a paid invoice back
        // (409 by design). Point the owner at the payment history instead.
        hapticFeedback.light();
        Alert.alert(
          'Payments recorded',
          'Payments recorded — open the invoice to review history.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Invoice',
              onPress: () => {
                if (selectedInvoice?.id === inv.id) setSelectedInvoice(null);
                router.push(`/invoice/${inv.id}` as any);
              },
            },
          ]
        );
        return;
      }
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
      hapticFeedback.light();
      openPaymentSheet(inv);
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
        const asset = res.assets[0];
        const base64Uri = `data:image/jpeg;base64,${asset.base64}`;
        setStoreInfo((prev) => ({ ...prev, logoUrl: base64Uri }));

        // Attempt instant cloud sync via /api/commerce/logo
        try {
          const syncRes = await apiRequest<{ logoUrl?: string }>('/api/commerce/logo', {
            method: 'POST',
            body: { base64: base64Uri },
          });
          if (syncRes?.logoUrl) {
            setStoreInfo((prev) => ({ ...prev, logoUrl: syncRes.logoUrl! }));
            void storageSetItem('bos_store_branding', JSON.stringify({ ...storeInfo, logoUrl: syncRes.logoUrl })).catch(() => {});
          }
        } catch {
          // Fallback to local base64 until full brand save
        }

        Alert.alert('Logo Selected ✓', 'Store logo updated and synced across all devices.');
      }
    } catch (e: any) {
      Alert.alert('Image Pick Error', e?.message || 'Could not pick logo.');
    }
  };

  const handleRemoveLogo = async () => {
    setStoreInfo((prev) => ({ ...prev, logoUrl: '' }));
    try {
      await apiRequest('/api/commerce/logo', { method: 'DELETE' });
      void storageSetItem('bos_store_branding', JSON.stringify({ ...storeInfo, logoUrl: '' })).catch(() => {});
    } catch {}
    Alert.alert('Logo Removed', 'Store logo has been cleared.');
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

  const handleSaveBrandSettings = async () => {
    try {
      setSavingBrand(true);
      await storageSetItem('bos_store_branding', JSON.stringify(storeInfo));

      await apiRequest(API_PATHS.commerceConfig, {
        method: 'PATCH',
        body: {
          storeName: storeInfo.businessName,
          businessName: storeInfo.businessName,
          gstin: storeInfo.gstin,
          phone: storeInfo.phone,
          email: storeInfo.email,
          address: storeInfo.address,
          upiId: storeInfo.upiId,
          bankName: storeInfo.bankName,
          accountNumber: storeInfo.accountNumber,
          ifscCode: storeInfo.ifscCode,
          accountHolderName: storeInfo.accountHolderName,
          invoicePaymentDisplay: storeInfo.invoicePaymentDisplay,
          logoUrl: storeInfo.logoUrl,
          signatureUrl: storeInfo.signatureUrl,
          billFooter: storeInfo.billFooter,
        },
      }).catch((e) => {
        console.warn('Backend config sync failed, saved locally:', e);
      });

      setBrandModalOpen(false);
      await hapticFeedback.success();
      Alert.alert('Saved ✓', 'Store branding, logo and signature saved successfully!');
    } catch (err: any) {
      Alert.alert('Save Warning', err?.message || 'Could not save branding settings.');
    } finally {
      setSavingBrand(false);
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
    const cleanPhone = item.customer?.phone?.replace(/\D/g, '') || '';

    if (isInvoice && cleanPhone) {
      sendInvoiceWhatsApp(item as InvoiceRecord, cleanPhone);
    }

    const text = `Hello ${clientName},\n\nPlease find your ${docName} #${item.number} for the amount of ₹${item.total.toFixed(2)}.\n\nThank you for your business!`;
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    if (formattedPhone) {
      Linking.openURL(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`);
    } else {
      Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`);
    }
  };

  // Vyapar-style period filter (All / Today / This Month / Custom range).
  const periodRange =
    periodKey === 'all'
      ? null
      : periodKey === 'custom'
        ? customRange
        : presetRange(periodKey === 'today' ? 'today' : 'this_month');

  const filteredInvoices = invoices.filter((i) => {
    if (periodRange) {
      const t = new Date(i.createdAt).getTime();
      const start = new Date(`${periodRange.start}T00:00:00`).getTime();
      const end = new Date(`${periodRange.end}T23:59:59.999`).getTime();
      if (!Number.isNaN(start) && !Number.isNaN(end) && (t < start || t > end)) return false;
    }
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

      {/* Store Branding & Signature Status Banner */}
      <TouchableOpacity
        onPress={() => setBrandModalOpen(true)}
        style={{
          marginHorizontal: 16,
          marginBottom: 12,
          padding: 12,
          backgroundColor: '#f8fafc',
          borderRadius: 14,
          borderWidth: 1,
          borderColor: '#e2e8f0',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
        activeOpacity={0.8}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          {storeInfo.logoUrl ? (
            <Image
              source={{ uri: storeInfo.logoUrl }}
              style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: '#fff' }}
              resizeMode="contain"
            />
          ) : (
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                backgroundColor: '#ecfdf5',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialIcons name="storefront" size={22} color="#059669" />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13.5, fontWeight: '800', color: '#0f172a' }} numberOfLines={1}>
              {storeInfo.businessName || blueprint?.businessName || 'Business Store'}
            </Text>
            <Text style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
              {storeInfo.signatureUrl ? '✓ Signature Configured' : '⚠ Missing Digital Signature'}
              {storeInfo.gstin ? ` • ${storeInfo.gstin}` : ''}
            </Text>
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingVertical: 5,
            paddingHorizontal: 9,
            backgroundColor: '#fff',
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#cbd5e1',
          }}
        >
          <MaterialIcons name="edit" size={12} color="#059669" />
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#059669' }}>Branding</Text>
        </View>
      </TouchableOpacity>

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
          <View style={{ gap: 10 }}>
            <KpiRow
              tiles={[
                {
                  label: 'Total Sales',
                  value: formatInr(filteredInvoices.reduce((s, i) => s + (Number(i.total) || 0), 0)),
                  sub: `${filteredInvoices.length} invoice${filteredInvoices.length === 1 ? '' : 's'} in period`,
                },
                {
                  label: 'Received',
                  value: formatInr(filteredInvoices.reduce((s, i) => s + (Number(i.paidAmount) || 0), 0)),
                  tone: 'positive',
                },
                {
                  label: 'Balance',
                  value: formatInr(filteredInvoices.reduce((s, i) => s + (Number(i.balance) || 0), 0)),
                  tone: 'warning',
                  sub: `Overdue ${formatInr(invoiceOverview.overdue)} (all-time)`,
                },
              ]}
            />
            {/* Period filter chips — Vyapar date-range pattern */}
            <View style={styles.periodChipsRow}>
              {([['all', 'All'], ['today', 'Today'], ['this_month', 'This Month']] as const).map(([k, label]) => (
                <TouchableOpacity
                  key={k}
                  accessibilityRole="button"
                  accessibilityState={{ selected: periodKey === k }}
                  onPress={() => {
                    hapticFeedback.light();
                    setPeriodKey(k);
                  }}
                  style={[styles.periodChip, periodKey === k && styles.periodChipActive]}
                >
                  <Text style={[styles.periodChipText, periodKey === k && styles.periodChipTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={{ selected: periodKey === 'custom' }}
                onPress={() => {
                  hapticFeedback.light();
                  setRangeSheetOpen(true);
                }}
                style={[styles.periodChip, styles.periodChipWide, periodKey === 'custom' && styles.periodChipActive]}
              >
                <Text
                  style={[styles.periodChipText, periodKey === 'custom' && styles.periodChipTextActive]}
                  numberOfLines={1}
                >
                  {periodKey === 'custom' && customRange ? customRange.label : 'Custom ▾'}
                </Text>
              </TouchableOpacity>
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
              // The outer ScrollView remains the scroller (RefreshControl lives
              // there), so the FlatList only virtualizes/batches the rows.
              <FlatList
                data={filteredInvoices}
                keyExtractor={(inv) => inv.id}
                scrollEnabled={false}
                nestedScrollEnabled
                renderItem={({ item }) => (
                  <InvoiceRow
                    inv={item}
                    onPress={(i) => router.push(`/invoice/${i.id}` as any)}
                    onOpen={setSelectedInvoice}
                    onToggleStatus={handleTogglePaymentStatus}
                    onSharePdf={handleSharePdfInvoice}
                    onPrint={handlePrintInvoice}
                    onEdit={handleOpenEditInvoice}
                    onShareWhatsApp={handleShareWhatsAppPdf}
                    onDelete={handleDeleteInvoice}
                  />
                )}
              />
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
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {formType === 'INVOICE' ? 'Create New GST Invoice' : 'Create Quotation / Estimate'}
                </Text>
                <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  {formType === 'INVOICE' ? 'BOS Professional Tax Invoice with digital QR & WhatsApp delivery' : 'Formal price quotation with line items & GST'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setFormModalOpen(false)}
                style={{ padding: 6, borderRadius: 16, backgroundColor: '#f1f5f9' }}
              >
                <MaterialIcons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 60 }}
            >
              {/* 1. Customer / Party Section */}
              <View style={styles.invoiceCustomerCard}>
                <View style={styles.sectionHeaderBetween}>
                  <Text style={styles.inputLabel}>Party / Customer *</Text>
                  <TouchableOpacity
                    onPress={() => {
                      hapticFeedback.light();
                      setCustomerSearchQuery('');
                      setShowCustomerPickerModal(true);
                    }}
                    style={styles.partyPickerBtn}
                  >
                    <MaterialIcons name="person-search" size={15} color="#059669" />
                    <Text style={styles.partyPickerBtnText}>Select Saved Party ({customersList.length})</Text>
                  </TouchableOpacity>
                </View>

                {selectedParty ? (
                  <View style={styles.selectedPartyCard}>
                    <View style={styles.selectedPartyLeft}>
                      <View style={styles.selectedPartyAvatar}>
                        <MaterialIcons name="person" size={20} color="#059669" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.selectedPartyName} numberOfLines={1}>
                          {selectedParty.name}
                        </Text>
                        <Text style={styles.selectedPartyPhone}>
                          {selectedParty.phone ? `+91 ${selectedParty.phone}` : 'No phone linked'}
                        </Text>
                        {customerAddress ? (
                          <Text style={styles.selectedPartyDetail} numberOfLines={1}>
                            📍 {customerAddress}
                          </Text>
                        ) : null}
                        {customerGstin ? (
                          <Text style={styles.selectedPartyGstin}>
                            GSTIN: {customerGstin}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={handleClearParty}
                      style={styles.changePartyBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={styles.changePartyText}>Change</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View>
                    <View style={styles.invoiceInputRow}>
                      <MaterialIcons name="person-outline" size={18} color="#64748b" style={{ marginRight: 6 }} />
                      <TextInput
                        value={customerName}
                        onChangeText={setCustomerName}
                        style={styles.invoiceCardInput}
                        placeholder="Party / Customer Name *"
                        placeholderTextColor="#94a3b8"
                      />
                    </View>

                    <View style={[styles.invoiceInputRow, { marginTop: 8 }]}>
                      <View style={styles.invoiceCountryBadge}>
                        <Text style={styles.invoiceCountryText}>{countryPack?.phone?.countryCode || '+91'}</Text>
                      </View>
                      <TextInput
                        keyboardType="phone-pad"
                        value={customerPhone}
                        onChangeText={setCustomerPhone}
                        style={styles.invoiceCardInput}
                        placeholder="10-digit WhatsApp number *"
                        placeholderTextColor="#94a3b8"
                        maxLength={10}
                      />
                    </View>

                    <View style={[styles.invoiceInputRow, { marginTop: 8 }]}>
                      <MaterialIcons name="location-on" size={18} color="#64748b" style={{ marginRight: 6 }} />
                      <TextInput
                        value={customerAddress}
                        onChangeText={setCustomerAddress}
                        style={styles.invoiceCardInput}
                        placeholder="Billing Address (City, State, Pincode)"
                        placeholderTextColor="#94a3b8"
                      />
                    </View>

                    <View style={[styles.invoiceInputRow, { marginTop: 8 }]}>
                      <MaterialIcons name="badge" size={18} color="#64748b" style={{ marginRight: 6 }} />
                      <TextInput
                        value={customerGstin}
                        onChangeText={(v) => setCustomerGstin(v.toUpperCase())}
                        style={styles.invoiceCardInput}
                        placeholder="Customer GSTIN (Optional, e.g. 29AAAAA0000A1Z5)"
                        placeholderTextColor="#94a3b8"
                        autoCapitalize="characters"
                      />
                    </View>
                  </View>
                )}
              </View>

              {/* 2. Items Section */}
              <View style={[styles.sectionHeaderRow, { marginTop: 14 }]}>
                <Text style={styles.sectionHeaderTitle}>Line Items ({items.length})</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    onPress={() => handleOpenCatalogPicker(null)}
                    style={styles.addFromCatalogBtn}
                  >
                    <MaterialIcons name="inventory-2" size={14} color="#0284c7" />
                    <Text style={styles.addFromCatalogText}>Catalog</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={addItemRow} style={styles.addMiniRowBtn}>
                    <MaterialIcons name="add" size={14} color="#059669" />
                    <Text style={styles.addMiniRowText}>Add Item</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {items.map((it, idx) => {
                const rowTotal = (Number(it.qty) || 0) * (Number(it.unitPrice) || 0);
                return (
                  <View key={idx} style={styles.invoiceItemCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: '#64748b' }}>Item #{idx + 1}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#059669' }}>
                          ₹{rowTotal.toFixed(2)}
                        </Text>
                        {items.length > 1 && (
                          <TouchableOpacity
                            onPress={() => removeItemRow(idx)}
                            style={{ padding: 4, borderRadius: 6, backgroundColor: '#fee2e2' }}
                          >
                            <MaterialIcons name="delete-outline" size={16} color="#ef4444" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    <TextInput
                      value={it.description}
                      onChangeText={(val) => updateItem(idx, 'description', val)}
                      placeholder="Item name / Service description *"
                      placeholderTextColor="#94a3b8"
                      style={styles.invoiceItemDescInput}
                    />

                    {/* Unit of Measurement & HSN Code Row */}
                    <View style={{ marginTop: 8 }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: '#64748b', marginBottom: 4 }}>
                        Unit of Measurement
                      </Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          {STANDARD_UNITS.map((u) => {
                            const isSelected = (it.unit || 'Pcs') === u;
                            return (
                              <TouchableOpacity
                                key={u}
                                onPress={() => {
                                  hapticFeedback.light();
                                  updateItem(idx, 'unit', u);
                                }}
                                style={[styles.unitChip, isSelected && styles.unitChipActive]}
                              >
                                <Text style={[styles.unitChipText, isSelected && styles.unitChipTextActive]}>
                                  {u}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </ScrollView>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, alignItems: 'center' }}>
                      <TextInput
                        value={it.hsnCode}
                        onChangeText={(val) => updateItem(idx, 'hsnCode', val)}
                        placeholder="HSN/SAC Code (Optional)"
                        placeholderTextColor="#94a3b8"
                        style={[styles.invoiceItemDescInput, { flex: 1, marginBottom: 0, paddingVertical: 6, fontSize: 11 }]}
                      />
                      <TouchableOpacity
                        onPress={() => handleOpenCatalogPicker(idx)}
                        style={styles.pickCatalogRowBtn}
                      >
                        <MaterialIcons name="inventory-2" size={13} color="#0284c7" />
                        <Text style={styles.pickCatalogRowText}>From Catalog</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 8, alignItems: 'center' }}>
                      {/* Qty Stepper */}
                      <View style={styles.invoiceQtyRow}>
                        <TouchableOpacity
                          onPress={() => {
                            hapticFeedback.light();
                            const newQ = Math.max(1, (Number(it.qty) || 1) - 1);
                            updateItem(idx, 'qty', newQ);
                          }}
                          style={styles.invoiceQtyBtn}
                        >
                          <MaterialIcons name="remove" size={14} color="#334155" />
                        </TouchableOpacity>
                        <TextInput
                          keyboardType="numeric"
                          value={it.qty.toString()}
                          onChangeText={(val) => updateItem(idx, 'qty', parseFloat(val) || 1)}
                          style={styles.invoiceQtyInput}
                        />
                        <TouchableOpacity
                          onPress={() => {
                            hapticFeedback.light();
                            const newQ = (Number(it.qty) || 0) + 1;
                            updateItem(idx, 'qty', newQ);
                          }}
                          style={styles.invoiceQtyBtn}
                        >
                          <MaterialIcons name="add" size={14} color="#334155" />
                        </TouchableOpacity>
                      </View>

                      {/* Unit Price Rate Input */}
                      <View style={styles.invoiceRateRow}>
                        <Text style={styles.invoiceRateSymbol}>₹</Text>
                        <TextInput
                          keyboardType="numeric"
                          value={it.unitPrice ? it.unitPrice.toString() : ''}
                          onChangeText={(val) => updateItem(idx, 'unitPrice', parseFloat(val) || 0)}
                          placeholder="Rate"
                          placeholderTextColor="#94a3b8"
                          style={styles.invoiceRateInput}
                        />
                      </View>

                      {/* Per-line GST rate — Vyapar "TAX in (%)" column */}
                      <View style={styles.invoiceRateRow}>
                        <MaterialIcons name="percent" size={13} color="#64748b" />
                        <TextInput
                          keyboardType="numeric"
                          value={it.gstRate != null ? String(it.gstRate) : ''}
                          onChangeText={(val) => updateItem(idx, 'gstRate', val === '' ? undefined : parseFloat(val) || 0)}
                          placeholder="GST %"
                          placeholderTextColor="#94a3b8"
                          style={styles.invoiceRateInput}
                        />
                      </View>
                    </View>
                  </View>
                );
              })}

              {/* Add item dashed button */}
              <TouchableOpacity onPress={addItemRow} style={styles.invoiceAddDashedBtn}>
                <MaterialIcons name="add-circle-outline" size={18} color="#059669" />
                <Text style={styles.invoiceAddDashedText}>Add Another Line Item</Text>
              </TouchableOpacity>

              {/* 3. Tax & State of Supply */}
              <View style={styles.vyaparBox}>
                <Text style={styles.inputLabel}>State of Supply & Tax Mode</Text>
                <View style={styles.taxTypeRow}>
                  <TouchableOpacity
                    onPress={() => {
                      hapticFeedback.light();
                      setTaxType('INTRA');
                    }}
                    style={[styles.taxTypeBtn, taxType === 'INTRA' && styles.taxTypeBtnActive]}
                  >
                    <Text style={[styles.taxTypeText, taxType === 'INTRA' && styles.taxTypeTextActive]}>
                      Intra-State (CGST + SGST)
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      hapticFeedback.light();
                      setTaxType('INTER');
                    }}
                    style={[styles.taxTypeBtn, taxType === 'INTER' && styles.taxTypeBtnActive]}
                  >
                    <Text style={[styles.taxTypeText, taxType === 'INTER' && styles.taxTypeTextActive]}>
                      Inter-State (IGST)
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.inputLabel, { marginTop: 12 }]}>GST Tax Rate</Text>
                <View style={styles.taxRateRow}>
                  {[0, 5, 12, 18, 28].map((rate) => (
                    <TouchableOpacity
                      key={rate}
                      onPress={() => {
                        hapticFeedback.light();
                        setTaxRate(rate);
                      }}
                      style={[styles.taxBtn, taxRate === rate && styles.taxBtnActive]}
                    >
                      <Text style={[styles.taxBtnText, taxRate === rate && styles.taxBtnTextActive]}>
                        {rate}%
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.inputLabel, { marginTop: 12 }]}>Discount (₹)</Text>
                <View style={styles.invoiceDiscountRow}>
                  <Text style={styles.invoiceRateSymbol}>₹</Text>
                  <TextInput
                    keyboardType="numeric"
                    value={discountValue}
                    onChangeText={setDiscountValue}
                    style={styles.invoiceDiscountInput}
                    placeholder="0.00"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              {/* 4. Payment Terms & Due Date (for Invoices) */}
              {formType === 'INVOICE' && (
                <View style={styles.vyaparBox}>
                  <Text style={styles.inputLabel}>Payment Terms & Due Status</Text>
                  <View style={styles.paymentStatusRow}>
                    {(['PAID', 'PARTIAL', 'UNPAID'] as const).map((st) => {
                      const isSelected = paymentStatus === st;
                      return (
                        <TouchableOpacity
                          key={st}
                          onPress={() => {
                            hapticFeedback.light();
                            setPaymentStatus(st);
                          }}
                          style={[styles.paymentStatusBtn, isSelected && styles.paymentStatusBtnActive]}
                        >
                          <Text style={[styles.paymentStatusText, isSelected && styles.paymentStatusTextActive]}>
                            {st === 'PAID' ? 'Fully Paid' : st === 'PARTIAL' ? 'Partially Paid' : 'Unpaid / Due'}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {paymentStatus === 'PARTIAL' && (
                    <View style={{ marginTop: 10 }}>
                      <Text style={styles.inputLabel}>Amount Received Now (₹)</Text>
                      <View style={styles.invoiceDiscountRow}>
                        <Text style={styles.invoiceRateSymbol}>₹</Text>
                        <TextInput
                          keyboardType="numeric"
                          value={amountPaidInput}
                          onChangeText={setAmountPaidInput}
                          style={styles.invoiceDiscountInput}
                          placeholder={`Enter amount (max ₹${formGrandTotal.toFixed(2)})`}
                          placeholderTextColor="#94a3b8"
                        />
                      </View>
                      <View style={styles.balanceDueNotice}>
                        <Text style={styles.balanceDueLabel}>Remaining Balance Due:</Text>
                        <Text style={styles.balanceDueVal}>₹{computedBalance.toFixed(2)}</Text>
                      </View>
                    </View>
                  )}

                  <Text style={[styles.inputLabel, { marginTop: 12 }]}>Due Date Terms</Text>
                  <View style={styles.dueDatePresetRow}>
                    {[
                      { label: 'Due Today', days: 0 },
                      { label: '7 Days', days: 7 },
                      { label: '15 Days', days: 15 },
                      { label: '30 Days', days: 30 },
                    ].map((d) => (
                      <TouchableOpacity
                        key={d.days}
                        onPress={() => {
                          hapticFeedback.light();
                          setDueDateDays(d.days);
                        }}
                        style={[styles.dueDateChip, dueDateDays === d.days && styles.dueDateChipActive]}
                      >
                        <Text style={[styles.dueDateChipText, dueDateDays === d.days && styles.dueDateChipTextActive]}>
                          {d.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* 5. Live Computed Summary */}
              <View style={styles.liveCalculationBox}>
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>Taxable Subtotal</Text>
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
                    <Text style={styles.calcLabel}>
                      {taxType === 'INTRA'
                        ? `CGST (${(taxRate / 2).toFixed(1)}%) + SGST (${(taxRate / 2).toFixed(1)}%)`
                        : `IGST (${taxRate}%)`}
                    </Text>
                    <Text style={styles.calcVal}>+₹{taxAmt.toFixed(2)}</Text>
                  </View>
                )}
                <View style={[styles.calcRow, styles.calcRowTotal]}>
                  <Text style={styles.calcTotalLabel}>Grand Total</Text>
                  <Text style={styles.calcTotalVal}>₹{formGrandTotal.toFixed(2)}</Text>
                </View>
                {formType === 'INVOICE' && paymentStatus !== 'PAID' && (
                  <View style={[styles.calcRow, { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#e2e8f0' }]}>
                    <Text style={[styles.calcLabel, { color: '#d97706', fontWeight: '700' }]}>Balance Due</Text>
                    <Text style={[styles.calcVal, { color: '#d97706', fontWeight: '900' }]}>
                      ₹{computedBalance.toFixed(2)}
                    </Text>
                  </View>
                )}
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
                    {formType === 'INVOICE' ? 'Generate GST Tax Invoice' : 'Save & Share Quotation'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Party / Customer Picker Modal */}
      <Modal
        visible={showCustomerPickerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCustomerPickerModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.pickerModalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Party / Customer</Text>
                <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  Pick from your customer directory or add party
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowCustomerPickerModal(false)}
                style={{ padding: 6, borderRadius: 16, backgroundColor: '#f1f5f9' }}
              >
                <MaterialIcons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.pickerSearchWrap}>
              <MaterialIcons name="search" size={18} color="#64748b" />
              <TextInput
                value={customerSearchQuery}
                onChangeText={setCustomerSearchQuery}
                placeholder="Search party by name, phone, or GSTIN..."
                placeholderTextColor="#94a3b8"
                style={styles.pickerSearchInput}
              />
              {customerSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setCustomerSearchQuery('')}>
                  <MaterialIcons name="clear" size={16} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {customersList
                .filter((c) => {
                  if (!customerSearchQuery) return true;
                  const q = customerSearchQuery.toLowerCase();
                  return (
                    (c.name && c.name.toLowerCase().includes(q)) ||
                    (c.phone && c.phone.includes(q)) ||
                    (c.gstin && c.gstin.toLowerCase().includes(q))
                  );
                })
                .map((c) => (
                  <TouchableOpacity
                    key={c.id || c.phone || c.name}
                    onPress={() => handleSelectParty(c)}
                    style={styles.partyPickerItem}
                    activeOpacity={0.7}
                  >
                    <View style={styles.partyPickerItemAvatar}>
                      <Text style={styles.partyPickerInitial}>
                        {(c.name || 'C').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.partyPickerItemName} numberOfLines={1}>
                        {c.name}
                      </Text>
                      <Text style={styles.partyPickerItemSub}>
                        {c.phone ? `+91 ${c.phone}` : 'No mobile'}
                        {c.city ? ` · ${c.city}` : ''}
                      </Text>
                      {c.gstin ? (
                        <Text style={styles.partyPickerGstin}>GSTIN: {c.gstin}</Text>
                      ) : null}
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
                  </TouchableOpacity>
                ))}

              {customersList.length === 0 && (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '600' }}>
                    No customers found in directory.
                  </Text>
                  <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                    Type the customer details manually in the invoice form.
                  </Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              onPress={() => {
                setShowCustomerPickerModal(false);
                handleClearParty();
              }}
              style={styles.pickerCloseBtn}
            >
              <Text style={styles.pickerCloseBtnText}>+ Enter New Party Manually</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Catalog Product Picker Modal */}
      <Modal
        visible={showCatalogPickerModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCatalogPickerModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.pickerModalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Item from Catalog</Text>
                <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                  Auto-fills description, price, unit, and HSN code
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowCatalogPickerModal(false)}
                style={{ padding: 6, borderRadius: 16, backgroundColor: '#f1f5f9' }}
              >
                <MaterialIcons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.pickerSearchWrap}>
              <MaterialIcons name="search" size={18} color="#64748b" />
              <TextInput
                value={catalogSearchQuery}
                onChangeText={setCatalogSearchQuery}
                placeholder="Search products in catalog..."
                placeholderTextColor="#94a3b8"
                style={styles.pickerSearchInput}
              />
              {catalogSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setCatalogSearchQuery('')}>
                  <MaterialIcons name="clear" size={16} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {catalogList
                .filter((p) => {
                  if (!catalogSearchQuery) return true;
                  const q = catalogSearchQuery.toLowerCase();
                  return (
                    (p.name && p.name.toLowerCase().includes(q)) ||
                    (p.category && p.category.toLowerCase().includes(q)) ||
                    (p.sku && p.sku.toLowerCase().includes(q))
                  );
                })
                .map((prod) => (
                  <TouchableOpacity
                    key={prod.id || prod.sku || prod.name}
                    onPress={() => handleSelectCatalogItem(prod)}
                    style={styles.catalogPickerItem}
                    activeOpacity={0.7}
                  >
                    <View style={styles.catalogPickerItemLeft}>
                      <Text style={styles.catalogPickerItemName} numberOfLines={1}>
                        {prod.name}
                      </Text>
                      <Text style={styles.catalogPickerItemCategory}>
                        {prod.category || 'General'}
                        {prod.sku ? ` · SKU: ${prod.sku}` : ''}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.catalogPickerItemPrice}>
                        ₹{Number(prod.price || 0).toFixed(2)}
                      </Text>
                      <Text style={styles.catalogPickerItemUnit}>
                        per {prod.unit || 'Pcs'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}

              {catalogList.length === 0 && (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: '#64748b', fontWeight: '600' }}>
                    No items in store catalog yet.
                  </Text>
                  <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                    Add products in the Catalog tab to quickly pick them here.
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
          const upiLink = storeInfo.upiId?.trim()
            ? `upi://pay?pa=${encodeURIComponent(storeInfo.upiId.trim())}&pn=${encodeURIComponent(
                storeInfo.businessName || 'Store'
              )}&am=${total.toFixed(2)}&tn=${encodeURIComponent(
                `Invoice ${inv.number}`
              )}&cu=INR`
            : '';
          const paymentDisplay = storeInfo.invoicePaymentDisplay || 'both';
          const showUpiQr =
            paymentDisplay !== 'bank_details' &&
            paymentDisplay !== 'none' &&
            Boolean(upiLink);
          const showBankDetails =
            paymentDisplay !== 'upi_qr' &&
            paymentDisplay !== 'none' &&
            Boolean(storeInfo.bankName || storeInfo.accountNumber);

          return (
            <View style={styles.previewModalSafe}>
              {/* Modal Top Bar with safe area padding */}
              <View
                style={[
                  styles.previewTopBar,
                  {
                    paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 20 : 12),
                    paddingBottom: 12,
                  },
                ]}
              >
                <TouchableOpacity
                  onPress={() => setSelectedInvoice(null)}
                  style={styles.previewBackBtn}
                  hitSlop={8}
                >
                  <MaterialIcons name="arrow-back" size={22} color="#0f172a" />
                </TouchableOpacity>

                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.previewBarTitle} numberOfLines={1}>
                    Tax Invoice #{inv.number}
                  </Text>
                  <Text style={styles.previewBarSub}>
                    {inv.customer?.name || 'Customer'} • {new Date(inv.createdAt).toLocaleDateString('en-IN')}
                  </Text>
                </View>

                {/* Quick actions in top bar */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedInvoice(null);
                      handleOpenEditInvoice(inv);
                    }}
                    style={styles.previewActionBtn}
                    hitSlop={8}
                  >
                    <MaterialIcons name="edit" size={18} color="#0A6847" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setSelectedInvoice(null)}
                    style={styles.previewActionBtn}
                    hitSlop={8}
                  >
                    <MaterialIcons name="close" size={20} color="#64748b" />
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView
                style={styles.previewScroll}
                contentContainerStyle={[styles.previewScrollContent, { paddingBottom: 24 }]}
                showsVerticalScrollIndicator={false}
              >
                {/* A4 Sheet Container */}
                <View style={styles.a4Sheet}>
                  {/* Header Row: Store Details & Tax Invoice Badge */}
                  <View style={styles.a4HeaderRow}>
                    <View style={{ flex: 1 }}>
                      {storeInfo.logoUrl ? (
                        <Image
                          source={{ uri: resolveAbsoluteLogoUrl(storeInfo.logoUrl) }}
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
                          ₹{(Number(inv.paidAmount) || 0).toFixed(2)}
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
                            ₹{(Number(inv.balance) || 0).toFixed(2)}
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

                  {/* Footer with UPI QR, Bank Account Details & Signature Stamp */}
                  <View style={styles.a4Footer}>
                    <View style={{ flex: 1 }}>
                      {showUpiQr || showBankDetails ? (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
                          {showUpiQr ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 4, backgroundColor: '#f8fafc', borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0' }}>
                              <QrCode
                                data={upiLink}
                                size={52}
                                style={[styles.qrImage, { backgroundColor: '#ffffff', width: 52, height: 52 }]}
                              />
                              <View>
                                <Text style={styles.qrTitle}>Scan & Pay via UPI</Text>
                                <Text style={styles.qrSub}>{storeInfo.upiId}</Text>
                              </View>
                            </View>
                          ) : null}

                          {showBankDetails ? (
                            <View style={styles.a4BankBox}>
                              <Text style={styles.a4BankTitle}>Bank Transfer (NEFT/RTGS)</Text>
                              {storeInfo.bankName ? (
                                <Text style={styles.a4BankText}>
                                  <Text style={styles.a4BankLabel}>Bank: </Text>
                                  {storeInfo.bankName}
                                </Text>
                              ) : null}
                              {storeInfo.accountHolderName ? (
                                <Text style={styles.a4BankText}>
                                  <Text style={styles.a4BankLabel}>A/C Name: </Text>
                                  {storeInfo.accountHolderName}
                                </Text>
                              ) : null}
                              {storeInfo.accountNumber ? (
                                <Text style={styles.a4BankText}>
                                  <Text style={styles.a4BankLabel}>A/C No: </Text>
                                  {storeInfo.accountNumber}
                                </Text>
                              ) : null}
                              {storeInfo.ifscCode ? (
                                <Text style={styles.a4BankText}>
                                  <Text style={styles.a4BankLabel}>IFSC: </Text>
                                  {storeInfo.ifscCode}
                                </Text>
                              ) : null}
                            </View>
                          ) : null}
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

                    <TouchableOpacity
                      onPress={() => setShowSigPad(true)}
                      activeOpacity={0.7}
                      style={styles.signatureCol}
                    >
                      {storeInfo.signatureUrl ? (
                        <SignaturePreview
                          uri={storeInfo.signatureUrl}
                          style={styles.sigImage}
                        />
                      ) : (
                        <View style={[styles.sigPlaceholder, { justifyContent: 'center', alignItems: 'center' }]}>
                          <Text style={{ fontSize: 7.5, color: '#059669', fontWeight: '700' }}>
                            ✍️ Tap to Sign
                          </Text>
                        </View>
                      )}
                      <View style={styles.signatureLine}>
                        <Text style={styles.sigCompanyText}>
                          For {storeInfo.businessName || 'Business'}
                        </Text>
                        <Text style={styles.sigRoleText}>Authorized Signatory</Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>

              </ScrollView>

              {/* Docked Sticky Bottom Action Bar */}
              <View
                style={[
                  styles.dockedBottomBar,
                  {
                    paddingBottom: Math.max(insets.bottom, 14),
                  },
                ]}
              >
                {/* Primary Button: WhatsApp */}
                <TouchableOpacity
                  onPress={() => handleShareWhatsApp(inv, true)}
                  style={styles.whatsAppPrimaryBtn}
                  activeOpacity={0.85}
                >
                  <Ionicons name="logo-whatsapp" size={20} color="#ffffff" />
                  <Text style={styles.whatsAppPrimaryText}>Share on WhatsApp</Text>
                </TouchableOpacity>

                {/* Secondary Actions Row */}
                <View style={styles.secondaryActionsRow}>
                  <TouchableOpacity
                    onPress={() => handleSharePdfInvoice(inv)}
                    style={styles.secondaryActionBtn}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="picture-as-pdf" size={17} color="#dc2626" />
                    <Text style={styles.secondaryActionText}>Export PDF</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => handlePrintInvoice(inv)}
                    style={styles.secondaryActionBtn}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="print" size={17} color="#4338ca" />
                    <Text style={styles.secondaryActionText}>Print</Text>
                  </TouchableOpacity>

                  {!isPaid && (
                    <TouchableOpacity
                      onPress={() => openPaymentSheet(inv)}
                      style={[styles.secondaryActionBtn, styles.secondaryActionBtnPay]}
                      accessibilityLabel="Record Payment"
                      activeOpacity={0.8}
                    >
                      <MaterialIcons name="payments" size={17} color="#059669" />
                      <Text style={[styles.secondaryActionText, { color: '#059669', fontWeight: '800' }]}>
                        Record Pay
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          );
        })()}
      </Modal>

      {/* 2. Partial-payment sheet — posts /api/commerce/invoices/[id]/payments
          with amount + method + UTR (same flow as the /invoice/[id] screen). */}
      <PaymentSheet
        visible={paySheetOpen}
        onClose={() => {
          setPaySheetOpen(false);
          setPaySheetInvoice(null);
        }}
        invoice={paySheetInvoice}
        onRecorded={(s) => {
          hapticFeedback.success();
          const sheetInv = paySheetInvoice;
          if (sheetInv && selectedInvoice?.id === sheetInv.id) {
            setSelectedInvoice({
              ...selectedInvoice,
              paidAmount: s.paid,
              balance: s.balance,
              status: s.status,
            });
          }
          // Refresh the invoice list + KPIs from the server's payment ledger.
          fetchBillingData();
        }}
      />

      {/* 3. Store Branding & GST Settings Modal */}
      <Modal
        visible={brandModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setBrandModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>GST Store Branding</Text>
              <TouchableOpacity onPress={() => setBrandModalOpen(false)}>
                <MaterialIcons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={{ paddingVertical: 12 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              <Text style={styles.inputLabel}>Business / Store Name</Text>
              <TextInput
                value={storeInfo.businessName}
                onChangeText={(v) => setStoreInfo((p) => ({ ...p, businessName: v }))}
                style={styles.modalInput}
                placeholder="e.g. Acme Enterprises Pvt Ltd"
              />

              <Text style={[styles.inputLabel, { marginTop: 10 }]}>GSTIN (Tax ID)</Text>
              <TextInput
                value={storeInfo.gstin}
                onChangeText={(v) => setStoreInfo((p) => ({ ...p, gstin: v.toUpperCase() }))}
                style={styles.modalInput}
                placeholder="e.g. 29ABCDE1234F1Z5"
                autoCapitalize="characters"
              />

              <Text style={[styles.inputLabel, { marginTop: 10 }]}>Payment Details on Invoices</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {[
                  { id: 'both', label: 'Both (QR + Bank)' },
                  { id: 'upi_qr', label: 'UPI QR Only' },
                  { id: 'bank_details', label: 'Bank Details Only' },
                  { id: 'none', label: 'None (Cash Only)' },
                ].map((opt) => {
                  const isSelected = (storeInfo.invoicePaymentDisplay || 'both') === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      onPress={() => setStoreInfo((p) => ({ ...p, invoicePaymentDisplay: opt.id as any }))}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: isSelected ? '#0f172a' : '#cbd5e1',
                        backgroundColor: isSelected ? '#0f172a' : '#f8fafc',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '600',
                          color: isSelected ? '#ffffff' : '#334155',
                        }}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.inputLabel, { marginTop: 10 }]}>UPI ID for Invoice QR Code</Text>
              <TextInput
                value={storeInfo.upiId}
                onChangeText={(v) => setStoreInfo((p) => ({ ...p, upiId: v }))}
                style={styles.modalInput}
                placeholder="e.g. business@okaxis"
                autoCapitalize="none"
              />

              {/* Bank Account Details */}
              <View style={{ marginTop: 12, padding: 10, backgroundColor: '#f8fafc', borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a', marginBottom: 8 }}>
                  🏦 Bank Account Details (for NEFT / RTGS)
                </Text>

                <Text style={styles.inputLabel}>Bank Name</Text>
                <TextInput
                  value={storeInfo.bankName || ''}
                  onChangeText={(v) => setStoreInfo((p) => ({ ...p, bankName: v }))}
                  style={styles.modalInput}
                  placeholder="e.g. HDFC Bank / State Bank of India"
                />

                <Text style={[styles.inputLabel, { marginTop: 8 }]}>Account Holder Name</Text>
                <TextInput
                  value={storeInfo.accountHolderName || ''}
                  onChangeText={(v) => setStoreInfo((p) => ({ ...p, accountHolderName: v }))}
                  style={styles.modalInput}
                  placeholder="e.g. Acme Enterprises Pvt Ltd"
                />

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                  <View style={{ flex: 1.2 }}>
                    <Text style={styles.inputLabel}>Account Number</Text>
                    <TextInput
                      value={storeInfo.accountNumber || ''}
                      onChangeText={(v) => setStoreInfo((p) => ({ ...p, accountNumber: v }))}
                      style={styles.modalInput}
                      placeholder="9876543210123"
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>IFSC Code</Text>
                    <TextInput
                      value={storeInfo.ifscCode || ''}
                      onChangeText={(v) => setStoreInfo((p) => ({ ...p, ifscCode: v.toUpperCase() }))}
                      style={styles.modalInput}
                      placeholder="HDFC0001234"
                      autoCapitalize="characters"
                    />
                  </View>
                </View>
              </View>

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
                      <View style={{ position: 'relative', width: '100%', height: '100%' }}>
                        <Image source={{ uri: storeInfo.logoUrl }} style={styles.pickedThumb} />
                        <TouchableOpacity
                          onPress={handleRemoveLogo}
                          style={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            backgroundColor: 'rgba(239, 68, 68, 0.9)',
                            borderRadius: 12,
                            padding: 3,
                          }}
                        >
                          <MaterialIcons name="close" size={14} color="#ffffff" />
                        </TouchableOpacity>
                      </View>
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
                  
                  {/* Signature Box Preview - Tappable to open pad */}
                  <TouchableOpacity
                    onPress={() => setShowSigPad(true)}
                    activeOpacity={0.8}
                    style={styles.brandPickBtn}
                  >
                    {storeInfo.signatureUrl ? (
                      <SignaturePreview
                        uri={storeInfo.signatureUrl}
                        style={styles.pickedThumb}
                      />
                    ) : (
                      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                        <MaterialIcons name="draw" size={22} color="#94a3b8" />
                        <Text style={styles.brandPickBtnText}>No signature uploaded</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Dual Action Buttons: Sign / Draw + Upload File */}
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                    <TouchableOpacity
                      onPress={() => setShowSigPad(true)}
                      style={[styles.sigActionBtn, { backgroundColor: '#e6f6f0', borderColor: '#a7d7c5' }]}
                    >
                      <MaterialIcons name="draw" size={13} color="#059669" />
                      <Text style={[styles.sigActionBtnText, { color: '#059669' }]}>
                        {storeInfo.signatureUrl ? 'Re-sign' : 'Sign'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handlePickSignature}
                      style={[styles.sigActionBtn, { backgroundColor: '#fff', borderColor: '#cbd5e1' }]}
                    >
                      <MaterialIcons name="upload-file" size={13} color="#4338ca" />
                      <Text style={[styles.sigActionBtnText, { color: '#4338ca' }]}>Upload</Text>
                    </TouchableOpacity>
                  </View>

                  {storeInfo.signatureUrl ? (
                    <TouchableOpacity
                      onPress={() => setStoreInfo((p) => ({ ...p, signatureUrl: '' }))}
                      style={{ marginTop: 4, alignItems: 'center' }}
                    >
                      <Text style={{ fontSize: 10, color: '#dc2626', fontWeight: '600' }}>
                        Remove Signature
                      </Text>
                    </TouchableOpacity>
                  ) : null}
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
                onPress={handleSaveBrandSettings}
                disabled={savingBrand}
                style={[styles.modalSubmitBtn, { marginTop: 18, opacity: savingBrand ? 0.6 : 1 }]}
              >
                {savingBrand ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitText}>Save Brand Settings</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>

        {/* Signature Drawing Pad Overlay - INSIDE Brand Modal for iOS/Android visibility */}
        {showSigPad && (
          <SignaturePadModal
            visible={showSigPad}
            onClose={() => setShowSigPad(false)}
            onSave={(dataUri) => {
              const updated = { ...storeInfo, signatureUrl: dataUri };
              setStoreInfo(updated);
              void storageSetItem('bos_store_branding', JSON.stringify(updated));
              void apiRequest(API_PATHS.commerceConfig, {
                method: 'PATCH',
                body: { signatureUrl: dataUri },
              }).catch(() => {});
              Alert.alert('Signature Saved ✓', 'Authorized digital signature recorded.');
            }}
            businessName={storeInfo.businessName}
          />
        )}
      </Modal>

      {/* Signature Drawing Pad Overlay - Outside Brand Modal fallback */}
      {!brandModalOpen && showSigPad && (
        <SignaturePadModal
          visible={showSigPad}
          onClose={() => setShowSigPad(false)}
          onSave={(dataUri) => {
            const updated = { ...storeInfo, signatureUrl: dataUri };
            setStoreInfo(updated);
            void storageSetItem('bos_store_branding', JSON.stringify(updated));
            void apiRequest(API_PATHS.commerceConfig, {
              method: 'PATCH',
              body: { signatureUrl: dataUri },
            }).catch(() => {});
            Alert.alert('Signature Saved ✓', 'Authorized digital signature recorded.');
          }}
          businessName={storeInfo.businessName}
        />
      )}
      {/* Custom date range sheet — Vyapar period filter */}
      <DateRangeSheet
        visible={rangeSheetOpen}
        onClose={() => setRangeSheetOpen(false)}
        onApply={(range) => {
          setCustomRange(range);
          setPeriodKey('custom');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  periodChipsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  periodChip: { minHeight: 40, paddingHorizontal: 14, borderRadius: 999, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  periodChipWide: { maxWidth: 220, paddingHorizontal: 12 },
  periodChipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  periodChipText: { fontSize: 13, fontWeight: '700', color: '#334155' },
  periodChipTextActive: { color: '#ffffff' },
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
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: 8,
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
  invoiceCustomerCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  invoiceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 10,
    minHeight: 44,
  },
  invoiceCardInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    paddingVertical: 8,
  },
  invoiceCountryBadge: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 6,
  },
  invoiceCountryText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  invoiceItemCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  invoiceItemDescInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '500',
  },
  invoiceQtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  invoiceQtyBtn: {
    padding: 8,
  },
  invoiceQtyInput: {
    width: 38,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    paddingVertical: 6,
  },
  invoiceRateRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  invoiceRateSymbol: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748b',
    marginRight: 4,
  },
  invoiceRateInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    paddingVertical: 6,
  },
  invoiceAddDashedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#a7f3d0',
    backgroundColor: '#ecfdf5',
    marginVertical: 10,
  },
  invoiceAddDashedText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
  },
  invoiceDiscountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 10,
    minHeight: 44,
  },
  invoiceDiscountInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    paddingVertical: 8,
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
  a4BankBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 6,
    minWidth: 140,
  },
  a4BankTitle: {
    fontSize: 8,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 2,
  },
  a4BankText: {
    fontSize: 7.5,
    color: '#334155',
    lineHeight: 11,
  },
  a4BankLabel: {
    fontWeight: '700',
    color: '#64748b',
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
  sigActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  sigActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sectionHeaderBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  partyPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  partyPickerBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  selectedPartyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 12,
    padding: 12,
  },
  selectedPartyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  selectedPartyAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedPartyName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065f46',
  },
  selectedPartyPhone: {
    fontSize: 11,
    color: '#059669',
    marginTop: 1,
  },
  selectedPartyDetail: {
    fontSize: 10,
    color: '#047857',
    marginTop: 2,
  },
  selectedPartyGstin: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065f46',
    marginTop: 2,
  },
  changePartyBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  changePartyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
  },
  addFromCatalogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#e0f2fe',
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  addFromCatalogText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7',
  },
  unitChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  unitChipActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  unitChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
  },
  unitChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  pickCatalogRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  pickCatalogRowText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0284c7',
  },
  vyaparBox: {
    marginTop: 14,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  taxTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  taxTypeBtn: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  taxTypeBtnActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  taxTypeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  taxTypeTextActive: {
    color: '#ffffff',
  },
  paymentStatusRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  paymentStatusBtn: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  paymentStatusBtnActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  paymentStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  paymentStatusTextActive: {
    color: '#ffffff',
  },
  balanceDueNotice: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 8,
    borderRadius: 8,
    marginTop: 6,
  },
  balanceDueLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400e',
  },
  balanceDueVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#b45309',
  },
  dueDatePresetRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  dueDateChip: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  dueDateChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  dueDateChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  dueDateChipTextActive: {
    color: '#ffffff',
  },
  pickerModalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  pickerSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 12,
  },
  pickerSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    padding: 0,
  },
  partyPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  partyPickerItemAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  partyPickerInitial: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0284c7',
  },
  partyPickerItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  partyPickerItemSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  partyPickerGstin: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '600',
    marginTop: 1,
  },
  pickerCloseBtn: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  pickerCloseBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  catalogPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  catalogPickerItemLeft: {
    flex: 1,
    paddingRight: 10,
  },
  catalogPickerItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  catalogPickerItemCategory: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  catalogPickerItemPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
  },
  catalogPickerItemUnit: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 1,
  },
});

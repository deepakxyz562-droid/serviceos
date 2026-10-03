/**
 * Edit Invoice screen — 1:1 match with 10 reference screenshots.
 * Features:
 * - Top doc type segmented pills: Tax Invoice | Bill of Supply | Simple Bill
 * - Card: INV0001 TAX INVOICE > (navigates to Invoice Info subscreen)
 * - Card: Templates with miniature thumbnail
 * - Card: Connected Bill From & Bill To cards with vertical dotted guide
 * - Card: Items card with line items & dynamic GST/Taxable amount (Tax Invoice mode)
 * - Card: Adjustment (Discount & Shipping fee)
 * - Card: Currency (opens Currency picker modal with 150+ countries)
 * - Card: Payment Method (leads to Add Payments subscreen)
 * - Card: Signature (leads to Add Signature subscreen & signature sheet)
 * - Card: Terms or Notes (leads to Add Terms subscreen with checkboxes)
 * - Card: Attachments (opens Attachments bottom sheet)
 * - Card: Mark as (opens Mark as dialog with Unpaid, Paid, Partially Paid)
 * - Card: Show 'PAID' Stamp on Invoice toggle switch
 * - Card: Delete Invoice
 * - Sticky bottom bar: [ Preview ] and [ Save ]
 */
import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Modal,
  Image,
  BackHandler,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useAppStore } from "@/store/app";
import { api, apiPatch, apiDelete } from "@/api/client";
import { formatCurrency } from "@/lib/format";
import { WORLD_CURRENCIES, type CurrencyItem } from "@/lib/currencies";
import { PRESET_TERMS } from "@/lib/preset-terms";
import { MaterialIcons, Feather, FontAwesome5, Ionicons } from "@expo/vector-icons";

interface Item {
  description: string;
  qty: string;
  unitPrice: string;
}

type Subview = "main" | "invoice-info" | "payments" | "signature" | "terms";
type DocTypeTab = "TAX_INVOICE" | "BILL_OF_SUPPLY" | "SIMPLE_BILL";

export default function InvoiceEditScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const business = useAppStore((s) => s.business);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [inv, setInv] = useState<any | null>(null);

  // Subview navigation
  const [subview, setSubview] = useState<Subview>("main");

  // Form fields
  const [docTypeTab, setDocTypeTab] = useState<DocTypeTab>("TAX_INVOICE");
  const [invoiceNumber, setInvoiceNumber] = useState("INV0001");
  const [invoiceTitle, setInvoiceTitle] = useState("TAX INVOICE");
  const [poNumber, setPoNumber] = useState("");
  const [createdOn, setCreatedOn] = useState("02/10/2026");
  const [dueTerms, setDueTerms] = useState("Due on receipt");
  const [dueDate, setDueDate] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("classic-corporate-blue");

  // Parties
  const [clientName, setClientName] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);

  // Items
  const [items, setItems] = useState<Item[]>([{ description: "Service Work", qty: "1", unitPrice: "0" }]);

  // Adjustments
  const [showAdjustments, setShowAdjustments] = useState(false);
  const [discountValue, setDiscountValue] = useState("0");
  const [discountType, setDiscountType] = useState<"AMOUNT" | "PERCENT">("AMOUNT");
  const [taxRate, setTaxRate] = useState("18");
  const [shippingFee, setShippingFee] = useState("0");

  // Extended Settings
  const [currencyCode, setCurrencyCode] = useState(business?.currency || "INR");
  const [currencySymbol, setCurrencySymbol] = useState(business?.currencySymbol || "₹");
  const [paymentsList, setPaymentsList] = useState<string[]>([]);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [selectedTerms, setSelectedTerms] = useState<string[]>([
    "Payment due within 30 days unless otherwise agreed.",
    "Please quote invoice number when making payment.",
  ]);
  const [attachments, setAttachments] = useState<string[]>([]);
  const [status, setStatus] = useState<"UNPAID" | "PAID" | "PARTIALLY_PAID">("UNPAID");
  const [showPaidStamp, setShowPaidStamp] = useState(true);

  // Modals
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);
  const [currencySearch, setCurrencySearch] = useState("");
  const [tempSelectedCurrency, setTempSelectedCurrency] = useState<CurrencyItem | null>(null);

  const [markAsModalVisible, setMarkAsModalVisible] = useState(false);
  const [tempStatus, setTempStatus] = useState<"UNPAID" | "PAID" | "PARTIALLY_PAID">("UNPAID");

  const [attachmentsSheetVisible, setAttachmentsSheetVisible] = useState(false);
  const [createPaymentModalVisible, setCreatePaymentModalVisible] = useState(false);
  const [tempPaymentText, setTempPaymentText] = useState("");

  const [signatureSheetVisible, setSignatureSheetVisible] = useState(false);
  const [createTermModalVisible, setCreateTermModalVisible] = useState(false);
  const [tempCustomTerm, setTempCustomTerm] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<{ invoice: any }>(`/api/invoices/${params.id}`);
      const invoice = r.invoice;
      setInv(invoice);
      setInvoiceNumber(invoice.number || "INV0001");
      setDueDate(invoice.dueDate ? invoice.dueDate.split("T")[0] : "");
      setStatus(invoice.status === "PAID" ? "PAID" : invoice.status === "PARTIALLY_PAID" ? "PARTIALLY_PAID" : "UNPAID");
      setDiscountValue(String(invoice.discountValue || 0));
      setDiscountType(invoice.discountType || "AMOUNT");
      setTaxRate(String(invoice.taxRate ?? 18));
      setCustomerId(invoice.customerId || null);
      setClientName(invoice.customer?.name || "Valued Client");

      if (invoice.items && invoice.items.length > 0) {
        setItems(
          invoice.items.map((it: any) => ({
            description: it.description,
            qty: String(it.qty),
            unitPrice: String(it.unitPrice),
          }))
        );
      }

      let foundCurrency = business?.currency || "INR";
      let foundSymbol = business?.currencySymbol || "₹";

      if (invoice.notes) {
        try {
          if (invoice.notes.startsWith("{") && invoice.notes.endsWith("}")) {
            const meta = JSON.parse(invoice.notes);
            if (meta.title) setInvoiceTitle(meta.title);
            if (meta.docTypeSegment) setDocTypeTab(meta.docTypeSegment);
            if (meta.poNumber) setPoNumber(meta.poNumber);
            if (meta.dueTerms) setDueTerms(meta.dueTerms);
            if (meta.terms && Array.isArray(meta.terms)) setSelectedTerms(meta.terms);
            if (meta.signature) setSignatureData(meta.signature);
            if (meta.payments && Array.isArray(meta.payments)) setPaymentsList(meta.payments);
            if (meta.attachments && Array.isArray(meta.attachments)) setAttachments(meta.attachments);
            if (typeof meta.showPaidStamp === "boolean") setShowPaidStamp(meta.showPaidStamp);
            if (meta.shippingFee) setShippingFee(String(meta.shippingFee));
            if (meta.currencyCode) foundCurrency = meta.currencyCode;
            if (meta.currencySymbol) foundSymbol = meta.currencySymbol;
          }
        } catch {}
      }

      setCurrencyCode(foundCurrency);
      setCurrencySymbol(foundSymbol);

      if (invoice.pdfTemplate) {
        const tpl = invoice.pdfTemplate.includes(":")
          ? invoice.pdfTemplate.split(":").pop()!
          : invoice.pdfTemplate;
        setSelectedTemplateId(tpl);
      }
    } catch (e: any) {
      Alert.alert("Failed", e.message || "Could not load invoice");
    } finally {
      setLoading(false);
    }
  }, [params.id, business?.currency, business?.currencySymbol]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleBack = useCallback(() => {
    if (subview !== "main") {
      setSubview("main");
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else if (params.id) {
      router.replace(`/invoice/${params.id}`);
    } else {
      router.replace("/(tabs)/invoices");
    }
  }, [subview, params.id, router]);

  useEffect(() => {
    const onBackPress = () => {
      if (subview !== "main") {
        setSubview("main");
        return true;
      }
      handleBack();
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [subview, handleBack]);

  // Segment Tab switch
  function handleSegmentChange(tab: DocTypeTab) {
    setDocTypeTab(tab);
    if (tab === "TAX_INVOICE") {
      setInvoiceTitle("TAX INVOICE");
      setTaxRate("18");
    } else if (tab === "BILL_OF_SUPPLY") {
      setInvoiceTitle("BILL OF SUPPLY");
      setTaxRate("0");
    } else {
      setInvoiceTitle("INVOICE");
      setTaxRate("0");
    }
  }

  // Financial calculations
  const isTaxActive = docTypeTab === "TAX_INVOICE" && parseFloat(taxRate) > 0;
  const itemsSubtotal = items.reduce(
    (sum, it) => sum + (parseFloat(it.qty) || 0) * (parseFloat(it.unitPrice) || 0),
    0
  );
  const parsedDiscount = parseFloat(discountValue) || 0;
  const discountAmount = discountType === "PERCENT"
    ? (itemsSubtotal * parsedDiscount) / 100
    : Math.min(itemsSubtotal, parsedDiscount);
  const taxableAmount = Math.max(0, itemsSubtotal - discountAmount);
  const gstAmount = isTaxActive ? (taxableAmount * (parseFloat(taxRate) || 0)) / 100 : 0;
  const grandTotal = taxableAmount + gstAmount + (parseFloat(shippingFee) || 0);

  function updateItem(idx: number, field: keyof Item, value: string) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, { description: "", qty: "1", unitPrice: "0" }]);
  }

  function removeItem(idx: number) {
    if (items.length <= 1) {
      Alert.alert("Notice", "Invoice must have at least one line item");
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  // Pick image for signature
  async function pickSignatureImage(fromCamera = false) {
    const { status } = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Camera or photo library permission is required");
      return;
    }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [3, 1], quality: 0.8, base64: true })
      : await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [3, 1], quality: 0.8, base64: true });

    if (!result.canceled && result.assets?.[0]?.base64) {
      setSignatureData(`data:image/jpeg;base64,${result.assets[0].base64}`);
      setSignatureSheetVisible(false);
      Alert.alert("Success", "Signature attached");
    }
  }

  // Pick attachments
  async function pickAttachment(fromCamera = false) {
    const { status } = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Permission required to access media");
      return;
    }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsMultipleSelection: true });

    if (!result.canceled && result.assets) {
      const names = result.assets.map((a, i) => a.fileName || `Attachment-${attachments.length + i + 1}.jpg`);
      setAttachments((prev) => [...prev, ...names]);
      setAttachmentsSheetVisible(false);
      Alert.alert("Attached", `${names.length} file(s) attached`);
    }
  }

  // Save changes to backend
  async function handleSave(thenPreview = false) {
    if (items.length === 0) {
      Alert.alert("Error", "Please add at least one line item");
      return;
    }
    setSaving(true);
    try {
      const metadata = {
        title: invoiceTitle,
        docTypeSegment: docTypeTab,
        poNumber,
        dueTerms,
        terms: selectedTerms,
        signature: signatureData,
        signatureDataUrl: signatureData,
        payments: paymentsList,
        attachments,
        showPaidStamp,
        shippingFee: parseFloat(shippingFee) || 0,
        currencyCode,
        currencySymbol,
      };

      await apiPatch(`/api/invoices/${params.id}`, {
        number: invoiceNumber,
        customerId: customerId || undefined,
        items: items.map((i) => ({
          description: i.description,
          qty: parseFloat(i.qty) || 0,
          unitPrice: parseFloat(i.unitPrice) || 0,
        })),
        discountValue: parseFloat(discountValue) || 0,
        discountType,
        taxRate: isTaxActive ? parseFloat(taxRate) || 0 : 0,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        notes: JSON.stringify(metadata),
        status,
        pdfTemplate: `${docTypeTab}:${selectedTemplateId}`,
      });

      // Update business currency and immediately sync Zustand store
      try {
        const bizRes = await apiPatch("/api/business/onboarding", {
          currency: currencyCode,
          currencySymbol,
        });
        if (bizRes?.business) {
          useAppStore.getState().setBusiness(bizRes.business);
        } else {
          const curBiz = useAppStore.getState().business;
          useAppStore.getState().setBusiness({
            ...(curBiz as any),
            currency: currencyCode,
            currencySymbol,
          });
        }
      } catch (err) {
        console.warn("Could not patch business currency:", err);
      }

      if (thenPreview) {
        router.replace(`/invoice/${params.id}`);
      } else {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace(`/invoice/${params.id}`);
        }
      }
    } catch (e: any) {
      Alert.alert("Save failed", e.message || "Could not update invoice");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    Alert.alert("Delete Invoice", `Are you sure you want to permanently delete ${invoiceNumber}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeleting(true);
          try {
            await apiDelete(`/api/invoices/${params.id}`);
            router.replace("/(tabs)/invoices");
          } catch (e: any) {
            Alert.alert("Failed", e.message);
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <ActivityIndicator size="large" color="#2563eb" />
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SUBSCREEN: Invoice Info (matches 13.02.17.jpeg)
  // ─────────────────────────────────────────────────────────────────────────────
  if (subview === "invoice-info") {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={() => setSubview("main")} style={styles.backBtn}>
            <MaterialIcons name="arrow-back-ios" size={20} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.subHeaderTitle}>Invoice Info</Text>
          <TouchableOpacity
            style={styles.subHeaderSaveBtn}
            onPress={() => setSubview("main")}
          >
            <Text style={styles.subHeaderSaveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
          {/* Card 1 */}
          <View style={styles.infoCard}>
            <Text style={styles.inputLabel}>
              Invoice Number <Text style={{ color: "#ef4444" }}>*</Text>
            </Text>
            <TextInput
              style={styles.textInput}
              value={invoiceNumber}
              onChangeText={setInvoiceNumber}
              placeholder="INV0001"
            />

            <Text style={styles.inputLabel}>Invoice Title</Text>
            <TextInput
              style={styles.textInput}
              value={invoiceTitle}
              onChangeText={setInvoiceTitle}
              placeholder="TAX INVOICE"
            />

            <Text style={styles.inputLabel}>P.O. Number</Text>
            <TextInput
              style={styles.textInput}
              value={poNumber}
              onChangeText={setPoNumber}
              placeholder="Optional"
              placeholderTextColor="#94a3b8"
            />
          </View>

          {/* Card 2 */}
          <View style={styles.infoCard}>
            <Text style={styles.inputLabel}>
              Created On <Text style={{ color: "#ef4444" }}>*</Text>
            </Text>
            <View style={styles.datePickerRow}>
              <TextInput
                style={[styles.textInput, { flex: 1, marginBottom: 0 }]}
                value={createdOn}
                onChangeText={setCreatedOn}
                placeholder="DD/MM/YYYY"
              />
              <MaterialIcons name="chevron-right" size={20} color="#94a3b8" style={{ marginLeft: 8 }} />
            </View>

            <Text style={[styles.inputLabel, { marginTop: 14 }]}>Due Terms</Text>
            <TouchableOpacity
              style={styles.datePickerRow}
              onPress={() => {
                Alert.alert("Select Due Terms", "", [
                  { text: "Due on receipt", onPress: () => setDueTerms("Due on receipt") },
                  { text: "Net 7 Days", onPress: () => setDueTerms("Net 7 Days") },
                  { text: "Net 15 Days", onPress: () => setDueTerms("Net 15 Days") },
                  { text: "Net 30 Days", onPress: () => setDueTerms("Net 30 Days") },
                  { text: "Net 60 Days", onPress: () => setDueTerms("Net 60 Days") },
                ]);
              }}
            >
              <Text style={styles.textInputValue}>{dueTerms}</Text>
              <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SUBSCREEN: Add Payments (matches 13.00.31.jpeg)
  // ─────────────────────────────────────────────────────────────────────────────
  if (subview === "payments") {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={() => setSubview("main")} style={styles.backBtn}>
            <MaterialIcons name="arrow-back-ios" size={20} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.subHeaderTitle}>Add Payments</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16 }}>
          <TouchableOpacity
            style={styles.createBtnCard}
            onPress={() => {
              setTempPaymentText("");
              setCreatePaymentModalVisible(true);
            }}
          >
            <Text style={styles.createBtnText}>+ Create Payment</Text>
          </TouchableOpacity>

          <Text style={styles.sectionHeading}>All Payments</Text>

          {paymentsList.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialIcons name="credit-card" size={40} color="#cbd5e1" />
              <Text style={styles.emptyText}>No payment instructions added</Text>
            </View>
          ) : (
            paymentsList.map((p, idx) => (
              <View key={idx} style={styles.listItemCard}>
                <Text style={styles.listItemText}>{p}</Text>
                <TouchableOpacity
                  onPress={() => setPaymentsList((prev) => prev.filter((_, i) => i !== idx))}
                  style={{ padding: 4 }}
                >
                  <MaterialIcons name="delete-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>

        {/* Modal: Create Payment Bottom Sheet */}
        <Modal
          visible={createPaymentModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setCreatePaymentModalVisible(false)}
        >
          <View style={styles.sheetBackdrop}>
            <View style={styles.sheetCard}>
              <View style={styles.sheetTopBar}>
                <Text style={styles.sheetTitle}>Payment</Text>
                <TouchableOpacity onPress={() => setCreatePaymentModalVisible(false)}>
                  <MaterialIcons name="close" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.multilineInput}
                multiline
                numberOfLines={4}
                maxLength={500}
                placeholder="Details"
                placeholderTextColor="#94a3b8"
                value={tempPaymentText}
                onChangeText={setTempPaymentText}
              />

              <View style={styles.charCounterRow}>
                <TouchableOpacity
                  onPress={() =>
                    setTempPaymentText(
                      `Bank: State Bank of India\nA/C: 123456789012\nIFSC: SBIN0001234\nUPI: ${business?.phone || "business"}@upi`
                    )
                  }
                >
                  <MaterialIcons name="insert-chart-outlined" size={20} color="#2563eb" />
                </TouchableOpacity>
                <Text style={styles.charCounterText}>{tempPaymentText.length}/500</Text>
              </View>

              <TouchableOpacity
                style={styles.sheetSaveBtn}
                onPress={() => {
                  if (tempPaymentText.trim()) {
                    setPaymentsList((prev) => [...prev, tempPaymentText.trim()]);
                    setCreatePaymentModalVisible(false);
                  }
                }}
              >
                <Text style={styles.sheetSaveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SUBSCREEN: Add Signature (matches 13.00.15.jpeg)
  // ─────────────────────────────────────────────────────────────────────────────
  if (subview === "signature") {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={() => setSubview("main")} style={styles.backBtn}>
            <MaterialIcons name="arrow-back-ios" size={20} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.subHeaderTitle}>Add Signature</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16 }}>
          <TouchableOpacity
            style={styles.createBtnCard}
            onPress={() => setSignatureSheetVisible(true)}
          >
            <Text style={styles.createBtnText}>+ Create Signature</Text>
          </TouchableOpacity>

          <Text style={styles.sectionHeading}>All Signatures</Text>

          {!signatureData ? (
            <View style={styles.signatureEmptyWrap}>
              <MaterialIcons name="history-edu" size={56} color="#cbd5e1" />
              <Text style={styles.emptyText}>No signature added</Text>
            </View>
          ) : (
            <View style={styles.signatureCardActive}>
              <View style={styles.signatureCardTop}>
                <Text style={styles.signatureCardStatus}>Active Signature</Text>
                <TouchableOpacity onPress={() => setSignatureData(null)}>
                  <MaterialIcons name="delete-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
              <Image source={{ uri: signatureData }} style={styles.signaturePreviewImg} resizeMode="contain" />
            </View>
          )}
        </ScrollView>

        {/* Bottom Sheet Modal matching 13.00.15.jpeg */}
        <Modal
          visible={signatureSheetVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setSignatureSheetVisible(false)}
        >
          <View style={styles.sheetBackdrop}>
            <View style={styles.sheetCard}>
              <View style={styles.sheetTopBar}>
                <Text style={styles.sheetTitle}>Signature</Text>
                <TouchableOpacity onPress={() => setSignatureSheetVisible(false)}>
                  <MaterialIcons name="close" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.sheetOptionRow}
                onPress={() => {
                  setSignatureSheetVisible(false);
                  Alert.prompt
                    ? Alert.prompt("Sign Now", "Enter your name to sign", (name) => {
                        if (name) {
                          setSignatureData(`https://via.placeholder.com/200x60.png?text=${encodeURIComponent(name)}`);
                        }
                      })
                    : pickSignatureImage(false);
                }}
              >
                <MaterialIcons name="draw" size={22} color="#2563eb" style={{ marginRight: 14 }} />
                <Text style={styles.sheetOptionText}>Sign Now</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.sheetOptionRow} onPress={() => pickSignatureImage(false)}>
                <MaterialIcons name="image" size={22} color="#10b981" style={{ marginRight: 14 }} />
                <Text style={styles.sheetOptionText}>Choose from Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.sheetOptionRow} onPress={() => pickSignatureImage(true)}>
                <MaterialIcons name="photo-camera" size={22} color="#8b5cf6" style={{ marginRight: 14 }} />
                <Text style={styles.sheetOptionText}>Take Photo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SUBSCREEN: Add Terms (matches 13.00.53.jpeg)
  // ─────────────────────────────────────────────────────────────────────────────
  if (subview === "terms") {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={() => setSubview("main")} style={styles.backBtn}>
            <MaterialIcons name="arrow-back-ios" size={20} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.subHeaderTitle}>Add Terms</Text>
          <TouchableOpacity
            style={styles.subHeaderSaveBtn}
            onPress={() => setSubview("main")}
          >
            <Text style={styles.subHeaderSaveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16 }}>
          <TouchableOpacity
            style={styles.createBtnCard}
            onPress={() => {
              setTempCustomTerm("");
              setCreateTermModalVisible(true);
            }}
          >
            <Text style={styles.createBtnText}>+ Create Term</Text>
          </TouchableOpacity>

          <Text style={styles.sectionHeading}>All Terms or Notes</Text>

          {PRESET_TERMS.map((term, idx) => {
            const isChecked = selectedTerms.includes(term);
            return (
              <TouchableOpacity
                key={idx}
                style={[styles.termCard, isChecked && styles.termCardChecked]}
                onPress={() => {
                  if (isChecked) {
                    setSelectedTerms((prev) => prev.filter((t) => t !== term));
                  } else {
                    setSelectedTerms((prev) => [...prev, term]);
                  }
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.checkboxBox, isChecked && styles.checkboxBoxChecked]}>
                  {isChecked && <MaterialIcons name="check" size={16} color="#ffffff" />}
                </View>
                <Text style={styles.termText}>{term}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Modal
          visible={createTermModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setCreateTermModalVisible(false)}
        >
          <View style={styles.modalBackdropCenter}>
            <View style={styles.dialogCard}>
              <Text style={styles.dialogTitle}>Create Term</Text>
              <TextInput
                style={[styles.textInput, { height: 80, textAlignVertical: "top" }]}
                multiline
                value={tempCustomTerm}
                onChangeText={setTempCustomTerm}
                placeholder="Enter custom term or note..."
              />
              <View style={styles.dialogActionRow}>
                <TouchableOpacity
                  style={styles.dialogBtnCancel}
                  onPress={() => setCreateTermModalVisible(false)}
                >
                  <Text style={styles.dialogBtnCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dialogBtnSave}
                  onPress={() => {
                    if (tempCustomTerm.trim()) {
                      setSelectedTerms((prev) => [...prev, tempCustomTerm.trim()]);
                      setCreateTermModalVisible(false);
                    }
                  }}
                >
                  <Text style={styles.dialogBtnSaveText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // MAIN VIEW (matches 12.59.20.jpeg, 12.59.39.jpeg, 13.01.14.jpeg)
  // ─────────────────────────────────────────────────────────────────────────────
  const filteredCurrencies = WORLD_CURRENCIES.filter(
    (c) =>
      c.country.toLowerCase().includes(currencySearch.toLowerCase()) ||
      c.code.toLowerCase().includes(currencySearch.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {/* Sticky Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <MaterialIcons name="arrow-back-ios" size={20} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Invoice</Text>
        <View style={styles.headerRight}>
          <MaterialIcons name="star" size={22} color="#f59e0b" style={{ marginRight: 10 }} />
          <TouchableOpacity onPress={handleDelete}>
            <MaterialIcons name="more-vert" size={22} color="#64748b" />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 14, paddingBottom: 120 }}>
          {/* Document Type Segmented Tabs */}
          <View style={styles.segmentContainer}>
            <TouchableOpacity
              style={[styles.segmentBtn, docTypeTab === "TAX_INVOICE" && styles.segmentBtnActive]}
              onPress={() => handleSegmentChange("TAX_INVOICE")}
            >
              <Text style={[styles.segmentText, docTypeTab === "TAX_INVOICE" && styles.segmentTextActive]}>
                Tax Invoice
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.segmentBtn, docTypeTab === "BILL_OF_SUPPLY" && styles.segmentBtnActive]}
              onPress={() => handleSegmentChange("BILL_OF_SUPPLY")}
            >
              <Text style={[styles.segmentText, docTypeTab === "BILL_OF_SUPPLY" && styles.segmentTextActive]}>
                Bill of Supply
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.segmentBtn, docTypeTab === "SIMPLE_BILL" && styles.segmentBtnActive]}
              onPress={() => handleSegmentChange("SIMPLE_BILL")}
            >
              <Text style={[styles.segmentText, docTypeTab === "SIMPLE_BILL" && styles.segmentTextActive]}>
                Simple Bill
              </Text>
            </TouchableOpacity>
          </View>

          {/* Card: Invoice Header (INV0001 TAX INVOICE >) */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => setSubview("invoice-info")}
            activeOpacity={0.8}
          >
            <View>
              <Text style={styles.invNumberBig}>{invoiceNumber}</Text>
              <Text style={styles.dueTermsText}>{dueTerms}</Text>
            </View>
            <View style={styles.cardActionRight}>
              <Text style={styles.cardActionLabel}>{invoiceTitle}</Text>
              <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
            </View>
          </TouchableOpacity>

          {/* Card: Templates */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/customize?id=${params.id}&type=invoice`)}
            activeOpacity={0.8}
          >
            <View style={styles.cardIconRow}>
              <MaterialIcons name="dashboard" size={22} color="#475569" style={{ marginRight: 12 }} />
              <Text style={styles.cardTitle}>Templates</Text>
            </View>
            <View style={styles.cardActionRight}>
              <View style={styles.templateThumbMini}>
                <View style={styles.templateThumbHeader} />
                <View style={styles.templateThumbLine} />
                <View style={[styles.templateThumbLine, { width: 14 }]} />
              </View>
              <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
            </View>
          </TouchableOpacity>

          {/* Card: Connected Bill From & Bill To */}
          <View style={styles.partiesCard}>
            <TouchableOpacity
              style={styles.partyRow}
              onPress={() => router.push("/(tabs)/more")}
            >
              <View style={[styles.partyIconWrap, { backgroundColor: "#eff6ff" }]}>
                <MaterialIcons name="badge" size={18} color="#2563eb" />
              </View>
              <View style={styles.partyTextCol}>
                <Text style={styles.partyLabel}>Bill From</Text>
                <Text style={styles.partyName} numberOfLines={1}>
                  {business?.name || "Add Business"}
                </Text>
              </View>
              <View style={styles.partyAddIcon}>
                <MaterialIcons name="add" size={18} color="#ffffff" />
              </View>
            </TouchableOpacity>

            <View style={styles.connectingLineWrap}>
              <View style={styles.connectingDot} />
              <View style={styles.connectingDot} />
              <View style={styles.connectingDot} />
            </View>

            <TouchableOpacity
              style={styles.partyRow}
              onPress={() => router.push("/(tabs)/clients")}
            >
              <View style={[styles.partyIconWrap, { backgroundColor: "#ffedd5" }]}>
                <MaterialIcons name="people" size={18} color="#ea580c" />
              </View>
              <View style={styles.partyTextCol}>
                <Text style={styles.partyLabel}>Bill To</Text>
                <Text style={styles.partyName} numberOfLines={1}>
                  {clientName || "Add Clients"}
                </Text>
              </View>
              <View style={styles.partyAddIcon}>
                <MaterialIcons name="add" size={18} color="#ffffff" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Card: Items Section */}
          <View style={styles.card}>
            <View style={styles.itemsHeaderRow}>
              <View style={styles.cardIconRow}>
                <View style={[styles.partyIconWrap, { backgroundColor: "#dcfce7", marginRight: 10 }]}>
                  <MaterialIcons name="receipt-long" size={18} color="#16a34a" />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Items</Text>
                  <Text style={styles.cardSubText}>{items.length} item(s) added</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.partyAddIcon} onPress={addItem}>
                <MaterialIcons name="add" size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {items.map((it, idx) => (
              <View key={idx} style={styles.editItemBox}>
                <View style={styles.editItemTop}>
                  <TextInput
                    style={styles.editItemDescInput}
                    placeholder="Item description"
                    placeholderTextColor="#94a3b8"
                    value={it.description}
                    onChangeText={(v) => updateItem(idx, "description", v)}
                  />
                  <TouchableOpacity onPress={() => removeItem(idx)} style={{ padding: 4 }}>
                    <MaterialIcons name="delete-outline" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>

                <View style={styles.editItemBottomRow}>
                  <View style={styles.qtyPriceWrap}>
                    <Text style={styles.inputMiniLabel}>Qty</Text>
                    <TextInput
                      style={styles.miniInput}
                      keyboardType="decimal-pad"
                      value={it.qty}
                      onChangeText={(v) => updateItem(idx, "qty", v)}
                    />
                  </View>

                  <Text style={styles.multiplySign}>×</Text>

                  <View style={styles.qtyPriceWrap}>
                    <Text style={styles.inputMiniLabel}>Price</Text>
                    <TextInput
                      style={styles.miniInput}
                      keyboardType="decimal-pad"
                      value={it.unitPrice}
                      onChangeText={(v) => updateItem(idx, "unitPrice", v)}
                    />
                  </View>

                  <View style={{ flex: 1, alignItems: "flex-end", justifyContent: "flex-end" }}>
                    <Text style={styles.itemTotalVal}>
                      {formatCurrency(
                        (parseFloat(it.qty) || 0) * (parseFloat(it.unitPrice) || 0),
                        currencyCode,
                        currencySymbol
                      )}
                    </Text>
                  </View>
                </View>
              </View>
            ))}

            {docTypeTab === "TAX_INVOICE" && (
              <View style={{ paddingTop: 8 }}>
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>Taxable Amount</Text>
                  <Text style={styles.calcVal}>
                    {formatCurrency(taxableAmount, currencyCode, currencySymbol)}
                  </Text>
                </View>
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>GST Amount ({taxRate}%)</Text>
                  <Text style={styles.calcVal}>
                    {formatCurrency(gstAmount, currencyCode, currencySymbol)}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.dashedDivider} />

            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>Subtotal</Text>
              <Text style={styles.subtotalVal}>
                {formatCurrency(taxableAmount + gstAmount, currencyCode, currencySymbol)}
              </Text>
            </View>
          </View>

          {/* Card: Adjustment */}
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.adjustmentRow}
              onPress={() => setShowAdjustments(!showAdjustments)}
              activeOpacity={0.8}
            >
              <View style={styles.cardIconRow}>
                <View style={styles.adjustmentIconBox}>
                  <MaterialIcons name="tune" size={18} color="#475569" />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Adjustment</Text>
                  <Text style={styles.cardSubText}>Add Discount & Shipping</Text>
                </View>
              </View>
              <MaterialIcons
                name="unfold-more"
                size={22}
                color="#64748b"
                style={{ transform: [{ rotate: showAdjustments ? "90deg" : "0deg" }] }}
              />
            </TouchableOpacity>

            {showAdjustments && (
              <View style={styles.adjustmentInputsWrap}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputMiniLabel}>Discount ({discountType === "AMOUNT" ? currencySymbol : "%"})</Text>
                  <View style={{ flexDirection: "row", gap: 4, marginTop: 4 }}>
                    <TextInput
                      style={[styles.miniInput, { flex: 1 }]}
                      keyboardType="decimal-pad"
                      value={discountValue}
                      onChangeText={setDiscountValue}
                    />
                    <TouchableOpacity
                      style={styles.toggleUnitBtn}
                      onPress={() => setDiscountType(discountType === "AMOUNT" ? "PERCENT" : "AMOUNT")}
                    >
                      <Text style={styles.toggleUnitBtnText}>
                        {discountType === "AMOUNT" ? currencySymbol : "%"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.inputMiniLabel}>Shipping Fee</Text>
                  <TextInput
                    style={[styles.miniInput, { marginTop: 4 }]}
                    keyboardType="decimal-pad"
                    value={shippingFee}
                    onChangeText={setShippingFee}
                  />
                </View>
              </View>
            )}

            <View style={styles.dashedDivider} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalVal}>
                {formatCurrency(grandTotal, currencyCode, currencySymbol)}
              </Text>
            </View>
          </View>

          {/* Lower Setting Cards (matches 12.59.39.jpeg & 13.01.14.jpeg) */}
          <View style={styles.optionsCard}>
            {/* Currency */}
            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => {
                setTempSelectedCurrency(
                  WORLD_CURRENCIES.find((c) => c.code === currencyCode) || WORLD_CURRENCIES[0]
                );
                setCurrencyModalVisible(true);
              }}
            >
              <View style={styles.cardIconRow}>
                <MaterialIcons name="payments" size={20} color="#475569" style={{ marginRight: 12 }} />
                <Text style={styles.optionRowTitle}>Currency</Text>
              </View>
              <View style={styles.cardActionRight}>
                <Text style={styles.optionRowValue}>{currencyCode} {currencySymbol}</Text>
                <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
              </View>
            </TouchableOpacity>

            {/* Payment Method */}
            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => setSubview("payments")}
            >
              <View style={styles.cardIconRow}>
                <MaterialIcons name="credit-card" size={20} color="#475569" style={{ marginRight: 12 }} />
                <Text style={styles.optionRowTitle}>Payment Method</Text>
              </View>
              <View style={styles.cardActionRight}>
                <Text style={styles.optionRowValue}>
                  {paymentsList.length > 0 ? `${paymentsList.length} added` : ""}
                </Text>
                <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
              </View>
            </TouchableOpacity>

            {/* Signature */}
            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => setSubview("signature")}
            >
              <View style={styles.cardIconRow}>
                <MaterialIcons name="draw" size={20} color="#475569" style={{ marginRight: 12 }} />
                <Text style={styles.optionRowTitle}>Signature</Text>
              </View>
              <View style={styles.cardActionRight}>
                <Text style={styles.optionRowValue}>{signatureData ? "Attached" : ""}</Text>
                <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
              </View>
            </TouchableOpacity>

            {/* Terms or Notes */}
            <TouchableOpacity
              style={[styles.optionRow, { borderBottomWidth: 0 }]}
              onPress={() => setSubview("terms")}
            >
              <View style={styles.cardIconRow}>
                <MaterialIcons name="notes" size={20} color="#475569" style={{ marginRight: 12 }} />
                <Text style={styles.optionRowTitle}>Terms or Notes</Text>
              </View>
              <View style={styles.cardActionRight}>
                <Text style={styles.optionRowValue}>{selectedTerms.length} active</Text>
                <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Attachments Card */}
          <TouchableOpacity
            style={styles.singleOptionCard}
            onPress={() => setAttachmentsSheetVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.cardIconRow}>
              <MaterialIcons name="attach-file" size={20} color="#475569" style={{ marginRight: 12 }} />
              <Text style={styles.optionRowTitle}>Attachments</Text>
            </View>
            <View style={styles.cardActionRight}>
              <Text style={styles.optionRowValue}>{attachments.length > 0 ? `${attachments.length} files` : ""}</Text>
              <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
            </View>
          </TouchableOpacity>

          {/* Mark as Status & Stamp Card */}
          <View style={styles.optionsCard}>
            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => {
                setTempStatus(status);
                setMarkAsModalVisible(true);
              }}
            >
              <View style={styles.cardIconRow}>
                <MaterialIcons name="bookmark-border" size={20} color="#475569" style={{ marginRight: 12 }} />
                <Text style={styles.optionRowTitle}>Mark as</Text>
              </View>
              <View style={styles.cardActionRight}>
                <Text style={styles.optionRowValue}>
                  {status === "PAID" ? "Paid" : status === "PARTIALLY_PAID" ? "Partially Paid" : "Unpaid"}
                </Text>
                <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
              </View>
            </TouchableOpacity>

            <View style={[styles.optionRow, { borderBottomWidth: 0 }]}>
              <View style={styles.cardIconRow}>
                <MaterialIcons name="verified" size={20} color="#475569" style={{ marginRight: 12 }} />
                <Text style={styles.optionRowTitle}>Show 'PAID' Stamp on Invoice</Text>
              </View>
              <Switch
                value={showPaidStamp}
                onValueChange={setShowPaidStamp}
                trackColor={{ false: "#cbd5e1", true: "#93c5fd" }}
                thumbColor={showPaidStamp ? "#2563eb" : "#f8fafc"}
              />
            </View>
          </View>

          {/* Delete Invoice Button */}
          <TouchableOpacity style={styles.deleteInvoiceBtn} onPress={handleDelete} activeOpacity={0.8}>
            <Feather name="trash-2" size={18} color="#ef4444" style={{ marginRight: 8 }} />
            <Text style={styles.deleteInvoiceBtnText}>
              {deleting ? "Deleting..." : "Delete Invoice"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky Bottom Action Bar */}
      <View style={styles.stickyBottomBar}>
        <TouchableOpacity
          style={styles.bottomPreviewBtn}
          onPress={() => handleSave(true)}
        >
          <Text style={styles.bottomPreviewText}>Preview</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bottomSaveBtn, saving && { opacity: 0.6 }]}
          onPress={() => handleSave(false)}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.bottomSaveText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* ─────────────────────────────────────────────────────────────────────────
          MODAL: Currency Picker (matches 13.00.34.jpeg)
         ───────────────────────────────────────────────────────────────────────── */}
      <Modal
        visible={currencyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCurrencyModalVisible(false)}
      >
        <View style={styles.modalBackdropCenter}>
          <View style={styles.currencyDialogCard}>
            <Text style={styles.currencyDialogTitle}>Currency</Text>

            <View style={styles.searchBarWrap}>
              <MaterialIcons name="search" size={20} color="#94a3b8" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchBarInput}
                placeholder="Currency Name"
                placeholderTextColor="#94a3b8"
                value={currencySearch}
                onChangeText={setCurrencySearch}
              />
            </View>

            <ScrollView style={{ maxHeight: 320 }}>
              {filteredCurrencies.map((c) => {
                const isSelected = tempSelectedCurrency?.code === c.code;
                return (
                  <TouchableOpacity
                    key={c.code}
                    style={[styles.currencyRow, isSelected && styles.currencyRowSelected]}
                    onPress={() => setTempSelectedCurrency(c)}
                  >
                    <Text style={[styles.currencyCountry, isSelected && styles.currencyTextBold]}>
                      {c.country}
                    </Text>
                    <Text style={[styles.currencySymbol, isSelected && styles.currencyTextBold]}>
                      {c.symbol}
                    </Text>
                    <Text style={[styles.currencyCode, isSelected && styles.currencyTextBold]}>
                      {c.code}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.dialogBottomActions}>
              <TouchableOpacity
                style={styles.dialogBottomBtn}
                onPress={() => setCurrencyModalVisible(false)}
              >
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <View style={styles.dialogActionDivider} />
              <TouchableOpacity
                style={styles.dialogBottomBtn}
                onPress={() => {
                  if (tempSelectedCurrency) {
                    setCurrencyCode(tempSelectedCurrency.code);
                    setCurrencySymbol(tempSelectedCurrency.symbol);
                    setCurrencyModalVisible(false);
                  }
                }}
              >
                <Text style={styles.dialogSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────────────────
          MODAL: Mark As (matches 13.01.28.jpeg)
         ───────────────────────────────────────────────────────────────────────── */}
      <Modal
        visible={markAsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMarkAsModalVisible(false)}
      >
        <View style={styles.modalBackdropCenter}>
          <View style={styles.markAsDialogCard}>
            <Text style={styles.markAsTitle}>Mark as</Text>

            {(["UNPAID", "PAID", "PARTIALLY_PAID"] as const).map((st) => {
              const isSelected = tempStatus === st;
              const label = st === "UNPAID" ? "Unpaid" : st === "PAID" ? "Paid" : "Partially Paid";
              return (
                <TouchableOpacity
                  key={st}
                  style={[styles.markAsRow, isSelected && styles.markAsRowSelected]}
                  onPress={() => setTempStatus(st)}
                >
                  <Text style={[styles.markAsRowText, isSelected && styles.markAsRowTextSelected]}>
                    {label}
                  </Text>
                  {isSelected && <MaterialIcons name="check" size={20} color="#2563eb" />}
                </TouchableOpacity>
              );
            })}

            <View style={styles.dialogBottomActions}>
              <TouchableOpacity
                style={styles.dialogBottomBtn}
                onPress={() => setMarkAsModalVisible(false)}
              >
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <View style={styles.dialogActionDivider} />
              <TouchableOpacity
                style={styles.dialogBottomBtn}
                onPress={() => {
                  setStatus(tempStatus);
                  setMarkAsModalVisible(false);
                }}
              >
                <Text style={styles.dialogSaveText}>Change</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────────────────
          MODAL: Attachments Sheet (matches 13.01.14.jpeg)
         ───────────────────────────────────────────────────────────────────────── */}
      <Modal
        visible={attachmentsSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAttachmentsSheetVisible(false)}
      >
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheetCard}>
            <View style={styles.sheetTopBar}>
              <Text style={styles.sheetTitle}>Attachments</Text>
              <TouchableOpacity onPress={() => setAttachmentsSheetVisible(false)}>
                <MaterialIcons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.sheetOptionRow}
              onPress={() => pickAttachment(false)}
            >
              <MaterialIcons name="image" size={22} color="#10b981" style={{ marginRight: 14 }} />
              <Text style={styles.sheetOptionText}>Choose from Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.sheetOptionRow}
              onPress={() => pickAttachment(true)}
            >
              <MaterialIcons name="photo-camera" size={22} color="#8b5cf6" style={{ marginRight: 14 }} />
              <Text style={styles.sheetOptionText}>Take Photo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f0f4f8",
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  scroll: {
    flex: 1,
  },
  header: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#0f172a",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  segmentContainer: {
    flexDirection: "row",
    backgroundColor: "#e2e8f0",
    borderRadius: 12,
    padding: 3,
    marginBottom: 12,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 9,
  },
  segmentBtnActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  segmentTextActive: {
    color: "#0f172a",
    fontWeight: "bold",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    flexDirection: "column",
  },
  invNumberBig: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0f172a",
  },
  dueTermsText: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  cardActionRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardActionLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1e293b",
    marginRight: 4,
  },
  cardIconRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0f172a",
  },
  cardSubText: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 1,
  },
  templateThumbMini: {
    width: 24,
    height: 32,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    padding: 2,
    justifyContent: "space-between",
    marginRight: 6,
    backgroundColor: "#eff6ff",
  },
  templateThumbHeader: {
    height: 3,
    backgroundColor: "#2563eb",
    borderRadius: 1,
  },
  templateThumbLine: {
    height: 2,
    backgroundColor: "#cbd5e1",
    borderRadius: 1,
    width: 18,
  },
  partiesCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  partyRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  partyIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  partyTextCol: {
    flex: 1,
  },
  partyLabel: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#0f172a",
  },
  partyName: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 1,
  },
  partyAddIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
  },
  connectingLineWrap: {
    paddingLeft: 18,
    marginVertical: 4,
  },
  connectingDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#cbd5e1",
    marginVertical: 2,
  },
  itemsHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  editItemBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  editItemTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  editItemDescInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#0f172a",
    padding: 4,
  },
  editItemBottomRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  qtyPriceWrap: {
    flexDirection: "column",
  },
  inputMiniLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 2,
  },
  miniInput: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    color: "#0f172a",
    minWidth: 50,
    textAlign: "center",
  },
  multiplySign: {
    fontSize: 14,
    color: "#94a3b8",
    marginHorizontal: 8,
    marginTop: 12,
  },
  itemTotalVal: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#0f172a",
  },
  calcRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 2,
  },
  calcLabel: {
    fontSize: 12,
    color: "#64748b",
  },
  calcVal: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1e293b",
  },
  dashedDivider: {
    height: 1,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    borderStyle: "dashed",
    marginVertical: 10,
  },
  subtotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  subtotalLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0f172a",
  },
  subtotalVal: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0f172a",
  },
  adjustmentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  adjustmentIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#f3e8ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  adjustmentInputsWrap: {
    flexDirection: "row",
    marginTop: 8,
  },
  toggleUnitBtn: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
    paddingHorizontal: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
  },
  toggleUnitBtnText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1e293b",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0f172a",
  },
  totalVal: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0f172a",
  },
  optionsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 10,
    overflow: "hidden",
  },
  optionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  optionRowTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0f172a",
  },
  optionRowValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    marginRight: 4,
  },
  singleOptionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  deleteInvoiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#fee2e2",
    marginBottom: 20,
  },
  deleteInvoiceBtnText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#ef4444",
  },
  stickyBottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    gap: 12,
  },
  bottomPreviewBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#2563eb",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  bottomPreviewText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2563eb",
  },
  bottomSaveBtn: {
    flex: 2,
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  bottomSaveText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#ffffff",
  },
  subHeader: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  subHeaderTitle: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#0f172a",
  },
  subHeaderSaveBtn: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  subHeaderSaveBtnText: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#ffffff",
  },
  infoCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0f172a",
    marginBottom: 12,
    backgroundColor: "#ffffff",
  },
  datePickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
  },
  textInputValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },
  createBtnCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 16,
  },
  createBtnText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2563eb",
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 30,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#94a3b8",
    marginTop: 8,
  },
  listItemCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  listItemText: {
    fontSize: 13,
    color: "#0f172a",
    flex: 1,
    marginRight: 8,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheetCard: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  sheetTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0f172a",
  },
  sheetOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  sheetOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },
  multilineInput: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: "#0f172a",
    height: 100,
    textAlignVertical: "top",
  },
  charCounterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 16,
  },
  charCounterText: {
    fontSize: 11,
    color: "#94a3b8",
  },
  sheetSaveBtn: {
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  sheetSaveBtnText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#ffffff",
  },
  signatureEmptyWrap: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 40,
    alignItems: "center",
  },
  signatureCardActive: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
  },
  signatureCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  signatureCardStatus: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#10b981",
  },
  signaturePreviewImg: {
    height: 80,
    width: "100%",
  },
  termCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  termCardChecked: {
    borderColor: "#2563eb",
    backgroundColor: "#eff6ff",
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#94a3b8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    marginTop: 2,
    backgroundColor: "#ffffff",
  },
  checkboxBoxChecked: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  termText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1e293b",
    flex: 1,
    lineHeight: 18,
  },
  modalBackdropCenter: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  dialogCard: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
  },
  dialogTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 12,
  },
  dialogActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  dialogBtnCancel: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  dialogBtnCancelText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
  },
  dialogBtnSave: {
    flex: 1,
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  dialogBtnSaveText: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#ffffff",
  },
  currencyDialogCard: {
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    overflow: "hidden",
  },
  currencyDialogTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0f172a",
    textAlign: "center",
    paddingTop: 16,
  },
  searchBarWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 13,
    color: "#0f172a",
  },
  currencyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  currencyRowSelected: {
    backgroundColor: "#eff6ff",
  },
  currencyCountry: {
    flex: 2,
    fontSize: 13,
    color: "#1e293b",
  },
  currencySymbol: {
    flex: 1,
    fontSize: 13,
    color: "#475569",
    textAlign: "center",
  },
  currencyCode: {
    flex: 1,
    fontSize: 13,
    color: "#64748b",
    textAlign: "right",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  currencyTextBold: {
    fontWeight: "bold",
    color: "#2563eb",
  },
  dialogBottomActions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  dialogBottomBtn: {
    flex: 1,
    paddingVertical: 13,
    alignItems: "center",
  },
  dialogActionDivider: {
    width: 1,
    backgroundColor: "#e2e8f0",
  },
  dialogCancelText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#64748b",
  },
  dialogSaveText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#2563eb",
  },
  markAsDialogCard: {
    width: 280,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    overflow: "hidden",
  },
  markAsTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0f172a",
    textAlign: "center",
    paddingVertical: 14,
  },
  markAsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  markAsRowSelected: {
    backgroundColor: "#eff6ff",
  },
  markAsRowText: {
    fontSize: 14,
    color: "#1e293b",
    fontWeight: "500",
  },
  markAsRowTextSelected: {
    color: "#2563eb",
    fontWeight: "bold",
  },
});

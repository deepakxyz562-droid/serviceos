import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
  BackHandler,
  Switch,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useAppStore } from "@/store/app";
import { api, apiPost, apiPatch } from "@/api/client";
import {
  computeInvoiceTotals,
  formatCurrency,
  type DocumentType,
  type CalcLineItem,
} from "@/lib/quote-flow-calc";
import { MaterialIcons, Feather, FontAwesome5 } from "@expo/vector-icons";
import { sanitizeDecimal, safeIsoDate } from "@/lib/validation";
import { PRESET_TERMS } from "@/lib/preset-terms";
import { CustomerSelectModal } from "@/components/CustomerSelectModal";
import { CurrencySelectModal } from "@/components/CurrencySelectModal";
import { SignaturePadModal } from "@/components/SignaturePadModal";

interface Item extends CalcLineItem {
  description: string;
  qty: number;
  unitPrice: number;
  taxRate?: number;
}

const MOBILE_TEMPLATES = [
  { id: "classic-corporate-blue", name: "Corporate Blue", category: "Classic", accentColor: "#2563eb", bgColor: "#eff6ff" },
  { id: "soft-emerald-wave", name: "Emerald Wave", category: "Recommend", accentColor: "#10b981", bgColor: "#ecfdf5" },
  { id: "minimal-clean", name: "Minimal Clean", category: "Simple", accentColor: "#18181b", bgColor: "#f8fafc" },
  { id: "geometric-bold-green", name: "Geometric Green", category: "Professional", accentColor: "#059669", bgColor: "#d1fae5" },
  { id: "slate-geometric", name: "Slate Corporate", category: "Classic", accentColor: "#1e293b", bgColor: "#f1f5f9" },
  { id: "mesh-polygonal", name: "Polygonal Mesh", category: "Creative", accentColor: "#0284c7", bgColor: "#e0f2fe" },
  { id: "golden-luxury", name: "Golden Luxury", category: "Premium", accentColor: "#d97706", bgColor: "#fef3c7" },
];

export default function InvoiceCreateScreen() {
  const router = useRouter();
  const business = useAppStore((s) => s.business);
  const pendingDraft = useAppStore((s) => s.pendingDraft);
  const setPendingDraft = useAppStore((s) => s.setPendingDraft);

  const [docType, setDocType] = useState<DocumentType>("TAX_INVOICE");
  const [selectedTemplateId, setSelectedTemplateId] = useState("classic-corporate-blue");
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Line Items
  const [items, setItems] = useState<Item[]>(
    pendingDraft?.items?.length
      ? pendingDraft.items
      : [{ description: "IT Consulting", qty: 1, unitPrice: 75000, taxRate: 18 }]
  );

  // Conversational "Ask AI"
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(
    pendingDraft?.summary ? `AI Draft: ${pendingDraft.summary}` : null
  );

  // Adjustments
  const [showAdjustments, setShowAdjustments] = useState(false);
  const [discountValue, setDiscountValue] = useState(String(pendingDraft?.discountValue ?? 0));
  const [discountType, setDiscountType] = useState<"AMOUNT" | "PERCENT">(
    pendingDraft?.discountType ?? "AMOUNT"
  );
  const [shippingFee, setShippingFee] = useState("0");
  const [globalTaxRate, setGlobalTaxRate] = useState("0");

  const [dueDateText, setDueDateText] = useState(pendingDraft?.terms || "Due on receipt");
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer & UPI");
  const [loading, setLoading] = useState(false);
  const [currencyCode, setCurrencyCode] = useState(business?.currency || "INR");
  const [currencySymbol, setCurrencySymbol] = useState(business?.currencySymbol || "₹");
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);

  // Extended Options
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [signatureSheetVisible, setSignatureSheetVisible] = useState(false);
  const [signaturePadVisible, setSignaturePadVisible] = useState(false);

  const [selectedTerms, setSelectedTerms] = useState<string[]>([
    "Payment due within 30 days unless otherwise agreed.",
    "Please quote invoice number when making payment.",
  ]);
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [createTermModalVisible, setCreateTermModalVisible] = useState(false);
  const [tempCustomTerm, setTempCustomTerm] = useState("");

  const [attachments, setAttachments] = useState<string[]>([]);
  const [attachmentsSheetVisible, setAttachmentsSheetVisible] = useState(false);

  const [status, setStatus] = useState<"UNPAID" | "PAID" | "PARTIALLY_PAID">("UNPAID");
  const [markAsModalVisible, setMarkAsModalVisible] = useState(false);
  const [showPaidStamp, setShowPaidStamp] = useState(true);

  async function handlePickSignatureImage(fromCamera = false) {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission Required", "Camera/gallery access is needed to attach a signature.");
      return;
    }
    const res = fromCamera
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [3, 1], quality: 0.8, base64: true })
      : await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [3, 1], quality: 0.8, base64: true });
    if (!res.canceled && res.assets?.[0]?.base64) {
      setSignatureData(`data:image/jpeg;base64,${res.assets[0].base64}`);
      setSignatureSheetVisible(false);
    }
  }

  async function handlePickAttachment(fromCamera = false) {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission Required", "Camera/gallery access is needed to attach files.");
      return;
    }
    const res = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7, base64: true })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, base64: true });
    if (!res.canceled && res.assets?.[0]?.base64) {
      const dataUri = `data:image/jpeg;base64,${res.assets[0].base64}`;
      setAttachments((prev) => [...prev, dataUri]);
      setAttachmentsSheetVisible(false);
    }
  }

  useEffect(() => {
    api<{ customers: any[] }>("/api/mobile/customers").then((r) => {
      const list = r.customers || [];
      setCustomers(list);
      if (list.length > 0 && !selectedCustomer) {
        if (pendingDraft?.matchedCustomer?.id) {
          const match = list.find((c) => c.id === pendingDraft.matchedCustomer.id);
          if (match) {
            setSelectedCustomer(match);
            return;
          }
        }
        setSelectedCustomer(list[0]);
      }
    });

    return () => {
      setPendingDraft(null);
    };
  }, []);

  // Conversational "Ask AI" handler
  async function handleAskAi(customPrompt?: string) {
    const prompt = customPrompt || aiInstruction;
    if (!prompt.trim()) return;

    setAiLoading(true);
    setAiFeedback(null);
    try {
      const res = await api<{
        updated: {
          items: Item[];
          discountValue: number;
          discountType: "AMOUNT" | "PERCENT";
          taxRate: number;
          notes?: string;
        };
        summary: string;
      }>("/api/quote-flow/ai/edit-quote", {
        method: "POST",
        body: JSON.stringify({
          currentQuote: {
            items,
            discountValue: parseFloat(discountValue) || 0,
            discountType,
            taxRate: 18,
            notes: dueDateText,
          },
          instruction: prompt,
        }),
      });

      if (res?.updated) {
        if (res.updated.items?.length) setItems(res.updated.items);
        if (typeof res.updated.discountValue === "number") setDiscountValue(String(res.updated.discountValue));
        if (res.updated.discountType) setDiscountType(res.updated.discountType);
        setAiFeedback(res.summary || `Applied: "${prompt}"`);
        setAiInstruction("");
      }
    } catch (e: any) {
      Alert.alert("AI Assistant", e.message || "Failed to apply edit");
    } finally {
      setAiLoading(false);
    }
  }

  const totals = computeInvoiceTotals({
    items,
    documentType: docType,
    discountValue: parseFloat(discountValue) || 0,
    discountType,
    globalTaxRate: parseFloat(globalTaxRate) || 0,
    shippingFee: parseFloat(shippingFee) || 0,
    currency: currencyCode,
  });

  function updateItem(idx: number, patch: Partial<Item>) {
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function addItem() {
    setItems((arr) => [
      ...arr,
      { description: "", qty: 1, unitPrice: 0, taxRate: docType === "TAX_INVOICE" ? 18 : 0 },
    ]);
  }

  function removeItem(idx: number) {
    if (items.length <= 1) return;
    setItems((arr) => arr.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    if (!selectedCustomer) {
      Alert.alert("Required", "Please select a client for 'Bill To'");
      return;
    }
    if (items.some((i) => !i.description.trim())) {
      Alert.alert("Required", "Please fill in descriptions for all items");
      return;
    }

    setLoading(true);
    try {
      const metadata = {
        title: docType === "TAX_INVOICE" ? "TAX INVOICE" : docType === "BILL_OF_SUPPLY" ? "BILL OF SUPPLY" : "INVOICE",
        docTypeSegment: docType,
        currencyCode,
        currencySymbol,
        shippingFee: parseFloat(shippingFee) || 0,
        dueTerms: dueDateText,
        terms: selectedTerms,
        signature: signatureData,
        signatureDataUrl: signatureData,
        attachments,
        showPaidStamp,
        status,
        payments: [paymentMethod],
      };

      const r = await apiPost<{ invoice: any }>("/api/mobile/invoices/create-with-items", {
        customerId: selectedCustomer.id,
        items: items.map((i) => ({
          description: i.description,
          qty: Math.max(0.01, Number(i.qty) || 1),
          unitPrice: Math.max(0, Number(i.unitPrice) || 0),
        })),
        discountValue: parseFloat(discountValue) || 0,
        discountType,
        taxRate: docType === "SIMPLE_BILL" ? parseFloat(globalTaxRate) || 0 : 18,
        pdfTemplate: selectedTemplateId,
        notes: JSON.stringify(metadata),
      });

      // Sync status if marked as paid
      if (status && status !== "UNPAID" && r?.invoice?.id) {
        try {
          await apiPatch(`/api/invoices/${r.invoice.id}`, { status });
        } catch {
          /* non-blocking */
        }
      }

      // Update business currency
      apiPatch("/api/business/onboarding", {
        currency: currencyCode,
        currencySymbol,
      }).catch(() => {});
      if (business) {
        useAppStore.getState().setBusiness({
          ...business,
          currency: currencyCode,
          currencySymbol,
        });
      }

      router.replace(`/invoice/${r.invoice.id}`);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to create invoice");
    } finally {
      setLoading(false);
    }
  }

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/invoices");
    }
  }, [router]);

  useEffect(() => {
    const onBackPress = () => {
      handleBack();
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [handleBack]);

  const currency = currencyCode;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* Top App Bar */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Invoice</Text>
          <View style={styles.headerRight}>
            <View style={styles.freeBadge}>
              <MaterialIcons name="workspace-premium" size={16} color="white" />
              <Text style={styles.freeBadgeText}>18M FREE</Text>
            </View>
          </View>
        </View>

        {/* Top Segmented Control */}
        <View style={styles.segmentedContainer}>
          {(
            [
              { id: "TAX_INVOICE", label: "Tax Invoice" },
              { id: "BILL_OF_SUPPLY", label: "Bill of Supply" },
              { id: "SIMPLE_BILL", label: "Simple Bill" },
            ] as const
          ).map((t) => {
            const active = docType === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                onPress={() => setDocType(t.id)}
                style={[styles.segmentBtn, active && styles.segmentBtnActive]}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        >
          {/* 2026 CORE: Conversational "Ask AI" Document Assistant */}
          <View style={styles.aiCard}>
            <View style={styles.aiCardHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <MaterialIcons name="auto-awesome" size={16} color="#059669" />
                <Text style={styles.aiCardTitle}>Ask AI Assistant</Text>
                <View style={styles.aiBadge}>
                  <Text style={styles.aiBadgeText}>2026 CORE</Text>
                </View>
              </View>
              {aiLoading && <ActivityIndicator size="small" color="#059669" />}
            </View>

            {aiFeedback ? (
              <View style={styles.aiFeedbackBox}>
                <MaterialIcons name="check-circle" size={14} color="#059669" />
                <Text style={styles.aiFeedbackText}>{aiFeedback}</Text>
              </View>
            ) : null}

            {/* AI Input Row */}
            <View style={styles.aiInputRow}>
              <TextInput
                value={aiInstruction}
                onChangeText={setAiInstruction}
                placeholder="Ask AI: 'Give 10% discount', 'Add 18% GST'..."
                style={styles.aiTextInput}
                placeholderTextColor="#94a3b8"
              />
              <TouchableOpacity
                style={styles.aiSubmitBtn}
                onPress={() => handleAskAi()}
                disabled={aiLoading || !aiInstruction.trim()}
              >
                <MaterialIcons name="arrow-upward" size={18} color="white" />
              </TouchableOpacity>
            </View>

            {/* Quick Action Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {[
                  { label: "💡 10% Discount", action: "give 10% discount" },
                  { label: "💡 18% GST", action: "add 18% GST tax rate" },
                  { label: "💡 Due Upon Receipt", action: "change payment terms to Due upon receipt" },
                  { label: "💡 Round Totals", action: "round prices to neat even numbers" },
                ].map((chip, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => handleAskAi(chip.action)}
                    style={styles.aiChip}
                  >
                    <Text style={styles.aiChipText}>{chip.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Card 1: Document Details */}
          <View style={styles.card}>
            <View style={styles.cardRowBetween}>
              <View>
                <Text style={styles.invoiceNumber}>INV0001</Text>
                <Text style={styles.dueDateText}>{dueDateText}</Text>
              </View>
              <View style={styles.docTypeBadge}>
                <Text style={styles.docTypeBadgeText}>
                  {docType === "TAX_INVOICE"
                    ? "TAX INVOICE"
                    : docType === "BILL_OF_SUPPLY"
                    ? "BILL OF SUPPLY"
                    : "INVOICE"}
                </Text>
                <MaterialIcons name="chevron-right" size={18} color="#64748b" />
              </View>
            </View>
          </View>

          {/* Card 2: Templates Preview */}
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => setTemplatePickerOpen(true)}
          >
            <View style={styles.cardRowBetween}>
              <View style={styles.cardLeftGroup}>
                <View style={[styles.iconBox, { backgroundColor: "#f1f5f9" }]}>
                  <MaterialIcons name="dashboard-customize" size={18} color="#475569" />
                </View>
                <View>
                  <Text style={styles.cardSectionTitle}>Templates</Text>
                  <Text style={styles.freeSubText}>
                    {MOBILE_TEMPLATES.find((t) => t.id === selectedTemplateId)?.name || "All 100+ Free"} · 18M Free
                  </Text>
                </View>
              </View>
              <View style={styles.templateThumbRow}>
                <View
                  style={[
                    styles.miniThumb,
                    {
                      borderColor:
                        MOBILE_TEMPLATES.find((t) => t.id === selectedTemplateId)?.accentColor ||
                        "#93c5fd",
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.miniThumbLineBlue,
                      {
                        backgroundColor:
                          MOBILE_TEMPLATES.find((t) => t.id === selectedTemplateId)?.accentColor ||
                          "#2563eb",
                      },
                    ]}
                  />
                  <View style={styles.miniThumbLine} />
                  <View style={styles.miniThumbLine} />
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
              </View>
            </View>
          </TouchableOpacity>

          {/* Card 3: Connected Parties */}
          <View style={styles.card}>
            {/* Bill From */}
            <View style={styles.cardRowBetween}>
              <View style={styles.cardLeftGroup}>
                <View style={[styles.iconBox, { backgroundColor: "#eff6ff" }]}>
                  <MaterialIcons name="business" size={20} color="#2563eb" />
                </View>
                <View>
                  <Text style={styles.cardItemTitle}>Bill From</Text>
                  <Text style={styles.cardItemSub}>{business?.name || "Add Business"}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.circleAddBtn}>
                <MaterialIcons name="add" size={18} color="white" />
              </TouchableOpacity>
            </View>

            {/* Dotted Vertical Connector Line */}
            <View style={styles.dottedConnector} />

            {/* Bill To */}
            <TouchableOpacity
              style={styles.cardRowBetween}
              onPress={() => setPickerOpen(true)}
              activeOpacity={0.7}
            >
              <View style={styles.cardLeftGroup}>
                <View style={[styles.iconBox, { backgroundColor: "#fff7ed" }]}>
                  <MaterialIcons name="people" size={20} color="#f97316" />
                </View>
                <View>
                  <Text style={styles.cardItemTitle}>Bill To</Text>
                  <Text style={styles.cardItemSub}>
                    {selectedCustomer ? selectedCustomer.name : "Add Clients"}
                  </Text>
                </View>
              </View>
              <View style={styles.circleAddBtn}>
                <MaterialIcons name={selectedCustomer ? "check" : "add"} size={18} color="white" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Card 4: Items & Subtotals */}
          <View style={styles.card}>
            <View style={styles.cardRowBetween}>
              <View style={styles.cardLeftGroup}>
                <View style={[styles.iconBox, { backgroundColor: "#f0fdf4" }]}>
                  <MaterialIcons name="receipt" size={18} color="#16a34a" />
                </View>
                <View>
                  <Text style={styles.cardItemTitle}>Items</Text>
                  <Text style={styles.cardItemSub}>Add Items</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.circleAddBtn} onPress={addItem}>
                <MaterialIcons name="add" size={18} color="white" />
              </TouchableOpacity>
            </View>

            {/* Line items list */}
            <View style={{ marginTop: 12, gap: 10 }}>
              {items.map((item, idx) => (
                <View key={idx} style={styles.itemRowCard}>
                  <View style={styles.itemHeader}>
                    <TextInput
                      value={item.description}
                      onChangeText={(t) => updateItem(idx, { description: t })}
                      placeholder="Item description (e.g. Service work)"
                      placeholderTextColor="#94a3b8"
                      style={styles.itemDescInput}
                    />
                    {items.length > 1 && (
                      <TouchableOpacity onPress={() => removeItem(idx)} style={{ padding: 4 }}>
                        <Feather name="trash-2" size={16} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.itemInputsGrid}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemColLabel}>QTY</Text>
                      <TextInput
                        keyboardType="decimal-pad"
                        value={String(item.qty)}
                        onChangeText={(t) => {
                          const clean = sanitizeDecimal(t);
                          updateItem(idx, { qty: clean === "" ? 0 : parseFloat(clean) || 0 });
                        }}
                        style={styles.itemInput}
                      />
                    </View>
                    <View style={{ flex: 1.2 }}>
                      <Text style={styles.itemColLabel}>PRICE</Text>
                      <TextInput
                        keyboardType="decimal-pad"
                        value={String(item.unitPrice)}
                        onChangeText={(t) => {
                          const clean = sanitizeDecimal(t);
                          updateItem(idx, { unitPrice: clean === "" ? 0 : parseFloat(clean) || 0 });
                        }}
                        style={styles.itemInput}
                      />
                    </View>
                    {docType === "TAX_INVOICE" ? (
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemColLabel}>GST %</Text>
                        <TextInput
                          keyboardType="decimal-pad"
                          value={String(item.taxRate ?? 18)}
                          onChangeText={(t) => {
                            const clean = sanitizeDecimal(t);
                            updateItem(idx, { taxRate: clean === "" ? 0 : parseFloat(clean) || 0 });
                          }}
                          style={styles.itemInput}
                        />
                      </View>
                    ) : (
                      <View style={{ flex: 1.2 }}>
                        <Text style={styles.itemColLabel}>TOTAL</Text>
                        <Text style={styles.itemStaticTotal}>
                          {formatCurrency(item.qty * item.unitPrice, currency)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>

            {/* Calculations Breakdown */}
            <View style={styles.calcBreakdown}>
              {docType === "TAX_INVOICE" && (
                <>
                  <View style={styles.calcRow}>
                    <Text style={styles.calcLabel}>Taxable Amount</Text>
                    <Text style={styles.calcValue}>{formatCurrency(totals.taxableAmount, currency)}</Text>
                  </View>
                  <View style={styles.calcRow}>
                    <Text style={styles.calcLabel}>GST Amount</Text>
                    <Text style={styles.calcValue}>{formatCurrency(totals.gstAmount, currency)}</Text>
                  </View>
                  <View style={styles.dottedDivider} />
                </>
              )}
              <View style={styles.calcRow}>
                <Text style={styles.subtotalLabel}>Subtotal</Text>
                <Text style={styles.subtotalValue}>{formatCurrency(totals.subtotal, currency)}</Text>
              </View>
            </View>
          </View>

          {/* Card 5: Adjustment */}
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.cardRowBetween}
              onPress={() => setShowAdjustments(!showAdjustments)}
              activeOpacity={0.7}
            >
              <View style={styles.cardLeftGroup}>
                <View style={[styles.iconBox, { backgroundColor: "#faf5ff" }]}>
                  <MaterialIcons name="tune" size={18} color="#9333ea" />
                </View>
                <View>
                  <Text style={styles.cardItemTitle}>Adjustment</Text>
                  <Text style={styles.cardItemSub}>
                    {docType === "SIMPLE_BILL"
                      ? "Add Discount, Tax & Shipping"
                      : "Add Discount & Shipping"}
                  </Text>
                </View>
              </View>
              <MaterialIcons
                name={showAdjustments ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                size={22}
                color="#94a3b8"
              />
            </TouchableOpacity>

            {showAdjustments && (
              <View style={styles.adjustmentBody}>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemColLabel}>DISCOUNT</Text>
                    <TextInput
                      keyboardType="decimal-pad"
                      value={discountValue}
                      onChangeText={(t) => setDiscountValue(sanitizeDecimal(t))}
                      style={styles.itemInput}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemColLabel}>SHIPPING FEE</Text>
                    <TextInput
                      keyboardType="decimal-pad"
                      value={shippingFee}
                      onChangeText={(t) => setShippingFee(sanitizeDecimal(t))}
                      style={styles.itemInput}
                    />
                  </View>
                </View>

                {docType === "SIMPLE_BILL" && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={styles.itemColLabel}>TAX RATE (%)</Text>
                    <TextInput
                      keyboardType="decimal-pad"
                      value={globalTaxRate}
                      onChangeText={(t) => setGlobalTaxRate(sanitizeDecimal(t))}
                      style={styles.itemInput}
                    />
                  </View>
                )}
              </View>
            )}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatCurrency(totals.total, currency)}</Text>
            </View>
          </View>

          {/* Card 6: Currency */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => setCurrencyModalOpen(true)}
            activeOpacity={0.7}
          >
            <View style={styles.cardRowBetween}>
              <View style={styles.cardLeftGroup}>
                <View style={[styles.iconBox, { backgroundColor: "#fefce8" }]}>
                  <MaterialIcons name="payments" size={18} color="#ca8a04" />
                </View>
                <Text style={styles.cardSectionTitle}>Currency</Text>
              </View>
              <View style={styles.cardRightGroup}>
                <Text style={styles.cardValueText}>{currencyCode} {currencySymbol}</Text>
                <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
              </View>
            </View>
          </TouchableOpacity>

          {/* Card 7: Payment Method */}
          <View style={styles.card}>
            <View style={styles.cardRowBetween}>
              <View style={styles.cardLeftGroup}>
                <View style={[styles.iconBox, { backgroundColor: "#e0e7ff" }]}>
                  <MaterialIcons name="credit-card" size={18} color="#4f46e5" />
                </View>
                <Text style={styles.cardSectionTitle}>Payment Method</Text>
              </View>
              <View style={styles.cardRightGroup}>
                <Text style={styles.cardValueText}>{paymentMethod}</Text>
                <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
              </View>
            </View>
          </View>

          {/* Card 8: Signature */}
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.cardRowBetween}
              onPress={() => setSignatureSheetVisible(true)}
              activeOpacity={0.7}
            >
              <View style={styles.cardLeftGroup}>
                <View style={[styles.iconBox, { backgroundColor: "#fef2f2" }]}>
                  <MaterialIcons name="draw" size={18} color="#ef4444" />
                </View>
                <View>
                  <Text style={styles.cardSectionTitle}>Signature</Text>
                  <Text style={styles.cardItemSub}>
                    {signatureData ? "Signature attached" : "Draw or upload authorized sign"}
                  </Text>
                </View>
              </View>
              <View style={styles.cardRightGroup}>
                {signatureData ? (
                  <View style={styles.attachedBadge}>
                    <Text style={styles.attachedBadgeText}>Attached</Text>
                  </View>
                ) : null}
                <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
              </View>
            </TouchableOpacity>

            {signatureData ? (
              <View style={styles.signaturePreviewWrap}>
                <Image source={{ uri: signatureData }} style={styles.signatureThumb} resizeMode="contain" />
                <TouchableOpacity
                  onPress={() => setSignatureData(null)}
                  style={styles.removeSigBtn}
                >
                  <MaterialIcons name="close" size={14} color="#ef4444" />
                  <Text style={styles.removeSigText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          {/* Card 9: Terms or Notes */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => setTermsModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.cardRowBetween}>
              <View style={styles.cardLeftGroup}>
                <View style={[styles.iconBox, { backgroundColor: "#ecfdf5" }]}>
                  <MaterialIcons name="notes" size={18} color="#059669" />
                </View>
                <View>
                  <Text style={styles.cardSectionTitle}>Terms or Notes</Text>
                  <Text style={styles.cardItemSub}>
                    {selectedTerms.length} active clause{selectedTerms.length === 1 ? "" : "s"}
                  </Text>
                </View>
              </View>
              <View style={styles.cardRightGroup}>
                <Text style={styles.cardValueText}>{selectedTerms.length} clauses</Text>
                <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
              </View>
            </View>
          </TouchableOpacity>

          {/* Card 10: Attachments */}
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.cardRowBetween}
              onPress={() => setAttachmentsSheetVisible(true)}
              activeOpacity={0.7}
            >
              <View style={styles.cardLeftGroup}>
                <View style={[styles.iconBox, { backgroundColor: "#f0fdfa" }]}>
                  <MaterialIcons name="attach-file" size={18} color="#0d9488" />
                </View>
                <View>
                  <Text style={styles.cardSectionTitle}>Attachments</Text>
                  <Text style={styles.cardItemSub}>
                    {attachments.length > 0 ? `${attachments.length} file(s) attached` : "Attach photos or receipts"}
                  </Text>
                </View>
              </View>
              <View style={styles.cardRightGroup}>
                <Text style={styles.cardValueText}>{attachments.length > 0 ? `${attachments.length} files` : ""}</Text>
                <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
              </View>
            </TouchableOpacity>

            {attachments.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.attachStrip}>
                {attachments.map((uri, idx) => (
                  <View key={idx} style={styles.attachItem}>
                    <Image source={{ uri }} style={styles.attachThumb} resizeMode="cover" />
                    <TouchableOpacity
                      style={styles.attachDeleteBtn}
                      onPress={() => setAttachments((all) => all.filter((_, i) => i !== idx))}
                    >
                      <MaterialIcons name="close" size={12} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Card 11: Mark as Status */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => setMarkAsModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.cardRowBetween}>
              <View style={styles.cardLeftGroup}>
                <View style={[styles.iconBox, { backgroundColor: "#fff7ed" }]}>
                  <MaterialIcons name="bookmark-border" size={18} color="#ea580c" />
                </View>
                <View>
                  <Text style={styles.cardSectionTitle}>Mark as</Text>
                  <Text style={styles.cardItemSub}>Payment status of invoice</Text>
                </View>
              </View>
              <View style={styles.cardRightGroup}>
                <View
                  style={[
                    styles.statusPill,
                    status === "PAID"
                      ? styles.statusPaid
                      : status === "PARTIALLY_PAID"
                      ? styles.statusPartial
                      : styles.statusUnpaid,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      status === "PAID"
                        ? { color: "#16a34a" }
                        : status === "PARTIALLY_PAID"
                        ? { color: "#ea580c" }
                        : { color: "#475569" },
                    ]}
                  >
                    {status === "PAID" ? "Paid" : status === "PARTIALLY_PAID" ? "Partially Paid" : "Unpaid"}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
              </View>
            </View>
          </TouchableOpacity>

          {/* Card 12: Show 'PAID' Stamp on Invoice */}
          <View style={styles.card}>
            <View style={styles.cardRowBetween}>
              <View style={styles.cardLeftGroup}>
                <View style={[styles.iconBox, { backgroundColor: "#ecfdf5" }]}>
                  <MaterialIcons name="verified" size={18} color="#10b981" />
                </View>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={styles.cardSectionTitle}>Show 'PAID' Stamp on Invoice</Text>
                  <Text style={styles.cardItemSub}>Displays rubber paid stamp across PDF</Text>
                </View>
              </View>
              <Switch
                value={showPaidStamp}
                onValueChange={setShowPaidStamp}
                trackColor={{ false: "#cbd5e1", true: "#93c5fd" }}
                thumbColor={showPaidStamp ? "#2563eb" : "#f1f5f9"}
              />
            </View>
          </View>
        </ScrollView>

        {/* Floating Bottom Sticky Bar */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.previewBtn}
            onPress={() => {
              Alert.alert("Preview", `Total: ${formatCurrency(totals.total, currency)} (${docType})`);
            }}
          >
            <Text style={styles.previewBtnText}>Preview</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Customer Select Modal with in-line client creation */}
        <CustomerSelectModal
          visible={pickerOpen}
          onClose={() => setPickerOpen(false)}
          selectedCustomerId={selectedCustomer?.id}
          onSelect={(c) => setSelectedCustomer(c)}
        />

        {/* Currency Select Modal */}
        <CurrencySelectModal
          visible={currencyModalOpen}
          onClose={() => setCurrencyModalOpen(false)}
          selectedCode={currencyCode}
          onSelect={(c) => {
            setCurrencyCode(c.code);
            setCurrencySymbol(c.symbol);
          }}
        />

        {/* Template Picker Modal */}
        <Modal visible={templatePickerOpen} animationType="slide" transparent>
          <View style={styles.pickerModalBackdrop}>
            <View style={styles.pickerModalContent}>
              <View style={styles.pickerModalHeader}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={styles.pickerModalTitle}>Select Template</Text>
                  <View style={{ backgroundColor: "#10b981", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ color: "white", fontSize: 10, fontWeight: "bold" }}>18M FREE</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setTemplatePickerOpen(false)}>
                  <MaterialIcons name="close" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
                {MOBILE_TEMPLATES.map((tpl) => {
                  const isSelected = selectedTemplateId === tpl.id;
                  return (
                    <TouchableOpacity
                      key={tpl.id}
                      onPress={() => {
                        setSelectedTemplateId(tpl.id);
                        setTemplatePickerOpen(false);
                      }}
                      style={[
                        styles.customerOption,
                        isSelected && styles.customerOptionSelected,
                        { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
                      ]}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <View
                          style={{
                            width: 38,
                            height: 48,
                            borderRadius: 6,
                            borderWidth: 1.5,
                            borderColor: tpl.accentColor,
                            backgroundColor: tpl.bgColor,
                            padding: 4,
                            justifyContent: "space-between",
                          }}
                        >
                          <View style={{ height: 4, width: "100%", backgroundColor: tpl.accentColor, borderRadius: 2 }} />
                          <View style={{ height: 2, width: "60%", backgroundColor: "#cbd5e1", borderRadius: 1 }} />
                          <View style={{ height: 2, width: "80%", backgroundColor: "#e2e8f0", borderRadius: 1 }} />
                        </View>
                        <View>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Text style={styles.customerOptionName}>{tpl.name}</Text>
                            <View style={{ backgroundColor: "#ecfdf5", paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3 }}>
                              <Text style={{ color: "#059669", fontSize: 9, fontWeight: "bold" }}>FREE</Text>
                            </View>
                          </View>
                          <Text style={styles.customerOptionMeta}>{tpl.category} Design</Text>
                        </View>
                      </View>
                      {isSelected ? (
                        <MaterialIcons name="check-circle" size={22} color="#10b981" />
                      ) : (
                        <MaterialIcons name="radio-button-unchecked" size={20} color="#cbd5e1" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Signature Pad Modal */}
        <SignaturePadModal
          visible={signaturePadVisible}
          onClose={() => setSignaturePadVisible(false)}
          onSave={(url) => {
            setSignatureData(url);
            setSignaturePadVisible(false);
            setSignatureSheetVisible(false);
          }}
        />

        {/* Signature Action Sheet Modal */}
        <Modal visible={signatureSheetVisible} animationType="slide" transparent>
          <View style={styles.sheetBackdrop}>
            <View style={styles.sheetContent}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Add Signature</Text>
                <TouchableOpacity onPress={() => setSignatureSheetVisible(false)}>
                  <MaterialIcons name="close" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>
              <View style={{ padding: 16, gap: 10 }}>
                <TouchableOpacity
                  style={styles.sheetOption}
                  onPress={() => {
                    setSignatureSheetVisible(false);
                    setTimeout(() => setSignaturePadVisible(true), 250);
                  }}
                >
                  <MaterialIcons name="gesture" size={22} color="#2563eb" />
                  <Text style={styles.sheetOptionText}>Draw on Screen</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sheetOption}
                  onPress={() => handlePickSignatureImage(false)}
                >
                  <MaterialIcons name="photo-library" size={22} color="#059669" />
                  <Text style={styles.sheetOptionText}>Choose from Library</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sheetOption}
                  onPress={() => handlePickSignatureImage(true)}
                >
                  <MaterialIcons name="camera-alt" size={22} color="#7c3aed" />
                  <Text style={styles.sheetOptionText}>Take Photo</Text>
                </TouchableOpacity>

                {signatureData ? (
                  <TouchableOpacity
                    style={[styles.sheetOption, { borderColor: "#fecaca" }]}
                    onPress={() => {
                      setSignatureData(null);
                      setSignatureSheetVisible(false);
                    }}
                  >
                    <MaterialIcons name="delete-outline" size={22} color="#ef4444" />
                    <Text style={[styles.sheetOptionText, { color: "#ef4444" }]}>Remove Signature</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </View>
        </Modal>

        {/* Terms or Notes Picker Modal */}
        <Modal visible={termsModalVisible} animationType="slide" transparent>
          <View style={styles.sheetBackdrop}>
            <View style={[styles.sheetContent, { maxHeight: "80%" }]}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Terms & Conditions</Text>
                <TouchableOpacity onPress={() => setTermsModalVisible(false)}>
                  <MaterialIcons name="close" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#64748b", marginBottom: 4 }}>
                  Select clauses to include on invoice:
                </Text>

                {PRESET_TERMS.map((term, idx) => {
                  const isChecked = selectedTerms.includes(term);
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.termRow, isChecked && styles.termRowActive]}
                      onPress={() => {
                        if (isChecked) {
                          setSelectedTerms((prev) => prev.filter((t) => t !== term));
                        } else {
                          setSelectedTerms((prev) => [...prev, term]);
                        }
                      }}
                    >
                      <MaterialIcons
                        name={isChecked ? "check-box" : "check-box-outline-blank"}
                        size={22}
                        color={isChecked ? "#2563eb" : "#94a3b8"}
                      />
                      <Text style={[styles.termText, isChecked && styles.termTextActive]}>{term}</Text>
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  style={styles.addCustomTermBtn}
                  onPress={() => {
                    setTempCustomTerm("");
                    setCreateTermModalVisible(true);
                  }}
                >
                  <MaterialIcons name="add" size={18} color="#2563eb" />
                  <Text style={styles.addCustomTermText}>Add Custom Clause</Text>
                </TouchableOpacity>
              </ScrollView>

              <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: "#f1f5f9" }}>
                <TouchableOpacity
                  style={styles.doneBtn}
                  onPress={() => setTermsModalVisible(false)}
                >
                  <Text style={styles.doneBtnText}>Done ({selectedTerms.length} Selected)</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Create Custom Term Dialog */}
        <Modal visible={createTermModalVisible} transparent animationType="fade">
          <View style={styles.centerBackdrop}>
            <View style={styles.dialogCard}>
              <Text style={styles.dialogTitle}>Add Custom Clause</Text>
              <TextInput
                style={styles.customTermInput}
                placeholder="Enter term or condition..."
                value={tempCustomTerm}
                onChangeText={setTempCustomTerm}
                multiline
                numberOfLines={3}
                autoFocus
              />
              <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                <TouchableOpacity
                  style={[styles.dialogBtn, { backgroundColor: "#f1f5f9" }]}
                  onPress={() => setCreateTermModalVisible(false)}
                >
                  <Text style={{ fontWeight: "700", color: "#475569" }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dialogBtn, { backgroundColor: "#2563eb" }]}
                  onPress={() => {
                    if (tempCustomTerm.trim()) {
                      setSelectedTerms((prev) => [...prev, tempCustomTerm.trim()]);
                    }
                    setCreateTermModalVisible(false);
                  }}
                >
                  <Text style={{ fontWeight: "700", color: "#ffffff" }}>Add Clause</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Attachments Sheet Modal */}
        <Modal visible={attachmentsSheetVisible} animationType="slide" transparent>
          <View style={styles.sheetBackdrop}>
            <View style={styles.sheetContent}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Add Attachment</Text>
                <TouchableOpacity onPress={() => setAttachmentsSheetVisible(false)}>
                  <MaterialIcons name="close" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>
              <View style={{ padding: 16, gap: 10 }}>
                <TouchableOpacity
                  style={styles.sheetOption}
                  onPress={() => handlePickAttachment(false)}
                >
                  <MaterialIcons name="photo-library" size={22} color="#2563eb" />
                  <Text style={styles.sheetOptionText}>Choose from Gallery</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sheetOption}
                  onPress={() => handlePickAttachment(true)}
                >
                  <MaterialIcons name="camera-alt" size={22} color="#059669" />
                  <Text style={styles.sheetOptionText}>Take Photo</Text>
                </TouchableOpacity>

                {attachments.length > 0 && (
                  <TouchableOpacity
                    style={[styles.sheetOption, { borderColor: "#fecaca" }]}
                    onPress={() => {
                      setAttachments([]);
                      setAttachmentsSheetVisible(false);
                    }}
                  >
                    <MaterialIcons name="delete-outline" size={22} color="#ef4444" />
                    <Text style={[styles.sheetOptionText, { color: "#ef4444" }]}>Clear All ({attachments.length})</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Modal>

        {/* Mark As Status Modal */}
        <Modal visible={markAsModalVisible} animationType="slide" transparent>
          <View style={styles.sheetBackdrop}>
            <View style={styles.sheetContent}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>Mark Invoice Status</Text>
                <TouchableOpacity onPress={() => setMarkAsModalVisible(false)}>
                  <MaterialIcons name="close" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>
              <View style={{ padding: 16, gap: 10 }}>
                {(["UNPAID", "PARTIALLY_PAID", "PAID"] as const).map((st) => {
                  const isSelected = status === st;
                  const label = st === "PAID" ? "Paid" : st === "PARTIALLY_PAID" ? "Partially Paid" : "Unpaid";
                  const color = st === "PAID" ? "#16a34a" : st === "PARTIALLY_PAID" ? "#ea580c" : "#475569";
                  return (
                    <TouchableOpacity
                      key={st}
                      style={[styles.sheetOption, isSelected && { borderColor: "#2563eb", backgroundColor: "#eff6ff" }]}
                      onPress={() => {
                        setStatus(st);
                        if (st === "PAID") setShowPaidStamp(true);
                        setMarkAsModalVisible(false);
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                        <MaterialIcons
                          name={st === "PAID" ? "check-circle" : st === "PARTIALLY_PAID" ? "schedule" : "bookmark-border"}
                          size={22}
                          color={color}
                        />
                        <Text style={[styles.sheetOptionText, { color, fontWeight: isSelected ? "bold" : "600" }]}>
                          {label}
                        </Text>
                      </View>
                      {isSelected ? <MaterialIcons name="check" size={20} color="#2563eb" /> : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#0f172a" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  freeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#10b981",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  freeBadgeText: { color: "white", fontSize: 10, fontWeight: "900" },
  crownBtn: { padding: 4 },
  moreBtn: { padding: 4 },
  segmentedContainer: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 12,
    padding: 3,
  },
  segmentBtn: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 10 },
  segmentBtnActive: { backgroundColor: "white", elevation: 1 },
  segmentText: { fontSize: 12, fontWeight: "600", color: "#64748b" },
  segmentTextActive: { color: "#0f172a", fontWeight: "700" },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardRowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  invoiceNumber: { fontSize: 18, fontWeight: "900", color: "#0f172a" },
  dueDateText: { fontSize: 12, color: "#64748b", marginTop: 2 },
  docTypeBadge: { flexDirection: "row", alignItems: "center", gap: 2 },
  docTypeBadgeText: { fontSize: 12, fontWeight: "700", color: "#0f172a" },
  cardLeftGroup: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cardSectionTitle: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  freeSubText: { fontSize: 10, color: "#16a34a", fontWeight: "700", marginTop: 1 },
  cardItemTitle: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  cardItemSub: { fontSize: 12, color: "#64748b", marginTop: 1 },
  circleAddBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
  },
  dottedConnector: {
    width: 1,
    height: 18,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderStyle: "dashed",
    marginLeft: 18,
    marginVertical: 4,
  },
  templateThumbRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  miniThumb: {
    width: 24,
    height: 30,
    borderRadius: 4,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    padding: 2,
    justifyContent: "space-between",
  },
  miniThumbLineBlue: { height: 3, backgroundColor: "#2563eb", borderRadius: 1 },
  miniThumbLine: { height: 2, backgroundColor: "#cbd5e1", borderRadius: 1 },
  itemRowCard: {
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  itemHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  itemDescInput: {
    flex: 1,
    fontSize: 13,
    color: "#0f172a",
    backgroundColor: "white",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  itemInputsGrid: { flexDirection: "row", gap: 8, marginTop: 8 },
  itemColLabel: { fontSize: 9, fontWeight: "700", color: "#94a3b8", marginBottom: 2 },
  itemInput: {
    backgroundColor: "white",
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  itemStaticTotal: { fontSize: 13, fontWeight: "800", color: "#0f172a", marginTop: 6 },
  calcBreakdown: { marginTop: 12, borderTopWidth: 1, borderTopColor: "#f1f5f9", paddingTop: 10, gap: 6 },
  calcRow: { flexDirection: "row", justifyContent: "space-between" },
  calcLabel: { fontSize: 12, color: "#64748b" },
  calcValue: { fontSize: 12, fontWeight: "700", color: "#0f172a" },
  dottedDivider: { height: 1, borderWidth: 0.5, borderColor: "#e2e8f0", borderStyle: "dashed", marginVertical: 4 },
  subtotalLabel: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  subtotalValue: { fontSize: 14, fontWeight: "900", color: "#0f172a" },
  adjustmentBody: { marginTop: 10, borderTopWidth: 1, borderTopColor: "#f1f5f9", paddingTop: 10 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 10,
  },
  totalLabel: { fontSize: 15, fontWeight: "800", color: "#0f172a" },
  totalValue: { fontSize: 18, fontWeight: "900", color: "#0f172a" },
  cardRightGroup: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardValueText: { fontSize: 13, fontWeight: "700", color: "#0f172a" },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    gap: 12,
  },
  previewBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
  },
  previewBtnText: { color: "#2563eb", fontSize: 15, fontWeight: "bold" },
  saveBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: { color: "white", fontSize: 15, fontWeight: "bold" },
  pickerModalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  pickerModalContent: { backgroundColor: "white", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "60%" },
  pickerModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  pickerModalTitle: { fontSize: 15, fontWeight: "bold", color: "#0f172a" },
  customerOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  customerOptionSelected: { borderColor: "#2563eb", backgroundColor: "#eff6ff" },
  customerOptionName: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  customerOptionMeta: { fontSize: 11, color: "#64748b", marginTop: 2 },
  aiCard: {
    backgroundColor: "#f0fdf4",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  aiCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  aiCardTitle: { fontSize: 13, fontWeight: "bold", color: "#065f46" },
  aiBadge: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  aiBadgeText: { fontSize: 9, fontWeight: "bold", color: "#166534" },
  aiFeedbackBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#dcfce7",
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  aiFeedbackText: { fontSize: 11, color: "#166534", fontWeight: "600", flex: 1 },
  aiInputRow: { flexDirection: "row", gap: 6 },
  aiTextInput: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: "#0f172a",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  aiSubmitBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#10b981",
    alignItems: "center",
    justifyContent: "center",
  },
  aiChip: {
    backgroundColor: "white",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  aiChipText: { fontSize: 10, fontWeight: "600", color: "#065f46" },
  attachedBadge: {
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  attachedBadgeText: { fontSize: 11, fontWeight: "bold", color: "#059669" },
  signaturePreviewWrap: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  signatureThumb: { width: 140, height: 44 },
  removeSigBtn: { flexDirection: "row", alignItems: "center", gap: 3, padding: 4 },
  removeSigText: { fontSize: 11, fontWeight: "700", color: "#ef4444" },
  attachStrip: { marginTop: 10, flexDirection: "row" },
  attachItem: {
    position: "relative",
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: "hidden",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  attachThumb: { width: "100%", height: "100%" },
  attachDeleteBtn: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "rgba(239, 68, 68, 0.85)",
    borderRadius: 8,
    padding: 2,
  },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusPaid: { backgroundColor: "#dcfce7" },
  statusPartial: { backgroundColor: "#ffedd5" },
  statusUnpaid: { backgroundColor: "#f1f5f9" },
  statusPillText: { fontSize: 12, fontWeight: "800" },
  sheetBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheetContent: { backgroundColor: "white", borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  sheetTitle: { fontSize: 16, fontWeight: "bold", color: "#0f172a" },
  sheetOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 12,
  },
  sheetOptionText: { fontSize: 14, fontWeight: "600", color: "#0f172a" },
  termRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 10,
    backgroundColor: "#ffffff",
  },
  termRowActive: { borderColor: "#2563eb", backgroundColor: "#eff6ff" },
  termText: { fontSize: 13, color: "#334155", flex: 1, lineHeight: 18 },
  termTextActive: { color: "#1e40af", fontWeight: "600" },
  addCustomTermBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    backgroundColor: "#eff6ff",
    marginTop: 4,
  },
  addCustomTermText: { fontSize: 13, fontWeight: "700", color: "#2563eb" },
  doneBtn: {
    backgroundColor: "#2563eb",
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  doneBtnText: { color: "white", fontSize: 15, fontWeight: "bold" },
  centerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  dialogCard: { width: "100%", backgroundColor: "white", borderRadius: 16, padding: 20 },
  dialogTitle: { fontSize: 16, fontWeight: "bold", color: "#0f172a", marginBottom: 12 },
  customTermInput: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: "#0f172a",
    minHeight: 80,
    textAlignVertical: "top",
  },
  dialogBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});

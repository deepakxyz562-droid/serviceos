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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAppStore } from "@/store/app";
import { api, apiPost } from "@/api/client";
import {
  computeInvoiceTotals,
  formatCurrency,
  type DocumentType,
  type CalcLineItem,
} from "@/lib/quote-flow-calc";
import { MaterialIcons, Feather } from "@expo/vector-icons";

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
    currency: business?.currency || "INR",
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
      const r = await apiPost<{ invoice: any }>("/api/mobile/invoices/create-with-items", {
        customerId: selectedCustomer.id,
        items: items.map((i) => ({
          description: i.description,
          qty: i.qty,
          unitPrice: i.unitPrice,
        })),
        discountValue: parseFloat(discountValue) || 0,
        discountType,
        taxRate: docType === "SIMPLE_BILL" ? parseFloat(globalTaxRate) || 0 : 18,
        pdfTemplate: selectedTemplateId,
      });

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

  const currency = business?.currency || "INR";

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
            <View style={styles.cardRowBetween}>
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
              <TouchableOpacity
                style={styles.circleAddBtn}
                onPress={() => setPickerOpen(true)}
              >
                <MaterialIcons name="add" size={18} color="white" />
              </TouchableOpacity>
            </View>
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
                        onChangeText={(t) => updateItem(idx, { qty: parseFloat(t) || 1 })}
                        style={styles.itemInput}
                      />
                    </View>
                    <View style={{ flex: 1.2 }}>
                      <Text style={styles.itemColLabel}>PRICE</Text>
                      <TextInput
                        keyboardType="decimal-pad"
                        value={String(item.unitPrice)}
                        onChangeText={(t) => updateItem(idx, { unitPrice: parseFloat(t) || 0 })}
                        style={styles.itemInput}
                      />
                    </View>
                    {docType === "TAX_INVOICE" ? (
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemColLabel}>GST %</Text>
                        <TextInput
                          keyboardType="decimal-pad"
                          value={String(item.taxRate ?? 18)}
                          onChangeText={(t) => updateItem(idx, { taxRate: parseFloat(t) || 0 })}
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
                      onChangeText={setDiscountValue}
                      style={styles.itemInput}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemColLabel}>SHIPPING FEE</Text>
                    <TextInput
                      keyboardType="decimal-pad"
                      value={shippingFee}
                      onChangeText={setShippingFee}
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
                      onChangeText={setGlobalTaxRate}
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
          <View style={styles.card}>
            <View style={styles.cardRowBetween}>
              <View style={styles.cardLeftGroup}>
                <View style={[styles.iconBox, { backgroundColor: "#fefce8" }]}>
                  <MaterialIcons name="payments" size={18} color="#ca8a04" />
                </View>
                <Text style={styles.cardSectionTitle}>Currency</Text>
              </View>
              <View style={styles.cardRightGroup}>
                <Text style={styles.cardValueText}>INR ₹</Text>
                <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
              </View>
            </View>
          </View>

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

        {/* Customer Picker Modal */}
        <Modal visible={pickerOpen} animationType="slide" transparent>
          <View style={styles.pickerModalBackdrop}>
            <View style={styles.pickerModalContent}>
              <View style={styles.pickerModalHeader}>
                <Text style={styles.pickerModalTitle}>Select Client</Text>
                <TouchableOpacity onPress={() => setPickerOpen(false)}>
                  <MaterialIcons name="close" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
                {customers.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => {
                      setSelectedCustomer(c);
                      setPickerOpen(false);
                    }}
                    style={[
                      styles.customerOption,
                      selectedCustomer?.id === c.id && styles.customerOptionSelected,
                    ]}
                  >
                    <View>
                      <Text style={styles.customerOptionName}>{c.name}</Text>
                      <Text style={styles.customerOptionMeta}>{c.email || c.phone || "No details"}</Text>
                    </View>
                    {selectedCustomer?.id === c.id && (
                      <MaterialIcons name="check" size={20} color="#2563eb" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

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
});

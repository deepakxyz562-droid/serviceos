/**
 * Edit Quote / Estimate screen — 1:1 match with Invoice Maker reference (edit.jpeg & edit-2.jpeg).
 * Features:
 * - Top doc type segmented pills: Standard Estimate | Formal Proposal | Simple Quote
 * - Estimate meta card (Number, Valid Until, Payment Terms)
 * - Templates card with thumbnail preview leading to customize
 * - Connected Bill From & Bill To cards with vertical dotted guide
 * - Items card with line items & quick item picker modal
 * - Dashed separator subtotal & Adjustment row (discount, tax, shipping)
 * - Total row
 * - Extended settings: Currency, Payment Method, Signature, Terms or Notes, Status picker, Delete
 * - Sticky bottom bar: [ Preview ] and [ Save ]
 */
import { useEffect, useState, useCallback } from "react";
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
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAppStore } from "@/store/app";
import { api, apiPatch, apiDelete } from "@/api/client";
import { formatCurrency, computeTotals } from "@/lib/quote-flow-calc";
import { MaterialIcons, Feather, FontAwesome5 } from "@expo/vector-icons";

interface Item {
  description: string;
  qty: string;
  unitPrice: string;
}

export default function QuoteEditScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const business = useAppStore((s) => s.business);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [quote, setQuote] = useState<any | null>(null);

  // Form fields matching edit.jpeg
  const [docType, setDocType] = useState<"STANDARD_ESTIMATE" | "FORMAL_PROPOSAL" | "SIMPLE_QUOTE">("STANDARD_ESTIMATE");
  const [quoteNumber, setQuoteNumber] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("modern");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [discountValue, setDiscountValue] = useState("0");
  const [discountType, setDiscountType] = useState<"AMOUNT" | "PERCENT">("AMOUNT");
  const [taxRate, setTaxRate] = useState("0");
  const [currency, setCurrency] = useState(business?.currency || "INR");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("DRAFT");

  // Modals for sub-flows
  const [metaModalVisible, setMetaModalVisible] = useState(false);
  const [adjustModalVisible, setAdjustModalVisible] = useState(false);
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [itemPickerVisible, setItemPickerVisible] = useState(false);
  const [availableItems, setAvailableItems] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<{ quote: any }>(`/api/quotes/${params.id}`);
      const q = r.quote;
      setQuote(q);
      setQuoteNumber(q.number || "");
      setValidUntil(q.validUntil ? q.validUntil.split("T")[0] : "");
      setNotes(q.notes || "");
      setStatus(q.status || "DRAFT");
      setDiscountValue(String(q.discountValue || 0));
      setDiscountType(q.discountType || "AMOUNT");
      setTaxRate(String(q.taxRate || 0));
      setClientName(q.customer?.name || "");
      setClientEmail(q.customer?.email || "");
      setCurrency(business?.currency || "INR");

      if (q.pdfTemplate) {
        const tpl = q.pdfTemplate.includes(":")
          ? q.pdfTemplate.split(":").pop()!
          : q.pdfTemplate;
        setSelectedTemplateId(tpl);
      }

      setItems(
        (q.items || []).map((it: any) => ({
          description: it.description,
          qty: String(it.qty),
          unitPrice: String(it.unitPrice),
        }))
      );

      // Load item library for picker
      const itemsRes = await api<{ items: any[] }>("/api/quote-flow/items").catch(() => ({ items: [] }));
      setAvailableItems(itemsRes.items || []);
    } catch (e: any) {
      Alert.alert("Failed", e.message || "Could not load estimate");
    } finally {
      setLoading(false);
    }
  }, [params.id, business?.currency]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = computeTotals(
    items.map((i) => ({ qty: parseFloat(i.qty) || 0, unitPrice: parseFloat(i.unitPrice) || 0 })),
    parseFloat(discountValue) || 0,
    discountType,
    parseFloat(taxRate) || 0,
    currency
  );

  function updateItem(idx: number, field: keyof Item, value: string) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  }

  function addItem() {
    setItems((prev) => [...prev, { description: "", qty: "1", unitPrice: "0" }]);
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function pickLibraryItem(it: any) {
    setItems((prev) => [
      ...prev,
      { description: it.name, qty: "1", unitPrice: String(it.unitPrice) },
    ]);
    setItemPickerVisible(false);
  }

  async function handleSave(thenPreview = false) {
    if (items.length === 0) {
      Alert.alert("Error", "Please add at least one line item");
      return;
    }
    setSaving(true);
    try {
      await apiPatch(`/api/quotes/${params.id}`, {
        items: items.map((i) => ({
          description: i.description,
          qty: parseFloat(i.qty) || 0,
          unitPrice: parseFloat(i.unitPrice) || 0,
        })),
        discountValue: parseFloat(discountValue) || 0,
        discountType,
        taxRate: parseFloat(taxRate) || 0,
        validUntil: validUntil ? new Date(validUntil).toISOString() : null,
        notes,
        status,
        pdfTemplate: selectedTemplateId,
      });

      if (thenPreview) {
        router.replace(`/quote/${params.id}`);
      } else {
        router.back();
      }
    } catch (e: any) {
      Alert.alert("Save failed", e.message || "Could not update estimate");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    Alert.alert("Delete Estimate", "Are you sure you want to delete this estimate?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await apiDelete(`/api/quotes/${params.id}`);
            router.replace("/(tabs)/quotes");
          } catch (e: any) {
            Alert.alert("Failed", e.message);
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <ActivityIndicator size="large" color="#059669" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {/* Top Header matching edit.jpeg */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <MaterialIcons name="arrow-back-ios" size={20} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Estimate</Text>
        <View style={styles.headerRight}>
          <FontAwesome5 name="crown" size={17} color="#f59e0b" style={{ marginRight: 16 }} />
          <TouchableOpacity onPress={() => setStatusModalVisible(true)} style={styles.headerBtn}>
            <MaterialIcons name="more-vert" size={22} color="#1e293b" />
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Segmented Doc Type Tabs (edit.jpeg) */}
          <View style={styles.segmentedRow}>
            <TouchableOpacity
              style={[
                styles.segmentTab,
                docType === "STANDARD_ESTIMATE" && styles.segmentTabActive,
              ]}
              onPress={() => setDocType("STANDARD_ESTIMATE")}
            >
              <Text
                style={[
                  styles.segmentText,
                  docType === "STANDARD_ESTIMATE" && styles.segmentTextActive,
                ]}
              >
                Estimate
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentTab,
                docType === "FORMAL_PROPOSAL" && styles.segmentTabActive,
              ]}
              onPress={() => setDocType("FORMAL_PROPOSAL")}
            >
              <Text
                style={[
                  styles.segmentText,
                  docType === "FORMAL_PROPOSAL" && styles.segmentTextActive,
                ]}
              >
                Proposal
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentTab,
                docType === "SIMPLE_QUOTE" && styles.segmentTabActive,
              ]}
              onPress={() => setDocType("SIMPLE_QUOTE")}
            >
              <Text
                style={[
                  styles.segmentText,
                  docType === "SIMPLE_QUOTE" && styles.segmentTextActive,
                ]}
              >
                Simple Quote
              </Text>
            </TouchableOpacity>
          </View>

          {/* Estimate Number & Terms Meta Card (edit.jpeg) */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => setMetaModalVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.metaCardLeft}>
              <Text style={styles.metaDocNumber}>{quoteNumber || "EST0001"}</Text>
              <Text style={styles.metaTermsText}>
                {validUntil ? `Valid until ${validUntil}` : "Valid for 30 days"}
              </Text>
            </View>
            <View style={styles.cardActionRight}>
              <Text style={styles.cardActionLabel}>ESTIMATE</Text>
              <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
            </View>
          </TouchableOpacity>

          {/* Templates Card with Thumbnail Preview (edit.jpeg) */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/customize?id=${params.id}&type=quote`)}
            activeOpacity={0.8}
          >
            <View style={styles.cardIconRow}>
              <MaterialIcons name="dashboard" size={22} color="#475569" style={{ marginRight: 12 }} />
              <Text style={styles.cardTitle}>Templates</Text>
            </View>
            <View style={styles.cardActionRight}>
              <View style={styles.templateThumbMini}>
                <View style={[styles.templateThumbHeader, { backgroundColor: "#059669" }]} />
                <View style={styles.templateThumbLine} />
                <View style={[styles.templateThumbLine, { width: 14 }]} />
              </View>
              <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
            </View>
          </TouchableOpacity>

          {/* Connected Bill From & Bill To Card (edit.jpeg) */}
          <View style={styles.partiesCard}>
            {/* Bill From */}
            <TouchableOpacity
              style={styles.partyRow}
              onPress={() => router.push("/(tabs)/settings")}
            >
              <View style={[styles.partyIconWrap, { backgroundColor: "#dbeafe" }]}>
                <MaterialIcons name="business" size={18} color="#2563eb" />
              </View>
              <View style={styles.partyTextCol}>
                <Text style={styles.partyLabel}>Estimate From</Text>
                <Text style={styles.partyName} numberOfLines={1}>
                  {business?.name || "Add Business"}
                </Text>
              </View>
              <View style={styles.partyAddIcon}>
                <MaterialIcons name="edit" size={16} color="#2563eb" />
              </View>
            </TouchableOpacity>

            {/* Dotted connecting line */}
            <View style={styles.connectingLineWrap}>
              <View style={styles.connectingDot} />
              <View style={styles.connectingDot} />
              <View style={styles.connectingDot} />
            </View>

            {/* Bill To */}
            <TouchableOpacity
              style={styles.partyRow}
              onPress={() => router.push("/(tabs)/customers")}
            >
              <View style={[styles.partyIconWrap, { backgroundColor: "#ffedd5" }]}>
                <MaterialIcons name="people" size={18} color="#ea580c" />
              </View>
              <View style={styles.partyTextCol}>
                <Text style={styles.partyLabel}>Estimate For</Text>
                <Text style={styles.partyName} numberOfLines={1}>
                  {clientName || "Add Clients"}
                </Text>
              </View>
              <View style={[styles.partyAddIcon, { backgroundColor: "#ea580c" }]}>
                <MaterialIcons name="add" size={18} color="#ffffff" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Items Section (edit.jpeg) */}
          <View style={styles.card}>
            <View style={styles.itemsHeaderRow}>
              <View style={styles.cardIconRow}>
                <View style={[styles.partyIconWrap, { backgroundColor: "#dcfce7", marginRight: 10 }]}>
                  <MaterialIcons name="receipt-long" size={18} color="#16a34a" />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Items</Text>
                  <Text style={styles.cardSubText}>Add Items</Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {availableItems.length > 0 && (
                  <TouchableOpacity
                    style={styles.btnSmOutline}
                    onPress={() => setItemPickerVisible(true)}
                  >
                    <Text style={styles.btnSmOutlineText}>Library</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.itemAddIcon, { backgroundColor: "#059669" }]}
                  onPress={addItem}
                >
                  <MaterialIcons name="add" size={20} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* List of items */}
            {items.map((it, idx) => (
              <View key={idx} style={styles.editItemBox}>
                <View style={styles.editItemTop}>
                  <TextInput
                    style={styles.editItemDescInput}
                    placeholder="Item description / service"
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
                        currency
                      )}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Subtotal Row with Dashed Separator (edit.jpeg) */}
          <View style={styles.subtotalRow}>
            <Text style={styles.subtotalLabel}>Subtotal</Text>
            <Text style={styles.subtotalVal}>
              {formatCurrency(totals.subtotal, currency)}
            </Text>
          </View>
          <View style={styles.dashedDivider} />

          {/* Adjustment Row (Discount, Tax) (edit.jpeg) */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => setAdjustModalVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.cardIconRow}>
              <MaterialIcons name="tune" size={20} color="#475569" style={{ marginRight: 12 }} />
              <View>
                <Text style={styles.cardTitle}>Adjustment</Text>
                <Text style={styles.cardSubText}>
                  Add Discount ({discountValue ? `${discountValue}${discountType === "PERCENT" ? "%" : ""}` : "0"}) & Tax ({taxRate}%)
                </Text>
              </View>
            </View>
            <MaterialIcons name="unfold-more" size={22} color="#94a3b8" />
          </TouchableOpacity>

          {/* Total Row (edit.jpeg) */}
          <View style={styles.grandTotalCard}>
            <Text style={styles.grandTotalLabel}>Estimate Total</Text>
            <Text style={[styles.grandTotalVal, { color: "#059669" }]}>
              {formatCurrency(totals.total, currency)}
            </Text>
          </View>

          {/* Extended Settings Rows (edit-2.jpeg) */}
          <View style={styles.optionsCard}>
            {/* Currency */}
            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => {
                const nextCurr = currency === "INR" ? "USD" : currency === "USD" ? "EUR" : "INR";
                setCurrency(nextCurr);
              }}
            >
              <View style={styles.cardIconRow}>
                <MaterialIcons name="payments" size={20} color="#475569" style={{ marginRight: 12 }} />
                <Text style={styles.optionRowTitle}>Currency</Text>
              </View>
              <View style={styles.cardActionRight}>
                <Text style={styles.optionRowValue}>{currency} {currency === "INR" ? "₹" : "$"}</Text>
                <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
              </View>
            </TouchableOpacity>

            {/* Terms or Notes */}
            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => setNotesModalVisible(true)}
            >
              <View style={styles.cardIconRow}>
                <MaterialIcons name="notes" size={20} color="#475569" style={{ marginRight: 12 }} />
                <Text style={styles.optionRowTitle}>Terms or Notes</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
            </TouchableOpacity>

            {/* Mark as Status */}
            <TouchableOpacity
              style={[styles.optionRow, { borderBottomWidth: 0 }]}
              onPress={() => setStatusModalVisible(true)}
            >
              <View style={styles.cardIconRow}>
                <MaterialIcons name="bookmark-border" size={20} color="#475569" style={{ marginRight: 12 }} />
                <Text style={styles.optionRowTitle}>Status</Text>
              </View>
              <View style={styles.cardActionRight}>
                <Text style={styles.optionRowValue}>{status}</Text>
                <MaterialIcons name="chevron-right" size={20} color="#94a3b8" />
              </View>
            </TouchableOpacity>
          </View>

          {/* Delete Estimate Button (edit-2.jpeg) */}
          <TouchableOpacity style={styles.deleteInvoiceBtn} onPress={handleDelete}>
            <Feather name="trash-2" size={18} color="#ef4444" style={{ marginRight: 8 }} />
            <Text style={styles.deleteInvoiceBtnText}>Delete Estimate</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky Bottom Action Bar (edit.jpeg & edit-2.jpeg) */}
      <View style={styles.stickyBottomBar}>
        <TouchableOpacity
          style={[styles.bottomPreviewBtn, { borderColor: "#059669" }]}
          onPress={() => handleSave(true)}
        >
          <Text style={[styles.bottomPreviewText, { color: "#059669" }]}>Preview</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bottomSaveBtn, { backgroundColor: "#059669" }, saving && { opacity: 0.6 }]}
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

      {/* Adjustment Modal */}
      <Modal
        visible={adjustModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAdjustModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setAdjustModalVisible(false)}
        >
          <View style={styles.adjustModalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalHeading}>Adjustments</Text>

            <Text style={styles.inputGroupLabel}>Discount</Text>
            <View style={styles.discountRow}>
              <TextInput
                style={[styles.modalInput, { flex: 1 }]}
                keyboardType="decimal-pad"
                value={discountValue}
                onChangeText={setDiscountValue}
                placeholder="0"
              />
              <TouchableOpacity
                style={[
                  styles.discountTypeBtn,
                  discountType === "AMOUNT" && styles.discountTypeBtnActive,
                ]}
                onPress={() => setDiscountType("AMOUNT")}
              >
                <Text style={styles.discountTypeBtnText}>{currency === "INR" ? "₹" : "$"}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.discountTypeBtn,
                  discountType === "PERCENT" && styles.discountTypeBtnActive,
                ]}
                onPress={() => setDiscountType("PERCENT")}
              >
                <Text style={styles.discountTypeBtnText}>%</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputGroupLabel}>Tax Rate (%)</Text>
            <TextInput
              style={styles.modalInput}
              keyboardType="decimal-pad"
              value={taxRate}
              onChangeText={setTaxRate}
              placeholder="0"
            />

            <TouchableOpacity
              style={[styles.modalDoneBtn, { backgroundColor: "#059669" }]}
              onPress={() => setAdjustModalVisible(false)}
            >
              <Text style={styles.modalDoneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Meta Modal (Quote Number & Valid Until) */}
      <Modal
        visible={metaModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMetaModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setMetaModalVisible(false)}
        >
          <View style={styles.adjustModalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalHeading}>Estimate Info</Text>

            <Text style={styles.inputGroupLabel}>Quote / Estimate Number</Text>
            <TextInput
              style={styles.modalInput}
              value={quoteNumber}
              onChangeText={setQuoteNumber}
              placeholder="EST0001"
            />

            <Text style={styles.inputGroupLabel}>Valid Until (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.modalInput}
              value={validUntil}
              onChangeText={setValidUntil}
              placeholder="2026-11-15"
            />

            <TouchableOpacity
              style={[styles.modalDoneBtn, { backgroundColor: "#059669" }]}
              onPress={() => setMetaModalVisible(false)}
            >
              <Text style={styles.modalDoneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Notes Modal */}
      <Modal
        visible={notesModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNotesModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setNotesModalVisible(false)}
        >
          <View style={styles.adjustModalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalHeading}>Terms & Notes</Text>
            <TextInput
              style={[styles.modalInput, { height: 100, textAlignVertical: "top" }]}
              multiline
              value={notes}
              onChangeText={setNotes}
              placeholder="Payment terms, timeline, scope of work..."
            />
            <TouchableOpacity
              style={[styles.modalDoneBtn, { backgroundColor: "#059669" }]}
              onPress={() => setNotesModalVisible(false)}
            >
              <Text style={styles.modalDoneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Status Picker Modal */}
      <Modal
        visible={statusModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setStatusModalVisible(false)}
        >
          <View style={styles.adjustModalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalHeading}>Change Status</Text>
            {["DRAFT", "SENT", "ACCEPTED", "REJECTED"].map((st) => (
              <TouchableOpacity
                key={st}
                style={[styles.statusSelectRow, status === st && styles.statusSelectRowActive]}
                onPress={() => {
                  setStatus(st);
                  setStatusModalVisible(false);
                }}
              >
                <Text style={[styles.statusSelectText, status === st && styles.statusSelectTextActive]}>
                  {st}
                </Text>
                {status === st && <Feather name="check" size={18} color="#059669" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Item Library Picker Modal */}
      <Modal
        visible={itemPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setItemPickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setItemPickerVisible(false)}
        >
          <View style={styles.adjustModalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalHeading}>Select from Library</Text>
            {availableItems.length === 0 ? (
              <Text style={{ color: "#64748b", marginVertical: 16 }}>No items saved yet</Text>
            ) : (
              <ScrollView style={{ maxHeight: 240 }}>
                {availableItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.libraryItemRow}
                    onPress={() => pickLibraryItem(item)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.libraryItemName}>{item.name}</Text>
                      {item.description ? (
                        <Text style={styles.libraryItemSub}>{item.description}</Text>
                      ) : null}
                    </View>
                    <Text style={styles.libraryItemPrice}>
                      {formatCurrency(item.unitPrice, currency)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity
              style={[styles.modalDoneBtn, { marginTop: 12, backgroundColor: "#059669" }]}
              onPress={() => setItemPickerVisible(false)}
            >
              <Text style={styles.modalDoneBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  segmentedRow: {
    flexDirection: "row",
    backgroundColor: "#e2e8f0",
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  segmentTabActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748b",
  },
  segmentTextActive: {
    color: "#0f172a",
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  metaCardLeft: {
    flex: 1,
  },
  metaDocNumber: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 2,
  },
  metaTermsText: {
    fontSize: 12,
    color: "#64748b",
  },
  cardActionRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardActionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
    marginRight: 4,
  },
  cardIconRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  cardSubText: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 1,
  },
  templateThumbMini: {
    width: 28,
    height: 36,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    padding: 2,
    marginRight: 6,
    backgroundColor: "#ffffff",
  },
  templateThumbHeader: {
    height: 6,
    backgroundColor: "#059669",
    borderRadius: 1,
    marginBottom: 3,
  },
  templateThumbLine: {
    height: 2,
    backgroundColor: "#e2e8f0",
    marginBottom: 2,
  },
  partiesCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
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
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  partyTextCol: {
    flex: 1,
  },
  partyLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
  },
  partyName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  partyAddIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
  },
  connectingLineWrap: {
    marginLeft: 17,
    paddingVertical: 4,
    gap: 3,
  },
  connectingDot: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: "#cbd5e1",
  },
  itemsHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 12,
  },
  itemAddIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#059669",
    justifyContent: "center",
    alignItems: "center",
  },
  btnSmOutline: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  btnSmOutlineText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  editItemBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  editItemTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  editItemDescInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
    padding: 0,
  },
  editItemBottomRow: {
    flexDirection: "row",
    alignItems: "flex-end",
  },
  qtyPriceWrap: {
    width: 65,
    marginRight: 6,
  },
  inputMiniLabel: {
    fontSize: 10,
    color: "#64748b",
    marginBottom: 2,
  },
  miniInput: {
    backgroundColor: "#ffffff",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingHorizontal: 6,
    paddingVertical: 4,
    fontSize: 13,
    color: "#0f172a",
    textAlign: "center",
  },
  multiplySign: {
    fontSize: 14,
    color: "#94a3b8",
    marginRight: 6,
    marginBottom: 6,
  },
  itemTotalVal: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 4,
  },
  subtotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  subtotalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },
  subtotalVal: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  dashedDivider: {
    borderBottomWidth: 1,
    borderColor: "#cbd5e1",
    borderStyle: "dashed",
    marginVertical: 8,
  },
  grandTotalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
  },
  grandTotalVal: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0f172a",
  },
  optionsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  optionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  optionRowTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1e293b",
  },
  optionRowValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
    marginRight: 4,
  },
  deleteInvoiceBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fee2e2",
    borderRadius: 10,
    paddingVertical: 14,
    marginBottom: 20,
  },
  deleteInvoiceBtnText: {
    fontSize: 14,
    fontWeight: "700",
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
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  bottomPreviewBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
  },
  bottomPreviewText: {
    fontSize: 15,
    fontWeight: "700",
  },
  bottomSaveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  bottomSaveText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  adjustModalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeading: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 16,
  },
  inputGroupLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0f172a",
    marginBottom: 14,
  },
  discountRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  discountTypeBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8fafc",
  },
  discountTypeBtnActive: {
    backgroundColor: "#059669",
    borderColor: "#059669",
  },
  discountTypeBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  modalDoneBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 6,
  },
  modalDoneBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
  statusSelectRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  statusSelectRowActive: {
    backgroundColor: "#ecfdf5",
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  statusSelectText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#334155",
  },
  statusSelectTextActive: {
    color: "#059669",
  },
  libraryItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  libraryItemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
  },
  libraryItemSub: {
    fontSize: 11,
    color: "#64748b",
  },
  libraryItemPrice: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
  },
});

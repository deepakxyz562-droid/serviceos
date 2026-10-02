import { useEffect, useState } from "react";
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
  FlatList,
  Modal,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAppStore } from "@/store/app";
import { api, apiPost } from "@/api/client";
import { formatCurrency } from "@/lib/format";
import { MaterialIcons } from "@expo/vector-icons";

interface Item {
  description: string;
  qty: number;
  unitPrice: number;
}

function computeTotals(
  items: Item[],
  discountValue: number,
  discountType: "AMOUNT" | "PERCENT",
  taxRate: number
) {
  const subtotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  let discount = 0;
  if (discountType === "PERCENT") discount = (subtotal * (discountValue || 0)) / 100;
  else discount = Math.min(discountValue || 0, subtotal);
  const taxable = Math.max(0, subtotal - discount);
  const tax = (taxable * (taxRate || 0)) / 100;
  const total = taxable + tax;
  return {
    subtotal: Math.round((subtotal + Number.EPSILON) * 100) / 100,
    discount: Math.round((discount + Number.EPSILON) * 100) / 100,
    tax: Math.round((tax + Number.EPSILON) * 100) / 100,
    total: Math.round((total + Number.EPSILON) * 100) / 100,
  };
}

export default function QuoteCreateScreen() {
  const router = useRouter();
  const business = useAppStore((s) => s.business);
  const [mode, setMode] = useState<"choose" | "manual" | "ai-text">("choose");
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([{ description: "", qty: 1, unitPrice: 0 }]);
  const [discountValue, setDiscountValue] = useState("0");
  const [discountType, setDiscountType] = useState<"AMOUNT" | "PERCENT">("AMOUNT");
  const [taxRate, setTaxRate] = useState(String(business?.defaultTaxRate ?? 0));
  const [notes, setNotes] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [pdfTemplate, setPdfTemplate] = useState<"modern" | "simple">("modern");
  const [loading, setLoading] = useState(false);

  // AI text state
  const [aiInput, setAiInput] = useState("");
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiCustomerSuggestion, setAiCustomerSuggestion] = useState<string | null>(null);

  useEffect(() => {
    api<{ customers: any[] }>("/api/mobile/customers").then((r) => setCustomers(r.customers || []));
  }, []);

  const totals = computeTotals(parsedItems(), parseFloat(discountValue) || 0, discountType, parseFloat(taxRate) || 0);

  function parsedItems(): Item[] {
    return items;
  }

  function updateItem(idx: number, patch: Partial<Item>) {
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function addItem() {
    setItems((arr) => [...arr, { description: "", qty: 1, unitPrice: 0 }]);
  }
  function removeItem(idx: number) {
    setItems((arr) => arr.filter((_, i) => i !== idx));
  }

  function applyAiDraft(draft: any) {
    if (draft.items && draft.items.length > 0) {
      setItems(
        draft.items.map((i: any) => ({
          description: i.description,
          qty: i.qty,
          unitPrice: i.unitPrice,
        }))
      );
    }
    if (typeof draft.discountValue === "number") setDiscountValue(String(draft.discountValue));
    if (draft.discountType) setDiscountType(draft.discountType);
    if (typeof draft.taxRate === "number") setTaxRate(String(draft.taxRate));
    if (draft.notes) setNotes(draft.notes);
    if (draft.summary) setAiSummary(draft.summary);
    if (draft.customerName) setAiCustomerSuggestion(draft.customerName);
  }

  async function processAiText() {
    if (aiInput.trim().length < 5) {
      Alert.alert("Please describe the job in more detail");
      return;
    }
    setAiProcessing(true);
    try {
      const r = await apiPost<{ draft: any }>("/api/mobile/ai/quote-from-text", {
        text: aiInput,
      });
      if (!r.draft) {
        Alert.alert("AI failed", "Please rephrase your description");
        setAiProcessing(false);
        return;
      }
      applyAiDraft(r.draft);
      setMode("manual");
    } catch (e: any) {
      Alert.alert("AI failed", e.message);
    } finally {
      setAiProcessing(false);
    }
  }

  async function save() {
    if (!selectedCustomer) {
      Alert.alert("Pick a customer first");
      return;
    }
    if (items.some((i) => !i.description.trim())) {
      Alert.alert("Fill in all item descriptions");
      return;
    }
    setLoading(true);
    try {
      const validUntilDate = validUntil
        ? new Date(validUntil).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const r = await apiPost<{ quote: any }>("/api/mobile/quotes/create-with-items", {
        customerId: selectedCustomer.id,
        items: items.map((i) => ({
          description: i.description,
          qty: i.qty,
          unitPrice: i.unitPrice,
        })),
        discountValue: parseFloat(discountValue) || 0,
        discountType,
        taxRate: parseFloat(taxRate) || 0,
        validUntil: validUntilDate,
        notes: notes || undefined,
        aiRawInput: aiInput || undefined,
        pdfTemplate,
      });
      router.replace(`/quote/${r.quote.id}`);
    } catch (e: any) {
      Alert.alert("Save failed", e.message);
    } finally {
      setLoading(false);
    }
  }

  // ----- Choose mode -----
  if (mode === "choose") {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Quote</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.body}>
          <Text style={styles.title}>Choose how to create it</Text>
          <Text style={styles.subtitle}>AI text + manual builder ready. Voice arrives Phase 5.</Text>
          <View style={styles.modes}>
            <ModeCard
              icon="✦"
              title="Describe the job"
              subtitle="Type it in plain words"
              tag="Now"
              onPress={() => setMode("ai-text")}
            />
            <ModeCard
              icon="🎙️"
              title="Speak it"
              subtitle="Coming in Phase 5 (expo-speech-recognition)"
              tag="Phase 5"
            />
            <ModeCard
              icon="✎"
              title="Create manually"
              subtitle="Full control over line items"
              tag="Now"
              onPress={() => setMode("manual")}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ----- AI text mode -----
  if (mode === "ai-text") {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setMode("choose")}>
            <Text style={styles.backText}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Describe the job</Text>
          <View style={{ width: 60 }} />
        </View>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
            <View style={styles.aiHint}>
              <Text style={styles.aiHintText}>
                Type your job description in plain English. AI will extract line items, discount, tax.
              </Text>
            </View>
            <TextInput
              value={aiInput}
              onChangeText={setAiInput}
              placeholder="Build a website for ABC Company for $2500. Includes design, development, mobile responsive layout and 30 days support. Add 10% discount and 8% tax."
              multiline
              numberOfLines={6}
              style={styles.aiInput}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.aiBtn, (aiProcessing || !aiInput.trim()) && styles.aiBtnDisabled]}
              onPress={processAiText}
              disabled={aiProcessing || !aiInput.trim()}
            >
              {aiProcessing ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.aiBtnText}>Create Quote</Text>
              )}
            </TouchableOpacity>
            <Text style={styles.aiFootnote}>
              AI extracts the structure. You can fine-tune in the next step.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ----- Manual builder -----
  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setMode("choose")}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manual Quote</Text>
        <View style={{ width: 60 }} />
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
          {aiSummary && (
            <View style={styles.aiSummaryBox}>
              <Text style={styles.aiSummaryLabel}>AI summary:</Text>
              <Text style={styles.aiSummaryText}>{aiSummary}</Text>
              {aiCustomerSuggestion ? (
                <Text style={styles.aiCustomerSuggestion}>Suggested customer: {aiCustomerSuggestion}</Text>
              ) : null}
            </View>
          )}

          {/* Customer */}
          <Text style={styles.label}>Customer *</Text>
          {selectedCustomer ? (
            <TouchableOpacity style={styles.customerBtn} onPress={() => setPickerOpen(true)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.customerName}>{selectedCustomer.name}</Text>
                <Text style={styles.customerSub}>
                  {selectedCustomer.email || selectedCustomer.phone || "—"}
                </Text>
              </View>
              <MaterialIcons name="edit" size={18} color="#a8a29e" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.customerBtnEmpty}
              onPress={() => setPickerOpen(true)}
            >
              <MaterialIcons name="search" size={18} color="#a8a29e" />
              <Text style={styles.customerBtnEmptyText}>Pick a customer</Text>
            </TouchableOpacity>
          )}

          {/* Items */}
          <Text style={[styles.label, { marginTop: 16 }]}>Items</Text>
          {items.map((it, i) => (
            <View key={i} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <TextInput
                  style={styles.itemDescInput}
                  value={it.description}
                  onChangeText={(v) => updateItem(i, { description: v })}
                  placeholder="Item description"
                />
                {items.length > 1 && (
                  <TouchableOpacity onPress={() => removeItem(i)} style={styles.itemTrashBtn}>
                    <MaterialIcons name="delete-outline" size={18} color="#dc2626" />
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.itemRow3}>
                <View style={styles.itemCol}>
                  <Text style={styles.itemColLabel}>Qty</Text>
                  <TextInput
                    style={styles.itemColInput}
                    value={String(it.qty)}
                    onChangeText={(v) => updateItem(i, { qty: parseFloat(v) || 0 })}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.itemCol}>
                  <Text style={styles.itemColLabel}>Unit Price</Text>
                  <TextInput
                    style={styles.itemColInput}
                    value={String(it.unitPrice)}
                    onChangeText={(v) => updateItem(i, { unitPrice: parseFloat(v) || 0 })}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.itemCol}>
                  <Text style={styles.itemColLabel}>Amount</Text>
                  <View style={styles.itemColStatic}>
                    <Text style={styles.itemColStaticText}>
                      {formatCurrency(it.qty * it.unitPrice, business?.currency, business?.currencySymbol)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
          <TouchableOpacity style={styles.addItemBtn} onPress={addItem}>
            <MaterialIcons name="add" size={18} color="#78716c" />
            <Text style={styles.addItemBtnText}>Add item</Text>
          </TouchableOpacity>

          {/* Discount + tax */}
          <View style={styles.row2}>
            <View style={styles.col2}>
              <Text style={styles.label}>Discount</Text>
              <View style={styles.discountRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={discountValue}
                  onChangeText={setDiscountValue}
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={styles.discountTypeBtn}
                  onPress={() => setDiscountType((t) => (t === "AMOUNT" ? "PERCENT" : "AMOUNT"))}
                >
                  <Text style={styles.discountTypeText}>{discountType === "AMOUNT" ? "$" : "%"}</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.col2}>
              <Text style={styles.label}>Tax (%)</Text>
              <TextInput
                style={styles.input}
                value={taxRate}
                onChangeText={setTaxRate}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Template */}
          <Text style={[styles.label, { marginTop: 16 }]}>Template</Text>
          <View style={styles.row2}>
            <TouchableOpacity
              style={[styles.templateBtn, pdfTemplate === "modern" && styles.templateBtnActive]}
              onPress={() => setPdfTemplate("modern")}
            >
              <Text style={[styles.templateBtnText, pdfTemplate === "modern" && styles.templateBtnTextActive]}>
                Modern
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.templateBtn, pdfTemplate === "simple" && styles.templateBtnActive]}
              onPress={() => setPdfTemplate("simple")}
            >
              <Text style={[styles.templateBtnText, pdfTemplate === "simple" && styles.templateBtnTextActive]}>
                Simple
              </Text>
            </TouchableOpacity>
          </View>

          {/* Notes */}
          <Text style={[styles.label, { marginTop: 16 }]}>Notes</Text>
          <TextInput
            style={styles.input}
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional notes"
            multiline
          />

          {/* Totals */}
          <View style={styles.totalsBox}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsRowLabel}>Subtotal</Text>
              <Text style={styles.totalsRowValue}>
                {formatCurrency(totals.subtotal, business?.currency, business?.currencySymbol)}
              </Text>
            </View>
            {totals.discount > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsRowLabel}>Discount</Text>
                <Text style={styles.totalsRowValue}>
                  - {formatCurrency(totals.discount, business?.currency, business?.currencySymbol)}
                </Text>
              </View>
            )}
            {totals.tax > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsRowLabel}>Tax</Text>
                <Text style={styles.totalsRowValue}>
                  {formatCurrency(totals.tax, business?.currency, business?.currencySymbol)}
                </Text>
              </View>
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalRowLabel}>Total</Text>
              <Text style={styles.totalRowValue}>
                {formatCurrency(totals.total, business?.currency, business?.currencySymbol)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
            onPress={save}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.saveBtnText}>Save quote</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Customer picker */}
      <Modal visible={pickerOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Pick customer</Text>
              <TouchableOpacity onPress={() => setPickerOpen(false)}>
                <MaterialIcons name="close" size={22} color="#78716c" />
              </TouchableOpacity>
            </View>
            <CustomerPickerList
              customers={customers}
              onPick={(c) => {
                setSelectedCustomer(c);
                setPickerOpen(false);
              }}
              onNew={() => {
                setPickerOpen(false);
                router.push("/customer-form");
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function CustomerPickerList({
  customers,
  onPick,
  onNew,
}: {
  customers: any[];
  onPick: (c: any) => void;
  onNew: () => void;
}) {
  const [q, setQ] = useState("");
  const filtered = q
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(q.toLowerCase()) ||
          (c.email || "").toLowerCase().includes(q.toLowerCase())
      )
    : customers;
  return (
    <View style={{ flex: 1 }}>
      <TextInput
        style={styles.pickerSearch}
        value={q}
        onChangeText={setQ}
        placeholder="Search..."
      />
      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        ListEmptyComponent={
          <TouchableOpacity onPress={onNew} style={styles.pickerEmpty}>
            <Text style={styles.pickerEmptyText}>No matches — create a new customer?</Text>
          </TouchableOpacity>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.pickerItem} onPress={() => onPick(item)}>
            <Text style={styles.pickerItemName}>{item.name}</Text>
            <Text style={styles.pickerItemSub}>{item.email || item.phone || "—"}</Text>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity onPress={onNew} style={styles.pickerNewBtn}>
        <MaterialIcons name="add" size={18} color="#10b981" />
        <Text style={styles.pickerNewBtnText}>New customer</Text>
      </TouchableOpacity>
    </View>
  );
}

function ModeCard({
  icon,
  title,
  subtitle,
  tag,
  onPress,
}: {
  icon: string;
  title: string;
  subtitle: string;
  tag: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      style={[styles.mode, !onPress && styles.modeDisabled]}
    >
      <Text style={styles.modeIcon}>{icon}</Text>
      <View style={styles.modeBody}>
        <Text style={styles.modeTitle}>{title}</Text>
        <Text style={styles.modeSub}>{subtitle}</Text>
      </View>
      <View style={styles.modeTag}>
        <Text style={styles.modeTagText}>{tag}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fafaf9" },
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, backgroundColor: "white", borderBottomWidth: 1, borderBottomColor: "#e7e5e4" },
  backText: { color: "#10b981", fontSize: 16, fontWeight: "500" },
  headerTitle: { fontSize: 16, fontWeight: "600", color: "#1c1917" },
  body: { flex: 1, padding: 20 },
  title: { fontSize: 18, fontWeight: "600", color: "#1c1917" },
  subtitle: { fontSize: 13, color: "#78716c", marginBottom: 20 },
  modes: { gap: 8 },
  mode: { flexDirection: "row", alignItems: "center", backgroundColor: "white", padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#e7e5e4" },
  modeDisabled: { opacity: 0.6 },
  modeIcon: { fontSize: 20, marginRight: 12 },
  modeBody: { flex: 1 },
  modeTitle: { fontSize: 14, fontWeight: "600", color: "#1c1917" },
  modeSub: { fontSize: 12, color: "#78716c", marginTop: 2 },
  modeTag: { backgroundColor: "#f5f5f4", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  modeTagText: { fontSize: 10, fontWeight: "500", color: "#57534e" },
  // AI text mode
  aiHint: { backgroundColor: "#ecfdf5", borderWidth: 1, borderColor: "#a7f3d0", borderRadius: 8, padding: 10, marginBottom: 12 },
  aiHintText: { fontSize: 12, color: "#047857" },
  aiInput: { borderWidth: 1, borderColor: "#e7e5e4", borderRadius: 8, padding: 10, fontSize: 14, backgroundColor: "white", minHeight: 120, textAlignVertical: "top" },
  aiBtn: { backgroundColor: "#10b981", paddingVertical: 14, borderRadius: 10, alignItems: "center", marginTop: 12 },
  aiBtnDisabled: { opacity: 0.6 },
  aiBtnText: { color: "white", fontWeight: "600", fontSize: 15 },
  aiFootnote: { textAlign: "center", fontSize: 11, color: "#a8a29e", marginTop: 12 },
  aiSummaryBox: { backgroundColor: "#ecfdf5", borderWidth: 1, borderColor: "#a7f3d0", borderRadius: 8, padding: 10, marginBottom: 12 },
  aiSummaryLabel: { fontSize: 11, fontWeight: "600", color: "#047857", textTransform: "uppercase" },
  aiSummaryText: { fontSize: 13, color: "#1c1917", marginTop: 2 },
  aiCustomerSuggestion: { fontSize: 11, color: "#047857", marginTop: 4 },
  // Manual mode
  label: { fontSize: 13, color: "#57534e", marginBottom: 4, fontWeight: "500" },
  customerBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "white", borderWidth: 1, borderColor: "#e7e5e4", borderRadius: 8, padding: 12 },
  customerBtnEmpty: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "white", borderWidth: 1, borderColor: "#d6d3d1", borderStyle: "dashed", borderRadius: 8, padding: 12 },
  customerBtnEmptyText: { color: "#78716c", fontSize: 13 },
  customerName: { fontSize: 14, fontWeight: "600", color: "#1c1917" },
  customerSub: { fontSize: 12, color: "#78716c", marginTop: 2 },
  itemCard: { backgroundColor: "#f5f5f4", borderRadius: 8, padding: 10, marginBottom: 8 },
  itemHeader: { flexDirection: "row", gap: 8, alignItems: "center" },
  itemDescInput: { flex: 1, backgroundColor: "white", borderWidth: 1, borderColor: "#e7e5e4", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13 },
  itemTrashBtn: { padding: 4 },
  itemRow3: { flexDirection: "row", gap: 8, marginTop: 8 },
  itemCol: { flex: 1 },
  itemColLabel: { fontSize: 10, color: "#a8a29e", textTransform: "uppercase", marginBottom: 2 },
  itemColInput: { backgroundColor: "white", borderWidth: 1, borderColor: "#e7e5e4", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6, fontSize: 13 },
  itemColStatic: { backgroundColor: "white", borderWidth: 1, borderColor: "#e7e5e4", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6 },
  itemColStaticText: { fontSize: 13, fontWeight: "500", color: "#57534e" },
  addItemBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, borderWidth: 1, borderColor: "#d6d3d1", borderStyle: "dashed", borderRadius: 6, padding: 10, marginTop: 4 },
  addItemBtnText: { color: "#78716c", fontSize: 13 },
  row2: { flexDirection: "row", gap: 12, marginTop: 8 },
  col2: { flex: 1 },
  input: { backgroundColor: "white", borderWidth: 1, borderColor: "#e7e5e4", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14 },
  discountRow: { flexDirection: "row", gap: 6 },
  discountTypeBtn: { backgroundColor: "#f5f5f4", borderWidth: 1, borderColor: "#e7e5e4", borderRadius: 6, paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },
  discountTypeText: { fontSize: 14, fontWeight: "600", color: "#1c1917" },
  templateBtn: { flex: 1, borderWidth: 1, borderColor: "#e7e5e4", borderRadius: 6, padding: 10, alignItems: "center" },
  templateBtnActive: { backgroundColor: "#ecfdf5", borderColor: "#10b981" },
  templateBtnText: { fontSize: 13, fontWeight: "500", color: "#57534e" },
  templateBtnTextActive: { color: "#047857" },
  totalsBox: { backgroundColor: "#f5f5f4", borderRadius: 8, padding: 12, marginTop: 16 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  totalsRowLabel: { fontSize: 13, color: "#57534e" },
  totalsRowValue: { fontSize: 13, color: "#1c1917" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: "#d6d3d1" },
  totalRowLabel: { fontSize: 15, fontWeight: "bold", color: "#1c1917" },
  totalRowValue: { fontSize: 15, fontWeight: "bold", color: "#1c1917" },
  saveBtn: { backgroundColor: "#10b981", paddingVertical: 14, borderRadius: 10, alignItems: "center", marginTop: 16 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "white", fontWeight: "600", fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  pickerSheet: { backgroundColor: "white", borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: "80%" },
  pickerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: "#e7e5e4" },
  pickerTitle: { fontSize: 16, fontWeight: "600", color: "#1c1917" },
  pickerSearch: { margin: 16, backgroundColor: "#f5f5f4", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  pickerItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#f5f5f4" },
  pickerItemName: { fontSize: 14, fontWeight: "600", color: "#1c1917" },
  pickerItemSub: { fontSize: 12, color: "#78716c", marginTop: 2 },
  pickerEmpty: { padding: 16, alignItems: "center", backgroundColor: "#f5f5f4", borderRadius: 8, margin: 16 },
  pickerEmptyText: { color: "#78716c", fontSize: 13 },
  pickerNewBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, padding: 14, borderTopWidth: 1, borderTopColor: "#e7e5e4" },
  pickerNewBtnText: { color: "#10b981", fontSize: 14, fontWeight: "500" },
});

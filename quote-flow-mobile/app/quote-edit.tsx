/**
 * Quote edit screen — edit existing quote items, discount, tax, notes.
 * PATCHes via /api/quotes/{id}.
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAppStore } from "@/store/app";
import { api, apiPatch } from "@/api/client";
import { formatCurrency, computeTotals } from "@/lib/quote-flow-calc";
import { MaterialIcons } from "@expo/vector-icons";

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
  const [items, setItems] = useState<Item[]>([]);
  const [discountValue, setDiscountValue] = useState("0");
  const [discountType, setDiscountType] = useState<"AMOUNT" | "PERCENT">("AMOUNT");
  const [taxRate, setTaxRate] = useState("0");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<{ quote: any }>(`/api/quotes/${params.id}`);
      const q = r.quote;
      setItems(
        (q.items || []).map((it: any) => ({
          description: it.description,
          qty: String(it.qty),
          unitPrice: String(it.unitPrice),
        }))
      );
      setDiscountValue(String(q.discountValue || 0));
      setDiscountType(q.discountType || "AMOUNT");
      setTaxRate(String(q.taxRate || 0));
      setNotes(q.notes || "");
    } catch (e: any) {
      Alert.alert("Failed", e.message);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = computeTotals(
    items.map((i) => ({ qty: parseFloat(i.qty) || 0, unitPrice: parseFloat(i.unitPrice) || 0 })),
    parseFloat(discountValue) || 0,
    discountType,
    parseFloat(taxRate) || 0,
    business?.currency || "USD"
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

  async function save() {
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
        notes: notes || undefined,
      });
      Alert.alert("Saved", "Quote updated");
      router.back();
    } catch (e: any) {
      Alert.alert("Failed", e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#10b981" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={24} color="#1c1917" />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Edit Quote</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          <Text style={styles.sectionLabel}>Items</Text>
          {items.map((item, idx) => (
            <View key={idx} style={styles.itemRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Description"
                value={item.description}
                onChangeText={(v) => updateItem(idx, "description", v)}
              />
              <TextInput
                style={[styles.input, { width: 50 }]}
                placeholder="Qty"
                value={item.qty}
                onChangeText={(v) => updateItem(idx, "qty", v)}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.input, { width: 80 }]}
                placeholder="Price"
                value={item.unitPrice}
                onChangeText={(v) => updateItem(idx, "unitPrice", v)}
                keyboardType="numeric"
              />
              <TouchableOpacity onPress={() => removeItem(idx)} style={{ padding: 8 }}>
                <MaterialIcons name="close" size={18} color="#dc2626" />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.addBtn} onPress={addItem}>
            <MaterialIcons name="add" size={18} color="#57534e" />
            <Text style={styles.addBtnText}>Add Item</Text>
          </TouchableOpacity>

          <View style={styles.rowGap}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Discount</Text>
                <TextInput style={styles.input} value={discountValue} onChangeText={setDiscountValue} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Type</Text>
                <TouchableOpacity
                  style={styles.typeBtn}
                  onPress={() => setDiscountType(discountType === "AMOUNT" ? "PERCENT" : "AMOUNT")}
                >
                  <Text style={styles.typeBtnText}>{discountType === "AMOUNT" ? "Amount" : "Percent"}</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Tax %</Text>
                <TextInput style={styles.input} value={taxRate} onChangeText={setTaxRate} keyboardType="numeric" />
              </View>
            </View>
          </View>

          <View style={styles.totalsCard}>
            <Row label="Subtotal" value={formatCurrency(totals.subtotal, business?.currency, business?.currencySymbol)} />
            <Row label="Discount" value={`-${formatCurrency(totals.discount, business?.currency, business?.currencySymbol)}`} />
            <Row label={`Tax (${taxRate}%)`} value={formatCurrency(totals.tax, business?.currency, business?.currencySymbol)} />
            <View style={styles.totalLine} />
            <Row label="Total" value={formatCurrency(totals.total, business?.currency, business?.currencySymbol)} bold />
          </View>

          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, { minHeight: 60, textAlignVertical: "top" }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Payment terms, validity..."
            multiline
          />

          <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={save} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save Changes"}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.totalRow}>
      <Text style={[styles.totalLabel, bold && { fontWeight: "bold" }]}>{label}</Text>
      <Text style={[styles.totalValue, bold && { fontWeight: "bold" }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fafaf9" },
  flex: { flex: 1 },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  navTitle: { fontSize: 16, fontWeight: "600", color: "#1c1917" },
  sectionLabel: { fontSize: 12, fontWeight: "600", color: "#a8a29e", textTransform: "uppercase", marginBottom: 8 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#e7e5e4",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: "#fff",
  },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 10, alignSelf: "flex-start" },
  addBtnText: { fontSize: 13, color: "#57534e", fontWeight: "500" },
  rowGap: { gap: 12, marginTop: 16 },
  row: { flexDirection: "row", gap: 12 },
  label: { fontSize: 13, color: "#57534e", marginBottom: 4, fontWeight: "500" },
  typeBtn: {
    borderWidth: 1,
    borderColor: "#e7e5e4",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  typeBtnText: { fontSize: 14, color: "#1c1917" },
  totalsCard: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginTop: 16, borderWidth: 1, borderColor: "#f1f5f9" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  totalLabel: { fontSize: 13, color: "#78716c" },
  totalValue: { fontSize: 13, color: "#1c1917", fontWeight: "500" },
  totalLine: { borderTopWidth: 2, borderTopColor: "#10b981", marginVertical: 8 },
  saveBtn: { backgroundColor: "#1c1917", paddingVertical: 14, borderRadius: 8, alignItems: "center", marginTop: 20 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
});

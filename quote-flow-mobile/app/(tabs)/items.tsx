/**
 * Items tab — item/product library for the mobile app.
 * Lists all saved items, search, category filter, create/edit/delete.
 */
import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppStore } from "@/store/app";
import { api, apiPost, apiPatch, apiDelete } from "@/api/client";
import { formatCurrency } from "@/lib/format";
import { MaterialIcons } from "@expo/vector-icons";
import { sanitizeDecimal } from "@/lib/validation";

export default function ItemsScreen() {
  const business = useAppStore((s) => s.business);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<{ items: any[] }>("/api/items");
      setItems(r.items || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = items.filter((it) =>
    !search || it.description.toLowerCase().includes(search.toLowerCase())
  );

  const categories = [...new Set(items.map((it) => it.category).filter(Boolean))];

  async function remove(id: string) {
    Alert.alert("Delete Item", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await apiDelete(`/api/items/${id}`);
            setItems((prev) => prev.filter((it) => it.id !== id));
          } catch (e: any) {
            Alert.alert("Failed", e.message);
          }
        },
      },
    ]);
  }

  function renderItem({ item }: { item: any }) {
    return (
      <View style={styles.itemCard}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={styles.itemDesc} numberOfLines={1}>{item.description}</Text>
            {item.category ? (
              <View style={styles.categoryPill}>
                <Text style={styles.categoryText}>{item.category}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.itemPrice}>
            {formatCurrency(item.unitPrice, business?.currency, business?.currencySymbol)}
            {item.unit ? ` / ${item.unit}` : ""}
            {item.taxRate ? `  ·  Tax: ${item.taxRate}%` : ""}
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 4 }}>
          <TouchableOpacity
            onPress={() => {
              setEditingItem(item);
              setShowForm(true);
            }}
            style={styles.iconBtn}
          >
            <MaterialIcons name="edit" size={18} color="#78716c" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => remove(item.id)} style={styles.iconBtn}>
            <MaterialIcons name="delete-outline" size={18} color="#dc2626" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Items</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => {
            setEditingItem(null);
            setShowForm(true);
          }}
        >
          <MaterialIcons name="add" size={20} color="#fff" />
          <Text style={styles.addBtnText}>Add Item</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <MaterialIcons name="search" size={18} color="#a8a29e" style={{ marginLeft: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search items..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <MaterialIcons name="inventory-2" size={48} color="#d6d3d1" />
          <Text style={styles.emptyText}>
            {search ? "No items match your search." : "No items yet. Add your first reusable item."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        />
      )}

      {/* Form modal */}
      <ItemFormModal
        visible={showForm}
        item={editingItem}
        onClose={() => setShowForm(false)}
        onSaved={() => {
          setShowForm(false);
          load();
        }}
      />
    </SafeAreaView>
  );
}

function ItemFormModal({
  visible,
  item,
  onClose,
  onSaved,
}: {
  visible: boolean;
  item: any | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [description, setDescription] = useState(item?.description ?? "");
  const [unitPrice, setUnitPrice] = useState(String(item?.unitPrice ?? ""));
  const [unit, setUnit] = useState(item?.unit ?? "");
  const [taxRate, setTaxRate] = useState(String(item?.taxRate ?? ""));
  const [category, setCategory] = useState(item?.category ?? "");
  const [saving, setSaving] = useState(false);

  // Reset fields when the item prop changes
  useEffect(() => {
    setDescription(item?.description ?? "");
    setUnitPrice(String(item?.unitPrice ?? ""));
    setUnit(item?.unit ?? "");
    setTaxRate(String(item?.taxRate ?? ""));
    setCategory(item?.category ?? "");
  }, [item, visible]);

  async function save() {
    if (!description.trim()) {
      Alert.alert("Validation", "Description is required");
      return;
    }
    const price = parseFloat(unitPrice);
    if (unitPrice.trim() && (isNaN(price) || price < 0)) {
      Alert.alert("Invalid Price", "Unit price must be a valid positive number.");
      return;
    }
    const tax = parseFloat(taxRate);
    if (taxRate.trim() && (isNaN(tax) || tax < 0 || tax > 100)) {
      Alert.alert("Invalid Tax Rate", "Tax percentage must be between 0 and 100.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        description: description.trim(),
        unitPrice: parseFloat(unitPrice) || 0,
        unit: unit.trim() || undefined,
        taxRate: parseFloat(taxRate) || 0,
        category: category.trim() || undefined,
      };
      if (item) {
        await apiPatch(`/api/items/${item.id}`, body);
      } else {
        await apiPost("/api/items", body);
      }
      onSaved();
    } catch (e: any) {
      Alert.alert("Failed", e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{item ? "Edit Item" : "New Item"}</Text>

          <Text style={styles.label}>Description</Text>
          <TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder="e.g. Website Design" />

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Unit Price</Text>
              <TextInput
                style={styles.input}
                value={unitPrice}
                onChangeText={(t) => setUnitPrice(sanitizeDecimal(t))}
                keyboardType="decimal-pad"
                placeholder="0.00"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Unit</Text>
              <TextInput style={styles.input} value={unit} onChangeText={setUnit} placeholder="hour, day" />
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Tax %</Text>
              <TextInput
                style={styles.input}
                value={taxRate}
                onChangeText={(t) => setTaxRate(sanitizeDecimal(t))}
                keyboardType="decimal-pad"
                placeholder="0"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Category</Text>
              <TextInput style={styles.input} value={category} onChangeText={setCategory} placeholder="Service" />
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
            <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={onClose}>
              <Text style={styles.btnOutlineText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={save} disabled={saving}>
              <Text style={styles.btnPrimaryText}>{saving ? "Saving..." : "Save"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fafaf9" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  title: { fontSize: 24, fontWeight: "bold", color: "#1c1917" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#1c1917",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addBtnText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    margin: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e7e5e4",
  },
  searchInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, fontSize: 14 },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  itemDesc: { fontSize: 14, fontWeight: "600", color: "#1c1917", flexShrink: 1 },
  categoryPill: {
    backgroundColor: "#f5f5f4",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryText: { fontSize: 9, fontWeight: "600", color: "#78716c" },
  itemPrice: { fontSize: 12, color: "#78716c", marginTop: 4 },
  iconBtn: { padding: 6 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 60 },
  emptyText: { fontSize: 14, color: "#a8a29e", textAlign: "center", marginTop: 12, maxWidth: 240 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  modalCard: { backgroundColor: "#fff", borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#1c1917", marginBottom: 16 },
  label: { fontSize: 13, color: "#57534e", marginBottom: 4, fontWeight: "500" },
  input: {
    borderWidth: 1,
    borderColor: "#e7e5e4",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: "#fff",
    marginBottom: 12,
  },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  btnOutline: { borderWidth: 1, borderColor: "#e7e5e4" },
  btnOutlineText: { color: "#78716c", fontWeight: "600", fontSize: 14 },
  btnPrimary: { backgroundColor: "#1c1917" },
  btnPrimaryText: { color: "#fff", fontWeight: "600", fontSize: 14 },
});

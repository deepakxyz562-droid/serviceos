import { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAppStore } from "@/store/app";
import { api } from "@/api/client";
import { formatCurrency } from "@/lib/format";

const FILTERS = ["ALL", "DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE"];

export default function InvoicesScreen() {
  const router = useRouter();
  const business = useAppStore((s) => s.business);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  async function load() {
    setLoading(true);
    try {
      const r = await api<{ invoices: any[] }>("/api/mobile/invoices");
      setInvoices(r.invoices || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = filter === "ALL" ? invoices : invoices.filter((q) => q.status === filter);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Invoices</Text>
        <TouchableOpacity style={styles.newBtn} onPress={() => router.push("/invoice-create")}>
          <Text style={styles.newBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters} contentContainerStyle={{ paddingHorizontal: 20 }}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.pill, filter === f && styles.pillActive]}
          >
            <Text style={[styles.pillText, filter === f && styles.pillTextActive]}>{f.replace("_", " ")}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={{ padding: 20 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No invoices yet.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => router.push(`/invoice/${item.id}`)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardName}>{item.customer?.name || "—"}</Text>
              <Text style={styles.cardMeta}>{item.number} · {item.items?.length || 0} items</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.cardAmount}>
                {formatCurrency(item.total, business?.currency, business?.currencySymbol)}
              </Text>
              <View style={[styles.status, statusStyle(item.status)]}>
                <Text style={[styles.statusText, statusTextStyle(item.status)]}>
                  {item.status.replace("_", " ")}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

function statusStyle(status: string) {
  const m: Record<string, any> = {
    DRAFT: { backgroundColor: "#f5f5f4" },
    SENT: { backgroundColor: "#dbeafe" },
    PARTIALLY_PAID: { backgroundColor: "#fef3c7" },
    PAID: { backgroundColor: "#d1fae5" },
    OVERDUE: { backgroundColor: "#fee2e2" },
  };
  return m[status] || {};
}
function statusTextStyle(status: string) {
  const m: Record<string, any> = {
    DRAFT: { color: "#44403c" },
    SENT: { color: "#1e40af" },
    PARTIALLY_PAID: { color: "#92400e" },
    PAID: { color: "#065f46" },
    OVERDUE: { color: "#991b1b" },
  };
  return m[status] || {};
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fafaf9" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 32, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: "bold", color: "#1c1917" },
  newBtn: { backgroundColor: "#10b981", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  newBtnText: { color: "white", fontWeight: "600", fontSize: 14 },
  filters: { flexGrow: 0, paddingBottom: 12 },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: "#f5f5f4", marginRight: 8 },
  pillActive: { backgroundColor: "#1c1917" },
  pillText: { fontSize: 12, fontWeight: "500", color: "#57534e" },
  pillTextActive: { color: "white" },
  empty: { padding: 32, backgroundColor: "#f5f5f4", borderRadius: 12, alignItems: "center" },
  emptyText: { color: "#78716c", fontSize: 14 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "white", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#e7e5e4" },
  cardName: { fontSize: 14, fontWeight: "600", color: "#1c1917" },
  cardMeta: { fontSize: 12, color: "#78716c", marginTop: 2 },
  cardAmount: { fontSize: 14, fontWeight: "600", color: "#1c1917" },
  status: { marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  statusText: { fontSize: 10, fontWeight: "600" },
});

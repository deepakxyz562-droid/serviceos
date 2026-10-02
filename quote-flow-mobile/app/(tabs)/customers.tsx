import { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAppStore } from "@/store/app";
import { api } from "@/api/client";
import { MaterialIcons } from "@expo/vector-icons";

export default function CustomersScreen() {
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const r = await api<{ customers: any[] }>("/api/mobile/customers");
      setCustomers(r.customers || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Customers</Text>
        <TouchableOpacity style={styles.newBtn} onPress={() => router.push("/customer-form")}>
          <Text style={styles.newBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={customers}
        keyExtractor={(i) => i.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={{ padding: 20 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialIcons name="people" size={40} color="#d6d3d1" />
            <Text style={styles.emptyText}>No customers yet.</Text>
            <TouchableOpacity onPress={() => router.push("/customer-form")} style={styles.emptyBtn}>
              <Text style={styles.emptyBtnText}>Add your first customer</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/customer/${item.id}`)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.cardName}>{item.name}</Text>
              <Text style={styles.cardMeta}>
                {item.email || item.phone || "No contact info"}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.countText}>{item.quoteCount} quotes</Text>
              <Text style={styles.countText}>{item.invoiceCount} invoices</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fafaf9" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 32, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: "bold", color: "#1c1917" },
  newBtn: { backgroundColor: "#10b981", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  newBtnText: { color: "white", fontWeight: "600", fontSize: 14 },
  empty: { padding: 32, backgroundColor: "#f5f5f4", borderRadius: 12, alignItems: "center" },
  emptyText: { color: "#78716c", fontSize: 14, marginTop: 8, marginBottom: 12 },
  emptyBtn: { padding: 8 },
  emptyBtnText: { color: "#10b981", fontWeight: "500", fontSize: 13 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "white", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#e7e5e4" },
  cardName: { fontSize: 14, fontWeight: "600", color: "#1c1917" },
  cardMeta: { fontSize: 12, color: "#78716c", marginTop: 2 },
  countText: { fontSize: 11, color: "#78716c" },
});

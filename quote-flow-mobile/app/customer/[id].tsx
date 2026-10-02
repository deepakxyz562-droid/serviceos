import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAppStore } from "@/store/app";
import { api, apiDelete } from "@/api/client";
import { formatCurrency } from "@/lib/format";
import { MaterialIcons } from "@expo/vector-icons";

function computeTotal(items: any[], discountValue: number, discountType: string, taxRate: number) {
  const sub = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  let disc = 0;
  if (discountType === "PERCENT") disc = (sub * (discountValue || 0)) / 100;
  else disc = Math.min(discountValue || 0, sub);
  const tax = ((sub - disc) * (taxRate || 0)) / 100;
  return sub - disc + tax;
}

export default function CustomerDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const business = useAppStore((s) => s.business);
  const [customer, setCustomer] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const r = await api<{ customer: any }>(`/api/mobile/customers/${params.id}`);
      setCustomer(r.customer);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [params.id]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#10b981" />
      </SafeAreaView>
    );
  }
  if (!customer) return null;

  const total = (customer.invoices || []).reduce(
    (s: number, i: any) => s + computeTotal(i.items || [], i.discountValue, i.discountType, i.taxRate),
    0
  );

  async function remove() {
    Alert.alert("Delete customer?", "Quotes and invoices will remain.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await apiDelete(`/api/mobile/customers/${params.id}`);
            router.back();
          } catch (e: any) {
            Alert.alert("Failed", e.message);
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Customer</Text>
        <TouchableOpacity onPress={() => router.push(`/customer-form?id=${params.id}`)}>
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text style={styles.name}>{customer.name}</Text>
        {customer.email ? <Text style={styles.info}>Email: {customer.email}</Text> : null}
        {customer.phone ? <Text style={styles.info}>Phone: {customer.phone}</Text> : null}
        {customer.address ? <Text style={styles.info}>Address: {customer.address}</Text> : null}
        {customer.notes ? <Text style={styles.info}>Notes: {customer.notes}</Text> : null}

        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{customer.quotes?.length || 0}</Text>
            <Text style={styles.statLabel}>Quotes</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{customer.invoices?.length || 0}</Text>
            <Text style={styles.statLabel}>Invoices</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {formatCurrency(total, business?.currency, business?.currencySymbol)}
            </Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>

        {/* Recent quotes */}
        <Text style={styles.sectionTitle}>Quotes</Text>
        {(customer.quotes || []).length === 0 ? (
          <Text style={styles.emptyText}>No quotes yet.</Text>
        ) : (
          (customer.quotes || []).slice(0, 5).map((q: any) => (
            <TouchableOpacity
              key={q.id}
              style={styles.docRow}
              onPress={() => router.push(`/quote/${q.id}`)}
            >
              <MaterialIcons name="description" size={20} color="#a8a29e" />
              <View style={styles.docBody}>
                <Text style={styles.docTitle}>{q.number}</Text>
                <Text style={styles.docSub}>{q.status} · {(q.items || []).length} items</Text>
              </View>
              <Text style={styles.docAmount}>
                {formatCurrency(
                  computeTotal(q.items || [], q.discountValue, q.discountType, q.taxRate),
                  business?.currency,
                  business?.currencySymbol
                )}
              </Text>
            </TouchableOpacity>
          ))
        )}

        {/* Recent invoices */}
        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Invoices</Text>
        {(customer.invoices || []).length === 0 ? (
          <Text style={styles.emptyText}>No invoices yet.</Text>
        ) : (
          (customer.invoices || []).slice(0, 5).map((i: any) => {
            const total_ = computeTotal(i.items || [], i.discountValue, i.discountType, i.taxRate);
            const paid = (i.payments || []).reduce((s: number, p: any) => s + p.amount, 0);
            return (
              <TouchableOpacity
                key={i.id}
                style={styles.docRow}
                onPress={() => router.push(`/invoice/${i.id}`)}
              >
                <MaterialIcons name="receipt-long" size={20} color="#a8a29e" />
                <View style={styles.docBody}>
                  <Text style={styles.docTitle}>{i.number}</Text>
                  <Text style={styles.docSub}>
                    {i.status.replace("_", " ")} · {i.items?.length || 0} items
                  </Text>
                </View>
                <Text style={styles.docAmount}>
                  {formatCurrency(total_, business?.currency, business?.currencySymbol)}
                </Text>
              </TouchableOpacity>
            );
          })
        )}

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.outlineBtn]}
            onPress={() => router.push("/quote-create")}
          >
            <Text style={styles.outlineText}>Create Quote</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.outlineBtn]}
            onPress={() => router.push("/invoice-create")}
          >
            <Text style={styles.outlineText}>Create Invoice</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={remove}>
          <Text style={styles.deleteText}>Delete customer</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fafaf9" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, backgroundColor: "white", borderBottomWidth: 1, borderBottomColor: "#e7e5e4" },
  backText: { color: "#10b981", fontSize: 16, fontWeight: "500" },
  editText: { color: "#10b981", fontSize: 16, fontWeight: "500" },
  headerTitle: { fontSize: 16, fontWeight: "600", color: "#1c1917" },
  name: { fontSize: 22, fontWeight: "bold", color: "#1c1917", marginBottom: 8 },
  info: { fontSize: 14, color: "#57534e", marginTop: 2 },
  stats: { flexDirection: "row", gap: 8, marginTop: 16, marginBottom: 24, backgroundColor: "#f5f5f4", borderRadius: 12, padding: 14 },
  stat: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 16, fontWeight: "bold", color: "#1c1917" },
  statLabel: { fontSize: 11, color: "#78716c", marginTop: 2 },
  sectionTitle: { fontSize: 11, fontWeight: "600", color: "#78716c", textTransform: "uppercase", marginBottom: 8 },
  emptyText: { fontSize: 13, color: "#a8a29e", padding: 12, backgroundColor: "#f5f5f4", borderRadius: 8 },
  docRow: { flexDirection: "row", alignItems: "center", backgroundColor: "white", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#e7e5e4", marginBottom: 6 },
  docBody: { flex: 1, marginLeft: 8 },
  docTitle: { fontSize: 13, fontWeight: "600", color: "#1c1917" },
  docSub: { fontSize: 11, color: "#78716c", marginTop: 2 },
  docAmount: { fontSize: 13, fontWeight: "500", color: "#1c1917" },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 24 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  outlineBtn: { borderWidth: 1, borderColor: "#d6d3d1" },
  outlineText: { color: "#1c1917", fontWeight: "500", fontSize: 13 },
  deleteBtn: { marginTop: 8, borderWidth: 1, borderColor: "#fecaca" },
  deleteText: { color: "#dc2626", fontWeight: "500", fontSize: 13 },
});

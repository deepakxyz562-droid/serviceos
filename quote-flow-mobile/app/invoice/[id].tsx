/**
 * Phase 1 placeholder for the invoice detail screen.
 * Full functionality lands in Phase 6.
 */
import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAppStore } from "@/store/app";
import { api } from "@/api/client";
import { formatCurrency } from "@/lib/format";

export default function InvoiceDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const business = useAppStore((s) => s.business);
  const [inv, setInv] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ invoice: any }>(`/api/mobile/invoices/${params.id}`)
      .then((r) => setInv(r.invoice))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#10b981" />
      </SafeAreaView>
    );
  }
  if (!inv) return null;

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invoice {inv.number}</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>{inv.status.replace("_", " ")}</Text>
        </View>
        <View style={styles.customerCard}>
          <Text style={styles.customerLabel}>Customer</Text>
          <Text style={styles.customerName}>{inv.customer?.name || "—"}</Text>
        </View>
        <Text style={styles.sectionTitle}>Items</Text>
        {inv.items?.map((it: any, i: number) => (
          <View key={i} style={styles.itemRow}>
            <Text style={styles.itemDesc}>
              {it.description}
              {it.qty !== 1 ? ` × ${it.qty}` : ""}
            </Text>
            <Text style={styles.itemAmount}>
              {formatCurrency(it.qty * it.unitPrice, business?.currency, business?.currencySymbol)}
            </Text>
          </View>
        ))}
        <View style={styles.totalsBox}>
          <Row label="Subtotal" value={formatCurrency(inv.subtotal, business?.currency, business?.currencySymbol)} />
          {inv.discount > 0 && (
            <Row label="Discount" value={`- ${formatCurrency(inv.discount, business?.currency, business?.currencySymbol)}`} />
          )}
          {inv.tax > 0 && (
            <Row label={`Tax (${inv.taxRate}%)`} value={formatCurrency(inv.tax, business?.currency, business?.currencySymbol)} />
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TOTAL</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(inv.total, business?.currency, business?.currencySymbol)}
            </Text>
          </View>
          <Row label="Paid" value={formatCurrency(inv.paidAmount, business?.currency, business?.currencySymbol)} />
          {inv.balance > 0 && (
            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>Balance</Text>
              <Text style={styles.balanceValue}>
                {formatCurrency(inv.balance, business?.currency, business?.currencySymbol)}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.comingSoon}>
          Send, mark-paid, record-payment, and PDF generation arrive in Phase 5-6.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fafaf9" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, backgroundColor: "white", borderBottomWidth: 1, borderBottomColor: "#e7e5e4" },
  backText: { color: "#10b981", fontSize: 16, fontWeight: "500" },
  headerTitle: { fontSize: 16, fontWeight: "600", color: "#1c1917" },
  statusPill: { alignSelf: "flex-start", backgroundColor: "#f5f5f4", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginBottom: 12 },
  statusText: { fontSize: 11, fontWeight: "600", color: "#44403c", textTransform: "capitalize" },
  customerCard: { backgroundColor: "#f5f5f4", borderRadius: 12, padding: 14, marginBottom: 16 },
  customerLabel: { fontSize: 11, color: "#78716c", textTransform: "uppercase" },
  customerName: { fontSize: 16, fontWeight: "600", color: "#1c1917", marginTop: 2 },
  sectionTitle: { fontSize: 11, fontWeight: "600", color: "#78716c", textTransform: "uppercase", marginBottom: 8 },
  itemRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  itemDesc: { fontSize: 14, color: "#1c1917", flex: 1 },
  itemAmount: { fontSize: 14, fontWeight: "500", color: "#1c1917" },
  totalsBox: { marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#e7e5e4" },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  rowLabel: { fontSize: 14, color: "#57534e" },
  rowValue: { fontSize: 14, color: "#1c1917" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#e7e5e4" },
  totalLabel: { fontSize: 16, fontWeight: "bold", color: "#1c1917" },
  totalValue: { fontSize: 16, fontWeight: "bold", color: "#1c1917" },
  balanceRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  balanceLabel: { fontSize: 14, fontWeight: "600", color: "#1c1917" },
  balanceValue: { fontSize: 14, fontWeight: "600", color: "#1c1917" },
  comingSoon: { marginTop: 24, textAlign: "center", fontSize: 12, color: "#a8a29e" },
});

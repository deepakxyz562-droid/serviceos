/**
 * Reports screen — mobile version.
 * Shows overview cards, monthly revenue chart, top customers, overdue invoices.
 */
import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAppStore } from "@/store/app";
import { api } from "@/api/client";
import { formatCurrency } from "@/lib/format";
import { MaterialIcons } from "@expo/vector-icons";

export default function ReportsScreen() {
  const router = useRouter();
  const business = useAppStore((s) => s.business);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<{
        totals: any;
        monthlyRevenue: any[];
        topCustomers: any[];
        overdueInvoices: any[];
      }>("/api/reports");
      setData(r);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#10b981" />
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: "center", alignItems: "center" }]}>
        <Text style={styles.emptyText}>Failed to load reports.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.link}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const { totals, monthlyRevenue, topCustomers, overdueInvoices } = data;
  const currency = business?.currency;
  const symbol = business?.currencySymbol;
  const maxBilled = Math.max(...(monthlyRevenue || []).map((r: any) => r.billed || 0), 1);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color="#1c1917" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Reports & Analytics</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* Overview Cards */}
        <View style={styles.overviewRow}>
          <View style={[styles.overviewCard, { backgroundColor: "#ecfdf5", borderColor: "#a7f3d0" }]}>
            <Text style={styles.overviewLabel}>BILLED</Text>
            <Text style={[styles.overviewValue, { color: "#065f46" }]}>
              {formatCurrency(totals?.totalBilled || 0, currency, symbol)}
            </Text>
          </View>
          <View style={[styles.overviewCard, { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" }]}>
            <Text style={styles.overviewLabel}>PAID</Text>
            <Text style={[styles.overviewValue, { color: "#1e40af" }]}>
              {formatCurrency(totals?.totalPaid || 0, currency, symbol)}
            </Text>
          </View>
        </View>
        <View style={styles.overviewRow}>
          <View style={[styles.overviewCard, { backgroundColor: "#fffbeb", borderColor: "#fde68a" }]}>
            <Text style={styles.overviewLabel}>OUTSTANDING</Text>
            <Text style={[styles.overviewValue, { color: "#92400e" }]}>
              {formatCurrency(totals?.totalOutstanding || 0, currency, symbol)}
            </Text>
          </View>
          <View style={[styles.overviewCard, { backgroundColor: "#fef2f2", borderColor: "#fecaca" }]}>
            <Text style={styles.overviewLabel}>OVERDUE</Text>
            <Text style={[styles.overviewValue, { color: "#991b1b" }]}>
              {formatCurrency(totals?.totalOverdue || 0, currency, symbol)}
            </Text>
          </View>
        </View>

        {/* Monthly Revenue */}
        <Text style={styles.sectionTitle}>Monthly Revenue</Text>
        <View style={styles.card}>
          {monthlyRevenue && monthlyRevenue.length > 0 ? (
            monthlyRevenue.slice(-6).map((m: any, i: number) => {
              const pct = Math.min(100, ((m.billed || 0) / maxBilled) * 100);
              return (
                <View key={i} style={styles.barRow}>
                  <Text style={styles.barLabel}>{m.month}</Text>
                  <View style={styles.barBg}>
                    <View style={[styles.barFill, { width: `${pct}%` }]} />
                  </View>
                  <Text style={styles.barValue}>
                    {formatCurrency(m.billed || 0, currency, symbol)}
                  </Text>
                </View>
              );
            })
          ) : (
            <Text style={styles.emptyText}>No revenue data yet.</Text>
          )}
        </View>

        {/* Top Customers */}
        <Text style={styles.sectionTitle}>Top Customers</Text>
        <View style={styles.card}>
          {topCustomers && topCustomers.length > 0 ? (
            topCustomers.slice(0, 5).map((c: any, i: number) => (
              <View key={i} style={styles.customerRow}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>{i + 1}</Text>
                </View>
                <Text style={styles.customerName} numberOfLines={1}>{c.name}</Text>
                <Text style={styles.customerAmount}>
                  {formatCurrency(c.billed || 0, currency, symbol)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No customer data yet.</Text>
          )}
        </View>

        {/* Overdue Invoices */}
        <Text style={styles.sectionTitle}>Overdue Invoices</Text>
        <View style={styles.card}>
          {overdueInvoices && overdueInvoices.length > 0 ? (
            overdueInvoices.slice(0, 10).map((inv: any, i: number) => (
              <View key={i} style={styles.overdueRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.overdueNumber}>{inv.number}</Text>
                  <Text style={styles.overdueCustomer} numberOfLines={1}>{inv.customerName}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.overdueAmount}>
                    {formatCurrency(inv.amount || 0, currency, symbol)}
                  </Text>
                  <Text style={styles.overdueDays}>{inv.daysOverdue}d overdue</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No overdue invoices. 🎉</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fafaf9" },
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
  overviewRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  overviewCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  overviewLabel: { fontSize: 9, fontWeight: "bold", color: "#78716c", letterSpacing: 0.5 },
  overviewValue: { fontSize: 16, fontWeight: "bold", marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#1c1917", marginTop: 16, marginBottom: 8 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  barRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  barLabel: { fontSize: 10, color: "#78716c", width: 50 },
  barBg: { flex: 1, height: 16, backgroundColor: "#f5f5f4", borderRadius: 4, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: "#3b82f6", borderRadius: 4 },
  barValue: { fontSize: 10, fontWeight: "600", color: "#1c1917", width: 80, textAlign: "right" },
  customerRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 },
  rankBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#f5f5f4",
    alignItems: "center",
    justifyContent: "center",
  },
  rankText: { fontSize: 10, fontWeight: "bold", color: "#78716c" },
  customerName: { flex: 1, fontSize: 13, fontWeight: "500", color: "#1c1917" },
  customerAmount: { fontSize: 13, fontWeight: "600", color: "#1c1917" },
  overdueRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f5f5f4" },
  overdueNumber: { fontSize: 13, fontWeight: "500", color: "#1c1917" },
  overdueCustomer: { fontSize: 11, color: "#78716c", marginTop: 2 },
  overdueAmount: { fontSize: 13, fontWeight: "600", color: "#dc2626" },
  overdueDays: { fontSize: 10, color: "#a8a29e", marginTop: 2 },
  emptyText: { fontSize: 13, color: "#a8a29e", textAlign: "center", paddingVertical: 20 },
  link: { fontSize: 14, color: "#2563eb", marginTop: 8 },
});

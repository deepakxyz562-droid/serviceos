import { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ScrollView,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAppStore } from "@/store/app";
import { api } from "@/api/client";
import { formatCurrency } from "@/lib/quote-flow-calc";
import { MaterialIcons, Feather } from "@expo/vector-icons";

const FILTERS = ["ALL", "UNPAID", "PARTIALLY_PAID", "OVERDUE"];

export default function InvoicesScreen() {
  const router = useRouter();
  const business = useAppStore((s) => s.business);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [overview, setOverview] = useState({ paid: 0, unpaid: 0, overdue: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [showProModal, setShowProModal] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await api<{ invoices: any[]; overview?: { paid: number; unpaid: number; overdue: number } }>(
        "/api/mobile/invoices"
      );
      setInvoices(r.invoices || []);
      if (r.overview) {
        setOverview(r.overview);
      } else {
        // Compute locally if overview wasn't returned
        let p = 0, u = 0, o = 0;
        const now = new Date();
        for (const inv of r.invoices || []) {
          p += inv.paidAmount || 0;
          if (inv.balance > 0) {
            if (inv.status === "OVERDUE" || (inv.dueDate && new Date(inv.dueDate) < now)) {
              o += inv.balance;
            } else {
              u += inv.balance;
            }
          }
        }
        setOverview({ paid: p, unpaid: u, overdue: o });
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = invoices.filter((inv) => {
    if (filter === "UNPAID" && (inv.status === "PAID" || inv.balance <= 0)) return false;
    if (filter === "PARTIALLY_PAID" && inv.status !== "PARTIALLY_PAID") return false;
    if (filter === "OVERDUE" && inv.status !== "OVERDUE") return false;
    return true;
  });

  const currency = business?.currency || "INR";

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top App Bar */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.menuBtn}>
            <MaterialIcons name="menu" size={26} color="#1e293b" />
            <View style={styles.redDot} />
          </TouchableOpacity>
          <Text style={styles.title}>Invoices</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn}>
            <Feather name="search" size={20} color="#64748b" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.proBadge} onPress={() => setShowProModal(true)}>
            <MaterialIcons name="workspace-premium" size={16} color="white" />
            <Text style={styles.proBadgeText}>PRO</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        ListHeaderComponent={
          <View>
            {/* Overview Section */}
            <View style={styles.overviewHeader}>
              <Text style={styles.overviewTitle}>Overview</Text>
              <TouchableOpacity style={styles.timeDropdown}>
                <Text style={styles.timeDropdownText}>This Month</Text>
                <MaterialIcons name="keyboard-arrow-down" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* 3 Metric Cards */}
            <View style={styles.metricsRow}>
              <View style={[styles.metricCard, { backgroundColor: "#eff6ff" }]}>
                <Text style={styles.metricLabel}>Paid</Text>
                <Text style={[styles.metricValue, { color: "#16a34a" }]}>
                  {formatCurrency(overview.paid, currency)}
                </Text>
              </View>

              <View style={[styles.metricCard, { backgroundColor: "#eff6ff" }]}>
                <Text style={styles.metricLabel}>Unpaid</Text>
                <Text style={[styles.metricValue, { color: "#2563eb" }]}>
                  {formatCurrency(overview.unpaid, currency)}
                </Text>
              </View>

              <View style={[styles.metricCard, { backgroundColor: "#eff6ff" }]}>
                <Text style={styles.metricLabel}>Overdue</Text>
                <Text style={[styles.metricValue, { color: "#ef4444" }]}>
                  {formatCurrency(overview.overdue, currency)}
                </Text>
              </View>
            </View>

            {/* Filters Row */}
            <View style={styles.filtersRow}>
              <TouchableOpacity style={styles.filterIconBtn}>
                <Feather name="filter" size={16} color="#64748b" />
              </TouchableOpacity>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                {FILTERS.map((f) => (
                  <TouchableOpacity
                    key={f}
                    onPress={() => setFilter(f)}
                    style={[styles.pill, filter === f && styles.pillActive]}
                  >
                    <Text style={[styles.pillText, filter === f && styles.pillTextActive]}>
                      {f === "ALL" ? "All" : f === "UNPAID" ? "Unpaid" : f === "PARTIALLY_PAID" ? "Partially Paid" : "Overdue"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyDoc}>
              <View style={styles.emptyDocHeader} />
              <View style={styles.emptyDocGrid}>
                <View style={styles.emptyDocRow} />
                <View style={styles.emptyDocRow} />
                <View style={styles.emptyDocRow} />
              </View>
              <Text style={styles.emptyDocSign}>Signature</Text>
            </View>
            <Text style={styles.emptyText}>No Invoices</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => router.push(`/invoice/${item.id}`)}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardName}>{item.customer?.name || "Client"}</Text>
              <Text style={styles.cardMeta}>{item.number} · {item.items?.length || 0} items</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.cardAmount}>
                {formatCurrency(item.total, currency)}
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

      {/* Floating Action Button */}
      <View style={styles.fabContainer}>
        {invoices.length === 0 && (
          <View style={styles.tooltipBubble}>
            <Text style={styles.tooltipText}>Create Your First Invoice</Text>
            <View style={styles.tooltipArrow} />
          </View>
        )}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push("/invoice-create")}
          activeOpacity={0.85}
        >
          <MaterialIcons name="add" size={32} color="white" />
        </TouchableOpacity>
      </View>

      {/* PRO Paywall Modal */}
      <Modal visible={showProModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowProModal(false)} style={styles.closeBtn}>
                <MaterialIcons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
              <View style={styles.proTitleRow}>
                <Text style={styles.proTitle}>Upgrade to </Text>
                <View style={styles.proBadgeSmall}>
                  <Text style={styles.proBadgeSmallText}>PRO</Text>
                </View>
                <Text style={styles.proTitle}> for Unlimited Access</Text>
              </View>
              <View style={{ width: 28 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
              {/* Feature Highlights */}
              <View style={styles.proHero}>
                <Text style={styles.proHeroTitle}>Massive Professional Template</Text>
                <Text style={styles.proHeroSubtitle}>Unlock 100+ templates, custom backgrounds &amp; signatures</Text>
              </View>

              {/* Plans */}
              <View style={styles.planCardActive}>
                <View style={styles.bestOfferBadge}>
                  <Text style={styles.bestOfferText}>BEST OFFER</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planTitle}>Yearly</Text>
                  <Text style={styles.planSub}>₹15.99 for first week, then yearly billing</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.planPrice}>₹15.99</Text>
                  <Text style={styles.planPeriod}>First week</Text>
                </View>
              </View>

              <View style={styles.planCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planTitle}>1 Month</Text>
                  <Text style={styles.planSub}>₹250.00 / month</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.planPriceSec}>₹62.50</Text>
                  <Text style={styles.planPeriod}>/Week</Text>
                </View>
              </View>

              <View style={styles.planCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planTitle}>Lifetime</Text>
                  <Text style={styles.planSub}>One-Time purchase, forever access</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.planPriceSec}>₹1,500.00</Text>
                  <Text style={styles.planPeriod}>One-Time</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.subscribeBtn}
                onPress={() => {
                  alert("Opening payment processor for QuoteFlow PRO!");
                  setShowProModal(false);
                }}
              >
                <Text style={styles.subscribeBtnText}>Start for ₹15.99</Text>
                <MaterialIcons name="arrow-forward" size={18} color="white" />
              </TouchableOpacity>

              <Text style={styles.cancelAnytime}>CANCEL ANYTIME</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function statusStyle(status: string) {
  const m: Record<string, any> = {
    DRAFT: { backgroundColor: "#f1f5f9" },
    SENT: { backgroundColor: "#eff6ff" },
    PARTIALLY_PAID: { backgroundColor: "#fef3c7" },
    PAID: { backgroundColor: "#dcfce7" },
    OVERDUE: { backgroundColor: "#fee2e2" },
  };
  return m[status] || {};
}

function statusTextStyle(status: string) {
  const m: Record<string, any> = {
    DRAFT: { color: "#475569" },
    SENT: { color: "#2563eb" },
    PARTIALLY_PAID: { color: "#b45309" },
    PAID: { color: "#15803d" },
    OVERDUE: { color: "#b91c1c" },
  };
  return m[status] || {};
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
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  menuBtn: { position: "relative", padding: 4 },
  redDot: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ef4444",
    borderWidth: 1.5,
    borderColor: "white",
  },
  title: { fontSize: 20, fontWeight: "bold", color: "#0f172a" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: { padding: 6, borderRadius: 20 },
  proBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#f59e0b",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  proBadgeText: { color: "white", fontSize: 11, fontWeight: "900" },
  overviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    marginBottom: 8,
  },
  overviewTitle: { fontSize: 13, fontWeight: "700", color: "#64748b" },
  timeDropdown: { flexDirection: "row", alignItems: "center", gap: 2 },
  timeDropdownText: { fontSize: 12, fontWeight: "600", color: "#64748b" },
  metricsRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  metricCard: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  metricLabel: { fontSize: 11, fontWeight: "600", color: "#64748b" },
  metricValue: { fontSize: 15, fontWeight: "800", marginTop: 4 },
  filtersRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  filterIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  filterScroll: { gap: 6 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  pillActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  pillText: { fontSize: 12, fontWeight: "700", color: "#64748b" },
  pillTextActive: { color: "white" },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingTop: 60 },
  emptyDoc: {
    width: 80,
    height: 100,
    borderRadius: 12,
    backgroundColor: "white",
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    padding: 10,
    justifyContent: "space-between",
    marginBottom: 12,
  },
  emptyDocHeader: { height: 6, width: 30, backgroundColor: "#cbd5e1", borderRadius: 3 },
  emptyDocGrid: { gap: 4 },
  emptyDocRow: { height: 8, backgroundColor: "#f1f5f9", borderRadius: 2 },
  emptyDocSign: { fontSize: 9, fontStyle: "italic", color: "#94a3b8", textAlign: "right" },
  emptyText: { fontSize: 14, fontWeight: "600", color: "#64748b" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardName: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  cardMeta: { fontSize: 12, color: "#64748b", marginTop: 2 },
  cardAmount: { fontSize: 14, fontWeight: "800", color: "#0f172a" },
  status: { marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: "700" },
  fabContainer: { position: "absolute", bottom: 24, right: 16, alignItems: "flex-end", gap: 6 },
  tooltipBubble: {
    backgroundColor: "#dbeafe",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    position: "relative",
  },
  tooltipText: { fontSize: 12, fontWeight: "700", color: "#1e40af" },
  tooltipArrow: {
    position: "absolute",
    bottom: -4,
    right: 20,
    width: 8,
    height: 8,
    backgroundColor: "#dbeafe",
    transform: [{ rotate: "45deg" }],
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  proTitleRow: { flexDirection: "row", alignItems: "center" },
  proTitle: { fontSize: 13, fontWeight: "bold", color: "#0f172a" },
  proBadgeSmall: { backgroundColor: "#f59e0b", paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  proBadgeSmallText: { color: "white", fontSize: 9, fontWeight: "900" },
  proHero: {
    backgroundColor: "#eff6ff",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    marginBottom: 16,
  },
  proHeroTitle: { fontSize: 14, fontWeight: "bold", color: "#1e3a8a" },
  proHeroSubtitle: { fontSize: 12, color: "#3b82f6", marginTop: 4 },
  planCardActive: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#2563eb",
    backgroundColor: "#eff6ff",
    marginBottom: 10,
    position: "relative",
  },
  bestOfferBadge: {
    position: "absolute",
    top: -10,
    right: 14,
    backgroundColor: "#ef4444",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  bestOfferText: { color: "white", fontSize: 9, fontWeight: "900" },
  planCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 10,
  },
  planTitle: { fontSize: 14, fontWeight: "bold", color: "#0f172a" },
  planSub: { fontSize: 11, color: "#64748b", marginTop: 2 },
  planPrice: { fontSize: 16, fontWeight: "900", color: "#2563eb" },
  planPriceSec: { fontSize: 15, fontWeight: "800", color: "#0f172a" },
  planPeriod: { fontSize: 10, color: "#94a3b8" },
  subscribeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 24,
    marginTop: 10,
  },
  subscribeBtnText: { color: "white", fontSize: 14, fontWeight: "bold" },
  cancelAnytime: { textAlign: "center", fontSize: 11, color: "#94a3b8", marginTop: 12 },
});

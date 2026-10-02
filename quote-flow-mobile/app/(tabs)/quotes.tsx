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

const FILTERS = ["ALL", "PENDING", "ACCEPTED", "DRAFT"];

export default function QuotesScreen() {
  const router = useRouter();
  const business = useAppStore((s) => s.business);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [overview, setOverview] = useState({ accepted: 0, pending: 0, draft: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [showProModal, setShowProModal] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await api<{ quotes: any[]; overview?: { accepted: number; pending: number; draft: number } }>(
        "/api/mobile/quotes"
      );
      setQuotes(r.quotes || []);
      if (r.overview) {
        setOverview(r.overview);
      } else {
        let a = 0, p = 0, d = 0;
        for (const q of r.quotes || []) {
          const tot = q.total || 0;
          if (q.status === "ACCEPTED") a += tot;
          else if (q.status === "SENT") p += tot;
          else if (q.status === "DRAFT") d += tot;
        }
        setOverview({ accepted: a, pending: p, draft: d });
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = quotes.filter((q) => {
    if (filter === "PENDING" && q.status !== "SENT") return false;
    if (filter === "ACCEPTED" && q.status !== "ACCEPTED") return false;
    if (filter === "DRAFT" && q.status !== "DRAFT") return false;
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
          <Text style={styles.title}>Estimates</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn}>
            <Feather name="search" size={20} color="#64748b" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.proBadge} onPress={() => setShowProModal(true)}>
            <MaterialIcons name="workspace-premium" size={16} color="white" />
            <Text style={styles.proBadgeText}>18M FREE</Text>
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
                <Text style={styles.metricLabel}>Accepted</Text>
                <Text style={[styles.metricValue, { color: "#16a34a" }]}>
                  {formatCurrency(overview.accepted, currency)}
                </Text>
              </View>

              <View style={[styles.metricCard, { backgroundColor: "#eff6ff" }]}>
                <Text style={styles.metricLabel}>Pending</Text>
                <Text style={[styles.metricValue, { color: "#2563eb" }]}>
                  {formatCurrency(overview.pending, currency)}
                </Text>
              </View>

              <View style={[styles.metricCard, { backgroundColor: "#eff6ff" }]}>
                <Text style={styles.metricLabel}>Draft</Text>
                <Text style={[styles.metricValue, { color: "#64748b" }]}>
                  {formatCurrency(overview.draft, currency)}
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
                      {f === "ALL" ? "All" : f === "PENDING" ? "Pending" : f === "ACCEPTED" ? "Accepted" : "Draft"}
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
              <Text style={styles.emptyDocSign}>Estimate</Text>
            </View>
            <Text style={styles.emptyText}>No Estimates</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => router.push(`/quote/${item.id}`)}>
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
                  {item.status}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Floating Action Button */}
      <View style={styles.fabContainer}>
        {quotes.length === 0 && (
          <View style={styles.tooltipBubble}>
            <Text style={styles.tooltipText}>Create Your First Estimate</Text>
            <View style={styles.tooltipArrow} />
          </View>
        )}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push("/quote-create")}
          activeOpacity={0.85}
        >
          <MaterialIcons name="add" size={32} color="white" />
        </TouchableOpacity>
      </View>

      {/* 18-Month Free Modal */}
      <Modal visible={showProModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowProModal(false)} style={styles.closeBtn}>
                <MaterialIcons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
              <View style={styles.proTitleRow}>
                <Text style={styles.proTitle}>Special Offer: </Text>
                <View style={styles.proBadgeSmall}>
                  <Text style={styles.proBadgeSmallText}>18M FREE</Text>
                </View>
              </View>
              <View style={{ width: 28 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
              <View style={styles.proHero}>
                <Text style={styles.proHeroTitle}>18 Months Free Access Active!</Text>
                <Text style={styles.proHeroSubtitle}>
                  All 100+ invoice &amp; estimate templates, GST calculations, custom signatures, and unlimited quotes are 100% free.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.subscribeBtn}
                onPress={() => setShowProModal(false)}
              >
                <Text style={styles.subscribeBtnText}>Enjoy 18 Months of Free Access</Text>
              </TouchableOpacity>
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
    ACCEPTED: { backgroundColor: "#dcfce7" },
    DECLINED: { backgroundColor: "#fee2e2" },
  };
  return m[status] || {};
}

function statusTextStyle(status: string) {
  const m: Record<string, any> = {
    DRAFT: { color: "#475569" },
    SENT: { color: "#2563eb" },
    ACCEPTED: { color: "#15803d" },
    DECLINED: { color: "#b91c1c" },
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
    backgroundColor: "#10b981",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  proBadgeText: { color: "white", fontSize: 10, fontWeight: "900" },
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
  proBadgeSmall: { backgroundColor: "#10b981", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  proBadgeSmallText: { color: "white", fontSize: 9, fontWeight: "900" },
  proHero: {
    backgroundColor: "#f0fdf4",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    marginBottom: 16,
  },
  proHeroTitle: { fontSize: 15, fontWeight: "bold", color: "#14532d" },
  proHeroSubtitle: { fontSize: 12, color: "#16a34a", marginTop: 4 },
  subscribeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#10b981",
    paddingVertical: 14,
    borderRadius: 24,
    marginTop: 10,
  },
  subscribeBtnText: { color: "white", fontSize: 14, fontWeight: "bold" },
});

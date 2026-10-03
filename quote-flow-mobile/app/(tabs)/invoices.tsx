import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ScrollView,
  Modal,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";
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

  // Dynamic countdown timer
  const [countdown, setCountdown] = useState({ hours: "08", mins: "30", secs: "43" });

  useEffect(() => {
    let sec = 43;
    let min = 30;
    let hr = 8;
    const interval = setInterval(() => {
      sec -= 1;
      if (sec < 0) {
        sec = 59;
        min -= 1;
        if (min < 0) {
          min = 59;
          hr = Math.max(0, hr - 1);
        }
      }
      setCountdown({
        hours: String(hr).padStart(2, "0"),
        mins: String(min).padStart(2, "0"),
        secs: String(sec).padStart(2, "0"),
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api<{ invoices: any[]; overview?: { paid: number; unpaid: number; overdue: number } }>(
        "/api/mobile/invoices"
      );
      const list = r.invoices || [];
      setInvoices(list);
      if (r.overview) {
        setOverview(r.overview);
      } else {
        let p = 0, u = 0, o = 0;
        const now = new Date();
        for (const inv of list) {
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
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = invoices.filter((inv) => {
    if (filter === "UNPAID" && (inv.status === "PAID" || inv.balance <= 0)) return false;
    if (filter === "PARTIALLY_PAID" && inv.status !== "PARTIALLY_PAID") return false;
    if (filter === "OVERDUE" && inv.status !== "OVERDUE") return false;
    return true;
  });

  const currency = business?.currency || "INR";

  // Helper to extract invoice-specific currency if overridden in metadata
  function getInvoiceCurrency(item: any): string {
    if (item?.notes) {
      try {
        if (item.notes.startsWith("{") && item.notes.endsWith("}")) {
          const meta = JSON.parse(item.notes);
          if (meta.currencyCode) return meta.currencyCode;
        }
      } catch {}
    }
    return currency;
  }

  // Format month section header
  const currentMonthYear = new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" });

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Top App Bar matching media_1791015293688.jpg */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.menuBtn} activeOpacity={0.7}>
            <Feather name="menu" size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.title}>Invoices</Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
            <Feather name="search" size={22} color="#0f172a" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.discountBadge}
            onPress={() => setShowProModal(true)}
            activeOpacity={0.85}
          >
            <MaterialIcons name="stars" size={14} color="#ffffff" style={{ marginRight: 3 }} />
            <Text style={styles.discountBadgeText}>-30%</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Overview Section */}
            <View style={styles.overviewHeader}>
              <Text style={styles.overviewTitle}>Overview</Text>
              <TouchableOpacity style={styles.timeDropdown} activeOpacity={0.7}>
                <Text style={styles.timeDropdownText}>All Time</Text>
                <MaterialIcons name="keyboard-arrow-down" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* 3 Metric Cards */}
            <View style={styles.metricsRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Paid</Text>
                <Text style={[styles.metricValue, { color: "#16a34a" }]}>
                  {formatCurrency(overview.paid, currency)}
                </Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Unpaid</Text>
                <Text style={[styles.metricValue, { color: "#2563eb" }]}>
                  {formatCurrency(overview.unpaid, currency)}
                </Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Overdue</Text>
                <Text style={[styles.metricValue, { color: "#ef4444" }]}>
                  {formatCurrency(overview.overdue, currency)}
                </Text>
              </View>
            </View>

            {/* Limited Offer Banner matching media_1791015293688.jpg */}
            <View style={styles.promoBanner}>
              <View style={styles.promoBadgeIcon}>
                <Text style={styles.promoBadgeIconTop}>30%</Text>
                <Text style={styles.promoBadgeIconSub}>OFF</Text>
              </View>
              <View style={styles.promoMiddle}>
                <Text style={styles.promoTitle}>Limited Offer End in</Text>
                <View style={styles.timerRow}>
                  <View style={styles.timerBlock}>
                    <Text style={styles.timerNum}>{countdown.hours}</Text>
                  </View>
                  <Text style={styles.timerColon}>:</Text>
                  <View style={styles.timerBlock}>
                    <Text style={styles.timerNum}>{countdown.mins}</Text>
                  </View>
                  <Text style={styles.timerColon}>:</Text>
                  <View style={styles.timerBlock}>
                    <Text style={styles.timerNum}>{countdown.secs}</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={styles.promoGetBtn}
                onPress={() => setShowProModal(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.promoGetBtnText}>Get</Text>
              </TouchableOpacity>
            </View>

            {/* Filters Row */}
            <View style={styles.filtersRow}>
              <TouchableOpacity style={styles.filterIconBtn} activeOpacity={0.7}>
                <Feather name="filter" size={17} color="#0f172a" />
              </TouchableOpacity>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterScroll}
              >
                {FILTERS.map((f) => {
                  const isActive = filter === f;
                  const label =
                    f === "ALL"
                      ? "All"
                      : f === "UNPAID"
                      ? "Unpaid"
                      : f === "PARTIALLY_PAID"
                      ? "Partially Paid"
                      : "Overdue";
                  return (
                    <TouchableOpacity
                      key={f}
                      onPress={() => setFilter(f)}
                      style={[styles.pill, isActive && styles.pillActive]}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Month Section Header */}
            <Text style={styles.monthHeader}>{currentMonthYear}</Text>
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
            <TouchableOpacity
              style={styles.emptyCtaBtn}
              onPress={() => router.push("/invoice-create")}
            >
              <MaterialIcons name="add" size={18} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.emptyCtaBtnText}>Create Your First Invoice</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => {
          const itemCurrency = getInvoiceCurrency(item);
          const formattedDate = item.dueDate
            ? new Date(item.dueDate).toLocaleDateString("en-GB")
            : item.createdAt
            ? new Date(item.createdAt).toLocaleDateString("en-GB")
            : "02/10/2026";
          const statusText =
            item.status === "DRAFT"
              ? "Unpaid"
              : item.status === "PARTIALLY_PAID"
              ? "Partially Paid"
              : item.status === "OVERDUE"
              ? "Overdue"
              : item.status === "PAID"
              ? "Paid"
              : item.status.replace("_", " ");

          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/invoice/${item.id}`)}
              activeOpacity={0.85}
            >
              {/* Top Row: Client Name on Left, Amount & 3-dots on Right */}
              <View style={styles.cardTopRow}>
                <Text style={styles.cardName} numberOfLines={1}>
                  {item.customer?.name || "Unknown Client"}
                </Text>
                <View style={styles.cardAmountWrap}>
                  <Text style={styles.cardAmount}>
                    {formatCurrency(item.total, itemCurrency)}
                  </Text>
                  <TouchableOpacity
                    style={styles.cardDotsBtn}
                    onPress={() => router.push(`/invoice/${item.id}`)}
                  >
                    <Feather name="more-vertical" size={18} color="#64748b" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Bottom Row: INV number | date on Left, Status Pill on Right */}
              <View style={styles.cardBottomRow}>
                <Text style={styles.cardMeta}>
                  {item.number} | {formattedDate}
                </Text>
                <View style={[styles.status, statusStyle(item.status)]}>
                  <Text style={[styles.statusText, statusTextStyle(item.status)]}>
                    {statusText}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Floating Action Button matching media_1791015293688.jpg */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push("/invoice-create")}
          activeOpacity={0.85}
        >
          <MaterialIcons name="add" size={32} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Special Offer Modal */}
      <Modal visible={showProModal} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowProModal(false)} style={styles.closeBtn}>
                <MaterialIcons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
              <View style={styles.proTitleRow}>
                <Text style={styles.proTitle}>Special Offer: </Text>
                <View style={styles.discountBadgeSmall}>
                  <Text style={styles.discountBadgeSmallText}>-30% OFF</Text>
                </View>
              </View>
              <View style={{ width: 28 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 18 }}>
              <View style={styles.proHero}>
                <Text style={styles.proHeroTitle}>Get 30% Off Lifetime Pro!</Text>
                <Text style={styles.proHeroSubtitle}>
                  Unlock all 100+ PDF templates, automated payment reminders, GST &amp; tax compliance, and unlimited cloud storage.
                </Text>
              </View>

              <TouchableOpacity
                style={styles.subscribeBtn}
                onPress={() => setShowProModal(false)}
              >
                <Text style={styles.subscribeBtnText}>Claim 30% Discount</Text>
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
    DRAFT: { backgroundColor: "#eff6ff" },
    SENT: { backgroundColor: "#eff6ff" },
    PARTIALLY_PAID: { backgroundColor: "#fef3c7" },
    PAID: { backgroundColor: "#dcfce7" },
    OVERDUE: { backgroundColor: "#fee2e2" },
  };
  return m[status] || { backgroundColor: "#eff6ff" };
}

function statusTextStyle(status: string) {
  const m: Record<string, any> = {
    DRAFT: { color: "#2563eb" },
    SENT: { color: "#2563eb" },
    PARTIALLY_PAID: { color: "#d97706" },
    PAID: { color: "#16a34a" },
    OVERDUE: { color: "#ef4444" },
  };
  return m[status] || { color: "#2563eb" };
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  menuBtn: { padding: 4 },
  title: { fontSize: 22, fontWeight: "700", color: "#0f172a" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBtn: { padding: 4 },
  discountBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f59e0b",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountBadgeText: { color: "#ffffff", fontSize: 12, fontWeight: "800" },
  overviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    marginBottom: 10,
  },
  overviewTitle: { fontSize: 14, fontWeight: "500", color: "#64748b" },
  timeDropdown: { flexDirection: "row", alignItems: "center", gap: 2 },
  timeDropdownText: { fontSize: 13, fontWeight: "500", color: "#64748b" },
  metricsRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  metricCard: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "#eef4ff",
  },
  metricLabel: { fontSize: 13, fontWeight: "500", color: "#334155" },
  metricValue: { fontSize: 16, fontWeight: "800", marginTop: 4 },
  promoBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563eb",
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
  },
  promoBadgeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#facc15",
    justifyContent: "center",
    alignItems: "center",
  },
  promoBadgeIconTop: {
    fontSize: 11,
    fontWeight: "900",
    color: "#dc2626",
    lineHeight: 13,
  },
  promoBadgeIconSub: {
    fontSize: 8,
    fontWeight: "900",
    color: "#dc2626",
    lineHeight: 10,
  },
  promoMiddle: {
    flex: 1,
    marginLeft: 12,
  },
  promoTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 6,
  },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  timerBlock: {
    backgroundColor: "#ffffff",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  timerNum: {
    fontSize: 12,
    fontWeight: "800",
    color: "#dc2626",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  timerColon: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#ffffff",
    marginHorizontal: 3,
  },
  promoGetBtn: {
    backgroundColor: "#facc15",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 10,
  },
  promoGetBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },
  filtersRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  filterIconBtn: {
    width: 40,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  filterScroll: { gap: 8 },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  pillActive: {
    backgroundColor: "#dbeafe",
    borderColor: "#bfdbfe",
  },
  pillText: { fontSize: 13, fontWeight: "500", color: "#475569" },
  pillTextActive: { color: "#1d4ed8", fontWeight: "700" },
  monthHeader: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748b",
    marginBottom: 8,
    marginTop: 4,
  },
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
  emptyText: { fontSize: 14, fontWeight: "600", color: "#64748b", marginBottom: 14 },
  emptyCtaBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563eb",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyCtaBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    flex: 1,
    marginRight: 10,
  },
  cardAmountWrap: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardAmount: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0f172a",
  },
  cardDotsBtn: {
    paddingLeft: 6,
  },
  cardBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  cardMeta: {
    fontSize: 13,
    color: "#94a3b8",
    fontWeight: "500",
  },
  status: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  fabContainer: {
    position: "absolute",
    bottom: 20,
    right: 20,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
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
  discountBadgeSmall: { backgroundColor: "#f59e0b", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  discountBadgeSmallText: { color: "white", fontSize: 10, fontWeight: "900" },
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
  subscribeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 24,
    marginTop: 10,
  },
  subscribeBtnText: { color: "white", fontSize: 14, fontWeight: "bold" },
});

import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAppStore } from "@/store/app";
import { api } from "@/api/client";
import { formatCurrency } from "@/lib/format";
import { AiOmniInputModal } from "../../src/components/AiOmniInputModal";

interface RecentItem {
  id: string;
  number: string;
  status: string;
  total: number;
  customerName: string;
  kind: "quote" | "invoice";
  createdAt: string;
}

export default function HomeScreen() {
  const router = useRouter();
  const business = useAppStore((s) => s.business);
  const setPendingDraft = useAppStore((s) => s.setPendingDraft);
  const [showAiModal, setShowAiModal] = useState(false);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [q, inv] = await Promise.all([
        api<{ quotes: any[] }>("/api/mobile/quotes"),
        api<{ invoices: any[] }>("/api/mobile/invoices"),
      ]);
      const items: RecentItem[] = [
        ...(q.quotes || []).map((x) => ({
          id: x.id,
          number: x.number,
          status: x.status,
          total: x.total,
          customerName: x.customer?.name ?? "—",
          kind: "quote" as const,
          createdAt: x.createdAt,
        })),
        ...(inv.invoices || []).map((x) => ({
          id: x.id,
          number: x.number,
          status: x.status,
          total: x.total,
          customerName: x.customer?.name ?? "—",
          kind: "invoice" as const,
          createdAt: x.createdAt,
        })),
      ];
      items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      setRecent(items.slice(0, 10));
    } catch {
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const first = business?.ownerName || business?.name || "there";

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.greeting}>{greeting}, {first.split(" ")[0]}</Text>
        <Text style={styles.greetingSub}>What would you like to create?</Text>

        <TouchableOpacity
          style={styles.quoteCard}
          onPress={() => router.push("/quote-create")}
        >
          <View style={styles.quoteIcon}>
            <Text style={styles.quoteIconText}>✦</Text>
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Create Quote</Text>
            <Text style={styles.cardSub}>Describe it or speak it</Text>
          </View>
          <Text style={styles.plus}>+</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.invoiceCard}
          onPress={() => router.push("/invoice-create")}
        >
          <View style={styles.invoiceIcon}>
            <Text style={styles.invoiceIconText}>▦</Text>
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>Create Invoice</Text>
            <Text style={styles.cardSub}>From scratch or quote</Text>
          </View>
          <Text style={styles.plus}>+</Text>
        </TouchableOpacity>

        {/* 2026 CORE: 4 Omni-Input Quick Action Pills */}
        <View style={styles.fastBox}>
          <View style={styles.fastHeader}>
            <Text style={styles.fastTitle}>Fast Creation Modes</Text>
            <View style={styles.fastBadge}>
              <Text style={styles.fastBadgeText}>AI POWERED</Text>
            </View>
          </View>
          <View style={styles.fastGrid}>
            <TouchableOpacity
              style={styles.fastPill}
              onPress={() => setShowAiModal(true)}
              activeOpacity={0.8}
            >
              <View style={[styles.pillIcon, { backgroundColor: "#ecfdf5" }]}>
                <Text style={{ fontSize: 16 }}>🎙️</Text>
              </View>
              <Text style={styles.pillLabel}>Speak</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.fastPill}
              onPress={() => setShowAiModal(true)}
              activeOpacity={0.8}
            >
              <View style={[styles.pillIcon, { backgroundColor: "#eff6ff" }]}>
                <Text style={{ fontSize: 16 }}>📋</Text>
              </View>
              <Text style={styles.pillLabel}>Paste Chat</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.fastPill}
              onPress={() => setShowAiModal(true)}
              activeOpacity={0.8}
            >
              <View style={[styles.pillIcon, { backgroundColor: "#faf5ff" }]}>
                <Text style={{ fontSize: 16 }}>⌨️</Text>
              </View>
              <Text style={styles.pillLabel}>Prompt</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.fastPill}
              onPress={() => router.push("/quote-create")}
              activeOpacity={0.8}
            >
              <View style={[styles.pillIcon, { backgroundColor: "#f1f5f9" }]}>
                <Text style={{ fontSize: 16 }}>✍️</Text>
              </View>
              <Text style={styles.pillLabel}>Manual</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Recent</Text>
        {recent.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No quotes or invoices yet.</Text>
            <Text style={styles.emptyHint}>Tap Create Quote to start.</Text>
          </View>
        ) : (
          <FlatList
            data={recent}
            keyExtractor={(i) => i.id}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.recentRow}
                onPress={() =>
                  router.push(
                    item.kind === "quote"
                      ? `/quote/${item.id}`
                      : `/invoice/${item.id}`
                  )
                }
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.recentName}>{item.customerName}</Text>
                  <Text style={styles.recentMeta}>
                    {item.number} · {item.kind}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.recentAmount}>
                    {formatCurrency(item.total, business?.currency, business?.currencySymbol)}
                  </Text>
                  <Text style={styles.recentStatus}>{item.status}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      {/* 2026 CORE: AI Omni-Input Modal */}
      <AiOmniInputModal
        visible={showAiModal}
        onClose={() => setShowAiModal(false)}
        onParsed={(draft) => {
          setPendingDraft(draft);
          if (draft.docType === "INVOICE") {
            router.push("/invoice-create");
          } else {
            router.push("/quote-create");
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fafaf9" },
  container: { flex: 1, padding: 20, paddingTop: 32 },
  greeting: { fontSize: 24, fontWeight: "bold", color: "#1c1917" },
  greetingSub: { fontSize: 14, color: "#78716c", marginBottom: 20 },
  quoteCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#10b981",
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#10b981",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  quoteIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  quoteIconText: { color: "white", fontSize: 22 },
  invoiceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 18,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e7e5e4",
  },
  invoiceIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#f5f5f4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  invoiceIconText: { color: "#44403c", fontSize: 22 },
  fastBox: {
    backgroundColor: "white",
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  fastHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  fastTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  fastBadge: {
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  fastBadgeText: {
    color: "#059669",
    fontSize: 9,
    fontWeight: "bold",
  },
  fastGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  fastPill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  pillIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  pillLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1e293b",
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#1c1917" },
  cardSub: { fontSize: 13, color: "#78716c", marginTop: 2 },
  plus: { fontSize: 22, fontWeight: "300", color: "#a8a29e" },
  quoteCard_plus: { color: "rgba(255,255,255,0.8)" },
  sectionTitle: { fontSize: 13, fontWeight: "600", color: "#57534e", marginBottom: 8, textTransform: "uppercase" },
  empty: { padding: 24, backgroundColor: "#f5f5f4", borderRadius: 12, alignItems: "center" },
  emptyText: { color: "#78716c", fontSize: 14 },
  emptyHint: { color: "#a8a29e", fontSize: 12, marginTop: 4 },
  recentRow: {
    flexDirection: "row",
    backgroundColor: "white",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e7e5e4",
    alignItems: "center",
  },
  recentName: { fontSize: 14, fontWeight: "600", color: "#1c1917" },
  recentMeta: { fontSize: 12, color: "#78716c", marginTop: 2 },
  recentAmount: { fontSize: 14, fontWeight: "600", color: "#1c1917" },
  recentStatus: { fontSize: 11, color: "#78716c", marginTop: 2, textTransform: "capitalize" },
});

import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAppStore } from "@/store/app";
import { api, apiPatch } from "@/api/client";
import { formatCurrency } from "@/lib/format";
import { API_BASE_URL } from "@/api/client";
import { MaterialIcons } from "@expo/vector-icons";

export default function QuoteDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const business = useAppStore((s) => s.business);
  const [quote, setQuote] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await api<{ quote: any }>(`/api/mobile/quotes/${params.id}`);
      setQuote(r.quote);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [params.id]);

  async function markAccepted() {
    setBusy(true);
    try {
      await apiPatch(`/api/mobile/quotes/${params.id}`, { status: "ACCEPTED" });
      await load();
    } catch (e: any) {
      Alert.alert("Failed", e.message);
    } finally {
      setBusy(false);
    }
  }

  async function convertToInvoice() {
    setBusy(true);
    try {
      const r = await api<{ invoice: any; alreadyExists?: boolean }>(
        `/api/mobile/invoices/create-from-quote/${params.id}`,
        { method: "POST" }
      );
      Alert.alert(
        r.alreadyExists ? "Already converted" : "Invoice created",
        r.alreadyExists
          ? "Opening the existing invoice."
          : `Invoice ${r.invoice.number} created from this quote.`
      );
      router.replace(`/invoice/${r.invoice.id}`);
    } catch (e: any) {
      Alert.alert("Failed", e.message);
    } finally {
      setBusy(false);
    }
  }

  async function openPdf() {
    const token = (await import("@/api/client")).loadToken
      ? await (await import("@/api/client")).loadToken()
      : null;
    // PDF endpoint accepts the token via header. On mobile, easiest path is to
    // fetch the PDF blob and open via Linking — but that requires file save.
    // For Phase 3, just open the URL in browser (works on web preview; on device
    // user will need to add ?token=... which we add below).
    if (!token) {
      Alert.alert("Token missing");
      return;
    }
    const url = `${API_BASE_URL}/api/quote-flow/quotes/${params.id}/pdf?token=${encodeURIComponent(token)}`;
    Linking.openURL(url).catch(() => Alert.alert("Failed to open PDF"));
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#10b981" />
      </SafeAreaView>
    );
  }
  if (!quote) return null;

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quote {quote.number}</Text>
        <View style={{ width: 60 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>{quote.status}</Text>
        </View>
        {quote.validUntil ? (
          <Text style={styles.metaText}>
            Valid until: {new Date(quote.validUntil).toLocaleDateString()}
          </Text>
        ) : null}

        <View style={styles.customerCard}>
          <Text style={styles.customerLabel}>Customer</Text>
          <Text style={styles.customerName}>{quote.customer?.name || "—"}</Text>
          {quote.customer?.email ? <Text style={styles.customerInfo}>{quote.customer.email}</Text> : null}
          {quote.customer?.phone ? <Text style={styles.customerInfo}>{quote.customer.phone}</Text> : null}
        </View>

        <Text style={styles.sectionTitle}>Items</Text>
        {quote.items?.map((it: any, i: number) => (
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
          <Row label="Subtotal" value={formatCurrency(quote.subtotal, business?.currency, business?.currencySymbol)} />
          {quote.discount > 0 && (
            <Row label="Discount" value={`- ${formatCurrency(quote.discount, business?.currency, business?.currencySymbol)}`} />
          )}
          {quote.tax > 0 && (
            <Row label={`Tax (${quote.taxRate}%)`} value={formatCurrency(quote.tax, business?.currency, business?.currencySymbol)} />
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>TOTAL</Text>
            <Text style={styles.totalValue}>
              {formatCurrency(quote.total, business?.currency, business?.currencySymbol)}
            </Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.btn, styles.btnOutline]}
            onPress={() => router.push(`/quote-edit?id=${params.id}`)}
          >
            <MaterialIcons name="edit" size={18} color="#1c1917" />
            <Text style={styles.btnOutlineText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={openPdf}>
            <MaterialIcons name="download" size={18} color="#1c1917" />
            <Text style={styles.btnOutlineText}>PDF</Text>
          </TouchableOpacity>
          {quote.status !== "ACCEPTED" && (
            <TouchableOpacity style={[styles.btn, styles.btnOutline]} onPress={markAccepted} disabled={busy}>
              <MaterialIcons name="check" size={18} color="#10b981" />
              <Text style={[styles.btnOutlineText, { color: "#10b981" }]}>Mark accepted</Text>
            </TouchableOpacity>
          )}
        </View>

        {quote.status === "ACCEPTED" && !quote.convertedInvoiceId && (
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary, styles.fullBtn]}
            onPress={convertToInvoice}
            disabled={busy}
          >
            <MaterialIcons name="receipt-long" size={18} color="white" />
            <Text style={styles.btnPrimaryText}>Convert to invoice →</Text>
          </TouchableOpacity>
        )}

        {quote.convertedInvoiceId && (
          <TouchableOpacity
            style={[styles.btn, styles.btnOutline, styles.fullBtn]}
            onPress={() => router.push(`/invoice/${quote.convertedInvoiceId}`)}
          >
            <MaterialIcons name="receipt-long" size={18} color="#10b981" />
            <Text style={[styles.btnOutlineText, { color: "#10b981" }]}>View invoice →</Text>
          </TouchableOpacity>
        )}

        {busy && <ActivityIndicator size="small" color="#10b981" style={{ marginTop: 12 }} />}
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
  statusPill: { alignSelf: "flex-start", backgroundColor: "#f5f5f4", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginBottom: 8 },
  statusText: { fontSize: 11, fontWeight: "600", color: "#44403c", textTransform: "capitalize" },
  metaText: { fontSize: 12, color: "#78716c", marginBottom: 12 },
  customerCard: { backgroundColor: "#f5f5f4", borderRadius: 12, padding: 14, marginBottom: 16 },
  customerLabel: { fontSize: 11, color: "#78716c", textTransform: "uppercase" },
  customerName: { fontSize: 16, fontWeight: "600", color: "#1c1917", marginTop: 2 },
  customerInfo: { fontSize: 13, color: "#57534e", marginTop: 2 },
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
  actionsRow: { flexDirection: "row", gap: 8, marginTop: 20 },
  btn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 8 },
  btnOutline: { borderWidth: 1, borderColor: "#d6d3d1" },
  btnOutlineText: { color: "#1c1917", fontWeight: "500", fontSize: 13 },
  btnPrimary: { backgroundColor: "#10b981" },
  btnPrimaryText: { color: "white", fontWeight: "600", fontSize: 13 },
  fullBtn: { marginTop: 8 },
});
